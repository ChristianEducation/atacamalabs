/**
 * Atacama OS · Operación diaria — núcleo puro (Bloque 2): resumen diario, preguntas operativas, alertas con deduplicación, health y compuerta de costo del Radar.
 * AUTOCONTENIDO: se incrusta tal cual (Function.prototype.toString) en el workflow n8n «25 Atacama Ops». Sin red ni secretos: recibe datos ya leídos
 * de GHL / Supabase / n8n / Hermes y devuelve texto + decisiones. No inventa estados: si un dato no llegó, lo dice.
 */

import { linkedinOverview, liLabel } from '../linkedin/linkedin-core.mjs';
import { edPlan } from '../content/editorial-core.mjs';
import { growthResourceRank } from '../content/growth-core.mjs';

export function tzParts(ms, tz) {
  const p = new Intl.DateTimeFormat('en-US', { timeZone: tz || 'America/Santiago', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short' }).formatToParts(new Date(ms));
  const g = (t) => (p.find((x) => x.type === t) || {}).value;
  return { key: g('year') + '-' + g('month') + '-' + g('day'), hh: Number(g('hour')), mm: Number(g('minute')), dow: { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[g('weekday')], day: Number(g('day')), month: Number(g('month')) };
}
export function dayKey(ms, tz) { return tzParts(ms, tz).key; }
/** Días de calendario (zona Chile) entre dos instantes: hoy - antes. */
export function daysSince(thenMs, nowMs, tz) {
  const a = Date.parse(dayKey(thenMs, tz) + 'T00:00:00Z'), b = Date.parse(dayKey(nowMs, tz) + 'T00:00:00Z');
  return Math.round((b - a) / 86400000);
}
export function fmtDate(ms, tz) {
  const p = tzParts(ms, tz);
  const dows = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return dows[p.dow] + ' ' + p.day + ' ' + months[p.month - 1];
}
export function fmtDateTime(ms, tz) { const p = tzParts(ms, tz); return fmtDate(ms, tz) + ' ' + String(p.hh).padStart(2, '0') + ':' + String(p.mm).padStart(2, '0'); }
export function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }
export function names(list, max) {
  const l = (list || []).filter(Boolean);
  const m = max || 3;
  return l.slice(0, m).join(', ') + (l.length > m ? ' y ' + (l.length - m) + ' más' : '');
}
export function ageText(ms) {
  const mins = Math.max(0, Math.round(ms / 60000));
  if (mins < 90) return mins + ' min';
  if (mins < 60 * 36) return Math.round(mins / 60) + ' h';
  return Math.round(mins / 1440) + ' días';
}

/** Workflows de n8n vigilados. every = minutos entre ejecuciones programadas (null = se dispara por webhook). */
export function monitoredWorkflows() {
  return [
    { id: 'ZlYTYp9AVdCYPdwS', label: 'Prospect Gateway', every: null, critical: true },
    { id: 'Pm5XfYBocmWR3YgY', label: 'Hermes Operator', every: null, critical: true },
    { id: '7yRgPPDkiVyjmb3t', label: 'Outreach Engine', every: null, critical: true },
    { id: 'aRvzG87Qg4uqI5bD', label: 'Gmail Sender', every: 10, critical: true },
    { id: 'Bx4tC1Qn5H6097BL', label: 'Gmail Sync', every: 10, critical: true },
    { id: 'rWulaiKeio0CsXrs', label: 'Followup Planner', every: 30, critical: true },
    { id: 'idniXY0Du2qet57O', label: 'Lead Sync (formulario web)', every: 2, critical: true },
    { id: 'VsLCMZ6MeDsNvGzI', label: 'Booking Sync (reservas)', every: 2, critical: true },
    { id: 'wKrn00R0x4XXcfvR', label: 'Content Intake', every: null, critical: false },
    { id: '8EI8YcBJ5lQaPK0L', label: 'Content Signals', every: null, critical: false },
    { id: 'E9KMwNH7QmWbuy8Q', label: 'Content Sync', every: 30, critical: true },
    { id: 'HDUZ0nrGFiO01hYN', label: 'Content Metrics', every: 180, critical: false },
    { id: 'f29HJ40N7Vz8M3Rm', label: 'Content Learnings', every: null, critical: false },
    { id: 'aGe77cEyCmobdAg7', label: 'Prospect Search (Radar)', every: null, critical: false },
    { id: 've4uKTMQkGWzzmBV', label: 'LinkedIn Engine', every: null, critical: false },
    { id: 'M4LyGH4UxE5sYIh5', label: 'Content Growth', every: null, critical: false },
    { id: '6wnrHglfnt6l9va0', label: 'Content RSS', every: 60, critical: false },
  ];
}

/** Estado de un workflow vigilado: ok | atencion | fallo, con motivo. list = últimas ejecuciones [{status, startedAt}]. */
export function execHealth(w, list, active, nowMs) {
  const ex = (list || []).slice().sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
  if (active === false) return { status: w.critical ? 'fallo' : 'atencion', reason: 'está desactivado en n8n' };
  let streak = 0;
  for (const e of ex) { if (['error', 'crashed'].includes(e.status)) streak++; else break; }
  if (streak >= 3) return { status: 'fallo', reason: streak + ' errores seguidos (último hace ' + ageText(nowMs - Date.parse(ex[0].startedAt)) + ')' };
  if (w.every) {
    if (!ex.length) return { status: 'atencion', reason: 'aún sin ejecuciones' };
    const age = nowMs - Date.parse(ex[0].startedAt);
    if (age > (6 * w.every + 10) * 60000) return { status: 'fallo', reason: 'sin ejecutarse hace ' + ageText(age) + ' (debería correr cada ' + w.every + ' min)' };
    if (age > (3 * w.every + 5) * 60000) return { status: 'atencion', reason: 'sin ejecutarse hace ' + ageText(age) };
  }
  if (streak >= 1) return { status: 'atencion', reason: (streak === 1 ? 'su última ejecución falló' : streak + ' errores seguidos') + ' (hace ' + ageText(nowMs - Date.parse(ex[0].startedAt)) + ')' };
  if (!ex.length) return { status: 'ok', reason: 'sin uso reciente' };
  return { status: 'ok', reason: 'última ejecución OK hace ' + ageText(nowMs - Date.parse(ex[0].startedAt)) };
}

/** Jobs de Hermes que nos importan (por nombre). */
export function hermesJobChecks(hermes, nowMs) {
  const out = [];
  const jobs = (hermes && hermes.jobs) || [];
  for (const j of jobs) {
    const nm = String(j.name || '');
    if (!/(Prospect Radar|Content Radar|Content RSS|Content Pieces|Competitor|^atacama-)/i.test(nm)) continue;
    const last = j.last_run_at ? Date.parse(j.last_run_at) : null;
    const paused = j.state === 'paused' || j.enabled === false;
    let status = 'ok', reason = paused ? 'pausado (esperado)' : 'activo';
    if (!paused) {
      const streak = Number(j.failure_streak) || 0;
      if (streak >= 2) { status = 'fallo'; reason = streak + ' fallos seguidos'; }
      else if (j.last_status && j.last_status !== 'ok') { status = 'atencion'; reason = 'su última corrida terminó «' + j.last_status + '»'; }
      else if (j.next_run_at && Date.parse(j.next_run_at) < nowMs - 3 * 3600000) { status = 'atencion'; reason = 'tenía que correr hace ' + ageText(nowMs - Date.parse(j.next_run_at)) + ' y no lo hizo'; }
      else reason = 'activo' + (last ? ' · última corrida hace ' + ageText(nowMs - last) : '');
    }
    out.push({ id: j.id, name: nm, status, reason, paused });
  }
  return out;
}

export function stageKey(stages, id) { return Object.keys(stages || {}).find((k) => stages[k] === id) || null; }

/** Todo lo comercial: respuestas, seguimientos, tareas, estancadas, prospectos. */
export function summarizeCommercial(d) {
  const now = d.now, tz = (d.cfg && d.cfg.tz) || 'America/Santiago';
  const ign = ((d.cfg && d.cfg.ignore_opps) || []).map((x) => String(x).toLowerCase());
  const opps = (d.opps || []).filter((o) => !ign.some((x) => String(o.name || '').toLowerCase().includes(x))), msgs = d.messages || [], tasks = (d.tasks || []).filter((t) => !/^\(Example\)/i.test(String(t.title || '')));
  const cands = d.candidates || [];
  const stages = (d.cfg && d.cfg.stages) || {};
  const todayKey = dayKey(now, tz);
  const oppName = (o) => String(o.name || '').replace(/\s+—\s+Prospecto$/i, '').trim();
  // respuestas
  const newReplies = msgs.filter((m) => m.direction === 'inbound' && ['reply', 'decline'].includes(m.classification) && now - Date.parse(m.created_at) <= 36 * 3600000).map((m) => ({ company: m.company_name, cls: m.classification, at: m.created_at, preview: String(m.body || '').slice(0, 120) }));
  const awaiting = opps.filter((o) => stageKey(stages, o.pipelineStageId) === 'respondio').map((o) => ({ company: oppName(o), days: daysSince(Date.parse(o.lastStageChangeAt || o.updatedAt || o.createdAt), now, tz), id: o.id }));
  // seguimientos
  const fu = { today: [], overdue: [], drafts: [] };
  for (const m of msgs.filter((x) => x.kind === 'initial' && x.direction === 'outbound' && x.status === 'sent')) {
    const meta = m.metadata || {};
    if (/^(stopped|done)/.test(String(meta.followup_state || ''))) continue;
    const ft = meta.followup_tasks || {};
    for (const [kind, slot] of [['followup_1', 'f1'], ['followup_2', 'f2']]) {
      const due = ft[slot] && ft[slot].due ? Date.parse(ft[slot].due) : null;
      if (!due) continue;
      const mine = msgs.filter((x) => x.candidate_id === m.candidate_id && x.kind === kind && x.direction === 'outbound');
      if (mine.some((x) => x.status === 'sent')) continue;
      const draft = mine.find((x) => ['draft', 'approved'].includes(x.status));
      const dk = dayKey(due, tz);
      const item = { company: m.company_name, kind, due: new Date(due).toISOString(), draft: draft ? draft.status : null };
      if (draft && draft.status === 'draft') fu.drafts.push(item);
      if (dk === todayKey) fu.today.push(item); else if (dk < todayKey) fu.overdue.push(item);
    }
  }
  // tareas vencidas (agrupadas por tipo)
  const overdueTasks = tasks.filter((t) => t.dueDate && Date.parse(t.dueDate) < now && !t.completed);
  const groups = {};
  overdueTasks.forEach((t) => { const k = String(t.title || 'Tarea').split(/[:·]/)[0].trim().slice(0, 40); (groups[k] = groups[k] || []).push(t); });
  const taskGroups = Object.keys(groups).map((k) => ({ type: k, count: groups[k].length, oldest_days: Math.max(...groups[k].map((t) => daysSince(Date.parse(t.dueDate), now, tz))) })).sort((a, b) => b.count - a.count);
  // oportunidades estancadas / sin próximo paso
  const limits = { nuevo: 1, respondio: 3, contactado: 9, diagnostico: 5, propuesta: 7, seguimiento: 7 };
  const stale = opps.map((o) => ({ o, st: stageKey(stages, o.pipelineStageId), days: daysSince(Date.parse(o.lastStageChangeAt || o.updatedAt || o.createdAt), now, tz) }))
    .filter((x) => x.st && limits[x.st] != null && x.days >= limits[x.st] && x.st !== 'investigado').map((x) => ({ company: oppName(x.o), stage: x.st, days: x.days, id: x.o.id }));
  const taskContacts = new Set(tasks.filter((t) => !t.completed).map((t) => t.contactId));
  const noNext = opps.filter((o) => ['respondio', 'diagnostico', 'propuesta', 'seguimiento'].includes(stageKey(stages, o.pipelineStageId)) && !taskContacts.has(o.contactId)).map((o) => ({ company: oppName(o), stage: stageKey(stages, o.pipelineStageId), id: o.id }));
  // prospectos
  const newCands = cands.filter((c) => now - Date.parse(c.created_at) <= 24 * 3600000);
  const radarNew = newCands.filter((c) => /radar/i.test(String(c.source_name || '')));
  const backlog = cands.filter((c) => c.status === 'in_ghl' && c.ghl_stage === 'investigado');
  const oldest = backlog.length ? Math.max(...backlog.map((c) => daysSince(Date.parse(c.created_at), now, tz))) : 0;
  const approved = msgs.filter((m) => m.direction === 'outbound' && ['approved', 'sending'].includes(m.status));
  const drafts = msgs.filter((m) => m.direction === 'outbound' && m.status === 'draft' && m.kind === 'initial');
  return { new_replies: newReplies, awaiting_reply: awaiting, followups: fu, task_groups: taskGroups, overdue_tasks_total: overdueTasks.length, stale, no_next_step: noNext,
    prospects: { new_24h: newCands.length, new_alta: newCands.filter((c) => c.band === 'alta').length, radar_new: radarNew.map((c) => ({ company: c.company_name, band: c.band, score: c.priority_score })), backlog: backlog.length, backlog_alta: backlog.filter((c) => c.band === 'alta').length, backlog_oldest_days: oldest, backlog_top: backlog.slice().sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0)).slice(0, 3).map((c) => c.company_name) },
    outreach: { mode: (d.outreach && d.outreach.mode) || 'desconocido', approved_pending: approved.length, drafts_initial: drafts.length } };
}

/** Todo lo de contenido. */
export function summarizeContent(d) {
  const now = d.now, tz = (d.cfg && d.cfg.tz) || 'America/Santiago';
  const pcs = (d.pieces || []).filter((p) => !p.is_test);
  const ch = { instagram: 'Instagram Atacama', linkedin_page: 'LinkedIn Atacama Labs', linkedin_profile: 'LinkedIn Christian' };
  const lab = (p) => '«' + String(p.topic || 'pieza').slice(0, 60) + '» (' + (ch[p.channel] || p.channel) + ')';
  const pending = pcs.filter((p) => p.status === 'in_review' || (p.ghl_status === 'in_review' && p.ghl_approval_status !== 'approved'));
  const scheduled = pcs.filter((p) => p.status === 'scheduled' && p.scheduled_at).map((p) => ({ label: lab(p), at: p.scheduled_at, in_h: Math.round((Date.parse(p.scheduled_at) - now) / 3600000) })).sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const late = pcs.filter((p) => ['scheduled', 'approved'].includes(p.status) && p.scheduled_at && now - Date.parse(p.scheduled_at) > 60 * 60000 && !p.published_at);
  const failed = pcs.filter((p) => p.status === 'failed' || p.ghl_status === 'failed');
  const published = pcs.filter((p) => p.status === 'published' && p.published_at && now - Date.parse(p.published_at) <= 72 * 3600000).map((p) => ({ label: lab(p), at: p.published_at }));
  const snaps = (d.metrics || []).filter((m) => now - Date.parse(m.captured_at) <= 26 * 3600000 && m.status !== 'error').map((m) => {
    const p = pcs.find((x) => x.id === m.content_piece_id);
    return { label: p ? lab(p) : 'pieza', window: m.metric_window, likes: m.likes, comments: m.comments, shares: m.shares, partial: m.status === 'partial' };
  });
  const metricErrors = (d.metrics || []).filter((m) => m.status === 'error' && now - Date.parse(m.captured_at) <= 48 * 3600000).length;
  const learned = pcs.filter((p) => p.learning && p.learned_at && now - Date.parse(p.learned_at) <= 7 * 86400000).map((p) => lab(p));
  return { pending_review: pending.map(lab), scheduled, late: late.map(lab), failed: failed.map(lab), published_recent: published, snapshots: snaps, metric_errors: metricErrors, learned, candidate_signals: Number(d.signals_candidate) || 0, total_pieces: pcs.length, tz };
}

/** Estado de cada componente (health). */
export function healthReport(d) {
  const now = d.now;
  const wfs = d.workflows || [];
  const comp = [];
  const by = {};
  for (const w of monitoredWorkflows()) {
    const meta = wfs.find((x) => x.id === w.id);
    const h = execHealth(w, (d.execs || {})[w.id] || [], meta ? meta.active : undefined, now);
    by[w.id] = { ...h, label: w.label, critical: w.critical };
  }
  const pick = (ids, name, extra) => {
    const parts = ids.map((id) => by[id]).filter(Boolean);
    const worst = parts.some((p) => p.status === 'fallo') ? 'fallo' : parts.some((p) => p.status === 'atencion') ? 'atencion' : 'ok';
    const bad = parts.filter((p) => p.status !== 'ok');
    comp.push({ name, status: worst, reason: bad.length ? bad.map((p) => (parts.length === 1 && p.label === name ? '' : p.label + ': ') + p.reason).join(' · ') + (extra || '') : (parts[0] ? parts[0].reason : 'sin datos') + (extra || '') });
  };
  pick(['ZlYTYp9AVdCYPdwS'], 'Prospect Gateway');
  pick(['Pm5XfYBocmWR3YgY'], 'Hermes Operator');
  pick(['7yRgPPDkiVyjmb3t'], 'Outreach Engine');
  pick(['ve4uKTMQkGWzzmBV'], 'LinkedIn Engine');
  const gm = d.gmail || null;
  const gmailNote = (w) => (gm && gm[w] ? (gm[w].credential_access ? ' · Gmail conectado (' + (gm[w].account || 'cuenta') + ')' : ' · Gmail NO responde (credencial)') : '');
  pick(['aRvzG87Qg4uqI5bD'], 'Gmail Sender', gmailNote('w22'));
  pick(['Bx4tC1Qn5H6097BL'], 'Gmail Sync', gmailNote('w23'));
  if (gm) { ['w22', 'w23'].forEach((k) => { const c = comp.find((x) => x.name === (k === 'w22' ? 'Gmail Sender' : 'Gmail Sync')); if (gm[k] && !gm[k].credential_access) c.status = 'fallo'; else if (gm[k] && k === 'w22' && gm[k].send_scope_ok === false) { c.status = 'fallo'; c.reason += ' · sin permiso de envío'; } }); }
  pick(['rWulaiKeio0CsXrs'], 'Followup Planner');
  const jobs = hermesJobChecks(d.hermes, now);
  const noHermes = !d.hermes || !Array.isArray(d.hermes.jobs);
  const jb = (re) => jobs.find((j) => re.test(j.name));
  const pr = jb(/Prospect Radar/i), cr = jb(/Content Radar/i);
  const lastRadar = (d.runs || []).filter((r) => r.kind === 'prospect_radar')[0];
  comp.push(pr ? { name: 'Prospect Radar', status: pr.status, reason: pr.reason + (lastRadar ? ' · último reporte hace ' + ageText(now - Date.parse(lastRadar.created_at)) : '') } : { name: 'Prospect Radar', status: noHermes ? 'ok' : 'atencion', reason: noHermes ? 'estado del job no informado (se lee desde Hermes)' : 'no aparece el job en Hermes' });
  comp.push(cr ? { name: 'Content Radar', status: cr.status, reason: cr.reason } : { name: 'Content Radar', status: noHermes ? 'ok' : 'atencion', reason: noHermes ? 'estado del job no informado (se lee desde Hermes)' : 'no aparece el job en Hermes' });
  pick(['wKrn00R0x4XXcfvR', '8EI8YcBJ5lQaPK0L', 'E9KMwNH7QmWbuy8Q'], 'Content Engine');
  const cont = summarizeContent(d);
  const ce = comp[comp.length - 1];
  if (cont.failed.length || cont.late.length) { ce.status = 'fallo'; ce.reason += ' · publicación con problema: ' + names(cont.failed.concat(cont.late), 2); }
  pick(['6wnrHglfnt6l9va0'], 'Content RSS (ingestión)');
  const g0 = summarizeGrowth(d);
  const rssc = comp[comp.length - 1];
  if (g0.rss.failing.length && rssc.status === 'ok') { rssc.status = 'atencion'; rssc.reason = 'feeds con fallos: ' + g0.rss.failing.map((f) => f.slug + ' (' + (f.error || 'error') + ')').join(', '); }
  [[/Content RSS/i, 'Content RSS (Hermes)'], [/Content Pieces/i, 'Content Pieces (Hermes)'], [/Competitor/i, 'Inteligencia orgánica (Hermes)']].forEach(([re, nm]) => {
    const j = jb(re);
    comp.push(j ? { name: nm, status: j.status, reason: j.reason } : { name: nm, status: noHermes ? 'ok' : 'atencion', reason: noHermes ? 'estado del job no informado (se lee desde Hermes)' : 'no aparece entre los jobs de Hermes' });
  });
  pick(['HDUZ0nrGFiO01hYN', 'f29HJ40N7Vz8M3Rm'], 'Métricas de contenido', cont.metric_errors ? ' · ' + cont.metric_errors + ' snapshot(s) con error' : '');
  const mc = comp[comp.length - 1]; if (cont.metric_errors && mc.status === 'ok') mc.status = 'atencion';
  pick(['idniXY0Du2qet57O', 'VsLCMZ6MeDsNvGzI'], 'Captura de leads y reservas (web)');
  const other = jobs.filter((j) => /^atacama-/i.test(j.name));
  other.forEach((j) => comp.push({ name: 'Job Hermes · ' + j.name, status: j.status, reason: j.reason }));
  if (d.hermes_age_ms != null) { const m = Math.round(d.hermes_age_ms / 60000); comp.push({ name: 'Hermes · reporte de alertas', status: m <= 35 ? 'ok' : m <= 90 ? 'atencion' : 'fallo', reason: m <= 35 ? 'reportó hace ' + m + ' min' : 'no reporta hace ' + m + ' min: el job de alertas puede estar caído' }); }
  const h = d.hermes || {};
  if (h.gateway_ok === false) comp.push({ name: 'Hermes / Telegram', status: 'fallo', reason: 'el gateway de mensajería no responde' });
  else if (h.disk_pct != null) comp.push({ name: 'Hermes / servidor', status: Number(h.disk_pct) >= 85 ? 'atencion' : 'ok', reason: 'disco al ' + h.disk_pct + '%' });
  const mode = (d.outreach && d.outreach.mode) || 'desconocido';
  const overall = comp.some((c) => c.status === 'fallo') ? 'fallo' : comp.some((c) => c.status === 'atencion') ? 'atencion' : 'ok';
  return { overall, components: comp, outreach_mode: mode, by_workflow: by };
}

export function healthText(h) {
  const icon = { ok: 'OK', atencion: 'ATENCIÓN', fallo: 'FALLO' };
  const lines = ['ESTADO DE ATACAMA OS: ' + icon[h.overall] + (h.overall === 'ok' ? ' · todo funcionando' : '')];
  const bad = h.components.filter((c) => c.status !== 'ok');
  bad.forEach((c) => lines.push('• ' + icon[c.status] + ' · ' + c.name + ': ' + c.reason));
  const ok = h.components.filter((c) => c.status === 'ok');
  if (ok.length) lines.push('OK (' + ok.length + '): ' + ok.map((c) => c.name).join(', '));
  lines.push('Envío real de correos: ' + (h.outreach_mode === 'off' ? 'apagado (modo off)' : 'modo ' + h.outreach_mode));
  return lines.join('\n');
}

/** Construye las secciones del Daily. */
export function buildSections(d) {
  const c = summarizeCommercial(d), ct = summarizeContent(d), h = healthReport(d);
  const tz = (d.cfg && d.cfg.tz) || 'America/Santiago';
  const action = [], review = [], good = [];
  const push = (arr, key, text) => arr.push({ key, text });
  // --- NECESITA TU ACCIÓN
  const respNames = c.awaiting_reply.map((r) => r.company);
  if (c.awaiting_reply.length) push(action, 'replies', plural(c.awaiting_reply.length, 'respuesta por atender', 'respuestas por atender') + ': ' + names(respNames, 3) + (c.new_replies.length ? ' (' + plural(c.new_replies.length, 'llegó', 'llegaron') + ' en las últimas 36 h)' : ''));
  else if (c.new_replies.length) push(action, 'replies', plural(c.new_replies.length, 'respuesta nueva', 'respuestas nuevas') + ': ' + names(c.new_replies.map((r) => r.company), 3));
  if (c.followups.overdue.length) push(action, 'fu_overdue', plural(c.followups.overdue.length, 'seguimiento vencido', 'seguimientos vencidos') + ': ' + names(c.followups.overdue.map((f) => f.company + (f.draft ? ' (borrador listo)' : ' (sin borrador)')), 3));
  if (c.followups.today.length) push(action, 'fu_today', plural(c.followups.today.length, 'seguimiento para hoy', 'seguimientos para hoy') + ': ' + names(c.followups.today.map((f) => f.company + (f.draft ? ' (borrador listo)' : '')), 3));
  if (c.no_next_step.length) push(action, 'no_next', plural(c.no_next_step.length, 'oportunidad sin próximo paso', 'oportunidades sin próximo paso') + ': ' + names(c.no_next_step.map((o) => o.company), 3));
  const staleHot = c.stale.filter((s) => ['nuevo', 'respondio', 'propuesta', 'diagnostico'].includes(s.stage));
  if (staleHot.length) push(action, 'stale_hot', plural(staleHot.length, 'oportunidad estancada', 'oportunidades estancadas') + ': ' + names(staleHot.map((s) => s.company + ' (' + s.stage + ', ' + s.days + ' d)'), 3));
  if (ct.pending_review.length) push(action, 'content_pending', plural(ct.pending_review.length, 'publicación pendiente de aprobación', 'publicaciones pendientes de aprobación') + ': ' + names(ct.pending_review, 2));
  if (ct.failed.length || ct.late.length) push(action, 'content_failed', 'Publicación con problema: ' + names(ct.failed.concat(ct.late), 2));
  if (c.outreach.approved_pending) push(action, 'approved_pending', plural(c.outreach.approved_pending, 'correo aprobado esperando salir', 'correos aprobados esperando salir') + (c.outreach.mode === 'off' ? ' (el envío está apagado)' : ''));
  const sysBad = h.components.filter((x) => x.status !== 'ok');
  sysBad.filter((x) => x.status === 'fallo').forEach((x) => push(action, 'sys_' + x.name, 'FALLO · ' + x.name + ': ' + x.reason));
  if (c.overdue_tasks_total) {
    const imp = c.task_groups.filter((g) => /respuesta|reuni|propuesta|diagn/i.test(g.type));
    if (imp.length) push(action, 'tasks_important', 'Tareas vencidas importantes: ' + imp.map((g) => g.count + ' «' + g.type + '»').join(', '));
  }
  missingNotes(d).forEach((m, i) => push(action, 'missing' + i, m));
  // --- PARA REVISAR
  const p = c.prospects;
  if (p.new_24h || p.backlog) {
    const bits = [];
    if (p.new_24h) bits.push(plural(p.new_24h, 'candidato nuevo', 'candidatos nuevos') + (p.new_alta ? ' (' + p.new_alta + ' prioridad alta)' : '') + (p.radar_new.length ? ' · del Radar: ' + names(p.radar_new.map((r) => r.company), 3) : ''));
    if (p.backlog) bits.push(plural(p.backlog, 'prospecto en Investigado', 'prospectos en Investigado') + ' sin decisión' + (p.backlog_oldest_days ? ' (el más antiguo: ' + p.backlog_oldest_days + ' d)' : '') + (p.backlog_alta ? ', ' + p.backlog_alta + ' de prioridad alta' : ''));
    push(review, 'prospects', 'Prospección: ' + bits.join(' · '));
  }
  if (c.followups.drafts.length && !c.followups.overdue.length && !c.followups.today.length) push(review, 'fu_drafts', plural(c.followups.drafts.length, 'borrador de seguimiento esperando tu aprobación', 'borradores de seguimiento esperando tu aprobación') + ': ' + names(c.followups.drafts.map((f) => f.company), 3));
  const staleOther = c.stale.filter((s) => !['nuevo', 'respondio', 'propuesta', 'diagnostico'].includes(s.stage));
  if (staleOther.length) push(review, 'stale_other', plural(staleOther.length, 'oportunidad quieta', 'oportunidades quietas') + ': ' + names(staleOther.map((s) => s.company + ' (' + s.stage + ', ' + s.days + ' d)'), 3));
  if (c.task_groups.length) push(review, 'tasks', plural(c.overdue_tasks_total, 'tarea vencida', 'tareas vencidas') + ': ' + c.task_groups.slice(0, 3).map((g) => g.count + ' «' + g.type + '»').join(', '));
  if (ct.scheduled.length) push(review, 'content_sched', 'Programadas: ' + ct.scheduled.slice(0, 3).map((s) => s.label + ' ' + fmtDateTime(Date.parse(s.at), tz)).join(' · '));
  if (ct.published_recent.length) push(review, 'content_pub', 'Publicadas (72 h): ' + names(ct.published_recent.map((x) => x.label), 2));
  ct.snapshots.slice(0, 3).forEach((s, i) => push(review, 'snap' + i, 'Métricas ' + s.window + ' listas: ' + s.label + ' → ' + (s.likes == null && s.comments == null && s.shares == null ? 'sin cifras de GHL' : [s.likes != null ? s.likes + ' likes' : null, s.comments != null ? s.comments + ' comentarios' : null, s.shares != null ? s.shares + ' compartidos' : null].filter(Boolean).join(', ')) + (s.partial ? ' (parcial)' : '')));
  if (ct.learned.length) push(review, 'learned', 'Aprendizaje nuevo (7 d): ' + names(ct.learned, 2));
  if (ct.candidate_signals) push(review, 'signals', plural(ct.candidate_signals, 'señal candidata de contenido sin pieza', 'señales candidatas de contenido sin pieza'));
  sysBad.filter((x) => x.status === 'atencion').forEach((x) => push(review, 'sys_' + x.name, 'Sistema · ' + x.name + ': ' + x.reason));
  const errs = d.errors24h || [];
  if (errs.length) push(review, 'errors24', 'Ejecuciones fallidas en 24 h: ' + errs.slice(0, 4).map((e) => e.name + ' (' + e.count + ')').join(', '));
  // --- TODO BIEN
  if (!sysBad.length) push(good, 'sys_ok', 'Sistema operativo (' + h.components.length + ' componentes revisados)');
  push(good, 'outreach', 'Envío real de correos: ' + (c.outreach.mode === 'off' ? 'apagado (modo off)' : 'modo ' + c.outreach.mode));
  return { action, review, good, health: h, commercial: c, content: ct };
}

/** Texto del Daily (corto, por prioridad). */
export function composeDaily(d) {
  const tz = (d.cfg && d.cfg.tz) || 'America/Santiago';
  const s = buildSections(d);
  const head = 'ATACAMA DAILY · ' + fmtDate(d.now, tz);
  const out = [head];
  const sect = (title, items) => { if (!items.length) return; out.push('', title); items.forEach((i) => out.push('• ' + i.text)); };
  if (!s.action.length && !s.review.length) {
    out.push('', 'Sin novedades: nada que requiera tu acción hoy.');
    sect('TODO BIEN', s.good);
  } else {
    sect('NECESITA TU ACCIÓN', s.action);
    sect('PARA REVISAR', s.review);
    sect('TODO BIEN', s.good);
  }
  out.push('', 'Pregúntame: «¿qué tengo que hacer hoy?», «¿quién respondió?», «¿qué falló?»');
  return { text: out.join('\n'), action_count: s.action.length, review_count: s.review.length, sections: s };
}

/** Solo lo urgente / qué hacer hoy. */
export function composeUrgent(d) {
  const s = buildSections(d);
  const tz = (d.cfg && d.cfg.tz) || 'America/Santiago';
  if (!s.action.length) return { text: 'Nada urgente ahora (' + fmtDate(d.now, tz) + '). ' + (s.review.length ? 'Para revisar: ' + s.review.map((r) => r.text).slice(0, 3).join(' · ') : 'Todo en orden.'), count: 0 };
  return { text: 'URGENTE (' + s.action.length + '):\n' + s.action.map((a) => '• ' + a.text).join('\n'), count: s.action.length };
}

/** Compuerta de costo/calidad del Prospect Radar: ¿corre y en qué modo? */
export function radarGate(d) {
  const now = d.now;
  const c = summarizeCommercial(d);
  const runs = (d.runs || []).filter((r) => r.kind === 'prospect_radar' && r.status === 'ok');
  const last = runs[0] ? Date.parse(runs[0].created_at) : null;
  const week = runs.filter((r) => now - Date.parse(r.created_at) <= 7 * 86400000 && (r.summary || {}).mode !== 'skip').length;
  const backlog = c.prospects.backlog;
  const maxBacklog = 25;
  if (last && now - last < 20 * 3600000) return { mode: 'skip', max_imports: 0, reason: 'ya corrió hace ' + ageText(now - last), backlog, week };
  if (week >= 3) return { mode: 'skip', max_imports: 0, reason: 'tope semanal de corridas alcanzado (' + week + ' de 3)', backlog, week };
  if (backlog >= maxBacklog) return { mode: 'skip', max_imports: 0, reason: 'hay ' + backlog + ' prospectos en Investigado sin decisión (tope ' + maxBacklog + '): primero se revisan', backlog, week };
  return { mode: 'import', max_imports: Math.max(1, Math.min(5, maxBacklog - backlog)), reason: 'ok (' + backlog + ' en Investigado, ' + week + ' corridas esta semana)', backlog, week };
}

/**
 * Alertas: reglas SOLO para lo que merece interrumpir. existing = filas de ops_alerts. Devuelve el conjunto actual, qué notificar ahora y qué resolver.
 * Deduplicación por alert_key: un evento se avisa una vez; una condición abierta no se repite salvo si es crítica (cada 12 h, máx. 3 veces).
 */
export function evaluateAlerts(d, existing) {
  const now = d.now, tz = (d.cfg && d.cfg.tz) || 'America/Santiago';
  const cur = [];
  const add = (key, severity, title, detail, event, meta) => cur.push({ key, severity, title, detail: detail || '', event: Boolean(event), meta: meta || {} });
  const h = healthReport(d);
  // 1) automatizaciones críticas caídas / con fallos repetidos / Gmail Sync
  for (const w of monitoredWorkflows().filter((x) => x.critical)) {
    const r = h.by_workflow[w.id];
    if (r && r.status === 'fallo') add('wf_down:' + w.id, 'critical', w.label + ' caído', r.reason, false);
  }
  const wfFlag = (d.gmail && d.gmail.w22 && d.gmail.w22.credential_access === false);
  if (wfFlag) add('gmail_auth:w22', 'critical', 'Gmail: la credencial no responde (envío)', 'Gmail Sender no puede conectarse; revisa la credencial OAuth en n8n.', false);
  if (d.gmail && d.gmail.w23 && d.gmail.w23.credential_access === false) add('gmail_auth:w23', 'critical', 'Gmail: la credencial no responde (lectura)', 'Gmail Sync no puede leer respuestas; revisa la credencial OAuth en n8n.', false);
  // 2) Gateway bloqueado: ≥2 errores en las últimas 3 ejecuciones, dentro de 2 h
  const gw = ((d.execs || {})['ZlYTYp9AVdCYPdwS'] || []).slice().sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt)).slice(0, 3);
  if (gw.filter((e) => ['error', 'crashed'].includes(e.status) && now - Date.parse(e.startedAt) <= 2 * 3600000).length >= 2) add('gateway_blocked', 'critical', 'Prospect Gateway con errores repetidos', 'Dos de sus últimas 3 ejecuciones fallaron: puede estar bloqueando el ingreso de prospectos.', false);
  // 3) respuestas de prospectos (evento, una vez por mensaje)
  for (const m of (d.messages || []).filter((x) => x.direction === 'inbound' && ['reply', 'decline', 'unsubscribe', 'bounce'].includes(x.classification) && now - Date.parse(x.created_at) <= 24 * 3600000)) {
    const label = { reply: 'Respondió', decline: 'Rechazó', unsubscribe: 'Pidió baja', bounce: 'Rebote' }[m.classification];
    const sev = ['reply', 'decline'].includes(m.classification) ? 'high' : 'info';
    if (sev === 'info') continue;
    add('reply:' + m.id, sev, label + ': ' + (m.company_name || 'prospecto'), String(m.body || '').replace(/\s+/g, ' ').slice(0, 160), true);
  }
  // 4) publicación aprobada que no salió / fallida
  const cont = summarizeContent(d);
  (d.pieces || []).filter((p) => !p.is_test && (p.status === 'failed' || p.ghl_status === 'failed' || (['scheduled', 'approved'].includes(p.status) && p.scheduled_at && now - Date.parse(p.scheduled_at) > 60 * 60000 && !p.published_at))).forEach((p) => add('publish_failed:' + p.id, 'high', 'Publicación sin salir: «' + String(p.topic || '').slice(0, 60) + '»', 'Estaba programada para ' + (p.scheduled_at ? fmtDateTime(Date.parse(p.scheduled_at), tz) : 's/f') + ' y no figura publicada.', false));
  // 5) jobs de Hermes con fallos repetidos
  for (const j of hermesJobChecks(d.hermes, now).filter((x) => x.status === 'fallo' && !x.paused)) add('hermes_job:' + j.id, 'high', 'Job de Hermes con fallos: ' + j.name, j.reason, false);
  for (const m of (d.messages || []).filter((x) => x.direction === 'outbound' && x.status === 'sending' && x.updated_at && now - Date.parse(x.updated_at) > 15 * 60000)) add('sending_stuck:' + m.id, 'high', 'Correo colgado en «enviando» hace ' + ageText(now - Date.parse(m.updated_at)) + ': ' + (m.company_name || 'prospecto'), 'El envío no terminó ni falló: revisa Gmail Sender antes de aprobar otro correo a esa empresa.', false);
  for (const x of (d.candidates || []).filter((c) => ((c.channel_state || {}).linkedin || {}).state === 'error')) add('li_error:' + x.id, 'high', 'LinkedIn: no se pudo insertar en Waalaxy — ' + x.company_name, String(x.channel_state.linkedin.next_action || 'Revisar el error').slice(0, 160), false);
  if (d.hermes && d.hermes.gateway_ok === false) add('hermes_gateway', 'critical', 'Hermes: el gateway de mensajería no responde', 'Telegram puede no estar entregando mensajes.', false);
  if (d.hermes && Number(d.hermes.disk_pct) >= 90) add('disk_full', 'high', 'Servidor de Hermes con el disco al ' + d.hermes.disk_pct + '%', 'Se puede quedar sin espacio.', false);
  // 6) avisos de corrida de los radares: una vez por corrida, en formato corto (no son fallas)
  for (const r of (d.runs || []).filter((x) => ['prospect_radar', 'content_radar', 'content_rss', 'competitor_intel', 'content_pieces'].includes(x.kind) && x.id && now - Date.parse(x.created_at) <= 24 * 3600000)) {
    if (r.status === 'skipped' || (r.summary || {}).mode === 'skip') continue;
    const n = runNotice(d, r);
    if (!n) continue;
    add('run:' + r.id, n.severity, n.title, '', true, { notice: n.text });
  }
  // 7) feeds RSS con 3+ fallos seguidos (aviso, no crítico)
  summarizeGrowth(d).rss.failing.forEach((f) => add('rss_feed:' + f.slug, 'high', 'Feed RSS con fallos: ' + f.slug, f.error + ' (' + f.failures + ' veces seguidas)', false));
  // --- dedupe
  existing = (existing || []).filter((e) => !/^_(state|lock):/.test(String(e.alert_key)));
  const ex = {}; (existing || []).forEach((e) => { ex[e.alert_key] = e; });
  const curKeys = new Set(cur.map((c) => c.key));
  const upserts = [], notify = [];
  for (const c of cur) {
    const e = ex[c.key];
    if (e && e.status === 'open' && !((e.notify_count || 0) > 0)) { upserts.push({ ...c, op: 'touch' }); notify.push(c); continue; }   // guardada pero nunca confirmada (falló la entrega): se reintenta
    if (e && e.event) { upserts.push({ ...c, op: 'touch' }); continue; }   // un evento (respuesta) se avisa UNA vez, aunque la fila esté cerrada
    if (!e || e.status === 'resolved') { upserts.push({ ...c, op: 'insert', reopen: Boolean(e) }); notify.push(c); continue; }
    upserts.push({ ...c, op: 'touch' });
    const age = e.last_notified_at ? now - Date.parse(e.last_notified_at) : Infinity;
    if (!e.event && c.severity === 'critical' && age >= 12 * 3600000 && (e.notify_count || 0) < 3) notify.push({ ...c, repeat: true });
  }
  const resolve = (existing || []).filter((e) => e.status === 'open' && !curKeys.has(e.alert_key) && !e.event).map((e) => e.alert_key);
  return { current: cur, upserts, notify, resolve, health: h.overall };
}

export function alertsText(notify) {
  if (!notify || !notify.length) return '';
  const sev = { critical: 'CRÍTICO', high: 'IMPORTANTE', info: 'AVISO' };
  const notices = notify.filter((a) => a.meta && a.meta.notice), alerts = notify.filter((a) => !(a.meta && a.meta.notice));
  const blocks = [];
  if (alerts.length) {
    const lines = ['ATACAMA OS · ' + (alerts.length === 1 ? 'alerta' : alerts.length + ' alertas')];
    alerts.forEach((a) => lines.push('• ' + sev[a.severity] + ' · ' + a.title + (a.detail ? ' — ' + a.detail : '') + (a.repeat ? ' (sigue sin resolverse)' : '')));
    blocks.push(lines.join('\n'));
  }
  notices.forEach((a) => blocks.push(a.meta.notice));
  return blocks.join('\n\n');
}

/** Rendimiento del contenido para «¿qué funcionó mejor?»: solo cifras reales de GHL. */
export function composePerformance(d) {
  const ct = summarizeContent(d);
  const pcs = (d.pieces || []).filter((p) => !p.is_test);
  const metrics = (d.metrics || []).filter((m) => m.status !== 'error');
  if (!pcs.some((p) => p.status === 'published')) {
    const nxt = ct.scheduled[0];
    return { text: 'Todavía no hay publicaciones publicadas con métricas.' + (nxt ? ' La próxima: ' + nxt.label + ' ' + fmtDateTime(Date.parse(nxt.at), (d.cfg && d.cfg.tz) || 'America/Santiago') + '. Los snapshots se toman a 24 h, 72 h y 7 días de publicar.' : ''), pieces: [] };
  }
  const rows = pcs.filter((p) => p.status === 'published').map((p) => {
    const ms = metrics.filter((m) => m.content_piece_id === p.id);
    const best = ms.slice().sort((a, b) => ['24h', '72h', '7d'].indexOf(b.metric_window) - ['24h', '72h', '7d'].indexOf(a.metric_window))[0];
    const eng = best ? (best.likes || 0) + (best.comments || 0) + (best.shares || 0) : null;
    return { topic: p.topic, channel: p.channel, window: best ? best.metric_window : null, likes: best ? best.likes : null, comments: best ? best.comments : null, shares: best ? best.shares : null, engagement: eng, learning: p.learning && p.learning.guia ? p.learning.guia : null };
  });
  const withData = rows.filter((r) => r.engagement != null).sort((a, b) => b.engagement - a.engagement);
  const lines = [];
  if (!withData.length) lines.push('Hay ' + plural(rows.length, 'pieza publicada', 'piezas publicadas') + ' pero aún sin snapshots de métricas (24 h / 72 h / 7 d).');
  else {
    lines.push('Mejores por interacción visible (likes + comentarios + compartidos; GHL no entrega impresiones por publicación):');
    withData.slice(0, 3).forEach((r, i) => lines.push((i + 1) + '. «' + String(r.topic).slice(0, 60) + '» (' + r.channel + ', ' + r.window + '): ' + r.engagement + ' (' + (r.likes || 0) + ' likes, ' + (r.comments || 0) + ' comentarios, ' + (r.shares || 0) + ' compartidos)'));
    if (withData.length < 5) lines.push('Muestra pequeña (n=' + withData.length + '): son indicios, no conclusiones; no se comparan canales entre sí.');
  }
  return { text: lines.join('\n'), pieces: rows };
}

// ---------------------------------------------------------------------------------------------------------------------
// Vistas para las preguntas de Hermes («¿qué tengo que hacer hoy?», «¿quién respondió?», …). Todas leen del mismo conjunto de datos reales.
// ---------------------------------------------------------------------------------------------------------------------
export function missingNotes(d) {
  const lab = { ghl: 'GHL (oportunidades y tareas)', supabase: 'Supabase (mensajes y prospectos)', n8n: 'n8n (ejecuciones)' };
  return (d.missing || []).map((m) => 'No pude leer ' + (lab[m] || m) + ': esa parte está incompleta, no es que no haya nada.');
}
export function composeToday(d) {
  const tz = (d.cfg && d.cfg.tz) || 'America/Santiago';
  const s = buildSections(d), c = s.commercial;
  const lines = ['HOY · ' + fmtDate(d.now, tz)];
  if (s.action.length) { lines.push('Necesita tu acción:'); s.action.forEach((a) => lines.push('• ' + a.text)); } else lines.push('Nada urgente.');
  const dueToday = (d.tasks || []).filter((t) => !t.completed && t.dueDate && dayKey(Date.parse(t.dueDate), tz) === dayKey(d.now, tz) && !/^\(Example\)/i.test(String(t.title || '')));
  if (dueToday.length) lines.push('Tareas que vencen hoy (' + dueToday.length + '): ' + names(dueToday.map((t) => t.title), 3));
  if (c.followups.today.length && !s.action.some((a) => a.key === 'fu_today')) lines.push('Seguimientos de hoy: ' + names(c.followups.today.map((f) => f.company), 3));
  const todayPub = s.content.scheduled.filter((x) => dayKey(Date.parse(x.at), tz) === dayKey(d.now, tz));
  if (todayPub.length) lines.push('Publicaciones de hoy: ' + todayPub.map((x) => x.label + ' ' + fmtDateTime(Date.parse(x.at), tz).slice(-5)).join(' · '));
  return { text: lines.join('\n'), count: s.action.length };
}
export function composeStale(d) {
  const c = summarizeCommercial(d);
  if (!c.stale.length && !c.no_next_step.length) return { text: 'No hay oportunidades quietas ni sin próximo paso (umbrales: Nuevo 1 d, Respondió 3 d, Contactado 9 d, Diagnóstico 5 d, Propuesta/Seguimiento 7 d).', count: 0 };
  const lines = [];
  if (c.stale.length) { lines.push('Oportunidades quietas (' + c.stale.length + '):'); c.stale.slice().sort((a, b) => b.days - a.days).forEach((s) => lines.push('• ' + s.company + ' — ' + s.stage + ', ' + s.days + ' días sin moverse')); }
  if (c.no_next_step.length) { lines.push('Sin próximo paso (sin tarea abierta) (' + c.no_next_step.length + '):'); c.no_next_step.forEach((s) => lines.push('• ' + s.company + ' — ' + s.stage)); }
  return { text: lines.join('\n'), count: c.stale.length + c.no_next_step.length };
}
export function composeReplies(d) {
  const c = summarizeCommercial(d);
  if (!c.new_replies.length && !c.awaiting_reply.length) return { text: 'Nadie ha respondido que siga pendiente de atender.', count: 0 };
  const lines = [];
  if (c.new_replies.length) { lines.push('Respuestas recientes (36 h):'); c.new_replies.forEach((r) => lines.push('• ' + r.company + ' [' + r.cls + ']: «' + r.preview + '»')); }
  if (c.awaiting_reply.length) lines.push('En «Respondió» esperando que las atiendas (' + c.awaiting_reply.length + '): ' + c.awaiting_reply.map((r) => r.company + ' (' + r.days + ' d)').join(', '));
  return { text: lines.join('\n'), count: c.new_replies.length + c.awaiting_reply.length };
}
export function composeFollowups(d) {
  const f = summarizeCommercial(d).followups;
  const tz = (d.cfg && d.cfg.tz) || 'America/Santiago';
  if (!f.today.length && !f.overdue.length && !f.drafts.length) return { text: 'No hay seguimientos pendientes hoy ni vencidos.', count: 0 };
  const line = (x) => '• ' + x.company + ' — ' + x.kind.replace('followup_', 'seguimiento ') + ' (vence ' + fmtDate(Date.parse(x.due), tz) + ')' + (x.draft ? ' · borrador ' + (x.draft === 'draft' ? 'listo para aprobar' : 'aprobado') : ' · aún sin borrador');
  const lines = [];
  if (f.overdue.length) { lines.push('Vencidos (' + f.overdue.length + '):'); f.overdue.forEach((x) => lines.push(line(x))); }
  if (f.today.length) { lines.push('Para hoy (' + f.today.length + '):'); f.today.forEach((x) => lines.push(line(x))); }
  const extra = f.drafts.filter((x) => !f.overdue.concat(f.today).some((y) => y.company === x.company && y.kind === x.kind));
  if (extra.length) { lines.push('Borradores esperando aprobación (' + extra.length + '):'); extra.forEach((x) => lines.push(line(x))); }
  return { text: lines.join('\n'), count: f.today.length + f.overdue.length + extra.length };
}
export function composeRadarNew(d) {
  const now = d.now, tz = (d.cfg && d.cfg.tz) || 'America/Santiago';
  const rc = (d.candidates || []).filter((c) => /radar/i.test(String(c.source_name || '')) && now - Date.parse(c.created_at) <= 7 * 86400000).sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  const last = (d.runs || []).filter((r) => r.kind === 'prospect_radar')[0];
  const lines = [];
  if (!rc.length) lines.push('El Radar no ha traído candidatos nuevos en los últimos 7 días.');
  else { lines.push('Candidatos del Radar (7 d): ' + rc.length); rc.slice(0, 8).forEach((c) => lines.push('• ' + c.company_name + ' — ' + c.priority_score + ' (' + c.band + ')' + (c.ghl_stage ? ' · ' + c.ghl_stage : ''))); }
  lines.push(last ? 'Última corrida: ' + fmtDateTime(Date.parse(last.created_at), tz) + ' · modo ' + ((last.summary || {}).mode || last.status) + (last.est_cost_usd != null ? ' · costo estimado US$ ' + last.est_cost_usd : '') : 'Sin corridas registradas todavía.');
  return { text: lines.join('\n'), count: rc.length };
}
export function composeContentStatus(d) {
  const tz = (d.cfg && d.cfg.tz) || 'America/Santiago';
  const ct = summarizeContent(d);
  const lines = [];
  if (ct.pending_review.length) lines.push('Pendientes de tu aprobación (' + ct.pending_review.length + '): ' + ct.pending_review.join(' · '));
  if (ct.scheduled.length) lines.push('Programadas: ' + ct.scheduled.map((s) => s.label + ' ' + fmtDateTime(Date.parse(s.at), tz)).join(' · '));
  if (ct.published_recent.length) lines.push('Publicadas (72 h): ' + ct.published_recent.map((p) => p.label + ' ' + fmtDateTime(Date.parse(p.at), tz)).join(' · '));
  if (ct.failed.length || ct.late.length) lines.push('CON PROBLEMA: ' + ct.failed.concat(ct.late).join(' · '));
  if (ct.candidate_signals) lines.push(plural(ct.candidate_signals, 'señal candidata', 'señales candidatas') + ' esperando que se redacte la pieza');
  if (!lines.length) lines.push('No hay piezas en revisión, programadas ni publicadas recientemente.');
  return { text: lines.join('\n'), count: lines.length };
}

/** Aprendizajes del Content Engine (workflow 16): solo lo que ya existe; con n pequeño se dice que es tentativo. */
export function composeLearnings(L) {
  if (!L || L.ok === false || typeof L !== 'object') return { text: 'No pude leer los aprendizajes del Content Engine.', count: 0 };
  const n = Number(L.n_learnings) || 0;
  if (!n) return { text: 'Todavía no hay aprendizajes: se generan 7 días después de publicar cada pieza (la primera publicación es del 7-oct, así que el primero llegaría hacia el 14-oct).', count: 0 };
  const lines = ['Aprendizajes del Content Engine (' + n + (n === 1 ? ' pieza' : ' piezas') + ' con 7 días de datos):'];
  const grp = (title, arr) => { if (arr && arr.length) lines.push(title + ': ' + arr.map((g) => g.key + ' (n=' + g.n + (g.avg_actions != null ? ', promedio ' + g.avg_actions + ' interacciones' : '') + (g.tentative ? ', tentativo' : '') + ')').join(' · ')); };
  grp('Por canal', L.by_channel); grp('Por categoría', L.by_category); grp('Por formato', L.by_format);
  (L.learnings || []).slice(-3).forEach((l) => { if (l.guidance || l.worked) lines.push('• «' + String(l.topic || '').slice(0, 50) + '»: ' + [l.worked ? 'funcionó: ' + [].concat(l.worked).join('; ').slice(0, 100) : null, l.guidance ? 'guía: ' + (typeof l.guidance === 'string' ? l.guidance : JSON.stringify(l.guidance)).slice(0, 100) : null].filter(Boolean).join(' · ')); });
  if (L.do_not_repeat_hooks && L.do_not_repeat_hooks.length) lines.push('No repetir ganchos: ' + names(L.do_not_repeat_hooks.map((h) => String(h).slice(0, 40)), 3));
  lines.push(String(L.note || 'Con n<5 es tentativo; no se compara Instagram con LinkedIn.'));
  return { text: lines.join('\n'), count: n };
}

/** Compuerta de costo/calidad del Content Radar: no investiga si ya hay material sin usar o piezas sin revisar. */
export function contentGate(d) {
  const now = d.now;
  const ct = summarizeContent(d);
  const g = summarizeGrowth(d);
  const runs = (d.runs || []).filter((r) => r.kind === 'content_radar' && r.status === 'ok');
  const last = runs[0] ? Date.parse(runs[0].created_at) : null;
  const base = { pending_review: ct.pending_review.length, max_pending_in_review: g.queue.max, candidate_signals: ct.candidate_signals, pieces_allowed: !g.queue.full };
  if (last && now - last < 5 * 86400000) return { mode: 'skip', reason: 'ya corrió hace ' + ageText(now - last) + ' (cadencia semanal)', ...base };
  // Content Queue Governor: con la cola llena el radar SIGUE recolectando señales, pero no se crean piezas por cuenta propia.
  if (ct.candidate_signals >= 12) return { mode: 'skip', reason: 'ya hay ' + ct.candidate_signals + ' señales candidatas sin convertir en pieza', ...base };
  return { mode: 'run', max_signals: 5, reason: 'ok (' + ct.pending_review.length + '/' + g.queue.max + ' piezas en revisión' + (g.queue.full ? ': cola llena, solo recolecta señales' : '') + ', ' + ct.candidate_signals + ' señales candidatas)', ...base };
}

/** Ola A · Resumen de lo nuevo (cola, RSS, inteligencia orgánica, recursos, Founder Interview) para compuertas, panel y alertas. */
export function summarizeGrowth(d) {
  const now = d.now, tz = (d.cfg && d.cfg.tz) || 'America/Santiago';
  const cfg = d.content_cfg || {};
  const max = Number(cfg.max_pending_in_review) > 0 ? Number(cfg.max_pending_in_review) : 6;
  const pending = summarizeContent(d).pending_review.length;
  const feeds = (d.feeds || []).filter((f) => f.enabled !== false);
  const failing = feeds.filter((f) => (Number(f.consecutive_failures) || 0) >= 3).map((f) => ({ slug: f.slug, error: f.last_error || 'error', failures: Number(f.consecutive_failures) || 0 }));
  const checked = feeds.map((f) => (f.last_checked_at ? Date.parse(f.last_checked_at) : 0)).filter(Boolean);
  const lastChecked = checked.length ? Math.max(...checked) : null;
  const run = (kind) => (d.runs || []).find((r) => r.kind === kind && r.status === 'ok') || null;
  const runInfo = (r) => (r ? { at: r.created_at, ago: ageText(now - Date.parse(r.created_at)), summary: r.summary || {} } : null);
  const newItems = (d.feed_new || []).length;
  const rep = d.intel || null;
  const R = rep && rep.report ? rep.report : {};
  const use = {}; (d.resource_use || []).forEach((x) => { if (x.resource_id) { use[x.resource_id] = (use[x.resource_id] || 0) + 1; } });
  const resources = (d.resources || []).filter((r) => r.status === 'active').map((r) => ({ slug: r.slug, name: r.name, type: r.type, cta_mode: r.cta_mode, url: r.url, uses: use[r.id] || 0 }));
  const ivs = d.interviews || [];
  const lastIv = ivs[0] || null;
  return {
    queue: { pending, max, full: pending >= max },
    rss: { enabled: cfg.rss_enabled !== false, feeds_total: feeds.length, feeds_ok: feeds.filter((f) => f.last_status === 'ok').length, failing, new_items: newItems, last_checked_ago: lastChecked ? ageText(now - lastChecked) : null, last_checked_ms: lastChecked, last_run: runInfo(run('content_rss')) },
    intel: { enabled: cfg.competitor_enabled !== false, last_run: runInfo(run('competitor_intel')), report_at: rep ? rep.created_at : null, report_ago: rep ? ageText(now - Date.parse(rep.created_at)) : null, competitors: rep ? rep.competitors_scanned || [] : [], gaps: (R.gaps || []).slice(0, 4), saturated: (R.saturated_topics || []).slice(0, 4), own_angles: (R.own_angles || []).slice(0, 3).map((a) => a.angle) },
    resources: { active: resources.length, rows: resources.slice(0, 8) },
    founder: { pending_answer: ivs.filter((x) => x.status === 'asked').length, answered_without_pieces: ivs.filter((x) => x.status === 'answered').length, last: lastIv ? { status: lastIv.status, question: clip(lastIv.question, 140), at: lastIv.asked_at, ago: ageText(now - Date.parse(lastIv.asked_at)) } : null },
    pieces_run: runInfo(run('content_pieces')), tz,
  };
}

/** Compuerta del job «Content RSS» de Hermes: solo corre (y gasta IA) si hay artículos nuevos relevantes y la cola lo permite. */
export function rssGate(d) {
  const now = d.now, g = summarizeGrowth(d), ct = summarizeContent(d);
  const rel = (d.feed_new || []).filter((x) => (Number(x.relevance) || 0) >= 2).length;
  const base = { new_items: g.rss.new_items, relevant_items: rel, pending_review: g.queue.pending, max_pending_in_review: g.queue.max, candidate_signals: ct.candidate_signals };
  if (!g.rss.enabled) return { mode: 'skip', reason: 'RSS desactivado en la configuración del Content', ...base };
  if (!rel) return { mode: 'skip', reason: 'sin artículos nuevos relevantes (' + g.rss.new_items + ' nuevos en total)', ...base };
  const last = g.rss.last_run ? Date.parse(g.rss.last_run.at) : null;
  if (last && now - last < 10 * 3600000) return { mode: 'skip', reason: 'ya corrió hace ' + ageText(now - last), ...base };
  if (ct.candidate_signals >= 12) return { mode: 'skip', reason: 'ya hay ' + ct.candidate_signals + ' señales candidatas sin pieza', ...base };
  return { mode: 'run', max_signals: 3, reason: 'ok (' + rel + ' artículos relevantes nuevos)', ...base };
}

/** Compuerta de la inteligencia orgánica de competencia: cadencia semanal y solo fuentes públicas. */
export function competitorGate(d) {
  const now = d.now, g = summarizeGrowth(d);
  if (!g.intel.enabled) return { mode: 'skip', reason: 'inteligencia orgánica desactivada en la configuración del Content' };
  const last = g.intel.last_run ? Date.parse(g.intel.last_run.at) : null;
  if (last && now - last < 5 * 86400000) return { mode: 'skip', reason: 'ya corrió hace ' + ageText(now - last) + ' (cadencia semanal)' };
  return { mode: 'run', reason: 'ok (' + (last ? 'última hace ' + ageText(now - last) : 'primera corrida') + ')', max_pages_per_competitor: 4 };
}

/**
 * Ritmo editorial semanal (America/Santiago, semana lun–dom). X = publicadas + programadas (lo que cuenta como «hecho»);
 * las que están en revisión se muestran aparte, pero SÍ cuentan para decidir si el Content Engine debe seguir generando.
 * Regla persistente (content_config): objetivo 5/semana, mínimo sano 4, máximo normal 6, 1 publicación por cuenta y día, runway deseado 3–5 días.
 */
export function weeklyContent(d) {
  const now = d.now, tz = (d.cfg && d.cfg.tz) || 'America/Santiago';
  const c = d.content_cfg || {};
  const num = (v, def) => (v != null && Number.isFinite(Number(v)) ? Number(v) : def);
  const target = num(c.weekly_target, 5) > 0 ? num(c.weekly_target, 5) : 5, minOk = num(c.weekly_min, 4), maxNormal = num(c.weekly_max, 6) > 0 ? num(c.weekly_max, 6) : 6;
  const runwayMin = num(c.runway_min_days, 3), runwayMax = num(c.runway_max_days, 5) > 0 ? num(c.runway_max_days, 5) : 5;
  const p = tzParts(now, tz);
  const sinceMon = (p.dow + 6) % 7;
  const startKey = dayKey(now - sinceMon * 86400000, tz);            // lunes de esta semana (calendario de Chile)
  const endKey = dayKey(now + (6 - sinceMon) * 86400000, tz);        // domingo de esta semana
  const inWeek = (iso) => { if (!iso) return false; const k = dayKey(Date.parse(iso), tz); return k >= startKey && k <= endKey; };
  const pcs = (d.pieces || []).filter((x) => !x.is_test);
  const published = pcs.filter((x) => x.status === 'published' && inWeek(x.published_at)).length;
  const scheduled = pcs.filter((x) => ['scheduled', 'approved'].includes(x.status) && inWeek(x.scheduled_at)).length;
  const inReview = pcs.filter((x) => (x.status === 'in_review' || (x.ghl_status === 'in_review' && x.ghl_approval_status !== 'approved')) && inWeek(x.scheduled_at || x.created_at)).length;
  const done = published + scheduled;
  const coverage = done + inReview;
  // Runway: días de calendario hasta la última pieza programada o en revisión (0 si no hay nada por delante).
  const future = pcs.filter((x) => ['scheduled', 'approved', 'in_review'].includes(x.status) && x.scheduled_at && Date.parse(x.scheduled_at) >= now).map((x) => Date.parse(x.scheduled_at));
  const runway = future.length ? Math.max(0, daysSince(now, Math.max(...future), tz)) : 0;
  const state = done > maxNormal ? 'exceso' : done === maxNormal ? 'cubierta' : done >= minOk ? 'correcto' : done === 3 ? 'ritmo' : 'falta';
  const labels = { falta: 'Falta contenido', ritmo: 'En ritmo', correcto: 'Ritmo correcto', cubierta: 'Semana cubierta', exceso: 'No generar más automáticamente salvo señal excepcional o instrucción explícita' };
  return { week_start: startKey, week_end: endKey, target, min: minOk, max: maxNormal, done, published, scheduled, in_review: inReview, coverage, state, state_label: labels[state], runway_days: runway, runway_min: runwayMin, runway_max: runwayMax, runway_ok: runway >= runwayMin, covered: coverage >= target };
}

/**
 * Ola B · EDITORIAL DECISION: dada una señal (params.signal) y el estado real de la semana, la cola, las piezas recientes y los recursos existentes,
 * decide si vale la pena publicar y propone, por cuenta, tipo editorial, ángulo, formato, visual, recurso y CTA. Solo lectura: no crea ni publica nada.
 */
export function editorialDecision(d, params) {
  const p = params && typeof params === 'object' ? params : {};
  const s = p.signal && typeof p.signal === 'object' ? p.signal : p;
  const str = (v, n) => String(v == null ? '' : v).trim().slice(0, n);
  const signal = { topic: str(s.topic, 200), summary: str(s.summary, 600), kind: str(s.kind, 30), type_hint: str(s.type_hint, 30), urgent: s.urgent === true, personal: s.personal === true ? true : undefined, visualizable: s.visualizable === false ? false : undefined };
  const w = weeklyContent(d), g = summarizeGrowth(d);
  const resources = growthResourceRank(d.resources, signal.topic + ' ' + signal.summary, { limit: 3 });
  const recent = (d.pieces || []).filter((x) => !x.is_test).slice(0, 40).map((x) => ({ channel: x.channel, editorial_type: x.editorial_type || null, topic: x.topic, status: x.status, created_at: x.created_at }));
  const plan = edPlan({ signal, week: w, pending: g.queue.pending, max_pending: g.queue.max, recent, resources, explicit: p.explicit === true, include_instagram: p.include_instagram === false ? false : undefined, now: d.now });
  const lines = [plan.publish ? 'Editorial Decision: SÍ vale la pena — ' + plan.reason + '.' : 'Editorial Decision: NO publicar ahora — ' + plan.reason + '.'];
  (plan.proposals || []).forEach((q) => lines.push('• ' + q.account + ' · ' + q.editorial_type + ' · formato ' + q.format + ' · visual ' + q.visual.need + ' · CTA ' + q.cta_mode + (q.resource ? ' · recurso «' + q.resource.name + '»' : '')));
  (plan.notes || []).forEach((n) => lines.push('— ' + n));
  return { ...plan, text: lines.join('\n') };
}

/** Compuerta del job que redacta piezas: solo si la cola y el ritmo semanal lo permiten y hay señales candidatas (una señal urgente puede saltarse el ritmo, nunca el tope de la cola). */
export function piecesGate(d) {
  const now = d.now, g = summarizeGrowth(d), ct = summarizeContent(d), w = weeklyContent(d);
  const base = { pending_review: g.queue.pending, max_pending_in_review: g.queue.max, candidate_signals: ct.candidate_signals, week_done: w.done, week_coverage: w.coverage, week_target: w.target, runway_days: w.runway_days };
  if (g.queue.full) return { mode: 'skip', reason: 'cola de revisión llena (' + g.queue.pending + '/' + g.queue.max + '): primero se revisa', ...base };
  if (!ct.candidate_signals) return { mode: 'skip', reason: 'no hay señales candidatas', ...base };
  const last = g.pieces_run ? Date.parse(g.pieces_run.at) : null;
  if (last && now - last < 18 * 3600000) return { mode: 'skip', reason: 'ya corrió hace ' + ageText(now - last), ...base };
  // Excepción: señal urgente = noticia con score ≥ 90 detectada en las últimas 48 h; aun así nunca se pasa del máximo normal semanal.
  const urgent = (d.signals_list || []).find((x) => Number(x.signal_score) >= 90 && now - Date.parse(x.created_at) <= 48 * 3600000 && (!x.signal_type || x.signal_type === 'news'));
  if ((w.covered || w.runway_days >= w.runway_max) && !(urgent && w.coverage < w.max)) {
    return { mode: 'skip', reason: w.covered ? 'semana cubierta (' + w.coverage + '/' + w.target + ' entre publicadas, programadas y en revisión): los radares siguen recolectando, no se fabrican piezas solo por llenar la cola' : 'ya hay ' + w.runway_days + ' días de contenido por delante (runway máx. ' + w.runway_max + ')', ...base };
  }
  const room = Math.max(1, w.target - w.coverage);
  return { mode: 'run', max_pieces: urgent && w.covered ? 1 : Math.max(1, Math.min(2, g.queue.max - g.queue.pending, room)), urgent_signal: urgent ? String(urgent.title).slice(0, 120) : null, reason: 'ok (' + ct.candidate_signals + ' señales candidatas, ' + g.queue.pending + '/' + g.queue.max + ' en revisión, semana ' + w.coverage + '/' + w.target + (urgent && w.covered ? ', señal URGENTE' : '') + ')', ...base };
}

/** Nombre corto para Telegram/panel: quita palabras genéricas y la ciudad («Laboratorio Clínico Luis Pasteur Antofagasta» → «Luis Pasteur»). */
export function shortName(name) {
  const raw = String(name || '').replace(/\s+/g, ' ').trim();
  if (raw.length <= 16) return raw;
  const drop = /^(laboratorio|laboratorios|clínico|clinico|clínica|clinica|centro|centros|servicios|servicio|empresa|sociedad|comercial|inmobiliaria|constructora|grupo|instituto|y|e|de|del|la|las|los|el|spa|ltda|s\.a\.|sa|antofagasta|calama|santiago|chile|iquique|arica|copiapó|copiapo|maquinarias|maquinaria|médico|medico|dental)$/i;
  const parts = raw.split(' ').filter((w) => !drop.test(w));
  const out = parts.slice(0, 2).join(' ');
  return out || raw.slice(0, 16);
}

/** Recorta a n caracteres sin cortar a media palabra, con «…». */
export function clip(text, n) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  if (t.length <= n) return t;
  const cut = t.slice(0, n - 1);
  return (cut.replace(/\s+\S*$/, '') || cut) + '…';
}

/**
 * Datos estructurados para la vista /ops (solo lectura): atención, prospección, contenido y sistema.
 * La lógica vive aquí (una sola fuente de verdad) y Next.js solo la dibuja.
 */
export function composePanel(d) {
  const now = d.now, tz = (d.cfg && d.cfg.tz) || 'America/Santiago';
  const s = buildSections(d), c = s.commercial, ct = s.content, h = s.health;
  const chLabel = { instagram: 'Instagram Atacama', linkedin_page: 'LinkedIn Atacama Labs', linkedin_profile: 'LinkedIn Christian' };
  const pcs = (d.pieces || []).filter((p) => !p.is_test);
  // --- atención
  const att = [];
  const add = (key, tone, title, items) => { if (items.length) att.push({ key, tone, title, count: items.length, items: items.slice(0, 6), more: Math.max(0, items.length - 6) }); };
  const awaiting = c.awaiting_reply.map((r) => r.company + (r.days ? ' · hace ' + r.days + ' d' : ''));
  const replyNames = awaiting.length ? awaiting : c.new_replies.map((r) => r.company);
  add('replies', 'act', replyNames.length === 1 ? 'Respuesta por atender' : 'Respuestas por atender', replyNames);
  add('fu_overdue', 'act', 'Seguimientos vencidos', c.followups.overdue.map((f) => f.company + (f.draft ? ' · borrador listo' : ' · sin borrador')));
  add('fu_today', 'act', 'Seguimientos para hoy', c.followups.today.map((f) => f.company + (f.draft ? ' · borrador listo' : '')));
  const imp = c.task_groups.filter((g) => /respuesta|reuni|propuesta|diagn|seguimiento/i.test(g.type));
  add('tasks', 'act', 'Tareas vencidas', imp.map((g) => g.count + ' × ' + g.type + ' · hasta ' + g.oldest_days + ' d'));
  add('no_next', 'act', 'Oportunidades sin próximo paso', c.no_next_step.map((o) => o.company + ' · ' + o.stage));
  add('stale', 'warn', 'Oportunidades estancadas', c.stale.map((x) => x.company + ' · ' + x.stage + ' · ' + x.days + ' d'));
  add('content_pending', 'act', 'Contenido por aprobar', ct.pending_review.map((x) => x));
  add('content_failed', 'act', 'Publicación con problema', ct.failed.concat(ct.late));
  { const g1 = summarizeGrowth(d); if (g1.queue.full) add('content_queue_full', 'warn', 'Cola de contenido llena', ['Hay ' + g1.queue.pending + ' de ' + g1.queue.max + ' piezas en revisión: el sistema no propone más hasta que apruebes o rechaces']); if (g1.founder.answered_without_pieces) add('founder_answered', 'warn', 'Entrevista respondida sin pieza', ['Christian respondió y falta estructurar la pieza']); if (g1.rss.failing.length) add('rss_failing', 'warn', 'Feeds RSS con fallos', g1.rss.failing.map((f) => f.slug + ' · ' + f.error)); }
  add('system_fail', 'act', 'Sistema con fallas', h.components.filter((x) => x.status === 'fallo').map((x) => x.name + ' · ' + x.reason));
  // --- prospección
  const cands = d.candidates || [];
  const inv = cands.filter((x) => x.status === 'in_ghl' && x.ghl_stage === 'investigado');
  const lastRun = (d.runs || []).find((r) => r.kind === 'prospect_radar' && r.status === 'ok' && (r.summary || {}).mode !== 'skip') || null;
  const runAt = lastRun ? Date.parse(lastRun.created_at) : null;
  const winMin = lastRun ? (Number((lastRun.summary || {}).minutes) || 5) + 10 : 0;
  const fresh = (x) => Boolean(runAt) && /radar/i.test(String(x.source_name || '')) && Date.parse(x.created_at) >= runAt - winMin * 60000;
  const latest = inv.slice().sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at) || (b.priority_score || 0) - (a.priority_score || 0)).slice(0, 12).map((x) => ({
    company: x.company_name, short: shortName(x.company_name), score: x.priority_score, band: x.band, industry: x.industry || null, city: x.location || null, domain: x.domain || null,
    angle: x.angle ? clip(x.angle, 220) : null, quote: x.quote ? clip(x.quote, 200) : null, source: x.source_name || null, days: daysSince(Date.parse(x.created_at), now, tz), is_new: fresh(x) }));
  const contacted = cands.filter((x) => x.status === 'contacted' || (x.ghl_stage && x.ghl_stage !== 'investigado')).length;
  const prospecting = {
    backlog: inv.length, backlog_alta: inv.filter((x) => x.band === 'alta').length, new_since_run: cands.filter(fresh).length, new_since_run_alta: cands.filter((x) => fresh(x) && x.band === 'alta').length,
    contacted, overdue_review_tasks: (c.task_groups.find((g) => /revisar prospecto/i.test(g.type)) || { count: 0 }).count,
    last_run: lastRun ? { at: lastRun.created_at, label: fmtDateTime(runAt, tz), imported: Number((lastRun.summary || {}).imported) || 0, minutes: Number((lastRun.summary || {}).minutes) || 0, ago: ageText(now - runAt) } : null, latest };
  // --- contenido
  const sig = (d.signals_list || []).slice(0, 8).map((x) => ({ title: clip(x.title, 110), type: x.signal_type || null, angle: x.angle ? clip(x.angle, 160) : null, at: x.created_at, ago: ageText(now - Date.parse(x.created_at)) }));
  const rv = {}; (d.review_pieces || []).forEach((x) => { rv[x.id] = x; });
  const previewOf = (id) => {
    const x = rv[id]; if (!x || !x.piece) return null;
    const pc = x.piece, sl = Array.isArray(pc.slides) ? pc.slides : [];
    return { hook: pc.hook ? String(pc.hook) : null, body: pc.body ? String(pc.body) : null, cta: pc.cta && pc.cta.text ? String(pc.cta.text) : null, hashtags: Array.isArray(pc.hashtags) ? pc.hashtags.slice(0, 5) : [],
      slides: sl.slice(0, 10).map((s) => ({ layout: s.layout || null, kicker: s.kicker ? clip(s.kicker, 40) : null, title: clip(String(s.title || '').replace(/\*/g, ''), 100), body: s.body ? clip(s.body, 200) : null,
        items: Array.isArray(s.items) ? s.items.slice(0, 4).map((i) => (typeof i === 'object' && i ? clip(i.title, 40) + (i.text ? ': ' + clip(i.text, 80) : '') : clip(i, 80))) : [],
        compare: s.compare ? [s.compare.left, s.compare.right].filter(Boolean).map((c) => clip(c.label, 28) + ': ' + clip(c.text, 110)) : [], figure: s.figure ? clip(s.figure.value, 12) + ' ' + clip(s.figure.label, 80) : null })),
      media: (Array.isArray(pc.media) ? pc.media : []).map((m) => m && m.url).filter((u) => /^https:\/\//.test(String(u || ''))).slice(0, 10),
      sources: (Array.isArray(pc.sources) ? pc.sources : []).filter((s) => s && /^https?:/.test(String(s.url || ''))).slice(0, 3).map((s) => ({ title: clip(s.title, 110), url: s.url })),
      rationale: x.rationale ? clip(x.rationale, 320) : null, format: pc.format || null, proposed_at: x.scheduled_at || null, proposed_label: x.scheduled_at ? fmtDateTime(Date.parse(x.scheduled_at), tz) : null, ghl_post: Boolean(x.ghl_post_id), cta_mode: x.cta_mode || null, editorial: pc.editorial_type ? { type: String(pc.editorial_type).slice(0, 30), visual_need: pc.visual && pc.visual.need ? String(pc.visual.need).slice(0, 30) : null, visual_why: pc.visual && pc.visual.rationale ? clip(pc.visual.rationale, 200) : null } : null, resource: x.resource && x.resource.url ? { name: clip(x.resource.name, 80), url: x.resource.url } : null };
  };
  const row = (p) => ({ preview: ['in_review', 'scheduled', 'approved', 'drafted'].includes(p.status) ? previewOf(p.id) : null, id: p.id, title: clip(p.topic, 90), channel: chLabel[p.channel] || p.channel, status: p.status, hook: p.hook ? clip(p.hook, 160) : null, format: p.format || null, category: p.category || null, score: p.score != null ? p.score : null,
    at: p.scheduled_at || p.published_at || p.created_at, at_label: (p.scheduled_at || p.published_at) ? fmtDateTime(Date.parse(p.scheduled_at || p.published_at), tz) : null });
  const inReview = pcs.filter((p) => p.status === 'in_review' || (p.ghl_status === 'in_review' && p.ghl_approval_status !== 'approved')).map(row);
  const scheduled = pcs.filter((p) => p.status === 'scheduled' && p.scheduled_at).sort((a, b) => Date.parse(a.scheduled_at) - Date.parse(b.scheduled_at)).map(row);
  const published = pcs.filter((p) => p.status === 'published' && p.published_at).sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at)).slice(0, 5).map((p) => {
    const ms = (d.metrics || []).filter((m) => m.content_piece_id === p.id && m.status !== 'error').map((m) => ({ window: m.metric_window, likes: m.likes, comments: m.comments, shares: m.shares, partial: m.status === 'partial' }));
    return { ...row(p), metrics: ms };
  });
  const gr = summarizeGrowth(d);
  const wk = weeklyContent(d);
  const content = { weekly: wk, queue: gr.queue, rss: gr.rss, intel: gr.intel, resources: gr.resources, founder: gr.founder, signals_count: Number(d.signals_candidate) || 0, signals: sig, in_review: inReview, scheduled, published, failed: ct.failed.concat(ct.late), metrics_ready: ct.snapshots.length, preview_ready: false };
  // --- sistema
  const system = { overall: h.overall, components: h.components.map((x) => ({ name: x.name, status: x.status, reason: x.reason })), outreach_mode: c.outreach.mode, approved_pending: c.outreach.approved_pending, drafts: c.outreach.drafts_initial, errors24h: (d.errors24h || []).slice(0, 6), hermes_known: Boolean(d.hermes && Array.isArray(d.hermes.jobs)) };
  const lo = linkedinOverview(d.candidates || [], now);
  const linkedin = { mode: (d.outreach && d.outreach.linkedin_mode) || 'off', counts: lo.counts, ready: lo.ready_for_linkedin, rows: lo.rows.map((r) => ({ company: r.company, short: shortName(r.company), state: r.state, state_label: r.state_label || (r.recommended === 'linkedin' ? 'Listo para LinkedIn' : null), person: r.person, role: r.role, next_action: r.next_action, last_event_at: r.last_event_at, reply: r.reply ? clip(r.reply.text, 160) : null, score: r.score })).slice(0, 8),
    note: 'Waalaxy no informa por API si la invitación se envió, si la aceptaron o si respondieron: esos estados los registras tú con Hermes.' };
  const li = lo.counts;
  const tzp = (d.cfg && d.cfg.tz) || 'America/Santiago', todayKey = dayKey(now, tzp);
  const emailSentToday = (d.messages || []).filter((m) => m.direction === 'outbound' && m.status === 'sent' && m.sent_at && dayKey(Date.parse(m.sent_at), tzp) === todayKey).length;
  const liToday = (d.candidates || []).filter((x) => { const l = ((x.channel_state || {}).linkedin) || {}; return l.imported_at && l.mode_at_import === 'live' && dayKey(Date.parse(l.imported_at), tzp) === todayKey; }).length;
  const outreach = { email: { mode: c.outreach.mode, sent_today: emailSentToday, cap: Number(d.outreach && d.outreach.daily_cap) || 0, drafts: c.outreach.drafts_initial, approved_waiting: c.outreach.approved_pending },
    linkedin: { mode: (d.outreach && d.outreach.linkedin_mode) || 'off', imported_today: liToday, cap: Number(d.outreach && d.outreach.linkedin_daily_cap) || 0, ready: lo.ready_for_linkedin, pending_approval: lo.counts.pendiente, in_campaign: lo.counts.en_campana + lo.counts.conexion + lo.counts.mensaje + lo.counts.followup, replied: lo.counts.respondio, errors: lo.counts.error } };
  const approvals = { emails: c.outreach.drafts_initial, linkedin: lo.ready_for_linkedin + lo.counts.pendiente, content: inReview.length };

  add('li_pending', 'act', 'Altas a LinkedIn por confirmar', (d.candidates || []).filter((x) => ((x.channel_state || {}).linkedin || {}).state === 'aprobacion_pendiente').map((x) => x.company_name));
  add('li_error', 'act', 'Errores en LinkedIn (Waalaxy)', (d.candidates || []).filter((x) => ((x.channel_state || {}).linkedin || {}).state === 'error').map((x) => x.company_name));
  return { outreach, approvals, linkedin, generated_at: new Date(now).toISOString(), date_label: fmtDate(now, tz), tz, attention: att, attention_total: att.length, prospecting, content, system, missing: d.missing || [] };
}

/** Aviso corto de una corrida de radar (ops_runs) para Telegram: sin IDs, rutas ni telemetría. */
export function runNotice(d, run) {
  const tz = (d.cfg && d.cfg.tz) || 'America/Santiago';
  const sm = run.summary || {};
  if (run.kind === 'content_rss') return run.status === 'error' ? { title: 'Content RSS falló', text: 'CONTENT RSS\nLa corrida falló' + (sm.reason ? ' (' + clip(sm.reason, 100) + ')' : '') + '. Quedó registrada.', severity: 'high' } : null;
  if (run.kind === 'competitor_intel') {
    if (run.status === 'error') return { title: 'Inteligencia orgánica falló', text: 'INTELIGENCIA ORGÁNICA\nLa corrida falló' + (sm.reason ? ' (' + clip(sm.reason, 100) + ')' : '') + '. Quedó registrada.', severity: 'high' };
    const g = summarizeGrowth(d);
    return { title: 'Inteligencia orgánica', text: ['INTELIGENCIA ORGÁNICA', g.intel.competitors.length + (g.intel.competitors.length === 1 ? ' referente revisado' : ' referentes revisados') + ' (fuentes públicas)', g.intel.gaps.length ? 'Huecos: ' + g.intel.gaps.slice(0, 2).map((x) => clip(x, 70)).join(' · ') : 'Sin huecos claros esta vez', 'Solo contexto: no copiamos nada.'].join('\n'), severity: 'info' };
  }
  if (run.kind === 'content_pieces') {
    if (run.status === 'error') return { title: 'Redacción de piezas falló', text: 'CONTENT\nLa corrida falló' + (sm.reason ? ' (' + clip(sm.reason, 100) + ')' : '') + '. Quedó registrada.', severity: 'high' };
    const at = Date.parse(run.created_at), win = ((Number(sm.minutes) || 5) + 10) * 60000;
    const mine = (d.pieces || []).filter((x) => !x.is_test && x.status === 'in_review' && Date.parse(x.created_at) >= at - win && Date.parse(x.created_at) <= at + 120000);
    if (!mine.length) return { title: 'Content sin piezas nuevas', text: 'CONTENT\nNo se creó ninguna pieza esta vez' + (sm.reason ? ' (' + clip(sm.reason, 80) + ')' : '') + '.', severity: 'info' };
    return { title: 'Piezas nuevas en revisión', text: ['CONTENT', mine.length + (mine.length === 1 ? ' pieza nueva' : ' piezas nuevas') + ' esperando tu revisión', mine.slice(0, 2).map((x) => '• ' + clip(x.topic, 60)).join('\n'), 'Nada publicado ni aprobado.'].join('\n'), severity: 'info' };
  }
  const at = Date.parse(run.created_at), win = ((Number(sm.minutes) || 5) + 10) * 60000;
  if (run.kind === 'prospect_radar') {
    if (run.status === 'error') return { title: 'Prospect Radar falló', text: 'PROSPECT RADAR\nLa corrida falló' + (sm.reason ? ' (' + clip(sm.reason, 100) + ')' : '') + '. Quedó registrada; revisa el panel si se repite.', severity: 'high' };
    const mine = (d.candidates || []).filter((x) => /radar/i.test(String(x.source_name || '')) && Date.parse(x.created_at) >= at - win && Date.parse(x.created_at) <= at + 120000).sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0));
    const inv = (d.candidates || []).filter((x) => x.status === 'in_ghl' && x.ghl_stage === 'investigado').length;
    if (!mine.length) return { title: 'Prospect Radar sin nuevos', text: 'PROSPECT RADAR\nSin candidatos nuevos esta vez (ninguno cumplió el criterio).\n' + inv + ' en Investigado esperando tu decisión.', severity: 'info' };
    const alta = mine.filter((x) => x.band === 'alta').length;
    const contacted = mine.filter((x) => x.status === 'contacted' || (x.ghl_stage && x.ghl_stage !== 'investigado')).length;
    const inInv = mine.filter((x) => x.ghl_stage === 'investigado').length;
    const lines = ['PROSPECT RADAR', mine.length + (mine.length === 1 ? ' nuevo' : ' nuevos') + ' · ' + alta + ' prioridad alta', 'Top: ' + mine.slice(0, 3).map((x) => shortName(x.company_name) + ' ' + x.priority_score).join(' · '), (inInv === mine.length ? 'Todos en Investigado' : inInv + ' en Investigado') + '. ' + contacted + ' contactados.'];
    return { title: 'Prospect Radar', text: lines.join('\n'), severity: 'info' };
  }
  if (run.status === 'error') return { title: 'Content Radar falló', text: 'CONTENT RADAR\nLa corrida falló' + (sm.reason ? ' (' + clip(sm.reason, 100) + ')' : '') + '. Quedó registrada; revisa el panel si se repite.', severity: 'high' };
  const sigs = (d.signals_list || []).filter((x) => Date.parse(x.created_at) >= at - win && Date.parse(x.created_at) <= at + 120000);
  const total = Number(d.signals_candidate) || 0;
  if (!sigs.length) return { title: 'Content Radar sin señales', text: 'CONTENT RADAR\nSin señales nuevas esta vez.' + (total ? ' ' + total + ' candidatas esperando pieza.' : ''), severity: 'info' };
  const lines = ['CONTENT RADAR', sigs.length + (sigs.length === 1 ? ' señal nueva' : ' señales nuevas') + ' · ' + total + ' candidatas sin pieza', sigs.slice(0, 2).map((x) => '• ' + clip(x.title, 60)).join('\n'), 'Nada publicado ni aprobado.'];
  return { title: 'Content Radar', text: lines.join('\n'), severity: 'info' };
}

/** Daily para Telegram: resumen corto (el detalle vive en /ops y en las consultas a Hermes). */
export function composeBrief(d) {
  const tz = (d.cfg && d.cfg.tz) || 'America/Santiago';
  const s = buildSections(d), c = s.commercial, ct = s.content, h = s.health;
  const p = composePanel(d);
  const out = ['ATACAMA DAILY · ' + fmtDate(d.now, tz)];
  const act = p.attention.filter((a) => a.tone === 'act');
  if (act.length) {
    out.push('', 'NECESITA TU ACCIÓN');
    act.forEach((a) => out.push('• ' + a.count + ' ' + (a.key === 'content_pending' ? (a.count === 1 ? 'pieza de contenido por aprobar' : 'piezas de contenido por aprobar') : a.title.toLowerCase()) + (a.key === 'replies' ? ': ' + names(a.items.map((x) => String(x).split(' · ')[0]), 2) : '')));
  } else out.push('', 'Nada urgente hoy.');
  const bits = [];
  const pr = p.prospecting;
  bits.push('PROSPECCIÓN: ' + (pr.new_since_run && pr.last_run && (d.now - Date.parse(pr.last_run.at)) < 36 * 3600000 ? pr.new_since_run + ' nuevos del Radar · ' : '') + pr.backlog + ' en Investigado' + (pr.backlog_alta ? ' (' + pr.backlog_alta + ' prioridad alta)' : ''));
  const cb = [];
  if (p.content.in_review.length) cb.push(p.content.in_review.length + ' por aprobar');
  if (p.content.scheduled.length) cb.push(p.content.scheduled.length + (p.content.scheduled.length === 1 ? ' programada' : ' programadas'));
  if (p.content.signals_count) cb.push(p.content.signals_count + ' señales sin pieza');
  const snaps = ct.snapshots.length;
  if (snaps) cb.push(snaps + (snaps === 1 ? ' métrica nueva' : ' métricas nuevas'));
  bits.push('CONTENIDO: ' + (cb.length ? cb.join(' · ') : 'sin movimiento'));
  const bad = h.components.filter((x) => x.status !== 'ok');
  bits.push('SISTEMA: ' + (bad.length ? bad.map((x) => (x.status === 'fallo' ? 'FALLO ' : 'atención ') + String(x.name).replace(/^Job Hermes · /, '')).slice(0, 3).join(', ') : 'todo operativo') + (c.outreach.mode === 'off' ? ' · envío de correos apagado' : ''));
  bits.forEach((b) => out.push('', b));
  return { text: out.join('\n'), action_count: act.length };
}
