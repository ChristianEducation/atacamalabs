/**
 * Atacama OS v3 · núcleo de la Fase 1 (spec §8.1 «Hoy» y §8.8 «Pausa general»).
 *
 * Funciones AUTOCONTENIDAS (sin imports ni constantes de módulo): se prueban con `v3-core.test.mjs` y se incrustan con
 * Function.prototype.toString en los workflows n8n «25 Atacama Ops» (lectura) y «29 Ops Actions» (escritura).
 */

/** Estado de la pausa general (fila única `system_state`), listo para mostrar. */
export function v3Pause(state) {
  const s = state && typeof state === 'object' ? state : {};
  return { paused: s.global_pause === true, reason: s.reason ? String(s.reason).slice(0, 200) : null, since: s.paused_at || null, by: s.paused_by || null, resume_at: s.resume_at || null };
}

/**
 * Compuerta común: con la pausa general activa, ningún job de Hermes (radar, preparación, contenido, RSS, competencia, piezas, Instagram)
 * corre. Devuelve la salida original si no hay pausa.
 */
export function v3GateOverride(out, state) {
  const p = v3Pause(state);
  if (!p.paused) return out;
  return { ...(out || {}), mode: 'skip', paused: true, reason: 'Pausa general activa' + (p.reason ? ' («' + p.reason + '»)' : '') + ': no se investiga ni se crea nada hasta que Christian reanude desde /ops.' };
}

/** Antigüedad en texto corto y tono (fresco < 24 h · atención < 72 h · viejo). */
export function v3Age(ms, nowMs) {
  const t = Number.isFinite(ms) ? Math.max(0, nowMs - ms) : 0;
  const h = Math.floor(t / 3600000), dd = Math.floor(h / 24);
  return { text: dd >= 1 ? 'hace ' + dd + ' d' : h >= 1 ? 'hace ' + h + ' h' : 'hace minutos', tone: h < 24 ? 'fresh' : h < 72 ? 'warn' : 'old' };
}

/**
 * Bandeja «Hoy requiere tu decisión»: TODO lo que espera a Christian, agrupado por tipo, en orden de prioridad (spec §8.1):
 * correos → ideas → piezas → respuestas → contactos por pegar → alertas → LinkedIn → publicaciones en revisión de GHL.
 * `x` = { messages, ideas, pieces, alerts, attention, approvals, now }. Solo filas reales (nunca is_test ni empresas TEST).
 */
export function v3Inbox(x) {
  const now = Number(x && x.now) || Date.now();
  const items = [];
  const isTestName = (s) => /\bTEST\b/.test(String(s || ''));
  const oldest = (arr, f) => arr.reduce((m, r) => { const v = Date.parse(f(r)); return Number.isFinite(v) && v < m ? v : m; }, Infinity);
  const push = (kind, prio, title, from, list, f, href, names) => {
    if (!list.length) return;
    const o = oldest(list, f);
    const age = v3Age(Number.isFinite(o) ? o : now, now);
    items.push({ kind, prio, count: list.length, title, from, age: age.text, tone: age.tone, href, examples: (names || []).filter(Boolean).slice(0, 3) });
  };
  const msgs = Array.isArray(x && x.messages) ? x.messages : [];
  const drafts = msgs.filter((m) => m.direction === 'outbound' && m.status === 'draft' && !isTestName(m.company_name));
  push('correo', 1, drafts.length === 1 ? '1 correo por aprobar' : drafts.length + ' correos por aprobar', 'Prospección y correo', drafts, (m) => m.created_at, '/ops?view=aprobaciones&filter=correos', drafts.map((m) => m.company_name));
  const ideas = (Array.isArray(x && x.ideas) ? x.ideas : []).filter((i) => !i.is_test && i.status === 'proposed');
  push('idea', 2, ideas.length === 1 ? '1 idea por decidir' : ideas.length + ' ideas por decidir', 'Redes → Ideas', ideas, (i) => i.created_at, '/ops?view=ideas', ideas.map((i) => i.title));
  const pieces = (Array.isArray(x && x.pieces) ? x.pieces : []).filter((p) => !p.is_test && ['para_revisar', 'lista', 'programada_pendiente_de_clic'].includes(p.taller_status));
  const rev = pieces.filter((p) => p.taller_status === 'para_revisar'), ready = pieces.filter((p) => p.taller_status === 'lista'), click = pieces.filter((p) => p.taller_status === 'programada_pendiente_de_clic');
  push('pieza', 3, rev.length === 1 ? '1 pieza para revisar' : rev.length + ' piezas para revisar', 'Redes → Taller', rev, (p) => p.updated_at || p.created_at, '/ops?view=taller', rev.map((p) => p.topic));
  push('pieza_lista', 3, ready.length === 1 ? '1 pieza lista para programar' : ready.length + ' piezas listas para programar', 'Redes → Taller', ready, (p) => p.updated_at || p.created_at, '/ops?view=taller', ready.map((p) => p.topic));
  push('pieza_clic', 3, click.length === 1 ? '1 carrusel espera tu último clic en GHL' : click.length + ' carruseles esperan tu último clic en GHL', 'Redes → Taller', click, (p) => p.updated_at || p.created_at, '/ops?view=taller', click.map((p) => p.topic));
  const att = Array.isArray(x && x.attention) ? x.attention : [];
  const g = (k) => att.find((a) => a.key === k);
  const rep = g('replies');
  if (rep) items.push({ kind: 'respuesta', prio: 4, count: rep.count, title: rep.count === 1 ? '1 respuesta por contestar' : rep.count + ' respuestas por contestar', from: 'Prospección y correo', age: '', tone: 'warn', href: '/ops?view=outreach', examples: rep.items.slice(0, 3).map((s) => String(s).split(' · ')[0]) });
  const find = g('prep_find');
  if (find) items.push({ kind: 'contacto', prio: 5, count: find.count, title: find.count === 1 ? '1 contacto por pegar' : find.count + ' contactos por pegar', from: 'Prospección y correo', age: '', tone: 'fresh', href: '/ops?view=control', examples: find.items.slice(0, 3) });
  const al = (Array.isArray(x && x.alerts) ? x.alerts : []).filter((a) => a.status === 'open' && !String(a.alert_key || '').startsWith('_') && ['critical', 'high'].includes(a.severity));
  push('alerta', 6, al.length === 1 ? '1 alerta pide tu atención' : al.length + ' alertas piden tu atención', 'Sistema', al, (a) => a.first_seen_at, '/ops?view=alertas', al.map((a) => a.title));
  // Fase 7: reuniones de hoy (reservas del sitio). No son decisiones, pero van arriba para no perderlas.
  const tz = (x && x.tz) || 'America/Santiago';
  const today = new Date(now).toLocaleDateString('en-CA', { timeZone: tz });
  const meet = (Array.isArray(x && x.meetings) ? x.meetings : []).filter((m) => m.meeting_start && new Date(Date.parse(m.meeting_start)).toLocaleDateString('en-CA', { timeZone: tz }) === today);
  if (meet.length) items.push({ kind: 'reunion', prio: 0, count: meet.length, title: meet.length === 1 ? '1 reunión hoy' : meet.length + ' reuniones hoy', from: 'Reservas del sitio', age: '', tone: 'fresh', href: '/ops?view=hoy#mi-semana', examples: meet.map((m) => new Date(Date.parse(m.meeting_start)).toLocaleTimeString('es-CL', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }) + ' · ' + ([m.name, m.company].filter(Boolean).join(' · ') || 'Reunión')).slice(0, 3) });
  const ap = (x && x.approvals) || {};
  if (Number(ap.linkedin) > 0) items.push({ kind: 'linkedin', prio: 7, count: Number(ap.linkedin), title: Number(ap.linkedin) === 1 ? '1 alta de LinkedIn por aprobar' : ap.linkedin + ' altas de LinkedIn por aprobar', from: 'Prospección y correo', age: '', tone: 'fresh', href: '/ops?view=aprobaciones&filter=linkedin', examples: [] });
  if (Number(ap.content) > 0) items.push({ kind: 'publicacion', prio: 8, count: Number(ap.content), title: Number(ap.content) === 1 ? '1 publicación en revisión (GHL)' : ap.content + ' publicaciones en revisión (GHL)', from: 'Redes', age: '', tone: 'fresh', href: '/ops?view=aprobaciones&filter=contenido', examples: [] });
  items.sort((a, b) => a.prio - b.prio);
  return { items, total: items.reduce((s, i) => s + i.count, 0) };
}

/**
 * Pausa general (acción `pause_set` de n8n 29). UNA sola escritura en `system_state`, con candado sobre el estado que se vio.
 * El disparador de base `system_state_sync_outreach_pause` refleja la pausa en `outreach_config.paused` en la misma transacción (el Sender 22
 * y los Followups 24 ya respetan ese campo, sin tocar sus workflows) y al reanudar restaura el valor previo guardado en meta.
 * Devuelve { resp, writes } o { error }.
 */
export function v3PausePlan(req, state, outreach, nowMs, by) {
  const s = state && typeof state === 'object' ? state : null;
  if (!s) return { error: 'sin_estado', message: 'No encontré el estado del sistema (system_state). No se hizo nada.' };
  const nowIso = new Date(nowMs).toISOString();
  const cur = s.global_pause === true;
  if (req.paused === cur) return { resp: { ok: true, status: cur ? 'already_paused' : 'already_running', paused: cur, message: cur ? 'Ya estaba en pausa.' : 'El sistema ya estaba funcionando.' }, writes: [] };
  const meta = { ...(s.meta || {}) };
  if (req.paused) {
    meta.last_pause = { at: nowIso, by, reason: req.reason || null };
    return { resp: { ok: true, status: 'paused', paused: true, message: 'PAUSA GENERAL activa. Se detuvieron: envío de correos, seguimientos, radar, preparación de contactos, producción y generación de medios. Lo ya programado en GHL NO se retiene.' },
      writes: [{ method: 'PATCH', path: 'system_state?id=eq.1&global_pause=eq.false', body: { global_pause: true, reason: req.reason || null, paused_at: nowIso, paused_by: by, resume_at: req.resume_at || null, meta, updated_at: nowIso }, prefer: 'return=representation', check_rows: true, check_message: 'No pude activar la pausa: el estado cambió mientras tanto. Recarga y vuelve a intentarlo.' }] };
  }
  const restore = meta.prev_outreach_paused === true;
  meta.last_resume = { at: nowIso, by };
  return { resp: { ok: true, status: 'resumed', paused: false, message: restore ? 'Sistema reanudado. Ojo: el envío de correos ya estaba en pausa antes y sigue así.' : 'Sistema reanudado: todo vuelve a funcionar como antes de la pausa.' },
    writes: [{ method: 'PATCH', path: 'system_state?id=eq.1&global_pause=eq.true', body: { global_pause: false, reason: null, paused_at: null, paused_by: null, resume_at: null, meta, updated_at: nowIso }, prefer: 'return=representation', check_rows: true, check_message: 'No pude reanudar: el estado cambió mientras tanto. Recarga y vuelve a intentarlo.' }] };
}
