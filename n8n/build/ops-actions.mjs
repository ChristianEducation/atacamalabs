#!/usr/bin/env node
/**
 * Atacama OS · workflow n8n «29 Ops Actions» (/ops V2) — aprobar, editar y rechazar desde el celular.
 *
 * POST /webhook/atacama-ops-actions  (X-Ops-Approval = clave EXCLUSIVA de /ops, distinta de la que usa Hermes)  { action, request_id, … }
 *   overview · email_save · email_approve · email_reject · email_reopen · linkedin_approve · linkedin_reject · content_approve · content_reject
 *
 * NO es una segunda lógica de aprobación: es una puerta con sesión humana hacia las rutas reales ya existentes (21 Outreach Engine, 26 LinkedIn Engine,
 * GHL Social Planner). No envía correos ni mensajes por sí mismo, no hay ejecutor genérico y cada acción queda en operator_audit_log
 * (request_id único → un doble toque no duplica). Un error del motor se devuelve tal cual: nunca un éxito falso.
 */
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import * as li from '../../scripts/linkedin/linkedin-core.mjs';
import * as oa from '../../scripts/ops/ops-actions-core.mjs';

const SUPABASE = 'https://uwquwjmiofixzugttals.supabase.co';
export const N8N_BASE = 'https://n8n.srv1650725.hstgr.cloud';
export const GHL_LOCATION = 'pxHuOsiz2i3lM6BtC9IM';
export const APPROVER = 'OjkAjHMdUjnblO7W1kBZ';
const NONE = 'https://localhost.invalid/';
const SUPABASE_CRED = { supabaseApi: { id: 'XOmXUuyLVSazDIh5', name: 'Atacama Labs - Supabase' } };
const INGEST_CRED = { httpHeaderAuth: { id: 'lUGhlXVaQBEiEh5S', name: 'Atacama Labs - Ingest Key' } };
const GHL_CRED = { httpHeaderAuth: { id: '4Vc6nfxyKjZ14Bep', name: 'GHL — Atacama OS' } };
export const OPS_CRED = { httpHeaderAuth: { id: 'k1OjUzoBnFXBsffh', name: 'Atacama Labs - Ops Approval Key' } };
const uuid = () => randomUUID();
const full = (timeout = 30000) => ({ response: { response: { fullResponse: true, neverError: true, responseFormat: 'json' } }, timeout });
const code = (name, jsCode, pos) => ({ id: uuid(), name, type: 'n8n-nodes-base.code', typeVersion: 2, position: pos, parameters: { jsCode } });
const to = (n) => [{ node: n, type: 'main', index: 0 }];
const ifNode = (name, expr, pos) => ({ id: uuid(), name, type: 'n8n-nodes-base.if', typeVersion: 2.2, position: pos,
  parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' }, combinator: 'and', conditions: [{ leftValue: `={{ (${expr}) ? "yes" : "no" }}`, rightValue: 'yes', operator: { type: 'string', operation: 'equals' } }] }, options: {} } });

const fnsOf = (mod) => Object.values(mod).filter((f) => typeof f === 'function');
export const LIB = [...new Map([...fnsOf(li), ...fnsOf(oa)].map((f) => [f.name, f])).values()].map((f) => f.toString()).join('\n\n');

export const PARSE = `${LIB}

try {
  const w = $('Actions Webhook').first().json || {};
  const b = w.body || w;
  const v = oaValidate(b);
  if (!v.ok) throw new Error(v.message);
  const req = v.req;
  const reads = oaReads(req, '${SUPABASE}/rest/v1/');
  return [{ json: { req, reads, env: { n8n: '${N8N_BASE}', ghl_loc: '${GHL_LOCATION}', approver: '${APPROVER}' } } }];
} catch (e) { return [{ json: { fatal: String((e && e.message) || e) } }]; }`;

export const EXPAND_READS = `const p = $('Parse').first().json;
return p.reads.map((r) => ({ json: r }));`;

/** Código común de los 4 nodos «Plan k»: junta lo ejecutado y pide el siguiente paso o cierra. */
export const planCode = (k) => `${LIB}

const p = $('Parse').first().json;
const req = p.req, env = p.env;
const nowMs = Date.now();
const rd = $('Read').all().map((i) => i.json || {});
const R = {}; const bad = [];
p.reads.forEach((r, i) => { const x = rd[i] || {}; if (!x.statusCode || x.statusCode >= 300) bad.push(r.key); R[r.key] = Array.isArray(x.body) ? x.body : []; });
if (bad.length) return [{ json: { final: { resp: { ok: false, action: req.action, request_id: req.request_id, error: 'lectura_fallida', message: 'No pude leer Supabase (' + bad.join(', ') + '). No se hizo nada.' }, writes: [] }, results: [] } }];
${k === 1 ? `
const a = (R.audit || [])[0];
if (a && a.status === 'executed') return [{ json: { replayed: true, final: { resp: { ...(a.response || {}), ok: true, replayed: true, action: req.action, request_id: req.request_id }, writes: [] }, results: [] } }];
if (req.action === 'overview') return [{ json: { final: { resp: oaOverview(R, nowMs), writes: [] }, results: [] } }];
const step = oaStep(req, R, [], nowMs, env);
return [{ json: { ...step, results: [] } }];` : `
const prev = $('Plan ${k - 1}').first().json;
if (prev.final) return [{ json: { final: prev.final, replayed: prev.replayed || false, results: prev.results || [] } }];
const slot = ${k - 1};
const last = $((prev.call.kind === 'ghl' ? (prev.call.method === 'PUT' ? 'GHL Put ' : 'GHL Get ') : 'Ingest ') + slot).first().json || {};
const results = (prev.results || []).concat([{ statusCode: last.statusCode, body: last.body, error: last.error ? true : false }]);
const step = oaStep(req, R, results, nowMs, env);
return [{ json: { ...step, results } }];`}`;

export const FINISH = `${LIB}

const p = $('Parse').first().json;
const req = p.req;
const plan = $('Plan 4').first().json;
const nowMs = Date.now();
const final = plan.final || { resp: { ok: false, error: 'sin_resultado', message: 'El flujo no terminó.' }, writes: [] };
const rd = $('Read').all().map((i) => i.json || {});
const R = {}; p.reads.forEach((r, i) => { R[r.key] = Array.isArray((rd[i] || {}).body) ? rd[i].body : []; });
const writes = (final.writes || []).slice();
if (req.action !== 'overview' && !plan.replayed) writes.push({ method: 'POST', path: 'operator_audit_log', body: oaAudit(req, R, final, nowMs), prefer: 'return=minimal', audit: true });
return [{ json: { resp: final.resp, writes } }];`;

export const EXPAND_WRITES = `const w = $('Finish').first().json.writes || [];
if (!w.length) return [{ json: { skip: true } }];
return w.map((x) => ({ json: { skip: false, ...x } }));`;

export const RESPOND = `const f = $('Finish').first().json;
const planned = f.writes || [];
const applied = $('Apply Writes').all().map((i) => i.json).slice(0, planned.length);
const r = { ...f.resp };
planned.forEach((w, i) => {
  const a = applied[i] || {};
  const failed = !a.statusCode || a.statusCode >= 300;
  if (w.audit) { if (failed) r.audit_error = 'No quedó registrada en la auditoría (' + (a.statusCode ? 'HTTP ' + a.statusCode : 'sin respuesta') + ').'; return; }
  if (failed) { r.ok = false; r.error = 'no_se_guardo'; r.message = 'La acción no se pudo guardar (' + (a.statusCode ? 'HTTP ' + a.statusCode : 'sin respuesta') + '): ' + JSON.stringify(a.body || {}).slice(0, 140); return; }
  if (w.check_rows && !(Array.isArray(a.body) && a.body.length)) { r.ok = false; r.error = 'sin_cambios'; r.message = w.check_message || 'No se aplicó el cambio.'; }
});
r.safety = { sends_directly: false, note: 'Aprobar activa el flujo real existente; /ops nunca envía ni publica por sí mismo.' };
return [{ json: r }];`;

const ingestNode = (k, pos) => ({ id: uuid(), name: 'Ingest ' + k, type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: pos, credentials: INGEST_CRED, continueOnFail: true, alwaysOutputData: true,
  parameters: { method: 'POST', url: `={{ ($("Plan ${k}").first().json.call && $("Plan ${k}").first().json.call.kind === "ingest") ? $("Plan ${k}").first().json.call.url : "${NONE}" }}`, authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth',
    sendBody: true, specifyBody: 'json', jsonBody: `={{ JSON.stringify(($("Plan ${k}").first().json.call && $("Plan ${k}").first().json.call.body) || {}) }}`, options: full(120000) } });
const ghlNode = (k, verb, pos) => ({ id: uuid(), name: 'GHL ' + verb + ' ' + k, type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: pos, credentials: GHL_CRED, continueOnFail: true, alwaysOutputData: true,
  parameters: { method: verb === 'Put' ? 'PUT' : 'GET',
    url: `={{ ($("Plan ${k}").first().json.call && $("Plan ${k}").first().json.call.kind === "ghl" && $("Plan ${k}").first().json.call.method === "${verb === 'Put' ? 'PUT' : 'GET'}") ? $("Plan ${k}").first().json.call.url : "${NONE}" }}`, authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth',
    sendHeaders: true, headerParameters: { parameters: [{ name: 'Version', value: '2021-07-28' }, { name: 'Accept', value: 'application/json' }] },
    ...(verb === 'Put' ? { sendBody: true, specifyBody: 'json', jsonBody: `={{ JSON.stringify(($("Plan ${k}").first().json.call && $("Plan ${k}").first().json.call.body) || {}) }}` } : {}), options: full(30000) } });

export function buildOpsActions() {
  const nodes = [
    { id: uuid(), name: 'Actions Webhook', type: 'n8n-nodes-base.webhook', typeVersion: 2, position: [0, 0], webhookId: uuid(), credentials: OPS_CRED, parameters: { httpMethod: 'POST', path: 'atacama-ops-actions', authentication: 'headerAuth', responseMode: 'lastNode', options: {} } },
    code('Parse', PARSE, [220, 0]),
    ifNode('Valid?', '!$json.fatal', [400, 0]),
    code('Respond Error', "return [{ json: { ok: false, error: 'solicitud_invalida', message: $json.fatal, safety: { sends_directly: false } } }];", [620, -180]),
    code('Expand Reads', EXPAND_READS, [600, 0]),
    { id: uuid(), name: 'Read', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [800, 0], credentials: SUPABASE_CRED, continueOnFail: true, alwaysOutputData: true,
      parameters: { method: 'GET', url: '={{ $json.url }}', authentication: 'predefinedCredentialType', nodeCredentialType: 'supabaseApi', options: full() } },
    code('Plan 1', planCode(1), [1000, 0]), ingestNode(1, [1200, -80]), ghlNode(1, 'Get', [1200, 80]), ghlNode(1, 'Put', [1200, 200]),
    code('Plan 2', planCode(2), [1400, 0]), ingestNode(2, [1600, -80]), ghlNode(2, 'Get', [1600, 80]), ghlNode(2, 'Put', [1600, 200]),
    code('Plan 3', planCode(3), [1800, 0]), ingestNode(3, [2000, -80]), ghlNode(3, 'Get', [2000, 80]), ghlNode(3, 'Put', [2000, 200]),
    code('Plan 4', planCode(4), [2200, 0]),
    code('Finish', FINISH, [2400, 0]),
    code('Expand Writes', EXPAND_WRITES, [2600, 0]),
    { id: uuid(), name: 'Apply Writes', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [2800, 0], credentials: SUPABASE_CRED, continueOnFail: true, alwaysOutputData: true, retryOnFail: true, maxTries: 3, waitBetweenTries: 1500,
      parameters: { method: '={{ $json.method || "POST" }}', url: `={{ $json.skip ? "${NONE}" : "${SUPABASE}/rest/v1/" + $json.path }}`, authentication: 'predefinedCredentialType', nodeCredentialType: 'supabaseApi', sendHeaders: true,
        headerParameters: { parameters: [{ name: 'Prefer', value: '={{ $json.prefer || "return=minimal" }}' }] }, sendBody: true, specifyBody: 'json', jsonBody: '={{ JSON.stringify($json.body || {}) }}', options: full() } },
    code('Respond', RESPOND, [3000, 0]),
  ];
  const c = {
    'Actions Webhook': { main: [to('Parse')] }, 'Parse': { main: [to('Valid?')] }, 'Valid?': { main: [to('Expand Reads'), to('Respond Error')] }, 'Expand Reads': { main: [to('Read')] }, 'Read': { main: [to('Plan 1')] },
    'Plan 1': { main: [to('Ingest 1')] }, 'Ingest 1': { main: [to('GHL Get 1')] }, 'GHL Get 1': { main: [to('GHL Put 1')] }, 'GHL Put 1': { main: [to('Plan 2')] },
    'Plan 2': { main: [to('Ingest 2')] }, 'Ingest 2': { main: [to('GHL Get 2')] }, 'GHL Get 2': { main: [to('GHL Put 2')] }, 'GHL Put 2': { main: [to('Plan 3')] },
    'Plan 3': { main: [to('Ingest 3')] }, 'Ingest 3': { main: [to('GHL Get 3')] }, 'GHL Get 3': { main: [to('GHL Put 3')] }, 'GHL Put 3': { main: [to('Plan 4')] },
    'Plan 4': { main: [to('Finish')] }, 'Finish': { main: [to('Expand Writes')] }, 'Expand Writes': { main: [to('Apply Writes')] }, 'Apply Writes': { main: [to('Respond')] },
  };
  return { name: 'Atacama Labs - 29 Ops Actions', nodes, connections: c, settings: { executionOrder: 'v1' } };
}

if (process.argv[1] && process.argv[1].endsWith('ops-actions.mjs')) {
  const out = new URL('../atacama-labs-29-ops-actions.json', import.meta.url);
  fs.writeFileSync(out, JSON.stringify(buildOpsActions(), null, 2) + '\n');
  console.log('escrito', out.pathname, '· funciones incrustadas:', LIB.split('\nexport function ').length);
}
