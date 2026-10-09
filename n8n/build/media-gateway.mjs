#!/usr/bin/env node
/**
 * Atacama OS · workflow n8n «30 Media Gateway» (Ola B · bloque B) — puerta única para pedir, seguir y cerrar assets visuales.
 *
 * POST /webhook/atacama-media-gateway  (X-Atacama-Key)  { action, ... }
 *   request   → valida el brief y la marca, enruta a un proveedor (renderer | manual | higgsfield), registra el asset (idempotente por pieza+necesidad+brief)
 *               y lo deja en cola o «unavailable» con el motivo VISIBLE. Reutiliza un asset ya renderizado con el mismo hash.
 *   status    → un asset (id) o los de una pieza (piece_id)
 *   list      → assets por estado (para el worker local y para /ops)
 *   complete  → el worker cierra el asset: ready (URLs https ya alojadas) o failed (error visible)
 *   cancel    → cancela un asset que aún no está listo
 *
 * Solo lee/escribe media_assets (+ lee content_config y content_pieces). NO publica, NO programa, NO aprueba, NO crea piezas y NO llama a ningún proveedor
 * generativo: la generación (si algún día se autoriza) la hace el worker local, nunca este workflow. La pieza sigue entrando por «12 Content Intake».
 */
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import * as mg from '../../scripts/media/media-gateway-core.mjs';

const SUPABASE = 'https://uwquwjmiofixzugttals.supabase.co';
const NONE = 'https://localhost.invalid/';
const SUPABASE_CRED = { supabaseApi: { id: 'XOmXUuyLVSazDIh5', name: 'Atacama Labs - Supabase' } };
const INGEST_CRED = { httpHeaderAuth: { id: 'lUGhlXVaQBEiEh5S', name: 'Atacama Labs - Ingest Key' } };
const full = (timeout = 30000) => ({ response: { response: { fullResponse: true, neverError: true, responseFormat: 'json' } }, timeout });
const code = (name, jsCode, pos) => ({ id: randomUUID(), name, type: 'n8n-nodes-base.code', typeVersion: 2, position: pos, parameters: { jsCode } });
const to = (n) => [{ node: n, type: 'main', index: 0 }];
const ifNode = (name, expr, pos) => ({ id: randomUUID(), name, type: 'n8n-nodes-base.if', typeVersion: 2.2, position: pos,
  parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' }, combinator: 'and', conditions: [{ leftValue: `={{ (${expr}) ? "yes" : "no" }}`, rightValue: 'yes', operator: { type: 'string', operation: 'equals' } }] }, options: {} } });
const sbApply = (name, pos) => ({ id: randomUUID(), name, type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: pos, credentials: SUPABASE_CRED, continueOnFail: true, alwaysOutputData: true, retryOnFail: true, maxTries: 3, waitBetweenTries: 1500,
  parameters: { method: '={{ $json.skip ? "GET" : ($json.method || "POST") }}', url: `={{ $json.skip ? "${SUPABASE}/rest/v1/content_config?select=id&limit=1" : "${SUPABASE}/rest/v1/" + $json.path }}`, authentication: 'predefinedCredentialType', nodeCredentialType: 'supabaseApi', sendHeaders: true,
    headerParameters: { parameters: [{ name: 'Prefer', value: '={{ $json.prefer || "return=minimal" }}' }] }, sendBody: true, specifyBody: 'json', jsonBody: '={{ JSON.stringify($json.body || {}) }}', options: full() } });

export const ACTIONS = ['request', 'status', 'list', 'complete', 'cancel'];
export const LIB = Object.values(mg).filter((f) => typeof f === 'function').map((f) => f.toString()).join('\n\n');

export const PARSE = `${LIB}

try {
  const w = $('Media Webhook').first().json || {};
  const b = w.body || w;
  const action = String(b.action || '').toLowerCase();
  const ACTIONS = ${JSON.stringify(ACTIONS)};
  if (!ACTIONS.includes(action)) throw new Error('action inválida: usa ' + ACTIONS.join(' | '));
  const isUuid = (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v || ''));
  const sb = '${SUPABASE}/rest/v1/';
  const reads = [];
  const add = (key, path) => reads.push({ key, url: sb + path });
  add('config', 'content_config?id=eq.1&select=media_generative_enabled,media_generative_budget_usd');
  const SEL = 'id,request_key,piece_id,need,operation,provider,status,brief,brand_check,reference_url,urls,content_hash,cost_estimate_usd,cost_authorized,error,attempts,meta,is_test,created_at,updated_at';
  let key = null;
  if (action === 'request') {
    const req = { piece_id: b.piece_id || null, need: b.need, brief: b.brief, composition: b.composition, operation: b.operation, reference_url: b.reference_url, source_asset_id: b.source_asset_id, variation: b.variation === true, edit: b.edit === true, provider: b.provider };
    key = mgRequestKey(req);
    add('same', 'media_assets?request_key=eq.' + key + '&select=' + SEL);
    if (mgNeeds().includes(String(b.need || ''))) add('ready', 'media_assets?status=eq.ready&need=eq.' + b.need + '&content_hash=not.is.null&select=' + SEL + '&order=created_at.desc&limit=40');
    if (b.piece_id) { if (!isUuid(b.piece_id)) throw new Error('piece_id inválido'); add('piece', 'content_pieces?id=eq.' + b.piece_id + '&select=id,status,format,channel,is_test,piece'); }
    if (b.source_asset_id && isUuid(b.source_asset_id)) add('source', 'media_assets?id=eq.' + b.source_asset_id + '&select=' + SEL);
  } else if (action === 'status') {
    if (isUuid(b.id)) add('assets', 'media_assets?id=eq.' + b.id + '&select=' + SEL);
    else if (isUuid(b.piece_id)) add('assets', 'media_assets?piece_id=eq.' + b.piece_id + '&select=' + SEL + '&order=created_at.desc&limit=20');
    else throw new Error('status necesita id o piece_id (uuid)');
  } else if (action === 'list') {
    const st = String(b.status || '').split(',').filter((x) => ['requested', 'queued', 'generating', 'ready', 'failed', 'unavailable', 'cancelled'].includes(x));
    add('assets', 'media_assets?' + (st.length ? 'status=in.(' + st.join(',') + ')&' : '') + 'is_test=eq.' + (b.test === true ? 'true' : 'false') + '&select=' + SEL + '&order=created_at.desc&limit=' + Math.min(Math.max(parseInt(b.limit, 10) || 25, 1), 100));
  } else {
    if (!isUuid(b.id)) throw new Error('id (uuid del asset) obligatorio');
    add('asset', 'media_assets?id=eq.' + b.id + '&select=' + SEL);
  }
  return [{ json: { action, b: { ...b, action: undefined }, key, reads } }];
} catch (e) { return [{ json: { fatal: String((e && e.message) || e) } }]; }`;

export const EXPAND_READS = `const p = $('Parse').first().json;
return p.reads.map((r) => ({ json: r }));`;

export const COMPUTE = `${LIB}

const p = $('Parse').first().json;
const b = p.b || {};
const A = p.action;
const res = $('Read').all().map((i) => i.json);
const R = {}; const bad = [];
p.reads.forEach((r, i) => { const x = res[i] || {}; if (!x.statusCode || x.statusCode >= 300) bad.push(r.key + ': ' + (x.statusCode ? 'HTTP ' + x.statusCode : 'sin respuesta')); R[r.key] = Array.isArray(x.body) ? x.body : []; });
const safety = { published: 0, scheduled: 0, approved: 0, generated_with_cost: 0, note: 'El Media Gateway solo produce assets; la pieza entra por el Content Intake y termina in_review.' };
if (bad.length) return [{ json: { resp: { ok: false, error: 'lectura_fallida', message: 'No pude leer Supabase: ' + bad.join('; '), safety }, writes: [] } }];
const cfg = (R.config || [])[0] || {};
const nowIso = new Date().toISOString();
const uuid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => { const r = (Math.random() * 16) | 0; return (c === 'x' ? r : (r & 3) | 8).toString(16); });
const view = (a) => ({ id: a.id, piece_id: a.piece_id, need: a.need, operation: a.operation, provider: a.provider, status: a.status, error: a.error || null, urls: a.urls || [], attempts: a.attempts, cost_estimate_usd: a.cost_estimate_usd, cost_authorized: a.cost_authorized, content_hash: a.content_hash, created_at: a.created_at, updated_at: a.updated_at, reason: (a.meta || {}).reason || null, alternatives: (a.meta || {}).alternatives || [] });
const writes = [];
let resp = { ok: true, action: A };
const fail = (error, message, extra) => { resp = { ok: false, action: A, error, message, ...(extra || {}) }; };

if (A === 'request') {
  const req = { piece_id: b.piece_id || null, need: b.need, brief: String(b.brief || '').trim(), composition: b.composition ? String(b.composition).slice(0, 80) : '', operation: b.operation, reference_url: b.reference_url || null, source_asset_id: b.source_asset_id || null, variation: b.variation === true, edit: b.edit === true, provider: b.provider, cost_authorized: b.cost_authorized === true };
  const v = mgValidateRequest(req);
  const piece = (R.piece || [])[0] || null;
  if (!v.ok) fail('solicitud_invalida', 'La solicitud no es válida: ' + v.errors.join('; '), { errors: v.errors });
  else if (req.piece_id && !piece) fail('pieza_no_encontrada', 'No existe esa pieza (piece_id).');
  else if (req.source_asset_id && !(R.source || [])[0]) fail('asset_origen_no_encontrado', 'No existe el asset de origen (source_asset_id) para editar o variar.');
  else {
    const slides = piece && piece.piece && Array.isArray(piece.piece.slides) ? piece.piece.slides : [];
    const wantsRender = mgOperation(req) === 'render';
    if (wantsRender && piece && !slides.length) {
      fail('pieza_sin_slides', 'El renderer necesita las slides de la pieza (piece.slides): redáctalas primero y vuelve a pedir el visual.');
    } else {
      const content_hash = wantsRender && piece ? mgRenderHash(piece.piece) : null;
      const plan = mgPlan({ ...req, content_hash }, (R.same || []).concat(R.ready || []), cfg);
      const route = plan.route;
      const isTest = b.test === true || (piece && piece.is_test === true);
      const prompt = route.provider === 'higgsfield' ? mgBuildPrompt(req) : null;
      if (plan.action === 'existing') {
        resp = { ok: true, action: A, deduped: true, asset: view(plan.asset), message: 'Ya existe un asset para esta solicitud (' + plan.asset.status + '): no se crea otro.' };
      } else {
        const row = { request_key: plan.request_key, piece_id: req.piece_id, need: req.need, operation: route.operation, provider: route.provider || 'none', status: route.status, brief: req.brief, prompt, brand_check: v.brand,
          reference_url: req.reference_url, source_asset_id: req.source_asset_id, content_hash, cost_estimate_usd: route.cost_estimate_usd == null ? 0 : route.cost_estimate_usd, cost_authorized: req.cost_authorized === true && route.provider === 'higgsfield' && route.status === 'queued',
          error: route.status === 'unavailable' ? route.reason : null, is_test: isTest, created_by: 'media-gateway',
          meta: { reason: route.reason, alternatives: route.alternatives, needs_authorization: route.needs_authorization, composition: req.composition || null }, updated_at: nowIso };
        if (plan.action === 'retry') {
          writes.push({ method: 'PATCH', path: 'media_assets?id=eq.' + plan.asset.id, body: { ...row, attempts: (plan.asset.attempts || 0) + 1 } });
          resp = { ok: true, action: A, retried: true, asset: view({ ...plan.asset, ...row, attempts: (plan.asset.attempts || 0) + 1 }) };
        } else {
          const id = uuid();
          if (plan.action === 'reuse') {
            row.status = 'ready'; row.urls = plan.asset.urls; row.error = null; row.provider = plan.asset.provider; row.meta = { ...row.meta, reused_from: plan.asset.id, reason: 'Reutilizado: ya existía un render idéntico (mismo contenido)' };
          }
          writes.push({ method: 'POST', path: 'media_assets', body: { id, ...row } });
          resp = { ok: true, action: A, created: plan.action === 'create', reused: plan.action === 'reuse', asset: view({ id, ...row, attempts: 0, created_at: nowIso }) };
        }
        const st = resp.asset.status;
        resp.message = st === 'ready' ? 'Asset reutilizado: ya estaba listo para asociarlo a la pieza.' : st === 'queued' ? (route.provider === 'renderer' ? 'En cola para el renderer. Se produce en el equipo de Christian: node scripts/media/media-gateway.mjs run' : route.provider === 'manual' ? 'Esperando el asset de Christian (captura, foto o imagen propia).' : 'En cola.') : 'NO disponible: ' + route.reason;
      }
    }
  }
} else if (A === 'status') {
  const rows = R.assets || [];
  if (!rows.length) fail('no_encontrado', 'No hay assets para esa consulta.');
  else resp = { ok: true, action: A, count: rows.length, assets: rows.map(view) };
} else if (A === 'list') {
  const rows = R.assets || [];
  resp = { ok: true, action: A, count: rows.length, assets: rows.map(view), providers: Object.fromEntries(Object.entries(mgProviders(cfg)).map(([k, x]) => [k, { enabled: x.enabled, verified: x.verified, kind: x.kind, note: x.note }])) };
} else if (A === 'complete') {
  const a = (R.asset || [])[0];
  if (!a) fail('asset_no_encontrado', 'No existe ese asset.');
  else if (!['queued', 'generating', 'requested'].includes(a.status)) fail('estado_no_valido', 'Ese asset está en estado «' + a.status + '»: no se puede cerrar de nuevo.', { current_status: a.status });
  else {
    const r = mgValidateResult({ status: b.status, urls: b.urls, error: b.error, content_hash: b.content_hash });
    if (!r.ok) fail('resultado_invalido', 'El cierre no es válido: ' + r.errors.join('; '), { errors: r.errors });
    else {
      const body = { status: r.value.status, urls: r.value.status === 'ready' ? r.value.urls : a.urls || [], error: r.value.error, updated_at: nowIso };
      if (r.value.content_hash) body.content_hash = r.value.content_hash;
      if (r.value.status === 'failed') body.attempts = (a.attempts || 0) + 1;
      writes.push({ method: 'PATCH', path: 'media_assets?id=eq.' + a.id + '&status=in.(queued,generating,requested)', body });
      resp = { ok: true, action: A, asset: view({ ...a, ...body }), message: r.value.status === 'ready' ? 'Asset listo y asociado a su pieza. Para que llegue a revisión, reenvía la pieza con sus medios (node scripts/content/render-pending.mjs --run).' : 'Asset marcado como fallido (error visible): ' + r.value.error };
    }
  }
} else if (A === 'cancel') {
  const a = (R.asset || [])[0];
  if (!a) fail('asset_no_encontrado', 'No existe ese asset.');
  else if (a.status === 'ready') fail('ya_listo', 'Ese asset ya está listo: no se cancela.');
  else { writes.push({ method: 'PATCH', path: 'media_assets?id=eq.' + a.id, body: { status: 'cancelled', updated_at: nowIso } }); resp = { ok: true, action: A, asset: view({ ...a, status: 'cancelled' }) }; }
}
resp.safety = safety;
return [{ json: { resp, writes } }];`;

export const EXPAND_WRITES = `const w = $('Compute').first().json.writes || [];
if (!w.length) return [{ json: { skip: true } }];
return w.map((x) => ({ json: { skip: false, ...x } }));`;

export const RESPOND = `const c = $('Compute').first().json;
const planned = c.writes || [];
const applied = $('Apply Writes').all().map((i) => i.json).slice(0, planned.length);
const bad = applied.filter((j) => !j.statusCode || j.statusCode >= 300);
const r = { ...c.resp };
if (bad.length) { r.ok = false; r.persist_error = 'Supabase ' + (bad[0].statusCode ? 'HTTP ' + bad[0].statusCode : 'sin respuesta (red)') + ': ' + JSON.stringify(bad[0].body || {}).slice(0, 160); }
return [{ json: r }];`;

export function buildMediaGateway() {
  const nodes = [
    { id: randomUUID(), name: 'Media Webhook', type: 'n8n-nodes-base.webhook', typeVersion: 2, position: [0, 0], webhookId: randomUUID(), credentials: INGEST_CRED, parameters: { httpMethod: 'POST', path: 'atacama-media-gateway', authentication: 'headerAuth', responseMode: 'lastNode', options: {} } },
    code('Parse', PARSE, [220, 0]),
    ifNode('Valid?', '!$json.fatal', [400, 0]),
    code('Respond Error', "return [{ json: { ok: false, error: $json.fatal, safety: { published: 0, scheduled: 0, approved: 0, generated_with_cost: 0 } } }];", [620, -180]),
    code('Expand Reads', EXPAND_READS, [620, 0]),
    { id: randomUUID(), name: 'Read', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [840, 0], credentials: SUPABASE_CRED, continueOnFail: true, alwaysOutputData: true,
      parameters: { method: 'GET', url: '={{ $json.url }}', authentication: 'predefinedCredentialType', nodeCredentialType: 'supabaseApi', options: full() } },
    code('Compute', COMPUTE, [1060, 0]),
    code('Expand Writes', EXPAND_WRITES, [1280, 0]),
    sbApply('Apply Writes', [1500, 0]),
    code('Respond', RESPOND, [1720, 0]),
  ];
  const c = { 'Media Webhook': { main: [to('Parse')] }, 'Parse': { main: [to('Valid?')] }, 'Valid?': { main: [to('Expand Reads'), to('Respond Error')] }, 'Expand Reads': { main: [to('Read')] }, 'Read': { main: [to('Compute')] }, 'Compute': { main: [to('Expand Writes')] }, 'Expand Writes': { main: [to('Apply Writes')] }, 'Apply Writes': { main: [to('Respond')] } };
  return { name: 'Atacama Labs - 30 Media Gateway', nodes, connections: c, settings: { executionOrder: 'v1' } };
}

if (process.argv[1] && process.argv[1].endsWith('media-gateway.mjs')) {
  const out = new URL('../atacama-labs-30-media-gateway.json', import.meta.url);
  fs.writeFileSync(out, JSON.stringify(buildMediaGateway(), null, 2) + '\n');
  console.log('escrito', out.pathname);
}
