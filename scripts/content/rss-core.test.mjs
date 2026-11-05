import assert from 'node:assert/strict';
import * as rc from './rss-core.mjs';

let n = 0;
const ok = (name, fn) => { try { fn(); n++; } catch (e) { console.error('FAIL', name, '\n', e.stack.split('\n').slice(0, 4).join('\n')); process.exitCode = 1; } };

const RSS = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/"><channel><title>Blog</title><link>https://blog.example.com</link>
<item><title><![CDATA[n8n lanza agentes con MCP &amp; webhooks]]></title><link>https://blog.example.com/post-1/?utm_source=rss&amp;utm_medium=feed#comments</link><guid isPermaLink="false">abc-123</guid><pubDate>Tue, 07 Oct 2026 14:00:00 GMT</pubDate><description><![CDATA[<p>Nueva forma de crear <b>agentes</b> con n8n.</p>]]></description></item>
<item><title>Podcast episodio 4</title><link>/post-2</link><pubDate>Mon, 06 Oct 2026 10:00:00 +0000</pubDate><description>Charla &#8212; sin más</description></item>
<item><title>Sin enlace</title><description>x</description></item>
</channel></rss>`;
const ATOM = `<feed xmlns="http://www.w3.org/2005/Atom"><title>Changelog</title>
<entry><title type="html">Supabase &lt;b&gt;Edge&lt;/b&gt; Functions</title><id>tag:example.com,2026:1</id><link rel="self" href="https://x.com/feed/1"/><link rel="alternate" type="text/html" href="https://example.com/changelog/1"/><updated>2026-10-05T09:00:00Z</updated><summary>Resumen corto</summary></entry>
<entry><title>Otro</title><id>tag:example.com,2026:2</id><link href="https://example.com/changelog/2"/><published>2026-10-06T09:00:00Z</published><content type="html">&lt;p&gt;Contenido &amp;amp; más&lt;/p&gt;</content></entry>
</feed>`;

ok('RSS 2.0: título, URL canónica (sin utm/ancla), guid, fecha ISO, resumen en texto plano, hash', () => {
  const r = rc.rssParseFeed(RSS, { base: 'https://blog.example.com' });
  assert.equal(r.format, 'rss'); assert.equal(r.items.length, 2, 'el item sin enlace se descarta');
  const a = r.items[0];
  assert.equal(a.title, 'n8n lanza agentes con MCP & webhooks'); assert.equal(a.url, 'https://blog.example.com/post-1'); assert.equal(a.guid, 'abc-123');
  assert.equal(a.published_at, '2026-10-07T14:00:00.000Z'); assert.equal(a.summary, 'Nueva forma de crear agentes con n8n.'); assert.match(a.hash, /^[0-9a-f]{8}$/);
  assert.equal(r.items[1].url, 'https://blog.example.com/post-2', 'enlace relativo resuelto contra la base'); assert.equal(r.items[1].summary, 'Charla — sin más');
});
ok('Atom: usa el enlace alternate, id, updated/published y contenido HTML escapado', () => {
  const r = rc.rssParseFeed(ATOM);
  assert.equal(r.format, 'atom'); assert.equal(r.items.length, 2);
  const byUrl = Object.fromEntries(r.items.map((i) => [i.url, i]));
  assert.ok(byUrl['https://example.com/changelog/1'] && byUrl['https://example.com/changelog/2']);
  assert.equal(byUrl['https://example.com/changelog/1'].title, 'Supabase Edge Functions'); assert.equal(byUrl['https://example.com/changelog/2'].summary, 'Contenido & más');
  assert.equal(r.items[0].url, 'https://example.com/changelog/2', 'más reciente primero');
});
ok('dedupe: el hash es estable entre corridas y no cambia por utm ni por mayúsculas', () => {
  const a = rc.rssParseFeed(RSS, { base: 'https://blog.example.com' }).items;
  const b = rc.rssParseFeed(RSS.replace('?utm_source=rss&amp;utm_medium=feed', '?utm_campaign=x'), { base: 'https://blog.example.com' }).items;
  assert.equal(a[0].hash, b[0].hash); assert.notEqual(a[0].hash, a[1].hash);
  assert.equal(rc.rssItemHash({ url: 'https://A.com/X' }), rc.rssItemHash({ url: 'https://a.com/x' }));
});
ok('límite de artículos y XML inválido', () => {
  const many = '<rss><channel>' + Array.from({ length: 50 }, (_, i) => `<item><title>Art ${i}</title><link>https://e.com/${i}</link></item>`).join('') + '</channel></rss>';
  assert.equal(rc.rssParseFeed(many, { limit: 10 }).items.length, 10);
  assert.equal(rc.rssParseFeed('<html><body>no es feed</body></html>').error, 'no_es_feed_rss_ni_atom'); assert.equal(rc.rssParseFeed('').items.length, 0);
});
ok('rssCanonicalUrl: relativas, // y parámetros de seguimiento', () => {
  assert.equal(rc.rssCanonicalUrl('//e.com/a/?fbclid=1&id=7#x'), 'https://e.com/a?id=7'); assert.equal(rc.rssCanonicalUrl('/p', 'https://e.com/blog/'), 'https://e.com/p'); assert.equal(rc.rssCanonicalUrl('/p'), '');
});
ok('relevancia: agentes/automatización/integraciones suben; ruido baja; acotada a 0–10', () => {
  const hi = rc.rssRelevance({ title: 'New agent API with MCP and webhooks', summary: 'Build workflow automation integrations for WhatsApp CRM' });
  const lo = rc.rssRelevance({ title: 'Join our podcast', summary: 'We are hiring for a research paper award' });
  assert.ok(hi >= 8 && hi <= 10, String(hi)); assert.equal(lo, 0); assert.equal(rc.rssRelevance({}), 0);
});
ok('salud del feed: ok, HTTP, sin artículos, XML inválido y racha de fallos', () => {
  const now = '2026-10-08T00:00:00.000Z', feed = { consecutive_failures: 0 };
  const good = rc.rssFeedHealth(feed, { statusCode: 200 }, { items: [{}, {}] }, now); assert.deepEqual([good.last_status, good.last_error, good.last_item_count, good.consecutive_failures], ['ok', null, 2, 0]);
  const bad = rc.rssFeedHealth({ consecutive_failures: 2 }, { statusCode: 503 }, null, now); assert.deepEqual([bad.last_status, bad.last_error, bad.consecutive_failures], ['error', 'http_503', 3]);
  assert.equal(rc.rssFeedHealth(feed, { statusCode: 200 }, { items: [], error: 'no_es_feed_rss_ni_atom' }, now).last_error, 'no_es_feed_rss_ni_atom');
  assert.equal(rc.rssFeedHealth(feed, { statusCode: 200 }, { items: [] }, now).last_error, 'feed_sin_articulos');
  assert.equal(rc.rssFeedHealth(feed, { error: 'timeout' }, null, now).last_error, 'sin_respuesta');
});
ok('autocontenido: sin imports ni constantes de módulo (se incrusta en n8n)', () => {
  const src = Object.values(rc).filter((f) => typeof f === 'function').map((f) => f.toString()).join('\n');
  assert.ok(!/\bimport\b|\brequire\(/.test(src));
  const lib = new Function(src + '\nreturn { rssParseFeed };')(); assert.equal(lib.rssParseFeed(RSS, { base: 'https://blog.example.com' }).items.length, 2);
});
console.log(n + ' ok');
