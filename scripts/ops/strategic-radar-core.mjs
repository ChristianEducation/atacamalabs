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
  const bytes = Array.from(new TextEncoder().encode(String(str)));
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
