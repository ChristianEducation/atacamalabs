// Atacama OS v3 · Fase 8 — Aprendizaje de correcciones (spec §8.2). Núcleo puro: detecta patrones en los eventos de aprendizaje,
// valida las propuestas del job semanal «Aprendizaje» y decide (aprobar/rechazar). NUNCA aplica un cambio de regla: solo lo registra.
// Funciones autocontenidas (se incrustan en los workflows con toString).

export function lnTargets() { return ['playbook', 'evaluador', 'ranking', 'receta']; }

export function lnWords(s) {
  const STOP = 'para,como,este,esta,estos,estas,pero,porque,donde,cuando,sobre,entre,desde,hasta,también,tiene,tienen,puede,pueden,hacer,usted,ustedes,nuestro,nuestra,ellos,ellas,mucho,muchos,cada,todo,todos,otra,otro,algo,solo,más,menos,muy,bien,están,estamos,quiero,saludos,estimado,estimada,atacama,labs'.split(',');
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').match(/[a-zñ]{5,}/g)?.filter((w) => !STOP.includes(w)) || [];
}

export function lnLines(s) { return String(s || '').split(/\n+/).map((x) => x.trim()).filter(Boolean); }

/** Claves de patrón de UN evento (deterministas, sin LLM). */
export function lnEventKeys(e) {
  const b = e.before || {}, a = e.after || {}, keys = [];
  if (e.type === 'email_edit') {
    const wb = String(b.body || '').split(/\s+/).filter(Boolean).length, wa = String(a.body || '').split(/\s+/).filter(Boolean).length;
    if (wb && wa < wb * 0.85) keys.push(['playbook', 'acorta', 'Christian acorta el correo (−15 % o más)']);
    if (wb && wa > wb * 1.15) keys.push(['playbook', 'alarga', 'Christian alarga el correo (+15 % o más)']);
    const lb = lnLines(b.body), la = lnLines(a.body);
    if (lb[0] && la[0] && lb[0] !== la[0]) keys.push(['playbook', 'saludo', 'Christian cambia el saludo']);
    if (lb.length && la.length && lb[lb.length - 1] !== la[la.length - 1]) keys.push(['playbook', 'cierre', 'Christian cambia el cierre']);
    if (String(b.subject || '').trim() && String(b.subject || '').trim() !== String(a.subject || '').trim()) keys.push(['evaluador', 'asunto', 'Christian cambia el asunto']);
    const after = new Set(lnWords(a.body + ' ' + a.subject));
    [...new Set(lnWords(b.body + ' ' + b.subject))].filter((w) => !after.has(w)).forEach((w) => keys.push(['evaluador', 'quita:' + w, 'Christian quita la palabra «' + w + '»']));
  } else if (e.type === 'idea_discard') {
    if (b.format) keys.push(['ranking', 'descarta_formato:' + b.format, 'Descarta ideas de formato ' + b.format]);
    if (b.channel) keys.push(['ranking', 'descarta_red:' + b.channel, 'Descarta ideas de ' + b.channel]);
    [...new Set(lnWords(e.reason))].forEach((w) => keys.push(['ranking', 'motivo:' + w, 'Motivo de descarte con «' + w + '»']));
  } else if (e.type === 'piece_feedback') {
    [...new Set(lnWords((a && a.text) || e.reason))].forEach((w) => keys.push(['receta', 'pide:' + w, 'Pide cambios con «' + w + '»']));
  } else if (e.type === 'piece_ok') {
    keys.push(['receta', 'ok_formato:' + (b.format || 'pieza'), 'Programa sin cambios piezas de formato ' + (b.format || '—')]);
  }
  return keys;
}

/** Patrones con su muestra. `sufficient` solo con ≥ min ejemplos (spec: no se concluye con menos de ~30). */
export function lnPatterns(events, min, withTest) {
  const m = Number(min) > 0 ? Number(min) : 30, by = {};
  (events || []).filter((e) => e && (withTest || !e.is_test)).forEach((e) => {
    lnEventKeys(e).forEach(([target, key, label]) => {
      const id = target + ':' + key;
      const p = by[id] || (by[id] = { id, target, key, label, n: 0, ids: [], examples: [] });
      p.n++; p.ids.push(e.id);
      if (p.examples.length < 6) p.examples.push({ event_id: e.id, subject_id: e.subject_id || null, at: e.created_at || null, type: e.type });
    });
  });
  return Object.values(by).map((p) => ({ ...p, sufficient: p.n >= m })).sort((x, y) => y.n - x.n || x.id.localeCompare(y.id));
}

export function lnContext({ events, proposals, min, enabled, paused, with_test }) {
  const m = Number(min) > 0 ? Number(min) : 30;
  const pats = lnPatterns(events, m, with_test);
  const real = (events || []).filter((e) => with_test || !e.is_test);
  const by_type = {};
  real.forEach((e) => { by_type[e.type] = (by_type[e.type] || 0) + 1; });
  const open = (proposals || []).filter((p) => p.status === 'proposed' && !p.is_test);
  const mode = paused ? 'skip' : !enabled ? 'skip' : 'run';
  return {
    ok: true, mode, reason: paused ? 'pausa general activa' : !enabled ? 'job de aprendizaje apagado (content_config.learning_enabled = false)' : pats.some((p) => p.sufficient) ? 'hay patrones con muestra suficiente' : 'muestra insuficiente en todos los patrones',
    min_sample: m, total_events: real.length, by_type,
    patterns: pats.slice(0, 40).map(({ ids, ...p }) => p),
    open_patterns: open.map((p) => ((p.evidence || []).find((x) => x && x.type === 'pattern') || {}).id).filter(Boolean),
    rules: 'Solo propones; nunca aplicas. Cada propuesta cita ≥ 3 eventos del patrón (event_id) y un patrón con muestra suficiente; con menos se responde «muestra insuficiente».',
  };
}

/** Valida y arma las filas de learning_proposals. Descarta (con motivo) lo que no cumple. */
export function lnProposePlan(list, { events, proposals, min, now, is_test }) {
  const m = Number(min) > 0 ? Number(min) : 30;
  const pats = Object.fromEntries(lnPatterns(events, m, is_test).map((p) => [p.id, p]));
  const open = new Set((proposals || []).filter((p) => p.status === 'proposed' && !!p.is_test === !!is_test).map((p) => ((p.evidence || []).find((x) => x && x.type === 'pattern') || {}).id));
  if (!Array.isArray(list) || !list.length) return { error: 'sin_propuestas', message: 'No llegaron propuestas.' };
  if (list.length > 8) return { error: 'demasiadas', message: 'Máximo 8 propuestas por semana.' };
  const writes = [], discarded = [];
  list.forEach((x, i) => {
    const p = pats[String((x && x.pattern_id) || '')];
    const text = String((x && x.proposal) || '').trim();
    const cites = Array.isArray(x && x.citations) ? x.citations.filter((c) => c && p && p.ids.includes(c.event_id)) : [];
    const why = !p ? 'patrón desconocido' : !lnTargets().includes(p.target) ? 'destino inválido' : !p.sufficient ? 'muestra insuficiente (' + p.n + ' de ' + m + ')' : text.length < 30 || text.length > 1500 ? 'propuesta de 30–1500 caracteres' : cites.length < 3 ? 'faltan ≥ 3 citas de eventos del patrón' : open.has(p.id) ? 'ya hay una propuesta abierta para ese patrón' : null;
    if (why) { discarded.push({ i, pattern_id: (x && x.pattern_id) || null, why }); return; }
    open.add(p.id);
    writes.push({ method: 'POST', path: 'learning_proposals', prefer: 'return=minimal', body: { target: p.target, proposal: text, sample_size: p.n, is_test: !!is_test, created_at: new Date(now).toISOString(),
      evidence: [{ type: 'pattern', id: p.id, label: p.label, n: p.n }].concat(cites.slice(0, 10).map((c) => ({ type: 'event', id: c.event_id, note: String(c.note || '').slice(0, 300) }))) } });
  });
  return { resp: { ok: true, proposed: writes.length, discarded, text: writes.length + ' propuesta(s) guardada(s) para que Christian decida' + (discarded.length ? '; ' + discarded.length + ' descartada(s)' : '') + '. Nada se aplicó.' }, writes };
}

/** Christian aprueba o rechaza. Aprobar NO aplica el cambio: queda registrado para hacerlo con su orden. */
export function lnDecidePlan(req, prop, { now, by }) {
  if (!prop) return { error: 'propuesta_no_encontrada', message: 'No encontré esa propuesta.' };
  if (prop.is_test && req.test !== true) return { error: 'propuesta_test', message: 'Esa propuesta es de prueba.' };
  if (prop.status !== 'proposed') return { error: 'ya_decidida', message: 'Esa propuesta ya estaba ' + (prop.status === 'approved' ? 'aprobada' : 'rechazada') + '.' };
  const st = req.decision === 'approve' ? 'approved' : 'rejected';
  return {
    resp: { ok: true, status: st, message: st === 'approved' ? 'Aprobada. No se aplica sola: el cambio se hace con tu orden (Claude Code o Hermes) y queda en el historial.' : 'Rechazada. El job no la volverá a proponer igual.' },
    writes: [{ method: 'PATCH', path: 'learning_proposals?id=eq.' + prop.id + '&status=eq.proposed', body: { status: st, decided_at: new Date(now).toISOString(), decided_by: by }, prefer: 'return=representation', check_rows: true, check_message: 'La propuesta cambió mientras decidías. Recarga.' }],
  };
}

/** Vista de «Resultados → Aprendizaje». */
export function lnView({ events, proposals, min }) {
  const c = lnContext({ events, proposals, min, enabled: true, paused: false });
  const list = (proposals || []).filter((p) => !p.is_test).sort((a, b) => (a.status === 'proposed' ? 0 : 1) - (b.status === 'proposed' ? 0 : 1) || String(b.created_at).localeCompare(String(a.created_at))).slice(0, 30)
    .map((p) => ({ id: p.id, target: p.target, proposal: p.proposal, sample_size: p.sample_size, status: p.status, decided_at: p.decided_at || null, created_at: p.created_at,
      pattern: ((p.evidence || []).find((x) => x && x.type === 'pattern') || {}).label || null, citations: (p.evidence || []).filter((x) => x && x.type === 'event').length }));
  return { min_sample: c.min_sample, total_events: c.total_events, by_type: c.by_type, patterns: c.patterns.slice(0, 12), sufficient: c.patterns.filter((p) => p.sufficient).length, proposals: list };
}
