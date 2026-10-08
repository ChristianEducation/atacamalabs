/**
 * Atacama OS · Content Engine — RSS / Atom (Ola A, núcleo puro).
 *
 * Funciones AUTOCONTENIDAS (sin imports ni constantes de módulo) que se prueban con `rss-core.test.mjs`
 * y se incrustan con Function.prototype.toString en el workflow n8n «28 Content RSS».
 *
 * Flujo: feed → rssParseFeed → items normalizados (título, URL, fuente, fecha original, resumen, hash de dedupe)
 *        → content_feed_items (único por feed + hash) → Hermes puntúa y, si vale la pena, abre una señal (workflow 13) → pieza `in_review`.
 * No crea piezas por sí mismo: solo detecta y guarda. Si un feed no trae contenido completo se usa título + resumen del feed.
 */

/** Hash estable (FNV-1a) de 8 hex. */
export function rssFnv(text) {
  const s = String(text || '');
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

/** URL canónica para deduplicar: sin parámetros de seguimiento, sin ancla y sin barra final. */
export function rssCanonicalUrl(raw, base) {
  let u = String(raw || '').trim();
  if (!u) return '';
  if (/^\/\//.test(u)) u = 'https:' + u;
  if (!/^https?:\/\//i.test(u)) {
    const m = /^(https?:\/\/[^/]+)/i.exec(String(base || ''));
    if (!m) return '';
    u = m[1] + (u.startsWith('/') ? '' : '/') + u;
  }
  u = u.replace(/#.*$/, '');
  const q = u.indexOf('?');
  let query = '';
  if (q >= 0) {
    const keep = u.slice(q + 1).split('&').filter((p) => p && !/^(utm_[a-z]+|fbclid|gclid|mc_cid|mc_eid|ref|source)=/i.test(p));
    query = keep.length ? '?' + keep.join('&') : '';
    u = u.slice(0, q);
  }
  return u.replace(/\/+$/, '') + query;
}

/** Identidad del artículo dentro de un feed: guid si existe, si no la URL canónica. */
export function rssItemHash(item) {
  const key = String((item && (item.guid || item.url)) || '').trim().toLowerCase();
  return rssFnv(key);
}

/** Texto plano desde HTML/CDATA/entidades. */
export function rssPlain(raw, max) {
  const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', mdash: '—', ndash: '–', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“' };
  const decode = (t) => t.replace(/&#x([0-9a-f]+);/gi, (m, h) => { const n = parseInt(h, 16); return n > 31 && n < 0x110000 ? String.fromCodePoint(n) : ' '; })
    .replace(/&#(\d+);/g, (m, d) => { const n = parseInt(d, 10); return n > 31 && n < 0x110000 ? String.fromCodePoint(n) : ' '; })
    .replace(/&([a-z]+);/gi, (m, n) => (Object.prototype.hasOwnProperty.call(named, n.toLowerCase()) ? named[n.toLowerCase()] : m));
  const strip = (t) => t.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<br\s*\/?>|<\/p>|<\/li>|<\/h\d>/gi, ' ').replace(/<[^>]+>/g, ' ');
  let s = String(raw || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
  s = decode(strip(s));
  // Feeds con HTML escapado (&lt;p&gt;…): tras decodificar aparece marcado; se limpia una segunda vez.
  if (/<[a-z/][^>]*>/i.test(s)) s = decode(strip(s));
  s = s.replace(/\s+/g, ' ').trim();
  return max && s.length > max ? s.slice(0, max - 1).trimEnd() + '…' : s;
}

/**
 * Parsea RSS 2.0 y Atom sin dependencias. Devuelve { format, items[], error? }.
 * Cada item: { title, url, guid, summary, published_at (ISO|null), hash }. Máx. `opts.limit` (30) artículos, más recientes primero.
 */
export function rssParseFeed(xml, opts) {
  const o = opts || {};
  const limit = o.limit || 30;
  const src = String(xml || '').slice(0, o.maxChars || 600000);
  if (!/<(rss|feed|rdf:RDF)\b/i.test(src)) return { format: null, items: [], error: 'no_es_feed_rss_ni_atom' };
  const atom = /<feed\b/i.test(src) && !/<rss\b/i.test(src);
  const blocks = src.match(atom ? /<entry\b[\s\S]*?<\/entry>/gi : /<item\b[\s\S]*?<\/item>/gi) || [];
  const tag = (blk, names) => {
    for (const n of names) {
      const m = new RegExp('<' + n + '(?:\\s[^>]*)?>([\\s\\S]*?)</' + n + '>', 'i').exec(blk);
      if (m) return m[1];
    }
    return '';
  };
  const items = [];
  for (const blk of blocks) {
    const title = rssPlain(tag(blk, ['title']), 200);
    let link = '';
    if (atom) {
      const links = blk.match(/<link\b[^>]*>/gi) || [];
      const alt = links.find((l) => /rel=["']alternate["']/i.test(l)) || links.find((l) => !/rel=/i.test(l)) || links[0] || '';
      const h = /href=["']([^"']+)["']/i.exec(alt);
      link = h ? h[1] : '';
    } else {
      link = rssPlain(tag(blk, ['link']), 600);
      if (!link) { const h = /<link\b[^>]*href=["']([^"']+)["']/i.exec(blk); link = h ? h[1] : ''; }
    }
    link = link.replace(/&amp;/g, '&');
    const url = rssCanonicalUrl(link, o.base);
    const guid = rssPlain(tag(blk, ['guid', 'id']), 300);
    const summary = rssPlain(tag(blk, ['content:encoded', 'description', 'summary', 'content']), o.summaryChars || 700);
    const dateRaw = rssPlain(tag(blk, ['pubDate', 'published', 'updated', 'dc:date']), 80);
    const t = dateRaw ? Date.parse(dateRaw) : NaN;
    if (!title || !url) continue;
    const item = { title, url, guid: guid || url, summary, published_at: Number.isFinite(t) ? new Date(t).toISOString() : null };
    item.hash = rssItemHash(item);
    items.push(item);
  }
  items.sort((a, b) => (Date.parse(b.published_at || 0) || 0) - (Date.parse(a.published_at || 0) || 0));
  return { format: atom ? 'atom' : 'rss', items: items.slice(0, limit) };
}

/** Pista de relevancia 0–10 para Atacama Labs (agentes, automatización, integraciones); la decisión final es de Hermes. */
export function rssRelevance(item) {
  const t = (String((item && item.title) || '') + ' ' + String((item && item.summary) || '')).toLowerCase();
  const strong = ['agent', 'agente', 'automat', 'workflow', 'whatsapp', 'crm', 'mcp', 'n8n', 'integrat', 'integraci', 'voice', 'assistant', 'asistente', 'customer support', 'api', 'webhook', 'supabase', 'tool use', 'function calling', 'zapier', 'no-code', 'low-code', 'small business', 'pyme'];
  const medium = ['claude', 'gpt', 'gemini', 'llm', 'model', 'pricing', 'precio', 'release', 'launch', 'lanza', 'email', 'calendar', 'sales', 'ventas', 'support', 'chatbot', 'enterprise', 'security', 'data'];
  const noise = ['hiring', 'we are hiring', 'podcast', 'webinar', 'award', 'research paper', 'dataset', 'benchmark'];
  let s = 0;
  strong.forEach((k) => { if (t.includes(k)) s += 2; });
  medium.forEach((k) => { if (t.includes(k)) s += 1; });
  noise.forEach((k) => { if (t.includes(k)) s -= 2; });
  return Math.max(0, Math.min(10, s));
}

/**
 * Convierte un resultado de lectura de feed en la actualización de su fila de salud.
 * res = { statusCode, body (texto) } o { error }. Tres fallos seguidos marcan atención en /ops.
 */
export function rssFeedHealth(feed, res, parsed, nowIso) {
  const f = feed || {};
  const code = Number(res && res.statusCode);
  let error = null;
  if (!res || res.error || !Number.isFinite(code)) error = 'sin_respuesta';
  else if (code < 200 || code >= 300) error = 'http_' + code;
  else if (parsed && parsed.error) error = parsed.error;
  else if (parsed && !parsed.items.length) error = 'feed_sin_articulos';
  const failures = error ? (Number(f.consecutive_failures) || 0) + 1 : 0;
  return { last_checked_at: nowIso, last_status: error ? 'error' : 'ok', last_error: error, last_item_count: parsed ? parsed.items.length : 0, consecutive_failures: failures };
}
