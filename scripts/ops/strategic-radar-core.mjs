/**
 * Atacama OS · Radar estratégico — núcleo PURO y AUTOCONTENIDO (spec §7, §8, §17).
 * Sin imports: se incrusta en n8n «25 Atacama Ops» / «29» vía .toString() y lo usan la UI, el Daily y las pruebas.
 * Regla de oro: solo evidencia. Un dato sin verificar es `unknown`/NULL, jamás un número inventado.
 */

// Convención de los núcleos de /ops: SIN constantes de módulo y TODA función exportada. n8n incrusta cada función con .toString() en un
// Code node; una constante o un helper fuera de la función rompería en el servidor (ReferenceError) aunque las pruebas locales pasen.

// ---------- Utilidades ----------
export function srClamp(v, max) { const n = Number(v); return Number.isFinite(n) ? Math.max(0, Math.min(max, Math.round(n))) : 0; }
export function srStr(v) { return typeof v === 'string' ? v.trim() : ''; }
/** Bandera de config por categoría (production|products|partners|events) o null. */
export function srFlag(kind) { return ({ production: 'production_enabled', products: 'products_enabled', partners: 'partners_enabled', events: 'events_enabled' })[kind] || null; }
/** Separación mínima entre corridas buenas de una categoría, en ms. */
export function srMinGap(kind) { return ({ production: 10 * 60000, products: 6 * 3600000, partners: 6 * 3600000, events: 6 * 3600000 })[kind] || 6 * 3600000; }

/** ¿El entorno trae lo que el motor necesita? `URL` (URL canónica) e `Intl` con zonas horarias (fechas de Chile). Si no, las acciones que lo usan fallan CERRADO con `runtime_incompleto`. */
export function srRuntimeOk() {
  return { url: typeof URL === 'function', intl: typeof Intl === 'object' && Intl !== null && typeof Intl.DateTimeFormat === 'function' };
}

/** Host que jamás se acepta: loopback, privado, link-local, IPv6 literal, nombres internos o sin punto. */
export function srIsPrivateHost(host) {
  const h = String(host || '').toLowerCase().replace(/\.$/, '');
  if (!h || h.startsWith('[') || h.includes(':')) return true;
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal') || h.endsWith('.lan') || h.endsWith('.test')) return true;
  if (!h.includes('.')) return true;
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    if ([m[1], m[2], m[3], m[4]].some((x) => Number(x) > 255)) return true;
    return a === 10 || a === 127 || a === 0 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
  }
  if (/^[0-9.]+$/.test(h)) return true; // forma numérica rara de IPv4
  return false;
}

/** URL canónica (§17.3). Devuelve string o null si la URL no es aceptable. Misma lógica que Python (fixtures compartidos). */
export function srCanonicalUrl(input) {
  const raw = srStr(input);
  if (!raw || raw.length > 2000) return null;
  let u;
  try { u = new URL(raw); } catch { return null; }
  if (u.protocol !== 'https:') return null;
  if (u.username || u.password) return null;
  if (u.port && u.port !== '443') return null;
  const host = u.hostname.toLowerCase().replace(/\.$/, '');
  if (srIsPrivateHost(host)) return null;
  let path = u.pathname || '/';
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
  const keyOf = (p) => { const k = p.split('=')[0].replace(/\+/g, ' '); try { return decodeURIComponent(k).trim(); } catch { return k.trim(); } };
  const pairs = u.search.replace(/^\?/, '').split('&').filter(Boolean).filter((p) => !/^(utm_.*|fbclid|gclid|igshid)$/i.test(keyOf(p)));
  pairs.sort((a, b) => { const [ka, va = ''] = a.split('='); const [kb, vb = ''] = b.split('='); return ka < kb ? -1 : ka > kb ? 1 : va < vb ? -1 : va > vb ? 1 : 0; });
  return 'https://' + host + path + (pairs.length ? '?' + pairs.join('&') : '');
}

/** SHA-256 en JS puro (sin crypto: corre igual en el sandbox de n8n). Devuelve hex minúscula de 64 caracteres. */
export function srSha256(str) {
  const K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
  // UTF-8 a mano (sin TextEncoder: el sandbox de n8n no lo garantiza). Un sustituto suelto se codifica como U+FFFD, igual que TextEncoder.
  const bytes = [];
  const txt = String(str);
  for (let i = 0; i < txt.length; i++) {
    let cp = txt.codePointAt(i);
    if (cp > 0xffff) i++;
    if (cp >= 0xd800 && cp <= 0xdfff) cp = 0xfffd;
    if (cp < 0x80) bytes.push(cp);
    else if (cp < 0x800) bytes.push(0xc0 | (cp >> 6), 0x80 | (cp & 63));
    else if (cp < 0x10000) bytes.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
    else bytes.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 63), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
  }
  const bitLen = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  const hi = Math.floor(bitLen / 0x100000000), lo = bitLen >>> 0;
  for (const w of [hi, lo]) for (let s = 24; s >= 0; s -= 8) bytes.push((w >>> s) & 0xff);
  let H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const rotr = (x, n) => (x >>> n) | (x << (32 - n));
  for (let i = 0; i < bytes.length; i += 64) {
    const w = new Array(64);
    for (let t = 0; t < 16; t++) w[t] = ((bytes[i + t * 4] << 24) | (bytes[i + t * 4 + 1] << 16) | (bytes[i + t * 4 + 2] << 8) | bytes[i + t * 4 + 3]) >>> 0;
    for (let t = 16; t < 64; t++) {
      const s0 = rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3);
      const s1 = rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10);
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let t = 0; t < 64; t++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[t] + w[t]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    H = [(H[0] + a) >>> 0, (H[1] + b) >>> 0, (H[2] + c) >>> 0, (H[3] + d) >>> 0, (H[4] + e) >>> 0, (H[5] + f) >>> 0, (H[6] + g) >>> 0, (H[7] + h) >>> 0];
  }
  return H.map((x) => x.toString(16).padStart(8, '0')).join('');
}

/** Huella (§17.3 paso 5): sha256(kind_db + "\n" + url_canónica [+ "\n" + YYYY-MM-DD solo en eventos con fecha real de edición]). */
export function srFingerprint(kind, canonicalUrl, eventDate) {
  if (!['product', 'partner', 'event'].includes(kind) || !canonicalUrl) return null;
  let input = kind + '\n' + canonicalUrl;
  if (kind === 'event' && typeof eventDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(eventDate)) input += '\n' + eventDate;
  return srSha256(input);
}

/** kind de la petición (plural) → kind de la BD. */
export function srDbKind(k) { return ({ products: 'product', partners: 'partner', events: 'event', product: 'product', partner: 'partner', event: 'event' })[k] || null; }

// ---------- Fechas ----------
/** ISO con offset → {ms,date_only:false}; solo fecha → {date,date_only:true}; otra cosa → null. Nunca inventa una hora. */
export function srParseDate(s) {
  const v = srStr(s);
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) { const ms = Date.parse(v + 'T00:00:00Z'); return Number.isFinite(ms) ? { date: v, date_only: true, ms } : null; }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})$/.test(v)) { const ms = Date.parse(v); return Number.isFinite(ms) ? { date_only: false, ms } : null; }
  return null;
}
export function srSantiagoDate(ms) {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(ms));
  const g = (t) => p.find((x) => x.type === t).value;
  return g('year') + '-' + g('month') + '-' + g('day');
}
/** Días que faltan (entero; negativo = ya pasó) o null si la fecha no es verificable. Solo-fecha se compara por día calendario en America/Santiago. */
export function srDaysLeft(s, now) {
  const p = srParseDate(s);
  if (!p) return null;
  if (p.date_only) return Math.round((Date.parse(p.date + 'T00:00:00Z') - Date.parse(srSantiagoDate(now) + 'T00:00:00Z')) / 86400000);
  return Math.ceil((p.ms - now) / 86400000);
}
/** Estado temporal de un evento: upcoming | expired | unverified (sin fecha de inicio verificable). */
export function srEventState(item, now) {
  const start = srParseDate(item && item.event_start_at);
  if (!start) return 'unverified';
  const endRaw = srParseDate(item.event_end_at);
  const left = srDaysLeft(endRaw ? item.event_end_at : item.event_start_at, now);
  return left !== null && left < 0 ? 'expired' : 'upcoming';
}

// ---------- Evidencia ----------
/** ≥1 fuente HTTPS válida con fecha de verificación, organización y claim concreto. Devuelve {ok, reasons, sources, primary, errors}. */
export function srValidateEvidence(item) {
  const reasons = [];
  const it = item || {};
  const TYPES = ['official', 'repository', 'documentation', 'secondary'], PRIMARY = ['official', 'repository', 'documentation'];
  if (!srStr(it.organization)) reasons.push('organization_missing');
  const ev = Array.isArray(it.evidence) ? it.evidence : [];
  if (!ev.length) reasons.push('evidence_missing');
  if (ev.length > 5) reasons.push('too_many_sources');
  let good = 0, primary = 0;
  ev.slice(0, 5).forEach((e, i) => {
    const x = e || {};
    const url = srCanonicalUrl(x.source_url);
    if (!url) { reasons.push('source_url_invalid:' + i); return; }
    if (!TYPES.includes(x.source_type)) { reasons.push('source_type_invalid:' + i); return; }
    if (!srStr(x.source_title)) { reasons.push('source_title_missing:' + i); return; }
    if (srStr(x.claim).length < 5) { reasons.push('claim_missing:' + i); return; }
    if (srStr(x.claim).length > 2000) { reasons.push('claim_too_long:' + i); return; }
    if (srStr(x.excerpt).length > 350) { reasons.push('excerpt_too_long:' + i); return; }
    const vd = srParseDate(x.verified_at);
    if (!vd || vd.date_only) { reasons.push('verified_at_invalid:' + i); return; }
    good++;
    if (PRIMARY.includes(x.source_type)) primary++;
  });
  if (good > 0 && primary === 0) reasons.push('primary_source_missing');
  return { ok: reasons.length === 0 && good > 0, reasons, sources: good, primary };
}

export function srConfidence(sources, primary, criticalVerified, contradicted) {
  if (contradicted) return 'low';
  if (sources >= 2 && primary >= 1 && criticalVerified) return 'high';
  if (primary >= 1) return 'medium';
  return 'low';
}

// ---------- Productos (§7.1) ----------
/** 10 requisitos exactos. unknown NO cuenta como cubierto. Devuelve {coverage_pct|null, provisional, counted, unknown, all_evidenced}. */
export function srCoverage(requirements) {
  const r = Array.isArray(requirements) ? requirements : [];
  if (r.length !== 10) return { coverage_pct: null, provisional: true, counted: r.length, unknown: null, all_evidenced: false };
  let sum = 0, unknown = 0, evidenced = 0;
  for (const q of r) {
    const st = ['implemented', 'partial', 'missing', 'unknown'].includes(q && q.state) ? q.state : 'unknown';
    if (st === 'implemented') sum += 1; else if (st === 'partial') sum += 0.5; else if (st === 'unknown') unknown++;
    if (srCanonicalUrl(q && q.evidence_url) && st !== 'unknown') evidenced++;
  }
  return { coverage_pct: Math.round((100 * sum) / 10), provisional: unknown > 0, counted: 10, unknown, all_evidenced: evidenced === 10 };
}

export function srScoreProduct(item) {
  const it = item || {}, s = it.scoring || {};
  const licenseOk = it.license_verified === true && !!srStr(it.license_id);
  const parts = { license: licenseOk ? srClamp(s.license, 25) : 0, functionality: srClamp(s.functionality, 25), integrations: srClamp(s.integrations, 15), security: srClamp(s.security, 15), deploy: srClamp(s.deploy, 10), sales_fit: srClamp(s.sales_fit, 10) };
  const score = Object.values(parts).reduce((a, b) => a + b, 0);
  const cov = srCoverage(it.requirements);
  const blockers = Array.isArray(it.critical_blockers) ? it.critical_blockers.filter((b) => srStr(b)) : [];
  const ev = srValidateEvidence(it);
  const nearly_ready = cov.coverage_pct !== null && cov.coverage_pct >= 90 && !cov.provisional && cov.all_evidenced && licenseOk && blockers.length === 0;
  let confidence = srConfidence(ev.sources, ev.primary, licenseOk && !cov.provisional, false);
  if (cov.coverage_pct === null) confidence = 'low';
  return { score, parts, coverage_pct: cov.coverage_pct, coverage_provisional: cov.provisional, nearly_ready, sellable: licenseOk, confidence, blockers };
}

// ---------- Alianzas (§7.2) ----------
export function srScorePartner(item) {
  const it = item || {}, s = it.scoring || {};
  const parts = { fit: srClamp(s.fit, 30), mutual_benefit: srClamp(s.mutual_benefit, 20), eligibility: srClamp(s.eligibility, 20), access: srClamp(s.access, 15), terms: srClamp(s.terms, 15) };
  const ev = srValidateEvidence(it);
  const hasOfficial = (Array.isArray(it.evidence) ? it.evidence : []).some((e) => e && e.source_type === 'official');
  const eligibilityProven = hasOfficial && parts.eligibility >= 12; // ≥60 % del máximo: Chile/LATAM comprobado
  const confidence = hasOfficial && eligibilityProven ? srConfidence(ev.sources, ev.primary, eligibilityProven, false) : 'low';
  return { score: Object.values(parts).reduce((a, b) => a + b, 0), parts, confidence, eligibility_proven: eligibilityProven };
}

// ---------- Eventos (§7.3) ----------
export function srScoreEvent(item, now) {
  const it = item || {}, s = it.scoring || {};
  const state = srEventState(it, now == null ? Date.now() : now);
  const verifiable = state !== 'unverified';
  const parts = { audience: srClamp(s.audience, 30), connections: srClamp(s.connections, 25), relevance: srClamp(s.relevance, 20), logistics: srClamp(s.logistics, 15), verification: verifiable ? srClamp(s.verification, 10) : 0 };
  const ev = srValidateEvidence(it);
  const hasOfficial = (Array.isArray(it.evidence) ? it.evidence : []).some((e) => e && e.source_type === 'official');
  const dp = srParseDate(it.event_start_at);
  let confidence = verifiable && hasOfficial ? srConfidence(ev.sources, ev.primary, verifiable && !!srStr(it.event_timezone), false) : 'low';
  return { score: Object.values(parts).reduce((a, b) => a + b, 0), parts, confidence, state, date_precision: dp ? (dp.date_only ? 'date_only' : 'datetime') : null };
}

// ---------- Ranking ----------
/** Activas primero por score desc, confianza y título. Excluye pruebas y estados terminales; máx 10 por categoría. */
export function srRank(items, opts) {
  const limit = (opts && opts.limit) || 10;
  const SR_CONF = { high: 2, medium: 1, low: 0 };
  return (Array.isArray(items) ? items : [])
    .filter((o) => o && !o.is_test && o.status !== 'dismissed' && o.status !== 'expired')
    .sort((a, b) => (b.score == null ? -1 : b.score) - (a.score == null ? -1 : a.score) || (SR_CONF[b.confidence] || 0) - (SR_CONF[a.confidence] || 0) || String(a.title).localeCompare(String(b.title)))
    .slice(0, limit);
}

// ---------- Transiciones humanas (§6.2) ----------
/** Estado nuevo o null si la transición no existe (dismissed/expired son terminales en v1). */
export function srTransition(from, decision) {
  const T = { new: { shortlist: 'shortlisted', work: 'working', dismiss: 'dismissed' }, shortlisted: { work: 'working', dismiss: 'dismissed' }, working: { dismiss: 'dismissed' } };
  const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  return (own(T, from) && own(T[from], decision) && T[from][decision]) || null;
}

// ---------- Producción (§8) ----------
/**
 * checks: observaciones de UN target. {state, confirmed_down, resolve_alert, last_checked_at, reason}.
 * - down confirmado = las 2 observaciones reales más recientes son `down` y distan ≤ 45 min. Una sola → `degraded` (por confirmar).
 * - Sin chequeos en 60 min → `unknown` (sin datos recientes), nunca `down`.
 * - alert_open + 2 `healthy` seguidos → resolve_alert. 200 = salud HTTP, no de la base de datos ni de pagos.
 */
export function srProductionHealth(checks, now, alertOpen) {
  const list = (Array.isArray(checks) ? checks : []).filter((c) => c && !c.is_test && Number.isFinite(Date.parse(c.checked_at))).sort((a, b) => Date.parse(b.checked_at) - Date.parse(a.checked_at));
  if (!list.length) return { state: 'unknown', confirmed_down: false, resolve_alert: false, last_checked_at: null, reason: 'sin_datos' };
  const [c1, c2] = list;
  const last = c1.checked_at;
  if (now - Date.parse(last) > 60 * 60000) return { state: 'unknown', confirmed_down: false, resolve_alert: false, last_checked_at: last, reason: 'sin_datos_recientes' };
  const confirmed = c1.result === 'down' && !!c2 && c2.result === 'down' && Date.parse(c1.checked_at) - Date.parse(c2.checked_at) <= 45 * 60000;
  if (confirmed) return { state: 'down', confirmed_down: true, resolve_alert: false, last_checked_at: last, reason: 'dos_caidas_consecutivas' };
  const twoHealthy = c1.result === 'healthy' && !!c2 && c2.result === 'healthy';
  if (alertOpen && !twoHealthy) return { state: 'down', confirmed_down: true, resolve_alert: false, last_checked_at: last, reason: 'alerta_abierta_sin_dos_exitos' };
  if (c1.result === 'down') return { state: 'degraded', confirmed_down: false, resolve_alert: false, last_checked_at: last, reason: 'caida_por_confirmar' };
  return { state: c1.result, confirmed_down: false, resolve_alert: !!alertOpen && twoHealthy, last_checked_at: last, reason: 'ok' };
}

// ---------- Señales para el Daily y «Hoy» (§3) ----------
/**
 * input = { targets:[{id,logical_name,status,monitor_enabled,is_test,alert_open,checks}], opportunities:[...], daily_max_items }.
 * Máx 3 señales, orden: caído > plazo ≤7 > plazo 8–14 > producto (máx 1). Sin señales → []. Deduplica por clase+id.
 */
export function srAttention(input, now) {
  const inp = input || {};
  const SR_TAB = { production: 'radar_produccion', product: 'radar_productos', partner: 'radar_alianzas', event: 'radar_eventos' };
  const max = Math.max(0, Math.min(3, inp.daily_max_items == null ? 3 : Number(inp.daily_max_items)));
  const out = [], seen = new Set();
  const push = (x) => { const k = x.class + ':' + x.id; if (!seen.has(k)) { seen.add(k); out.push(x); } };
  for (const t of Array.isArray(inp.targets) ? inp.targets : []) {
    if (!t || t.is_test || t.status !== 'confirmed' || t.monitor_enabled !== true) continue;
    const h = srProductionHealth(t.checks, now, t.alert_open);
    if (!h.confirmed_down) continue;
    push({ rank: 0, sub: 0, class: 'production', id: t.id, title: t.logical_name, what: t.logical_name + ' no responde', why: 'Dos comprobaciones seguidas fallaron (HTTP).', action: 'Revisar el servicio', tab: SR_TAB.production });
  }
  const opps = (Array.isArray(inp.opportunities) ? inp.opportunities : []).filter((o) => o && !o.is_test);
  for (const o of opps) {
    if ((o.kind !== 'event' && o.kind !== 'partner') || !['new', 'shortlisted'].includes(o.status) || o.last_daily_at || o.confidence === 'low' || !(o.score >= 75)) continue;
    const left = srDaysLeft(o.deadline_at, now);
    if (left === null || left < 0 || left > 14) continue;
    push({ rank: left <= 7 ? 1 : 2, sub: left, class: o.kind, id: o.id, title: o.title, what: o.title, why: 'Plazo confirmado en ' + left + (left === 1 ? ' día' : ' días') + ' · puntaje ' + o.score, action: o.next_action, tab: SR_TAB[o.kind] });
  }
  const prods = opps.filter((o) => o.kind === 'product' && o.status === 'new' && !o.last_daily_at && o.score >= 80 && o.license_verified === true && !!o.license_id && o.coverage_pct >= 90 && !(o.score_parts && o.score_parts.coverage_provisional) && !(Array.isArray(o.critical_blockers) && o.critical_blockers.length)).sort((a, b) => b.score - a.score);
  if (prods[0]) { const o = prods[0]; push({ rank: 3, sub: 0, class: 'product', id: o.id, title: o.title, what: o.title, why: 'Licencia verificada · cobertura auditada ' + o.coverage_pct + '% · puntaje ' + o.score, action: o.next_action, tab: SR_TAB.product }); }
  out.sort((a, b) => a.rank - b.rank || a.sub - b.sub);
  return out.slice(0, max);
}

// ---------- Alertas de producción para ops_alerts (§3, §8): solo caídas CONFIRMADAS de servicios confirmados y monitoreados ----------
/**
 * input = { config, targets:[{id,logical_name,status,monitor_enabled,is_test,alert_open,checks}] }. Clave `strategic_prod:<id>` (la deduplicación es la de alerts_poll).
 * Solo si la incorporación al Daily/alertas está encendida (daily_max_items > 0). Sin datos recientes NO se declara caído ni se da por resuelta una alerta abierta.
 */
export function srProdAlerts(input, now) {
  const i = input || {}, cfg = i.config;
  if (!cfg || !(Number(cfg.daily_max_items) > 0)) return [];
  const out = [];
  for (const t of Array.isArray(i.targets) ? i.targets : []) {
    if (!t || t.is_test || t.status !== 'confirmed' || t.monitor_enabled !== true) continue;
    const h = srProductionHealth(t.checks, now, t.alert_open === true);
    const keepOpen = t.alert_open === true && h.state === 'unknown';
    if (!h.confirmed_down && !keepOpen) continue;
    out.push({ key: 'strategic_prod:' + t.id, severity: 'critical', title: 'Servicio caído: ' + t.logical_name, detail: keepOpen ? 'Sin datos recientes del monitor: no se confirma que se haya recuperado.' : 'Dos comprobaciones HTTP seguidas fallaron (esto mide solo HTTP, no la base de datos ni los pagos).', meta: { strategic: true, target_id: t.id, href: '/ops?view=radar_produccion' } });
  }
  return out;
}

// ---------- Compuerta de corridas (§6.1 strategic_gate) ----------
/** input = { kind, now, global_pause, config, runs:[{kind,status,finished_at,is_test}], has_source } → {mode, reason, max_items}. */
export function srGate(input) {
  const i = input || {}, cfg = i.config || {};
  const skip = (reason) => ({ mode: 'skip', reason, max_items: 0 });
  if (!srFlag(i.kind)) return skip('kind_invalid');
  if (i.global_pause === true) return skip('global_pause');
  if (cfg[srFlag(i.kind)] !== true) return skip('flag_off');
  if (i.has_source === false) return skip('no_source');
  const runs = (Array.isArray(i.runs) ? i.runs : []).filter((r) => r && r.kind === i.kind && !r.is_test);
  const now = i.now;
  const failed24 = runs.filter((r) => r.status === 'failed' && now - Date.parse(r.finished_at) < 86400000).length;
  if (failed24 >= 3) return skip('quota');
  const recent = runs.some((r) => (r.status === 'ok' || r.status === 'partial') && now - Date.parse(r.finished_at) < srMinGap(i.kind));
  if (recent) return skip('recent_run');
  return { mode: 'run', reason: 'ok', max_items: i.kind === 'production' ? 0 : Math.max(1, Math.min(12, Number(cfg.ai_max_items_per_run) || 12)) };
}

// ---------- Vista para /ops (§6.3) ----------
/**
 * input = { tab, now, source_state, config, targets, checks, opportunities, runs }. Nunca contadores si la lectura falló.
 * Producción: confirmados primero, luego candidatos (`Por verificar`, sin salud). Candidatos jamás llevan estado de salud.
 */
export function srView(input) {
  const i = input || {}, now = i.now, cfg = i.config || {};
  const tab = ['production', 'products', 'partners', 'events'].includes(i.tab) ? i.tab : 'production';
  const flag = cfg[srFlag(tab)] === true;
  let source = ['ok', 'stale', 'unavailable', 'not_configured'].includes(i.source_state) ? i.source_state : 'ok';
  if (!i.config && source === 'ok') source = 'not_configured';
  const runs = (Array.isArray(i.runs) ? i.runs : []).filter((r) => r && !r.is_test && r.kind === tab).sort((a, b) => Date.parse(b.finished_at) - Date.parse(a.finished_at)).slice(0, 5);
  const base = { generated_at: new Date(now).toISOString(), tab, enabled: flag, source_state: source, runs };
  if (source === 'unavailable') return { ...base, summary: { total: 0, pending: 0, alerts: 0, last_run_at: null }, items: [] };
  const lastRun = runs.length ? runs[0].finished_at : null;
  if (tab === 'production') {
    const checksBy = {};
    for (const c of Array.isArray(i.checks) ? i.checks : []) (checksBy[c.target_id] = checksBy[c.target_id] || []).push(c);
    const rows = (Array.isArray(i.targets) ? i.targets : []).filter((t) => t && !t.is_test && t.status !== 'retired').map((t) => {
      const confirmed = t.status === 'confirmed';
      const health = confirmed && t.monitor_enabled ? srProductionHealth(checksBy[t.id], now, t.alert_open) : null;
      const real = health ? (checksBy[t.id] || []).filter((c) => c && !c.is_test && Number.isFinite(Date.parse(c.checked_at))).sort((a, b) => Date.parse(b.checked_at) - Date.parse(a.checked_at))[0] : null;
      const last_check = real ? { checked_at: real.checked_at, result: real.result, http_status: real.http_status == null ? null : real.http_status, latency_ms: real.latency_ms == null ? null : real.latency_ms, error_code: real.error_code || null } : null;
      return { ...t, section: confirmed ? 'confirmed' : 'pending', http_state: health ? health.state : 'unverified', health_reason: health ? health.reason : 'sin_verificar', last_checked_at: health ? health.last_checked_at : null, last_check };
    }).sort((a, b) => (a.section === b.section ? String(a.logical_name).localeCompare(String(b.logical_name)) : a.section === 'confirmed' ? -1 : 1));
    return { ...base, summary: { total: rows.length, pending: rows.filter((r) => r.section === 'pending').length, alerts: rows.filter((r) => r.http_state === 'down').length, last_run_at: lastRun }, items: rows };
  }
  const kind = srDbKind(tab);
  const all = (Array.isArray(i.opportunities) ? i.opportunities : []).filter((o) => o && !o.is_test && o.kind === kind);
  const items = srRank(all, { limit: 10 }).map((o) => {
    const age = o.last_checked_at ? Math.floor((now - Date.parse(o.last_checked_at)) / 86400000) : null;
    return { ...o, stale_days: age !== null && age >= 7 ? age : null, unverified: !o.last_checked_at };
  });
  return { ...base, summary: { total: all.length, pending: all.filter((o) => o.status === 'new' || o.status === 'shortlisted').length, alerts: 0, last_run_at: lastRun }, items };
}

// ---------- Decisiones humanas (workflow 29 · spec §6.2). Puras: el workflow lee la fila fresca, arma el PATCH condicional y audita. ----------
export function srIsUuid(v) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v || '')); }

/** strategic_decide: shortlist | work | dismiss sobre UNA oportunidad. expected_status (opcional) = el estado que Christian tenía en pantalla. */
export function srValidateDecision(x) {
  const b = x && typeof x === 'object' ? x : {};
  if (!srIsUuid(b.opportunity_id)) return { ok: false, error: 'opportunity_id_invalido', message: 'opportunity_id (uuid de la oportunidad) es obligatorio.' };
  const decision = String(b.decision || '').toLowerCase();
  if (['shortlist', 'work', 'dismiss'].indexOf(decision) < 0) return { ok: false, error: 'decision_invalida', message: 'decision: shortlist | work | dismiss.' };
  const exp = b.expected_status == null || b.expected_status === '' ? null : String(b.expected_status);
  if (exp !== null && ['new', 'shortlisted', 'working', 'dismissed', 'expired'].indexOf(exp) < 0) return { ok: false, error: 'estado_esperado_invalido', message: 'expected_status no es un estado válido.' };
  return { ok: true, value: { opportunity_id: String(b.opportunity_id).toLowerCase(), decision, expected_status: exp, test: b.test === true } };
}

export function srDecidePlan(req, row, ctx) {
  const c = ctx || {}, nowIso = new Date(c.now == null ? Date.now() : c.now).toISOString(), by = c.by || 'Christian via /ops';
  const STALE = 'Este registro cambió. Recarga para decidir sobre la última versión.';
  const LABEL = { new: 'nueva', shortlisted: 'guardada para evaluar', working: 'en trabajo', dismissed: 'descartada', expired: 'vencida' };
  const target = { shortlist: 'shortlisted', work: 'working', dismiss: 'dismissed' }[req.decision];
  if (!row) return { error: 'oportunidad_no_encontrada', message: 'No encontré esa oportunidad.' };
  if ((row.is_test === true) !== (req.test === true)) return { error: 'registro_test', message: row.is_test === true ? 'Esa oportunidad es de prueba: una decisión real no la modifica.' : 'Esa oportunidad es real: una prueba no la modifica.' };
  if (req.expected_status && req.expected_status !== row.status) return { error: 'stale_state', message: STALE, current_status: row.status };
  if (row.status === target) return { resp: { ok: true, status: 'already_' + target, opportunity_status: target, message: 'Ya estaba ' + LABEL[target] + '.' }, writes: [] };
  const next = srTransition(row.status, req.decision);
  if (!next) {
    if (row.status === 'dismissed' || row.status === 'expired') return { error: 'estado_terminal', message: 'Esa oportunidad está ' + LABEL[row.status] + ': en esta versión no se reabre.', current_status: row.status };
    return { error: 'transicion_invalida', message: 'Desde «' + (LABEL[row.status] || row.status) + '» no se puede hacer eso. Recarga para ver las opciones vigentes.', current_status: row.status };
  }
  const message = { shortlisted: 'Guardada para evaluar. No se contactó a nadie.', working: 'Anotada como prioridad interna. No se envió nada ni se creó nada en GHL.', dismissed: 'Descartada. No se vuelve a avisar.' }[next];
  return {
    resp: { ok: true, status: next, opportunity_status: next, message },
    writes: [{ method: 'PATCH', path: 'strategic_opportunities?id=eq.' + row.id + '&status=eq.' + row.status + '&is_test=eq.' + (row.is_test === true ? 'true' : 'false'), body: { status: next, decision_at: nowIso, decision_by: by, decision_reason: req.reason ? req.reason : null, updated_at: nowIso }, prefer: 'return=representation', check_rows: true, check_error: 'stale_state', check_message: STALE }],
  };
}

/** strategic_target_confirm: candidate → confirmed con repo + URL real + health endpoint. NO enciende el monitoreo. Sin red: solo valida la forma (el monitor revisa DNS y redirecciones en cada chequeo). */
export function srValidateTargetConfirm(x) {
  const b = x && typeof x === 'object' ? x : {};
  if (!srRuntimeOk().url) return { ok: false, error: 'runtime_incompleto', message: 'El entorno de n8n no trae URL: no se puede validar la dirección. No se guardó nada.' };
  if (!srIsUuid(b.target_id)) return { ok: false, error: 'target_id_invalido', message: 'target_id (uuid del servicio) es obligatorio.' };
  const repo = srStr(b.repo_full_name);
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}\/[A-Za-z0-9._-]{1,100}$/.test(repo)) return { ok: false, error: 'repo_invalido', message: 'El repositorio debe verse como dueño/nombre (por ejemplo ChristianEducation/LibreriaCrecer).' };
  const clean = (u, label) => {
    const raw = srStr(u).split('#')[0];
    if (!raw) return { error: label + ' es obligatoria.' };
    if (!srCanonicalUrl(raw)) return { error: label + ' no es válida: debe ser https, de un sitio público, sin usuario ni contraseña ni puerto distinto de 443.' };
    let q = '';
    try { q = new URL(raw).search; } catch { return { error: label + ' no es válida.' }; }
    if (/(token|key|secret|passw|auth|sig|session|credential)/i.test(q)) return { error: label + ' no puede llevar claves ni tokens en la dirección.' };
    return { value: raw };
  };
  const dep = clean(b.deployment_url, 'La URL del sitio'), hl = clean(b.health_url, 'La URL de salud');
  if (dep.error) return { ok: false, error: 'url_invalida', message: dep.error };
  if (hl.error) return { ok: false, error: 'url_invalida', message: hl.error };
  const provider = b.provider == null || b.provider === '' ? null : srStr(b.provider);
  if (provider !== null && !/^[A-Za-z0-9][A-Za-z0-9 ._-]{0,59}$/.test(provider)) return { ok: false, error: 'proveedor_invalido', message: 'El proveedor debe ser un nombre corto (por ejemplo Vercel).' };
  const reason = srStr(b.reason);
  if (reason.length < 8) return { ok: false, error: 'falta_razon', message: 'Escribe por qué confirmas este servicio (mínimo 8 caracteres).' };
  return { ok: true, value: { target_id: String(b.target_id).toLowerCase(), repo_full_name: repo, deployment_url: dep.value, health_url: hl.value, provider, reason: reason.slice(0, 200), test: b.test === true } };
}

// ---------- Monitor de producción: lo que el ejecutor confiable (Hermes) puede leer y registrar (spec §6.1, §8) ----------
/** Compuerta común de las dos acciones del monitor: config + pausa SIEMPRE en el servidor (test=true no las salta). */
export function srMonitorGuard(ctx) {
  const c = ctx || {};
  if (c.paused === true) return { error: 'global_pause', message: 'Pausa general activa: el monitor no lee ni registra.' };
  if (!c.cfg) return { error: 'not_configured', message: 'El Radar no tiene configuración todavía: el monitor sigue apagado.' };
  if (c.cfg.production_enabled !== true) return { error: 'flag_off', message: 'El monitoreo de producción está apagado.' };
  return null;
}

/** strategic_targets: solo id, nombre y health_url de los servicios confirmados Y con monitoreo encendido. Sin repos, notas ni datos internos. */
export function srTargetsPlan(ctx) {
  const c = ctx || {}, g = srMonitorGuard(c);
  if (g) return { error: g.error, message: g.message, targets: [] };
  const test = c.test === true;
  const targets = (Array.isArray(c.targets) ? c.targets : []).filter((t) => t && t.status !== 'paused' && t.status !== 'retired' && t.monitor_enabled === true && (t.status === undefined || t.status === 'confirmed') && (t.is_test === true) === test && typeof t.health_url === 'string' && t.health_url).slice(0, 60)
    .map((t) => ({ id: t.id, logical_name: t.logical_name, health_url: t.health_url }));
  return { targets };
}

/**
 * strategic_prod_check {target_id, checked_at, result, http_status?, latency_ms?, error_code?, observed_sha?, test}: guarda UNA observación.
 * No admite URL: el servicio sale de la base. No crea alertas (las evalúa alerts_poll) y no declara «caído» por su cuenta: devuelve la salud que resulta de las 2 últimas observaciones reales.
 */
export function srCheckPlan(p, ctx) {
  const x = p && typeof p === 'object' ? p : {}, c = ctx || {};
  const g = srMonitorGuard(c);
  if (g) return g;
  const now = c.now == null ? Date.now() : c.now, test = x.test === true;
  if (!srIsUuid(x.target_id)) return { error: 'target_id_invalido', message: 'target_id (uuid del servicio) es obligatorio.' };
  const t = c.target;
  if (!t) return { error: 'target_no_encontrado', message: 'No encontré ese servicio.' };
  if ((t.is_test === true) !== test) return { error: 'registro_test', message: t.is_test === true ? 'Ese servicio es de prueba: un chequeo real no lo modifica.' : 'Ese servicio es real: una prueba no lo modifica.' };
  if (t.status !== 'confirmed' || t.monitor_enabled !== true) return { error: 'target_no_monitoreado', message: 'Ese servicio no está confirmado con el monitoreo encendido: no se registra.' };
  if (['healthy', 'degraded', 'down', 'unknown'].indexOf(x.result) < 0) return { error: 'resultado_invalido', message: 'result: healthy | degraded | down | unknown.' };
  const st = x.http_status == null ? null : Number(x.http_status);
  if (st !== null && !(Number.isInteger(st) && st >= 100 && st <= 599)) return { error: 'http_invalido', message: 'http_status debe estar entre 100 y 599.' };
  const lat = x.latency_ms == null ? null : Number(x.latency_ms);
  if (lat !== null && !(Number.isInteger(lat) && lat >= 0 && lat <= 120000)) return { error: 'latencia_invalida', message: 'latency_ms debe estar entre 0 y 120000.' };
  const code = x.error_code == null || x.error_code === '' ? null : String(x.error_code);
  if (code !== null && !/^[A-Za-z0-9_.:-]{1,60}$/.test(code)) return { error: 'codigo_invalido', message: 'error_code: hasta 60 caracteres simples.' };
  const sha = x.observed_sha == null || x.observed_sha === '' ? null : String(x.observed_sha);
  if (sha !== null && !/^[0-9a-f]{7,64}$/i.test(sha)) return { error: 'sha_invalido', message: 'observed_sha no es un SHA válido.' };
  const at = srParseDate(x.checked_at);
  if (!at || at.date_only || at.ms < now - 15 * 60000 || at.ms > now + 2 * 60000) return { error: 'checked_at_invalido', message: 'checked_at debe ser la hora real del chequeo (ISO con zona, de los últimos 15 minutos).' };
  // Un resultado no puede contradecir el HTTP observado: «healthy» exige 2xx; «down» con un 2xx/3xx/4xx sería inventar una caída.
  if (x.result === 'healthy' && !(st !== null && st >= 200 && st < 300)) return { error: 'resultado_incoherente', message: 'healthy exige un HTTP 2xx.' };
  if (x.result === 'down' && st !== null && st < 500) return { error: 'resultado_incoherente', message: 'down solo con HTTP 5xx o sin respuesta (timeout, DNS, conexión).' };
  const recent = (Array.isArray(c.recent) ? c.recent : []).filter((r) => r && Number.isFinite(Date.parse(r.checked_at)) && (r.is_test === true) === test).sort((a, b) => Date.parse(b.checked_at) - Date.parse(a.checked_at));
  if (recent.length && Math.abs(at.ms - Date.parse(recent[0].checked_at)) < 60000) return { error: 'demasiado_pronto', message: 'Ya hay un chequeo de este servicio en el último minuto.' };
  const row = { target_id: String(x.target_id).toLowerCase(), checked_at: new Date(at.ms).toISOString(), result: x.result, http_status: st, latency_ms: lat, error_code: code, observed_sha: sha, evidence_url: null, is_test: test };
  // La salud se calcula con las 2 observaciones reales más recientes de ESE servicio (las de prueba se tratan como reales solo dentro de una prueba).
  const asReal = (r) => ({ ...r, is_test: false });
  const h = srProductionHealth([row, ...recent].map(asReal), now, c.alert_open === true);
  return {
    resp: { ok: true, recorded: true, state: h.state, confirmed_down: h.confirmed_down, resolve_alert: h.resolve_alert, last_checked_at: h.last_checked_at, alert_created: false },
    writes: [{ method: 'POST', path: 'strategic_prod_checks', body: row, prefer: 'return=minimal' }],
  };
}

export function srTargetConfirmPlan(req, row, ctx) {
  const c = ctx || {}, nowIso = new Date(c.now == null ? Date.now() : c.now).toISOString(), by = c.by || 'Christian via /ops';
  const STALE = 'Este servicio cambió. Recarga para confirmarlo sobre la última versión.';
  if (!row) return { error: 'servicio_no_encontrado', message: 'No encontré ese servicio.' };
  if ((row.is_test === true) !== (req.test === true)) return { error: 'registro_test', message: row.is_test === true ? 'Ese servicio es de prueba: una confirmación real no lo modifica.' : 'Ese servicio es real: una prueba no lo modifica.' };
  if (row.status === 'confirmed') {
    const same = row.repo_full_name === req.repo_full_name && row.deployment_url === req.deployment_url && row.health_url === req.health_url;
    return same ? { resp: { ok: true, status: 'already_confirmed', message: 'Ya estaba confirmado con esos datos.' }, writes: [] } : { error: 'ya_confirmado', message: 'Ese servicio ya está confirmado con otros datos; en esta versión no se cambian desde aquí.' };
  }
  if (row.status !== 'candidate') return { error: 'estado_invalido', message: 'Solo un servicio «por verificar» se puede confirmar (este está ' + row.status + ').', current_status: row.status };
  return {
    resp: { ok: true, status: 'confirmed', message: 'Confirmado. El monitoreo sigue APAGADO: primero se prueba el endpoint real y tú autorizas encenderlo.' },
    writes: [{ method: 'PATCH', path: 'strategic_prod_targets?id=eq.' + row.id + '&status=eq.candidate&is_test=eq.' + (row.is_test === true ? 'true' : 'false'), body: { status: 'confirmed', repo_full_name: req.repo_full_name, deployment_url: req.deployment_url, health_url: req.health_url, provider: req.provider, verified_by: by, verified_at: nowIso, monitor_enabled: false, updated_at: nowIso }, prefer: 'return=representation', check_rows: true, check_error: 'stale_state', check_message: STALE }],
  };
}

// ---------- Ingesta de hallazgos de la IA (strategic_ingest · spec §6.1, §9.4, §17.2, §17.4) ----------
/** Criterios y máximos de puntaje por categoría (§7). La IA NO envía un puntaje: envía criterios y el servidor suma. */
export function srScoringSpec(kind) {
  return ({ products: { license: 25, functionality: 25, integrations: 15, security: 15, deploy: 10, sales_fit: 10 }, partners: { fit: 30, mutual_benefit: 20, eligibility: 20, access: 15, terms: 15 }, events: { audience: 30, connections: 25, relevance: 20, logistics: 15, verification: 10 } })[kind] || null;
}

/** Fecha calendario (YYYY-MM-DD) de un instante en la zona dada (la del evento; UTC si no hay). */
export function srLocalDate(ms, tz) {
  try { return new Intl.DateTimeFormat('en-CA', { timeZone: tz || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms)); } catch { return new Date(ms).toISOString().slice(0, 10); }
}

/** Valida UN hallazgo y lo normaliza. Devuelve {error} (código estable) o {value}. No toca la base ni inventa nada: lo ausente queda null. */
export function srIngestItem(kind, it, now) {
  const x = it && typeof it === 'object' && !Array.isArray(it) ? it : null;
  if (!x) return { error: 'item_invalido' };
  const spec = srScoringSpec(kind);
  const len = (v, min, max) => typeof v === 'string' && v.trim().length >= min && v.trim().length <= max;
  if (!len(x.title, 5, 200)) return { error: 'title_invalido' };
  if (!len(x.organization, 1, 200)) return { error: 'organization_missing' };
  const url = srCanonicalUrl(x.canonical_url);
  if (!url) return { error: 'url_invalida' };
  if (!len(x.summary, 10, 2000)) return { error: 'summary_invalido' };
  if (!len(x.business_case, 10, 2000)) return { error: 'business_case_invalido' };
  if (!len(x.next_action, 5, 500)) return { error: 'next_action_invalido' };
  if (x.target_customer != null && !len(x.target_customer, 1, 300)) return { error: 'target_customer_invalido' };
  const sc = x.scoring && typeof x.scoring === 'object' && !Array.isArray(x.scoring) ? x.scoring : null;
  if (!sc) return { error: 'scoring_faltante' };
  for (const k of Object.keys(sc)) {
    if (!Object.prototype.hasOwnProperty.call(spec, k)) return { error: 'scoring_no_corresponde' };
    if (!(Number.isInteger(sc[k]) && sc[k] >= 0 && sc[k] <= spec[k])) return { error: 'scoring_fuera_de_rango' };
  }
  const ev = srValidateEvidence(x);
  if (!ev.ok) return { error: ev.reasons[0] || 'evidence_missing' };
  if (x.evidence.slice(0, 5).some((e) => e.source_published_at != null && e.source_published_at !== '' && !Number.isFinite(Date.parse(e.source_published_at)))) return { error: 'source_published_at_invalido' };
  const evs = x.evidence.slice(0, 5).map((e) => ({ source_url: srCanonicalUrl(e.source_url), source_title: srStr(e.source_title).slice(0, 300), source_type: e.source_type, claim: srStr(e.claim).slice(0, 2000), excerpt: srStr(e.excerpt) ? srStr(e.excerpt).slice(0, 350) : null, source_published_at: e.source_published_at ? new Date(Date.parse(e.source_published_at)).toISOString() : null, verified_at: new Date(srParseDate(e.verified_at).ms).toISOString() }));
  if (evs.some((e) => Date.parse(e.verified_at) > now + 5 * 60000)) return { error: 'verified_at_futuro' };
  const blockers = x.critical_blockers == null ? [] : x.critical_blockers;
  if (!Array.isArray(blockers) || blockers.length > 10 || blockers.some((b) => !len(b, 1, 200))) return { error: 'critical_blockers_invalidos' };
  const hasReq = Array.isArray(x.requirements) ? x.requirements.length > 0 : x.requirements != null;
  const hasLic = x.license_id != null || x.license_verified === true;
  if (kind !== 'products' && (hasReq || hasLic)) return { error: 'campo_no_corresponde' };
  if (kind === 'products' && (x.deadline_at != null || x.event_start_at != null || x.event_end_at != null || x.event_timezone != null || x.event_location != null || x.event_format != null)) return { error: 'campo_no_corresponde' };
  if (kind === 'partners' && (x.event_start_at != null || x.event_end_at != null || x.event_timezone != null || x.event_location != null || x.event_format != null)) return { error: 'campo_no_corresponde' };
  const base = { title: x.title.trim(), organization: x.organization.trim(), canonical_url: url, summary: x.summary.trim(), business_case: x.business_case.trim(), target_customer: x.target_customer ? x.target_customer.trim() : null, next_action: x.next_action.trim(), critical_blockers: blockers.map((b) => b.trim()), evidence: evs, license_id: null, license_verified: false, coverage_pct: null, event_start_at: null, event_end_at: null, deadline_at: null, event_timezone: null, event_location: null, event_format: null };
  const dateOut = (raw) => { const p = srParseDate(raw); return p ? new Date(p.date_only ? Date.parse(p.date + 'T00:00:00Z') : p.ms).toISOString() : null; };
  if (kind === 'products') {
    const lic = x.license_id == null ? null : x.license_id;
    if (lic !== null && !len(lic, 1, 100)) return { error: 'license_id_invalido' };
    if (x.license_verified != null && typeof x.license_verified !== 'boolean') return { error: 'license_verified_invalido' };
    if (x.license_verified === true && !lic) return { error: 'license_id_missing' };
    const reqs = x.requirements == null ? [] : x.requirements;
    if (!Array.isArray(reqs) || reqs.length > 10) return { error: 'requirements_invalidos' };
    for (const q of reqs) {
      if (!q || typeof q !== 'object' || !len(q.name, 1, 200) || ['implemented', 'partial', 'missing', 'unknown'].indexOf(q.state) < 0) return { error: 'requirement_invalido' };
      if (q.evidence_url != null && !srCanonicalUrl(q.evidence_url)) return { error: 'requirement_url_invalida' };
    }
    const r = srScoreProduct({ ...x, scoring: sc, license_id: lic, license_verified: x.license_verified === true, requirements: reqs, critical_blockers: base.critical_blockers });
    return { value: { ...base, license_id: lic, license_verified: x.license_verified === true, coverage_pct: r.coverage_pct, score: r.score, confidence: r.confidence, score_parts: { ...r.parts, coverage_provisional: r.coverage_provisional, nearly_ready: r.nearly_ready, requirements_count: reqs.length } } };
  }
  const dl = x.deadline_at == null || x.deadline_at === '' ? null : x.deadline_at;
  if (dl !== null && !srParseDate(dl)) return { error: 'fecha_invalida' };
  base.deadline_at = dl === null ? null : dateOut(dl);
  if (kind === 'partners') {
    const r = srScorePartner({ ...x, scoring: sc });
    return { value: { ...base, score: r.score, confidence: r.confidence, score_parts: { ...r.parts, eligibility_proven: r.eligibility_proven } } };
  }
  const st = x.event_start_at == null || x.event_start_at === '' ? null : x.event_start_at, en = x.event_end_at == null || x.event_end_at === '' ? null : x.event_end_at;
  if ((st !== null && !srParseDate(st)) || (en !== null && !srParseDate(en))) return { error: 'fecha_invalida' };
  if (st === null && en !== null) return { error: 'fechas_incoherentes' };
  if (st !== null && en !== null && srParseDate(en).ms < srParseDate(st).ms) return { error: 'fechas_incoherentes' };
  let tz = null;
  if (x.event_timezone != null && x.event_timezone !== '') {
    tz = String(x.event_timezone);
    try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); } catch { return { error: 'timezone_invalida' }; }
  }
  for (const k of ['event_location', 'event_format']) if (x[k] != null && !len(x[k], 1, 200)) return { error: k + '_invalido' };
  base.event_start_at = st === null ? null : dateOut(st); base.event_end_at = en === null ? null : dateOut(en);
  base.event_timezone = tz; base.event_location = x.event_location ? x.event_location.trim() : null; base.event_format = x.event_format ? x.event_format.trim() : null;
  const r = srScoreEvent({ ...x, scoring: sc, event_start_at: st, event_end_at: en, event_timezone: tz }, now);
  const sp = st === null ? null : srParseDate(st);
  const edition = sp ? (sp.date_only ? sp.date : srLocalDate(sp.ms, tz)) : null;
  return { value: { ...base, score: r.score, confidence: r.confidence, event_state: r.state, edition_date: edition, score_parts: { ...r.parts, date_precision: r.date_precision } } };
}

/**
 * strategic_ingest {kind, run_id, items[], test}: valida cada hallazgo, calcula el puntaje EN EL SERVIDOR, deduplica por huella y guarda.
 * Reingesta: solo avanza last_checked_at y evidencia nueva; NUNCA toca status, decisión, last_daily_at ni first_seen_at. Lo descartado/vencido solo sirve para deduplicar.
 * ctx = {now, cfg, paused, existing[], evidence[], run, newId, validate_only}. La corrida se escribe AL FINAL: si algo falla antes, reintentar con el mismo run_id es seguro (idempotente).
 */
export function srIngestPlan(req, ctx) {
  const r = req && typeof req === 'object' ? req : {}, c = ctx || {};
  const now = c.now == null ? Date.now() : c.now, nowIso = new Date(now).toISOString();
  const dbKind = srDbKind(r.kind);
  if (!srRuntimeOk().url) return { error: 'runtime_incompleto', message: 'El entorno de n8n no trae URL: no se puede validar ninguna dirección. No se guardó nada.' };
  if (!dbKind || ['products', 'partners', 'events'].indexOf(r.kind) < 0) return { error: 'kind_invalido', message: 'kind: products | partners | events.' };
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(r.run_id || ''))) return { error: 'run_id_invalido', message: 'run_id debe ser un UUID v4 generado antes de investigar.' };
  const runId = String(r.run_id).toLowerCase();
  const items = Array.isArray(r.items) ? r.items : null;
  if (!items || !items.length) return { error: 'items_invalidos', message: 'items: lista no vacía.' };
  const cap = Math.min(20, c.cfg && Number.isInteger(c.cfg.ai_max_items_per_run) ? c.cfg.ai_max_items_per_run : 12);
  if (items.length > cap) return { error: 'demasiados_items', message: 'Máximo ' + cap + ' hallazgos por corrida.' };
  if (!c.validate_only) {
    if (c.paused === true) return { error: 'global_pause', message: 'Pausa general activa: no se guardan hallazgos.' };
    if (!c.cfg) return { error: 'not_configured', message: 'El Radar no tiene configuración todavía: la investigación sigue apagada.' };
    if (c.cfg[srFlag(r.kind)] !== true) return { error: 'flag_off', message: 'La investigación de ' + r.kind + ' está apagada.' };
  }
  if (c.run) {
    if (c.run.kind !== r.kind) return { error: 'run_id_en_uso', message: 'Ese run_id ya se usó para otra categoría.' };
    if (c.run.status === 'ok' || c.run.status === 'partial') return { resp: { ok: true, replayed: true, kind: r.kind, run_id: runId, accepted: c.run.accepted_count || 0, duplicates: c.run.duplicate_count || 0, rejected: [], failed: c.run.failed_count || 0 }, writes: [] };
  }
  const test = r.test === true, existing = Array.isArray(c.existing) ? c.existing : [], knownEv = Array.isArray(c.evidence) ? c.evidence : [];
  const newId = typeof c.newId === 'function' ? c.newId : null;
  if (!newId && !c.validate_only) return { error: 'sin_generador_de_ids', message: 'Falta el generador de ids.' };
  const rejected = [], writes = [], seen = new Set();
  let accepted = 0, duplicates = 0;
  items.forEach((raw, index) => {
    const v = srIngestItem(r.kind, raw, now);
    if (v.error) { rejected.push({ index, reason: v.error }); return; }
    const it = v.value, baseFp = srFingerprint(dbKind, it.canonical_url);
    if (raw.fingerprint != null && raw.fingerprint !== baseFp) { rejected.push({ index, reason: 'huella_no_coincide' }); return; }
    let fp = baseFp, match = null;
    if (dbKind === 'event') {
      const rows = existing.filter((e) => e.canonical_url === it.canonical_url);
      const dateOf = (e) => (e.event_start_at ? (e.score_parts && e.score_parts.date_precision === 'date_only' ? String(e.event_start_at).slice(0, 10) : srLocalDate(Date.parse(e.event_start_at), e.event_timezone)) : null);
      if (it.edition_date) {
        match = rows.find((e) => !e.event_start_at || dateOf(e) === it.edition_date) || null;
        if (!match && rows.length) fp = srFingerprint('event', it.canonical_url, it.edition_date);
        else if (match) fp = match.fingerprint;
      } else if (rows.length) { match = rows[0]; fp = match.fingerprint; }
    }
    if (!match) match = existing.find((e) => e.fingerprint === fp) || null;
    if (seen.has(fp)) { duplicates++; return; }
    seen.add(fp);
    if (match && (match.is_test === true) !== test) { rejected.push({ index, reason: 'registro_test' }); return; }
    const known = (id) => knownEv.filter((k) => k.opportunity_id === id);
    const evRows = (id, only) => it.evidence.filter((e) => !only || !known(id).some((k) => k.source_url === e.source_url && k.claim === e.claim)).map((e) => ({ opportunity_id: id, ...e, is_test: test }));
    if (match) {
      duplicates++;
      const fresh = evRows(match.id, true);
      const body = { last_checked_at: nowIso, updated_at: nowIso };
      if (fresh.length && ['new', 'shortlisted', 'working'].indexOf(match.status) >= 0) {
        Object.assign(body, { title: it.title, organization: it.organization, summary: it.summary, business_case: it.business_case, target_customer: it.target_customer, next_action: it.next_action, score: it.score, score_parts: it.score_parts, confidence: it.confidence, license_id: it.license_id, license_verified: it.license_verified, coverage_pct: it.coverage_pct, critical_blockers: it.critical_blockers, event_start_at: it.event_start_at, event_end_at: it.event_end_at, deadline_at: it.deadline_at, event_timezone: it.event_timezone, event_location: it.event_location, event_format: it.event_format });
        if (it.event_state === 'expired' && (match.status === 'new' || match.status === 'shortlisted')) body.status = 'expired';
      }
      writes.push({ method: 'PATCH', path: 'strategic_opportunities?id=eq.' + match.id + '&is_test=eq.' + (test ? 'true' : 'false'), body, prefer: 'return=minimal' });
      if (fresh.length) writes.push({ method: 'POST', path: 'strategic_evidence?on_conflict=opportunity_id,source_url,claim', body: fresh, prefer: 'resolution=ignore-duplicates,return=minimal' });
      return;
    }
    accepted++;
    if (c.validate_only) return;
    const id = newId();
    const row = { id, kind: dbKind, fingerprint: fp, title: it.title, organization: it.organization, canonical_url: it.canonical_url, summary: it.summary, business_case: it.business_case, target_customer: it.target_customer, next_action: it.next_action, status: it.event_state === 'expired' ? 'expired' : 'new', score: it.score, score_parts: it.score_parts, confidence: it.confidence, license_id: it.license_id, license_verified: it.license_verified, coverage_pct: it.coverage_pct, critical_blockers: it.critical_blockers, event_start_at: it.event_start_at, event_end_at: it.event_end_at, deadline_at: it.deadline_at, event_timezone: it.event_timezone, event_location: it.event_location, event_format: it.event_format, first_seen_at: nowIso, last_checked_at: nowIso, is_test: test };
    writes.push({ method: 'POST', path: 'strategic_opportunities', body: row, prefer: 'return=minimal' });
    writes.push({ method: 'POST', path: 'strategic_evidence?on_conflict=opportunity_id,source_url,claim', body: evRows(id, false), prefer: 'resolution=ignore-duplicates,return=minimal' });
  });
  const status = rejected.length === 0 ? 'ok' : accepted + duplicates === 0 ? 'failed' : 'partial';
  const resp = { ok: true, kind: r.kind, run_id: runId, accepted, duplicates, rejected, run_status: status, ...(c.validate_only ? { dry_run: true, would_accept: accepted } : {}) };
  if (c.validate_only) return { resp, writes: [] };
  const started = srParseDate(r.started_at);
  writes.push({ method: 'POST', path: 'strategic_runs?on_conflict=id', body: { id: runId, kind: r.kind, trigger: test ? 'test' : (r.trigger === 'cron' ? 'cron' : 'manual'), status, started_at: started && !started.date_only && started.ms <= now ? new Date(started.ms).toISOString() : nowIso, finished_at: nowIso, scanned_count: items.length, accepted_count: accepted, duplicate_count: duplicates, failed_count: rejected.length, error_code: status === 'failed' ? 'all_rejected' : null, is_test: test }, prefer: 'resolution=merge-duplicates,return=minimal' });
  return { resp, writes };
}
