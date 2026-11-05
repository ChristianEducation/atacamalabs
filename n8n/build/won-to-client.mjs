/* Genera n8n/atacama-labs-11-won-to-client.json — "11 Won to Client".
 *
 * Qué hace: cuando GHL avisa que una oportunidad pasó a status=won, localiza o crea la Business,
 * crea el Servicio contratado (y un Proyecto inicial si corresponde) y deja las 6 relaciones.
 * Las tareas de onboarding NO se crean aquí: las crea el Workflow nativo de GHL (docs/ATACAMA-OS-IMPLEMENTATION.md, Bloque E).
 *
 * Seguridad:
 *  - dry_run es TRUE por defecto: solo con `"dry_run": false` explícito escribe en GHL.
 *  - Solo actúa si GHL confirma status=won en el pipeline Atacama Labs — Ventas (no confía en el cuerpo del webhook).
 *  - Idempotente: si la oportunidad ya tiene un Servicio relacionado, no hace nada.
 *  - Sin nombre de empresa confiable, se detiene (needs_human) en vez de inventarlo.
 *  - No inventa montos ni fechas (MRR, fee y fechas quedan vacíos).
 *
 * Credenciales (se crean a mano en n8n; ver docs): GHL_CRED_ID = header `Authorization: Bearer <GHL_PRIVATE_INTEGRATION_TOKEN2>`;
 * INGEST_KEY_CREDENTIAL_ID = la misma credencial "Atacama Labs - Ingest Key" que usa 09.
 */
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';

export const LOCATION = 'pxHuOsiz2i3lM6BtC9IM';
export const PIPELINE = 'trSWhAcNDyUMmPlYIEib';
export const ASSOC = {
  business_opportunity: '6aab99ca4b0508155da7f710', // business → opportunity
  business_contact: 'BUSINESSES_CONTACTS_ASSOCIATION', // business → contact (sistema)
  servicio_business: '6ac4412e1ef24423a65a24b6', // business → servicios
  servicio_opportunity: '6ac4412e79bbec5a0686f0ea', // servicios → opportunity
  proyecto_business: '6ac4412fd143f08a0a642c44', // business → proyectos
  servicio_proyecto: '6ac44130ad83d04a973c2511', // proyectos → servicios
};
const SOLUCION_FIELD_ID = 'yY5sqFov8GeXcx5G9vuy';

const GHL = 'https://services.leadconnectorhq.com';
const GHL_CRED = { httpHeaderAuth: { id: '4Vc6nfxyKjZ14Bep', name: 'GHL — Atacama OS' } };
const INGEST_CRED = { httpHeaderAuth: { id: 'lUGhlXVaQBEiEh5S', name: 'Atacama Labs - Ingest Key' } };

export const CODE = {
  validate: `const first = $input.first().json ?? {};
const body = first.body ?? first;
// El Webhook estandar de GHL manda los Custom Data dentro de body.customData; tambien se acepta la raiz.
const cd = body && typeof body.customData === 'object' && body.customData ? body.customData : {};
const present = (v) => v !== undefined && v !== null && v !== '';
const id = String(present(body.opportunity_id) ? body.opportunity_id : (cd.opportunity_id ?? '')).trim();
if (!/^[A-Za-z0-9]{15,30}$/.test(id)) throw new Error('opportunity_id invalido');
// SEGURIDAD: solo es dry_run=false si hay al menos un valor y TODOS los presentes (raiz y customData)
// son false (booleano o "false"). Ausente, invalido, ambiguo o contradictorio => dry_run=true.
const isFalse = (v) => v === false || (typeof v === 'string' && v.trim().toLowerCase() === 'false');
const given = [body.dry_run, cd.dry_run].filter((v) => v !== undefined && v !== null);
const dryRun = !(given.length > 0 && given.every(isFalse));
return [{ json: { opportunityId: id, dryRun } }];`,

  guard: `const v = $('Validate Input').first().json;
const opp = $json.opportunity;
const skip = (reason) => [{ json: { proceed: false, action: 'skipped', reason, opportunityId: v.opportunityId } }];
if (!opp || !opp.id) return skip('oportunidad_no_encontrada');
if (opp.locationId !== '${LOCATION}') return skip('location_distinta');
if (opp.pipelineId !== '${PIPELINE}') return skip('fuera_del_pipeline_atacama');
if (String(opp.status).toLowerCase() !== 'won') return skip('status_no_es_won (' + opp.status + ')');
if (!opp.contactId) return skip('oportunidad_sin_contacto');
const cf = (opp.customFields || []).find((f) => f.id === '${SOLUCION_FIELD_ID}');
const solucion = cf ? (cf.fieldValueString || cf.fieldValue || '') : '';
return [{ json: { proceed: true, opportunityId: opp.id, dryRun: v.dryRun, contactId: opp.contactId, oppName: opp.name || '', solucion: String(solucion) } }];`,

  plan: `const g = $('Guard Won').first().json;
const contact = ($('Get Contact').first().json || {}).contact || {};
const rels = ($('Get Opp Relations').first().json || {}).relations || [];
const businesses = ($json.businesses || []).filter((b) => !/^\\(example\\)/i.test(b.name || ''));
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

// 1) Idempotencia: si la oportunidad ya tiene Servicio contratado, no se repite nada.
if (rels.some((r) => r.associationId === '${ASSOC.servicio_opportunity}')) {
  return [{ json: { action: 'already_processed', reason: 'la oportunidad ya tiene un Servicio contratado', opportunityId: g.opportunityId } }];
}
// 2) Nombre de empresa: contacto.companyName o el sufijo de "Nombre - Empresa". Si no hay, se detiene.
let companyName = String(contact.companyName || '').trim();
if (!companyName && g.oppName.includes(' - ')) companyName = g.oppName.split(' - ').slice(1).join(' - ').trim();
if (!companyName || /^atacama labs$/i.test(companyName)) {
  return [{ json: { action: 'needs_human', reason: 'sin_nombre_de_empresa_confiable', opportunityId: g.opportunityId } }];
}
// 3) Business: relacion existente con la oportunidad > businessId del contacto > nombre igual > crear.
const relBiz = rels.find((r) => r.associationId === '${ASSOC.business_opportunity}');
let businessId = null;
if (relBiz) businessId = relBiz.firstRecordId === g.opportunityId ? relBiz.secondRecordId : relBiz.firstRecordId;
if (!businessId && contact.businessId) businessId = contact.businessId;
if (!businessId) { const m = businesses.find((b) => norm(b.name) === norm(companyName)); if (m) businessId = m.id; }
// 4) Servicio / Proyecto (sin inventar montos ni fechas).
const MAP = { 'atencion-y-seguimiento': 'Agente de IA', 'Agentes': 'Agente de IA', 'automatizacion-de-procesos': 'Automatización',
  'sistemas-a-medida': 'Software a medida', 'A Medida': 'Software a medida', 'integraciones': 'Integración', 'Página Web': 'Web', 'Ecommerce': 'Ecommerce' };
const TIPO = { 'Agente de IA': 'Agente', 'Automatización': 'Automatización', 'Software a medida': 'Software', 'Integración': 'Integración', 'Web': 'Web', 'Ecommerce': 'Ecommerce' };
const producto = MAP[g.solucion] || 'Otro';
const servicio = { nombre: (companyName + ' — ' + producto).slice(0, 120), servicio_producto: producto, estado: 'Onboarding',
  proximo_paso: 'Definir alcance y completar el onboarding' };
const proyecto = TIPO[producto] ? { nombre: (companyName + ' — ' + producto + ' (implementación)').slice(0, 120), tipo: TIPO[producto], estado: 'Planificado',
  prioridad: 'Media', proximo_hito: 'Kickoff y levantamiento de requerimientos' } : null;
return [{ json: { action: 'create', dryRun: g.dryRun, opportunityId: g.opportunityId, contactId: g.contactId, companyName, businessId,
  createBusiness: !businessId, oppHasBusinessRel: Boolean(relBiz), contactHasBusiness: Boolean(businessId && contact.businessId === businessId), servicio, proyecto } }];`,

  dryRun: `const p = $json;
const would = [];
if (p.createBusiness) would.push('crear Business "' + p.companyName + '"');
else would.push('usar Business existente ' + p.businessId);
would.push('crear Servicio contratado "' + p.servicio.nombre + '" (estado Onboarding)');
if (p.proyecto) would.push('crear Proyecto "' + p.proyecto.nombre + '" (estado Planificado)');
would.push('relaciones: servicio↔oportunidad, business↔servicio' + (p.proyecto ? ', business↔proyecto, proyecto↔servicio' : '') + (p.oppHasBusinessRel ? '' : ', business↔oportunidad') + (p.contactHasBusiness ? '' : ', business↔contacto'));
return [{ json: { ok: true, action: 'dry_run', wrote_nothing: true, would, plan: p } }];`,

  context: `const p = $('Plan').first().json;
const businessId = p.createBusiness ? ($('Create Business').first().json.business || {}).id : p.businessId;
if (!businessId) throw new Error('No se pudo obtener el id de la Business');
return [{ json: { ...p, businessId } }];`,

  relations: `const c = $('Context').first().json;
const servicioId = ($('Create Servicio').first().json.record || {}).id;
if (!servicioId) throw new Error('No se creó el Servicio contratado');
let proyectoId = null;
if (c.proyecto) { proyectoId = (($('Create Proyecto').first().json || {}).record || {}).id || null; }
const R = [{ label: 'servicio↔oportunidad', associationId: '${ASSOC.servicio_opportunity}', firstRecordId: servicioId, secondRecordId: c.opportunityId },
  { label: 'business↔servicio', associationId: '${ASSOC.servicio_business}', firstRecordId: c.businessId, secondRecordId: servicioId }];
if (!c.oppHasBusinessRel) R.push({ label: 'business↔oportunidad', associationId: '${ASSOC.business_opportunity}', firstRecordId: c.businessId, secondRecordId: c.opportunityId });
if (!c.contactHasBusiness) R.push({ label: 'business↔contacto', associationId: '${ASSOC.business_contact}', firstRecordId: c.businessId, secondRecordId: c.contactId });
if (proyectoId) {
  R.push({ label: 'business↔proyecto', associationId: '${ASSOC.proyecto_business}', firstRecordId: c.businessId, secondRecordId: proyectoId });
  R.push({ label: 'proyecto↔servicio', associationId: '${ASSOC.servicio_proyecto}', firstRecordId: proyectoId, secondRecordId: servicioId });
}
return R.map((r) => ({ json: { ...r, locationId: '${LOCATION}', servicioId, proyectoId } }));`,

  summary: `const c = $('Context').first().json;
const items = $input.all();
const rels = items.map((i, n) => ({ label: $('Build Relations').all()[n].json.label, ok: !i.json.error }));
const first = $('Build Relations').first().json;
return [{ json: { ok: rels.every((r) => r.ok), action: 'created', opportunityId: c.opportunityId, businessId: c.businessId, businessCreated: c.createBusiness,
  servicioId: first.servicioId, proyectoId: first.proyectoId, relations: rels,
  note: 'Las tareas de onboarding las crea el Workflow nativo de GHL; este flujo no crea tareas.' } }];`,
};

function ghlGet(name, urlExpr, pos, extra = {}) {
  return { id: randomUUID(), name, type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: pos, credentials: GHL_CRED, continueOnFail: true,
    parameters: { method: 'GET', url: urlExpr, authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth', sendHeaders: true,
      headerParameters: { parameters: [{ name: 'Version', value: '2021-07-28' }, { name: 'Accept', value: 'application/json' }] }, options: { timeout: 30000 }, ...extra } };
}
function ghlPost(name, urlExpr, bodyExpr, pos, cont = false) {
  return { id: randomUUID(), name, type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: pos, credentials: GHL_CRED, continueOnFail: cont,
    parameters: { method: 'POST', url: urlExpr, authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth', sendHeaders: true,
      headerParameters: { parameters: [{ name: 'Version', value: '2021-07-28' }, { name: 'Accept', value: 'application/json' }] },
      sendBody: true, specifyBody: 'json', jsonBody: bodyExpr, options: { timeout: 30000 } } };
}
const code = (name, jsCode, pos) => ({ id: randomUUID(), name, type: 'n8n-nodes-base.code', typeVersion: 2, position: pos, parameters: { jsCode } });
const iff = (name, leftExpr, pos) => ({ id: randomUUID(), name, type: 'n8n-nodes-base.if', typeVersion: 2.2, position: pos,
  parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' }, combinator: 'and',
    conditions: [{ leftValue: `={{ (${leftExpr}) ? "yes" : "no" }}`, rightValue: 'yes', operator: { type: 'string', operation: 'equals' } }] } } });

export function buildWonToClient() {
  const nodes = [
    { id: randomUUID(), name: 'Won Webhook', type: 'n8n-nodes-base.webhook', typeVersion: 2, position: [0, 0], webhookId: randomUUID(), credentials: INGEST_CRED,
      parameters: { httpMethod: 'POST', path: 'atacama-won-to-client', authentication: 'headerAuth', responseMode: 'lastNode', options: {} } },
    code('Validate Input', CODE.validate, [240, 0]),
    ghlGet('Get Opportunity', '={{ "' + GHL + '/opportunities/" + $json.opportunityId }}', [480, 0]),
    code('Guard Won', CODE.guard, [720, 0]),
    iff('Proceed?', '$json.proceed === true', [960, 0]),
    ghlGet('Get Contact', '={{ "' + GHL + '/contacts/" + $json.contactId }}', [1200, -120]),
    ghlGet('Get Opp Relations', '={{ "' + GHL + '/associations/relations/" + $("Guard Won").first().json.opportunityId + "?locationId=' + LOCATION + '&skip=0&limit=50" }}', [1440, -120]),
    ghlGet('List Businesses', '=' + GHL + '/businesses/?locationId=' + LOCATION, [1680, -120]),
    code('Plan', CODE.plan, [1920, -120]),
    iff('Create?', '$json.action === "create"', [2160, -120]),
    iff('Dry Run?', '$json.dryRun === true', [2400, -240]),
    code('Respond Dry Run', CODE.dryRun, [2640, -360]),
    iff('Needs Business?', '$json.createBusiness === true', [2640, -120]),
    ghlPost('Create Business', GHL + '/businesses/', '={{ { locationId: "' + LOCATION + '", name: $json.companyName } }}', [2880, -200]),
    code('Context', CODE.context, [3120, -120]),
    ghlPost('Create Servicio', GHL + '/objects/custom_objects.servicios_contratados/records', '={{ { locationId: "' + LOCATION + '", properties: $json.servicio } }}', [3360, -120]),
    iff('Has Proyecto?', 'Boolean($("Context").first().json.proyecto)', [3600, -120]),
    ghlPost('Create Proyecto', GHL + '/objects/custom_objects.proyectos/records', '={{ { locationId: "' + LOCATION + '", properties: $("Context").first().json.proyecto } }}', [3840, -200]),
    code('Build Relations', CODE.relations, [4080, -120]),
    ghlPost('Create Relation', GHL + '/associations/relations', '={{ { locationId: $json.locationId, associationId: $json.associationId, firstRecordId: $json.firstRecordId, secondRecordId: $json.secondRecordId } }}', [4320, -120], true),
    code('Summary', CODE.summary, [4560, -120]),
    // Respuestas de las ramas que no escriben (el webhook devuelve el ultimo nodo ejecutado)
    code('Respond Skipped', 'return [{ json: { ok: true, ...$input.first().json } }];', [1200, 120]),
    code('Respond Not Create', 'return [{ json: { ok: $json.action !== "needs_human", ...$json } }];', [2400, 0]),
  ];
  const to = (node, idx = 0) => [{ node, type: 'main', index: idx }];
  const connections = {
    'Won Webhook': { main: [to('Validate Input')] },
    'Validate Input': { main: [to('Get Opportunity')] },
    'Get Opportunity': { main: [to('Guard Won')] },
    'Guard Won': { main: [to('Proceed?')] },
    'Proceed?': { main: [to('Get Contact'), to('Respond Skipped')] },
    'Get Contact': { main: [to('Get Opp Relations')] },
    'Get Opp Relations': { main: [to('List Businesses')] },
    'List Businesses': { main: [to('Plan')] },
    'Plan': { main: [to('Create?')] },
    'Create?': { main: [to('Dry Run?'), to('Respond Not Create')] },
    'Dry Run?': { main: [to('Respond Dry Run'), to('Needs Business?')] },
    'Needs Business?': { main: [to('Create Business'), to('Context')] },
    'Create Business': { main: [to('Context')] },
    'Context': { main: [to('Create Servicio')] },
    'Create Servicio': { main: [to('Has Proyecto?')] },
    'Has Proyecto?': { main: [to('Create Proyecto'), to('Build Relations')] },
    'Create Proyecto': { main: [to('Build Relations')] },
    'Build Relations': { main: [to('Create Relation')] },
    'Create Relation': { main: [to('Summary')] },
  };
  return { name: 'Atacama Labs - 11 Won to Client', nodes, connections, settings: { executionOrder: 'v1' } };
}

if (process.argv[1] && process.argv[1].endsWith('won-to-client.mjs')) {
  const out = new URL('../atacama-labs-11-won-to-client.json', import.meta.url);
  fs.writeFileSync(out, JSON.stringify(buildWonToClient(), null, 2) + '\n');
  console.log('escrito', out.pathname);
}
