/**
 * Atacama OS v3 · Fase 7 — reglas de salud nuevas (spec §8.5, anexo §H1). Núcleo PURO y AUTOCONTENIDO: se incrusta en n8n «25 Atacama Ops»
 * y lo usa evaluateAlerts (atacama-alerts, cada 15 min). Ya existían: workflows caídos (incluye Sender y Content Sync con su frecuencia),
 * Gmail, huella S2, rebote §G3, Taller «necesita ayuda», jobs de Hermes con fallos. Aquí se agregan las que faltaban.
 * Severidad: critical → Telegram al instante · high → Telegram + panel · info → SOLO panel (meta.panel_only).
 */

/** d = { now, ghl_accounts, hermes: { higgs, jobs }, messages, outreach: { daily_cap, window_start, window_end, tz, paused, mode }, pieces } */
export function hrRules(d) {
  const now = d.now;
  const out = [];
  const add = (key, severity, title, detail, panelOnly) => out.push({ key, severity, title, detail, meta: panelOnly ? { panel_only: true } : {} });
  const DAY = 86400000;

  // 1) Cuentas de redes en GHL: desconectada → crítica; vence en < 14 días → informativa, < 7 → importante, ≤ 3 → crítica
  for (const a of Array.isArray(d.ghl_accounts) ? d.ghl_accounts : []) {
    if (!a || a.deleted) continue;
    const name = (a.platform === 'instagram' ? 'Instagram' : a.platform === 'linkedin' ? 'LinkedIn' : String(a.platform || 'Red')) + ' «' + String(a.name || '') + '»';
    if (a.isExpired === true || a.active === false) { add('ghl_account:' + a.id, 'critical', 'Cuenta desconectada en GHL: ' + name, 'GHL no puede publicar en esta cuenta. Reconéctala en GHL → Marketing → Social Planner → cuentas.', false); continue; }
    const exp = Date.parse(a.expire || '');
    if (!Number.isFinite(exp)) continue;
    const left = Math.ceil((exp - now) / DAY);
    if (left > 14) continue;
    const sev = left <= 3 ? 'critical' : left < 7 ? 'high' : 'info';
    add('ghl_expiry:' + a.id + ':' + sev, sev, 'La conexión de ' + name + ' vence en ' + Math.max(0, left) + (left === 1 ? ' día' : ' días'), 'Reconéctala en GHL antes del ' + new Date(exp).toISOString().slice(0, 10) + ' para que no se caigan las publicaciones programadas.', sev === 'info');
  }

  // 2) Higgsfield: saldo bajo la reserva (300) y gasto semanal de Atacama OS (> 150 importante, > 200 crítica)
  const hg = d.hermes && d.hermes.higgs;
  if (hg && typeof hg === 'object') {
    const reserve = Number(hg.reserve) || 300;
    if (hg.balance != null && Number(hg.balance) < reserve) add('higgs_reserve', 'high', 'Créditos de Higgsfield bajo la reserva', 'Quedan ' + hg.balance + ' créditos (reserva ' + reserve + '). Atacama OS ya no genera imágenes hasta que recargues.', false);
    const sp = Number(hg.spent_week) || 0;
    if (sp > 200) add('higgs_week:critical:' + (hg.week || ''), 'critical', 'Gasto semanal de Higgsfield sobre 200', 'Atacama OS lleva ' + sp + ' créditos esta semana.', false);
    else if (sp > 150) add('higgs_week:high:' + (hg.week || ''), 'high', 'Gasto semanal de Higgsfield sobre 150', 'Atacama OS lleva ' + sp + ' de 200 créditos esta semana.', false);
  }

  // 3) Correo: tope alcanzado con aprobados esperando (informativa: saldrán el próximo día hábil)
  const cfg = d.outreach || {};
  const tz = cfg.tz || 'America/Santiago';
  const dayOf = (ms) => new Date(ms).toLocaleDateString('en-CA', { timeZone: tz });
  const msgs = Array.isArray(d.messages) ? d.messages : [];
  const today = dayOf(now);
  const sentToday = msgs.filter((m) => m.direction === 'outbound' && m.status === 'sent' && m.sent_at && dayOf(Date.parse(m.sent_at)) === today).length;
  const approved = msgs.filter((m) => m.direction === 'outbound' && m.status === 'approved').length;
  const cap = Number(cfg.daily_cap) || 0;
  if (cap > 0 && sentToday >= cap && approved > 0) add('mail_cap:' + today, 'info', 'Tope diario alcanzado con ' + approved + ' aprobados esperando', 'Salen el próximo día hábil. Si quieres más ritmo, sube el tope de a poco (Prospección y correo → Hoy).', true);

  // 4) Taller: piezas que no alcanzan su plazo (viernes de cierre pasado y aún sin programar)
  for (const p of Array.isArray(d.pieces) ? d.pieces : []) {
    if (!p || p.is_test || !p.taller_status || !p.needs_by) continue;
    if (['programada', 'programada_pendiente_de_clic', 'publicada', 'descartada'].includes(p.taller_status)) continue;
    if (Date.parse(p.needs_by) < now) add('taller_late:' + p.id, 'high', 'Pieza del Taller atrasada: ' + String(p.topic || '').slice(0, 60), 'Su cierre era el ' + String(p.needs_by).slice(0, 10) + ' y sigue en «' + p.taller_status + '». Decide en Redes → Taller.', false);
  }

  // 5) Jobs de Hermes que debían correr y no corrieron (no pausados)
  for (const j of (d.hermes && Array.isArray(d.hermes.jobs) ? d.hermes.jobs : [])) {
    if (!j || j.state === 'paused' || j.enabled === false || !j.next_run_at) continue;
    if (!/(atacama|radar)/i.test(String(j.name || ''))) continue;
    const late = now - Date.parse(j.next_run_at);
    if (late > 3 * 3600000) add('hermes_late:' + j.id, 'high', 'Job de Hermes sin correr: ' + j.name, 'Tenía que correr hace ' + Math.round(late / 3600000) + ' h y no lo hizo. Revisa que el gateway de Hermes esté arriba.', false);
  }
  return out;
}
