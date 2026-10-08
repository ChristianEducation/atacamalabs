// node n8n/build/content-growth.test.mjs — prueba los nodos Code de «27 Content Growth» con stubs de n8n.
import { buildContentGrowth, ACTIONS } from './content-growth.mjs';

const wf = buildContentGrowth();
const codeOf = (name) => wf.nodes.find((n) => n.name === name).parameters.jsCode;
let pass = 0, fail = 0;
const t = (n, c, x = '') => { c ? pass++ : fail++; console.log(c ? 'ok  ' : 'FAIL', n, c ? '' : x); };
const mk = (arr) => ({ first: () => ({ json: arr[0] }), all: () => arr.map((j) => ({ json: j })) });
const runNode = (name, nodes) => new Function('$', codeOf(name))((n) => { if (!(n in nodes)) throw new Error('sin datos: ' + n); return mk([].concat(nodes[n])); });

const parse = (body) => runNode('Parse', { 'Growth Webhook': { body } })[0].json;
// Ejecuta Parse → (lecturas simuladas por clave) → Compute y devuelve { resp, writes, reads }
const exec = (body, data = {}, probe) => {
  const p = parse(body);
  if (p.fatal) return { fatal: p.fatal };
  const reads = runNode('Expand Reads', { Parse: p }).map((x) => x.json);
  const res = reads.map((r) => (r.key in data ? (data[r.key] && data[r.key].__status ? { statusCode: data[r.key].__status, body: {} } : { statusCode: 200, body: data[r.key] }) : { statusCode: 200, body: r.key === 'config' ? [{ max_pending_in_review: 6, rss_enabled: true, competitor_enabled: true }] : [] }));
  const out = runNode('Compute', { Parse: p, Read: res, 'Probe URL': probe || { statusCode: 200 } })[0].json;
  return { ...out, reads, parsed: p };
};
const wr = (o, re) => o.writes.filter((w) => re.test(w.path));

// ---- Parse
t('Parse: action inválida => fatal', /action inválida/.test(exec({ action: 'borrar_todo' }).fatal));
t('Parse: interview_id inválido => fatal', /interview_id inválido/.test(exec({ action: 'founder_answer', interview_id: 'x;drop' }).fatal));
t('Parse: slug inválido => fatal', /slug inválido/.test(exec({ action: 'resource_register', slug: 'Mal Slug' }).fatal));
t('todas las acciones declaradas existen', ACTIONS.length === 18 && ACTIONS.includes('resource_opportunity') && ACTIONS.includes('resource_backlog'));

// ---- queue_status
let o = exec({ action: 'queue_status' }, { pending: Array.from({ length: 6 }, (_, i) => ({ id: i })), candidates: [{ id: 'c1', title: 'X', signal_score: 80 }], new_items: [{ id: 1 }, { id: 2 }], waiting_render: [{ id: 'w', format: 'carrusel', channel: 'instagram' }] });
t('queue_status: 6/6 => no puede generar solo; cuenta candidatas, RSS nuevos y carruseles esperando render', o.resp.can_generate_autonomously === false && o.resp.pending_in_review === 6 && o.resp.candidate_signals === 1 && o.resp.new_rss_items === 2 && o.resp.carousels_waiting_render === 1 && /Cola llena/.test(o.resp.text));
t('queue_status: 2/6 => puede generar', exec({ action: 'queue_status' }, { pending: [{}, {}] }).resp.can_generate_autonomously === true);
t('una lectura que falla NO se esconde (ok:false lectura_fallida)', (() => { const q = exec({ action: 'queue_status' }, { pending: { __status: 500 } }); return q.resp.ok === false && q.resp.error === 'lectura_fallida'; })());

// ---- Founder Interview
const QS = [{ id: 'q1', question: 'Pregunta A', context: 'Hecho real A', priority: 9, status: 'available', topic: 'errores' }, { id: 'q2', question: 'Pregunta B', context: 'Hecho real B', priority: 5, status: 'available' }];
o = exec({ action: 'founder_start' }, { questions: QS, open: [] });
t('founder_start: elige la de mayor prioridad, crea la entrevista (asked) y marca la pregunta como usada', o.resp.ok && o.resp.question === 'Pregunta A' && o.resp.context === 'Hecho real A' && !o.resp.reused && wr(o, /^founder_interviews/)[0].body.status === 'asked' && wr(o, /founder_questions\?id=eq\.q1/)[0].body.status === 'used' && /^[0-9a-f-]{36}$/.test(o.resp.interview_id));
o = exec({ action: 'founder_start' }, { questions: QS, open: [{ id: 'i1', status: 'asked', question: 'Pregunta A', context: 'ctx', asked_at: new Date(Date.now() - 3600000).toISOString() }] });
t('founder_start: con una pregunta abierta reciente la reutiliza (no hace spam de preguntas)', o.resp.reused === true && o.resp.interview_id === 'i1' && o.writes.length === 0);
o = exec({ action: 'founder_start', test: true }, { questions: QS, open: [] });
t('founder_start TEST: crea la entrevista is_test y NO consume la pregunta real', wr(o, /^founder_interviews/)[0].body.is_test === true && wr(o, /founder_questions/).length === 0 && /is_test=eq.true/.test(o.reads.find((r) => r.key === 'open').url));
o = exec({ action: 'founder_start' }, { questions: [], open: [] });
t('founder_start: sin preguntas => pide proponer una con hecho real', o.resp.needs_questions === true && o.resp.question === null && o.writes.length === 0);
o = exec({ action: 'founder_start' }, { questions: QS, open: [{ id: 'i2', status: 'answered', question: 'P', asked_at: new Date().toISOString() }] });
t('founder_start: entrevista ya respondida sin piezas => lo indica', o.resp.status === 'answered' && o.writes.length === 0);
t('founder_add_question: sin contexto real => rechaza', exec({ action: 'founder_add_question', question: '¿Qué aprendiste al cambiar el flujo de aprobación?' }).resp.error === 'falta_contexto_real');
t('founder_add_question: pregunta corta => rechaza', exec({ action: 'founder_add_question', question: 'Qué tal', context: 'Hecho real suficiente largo' }).resp.error === 'pregunta_muy_corta');
o = exec({ action: 'founder_add_question', question: '¿Qué aprendiste al cambiar el flujo de aprobación?', context: 'Real: se cambió el flujo de aprobación el 8-oct.', priority: 12 }, { questions: [{ id: 'z', question: 'otra' }] });
t('founder_add_question: válida => inserta con prioridad acotada a 10', o.resp.ok && wr(o, /^founder_questions/)[0].body.priority === 10 && wr(o, /^founder_questions/)[0].body.created_by === 'hermes');
t('founder_add_question: duplicada => no inserta', exec({ action: 'founder_add_question', question: '¿Qué aprendiste al cambiar el flujo de aprobación?!', context: 'Real: algo que ocurrió el 8-oct en el sistema' }, { questions: [{ id: 'z', question: 'Qué aprendiste al cambiar el flujo de aprobación' }] }).resp.duplicate === true);
const ANS = 'Decidí que el correo comercial no se envía solo: cada mensaje lo apruebo yo con un código. Hace dos días vi que cuatro correos salieron desde el buzón sin pasar por Atacama OS y entendí que el control no podía depender de mi memoria.';
o = exec({ action: 'founder_answer', answer: ANS, source: 'audio' }, { interview: [{ id: 'i1', status: 'asked', question: 'P?' }] });
t('founder_answer: sin interview_id usa la última abierta; guarda texto y origen audio; pasa a answered', o.resp.ok && o.resp.status === 'answered' && o.resp.answer_source === 'audio' && wr(o, /id=eq\.i1/)[0].body.status === 'answered' && wr(o, /id=eq\.i1/)[0].body.answer_text === ANS && /asked&is_test=eq.false/.test(o.reads.find((r) => r.key === 'interview').url));
t('founder_answer: respuesta corta => rechaza (la IA no inventa lo que falta)', exec({ action: 'founder_answer', answer: 'Sí, estuvo bien.' }, { interview: [{ id: 'i1', status: 'asked' }] }).resp.error === 'respuesta_muy_corta_minimo_120_caracteres');
t('founder_answer: sin entrevista abierta => error claro', exec({ action: 'founder_answer', answer: ANS }, { interview: [] }).resp.error === 'entrevista_no_encontrada');
t('founder_answer: idempotente si repite el mismo texto', (() => { const q = exec({ action: 'founder_answer', answer: ANS, interview_id: '22222222-2222-4222-8222-222222222222' }, { interview: [{ id: 'i1', status: 'answered', answer_text: ANS }] }); return q.resp.replayed === true && q.writes.length === 0; })());
t('founder_answer: ya enviada o cancelada => rechaza', exec({ action: 'founder_answer', answer: ANS }, { interview: [{ id: 'i1', status: 'submitted', answer_text: 'otra' }] }).resp.error === 'entrevista_ya_enviada' && exec({ action: 'founder_answer', answer: ANS }, { interview: [{ id: 'i1', status: 'cancelled' }] }).resp.error === 'entrevista_cancelada');
o = exec({ action: 'founder_cancel' }, { interview: [{ id: 'i1', status: 'asked', question_id: 'q1' }] });
t('founder_cancel: cancela y devuelve la pregunta a disponible', wr(o, /founder_interviews/)[0].body.status === 'cancelled' && wr(o, /founder_questions\?id=eq\.q1/)[0].body.status === 'available');

// ---- Recursos
const RES = [
  { id: 'r1', slug: 'que-proceso-automatizar-primero', name: 'Qué proceso de tu empresa automatizar primero', type: 'checklist', topic: 'priorización de automatización', audience: 'dueños de pymes', problem: 'No sabes qué proceso automatizar primero', cta_mode: 'resource_link', url: 'https://atacamalabs.cl/recursos/que-proceso-automatizar-primero', status: 'active' },
  { id: 'r2', slug: 'borrador', name: 'Borrador', type: 'guia', topic: 'whatsapp', problem: 'Conectar WhatsApp al CRM sin perder mensajes', cta_mode: 'dm', url: 'https://atacamalabs.cl/recursos/borrador', status: 'draft' },
  { id: 'r3', slug: 'viejo', name: 'Viejo', type: 'guia', topic: 'otro', problem: 'Algo retirado hace tiempo ya', cta_mode: 'dm', url: 'https://atacamalabs.cl/recursos/viejo', status: 'retired' }];
o = exec({ action: 'resources_list', query: 'qué proceso automatizar primero' }, { resources: RES });
t('resources_list: encuentra el recurso adecuado antes de crear otro', o.resp.count >= 1 && o.resp.resources[0].slug === 'que-proceso-automatizar-primero' && /reutiliza/.test(o.resp.message));
t('resources_list: sin coincidencias sugiere crear uno (queda en borrador)', exec({ action: 'resources_list', query: 'contabilidad tributaria' }, { resources: RES }).resp.count === 0);
t('resources_list: nunca lista los retirados', !exec({ action: 'resources_list' }, { resources: RES }).resp.resources.some((r) => r.slug === 'viejo'));
const NEWRES = { action: 'resource_register', slug: 'checklist-whatsapp', name: 'Checklist de WhatsApp Business', type: 'checklist', topic: 'whatsapp', problem: 'Quieres conectar WhatsApp a tu CRM sin perder ningún mensaje', url: 'https://atacamalabs.cl/recursos/checklist-whatsapp', metadata: { format: 'checklist_interactivo', differentiator: 'Termina con un veredicto y el siguiente paso concreto para tu operación' } };
o = exec(NEWRES, { resource: [] });
t('resource_register: nuevo => borrador, sin probar la URL', o.resp.created === true && wr(o, /^content_resources/)[0].body.status === 'draft' && wr(o, /^content_resources/)[0].body.created_by === 'hermes' && o.parsed.probe === null);
t('resource_register: activo exige que la URL responda 200', (() => { const q = exec({ ...NEWRES, status: 'active' }, { resource: [] }, { statusCode: 404 }); return q.resp.error === 'url_no_responde_200' && q.writes.length === 0; })());
t('resource_register: activo con URL 200 => se crea activo (y se probó la URL)', (() => { const q = exec({ ...NEWRES, status: 'active' }, { resource: [] }, { statusCode: 200 }); return q.resp.created && wr(q, /^content_resources/)[0].body.status === 'active' && q.parsed.probe === NEWRES.url; })());
t('resource_register: inválido (URL de otro dominio) => error con la lista', (() => { const q = exec({ ...NEWRES, url: 'https://otro.com/x' }, { resource: [] }); return q.resp.error === 'recurso_invalido' && q.resp.errors.includes('url_fuera_de_atacamalabs_cl'); })());
t('resource_register: slug existente => actualiza (idempotente), no duplica', (() => { const q = exec({ ...NEWRES, slug: 'borrador', url: 'https://atacamalabs.cl/recursos/borrador' }, { resource: [RES[1]] }); return q.resp.updated === true && wr(q, /^content_resources\?id=eq\.r2/).length === 1 && !wr(q, /^content_resources$/).length; })());
t('resource_register: un recurso retirado no se reactiva por accidente', exec({ ...NEWRES, slug: 'viejo', url: 'https://atacamalabs.cl/recursos/viejo' }, { resource: [RES[2]] }).resp.error === 'recurso_retirado');
// ---- Ola B · Authority Resource Factory
t('resource_register: un recurso NUEVO sin formato ni diferenciador se rechaza con la lista (estándar de autoridad)', (() => { const q = exec({ ...NEWRES, metadata: {} }, { resource: [] }); return q.resp.error === 'recurso_de_baja_calidad' && q.resp.errors.some((e) => /formato_de_recurso_obligatorio/.test(e)) && q.resp.errors.some((e) => /diferenciador_obligatorio/.test(e)) && q.writes.length === 0; })());
t('resource_register: ebook/PDF genérico se rechaza; actualizar uno existente no exige el estándar de nuevo', (() => { const q = exec({ ...NEWRES, name: 'Ebook gratis de WhatsApp Business' }, { resource: [] }); const u = exec({ ...NEWRES, slug: 'borrador', url: 'https://atacamalabs.cl/recursos/borrador', metadata: {} }, { resource: [RES[1]] }); return q.resp.errors.some((e) => /generico/.test(e)) && u.resp.updated === true; })());
t('resource_opportunity: reutiliza el recurso activo y recomienda enlace con atribución (resource_link)', (() => { const q = exec({ action: 'resource_opportunity', topic: 'Qué proceso automatizar primero en tu empresa', summary: 'elegir el primer proceso a automatizar', editorial_type: 'educational', channel: 'linkedin_page' }, { resources: RES }); return q.resp.decision === 'reuse' && q.resp.resource.slug === 'que-proceso-automatizar-primero' && q.resp.cta.cta_mode === 'resource_link' && q.writes.length === 0; })());
t('resource_opportunity: una opinión no necesita recurso (sin CTA) y un tema ajeno NO inventa recursos', (() => { const a = exec({ action: 'resource_opportunity', topic: 'Qué proceso automatizar primero', editorial_type: 'opinion' }, { resources: RES }); const b = exec({ action: 'resource_opportunity', topic: 'Cambio de precios de una API de modelos', summary: 'nuevo precio por token', editorial_type: 'educational' }, { resources: RES }); return a.resp.decision === 'none' && a.resp.cta.cta_mode === 'none' && b.resp.decision === 'none' && /solo para tener un CTA/.test(b.resp.reason) && a.writes.length + b.writes.length === 0; })());
t('resource_opportunity: propone un candidato de la backlog solo si encaja (queda en borrador, no se crea nada)', (() => { const q = exec({ action: 'resource_opportunity', topic: 'Agente, automatización o chatbot: qué necesita tu proceso', summary: 'diferencia entre agente automatización y chatbot', editorial_type: 'comparison', channel: 'linkedin_page' }, { resources: RES }); return q.resp.decision === 'propose' && q.resp.candidate.slug === 'agente-vs-automatizacion-vs-chatbot' && q.writes.length === 0; })());
t('resource_backlog: lista los 6 candidatos con su estado (el activo figura como active) y es solo lectura', (() => { const q = exec({ action: 'resource_backlog' }, { resources: RES }); return q.resp.count === 6 && q.resp.backlog.find((x) => x.slug === 'que-proceso-automatizar-primero').state === 'active' && q.resp.backlog.find((x) => x.slug === 'calculadora-trabajo-manual').state === 'sin_registrar' && q.writes.length === 0; })());
t('resource_register: actualizar un recurso existente CONSERVA su metadata (formato, backlog) en vez de borrarla', (() => { const q = exec({ ...NEWRES, slug: 'borrador', url: 'https://atacamalabs.cl/recursos/borrador', metadata: undefined }, { resource: [{ ...RES[1], metadata: { format: 'calculadora', backlog: true } }] }); const b = wr(q, /^content_resources\?id=eq\.r2/)[0].body; return b.metadata.format === 'calculadora' && b.metadata.backlog === true; })());
t('resource_retire: marca retirado', wr(exec({ action: 'resource_retire', slug: 'borrador' }, { resource: [RES[1]] }), /r2/)[0].body.status === 'retired');

// ---- RSS
const iso = (h) => new Date(Date.now() - h * 3600000).toISOString();
const ITEMS = [{ id: 'a1111111-1111-4111-8111-111111111111', feed_id: 'f1', feed_slug: 'n8n-blog', title: 'Agentes con MCP', url: 'https://x/1', summary: 's', relevance: 8, published_at: iso(5), ingested_at: iso(1) }, { id: 'b2222222-2222-4222-8222-222222222222', feed_id: 'f2', feed_slug: 'openai-news', title: 'Premio', url: 'https://x/2', relevance: 1, published_at: iso(2), ingested_at: iso(1) }, { id: 'c3333333-3333-4333-8333-333333333333', feed_id: 'f1', feed_slug: 'n8n-blog', title: 'Webhooks nuevos', url: 'https://x/3', relevance: 6, published_at: iso(30), ingested_at: iso(1) }];
o = exec({ action: 'rss_pending', limit: 5 }, { items_dated: ITEMS.slice(0, 2), items_undated: [{ ...ITEMS[2], published_at: null }], feeds: [{ id: 'f1', slug: 'n8n-blog', name: 'n8n · Blog' }, { id: 'f2', slug: 'openai-news', name: 'OpenAI' }], pending: [{}, {}] });
t('rss_pending: ordena por relevancia, oculta el ruido (relevancia < 2) y trae el nombre del feed', o.resp.count === 2 && o.resp.items[0].title === 'Agentes con MCP' && o.resp.items[1].title === 'Webhooks nuevos' && o.resp.items[0].feed === 'n8n · Blog');
t('rss_pending: informa si la cola permite crear piezas', o.resp.pieces_allowed === true && exec({ action: 'rss_pending' }, { pending: Array.from({ length: 6 }, () => ({})) }).resp.pieces_allowed === false);
t('rss_pending: respeta limit y no duplica un item en ambas listas', exec({ action: 'rss_pending', limit: 1 }, { items_dated: ITEMS, items_undated: ITEMS, feeds: [] }).resp.count === 1);
o = exec({ action: 'rss_mark', item_ids: [ITEMS[0].id, 'no-uuid', ITEMS[2].id], status: 'signal', note: 'señal abierta', signal_source_id: '33333333-3333-4333-8333-333333333333' });
t('rss_mark: solo ids válidos; signal guarda la fuente de la señal', o.resp.marked === 2 && /id=in\.\(a1111111.*,c3333333/.test(o.writes[0].path) && o.writes[0].body.signal_source_id === '33333333-3333-4333-8333-333333333333');
t('rss_mark: status inválido o sin ids => rechaza', exec({ action: 'rss_mark', item_ids: [ITEMS[0].id], status: 'borrar' }).resp.error === 'parametros_invalidos' && exec({ action: 'rss_mark', item_ids: [], status: 'ignored' }).resp.error === 'parametros_invalidos');
o = exec({ action: 'rss_status' }, { feeds: [{ slug: 'ok', name: 'OK', enabled: true, last_checked_at: iso(1), last_status: 'ok', consecutive_failures: 0 }, { slug: 'caido', name: 'Caído', enabled: true, last_checked_at: iso(1), last_status: 'error', last_error: 'http_503', consecutive_failures: 3 }, { slug: 'nunca', name: 'Nunca', enabled: true, last_checked_at: null }], new_items: [{ feed_slug: 'ok' }, { feed_slug: 'ok' }] });
t('rss_status: marca atención a feeds con 3+ fallos o nunca chequeados y cuenta los nuevos por feed', JSON.stringify(o.resp.attention) === JSON.stringify(['caido', 'nunca']) && o.resp.feeds.find((f) => f.slug === 'ok').new_items === 2 && o.resp.new_items_total === 2);

// ---- Inteligencia orgánica de competencia
const REPORT = { run_id: 'intel-20261008-1300', competitors: [{ slug: 'vambe', pages_read: ['https://www.vambe.ai/reads'], recent_topics: ['agentes de ventas'] }], saturated_topics: ['agentes 24/7'], gaps: ['costo real de implementar'], own_angles: [{ angle: 'Cuánto cuesta realmente poner un agente en producción', why: 'nadie muestra el costo total', channel_suggestion: 'linkedin_page' }] };
const COMPS = [{ id: 'k1', slug: 'vambe', name: 'Vambe' }, { id: 'k2', slug: 'iautomatiza', name: 'IAutomatiza' }];
o = exec({ action: 'competitor_report', report: REPORT, signals_submitted: 2 }, { existing: [], competitors: COMPS });
t('competitor_report: válido => guarda el reporte y marca last_scanned_at solo de los escaneados', o.resp.ok && wr(o, /^content_intel_reports/).length === 1 && wr(o, /content_competitors\?id=eq\.k1/).length === 1 && wr(o, /content_competitors\?id=eq\.k2/).length === 0 && wr(o, /^content_intel_reports/)[0].body.signals_submitted === 2);
t('competitor_report: mismo run_id => no duplica', exec({ action: 'competitor_report', report: REPORT }, { existing: [{ id: 'x' }], competitors: COMPS }).resp.duplicate === true);
t('competitor_report: sin páginas leídas o competidor desconocido => rechaza', exec({ action: 'competitor_report', report: { ...REPORT, competitors: [{ slug: 'vambe', pages_read: [] }] } }, { competitors: COMPS }).resp.error === 'reporte_invalido' && exec({ action: 'competitor_report', report: { ...REPORT, competitors: [{ slug: 'fantasma', pages_read: ['https://x.com'] }] } }, { competitors: COMPS }).resp.error === 'competidor_desconocido');
o = exec({ action: 'competitors_list' }, { competitors: [{ slug: 'vambe', name: 'Vambe', domain: 'vambe.ai', urls: ['https://www.vambe.ai'], enabled: true }, { slug: 'off', name: 'Off', enabled: false }], reports: [{ run_id: 'r', created_at: iso(3), competitors_scanned: ['vambe'], report: { gaps: ['x'], saturated_topics: ['y'] } }] });
t('competitors_list: solo activos, con el último reporte', o.resp.competitors.length === 1 && o.resp.last_report.gaps[0] === 'x');

// ---- señales candidatas (insumo de las piezas)
o = exec({ action: 'signals_candidates' }, { signals: [{ id: 's1', signal_type: 'news', signal_score: 91, title: 'n8n 2.43.1', url: 'https://x/n8n', summary: 'Resumen', signal: { source: 'n8n', date: '2026-10-07', quote: 'cita literal', why_it_matters: 'porque sí', angle: 'ángulo', audience: 'pymes', channel_suggestion: 'linkedin_page' } }], pending: [{}, {}], recent: [{ topic: 'Tema viejo', channel: 'linkedin_page', status: 'scheduled', hook: 'Hook viejo' }] });
t('signals_candidates: trae cita, ángulo y canal sugerido, lo ya cubierto y si la cola permite piezas', o.resp.count === 1 && o.resp.signals[0].quote === 'cita literal' && o.resp.signals[0].channel_suggestion === 'linkedin_page' && o.resp.already_covered[0].topic === 'Tema viejo' && o.resp.pieces_allowed === true && o.resp.pending_in_review === 2);
o = exec({ action: 'signals_candidates' }, { signals: [{ id: 's2', source_key: 'hermes_research:https://x/2#abcd1234', signal_type: 'news', signal_score: 90, title: 'Otra', url: 'https://x/2', summary: 'r', source_date: '2026-09-24', signal: { angle: 'a' }, evidence: [{ url: 'https://x/2', quote: 'cita desde evidence', quote_found: true }] }], pending: [], recent: [] });
t('signals_candidates: la cita verificada vive en evidence (así la guarda el gate de señales) y la fecha en source_date', o.resp.signals[0].quote === 'cita desde evidence' && o.resp.signals[0].quote_verified === true && o.resp.signals[0].date === '2026-09-24');
t('signals_candidates: entrega source_key (la pieza debe copiarlo como key para que su fuente cuente como verificada)', o.resp.signals[0].source_key === 'hermes_research:https://x/2#abcd1234' && /"key"/.test(o.resp.message));
t('signals_candidates: con la cola llena avisa pieces_allowed=false', exec({ action: 'signals_candidates' }, { signals: [], pending: Array.from({ length: 6 }, () => ({})) }).resp.pieces_allowed === false);

// ---- Respond y seguridad
const resp = (planned, applied) => runNode('Respond', { Compute: { resp: { ok: true }, writes: planned }, 'Apply Writes': applied })[0].json;
t('Respond: escritura sin respuesta (red) o HTTP 500 => ok:false con motivo', resp([{}], [{ body: {} }]).ok === false && /sin respuesta/.test(resp([{}], [{ body: {} }]).persist_error) && /HTTP 500/.test(resp([{}], [{ statusCode: 500, body: { m: 1 } }]).persist_error) && resp([{}], [{ statusCode: 204 }]).ok === true);
t('toda respuesta declara que no publica ni contacta', exec({ action: 'queue_status' }).resp.safety.published === 0 && exec({ action: 'queue_status' }).resp.safety.contacted === 0);
t('el workflow no habla con GHL, Gmail ni Waalaxy', !/leadconnectorhq|gmail|waalaxy/i.test(JSON.stringify(wf)));
t('las escrituras reintentan 3 veces y las lecturas no cortan el flujo', wf.nodes.find((n) => n.name === 'Apply Writes').maxTries === 3 && wf.nodes.find((n) => n.name === 'Read').continueOnFail === true);
t('el probe de URL no lleva credenciales (no envía llaves a sitios externos)', !wf.nodes.find((n) => n.name === 'Probe URL').credentials);
console.log(pass, 'ok', fail, 'fallos');
process.exit(fail ? 1 : 0);
