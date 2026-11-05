/**
 * Atacama OS v3 · Fase 6 — sección «Prospección y correo» (spec §7, anexo §G). Núcleo PURO de solo lectura.
 *
 * Funciones AUTOCONTENIDAS (sin imports ni constantes de módulo): se incrustan con Function.prototype.toString en el
 * workflow n8n «25 Atacama Ops» (acción `mail_view`). No envía, no aprueba, no cambia nada: solo ordena lo que ya existe
 * (outreach_messages, outreach_suppression, outreach_config, prospect_candidates) en las vistas Hoy · Cola · Enviados y
 * respuestas · Seguimientos · Embudo · Salud. Borradores, Radar y Falta contacto reutilizan las vistas existentes.
 */

/** Día calendario YYYY-MM-DD en la zona dada. */
export function mvDay(ms, tz) {
  return new Date(ms).toLocaleDateString('en-CA', { timeZone: tz || 'America/Santiago' });
}

/** Minutos desde medianoche y día de semana (0 = domingo) en la zona dada. */
export function mvClock(ms, tz) {
  const p = {};
  new Intl.DateTimeFormat('en-US', { timeZone: tz || 'America/Santiago', hour12: false, weekday: 'short', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(ms)).forEach((x) => { p[x.type] = x.value; });
  const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday);
  return { min: (Number(p.hour) % 24) * 60 + Number(p.minute), wd };
}

export function mvHm(s, def) {
  const m = String(s || '').match(/^(\d{1,2}):(\d{2})$/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : def;
}

/** Suma n días hábiles (lun–vie) a una fecha; devuelve ms. Aproximación de calendario (sin feriados), solo para mostrar. */
export function mvAddBiz(ms, n, tz) {
  let t = ms, left = n;
  while (left > 0) { t += 86400000; const wd = mvClock(t, tz).wd; if (wd !== 0 && wd !== 6) left--; }
  return t;
}

/** Etiqueta de clasificación de un mensaje entrante. */
export function mvClassLabel(c) {
  return { reply: 'Respuesta', decline: 'Respuesta negativa', bounce: 'Rebote', unsubscribe: 'Baja', auto_reply: 'Fuera de oficina / automática', own: 'Mensaje propio' }[c] || 'Otro';
}

/**
 * Salud del envío (anexo §G3). Rebote ≥ 5 % con ≥ 20 envíos en 7 días → crítica; ≥ 3 % → importante.
 * Sugerir subir el tope (+10) solo con ≥ 50 envíos en 7 días, rebote < 2 % y 0 reclamos. SOLO sugiere.
 */
export function mvHealth(msgs, cap, nowMs) {
  const since = nowMs - 7 * 86400000;
  const L = Array.isArray(msgs) ? msgs : [];
  const sent7 = L.filter((m) => m.direction === 'outbound' && m.status === 'sent' && m.sent_at && Date.parse(m.sent_at) >= since).length;
  const bounces7 = L.filter((m) => m.direction === 'inbound' && m.classification === 'bounce' && Date.parse(m.created_at) >= since).length;
  const unsubs7 = L.filter((m) => m.direction === 'inbound' && m.classification === 'unsubscribe' && Date.parse(m.created_at) >= since).length;
  const complaints7 = L.filter((m) => m.direction === 'inbound' && m.classification === 'unsubscribe' && /spam/i.test(String(m.body || '') + ' ' + String(m.subject || '')) && Date.parse(m.created_at) >= since).length;
  const rate = sent7 ? bounces7 / sent7 : 0;
  const pct = Math.round(rate * 1000) / 10;
  let level = 'ok', alert = null;
  if (sent7 >= 20 && rate >= 0.05) { level = 'critical'; alert = 'Rebote de ' + pct + ' % en 7 días (' + bounces7 + ' de ' + sent7 + '): baja el tope y revisa la lista antes de seguir.'; }
  else if (sent7 > 0 && rate >= 0.03) { level = 'high'; alert = 'Rebote de ' + pct + ' % en 7 días (' + bounces7 + ' de ' + sent7 + '): vigila la calidad de los correos encontrados.'; }
  const c = Number(cap) || 0;
  let suggestion = null;
  if (sent7 >= 50 && rate < 0.02 && complaints7 === 0 && c > 0 && c < 50) suggestion = { from: c, to: Math.min(50, c + 10), text: 'Puedes subir el tope de ' + c + ' a ' + Math.min(50, c + 10) + ': ' + sent7 + ' envíos en 7 días, rebote ' + pct + ' %, sin reclamos. Solo es una sugerencia: el sistema no lo cambia.' };
  else suggestion = { from: c, to: null, text: sent7 < 50 ? 'Aún no conviene subir el tope: hacen falta al menos 50 envíos en 7 días para juzgar (van ' + sent7 + ').' : rate >= 0.02 ? 'No subas el tope: el rebote (' + pct + ' %) está sobre 2 %.' : complaints7 ? 'No subas el tope: hubo ' + complaints7 + ' reclamo(s) esta semana.' : 'El tope ya está en el máximo (50).' };
  return { sent7, bounces7, unsubs7, complaints7, rate_pct: pct, level, alert, suggestion };
}

/** Vista completa de la sección. d = { now, tz, cfg, msgs, supp, cands, pause } */
export function mailView(d) {
  const now = d.now, tz = (d.cfg && d.cfg.tz) || d.tz || 'America/Santiago';
  const cfg = d.cfg || {};
  const msgs = Array.isArray(d.msgs) ? d.msgs : [];
  const cands = Array.isArray(d.cands) ? d.cands : [];
  const supp = Array.isArray(d.supp) ? d.supp : [];
  const today = mvDay(now, tz);
  const out = msgs.filter((m) => m.direction === 'outbound');
  const inb = msgs.filter((m) => m.direction === 'inbound');
  const cap = Number(cfg.daily_cap) || 0;
  const ws = mvHm(cfg.window_start, 540), we = mvHm(cfg.window_end, 1050);
  const clk = mvClock(now, tz);
  const bizDay = clk.wd !== 0 && clk.wd !== 6;
  const inWindow = bizDay && clk.min >= ws && clk.min < we;
  const sentToday = out.filter((m) => m.status === 'sent' && m.sent_at && mvDay(Date.parse(m.sent_at), tz) === today).length;
  const paused = cfg.paused === true || Boolean(d.pause && d.pause.paused);
  const fdays = Array.isArray(cfg.followup_days) && cfg.followup_days.length === 3 ? cfg.followup_days.map(Number) : [4, 9, 18];

  // ---- Cola: aprobados en orden de salida y estimación por día con el tope
  const approved = out.filter((m) => m.status === 'approved' || m.status === 'sending').sort((a, b) => String(a.scheduled_for || a.approved_at || '').localeCompare(String(b.scheduled_for || b.approved_at || '')));
  const leftToday = paused || !bizDay || clk.min >= we ? 0 : Math.max(0, cap - sentToday);
  let day = leftToday > 0 ? 0 : 1, used = 0;
  const queue = approved.map((m) => {
    if (paused) return { m, when: 'en pausa' };
    if (cap <= 0) return { m, when: 'sin tope configurado' };
    if (used >= (day === 0 ? leftToday : cap)) { day++; used = 0; }
    used++;
    return { m, when: day === 0 ? 'hoy' : day === 1 ? 'próximo día hábil' : 'en ' + day + ' días hábiles' };
  }).map((x, i) => ({ id: x.m.id, candidate_id: x.m.candidate_id, company: x.m.company_name || '—', kind: x.m.kind, to: x.m.to_email, subject: x.m.subject, status: x.m.status, approved_at: x.m.approved_at || null, scheduled_for: x.m.scheduled_for || null, position: i + 1, eta: x.when }));
  const willToday = paused ? 0 : Math.min(leftToday, approved.length);
  const willNext = paused ? 0 : Math.min(cap, Math.max(0, approved.length - willToday));

  // ---- Próximo envío
  let next = null;
  if (paused) next = 'en pausa';
  else if (!approved.length) next = 'sin correos aprobados en cola';
  else if (inWindow && sentToday < cap) next = 'en la próxima corrida (cada 10 min)';
  else next = 'próxima ventana hábil a las ' + (cfg.window_start || '09:00');

  // ---- Enviados y respuestas
  const byCand = {};
  inb.forEach((m) => { (byCand[m.candidate_id] = byCand[m.candidate_id] || []).push(m); });
  const replies = inb.filter((m) => m.classification !== 'own').sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, 60)
    .map((m) => ({ id: m.id, candidate_id: m.candidate_id, company: m.company_name || '—', from: m.from_email || null, subject: m.subject || '', snippet: String(m.body || '').slice(0, 280), cls: m.classification || 'other', cls_label: mvClassLabel(m.classification), at: m.created_at,
      reply_draft: out.some((o) => o.candidate_id === m.candidate_id && o.kind === 'reply' && ['draft', 'approved'].includes(o.status)) }));
  const sent = out.filter((m) => m.status === 'sent').sort((a, b) => String(b.sent_at).localeCompare(String(a.sent_at))).slice(0, 60)
    .map((m) => { const r = (byCand[m.candidate_id] || []).filter((x) => x.classification !== 'own' && Date.parse(x.created_at) >= Date.parse(m.sent_at)); return { id: m.id, candidate_id: m.candidate_id, company: m.company_name || '—', kind: m.kind, to: m.to_email, subject: m.subject, sent_at: m.sent_at, answer: r.length ? mvClassLabel(r[0].classification) : null }; });

  // ---- Seguimientos (+N/+M hábiles; nunca se envían solos)
  const fuDrafts = out.filter((m) => ['followup_1', 'followup_2', 'followup_3'].includes(m.kind) && ['draft', 'approved'].includes(m.status))
    .map((m) => ({ id: m.id, candidate_id: m.candidate_id, company: m.company_name || '—', kind: m.kind, label: 'Seguimiento ' + String(m.kind).slice(-1), status: m.status, subject: m.subject, hash: m.content_hash || null, due: null }));
  const upcoming = [];
  out.filter((m) => m.kind === 'initial' && m.status === 'sent' && m.sent_at).forEach((m) => {
    const theirs = (byCand[m.candidate_id] || []).filter((x) => ['reply', 'decline', 'unsubscribe', 'bounce'].includes(x.classification));
    if (theirs.length) return;
    const mine = out.filter((x) => x.candidate_id === m.candidate_id && ['followup_1', 'followup_2', 'followup_3'].includes(x.kind));
    const has = [1, 2, 3].map((k) => mine.some((x) => x.kind === 'followup_' + k));
    if (has[2]) return;
    const last = has.lastIndexOf(true) + 1; // 0 = ninguno aún
    const n = last + 1;
    if (last > 0 && !mine.some((x) => x.kind === 'followup_' + last && x.status === 'sent')) return;
    const due = mvAddBiz(Date.parse(m.sent_at), fdays[n - 1], tz);
    upcoming.push({ candidate_id: m.candidate_id, company: m.company_name || '—', n, label: 'Seguimiento ' + n, due: mvDay(due, tz), overdue: due < now });
  });
  upcoming.sort((a, b) => a.due.localeCompare(b.due));

  // ---- Embudo (desglose solo con muestra suficiente)
  const minSample = Number(cfg.funnel_min_sample) || 20;
  const stageOf = (c) => {
    const st = String(c.ghl_stage || '').toLowerCase();
    const mine = out.filter((m) => m.candidate_id === c.id);
    const theirs = (byCand[c.id] || []).filter((x) => ['reply', 'decline'].includes(x.classification));
    if (/ganad|cliente|won/.test(st)) return 6;
    if (/reuni|meeting/.test(st)) return 5;
    if (theirs.length || /respond/.test(st)) return 4;
    if (mine.some((m) => m.kind === 'initial' && m.status === 'sent')) return 3;
    if (mine.some((m) => m.kind === 'initial' && ['approved', 'sending'].includes(m.status))) return 2;
    if (mine.some((m) => m.kind === 'initial' && m.status === 'draft')) return 1;
    return 0;
  };
  const STAGES = ['Investigado', 'Preparado', 'Aprobado', 'Enviado', 'Respondió', 'Reunión', 'Cliente'];
  const reach = STAGES.map(() => 0);
  const byInd = {};
  cands.filter((c) => c.status !== 'discarded').forEach((c) => {
    const s = stageOf(c);
    for (let i = 0; i <= s; i++) reach[i]++;
    if (s >= 3) { const k = String(c.industry || 'Sin rubro'); const b = (byInd[k] = byInd[k] || { sent: 0, replied: 0 }); b.sent++; if (s >= 4) b.replied++; }
  });
  const byAngle = {};
  out.filter((m) => m.kind === 'initial' && m.status === 'sent').forEach((m) => {
    const k = String((m.metadata && m.metadata.cold && m.metadata.cold.angle) || 'Sin ángulo registrado').slice(0, 60);
    const b = (byAngle[k] = byAngle[k] || { sent: 0, replied: 0 }); b.sent++;
    if ((byCand[m.candidate_id] || []).some((x) => ['reply', 'decline'].includes(x.classification))) b.replied++;
  });
  const breakdown = (o) => Object.keys(o).map((k) => ({ key: k, sent: o[k].sent, replied: o[k].replied, rate_pct: o[k].sent >= minSample ? Math.round((o[k].replied / o[k].sent) * 1000) / 10 : null, enough: o[k].sent >= minSample })).sort((a, b) => b.sent - a.sent);

  // ---- Salud
  const health = mvHealth(msgs, cap, now);
  const pace = [];
  for (let i = 0, t = now; pace.length < 7 && i < 14; i++, t -= 86400000) {
    const wd = mvClock(t, tz).wd;
    if (wd === 0 || wd === 6) continue;
    const dk = mvDay(t, tz);
    pace.push({ day: dk, sent: out.filter((m) => m.status === 'sent' && m.sent_at && mvDay(Date.parse(m.sent_at), tz) === dk).length, cap });
  }
  const lastSent = out.filter((m) => m.status === 'sent' && m.sent_at).sort((a, b) => String(b.sent_at).localeCompare(String(a.sent_at)))[0];

  return {
    generated_at: new Date(now).toISOString(),
    hoy: { mode: cfg.mode || 'off', paused, cap, sent_today: sentToday, window: { start: cfg.window_start || '09:00', end: cfg.window_end || '17:30' }, in_window: inWindow, next_send: next, followup_days: fdays,
      autosend: { enabled: cfg.autosend_enabled === true, min_score: Number(cfg.autosend_min_score) || 80 }, legal_footer: cfg.legal_footer || null, funnel_min_sample: minSample,
      drafts: out.filter((m) => m.status === 'draft').length, approved: approved.length, will_today: willToday, will_next: willNext, updated_by: cfg.config_updated_by || null, updated_at: cfg.updated_at || null },
    cola: queue,
    respuestas: { replies, sent },
    seguimientos: { drafts: fuDrafts, upcoming: upcoming.slice(0, 60) },
    embudo: { stages: STAGES.map((s, i) => ({ stage: s, count: reach[i] })), min_sample: minSample, by_industry: breakdown(byInd), by_angle: breakdown(byAngle) },
    salud: { ...health, suppression_total: supp.length, suppression: supp.slice(0, 80).map((s) => ({ email: s.email, reason: s.reason || null, at: s.created_at || null })), pace, last_sent_at: lastSent ? lastSent.sent_at : null },
  };
}
