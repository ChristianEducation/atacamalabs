/**
 * Atacama OS · Hermes Operator — núcleo (funciones puras, AUTOCONTENIDAS: se incrustan tal cual en el workflow n8n «20 Hermes Operator»).
 *
 * Hermes (el agente conversacional que Christian ya usa por Telegram) opera Atacama OS SOLO a través de estas herramientas controladas.
 * Nunca recibe el token de GHL: cada herramienta pasa por n8n, que aplica la política de permisos, llama al Prospect Gateway (workflow 19) o
 * lee GHL de forma acotada, y deja una fila de auditoría (actor, herramienta, entidad, resultado, request_id).
 *
 * Niveles de permiso:
 *   1 — se ejecuta directo (leer, analizar, importar, notas, contacto manual, tareas, mover oportunidades, preparar borradores).
 *   2 — exige una ORDEN EXPLÍCITA de Christian citada literalmente en `order_text` (FORCE_IMPORT, descartar).
 *   3 — exige CONFIRMACIÓN explícita antes de ejecutar (enviar email/WhatsApp, publicar, eliminar). En esta versión NO se ejecutan nunca.
 */

export function operatorTools() {
  const L1 = 1, L2 = 2, L3 = 3;
  return {
    analyze_prospects: { level: L1, kind: 'gateway', summary: 'Analiza prospectos de un archivo/lista/URLs (solo lectura) y deja el análisis numerado.' },
    import_prospects: { level: L1, kind: 'gateway', summary: 'Mete a Supabase/GHL (Investigado) los prospectos que valen la pena de un análisis o lista.' },
    get_analysis: { level: L1, kind: 'local', summary: 'Muestra el último análisis numerado.' },
    get_prospect: { level: L1, kind: 'local', summary: 'Ficha de un prospecto (estado, score, GHL, borradores).' },
    list_prospects: { level: L1, kind: 'local', summary: 'Lista prospectos guardados con filtros.' },
    list_pending_prospects: { level: L1, kind: 'local', summary: 'Prospectos pendientes de contactar.' },
    prepare_outreach: { level: L1, kind: 'gateway', summary: 'Prepara borradores de email y WhatsApp (NO los envía).' },
    log_manual_contact: { level: L1, kind: 'gateway', summary: 'Registra un contacto hecho fuera de Atacama OS (Instagram, WhatsApp, teléfono…).' },
    add_note: { level: L1, kind: 'gateway', summary: 'Agrega una nota al contacto en GHL.' },
    move_opportunity: { level: L1, kind: 'gateway', summary: 'Mueve la oportunidad a otra etapa del pipeline.' },
    create_followup: { level: L1, kind: 'gateway', summary: 'Crea una tarea de seguimiento.' },
    get_open_opportunities: { level: L1, kind: 'ghl', summary: 'Oportunidades abiertas en GHL (opcionalmente por etapa).' },
    get_tasks: { level: L1, kind: 'ghl', summary: 'Tareas pendientes en GHL.' },
    force_import_prospect: { level: L2, kind: 'gateway', summary: 'FORCE_IMPORT: mete un prospecto aunque su score sea bajo (orden explícita de Christian).' },
    discard_prospect: { level: L2, kind: 'gateway', summary: 'Descarta un prospecto (orden explícita de Christian).' },
    save_draft: { level: L1, kind: 'engine', summary: 'Crea o edita el borrador de correo de un prospecto (no lo envía). Parte del borrador del Gateway.' },
    get_draft: { level: L1, kind: 'engine', summary: 'Muestra los correos pendientes, el historial y las respuestas de un prospecto.' },
    approve_outreach: { level: L3, kind: 'engine', summary: 'Aprueba el envío de un borrador: primero devuelve el correo exacto y un código; con el código y la confirmación de Christian queda aprobado y sale en la próxima ventana.' },
    cancel_outreach: { level: L1, kind: 'engine', summary: 'Cancela un correo pendiente (borrador o aprobado, antes de salir).' },
    get_followups: { level: L1, kind: 'engine', summary: 'Estado del seguimiento (+3 / +7 días hábiles) de los prospectos con primer correo enviado; filter=due muestra lo pendiente.' },
    list_outreach: { level: L1, kind: 'engine', summary: 'Lista correos (borradores, aprobados, enviados, fallidos).' },
    get_replies: { level: L1, kind: 'engine', summary: 'Respuestas recibidas por correo (todas o de un prospecto) con su clasificación.' },
    do_not_contact: { level: L2, kind: 'gateway', summary: 'Marca al prospecto como NO contactar (descarta y suprime sus correos). Orden explícita de Christian.' },
    send_email: { level: L3, kind: 'blocked', summary: 'Envío directo — deshabilitado: usa save_draft + approve_outreach.' },
    send_whatsapp: { level: L3, kind: 'blocked', summary: 'Enviar WhatsApp — requiere confirmación; NO habilitado.' },
    publish_content: { level: L3, kind: 'blocked', summary: 'Publicar contenido — requiere confirmación; NO habilitado desde Hermes.' },
    delete_record: { level: L3, kind: 'blocked', summary: 'Eliminar registros — requiere confirmación; NO habilitado.' },
  };
}

export function stripAcc(s) { return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, ''); }

/** Etapas del pipeline por nombre (con o sin tilde). */
export function normStage(s) {
  const t = stripAcc(s).toLowerCase().trim();
  const map = { nuevo: 'nuevo', new: 'nuevo', investigado: 'investigado', investigando: 'investigado', contactado: 'contactado', respondio: 'respondio', respondido: 'respondio', 'respondio el cliente': 'respondio', diagnostico: 'diagnostico', propuesta: 'propuesta', seguimiento: 'seguimiento' };
  return map[t] || null;
}

/** «27», «Rentalin», «rentalin.cl», «ana@x.cl», UUID → { kind, value }. */
export function parseTarget(t) {
  if (t == null || t === '') return null;
  if (typeof t === 'number') return { kind: 'number', value: Math.trunc(t) };
  if (typeof t === 'object') { if (t.number != null) return { kind: 'number', value: Math.trunc(Number(t.number)) }; return parseTarget(t.id || t.email || t.website || t.domain || t.company_name || t.name || ''); }
  const s = String(t).trim();
  if (/^#?\d{1,4}$/.test(s)) return { kind: 'number', value: Number(s.replace('#', '')) };
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) return { kind: 'id', value: s.toLowerCase() };
  if (/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(s)) return { kind: 'email', value: s.toLowerCase() };
  const dm = s.match(/^(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+(?:\.[a-z0-9-]+)+)(?:[\/?#].*)?$/i);
  if (dm && !/\s/.test(s)) return { kind: 'domain', value: dm[1].toLowerCase() };
  return { kind: 'name', value: s };
}

/** Valida y normaliza la solicitud + aplica la política de permisos. NO ejecuta nada. */
export function parseRequest(body, nowMs) {
  const tools = operatorTools();
  const b = body && typeof body === 'object' ? body : {};
  const tool = String(b.tool || '').trim().toLowerCase();
  const rid = String(b.request_id || '').trim();
  if (!tools[tool]) return { ok: false, error: 'tool_desconocida: "' + tool + '"', tools: Object.keys(tools) };
  if (!/^[A-Za-z0-9._:-]{4,80}$/.test(rid)) return { ok: false, error: 'request_id obligatorio (4-80 caracteres: letras, números . _ : -): garantiza la idempotencia y la auditoría.' };
  const def = tools[tool];
  const params = b.params && typeof b.params === 'object' && !Array.isArray(b.params) ? b.params : {};
  const req = { ok: true, tool, level: def.level, kind: def.kind, request_id: rid, actor: 'Christian vía Hermes', params, order_text: String(b.order_text || '').trim(), confirmation_code: String(b.confirmation_code || '').trim(), now: nowMs };
  if (def.level === 2) {
    const needs = { force_import_prospect: /(mete|met[eé]la|metelo|importa|import[aá]la|fuerza|force|igual|aunque|de todos modos|agr[eé]ga)/i, discard_prospect: /(descart|elimin|no me interesa|saca|quita|borra|ya no)/i, do_not_contact: /(no (le |les )?(escrib|contact|molest)|nunca m[aá]s|no contactar|do not contact|baja|bloque|descart)/i }[tool];
    const reason = String(params.reason || '').trim();
    if (req.order_text.length < 8 || (needs && !needs.test(req.order_text))) return { ...req, ok: true, refusal: { status: 'needs_explicit_order', message: 'Esta acción es de nivel 2: necesito una orden explícita de Christian. Pídesela (por ejemplo: «mete la empresa 27 aunque tenga score bajo») y vuelve a llamar con order_text = sus palabras exactas.' } };
    if (reason.length < 5) return { ...req, ok: true, refusal: { status: 'needs_reason', message: 'Falta el motivo (reason, mínimo 5 caracteres): queda registrado en Supabase, en GHL y en la auditoría.' } };
  }
  if (def.level === 3 && def.kind === 'blocked') {
    const code = 'CONF-' + (Math.abs(hash32(rid + tool)) % 900000 + 100000);
    if (!req.confirmation_code) return { ...req, ok: true, refusal: { status: 'confirmation_required', confirmation_code: code, message: 'Acción de nivel 3 (' + tool + '): NO se ejecuta sin confirmación explícita de Christian. Muéstrale exactamente qué se haría (destinatario y texto) y pídele que confirme. Aun con confirmación, en esta versión el envío NO está habilitado (se activa en el bloque Gmail).' } };
    return { ...req, ok: true, refusal: { status: 'not_enabled', message: tool + ' está deshabilitado en esta versión: no se envió ni publicó nada. Se habilita en el bloque Gmail con confirmación por mensaje.', confirmation_received: true } };
  }
  return req;
}

/** Solo las ejecuciones exitosas ocupan el request_id (idempotencia); rechazos y errores se auditan aparte y permiten reintentar con el mismo id. */
export function auditId(req, status) { return status === 'executed' ? req.request_id : req.request_id + '~' + String(status).slice(0, 8) + '~' + req.now; }

export function hash32(x) { let h = 0x811c9dc5; for (let i = 0; i < x.length; i++) { h ^= x.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h; }

/** URLs de lectura en Supabase que necesita la herramienta (candidatos y último análisis). */
export function resolveQueries(req, sbUrl) {
  const p = req.params || {};
  const sel = 'select=id,candidate_key,company_name,domain,website,industry,location,status,band,priority_score,fit_score,signal_score,reachability_score,ghl_contact_id,ghl_opportunity_id,ghl_stage,last_contact_channel,last_contact_at,next_action_at,manual_override,manual_override_reason,canonical,drafts,source_name,updated_at';
  const base = sbUrl + '/rest/v1/prospect_candidates?' + sel;
  const enc = encodeURIComponent;
  const q = { rows_url: null, analysis_url: null };
  const needsTarget = ['save_draft', 'get_draft', 'approve_outreach', 'cancel_outreach', 'do_not_contact', 'get_replies', 'get_prospect', 'prepare_outreach', 'log_manual_contact', 'add_note', 'move_opportunity', 'create_followup', 'force_import_prospect', 'discard_prospect'].includes(req.tool);
  if (needsTarget) {
    const t = parseTarget(p.target != null ? p.target : p.number);
    if (t && t.kind !== 'number') {
      const f = t.kind === 'id' ? 'id=eq.' + t.value : t.kind === 'domain' ? 'domain=eq.' + enc(t.value) : t.kind === 'email' ? 'candidate_keys=cs.' + enc('{e:' + t.value + '}') : 'company_name=ilike.' + enc('*' + t.value.replace(/[*%]/g, '') + '*');
      q.rows_url = base + '&' + f + '&limit=6';
    }
    q.analysis_url = sbUrl + '/rest/v1/operator_analysis_cache?select=id,request_id,source,candidates,results,created_at&order=created_at.desc&limit=1';
  }
  if (req.tool === 'list_prospects') {
    const limit = Math.min(Math.max(parseInt(p.limit, 10) || 20, 1), 50);
    const f = [];
    if (p.status && /^(accepted|in_ghl|contacted|archived|discarded)$/.test(p.status)) f.push('status=eq.' + p.status);
    if (p.band && /^(alta|valida|pendiente|archivo)$/.test(stripAcc(p.band).toLowerCase())) f.push('band=eq.' + stripAcc(p.band).toLowerCase());
    if (Number.isFinite(Number(p.min_score))) f.push('priority_score=gte.' + Math.max(0, Math.min(100, Math.trunc(Number(p.min_score)))));
    if (p.source) f.push('source_name=ilike.' + enc('*' + String(p.source).replace(/[*%]/g, '') + '*'));
    q.rows_url = base + (f.length ? '&' + f.join('&') : '') + '&order=priority_score.desc&limit=' + limit;
  }
  if (req.tool === 'list_pending_prospects') {
    const limit = Math.min(Math.max(parseInt(p.limit, 10) || 25, 1), 50);
    const scope = String(p.scope || 'ghl').toLowerCase();
    const f = scope === 'supabase' ? 'status=eq.accepted&band=in.(alta,valida)' : scope === 'both' ? 'or=(status.eq.in_ghl,and(status.eq.accepted,band.in.(alta,valida)))' : 'status=eq.in_ghl';
    q.rows_url = base + '&' + f + '&order=priority_score.desc&limit=' + limit;
  }
  if (['get_analysis', 'import_prospects'].includes(req.tool)) {
    const from = p.from_analysis && p.from_analysis !== 'last' ? 'request_id=eq.' + enc(String(p.from_analysis)) + '&' : '';
    q.analysis_url = sbUrl + '/rest/v1/operator_analysis_cache?' + from + 'select=id,request_id,source,candidates,results,created_at&order=created_at.desc&limit=1';
  }
  return q;
}

export function matchCand(c, t) {
  const n = (x) => stripAcc(String(x || '')).toLowerCase();
  if (t.kind === 'domain') return n(c.website).includes(t.value) || (c.contact && n(c.contact.email).endsWith('@' + t.value));
  if (t.kind === 'email') return n(c.contact && c.contact.email) === t.value;
  return n(c.company_name).includes(n(t.value));
}

/** Resuelve «a qué prospecto me refiero»: fila de Supabase, o candidato del último análisis (por número o nombre). */
export function pickTarget(params, rows, analysis) {
  const t = parseTarget(params.target != null ? params.target : params.number);
  if (!t) return { error: 'falta_target', message: 'Indica a qué prospecto te refieres (nombre, dominio, correo o el número del último análisis).' };
  const list = Array.isArray(rows) ? rows : [];
  const cands = analysis && Array.isArray(analysis.candidates) ? analysis.candidates : [];
  const results = analysis && Array.isArray(analysis.results) ? analysis.results : [];
  if (t.kind === 'number') {
    const c = cands[t.value - 1];
    if (!c) return { error: 'numero_fuera_de_rango', message: 'No existe el número ' + t.value + ' en el último análisis' + (cands.length ? ' (hay ' + cands.length + ').' : ' (no hay análisis guardado).') };
    return { candidate: c, row: null, source: 'analysis', number: t.value, brief: results[t.value - 1] || null, analysis_id: analysis.id };
  }
  if (list.length === 1) return { candidate: list[0].canonical && list[0].canonical.company_name ? list[0].canonical : { company_name: list[0].company_name, website: list[0].website }, row: list[0], source: 'supabase' };
  if (list.length > 1) return { error: 'ambiguo', message: 'Hay varios prospectos que coinciden: ' + list.slice(0, 5).map((r) => r.company_name).join(', ') + '. Dime cuál (nombre exacto o dominio).', options: list.slice(0, 5).map((r) => r.company_name) };
  const hit = cands.map((c, i) => ({ c, i })).filter((x) => matchCand(x.c, t));
  if (hit.length === 1) return { candidate: hit[0].c, row: null, source: 'analysis', number: hit[0].i + 1, brief: results[hit[0].i] || null, analysis_id: analysis.id };
  if (hit.length > 1) return { error: 'ambiguo', message: 'Varias empresas del último análisis coinciden: ' + hit.slice(0, 5).map((x) => '#' + (x.i + 1) + ' ' + x.c.company_name).join(', ') + '. Dime el número.', options: hit.slice(0, 5).map((x) => '#' + (x.i + 1) + ' ' + x.c.company_name) };
  return { error: 'no_encontrado', message: 'No encontré «' + (t.value) + '» ni en los prospectos guardados ni en el último análisis. Puedes pasarme el archivo o la URL para analizarlo.' };
}

export function stageNames() { return { nuevo: 'Nuevo', investigado: 'Investigado', contactado: 'Contactado', respondio: 'Respondió', diagnostico: 'Diagnóstico', propuesta: 'Propuesta', seguimiento: 'Seguimiento' }; }

/** Entradas de archivo/lista para el Gateway (sin interpretar nada: el Gateway parsea HTML/CSV/texto/JSON/URLs). */
export function inputsFromParams(p) {
  const b = {};
  const type = String(p.file_type || '').toLowerCase();
  const content = typeof p.file_content === 'string' ? p.file_content : '';
  if (content) {
    if (type === 'html' || /^\s*<(!doctype|html|article|div|section)/i.test(content)) b.html = content;
    else if (type === 'csv') b.csv = content;
    else if (type === 'json') { try { const j = JSON.parse(content); b.prospects = Array.isArray(j) ? j : (Array.isArray(j.prospects) ? j.prospects : [j]); } catch (e) { b.text = content; } }
    else b.text = content;
  }
  if (typeof p.html === 'string') b.html = (b.html || '') + p.html;
  if (typeof p.csv === 'string') b.csv = p.csv;
  if (typeof p.text === 'string') b.text = (b.text || '') + p.text;
  if (Array.isArray(p.prospects)) b.prospects = (b.prospects || []).concat(p.prospects);
  if (Array.isArray(p.urls)) b.urls = p.urls.map(String).filter((u) => /^https?:\/\//.test(u)).slice(0, 15);
  else if (typeof p.url === 'string' && /^https?:\/\//.test(p.url)) b.urls = [p.url];
  return b;
}

export function sourceOf(req) { return { type: 'hermes-operator', name: String((req.params && req.params.source_name) || 'Hermes (Christian)').slice(0, 80), reference: req.request_id }; }

/** Qué llamar: Gateway (workflow 19), lectura de GHL, o nada (respuesta local). Devuelve también la entidad auditada. */
export function buildCalls(req, rows, analysis, cfg) {
  const p = req.params || {};
  const gid = 'op-' + req.request_id.slice(0, 70);
  const out = { kind: req.kind, gateway_body: null, engine_body: null, ghl_call: null, entity: {}, error: null, local: null };
  const needTarget = () => { const r = pickTarget(p, rows, analysis); if (r.error) { out.error = { status: r.error === 'ambiguo' ? 'ambiguous' : 'not_found', code: r.error, message: r.message, options: r.options || null }; return null; } out.entity = { type: 'prospect', name: r.candidate.company_name, number: r.number || null, source: r.source, candidate_key: r.row ? r.row.candidate_key : null, ghl_contact_id: r.row ? r.row.ghl_contact_id : null, ghl_opportunity_id: r.row ? r.row.ghl_opportunity_id : null }; return r; };
  const t = req.tool;
  if (t === 'analyze_prospects') {
    const inp = inputsFromParams(p);
    if (!Object.keys(inp).length) { out.error = { status: 'error', code: 'sin_entrada', message: 'Pásame un archivo (file_path), una lista o URLs.' }; return out; }
    out.gateway_body = { action: 'analyze', source: sourceOf(req), options: { include_candidates: true, validate: p.validate === 'light' ? 'light' : 'none' }, ...inp };
    out.entity = { type: 'batch', source: sourceOf(req).name };
  } else if (t === 'import_prospects') {
    let prospects = null;
    if (p.from_analysis || p.numbers || p.select) {
      if (!analysis || !Array.isArray(analysis.candidates) || !analysis.candidates.length) { out.error = { status: 'not_found', code: 'sin_analisis', message: 'No hay un análisis guardado. Primero analiza el archivo (analyze_prospects).' }; return out; }
      const res = analysis.results || [];
      const numbers = Array.isArray(p.numbers) ? p.numbers.map((n) => Math.trunc(Number(n))).filter((n) => n >= 1 && n <= analysis.candidates.length) : null;
      const select = String(p.select || (numbers && numbers.length ? 'numbers' : 'eligible')).toLowerCase();
      prospects = analysis.candidates.filter((c, i) => (numbers && numbers.length ? numbers.includes(i + 1) : select === 'all' ? true : (res[i] && res[i].decision === 'create_in_ghl')));
      if (!prospects.length) { out.error = { status: 'not_found', code: 'nada_que_importar', message: 'Ningún prospecto cumple la selección (' + select + ').' }; return out; }
      if (prospects.length > 25) { out.error = { status: 'error', code: 'lote_grande', message: 'Son ' + prospects.length + ' prospectos: máximo 25 por solicitud. Indica numbers (hasta 25) o importa en tandas.' }; return out; }
      out.gateway_body = { action: 'import', source: sourceOf(req), prospects, options: { by: req.actor, enrich: p.enrich === true } };
    } else {
      const inp = inputsFromParams(p);
      if (!Object.keys(inp).length) { out.error = { status: 'error', code: 'sin_entrada', message: 'Indica from_analysis (el último análisis) o pásame un archivo/lista/URLs.' }; return out; }
      out.gateway_body = { action: 'import', source: sourceOf(req), options: { by: req.actor, enrich: p.enrich === true }, ...inp };
    }
    out.entity = { type: 'batch', count: out.gateway_body.prospects ? out.gateway_body.prospects.length : null, source: sourceOf(req).name };
  } else if (t === 'force_import_prospect') {
    const r = needTarget(); if (!r) return out;
    out.gateway_body = { action: 'import', source: sourceOf(req), prospects: [r.candidate], options: { force_import: true, manual_override_reason: String(p.reason).slice(0, 300), by: req.actor } };
  } else if (t === 'prepare_outreach') {
    const r = needTarget(); if (!r) return out;
    out.gateway_body = { action: 'prepare', source: sourceOf(req), prospects: [r.candidate], options: { by: req.actor } };
  } else if (['log_manual_contact', 'add_note', 'move_opportunity', 'create_followup', 'discard_prospect'].includes(t)) {
    const r = needTarget(); if (!r) return out;
    let act;
    if (t === 'log_manual_contact') {
      const ch = stripAcc(String(p.channel || 'otro')).toLowerCase();
      const type = ch === 'instagram' ? 'log_instagram' : ch === 'whatsapp' ? 'log_whatsapp' : /^(telefono|llamada|phone|call)$/.test(ch) ? 'log_phone' : 'mark_contacted';
      const outcome = p.outcome ? '[resultado: ' + String(p.outcome).slice(0, 120) + '] ' : '';
      act = { type, channel: ch === 'email' || ch === 'correo' ? 'email' : ch, note: (outcome + String(p.note || '')).trim() || undefined, at: p.at, follow_up_days: p.follow_up_days != null ? Number(p.follow_up_days) : undefined };
    } else if (t === 'add_note') {
      if (!String(p.note || '').trim()) { out.error = { status: 'error', code: 'falta_nota', message: 'Falta el texto de la nota.' }; return out; }
      act = { type: 'add_note', note: String(p.note) };
    } else if (t === 'move_opportunity') {
      const st = normStage(p.stage);
      if (!st) { out.error = { status: 'error', code: 'etapa_desconocida', message: 'Etapa no válida. Usa: Nuevo, Investigado, Contactado, Respondió, Diagnóstico, Propuesta o Seguimiento.' }; return out; }
      act = { type: 'move_stage', stage: st, note: p.note ? String(p.note) : undefined };
    } else if (t === 'create_followup') {
      act = { type: 'follow_up', title: p.title ? String(p.title) : undefined, note: p.note ? String(p.note) : undefined, days: p.days != null ? Number(p.days) : undefined, due_at: p.due_at ? String(p.due_at) : undefined };
      if (p.due_at && !Number.isFinite(Date.parse(p.due_at))) { out.error = { status: 'error', code: 'fecha_invalida', message: 'due_at debe ser una fecha ISO (AAAA-MM-DD).' }; return out; }
    } else {
      act = { type: 'discard', reason: String(p.reason).slice(0, 300), mark_lost: p.mark_lost === true };
    }
    Object.keys(act).forEach((k) => act[k] === undefined && delete act[k]);
    out.gateway_body = { action: 'act', source: sourceOf(req), act, targets: [r.candidate], options: { by: req.actor } };
  } else if (['save_draft', 'get_draft', 'approve_outreach', 'cancel_outreach', 'do_not_contact'].includes(t) || (t === 'get_replies' && (p.target != null || p.number != null)) || t === 'list_outreach' || t === 'get_replies' || t === 'get_followups') {
    const hasTarget = !['list_outreach', 'get_followups'].includes(t) && !(t === 'get_replies' && p.target == null && p.number == null);
    let r = null;
    if (hasTarget) {
      r = needTarget(); if (!r) return out;
      if (!r.row || !r.row.id) { out.error = { status: 'not_found', code: 'no_guardado', message: '«' + r.candidate.company_name + '» todavía no está guardado en Atacama OS (solo está en el análisis): impórtalo primero con import_prospects.' }; return out; }
    }
    const eb = { candidate_id: r ? r.row.id : undefined, by: req.actor };
    if (t === 'save_draft') Object.assign(eb, { action: 'draft', kind: p.kind || 'initial', subject: p.subject, body: p.body, to_email: p.to_email, override_to: p.override_to === true });
    else if (t === 'get_draft') eb.action = 'get';
    else if (t === 'approve_outreach') Object.assign(eb, { action: 'approve', kind: p.kind, confirmation_code: req.confirmation_code || p.confirmation_code, order_text: req.order_text });
    else if (t === 'cancel_outreach') Object.assign(eb, { action: 'cancel', kind: p.kind });
    else if (t === 'list_outreach') Object.assign(eb, { action: 'list', filter: p.filter, limit: p.limit });
    else if (t === 'get_replies') Object.assign(eb, { action: 'replies', limit: p.limit });
    else if (t === 'get_followups') Object.assign(eb, { action: 'followups', filter: p.filter });
    else if (t === 'do_not_contact') {
      Object.assign(eb, { action: 'suppress', reason: String(p.reason).slice(0, 300), order_text: req.order_text });
      out.gateway_body = { action: 'act', source: sourceOf(req), act: { type: 'discard', reason: 'NO CONTACTAR: ' + String(p.reason).slice(0, 280) }, targets: [r.candidate], options: { by: req.actor } };
    }
    Object.keys(eb).forEach((k) => (eb[k] === undefined || eb[k] === null) && delete eb[k]);
    out.engine_body = eb;
    out.entity = r ? { type: 'prospect', name: r.candidate.company_name, candidate_id: r.row.id, ghl_contact_id: r.row.ghl_contact_id, ghl_opportunity_id: r.row.ghl_opportunity_id } : { type: 'outreach' };
  } else if (t === 'get_open_opportunities') {
    const lim = Math.min(Math.max(parseInt(p.limit, 10) || 30, 1), 100);
    const st = p.stage ? normStage(p.stage) : null;
    if (p.stage && !st) { out.error = { status: 'error', code: 'etapa_desconocida', message: 'Etapa no válida.' }; return out; }
    out.ghl_call = { method: 'GET', url: 'https://services.leadconnectorhq.com/opportunities/search?location_id=' + cfg.locationId + '&pipeline_id=' + cfg.pipelineId + '&status=open&limit=' + lim + (st ? '&pipeline_stage_id=' + cfg.stages[st] : ''), body: null };
    out.entity = { type: 'opportunities', stage: st };
  } else if (t === 'get_tasks') {
    const lim = Math.min(Math.max(parseInt(p.limit, 10) || 30, 1), 100);
    out.ghl_call = { method: 'POST', url: 'https://services.leadconnectorhq.com/locations/' + cfg.locationId + '/tasks/search', body: { completed: p.include_completed === true ? undefined : false, limit: lim } };
    out.entity = { type: 'tasks' };
  } else if (t === 'get_prospect') {
    const r = needTarget(); if (!r) return out;
    out.local = { target: r };
  } else if (['list_prospects', 'list_pending_prospects', 'get_analysis'].includes(t)) {
    out.entity = { type: t === 'get_analysis' ? 'analysis' : 'list' };
    out.local = {};
  }
  return out;
}

export function short(s, n) { const x = String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); return x.length > n ? x.slice(0, n - 1) + '…' : x; }
export function rowBrief(r) { return ({ company: r.company_name, status: r.status, band: r.band, score: r.priority_score, stage: r.ghl_stage || null, in_ghl: Boolean(r.ghl_opportunity_id), last_contact: r.last_contact_channel ? r.last_contact_channel + (r.last_contact_at ? ' · ' + String(r.last_contact_at).slice(0, 10) : '') : null, next_action: r.next_action_at ? String(r.next_action_at).slice(0, 10) : null, source: r.source_name || null, website: r.website || null }); }
export function stageOf(id, cfg) { const k = Object.keys(cfg.stages).find((x) => cfg.stages[x] === id); return k ? stageNames()[k] : null; }

/** Da forma a la respuesta (mensaje corto para el chat + datos), la fila de auditoría y, si corresponde, el caché del análisis. */
export function shapeResponse(req, calls, gw, ghl, rows, analysis, cfg, eng) {
  const now = new Date(req.now).toISOString();
  const base = { ok: true, tool: req.tool, level: req.level, request_id: req.request_id, actor: req.actor, replayed: false, at: now };
  const audit = (status, summary, resp, entity) => ({ request_id: auditId(req, status), actor: req.actor, tool: req.tool, level: req.level, entity: entity || calls.entity || {}, params: sanitize(req.params), status, result_summary: short(summary, 400), response: resp, created_at: now });
  if (calls.error) { const resp = { ...base, ok: false, status: calls.error.status, error: calls.error.code, message: calls.error.message, options: calls.error.options || undefined }; return { response: resp, audit_row: audit(calls.error.status, calls.error.message, resp), cache_row: null }; }
  let message = '', data = {}, status = 'executed', cache = null, entity = calls.entity;
  const g = gw && typeof gw === 'object' ? gw : null;
  if (calls.gateway_body && (!g || g.ok === false)) {
    const msg = g && g.error ? g.error : 'El Gateway no respondió.';
    const resp = { ...base, ok: false, status: 'error', error: 'gateway', message: 'No se pudo ejecutar: ' + msg };
    return { response: resp, audit_row: audit('error', msg, resp), cache_row: null };
  }
  if (calls.gateway_body && g && g.persist_error) {
    const resp = { ...base, ok: false, status: 'error', error: 'persist', message: 'El Gateway actuó pero NO pudo guardar en Supabase (' + g.persist_error + '). Avísale a Christian; no repitas la importación hasta revisar.' };
    return { response: resp, audit_row: audit('error', resp.message, resp), cache_row: null };
  }
  if (calls.engine_body) {
    const e = eng && typeof eng === 'object' ? eng : null;
    if (!e) { const resp = { ...base, ok: false, status: 'error', error: 'engine', message: 'El motor de correo no respondió.' }; return { response: resp, audit_row: audit('error', resp.message, resp), cache_row: null }; }
    const eok = e.ok === true;
    const st = eok ? 'executed' : String(e.status || 'error');
    const { message: em, ok: _ok, safety, request, mode, confirmation_code, expires_at, ...rest } = e;
    let msg = em || '';
    if (req.tool === 'do_not_contact') {
      const gr = (g && g.results && g.results[0]) || {};
      msg = eok ? 'Listo: ' + (gr.company || 'el prospecto') + ' quedó como NO CONTACTAR (descartado, correos suprimidos y mensajes pendientes cancelados).' : (em || 'No se pudo suprimir.');
    }
    const resp = { ...base, ok: eok, status: st, outcome: e.status || null, message: msg, ...(confirmation_code ? { confirmation_code, expires_at, executed: false } : {}), mode: mode || null, safety: safety || { messages_sent: 0 }, data: rest };
    return { response: resp, audit_row: audit(st, msg, resp, calls.entity), cache_row: null };
  }
  const t = req.tool;
  if (t === 'analyze_prospects') {
    const res = g.results || [];
    const list = res.map((r, i) => ({ n: i + 1, company: r.company, score: r.priority_score, band: r.band, decision: r.decision === 'create_in_ghl' ? 'entra a GHL' : r.decision === 'keep_in_supabase' ? 'queda pendiente' : r.decision, channels: r.channels, location: r.location || null, existing: (r.existing || []).length ? r.existing.map((e) => e.system).join(',') : null }));
    const top = list.filter((x) => x.decision === 'entra a GHL').slice(0, 12);
    data = { summary: g.summary, notes: g.notes, top_to_import: top, list: list.slice(0, 60), list_truncated: list.length > 60, analysis_request_id: req.request_id };
    message = 'Analicé ' + g.summary.received + ' prospectos (no escribí nada). Bandas: ' + Object.entries(g.summary.by_band || {}).map(([k, v]) => v + ' ' + k).join(', ') + '. ' + g.summary.would_enter_ghl + ' entrarían a GHL. Dime «mete las buenas» para importarlas (máx. 25 por tanda) o «mete la N».';
    cache = { request_id: req.request_id, source: sourceOf(req), candidates: g.candidates || [], results: res.map((r, i) => ({ n: i + 1, company: r.company, decision: r.decision, priority_score: r.priority_score, band: r.band })) };
    entity = { type: 'batch', count: g.summary.received, source: sourceOf(req).name };
  } else if (t === 'import_prospects' || t === 'force_import_prospect') {
    const res = g.results || [];
    data = { summary: g.summary, results: res.map((r) => ({ company: r.company, decision: r.decision, score: r.priority_score, supabase: r.supabase, ghl_contact_id: r.ghl && r.ghl.contact_id, ghl_opportunity_id: r.ghl && r.ghl.opportunity_id, status_after: r.status_after, manual_override: r.manual_override, error: r.error, warnings: r.warnings })), replayed_by_gateway: g.replayed === true };
    message = t === 'force_import_prospect' ? (res[0] ? res[0].company + ': ' + (res[0].ghl && res[0].ghl.opportunity_id ? 'quedó en GHL (Investigado) con override manual registrado.' : 'no entró a GHL (' + (res[0].error || res[0].decision) + ').') : 'Sin resultado.') : 'Importé ' + g.summary.received + ': ' + g.summary.created_in_ghl + ' entraron a GHL (Investigado), ' + g.summary.kept_in_supabase + ' quedaron guardados, ' + g.summary.duplicates_in_ghl + ' ya existían en GHL (no se tocaron). No se envió ningún mensaje.';
    entity = { type: 'batch', count: res.length, companies: res.slice(0, 5).map((r) => r.company), ghl_opportunity_ids: res.map((r) => r.ghl && r.ghl.opportunity_id).filter(Boolean) };
    if (res[0] && res.length === 1) entity = { ...calls.entity, ghl_contact_id: res[0].ghl && res[0].ghl.contact_id, ghl_opportunity_id: res[0].ghl && res[0].ghl.opportunity_id };
  } else if (t === 'prepare_outreach') {
    const r = (g.results || [])[0] || {};
    data = { company: r.company, drafts: r.drafts || null, score: r.priority_score, band: r.band };
    message = r.drafts ? 'Borrador para ' + r.company + ' (NO enviado). Asunto: ' + r.drafts.email_subject + '\n\n' + r.drafts.email_body + '\n\nWhatsApp: ' + r.drafts.whatsapp : 'No pude preparar el borrador.';
  } else if (['log_manual_contact', 'add_note', 'move_opportunity', 'create_followup', 'discard_prospect'].includes(t)) {
    const r = (g.results || [])[0] || {};
    const okExec = r.executed !== false && !r.error;
    status = okExec ? 'executed' : 'error';
    const a = (r.ghl && r.ghl.applied) || {};
    data = { company: r.company, executed: okExec, status_after: r.status_after, ghl: { contact_id: r.ghl && r.ghl.contact_id, opportunity_id: r.ghl && r.ghl.opportunity_id, applied: a }, error: r.error || null, warnings: r.warnings || [] };
    const verb = { log_manual_contact: 'Registré el contacto manual (no se envió nada desde Atacama OS)', add_note: 'Agregué la nota', move_opportunity: 'Moví la oportunidad', create_followup: 'Creé el seguimiento', discard_prospect: 'Descarté el prospecto' }[t];
    message = okExec ? verb + ' de ' + r.company + '.' + (a.opportunity === 'ok' && t !== 'add_note' ? ' Etapa en GHL actualizada.' : '') + ((r.warnings || []).length ? ' Avisos: ' + r.warnings.join(', ') + '.' : '') : 'No se pudo: ' + (r.error || 'sin efecto') + ((r.warnings || []).length ? ' (' + r.warnings.join(', ') + ')' : '');
    entity = { ...calls.entity, ghl_contact_id: r.ghl && r.ghl.contact_id, ghl_opportunity_id: r.ghl && r.ghl.opportunity_id };
  } else if (t === 'get_open_opportunities') {
    const body = ghl && ghl.body ? ghl.body : {};
    const opps = Array.isArray(body.opportunities) ? body.opportunities : [];
    if (!ghl || (ghl.statusCode || 0) >= 300) { const resp = { ...base, ok: false, status: 'error', error: 'ghl', message: 'GHL no respondió (HTTP ' + (ghl && ghl.statusCode) + ').' }; return { response: resp, audit_row: audit('error', resp.message, resp), cache_row: null }; }
    const list = opps.map((o) => ({ name: o.name, stage: stageOf(o.pipelineStageId, cfg), contact: (o.contact && (o.contact.name || o.contact.companyName)) || null, email: (o.contact && o.contact.email) || null, updated: o.updatedAt ? String(o.updatedAt).slice(0, 10) : null, id: o.id }));
    data = { total: (body.meta && body.meta.total) || list.length, count: list.length, opportunities: list };
    message = list.length ? 'Tienes ' + data.total + ' oportunidades abiertas' + (entity && entity.stage ? ' en ' + stageNames()[entity.stage] : '') + ': ' + list.slice(0, 10).map((x) => x.name + ' (' + (x.stage || '?') + ')').join('; ') + (list.length > 10 ? '…' : '') + '.' : 'No hay oportunidades abiertas' + (entity && entity.stage ? ' en esa etapa' : '') + '.';
  } else if (t === 'get_tasks') {
    if (!ghl || (ghl.statusCode || 0) >= 300) { const resp = { ...base, ok: false, status: 'error', error: 'ghl', message: 'GHL no respondió (HTTP ' + (ghl && ghl.statusCode) + ').' }; return { response: resp, audit_row: audit('error', resp.message, resp), cache_row: null }; }
    const tasks = ((ghl.body && ghl.body.tasks) || []).filter((x) => !/^\(Example\)/.test(String(x.title || '')));
    tasks.sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)));
    data = { count: tasks.length, tasks: tasks.slice(0, 40).map((x) => ({ title: x.title, due: x.dueDate ? String(x.dueDate).slice(0, 10) : null, completed: x.completed === true, contact_id: x.contactId || null, id: x._id })), note: 'Se ocultan las tareas de ejemplo «(Example)» de GHL.' };
    message = tasks.length ? 'Tienes ' + tasks.length + ' tareas pendientes: ' + tasks.slice(0, 8).map((x) => x.title + ' (' + String(x.dueDate).slice(0, 10) + ')').join('; ') + '.' : 'No tienes tareas pendientes.';
  } else if (t === 'get_prospect') {
    const tg = calls.local.target;
    const r = tg.row;
    const c = tg.candidate || {};
    data = r ? { ...rowBrief(r), channels: { email: c.contact && c.contact.email, phone: c.contact && c.contact.phone, whatsapp: c.contact && c.contact.whatsapp }, facts: (c.facts || []).slice(0, 4), hypotheses: (c.commercial_hypotheses || []).slice(0, 3), angle: c.outreach_angle || null, proposed_solution: c.proposed_solution || null, drafts_prepared: Boolean(r.drafts), manual_override: r.manual_override ? r.manual_override_reason : null, ghl_contact_id: r.ghl_contact_id, ghl_opportunity_id: r.ghl_opportunity_id }
      : { company: c.company_name, source: 'último análisis (aún no guardado)', number: tg.number, brief: tg.brief, website: c.website, channels: { email: c.contact && c.contact.email, phone: c.contact && c.contact.phone, whatsapp: c.contact && c.contact.whatsapp }, facts: (c.facts || []).slice(0, 4), hypotheses: (c.commercial_hypotheses || []).slice(0, 3) };
    message = r ? r.company_name + ': ' + r.status + ', score ' + r.priority_score + ' (' + r.band + ')' + (r.ghl_stage ? ', etapa ' + r.ghl_stage : '') + (r.last_contact_channel ? ', contactado por ' + r.last_contact_channel : '') + '.' : c.company_name + ' (del último análisis' + (tg.brief ? ': score ' + tg.brief.priority_score + ', ' + tg.brief.band : '') + '): aún no está guardado.';
  } else if (t === 'list_prospects' || t === 'list_pending_prospects') {
    const list = (Array.isArray(rows) ? rows : []).map(rowBrief);
    data = { count: list.length, prospects: list };
    message = list.length ? (t === 'list_pending_prospects' ? 'Pendientes de contactar (' + list.length + '): ' : 'Prospectos (' + list.length + '): ') + list.slice(0, 12).map((x, i) => (i + 1) + '. ' + x.company + ' (' + x.score + ')').join('; ') + (list.length > 12 ? '…' : '') + '.' : 'No hay prospectos que coincidan.';
  } else if (t === 'get_analysis') {
    if (!analysis || !(analysis.results || []).length) { const resp = { ...base, ok: false, status: 'not_found', error: 'sin_analisis', message: 'No hay un análisis guardado.' }; return { response: resp, audit_row: audit('not_found', resp.message, resp), cache_row: null }; }
    data = { analysis_request_id: analysis.request_id, created_at: analysis.created_at, count: analysis.results.length, list: analysis.results.slice(0, 60) };
    message = 'Último análisis (' + String(analysis.created_at).slice(0, 16).replace('T', ' ') + '): ' + analysis.results.length + ' prospectos. Primeros: ' + analysis.results.slice(0, 8).map((x) => '#' + x.n + ' ' + x.company + ' (' + x.priority_score + ')').join('; ') + '.';
  }
  const resp = { ...base, status, message, data };
  return { response: resp, audit_row: audit(status, message, resp, entity), cache_row: cache };
}

/** Parámetros saneados para la auditoría (sin contenido de archivos ni listas completas). */
export function sanitize(p) {
  const o = {};
  Object.keys(p || {}).forEach((k) => {
    const v = p[k];
    if (k === 'file_content' || k === 'html' || k === 'csv' || k === 'text') o[k + '_bytes'] = String(v || '').length;
    else if (k === 'prospects') o.prospects_count = Array.isArray(v) ? v.length : 0;
    else if (typeof v === 'string') o[k] = v.slice(0, 300);
    else if (typeof v === 'number' || typeof v === 'boolean') o[k] = v;
    else if (Array.isArray(v)) o[k] = v.slice(0, 30);
  });
  return o;
}

/** Fila de auditoría para solicitudes rechazadas o inválidas (también se auditan). */
export function refusalResponse(req) {
  const now = new Date(req.now).toISOString();
  const r = req.refusal;
  const response = { ok: false, tool: req.tool, level: req.level, request_id: req.request_id, actor: req.actor, replayed: false, at: now, status: r.status, message: r.message, ...(r.confirmation_code ? { confirmation_code: r.confirmation_code } : {}), executed: false, safety: { messages_sent: 0 } };
  return { response, audit_row: { request_id: auditId(req, r.status), actor: req.actor, tool: req.tool, level: req.level, entity: {}, params: sanitize(req.params), status: r.status, result_summary: short(r.message, 400), response, created_at: now }, cache_row: null };
}
