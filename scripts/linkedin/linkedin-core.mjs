/**
 * Atacama OS · canal LinkedIn (Bloque 3) — núcleo puro. Waalaxy es SOLO el ejecutor; GHL es la verdad comercial.
 *
 * Capacidad REAL de la API pública de Waalaxy (https://docs.waalaxy.com, verificada el 7-oct-2026): importar prospectos por URL de LinkedIn
 * a una lista y, opcionalmente, a una campaña (devuelve importCode / addToCampaignCode por prospecto), listar listas y campañas, y probar la conexión.
 * NO existen webhooks ni consultas de estado: Atacama OS no puede saber por API si la invitación se envió, si la aceptaron, si se mandó el mensaje
 * o si respondieron. Esos eventos entran por Hermes (`log_linkedin_event`, lo que Christian ve en Waalaxy/LinkedIn) y quedan en channel_state + GHL.
 *
 * Todas las funciones son autocontenidas y se incrustan tal cual (Function.prototype.toString) en el workflow n8n «26 LinkedIn Engine»:
 * sin imports, sin constantes de módulo. Devuelven { response, writes[], effects[], waalaxy? } y no tocan nada por sí mismas.
 */

export function liStrip(s) { return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, ''); }

/** URL canónica de un perfil PERSONAL de LinkedIn (https://www.linkedin.com/in/<slug>) o null. Rechaza páginas de empresa, Sales Navigator, enlaces cortos y otros dominios. */
export function normLinkedInUrl(u) {
  const raw = String(u == null ? '' : u).trim();
  if (!raw) return null;
  const m = raw.match(/^(?:https?:\/\/)?(?:[a-z]{2,3}\.|www\.)?linkedin\.com\/in\/([A-Za-z0-9%_\-.]{3,100})\/?(?:[?#].*)?$/i);
  if (!m) return null;
  const slug = m[1].replace(/\/+$/, '');
  if (/^(company|school|sales|pub|feed|jobs)$/i.test(slug)) return null;
  return 'https://www.linkedin.com/in/' + slug.toLowerCase();
}

/** Nombre de persona (no de «equipo» ni de buzón genérico): al menos nombre y apellido, sin palabras de área. */
export function isNamedPerson(name) {
  const n = String(name == null ? '' : name).replace(/\s+/g, ' ').trim();
  if (n.length < 5) return false;
  if (/no encontrad|desconocid|\bequipo\b|contacto|atenci[oó]n|soporte|ventas|comercial|administraci|servicio|capacitaci|info\b|\binc\b|ltda|\bspa\b/i.test(liStrip(n))) return false;
  const words = n.split(' ').filter((w) => /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ.'-]{2,}$/.test(w));
  return words.length >= 2;
}

/** Cargo utilizable: existe y no es una suposición del radar («NO ENCONTRADO», «inferencia», «probable»). */
export function isReliableRole(role) {
  const r = String(role == null ? '' : role).trim();
  return r.length >= 3 && !/no encontrad|inferencia|probable|posible|\?/i.test(r);
}

export function splitName(name) {
  const p = String(name || '').replace(/\s+/g, ' ').trim().split(' ');
  return { first: p[0] || '', last: p.slice(1).join(' ') };
}

/**
 * Qué canal conviene para un prospecto: email | linkedin | none (investigar más), con motivo y lo que falta.
 * Reglas (nunca se contacta por los dos canales a la vez):
 *  - LinkedIn listo = perfil personal verificable + persona con nombre y apellido + cargo confiable + evidencia pública de dónde salió.
 *  - Email listo = correo válido publicado por la empresa, sin supresión.
 *  - Si ambos: correo genérico (info@, contacto@…) y persona nombrada con LinkedIn → LinkedIn; correo personal publicado → email.
 */
export function recommendChannel(cand, ctx) {
  const c = (cand && cand.canonical && cand.canonical.contact) || (cand && cand.contact) || {};
  const sup = (ctx && ctx.suppressedEmails) || [];
  const email = String(c.email || '').trim().toLowerCase();
  const emailOk = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[a-z]{2,}$/i.test(email) && c.public !== false && !sup.includes(email);
  const generic = /^(info|contacto|contact|ventas|comercial|hola|hello|admin|administracion|reservas|atencion|soporte|cotizaciones|cotizacion|sales|mail|oficina|clientes|secretaria|recepcion)@/i.test(liStrip(email));
  const li = normLinkedInUrl(c.linkedin || c.linkedin_url);
  const named = isNamedPerson(c.name);
  const role = isReliableRole(c.role || c.job_title);
  const evid = Boolean(String(c.linkedin_source_url || '').trim());
  const liReady = Boolean(li) && named && role && evid;
  const missing = [];
  if (!li) missing.push('URL de LinkedIn de una persona');
  if (!named) missing.push('nombre y apellido de la persona');
  if (!role) missing.push('cargo confiable');
  if (li && !evid) missing.push('evidencia pública de dónde salió el perfil');
  const out = (channel, confidence, reason, extra) => ({ channel, confidence, reason, missing: extra || [], email_ready: emailOk, linkedin_ready: liReady, linkedin_url: li, person: named ? String(c.name).trim() : null, role: role ? String(c.role || c.job_title).trim() : null });
  if (cand && (cand.status === 'discarded')) return out('none', 'alta', 'El prospecto está descartado.');
  const last = cand && cand.last_contact_channel;
  if (last && ['email', 'linkedin'].includes(last)) return out(last, 'alta', 'Ya se contactó por ' + last + ': no se abre un segundo canal sin una decisión explícita.');
  if (liReady && (!emailOk || generic)) return out('linkedin', emailOk ? 'media' : 'alta', 'Hay una persona identificada (' + String(c.name).trim() + ', ' + String(c.role || c.job_title).trim() + ') con perfil de LinkedIn verificable' + (emailOk ? ' y el único correo público es genérico (' + email + '): una persona con nombre tiene más probabilidad de respuesta.' : ' y no hay correo público utilizable.'));
  if (emailOk) return out('email', generic ? 'media' : 'alta', generic ? 'Correo público de la empresa (' + email + ', genérico): es el único canal confiable hoy' + (missing.length ? '; para LinkedIn falta ' + missing.join(', ') + '.' : '.') : 'Correo publicado por la empresa y utilizable (' + email + ').');
  if (liReady) return out('linkedin', 'media', 'Sin correo utilizable; hay persona con perfil de LinkedIn verificable.');
  return out('none', 'baja', 'Sin canal confiable: investigar más (' + (missing.join(', ') || 'falta un contacto público') + ').', missing);
}

/** Busca un candidato por id, dominio, URL de LinkedIn o nombre (normalizado). Devuelve { cand } o { error, options }. */
export function findCandidate(cands, target) {
  const t = String(target == null ? '' : target).trim();
  if (!t) return { error: 'falta_target' };
  const norm = (s) => liStrip(String(s || '')).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const list = Array.isArray(cands) ? cands : [];
  let m = list.filter((c) => c.id === t);
  if (!m.length) { const li = normLinkedInUrl(t); if (li) m = list.filter((c) => normLinkedInUrl(((c.canonical || {}).contact || {}).linkedin) === li); }
  if (!m.length && /\./.test(t) && !/\s/.test(t)) { const d = t.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, ''); m = list.filter((c) => String(c.domain || '').toLowerCase() === d); }
  if (!m.length) { const n = norm(t); m = list.filter((c) => norm(c.company_name) === n); if (!m.length && n.length >= 3) m = list.filter((c) => norm(c.company_name).includes(n)); }
  if (m.length === 1) return { cand: m[0] };
  if (!m.length) return { error: 'sin_coincidencia' };
  return { error: 'ambiguo', options: m.slice(0, 6).map((c) => c.company_name) };
}

export function liState(cand) { const s = (cand && cand.channel_state) || {}; return s.linkedin || null; }

export function liLabel(state) { return ({ recomendado: 'Recomendado', aprobacion_pendiente: 'Pendiente de aprobación', en_lista: 'En lista (sin contactar)', en_campana: 'En campaña (conexión)', conexion: 'Conexión aceptada', mensaje: 'Mensaje enviado', followup: 'Follow-up enviado', respondio: 'Respondió', rechazo: 'Rechazó', detenido: 'Detenido', error: 'Error' })[state] || String(state || '—'); }

/** Vista compacta de un candidato para listados (Hermes, /ops). */
export function linkedinView(cand) {
  const st = (cand && cand.channel_state) || {};
  const rec = st.recommended || null;
  const li = st.linkedin || null;
  return { id: cand.id, company: cand.company_name, score: cand.priority_score, band: cand.band, recommended: rec ? rec.channel : null, reason: rec ? rec.reason : null, confidence: rec ? rec.confidence : null,
    approved_channel: st.approved_channel || null, state: li ? li.state : null, state_label: li ? liLabel(li.state) : null, person: li ? li.person : (rec ? rec.person : null), role: li ? li.role : (rec ? rec.role : null),
    url: li ? li.url : (rec ? rec.linkedin_url : null), list_id: li ? li.list_id : null, campaign_id: li ? li.campaign_id : null, last_event: li ? li.last_event : null, last_event_at: li ? li.last_event_at : null, next_action: li ? li.next_action : null,
    reply: li && li.reply ? li.reply : null, import_code: li ? li.import_code : null, campaign_code: li ? li.campaign_code : null };
}

/** Resumen del canal para el panel y los listados: conteos por estado + listos para LinkedIn + errores. */
export function linkedinOverview(cands, nowMs) {
  const list = Array.isArray(cands) ? cands : [];
  const counts = { pendiente: 0, en_lista: 0, en_campana: 0, conexion: 0, mensaje: 0, followup: 0, respondio: 0, rechazo: 0, error: 0 };
  const rows = [];
  let ready = 0;
  list.forEach((c) => {
    const v = linkedinView(c);
    const s = v.state;
    if (s === 'aprobacion_pendiente') counts.pendiente++;
    else if (counts[s] != null) counts[s]++;
    if (!s && v.recommended === 'linkedin') ready++;
    if (s || v.recommended === 'linkedin') rows.push(v);
  });
  rows.sort((a, b) => (Date.parse(b.last_event_at || 0) || 0) - (Date.parse(a.last_event_at || 0) || 0) || (b.score || 0) - (a.score || 0));
  return { counts, ready_for_linkedin: ready, rows: rows.slice(0, 12), total: rows.length };
}

export function liConfirmHash(parts) { let h = 0x811c9dc5; const s = parts.join('\u0001'); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, '0'); }

/** Guarda (o refresca) la recomendación de canal en channel_state. */
export function planRecommend(req, ctx) {
  const now = new Date(ctx.now).toISOString();
  const cand = ctx.candidate;
  if (!cand) return { response: { ok: false, status: 'error', error: 'sin_candidato', message: 'No encontré ese prospecto.' }, writes: [], effects: [] };
  const rec = recommendChannel(cand, { suppressedEmails: ctx.suppressedEmails });
  const st = cand.channel_state || {};
  const nextRec = { channel: rec.channel, confidence: rec.confidence, reason: rec.reason, missing: rec.missing, email_ready: rec.email_ready, linkedin_ready: rec.linkedin_ready, linkedin_url: rec.linkedin_url, person: rec.person, role: rec.role, at: now };
  const patch = { ...st, recommended: nextRec };
  return { response: { ok: true, status: 'recommended', company: cand.company_name, recommendation: nextRec, current_state: st.linkedin ? st.linkedin.state : null, message: 'Canal recomendado para ' + cand.company_name + ': ' + (rec.channel === 'none' ? 'ninguno todavía (investigar más)' : rec.channel) + '. ' + rec.reason },
    writes: [{ method: 'PATCH', path: 'prospect_candidates?id=eq.' + cand.id, body: { channel_state: patch, updated_at: now } }], effects: [] };
}

/**
 * Aprobación en dos pasos (igual que el correo): sin código → muestra el alta exacta y entrega un código; con código + palabras de Christian → importa a Waalaxy.
 * El alta es lo único que Atacama OS hace en Waalaxy: añade el prospecto a una lista y, solo en modo live con campaña configurada, a la campaña.
 */
export function planLinkedinApprove(req, ctx) {
  const nowMs = ctx.now, now = new Date(nowMs).toISOString();
  const cand = ctx.candidate, cfg = ctx.config || {};
  const fail = (error, message, status) => ({ response: { ok: false, status: status || 'error', error, message, executed: false, safety: { linkedin_invites_sent: 0 } }, writes: [], effects: [] });
  if (!cand) return fail('sin_candidato', 'No encontré ese prospecto.');
  if (cand.status === 'discarded') return fail('descartado', 'El prospecto está descartado.');
  const mode = cfg.linkedin_mode || 'off';
  const st = cand.channel_state || {};
  const prev = st.linkedin || null;
  if (prev && ['en_lista', 'en_campana', 'conexion', 'mensaje', 'followup', 'respondio'].includes(prev.state)) return fail('ya_en_linkedin', 'Ese prospecto ya está en LinkedIn (' + liLabel(prev.state) + '). No se vuelve a insertar.', 'already_done');
  if (ctx.emailActive) return fail('canal_email_activo', 'Ya hay un correo aprobado, en envío o enviado a este prospecto: no se contacta por LinkedIn al mismo tiempo (decisión explícita futura).', 'channel_conflict');
  const rec = recommendChannel(cand, { suppressedEmails: ctx.suppressedEmails });
  const c = (cand.canonical && cand.canonical.contact) || {};
  const url = normLinkedInUrl(c.linkedin || c.linkedin_url);
  if (!rec.linkedin_ready) return fail('linkedin_no_listo', 'Todavía no hay datos suficientes para LinkedIn: falta ' + (rec.missing.join(', ') || 'un perfil verificable') + '.', 'not_ready');
  const testMode = mode === 'test';
  const listId = testMode ? cfg.linkedin_test_list_id : cfg.linkedin_list_id;
  const campaignId = testMode ? null : (cfg.linkedin_campaign_id || null);
  if (testMode && !(cfg.linkedin_test_allowlist || []).includes(url)) return fail('fuera_de_allowlist', 'Modo test: solo se pueden insertar los perfiles de la lista blanca de prueba; este no está.', 'not_allowlisted');
  const person = String(c.name).trim(), role = String(c.role || c.job_title).trim();
  const body = { prospects: [{ url, customProfile: { ...(splitName(person).first ? { firstName: splitName(person).first } : {}), ...(splitName(person).last ? { lastName: splitName(person).last } : {}), occupation: role.slice(0, 120), company: { name: String(cand.company_name).slice(0, 120), ...(cand.website ? { website: cand.website } : {}) } }, customVariables: [{ label: 'Atacama_ref', value: String(cand.id) }] }],
    ...(listId ? { prospectListId: listId } : {}), ...(campaignId ? { campaignId } : {}), canCreateDuplicates: false, moveDuplicatesToOtherList: false, origin: { name: 'n8n' } };
  const hash = liConfirmHash([url, person, role, listId || '', campaignId || '', mode]);
  const summary = { company: cand.company_name, person, role, linkedin_url: url, list_id: listId || null, campaign_id: campaignId, mode, will_contact: Boolean(campaignId), what_happens: campaignId ? 'Se agrega a la lista y se inscribe en la campaña de Waalaxy: Waalaxy enviará la invitación de conexión según su configuración.' : 'Solo se agrega a la lista de Waalaxy (sin campaña): NO se envía ninguna invitación ni mensaje.' };
  const code = String(req.confirmation_code || '').trim();
  if (!code) {
    if (mode === 'off') return { response: { ok: false, status: 'mode_off', error: 'linkedin_apagado', executed: false, safety: { linkedin_invites_sent: 0 }, summary, message: 'LinkedIn está APAGADO (linkedin_mode=off): puedo mostrarte qué se haría, pero no se inserta nada hasta que Christian lo encienda.' }, writes: [], effects: [] };
    if (!listId) return fail('sin_lista', 'No hay lista de Waalaxy configurada para el modo ' + mode + '.', 'not_configured');
    const rnd = ctx.rnd || Math.random;
    const confirmCode = 'LI-' + (100000 + Math.floor(rnd() * 900000));
    const exp = new Date(nowMs + 30 * 60000).toISOString();
    const patch = { ...st, linkedin: { ...(prev || {}), url, person, role, state: 'aprobacion_pendiente', confirm: { code: confirmCode, hash, expires_at: exp }, last_event: 'aprobacion_solicitada', last_event_at: now, next_action: 'Christian confirma el alta en Waalaxy' } };
    return { response: { ok: false, status: 'confirmation_required', confirmation_code: confirmCode, expires_at: exp, executed: false, safety: { linkedin_invites_sent: 0 }, summary, message: 'Falta la confirmación de Christian. Muéstrale EXACTAMENTE este alta (persona, cargo, perfil, lista y campaña) y pídele que confirme. Si confirma, vuelve a llamar con confirmation_code y sus palabras en christian_order.' },
      writes: [{ method: 'PATCH', path: 'prospect_candidates?id=eq.' + cand.id, body: { channel_state: patch, updated_at: now } }], effects: [] };
  }
  const conf = prev && prev.confirm;
  if (!conf || conf.code !== code) return fail('codigo_invalido', 'El código no corresponde a este alta. Pide uno nuevo (llama sin código).', 'invalid_code');
  if (Date.parse(conf.expires_at) < nowMs) return fail('codigo_vencido', 'El código venció (30 min). Pide uno nuevo y confirma de nuevo.', 'expired_code');
  if (conf.hash !== hash) return fail('contenido_cambio', 'Los datos cambiaron después de emitir el código: Christian debe confirmar la versión actual.', 'content_changed');
  const order = String(req.order_text || '').trim();
  if (order.length < 4) return fail('falta_orden', 'Falta christian_order: las palabras exactas con las que Christian confirmó el alta.', 'needs_explicit_order');
  if (mode === 'off') return fail('linkedin_apagado', 'LinkedIn está APAGADO: no se inserta nada.', 'mode_off');
  if (mode === 'live' && Number(ctx.importedToday || 0) >= Number(cfg.linkedin_daily_cap || 0)) return fail('tope_diario', 'Se alcanzó el tope diario de altas a LinkedIn (' + cfg.linkedin_daily_cap + '). Mañana.', 'daily_cap');
  return { response: { ok: true, status: 'approved_pending_import', executed: false, safety: { linkedin_invites_sent: 0 }, summary, message: 'Aprobado: se inserta en Waalaxy ahora.' }, writes: [], effects: [],
    waalaxy: { body, order_text: order.slice(0, 400), by: req.by || 'Christian vía Hermes', url, person, role, list_id: listId, campaign_id: campaignId, mode } };
}

/** Aplica la respuesta de Waalaxy al estado del prospecto y decide qué escribir en Supabase y GHL. */
export function applyWaalaxyResult(cand, wx, res, nowMs) {
  const now = new Date(nowMs).toISOString();
  const st = cand.channel_state || {};
  const prev = st.linkedin || {};
  const httpOk = res && Number(res.statusCode || 200) < 300;
  const item = httpOk && res.body && Array.isArray(res.body.result) ? res.body.result[0] : null;
  const importCode = item ? item.importCode : null, campCode = item ? item.addToCampaignCode || null : null;
  const pid = item && item.prospect && item.prospect._id ? String(item.prospect._id) : null;
  const events = (prev.events || []).slice(-19);
  let state, ok = false, next, note, msg;
  if (!httpOk || !item) {
    const code = res && res.body && (res.body.code || res.body.title || res.body.message);
    const hint = ({ 'M000401-001': 'La cuenta de Waalaxy no tiene permisos para esta operación (¿plan?).', 'R000404-002': 'La lista de Waalaxy no existe.', 'R000401-003': 'La URL de LinkedIn no es válida para Waalaxy.', 'R000401-004': 'Se alcanzó el límite de prospectos de la lista o del CRM de Waalaxy.' })[code] || (res && res.statusCode === 429 ? 'Waalaxy limitó las llamadas (429): reintenta más tarde.' : 'Waalaxy no aceptó el alta.');
    state = 'error'; next = 'Revisar el error de Waalaxy y reintentar'; note = 'LINKEDIN · error al insertar en Waalaxy: ' + hint + ' (' + String(code || (res && res.statusCode) || 'sin respuesta').slice(0, 60) + ').'; msg = hint;
    events.push({ at: now, event: 'error_waalaxy', note: String(code || (res && res.statusCode) || '').slice(0, 80) });
  } else if (importCode === 'success' || importCode === 'duplicated_prospect' || importCode === 'prospect_successfully_moved_to_another_list') {
    ok = true;
    const inCamp = Boolean(wx.campaign_id) && (campCode === 'success' || campCode === 'already_in_campaign');
    state = inCamp ? 'en_campana' : 'en_lista';
    next = inCamp ? 'Waalaxy enviará la invitación; registrar «conexión aceptada» o «respondió» cuando ocurra' : 'En lista de Waalaxy sin campaña: no se contactó a nadie';
    note = 'LINKEDIN · ' + (inCamp ? 'alta en campaña de Waalaxy (la invitación de conexión la envía Waalaxy).' : 'agregado a la lista de Waalaxy SIN campaña (no se envió invitación ni mensaje).') + ' Persona: ' + wx.person + ' (' + wx.role + '). Resultado: ' + importCode + (campCode ? ' / campaña: ' + campCode : '') + '. Aprobado por ' + wx.by + '.';
    msg = (importCode === 'duplicated_prospect' ? 'Ya existía en Waalaxy (duplicado, no se creó otro). ' : 'Insertado en Waalaxy. ') + (inCamp ? 'Quedó en campaña.' : 'Quedó solo en la lista (sin campaña).');
    events.push({ at: now, event: inCamp ? 'alta_campana' : 'alta_lista', note: importCode + (campCode ? '/' + campCode : '') });
  } else {
    state = 'error'; next = 'Revisar el código de Waalaxy: ' + importCode; note = 'LINKEDIN · Waalaxy respondió «' + importCode + '»' + (item && item.message ? ': ' + String(item.message).slice(0, 120) : '') + '. No quedó en campaña.'; msg = 'Waalaxy respondió ' + importCode + '.';
    events.push({ at: now, event: 'import_' + importCode, note: String(item && item.message || '').slice(0, 80) });
  }
  const li = { ...prev, url: wx.url, person: wx.person, role: wx.role, state, list_id: wx.list_id, campaign_id: wx.campaign_id || null, waalaxy_prospect_id: pid || prev.waalaxy_prospect_id || null, import_code: importCode, campaign_code: campCode, mode_at_import: wx.mode,
    imported_at: ok ? now : prev.imported_at || null, last_event: events[events.length - 1].event, last_event_at: now, next_action: next, approved_by: wx.by, approved_at: now, confirm: null, events };
  const channel_state = { ...st, approved_channel: ok ? 'linkedin' : st.approved_channel || null, approved_at: ok ? now : st.approved_at || null, linkedin: li };
  const body = { channel_state, updated_at: now };
  const effects = [];
  if (state === 'en_campana' && wx.mode === 'live') { body.last_contact_channel = 'linkedin'; body.last_contact_at = now; effects.push({ type: 'gateway_act', act: { type: 'mark_contacted', channel: 'linkedin', note, follow_up_days: 5, at: now } }); }
  else if (state === 'en_campana') effects.push({ type: 'gateway_act', act: { type: 'mark_contacted', channel: 'linkedin', note: '[PRUEBA] ' + note, follow_up_days: 5, at: now } });
  else effects.push({ type: 'gateway_act', act: { type: 'add_note', note } });
  return { writes: [{ method: 'PATCH', path: 'prospect_candidates?id=eq.' + cand.id, body }], effects, state, ok, message: msg, import_code: importCode, campaign_code: campCode, waalaxy_prospect_id: pid };
}

/**
 * Eventos que Waalaxy NO reporta por API y que Christian ve en Waalaxy/LinkedIn: se registran a mano (vía Hermes).
 * event = conexion_aceptada | mensaje_enviado | followup_enviado | respondio | rechazo | detener | nota
 */
export function planLinkedinEvent(req, ctx) {
  const nowMs = ctx.now, now = new Date(nowMs).toISOString();
  const cand = ctx.candidate;
  const fail = (error, message) => ({ response: { ok: false, status: 'error', error, message }, writes: [], effects: [] });
  if (!cand) return fail('sin_candidato', 'No encontré ese prospecto.');
  const st = cand.channel_state || {};
  const prev = st.linkedin;
  if (!prev || !['en_lista', 'en_campana', 'conexion', 'mensaje', 'followup', 'respondio', 'rechazo', 'detenido', 'error'].includes(prev.state)) return fail('no_esta_en_linkedin', 'Ese prospecto no fue dado de alta en LinkedIn por Atacama OS.');
  const ev = String(req.event || '').toLowerCase();
  const map = { conexion_aceptada: ['conexion', 'Conexión aceptada'], mensaje_enviado: ['mensaje', 'Mensaje enviado por la secuencia'], followup_enviado: ['followup', 'Follow-up enviado por la secuencia'], respondio: ['respondio', 'Respondió'], rechazo: ['rechazo', 'Rechazó / no le interesa'], detener: ['detenido', 'Secuencia detenida'], nota: [prev.state, 'Nota'] };
  if (!map[ev]) return fail('evento_invalido', 'Evento inválido. Usa: ' + Object.keys(map).join(', ') + '.');
  const text = String(req.note || req.text || '').trim().slice(0, 600);
  if (ev === 'respondio' && text.length < 2) return fail('falta_texto', 'Para registrar una respuesta indica qué dijo la persona (note).');
  const order = ['en_lista', 'en_campana', 'conexion', 'mensaje', 'followup', 'respondio'];
  const newState = map[ev][0];
  if (['conexion', 'mensaje', 'followup'].includes(newState) && order.indexOf(prev.state) > order.indexOf(newState) && prev.state !== 'error') return fail('retroceso', 'El prospecto ya está en «' + liLabel(prev.state) + '»: no se retrocede de estado.');
  const events = (prev.events || []).slice(-19); events.push({ at: now, event: ev, note: text.slice(0, 120) });
  const li = { ...prev, state: newState, last_event: ev, last_event_at: now, events,
    next_action: newState === 'respondio' ? 'Revisar la respuesta y decidir el siguiente paso (Diagnóstico)' : newState === 'rechazo' || newState === 'detenido' ? 'Ninguna: no volver a contactar por LinkedIn' : newState === 'conexion' ? 'Esperar el mensaje de la secuencia' : newState === 'mensaje' ? 'Esperar respuesta / follow-up de la secuencia' : newState === 'followup' ? 'Esperar respuesta; la secuencia termina sola' : prev.next_action,
    ...(newState === 'respondio' ? { reply: { text, at: now } } : {}), ...(ev === 'nota' ? { state: prev.state } : {}) };
  const body = { channel_state: { ...st, linkedin: li }, updated_at: now };
  const effects = [];
  const co = cand.company_name;
  if (newState === 'respondio') { body.status = 'contacted'; body.ghl_stage = 'respondio'; body.last_contact_channel = 'linkedin'; body.last_contact_at = now; body.next_action_at = null; effects.push({ type: 'gateway_act', act: { type: 'move_stage', stage: 'respondio', note: 'RESPUESTA por LinkedIn de ' + co + ' (' + (prev.person || '') + '): «' + text.slice(0, 500) + '». Se detienen los seguimientos de correo y de LinkedIn.' } }); }
  else if (newState === 'rechazo') { body.next_action_at = null; effects.push({ type: 'gateway_act', act: { type: 'move_stage', stage: 'respondio', note: 'RESPUESTA NEGATIVA por LinkedIn de ' + co + ': «' + text.slice(0, 300) + '». Seguimientos detenidos; decide si pasar a Perdida.' } }); }
  else if (newState === 'detenido') { body.next_action_at = null; effects.push({ type: 'gateway_act', act: { type: 'add_note', note: 'LINKEDIN · secuencia detenida. ' + text } }); }
  else effects.push({ type: 'gateway_act', act: { type: 'add_note', note: 'LINKEDIN · ' + map[ev][1] + (text ? ': ' + text : '') + '.' } });
  const stop = ['respondio', 'rechazo', 'detenido'].includes(newState);
  return { response: { ok: true, status: 'event_logged', company: co, state: li.state, state_label: liLabel(li.state), stop_followups: stop, message: 'Registrado en ' + co + ': ' + map[ev][1] + '.' + (stop ? ' Se detienen los seguimientos.' : '') }, writes: [{ method: 'PATCH', path: 'prospect_candidates?id=eq.' + cand.id, body }], effects, stop_email_followups: stop };
}
