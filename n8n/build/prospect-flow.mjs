#!/usr/bin/env node
/**
 * Atacama OS · Prospección real — workflows n8n «17 Prospect Search» y «18 Prospect Admit».
 *
 * 17 · Buscador para Hermes: POST autenticado → Exa (credencial que ya vive en n8n; la clave NO sale de n8n) → resultados compactos con texto
 *      de la página para poder citar literalmente. Tope diario de búsquedas y de resultados por llamada.
 * 18 · Admisión a GHL (equivalente de 04 + 05 en la ruta nueva): toma prospectos clase A (score ≥ 80, hot + crm_candidate, status new, sin
 *      oportunidad), vuelve a comprobar TODOS los gates (scripts/prospecting/admit-core.mjs, probado), y solo entonces crea en GHL el contacto
 *      (sin tocar contactos existentes), la oportunidad en «Investigado» con los campos ya existentes, la nota de revisión y el borrador en
 *      Supabase (la tarea de revisión la crea la automatización nativa de GHL «Atacama — Tarea al investigar»). NO envía nada, NO mueve a «Contactado». Lo que no pasa queda en Supabase con el motivo (`metadata.admission`).
 *
 * Uso: node n8n/build/prospect-flow.mjs → escribe n8n/atacama-labs-17-prospect-search.json y n8n/atacama-labs-18-prospect-admit.json
 */
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import { evidenceKind, evidenceSupports, normalizeVertical, mapSolution, mapChannel, evaluateAdmission, lintDraft, host, buildDraft, buildGhlPayloads, buildReviewNote, findExistingContact } from '../../scripts/prospecting/admit-core.mjs';

const SUPABASE = 'https://uwquwjmiofixzugttals.supabase.co';
const GHL = 'https://services.leadconnectorhq.com';
export const GHL_LOCATION = 'pxHuOsiz2i3lM6BtC9IM';
export const PACKS = { test: { id: 'f412a742-7c7f-4cc0-9e2a-20c39d6fcd46', slug: 'atacama-labs-test' }, real: { id: '0ba54785-bff0-4a2d-a397-64e697d34e38', slug: 'atacama-labs' } };
export const CRM = {
  locationId: GHL_LOCATION, pipelineId: 'trSWhAcNDyUMmPlYIEib', stageId: '2216d3ae-d153-4446-bc3b-77d0a240e415', // Atacama Labs — Ventas / Investigado
  fields: { fuente: 'Vc1cfrhuq3KCiBdzzmnf', solucion_de_interes: 'yY5sqFov8GeXcx5G9vuy', icp_vertical: '0uK7RJiBCZkpzPofV5cV', evidencia_url: 'WoO2N4rtxNPqkjWflOAf', canal_de_contacto: 'iNNT2QdbHmtlvqgxunIB',
    qualification_score: 'rZHgyynpwHljXVwOB3qL', commercial_angle: 'AEqKhoiFpgz8ojHTjqNj', prospect_key: 'ar3HYR1AKswxC6RIgyXd' },
  contactFields: { origen_detallado: 'JzsnIz7M4LPS6yIrQ2mI', primary_contact_role: 'MvEGJKCI9McDuVqn2cSi' },
};
const SUPABASE_CRED = { supabaseApi: { id: 'XOmXUuyLVSazDIh5', name: 'Atacama Labs - Supabase' } };
const GHL_CRED = { httpHeaderAuth: { id: '4Vc6nfxyKjZ14Bep', name: 'GHL — Atacama OS' } };
const INGEST_CRED = { httpHeaderAuth: { id: 'lUGhlXVaQBEiEh5S', name: 'Atacama Labs - Ingest Key' } };
const EXA_CRED = { httpHeaderAuth: { id: '5QZorcMwbYvcRpV5', name: 'Exa API' } };
const uuid = () => randomUUID();
const full = (timeout = 30000) => ({ response: { response: { fullResponse: true, neverError: true, responseFormat: 'json' } }, timeout });
const code = (name, jsCode, pos, mode) => ({ id: uuid(), name, type: 'n8n-nodes-base.code', typeVersion: 2, position: pos, parameters: { ...(mode ? { mode } : {}), jsCode } });
const sb = (name, method, url, bodyExpr, pos, prefer) => ({ id: uuid(), name, type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: pos, credentials: SUPABASE_CRED, continueOnFail: true,
  parameters: { method, url, authentication: 'predefinedCredentialType', nodeCredentialType: 'supabaseApi', sendHeaders: Boolean(prefer),
    ...(prefer ? { headerParameters: { parameters: [{ name: 'Prefer', value: prefer }] } } : {}), ...(bodyExpr ? { sendBody: true, specifyBody: 'json', jsonBody: bodyExpr } : {}), options: full() } });
const ghl = (name, method, url, bodyExpr, pos) => ({ id: uuid(), name, type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: pos, credentials: GHL_CRED, continueOnFail: true,
  parameters: { method, url, authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth', sendHeaders: true,
    headerParameters: { parameters: [{ name: 'Version', value: '2021-07-28' }, { name: 'Accept', value: 'application/json' }] }, ...(bodyExpr ? { sendBody: true, specifyBody: 'json', jsonBody: bodyExpr } : {}), options: full() } });
const ifNode = (name, expr, pos) => ({ id: uuid(), name, type: 'n8n-nodes-base.if', typeVersion: 2.2, position: pos,
  parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' }, combinator: 'and', conditions: [{ leftValue: `={{ (${expr}) ? "yes" : "no" }}`, rightValue: 'yes', operator: { type: 'string', operation: 'equals' } }] }, options: {} } });
const to = (n) => [{ node: n, type: 'main', index: 0 }];

/* ============================================================== 17 SEARCH */
export const DAILY_SEARCH_CAP = 80;
const SEARCH_GUARD = `const first = $('Search Webhook').first().json || {};
const body = first.body || first;
const q = String(body.query || '').trim();
if (q.length < 4 || q.length > 240) throw new Error('query obligatoria (4-240 caracteres)');
const n = Math.min(Math.max(parseInt(body.num_results, 10) || 5, 1), 8);
const sd = $getWorkflowStaticData('global');
const day = new Date().toISOString().slice(0, 10);
if (sd.day !== day) { sd.day = day; sd.count = 0; }
if (sd.count >= ${DAILY_SEARCH_CAP}) throw new Error('Tope diario de búsquedas alcanzado (${DAILY_SEARCH_CAP}); reintenta mañana o pide a Christian subir el tope.');
sd.count += 1;
const dom = (v) => (Array.isArray(v) ? v.map((x) => String(x).toLowerCase().replace(/^https?:\\/\\//, '').replace(/^www\\./, '').split('/')[0]).filter((x) => /^[a-z0-9-]+(\\.[a-z0-9-]+)+$/.test(x)).slice(0, 25) : []);
const inc = dom(body.include_domains);
const exc = dom(body.exclude_domains);
const exa = { query: q, numResults: n, type: 'auto', contents: { text: { maxCharacters: 1800 }, highlights: { numSentences: 2, highlightsPerUrl: 2 } } };
if (inc.length) exa.includeDomains = inc;
if (exc.length) exa.excludeDomains = exc;
if (/^\\d{4}-\\d{2}-\\d{2}/.test(String(body.start_published_date || ''))) exa.startPublishedDate = String(body.start_published_date).slice(0, 10) + 'T00:00:00.000Z';
return [{ json: { exa, searches_today: sd.count, cap: ${DAILY_SEARCH_CAP} } }];`;

const SEARCH_SHAPE = `const res = $json || {};
const g = $('Search Guard').first().json;
if ((res.statusCode || 0) >= 300) throw new Error('Exa respondió HTTP ' + res.statusCode + ': ' + JSON.stringify(res.body || {}).slice(0, 200));
const rows = Array.isArray(res.body && res.body.results) ? res.body.results : [];
return [{ json: { ok: true, query: g.exa.query, count: rows.length, searches_today: g.searches_today, cap: g.cap,
  results: rows.map((r) => ({ url: r.url, title: r.title || null, published_date: r.publishedDate || null, highlights: Array.isArray(r.highlights) ? r.highlights.slice(0, 2) : [], text: String(r.text || '').slice(0, 1500) })),
  note: 'Cita SOLO texto que aparezca literalmente en text/highlights o en la página; el sistema vuelve a abrir la URL para verificarlo.' } }];`;

export function buildProspectSearch() {
  const nodes = [
    { id: uuid(), name: 'Search Webhook', type: 'n8n-nodes-base.webhook', typeVersion: 2, position: [0, 0], webhookId: uuid(), credentials: INGEST_CRED,
      parameters: { httpMethod: 'POST', path: 'atacama-prospect-search', authentication: 'headerAuth', responseMode: 'lastNode', options: {} } },
    code('Search Guard', SEARCH_GUARD, [240, 0]),
    { id: uuid(), name: 'Exa Search', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [480, 0], credentials: EXA_CRED,
      parameters: { method: 'POST', url: 'https://api.exa.ai/search', authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth', sendBody: true, specifyBody: 'json', jsonBody: '={{ JSON.stringify($json.exa) }}', options: full(40000) } },
    code('Shape', SEARCH_SHAPE, [720, 0]),
  ];
  const connections = { 'Search Webhook': { main: [to('Search Guard')] }, 'Search Guard': { main: [to('Exa Search')] }, 'Exa Search': { main: [to('Shape')] } };
  return { name: 'Atacama Labs - 17 Prospect Search', nodes, connections, settings: { executionOrder: 'v1' } };
}

/* ============================================================== 18 ADMIT */
const LIB = [evidenceKind, evidenceSupports, normalizeVertical, mapSolution, mapChannel, evaluateAdmission, lintDraft, host, buildDraft, buildGhlPayloads, buildReviewNote, findExistingContact].map((f) => f.toString()).join('\n\n');

const initCode = (pack) => `const PACK_ID = '${pack.id}';
const first = $input.first().json || {};
const body = first.body || first;
if (body.icp_pack_id && body.icp_pack_id !== PACK_ID) throw new Error('SEGURIDAD: icp_pack_id no coincide con el pack de este workflow (${pack.slug}).');
const ids = (Array.isArray(body.account_ids) ? body.account_ids : []).map(String).filter((x) => /^[0-9a-f-]{36}$/.test(x));
const limit = Math.min(Math.max(parseInt(body.limit, 10) || 10, 1), 10);
const filter = ids.length ? '&account_id=in.(' + ids.join(',') + ')' : '';
const url = '${SUPABASE}/rest/v1/prospects?icp_pack_id=eq.' + PACK_ID + '&classification=eq.hot&crm_candidate=eq.true&status=eq.new&ghl_opportunity_id=is.null&final_score=gte.80' + filter + '&select=*&order=final_score.desc&limit=' + limit;
return [{ json: { pack_id: PACK_ID, account_ids: ids, limit, url } }];`;

const PLAN = `${LIB}

const CFG = ${JSON.stringify(CRM)};
const rows = (n) => { const r = $(n).first().json || {}; if ((r.statusCode || 0) >= 300) throw new Error(n + ' falló (HTTP ' + r.statusCode + ')'); return Array.isArray(r.body) ? r.body : []; };
const cands = rows('Fetch Candidates');
const accounts = rows('Fetch Accounts');
const contacts = rows('Fetch Contacts');
const research = rows('Fetch Research');
const drafts = rows('Fetch Drafts');
const now = new Date().toISOString();
const out = [];
cands.forEach((p) => {
  const account = accounts.find((a) => a.id === p.account_id) || {};
  const contact = contacts.find((c) => c.account_id === p.account_id) || null;
  const rs = research.filter((r) => r.account_id === p.account_id);
  const row = { prospect: p, account, contact, research: rs };
  const adm = evaluateAdmission(row);
  const base = { prospect_id: p.id, account_id: p.account_id, company: account.name || null, resume_contact_id: p.ghl_contact_id || null };
  const heldPatch = (reasons) => ({ metadata: { ...(p.metadata || {}), admission: { status: 'held', reasons, at: now } }, updated_at: now });
  if (!adm.ok) { out.push({ json: { ...base, ok: false, reasons: adm.reasons, held_patch: heldPatch(adm.reasons) } }); return; }
  const draft = buildDraft(row, adm);
  const g = buildGhlPayloads(row, adm, draft, CFG);
  const email = contact.email || null;
  const emailDomain = email ? String(email).split('@')[1] : null;
  const free = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'live.com', 'icloud.com', 'yahoo.es', 'hotmail.es'];
  out.push({ json: { ...base, ok: true, reasons: [], held_patch: heldPatch([]), payloads: g, draft, score: p.final_score, why_now: adm.why_now, has_draft: drafts.some((d) => d.prospect_id === p.id),
    contact_row_id: contact.id, search_q: (emailDomain && free.indexOf(emailDomain) === -1) ? emailDomain : (email || account.domain), email, phone: contact.phone || contact.whatsapp || null, domain: account.domain,
    prospect_metadata: p.metadata || {}, prospect_key: p.prospect_key } });
});
return out;`;

const DUP_CHECK = `${LIB}

const plan = $('Plan').item.json;
const res = $json || {};
if ((res.statusCode || 0) >= 300) return { json: { prospect_id: plan.prospect_id, proceed: false, held_patch: { metadata: { ...plan.prospect_metadata, admission: { status: 'held', reasons: ['ghl_no_disponible_para_comprobar_duplicados'], at: new Date().toISOString() } } } } };
const list = Array.isArray(res.body && res.body.contacts) ? res.body.contacts : [];
const hit = findExistingContact(list, plan.email, plan.phone, plan.domain);
if (hit) return { json: { prospect_id: plan.prospect_id, proceed: false, held_patch: { metadata: { ...plan.prospect_metadata, admission: { status: 'held', reasons: ['ya_existe_en_ghl'], existing_contact_id: hit.id, at: new Date().toISOString() } } } } };
return { json: { prospect_id: plan.prospect_id, proceed: true } };`;

const CONTACT_RESULT = `const plan = $('Plan').item.json;
const res = $json || {};
const id = res.body && res.body.contact && res.body.contact.id;
if ((res.statusCode || 0) < 300 && id) return { json: { prospect_id: plan.prospect_id, created: true, contact_id: id } };
const dupId = res.body && res.body.meta && res.body.meta.contactId;
const reason = dupId ? 'ya_existe_en_ghl' : 'error_al_crear_contacto_en_ghl:' + String((res.body && res.body.message) || res.statusCode).slice(0, 120);
return { json: { prospect_id: plan.prospect_id, created: false, held_patch: { metadata: { ...plan.prospect_metadata, admission: { status: 'held', reasons: [reason], ...(dupId ? { existing_contact_id: dupId } : {}), at: new Date().toISOString() } } } } };`;

const OPP_DECISION = `const plan = $('Plan').item.json;
// El id del contacto viene de «Resolve New» (contacto recién creado) o «Resolve Resume» (reintento); la respuesta de Search Opps NO lo trae.
let contactId = null;
try { contactId = $('Resolve New').item.json.contact_id; } catch (e) { contactId = null; }
if (!contactId) { try { contactId = $('Resolve Resume').item.json.contact_id; } catch (e) { contactId = null; } }
if (!contactId) throw new Error('Sin id de contacto de GHL para crear la oportunidad (prospecto ' + plan.prospect_id + ')');
const res = $json || {};
const opps = (res.statusCode || 0) < 300 && Array.isArray(res.body && res.body.opportunities) ? res.body.opportunities : [];
const mine = opps.find((o) => (o.customFields || []).some((f) => String(f.fieldValueString || f.fieldValue || f.field_value || '') === String(plan.prospect_key)) || String(o.name || '') === String(plan.payloads.opportunity.name));
return { json: { prospect_id: plan.prospect_id, contact_id: contactId, exists: Boolean(mine), existing_opportunity_id: mine ? mine.id : null, opp_body: { ...plan.payloads.opportunity, contactId } } };`;

const SAVE_RESULT = `const plan = $('Plan').item.json;
const dec = $('Opp Decision').item.json;
const oppRes = $json || {};
const oppId = (oppRes.body && ((oppRes.body.opportunity && oppRes.body.opportunity.id) || oppRes.body.id)) || null;
if (!oppId) throw new Error('GHL no devolvió id de oportunidad (HTTP ' + oppRes.statusCode + '): ' + JSON.stringify(oppRes.body || {}).slice(0, 200));
const now = new Date().toISOString();
const patch = { ghl_contact_id: dec.contact_id, ghl_opportunity_id: oppId, last_activity_at: now, updated_at: now,
  metadata: { ...plan.prospect_metadata, admission: { status: 'in_ghl', stage: 'Investigado', at: now, draft_source: plan.draft.source, approval: 'pendiente: etiqueta aprobado-para-contactar en el contacto' } } };
const draftRow = { prospect_id: plan.prospect_id, contact_id: plan.contact_row_id, channel: plan.payloads.channel === 'Correo' ? 'email' : plan.payloads.channel === 'WhatsApp' ? 'whatsapp' : plan.payloads.channel === 'LinkedIn' ? 'linkedin' : plan.payloads.channel === 'Llamada' ? 'call' : 'other',
  direction: 'outbound', type: 'first_contact', subject: plan.draft.subject, message: plan.draft.message, status: 'draft', created_by: 'prospect-admit',
  metadata: { source: plan.draft.source, lint: plan.draft.lint, hermes_lint: plan.draft.hermes_lint || [], never_sent: true } };
return { json: { prospect_id: plan.prospect_id, patch, draft_row: draftRow, needs_draft: !plan.has_draft, ghl_contact_id: dec.contact_id, ghl_opportunity_id: oppId } };`;

const FINALIZE = `const plan = $('Plan').item.json;
const sr = $('Save Result').item.json;
const note = $('Add Note').item.json || {};
const base = sr.patch.metadata;
return { json: { prospect_id: plan.prospect_id, patch: { updated_at: new Date().toISOString(), metadata: { ...base, admission: { ...base.admission, note_created: (note.statusCode || 0) < 300, note_http: note.statusCode || null, review_task: 'la crea la automatización de GHL «Atacama — Tarea al investigar»' } } } } };`;

const MARK_EXISTING = `const plan = $('Plan').item.json;
const dec = $json;
const now = new Date().toISOString();
return { json: { prospect_id: plan.prospect_id, patch: { ghl_contact_id: dec.contact_id, ghl_opportunity_id: dec.existing_opportunity_id, updated_at: now, metadata: { ...plan.prospect_metadata, admission: { status: 'in_ghl', stage: 'ya_existia', at: now } } } } };`;

export function buildProspectAdmit(mode = 'real') {
  const pack = PACKS[mode];
  const test = mode === 'test';
  const inList = (table, prefix, idsExpr, suffix) => '={{ "' + SUPABASE + '/rest/v1/' + table + '?' + prefix + 'in.(" + ' + idsExpr + ' + ")' + suffix + '" }}';
  const acctIds = "$('Fetch Candidates').first().json.body.map((p) => p.account_id).join(',')";
  const prospIds = "$('Fetch Candidates').first().json.body.map((p) => p.id).join(',')";
  const nodes = [
    { id: uuid(), name: 'Admit Webhook', type: 'n8n-nodes-base.webhook', typeVersion: 2, position: [0, -120], webhookId: uuid(), credentials: INGEST_CRED,
      parameters: { httpMethod: 'POST', path: test ? 'atacama-prospect-admit-test' : 'atacama-prospect-admit', authentication: 'headerAuth', responseMode: 'lastNode', options: {} } },
    { id: uuid(), name: 'Called by Workflow', type: 'n8n-nodes-base.executeWorkflowTrigger', typeVersion: 1.1, position: [0, 120], parameters: { inputSource: 'passthrough' } },
    code('Init', initCode(pack), [240, 0]),
    sb('Fetch Candidates', 'GET', '={{ $json.url }}', null, [480, 0]),
    ifNode('Any Candidates?', 'Array.isArray($json.body) && $json.body.length > 0', [720, 0]),
    sb('Fetch Accounts', 'GET', inList('accounts', 'id=', acctIds, '&select=*'), null, [960, -120]),
    sb('Fetch Contacts', 'GET', inList('contacts', 'account_id=', acctIds, '&select=*&order=created_at.asc'), null, [1200, -120]),
    sb('Fetch Research', 'GET', inList('research', 'account_id=', acctIds, '&is_current=eq.true&select=account_id,research_type,finding,evidence_text,source_url,source_date,raw_metadata'), null, [1440, -120]),
    sb('Fetch Drafts', 'GET', inList('outreach', 'prospect_id=', prospIds, '&type=eq.first_contact&select=id,prospect_id,status'), null, [1680, -120]),
    code('Plan', PLAN, [1920, -120]),
    ifNode('Admitted?', '$json.ok === true', [2160, -120]),
    ifNode('Has Contact?', '$json.resume_contact_id', [2400, -240]),
    ghl('Search Domain', 'GET', '={{ "' + GHL + '/contacts/?locationId=' + GHL_LOCATION + '&limit=10&query=" + encodeURIComponent($json.search_q || "") }}', null, [2640, -120]),
    code('Dup Check', DUP_CHECK, [2880, -120], 'runOnceForEachItem'),
    ifNode('No Duplicate?', '$json.proceed === true', [3120, -120]),
    ghl('Create Contact', 'POST', GHL + '/contacts/', '={{ JSON.stringify($("Plan").item.json.payloads.contact) }}', [3360, -120]),
    code('Contact Result', CONTACT_RESULT, [3600, -120], 'runOnceForEachItem'),
    ifNode('Contact Created?', '$json.created === true', [3840, -120]),
    sb('Save Contact Id', 'PATCH', '={{ "' + SUPABASE + '/rest/v1/prospects?id=eq." + $json.prospect_id }}', '={{ JSON.stringify({ ghl_contact_id: $json.contact_id }) }}', [4080, -120], 'return=minimal'),
    code('Resolve New', 'return { json: { contact_id: $("Contact Result").item.json.contact_id } };', [4320, -120], 'runOnceForEachItem'),
    code('Resolve Resume', 'return { json: { contact_id: $("Plan").item.json.resume_contact_id } };', [2640, -360], 'runOnceForEachItem'),
    ghl('Search Opps', 'GET', '={{ "' + GHL + '/opportunities/search?location_id=' + GHL_LOCATION + '&pipeline_id=' + CRM.pipelineId + '&contact_id=" + $json.contact_id + "&limit=20" }}', null, [4560, -240]),
    code('Opp Decision', OPP_DECISION, [4800, -240], 'runOnceForEachItem'),
    ifNode('Opp Exists?', '$json.exists === true', [5040, -240]),
    ghl('Create Opportunity', 'POST', GHL + '/opportunities/', '={{ JSON.stringify($json.opp_body) }}', [5280, -360]),
    code('Save Result', SAVE_RESULT, [5520, -360], 'runOnceForEachItem'),
    sb('Patch Prospect', 'PATCH', '={{ "' + SUPABASE + '/rest/v1/prospects?id=eq." + $json.prospect_id }}', '={{ JSON.stringify($json.patch) }}', [5760, -360], 'return=minimal'),
    sb('Insert Draft', 'POST', SUPABASE + '/rest/v1/outreach', '={{ $("Save Result").item.json.needs_draft ? JSON.stringify($("Save Result").item.json.draft_row) : "[]" }}', [6000, -360], 'return=minimal'),
    ghl('Add Note', 'POST', '={{ "' + GHL + '/contacts/" + $("Opp Decision").item.json.contact_id + "/notes" }}', '={{ JSON.stringify({ body: $("Plan").item.json.payloads.note, userId: "OjkAjHMdUjnblO7W1kBZ" }) }}', [6240, -360]),
    code('Finalize Body', FINALIZE, [6720, -360], 'runOnceForEachItem'),
    sb('Finalize', 'PATCH', '={{ "' + SUPABASE + '/rest/v1/prospects?id=eq." + $json.prospect_id }}', '={{ JSON.stringify($json.patch) }}', [6960, -360], 'return=minimal'),
    code('No Work', "return [{ json: { ok: true, admitted: 0, note: 'Sin prospectos elegibles (hot + crm_candidate + score >= 80 + status new + sin oportunidad).' } }];", [960, 160]),
    code('Mark Existing Body', MARK_EXISTING, [5280, -120], 'runOnceForEachItem'),
    sb('Mark Existing', 'PATCH', '={{ "' + SUPABASE + '/rest/v1/prospects?id=eq." + $json.prospect_id }}', '={{ JSON.stringify($json.patch) }}', [5520, -120], 'return=minimal'),
    sb('Mark Held', 'PATCH', '={{ "' + SUPABASE + '/rest/v1/prospects?id=eq." + $json.prospect_id }}', '={{ JSON.stringify($json.held_patch) }}', [2400, 240], 'return=minimal'),
  ];
  const c = {
    'Admit Webhook': { main: [to('Init')] }, 'Called by Workflow': { main: [to('Init')] },
    'Init': { main: [to('Fetch Candidates')] }, 'Fetch Candidates': { main: [to('Any Candidates?')] },
    'Any Candidates?': { main: [to('Fetch Accounts'), to('No Work')] },
    'Fetch Accounts': { main: [to('Fetch Contacts')] }, 'Fetch Contacts': { main: [to('Fetch Research')] }, 'Fetch Research': { main: [to('Fetch Drafts')] }, 'Fetch Drafts': { main: [to('Plan')] },
    'Plan': { main: [to('Admitted?')] },
    'Admitted?': { main: [to('Has Contact?'), to('Mark Held')] },
    'Has Contact?': { main: [to('Resolve Resume'), to('Search Domain')] },
    'Resolve Resume': { main: [to('Search Opps')] },
    'Search Domain': { main: [to('Dup Check')] }, 'Dup Check': { main: [to('No Duplicate?')] },
    'No Duplicate?': { main: [to('Create Contact'), to('Mark Held')] },
    'Create Contact': { main: [to('Contact Result')] }, 'Contact Result': { main: [to('Contact Created?')] },
    'Contact Created?': { main: [to('Save Contact Id'), to('Mark Held')] },
    'Save Contact Id': { main: [to('Resolve New')] }, 'Resolve New': { main: [to('Search Opps')] },
    'Search Opps': { main: [to('Opp Decision')] }, 'Opp Decision': { main: [to('Opp Exists?')] },
    'Opp Exists?': { main: [to('Mark Existing Body'), to('Create Opportunity')] },
    'Mark Existing Body': { main: [to('Mark Existing')] },
    'Create Opportunity': { main: [to('Save Result')] }, 'Save Result': { main: [to('Patch Prospect')] }, 'Patch Prospect': { main: [to('Insert Draft')] },
    'Insert Draft': { main: [to('Add Note')] }, 'Add Note': { main: [to('Finalize Body')] }, 'Finalize Body': { main: [to('Finalize')] },
  };
  return { name: `Atacama Labs - 18 Prospect Admit${test ? ' (TEST)' : ''}`, nodes, connections: c, settings: { executionOrder: 'v1' } };
}

if (process.argv[1] && process.argv[1].endsWith('prospect-flow.mjs')) {
  const o17 = new URL('../atacama-labs-17-prospect-search.json', import.meta.url);
  const o18 = new URL('../atacama-labs-18-prospect-admit.json', import.meta.url);
  fs.writeFileSync(o17, JSON.stringify(buildProspectSearch(), null, 2) + '\n');
  fs.writeFileSync(o18, JSON.stringify(buildProspectAdmit('real'), null, 2) + '\n');
  console.log('escrito', o17.pathname, o18.pathname);
}
