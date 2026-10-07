#!/usr/bin/env node
/**
 * Atacama OS · workflow n8n «19 Prospect Gateway» — puerta universal de entrada de prospectos.
 *
 * POST /webhook/atacama-prospect-gateway  (cabecera X-Atacama-Key)  { action: analyze|import|prepare|act, request_id, source, options, act, prospects|html|csv|text|urls|targets }
 *
 * Parse (JSON / HTML / CSV / texto / URLs) → idempotencia (request_id) → dedupe contra Supabase (RPC) y GHL (contactos y oportunidades del pipeline)
 * → scoring (fit + señal + alcance) → decisión → [analyze responde aquí, sin escribir] → GHL etapa 1 (contactos) → etapa 2 (oportunidad/nota/tarea/etiquetas)
 * → Supabase (prospect_candidates) → bitácora idempotente → respuesta. NUNCA envía mensajes: send_email devuelve la interfaz con executed:false.
 *
 * Uso: node n8n/build/prospect-gateway.mjs  → escribe n8n/atacama-labs-19-prospect-gateway.json (producción; MODE=test genera la copia de pruebas)
 */
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import * as core from '../../scripts/prospecting/gateway-core.mjs';
import * as ops from '../../scripts/prospecting/gateway-ops.mjs';
import * as flow from '../../scripts/prospecting/gateway-flow.mjs';

const SUPABASE = 'https://uwquwjmiofixzugttals.supabase.co';
const GHL = 'https://services.leadconnectorhq.com';
export const PACKS = { test: '0b8a3c70-0000-4000-8000-0000000000aa', real: '0ba54785-bff0-4a2d-a397-64e697d34e38' };
export const GATEWAY_CFG = {
  locationId: 'pxHuOsiz2i3lM6BtC9IM', pipelineId: 'trSWhAcNDyUMmPlYIEib', userId: 'OjkAjHMdUjnblO7W1kBZ',
  stages: { nuevo: 'aad0ad01-bffd-4ea9-b00c-7ab11dc941f6', investigado: '2216d3ae-d153-4446-bc3b-77d0a240e415', contactado: 'b947fae7-0941-4296-a76b-e9a826dd47d0', respondio: '38059f54-3ebf-47cd-9a10-126589e61b86',
    diagnostico: 'fec1e794-fb25-4242-806d-f3c13316df6e', propuesta: '62d85e18-1bef-44fa-a82d-cf45462d1ae5', seguimiento: 'b8d98d33-b593-4b0e-b0da-0aa8ab0ffa4d' },
  fields: { fuente: 'Vc1cfrhuq3KCiBdzzmnf', solucion_de_interes: 'yY5sqFov8GeXcx5G9vuy', icp_vertical: '0uK7RJiBCZkpzPofV5cV', evidencia_url: 'WoO2N4rtxNPqkjWflOAf', canal_de_contacto: 'iNNT2QdbHmtlvqgxunIB',
    qualification_score: 'rZHgyynpwHljXVwOB3qL', commercial_angle: 'AEqKhoiFpgz8ojHTjqNj', prospect_key: 'ar3HYR1AKswxC6RIgyXd' },
  contactFields: { origen_detallado: 'JzsnIz7M4LPS6yIrQ2mI', primary_contact_role: 'MvEGJKCI9McDuVqn2cSi' },
};
const SUPABASE_CRED = { supabaseApi: { id: 'XOmXUuyLVSazDIh5', name: 'Atacama Labs - Supabase' } };
const GHL_CRED = { httpHeaderAuth: { id: '4Vc6nfxyKjZ14Bep', name: 'GHL — Atacama OS' } };
const INGEST_CRED = { httpHeaderAuth: { id: 'lUGhlXVaQBEiEh5S', name: 'Atacama Labs - Ingest Key' } };
const uuid = () => randomUUID();
const full = (timeout = 30000) => ({ response: { response: { fullResponse: true, neverError: true, responseFormat: 'json' } }, timeout });
const code = (name, jsCode, pos, mode) => ({ id: uuid(), name, type: 'n8n-nodes-base.code', typeVersion: 2, position: pos, parameters: { ...(mode ? { mode } : {}), jsCode } });
const sb = (name, method, url, bodyExpr, pos, prefer) => ({ id: uuid(), name, type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: pos, credentials: SUPABASE_CRED, continueOnFail: true,
  parameters: { method, url, authentication: 'predefinedCredentialType', nodeCredentialType: 'supabaseApi', sendHeaders: Boolean(prefer), ...(prefer ? { headerParameters: { parameters: [{ name: 'Prefer', value: prefer }] } } : {}),
    ...(bodyExpr ? { sendBody: true, specifyBody: 'json', jsonBody: bodyExpr } : {}), options: full() } });
const ghlGet = (name, url, pos) => ({ id: uuid(), name, type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: pos, credentials: GHL_CRED, continueOnFail: true, alwaysOutputData: true,
  parameters: { method: 'GET', url, authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth', sendHeaders: true, headerParameters: { parameters: [{ name: 'Version', value: '2021-07-28' }, { name: 'Accept', value: 'application/json' }] }, options: full() } });
const ghlExec = (name, pos) => ({ id: uuid(), name, type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: pos, credentials: GHL_CRED, continueOnFail: true, alwaysOutputData: true,
  parameters: { method: '={{ $json.method || "POST" }}', url: '={{ $json.skip ? "https://localhost.invalid/" : $json.url }}', authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth', sendHeaders: true,
    headerParameters: { parameters: [{ name: 'Version', value: '2021-07-28' }, { name: 'Accept', value: 'application/json' }] }, sendBody: true, specifyBody: 'json', jsonBody: '={{ JSON.stringify($json.body || {}) }}', options: full() } });
const ifNode = (name, expr, pos) => ({ id: uuid(), name, type: 'n8n-nodes-base.if', typeVersion: 2.2, position: pos,
  parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' }, combinator: 'and', conditions: [{ leftValue: `={{ (${expr}) ? "yes" : "no" }}`, rightValue: 'yes', operator: { type: 'string', operation: 'equals' } }] }, options: {} } });
const to = (n) => [{ node: n, type: 'main', index: 0 }];

// Todas las funciones puras (núcleo + operaciones + orquestación) se incrustan tal cual en los nodos Code.
const FUNCS = [...Object.values(core), ...Object.values(ops), ...Object.values(flow)].filter((f) => typeof f === 'function');
const extra = ['decodeEntities', 'sectionKey', 'finishHtmlCard', 'toList'].map((n) => core[n]).filter(Boolean);
export const LIB = [...new Map([...FUNCS, ...extra].map((f) => [f.name, f])).values()].map((f) => f.toString().replace(/^async /, 'async ')).join('\n\n');

export const parseCode = (packId) => `${LIB}

const PACK_ID = '${packId}';
try {
const first = $('Gateway Webhook').first().json || {};
const body = first.body || first;
if (!body || typeof body !== 'object') throw new Error('Cuerpo inválido');
const action = String(body.action || '').toLowerCase();
if (!['analyze', 'import', 'prepare', 'act'].includes(action)) throw new Error('action inválida: usa analyze | import | prepare | act');
if (body.icp_pack_id && body.icp_pack_id !== PACK_ID) throw new Error('SEGURIDAD: icp_pack_id no coincide con el pack de este Gateway.');
const rid = String(body.request_id || '').trim();
if (action !== 'analyze' && !/^[A-Za-z0-9._:-]{4,80}$/.test(rid)) throw new Error('request_id obligatorio (4-80 caracteres: letras, números, . _ : -) en import | prepare | act: garantiza la idempotencia.');
const srcIn = body.source;
const source = typeof srcIn === 'string' ? { type: 'external', name: srcIn } : { type: (srcIn && srcIn.type) || 'external', name: (srcIn && srcIn.name) || null, reference: (srcIn && srcIn.reference) || null };
const o = body.options && typeof body.options === 'object' ? body.options : {};
const options = { force_import: o.force_import === true || body.force_import === true, manual_override_reason: String(o.manual_override_reason || body.manual_override_reason || '').trim(), by: String(o.by || body.by || 'Christian').slice(0, 60),
  include_candidates: o.include_candidates === true, validate: o.validate === 'none' ? 'none' : o.validate === 'light' ? 'light' : (action === 'analyze' ? 'none' : 'light'), enrich: o.enrich === true, min_ghl_score: Number.isFinite(Number(o.min_ghl_score)) ? Number(o.min_ghl_score) : 60 };
if (options.force_import && action !== 'import') throw new Error('force_import solo aplica a action=import');
if (options.force_import && options.manual_override_reason.length < 5) throw new Error('FORCE_IMPORT exige manual_override_reason (mínimo 5 caracteres): queda registrado en Supabase y GHL.');
const now = Date.now();
const notes = [];
const mk = (raw, name) => toCandidate(raw, { source_type: source.type, source_name: (raw && raw.source_name) || source.name || name || null, source_reference: (raw && raw.source_reference) || source.reference || null, now });
let candidates = [];
if (Array.isArray(body.prospects)) body.prospects.forEach((p) => { if (p && typeof p === 'object') candidates.push(mk({ ...aliasRecord(p), ...p, ...adaptExternalRecord(p) })); });
if (Array.isArray(body.targets)) body.targets.forEach((p) => { if (p && typeof p === 'object') candidates.push(mk({ ...aliasRecord(p), ...p })); else if (typeof p === 'string') candidates.push(mk(/^https?:\\/\\//.test(p) || /\\.[a-z]{2,}$/i.test(p) ? { website: p, company_name: p } : { company_name: p })); });
if (typeof body.html === 'string' && body.html.length) { const rs = parseHtmlProspects(body.html); notes.push('html: ' + rs.length + ' fichas'); rs.forEach((r) => candidates.push(mk(r))); }
if (typeof body.csv === 'string' && body.csv.length) { const rs = parseCsv(body.csv); notes.push('csv: ' + rs.length + ' filas'); rs.forEach((r) => candidates.push(mk(aliasRecord(r)))); }
if (typeof body.text === 'string' && body.text.length) { const rs = parseFreeText(body.text); notes.push('texto: ' + rs.length + ' bloques'); rs.forEach((r) => candidates.push(mk(r))); }
const urls = Array.isArray(body.urls) ? body.urls.map(String).filter((u) => /^https?:\\/\\/\\S+$/.test(u)).slice(0, 15) : [];
const fetchSite = async (url) => { try { const r = await this.helpers.httpRequest({ method: 'GET', url, timeout: 8000, returnFullResponse: true, ignoreHttpStatusErrors: true, json: false, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AtacamaLabsBot/1.0; +https://atacamalabs.cl)', Accept: 'text/html,*/*' } }); const s = Number(r.statusCode || 0); return { ok: s >= 200 && s < 300, html: typeof r.body === 'string' ? r.body.slice(0, 400000) : '' }; } catch (e) { return { ok: false, html: '' }; } };
for (const u of urls) { const r = await fetchSite(u); if (!r.ok) { notes.push('url no accesible: ' + u); continue; } const c = candidateFromSite(u, siteSignals(r.html), { source_type: source.type === 'external' ? 'url' : source.type, source_name: source.name || 'URL individual', source_reference: source.reference || u, now }); c.site_verified = true; candidates.push(c); }
if (options.validate === 'light') {
  // 1) Citas de otras IAs: se abre cada página citada (máx. 12) y la cita deja de ser HECHO si no se puede comprobar.
  const pageCache = {};
  let pages = 0;
  for (let k = 0; k < candidates.length; k++) {
    const c = candidates[k];
    if (!(c.evidence_quotes || []).length) continue;
    const checks = [];
    for (const eq of c.evidence_quotes) {
      if (!(eq.url in pageCache)) { if (pages >= 12) { pageCache[eq.url] = null; } else { pages++; const r = await fetchSite(eq.url); pageCache[eq.url] = r.ok ? r.html : null; } }
      checks.push({ url: eq.url, quote: eq.quote, found: pageCache[eq.url] === null ? null : quoteInPage(pageCache[eq.url], eq.quote) });
    }
    candidates[k] = applyQuoteChecks(c, checks);
    if (candidates[k].quote_checks.unverified) notes.push(c.company_name + ': ' + candidates[k].quote_checks.unverified + ' cita(s) no verificada(s) → pasan de hecho a inferencia');
  }
  let n = 0;
  for (const c of candidates) { if (n >= 15 || !c.website || c.site_verified) continue; n++; const r = await fetchSite(c.website); if (!r.ok) { notes.push('sitio no verificable: ' + c.website); continue; } c.site_verified = true; const sg = siteSignals(r.html);
    if (!c.contact.email && sg.emails[0]) { c.contact.email = sg.emails[0]; notes.push('correo hallado en el sitio de ' + c.company_name); }
    if (!c.contact.phone && sg.phones[0]) c.contact.phone = sg.phones[0];
    if (!c.contact.whatsapp && sg.whatsapp) c.contact.whatsapp = sg.whatsapp; }
}
const max = action === 'analyze' ? 300 : 25;
if (action === 'act' && !(body.act && (typeof body.act === 'string' || body.act.type))) throw new Error('act.type obligatorio (create_prospect, create_in_ghl, prepare_email, send_email, mark_contacted, log_instagram, log_whatsapp, log_phone, discard, follow_up, move_stage, add_note)');
if (!candidates.length) throw new Error('Sin prospectos: envía prospects[], html, csv, text, urls[] o targets[].');
if (candidates.length > max) throw new Error('Demasiados prospectos (' + candidates.length + '): máximo ' + max + ' por solicitud en ' + action + '; divide en lotes.');
const keys = [...new Set(candidates.map((c) => candidateKeys(c)).flat())];
return [{ json: { action, request_id: rid || null, source, options, act: body.act && typeof body.act === 'object' ? body.act : (typeof body.act === 'string' ? { type: body.act, ...(body.params || {}) } : null), candidates, notes, keys, now } }];
} catch (e) { return [{ json: { fatal: String((e && e.message) || e) } }]; }`;

export const evaluateCode = (cfg) => `${LIB}

const CFG = ${JSON.stringify(cfg)};
const req = $('Parse').first().json;
const lk = $('Lookup').first().json || {};
if ((lk.statusCode || 0) >= 300) throw new Error('Supabase gateway_lookup falló (HTTP ' + lk.statusCode + '): ' + JSON.stringify(lk.body || {}).slice(0, 200));
const cr = $('GHL Contacts').first().json || {};
const orr = $('GHL Opps').first().json || {};
const contacts = (cr.statusCode || 0) < 300 && cr.body && Array.isArray(cr.body.contacts) ? cr.body.contacts : [];
const opps = (orr.statusCode || 0) < 300 && orr.body && Array.isArray(orr.body.opportunities) ? orr.body.opportunities : [];
const st = { lookup: Array.isArray(lk.body) ? lk.body : [], contacts, opps, contacts_ok: (cr.statusCode || 0) < 300 && Boolean(cr.body), opps_ok: (orr.statusCode || 0) < 300 && Boolean(orr.body),
  contacts_total: Number((cr.body && cr.body.meta && cr.body.meta.total) || contacts.length), opps_total: Number((orr.body && orr.body.meta && orr.body.meta.total) || opps.length) };
if (req.act && req.act.type === undefined && req.action === 'act') throw new Error('act.type obligatorio');
const ev = evaluateRequest(req, st, CFG, req.now);
return [{ json: { req, ev, cfg: CFG } }];`;

export const plan1Code = `${LIB}

const { ev, cfg } = $('Evaluate').first().json;
return planStage1(ev.items, cfg).map((o) => ({ json: o }));`;

export const plan2Code = `${LIB}

const { req, ev, cfg } = $('Evaluate').first().json;
const s1ops = $('Plan S1').all().map((i) => i.json);
const s1res = $('Exec S1').all().map((i) => i.json);
const p2 = planStage2(ev.items, s1ops, s1res, cfg, req.now, { reason: req.options && req.options.manual_override_reason });
return p2.ops.map((o) => ({ json: o }));`;

export const finalizeCode = (packId) => `${LIB}

const { req, ev, cfg } = $('Evaluate').first().json;
const s1ops = $('Plan S1').all().map((i) => i.json);
const s1res = $('Exec S1').all().map((i) => i.json);
const p2 = planStage2(ev.items, s1ops, s1res, cfg, req.now, { reason: req.options && req.options.manual_override_reason });
const s2res = $('Exec S2').all().map((i) => i.json);
const fin = finalizeRun(req, ev.items, p2.ops, s2res, p2.contactIds, p2.errors, cfg, { pack_id: '${packId}', request_id: req.request_id, now: req.now, by: req.options.by, reason: req.options.manual_override_reason });
fin.response.notes = req.notes;
fin.response.ghl_index_complete = ev.ghl_index_complete;
return [{ json: { rows: fin.rows, log: fin.log, response: fin.response } }];`;

export const analyzeCode = `${LIB}

const { req, ev } = $('Evaluate').first().json;
const r = analyzeResponse(req, ev);
r.notes = req.notes;
return [{ json: r }];`;

export const cachedCode = `const b = Array.isArray($json.body) ? $json.body[0] : null;
const resp = b && b.response ? b.response : {};
return [{ json: { ...resp, replayed: true, note: 'Respuesta almacenada para este request_id (idempotencia): no se volvió a ejecutar nada.' } }];`;

export function buildProspectGateway(mode = 'real') {
  const test = mode === 'test';
  const pack = test ? PACKS.test : PACKS.real;
  const cfg = GATEWAY_CFG;
  const nodes = [
    { id: uuid(), name: 'Gateway Webhook', type: 'n8n-nodes-base.webhook', typeVersion: 2, position: [0, 0], webhookId: uuid(), credentials: INGEST_CRED,
      parameters: { httpMethod: 'POST', path: test ? 'atacama-prospect-gateway-test' : 'atacama-prospect-gateway', authentication: 'headerAuth', responseMode: 'lastNode', options: {} } },
    code('Parse', parseCode(pack), [240, 0]),
    ifNode('Valid?', '!$json.fatal', [360, 0]),
    code('Respond Error', "return [{ json: { ok: false, error: $json.fatal, hint: 'Ver docs/PROSPECT-GATEWAY.md (contrato, comandos y ejemplos).', wrote_nothing: true, safety: { messages_sent: 0 } } }];", [600, -160]),
    sb('Idem Check', 'GET', `={{ "${SUPABASE}/rest/v1/prospect_gateway_log?icp_pack_id=eq.${pack}&request_id=eq." + encodeURIComponent($json.request_id || "__none__") + "&select=response&limit=1" }}`, null, [480, 0]),
    ifNode('Cached?', 'Array.isArray($json.body) && $json.body.length > 0', [720, 0]),
    code('Respond Cached', cachedCode, [960, -140]),
    sb('Lookup', 'POST', `${SUPABASE}/rest/v1/rpc/gateway_lookup`, `={{ JSON.stringify({ p_pack: "${pack}", p_keys: $("Parse").first().json.keys }) }}`, [960, 120]),
    ghlGet('GHL Contacts', `${GHL}/contacts/?locationId=${cfg.locationId}&limit=100`, [1200, 120]),
    ghlGet('GHL Opps', `${GHL}/opportunities/search?location_id=${cfg.locationId}&pipeline_id=${cfg.pipelineId}&limit=100`, [1440, 120]),
    code('Evaluate', evaluateCode(cfg), [1680, 120]),
    ifNode('Is Analyze?', '$json.req.action === "analyze"', [1920, 120]),
    code('Respond Analyze', analyzeCode, [2160, -20]),
    code('Plan S1', plan1Code, [2160, 260]),
    ghlExec('Exec S1', [2400, 260]),
    code('Plan S2', plan2Code, [2640, 260]),
    ghlExec('Exec S2', [2880, 260]),
    code('Finalize', finalizeCode(pack), [3120, 260]),
    sb('Persist', 'POST', `${SUPABASE}/rest/v1/prospect_candidates?on_conflict=icp_pack_id,candidate_key`, '={{ JSON.stringify($json.rows) }}', [3360, 260], 'resolution=merge-duplicates,return=minimal'),
    sb('Log', 'POST', `${SUPABASE}/rest/v1/prospect_gateway_log?on_conflict=icp_pack_id,request_id`, '={{ JSON.stringify($("Finalize").first().json.log.request_id ? [$("Finalize").first().json.log] : []) }}', [3600, 260], 'resolution=ignore-duplicates,return=minimal'),
    code('Respond', 'const r = $("Finalize").first().json.response;\nconst p = $("Persist").first().json || {};\nif ((p.statusCode || 0) >= 300) r.persist_error = "Supabase prospect_candidates falló (HTTP " + p.statusCode + "): " + JSON.stringify(p.body || {}).slice(0, 200);\nreturn [{ json: r }];', [3840, 260]),
  ];
  const c = {
    'Gateway Webhook': { main: [to('Parse')] }, 'Parse': { main: [to('Valid?')] }, 'Valid?': { main: [to('Idem Check'), to('Respond Error')] }, 'Idem Check': { main: [to('Cached?')] },
    'Cached?': { main: [to('Respond Cached'), to('Lookup')] },
    'Lookup': { main: [to('GHL Contacts')] }, 'GHL Contacts': { main: [to('GHL Opps')] }, 'GHL Opps': { main: [to('Evaluate')] }, 'Evaluate': { main: [to('Is Analyze?')] },
    'Is Analyze?': { main: [to('Respond Analyze'), to('Plan S1')] },
    'Plan S1': { main: [to('Exec S1')] }, 'Exec S1': { main: [to('Plan S2')] }, 'Plan S2': { main: [to('Exec S2')] }, 'Exec S2': { main: [to('Finalize')] },
    'Finalize': { main: [to('Persist')] }, 'Persist': { main: [to('Log')] }, 'Log': { main: [to('Respond')] },
  };
  return { name: `Atacama Labs - 19 Prospect Gateway${test ? ' (TEST)' : ''}`, nodes, connections: c, settings: { executionOrder: 'v1' } };
}

if (process.argv[1] && process.argv[1].endsWith('prospect-gateway.mjs')) {
  const out = new URL('../atacama-labs-19-prospect-gateway.json', import.meta.url);
  fs.writeFileSync(out, JSON.stringify(buildProspectGateway(process.env.MODE === 'test' ? 'test' : 'real'), null, 2) + '\n');
  console.log('escrito', out.pathname, '· funciones incrustadas:', LIB.split('\nfunction ').length - 1);
}
