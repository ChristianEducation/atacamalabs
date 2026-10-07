// node n8n/build/prospect-gateway.test.mjs   (opcional: GATEWAY_REAL_HTML=<ruta al HTML real de 140 fichas>)
import fs from 'node:fs';
import { buildProspectGateway, GATEWAY_CFG, PACKS } from './prospect-gateway.mjs';
let pass = 0, fail = 0;
const t = (n, c, x = '') => { c ? pass++ : fail++; console.log(c ? 'ok  ' : 'FAIL', n, c ? '' : x); };
const wf = buildProspectGateway('real');
const wfT = buildProspectGateway('test');
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const code = (n, w = wf) => w.nodes.find((x) => x.name === n).parameters.jsCode;
const mkDollar = (store, lists = {}) => (name) => ({ first: () => ({ json: store[name] }), all: () => (lists[name] || []).map((json) => ({ json })), item: { json: store[name] } });
const runCode = async (name, store, lists, json, httpRequest, w = wf) => new AsyncFunction('$', '$json', code(name, w)).call({ helpers: { httpRequest: httpRequest || (async () => ({ statusCode: 404, body: '' })) } }, mkDollar(store, lists), json || {});
const emptyLookup = { statusCode: 200, body: [] };
const ghlEmpty = { statusCode: 200, body: { contacts: [], meta: { total: 0 } } };
const oppsEmpty = { statusCode: 200, body: { opportunities: [], meta: { total: 0 } } };
const defaultGhl = (op) => (op.kind === 'contact_create' ? { statusCode: 201, body: { contact: { id: 'GC-' + op.ref } } } : op.kind === 'opp_create' ? { statusCode: 201, body: { opportunity: { id: 'GO-' + op.ref } } } : { statusCode: 201, body: {} });

/** Recorre el workflow como lo haría n8n (con respuestas simuladas de Supabase y GHL). */
async function pipeline(body, st = {}, w = wf) {
  const store = { 'Gateway Webhook': { body } };
  const parsed = (await runCode('Parse', store, {}, null, st.httpRequest, w))[0].json; if (parsed.fatal) throw new Error(parsed.fatal); store.Parse = parsed;
  if (st.cached) return { parsed, cached: (await runCode('Respond Cached', store, {}, { body: [{ response: st.cached }] }, null, w))[0].json };
  store.Lookup = st.lookup || emptyLookup; store['GHL Contacts'] = st.contacts || ghlEmpty; store['GHL Opps'] = st.opps || oppsEmpty;
  const ev = (await runCode('Evaluate', store, {}, null, null, w))[0].json; store.Evaluate = ev;
  if (ev.req.action === 'analyze') return { parsed, ev, response: (await runCode('Respond Analyze', store, {}, null, null, w))[0].json, s1: [{ kind: 'none' }] };
  const s1 = (await runCode('Plan S1', store, {}, null, null, w)).map((x) => x.json);
  const lists = { 'Plan S1': s1, 'Exec S1': s1.map((op) => (st.ghl || defaultGhl)(op)) };
  const s2 = (await runCode('Plan S2', store, lists, null, null, w)).map((x) => x.json);
  lists['Exec S2'] = s2.map((op) => (st.ghl || defaultGhl)(op));
  const fin = (await runCode('Finalize', store, lists, null, null, w))[0].json;
  return { parsed, ev, s1, s2, fin, response: fin.response };
}
const good = (o = {}) => ({ company_name: 'Clínica Rica TEST', website: 'https://clinicarica-test.invalid', industry: 'Clínica dental', location: 'Santiago', contact: { name: 'Dra. Pérez', role: 'Directora', email: 'dra@clinicarica-test.invalid', whatsapp: '+56 9 5555 0102' },
  facts: ['Ofrece 12 tratamientos con agenda por formulario y WhatsApp en dos sucursales', 'Publica reservas por WhatsApp y cotizaciones por correo'], commercial_hypotheses: ['Recepción repite preguntas antes de agendar'], proposed_solution: 'Agente de recepción que identifica tratamiento y deriva a agenda', evidence_urls: ['https://clinicarica-test.invalid'], ...o });

// ---------- estructura y seguridad
const names = new Set(wf.nodes.map((n) => n.name));
t('19: conexiones válidas y webhook autenticado por cabecera', Object.entries(wf.connections).every(([k, v]) => names.has(k) && v.main.every((o) => o.every((c) => names.has(c.node)))) && wf.nodes[0].parameters.authentication === 'headerAuth' && wf.nodes[0].parameters.path === 'atacama-prospect-gateway' && wfT.nodes[0].parameters.path.endsWith('-test'));
t('19: sin secretos embebidos y sin nodos de envío (Gmail/WhatsApp/Telegram/correo)', !/(Bearer |eyJ[A-Za-z0-9_-]{20}|pit-[0-9a-f]{8}|sk-[A-Za-z0-9]{20})/.test(JSON.stringify(wf)) && !wf.nodes.some((n) => /gmail|emailSend|whatsapp|telegram|slack/i.test(n.type)));
const ghlN = wf.nodes.filter((n) => n.type === 'n8n-nodes-base.httpRequest' && /leadconnectorhq|\$json\.url/.test(JSON.stringify(n.parameters)));
t('19: GHL solo con GET de lectura y el ejecutor genérico (que solo recibe operaciones planificadas)', ghlN.every((n) => n.parameters.method === 'GET' || /Exec S/.test(n.name)));
t('19: cada ejecutor tolera fallos y el «skip» no llama a ninguna API real', wf.nodes.filter((n) => /Exec S/.test(n.name)).every((n) => n.continueOnFail === true && /localhost\.invalid/.test(n.parameters.url)));
t('19: el modo test usa otro pack (aislamiento) y otra ruta', code('Parse', wfT).includes(PACKS.test) && code('Parse').includes(PACKS.real) && PACKS.test !== PACKS.real);

// ---------- validación de entrada
const err = async (body) => { try { await pipeline(body); return null; } catch (e) { return e.message; } };
t('acción inválida => error', /action inválida/.test(await err({ action: 'borrar', prospects: [good()] })));
t('import/prepare/act sin request_id => error (idempotencia obligatoria); analyze no lo exige', /request_id obligatorio/.test(await err({ action: 'import', prospects: [good()] })) && (await err({ action: 'analyze', prospects: [good()] })) === null);
t('pack equivocado => error de seguridad', /SEGURIDAD/.test(await err({ action: 'analyze', icp_pack_id: 'otro', prospects: [good()] })));
t('FORCE_IMPORT sin motivo => error; solo aplica a import', /manual_override_reason/.test(await err({ action: 'import', request_id: 'x-1234', options: { force_import: true }, prospects: [good()] })) && /solo aplica a action=import/.test(await err({ action: 'prepare', request_id: 'x-1234', options: { force_import: true, manual_override_reason: 'porque sí' }, prospects: [good()] })));
t('lote demasiado grande => error pidiendo dividir; sin prospectos => error', /máximo 25/.test(await err({ action: 'import', request_id: 'x-1234', prospects: Array.from({ length: 26 }, (_, i) => good({ company_name: 'E' + i, website: 'https://e' + i + '.invalid' })) })) && /Sin prospectos/.test(await err({ action: 'analyze' })));

t('errores de validación se devuelven como JSON claro (ok:false) y no como un 500', (() => { const e = wf.nodes.find((n) => n.name === 'Respond Error'); const out = new Function('$json', e.parameters.jsCode)({ fatal: 'request_id obligatorio' })[0].json; return out.ok === false && out.error === 'request_id obligatorio' && out.wrote_nothing === true && wf.connections['Valid?'].main[1][0].node === 'Respond Error'; })());
t('act sin type => error claro', /act\.type obligatorio/.test(await err({ action: 'act', request_id: 'x-1234', targets: [good()] })));

// ---------- A. prospecto individual estructurado (analyze + import)
let r = await pipeline({ action: 'analyze', source: { type: 'ia', name: 'ChatGPT' }, prospects: [good()] });
t('A) ANALYZE de un prospecto individual: clasifica, no escribe nada, score propio', r.response.wrote_nothing === true && r.response.results[0].band === 'alta' && r.response.results[0].decision === 'create_in_ghl' && r.response.results[0].priority_score >= 80 && r.s1[0].kind === 'none');
r = await pipeline({ action: 'import', request_id: 'imp-0001', source: { type: 'ia', name: 'ChatGPT' }, prospects: [good()] });
t('A) IMPORT: contacto → oportunidad en Investigado → nota; fila en Supabase en in_ghl; bitácora con request_id', r.s1[0].kind === 'contact_create' && r.s2.some((o) => o.kind === 'opp_create' && o.body.pipelineStageId === GATEWAY_CFG.stages.investigado) && r.s2.some((o) => o.kind === 'note_create') && r.fin.rows[0].status === 'in_ghl' && r.fin.log.request_id === 'imp-0001' && r.response.summary.created_in_ghl === 1 && r.response.safety.messages_sent === 0);

// ---------- B. lista JSON con casos mixtos (alta, 60–79, <40, sin email, sin buyer nominal)
const lista = [
  good(),
  { company_name: 'Hotel Medio TEST', website: 'https://hotelmedio-test.invalid', industry: 'Hotel boutique', location: 'Pucón', contact: { email: 'info@hotelmedio-test.invalid' }, facts: ['Hotel boutique con canal propio y correo visible'], inferences: ['Consultas repetitivas de fechas'], commercial_hypotheses: ['Seguimiento manual fuera de horario'] },
  { company_name: 'Taller Sin Email TEST', website: 'https://tallersinemail-test.invalid', industry: 'Taller mecánico', location: 'Calama', contact: { phone: '+56 9 8888 1111' }, facts: ['Ofrece cotizaciones y agenda de horas por teléfono en dos servicios'], commercial_hypotheses: ['Cotizaciones repetitivas'], proposed_solution: 'Agente que ordena cotizaciones y agenda' },
  { company_name: 'Sin Contacto TEST', website: 'https://sincontacto-test.invalid', industry: 'Clínica veterinaria', location: 'Antofagasta', facts: ['Ofrece atención de urgencias y agenda de horas en su sitio'], commercial_hypotheses: ['Recepción repite preguntas de vacunas'] },
  { company_name: 'Algo Raro TEST', industry: 'Desconocido', contact: { email: 'x@gmail.com' } },
];
r = await pipeline({ action: 'analyze', source: { type: 'json', name: 'lista de prueba' }, prospects: lista });
const by = Object.fromEntries(r.response.results.map((x) => [x.company, x]));
t('B) lista JSON: alta / válido / sin canal (pendiente) / archivo', by['Clínica Rica TEST'].band === 'alta' && by['Hotel Medio TEST'].band === 'valida' && by['Hotel Medio TEST'].priority_score >= 60 && by['Sin Contacto TEST'].band === 'pendiente' && by['Algo Raro TEST'].band === 'archivo' && by['Algo Raro TEST'].decision === 'archive', JSON.stringify(r.response.results.map((x) => [x.company, x.priority_score, x.band, x.decision])));
t('B) empresa sin email pero con teléfono y empresa sin buyer nominal: igual contactables y entran (60+)', by['Taller Sin Email TEST'].decision === 'create_in_ghl' && by['Taller Sin Email TEST'].channels.join() === 'phone' && by['Hotel Medio TEST'].decision === 'create_in_ghl');
t('B) empresa sin ningún canal: nunca pasa de 59 y se queda en Supabase con el motivo', by['Sin Contacto TEST'].priority_score <= 59 && by['Sin Contacto TEST'].decision === 'keep_in_supabase' && by['Sin Contacto TEST'].reasons.includes('sin_canal_de_contacto'));
r = await pipeline({ action: 'import', request_id: 'imp-0002', source: { type: 'json', name: 'lista de prueba' }, prospects: lista });
t('B) IMPORT de la lista: entran 3 a GHL, 1 solo Supabase, 1 archivada; dos hechos con distintos estados', r.s1.filter((o) => o.kind === 'contact_create').length === 3 && r.fin.rows.length === 5 && r.fin.rows.filter((x) => x.status === 'in_ghl').length === 3 && r.fin.rows.filter((x) => x.status === 'archived').length === 1 && r.fin.rows.filter((x) => x.status === 'accepted').length === 1);

// ---------- C. duplicado
const dupContacts = { statusCode: 200, body: { contacts: [{ id: 'REAL1', email: 'dra@clinicarica-test.invalid', contactName: 'Contacto real' }], meta: { total: 1 } } };
r = await pipeline({ action: 'import', request_id: 'imp-0003', prospects: [good()] }, { contacts: dupContacts });
t('C) DUPLICADO en GHL: devuelve el estado existente; no crea ni modifica nada', r.response.results[0].decision === 'duplicate_in_ghl' && r.response.results[0].existing[0].id === 'REAL1' && r.s1[0].kind === 'noop' && r.s2[0].kind === 'noop' && r.fin.rows.length === 0 && r.response.summary.duplicates_in_ghl === 1);
const dupSb = { statusCode: 200, body: [{ system: 'supabase_candidate', id: 'SB1', keys: ['d:clinicarica-test.invalid'], info: { candidate_key: 'd:clinicarica-test.invalid', company: 'Clínica Rica TEST', status: 'in_ghl', ghl_contact_id: 'GC9', ghl_opportunity_id: 'GO9', canonical: { company_name: 'Clínica Rica TEST', contact: { email: 'dra@clinicarica-test.invalid' }, facts: ['Hecho previo'] } } }] };
r = await pipeline({ action: 'import', request_id: 'imp-0004', prospects: [good()] }, { lookup: dupSb });
t('C) Ya existente en Supabase y en GHL por nuestra propia creación: no se crea otra oportunidad; se conservan los ids y se suman hechos', r.s1[0].kind === 'noop' && r.s2[0].kind === 'noop' && r.fin.rows[0].ghl_opportunity_id === 'GO9' && r.fin.rows[0].status === 'in_ghl' && r.fin.rows[0].canonical.facts.length === 3, JSON.stringify(r.fin.rows[0] && r.fin.rows[0].canonical.facts));

// ---------- D. reintento idempotente (misma request_id)
r = await pipeline({ action: 'import', request_id: 'imp-0001', prospects: [good()] }, { cached: { ok: true, action: 'import', request_id: 'imp-0001', summary: { created_in_ghl: 1 } } });
t('D) REINTENTO con el mismo request_id: devuelve la respuesta almacenada (replayed) sin ejecutar nada', r.cached.replayed === true && r.cached.summary.created_in_ghl === 1 && /idempotencia/.test(r.cached.note));

// ---------- E. FORCE_IMPORT
r = await pipeline({ action: 'import', request_id: 'imp-0005', options: { force_import: true, manual_override_reason: 'Me interesa igual, es de un conocido', by: 'Christian' }, prospects: [lista[3]] });
t('E) FORCE_IMPORT: entra a GHL con score bajo; queda manual_override=true, por quién y por qué', r.fin.rows[0].manual_override === true && r.fin.rows[0].manual_override_by === 'Christian' && r.fin.rows[0].manual_override_reason.includes('conocido') && r.fin.rows[0].status === 'in_ghl' && r.response.results[0].priority_score <= 59);
r = await pipeline({ action: 'import', request_id: 'imp-0006', options: { force_import: true, manual_override_reason: 'Me interesa igual' }, prospects: [good()] }, { contacts: dupContacts });
t('E) FORCE_IMPORT NO salta el dedupe: con contacto real existente no crea nada', r.s1[0].kind === 'noop' && r.fin.rows.length === 0 && r.response.results[0].decision === 'duplicate_in_ghl');

// ---------- F. comandos act
const existing = { lookup: { statusCode: 200, body: [{ system: 'supabase_candidate', id: 'SB1', keys: ['d:clinicarica-test.invalid'], info: { candidate_key: 'd:clinicarica-test.invalid', company: 'Clínica Rica TEST', status: 'in_ghl', ghl_contact_id: 'GC1', ghl_opportunity_id: 'GO1', canonical: good() } }] } };
r = await pipeline({ action: 'act', request_id: 'act-0001', act: { type: 'log_instagram', note: 'Le escribí por DM' }, targets: [{ company_name: 'Clínica Rica TEST', website: 'https://clinicarica-test.invalid' }] }, existing);
t('F) «Le escribí por Instagram»: canal=instagram, fecha, etapa Contactado, nota y tarea de seguimiento; sin crear oportunidad nueva ni enviar nada', r.fin.rows[0].last_contact_channel === 'instagram' && !!r.fin.rows[0].last_contact_at && r.fin.rows[0].status === 'contacted' && r.s2.some((o) => o.kind === 'opp_update' && o.body.pipelineStageId === GATEWAY_CFG.stages.contactado) && r.s2.some((o) => o.kind === 'task_create') && !r.s2.some((o) => o.kind === 'opp_create') && r.response.safety.messages_sent === 0);
r = await pipeline({ action: 'act', request_id: 'act-0002', act: { type: 'send_email', subject: 'Hola', body: 'Texto' }, targets: [{ website: 'https://clinicarica-test.invalid', email: 'dra@clinicarica-test.invalid', company_name: 'Clínica Rica TEST' }] }, existing);
t('F) send_email NO se ejecuta (interfaz diseñada: executed=false, not_enabled) y no genera operaciones', r.response.results[0].executed === false && r.response.results[0].act_status === 'not_enabled' && r.s2[0].kind === 'noop' && r.fin.rows.length === 0);
r = await pipeline({ action: 'act', request_id: 'act-0003', act: 'discard', params: { reason: 'No es el perfil' }, targets: ['https://clinicarica-test.invalid'] }, existing);
t('F) act como texto + params; discard marca descartado', r.fin.rows[0].status === 'discarded');
r = await pipeline({ action: 'act', request_id: 'act-0004', act: { type: 'log_phone' }, targets: [good()] });
t('F) act log_phone sobre un prospecto aún no creado: lo crea directamente en Contactado y registra el canal (entrada manual explícita)', r.s1[0].kind === 'contact_create' && r.s2.some((o) => o.kind === 'opp_create' && o.body.pipelineStageId === GATEWAY_CFG.stages.contactado) && r.fin.rows[0].last_contact_channel === 'phone');

// ---------- G. PREPARE
r = await pipeline({ action: 'prepare', request_id: 'prep-0001', prospects: [good()] });
t('G) PREPARE: email + WhatsApp en borrador, guardados; no toca GHL', r.fin.rows[0].drafts.email_body.includes('hipótesis') && r.s1[0].kind === 'noop' && r.s2[0].kind === 'noop' && r.response.results[0].drafts.never_sent === true);

// ---------- H. formatos HTML / CSV / texto / URL
const fixture = fs.readFileSync(new URL('../../scripts/prospecting/fixtures/prospects-sample.html', import.meta.url), 'utf8');
r = await pipeline({ action: 'analyze', source: { type: 'html', name: 'fixture sintético' }, html: fixture });
t('H) HTML (4 formatos): 7 fichas analizadas; el score externo se conserva solo como referencia', r.response.summary.received === 7 && r.response.results.some((x) => x.external_score && /solo referencia/.test(x.external_score.note)) && r.parsed.notes[0] === 'html: 7 fichas');
t('H) HTML: la ficha sin ningún dato de contacto (Veterinaria Fantasma) nunca llega a GHL; la clínica con WhatsApp y correo sí', r.response.results.find((x) => x.company === 'Veterinaria Fantasma').decision !== 'create_in_ghl' && r.response.results.find((x) => x.company === 'Clínica Dental Ejemplo').decision === 'create_in_ghl');
r = await pipeline({ action: 'analyze', csv: 'empresa;web;email;telefono;ciudad;rubro;hechos;hipotesis\nTaller Ñandú TEST;tallernandu-test.invalid;ventas@tallernandu-test.invalid;+56 9 8888 1111;Antofagasta;Taller mecánico;Recibe cotizaciones por WhatsApp y agenda de horas;Probablemente clasifica y responde cotizaciones a mano\n' });
t('H) CSV: alias de columnas y señal; contactable', r.response.results[0].company === 'Taller Ñandú TEST' && r.response.results[0].channels.includes('email') && r.response.results[0].decision === 'create_in_ghl');
r = await pipeline({ action: 'analyze', text: 'Empresa: Gimnasio Norte TEST\nWeb: https://gimnasionorte-test.invalid\nCorreo: hola@gimnasionorte-test.invalid\nHechos: agenda de clases por WhatsApp y formulario\nHipótesis: confirmaciones manuales de reservas' });
t('H) texto libre etiquetado', r.response.results[0].company === 'Gimnasio Norte TEST' && r.response.results[0].channels.includes('email'));
const site = '<html><head><title>Clínica Sitio TEST | Ortodoncia</title><meta name="description" content="Agenda tu hora por WhatsApp."></head><body><a href="mailto:contacto@sitio-test.invalid">Escríbenos</a></body></html>';
r = await pipeline({ action: 'analyze', urls: ['https://sitio-test.invalid'] }, { httpRequest: async () => ({ statusCode: 200, body: site }) });
t('H) URL individual: validación ligera (una página), hechos observados del sitio; sin hipótesis inventada → queda pendiente de hipótesis', r.response.results[0].company === 'Clínica Sitio TEST' && r.response.results[0].channels.includes('email') && r.response.results[0].decision === 'keep_in_supabase' && r.response.results[0].reasons.includes('sin_hipotesis_comercial'));
r = await pipeline({ action: 'analyze', options: { validate: 'light' }, prospects: [good({ contact: { name: 'Ana' }, website: 'https://sitio2-test.invalid' })] }, { httpRequest: async () => ({ statusCode: 200, body: site }) });
t('H) validate=light completa el correo desde el sitio oficial sin pisar datos existentes', r.parsed.candidates[0].contact.email === 'contacto@sitio-test.invalid' && r.parsed.candidates[0].site_verified === true && r.parsed.notes.some((n) => /correo hallado/.test(n)));

// ---------- J. salida de Hermes por el Gateway + verificación ligera de citas
const hermesRec = { company: 'Clínica Hermes TEST', domain: 'clinicahermes-test.invalid', city: 'Antofagasta', vertical: 'Salud', signal: 'Recibe solicitudes de hora por WhatsApp y formulario', pain: 'Agenda a mano las solicitudes', offer: 'un agente que ordena solicitudes y agenda', why_now: 'Publicó una vacante de recepcionista', commercial_angle: 'Liberar a recepción de agendar a mano',
  contact: { email: 'contacto@clinicahermes-test.invalid', phone: '+56 55 255 0000', job_title: 'Gerente', source_url: 'https://clinicahermes-test.invalid/c', public: true },
  evidence: [{ factor: 'pain', level: 2, url: 'https://clinicahermes-test.invalid/agenda', quote: 'Agenda tu hora por WhatsApp y te respondemos', finding: 'Reciben solicitudes por WhatsApp', certainty: 'observed' }] };
const pageOk = async () => ({ statusCode: 200, body: '<html><body><p>Agenda tu hora por WhatsApp y te respondemos en el día.</p></body></html>' });
const pageNo = async () => ({ statusCode: 200, body: '<html><body><p>Bienvenidos a nuestra clínica.</p></body></html>' });
r = await pipeline({ action: 'import', request_id: 'her-0001', source: { type: 'hermes', name: 'Hermes Prospect Radar' }, prospects: [hermesRec] }, { httpRequest: pageOk });
t('J) Hermes → Gateway (import usa validación ligera por defecto): la cita se encuentra y sigue siendo HECHO', r.parsed.candidates[0].quote_checks.found === 1 && r.parsed.candidates[0].facts.length === 1 && r.parsed.options.validate === 'light');
r = await pipeline({ action: 'import', request_id: 'her-0002', source: { type: 'hermes', name: 'Hermes Prospect Radar' }, prospects: [hermesRec] }, { httpRequest: pageNo });
t('J) Hermes: si la página no contiene la cita, deja de ser hecho (pasa a inferencia) y se avisa en las notas', r.parsed.candidates[0].facts.length === 0 && r.parsed.candidates[0].inferences.some((x) => /cita no verificada/.test(x)) && r.parsed.notes.some((x) => /no verificada/.test(x)));
r = await pipeline({ action: 'analyze', source: { type: 'hermes', name: 'Hermes' }, prospects: [hermesRec] }, { httpRequest: pageNo });
t('J) ANALYZE no abre páginas por defecto (validate none): rápido y solo lectura', r.parsed.options.validate === 'none' && r.parsed.candidates[0].quote_checks === undefined);

// ---------- I. HTML real (opcional): muestra representativa, sin importar nada
if (process.env.GATEWAY_REAL_HTML && fs.existsSync(process.env.GATEWAY_REAL_HTML)) {
  const real = fs.readFileSync(process.env.GATEWAY_REAL_HTML, 'utf8');
  const big = await runCode('Parse', { 'Gateway Webhook': { body: { action: 'analyze', html: real } } }, {}, null, null, wf);
  t('I) HTML real: 140 fichas parseadas por el workflow', big[0].json.candidates.length === 140 && big[0].json.keys.length > 140, String(big[0].json.candidates.length));
}


// ---------- lote mixto: PostgREST exige filas con las MISMAS claves (bug real hallado en vivo: un lote con contactos creados y otros rechazados por GHL no persistía nada)
{
  const dupGhl = (op) => (op.kind === 'contact_create' && op.ref === 1 ? { statusCode: 400, body: { message: 'duplicate', meta: { contactId: 'EXISTENTE' } } } : defaultGhl(op));
  const mixed = await pipeline({ action: 'import', request_id: 'imp-mixto-1', prospects: [good({ company_name: 'Mixta Uno TEST', website: 'https://mixta1-test.invalid', contact: { name: 'A', email: 'a@mixta1-test.invalid' } }), good({ company_name: 'Mixta Dos TEST', website: 'https://mixta2-test.invalid', contact: { name: 'B', email: 'b@mixta2-test.invalid' } })] }, { ghl: dupGhl });
  const sigs = new Set(mixed.fin.rows.map((x) => Object.keys(x).sort().join(',')));
  const store = { Finalize: mixed.fin };
  const groups = (await runCode('Split Rows', store)).map((x) => x.json.rows);
  t('lote mixto: las filas del lote tienen conjuntos de claves distintos (el caso que rompía el upsert)', mixed.fin.rows.length === 2 && sigs.size === 2, [...sigs].join(' | '));
  t('lote mixto: Split Rows las separa en lotes uniformes y no pierde ninguna fila', groups.length === 2 && groups.every((g) => new Set(g.map((x) => Object.keys(x).sort().join(','))).size === 1) && groups.flat().length === 2);
  t('lote vacío: Split Rows devuelve un lote vacío (no corta el flujo)', (await runCode('Split Rows', { Finalize: { rows: [] } })).length === 1);
  t('Persist se alimenta de Split Rows y Respond revisa TODOS los lotes', wf.connections['Finalize'].main[0][0].node === 'Split Rows' && wf.connections['Split Rows'].main[0][0].node === 'Persist' && code('Respond').includes('$("Persist").all()'));
}

console.log(`\n${pass} ok ${fail} fallos`);
process.exit(fail ? 1 : 0);
