// node n8n/build/content-rss.test.mjs — prueba los nodos Code de «28 Content RSS» con stubs de n8n.
import { buildContentRss } from './content-rss.mjs';

const wf = buildContentRss();
const codeOf = (name) => wf.nodes.find((n) => n.name === name).parameters.jsCode;
let pass = 0, fail = 0;
const t = (n, c, x = '') => { c ? pass++ : fail++; console.log(c ? 'ok  ' : 'FAIL', n, c ? '' : x); };
const run = (name, { nodes = {}, input = [], now }) => {
  const mk = (arr) => ({ first: () => ({ json: arr[0] }), all: () => arr.map((j) => ({ json: j })) });
  const $ = (n) => { if (!(n in nodes)) throw new Error('nodo sin datos: ' + n); return mk([].concat(nodes[n])); };
  $.input = null;
  const realNow = Date.now; if (now) Date.now = () => now;
  try {
    return new Function('$', '$input', codeOf(name))($, { all: () => input.map((j, i) => ({ json: j, pairedItem: { item: i } })), first: () => ({ json: input[0] }) });
  } finally { Date.now = realNow; }
};
const NOW = Date.parse('2026-10-08T12:00:00Z');
const FEEDS = [{ id: 'f1', slug: 'n8n-blog', url: 'https://blog.n8n.io/rss/', consecutive_failures: 0 }, { id: 'f2', slug: 'caido', url: 'https://x.test/feed', consecutive_failures: 2 }, { id: 'f3', slug: 'viejo', url: 'https://old.test/feed', consecutive_failures: 0 }];
const RSS_OK = `<rss><channel><item><title>Agentes con MCP en n8n</title><link>https://blog.n8n.io/mcp/?utm_source=x</link><guid>g1</guid><pubDate>Wed, 07 Oct 2026 10:00:00 GMT</pubDate><description><![CDATA[<p>Cómo crear agentes con MCP y webhooks</p>]]></description></item>
<item><title>Artículo antiguo</title><link>https://blog.n8n.io/old</link><pubDate>Mon, 01 Jun 2026 10:00:00 GMT</pubDate></item></channel></rss>`;

t('Collect: la forma real de n8n (data) y el respaldo (body) funcionan', (() => { const a = run('Collect', { now: NOW, nodes: { 'Expand Feeds': [{ feed: FEEDS[0] }] }, input: [{ statusCode: 200, data: RSS_OK }] })[0].json; const b = run('Collect', { now: NOW, nodes: { 'Expand Feeds': [{ feed: FEEDS[0] }] }, input: [{ statusCode: 200, body: RSS_OK }] })[0].json; return a.meta[0].fresh === 1 && b.meta[0].fresh === 1; })());
t('Salud: 200 con cuerpo vacío es error (respuesta_vacia), no "ok"', run('Collect', { now: NOW, nodes: { 'Expand Feeds': [{ feed: FEEDS[0] }] }, input: [{ statusCode: 200, data: '' }] })[0].json.writes[0].body.last_error === 'respuesta_vacia');
// Prepare
let r = run('Prepare', { nodes: { 'RSS Webhook': { body: { action: 'run', feed_slug: 'n8n-blog' } } } })[0].json;
t('Prepare: webhook manual con feed_slug válido', r.feed_slug === 'n8n-blog' && r.manual === true);
r = run('Prepare', { nodes: {} })[0].json;
t('Prepare: disparo por horario (sin webhook) = no manual', r.manual === false && r.feed_slug === null);
t('Prepare: rechaza un feed_slug raro', run('Prepare', { nodes: { 'RSS Webhook': { body: { feed_slug: '../x;y' } } } })[0].json.feed_slug === null);

// Expand Feeds
const expand = (cfg, fr, prep = { manual: false }) => run('Expand Feeds', { nodes: { Prepare: prep, 'Fetch Config': { statusCode: 200, body: [cfg] }, 'Fetch Feeds': fr } });
t('Expand: un item por feed activo', expand({ rss_enabled: true }, { statusCode: 200, body: FEEDS }).length === 3);
t('Expand: RSS desactivado en la config => skip (salvo orden manual)', expand({ rss_enabled: false }, { statusCode: 200, body: FEEDS })[0].json.skip === true && expand({ rss_enabled: false }, { statusCode: 200, body: FEEDS }, { manual: true }).length === 3);
t('Expand: si no se pudo leer content_feeds => skip con error (no inventa)', (() => { const x = expand({ rss_enabled: true }, { statusCode: 500, body: {} })[0].json; return x.skip && x.error === true; })());
t('Expand: sin feeds => skip', expand({ rss_enabled: true }, { statusCode: 200, body: [] })[0].json.reason === 'sin_feeds_activos');

// Collect
const collect = (resps, feeds = FEEDS) => run('Collect', { now: NOW, nodes: { 'Expand Feeds': feeds.map((feed) => ({ feed })) }, input: resps })[0].json;
let c = collect([{ statusCode: 200, data: RSS_OK }, { statusCode: 503, data: '' }, { error: { message: 'timeout' } }]);
const itemsW = c.writes.find((w) => /^content_feed_items/.test(w.path));
t('Collect: solo el artículo reciente; el de junio (>14 días) se ignora', itemsW && itemsW.body.length === 1 && itemsW.body[0].title === 'Agentes con MCP en n8n' && itemsW.body[0].url === 'https://blog.n8n.io/mcp');
t('Collect: la fila lleva feed, hash, resumen limpio, fecha ISO y pista de relevancia', (() => { const b = itemsW.body[0]; return b.feed_id === 'f1' && b.feed_slug === 'n8n-blog' && /^[0-9a-f]{8}$/.test(b.item_hash) && b.summary === 'Cómo crear agentes con MCP y webhooks' && b.published_at === '2026-10-07T10:00:00.000Z' && b.relevance >= 4 && b.status === 'new'; })());
t('Collect: dedupe en BD por (feed, hash) con ignore-duplicates', /on_conflict=feed_id,item_hash/.test(itemsW.path) && /ignore-duplicates/.test(itemsW.prefer));
const health = (id) => c.writes.find((w) => w.path === 'content_feeds?id=eq.' + id).body;
t('Salud: feed bueno ok / feed con HTTP 503 suma racha / feed sin respuesta', health('f1').last_status === 'ok' && health('f2').last_error === 'http_503' && health('f2').consecutive_failures === 3 && health('f3').last_error === 'sin_respuesta');
t('Collect: un feed caído no impide procesar los demás', c.meta.length === 3 && c.meta[0].fresh === 1);
c = collect([{ statusCode: 200, data: '<html>no soy feed</html>' }, { statusCode: 200, data: RSS_OK }, { statusCode: 200, data: RSS_OK }]);
t('Collect: HTML en vez de feed => error no_es_feed y sin artículos de ese feed', c.writes.find((w) => w.path === 'content_feeds?id=eq.f1').body.last_error === 'no_es_feed_rss_ni_atom' && c.writes.find((w) => /^content_feed_items/.test(w.path)).body.every((b) => b.feed_id !== 'f1'));
c = collect([{ statusCode: 200, data: RSS_OK }, { statusCode: 200, data: RSS_OK }, { statusCode: 200, data: RSS_OK }]);
t('Collect: la misma noticia en dos feeds distintos son dos filas (dedupe es por feed)', c.writes.find((w) => /^content_feed_items/.test(w.path)).body.length === 3);
t('Collect: si Expand marcó skip, no escribe nada', run('Collect', { now: NOW, nodes: { 'Expand Feeds': [{ skip: true, reason: 'rss_desactivado_en_content_config' }] }, input: [{}] })[0].json.writes.length === 0);
const dateless = `<rss><channel><item><title>Sin fecha pero válido</title><link>https://e.com/a</link></item><item><title>Fecha futura rara</title><link>https://e.com/b</link><pubDate>Wed, 07 Oct 2027 10:00:00 GMT</pubDate></item></channel></rss>`;
c = collect([{ statusCode: 200, data: dateless }], [FEEDS[0]]);
t('Collect: sin fecha se acepta (fecha de ingesta); fechas absurdas en el futuro se descartan', (() => { const b = c.writes.find((w) => /^content_feed_items/.test(w.path)).body; return b.length === 1 && b[0].published_at === null; })());

// Respond
const planned = [{ method: 'PATCH', path: 'content_feeds?id=eq.f1' }, { method: 'PATCH', path: 'content_feeds?id=eq.f2' }, { method: 'POST', path: 'content_feed_items?on_conflict=feed_id,item_hash' }];
const meta = [{ slug: 'n8n-blog', status: 'ok', error: null, found: 2, fresh: 1, failures: 0 }, { slug: 'caido', status: 'error', error: 'http_503', found: 0, fresh: 0, failures: 3 }];
const resp = (applied) => run('Respond', { nodes: { Collect: { writes: planned, meta }, 'Apply Writes': applied } })[0].json;
let o = resp([{ statusCode: 204 }, { statusCode: 204 }, { statusCode: 201, body: [{ id: 'i1', feed_slug: 'n8n-blog', title: 'Agentes con MCP en n8n', url: 'https://blog.n8n.io/mcp', relevance: 6, published_at: '2026-10-07T10:00:00Z' }] }]);
t('Respond: cuenta nuevos (solo los realmente insertados), feeds ok/fallidos y no crea piezas', o.ok === true && o.new_items === 1 && o.feeds_failed === 1 && o.failures[0].includes('http_503') && o.safety.pieces_created === 0);
o = resp([{ statusCode: 204 }, { statusCode: 204 }, { statusCode: 201, body: [] }]);
t('Respond: segunda ingestión (todo duplicado) => 0 nuevos, sin duplicar', o.ok === true && o.new_items === 0);
o = resp([{ statusCode: 204 }, { statusCode: 204 }, { body: {} }]);
t('Respond: una escritura sin respuesta (red) NO se da por buena', o.ok === false && /sin respuesta/.test(o.persist_error));
o = resp([{ statusCode: 204 }, { statusCode: 500, body: { message: 'x' } }, { statusCode: 201, body: [] }]);
t('Respond: HTTP 500 en Supabase => ok:false con motivo', o.ok === false && /HTTP 500/.test(o.persist_error));

// Estructura / seguridad
t('horario cada hora + webhook con clave', wf.nodes.find((n) => n.name === 'Every Hour').parameters.rule.interval[0].hoursInterval === 1 && wf.nodes.find((n) => n.name === 'RSS Webhook').parameters.authentication === 'headerAuth');
t('las escrituras reintentan 3 veces', wf.nodes.find((n) => n.name === 'Apply Writes').maxTries === 3 && wf.nodes.find((n) => n.name === 'Apply Writes').retryOnFail === true);
t('no toca GHL, Gmail ni LinkedIn', !/leadconnectorhq|gmail|waalaxy/i.test(JSON.stringify(wf)));
t('los feeds vienen de la base (ninguna URL de feed hardcodeada en el workflow)', !/openai\.com\/news|blog\.n8n\.io|supabase\.com\/rss/.test(JSON.stringify(wf.nodes.map((n) => n.parameters))));
t('el nodo Read Feed no detiene el flujo si un feed falla (continueOnFail)', wf.nodes.find((n) => n.name === 'Read Feed').continueOnFail === true);
console.log(pass, 'ok', fail, 'fallos');
process.exit(fail ? 1 : 0);
