/**
 * Atacama OS · «Contacto preparado» — núcleo puro (9-oct-2026).
 *
 * Regla de negocio: un prospecto válido en INVESTIGADO no puede quedarse esperando. Cada uno termina en UNA de estas salidas visibles:
 *   email_listo / email_aprobado   → hay borrador de correo (cola «Aprobaciones»)
 *   linkedin_listo                 → invitación + mensaje preparados, envío manual (cola «LinkedIn por enviar»)
 *   linkedin_en_curso / waalaxy    → ya se contactó por LinkedIn
 *   buscar_contacto                → no hay correo ni LinkedIn: queda redactado el mensaje y falta que Christian encuentre y pegue el contacto
 *   en_espera / no_contactar       → solo con una razón comercial explícita
 *   sin_accion                     → INVESTIGADO VÁLIDO SIN PRÓXIMA ACCIÓN (la métrica crítica; objetivo 0)
 *
 * El estado se DEDUCE de datos que ya existen (mensajes de correo + channel_state del prospecto). Lo único nuevo que se guarda:
 *   channel_state.prep      = { state: 'hold'|'no_contact'|'find_contact', reason, at, by, draft? }
 *   channel_state.li_manual = { status: 'ready'|'invite_sent'|'connected'|'message_sent'|'replied'|'closed', profile_url, invitation, message, ... }
 *
 * Funciones AUTOCONTENIDAS (sin imports ni constantes de módulo): se incrustan con Function.prototype.toString en los workflows n8n 25/26/29.
 * Nada de aquí envía mensajes: los planificadores devuelven { response, writes[], effects[] }.
 */

export function prepStrip(s) { return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, ''); }

/** 'direct' (persona/rol específico) | 'generic' (info@, contacto@…) | 'invalid'. */
export function prepEmailKind(email) {
  const e = String(email == null ? '' : email).trim().toLowerCase().replace(/^mailto:/, '');
  if (!/^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[a-z]{2,}$/i.test(e)) return 'invalid';
  const local = prepStrip(e.split('@')[0]);
  if (/^(info|informaciones?|contacto|contactos|contact|contactus|ventas?|comercial|comerciales|hola|hello|admin|administracion|reservas?|atencion|atencionclientes|soporte|cotizaciones|cotizacion|sales|mail|oficina|clientes?|secretaria|recepcion|consultas?|servicios?|marketing|rrhh|contabilidad|facturacion|pedidos|agenda|citas|webmaster|noreply|no-reply)$/.test(local)) return 'generic';
  return 'direct';
}

/** URL canónica de un perfil PERSONAL de LinkedIn o null. */
export function prepLinkedinUrl(u) {
  const raw = String(u == null ? '' : u).trim();
  if (!raw) return null;
  const m = raw.match(/^(?:https?:\/\/)?(?:[a-z]{2,3}\.|www\.)?linkedin\.com\/in\/([A-Za-z0-9%_\-.]{3,100})\/?(?:[?#].*)?$/i);
  if (!m) return null;
  const slug = m[1].replace(/\/+$/, '');
  if (/^(company|school|sales|pub|feed|jobs)$/i.test(slug)) return null;
  return 'https://www.linkedin.com/in/' + slug.toLowerCase();
}

/** Vías de contacto públicas del prospecto: correos (directos primero), LinkedIn, teléfono, WhatsApp. */
export function prepRoutes(cand) {
  const canon = (cand && cand.canonical) || {};
  const c = canon.contact || (cand && cand.contact) || {};
  const extra = (canon.extra_contacts && canon.extra_contacts.emails) || (cand && cand.extra_emails) || [];
  const raw = [c.email].concat(extra, canon.emails || (cand && cand.more_emails) || []).filter(Boolean).map((e) => String(e).trim().toLowerCase().replace(/^mailto:/, ''));
  const seen = {};
  const emails = [];
  raw.forEach((e) => { if (seen[e]) return; seen[e] = true; const k = prepEmailKind(e); if (k !== 'invalid') emails.push({ email: e, kind: k }); });
  emails.sort((a, b) => (a.kind === 'direct' ? 0 : 1) - (b.kind === 'direct' ? 0 : 1));
  return { emails, linkedin: prepLinkedinUrl(c.linkedin || c.linkedin_url), linkedin_raw: c.linkedin || c.linkedin_url || null, phone: c.phone || null, whatsapp: c.whatsapp || null, person: c.name || null, role: c.role || c.job_title || null };
}

/** Canal que corresponde HOY a un prospecto sin acción: email | linkedin | find_contact. Nunca los dos a la vez. */
export function prepChooseRoute(cand, ctx) {
  const sup = ((ctx && ctx.suppressed) || []).map((e) => String(e || '').toLowerCase());
  const r = prepRoutes(cand);
  const st = (cand && cand.channel_state) || {};
  const li = st.li_manual || null;
  const okEmails = r.emails.filter((e) => !sup.includes(e.email));
  if (li && li.status === 'ready') return { route: 'linkedin', to: null, to_kind: null, linkedin: r.linkedin || li.profile_url || null, reason: 'LinkedIn ya preparado y aprobado por Christian' };
  if (okEmails.length) return { route: 'email', to: okEmails[0].email, to_kind: okEmails[0].kind, linkedin: r.linkedin, reason: okEmails[0].kind === 'direct' ? 'correo directo publicado' : 'correo genérico publicado por la empresa (es su entrada comercial)' };
  if (r.linkedin) return { route: 'linkedin', to: null, to_kind: null, linkedin: r.linkedin, reason: 'sin correo; hay perfil de LinkedIn' };
  return { route: 'find_contact', to: null, to_kind: null, linkedin: null, reason: 'sin correo ni LinkedIn' };
}

export function prepLabel(state) {
  const m = { email_listo: 'Correo listo para aprobar', email_aprobado: 'Correo aprobado (sale solo)', linkedin_listo: 'LinkedIn por enviar', linkedin_en_curso: 'LinkedIn en curso', waalaxy: 'Waalaxy en curso', buscar_contacto: 'Buscar contacto', en_espera: 'En espera', no_contactar: 'No contactar', sin_accion: 'Sin acción', contactado: 'Correo enviado', respondio: 'Respondió', descartado: 'Descartado', otro: 'Otra etapa' };
  return m[state] || state;
}

/** Estado de preparación de UN prospecto (deducido). msgs = mensajes de correo (cualquier candidato). */
export function prepClassify(cand, msgs, nowMs) {
  const st = (cand && cand.channel_state) || {};
  const mine = (Array.isArray(msgs) ? msgs : []).filter((m) => m.candidate_id === cand.id && m.direction === 'outbound');
  const init = mine.filter((m) => m.kind === 'initial');
  const out = (state, reason) => ({ state, label: prepLabel(state), reason: reason || '' });
  if (cand.status === 'discarded' || cand.status === 'archived') return out('descartado', 'Prospecto descartado');
  const li = st.li_manual || null;
  const wl = st.linkedin || null;
  if (cand.ghl_stage === 'respondio' || (li && li.status === 'replied')) return out('respondio', 'Respondió');
  if (init.some((m) => m.status === 'sent' || m.status === 'sending')) return out('contactado', 'Primer correo enviado');
  if (li && ['invite_sent', 'connected', 'message_sent'].includes(li.status)) return out('linkedin_en_curso', 'LinkedIn: ' + li.status);
  if (wl && ['en_lista', 'en_campana', 'conexion', 'mensaje', 'followup'].includes(wl.state)) return out('waalaxy', 'Waalaxy: ' + wl.state);
  if (init.some((m) => m.status === 'approved')) return out('email_aprobado', 'Correo aprobado, sale en la próxima ventana');
  if (init.some((m) => m.status === 'draft')) return out('email_listo', 'Borrador de correo esperando tu aprobación');
  if (li && li.status === 'ready') return out('linkedin_listo', 'Invitación y mensaje preparados para enviar a mano');
  const p = st.prep || null;
  if (p && p.state === 'hold') return out('en_espera', p.reason || 'En espera');
  if (p && p.state === 'no_contact') return out('no_contactar', p.reason || 'No contactar');
  const r = prepRoutes(cand);
  if (p && p.state === 'find_contact' && !r.emails.length && !r.linkedin) return out('buscar_contacto', p.reason || 'Falta correo o LinkedIn: encontrarlo y pegarlo');
  if (cand.ghl_stage && cand.ghl_stage !== 'investigado') return out('otro', 'Etapa ' + cand.ghl_stage);
  return out('sin_accion', 'Investigado válido sin próxima acción');
}

export function prepDay(ms, tz) { return new Date(ms).toLocaleDateString('en-CA', { timeZone: tz || 'America/Santiago' }); }

/** Fila compacta para listas. */
export function prepRow(cand, cls, msgs) {
  const r = prepRoutes(cand);
  const st = cand.channel_state || {};
  const draft = (Array.isArray(msgs) ? msgs : []).find((m) => m.candidate_id === cand.id && m.direction === 'outbound' && m.kind === 'initial' && ['draft', 'approved'].includes(m.status)) || null;
  const flags = (cand.canonical && cand.canonical.source_flags) || cand.sflags || {};
  return { id: cand.id, company: cand.company_name, score: cand.priority_score != null ? cand.priority_score : null, band: cand.band || null, state: cls.state, label: cls.label, reason: cls.reason,
    person: r.person, role: r.role, email: r.emails[0] ? r.emails[0].email : null, email_kind: r.emails[0] ? r.emails[0].kind : null, linkedin: r.linkedin_raw || r.linkedin, priority: flags.study_priority || null,
    message_id: draft ? draft.id : null, score_mail: draft && draft.metadata && draft.metadata.cold ? draft.metadata.cold.score : null,
    li: st.li_manual ? { status: st.li_manual.status, profile_url: st.li_manual.profile_url || null, invitation: st.li_manual.invitation || null, message: st.li_manual.message || null, prepared_at: st.li_manual.prepared_at || null, invite_sent_at: st.li_manual.invite_sent_at || null, message_sent_at: st.li_manual.message_sent_at || null, follow_up_at: st.li_manual.follow_up_at || null } : null,
    find: st.prep && st.prep.state === 'find_contact' ? { draft: st.prep.draft || null, at: st.prep.at || null } : null };
}

/**
 * Resumen para el Control Center, la compuerta del radar y el panel.
 * cands = prospect_candidates (con channel_state, canonical.contact…); msgs = outreach_messages (≥ 45 días).
 */
export function prepSummary(cands, msgs, nowMs, tz, opts) {
  const o = opts || {};
  const limit = o.limit || 40;
  const list = (Array.isArray(cands) ? cands : []).filter((c) => ['in_ghl', 'accepted', 'contacted'].includes(c.status) && !/^test\b/i.test(String(c.company_name || '')));
  const messages = Array.isArray(msgs) ? msgs : [];
  const counts = { email_listo: 0, email_aprobado: 0, linkedin_listo: 0, linkedin_en_curso: 0, waalaxy: 0, buscar_contacto: 0, en_espera: 0, no_contactar: 0, sin_accion: 0, contactado: 0, respondio: 0, otro: 0 };
  const lists = { email_listo: [], email_aprobado: [], linkedin_listo: [], linkedin_en_curso: [], waalaxy: [], buscar_contacto: [], en_espera: [], no_contactar: [], sin_accion: [] };
  list.forEach((c) => {
    const cls = prepClassify(c, messages, nowMs);
    if (counts[cls.state] != null) counts[cls.state]++;
    if (lists[cls.state] && lists[cls.state].length < limit) lists[cls.state].push(prepRow(c, cls, messages));
  });
  Object.keys(lists).forEach((k) => lists[k].sort((a, b) => (b.score || 0) - (a.score || 0)));
  const today = prepDay(nowMs, tz);
  const sentToday = messages.filter((m) => m.direction === 'outbound' && m.status === 'sent' && m.sent_at && prepDay(Date.parse(m.sent_at), tz) === today).length;
  const replies = messages.filter((m) => m.direction === 'inbound' && ['reply', 'decline'].includes(m.classification) && nowMs - Date.parse(m.created_at) <= 7 * 86400000).length;
  const followupDrafts = messages.filter((m) => m.direction === 'outbound' && ['followup_1', 'followup_2'].includes(m.kind) && ['draft', 'approved'].includes(m.status)).length;
  const investigated = list.filter((c) => c.ghl_stage === 'investigado').length;
  return { counts, lists, valid_unactioned: counts.sin_accion, investigated, sent_today: sentToday, replies_7d: replies, followup_drafts: followupDrafts, generated_at: new Date(nowMs).toISOString() };
}

/** Datos mínimos para que el agente redacte (sin repetir la investigación). */
export function prepQueueItem(cand, ctx) {
  const canon = cand.canonical || {};
  const route = prepChooseRoute(cand, ctx);
  const r = prepRoutes(cand);
  const flags = canon.source_flags || cand.sflags || {};
  return { id: cand.id, company: cand.company_name, website: cand.website || canon.website || null, industry: canon.industry || cand.industry || null, location: canon.location || cand.location || null,
    score: cand.priority_score != null ? cand.priority_score : null, band: cand.band || null, source: cand.source_name || null, study_priority: flags.study_priority || null, study_relation: flags.relation || null,
    route: route.route, route_reason: route.reason, to: route.to, to_kind: route.to_kind, linkedin: r.linkedin_raw || r.linkedin, person: r.person, role: r.role, phone: r.phone, whatsapp: r.whatsapp,
    emails: r.emails, facts: (canon.facts || []).slice(0, 5), inferences: (canon.inferences || []).slice(0, 3), hypotheses: (canon.commercial_hypotheses || []).slice(0, 3), observed_signals: (canon.observed_signals || []).slice(0, 4),
    proposed_solution: canon.proposed_solution || null, outreach_angle: canon.outreach_angle || null, evidence_urls: (canon.evidence_urls || []).slice(0, 4), evidence_quotes: (canon.evidence_quotes || []).slice(0, 3) };
}

// ------------------------------------------------------------------ APRENDIZAJE DE REDACCIÓN

export function prepSentences(text) {
  return String(text == null ? '' : text).split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter((s) => s.length > 2);
}

export function prepWords(text) { return String(text == null ? '' : text).trim().split(/\s+/).filter(Boolean).length; }

/** Frases que Christian quitó y frases que agregó entre la versión original y la final. */
export function prepEditDiff(before, after) {
  const a = prepSentences(before), b = prepSentences(after);
  const norm = (s) => prepStrip(s).toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
  const bs = {}; b.forEach((s) => { bs[norm(s)] = true; });
  const as = {}; a.forEach((s) => { as[norm(s)] = true; });
  return { removed: a.filter((s) => !bs[norm(s)]).slice(0, 6), added: b.filter((s) => !as[norm(s)]).slice(0, 6) };
}

/**
 * Muestra para aprender el estilo ANTES de redactar: correos enviados recientes + ediciones de Christian (original vs final).
 * Una edición de Christian es una entrada de metadata.history cuyo autor (by) es «Christian vía /ops».
 */
export function prepStyleSamples(msgs, n) {
  const count = Math.min(Math.max(parseInt(n, 10) || 8, 1), 20);
  const out = (Array.isArray(msgs) ? msgs : []).filter((m) => m.direction === 'outbound' && ['initial', 'followup_1', 'followup_2'].includes(m.kind));
  const isOps = (h) => /\/ops/i.test(String((h && h.by) || ''));
  const withEdits = out.filter((m) => m.metadata && Array.isArray(m.metadata.history) && m.metadata.history.some(isOps));
  const edits = withEdits.sort((a, b) => String(b.updated_at || b.created_at).localeCompare(String(a.updated_at || a.created_at))).slice(0, count).map((m) => {
    const hs = m.metadata.history.filter(isOps);
    const first = hs[0];
    const diff = prepEditDiff(first.body, m.body);
    return { company: m.company_name, status: m.status, before: { subject: first.subject, body: first.body }, after: { subject: m.subject, body: m.body }, removed: diff.removed, added: diff.added, edited_at: first.at || null };
  });
  const sent = out.filter((m) => m.status === 'sent').sort((a, b) => String(b.sent_at).localeCompare(String(a.sent_at))).slice(0, count).map((m) => ({ company: m.company_name, kind: m.kind, subject: m.subject, body: m.body, sent_at: m.sent_at,
    edited_by_christian: Boolean(m.metadata && Array.isArray(m.metadata.history) && m.metadata.history.some(isOps)) }));
  const pool = sent.concat(edits.map((e) => ({ body: e.after.body })));
  const words = pool.map((m) => prepWords(m.body)).filter((w) => w > 0);
  const closes = sent.slice(0, 5).map((m) => { const s = prepSentences(m.body); return s[s.length - 1] || ''; });
  const removedAll = {};
  edits.forEach((e) => e.removed.forEach((s) => { removedAll[s] = (removedAll[s] || 0) + 1; }));
  return { sent, edits, profile: { sent_count: sent.length, edits_count: edits.length, avg_words: words.length ? Math.round(words.reduce((a, b) => a + b, 0) / words.length) : null, recent_closings: closes,
    removed_often: Object.keys(removedAll).sort((a, b) => removedAll[b] - removedAll[a]).slice(0, 5) },
    guidance: 'Imita el estilo (largo, tono, apertura, cierre, cuánto se explica Atacama, frases que Christian elimina y estructuras que repite). NO copies hechos de otras empresas: los hechos salen solo del prospecto actual.' };
}

// ------------------------------------------------------------------ AUTOENVÍO

/** ¿Este borrador puede aprobarse solo cuando el ENVÍO AUTOMÁTICO está ON? Reglas seguras (V1: solo primer correo, destinatario DIRECTO). */
export function prepAutoDecision(msg, cand, cfg, ctx) {
  const reasons = [];
  const c = cfg || {};
  const x = ctx || {};
  if (c.autosend_enabled !== true) return { eligible: false, reasons: ['autoenvio_apagado'] };
  if (!msg || msg.direction !== 'outbound' || msg.status !== 'draft') reasons.push('no_es_borrador');
  if (msg && msg.kind !== 'initial') reasons.push('solo_primer_correo');
  const score = msg && msg.metadata && msg.metadata.cold && typeof msg.metadata.cold.score === 'number' ? msg.metadata.cold.score : null;
  const min = Number(c.autosend_min_score) > 0 ? Number(c.autosend_min_score) : 80;
  if (score == null) reasons.push('sin_score'); else if (score < min) reasons.push('score_bajo_' + score);
  if (msg && prepEmailKind(msg.to_email) !== 'direct') reasons.push('correo_generico');
  if (!cand || cand.status === 'discarded' || cand.status === 'archived') reasons.push('prospecto_no_valido');
  else {
    const flags = (cand.canonical && cand.canonical.source_flags) || {};
    if (['B', 'C'].includes(flags.study_priority)) reasons.push('prioridad_' + flags.study_priority);
    const p = (cand.channel_state && cand.channel_state.prep) || null;
    if (p && ['hold', 'no_contact'].includes(p.state)) reasons.push('en_espera');
    const published = prepRoutes(cand).emails.map((e) => e.email);
    if (msg && !published.includes(String(msg.to_email || '').toLowerCase())) reasons.push('destinatario_no_publicado');
  }
  if (msg && (x.suppressed || []).map((e) => String(e || '').toLowerCase()).includes(String(msg.to_email || '').toLowerCase())) reasons.push('suprimido');
  if (cand && (x.inbound || {})[cand.id]) reasons.push('ya_respondio');
  return { eligible: reasons.length === 0, reasons, score };
}

/**
 * Barrido del autoenvío (cada pocos minutos y al encender/apagar el interruptor):
 *  - ON  → aprueba los borradores elegibles (aprobador «Atacama OS · autoenvío»); el Sender los envía respetando tope, ventana, supresión y dedupe.
 *  - OFF → devuelve a borrador lo que el autoenvío había aprobado y todavía no salió. Nada aprobado por Christian se toca.
 */
export function prepPlanAutosweep(ctx) {
  const nowMs = ctx.now, now = new Date(nowMs).toISOString();
  const cfg = ctx.config || {};
  const BY = 'Atacama OS · autoenvío';
  const msgs = Array.isArray(ctx.messages) ? ctx.messages : [];
  const byId = {}; (ctx.candidates || []).forEach((c) => { byId[c.id] = c; });
  const writes = [], approved = [], reverted = [], skipped = [];
  if (cfg.autosend_enabled !== true) {
    msgs.filter((m) => m.direction === 'outbound' && m.status === 'approved' && m.approved_by === BY && !m.sent_at).forEach((m) => {
      writes.push({ method: 'PATCH', path: 'outreach_messages?id=eq.' + m.id + '&status=eq.approved', body: { status: 'draft', approved_by: null, approved_at: null, approval_text: null, scheduled_for: null, updated_at: now } });
      reverted.push(m.company_name);
    });
    return { response: { ok: true, status: 'autosend_off', enabled: false, reverted, message: reverted.length ? 'Autoenvío OFF: ' + reverted.length + ' borrador(es) vuelven a revisión manual.' : 'Autoenvío OFF: nada que revertir.' }, writes, approved, reverted };
  }
  const inbound = ctx.inbound || {};
  const maxPerSweep = 10;
  msgs.filter((m) => m.direction === 'outbound' && m.status === 'draft').forEach((m) => {
    if (approved.length >= maxPerSweep) return;
    const cand = byId[m.candidate_id] || null;
    const d = prepAutoDecision(m, cand, cfg, { suppressed: ctx.suppressed || [], inbound });
    if (!d.eligible) { skipped.push({ company: m.company_name, reasons: d.reasons }); return; }
    writes.push({ method: 'PATCH', path: 'outreach_messages?id=eq.' + m.id + '&status=eq.draft', body: { status: 'approved', approved_by: BY, approved_at: now, approval_text: 'Autoenvío ON: cumple la política (score ' + d.score + ', correo directo publicado)', scheduled_for: now, confirm_code: null, confirm_hash: null, confirm_expires_at: null, updated_at: now } });
    approved.push(m.company_name);
  });
  return { response: { ok: true, status: 'autosend_on', enabled: true, approved, skipped_count: skipped.length, skipped: skipped.slice(0, 20), message: approved.length ? 'Autoenvío ON: aprobé ' + approved.length + ' borrador(es) elegible(s): ' + approved.join(', ') + '.' : 'Autoenvío ON: no hay borradores elegibles ahora (' + skipped.length + ' en revisión manual).' }, writes, approved, reverted };
}

// ------------------------------------------------------------------ ESTADOS DE PREPARACIÓN (escrituras)

/** Marca un prospecto como en_espera | no_contactar | buscar_contacto (con el mensaje ya redactado) o lo libera (clear). Siempre con razón explícita. */
export function prepPlanSet(req, ctx) {
  const nowMs = ctx.now, now = new Date(nowMs).toISOString();
  const cand = ctx.candidate;
  const fail = (error, message) => ({ response: { ok: false, status: 'error', error, message }, writes: [], effects: [] });
  if (!cand) return fail('sin_candidato', 'No encontré ese prospecto.');
  const state = String(req.state || '').toLowerCase();
  if (!['hold', 'no_contact', 'find_contact', 'clear'].includes(state)) return fail('estado_invalido', 'state: hold | no_contact | find_contact | clear.');
  const cls = prepClassify(cand, ctx.messages || [], nowMs);
  if (['contactado', 'respondio', 'linkedin_en_curso', 'waalaxy', 'descartado'].includes(cls.state)) return fail('ya_contactado', 'Ese prospecto ya está en «' + cls.label + '»: no se cambia su preparación.');
  const reason = String(req.reason || '').trim().slice(0, 300);
  const st = cand.channel_state || {};
  if (state === 'clear') {
    const next = { ...st }; delete next.prep;
    return { response: { ok: true, status: 'cleared', company: cand.company_name, message: cand.company_name + ': liberado, vuelve a «sin acción» y se prepara en la próxima corrida.' }, writes: [{ method: 'PATCH', path: 'prospect_candidates?id=eq.' + cand.id, body: { channel_state: next, updated_at: now } }], effects: [] };
  }
  const onlyMissing = /^(falta|faltan|sin|no (tiene|hay|existe|encontr\w+))\b[^.]{0,40}\b(correo|email|e-mail|mail|contacto|linkedin|datos)\b[^.]{0,20}\.?$/i.test(prepStrip(reason));
  if ((state === 'hold' || state === 'no_contact') && (reason.length < 8 || onlyMissing)) return fail('falta_razon', 'EN ESPERA / NO CONTACTAR exige una razón comercial explícita (≥ 8 caracteres): no basta con que falte el correo; en ese caso corresponde BUSCAR CONTACTO.');
  const prep = { state, reason: reason || (state === 'find_contact' ? 'Falta correo o LinkedIn: encontrarlo y pegarlo' : ''), at: now, by: String(req.by || 'Atacama OS').slice(0, 60) };
  if (state === 'find_contact') {
    const d = req.draft || {};
    const subject = String(d.subject || '').trim().slice(0, 200), body = String(d.body || '').trim().slice(0, 4000);
    if (body.length < 30) return fail('falta_borrador', 'BUSCAR CONTACTO deja el mensaje redactado (draft.body) para que solo falte pegar el contacto.');
    prep.draft = { subject, body };
    const r = prepRoutes(cand);
    if (r.emails.length || r.linkedin) return fail('ya_tiene_contacto', 'Ese prospecto ya tiene ' + (r.emails.length ? 'correo' : 'LinkedIn') + ': corresponde preparar el mensaje, no buscar contacto.');
  }
  return { response: { ok: true, status: 'prep_set', company: cand.company_name, state, label: prepLabel(state === 'hold' ? 'en_espera' : state === 'no_contact' ? 'no_contactar' : 'buscar_contacto'), reason: prep.reason, message: cand.company_name + ': ' + prepLabel(state === 'hold' ? 'en_espera' : state === 'no_contact' ? 'no_contactar' : 'buscar_contacto') + (prep.reason ? ' — ' + prep.reason : '') + '.' },
    writes: [{ method: 'PATCH', path: 'prospect_candidates?id=eq.' + cand.id, body: { channel_state: { ...st, prep }, updated_at: now } }], effects: [] };
}

/** Guarda el contacto que Christian encontró (correo o LinkedIn) y libera el estado «buscar contacto». */
export function prepPlanContact(req, ctx) {
  const nowMs = ctx.now, now = new Date(nowMs).toISOString();
  const cand = ctx.candidate;
  const fail = (error, message) => ({ response: { ok: false, status: 'error', error, message }, writes: [], effects: [] });
  if (!cand) return fail('sin_candidato', 'No encontré ese prospecto.');
  const email = String(req.email || '').trim().toLowerCase();
  const li = String(req.linkedin || '').trim();
  if (!email && !li) return fail('sin_dato', 'Pega un correo o un enlace de LinkedIn.');
  if (email && prepEmailKind(email) === 'invalid') return fail('correo_invalido', 'Ese correo no es válido.');
  if (li && !prepLinkedinUrl(li)) return fail('linkedin_invalido', 'Ese enlace no es un perfil personal de LinkedIn (https://www.linkedin.com/in/…).');
  const canon = cand.canonical || {};
  const contact = { ...(canon.contact || {}) };
  const src = String(req.source || '').trim().slice(0, 300);
  const who = String(req.by || 'Christian').slice(0, 60);
  if (email) { contact.email = email; contact.email_source = src || ('agregado por ' + who + ' (' + now.slice(0, 10) + ')'); contact.public = true; }
  if (li) { contact.linkedin = li; contact.linkedin_source_url = src || ('agregado por ' + who + ' (' + now.slice(0, 10) + ')'); }
  const st = { ...(cand.channel_state || {}) };
  const find = st.prep && st.prep.state === 'find_contact' ? st.prep : null;
  delete st.prep;
  const kind = email ? 'correo ' + email : 'LinkedIn';
  return { response: { ok: true, status: 'contact_saved', company: cand.company_name, channel: email ? 'email' : 'linkedin', has_draft_text: Boolean(find && find.draft), draft_text: find && find.draft ? find.draft : null, message: cand.company_name + ': guardé el ' + kind + '. En la próxima corrida se prepara el mensaje.' },
    writes: [{ method: 'PATCH', path: 'prospect_candidates?id=eq.' + cand.id, body: { canonical: { ...canon, contact }, channel_state: st, updated_at: now } }],
    effects: [{ type: 'gateway_act', act: { type: 'add_note', note: 'CONTACTO AGREGADO por ' + who + ': ' + kind + (src ? ' (fuente: ' + src + ')' : '') + '. El prospecto sale de «Buscar contacto».' } }] };
}

export function prepAddBusinessDays(ms, n) {
  const d = new Date(ms);
  let left = n;
  while (left > 0) { d.setUTCDate(d.getUTCDate() + 1); const w = d.getUTCDay(); if (w !== 0 && w !== 6) left--; }
  return d.toISOString();
}

/** Guarda la invitación + mensaje preparados para envío MANUAL por LinkedIn. */
export function prepPlanLiSave(req, ctx) {
  const nowMs = ctx.now, now = new Date(nowMs).toISOString();
  const cand = ctx.candidate;
  const fail = (error, message) => ({ response: { ok: false, status: 'error', error, message }, writes: [], effects: [] });
  if (!cand) return fail('sin_candidato', 'No encontré ese prospecto.');
  const cls = prepClassify(cand, ctx.messages || [], nowMs);
  if (['contactado', 'respondio', 'linkedin_en_curso', 'waalaxy', 'email_aprobado', 'descartado'].includes(cls.state)) return fail('canal_ocupado', 'Ese prospecto ya está en «' + cls.label + '»: no se prepara otro canal al mismo tiempo.');
  const url = prepLinkedinUrl(req.profile_url || (prepRoutes(cand).linkedin_raw));
  if (!url) return fail('sin_perfil', 'Falta el enlace del perfil personal de LinkedIn.');
  const invitation = String(req.invitation || '').trim();
  const message = String(req.message || '').trim();
  if (invitation.length < 10 || invitation.length > 300) return fail('invitacion_invalida', 'La invitación debe tener entre 10 y 300 caracteres (límite de LinkedIn).');
  if (message.length < 30 || message.length > 1500) return fail('mensaje_invalido', 'El mensaje debe tener entre 30 y 1500 caracteres.');
  const st = cand.channel_state || {};
  const prev = st.li_manual || null;
  const li = { ...(prev || {}), status: prev && prev.status && prev.status !== 'ready' ? prev.status : 'ready', profile_url: String(req.profile_url || (prepRoutes(cand).linkedin_raw) || url).trim(), invitation, message, prepared_at: now, prepared_by: String(req.by || 'Atacama OS').slice(0, 60), events: (prev && prev.events ? prev.events : []).slice(-19) };
  const next = { ...st, li_manual: li }; delete next.prep;
  return { response: { ok: true, status: 'li_saved', company: cand.company_name, message: cand.company_name + ': LinkedIn listo para enviar (invitación + mensaje).', warning: cls.state === 'email_listo' ? 'También hay un borrador de correo: usa un solo canal.' : undefined },
    writes: [{ method: 'PATCH', path: 'prospect_candidates?id=eq.' + cand.id, body: { channel_state: next, updated_at: now } }],
    effects: prev && prev.prepared_at ? [] : [{ type: 'gateway_act', act: { type: 'add_note', note: 'LINKEDIN POR ENVIAR (manual) · Perfil: ' + li.profile_url + ' · INVITACIÓN: «' + invitation + '» · MENSAJE tras conectar: «' + message + '».' } }] };
}

/**
 * Christian confirma lo que envió a mano por LinkedIn. kind = invitation | connected | message | reply | closed.
 * Registra fecha, canal, estado, mensaje enviado y seguimiento pendiente (+3 días hábiles) en Supabase y GHL.
 */
export function prepPlanLiSent(req, ctx) {
  const nowMs = ctx.now, now = new Date(nowMs).toISOString();
  const cand = ctx.candidate;
  const fail = (error, message) => ({ response: { ok: false, status: 'error', error, message }, writes: [], effects: [] });
  if (!cand) return fail('sin_candidato', 'No encontré ese prospecto.');
  const st = cand.channel_state || {};
  const prev = st.li_manual;
  if (!prev || !prev.status) return fail('sin_linkedin_preparado', 'Ese prospecto no tiene un LinkedIn preparado por Atacama OS.');
  const kind = String(req.kind || '').toLowerCase();
  const map = { invitation: 'invite_sent', connected: 'connected', message: 'message_sent', reply: 'replied', closed: 'closed' };
  if (!map[kind]) return fail('tipo_invalido', 'kind: invitation | connected | message | reply | closed.');
  const text = String(req.text || '').trim().slice(0, 1500);
  const order = ['ready', 'invite_sent', 'connected', 'message_sent', 'replied'];
  const newStatus = map[kind];
  if (kind === 'invitation' && prev.status !== 'ready') return fail('ya_enviada', 'La invitación ya figura como enviada (' + prev.status + ').');
  if (['connected', 'message'].includes(kind) && order.indexOf(prev.status) > order.indexOf(newStatus)) return fail('retroceso', 'Ya está en «' + prev.status + '»: no se retrocede.');
  if (kind === 'reply' && text.length < 2) return fail('falta_texto', 'Para registrar una respuesta indica qué dijo la persona (text).');
  const co = cand.company_name;
  const firstContact = ['invitation', 'message'].includes(kind) && ['ready'].includes(prev.status);
  const sentText = kind === 'invitation' ? (text || prev.invitation) : kind === 'message' ? (text || prev.message) : text;
  const events = (prev.events || []).slice(-19);
  events.push({ at: now, event: kind, text: String(sentText || '').slice(0, 400) });
  const followAt = ['invitation', 'message'].includes(kind) ? prepAddBusinessDays(nowMs, 3) : (kind === 'connected' ? prev.follow_up_at || null : null);
  const li = { ...prev, status: newStatus, events, last_event: kind, last_event_at: now,
    ...(kind === 'invitation' ? { invite_sent_at: now, invite_text_sent: sentText } : {}), ...(kind === 'message' ? { message_sent_at: now, message_text_sent: sentText } : {}), ...(kind === 'connected' ? { connected_at: now } : {}),
    ...(kind === 'reply' ? { reply: { text, at: now } } : {}), follow_up_at: followAt };
  const body = { channel_state: { ...st, li_manual: li }, updated_at: now };
  const effects = [];
  if (firstContact) {
    body.status = 'contacted'; body.ghl_stage = 'contactado'; body.last_contact_channel = 'linkedin'; body.last_contact_at = now; body.next_action_at = followAt;
    effects.push({ type: 'gateway_act', act: { type: 'mark_contacted', channel: 'linkedin', at: now, follow_up_days: 3, note: 'LINKEDIN ENVIADO A MANO por Christian · ' + (kind === 'invitation' ? 'INVITACIÓN' : 'MENSAJE') + ' · ' + now.slice(0, 10) + ' · Perfil: ' + (prev.profile_url || '') + ' · Texto enviado: «' + sentText + '». Seguimiento pendiente: +3 días hábiles.' } });
  } else if (kind === 'message') {
    body.next_action_at = followAt;
    effects.push({ type: 'gateway_act', act: { type: 'add_note', note: 'LINKEDIN · MENSAJE ENVIADO a mano por Christian (' + now.slice(0, 10) + '): «' + sentText + '».' } });
    effects.push({ type: 'gateway_act', act: { type: 'follow_up', days: 3, title: 'Seguimiento LinkedIn · ' + co } });
  } else if (kind === 'connected') {
    effects.push({ type: 'gateway_act', act: { type: 'add_note', note: 'LINKEDIN · conexión aceptada (' + now.slice(0, 10) + '). Falta enviar el mensaje preparado.' } });
  } else if (kind === 'reply') {
    body.status = 'contacted'; body.ghl_stage = 'respondio'; body.last_contact_channel = 'linkedin'; body.last_contact_at = now; body.next_action_at = null;
    effects.push({ type: 'gateway_act', act: { type: 'move_stage', stage: 'respondio', note: 'RESPUESTA por LinkedIn de ' + co + ': «' + text.slice(0, 400) + '». Seguimientos detenidos.' } });
  } else if (kind === 'closed') {
    body.next_action_at = null;
    effects.push({ type: 'gateway_act', act: { type: 'add_note', note: 'LINKEDIN · cerrado sin respuesta (' + now.slice(0, 10) + '). ' + text } });
  }
  return { response: { ok: true, status: 'li_logged', company: co, li_status: newStatus, follow_up_at: followAt, ghl_stage: body.ghl_stage || cand.ghl_stage || null, message: co + ': registrado — ' + ({ invitation: 'invitación enviada', connected: 'conexión aceptada', message: 'mensaje enviado', reply: 'respondió', closed: 'cerrado' })[kind] + (followAt && ['invitation', 'message'].includes(kind) ? '. Seguimiento: ' + followAt.slice(0, 10) + '.' : '.') },
    writes: [{ method: 'PATCH', path: 'prospect_candidates?id=eq.' + cand.id, body }], effects };
}
