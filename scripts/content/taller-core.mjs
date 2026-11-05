/**
 * Atacama OS v3 · Fase 2 — Taller (mesa de revisión e iteración) y «Programar» → GHL (spec §6.2–§6.4 + anexo §E). Núcleo puro.
 *
 * Funciones AUTOCONTENIDAS (sin imports ni constantes de módulo): se prueban con `taller-core.test.mjs` y se incrustan con
 * Function.prototype.toString en n8n 25 (lectura: taller_list) y n8n 29 (escritura: taller_* e idea_decide/approve).
 *
 * Reglas: «Programar» es la aprobación de Christian (clic con sesión PIN). Los carruseles se crean EN REVISIÓN y esperan su último clic
 * en GHL (la API no permite saber cuántas imágenes saldrán: Fase 0); imagen, reel e historia se crean ya aprobados. Retirar = rechazo
 * reversible (no hay DELETE). Toda versión se conserva; el feedback abierto se cierra solo cuando nace la versión siguiente.
 */

/** Transiciones permitidas (anexo §E1). */
export function tallerTransitions() {
  return {
    en_cola: ['en_produccion', 'en_pc_con_claude', 'para_revisar', 'descartada'],
    en_produccion: ['para_revisar', 'necesita_ayuda', 'descartada'],
    en_pc_con_claude: ['para_revisar', 'descartada'],
    para_revisar: ['cambios_pedidos', 'lista', 'programada', 'programada_pendiente_de_clic', 'descartada'],
    cambios_pedidos: ['en_produccion', 'en_pc_con_claude', 'para_revisar', 'descartada'],
    lista: ['cambios_pedidos', 'programada', 'programada_pendiente_de_clic', 'descartada'],
    programada_pendiente_de_clic: ['programada', 'publicada', 'descartada'],
    programada: ['publicada', 'descartada'],
    necesita_ayuda: ['en_produccion', 'en_pc_con_claude', 'para_revisar', 'descartada'],
    publicada: [],
    descartada: [],
  };
}

export function tallerCan(from, to) {
  const t = tallerTransitions();
  return Array.isArray(t[from]) && t[from].includes(to);
}

/** Etiquetas en español simple para /ops. */
export function tallerLabels() {
  return { en_cola: 'En cola', en_produccion: 'En producción (VPS)', en_pc_con_claude: 'En el PC con Claude', para_revisar: 'Para revisar', cambios_pedidos: 'Cambios pedidos', lista: 'Lista para programar',
    programada_pendiente_de_clic: 'Falta tu último clic en GHL', programada: 'Programada', publicada: 'Publicada', descartada: 'Descartada', necesita_ayuda: 'Necesita ayuda' };
}

/** Cuenta de GHL por red (Social Planner, verificado el 13-oct). */
export function tallerAccount(channel) {
  return ({ instagram: '6ac43e3ecfe0752734a5fe1e_pxHuOsiz2i3lM6BtC9IM_17841424613699090', linkedin_page: '6ac4fabe3356d12d204557ea_pxHuOsiz2i3lM6BtC9IM_145278681_page',
    linkedin_profile: '6ac4fabe3356d12d204557ea_pxHuOsiz2i3lM6BtC9IM_D9Z-EPMxLu_profile' })[channel] || null;
}

/** Tipo de post en GHL según el formato. */
export function tallerGhlType(format) {
  return format === 'reel' ? 'reel' : format === 'historia' ? 'story' : 'post';
}

/** Viernes de cierre (18:00 Chile ≈ 21:00 UTC) de la semana anterior a `week_start`. */
export function tallerNeedsBy(weekStart) {
  const d = new Date(String(weekStart) + 'T21:00:00Z');
  d.setUTCDate(d.getUTCDate() - 3);
  return d.toISOString();
}

/** Pieza del Taller que nace al aprobar una idea (spec §6.1 → §6.2). Carril vps → en_cola; pc → en_pc_con_claude (con aviso a Christian). */
export function tallerPieceFromIdea(idea, ctx) {
  const now = Number(ctx && ctx.now) || Date.now();
  const lane = ['reel', 'demo'].includes(idea.format) ? 'pc' : 'vps';
  const cat = { educar: 'Educativo', recurso: 'Educativo', autoridad: 'Evergreen', alcance: 'Evergreen', conversaciones: 'Evergreen', leads: 'Demo', servicio: 'Demo' }[idea.objective] || 'Evergreen';
  const nowIso = new Date(now).toISOString();
  return {
    id: ctx.id, icp_pack_id: ctx.pack_id, idea_key: 'idea:' + idea.id, idea_id: idea.id, topic: String(idea.title || '').slice(0, 200), angle: idea.angle || null, audience: idea.audience_insight || null,
    channel: idea.channel, format: idea.format, category: cat, score: idea.score == null ? null : idea.score, rationale: idea.why || null, source_ids: Array.isArray(idea.source_ids) ? idea.source_ids : [],
    evidence_urls: (Array.isArray(idea.evidence) ? idea.evidence : []).map((e) => e && e.url).filter(Boolean).slice(0, 10),
    piece: { origin: 'idea', hook: idea.hook || null, core_message: idea.core_message || null, structure: idea.structure || [], cta: idea.cta || null, keyword: idea.keyword || null, objective: idea.objective || null, primary_metric: idea.primary_metric || null, production: idea.production || {}, risks: idea.risks || null },
    status: 'idea', origin: idea.origin === 'christian' ? 'explicit' : 'autonomous', resource_id: idea.resource_id || null, cta_mode: idea.keyword && idea.resource_id ? 'dm' : null,
    lane, taller_status: lane === 'pc' ? 'en_pc_con_claude' : 'en_cola', current_version: null, needs_by: tallerNeedsBy(idea.week_start), credits_spent: 0, is_test: Boolean(idea.is_test), created_at: nowIso, updated_at: nowIso,
  };
}

/** Aprobar una idea con el Taller vivo: la idea pasa a in_production y nace su pieza (dos escrituras independientes: sin FK entre ellas, D-07). */
export function tallerApproveIdeaPlan(idea, ctx) {
  const now = Number(ctx && ctx.now) || Date.now();
  const nowIso = new Date(now).toISOString();
  const by = (ctx && ctx.by) || 'Christian via /ops';
  if (!idea) return { error: 'idea_no_encontrada', message: 'No encontré esa idea.' };
  if (idea.is_test && !(ctx && ctx.allow_test)) return { error: 'idea_test', message: 'Esa idea es de prueba.' };
  if (idea.status !== 'proposed' && !(idea.status === 'approved' && !idea.piece_id)) return { error: 'no_aprobable', message: 'Solo se aprueba una idea «por decidir» (estado: ' + idea.status + ').' };
  const piece = tallerPieceFromIdea(idea, { now, id: ctx.piece_id, pack_id: ctx.pack_id });
  const hist = (Array.isArray(idea.history) ? idea.history : []).concat([{ at: nowIso, by, what: 'aprobada · pieza creada en el Taller (' + (piece.lane === 'pc' ? 'PC con Claude' : 'VPS') + ')' }]).slice(-20);
  return { resp: { ok: true, status: 'approved', piece_id: piece.id, lane: piece.lane, message: piece.lane === 'pc' ? 'Aprobada. Su pieza quedó en el Taller esperando una sesión en el PC con Claude (video/motion).' : 'Aprobada. Su pieza quedó en el Taller, en cola de producción. No se publica ni programa sola.' },
    writes: [{ method: 'POST', path: 'content_pieces', body: piece, prefer: 'return=minimal' },
      { method: 'PATCH', path: 'content_ideas?id=eq.' + idea.id + '&status=in.(' + (idea.status === 'approved' ? 'approved' : 'proposed') + ')', body: { status: 'in_production', piece_id: piece.id, decided_at: idea.decided_at || nowIso, decided_by: idea.decided_by || by, history: hist, updated_at: nowIso }, prefer: 'return=representation', check_rows: true, check_message: 'La idea cambió mientras tanto. Recarga.' }] };
}

/** Valida los archivos de una versión según formato y red (rutas del bucket privado `taller`: <piece_id>/v<n>/<archivo>). */
export function tallerValidateAssets(assets, piece) {
  const a = Array.isArray(assets) ? assets : [];
  const errors = [];
  const re = /^[0-9a-f-]{36}\/v\d{1,3}\/[A-Za-z0-9._-]{1,80}$/;
  a.forEach((x, i) => { if (!x || !re.test(String(x.path || '')) || !String(x.path).startsWith(piece.id + '/')) errors.push('archivo ' + (i + 1) + ': ruta inválida'); });
  const kinds = a.map((x) => (x && /\.mp4$/i.test(String(x.path)) ? 'video' : 'image'));
  const f = piece.format;
  if (f === 'carrusel' && (a.length < 2 || a.length > 10 || kinds.some((k) => k !== 'image'))) errors.push('un carrusel lleva de 2 a 10 imágenes');
  if (f === 'reel' && (a.length !== 1 || kinds[0] !== 'video')) errors.push('un reel lleva un solo video MP4');
  if ((f === 'imagen' || f === 'historia') && (a.length !== 1 || kinds[0] !== 'image')) errors.push('una ' + f + ' lleva una sola imagen');
  if (f === 'texto' && a.length > 1) errors.push('un post de texto lleva como mucho una imagen');
  if (f === 'carrusel' || f === 'imagen') a.forEach((x, i) => { if (x && x.w && x.h && Math.abs(x.w / x.h - 0.8) > 0.02 && piece.channel === 'instagram') errors.push('lámina ' + (i + 1) + ': debe ser 4:5 (1080×1350)'); });
  return errors;
}

/** Nueva versión (VPS, PC con Claude o prueba). Cierra el feedback abierto (anexo §E4) y pasa la pieza a «para revisar». */
export function tallerAddVersionPlan(piece, input, ctx) {
  const now = Number(ctx && ctx.now) || Date.now();
  if (!piece || !piece.taller_status) return { error: 'pieza_no_encontrada', message: 'No encontré esa pieza en el Taller.' };
  if (!tallerCan(piece.taller_status, 'para_revisar')) return { error: 'estado_invalido', message: 'No se puede subir una versión a una pieza en estado «' + piece.taller_status + '».' };
  const x = input || {};
  const errs = tallerValidateAssets(x.assets, piece);
  if (errs.length) return { error: 'archivos_invalidos', message: errs.join(' · ') };
  const no = (Number(piece.current_version) || 0) + 1;
  if (Number(x.version_no) && Number(x.version_no) !== no) return { error: 'version_desfasada', message: 'Se esperaba la versión v' + no + '.' };
  const cost = Math.max(0, Math.min(500, Number(x.cost_credits) || 0));
  const nowIso = new Date(now).toISOString();
  const kind = { carrusel: 'carrusel', reel: 'reel', imagen: 'imagen', historia: 'historia', texto: 'texto', demo: 'reel' }[piece.format] || 'imagen';
  const qa = x.qa && typeof x.qa === 'object' ? x.qa : {};
  if (piece.lane === 'pc' && kind === 'reel' && !(Number(qa.score) >= 8)) return { error: 'puerta_de_calidad', message: 'La versión de video necesita su puerta de calidad con nota ≥ 8 antes de mostrarse (§6.6).' };
  return { resp: { ok: true, status: 'para_revisar', version_no: no, message: 'Versión v' + no + ' lista para revisar.' },
    writes: [{ method: 'POST', path: 'content_versions', body: { id: ctx.id, piece_id: piece.id, version_no: no, kind, assets: (x.assets || []).map((a) => ({ path: a.path, w: a.w || null, h: a.h || null, label: a.label || null })), caption: typeof x.caption === 'string' ? x.caption.slice(0, 3000) : null, lane: piece.lane || 'vps', qa, attempts: Math.max(0, Number(x.attempts) || 0), created_by: String(x.created_by || 'Claude').slice(0, 60), notes: typeof x.notes === 'string' ? x.notes.slice(0, 1000) : null, cost_credits: cost, is_test: Boolean(piece.is_test), created_at: nowIso }, prefer: 'return=minimal' },
      { method: 'PATCH', path: 'content_pieces?id=eq.' + piece.id + '&taller_status=eq.' + piece.taller_status, body: { taller_status: 'para_revisar', current_version: no, credits_spent: Math.round(((Number(piece.credits_spent) || 0) + cost) * 100) / 100, updated_at: nowIso }, prefer: 'return=representation', check_rows: true, check_message: 'La pieza cambió mientras tanto; no se guardó la versión.' },
      { method: 'PATCH', path: 'content_feedback?piece_id=eq.' + piece.id + '&status=eq.open', body: { status: 'done', resolved_at: nowIso }, prefer: 'return=minimal' }] };
}

/** «Pedir cambio»: guarda el feedback (global o por lámina) y deja la pieza en «cambios pedidos». En vps lo ejecuta Hermes; en pc queda para la próxima sesión. */
export function tallerFeedbackPlan(piece, input, ctx) {
  const now = Number(ctx && ctx.now) || Date.now();
  if (!piece || !piece.taller_status) return { error: 'pieza_no_encontrada', message: 'No encontré esa pieza en el Taller.' };
  const text = String((input && input.text) || '').trim();
  if (text.length < 3) return { error: 'falta_texto', message: 'Escribe qué cambiar.' };
  const scope = /^lamina [0-9]{1,2}$/.test(String(input.scope || '')) ? input.scope : 'global';
  if (!tallerCan(piece.taller_status, 'cambios_pedidos') && piece.taller_status !== 'cambios_pedidos') return { error: 'estado_invalido', message: 'Esa pieza está «' + piece.taller_status + '»: ya no admite cambios aquí.' };
  const nowIso = new Date(now).toISOString();
  const by = (ctx && ctx.by) || 'Christian via /ops';
  return { resp: { ok: true, status: 'cambios_pedidos', message: piece.lane === 'pc' ? 'Cambio guardado: queda para la próxima sesión en el PC con Claude.' : 'Cambio guardado: la producción lo toma y te avisa cuando esté la versión siguiente.' },
    writes: [{ method: 'POST', path: 'content_feedback', body: { piece_id: piece.id, version_id: (ctx && ctx.version_id) || null, scope, text: text.slice(0, 2000), status: 'open', author: 'Christian', is_test: Boolean(piece.is_test), created_at: nowIso }, prefer: 'return=minimal' },
      ...(piece.taller_status === 'cambios_pedidos' ? [] : [{ method: 'PATCH', path: 'content_pieces?id=eq.' + piece.id + '&taller_status=eq.' + piece.taller_status, body: { taller_status: 'cambios_pedidos', updated_at: nowIso }, prefer: 'return=representation', check_rows: true, check_message: 'La pieza cambió mientras tanto. Recarga.' }]),
      { method: 'POST', path: 'learning_events', body: { type: 'piece_feedback', subject_id: piece.id, before: { version: piece.current_version, format: piece.format, channel: piece.channel, lane: piece.lane }, after: null, reason: scope + ': ' + text.slice(0, 500), by, is_test: Boolean(piece.is_test), created_at: nowIso }, prefer: 'return=minimal' }] };
}

/** Aprobar la versión (para_revisar → lista). Programar es aparte (elige fecha). */
export function tallerApprovePlan(piece, ctx) {
  const now = Number(ctx && ctx.now) || Date.now();
  if (!piece || !piece.taller_status) return { error: 'pieza_no_encontrada', message: 'No encontré esa pieza en el Taller.' };
  if (piece.taller_status === 'lista') return { resp: { ok: true, status: 'lista', message: 'Ya estaba lista.' }, writes: [] };
  if (!tallerCan(piece.taller_status, 'lista')) return { error: 'estado_invalido', message: 'Solo una pieza «para revisar» se puede aprobar (estado: ' + piece.taller_status + ').' };
  return { resp: { ok: true, status: 'lista', message: 'Aprobada: lista para programar.' }, writes: [{ method: 'PATCH', path: 'content_pieces?id=eq.' + piece.id + '&taller_status=eq.para_revisar', body: { taller_status: 'lista', updated_at: new Date(now).toISOString() }, prefer: 'return=representation', check_rows: true, check_message: 'La pieza cambió mientras tanto. Recarga.' }] };
}

/** Descartar (con razón → aprendizaje). Si ya estaba en GHL, se retira con rechazo reversible en n8n 29 (paso aparte). */
export function tallerDiscardPlan(piece, input, ctx) {
  const now = Number(ctx && ctx.now) || Date.now();
  if (!piece || !piece.taller_status) return { error: 'pieza_no_encontrada', message: 'No encontré esa pieza en el Taller.' };
  if (piece.taller_status === 'descartada') return { resp: { ok: true, status: 'descartada', message: 'Ya estaba descartada.' }, writes: [] };
  if (!tallerCan(piece.taller_status, 'descartada')) return { error: 'estado_invalido', message: 'Esa pieza ya está publicada.' };
  const nowIso = new Date(now).toISOString();
  const reason = String((input && input.reason) || '').trim().slice(0, 300) || null;
  const by = (ctx && ctx.by) || 'Christian via /ops';
  return { resp: { ok: true, status: 'descartada', message: 'Descartada. La razón queda para que el sistema aprenda.' },
    writes: [{ method: 'PATCH', path: 'content_pieces?id=eq.' + piece.id + '&taller_status=eq.' + piece.taller_status, body: { taller_status: 'descartada', status: piece.ghl_post_id ? piece.status : 'discarded', updated_at: nowIso }, prefer: 'return=representation', check_rows: true, check_message: 'La pieza cambió mientras tanto. Recarga.' },
      ...(piece.idea_id ? [{ method: 'PATCH', path: 'content_ideas?id=eq.' + piece.idea_id + '&status=in.(in_production,approved)', body: { status: 'discarded', decision_reason: reason || 'Descartada en el Taller', updated_at: nowIso }, prefer: 'return=minimal' }] : []),
      { method: 'POST', path: 'learning_events', body: { type: 'piece_feedback', subject_id: piece.id, before: { version: piece.current_version, format: piece.format, channel: piece.channel }, after: { discarded: true }, reason: 'descartada' + (reason ? ': ' + reason : ''), by, is_test: Boolean(piece.is_test), created_at: nowIso }, prefer: 'return=minimal' }] };
}

/** Duplicar a otra red: crea una IDEA hija (no copia el texto); Hermes completa su ficha. */
export function tallerDuplicatePlan(piece, idea, input, ctx) {
  const now = Number(ctx && ctx.now) || Date.now();
  if (!piece) return { error: 'pieza_no_encontrada', message: 'No encontré esa pieza.' };
  const ch = String((input && input.channel) || '');
  if (!['instagram', 'linkedin_page', 'linkedin_profile'].includes(ch) || ch === piece.channel) return { error: 'red_invalida', message: 'Elige otra red distinta a la de esta pieza.' };
  const nowIso = new Date(now).toISOString();
  const by = (ctx && ctx.by) || 'Christian via /ops';
  const format = ch === 'instagram' ? (piece.format === 'texto' ? 'imagen' : piece.format) : (['reel', 'demo'].includes(piece.format) ? piece.format : 'texto');
  const week = (idea && idea.week_start) || null;
  return { resp: { ok: true, status: 'approved', message: 'Creé una idea hija para ' + ({ instagram: 'Instagram', linkedin_page: 'LinkedIn página', linkedin_profile: 'LinkedIn personal' })[ch] + '. Hermes completa su ficha con la voz de esa red.' },
    writes: [{ method: 'POST', path: 'content_ideas', body: { id: ctx.id, week_start: week || ctx.week_start, channel: ch, format, title: String(piece.topic || '').slice(0, 200), why: 'Duplicada desde una pieza del Taller (sin copiar el texto).', status: 'approved', origin: 'christian', ficha_complete: false, parent_idea_id: piece.idea_id || null,
      production: { tools: [], how: '', lane: ['reel', 'demo'].includes(format) ? 'pc' : 'vps' }, decided_at: nowIso, decided_by: by, is_test: Boolean(piece.is_test), history: [{ at: nowIso, by, what: 'duplicada desde la pieza ' + piece.id }], created_at: nowIso, updated_at: nowIso }, prefer: 'return=minimal' }] };
}

/** Editar el pie (caption) de la versión actual: no crea versión nueva. */
export function tallerCaptionPlan(piece, version, caption, ctx) {
  const now = Number(ctx && ctx.now) || Date.now();
  if (!piece || !version) return { error: 'sin_version', message: 'Esa pieza todavía no tiene una versión.' };
  if (!['para_revisar', 'lista', 'cambios_pedidos'].includes(piece.taller_status)) return { error: 'estado_invalido', message: 'El texto ya no se puede editar aquí (estado: ' + piece.taller_status + ').' };
  const c = String(caption || '').trim();
  if (piece.format === 'historia' && c) return { error: 'historia_sin_texto', message: 'Las historias no llevan texto en GHL (lo rechaza): lo que deba leerse va en la imagen.' };
  if (c.length > 3000) return { error: 'texto_largo', message: 'Máximo 3.000 caracteres.' };
  return { resp: { ok: true, status: piece.taller_status, message: 'Texto guardado en la versión v' + version.version_no + '.' }, writes: [{ method: 'PATCH', path: 'content_versions?id=eq.' + version.id, body: { caption: c || null }, prefer: 'return=representation', check_rows: true, check_message: 'No encontré la versión.' }] };
}

/**
 * Fecha propuesta (anexo §E3): primer hueco libre de la semana objetivo. Instagram feed a las 15:00 (nunca dos el mismo día);
 * historias 10/14/18 (máx. 3 por día); LinkedIn 10:00 (máx. 1 por cuenta y día). Devuelve ISO UTC (Chile = UTC−3 en temporada de verano).
 */
export function tallerProposeSlot(piece, taken, cfg, nowMs, weekStart) {
  const c = cfg || {};
  const off = Number(c.utc_offset_hours) || -3;
  const feedAt = String(c.ig_feed_slot || '15:00'), stories = String(c.ig_story_slots || '10:00,14:00,18:00').split(',').map((s) => s.trim()).filter(Boolean);
  const times = piece.channel === 'instagram' ? (piece.format === 'historia' ? stories : [feedAt]) : ['10:00'];
  const isFeed = (p) => p.channel === 'instagram' && p.format !== 'historia';
  const list = (Array.isArray(taken) ? taken : []).filter((p) => p && p.scheduled_at && p.id !== piece.id);
  const start = weekStart && /^\d{4}-\d{2}-\d{2}$/.test(weekStart) ? weekStart : new Date(nowMs).toISOString().slice(0, 10);
  for (let k = 0; k < 21; k++) {
    const day = new Date(start + 'T12:00:00Z'); day.setUTCDate(day.getUTCDate() + k);
    const ds = day.toISOString().slice(0, 10);
    const sameDay = list.filter((p) => new Date(Date.parse(p.scheduled_at) + off * 3600000).toISOString().slice(0, 10) === ds);
    if (piece.channel === 'instagram' && piece.format !== 'historia' && sameDay.some(isFeed)) continue;
    if (piece.channel !== 'instagram' && sameDay.some((p) => p.channel === piece.channel)) continue;
    if (piece.format === 'historia' && sameDay.filter((p) => p.channel === 'instagram' && p.format === 'historia').length >= 3) continue;
    for (const t of times) {
      const [hh, mm] = t.split(':').map(Number);
      const iso = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), hh - off, mm || 0)).toISOString();
      if (Date.parse(iso) < nowMs + 60 * 60000) continue;
      if (sameDay.some((p) => Date.parse(p.scheduled_at) === Date.parse(iso))) continue;
      return iso;
    }
  }
  return null;
}

/**
 * Antes de tocar GHL: valida todo (§6.3-1) y arma el cuerpo base del post. Devuelve { error } o { ok, carousel, direct, needsUpload, paths, base }.
 * `x` = { piece, version, idea, schedule_at, taken, cfg, now, approver }.
 */
export function tallerSchedulePrecheck(x) {
  const p = x.piece, v = x.version, now = Number(x.now) || Date.now();
  if (!p || !p.taller_status) return { error: 'pieza_no_encontrada', message: 'No encontré esa pieza en el Taller.' };
  if (!['para_revisar', 'lista'].includes(p.taller_status)) return { error: 'estado_invalido', message: 'Solo se programa una pieza «para revisar» o «lista» (estado: ' + p.taller_status + ').' };
  if (p.ghl_post_id && ['programada', 'programada_pendiente_de_clic'].includes(p.taller_status)) return { error: 'ya_programada', message: 'Esa pieza ya está en GHL.' };
  if (!v) return { error: 'sin_version', message: 'Esa pieza todavía no tiene una versión para programar.' };
  const account = tallerAccount(p.channel);
  if (!account) return { error: 'red_invalida', message: 'Red sin cuenta conectada en GHL.' };
  const at = Date.parse(String(x.schedule_at || ''));
  if (!Number.isFinite(at)) return { error: 'falta_fecha', message: 'Elige fecha y hora.' };
  if (at < now + 30 * 60000) return { error: 'fecha_pasada', message: 'La fecha debe ser al menos 30 minutos en el futuro.' };
  if (at > now + 55 * 86400000) return { error: 'fecha_lejana', message: 'Máximo 55 días hacia adelante (las conexiones de GHL vencen el 11/12-dic).' };
  const errs = tallerValidateAssets(v.assets, p);
  if (errs.length) return { error: 'archivos_invalidos', message: errs.join(' · ') };
  const caption = String(v.caption || '').trim();
  if (p.format === 'historia' && caption) return { error: 'historia_sin_texto', message: 'Las historias no llevan texto en GHL: quita el texto antes de programar.' };
  if (p.format !== 'historia' && !caption && p.format !== 'reel') return { error: 'sin_texto', message: 'Falta el texto de la publicación.' };
  const kw = String((x.idea && x.idea.keyword) || (p.piece && p.piece.keyword) || '').trim();
  if (kw && p.format !== 'historia' && !caption.toUpperCase().includes(kw.toUpperCase())) return { error: 'falta_palabra_clave', message: 'La idea lleva la palabra clave «' + kw + '» y el texto no la menciona.' };
  if (p.channel === 'instagram' && caption.length > 2200) return { error: 'texto_largo', message: 'Instagram admite hasta 2.200 caracteres.' };
  if (p.channel !== 'instagram' && caption.length > 3000) return { error: 'texto_largo', message: 'LinkedIn admite hasta 3.000 caracteres.' };
  const off = -3;
  const ds = new Date(at + off * 3600000).toISOString().slice(0, 10);
  const same = (Array.isArray(x.taken) ? x.taken : []).filter((q) => q.id !== p.id && q.scheduled_at && new Date(Date.parse(q.scheduled_at) + off * 3600000).toISOString().slice(0, 10) === ds);
  if (p.channel === 'instagram' && p.format !== 'historia' && same.some((q) => q.channel === 'instagram' && q.format !== 'historia')) return { error: 'hueco_ocupado', message: 'Ya hay una publicación de feed de Instagram ese día. Elige otro día.' };
  if (p.channel !== 'instagram' && same.some((q) => q.channel === p.channel)) return { error: 'hueco_ocupado', message: 'Ya hay una publicación en esa cuenta de LinkedIn ese día.' };
  if (p.format === 'historia' && same.filter((q) => q.channel === 'instagram' && q.format === 'historia').length >= 3) return { error: 'hueco_ocupado', message: 'Ese día ya tiene 3 historias.' };
  const carousel = p.format === 'carrusel';
  const direct = !carousel || Boolean(x.cfg && x.cfg.taller_carousel_direct_schedule === true);
  const paths = (v.assets || []).map((a) => a.path);
  return { ok: true, carousel, direct, needsUpload: paths.length > 0, paths, account, type: tallerGhlType(p.format), caption: p.format === 'historia' ? '' : caption, schedule_iso: new Date(at).toISOString() };
}

/** Cuerpo del POST a GHL Social Planner (creación). Carrusel → en revisión (último clic en GHL) salvo el interruptor; lo demás → aprobado. */
export function tallerGhlBody(pre, media, approver) {
  const direct = pre.direct;
  return { accountIds: [pre.account], summary: pre.caption, type: pre.type, media: (media || []).map((m) => ({ url: m.url, type: m.type || 'image/png' })), scheduleDate: pre.schedule_iso, userId: approver,
    status: direct ? 'scheduled' : 'in_review', postApprovalDetails: { approver, approvalStatus: direct ? 'approved' : 'pending' } };
}

/** Cierre de «Programar»: con el post leído de vuelta desde GHL, escribe la pieza, la idea y (si salió sin cambios) la señal positiva. */
export function tallerScheduleFinal(x) {
  const p = x.piece, pre = x.pre, post = x.post, now = Number(x.now) || Date.now();
  const nowIso = new Date(now).toISOString();
  if (!post || !post._id) return { error: 'ghl_no_confirmo', message: 'GHL no confirmó la creación del post. No lo doy por programado: revisa GHL.' };
  const st = String(post.status || '').toLowerCase(), ap = ((post.postApprovalDetails || {}).approvalStatus) || null;
  const okDirect = pre.direct && st === 'scheduled' && ap === 'approved';
  const okClick = !pre.direct && st === 'in_review';
  if (!okDirect && !okClick) return { error: 'ghl_estado_inesperado', message: 'GHL creó el post pero quedó «' + st + '/' + (ap || '—') + '». Revísalo en GHL; no lo doy por programado.', ghl_post_id: post._id };
  const ts = okDirect ? 'programada' : 'programada_pendiente_de_clic';
  const by = 'Christian vía /ops Taller';
  const ghlMedia = (Array.isArray(x.media) ? x.media : []).map((m) => ({ url: m.url, fileId: m.fileId || null }));
  const writes = [{ method: 'PATCH', path: 'content_pieces?id=eq.' + p.id + '&taller_status=eq.' + p.taller_status, body: { piece: { ...(p.piece || {}), ghl_media: ghlMedia }, taller_status: ts, status: okDirect ? 'scheduled' : 'in_review', ghl_post_id: post._id, ghl_account_id: pre.account, ghl_status: st, ghl_approval_status: ap, scheduled_at: pre.schedule_iso, approved_at: okDirect ? nowIso : null, updated_at: nowIso }, prefer: 'return=representation', check_rows: true, check_message: 'El post se creó en GHL (' + post._id + ') pero la pieza cambió mientras tanto: revisa el Taller.' }];
  if (p.idea_id) writes.push({ method: 'PATCH', path: 'content_ideas?id=eq.' + p.idea_id + '&status=in.(in_production,approved)', body: { status: 'scheduled', updated_at: nowIso }, prefer: 'return=minimal' });
  if (Number(p.current_version) === 1 && !x.had_feedback) writes.push({ method: 'POST', path: 'learning_events', body: { type: 'piece_ok', subject_id: p.id, before: { format: p.format, channel: p.channel, lane: p.lane }, after: { version: 1 }, reason: 'programada sin cambios (v1)', by, is_test: Boolean(p.is_test), created_at: nowIso }, prefer: 'return=minimal' });
  const when = new Date(Date.parse(pre.schedule_iso) - 3 * 3600000).toISOString().slice(0, 16).replace('T', ' ');
  return { resp: { ok: true, status: ts, ghl_post_id: post._id, schedule_date: pre.schedule_iso, needs_ghl: !okDirect, message: okDirect ? 'Programada en GHL para el ' + when + ' (hora de Chile). Tu clic fue la aprobación.' : 'Carrusel creado en GHL para el ' + when + ' (hora de Chile), EN REVISIÓN: ábrelo en GHL, comprueba las ' + (pre.paths.length) + ' láminas y dale el último clic de aprobar.' }, writes };
}

/** Lo que el sync (n8n 14) debe reflejar en el Taller según el estado mapeado del post. */
export function tallerSyncStatus(piece, mapped) {
  const cur = piece && piece.taller_status;
  if (!cur || !['programada', 'programada_pendiente_de_clic'].includes(cur)) return null;
  if (mapped.status === 'published') return 'publicada';
  if (mapped.status === 'discarded') return 'descartada';
  if (mapped.status === 'scheduled' && cur === 'programada_pendiente_de_clic') return 'programada';
  if (mapped.status === 'approved' && cur === 'programada_pendiente_de_clic') return 'programada';
  return null;
}

/** Vista del Taller para /ops (taller_list). `signed` = { path: url firmada }. */
export function tallerListView(x) {
  const now = Number(x.now) || Date.now();
  const L = tallerLabels();
  const pieces = (Array.isArray(x.pieces) ? x.pieces : []).filter((p) => p.taller_status && (x.include_test === true ? p.is_test === true : !p.is_test));
  const ideas = {}; (Array.isArray(x.ideas) ? x.ideas : []).forEach((i) => { ideas[i.id] = i; });
  const vers = {}; (Array.isArray(x.versions) ? x.versions : []).forEach((v) => { (vers[v.piece_id] = vers[v.piece_id] || []).push(v); });
  const fb = {}; (Array.isArray(x.feedback) ? x.feedback : []).forEach((f) => { (fb[f.piece_id] = fb[f.piece_id] || []).push(f); });
  const signed = x.signed || {};
  const chLabel = { instagram: 'Instagram', linkedin_page: 'LinkedIn · página', linkedin_profile: 'LinkedIn · personal' };
  const order = ['para_revisar', 'lista', 'programada_pendiente_de_clic', 'cambios_pedidos', 'necesita_ayuda', 'en_pc_con_claude', 'en_produccion', 'en_cola', 'programada', 'publicada', 'descartada'];
  const view = (p) => {
    const vs = (vers[p.id] || []).slice().sort((a, b) => a.version_no - b.version_no).map((v) => ({ id: v.id, version_no: v.version_no, kind: v.kind, caption: v.caption, created_by: v.created_by, created_at: v.created_at, cost_credits: Number(v.cost_credits) || 0, notes: v.notes,
      qa: v.qa && Object.keys(v.qa).length ? { score: v.qa.score == null ? null : v.qa.score, problems: (v.qa.problems || []).slice(0, 3), images: (v.qa.images || []).map((path) => signed[path] || null).filter(Boolean).slice(0, 6) } : null,
      assets: (v.assets || []).map((a) => ({ url: signed[a.path] || null, video: /\.mp4$/i.test(a.path), label: a.label || null })) }));
    const cur = vs[vs.length - 1] || null;
    const idea = ideas[p.idea_id] || null;
    const proposed = ['para_revisar', 'lista'].includes(p.taller_status) ? tallerProposeSlot(p, x.taken || [], x.cfg || {}, now, idea && idea.week_start) : null;
    return { id: p.id, title: p.topic, channel: p.channel, channel_label: chLabel[p.channel] || p.channel, format: p.format, lane: p.lane || 'vps', status: p.taller_status, status_label: L[p.taller_status] || p.taller_status,
      week_start: idea ? idea.week_start : null, needs_by: p.needs_by, current_version: p.current_version, credits: Number(p.credits_spent) || 0, thumb: cur && cur.assets[0] ? cur.assets[0].url : null,
      scheduled_at: p.scheduled_at || null, ghl_post_id: p.ghl_post_id || null, proposed_slot: proposed, keyword: (idea && idea.keyword) || (p.piece && p.piece.keyword) || null, resource_id: p.resource_id || null,
      idea: idea ? { id: idea.id, hook: idea.hook, objective: idea.objective, primary_metric: idea.primary_metric, why: idea.why, evidence: idea.evidence || [], structure: idea.structure || [] } : null,
      versions: vs, feedback: (fb[p.id] || []).slice().sort((a, b) => String(a.created_at).localeCompare(String(b.created_at))).map((f) => ({ id: f.id, scope: f.scope, text: f.text, status: f.status, created_at: f.created_at, version_id: f.version_id })),
      overdue: p.needs_by && Date.parse(p.needs_by) < now && !['programada', 'programada_pendiente_de_clic', 'publicada', 'descartada'].includes(p.taller_status) };
  };
  const rows = pieces.map(view).sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status) || String(a.needs_by || '').localeCompare(String(b.needs_by || '')));
  const counts = {}; rows.forEach((r) => { counts[r.status] = (counts[r.status] || 0) + 1; });
  return { generated_at: new Date(now).toISOString(), labels: L, counts, pieces: rows, carousel_direct: Boolean(x.cfg && x.cfg.taller_carousel_direct_schedule === true) };
}

/** uuid v4 sin módulos. */
export function tallerNewId(rnd) {
  const r = rnd || Math.random;
  const h = (n) => Array.from({ length: n }, () => Math.floor(r() * 16).toString(16)).join('');
  return h(8) + '-' + h(4) + '-4' + h(3) + '-' + ['8', '9', 'a', 'b'][Math.floor(r() * 4)] + h(3) + '-' + h(12);
}
