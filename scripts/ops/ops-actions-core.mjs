/**
 * Atacama OS · /ops V2 — acciones de aprobación desde el celular (núcleo puro).
 *
 * Funciones AUTOCONTENIDAS (sin imports ni constantes de módulo): se prueban con `ops-actions-core.test.mjs` y se incrustan con
 * Function.prototype.toString en el workflow n8n «29 Ops Actions» junto con linkedin-core (recommendChannel, linkedinView…).
 *
 * Principio: NO hay una segunda lógica de aprobación. Cada acción reutiliza la ruta real que ya existe:
 *   correo    → workflow 21 «Outreach Engine» (draft → approve [código + palabras] → sender 22 en su ventana, con su tope y protecciones)
 *   LinkedIn  → workflow 26 «LinkedIn Engine» (approve [código + palabras] → alta en la lista/campaña productivas)
 *   contenido → GHL Social Planner (PUT con postApprovalDetails.approvalStatus = approved/rejected: mismo efecto que el botón de GHL)
 * La sesión privada de /ops + el clic explícito reemplazan el «segundo código» (los códigos siguen vigentes desde Hermes/Telegram).
 */

export function oaActionList() {
  return ['overview', 'email_save', 'email_approve', 'email_reject', 'email_reopen', 'linkedin_approve', 'linkedin_reject', 'content_approve', 'content_reject', 'autosend_set', 'autosend_sweep', 'prep_li_sent', 'prep_hold', 'prep_release', 'prep_contact', 'pause_set', 'idea_decide', 'idea_mine', 'taller_feedback', 'taller_approve', 'taller_schedule', 'taller_discard', 'taller_duplicate', 'taller_caption', 'taller_add_version', 'mail_config_set', 'mail_outcome'];
}

export function oaIsUuid(v) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v || ''));
}

/** Valida y normaliza la solicitud. Las escrituras exigen request_id (idempotencia) y el id de la entidad. */
export function oaValidate(b) {
  const x = b && typeof b === 'object' ? b : {};
  const action = String(x.action || '').toLowerCase();
  if (!oaActionList().includes(action)) return { ok: false, error: 'accion_invalida', message: 'action inválida: usa ' + oaActionList().join(' | ') };
  const write = action !== 'overview';
  const rid = String(x.request_id || '').trim();
  if (write && !/^[A-Za-z0-9_-]{8,64}$/.test(rid)) return { ok: false, error: 'request_id_invalido', message: 'request_id obligatorio (8–64 caracteres) para cualquier acción de escritura.' };
  const req = { action, request_id: write ? rid : null, reason: String(x.reason || '').trim().slice(0, 200) };
  if (action.startsWith('email_')) {
    if (!oaIsUuid(x.message_id)) return { ok: false, error: 'message_id_invalido', message: 'message_id (uuid del correo) es obligatorio.' };
    req.message_id = String(x.message_id).toLowerCase();
    req.expected_hash = String(x.expected_hash || '').trim();
    if (['email_save', 'email_approve'].includes(action) && !/^[0-9a-f]{8,64}$/i.test(req.expected_hash)) return { ok: false, error: 'falta_version', message: 'expected_hash (versión del correo que viste) es obligatorio: así se aprueba exactamente lo que leíste.' };
  }
  if (action === 'email_save') {
    const subject = typeof x.subject === 'string' ? x.subject.trim() : '';
    const body = typeof x.body === 'string' ? x.body.trim() : '';
    if (subject.length < 3 || subject.length > 200) return { ok: false, error: 'asunto_invalido', message: 'El asunto debe tener entre 3 y 200 caracteres.' };
    if (body.length < 20 || body.length > 8000) return { ok: false, error: 'cuerpo_invalido', message: 'El cuerpo debe tener entre 20 y 8000 caracteres.' };
    req.subject = subject;
    req.body = body;
    req.paste = x.paste === true;
    if (x.to_email != null || x.to != null) return { ok: false, error: 'destinatario_no_editable', message: 'El destinatario no se puede editar desde /ops.' };
  }
  if (action === 'autosend_set') {
    if (typeof x.enabled !== 'boolean') return { ok: false, error: 'enabled_invalido', message: 'enabled (true/false) es obligatorio.' };
    req.enabled = x.enabled;
    if (x.min_score != null) {
      const ms = Number(x.min_score);
      if (!Number.isFinite(ms) || ms < 60 || ms > 100) return { ok: false, error: 'score_invalido', message: 'min_score debe estar entre 60 y 100.' };
      req.min_score = Math.floor(ms);
    }
  }
  if (action === 'mail_config_set') {
    const hm = (v) => typeof v === 'string' && /^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(v.trim()) ? v.trim() : null;
    const set = {};
    if (x.daily_cap != null) {
      const c = Number(x.daily_cap);
      if (!Number.isInteger(c) || c < 1 || c > 50) return { ok: false, error: 'tope_invalido', message: 'El tope diario va de 1 a 50 correos.' };
      set.daily_cap = c;
    }
    if (x.window_start != null || x.window_end != null) {
      const ws = hm(x.window_start), we = hm(x.window_end);
      if (!ws || !we) return { ok: false, error: 'ventana_invalida', message: 'La ventana necesita inicio y fin en formato HH:MM.' };
      const m = (s) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3));
      if (m(ws) < 7 * 60 || m(we) > 20 * 60 || m(we) - m(ws) < 60) return { ok: false, error: 'ventana_invalida', message: 'La ventana debe estar entre 07:00 y 20:00 y durar al menos 1 hora.' };
      set.window_start = ws; set.window_end = we;
    }
    if (x.followup_days != null) {
      const d = Array.isArray(x.followup_days) ? x.followup_days.map(Number) : [];
      if (d.length !== 2 || !d.every((v) => Number.isInteger(v) && v >= 1 && v <= 30) || d[0] >= d[1]) return { ok: false, error: 'dias_invalidos', message: 'Los seguimientos son 2 números de días hábiles, el segundo mayor (ej.: 3 y 7), entre 1 y 30.' };
      set.followup_days = d;
    }
    if (x.funnel_min_sample != null) {
      const f = Number(x.funnel_min_sample);
      if (!Number.isInteger(f) || f < 5 || f > 200) return { ok: false, error: 'muestra_invalida', message: 'La muestra mínima del embudo va de 5 a 200.' };
      set.funnel_min_sample = f;
    }
    if (!Object.keys(set).length) return { ok: false, error: 'sin_cambios', message: 'No indicaste ningún cambio.' };
    req.set = set;
  }
  if (action === 'mail_outcome') {
    if (!oaIsUuid(x.candidate_id)) return { ok: false, error: 'candidate_id_invalido', message: 'candidate_id (uuid del prospecto) es obligatorio.' };
    req.candidate_id = String(x.candidate_id).toLowerCase();
    req.outcome = String(x.outcome || '').toLowerCase();
    if (!['reunion', 'perdido'].includes(req.outcome)) return { ok: false, error: 'resultado_invalido', message: 'outcome: reunion | perdido. «Ganado» se marca en GHL (crea el cliente).' };
    req.text = typeof x.text === 'string' ? x.text.trim().slice(0, 500) : '';
  }
  if (action === 'pause_set') {
    if (typeof x.paused !== 'boolean') return { ok: false, error: 'paused_invalido', message: 'paused (true/false) es obligatorio.' };
    req.paused = x.paused;
    if (x.resume_at != null && x.resume_at !== '') {
      const ra = Date.parse(String(x.resume_at));
      if (!Number.isFinite(ra)) return { ok: false, error: 'fecha_invalida', message: 'resume_at debe ser una fecha válida.' };
      req.resume_at = new Date(ra).toISOString();
    }
  }
  if (action === 'idea_decide') {
    if (!oaIsUuid(x.idea_id)) return { ok: false, error: 'idea_id_invalido', message: 'idea_id (uuid de la idea) es obligatorio.' };
    req.idea_id = String(x.idea_id).toLowerCase();
    req.decision = String(x.decision || '').toLowerCase();
    if (!['approve', 'change', 'discard', 'move'].includes(req.decision)) return { ok: false, error: 'decision_invalida', message: 'decision: approve | change | discard | move.' };
    req.text = typeof x.text === 'string' ? x.text.trim().slice(0, 1000) : '';
    req.chips = Array.isArray(x.chips) ? x.chips.filter((c) => typeof c === 'string').map((c) => c.trim().slice(0, 40)).filter(Boolean).slice(0, 6) : [];
    req.test = x.test === true;
    req.week_start = typeof x.week_start === 'string' ? x.week_start.trim().slice(0, 10) : '';
  }
  if (action === 'idea_mine') {
    req.title = typeof x.title === 'string' ? x.title.trim().slice(0, 200) : '';
    req.channel = String(x.channel || '');
    req.format = String(x.format || '');
    req.test = x.test === true;
    req.text = typeof x.text === 'string' ? x.text.trim().slice(0, 400) : '';
    req.week_start = typeof x.week_start === 'string' ? x.week_start.trim().slice(0, 10) : '';
    if (req.title.length < 5) return { ok: false, error: 'falta_titulo', message: 'Escribe tu idea en una frase (mínimo 5 caracteres).' };
  }
  if (action.startsWith('taller_')) {
    if (!oaIsUuid(x.piece_id)) return { ok: false, error: 'piece_id_invalido', message: 'piece_id (uuid de la pieza) es obligatorio.' };
    req.piece_id = String(x.piece_id).toLowerCase();
    req.test = x.test === true;
    req.text = typeof x.text === 'string' ? x.text.trim().slice(0, 2000) : '';
    req.scope = typeof x.scope === 'string' && /^(global|lamina [0-9]{1,2})$/.test(x.scope) ? x.scope : 'global';
    req.channel = typeof x.channel === 'string' ? x.channel : '';
    req.schedule_at = typeof x.schedule_at === 'string' ? x.schedule_at.slice(0, 40) : '';
    if (typeof x.caption === 'string') req.caption = x.caption.slice(0, 3000);
    if (action === 'taller_schedule' && !Number.isFinite(Date.parse(req.schedule_at))) return { ok: false, error: 'falta_fecha', message: 'schedule_at (fecha y hora ISO) es obligatorio.' };
    if (action === 'taller_add_version') {
      if (!Array.isArray(x.assets) || x.assets.length > 10) return { ok: false, error: 'assets_invalidos', message: 'assets: lista de 0 a 10 archivos {path, w, h}.' };
      req.assets = x.assets.map((a) => ({ path: String((a && a.path) || '').slice(0, 200), w: Number(a && a.w) || null, h: Number(a && a.h) || null, label: typeof (a && a.label) === 'string' ? a.label.slice(0, 80) : null }));
      req.qa = x.qa && typeof x.qa === 'object' ? x.qa : {};
      req.cost_credits = Number(x.cost_credits) || 0;
      req.created_by = typeof x.created_by === 'string' ? x.created_by.slice(0, 60) : 'Claude';
      req.notes = typeof x.notes === 'string' ? x.notes.slice(0, 1000) : null;
      req.version_no = Number(x.version_no) || null;
      req.attempts = Number(x.attempts) || 0;
    }
  }
  if (action.startsWith('prep_')) {
    if (!oaIsUuid(x.candidate_id)) return { ok: false, error: 'candidate_id_invalido', message: 'candidate_id (uuid del prospecto) es obligatorio.' };
    req.candidate_id = String(x.candidate_id).toLowerCase();
    if (action === 'prep_li_sent') {
      req.kind = String(x.kind || '').toLowerCase();
      if (!['invitation', 'connected', 'message', 'reply', 'closed'].includes(req.kind)) return { ok: false, error: 'kind_invalido', message: 'kind: invitation | connected | message | reply | closed.' };
      req.text = typeof x.text === 'string' ? x.text.trim().slice(0, 1500) : '';
    }
    if (action === 'prep_hold' && String(req.reason || '').length < 8) return { ok: false, error: 'falta_razon', message: 'EN ESPERA exige una razón comercial explícita (≥ 8 caracteres).' };
    if (action === 'prep_contact') {
      req.email = typeof x.email === 'string' ? x.email.trim().toLowerCase().slice(0, 200) : '';
      req.linkedin = typeof x.linkedin === 'string' ? x.linkedin.trim().slice(0, 300) : '';
      if (!req.email && !req.linkedin) return { ok: false, error: 'sin_dato', message: 'Pega un correo o un enlace de LinkedIn.' };
    }
  }
  if (action.startsWith('linkedin_')) {
    if (!oaIsUuid(x.candidate_id)) return { ok: false, error: 'candidate_id_invalido', message: 'candidate_id (uuid del prospecto) es obligatorio.' };
    req.candidate_id = String(x.candidate_id).toLowerCase();
  }
  if (action.startsWith('content_')) {
    if (!oaIsUuid(x.piece_id)) return { ok: false, error: 'piece_id_invalido', message: 'piece_id (uuid de la pieza) es obligatorio.' };
    req.piece_id = String(x.piece_id).toLowerCase();
  }
  return { ok: true, req };
}

/** Lecturas de Supabase que necesita cada acción (PostgREST). `sb` = https://…supabase.co/rest/v1/ */
export function oaReads(req, sb) {
  const reads = [];
  const add = (key, path) => reads.push({ key, url: sb + path });
  if (req.request_id) add('audit', 'operator_audit_log?request_id=eq.' + req.request_id + '&select=status,response&limit=1');
  if (req.action === 'overview') {
    add('messages', 'outreach_messages?direction=eq.outbound&select=id,candidate_id,company_name,kind,to_email,subject,body,status,content_hash,created_at,updated_at,approved_by,approved_at,scheduled_for,sent_at,error,metadata,edited_by_christian_at&order=created_at.desc&limit=150');
    add('candidates', 'prospect_candidates?status=in.(in_ghl,accepted,contacted,discarded)&select=id,company_name,status,band,priority_score,ghl_stage,last_contact_channel,channel_state,domain,contact:canonical->contact,angle:canonical->>outreach_angle,quote:canonical->evidence_quotes->0->>quote&order=priority_score.desc&limit=400');
    add('suppression', 'outreach_suppression?select=email&limit=2000');
    add('config', 'outreach_config?id=eq.1&select=mode,paused,daily_cap,window_start,window_end,tz,linkedin_mode,linkedin_list_id,linkedin_campaign_id,linkedin_daily_cap');
  } else if (req.action.startsWith('email_')) {
    add('message', 'outreach_messages?id=eq.' + req.message_id + '&select=*,cand:prospect_candidates(id,company_name,status)&limit=1');
  } else if (req.action === 'autosend_set') {
    add('config', 'outreach_config?id=eq.1&select=autosend_enabled,autosend_min_score');
  } else if (req.action === 'mail_outcome') {
    add('candidate', 'prospect_candidates?id=eq.' + req.candidate_id + '&select=id,company_name,status,ghl_stage,ghl_opportunity_id,canonical&limit=1');
  } else if (req.action === 'mail_config_set') {
    add('config', 'outreach_config?id=eq.1&select=daily_cap,window_start,window_end,followup_days,funnel_min_sample');
  } else if (req.action.startsWith('linkedin_') || req.action.startsWith('prep_')) {
    add('candidate', 'prospect_candidates?id=eq.' + req.candidate_id + '&select=id,company_name,status,channel_state,last_contact_channel,contact:canonical->contact&limit=1');
  } else if (req.action.startsWith('taller_')) {
    add('piece', 'content_pieces?id=eq.' + req.piece_id + '&select=*,idea:content_ideas!content_pieces_idea_id_fkey(*)&limit=1');
    add('versions', 'content_versions?piece_id=eq.' + req.piece_id + '&select=*&order=version_no.desc&limit=2');
    add('feedback', 'content_feedback?piece_id=eq.' + req.piece_id + '&select=id,status&limit=50');
    if (req.action === 'taller_schedule') {
      add('taken', 'content_pieces?status=in.(scheduled,in_review,approved)&scheduled_at=gte.' + new Date(Date.now() - 86400000).toISOString() + '&select=id,channel,format,scheduled_at&limit=300');
      add('tcfg', 'content_config?id=eq.1&select=taller_carousel_direct_schedule,ig_feed_slot,ig_story_slots');
    }
  } else if (req.action === 'idea_decide') {
    add('idea', 'content_ideas?id=eq.' + req.idea_id + '&select=*&limit=1');
  } else if (req.action === 'pause_set') {
    add('state', 'system_state?id=eq.1&select=*&limit=1');
  } else if (req.action.startsWith('content_')) {
    add('piece', 'content_pieces?id=eq.' + req.piece_id + '&select=id,status,ghl_post_id,ghl_status,channel,format,topic,is_test,scheduled_at&limit=1');
  }
  return reads;
}

/** Día calendario (YYYY-MM-DD) en la zona dada. */
export function oaDay(ms, tz) {
  return new Date(ms).toLocaleDateString('en-CA', { timeZone: tz || 'America/Santiago' });
}

/** Tarjetas de correo para /ops: el texto completo, de quién es y si todavía se puede editar. */
/** Calidad Cold Email v2 guardada en el borrador (score, avisos, evidencia, ángulo). null si el borrador es anterior a v2. */
export function oaCold(meta) {
  const c = meta && meta.cold;
  if (!c || typeof c.score !== 'number') return null;
  return { score: c.score, level: c.level || null, warnings: (c.warnings || []).slice(0, 6).map((w) => w.text), rewards: (c.rewards || []).slice(0, 6).map((r) => r.text), similarity: c.similarity || null, cta_kind: c.cta_kind || null, words: c.words || null,
    evidence: (c.evidence || []).slice(0, 4).map((e) => e.fact), insight: c.insight || null, friction: c.friction || null, angle: c.angle || null, cta_reason: c.cta_reason || null, linted_at: c.linted_at || null };
}

/** Última versión anterior guardada en el mismo registro (para comparar antes/después). */
export function oaPrevious(meta) {
  const h = meta && Array.isArray(meta.history) ? meta.history : [];
  if (!h.length) return null;
  const p = h[h.length - 1];
  return { subject: p.subject || '', body: p.body || '', score: typeof p.score === 'number' ? p.score : null, at: p.at || null, by: p.by || null, reason: p.reason || null, versions: h.length };
}

export function oaEmailCards(messages, cands, suppression) {
  const byId = {};
  (Array.isArray(cands) ? cands : []).forEach((c) => { byId[c.id] = c; });
  const sup = new Set((Array.isArray(suppression) ? suppression : []).map((s) => String((s && s.email) || '').toLowerCase()));
  return (Array.isArray(messages) ? messages : []).map((m) => {
    const c = byId[m.candidate_id] || {};
    const contact = c.contact || {};
    const st = m.status;
    return {
      id: m.id, candidate_id: m.candidate_id, kind: m.kind, company: m.company_name || c.company_name || '—',
      contact_name: contact.name || null, contact_role: contact.role || contact.job_title || null, to: m.to_email, subject: m.subject, body: m.body,
      status: st, editable: st === 'draft', can_reopen: st === 'approved', can_approve: st === 'draft', can_reject: st === 'draft' || st === 'approved',
      hash: m.content_hash || null, created_at: m.created_at, updated_at: m.updated_at, approved_at: m.approved_at || null, approved_by: m.approved_by || null,
      scheduled_for: m.scheduled_for || null, sent_at: m.sent_at || null, error: m.error || null,
      score: c.priority_score != null ? c.priority_score : null, band: c.band || null, reason: c.angle || null, evidence: c.quote || null,
      recommended_channel: ((c.channel_state || {}).recommended || {}).channel || null,
      suppressed: sup.has(String(m.to_email || '').toLowerCase()),
      rejected_reason: (m.metadata && m.metadata.rejected_reason) || null,
      cold: oaCold(m.metadata), previous: oaPrevious(m.metadata), edited_by_christian_at: m.edited_by_christian_at || null,
    };
  });
}

/** LinkedIn para /ops: quién está listo para aprobar y qué fue enviado a Waalaxy (solo hechos con registro en Atacama OS). */
export function oaLinkedinData(cands, cfg, nowMs) {
  const tz = (cfg && cfg.tz) || 'America/Santiago';
  const today = oaDay(nowMs, tz);
  const ready = [], sent = [];
  const counts = { pendiente: 0, en_lista: 0, en_campana: 0, conexion: 0, mensaje: 0, followup: 0, respondio: 0, rechazo: 0, error: 0 };
  let importedToday = 0;
  (Array.isArray(cands) ? cands : []).forEach((c) => {
    const st = c.channel_state || {};
    const li = st.linkedin || null;
    const declined = (st.ops_declined || {}).linkedin || null;
    if (li && li.state) {
      if (li.state === 'aprobacion_pendiente') counts.pendiente++;
      else if (counts[li.state] != null) counts[li.state]++;
      if (['en_lista', 'en_campana', 'conexion', 'mensaje', 'followup', 'respondio', 'rechazo', 'detenido', 'error'].includes(li.state)) {
        if (li.imported_at && oaDay(Date.parse(li.imported_at), tz) === today && li.mode_at_import === 'live') importedToday++;
        sent.push({ candidate_id: c.id, company: c.company_name, person: li.person || null, role: li.role || null, url: li.url || null, approved_by: li.approved_by || null, approved_at: li.approved_at || null, imported_at: li.imported_at || null,
          list_id: li.list_id || null, campaign_id: li.campaign_id || null, score: c.priority_score != null ? c.priority_score : null, angle: c.angle || null, state: li.state, state_label: liLabel(li.state), last_event: li.last_event || null, last_event_at: li.last_event_at || null,
          import_code: li.import_code || null, campaign_code: li.campaign_code || null, mode_at_import: li.mode_at_import || null });
      }
      return;
    }
    if (declined) return;
    const rec = recommendChannel({ status: c.status, last_contact_channel: c.last_contact_channel, contact: c.contact || {} }, { suppressedEmails: [] });
    if (rec.channel === 'linkedin' && rec.linkedin_ready) {
      ready.push({ candidate_id: c.id, company: c.company_name, person: rec.person, role: rec.role, url: rec.linkedin_url, score: c.priority_score != null ? c.priority_score : null, band: c.band || null, angle: c.angle || null, fact: c.quote || null, reason: rec.reason,
        list_id: (cfg && cfg.linkedin_list_id) || null, campaign_id: (cfg && cfg.linkedin_campaign_id) || null, source: ((c.contact || {}).linkedin_source_url) || null });
    }
  });
  sent.sort((a, b) => (Date.parse(b.imported_at || b.approved_at || 0) || 0) - (Date.parse(a.imported_at || a.approved_at || 0) || 0));
  ready.sort((a, b) => (b.score || 0) - (a.score || 0));
  return { mode: (cfg && cfg.linkedin_mode) || 'off', cap: Number(cfg && cfg.linkedin_daily_cap) || 0, imported_today: importedToday, counts, ready, sent: sent.slice(0, 60) };
}

/** Respuesta de la acción `overview`. */
export function oaOverview(R, nowMs) {
  const cfg = (R.config || [])[0] || {};
  const tz = cfg.tz || 'America/Santiago';
  const today = oaDay(nowMs, tz);
  const messages = R.messages || [];
  const emailToday = messages.filter((m) => m.status === 'sent' && m.sent_at && oaDay(Date.parse(m.sent_at), tz) === today).length;
  return { ok: true, action: 'overview', generated_at: new Date(nowMs).toISOString(), email: { mode: cfg.mode || 'off', paused: cfg.paused === true, cap: Number(cfg.daily_cap) || 0, sent_today: emailToday, window: (cfg.window_start || '09:00') + '–' + (cfg.window_end || '17:30'), cards: oaEmailCards(messages, R.candidates, R.suppression) },
    linkedin: oaLinkedinData(R.candidates, cfg, nowMs) };
}

/** El mismo error que devuelve el motor real, sin éxito falso. */
export function oaRelay(r, fallback) {
  const b = r && r.body && typeof r.body === 'object' ? r.body : null;
  if (!r || !r.statusCode || r.statusCode >= 300 || !b) return { ok: false, error: 'sin_respuesta', message: fallback + ' (el motor no respondió' + (r && r.statusCode ? ': HTTP ' + r.statusCode : '') + ').' };
  return { ok: false, error: b.error || b.status || 'rechazado', message: String(b.message || fallback).slice(0, 400), engine_status: b.status || null };
}

/**
 * Máquina de pasos. Recibe lo ya ejecutado (`results`: respuestas de las llamadas anteriores, en orden) y devuelve
 *   { call: { kind: 'ingest'|'ghl', method, url, body } }   → hay que hacer otra llamada, o
 *   { final: { resp, writes } }                             → terminó (resp = lo que verá /ops; writes = filas de Supabase).
 * `env` = { n8n, ghl_loc, approver }.
 */
export function oaStep(req, R, results, nowMs, env) {
  const A = req.action;
  const nowIso = new Date(nowMs).toISOString();
  const by = 'Christian via /ops';
  const done = (resp, writes) => ({ final: { resp: { action: A, request_id: req.request_id, ...resp }, writes: writes || [] } });
  const fail = (error, message, extra) => done({ ok: false, error, message, ...(extra || {}) });
  const ingest = (path, body) => ({ call: { kind: 'ingest', method: 'POST', url: env.n8n + '/webhook/' + path, body } });
  const ghl = (method, path, body) => ({ call: { kind: 'ghl', method, url: 'https://services.leadconnectorhq.com/social-media-posting/' + env.ghl_loc + path, body: body || null } });
  const n = results.length;
  const ORDER = 'Aprobado desde /ops (sesión privada de Christian)';

  // ------------------------------------------------------------------ correo
  if (A.startsWith('email_')) {
    const m = (R.message || [])[0];
    if (!m) return fail('correo_no_encontrado', 'No encontré ese correo.');
    if (m.direction && m.direction !== 'outbound') return fail('no_es_saliente', 'Ese mensaje no es un correo saliente.');
    const label = (m.company_name || (m.cand && m.cand.company_name) || 'el prospecto');
    const st = m.status;
    if (A === 'email_reopen') {
      if (n === 0) {
        if (st === 'draft') return done({ ok: true, status: 'already_draft', message: 'Ya estaba como borrador.' });
        if (st !== 'approved') return fail('no_se_puede_reabrir', st === 'sending' || st === 'sent' ? 'Ese correo ya se está enviando o se envió: no se puede volver a borrador.' : 'Solo un correo aprobado que aún no sale se puede volver a borrador.', { current_status: st });
        return done({ ok: true, status: 'reopened', message: 'Volvió a borrador: la aprobación anterior quedó anulada. Edítalo y apruébalo de nuevo.' },
          [{ method: 'PATCH', path: 'outreach_messages?id=eq.' + m.id + '&status=eq.approved', body: { status: 'draft', approved_by: null, approved_at: null, approval_text: null, scheduled_for: null, confirm_code: null, confirm_hash: null, confirm_expires_at: null, updated_at: nowIso }, prefer: 'return=representation', check_rows: true, check_message: 'No pude volver a borrador: el correo ya no estaba aprobado (puede que ya haya empezado a enviarse).' }]);
      }
    }
    if (A === 'email_save') {
      if (n === 0) {
        if (st === 'approved') return fail('aprobado_no_editable', 'Ese correo está aprobado: usa «Volver a borrador» para editarlo (la aprobación anterior se anula).', { current_status: st });
        if (st !== 'draft') return fail('no_editable', st === 'sending' || st === 'sent' ? 'Ese correo ya se está enviando o se envió: no se puede editar.' : 'Ese correo está en estado «' + st + '» y no se puede editar.', { current_status: st });
        if (m.content_hash !== req.expected_hash) return fail('desactualizado', 'El correo cambió desde que lo abriste. Recarga para ver la versión actual.', { current_hash: m.content_hash });
        if (String(m.subject || '').trim() === req.subject && String(m.body || '').trim() === req.body) return done({ ok: true, status: 'unchanged', message: 'Sin cambios: el texto es el mismo.', hash: m.content_hash });
        return ingest('atacama-outreach-engine', { action: 'draft', candidate_id: m.candidate_id, kind: m.kind, subject: req.subject, body: req.body, by, christian: true, reason: req.paste ? 'Versión pegada por Christian (/ops)' : 'Editado desde /ops' });
      }
      const b = results[0] && results[0].body;
      if (b && b.ok && b.draft) return done({ ok: true, status: 'saved', message: 'Guardado. NO se envió: aprueba el envío cuando estés listo.', hash: b.draft.hash || null, draft: { subject: b.draft.subject, body: b.draft.body, status: b.draft.status } });
      return done(oaRelay(results[0], 'No pude guardar el borrador'));
    }
    if (A === 'email_approve') {
      if (n === 0) {
        if (st === 'approved') return done({ ok: true, status: 'already_approved', message: 'Ya estaba aprobado: sale en la próxima ventana de envío.' });
        if (st !== 'draft') return fail('no_aprobable', st === 'sending' || st === 'sent' ? 'Ese correo ya se está enviando o se envió.' : 'Ese correo está en estado «' + st + '» y no se puede aprobar.', { current_status: st });
        if (m.content_hash !== req.expected_hash) return fail('desactualizado', 'El correo cambió desde que lo abriste. Recarga y vuelve a leerlo antes de aprobar.', { current_hash: m.content_hash });
        return ingest('atacama-outreach-engine', { action: 'approve', candidate_id: m.candidate_id, kind: m.kind, by });
      }
      const b1 = results[0] && results[0].body;
      if (n === 1) {
        const shown = b1 && (b1.draft || b1.preview);
        if (b1 && b1.status === 'confirmation_required' && b1.confirmation_code) {
          if (shown && shown.hash && shown.hash !== req.expected_hash) return fail('desactualizado', 'La versión que el motor iba a aprobar no es la que viste. Recarga y vuelve a leer el correo.', { current_hash: shown.hash });
          return ingest('atacama-outreach-engine', { action: 'approve', candidate_id: m.candidate_id, kind: m.kind, confirmation_code: b1.confirmation_code, order_text: ORDER, by });
        }
        if (b1 && b1.status === 'already_approved') return done({ ok: true, status: 'already_approved', message: 'Ya estaba aprobado.' });
        return done(oaRelay(results[0], 'No pude aprobar el correo'));
      }
      const b2 = results[1] && results[1].body;
      if (b2 && b2.ok && b2.status === 'approved') return done({ ok: true, status: 'approved', message: 'Aprobado: ' + label + '. Saldrá cuando el envío lo permita (ventana lun–vie, tope diario). No se envió desde aquí.', scheduled_for: (b2.approved && b2.approved.scheduled_for) || b2.scheduled_for || null });
      return done(oaRelay(results[1], 'No pude aprobar el correo'));
    }
    if (A === 'email_reject') {
      if (n === 0) {
        if (!['draft', 'approved'].includes(st)) return fail('no_rechazable', st === 'sending' || st === 'sent' ? 'Ese correo ya se está enviando o se envió: no se puede rechazar.' : 'Ese correo está en estado «' + st + '».', { current_status: st });
        return ingest('atacama-outreach-engine', { action: 'cancel', candidate_id: m.candidate_id, kind: m.kind, by });
      }
      const b = results[0] && results[0].body;
      if (b && b.ok && b.status === 'cancelled') {
        const meta = { ...(m.metadata || {}), rejected_by: by, rejected_at: nowIso, rejected_reason: req.reason || null };
        return done({ ok: true, status: 'rejected', message: 'Rechazado: no se enviará. El borrador no se reactiva solo.' }, [{ method: 'PATCH', path: 'outreach_messages?id=eq.' + m.id, body: { metadata: meta, updated_at: nowIso } }]);
      }
      return done(oaRelay(results[0], 'No pude rechazar el correo'));
    }
  }

  // ---------------------------------------------------------------- LinkedIn
  if (A.startsWith('linkedin_')) {
    const c = (R.candidate || [])[0];
    if (!c) return fail('prospecto_no_encontrado', 'No encontré ese prospecto.');
    if (A === 'linkedin_reject') {
      const st = c.channel_state || {};
      const ops = { ...(st.ops_declined || {}), linkedin: { at: nowIso, by, reason: req.reason || null } };
      return done({ ok: true, status: 'rejected', message: 'Rechazado: no se propone de nuevo en /ops. No se contactó a nadie.' }, [{ method: 'PATCH', path: 'prospect_candidates?id=eq.' + c.id, body: { channel_state: { ...st, ops_declined: ops }, updated_at: nowIso } }]);
    }
    if (A === 'linkedin_approve') {
      if (n === 0) {
        const lis = (c.channel_state || {}).linkedin;
        if (lis && ['en_lista', 'en_campana', 'conexion', 'mensaje', 'followup', 'respondio'].includes(lis.state)) return fail('ya_en_linkedin', 'Ese prospecto ya está en LinkedIn.', { current_state: lis.state });
        return ingest('atacama-linkedin', { action: 'approve', target: c.id, by });
      }
      const b1 = results[0] && results[0].body;
      if (n === 1) {
        if (b1 && b1.status === 'confirmation_required' && b1.confirmation_code) return ingest('atacama-linkedin', { action: 'approve', target: c.id, confirmation_code: b1.confirmation_code, order_text: ORDER, by });
        return done(oaRelay(results[0], 'No pude aprobar el alta en LinkedIn'));
      }
      const b2 = results[1] && results[1].body;
      if (b2 && b2.ok && ['imported', 'approved_pending_import'].includes(b2.status)) return done({ ok: true, status: b2.status, message: 'Aprobado: ' + (c.company_name || '') + ' entró a la lista y a la campaña de Waalaxy. Waalaxy ejecuta la secuencia.', state: b2.state || null, state_label: b2.state_label || null });
      return done(oaRelay(results[1], 'No pude aprobar el alta en LinkedIn'));
    }
  }

  // ---------------------------------------------------------------- envío automático (interruptor): solo Christian, desde /ops
  if (A === 'mail_outcome') {
    const c = (R.candidate || [])[0];
    if (!c) return fail('prospecto_no_encontrado', 'No encontré ese prospecto.');
    if (!c.ghl_opportunity_id) return fail('sin_oportunidad', c.company_name + ' no tiene oportunidad en GHL: no hay nada que mover.');
    const label = req.outcome === 'reunion' ? 'Reunión (Diagnóstico)' : 'Perdida';
    if (n === 0) {
      const act = req.outcome === 'reunion' ? { type: 'move_stage', stage: 'diagnostico', note: 'REUNIÓN acordada (marcado desde /ops).' + (req.text ? ' ' + req.text : '') } : { type: 'discard', mark_lost: true, reason: 'Perdida (marcado desde /ops).' + (req.text ? ' ' + req.text : '') };
      return ingest('atacama-prospect-gateway', { action: 'act', request_id: 'ops-' + req.request_id, source: { type: 'ops', name: 'Atacama OS · /ops', reference: c.id }, act, targets: [c.canonical || { company_name: c.company_name }], options: { by: by } });
    }
    const b = results[0] && results[0].body;
    const g = b && Array.isArray(b.results) ? b.results[0] : null;
    if (b && b.ok === true && g && g.executed !== false && !g.error && g.ghl && g.ghl.applied && g.ghl.applied.opportunity === 'ok') return done({ ok: true, status: 'outcome_' + req.outcome, message: c.company_name + ': ' + label + '. Movido en GHL.' });
    if (b && b.ok === true && g) return fail('gateway_no_aplico', 'GHL no confirmó el cambio de ' + c.company_name + (g.error ? ' (' + String(g.error).slice(0, 120) + ')' : '') + '. Revísalo en GHL.');
    return done(oaRelay(results[0], 'No pude mover la oportunidad en GHL'));
  }
  if (A === 'mail_config_set') {
    const cur = (R.config || [])[0] || {};
    const s = req.set;
    const notes = [];
    if (s.daily_cap != null) notes.push('tope ' + (cur.daily_cap != null ? cur.daily_cap + ' → ' : '') + s.daily_cap + ' correos/día');
    if (s.window_start) notes.push('ventana ' + s.window_start + '–' + s.window_end);
    if (s.followup_days) notes.push('seguimientos a +' + s.followup_days[0] + ' y +' + s.followup_days[1] + ' días hábiles');
    if (s.funnel_min_sample != null) notes.push('muestra mínima del embudo ' + s.funnel_min_sample);
    const up = s.daily_cap != null && Number(cur.daily_cap) > 0 && s.daily_cap > Number(cur.daily_cap);
    return done({ ok: true, status: 'mail_config_saved', set: s, previous: { daily_cap: cur.daily_cap != null ? cur.daily_cap : null, window_start: cur.window_start || null, window_end: cur.window_end || null, followup_days: cur.followup_days || null },
      message: 'Guardado: ' + notes.join(' · ') + '.' + (up ? ' Sube de a poco: revisa rebotes en «Salud».' : '') },
      [{ method: 'PATCH', path: 'outreach_config?id=eq.1', body: { ...s, config_updated_by: by, updated_at: nowIso }, prefer: 'return=representation', check_rows: true, check_message: 'No pude guardar la configuración del correo.' }]);
  }
  if (A === 'autosend_set') {
    const cur = (R.config || [])[0] || {};
    const body = { autosend_enabled: req.enabled, autosend_updated_at: nowIso, autosend_updated_by: by, updated_at: nowIso };
    if (req.min_score != null) body.autosend_min_score = req.min_score;
    return done({ ok: true, status: req.enabled ? 'autosend_on' : 'autosend_off', enabled: req.enabled, min_score: req.min_score != null ? req.min_score : (Number(cur.autosend_min_score) || 80),
      message: req.enabled ? 'ENVÍO AUTOMÁTICO: ON. Los borradores elegibles (score ≥ ' + (req.min_score != null ? req.min_score : (Number(cur.autosend_min_score) || 80)) + ', correo directo publicado, no B/C, sin respuesta) se aprobarán solos y saldrán con el tope y la ventana de siempre. Puedes apagarlo cuando quieras.' : 'ENVÍO AUTOMÁTICO: OFF. Todo vuelve a quedar en Aprobaciones; lo que el autoenvío había aprobado y no salió vuelve a borrador.' },
      [{ method: 'PATCH', path: 'outreach_config?id=eq.1', body, prefer: 'return=representation', check_rows: true, check_message: 'No pude cambiar el interruptor.' }]);
  }
  if (A === 'autosend_sweep') {
    if (n === 0) return ingest('atacama-linkedin', { action: 'autosweep', by: 'Atacama OS · autoenvío (tras el interruptor)' });
    const b = results[0] && results[0].body;
    if (b && b.ok) return done({ ok: true, status: b.status, message: b.message, approved: b.approved || [], reverted: b.reverted || [], skipped_count: b.skipped_count || 0 });
    return done(oaRelay(results[0], 'No pude aplicar el barrido del autoenvío'));
  }

  // ---------------------------------------------------------------- contacto preparado (LinkedIn manual, espera, buscar contacto)
  if (A.startsWith('prep_')) {
    const c = (R.candidate || [])[0];
    if (!c) return fail('prospecto_no_encontrado', 'No encontré ese prospecto.');
    if (A === 'prep_li_sent') {
      if (n === 0) return ingest('atacama-linkedin', { action: 'li_sent', target: c.id, kind: req.kind, text: req.text, by });
      const bl = results[0] && results[0].body;
      if (bl && bl.ok) return done({ ok: true, status: bl.status, message: bl.message, follow_up_at: bl.follow_up_at || null, li_status: bl.li_status || null, ghl_stage: bl.ghl_stage || null, ghl_error: bl.ghl_error || null });
      return done(oaRelay(results[0], 'No pude registrar el envío por LinkedIn'));
    }
    if (A === 'prep_hold' || A === 'prep_release') {
      if (n === 0) return ingest('atacama-linkedin', { action: 'prep_set', target: c.id, state: A === 'prep_hold' ? 'hold' : 'clear', reason: req.reason, by });
      const b = results[0] && results[0].body;
      if (b && b.ok) return done({ ok: true, status: b.status, message: b.message });
      return done(oaRelay(results[0], 'No pude cambiar el estado'));
    }
    if (A === 'prep_contact') {
      if (n === 0) return ingest('atacama-linkedin', { action: 'prep_contact', target: c.id, email: req.email, linkedin: req.linkedin, by });
      const b0 = results[0] && results[0].body;
      if (!(b0 && b0.ok)) return done(oaRelay(results[0], 'No pude guardar el contacto'));
      if (n === 1) {
        if (b0.channel === 'email' && b0.has_draft_text && b0.draft_text) return ingest('atacama-outreach-engine', { action: 'draft', candidate_id: c.id, kind: 'initial', subject: b0.draft_text.subject || 'una consulta rápida', body: b0.draft_text.body, by, reason: 'Contacto agregado desde /ops (buscar contacto)' });
        return done({ ok: true, status: 'contact_saved', message: b0.message });
      }
      const b1 = results[1] && results[1].body;
      if (b1 && b1.ok && b1.draft) return done({ ok: true, status: 'contact_saved_draft', message: 'Guardé el contacto y dejé el borrador listo en Aprobaciones (NO enviado).', draft_id: b1.draft.id || null });
      return done({ ok: true, status: 'contact_saved', message: b0.message + ' El borrador no se pudo crear solo (' + String((b1 && b1.message) || 'sin respuesta').slice(0, 160) + '): se redacta en la próxima corrida.' });
    }
  }

  // ---------------------------------------------------------------- Ideas de la semana (spec §6.1): Christian decide; nada se produce ni publica solo
  if (A === 'idea_decide') {
    const idea0 = (R.idea || [])[0] || null;
    // Con el Taller vivo (Fase 2), aprobar una idea crea su pieza (carril vps → en cola · pc → en el PC con Claude).
    const plan = req.decision === 'approve' && idea0 && idea0.status === 'proposed' ? tallerApproveIdeaPlan(idea0, { now: nowMs, by, allow_test: req.test === true, piece_id: tallerNewId(), pack_id: env.pack_id }) : ideasDecidePlan(req, idea0, { now: nowMs, by, allow_test: req.test === true });
    if (plan.error) return fail(plan.error, plan.message);
    return done(plan.resp, plan.writes);
  }
  if (A === 'idea_mine') {
    const plan = ideasMinePlan(req, { now: nowMs, by, id: ideasNewId(), is_test: req.test === true });
    if (plan.error) return fail(plan.error, plan.message);
    return done(plan.resp, plan.writes);
  }

  // ---------------------------------------------------------------- Taller (spec §6.2–§6.3): revisar, pedir cambios, programar
  if (A.startsWith('taller_')) {
    const row = (R.piece || [])[0] || null;
    if (!row) return fail('pieza_no_encontrada', 'No encontré esa pieza.');
    if (row.is_test && req.test !== true) return fail('pieza_test', 'Esa pieza es de prueba.');
    const idea = row.idea || null;
    const piece = { ...row }; delete piece.idea;
    const vs = R.versions || [];
    const cur = vs.find((v) => v.version_no === piece.current_version) || vs[0] || null;
    const ctx = { now: nowMs, by, id: tallerNewId(), version_id: cur ? cur.id : null, week_start: idea ? idea.week_start : null };
    const simple = (plan) => (plan.error ? fail(plan.error, plan.message) : done(plan.resp, plan.writes));
    if (A === 'taller_feedback') return simple(tallerFeedbackPlan(piece, { text: req.text, scope: req.scope }, ctx));
    if (A === 'taller_approve') return simple(tallerApprovePlan(piece, ctx));
    if (A === 'taller_duplicate') return simple(tallerDuplicatePlan(piece, idea, { channel: req.channel }, ctx));
    if (A === 'taller_caption') return simple(tallerCaptionPlan(piece, cur, req.caption, ctx));
    if (A === 'taller_add_version') return simple(tallerAddVersionPlan(piece, { assets: req.assets, caption: req.caption, qa: req.qa, cost_credits: req.cost_credits, created_by: req.created_by, notes: req.notes, version_no: req.version_no, attempts: req.attempts }, ctx));
    if (A === 'taller_discard') {
      if (!piece.ghl_post_id || !['programada', 'programada_pendiente_de_clic'].includes(piece.taller_status)) return simple(tallerDiscardPlan(piece, { reason: req.reason || req.text }, ctx));
      // Ya estaba en GHL: retirar = rechazo reversible (no se borra por API), y recién entonces se descarta.
      if (n === 0) return ghl('GET', '/posts/' + piece.ghl_post_id, null);
      const g0 = results[0] && results[0].body && results[0].body.results && results[0].body.results.post;
      if (!g0 || !g0._id) return done(oaRelay(results[0], 'No pude leer el post en GHL'));
      if (String(g0.status) === 'published') return fail('ya_publicada', 'Ese post ya se publicó: no se puede retirar desde aquí.');
      const ap = (g0.postApprovalDetails || {}).approver || env.approver;
      if (n === 1) return ghl('PUT', '/posts/' + piece.ghl_post_id, { accountIds: g0.accountIds, summary: g0.summary, type: g0.type || 'post', status: 'in_review', userId: env.approver, media: g0.media || [], scheduleDate: g0.scheduleDate, postApprovalDetails: { approver: ap, approvalStatus: 'rejected' } });
      if (n === 2) { if (!(results[1] && results[1].statusCode && results[1].statusCode < 300)) return done(oaRelay(results[1], 'GHL no aceptó el retiro')); return ghl('GET', '/posts/' + piece.ghl_post_id, null); }
      const g2 = results[2] && results[2].body && results[2].body.results && results[2].body.results.post;
      if (!g2 || (g2.postApprovalDetails || {}).approvalStatus !== 'rejected') return fail('ghl_no_confirmo', 'GHL no confirmó el retiro. Revísalo en GHL; la pieza sigue como estaba.');
      const pl = tallerDiscardPlan(piece, { reason: req.reason || req.text }, ctx);
      if (pl.error) return fail(pl.error, pl.message);
      pl.writes[0].body.ghl_status = g2.status; pl.writes[0].body.ghl_approval_status = 'rejected'; pl.writes[0].body.status = 'discarded';
      return done({ ...pl.resp, message: 'Retirada de GHL (rechazo reversible) y descartada.' }, pl.writes);
    }
    if (A === 'taller_schedule') {
      const pre = tallerSchedulePrecheck({ piece, version: cur, idea, schedule_at: req.schedule_at, taken: R.taken || [], cfg: (R.tcfg || [])[0] || {}, now: nowMs });
      if (pre.error) return fail(pre.error, pre.message);
      let k = 0, media = [];
      if (pre.needsUpload) {
        if (n === 0) return ingest('atacama-media-gateway', { action: 'storage_upload', paths: pre.paths, piece_id: piece.id });
        const up = results[0] && results[0].body;
        if (!(up && up.ok && Array.isArray(up.files) && up.files.length === pre.paths.length && up.files.every((f) => f && /^https:\/\//.test(String(f.url || ''))))) return done(oaRelay(results[0], 'No pude subir los archivos a GHL'));
        media = up.files; k = 1;
      }
      if (n === k) return { call: { kind: 'ghl', method: 'POST', url: 'https://services.leadconnectorhq.com/social-media-posting/' + env.ghl_loc + '/posts', body: tallerGhlBody(pre, media, env.approver) } };
      const created = results[k] && results[k].body;
      const cp = created && ((created.results && created.results.post) || created.post);
      if (n === k + 1) { if (!(results[k].statusCode && results[k].statusCode < 300 && cp && cp._id)) return done(oaRelay(results[k], 'GHL no aceptó el post')); return ghl('GET', '/posts/' + cp._id, null); }
      const post = results[k + 1] && results[k + 1].body && results[k + 1].body.results && results[k + 1].body.results.post;
      const fin = tallerScheduleFinal({ piece, pre, post, media, now: nowMs, had_feedback: (R.feedback || []).length > 0 });
      if (fin.error) return fail(fin.error, fin.message, { ghl_post_id: (post && post._id) || (cp && cp._id) || null });
      return done(fin.resp, fin.writes);
    }
  }

  // ---------------------------------------------------------------- pausa general (spec §8.8): system_state + reflejo en outreach_config.paused
  if (A === 'pause_set') {
    const plan = v3PausePlan(req, (R.state || [])[0] || null, (R.config || [])[0] || null, nowMs, by);
    if (plan.error) return fail(plan.error, plan.message);
    return done(plan.resp, plan.writes);
  }

  // ---------------------------------------------------------------- contenido
  if (A.startsWith('content_')) {
    const p = (R.piece || [])[0];
    if (!p) return fail('pieza_no_encontrada', 'No encontré esa pieza.');
    if (!p.ghl_post_id) return fail('sin_post_en_ghl', 'Esa pieza no tiene un post en GHL Social Planner.');
    if (p.status !== 'in_review') return fail('no_esta_en_revision', 'Esa pieza ya no está en revisión (estado: ' + p.status + ').', { current_status: p.status });
    if (n === 0) return ghl('GET', '/posts/' + p.ghl_post_id, null);
    const post0 = results[0] && results[0].body && results[0].body.results && results[0].body.results.post;
    if (!post0 || !post0._id) return done(oaRelay(results[0], 'No pude leer el post en GHL'));
    const ap0 = (post0.postApprovalDetails || {}).approvalStatus;
    if (post0.status !== 'in_review' || ap0 !== 'pending') return fail('post_no_pendiente', 'En GHL ese post ya no está pendiente de aprobación (estado: ' + post0.status + ', aprobación: ' + (ap0 || '—') + '). Recarga.', { ghl_status: post0.status, ghl_approval: ap0 || null });
    const approver = (post0.postApprovalDetails || {}).approver || env.approver;
    const base = { accountIds: post0.accountIds, summary: post0.summary, type: post0.type || 'post', status: 'in_review', userId: env.approver, media: post0.media || [], scheduleDate: post0.scheduleDate,
      ...(post0.categoryId ? { categoryId: post0.categoryId } : {}), ...(post0.tags && post0.tags.length ? { tags: post0.tags } : {}) };
    if (A === 'content_approve') {
      if ((post0.media || []).length > 1) return fail('carrusel_requiere_ghl', 'GHL reduce los carruseles a 1 imagen cuando se aprueban por API. Esta pieza tiene ' + post0.media.length + ' imágenes: apruébala en GHL (Social Planner) para no perderlas.', { needs_ghl: true, media: post0.media.length });
      if (Date.parse(post0.scheduleDate) < nowMs + 15 * 60000) return fail('fecha_pasada', 'La fecha propuesta ya pasó o es inminente. Cámbiala en GHL antes de aprobar.', { schedule_date: post0.scheduleDate });
      if (n === 1) return ghl('PUT', '/posts/' + p.ghl_post_id, { ...base, postApprovalDetails: { approver, approvalStatus: 'approved' } });
      if (n === 2) { if (!(results[1] && results[1].statusCode && results[1].statusCode < 300)) return done(oaRelay(results[1], 'GHL no aceptó la aprobación')); return ghl('GET', '/posts/' + p.ghl_post_id, null); }
      const post3 = results[2] && results[2].body && results[2].body.results && results[2].body.results.post;
      if (post3 && post3.status === 'scheduled' && (post3.postApprovalDetails || {}).approvalStatus === 'approved') {
        return done({ ok: true, status: 'scheduled', message: 'Aprobada y programada en GHL para ' + post3.scheduleDate + '. GHL la publicará a esa hora.', schedule_date: post3.scheduleDate },
          [{ method: 'PATCH', path: 'content_pieces?id=eq.' + p.id + '&status=eq.in_review', body: { status: 'scheduled', ghl_status: 'scheduled', ghl_approval_status: 'approved', scheduled_at: post3.scheduleDate, updated_at: nowIso } }]);
      }
      return fail('ghl_no_confirmo', 'GHL respondió pero el post no quedó programado (estado: ' + (post3 ? post3.status : 'desconocido') + '). Revísalo en GHL; no lo doy por aprobado.', { ghl_status: post3 ? post3.status : null });
    }
    if (A === 'content_reject') {
      if (n === 1) return ghl('PUT', '/posts/' + p.ghl_post_id, { ...base, postApprovalDetails: { approver, approvalStatus: 'rejected' } });
      if (n === 2) { if (!(results[1] && results[1].statusCode && results[1].statusCode < 300)) return done(oaRelay(results[1], 'GHL no aceptó el rechazo')); return ghl('GET', '/posts/' + p.ghl_post_id, null); }
      const post3 = results[2] && results[2].body && results[2].body.results && results[2].body.results.post;
      if (post3 && (post3.postApprovalDetails || {}).approvalStatus === 'rejected') {
        return done({ ok: true, status: 'rejected', message: 'Rechazada: no se publicará.' }, [{ method: 'PATCH', path: 'content_pieces?id=eq.' + p.id + '&status=eq.in_review', body: { status: 'discarded', ghl_status: post3.status, ghl_approval_status: 'rejected', updated_at: nowIso } }]);
      }
      return fail('ghl_no_confirmo', 'GHL respondió pero el post no quedó rechazado. Revísalo en GHL.', { ghl_status: post3 ? post3.status : null });
    }
  }
  return fail('accion_no_soportada', 'Acción no soportada en este paso.');
}

/** Fila de auditoría (operator_audit_log): quién, qué, sobre qué, resultado y error sanitizado. */
export function oaAudit(req, R, final, nowMs) {
  const r = final.resp || {};
  const ent = {};
  if (req.message_id) { const m = (R.message || [])[0]; ent.message_id = req.message_id; if (m) { ent.company = m.company_name; ent.kind = m.kind; ent.to = m.to_email; } }
  if (req.candidate_id) { const c = (R.candidate || [])[0]; ent.candidate_id = req.candidate_id; if (c) ent.company = c.company_name; }
  if (req.idea_id) { const i = (R.idea || [])[0]; ent.idea_id = req.idea_id; if (i) { ent.title = i.title; ent.channel = i.channel; ent.week_start = i.week_start; } }
  if (req.action === 'idea_mine') { ent.title = req.title; ent.channel = req.channel; }
  if (req.action === 'mail_config_set') { const c = (R.config || [])[0] || {}; ent.config = 'outreach_config'; ent.before = { daily_cap: c.daily_cap, window_start: c.window_start, window_end: c.window_end, followup_days: c.followup_days, funnel_min_sample: c.funnel_min_sample }; ent.after = req.set; }
  if (req.piece_id && req.action.startsWith('taller_')) { const p = (R.piece || [])[0]; ent.piece_id = req.piece_id; if (p) { ent.topic = p.topic; ent.channel = p.channel; ent.format = p.format; ent.taller_status = p.taller_status; } }
  else if (req.piece_id) { const p = (R.piece || [])[0]; ent.piece_id = req.piece_id; if (p) { ent.topic = p.topic; ent.channel = p.channel; ent.ghl_post_id = p.ghl_post_id; } }
  const type = req.action.split('_')[0];
  const params = { type, decision: req.action === 'pause_set' ? (req.paused ? 'paused' : 'resumed') : req.action === 'idea_decide' ? req.decision : req.action === 'idea_mine' ? 'mine' : req.action.startsWith('taller_') ? req.action.replace('taller_', '') : req.action === 'mail_config_set' ? 'config' : req.action === 'mail_outcome' ? req.outcome : req.action === 'email_save' && req.paste ? 'paste' : /approve/.test(req.action) ? 'approved' : /reject/.test(req.action) ? 'rejected' : req.action.replace(type + '_', ''), reason: req.reason || null, ...(req.subject ? { subject_len: req.subject.length, body_len: req.body.length } : {}) };
  return { request_id: req.request_id + (r.ok ? '' : '~' + Math.floor(nowMs / 1000).toString(36)), actor: 'Christian via /ops', tool: 'ops_' + req.action, level: /approve|autosend_set|pause_set|taller_schedule|mail_config_set/.test(req.action) ? 3 : 2, entity: ent, params,
    status: r.ok ? 'executed' : 'refused', result_summary: String(r.message || '').slice(0, 300), response: { ok: Boolean(r.ok), status: r.status || null, error: r.error || null, message: String(r.message || '').slice(0, 300) } };
}
