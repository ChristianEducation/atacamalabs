#!/usr/bin/env node
/**
 * Atacama OS · workflow n8n «28 Content RSS» (Ola A) — Real-Time Content Radar por RSS/Atom.
 *
 *   cada hora (y a pedido: POST /webhook/atacama-content-rss con X-Atacama-Key, opcional {feed_slug})
 *   → lee content_feeds (configuración en datos, NO en el workflow) → descarga cada feed → rssParseFeed (scripts/content/rss-core.mjs)
 *   → guarda solo los artículos nuevos (único por feed + hash; los de más de 14 días se ignoran) en content_feed_items
 *   → actualiza la salud de cada feed (último chequeo, error, racha de fallos) para /ops.
 *
 * NO usa IA ni crea piezas: Hermes (cron «Atacama Labs — Content RSS») lee los artículos nuevos con rss_pending, decide cuáles valen
 * una SEÑAL (workflow 13: verifica URL + cita) y la pieza resultante termina `in_review` en GHL. Nada se publica solo.
 * Si un feed no trae contenido completo se usa título + resumen del feed; un feed caído no rompe a los demás.
 */
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import * as rss from '../../scripts/content/rss-core.mjs';

const SUPABASE = 'https://uwquwjmiofixzugttals.supabase.co';
const NONE = 'https://localhost.invalid/';
const SUPABASE_CRED = { supabaseApi: { id: 'XOmXUuyLVSazDIh5', name: 'Atacama Labs - Supabase' } };
const INGEST_CRED = { httpHeaderAuth: { id: 'lUGhlXVaQBEiEh5S', name: 'Atacama Labs - Ingest Key' } };
const full = (timeout = 30000, fmt = 'json') => ({ response: { response: { fullResponse: true, neverError: true, responseFormat: fmt } }, timeout });
const code = (name, jsCode, pos) => ({ id: randomUUID(), name, type: 'n8n-nodes-base.code', typeVersion: 2, position: pos, parameters: { jsCode } });
const to = (n) => [{ node: n, type: 'main', index: 0 }];
const sbGet = (name, urlExpr, pos) => ({ id: randomUUID(), name, type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: pos, credentials: SUPABASE_CRED, continueOnFail: true, alwaysOutputData: true,
  parameters: { method: 'GET', url: urlExpr, authentication: 'predefinedCredentialType', nodeCredentialType: 'supabaseApi', options: full() } });
const sbApply = (name, pos) => ({ id: randomUUID(), name, type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: pos, credentials: SUPABASE_CRED, continueOnFail: true, alwaysOutputData: true, retryOnFail: true, maxTries: 3, waitBetweenTries: 1500,
  parameters: { method: '={{ $json.method || "POST" }}', url: `={{ $json.skip ? "${NONE}" : "${SUPABASE}/rest/v1/" + $json.path }}`, authentication: 'predefinedCredentialType', nodeCredentialType: 'supabaseApi', sendHeaders: true,
    headerParameters: { parameters: [{ name: 'Prefer', value: '={{ $json.prefer || "return=minimal" }}' }] }, sendBody: true, specifyBody: 'json', jsonBody: '={{ JSON.stringify($json.body || {}) }}', options: full() } });

export const LIB = Object.values(rss).filter((f) => typeof f === 'function').map((f) => f.toString()).join('\n\n');
export const MAX_AGE_DAYS = 14;

export const PREPARE = `let b = {};
try { const w = $('RSS Webhook').first().json; b = (w && (w.body || w)) || {}; } catch (e) { b = {}; }
const slug = typeof b.feed_slug === 'string' && /^[a-z0-9-]{2,60}$/.test(b.feed_slug) ? b.feed_slug : null;
return [{ json: { feed_slug: slug, manual: Boolean(b.action || b.feed_slug) } }];`;

export const EXPAND = `const p = $('Prepare').first().json;
const cfgRes = $('Fetch Config').first().json || {};
const cfg = (cfgRes.statusCode || 0) < 300 && Array.isArray(cfgRes.body) ? (cfgRes.body[0] || {}) : {};
const fr = $('Fetch Feeds').first().json || {};
const feeds = (fr.statusCode || 0) < 300 && Array.isArray(fr.body) ? fr.body : [];
if (cfg.rss_enabled === false && !p.manual) return [{ json: { skip: true, reason: 'rss_desactivado_en_content_config' } }];
if ((fr.statusCode || 0) >= 300 || !fr.statusCode) return [{ json: { skip: true, reason: 'no_pude_leer_content_feeds', error: true } }];
if (!feeds.length) return [{ json: { skip: true, reason: 'sin_feeds_activos' } }];
return feeds.map((feed) => ({ json: { feed } }));`;

export const COLLECT = `${LIB}

const MAX_AGE_DAYS = ${MAX_AGE_DAYS};
const feedsIn = $('Expand Feeds').all().map((i) => i.json);
if (feedsIn.length === 1 && feedsIn[0].skip) return [{ json: { writes: [], skipped: feedsIn[0].reason, fatal: feedsIn[0].error === true, meta: [] } }];
const resps = $input.all();
const nowMs = Date.now(), nowIso = new Date(nowMs).toISOString();
const writes = [], meta = [];
const rows = new Map();
feedsIn.forEach((fi, idx) => {
  const feed = fi.feed;
  const r = resps.find((x) => x.pairedItem && x.pairedItem.item === idx) || resps[idx] || { json: {} };
  const res = r.json || {};
  // n8n entrega el texto de la respuesta en data (responseFormat text); body por si cambia.
  const text = typeof res.data === 'string' ? res.data : (typeof res.body === 'string' ? res.body : '');
  let parsed = null;
  if (Number(res.statusCode) >= 200 && Number(res.statusCode) < 300) parsed = text ? rssParseFeed(text, { base: feed.url, limit: 40 }) : { format: null, items: [], error: 'respuesta_vacia' };
  const health = rssFeedHealth(feed, res.error ? { error: true } : res, parsed, nowIso);
  writes.push({ method: 'PATCH', path: 'content_feeds?id=eq.' + feed.id, body: health, prefer: 'return=minimal' });
  let fresh = 0;
  (parsed ? parsed.items : []).forEach((it) => {
    const t = it.published_at ? Date.parse(it.published_at) : null;
    if (t !== null && nowMs - t > MAX_AGE_DAYS * 86400000) return;
    if (t !== null && t - nowMs > 2 * 86400000) return;
    const key = feed.id + ':' + it.hash;
    if (rows.has(key)) return;
    rows.set(key, { feed_id: feed.id, feed_slug: feed.slug, item_hash: it.hash, title: it.title.slice(0, 200), url: it.url, summary: it.summary || null, published_at: it.published_at, relevance: rssRelevance(it), status: 'new' });
    fresh++;
  });
  meta.push({ slug: feed.slug, status: health.last_status, error: health.last_error, found: parsed ? parsed.items.length : 0, fresh, failures: health.consecutive_failures });
});
if (rows.size) writes.push({ method: 'POST', path: 'content_feed_items?on_conflict=feed_id,item_hash', body: Array.from(rows.values()), prefer: 'resolution=ignore-duplicates,return=representation' });
return [{ json: { writes, meta } }];`;

export const EXPAND_WRITES = `const w = $('Collect').first().json.writes || [];
if (!w.length) return [{ json: { skip: true } }];
return w.map((x) => ({ json: { skip: false, ...x } }));`;

export const RESPOND = `const c = $('Collect').first().json;
if (c.fatal) return [{ json: { ok: false, error: c.skipped, safety: { pieces_created: 0, published: 0 } } }];
const applied = $('Apply Writes').all().map((i) => i.json);
const planned = c.writes || [];
const bad = applied.slice(0, planned.length).filter((j, i) => !planned[i] || !j.statusCode || j.statusCode >= 300);
const itemsIdx = planned.findIndex((w) => /^content_feed_items/.test(w.path));
const inserted = itemsIdx >= 0 && Array.isArray((applied[itemsIdx] || {}).body) ? applied[itemsIdx].body : [];
const failed = (c.meta || []).filter((m) => m.status === 'error');
const out = { ok: bad.length === 0 && !c.fatal, skipped: c.skipped || null, feeds_checked: (c.meta || []).length, feeds_ok: (c.meta || []).filter((m) => m.status === 'ok').length, feeds_failed: failed.length,
  failures: failed.map((m) => m.slug + ': ' + m.error + ' (racha ' + m.failures + ')'), new_items: inserted.length,
  new: inserted.slice(0, 25).map((r) => ({ id: r.id, feed: r.feed_slug, title: r.title, url: r.url, relevance: r.relevance, published_at: r.published_at })),
  per_feed: c.meta, safety: { pieces_created: 0, published: 0, note: 'Solo detecta y guarda artículos; Hermes decide si alguno merece una señal.' } };
if (bad.length) out.persist_error = 'Supabase ' + (bad[0].statusCode ? 'HTTP ' + bad[0].statusCode : 'sin respuesta (red)') + ': ' + JSON.stringify(bad[0].body || {}).slice(0, 160);
return [{ json: out }];`;

export function buildContentRss() {
  const nodes = [
    { id: randomUUID(), name: 'Every Hour', type: 'n8n-nodes-base.scheduleTrigger', typeVersion: 1.2, position: [0, -140], parameters: { rule: { interval: [{ field: 'hours', hoursInterval: 1 }] } } },
    { id: randomUUID(), name: 'RSS Webhook', type: 'n8n-nodes-base.webhook', typeVersion: 2, position: [0, 80], webhookId: randomUUID(), credentials: INGEST_CRED, parameters: { httpMethod: 'POST', path: 'atacama-content-rss', authentication: 'headerAuth', responseMode: 'lastNode', options: {} } },
    code('Prepare', PREPARE, [220, 0]),
    sbGet('Fetch Config', `${SUPABASE}/rest/v1/content_config?id=eq.1&select=rss_enabled`, [440, 0]),
    sbGet('Fetch Feeds', `={{ "${SUPABASE}/rest/v1/content_feeds?enabled=eq.true&select=*&order=priority.desc" + ($("Prepare").first().json.feed_slug ? "&slug=eq." + $("Prepare").first().json.feed_slug : "") }}`, [660, 0]),
    code('Expand Feeds', EXPAND, [880, 0]),
    { id: randomUUID(), name: 'Read Feed', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [1100, 0], continueOnFail: true, alwaysOutputData: true,
      parameters: { method: 'GET', url: `={{ $json.skip ? "${NONE}" : $json.feed.url }}`, sendHeaders: true, headerParameters: { parameters: [{ name: 'User-Agent', value: 'AtacamaOS-RSS/1.0 (+https://atacamalabs.cl)' }, { name: 'Accept', value: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5' }] }, options: full(30000, 'text') } },
    code('Collect', COLLECT, [1320, 0]),
    code('Expand Writes', EXPAND_WRITES, [1540, 0]),
    sbApply('Apply Writes', [1760, 0]),
    code('Respond', RESPOND, [1980, 0]),
  ];
  const c = {
    'Every Hour': { main: [to('Prepare')] }, 'RSS Webhook': { main: [to('Prepare')] }, 'Prepare': { main: [to('Fetch Config')] }, 'Fetch Config': { main: [to('Fetch Feeds')] }, 'Fetch Feeds': { main: [to('Expand Feeds')] },
    'Expand Feeds': { main: [to('Read Feed')] }, 'Read Feed': { main: [to('Collect')] }, 'Collect': { main: [to('Expand Writes')] }, 'Expand Writes': { main: [to('Apply Writes')] }, 'Apply Writes': { main: [to('Respond')] },
  };
  return { name: 'Atacama Labs - 28 Content RSS', nodes, connections: c, settings: { executionOrder: 'v1' } };
}

if (process.argv[1] && process.argv[1].endsWith('content-rss.mjs')) {
  const out = new URL('../atacama-labs-28-content-rss.json', import.meta.url);
  fs.writeFileSync(out, JSON.stringify(buildContentRss(), null, 2) + '\n');
  console.log('escrito', out.pathname);
}
