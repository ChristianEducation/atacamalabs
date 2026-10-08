/**
 * Atacama OS · Authority Resource Factory (Ola B · bloque C) — núcleo puro.
 *
 * Sube el nivel del Resource & Conversation Engine de Ola A SIN rehacer su infraestructura (tabla content_resources, páginas /recursos, UTM, Intake):
 * mejora la CALIDAD de lo que se produce. Define qué es un buen recurso de autoridad (y qué no: PDF genérico, ebook, «guía gratis» sin diferenciación,
 * recurso creado solo para tener un CTA), mantiene la backlog editorial, decide si una pieza debe reutilizar un recurso, proponer uno de la backlog o no
 * usar ninguno, elige el CTA según la intención y mide autoridad (conversación y leads) separada de la atención (likes).
 *
 * Funciones AUTOCONTENIDAS (sin imports ni constantes de módulo, sin backticks en comentarios de plantillas): se incrustan con Function.prototype.toString
 * en los workflows n8n «27 Content Growth» y «25 Atacama Ops». Dependen de growthResourceRank/growthNorm (growth-core), que se incrustan juntas.
 */

import { growthResourceRank } from './growth-core.mjs';

/** Formatos de recurso prioritarios. type = valor permitido hoy por content_resources.type (la tabla no cambia); interactive = necesita una página con lógica propia. */
export function rfFormats() {
  const f = (label, type, interactive, effort, fits) => ({ label, type, interactive, effort, fits });
  return {
    mapa_de_procesos: f('Mapa de automatización', 'diagnostico', true, 'medium', ['educational', 'process', 'framework']),
    checklist_interactivo: f('Checklist interactivo', 'checklist', true, 'low', ['educational', 'process', 'resource']),
    mini_diagnostico: f('Mini diagnóstico', 'diagnostico', true, 'medium', ['customer_problem', 'educational', 'process']),
    calculadora: f('Calculadora', 'herramienta', true, 'medium', ['customer_problem', 'educational', 'market_signal']),
    comparador: f('Comparador', 'comparativa', false, 'low', ['comparison', 'educational']),
    framework: f('Framework', 'guia', false, 'low', ['framework', 'educational', 'process']),
    canvas: f('Canvas', 'plantilla', false, 'medium', ['process', 'framework']),
    plantilla: f('Plantilla', 'plantilla', false, 'low', ['resource', 'process']),
    arquitectura_visual: f('Arquitectura visual', 'pagina', false, 'medium', ['integration', 'framework', 'educational']),
    guia_corta: f('Guía corta', 'guia', false, 'low', ['educational', 'resource']),
    caso_desmontado: f('Caso desmontado paso a paso', 'caso', false, 'high', ['case', 'process', 'integration']),
    mini_auditoria: f('Mini auditoría', 'diagnostico', true, 'medium', ['customer_problem', 'process']),
    demo: f('Demo', 'pagina', true, 'high', ['demo', 'integration']),
    recurso_interactivo: f('Recurso interactivo', 'herramienta', true, 'high', ['educational', 'framework']),
    herramienta_web: f('Herramienta web pequeña', 'herramienta', true, 'high', ['resource', 'customer_problem']),
  };
}

/** Backlog editorial inicial (Ola B §15). Se registran como BORRADOR: pasan a activos solo cuando su página existe y responde 200. */
export function rfBacklog() {
  const b = (slug, name, format, topic, audience, problem, ctaMode, ctaCopy, fits, priority, differentiator) => ({ slug, name, format, topic, audience, problem, cta_mode: ctaMode, cta_copy: ctaCopy, url: 'https://atacamalabs.cl/recursos/' + slug, fits, priority, differentiator });
  return [
    b('que-proceso-automatizar-primero', 'Qué proceso de tu empresa automatizar primero', 'checklist_interactivo', 'elegir el primer proceso a automatizar', 'Dueños y gerentes de pymes', '¿Qué procesos de mi empresa vale la pena automatizar primero? Cinco criterios simples para puntuar y ordenar los candidatos.', 'resource_link', 'Usa el checklist para elegir el primero', ['educational', 'process', 'framework'], 10, 'Puntaje de cinco criterios aplicable en diez minutos a la lista real de procesos de la empresa'),
    b('agente-vs-automatizacion-vs-chatbot', 'Agente, automatización o chatbot: cuál necesita tu proceso', 'comparador', 'diferencia entre agente automatización y chatbot', 'Dueños y gerentes de pymes', 'Muchas empresas no saben si lo que necesitan es un chatbot, una automatización o un agente; el comparador ayuda a decidir según el proceso.', 'resource_link', 'Compara las tres opciones para tu caso', ['comparison', 'educational'], 9, 'Compara por tipo de tarea, riesgo, herramientas y supervisión, con una recomendación por escenario'),
    b('calculadora-trabajo-manual', 'Calculadora de trabajo manual: cuánto te cuesta repetir tareas', 'calculadora', 'costo del trabajo manual repetitivo', 'Dueños y gerentes de pymes', 'Calcula horas mensuales, costo estimado y potencial de automatización a partir de personas, horas semanales, frecuencia y costo aproximado.', 'resource_link', 'Calcula cuántas horas pierdes al mes', ['customer_problem', 'educational', 'market_signal'], 8, 'Devuelve horas, costo y potencial con los datos de quien la usa, sin pedir correo para ver el resultado'),
    b('canvas-mapear-un-proceso', 'Canvas para mapear un proceso antes de automatizarlo', 'canvas', 'mapear un proceso paso a paso', 'Responsables de operaciones y dueños de pymes', 'Antes de automatizar hay que ver el proceso completo: entrada, responsables, herramientas, decisiones, datos, acciones, excepciones y resultado.', 'resource_link', 'Descarga el canvas y mapea tu proceso', ['process', 'framework'], 7, 'Ocho bloques que obligan a escribir las excepciones y las decisiones humanas, donde fallan las automatizaciones'),
    b('checklist-antes-de-automatizar', 'Checklist: ¿está listo tu proceso para automatizarse?', 'checklist_interactivo', 'preparar un proceso para automatizarlo', 'Dueños y gerentes de pymes', 'Seis preguntas (repetitivo, reglas, datos, juicio humano, herramientas, riesgo) que dicen si un proceso está listo o necesita ordenarse primero.', 'diagnostic', 'Responde seis preguntas sobre tu proceso', ['educational', 'process', 'customer_problem'], 6, 'Termina con un veredicto (listo, ordenar primero o no automatizar) y el siguiente paso concreto'),
    b('arquitectura-minima-de-un-agente', 'Arquitectura mínima de un agente empresarial', 'arquitectura_visual', 'arquitectura de un agente de IA en una empresa', 'Gerentes y responsables de tecnología de pymes', 'Un diagrama simple canal, agente, herramientas, datos, acción y supervisión que explica qué necesita un agente para trabajar de verdad.', 'resource_link', 'Mira la arquitectura mínima de un agente', ['integration', 'framework', 'educational'], 5, 'Muestra dónde van los permisos y la supervisión humana, que casi nunca aparecen en los diagramas de agentes'),
  ];
}

/** Calidad de un recurso NUEVO: formato prioritario, diferenciador real y nada de relleno. Devuelve { errors[], warnings[] }. */
export function rfValidateNew(r) {
  const x = r && typeof r === 'object' ? r : {};
  const m = x.metadata && typeof x.metadata === 'object' ? x.metadata : {};
  const errors = [], warnings = [];
  const fmts = rfFormats();
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const fmt = String(m.format || '');
  if (!fmt) errors.push('formato_de_recurso_obligatorio_en_metadata.format:' + Object.keys(fmts).join('|'));
  else if (!fmts[fmt]) errors.push('formato_de_recurso_invalido:' + fmt.slice(0, 40));
  else if (x.type && fmts[fmt].type !== x.type) warnings.push('tipo_no_coincide_con_el_formato:' + fmt + '→' + fmts[fmt].type);
  const diff = String(m.differentiator || '').trim();
  if (diff.length < 20) errors.push('diferenciador_obligatorio_metadata.differentiator_20+_caracteres_que_hace_este_recurso_distinto_y_util');
  const text = norm(String(x.name || '') + ' ' + String(x.problem || ''));
  if (/\b(ebook|e-book|pdf gratis|guia gratis|descarga gratis|libro blanco|whitepaper)\b/.test(text)) errors.push('recurso_generico_ebook_pdf_o_guia_gratis_sin_diferenciacion');
  if (x.type === 'documento') errors.push('tipo_documento_es_un_pdf_generico_usa_un_formato_con_logica_o_estructura_propia');
  if (m.only_for_cta === true) errors.push('no_se_crean_recursos_solo_para_tener_un_cta');
  if (fmt && fmts[fmt] && fmts[fmt].interactive && String(x.status || 'draft') === 'active' && m.interactive_verified !== true) warnings.push('recurso_interactivo_activo_sin_verificar_que_funciona');
  return { errors, warnings };
}

/**
 * ¿Esta idea/pieza debe usar un recurso? input = { topic, summary, editorial_type, channel }, resources = filas de content_resources (cualquier estado).
 * Devuelve { action: reuse | backlog | propose | none, reason, resource?, candidate?, matches[] }. Nunca crea nada.
 */
export function rfAssess(input, resources) {
  const x = input && typeof input === 'object' ? input : {};
  const list = Array.isArray(resources) ? resources : [];
  const type = String(x.editorial_type || '');
  const query = String(x.topic || '') + ' ' + String(x.summary || '');
  const NO_CTA = ['opinion', 'founder', 'build_in_public', 'news_explainer', 'market_signal'];
  if (NO_CTA.includes(type)) return { action: 'none', reason: 'Una pieza de tipo ' + type + ' (reflexión, noticia, posicionamiento) no necesita recurso: se publica sin CTA comercial.', matches: [] };
  if (!String(x.topic || '').trim()) return { action: 'none', reason: 'Falta el tema para evaluar un recurso.', matches: [] };
  const ranked = growthResourceRank(list.filter((r) => r && r.status !== 'retired'), query, { includeDraft: true, limit: 5 });
  const matches = ranked.map((r) => ({ id: r.id, slug: r.slug, name: r.name, status: r.status, match_score: r.match_score }));
  const best = ranked[0];
  // Reutilizar exige que la pieza cubra casi todo el nombre del recurso (no basta compartir palabras genéricas como «proceso» o «automatizar»).
  const nameToks = best ? String(best.name || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ').split(' ').filter((w) => w.length > 3) : [];
  const qToks = query.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ').split(' ').filter((w) => w.length > 3);
  const coverage = nameToks.length ? nameToks.filter((w) => qToks.some((t) => t.startsWith(w.slice(0, 5)) || w.startsWith(t.slice(0, 5)))).length / nameToks.length : 0;
  if (best && best.match_score >= 9 && coverage >= 0.75) {
    if (best.status === 'active') return { action: 'reuse', reason: 'Ya existe un recurso activo que resuelve el mismo problema («' + best.name + '»): se reutiliza, no se crea otro.', resource: { id: best.id, slug: best.slug, name: best.name, url: best.url, cta_mode: best.cta_mode }, matches };
    return { action: 'backlog', reason: '«' + best.name + '» ya está en la backlog como borrador (falta construir su página): no se duplica; la pieza sale sin recurso por ahora.', resource: { id: best.id, slug: best.slug, name: best.name, status: best.status }, matches };
  }
  const toks = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ').split(' ').filter((w) => w.length > 3);
  const q = toks(query);
  const have = new Set(list.map((r) => r && r.slug));
  const fmts = rfFormats();
  const cands = rfBacklog().filter((c) => !have.has(c.slug) && c.fits.includes(type || 'educational')).map((c) => {
    const ct = toks(c.name + ' ' + c.topic + ' ' + c.problem);
    const hit = q.filter((w) => ct.some((t) => t.startsWith(w.slice(0, 5)) || w.startsWith(t.slice(0, 5)))).length;
    return { c, hit };
  }).filter((e) => e.hit >= 2).sort((a, b) => b.hit - a.hit || b.c.priority - a.c.priority);
  if (cands.length) {
    const c = cands[0].c;
    return { action: 'propose', reason: 'No hay un recurso para este tema y la backlog tiene uno que encaja («' + c.name + '»): puede proponerse (queda en borrador hasta que exista su página).', candidate: { slug: c.slug, name: c.name, format: c.format, type: fmts[c.format].type, interactive: fmts[c.format].interactive, effort: fmts[c.format].effort, differentiator: c.differentiator }, matches };
  }
  return { action: 'none', reason: 'No hay un recurso que aporte a este tema y no corresponde a una necesidad de la backlog: no se crea uno solo para tener un CTA.', matches };
}

/**
 * CTA según la intención de la pieza. input = { editorial_type, channel, resource, allow_keyword }. resource = { id, status, format?, type? } | null.
 * «Comenta PALABRA» solo con un recurso de valor real y SIEMPRE con entrega manual (no hay DM automatizado soportado).
 */
export function rfCta(input) {
  const x = input && typeof input === 'object' ? input : {};
  const type = String(x.editorial_type || 'educational');
  const ch = String(x.channel || 'linkedin_page');
  const r = x.resource && typeof x.resource === 'object' ? x.resource : null;
  const active = r && r.status === 'active';
  const fmts = rfFormats();
  if (['opinion', 'founder', 'build_in_public', 'news_explainer', 'market_signal'].includes(type)) return { cta_mode: 'none', manual_delivery: false, why: 'Opinión, reflexión, aprendizaje, noticia o posicionamiento: sin CTA comercial.' };
  if (active && ['educational', 'framework', 'comparison', 'resource', 'process', 'integration'].includes(type)) {
    const valuable = r.format && fmts[r.format] ? fmts[r.format].interactive : false;
    if (x.allow_keyword === true && valuable && ch !== 'linkedin_page') return { cta_mode: 'dm', cta_type: 'comment_keyword', manual_delivery: true, why: 'Recurso de valor real: comentario con palabra clave. La entrega del recurso es MANUAL (no hay DM automatizado soportado).' };
    if (ch === 'instagram') return { cta_mode: 'dm', manual_delivery: false, why: 'Instagram no enlaza en el caption: DM o link en bio hacia el recurso.' };
    return { cta_mode: 'resource_link', manual_delivery: false, why: 'Hay un recurso activo que extiende el tema: enlace directo con atribución (UTM).' };
  }
  if (type === 'customer_problem') return { cta_mode: 'diagnostic', manual_delivery: false, why: 'Problema de cliente sin recurso: invitar a pensar el proceso propio (diagnóstico).' };
  if (['case', 'demo'].includes(type)) return { cta_mode: 'dm', manual_delivery: false, why: 'Caso o demo: DM directo («si quieres verlo aplicado a tu proceso, escríbeme»).' };
  if (type === 'process') return { cta_mode: 'diagnostic', manual_delivery: false, why: 'Proceso: pregunta de diagnóstico sobre el proceso del lector.' };
  return { cta_mode: 'none', manual_delivery: false, why: 'Sin recurso que aporte: no se fuerza un CTA.' };
}

/** Coherencia CTA ↔ tipo editorial de una pieza ya redactada. Devuelve { warnings[], penalties }. */
export function rfCtaCheck(piece) {
  const p = piece && typeof piece === 'object' ? piece : {};
  const type = String(p.editorial_type || '');
  const mode = p.cta_mode || (p.resource_id ? 'resource_link' : 'none');
  const warnings = [];
  let penalties = 0;
  if (['opinion', 'founder', 'build_in_public', 'market_signal'].includes(type) && (mode === 'resource_link' || (p.cta && p.cta.type === 'comment_keyword'))) { warnings.push('cta_comercial_en_pieza_de_' + type + '_pide_sin_cta'); penalties += 2; }
  if (p.channel === 'linkedin_profile' && mode === 'resource_link' && !['resource', 'framework', 'educational'].includes(type)) { warnings.push('perfil_personal_con_enlace_a_recurso_solo_si_nace_natural'); penalties += 1; }
  if (p.channel === 'instagram' && mode === 'resource_link') warnings.push('instagram_no_enlaza_en_el_caption_usa_dm_o_link_en_bio');
  return { warnings, penalties };
}

/**
 * Autoridad vs atención. d = { pieces:[{id,topic,channel,status,resource_id,editorial_type}], metrics:[{content_piece_id,metric_window,likes,comments,shares,captured_at}],
 * resources:[{id,slug}], leads:[{source_page,campaign}] }. Usa solo lo que existe de verdad (GHL entrega likes/comentarios/compartidos por publicación;
 * leads con origen /recursos/<slug>); lo que NO se puede medir se declara en blind_spots en vez de inventarlo.
 */
export function rfAuthority(d) {
  const x = d && typeof d === 'object' ? d : {};
  const pieces = Array.isArray(x.pieces) ? x.pieces : [];
  const metrics = Array.isArray(x.metrics) ? x.metrics : [];
  const resources = Array.isArray(x.resources) ? x.resources : [];
  const leads = Array.isArray(x.leads) ? x.leads : [];
  const bySlug = {};
  resources.forEach((r) => { bySlug[r.id] = r.slug; });
  const leadsFor = (slug) => (slug ? leads.filter((l) => String(l.campaign || '') === slug || String(l.source_page || '').includes('/recursos/' + slug) || String(l.source_page || '').includes('recursos-' + slug)).length : 0);
  const rank = { '24h': 1, '72h': 2, '7d': 3 };
  const latest = {};
  metrics.filter((m) => m && m.content_piece_id && (m.status === undefined || m.status === 'ok' || m.status === 'partial')).forEach((m) => {
    const cur = latest[m.content_piece_id];
    if (!cur || (rank[m.metric_window] || 0) >= (rank[cur.metric_window] || 0)) latest[m.content_piece_id] = m;
  });
  const rows = [];
  pieces.filter((p) => p && !p.is_test && p.status === 'published').forEach((p) => {
    const m = latest[p.id];
    if (!m) { rows.push({ id: p.id, title: String(p.topic || '').slice(0, 90), channel: p.channel, editorial_type: p.editorial_type || null, klass: 'sin_datos', attention: null, conversation: null, leads: 0, authority_score: null }); return; }
    const likes = Number(m.likes) || 0, comments = Number(m.comments) || 0, shares = Number(m.shares) || 0;
    const attention = likes + comments + shares, conversation = comments * 2 + shares * 3;
    const slug = p.resource_id ? bySlug[p.resource_id] : null;
    const nLeads = leadsFor(slug);
    const score = conversation + (p.resource_id ? 2 : 0) + nLeads * 15;
    let klass = 'mixta';
    if (nLeads > 0 || (conversation >= 3 && conversation >= attention * 0.5)) klass = 'autoridad';
    else if (attention >= 10 && conversation < attention * 0.25) klass = 'atencion';
    rows.push({ id: p.id, title: String(p.topic || '').slice(0, 90), channel: p.channel, editorial_type: p.editorial_type || null, klass, attention, conversation, leads: nLeads, authority_score: score, has_resource: Boolean(p.resource_id) });
  });
  const measured = rows.filter((r) => r.klass !== 'sin_datos');
  const count = (k) => measured.filter((r) => r.klass === k).length;
  const byType = {};
  measured.forEach((r) => { const t = r.editorial_type || 'sin_tipo'; (byType[t] = byType[t] || []).push(r.authority_score); });
  const types = Object.keys(byType).map((t) => ({ type: t, pieces: byType[t].length, avg_authority: Math.round((byType[t].reduce((a, b) => a + b, 0) / byType[t].length) * 10) / 10 })).sort((a, b) => b.avg_authority - a.avg_authority);
  const learn = [];
  if (types.length >= 2 && types[0].avg_authority > types[types.length - 1].avg_authority) learn.push('Con los datos actuales, las piezas de tipo «' + types[0].type + '» generan más conversación que las de «' + types[types.length - 1].type + '» (muestra chica: ' + measured.length + ' piezas medidas).');
  const att = measured.filter((r) => r.klass === 'atencion');
  if (att.length) learn.push(att.length + ' pieza(s) llamaron la atención (likes) sin generar conversación: no necesariamente sirven para autoridad.');
  const aut = measured.filter((r) => r.klass === 'autoridad').sort((a, b) => b.authority_score - a.authority_score);
  return {
    pieces_measured: measured.length, pieces_without_data: rows.length - measured.length,
    attention_only: count('atencion'), authority: count('autoridad'), mixed: count('mixta'),
    top_authority: aut.slice(0, 3).map((r) => ({ title: r.title, channel: r.channel, editorial_type: r.editorial_type, score: r.authority_score, leads: r.leads })),
    by_editorial_type: types, learn,
    measurable: ['likes, comentarios y compartidos por publicación (GHL)', 'piezas con recurso asociado', 'leads cuyo origen es /recursos/<slug> o cuya campaña es el slug del recurso'],
    blind_spots: ['guardados, clics y visitas al recurso: GHL no los entrega por API y no hay analítica web consultable desde Atacama OS', 'la atribución UTM de cada lead vive en la nota del contacto en GHL, no en Supabase: DM, reunión, oportunidad y pipeline por pieza no se calculan automáticamente'],
    rows: rows.slice(0, 40),
  };
}
