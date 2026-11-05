#!/usr/bin/env node
/**
 * Atacama OS · Content Engine — workflows n8n «15 Content Metrics» y «16 Content Learnings».
 *
 * 15 · Cada 3 horas revisa las piezas `published` (según el sync con GHL) y decide, SIN consultar GHL, si toca un snapshot 24h / 72h / 7d.
 *      Solo si toca: lee el post (`insights`) y las estadísticas de la cuenta (últimos 7 días) y guarda UNA fila en `content_metrics`
 *      (nunca se repite una ventana; una ventana vencida más allá de su tolerancia se registra como perdida, no se estima).
 *      A los 7 días genera el aprendizaje de la pieza (determinista, sin LLM) y lo guarda en `content_pieces.learning`.
 *      Solo lee en GHL; no aprueba, no programa, no publica.
 * 16 · GET autenticado que devuelve los aprendizajes + agregados orientativos + hooks recientes para que Hermes / el Content Engine los consulten
 *      antes de proponer contenido.
 *
 * Uso: node n8n/build/content-metrics.mjs → escribe n8n/atacama-labs-15-content-metrics.json y n8n/atacama-labs-16-content-learnings.json
 */
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import { planMetrics, extractPostMetrics, extractAccountStats, buildSnapshot, actionsOf, buildLearning, summarizeLearnings } from '../../scripts/content/metrics-core.mjs';

const SUPABASE = 'https://uwquwjmiofixzugttals.supabase.co';
const PACK_ID = '0ba54785-bff0-4a2d-a397-64e697d34e38';
const GHL_LOCATION = 'pxHuOsiz2i3lM6BtC9IM';
// Cuentas de Social Planner. `id` identifica la cuenta al crear/leer posts; `profile_id` es el que exige el endpoint de estadísticas.
export const METRIC_ACCOUNTS = {
  instagram: { platform: 'instagram', account_id: '6ac43e3ecfe0752734a5fe1e_pxHuOsiz2i3lM6BtC9IM_17841424613699090', profile_id: '6ac43e4357e651b3b0bd331e' },
  linkedin_page: { platform: 'linkedin', account_id: '6ac4fabe3356d12d204557ea_pxHuOsiz2i3lM6BtC9IM_145278681_page', profile_id: '6ac4fbc04f30bdd64e6f06b3' },
  linkedin_profile: { platform: 'linkedin', account_id: '6ac4fabe3356d12d204557ea_pxHuOsiz2i3lM6BtC9IM_D9Z-EPMxLu_profile', profile_id: '6ac4fbbcafbada9ab4d51f8d' },
};
const SUPABASE_CRED = { supabaseApi: { id: 'XOmXUuyLVSazDIh5', name: 'Atacama Labs - Supabase' } };
const GHL_CRED = { httpHeaderAuth: { id: '4Vc6nfxyKjZ14Bep', name: 'GHL — Atacama OS' } };
const INGEST_CRED = { httpHeaderAuth: { id: 'lUGhlXVaQBEiEh5S', name: 'Atacama Labs - Ingest Key' } };
const full = (timeout = 30000) => ({ response: { response: { fullResponse: true, neverError: true, responseFormat: 'json' } }, timeout });
const code = (name, jsCode, pos, mode) => ({ id: randomUUID(), name, type: 'n8n-nodes-base.code', typeVersion: 2, position: pos, parameters: { ...(mode ? { mode } : {}), jsCode } });
const sb = (name, method, url, bodyExpr, pos, prefer, extra = {}) => ({ id: randomUUID(), name, type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: pos, credentials: SUPABASE_CRED, ...extra,
  parameters: { method, url, authentication: 'predefinedCredentialType', nodeCredentialType: 'supabaseApi', sendHeaders: Boolean(prefer),
    ...(prefer ? { headerParameters: { parameters: [{ name: 'Prefer', value: prefer }] } } : {}),
    ...(bodyExpr ? { sendBody: true, specifyBody: 'json', jsonBody: bodyExpr } : {}), options: full() } });
const ifNode = (name, expr, pos) => ({ id: randomUUID(), name, type: 'n8n-nodes-base.if', typeVersion: 2.2, position: pos,
  parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' }, combinator: 'and', conditions: [{ leftValue: expr, rightValue: 'yes', operator: { type: 'string', operation: 'equals' } }] } } });

const LIB = [planMetrics, extractPostMetrics, extractAccountStats, buildSnapshot, actionsOf, buildLearning].map((f) => f.toString()).join('\n\n');

export const PLAN = `${LIB}

const ACCOUNTS = ${JSON.stringify(METRIC_ACCOUNTS)};
const pubRes = $('Fetch Published').first().json || {};
const metRes = $json || {};
if ((pubRes.statusCode || 0) >= 300 || (metRes.statusCode || 0) >= 300) throw new Error('Supabase falló (piezas HTTP ' + pubRes.statusCode + ', métricas HTTP ' + metRes.statusCode + ')');
const pieces = Array.isArray(pubRes.body) ? pubRes.body : [];
const metrics = Array.isArray(metRes.body) ? metRes.body : [];
const now = Date.now();
const plan = planMetrics(pieces, metrics, now);
const byId = {};
pieces.forEach((p) => { byId[p.id] = p; });
const out = [];
plan.snapshots.forEach((d) => {
  const acc = ACCOUNTS[d.channel];
  if (!acc) return;
  out.push({ json: { kind: 'snapshot', missed: d.missed, due: d, ghl_post_id: d.ghl_post_id, platform: acc.platform, account_id: acc.account_id, profile_id: acc.profile_id } });
});
if (plan.learn.length) {
  const rowsBy = {};
  metrics.forEach((m) => { (rowsBy[m.content_piece_id] = rowsBy[m.content_piece_id] || []).push(m); });
  const peers = pieces.map((p) => {
    const r7 = (rowsBy[p.id] || []).find((m) => m.metric_window === '7d' && m.status !== 'error');
    return { id: p.id, channel: p.channel, category: p.category, format: p.format, actions: r7 ? actionsOf(r7) : null };
  }).filter((p) => typeof p.actions === 'number');
  plan.learn.forEach((l) => {
    const piece = byId[l.piece_id];
    if (piece) out.push({ json: { kind: 'learn', piece_id: piece.id, learning: buildLearning(piece, rowsBy[piece.id] || [], peers, now) } });
  });
}
return out;`;

export const BUILD_SNAPSHOT = `${LIB}

const plan = $('Plan').item.json;
const postRes = $('Fetch GHL Post').item.json || {};
const statRes = $input.item.json || {};
const post = postRes.body && postRes.body.results && postRes.body.results.post ? postRes.body.results.post : null;
const postFound = Boolean(post) && (postRes.statusCode || 0) < 300;
const stats = (statRes.statusCode || 0) < 300 ? extractAccountStats(statRes.body, plan.platform) : null;
const row = buildSnapshot({ due: plan.due, platform: plan.platform, account_id: plan.account_id, now: Date.now(), postFound, postMetrics: postFound ? extractPostMetrics(post) : null, rawInsights: postFound ? (post.insights || null) : null, accountStats: stats });
if (!row) return { json: { skipped: true, reason: 'sin datos; se reintenta en la próxima corrida', piece_id: plan.due.piece_id, window: plan.due.window, post_http: postRes.statusCode, stats_http: statRes.statusCode } };
return { json: { skipped: false, row: { icp_pack_id: '${PACK_ID}', ...row } } };`;

export const BUILD_MISSED = `${LIB}

const plan = $json;
const row = buildSnapshot({ due: plan.due, platform: plan.platform, account_id: plan.account_id, now: Date.now() });
return { json: { skipped: false, row: { icp_pack_id: '${PACK_ID}', ...row } } };`;

export const UPSERT_BODY = '={{ $json.skipped ? "[]" : JSON.stringify([$json.row]) }}';

export function buildContentMetrics() {
  const nodes = [
    { id: randomUUID(), name: 'Every 3 Hours', type: 'n8n-nodes-base.scheduleTrigger', typeVersion: 1.2, position: [0, 0], parameters: { rule: { interval: [{ field: 'hours', hoursInterval: 3 }] } } },
    sb('Fetch Published', 'GET', `${SUPABASE}/rest/v1/content_pieces?icp_pack_id=eq.${PACK_ID}&status=eq.published&ghl_post_id=not.is.null&published_at=not.is.null&select=id,ghl_post_id,channel,category,format,score,topic,published_at,learning,is_test,hook:piece->>hook&limit=200`, null, [240, 0]),
    sb('Fetch Metrics', 'GET', `${SUPABASE}/rest/v1/content_metrics?icp_pack_id=eq.${PACK_ID}&select=*&limit=2000`, null, [480, 0]),
    code('Plan', PLAN, [720, 0]),
    ifNode('Is Learn?', '={{ $json.kind === "learn" ? "yes" : "no" }}', [960, 0]),
    code('Learning Patch', 'const l = $json.learning;\nreturn { json: { piece_id: $json.piece_id, body: { learning: l, learned_at: l.generated_at, updated_at: l.generated_at } } };', [1200, -140], 'runOnceForEachItem'),
    sb('Patch Learning', 'PATCH', '={{ "' + SUPABASE + '/rest/v1/content_pieces?id=eq." + $json.piece_id + "&learning=is.null" }}', '={{ JSON.stringify($json.body) }}', [1440, -140], 'return=minimal'),
    ifNode('Is Missed?', '={{ $json.missed ? "yes" : "no" }}', [1200, 120]),
    code('Build Missed', BUILD_MISSED, [1440, 40], 'runOnceForEachItem'),
    { id: randomUUID(), name: 'Fetch GHL Post', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [1440, 220], credentials: GHL_CRED, continueOnFail: true,
      parameters: { method: 'GET', url: `={{ "https://services.leadconnectorhq.com/social-media-posting/${GHL_LOCATION}/posts/" + $json.ghl_post_id }}`, authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth',
        sendHeaders: true, headerParameters: { parameters: [{ name: 'Version', value: '2021-07-28' }, { name: 'Accept', value: 'application/json' }] }, options: full() } },
    { id: randomUUID(), name: 'Fetch Account Stats', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [1680, 220], credentials: GHL_CRED, continueOnFail: true,
      parameters: { method: 'POST', url: `https://services.leadconnectorhq.com/social-media-posting/statistics?locationId=${GHL_LOCATION}`, authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth',
        sendHeaders: true, headerParameters: { parameters: [{ name: 'Version', value: '2021-07-28' }, { name: 'Accept', value: 'application/json' }] },
        sendBody: true, specifyBody: 'json', jsonBody: '={{ JSON.stringify({ profileIds: [$("Plan").item.json.profile_id], platforms: [] }) }}', options: full() } },
    code('Build Snapshot', BUILD_SNAPSHOT, [1920, 220], 'runOnceForEachItem'),
    sb('Upsert Metric', 'POST', `${SUPABASE}/rest/v1/content_metrics?on_conflict=content_piece_id,metric_window`, UPSERT_BODY, [2160, 120], 'resolution=ignore-duplicates,return=minimal'),
  ];
  const to = (n) => [{ node: n, type: 'main', index: 0 }];
  const connections = {
    'Every 3 Hours': { main: [to('Fetch Published')] },
    'Fetch Published': { main: [to('Fetch Metrics')] },
    'Fetch Metrics': { main: [to('Plan')] },
    'Plan': { main: [to('Is Learn?')] },
    'Is Learn?': { main: [to('Learning Patch'), to('Is Missed?')] },
    'Learning Patch': { main: [to('Patch Learning')] },
    'Is Missed?': { main: [to('Build Missed'), to('Fetch GHL Post')] },
    'Build Missed': { main: [to('Upsert Metric')] },
    'Fetch GHL Post': { main: [to('Fetch Account Stats')] },
    'Fetch Account Stats': { main: [to('Build Snapshot')] },
    'Build Snapshot': { main: [to('Upsert Metric')] },
  };
  return { name: 'Atacama Labs - 15 Content Metrics', nodes, connections, settings: { executionOrder: 'v1' } };
}

export const SUMMARIZE = `${[actionsOf, summarizeLearnings].map((f) => f.toString()).join('\n\n')}

const lRes = $('Fetch Learned').first().json || {};
const rRes = $json || {};
if ((lRes.statusCode || 0) >= 300 || (rRes.statusCode || 0) >= 300) throw new Error('Supabase falló (aprendizajes HTTP ' + lRes.statusCode + ', recientes HTTP ' + rRes.statusCode + ')');
const learned = Array.isArray(lRes.body) ? lRes.body : [];
const recent = Array.isArray(rRes.body) ? rRes.body : [];
const sum = summarizeLearnings(learned);
return [{ json: { ok: true, ...sum,
  recent_pieces: recent.map((p) => ({ status: p.status, channel: p.channel, category: p.category, format: p.format, hook: p.hook })),
  how_to_use: 'Antes de proponer contenido: no repetir los hooks de do_not_repeat_hooks ni de recent_pieces; usa by_channel/by_category/by_format solo como orientación (n pequeño = tentativo, sin causalidad); no compares métricas entre Instagram y LinkedIn.' } }];`;

export function buildContentLearnings() {
  const nodes = [
    { id: randomUUID(), name: 'Learnings Webhook', type: 'n8n-nodes-base.webhook', typeVersion: 2, position: [0, 0], webhookId: randomUUID(), credentials: INGEST_CRED,
      parameters: { httpMethod: 'GET', path: 'atacama-content-learnings', authentication: 'headerAuth', responseMode: 'lastNode', options: {} } },
    sb('Fetch Learned', 'GET', `${SUPABASE}/rest/v1/content_pieces?icp_pack_id=eq.${PACK_ID}&learning=not.is.null&is_test=eq.false&order=published_at.desc&limit=40&select=id,channel,category,format,published_at,learning`, null, [240, 0]),
    sb('Fetch Recent', 'GET', `${SUPABASE}/rest/v1/content_pieces?icp_pack_id=eq.${PACK_ID}&is_test=eq.false&status=in.(in_review,approved,scheduled,published)&order=created_at.desc&limit=30&select=status,channel,category,format,hook:piece->>hook`, null, [480, 0]),
    code('Summarize', SUMMARIZE, [720, 0]),
  ];
  const to = (n) => [{ node: n, type: 'main', index: 0 }];
  const connections = { 'Learnings Webhook': { main: [to('Fetch Learned')] }, 'Fetch Learned': { main: [to('Fetch Recent')] }, 'Fetch Recent': { main: [to('Summarize')] } };
  return { name: 'Atacama Labs - 16 Content Learnings', nodes, connections, settings: { executionOrder: 'v1' } };
}

if (process.argv[1] && process.argv[1].endsWith('content-metrics.mjs')) {
  const o15 = new URL('../atacama-labs-15-content-metrics.json', import.meta.url);
  const o16 = new URL('../atacama-labs-16-content-learnings.json', import.meta.url);
  fs.writeFileSync(o15, JSON.stringify(buildContentMetrics(), null, 2) + '\n');
  fs.writeFileSync(o16, JSON.stringify(buildContentLearnings(), null, 2) + '\n');
  console.log('escrito', o15.pathname, o16.pathname);
}
