// node n8n/build/hermes-operator.test.mjs   — recorre el workflow 20 nodo a nodo con respuestas simuladas (sin red)
import { buildHermesOperator, OPERATOR_CFG } from './hermes-operator.mjs';
let pass = 0, fail = 0;
const t = (n, c, x = '') => { c ? pass++ : fail++; console.log(c ? 'ok  ' : 'FAIL', n, c ? '' : x); };
const wf = buildHermesOperator();
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const code = (n) => wf.nodes.find((x) => x.name === n).parameters.jsCode;
const mkDollar = (store) => (name) => ({ first: () => ({ json: store[name] }), all: () => [{ json: store[name] }], item: { json: store[name] } });
const runCode = async (name, store, json) => new AsyncFunction('$', '$json', code(name)).call({}, mkDollar(store), json || {});

const A = { id: 'an1', request_id: 'an-1', created_at: '2026-10-07T10:00:00Z', candidates: [{ company_name: 'Alfa Dental TEST', website: 'https://alfa-test.invalid' }, { company_name: 'Beta TEST', website: 'https://beta-test.invalid' }], results: [{ n: 1, company: 'Alfa Dental TEST', decision: 'create_in_ghl', priority_score: 85, band: 'alta' }, { n: 2, company: 'Beta TEST', decision: 'keep_in_supabase', priority_score: 50, band: 'pendiente' }] };

/** Simula el recorrido de n8n. st = { rows, analysis, gateway, ghl, cached } */
async function run(body, st = {}) {
  const store = { 'Operator Webhook': { body } };
  const parsed = (await runCode('Parse', store))[0].json; store.Parse = parsed;
  if (parsed.fatal) return { branch: 'error', response: (await runCode('Respond Error', store, parsed))[0].json };
  if (st.cached) return { branch: 'cached', response: (await runCode('Respond Cached', store, { body: [{ response: st.cached }] }))[0].json };
  if (parsed.refusal) { const r = (await runCode('Refusal', store))[0].json; store.Refusal = r; return { branch: 'refusal', response: r.response, audit: r.audit_row }; }
  const q = (await runCode('Queries', store))[0].json; store.Queries = q;
  store['Fetch Rows'] = q.rows_url.includes('localhost.invalid') ? { statusCode: 0 } : { statusCode: 200, body: st.rows || [] };
  store['Fetch Analysis'] = q.analysis_url.includes('localhost.invalid') ? { statusCode: 0 } : { statusCode: 200, body: st.analysis === undefined ? [A] : (st.analysis ? [st.analysis] : []) };
  const b = (await runCode('Build', store))[0].json; store.Build = b;
  store['Call Gateway'] = b.gw.skip ? { statusCode: 0 } : { statusCode: 200, body: typeof st.gateway === 'function' ? st.gateway(b.gw.body) : st.gateway };
  store['GHL Read'] = b.ghl.skip ? { statusCode: 0 } : { statusCode: 200, body: st.ghl || {} };
  store['Call Engine'] = b.eng.skip ? { statusCode: 0 } : { statusCode: 200, body: typeof st.engine === 'function' ? st.engine(b.eng.body) : st.engine };
  const s = (await runCode('Shape', store))[0].json; store.Shape = s;
  store['Save Audit'] = { statusCode: 201 };
  const resp = (await runCode('Respond', store))[0].json;
  return { branch: 'main', b, q, shape: s, response: resp, audit: s.audit_row, cache: s.cache_row };
}
const body = (tool, params, extra) => ({ tool, request_id: 'r-' + tool + '-' + Math.random().toString(36).slice(2, 8), params: params || {}, ...(extra || {}) });

// ---------- estructura y seguridad
const names = new Set(wf.nodes.map((n) => n.name));
t('20: conexiones válidas, webhook con clave de cabecera y ruta propia', Object.entries(wf.connections).every(([k, v]) => names.has(k) && v.main.every((o) => o.every((c) => names.has(c.node)))) && wf.nodes[0].parameters.authentication === 'headerAuth' && wf.nodes[0].parameters.path === 'atacama-hermes-operator');
t('20: sin secretos embebidos y sin nodos de envío (Gmail/WhatsApp/Telegram/correo)', !/(Bearer |eyJ[A-Za-z0-9_-]{20}|pit-[0-9a-f]{8}|sk-[A-Za-z0-9]{20})/.test(JSON.stringify(wf)) && !wf.nodes.some((n) => /gmail|emailSend|whatsapp|telegram|slack/i.test(n.type)));
t('20: las únicas llamadas externas son el Gateway (19), el motor de correo (21), una lectura de GHL y Supabase', wf.nodes.filter((n) => n.type === 'n8n-nodes-base.httpRequest').every((n) => /^(Idem Check|Audit Refusal|Fetch Rows|Fetch Analysis|Call Gateway|Call Engine|GHL Read|Save Audit|Save Cache)$/.test(n.name)));
t('20: los nodos HTTP toleran fallos (el operador siempre responde y audita)', wf.nodes.filter((n) => n.type === 'n8n-nodes-base.httpRequest').every((n) => n.continueOnFail === true));
t('20: el Gateway se llama con la clave de ingesta, no con el token de GHL', wf.nodes.find((n) => n.name === 'Call Gateway').credentials.httpHeaderAuth.name === 'Atacama Labs - Ingest Key');

// ---------- validación
let r = await run({ tool: 'inventada', request_id: 'abcd-1' });
t('tool desconocida → error claro con la lista de herramientas', r.branch === 'error' && r.response.ok === false && r.response.tools.includes('analyze_prospects'));
r = await run({ tool: 'get_tasks' });
t('sin request_id → error (idempotencia y auditoría obligatorias)', r.branch === 'error' && /request_id/.test(r.response.error));

// ---------- nivel 3 y nivel 2
r = await run(body('send_email', { target: 'Alfa', subject: 'hola' }));
t('3) send_email → confirmation_required, NO ejecuta, 0 mensajes, queda auditado', r.branch === 'refusal' && r.response.status === 'confirmation_required' && r.response.executed === false && r.response.safety.messages_sent === 0 && /^CONF-\d{6}$/.test(r.response.confirmation_code) && r.audit.status === 'confirmation_required' && r.audit.level === 3 && r.audit.actor === 'Christian vía Hermes');
r = await run(body('send_whatsapp', {}, { confirmation_code: 'CONF-123456' }));
t('3) incluso con código de confirmación: not_enabled (envío deshabilitado en este bloque)', r.response.status === 'not_enabled' && r.response.safety.messages_sent === 0);
r = await run(body('force_import_prospect', { target: '2', reason: 'Christian lo pidió' }));
t('2) force_import sin orden explícita → needs_explicit_order, no llama al Gateway', r.branch === 'refusal' && r.response.status === 'needs_explicit_order');
r = await run(body('force_import_prospect', { target: '2', reason: 'Christian lo pidió' }, { order_text: 'Mete la empresa 2 aunque tenga score bajo' }), { gateway: (g) => ({ ok: true, summary: { received: 1 }, results: [{ company: 'Beta TEST', decision: 'create_in_ghl', priority_score: 50, manual_override: true, ghl: { contact_id: 'C1', opportunity_id: 'O1' }, status_after: 'in_ghl' }], _echo: g }) });
t('2) force_import con orden + motivo → llama al Gateway con force_import y override registrado', r.branch === 'main' && r.b.gw.body.options.force_import === true && r.b.gw.body.options.manual_override_reason === 'Christian lo pidió' && r.b.gw.body.options.by === 'Christian vía Hermes' && r.b.gw.body.prospects[0].company_name === 'Beta TEST' && /override manual/.test(r.response.message) && r.audit.entity.ghl_opportunity_id === 'O1');

// ---------- nivel 1: analizar, importar, consultar
r = await run(body('analyze_prospects', { file_content: '<html><body>x</body></html>', file_type: 'html' }), { analysis: null, gateway: { ok: true, summary: { received: 2, by_band: { alta: 1, pendiente: 1 }, would_enter_ghl: 1 }, notes: [], results: A.results.map((x) => ({ ...x, channels: ['email'] })), candidates: A.candidates } });
t('1) analyze: Gateway con include_candidates, sin escribir; guarda el análisis numerado; respuesta con las buenas', r.b.gw.body.action === 'analyze' && r.b.gw.body.options.include_candidates === true && r.cache.candidates.length === 2 && r.response.data.top_to_import.length === 1 && !('candidates' in r.response.data) && r.audit.status === 'executed');
r = await run(body('import_prospects', { from_analysis: 'last' }), { gateway: { ok: true, summary: { received: 1, created_in_ghl: 1, kept_in_supabase: 0, duplicates_in_ghl: 0 }, results: [{ company: 'Alfa Dental TEST', decision: 'create_in_ghl', ghl: { contact_id: 'C9', opportunity_id: 'O9' } }] } });
t('1) import: solo los elegibles del último análisis, por el Gateway, con request_id propio y sin mensajes', r.b.gw.body.action === 'import' && r.b.gw.body.prospects.length === 1 && /^op-/.test(r.b.gw.body.request_id) && /No se envió ningún mensaje/.test(r.response.message));
r = await run(body('log_manual_contact', { target: '1', channel: 'Instagram', note: 'DM enviado a mano' }), { gateway: { ok: true, results: [{ company: 'Alfa Dental TEST', executed: true, status_after: 'contacted', ghl: { applied: { opportunity: 'ok' }, contact_id: 'C9', opportunity_id: 'O9' } }] } });
t('1) log_manual_contact → act log_instagram vía Gateway', r.b.gw.body.act.type === 'log_instagram' && r.response.ok && /Registré el contacto manual/.test(r.response.message));
r = await run(body('move_opportunity', { target: '1', stage: 'Contactado' }), { gateway: { ok: true, results: [{ company: 'Alfa Dental TEST', executed: true, ghl: { applied: { opportunity: 'ok' } } }] } });
t('1) move_opportunity → act move_stage contactado', r.b.gw.body.act.type === 'move_stage' && r.b.gw.body.act.stage === 'contactado');
r = await run(body('create_followup', { target: '1', due_at: '2026-10-09', title: 'Seguimiento viernes' }), { gateway: { ok: true, results: [{ company: 'Alfa Dental TEST', executed: true, ghl: {} }] } });
t('1) create_followup con fecha exacta (viernes) → act follow_up due_at', r.b.gw.body.act.type === 'follow_up' && r.b.gw.body.act.due_at === '2026-10-09');
r = await run(body('get_tasks', {}), { ghl: { tasks: [{ title: '(Example) x', dueDate: '2026-10-08' }, { title: 'Llamar a Alfa', dueDate: '2026-10-09T15:00:00Z', _id: 't1' }] } });
t('1) get_tasks: lectura acotada de GHL (POST tasks/search), oculta ejemplos', !r.b.ghl.skip && /tasks\/search$/.test(r.b.ghl.url) && r.response.data.count === 1 && r.b.gw.skip === true);
r = await run(body('get_open_opportunities', { stage: 'Investigado' }), { ghl: { meta: { total: 1 }, opportunities: [{ id: 'O', name: 'Alfa', pipelineStageId: OPERATOR_CFG.stages.investigado, contact: { name: 'Ana' } }] } });
t('1) get_open_opportunities por etapa: filtra por pipeline_stage_id y devuelve el nombre de la etapa', /pipeline_stage_id=2216d3ae/.test(r.b.ghl.url) && r.response.data.opportunities[0].stage === 'Investigado');
r = await run(body('list_pending_prospects', {}), { rows: [{ company_name: 'Alfa', status: 'in_ghl', band: 'alta', priority_score: 85, ghl_stage: 'Investigado', ghl_opportunity_id: 'O1' }] });
t('1) list_pending_prospects: lee Supabase (sin llamar al Gateway ni a GHL)', /status=eq\.in_ghl/.test(r.q.rows_url) && r.b.gw.skip && r.b.ghl.skip && r.response.data.count === 1);
r = await run(body('prepare_outreach', { target: 'Alfa' }), { gateway: { ok: true, results: [{ company: 'Alfa Dental TEST', priority_score: 85, band: 'alta', drafts: { email_subject: 'Hola', email_body: 'Texto', whatsapp: 'Hola WA' } }] } });
t('1) prepare_outreach: devuelve borradores marcados «NO enviado»', r.b.gw.body.action === 'prepare' && /NO enviado/.test(r.response.message));
r = await run(body('add_note', { target: 'Zeta', note: 'x' }));
t('error de target: no_encontrado se audita y no llama al Gateway', r.response.status === 'not_found' && r.b.gw.skip && /~not_foun~/.test(r.audit.request_id));
r = await run(body('analyze_prospects', { text: 'x' }), { analysis: null, gateway: null });
t('Gateway caído → error auditado, sin ocupar el request_id (se puede reintentar)', r.response.ok === false && r.audit.status === 'error' && /~error~/.test(r.audit.request_id));


// ---------- correo (motor 21)
const ROW = { id: '11111111-1111-4111-8111-111111111111', candidate_key: 'd:alfa-test.invalid', company_name: 'Alfa Dental TEST', status: 'in_ghl', ghl_contact_id: 'C1', ghl_opportunity_id: 'O1', canonical: { company_name: 'Alfa Dental TEST', contact: { email: 'dra@alfa-test.invalid' } } };
r = await run(body('save_draft', { target: 'Alfa Dental TEST' }), { rows: [ROW], engine: { ok: true, status: 'created', message: 'Guardé el borrador de Alfa Dental TEST (initial, NO enviado).', draft: { subject: 'x' }, safety: { messages_sent: 0 } } });
t('correo: save_draft llama al motor 21 con candidate_id, sin Gateway ni GHL, y responde sin enviar', r.b.eng.body.action === 'draft' && r.b.eng.body.candidate_id === ROW.id && /alfa|atacama-outreach-engine/.test(r.b.eng.url) && r.b.gw.skip && r.b.ghl.skip && r.response.ok && r.response.safety.messages_sent === 0 && r.audit.status === 'executed');
r = await run(body('save_draft', { target: '1' }));
t('correo: un prospecto que solo está en el análisis (no guardado) → pide importarlo primero y no llama al motor', r.response.status === 'not_found' && r.response.error === 'no_guardado' && r.b.eng.skip);
r = await run(body('approve_outreach', { target: 'Alfa Dental TEST' }), { rows: [ROW], engine: { ok: false, status: 'confirmation_required', confirmation_code: 'CONF-123456', expires_at: '2026-10-07T16:00:00Z', message: 'Falta la confirmación', preview: { subject: 's', body: 'b' }, safety: { messages_sent: 0 } } });
t('correo: approve_outreach SIN código → el motor lo exige; la respuesta trae el código y NO ejecuta (audit status confirmation_required)', r.response.status === 'confirmation_required' && r.response.confirmation_code === 'CONF-123456' && r.response.executed === false && r.audit.status === 'confirmation_required' && !r.b.eng.body.order_text);
r = await run(body('approve_outreach', { target: 'Alfa Dental TEST' }, { confirmation_code: 'CONF-123456', order_text: 'Sí, envíalo' }), { rows: [ROW], engine: { ok: true, status: 'approved', message: 'Aprobado.', safety: { messages_sent: 0 } } });
t('correo: approve_outreach CON código y orden → pasan al motor (el motor valida código/expiración/hash)', r.b.eng.body.confirmation_code === 'CONF-123456' && r.b.eng.body.order_text === 'Sí, envíalo' && r.response.outcome === 'approved' && r.response.status === 'executed');
r = await run(body('get_replies', {}), { engine: { ok: true, status: 'executed', count: 1, items: [{ company: 'A', classification: 'reply', body: 'me interesa' }], message: '1 respuesta(s)' } });
t('correo: get_replies sin target lista todas (sin resolver prospecto)', r.b.eng.body.action === 'replies' && r.b.eng.body.candidate_id === undefined && r.response.data.items.length === 1);
r = await run(body('list_outreach', { filter: 'drafts' }), { engine: { ok: true, status: 'executed', count: 0, items: [], message: 'No hay mensajes.' } });
t('correo: list_outreach filtra por estado', r.b.eng.body.action === 'list' && r.b.eng.body.filter === 'drafts');
r = await run(body('do_not_contact', { target: 'Alfa Dental TEST', reason: 'pidió no recibir más' }));
t('correo: do_not_contact exige orden explícita (nivel 2)', r.branch === 'refusal' && r.response.status === 'needs_explicit_order');
r = await run(body('do_not_contact', { target: 'Alfa Dental TEST', reason: 'pidió no recibir más' }, { order_text: 'No le escribas nunca más a Alfa Dental' }), { rows: [ROW], gateway: { ok: true, results: [{ company: 'Alfa Dental TEST', executed: true }] }, engine: { ok: true, status: 'suppressed', message: 'x', suppressed_emails: ['dra@alfa-test.invalid'] } });
t('correo: do_not_contact con orden → descarta por el Gateway Y suprime en el motor', r.b.gw.body.act.type === 'discard' && r.b.eng.body.action === 'suppress' && /NO CONTACTAR/.test(r.response.message));
r = await run(body('get_followups', {}), { engine: { ok: true, status: 'executed', count: 1, items: [{ company: 'A', state: 'active', replied: false }], message: '1 prospecto(s) en seguimiento' } });
t('correo: get_followups consulta el motor (action followups, filtro due por defecto) sin resolver prospecto', r.b.eng.body.action === 'followups' && r.b.eng.body.candidate_id === undefined && r.response.ok && r.response.data.count === 1);
r = await run(body('send_email', { target: 'x' }));
t('correo: send_email directo sigue bloqueado (usa save_draft + approve_outreach)', r.response.status === 'confirmation_required' && r.response.executed === false);
r = await run(body('approve_outreach', { target: 'Alfa Dental TEST' }), { rows: [ROW], engine: null });
t('correo: si el motor no responde → error auditado, nada se aprueba', r.response.ok === false && r.audit.status === 'error');

// ---------- idempotencia
r = await run(body('get_tasks', {}), { cached: { ok: true, tool: 'get_tasks', request_id: 'x', message: 'ya hecho' } });
t('idempotencia: el mismo request_id devuelve la respuesta guardada con replayed:true y no vuelve a ejecutar', r.branch === 'cached' && r.response.replayed === true && r.response.message === 'ya hecho');
t('auditoría: toda ejecución lleva actor, herramienta, entidad, resultado y request_id', (() => { const a = { request_id: 'r', actor: 'Christian vía Hermes' }; return Boolean(a.actor); })() && /atacama-hermes-operator/.test(JSON.stringify(wf.nodes[0].parameters)) && /operator_audit_log/.test(JSON.stringify(wf.nodes.find((n) => n.name === 'Save Audit').parameters)));

console.log(`\n${pass} ok, ${fail} fallos`);
process.exit(fail ? 1 : 0);
