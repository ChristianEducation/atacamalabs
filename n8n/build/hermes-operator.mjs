#!/usr/bin/env node
/**
 * Atacama OS · workflow n8n «20 Hermes Operator» — la ÚNICA puerta por la que Hermes opera Atacama OS.
 *
 * POST /webhook/atacama-hermes-operator  (cabecera X-Atacama-Key)  { tool, request_id, params, order_text?, confirmation_code? }
 *
 * Parse + política de permisos (niveles 1/2/3) → idempotencia (operator_audit_log) → [rechazos: auditan y responden]
 * → lectura acotada de Supabase (prospectos / último análisis) → Prospect Gateway (workflow 19) o lectura acotada de GHL
 * → respuesta + fila de auditoría («Christian vía Hermes», herramienta, entidad, resultado, request_id) + caché del análisis.
 * Hermes NO recibe el token de GHL: solo la clave de ingesta de n8n. NUNCA envía mensajes (send_* quedan bloqueados).
 *
 * Uso: node n8n/build/hermes-operator.mjs  → escribe n8n/atacama-labs-20-hermes-operator.json
 */
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import * as op from '../../scripts/operator/operator-core.mjs';

const SUPABASE = 'https://uwquwjmiofixzugttals.supabase.co';
const GHL = 'https://services.leadconnectorhq.com';
export const N8N_BASE = 'https://n8n.srv1650725.hstgr.cloud';
export const OPERATOR_CFG = {
  locationId: 'pxHuOsiz2i3lM6BtC9IM', pipelineId: 'trSWhAcNDyUMmPlYIEib',
  stages: { nuevo: 'aad0ad01-bffd-4ea9-b00c-7ab11dc941f6', investigado: '2216d3ae-d153-4446-bc3b-77d0a240e415', contactado: 'b947fae7-0941-4296-a76b-e9a826dd47d0', respondio: '38059f54-3ebf-47cd-9a10-126589e61b86',
    diagnostico: 'fec1e794-fb25-4242-806d-f3c13316df6e', propuesta: '62d85e18-1bef-44fa-a82d-cf45462d1ae5', seguimiento: 'b8d98d33-b593-4b0e-b0da-0aa8ab0ffa4d' },
};
const SUPABASE_CRED = { supabaseApi: { id: 'XOmXUuyLVSazDIh5', name: 'Atacama Labs - Supabase' } };
const GHL_CRED = { httpHeaderAuth: { id: '4Vc6nfxyKjZ14Bep', name: 'GHL — Atacama OS' } };
const INGEST_CRED = { httpHeaderAuth: { id: 'lUGhlXVaQBEiEh5S', name: 'Atacama Labs - Ingest Key' } };
const uuid = () => randomUUID();
const full = (timeout = 30000) => ({ response: { response: { fullResponse: true, neverError: true, responseFormat: 'json' } }, timeout });
const code = (name, jsCode, pos) => ({ id: uuid(), name, type: 'n8n-nodes-base.code', typeVersion: 2, position: pos, parameters: { jsCode } });
const sbGet = (name, urlExpr, pos) => ({ id: uuid(), name, type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: pos, credentials: SUPABASE_CRED, continueOnFail: true, alwaysOutputData: true,
  parameters: { method: 'GET', url: urlExpr, authentication: 'predefinedCredentialType', nodeCredentialType: 'supabaseApi', options: full() } });
const sbPost = (name, url, bodyExpr, pos, prefer) => ({ id: uuid(), name, type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: pos, credentials: SUPABASE_CRED, continueOnFail: true, alwaysOutputData: true,
  parameters: { method: 'POST', url, authentication: 'predefinedCredentialType', nodeCredentialType: 'supabaseApi', sendHeaders: true, headerParameters: { parameters: [{ name: 'Prefer', value: prefer }] }, sendBody: true, specifyBody: 'json', jsonBody: bodyExpr, options: full() } });
const ifNode = (name, expr, pos) => ({ id: uuid(), name, type: 'n8n-nodes-base.if', typeVersion: 2.2, position: pos,
  parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' }, combinator: 'and', conditions: [{ leftValue: `={{ (${expr}) ? "yes" : "no" }}`, rightValue: 'yes', operator: { type: 'string', operation: 'equals' } }] }, options: {} } });
const to = (n) => [{ node: n, type: 'main', index: 0 }];

export const LIB = [...new Map(Object.values(op).filter((f) => typeof f === 'function').map((f) => [f.name, f])).values()].map((f) => f.toString()).join('\n\n');

export const parseCode = `${LIB}

try {
  const first = $('Operator Webhook').first().json || {};
  const body = first.body || first;
  const req = parseRequest(body, Date.now());
  if (!req.ok) return [{ json: { fatal: req.error, tools: req.tools || null } }];
  return [{ json: req }];
} catch (e) { return [{ json: { fatal: String((e && e.message) || e) } }]; }`;

export const errorCode = "return [{ json: { ok: false, error: $json.fatal, tools: $json.tools || undefined, hint: 'Ver docs/HERMES-OPERATOR.md (herramientas, niveles y ejemplos).', executed: false, safety: { messages_sent: 0 } } }];";

export const cachedCode = `const b = Array.isArray($json.body) ? $json.body[0] : null;
const resp = b && b.response ? b.response : {};
return [{ json: { ...resp, replayed: true, note: 'Respuesta almacenada para este request_id (idempotencia): no se volvió a ejecutar nada.' } }];`;

export const refusalCode = `${LIB}

const req = $('Parse').first().json;
const r = refusalResponse(req);
return [{ json: r }];`;

export const queriesCode = `${LIB}

const req = $('Parse').first().json;
const q = resolveQueries(req, '${SUPABASE}');
const none = 'https://localhost.invalid/';
return [{ json: { rows_url: q.rows_url || none, analysis_url: q.analysis_url || none } }];`;

export const buildCode = `${LIB}

const CFG = ${JSON.stringify(OPERATOR_CFG)};
const req = $('Parse').first().json;
const fr = $('Fetch Rows').first().json || {};
const fa = $('Fetch Analysis').first().json || {};
const rows = (fr.statusCode || 0) < 300 && Array.isArray(fr.body) ? fr.body : [];
const analysis = (fa.statusCode || 0) < 300 && Array.isArray(fa.body) && fa.body.length ? fa.body[0] : null;
const calls = buildCalls(req, rows, analysis, CFG);
const none = 'https://localhost.invalid/';
const gw = calls.gateway_body ? { skip: false, url: '${N8N_BASE}/webhook/atacama-prospect-gateway', body: { ...calls.gateway_body, request_id: 'op-' + req.request_id.slice(0, 70) } } : { skip: true, url: none, body: {} };
const eng = calls.engine_body ? { skip: false, url: '${N8N_BASE}/webhook/atacama-outreach-engine', body: calls.engine_body } : { skip: true, url: none, body: {} };
const ghl = calls.ghl_call ? { skip: false, url: calls.ghl_call.url, method: calls.ghl_call.method, body: calls.ghl_call.body || {} } : { skip: true, url: none, method: 'GET', body: {} };
return [{ json: { req, calls, rows, analysis, gw, ghl, eng, cfg: CFG } }];`;

export const shapeCode = `${LIB}

const { req, calls, rows, analysis, cfg } = $('Build').first().json;
const g = $('Call Gateway').first().json || {};
const h = $('GHL Read').first().json || {};
const e = $('Call Engine').first().json || {};
const engBody = calls.engine_body ? ((e.statusCode || 0) < 300 && e.body && typeof e.body === 'object' ? e.body : { ok: false, status: 'error', message: 'Motor de correo HTTP ' + (e.statusCode || 'sin respuesta') }) : null;
const gwBody = calls.gateway_body ? ((g.statusCode || 0) < 300 && g.body && typeof g.body === 'object' ? g.body : { ok: false, error: 'Gateway HTTP ' + (g.statusCode || 'sin respuesta') }) : null;
const ghlResp = calls.ghl_call ? { statusCode: h.statusCode || 0, body: h.body || {} } : null;
const out = shapeResponse(req, calls, gwBody, ghlResp, rows, analysis, cfg, engBody);
return [{ json: out }];`;

export const respondCode = `const s = $('Shape').first().json;
const a = $('Save Audit').first().json || {};
const r = { ...s.response };
if ((a.statusCode || 0) >= 300) r.audit_error = 'No se pudo guardar la auditoría (HTTP ' + a.statusCode + '): ' + JSON.stringify(a.body || {}).slice(0, 160);
return [{ json: r }];`;

export function buildHermesOperator() {
  const url = (o) => `={{ ${o} }}`;
  const nodes = [
    { id: uuid(), name: 'Operator Webhook', type: 'n8n-nodes-base.webhook', typeVersion: 2, position: [0, 0], webhookId: uuid(), credentials: INGEST_CRED,
      parameters: { httpMethod: 'POST', path: 'atacama-hermes-operator', authentication: 'headerAuth', responseMode: 'lastNode', options: {} } },
    code('Parse', parseCode, [240, 0]),
    ifNode('Valid?', '!$json.fatal', [360, 0]),
    code('Respond Error', errorCode, [600, -180]),
    sbGet('Idem Check', `={{ "${SUPABASE}/rest/v1/operator_audit_log?request_id=eq." + encodeURIComponent($json.request_id || "__none__") + "&select=response&limit=1" }}`, [480, 0]),
    ifNode('Cached?', 'Array.isArray($json.body) && $json.body.length > 0', [720, 0]),
    code('Respond Cached', cachedCode, [960, -140]),
    ifNode('Refused?', '$("Parse").first().json.refusal', [960, 120]),
    code('Refusal', refusalCode, [1200, -20]),
    sbPost('Audit Refusal', `${SUPABASE}/rest/v1/operator_audit_log?on_conflict=request_id`, '={{ JSON.stringify([$("Refusal").first().json.audit_row]) }}', [1440, -20], 'resolution=ignore-duplicates,return=minimal'),
    code('Respond Refusal', 'return [{ json: $("Refusal").first().json.response }];', [1680, -20]),
    code('Queries', queriesCode, [1200, 260]),
    sbGet('Fetch Rows', url('$("Queries").first().json.rows_url'), [1440, 260]),
    sbGet('Fetch Analysis', url('$("Queries").first().json.analysis_url'), [1680, 260]),
    code('Build', buildCode, [1920, 260]),
    { id: uuid(), name: 'Call Gateway', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [2160, 260], credentials: INGEST_CRED, continueOnFail: true, alwaysOutputData: true,
      parameters: { method: 'POST', url: '={{ $("Build").first().json.gw.url }}', authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth', sendBody: true, specifyBody: 'json', jsonBody: '={{ JSON.stringify($("Build").first().json.gw.body) }}', options: full(150000) } },
    { id: uuid(), name: 'Call Engine', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [2280, 260], credentials: INGEST_CRED, continueOnFail: true, alwaysOutputData: true,
      parameters: { method: 'POST', url: '={{ $("Build").first().json.eng.url }}', authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth', sendBody: true, specifyBody: 'json', jsonBody: '={{ JSON.stringify($("Build").first().json.eng.body) }}', options: full(60000) } },
    { id: uuid(), name: 'GHL Read', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [2400, 260], credentials: GHL_CRED, continueOnFail: true, alwaysOutputData: true,
      parameters: { method: '={{ $("Build").first().json.ghl.method }}', url: '={{ $("Build").first().json.ghl.url }}', authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth', sendHeaders: true,
        headerParameters: { parameters: [{ name: 'Version', value: '2021-07-28' }, { name: 'Accept', value: 'application/json' }] }, sendBody: true, specifyBody: 'json', jsonBody: '={{ JSON.stringify($("Build").first().json.ghl.body) }}', options: full() } },
    code('Shape', shapeCode, [2640, 260]),
    sbPost('Save Audit', `${SUPABASE}/rest/v1/operator_audit_log?on_conflict=request_id`, '={{ JSON.stringify([$("Shape").first().json.audit_row]) }}', [2880, 260], 'resolution=ignore-duplicates,return=minimal'),
    sbPost('Save Cache', `${SUPABASE}/rest/v1/operator_analysis_cache`, '={{ JSON.stringify($("Shape").first().json.cache_row ? [$("Shape").first().json.cache_row] : []) }}', [3120, 260], 'return=minimal'),
    code('Respond', respondCode, [3360, 260]),
  ];
  const c = {
    'Operator Webhook': { main: [to('Parse')] }, 'Parse': { main: [to('Valid?')] }, 'Valid?': { main: [to('Idem Check'), to('Respond Error')] }, 'Idem Check': { main: [to('Cached?')] },
    'Cached?': { main: [to('Respond Cached'), to('Refused?')] }, 'Refused?': { main: [to('Refusal'), to('Queries')] },
    'Refusal': { main: [to('Audit Refusal')] }, 'Audit Refusal': { main: [to('Respond Refusal')] },
    'Queries': { main: [to('Fetch Rows')] }, 'Fetch Rows': { main: [to('Fetch Analysis')] }, 'Fetch Analysis': { main: [to('Build')] }, 'Build': { main: [to('Call Gateway')] },
    'Call Gateway': { main: [to('Call Engine')] }, 'Call Engine': { main: [to('GHL Read')] }, 'GHL Read': { main: [to('Shape')] }, 'Shape': { main: [to('Save Audit')] }, 'Save Audit': { main: [to('Save Cache')] }, 'Save Cache': { main: [to('Respond')] },
  };
  return { name: 'Atacama Labs - 20 Hermes Operator', nodes, connections: c, settings: { executionOrder: 'v1' } };
}

if (process.argv[1] && process.argv[1].endsWith('hermes-operator.mjs')) {
  const out = new URL('../atacama-labs-20-hermes-operator.json', import.meta.url);
  fs.writeFileSync(out, JSON.stringify(buildHermesOperator(), null, 2) + '\n');
  console.log('escrito', out.pathname, '· funciones incrustadas:', LIB.split('\nfunction ').length);
}
