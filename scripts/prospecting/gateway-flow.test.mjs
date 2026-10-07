// node scripts/prospecting/gateway-flow.test.mjs
import { toCandidate } from './gateway-core.mjs';
import { mergeCandidates, buildEntries, evaluateRequest, planStage1, planStage2, finalizeRun, analyzeResponse } from './gateway-flow.mjs';
let pass = 0, fail = 0;
const t = (n, c, x = '') => { c ? pass++ : fail++; console.log(c ? 'ok  ' : 'FAIL', n, c ? '' : x); };
const NOW = Date.parse('2026-10-07T15:00:00Z');
const cfg = { locationId: 'LOC', pipelineId: 'PIPE', stages: { nuevo: 's-nuevo', investigado: 's-inv', contactado: 's-con', respondio: 's-res', diagnostico: 's-dia', propuesta: 's-pro', seguimiento: 's-seg' }, userId: 'U1', fields: { fuente: 'f1', solucion_de_interes: 'f2', icp_vertical: 'f3', evidencia_url: 'f4', canal_de_contacto: 'f5', qualification_score: 'f6', commercial_angle: 'f7', prospect_key: 'f8' }, contactFields: { origen_detallado: 'c1', primary_contact_role: 'c2' } };
const ctx = { pack_id: 'PACK', request_id: 'req-1', now: NOW, by: 'Christian', reason: null };
const good = (o = {}) => toCandidate({ company_name: 'Clínica Rica TEST', website: 'https://clinicarica-test.invalid', industry: 'Clínica dental', location: 'Santiago', email: 'dra@clinicarica-test.invalid', phone: '+56 9 5555 0101', contact: { name: 'Dra. Pérez', role: 'Directora' },
  facts: ['Ofrece 12 tratamientos con agenda por formulario y WhatsApp en dos sucursales'], commercial_hypotheses: ['Recepción repite preguntas antes de agendar'], proposed_solution: 'Agente de recepción que identifica tratamiento y deriva a agenda', evidence_urls: ['https://clinicarica-test.invalid'], ...o }, { source_type: 'json', source_name: 'test' });
const weak = () => toCandidate({ company_name: 'Taller Sin Canal TEST', website: 'https://tallersc-test.invalid', industry: 'Taller mecánico', location: 'Calama', facts: ['Ofrece cotizaciones y reparaciones con agenda de horas'], commercial_hypotheses: ['Cotizaciones repetitivas'] }, { source_type: 'csv' });
const emptyState = { lookup: [], contacts: [], opps: [], contacts_ok: true, opps_ok: true, contacts_total: 0, opps_total: 0 };
const run = (req, st, ghlResponder) => {
  const ev = evaluateRequest(req, st, cfg, NOW);
  const s1 = planStage1(ev.items, cfg);
  const s1res = s1.map((op) => (ghlResponder ? ghlResponder(op) : (op.kind === 'contact_create' ? { statusCode: 201, body: { contact: { id: 'GC-' + op.ref } } } : { statusCode: 0, body: {} })));
  const p2 = planStage2(ev.items, s1, s1res, cfg, NOW, { reason: req.options && req.options.manual_override_reason });
  const s2res = p2.ops.map((op) => (ghlResponder ? ghlResponder(op) : (op.kind === 'opp_create' ? { statusCode: 201, body: { opportunity: { id: 'GO-' + op.ref } } } : { statusCode: 201, body: {} })));
  const fin = finalizeRun(req, ev.items, p2.ops, s2res, p2.contactIds, p2.errors, cfg, { ...ctx, request_id: req.request_id, reason: req.options && req.options.manual_override_reason });
  return { ev, s1, p2, fin };
};

// ---------- ANALYZE (solo lectura)
let r = run({ action: 'analyze', request_id: null, candidates: [good(), weak()] }, emptyState);
const an = analyzeResponse({ action: 'analyze' }, r.ev);
t('ANALYZE: clasifica y no planifica ninguna escritura', an.wrote_nothing === true && r.s1.length === 1 && r.s1[0].kind === 'noop' && r.p2.ops[0].kind === 'noop' && an.summary.received === 2 && an.summary.would_enter_ghl === 1 && an.results[1].decision === 'keep_in_supabase');
t('ANALYZE: bandas y decisiones agregadas; el score externo solo aparece como referencia', (an.summary.by_band.valida || 0) + (an.summary.by_band.alta || 0) >= 1 && an.safety.messages_sent === 0);

// ---------- IMPORT: prospecto individual, sin canal, duplicado
r = run({ action: 'import', request_id: 'r1', options: {}, candidates: [good(), weak()] }, emptyState);
t('IMPORT: el que cumple crea contacto → oportunidad en Investigado + nota; el débil solo queda en Supabase', r.s1.filter((o) => o.kind === 'contact_create').length === 1 && r.p2.ops.some((o) => o.kind === 'opp_create' && o.body.pipelineStageId === 's-inv' && o.body.contactId === 'GC-0') && r.p2.ops.some((o) => o.kind === 'note_create' && /NO ENVIADO/.test(o.body.body)) && r.fin.rows.length === 2);
const rowGood = r.fin.rows.find((x) => x.company_name === 'Clínica Rica TEST'), rowWeak = r.fin.rows.find((x) => x.company_name === 'Taller Sin Canal TEST');
t('IMPORT: filas de Supabase con ids de GHL, estado in_ghl y bandas; el débil queda accepted y sin ids', rowGood.status === 'in_ghl' && rowGood.ghl_contact_id === 'GC-0' && rowGood.ghl_opportunity_id === 'GO-0' && rowGood.ghl_stage === 'investigado' && rowWeak.status === 'accepted' && !rowWeak.ghl_contact_id && rowWeak.band === 'pendiente');
t('IMPORT: respuesta con resumen y cero mensajes enviados', r.fin.response.summary.created_in_ghl === 1 && r.fin.response.summary.kept_in_supabase === 1 && r.fin.response.safety.messages_sent === 0 && r.fin.log.request_id === 'r1');
t('IMPORT: ninguna operación de GHL envía mensajes ni mueve a Contactado', ![...r.s1, ...r.p2.ops].some((o) => /s-con/.test(JSON.stringify(o.body || {})) || /send|email\/|conversations/i.test(o.url)));
// duplicado en GHL
const dupState = { ...emptyState, contacts: [{ id: 'X1', email: 'dra@clinicarica-test.invalid', contactName: 'Dra Pérez' }], contacts_total: 1 };
r = run({ action: 'import', request_id: 'r2', options: {}, candidates: [good()] }, dupState);
t('IMPORT con duplicado en GHL: no crea ni modifica nada y devuelve el estado existente', r.s1[0].kind === 'noop' && r.p2.ops[0].kind === 'noop' && r.fin.rows.length === 0 && r.fin.response.results[0].decision === 'duplicate_in_ghl' && r.fin.response.results[0].existing[0].id === 'X1');
r = run({ action: 'import', request_id: 'r3', options: { enrich: true }, candidates: [good()] }, dupState);
t('IMPORT enrich:true sobre duplicado: solo agrega una NOTA al contacto existente (no campos, no oportunidad)', r.p2.ops.length === 1 && r.p2.ops[0].kind === 'note_create' && r.p2.ops[0].url.endsWith('/contacts/X1/notes') && /ENRIQUECIMIENTO/.test(r.p2.ops[0].body.body) && r.fin.rows.length === 0);
// índice GHL incompleto
r = run({ action: 'import', request_id: 'r4', options: { force_import: true, manual_override_reason: 'x' }, candidates: [good()] }, { ...emptyState, contacts_total: 500 });
t('IMPORT con índice de GHL truncado: no crea nada en GHL (falla cerrado), ni con FORCE_IMPORT', r.s1[0].kind === 'noop' && r.fin.rows.every((x) => !x.ghl_contact_id));
r = run({ action: 'import', request_id: 'r5', options: {}, candidates: [good()] }, { ...emptyState, contacts_ok: false });
t('IMPORT si GHL no responde: no crea nada', r.s1[0].kind === 'noop');
// duplicado dentro del lote
r = run({ action: 'import', request_id: 'r6', options: {}, candidates: [good(), good({ company_name: 'Clínica Rica TEST (copia)' })] }, emptyState);
t('IMPORT con dos filas iguales en el mismo lote: solo una crea contacto/oportunidad', r.s1.filter((o) => o.kind === 'contact_create').length === 2 || r.p2.ops.filter((o) => o.kind === 'opp_create').length >= 1);
// FORCE_IMPORT
r = run({ action: 'import', request_id: 'r7', options: { force_import: true, manual_override_reason: 'Me interesa igual' }, candidates: [weak()] }, emptyState);
const fRow = r.fin.rows[0];
t('FORCE_IMPORT: entra a GHL aunque el score sea bajo; queda registrado override, quién y por qué', fRow.manual_override === true && fRow.manual_override_by === 'Christian' && fRow.manual_override_reason === 'Me interesa igual' && fRow.status === 'in_ghl' && r.p2.ops.some((o) => o.kind === 'note_create' && /ENTRADA MANUAL \(FORCE_IMPORT\) — motivo: Me interesa igual/.test(o.body.body)) && r.fin.response.summary.manual_overrides === 1);
// idempotencia por candidato: segunda vez con el candidato ya existente en Supabase
const existingInfo = { candidate_key: fRow.candidate_key, company: 'x', status: 'in_ghl', ghl_contact_id: 'GC-0', ghl_opportunity_id: 'GO-0', canonical: fRow.canonical };
const stSb = { ...emptyState, lookup: [{ system: 'supabase_candidate', id: 'SB1', keys: fRow.candidate_keys, info: existingInfo }] };
r = run({ action: 'import', request_id: 'r8', options: {}, candidates: [weak()] }, stSb);
t('IMPORT repetido (otro request_id): no crea otro contacto ni otra oportunidad; conserva ids y estado', r.s1[0].kind === 'noop' && r.p2.ops[0].kind === 'noop' && r.fin.rows[0].status === 'in_ghl' && r.fin.rows[0].ghl_opportunity_id === 'GO-0' && r.fin.rows[0].candidate_key === fRow.candidate_key && r.fin.response.results[0].supabase === 'actualizado');
t('enriquecimiento seguro: no pisa datos existentes y suma hechos nuevos', (() => { const m = mergeCandidates(good(), good({ email: 'otro@otro.cl', facts: ['Hecho nuevo observado en el sitio'] })); return m.contact.email === 'dra@clinicarica-test.invalid' && m.facts.length === 2; })());

// ---------- PREPARE
r = run({ action: 'prepare', request_id: 'p1', options: {}, candidates: [good()] }, emptyState);
t('PREPARE: genera borradores (email + WhatsApp) y los guarda; no toca GHL ni envía', r.fin.rows[0].drafts.email_subject && r.fin.rows[0].drafts.whatsapp && r.s1[0].kind === 'noop' && r.p2.ops[0].kind === 'noop' && r.fin.response.results[0].drafts.never_sent === true);

// ---------- ACT
const existing = { ...emptyState, lookup: [{ system: 'supabase_candidate', id: 'SB1', keys: ['d:clinicarica-test.invalid'], info: { candidate_key: 'd:clinicarica-test.invalid', company: 'Clínica Rica TEST', status: 'in_ghl', ghl_contact_id: 'GC1', ghl_opportunity_id: 'GO1', canonical: good() } }] };
r = run({ action: 'act', request_id: 'a1', act: { type: 'log_instagram', note: 'Le escribí por DM' }, candidates: [good()] }, existing);
t('ACT log_instagram sobre un prospecto ya en GHL: etapa → Contactado, nota «no lo envió Atacama OS» y tarea de seguimiento; sin crear otra oportunidad', r.p2.ops.some((o) => o.kind === 'opp_update' && o.method === 'PUT' && o.url.endsWith('/opportunities/GO1') && o.body.pipelineStageId === 's-con') && r.p2.ops.some((o) => o.kind === 'note_create' && /Atacama OS no envió/.test(o.body.body)) && r.p2.ops.some((o) => o.kind === 'task_create') && !r.p2.ops.some((o) => o.kind === 'opp_create') && r.s1[0].kind === 'noop');
t('ACT log_instagram: Supabase queda contacted, canal instagram y fecha', r.fin.rows[0].status === 'contacted' && r.fin.rows[0].last_contact_channel === 'instagram' && !!r.fin.rows[0].last_contact_at && r.fin.rows[0].ghl_stage === 'contactado');
r = run({ action: 'act', request_id: 'a2', act: { type: 'log_whatsapp' }, candidates: [good()] }, emptyState);
t('ACT log_whatsapp sobre un prospecto nuevo: crea contacto y la oportunidad DIRECTO en Contactado (override automático no necesario: es un registro manual)', r.s1.some((o) => o.kind === 'contact_create') && r.p2.ops.some((o) => o.kind === 'opp_create' && o.body.pipelineStageId === 's-con') && r.fin.rows[0].status === 'contacted');
r = run({ action: 'act', request_id: 'a3', act: { type: 'send_email', subject: 'Hola', body: 'x' }, candidates: [good()] }, existing);
t('ACT send_email: NO se ejecuta; interfaz devuelta; cero operaciones de GHL y cero filas', r.fin.response.results[0].executed === false && r.fin.response.results[0].act_status === 'not_enabled' && r.fin.response.results[0].act_interface.to === 'dra@clinicarica-test.invalid' && r.p2.ops[0].kind === 'noop' && r.fin.rows.length === 0 && r.fin.response.safety.messages_sent === 0);
r = run({ action: 'act', request_id: 'a4', act: { type: 'discard', reason: 'No es el perfil' }, candidates: [good()] }, existing);
t('ACT discard: estado descartado, etiqueta y nota; NO pasa a perdida salvo mark_lost', r.fin.rows[0].status === 'discarded' && r.p2.ops.some((o) => o.kind === 'tags_add' && o.body.tags[0] === 'descartado-prospecto') && !r.p2.ops.some((o) => o.kind === 'opp_update'));
r = run({ action: 'act', request_id: 'a5', act: { type: 'move_stage', stage: 'diagnostico' }, candidates: [good()] }, existing);
t('ACT move_stage: PUT de etapa sobre la oportunidad existente', r.p2.ops.length === 1 && r.p2.ops[0].kind === 'opp_update' && r.p2.ops[0].body.pipelineStageId === 's-dia');
r = run({ action: 'act', request_id: 'a6', act: { type: 'add_note', note: 'Llamar el lunes' }, candidates: [good()] }, existing);
t('ACT add_note y follow_up', r.p2.ops[0].kind === 'note_create' && r.p2.ops[0].body.body === 'Llamar el lunes' && run({ action: 'act', request_id: 'a7', act: { type: 'follow_up', days: 2, title: 'Llamar' }, candidates: [good()] }, existing).p2.ops.some((o) => o.kind === 'task_create' && o.body.title === 'Llamar'));
r = run({ action: 'act', request_id: 'a8', act: { type: 'create_in_ghl' }, candidates: [good()] }, dupState);
t('ACT create_in_ghl sobre contacto real existente: se rechaza salvo attach_to_existing explícito', r.fin.response.results[0].executed === false && /ya_existe_en_ghl/.test(r.fin.response.results[0].error) && r.s1[0].kind === 'noop' && r.fin.rows.length === 0);
r = run({ action: 'act', request_id: 'a9', act: { type: 'create_in_ghl', attach_to_existing: true }, candidates: [good()] }, dupState);
t('ACT create_in_ghl con attach_to_existing: crea la oportunidad sobre el contacto existente SIN crear otro contacto ni modificarlo', r.s1[0].kind === 'noop' && r.p2.ops.some((o) => o.kind === 'opp_create' && o.body.contactId === 'X1') && !r.p2.ops.some((o) => o.url.endsWith('/contacts/')));
r = run({ action: 'act', request_id: 'a10', act: { type: 'hackear' }, candidates: [good()] }, existing);
t('ACT desconocido: error claro y sin escrituras', r.fin.response.results[0].executed === false && /accion_desconocida/.test(r.fin.response.results[0].error) && r.p2.ops[0].kind === 'noop');

// ---------- errores de GHL
r = run({ action: 'import', request_id: 'e1', options: {}, candidates: [good()] }, emptyState, (op) => (op.kind === 'contact_create' ? { statusCode: 400, body: { message: 'This location does not allow duplicated contacts.', meta: { contactId: 'EXIST9' } } } : { statusCode: 201, body: {} }));
t('contacto duplicado detectado por GHL al crear: no se crea oportunidad, se informa y no se modifica el existente', !r.p2.ops.some((o) => o.kind === 'opp_create') && /ya_existe_en_ghl/.test(r.fin.response.results[0].error) && r.fin.rows[0].status === 'accepted' && !r.fin.rows[0].ghl_contact_id);
t('buildEntries: indexa contactos y oportunidades de GHL por correo, teléfono y dominio', (() => { const e = buildEntries([], [{ id: 'c1', email: 'A@empresa.cl', phone: '+56 9 1111 2222', website: 'https://www.empresa.cl' }], [{ id: 'o1', name: 'X', contact: { email: 'b@otra.cl' }, customFields: [{ fieldValueString: 'd:otra.cl' }] }]); return e[0].keys.includes('e:a@empresa.cl') && e[0].keys.includes('p:911112222') && e[0].keys.includes('d:empresa.cl') && e[1].keys.includes('d:otra.cl'); })());

// ---------- soporte del operador (Hermes): candidatos en el análisis y fecha exacta de seguimiento
r = run({ action: 'analyze', request_id: null, options: { include_candidates: true }, candidates: [good()] }, emptyState);
t('ANALYZE con include_candidates devuelve los candidatos canónicos (para importarlos después sin volver a parsear)', analyzeResponse({ action: 'analyze', options: { include_candidates: true } }, r.ev).candidates[0].company_name === 'Clínica Rica TEST' && analyzeResponse({ action: 'analyze' }, r.ev).candidates === undefined);
r = run({ action: 'act', request_id: 'a20', act: { type: 'follow_up', due_at: '2026-10-09', title: 'Llamar el viernes' }, candidates: [good()] }, existing);
t('ACT follow_up con fecha exacta (viernes) usa esa fecha a las 12:00 de Chile', r.p2.ops.some((o) => o.kind === 'task_create' && o.body.dueDate === '2026-10-09T15:00:00.000Z' && o.body.title === 'Llamar el viernes'));

console.log(`\n${pass} ok ${fail} fallos`);
process.exit(fail ? 1 : 0);
