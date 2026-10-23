/**
 * Atacama OS v3 · Fase 4 — «Ideas de la semana» (spec §6.1 + anexo §D). Núcleo puro.
 *
 * Funciones AUTOCONTENIDAS (sin imports ni constantes de módulo): se prueban con `ideas-core.test.mjs` y se incrustan con
 * Function.prototype.toString en n8n 25 (Hermes: ideas_gate · ideas_propose · ideas_revise · lectura ideas_list) y n8n 29 (/ops: idea_decide · idea_mine).
 *
 * Reglas (no negociables): cada idea llega como FICHA de 12 campos; sin ficha completa o sin fuente verificada NO se muestra (suma a «descartadas
 * por débiles»); puntaje 0–100 (evidencia 30 · relevancia 25 · diferenciación 20 · frescura 15 · viabilidad 10) y solo pasan las ≥ 70; máximo 12 por
 * semana (Instagram 7 · LinkedIn página 4 · LinkedIn personal 3); sin duplicar las últimas 4 semanas. Nada se aprueba solo.
 */

/** Configuración por defecto (anexo §D2–§D4). */
export function ideasConfig() {
  return {
    min_score: 70, max_total: 12, caps: { instagram: 7, linkedin_page: 4, linkedin_profile: 3 }, dedupe_weeks: 4,
    channels: ['instagram', 'linkedin_page', 'linkedin_profile'], formats: ['texto', 'imagen', 'carrusel', 'demo', 'reel', 'historia'],
    objectives: ['alcance', 'autoridad', 'conversaciones', 'leads', 'recurso', 'servicio', 'educar'],
    metrics: ['reach', 'watch_time', 'saves', 'profile_visits', 'intent_comments', 'dms', 'leads'], efforts: ['bajo', 'medio', 'alto'],
    evidence_types: ['source', 'intel', 'metric', 'resource'],
  };
}

/** Lunes (YYYY-MM-DD, hora de Chile) de la semana que contiene `ms`. */
export function ideasMonday(ms, tz) {
  const zone = tz || 'America/Santiago';
  const d = new Date(new Date(ms).toLocaleString('en-US', { timeZone: zone }));
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

/** Suma días a una fecha YYYY-MM-DD (sin zona: aritmética de calendario). */
export function ideasAddDays(day, n) {
  const d = new Date(String(day) + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Carril de producción: video y motion → PC (con Claude); lo demás → VPS (spec §6.2). */
export function ideasLane(format) {
  return ['reel', 'demo'].includes(String(format || '')) ? 'pc' : 'vps';
}

/** Métrica principal por defecto según el objetivo (anexo §D4). Una sola. */
export function ideasDefaultMetric(objective, format) {
  const o = String(objective || '');
  if (o === 'autoridad' || o === 'alcance') return String(format || '') === 'reel' ? 'watch_time' : 'reach';
  if (o === 'educar') return 'saves';
  if (o === 'leads') return 'leads';
  if (o === 'recurso') return 'dms';
  if (o === 'conversaciones') return 'intent_comments';
  if (o === 'servicio') return 'profile_visits';
  return null;
}

/** Puntaje 0–100 desde su desglose (cada parte acotada a su máximo). */
export function ideasScore(bd) {
  const b = bd && typeof bd === 'object' ? bd : {};
  const part = (k, max) => Math.max(0, Math.min(max, Math.round(Number(b[k]) || 0)));
  const s = { evidence: part('evidence', 30), relevance: part('relevance', 25), differentiation: part('differentiation', 20), freshness: part('freshness', 15), feasibility: part('feasibility', 10) };
  return { total: s.evidence + s.relevance + s.differentiation + s.freshness + s.feasibility, parts: s };
}

/** Ficha de 12 campos (§6.1): qué falta. CTA y recurso son «si corresponde». */
export function ideasFicha(i) {
  const x = i || {};
  const has = (v) => typeof v === 'string' ? v.trim().length >= 3 : Boolean(v);
  const missing = [];
  if (!has(x.objective)) missing.push('objetivo');
  if (!has(x.audience_insight)) missing.push('público / insight');
  if (!has(x.hook)) missing.push('gancho');
  if (!has(x.core_message)) missing.push('idea central');
  if (!has(x.format)) missing.push('formato');
  if (!(Array.isArray(x.structure) && x.structure.filter((s) => has(typeof s === 'string' ? s : s && (s.text || s.title))).length >= 1)) missing.push('estructura / escenas');
  const pr = x.production || {};
  if (!(Array.isArray(pr.tools) && pr.tools.length) || !has(pr.how)) missing.push('cómo se produce');
  if (!has(x.effort)) missing.push('costo / esfuerzo');
  if (!has(x.risks)) missing.push('riesgos');
  if (!has(x.primary_metric)) missing.push('métrica principal');
  return { complete: missing.length === 0, missing };
}

/** Texto normalizado para comparar títulos/ganchos (sin tildes, sin signos, sin palabras vacías). */
export function ideasTokens(s) {
  const stop = ['de', 'la', 'el', 'los', 'las', 'un', 'una', 'y', 'o', 'en', 'con', 'para', 'por', 'que', 'tu', 'su', 'sus', 'tus', 'del', 'al', 'a', 'es', 'se', 'no', 'lo', 'como', 'mas', 'más'];
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ ]+/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !stop.includes(w));
}

/** Parecido (Jaccard de palabras) entre dos textos: 0..1. */
export function ideasSimilar(a, b) {
  const A = new Set(ideasTokens(a)), B = new Set(ideasTokens(b));
  if (!A.size || !B.size) return 0;
  let inter = 0; A.forEach((w) => { if (B.has(w)) inter++; });
  return inter / (A.size + B.size - inter);
}

/**
 * Plazo (anexo §D3): días que faltan hasta el domingo de cierre (el fin de semana también se produce, decisión de Christian 23-oct) vs. días necesarios
 * (esfuerzo bajo 1, medio 2, alto 3; +1 si va al PC). Faltan ≥ necesarios+1 → alcanza; = necesarios → justo; menos → no alcanza.
 * Hoy cuenta si son antes de las 12:00 de Chile.
 */
export function ideasDeadline(idea, nowMs, tz) {
  const zone = tz || 'America/Santiago';
  const need = ({ bajo: 1, medio: 2, alto: 3 }[String((idea && idea.effort) || '')] || 2) + (ideasLane(idea && idea.format) === 'pc' ? 1 : 0);
  const closing = ideasAddDays(String((idea && idea.week_start) || ideasMonday(nowMs + 7 * 86400000, zone)), -1);
  const local = new Date(new Date(nowMs).toLocaleString('en-US', { timeZone: zone }));
  const today = local.getFullYear() + '-' + String(local.getMonth() + 1).padStart(2, '0') + '-' + String(local.getDate()).padStart(2, '0');
  let left = 0;
  for (let day = today, k = 0; day <= closing && k < 60; day = ideasAddDays(day, 1), k++) {
    if (day === today && local.getHours() >= 12) continue;
    left++;
  }
  let state = left >= need + 1 ? 'alcanza' : left === need ? 'justo' : 'no_alcanza';
  // Fin de semana 23–25 oct 2026: Christian produce el contenido de la semana y asume el riesgo; nada se marca «No alcanza» hasta pasar ese domingo.
  if (state === 'no_alcanza' && today <= '2026-10-25') state = 'justo';
  return { state, label: { alcanza: 'Alcanza', justo: 'Justo', no_alcanza: 'No alcanza' }[state], left, need, closing };
}

/** Normaliza una idea propuesta por Hermes (o editada). Devuelve { ok, row, errors }. No decide si se muestra: eso lo hace ideasProposePlan. */
export function ideasNorm(raw, cfg) {
  const C = cfg || ideasConfig();
  const x = raw && typeof raw === 'object' ? raw : {};
  const errors = [];
  const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const row = {
    channel: str(x.channel, 30), format: str(x.format, 20), title: str(x.title, 200), hook: str(x.hook, 400) || null, angle: str(x.angle, 400) || null,
    why: str(x.why, 1200) || null, competitor_ref: str(x.competitor_ref, 300) || null, objective: str(x.objective, 30) || null,
    audience_insight: str(x.audience_insight, 600) || null, core_message: str(x.core_message, 400) || null,
    structure: (Array.isArray(x.structure) ? x.structure : []).slice(0, 12).map((s) => (typeof s === 'string' ? { text: s.trim().slice(0, 300) } : { title: str(s && s.title, 120) || null, text: str(s && s.text, 300) })).filter((s) => s.text || s.title),
    cta: str(x.cta, 300) || null, cost_note: str(x.cost_note, 300) || null, risks: str(x.risks, 600) || null,
    primary_metric: str(x.primary_metric, 30) || null, keyword: str(x.keyword, 40).toUpperCase() || null, effort: str(x.effort, 10) || null,
    resource_id: /^[0-9a-f-]{36}$/i.test(String(x.resource_id || '')) ? String(x.resource_id).toLowerCase() : null,
    evidence: (Array.isArray(x.evidence) ? x.evidence : []).slice(0, 8).map((e) => ({ type: str(e && e.type, 20), id: str(e && e.id, 64), note: str(e && e.note, 300) || null, url: /^https?:\/\//.test(String(e && e.url || '')) ? String(e.url).slice(0, 500) : null })).filter((e) => e.type && e.id),
  };
  const pr = x.production && typeof x.production === 'object' ? x.production : {};
  row.production = { tools: (Array.isArray(pr.tools) ? pr.tools : []).map((t) => str(t, 60)).filter(Boolean).slice(0, 8), how: str(pr.how, 600), material: str(pr.material, 400) || null, lane: ideasLane(row.format) };
  if (!C.channels.includes(row.channel)) errors.push('red inválida');
  if (!C.formats.includes(row.format)) errors.push('formato inválido');
  if (row.title.length < 3) errors.push('falta título');
  if (row.objective && !C.objectives.includes(row.objective)) errors.push('objetivo inválido');
  if (row.effort && !C.efforts.includes(row.effort)) errors.push('esfuerzo inválido');
  if (!row.primary_metric && row.objective) row.primary_metric = ideasDefaultMetric(row.objective, row.format);
  if (row.primary_metric && !C.metrics.includes(row.primary_metric)) errors.push('métrica inválida');
  if (row.channel === 'instagram' && row.format === 'historia' && row.cta && /https?:\/\//.test(row.cta)) errors.push('las historias no llevan enlace');
  row.source_ids = row.evidence.filter((e) => e.type === 'source' && /^[0-9a-f-]{36}$/i.test(e.id)).map((e) => e.id.toLowerCase());
  const sc = ideasScore(x.score_breakdown);
  row.score = sc.total; row.score_breakdown = sc.parts;
  const f = ideasFicha(row);
  row.ficha_complete = f.complete;
  return { ok: errors.length === 0, row, errors, missing: f.missing };
}

/**
 * ¿La evidencia está verificada? Al menos UNA de: fuente de content_sources con verified=true · informe de competencia · pieza propia con métricas ·
 * recurso activo. `known` = { sources: {id: verified}, intel: Set|array, metrics: array, resources: array } leído de la base.
 */
export function ideasEvidenceOk(row, known) {
  const k = known || {};
  const has = (list, id) => (Array.isArray(list) ? list : []).map((v) => String(v).toLowerCase()).includes(String(id).toLowerCase());
  return (row.evidence || []).some((e) => (e.type === 'source' && (k.sources || {})[String(e.id).toLowerCase()] === true) || (e.type === 'intel' && has(k.intel, e.id)) || (e.type === 'metric' && has(k.metrics, e.id)) || (e.type === 'resource' && has(k.resources, e.id)));
}

/**
 * Lote de Hermes («Ideas de la semana»): valida, puntúa, descarta débiles y duplicados, aplica topes por red y escribe lote + ideas.
 * `p` = { week_start, ideas: [...], notes }. `ctx` = { now, known, recent: [{title, hook}], cfg, batch_id, is_test }.
 */
export function ideasProposePlan(p, ctx) {
  const C = (ctx && ctx.cfg) || ideasConfig();
  const now = Number(ctx && ctx.now) || Date.now();
  const week = /^\d{4}-\d{2}-\d{2}$/.test(String(p && p.week_start || '')) ? p.week_start : ideasMonday(now + 7 * 86400000);
  if (new Date(week + 'T12:00:00Z').getUTCDay() !== 1) return { error: 'semana_invalida', message: 'week_start debe ser un lunes (YYYY-MM-DD).' };
  const list = Array.isArray(p && p.ideas) ? p.ideas.slice(0, 40) : [];
  if (!list.length) return { error: 'sin_ideas', message: 'La propuesta no trae ideas.' };
  const recent = Array.isArray(ctx && ctx.recent) ? ctx.recent : [];
  const kept = [], weak = [];
  for (const raw of list) {
    const n = ideasNorm(raw, C);
    const r = n.row;
    const why = [];
    if (!n.ok) why.push(n.errors.join(', '));
    if (!r.ficha_complete) why.push('ficha incompleta (' + n.missing.join(', ') + ')');
    if (!ideasEvidenceOk(r, ctx && ctx.known)) why.push('sin fuente verificada');
    if (r.score < C.min_score) why.push('puntaje ' + r.score + ' < ' + C.min_score);
    const dup = recent.concat(kept).find((o) => ideasSimilar(o.title, r.title) >= 0.6 || (o.hook && r.hook && ideasSimilar(o.hook, r.hook) >= 0.7));
    if (dup) why.push('se parece a «' + String(dup.title).slice(0, 60) + '»');
    if (why.length) { weak.push({ title: r.title || '(sin título)', channel: r.channel || null, reasons: why }); continue; }
    kept.push(r);
  }
  kept.sort((a, b) => b.score - a.score);
  const byCh = {}; const final = [];
  for (const r of kept) {
    byCh[r.channel] = (byCh[r.channel] || 0) + 1;
    if (byCh[r.channel] > (C.caps[r.channel] || 0) || final.length >= C.max_total) { weak.push({ title: r.title, channel: r.channel, reasons: ['tope de la semana para esta red'] }); continue; }
    final.push(r);
  }
  const nowIso = new Date(now).toISOString();
  const batchId = ctx && ctx.batch_id;
  const isTest = Boolean(ctx && ctx.is_test);
  const writes = [{ method: 'POST', path: 'content_idea_batches', body: { id: batchId, week_start: week, created_by: 'hermes', proposed: final.length, discarded_weak: weak.length, discarded: weak.slice(0, 40), notes: String((p && p.notes) || '').slice(0, 1000) || null, is_test: isTest, created_at: nowIso }, prefer: 'return=minimal' }];
  final.forEach((r, i) => writes.push({ method: 'POST', path: 'content_ideas', body: { ...r, week_start: week, rank: i + 1, status: 'proposed', origin: 'hermes', batch_id: batchId, is_test: isTest, history: [{ at: nowIso, by: 'Hermes', what: 'propuesta' }], created_at: nowIso, updated_at: nowIso }, prefer: 'return=minimal' }));
  if (!isTest) writes.push({ method: 'POST', path: 'ops_runs', body: { kind: 'ideas_week', status: 'ok', summary: { mode: 'run', week_start: week, created: final.length, blocked: weak.length, reason: final.length + ' ideas propuestas para la semana del ' + week }, started_at: nowIso }, prefer: 'return=minimal' });
  return { resp: { ok: true, week_start: week, proposed: final.length, discarded_weak: weak.length, by_channel: final.reduce((m, r) => { m[r.channel] = (m[r.channel] || 0) + 1; return m; }, {}), weak: weak.slice(0, 20), text: final.length + ' ideas propuestas para la semana del ' + week + ' · ' + weak.length + ' descartadas por débiles.' }, writes };
}

/**
 * Hermes reescribe una idea: (a) «Cambiar» pedido por Christian (status changed → vuelve a proposed con la ficha nueva) o (b) completa la ficha de
 * «Mi idea» (sigue approved, ficha_complete=true). Mantiene id, semana y canal; guarda la versión anterior en history.
 */
export function ideasRevisePlan(p, idea, ctx) {
  const now = Number(ctx && ctx.now) || Date.now();
  if (!idea) return { error: 'idea_no_encontrada', message: 'No encontré esa idea.' };
  const forChange = idea.status === 'changed';
  const forMine = idea.origin === 'christian' && idea.status === 'approved' && !idea.ficha_complete;
  if (!forChange && !forMine) return { error: 'no_revisable', message: 'Solo se reescriben ideas con «Cambiar» pedido o «Mi idea» sin ficha completa (estado: ' + idea.status + ').' };
  const n = ideasNorm({ ...p, channel: idea.channel, format: (p && p.format) || idea.format, title: (p && p.title) || idea.title }, ctx && ctx.cfg);
  if (!n.ok) return { error: 'idea_invalida', message: n.errors.join(', ') };
  if (!n.row.ficha_complete) return { error: 'ficha_incompleta', message: 'Falta: ' + n.missing.join(', ') + '.' };
  if (forChange && !ideasEvidenceOk(n.row, ctx && ctx.known) && !ideasEvidenceOk({ evidence: idea.evidence || [] }, ctx && ctx.known)) return { error: 'sin_fuente', message: 'La idea reescrita necesita al menos una fuente verificada.' };
  const nowIso = new Date(now).toISOString();
  const prev = { title: idea.title, hook: idea.hook, core_message: idea.core_message, format: idea.format, change_request: idea.change_request || null };
  const body = { ...n.row, evidence: n.row.evidence.length ? n.row.evidence : (idea.evidence || []), source_ids: n.row.evidence.length ? n.row.source_ids : (idea.source_ids || []),
    status: forChange ? 'proposed' : 'approved', change_request: null, history: (Array.isArray(idea.history) ? idea.history : []).concat([{ at: nowIso, by: 'Hermes', what: forChange ? 'reescrita a pedido de Christian' : 'ficha completada', before: prev }]).slice(-20), updated_at: nowIso };
  return { resp: { ok: true, status: body.status, message: forChange ? 'Idea reescrita: vuelve a «por decidir».' : 'Ficha completada: la idea sigue aprobada.' },
    writes: [{ method: 'PATCH', path: 'content_ideas?id=eq.' + idea.id + '&status=eq.' + idea.status, body, prefer: 'return=representation', check_rows: true, check_message: 'La idea cambió mientras tanto; no se guardó.' }] };
}

/**
 * Decisión de Christian desde /ops (n8n 29 «idea_decide»): approve · change · discard · move. Nunca produce ni publica nada por sí sola.
 * `req` = { decision, text, reason, chips, week_start }. Devuelve { resp, writes } o { error, message }.
 */
export function ideasDecidePlan(req, idea, ctx) {
  const now = Number(ctx && ctx.now) || Date.now();
  if (!idea) return { error: 'idea_no_encontrada', message: 'No encontré esa idea.' };
  if (idea.is_test && !(ctx && ctx.allow_test)) return { error: 'idea_test', message: 'Esa idea es de prueba.' };
  const nowIso = new Date(now).toISOString();
  const by = (ctx && ctx.by) || 'Christian via /ops';
  const hist = (what, extra) => (Array.isArray(idea.history) ? idea.history : []).concat([{ at: nowIso, by, what, ...(extra || {}) }]).slice(-20);
  const guard = (states) => 'content_ideas?id=eq.' + idea.id + '&status=in.(' + states.join(',') + ')';
  const row = (body, states, msg) => ({ method: 'PATCH', path: guard(states), body: { ...body, updated_at: nowIso }, prefer: 'return=representation', check_rows: true, check_message: msg || 'La idea cambió mientras tanto. Recarga.' });
  const d = req.decision;
  if (d === 'approve') {
    if (idea.status === 'approved') return { resp: { ok: true, status: 'already_approved', message: 'Ya estaba aprobada.' }, writes: [] };
    if (idea.status !== 'proposed') return { error: 'no_aprobable', message: 'Solo se aprueba una idea «por decidir» (estado: ' + idea.status + ').' };
    return { resp: { ok: true, status: 'approved', message: 'Aprobada. Queda guardada para producción (no se publica ni programa sola).' }, writes: [row({ status: 'approved', decided_at: nowIso, decided_by: by, history: hist('aprobada') }, ['proposed'])] };
  }
  if (d === 'change') {
    const t = String(req.text || '').trim();
    if (t.length < 5) return { error: 'falta_cambio', message: 'Escribe qué cambiar (por ejemplo «otro ángulo» o «hazla más corta»).' };
    if (!['proposed', 'changed'].includes(idea.status)) return { error: 'no_cambiable', message: 'Esa idea ya no está por decidir (estado: ' + idea.status + ').' };
    return { resp: { ok: true, status: 'changed', message: 'Pedido guardado: Hermes la reescribe y vuelve a mostrártela.' }, writes: [row({ status: 'changed', change_request: t.slice(0, 1000), history: hist('cambio pedido', { text: t.slice(0, 300) }) }, ['proposed', 'changed'])] };
  }
  if (d === 'discard') {
    if (idea.status === 'discarded') return { resp: { ok: true, status: 'already_discarded', message: 'Ya estaba descartada.' }, writes: [] };
    if (!['proposed', 'changed', 'approved'].includes(idea.status)) return { error: 'no_descartable', message: 'Esa idea ya está en producción o publicada (estado: ' + idea.status + ').' };
    const chips = (Array.isArray(req.chips) ? req.chips : []).map((c) => String(c).slice(0, 40)).slice(0, 6);
    const reason = String(req.reason || '').trim().slice(0, 300) || null;
    return { resp: { ok: true, status: 'discarded', message: 'Descartada. La razón queda guardada para que Hermes aprenda.' },
      writes: [row({ status: 'discarded', decision_reason: reason, decision_chips: chips, decided_at: nowIso, decided_by: by, history: hist('descartada', { reason }) }, ['proposed', 'changed', 'approved']),
        { method: 'POST', path: 'learning_events', body: { type: 'idea_discard', subject_id: idea.id, before: { title: idea.title, channel: idea.channel, format: idea.format, hook: idea.hook, score: idea.score, origin: idea.origin }, after: null, reason: [chips.join(', '), reason].filter(Boolean).join(' — ') || null, by, is_test: Boolean(idea.is_test), created_at: nowIso }, prefer: 'return=minimal' }] };
  }
  if (d === 'move') {
    const w = String(req.week_start || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(w) || new Date(w + 'T12:00:00Z').getUTCDay() !== 1) return { error: 'semana_invalida', message: 'Elige una semana válida (lunes).' };
    if (w < ideasMonday(now)) return { error: 'semana_pasada', message: 'No se puede mover a una semana que ya pasó.' };
    if (!['proposed', 'changed', 'approved'].includes(idea.status)) return { error: 'no_movible', message: 'Esa idea ya está en producción o publicada.' };
    if (w === idea.week_start) return { resp: { ok: true, status: 'unchanged', message: 'Ya estaba en esa semana.' }, writes: [] };
    return { resp: { ok: true, status: 'moved', message: 'Movida a la semana del ' + w + '.' }, writes: [row({ week_start: w, history: hist('movida', { from: idea.week_start, to: w }) }, ['proposed', 'changed', 'approved'])] };
  }
  return { error: 'decision_invalida', message: 'Decisión inválida: usa approve | change | discard | move.' };
}

/** «Mi idea» (Christian): nace APROBADA con origin=christian; Hermes completa la ficha y se la muestra (spec §6.1). */
export function ideasMinePlan(req, ctx) {
  const now = Number(ctx && ctx.now) || Date.now();
  const C = ideasConfig();
  const title = String(req.title || '').trim();
  if (title.length < 5) return { error: 'falta_titulo', message: 'Escribe tu idea en una frase (mínimo 5 caracteres).' };
  if (!C.channels.includes(req.channel)) return { error: 'red_invalida', message: 'Elige la red.' };
  const format = C.formats.includes(req.format) ? req.format : (req.channel === 'instagram' ? 'carrusel' : 'texto');
  const week = /^\d{4}-\d{2}-\d{2}$/.test(String(req.week_start || '')) && new Date(req.week_start + 'T12:00:00Z').getUTCDay() === 1 && req.week_start >= ideasMonday(now) ? req.week_start : ideasMonday(now + 7 * 86400000);
  const nowIso = new Date(now).toISOString();
  const by = (ctx && ctx.by) || 'Christian via /ops';
  const body = { id: ctx && ctx.id, week_start: week, channel: req.channel, format, title: title.slice(0, 200), hook: String(req.text || '').trim().slice(0, 400) || null, why: 'Idea de Christian', status: 'approved', origin: 'christian', ficha_complete: false,
    production: { tools: [], how: '', material: null, lane: ideasLane(format) }, decided_at: nowIso, decided_by: by, is_test: Boolean(ctx && ctx.is_test), history: [{ at: nowIso, by, what: 'mi idea (nace aprobada)' }], created_at: nowIso, updated_at: nowIso };
  return { resp: { ok: true, status: 'approved', message: 'Tu idea quedó aprobada. Hermes completa su ficha y te la muestra para que la ajustes.' }, writes: [{ method: 'POST', path: 'content_ideas', body, prefer: 'return=minimal' }] };
}

/** Vista para /ops (ideas_list): por semana y red, ordenadas por fuerza, con plazo y ficha. Las más débiles van plegadas. */
export function ideasListView(ideas, batches, nowMs, tz) {
  const now = Number(nowMs) || Date.now();
  const next = ideasMonday(now + 7 * 86400000, tz), cur = ideasMonday(now, tz);
  const rows = (Array.isArray(ideas) ? ideas : []).filter((i) => !i.is_test);
  const label = { instagram: 'Instagram', linkedin_page: 'LinkedIn · página', linkedin_profile: 'LinkedIn · personal' };
  const view = (i) => ({ id: i.id, week_start: i.week_start, channel: i.channel, channel_label: label[i.channel] || i.channel, format: i.format, title: i.title, hook: i.hook, objective: i.objective, effort: i.effort, primary_metric: i.primary_metric,
    score: i.score, status: i.status, origin: i.origin, ficha_complete: i.ficha_complete === true, deadline: ['proposed', 'changed', 'approved'].includes(i.status) ? ideasDeadline(i, now, tz) : null,
    ficha: { audience_insight: i.audience_insight, core_message: i.core_message, structure: i.structure || [], cta: i.cta, production: i.production || {}, resource_id: i.resource_id, keyword: i.keyword, cost_note: i.cost_note, risks: i.risks, why: i.why, evidence: i.evidence || [], competitor_ref: i.competitor_ref, angle: i.angle },
    change_request: i.change_request || null, decision_reason: i.decision_reason || null, lane: ideasLane(i.format), piece_id: i.piece_id || null });
  const weeks = [...new Set(rows.map((i) => i.week_start))].filter((w) => w >= cur).sort();
  const out = weeks.map((w) => {
    const ws = rows.filter((i) => i.week_start === w);
    const b = (Array.isArray(batches) ? batches : []).filter((x) => x.week_start === w && !x.is_test).sort((a, c) => String(c.created_at).localeCompare(String(a.created_at)))[0] || null;
    const channels = ['instagram', 'linkedin_page', 'linkedin_profile'].map((ch) => {
      const list = ws.filter((i) => i.channel === ch && ['proposed', 'changed', 'approved', 'in_production', 'scheduled', 'published'].includes(i.status)).sort((a, c) => (a.status === 'proposed' ? 0 : 1) - (c.status === 'proposed' ? 0 : 1) || (c.score || 0) - (a.score || 0)).map(view);
      return { channel: ch, label: label[ch], ideas: list.filter((i) => i.score == null || i.score >= 75 || i.status !== 'proposed'), folded: list.filter((i) => i.score != null && i.score < 75 && i.status === 'proposed') };
    });
    return { week_start: w, is_next: w === next, counts: { proposed: ws.filter((i) => i.status === 'proposed').length, changed: ws.filter((i) => i.status === 'changed').length, approved: ws.filter((i) => i.status === 'approved').length, discarded: ws.filter((i) => i.status === 'discarded').length },
      discarded_weak: b ? b.discarded_weak : 0, weak: b ? (b.discarded || []).slice(0, 20) : [], batch_at: b ? b.created_at : null, channels };
  });
  return { generated_at: new Date(now).toISOString(), next_week: next, weeks: out };
}

/**
 * Contexto para el job de Hermes (ideas_gate): semana a proponer, topes, títulos a no repetir, fuentes verificadas recientes, recursos activos,
 * ángulos propios de la competencia, pedidos de cambio pendientes y «Mi idea» sin ficha. mode=skip si la pausa general está activa o el motor apagado.
 */
export function ideasGateView(d) {
  const now = Number(d && d.now) || Date.now();
  const C = ideasConfig();
  const week = ideasMonday(now + 7 * 86400000, d && d.tz);
  const ideas = Array.isArray(d && d.ideas_all) ? d.ideas_all : [];
  const since = ideasAddDays(week, -7 * C.dedupe_weeks);
  const recent = ideas.filter((i) => !i.is_test && i.week_start >= since).map((i) => ({ title: i.title, hook: i.hook || null, status: i.status, channel: i.channel, week_start: i.week_start }))
    .concat((Array.isArray(d && d.pieces) ? d.pieces : []).filter((p) => !p.is_test && Date.parse(p.created_at) >= now - 28 * 86400000).map((p) => ({ title: p.topic, hook: p.hook || null, status: 'pieza:' + p.status, channel: p.channel })));
  const already = ideas.filter((i) => !i.is_test && i.week_start === week && i.origin === 'hermes' && ['proposed', 'approved', 'changed'].includes(i.status)).length;
  const enabled = Boolean(d && d.content_cfg && d.content_cfg.ideas_enabled === true);
  const paused = Boolean(d && d.system_state && d.system_state.global_pause === true);
  const changes = ideas.filter((i) => !i.is_test && i.status === 'changed').map((i) => ({ id: i.id, title: i.title, channel: i.channel, format: i.format, change_request: i.change_request, hook: i.hook, core_message: i.core_message, evidence: i.evidence || [] }));
  const mine = ideas.filter((i) => !i.is_test && i.origin === 'christian' && i.status === 'approved' && !i.ficha_complete).map((i) => ({ id: i.id, title: i.title, channel: i.channel, format: i.format, hook: i.hook }));
  let mode = 'run', reason = 'Proponer la semana del ' + week + '.';
  if (paused) { mode = 'skip'; reason = 'Pausa general activa.'; }
  else if (!enabled) { mode = 'skip'; reason = 'El job de ideas está apagado (content_config.ideas_enabled = false).'; }
  else if (already > 0 && !changes.length && !mine.length) { mode = 'skip'; reason = 'Ya hay ' + already + ' ideas propuestas para la semana del ' + week + ' y no hay cambios pedidos.'; }
  else if (already > 0) { mode = 'revise'; reason = 'Solo reescribir: ' + changes.length + ' cambios pedidos y ' + mine.length + ' «Mi idea» sin ficha.'; }
  return { mode, reason, week_start: week, caps: C.caps, max_total: C.max_total, min_score: C.min_score, recent: recent.slice(0, 120), already, changes, mine,
    sources: (Array.isArray(d && d.sources_verified) ? d.sources_verified : []).slice(0, 40).map((s) => ({ id: s.id, title: s.title, url: s.url, kind: s.kind, signal_type: s.signal_type, date: s.source_date || s.created_at })),
    resources: (Array.isArray(d && d.resources) ? d.resources : []).filter((r) => r.status === 'active').map((r) => ({ id: r.id, name: r.name, slug: r.slug, url: r.url })),
    intel: d && d.intel ? { id: d.intel.id || null, at: d.intel.created_at, own_angles: ((d.intel.report || {}).own_angles || []).slice(0, 10), gaps: ((d.intel.report || {}).gaps || []).slice(0, 10) } : null,
    rules: ['Cada idea con ficha completa de 12 campos (objetivo, público/insight, gancho, idea central, formato, estructura, CTA si corresponde, cómo se produce, recurso si corresponde, costo/esfuerzo, riesgos, métrica principal).', 'Al menos una evidencia verificada: {type:"source", id} de las fuentes listadas, {type:"intel", id} del informe, {type:"resource", id} o {type:"metric", id} de una pieza propia.', 'Inspirarse en la competencia, nunca copiar texto, diseño ni mascota.', 'LinkedIn: su voz y su ritmo no se tocan; la página y el perfil son líneas separadas (el personal en primera persona).', 'Historias de Instagram sin texto en GHL.', 'No inventar datos.'] };
}

/** uuid v4 sin módulos (n8n no siempre expone crypto en el nodo Code). */
export function ideasNewId(rnd) {
  const r = rnd || Math.random;
  const h = (n) => Array.from({ length: n }, () => Math.floor(r() * 16).toString(16)).join('');
  return h(8) + '-' + h(4) + '-4' + h(3) + '-' + ['8', '9', 'a', 'b'][Math.floor(r() * 4)] + h(3) + '-' + h(12);
}
