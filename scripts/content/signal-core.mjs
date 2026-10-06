/**
 * Atacama OS · Content Engine — gate de SEÑALES (lo que Hermes `content-radar` entrega antes de ser contenido).
 *
 * Igual que engine-core.mjs: función AUTOCONTENIDA (sin imports ni `new URL`) que se prueba con
 * `signal-core.test.mjs` y se incrusta tal cual en el workflow n8n «13 Content Signal Intake».
 *
 * Una señal solo avanza si:
 *   - tiene el esquema completo (tipo, resumen, URL, fuente, fecha cuando corresponde, por qué importa, ángulo, audiencia, canal);
 *   - la URL respondió (HTTP 2xx) y, en tipos externos, la CITA aparece literalmente en la página (verificación hecha por n8n);
 *   - no está obsoleta (news/competitor/founder: ≤ 90 días; > 30 días pierde novedad) y no está duplicada;
 *   - su score 0–100 llega a 70 (mismos pesos que las piezas). Bajo 70 se guarda como `held`, nunca se fuerza.
 */
export function evaluateSignal(sig, ctx = {}) {
  const reasons = [];
  const TYPES = ['news', 'competitor', 'founder', 'customer-question', 'evergreen', 'real-work'];
  const EXTERNAL = ['news', 'competitor', 'founder', 'customer-question'];
  const CHANNELS = ['instagram', 'linkedin_page', 'linkedin_profile'];
  const W = { relevance: 15, audience_fit: 12, novelty: 8, evidence: 15, utility: 12, clarity: 10, conversation: 8, differentiation: 10, non_repetition: 10 };
  const THRESHOLD = 70;
  const now = ctx.now || Date.now();
  const str = (v) => (typeof v === 'string' ? v.trim() : '');
  const isUrl = (u) => /^https?:\/\/[^\s/$.?#][^\s]*$/i.test(String(u || ''));
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/&[a-z]+;|&#\d+;/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
  const s = sig && typeof sig === 'object' ? sig : {};

  const type = str(s.type);
  if (!TYPES.includes(type)) reasons.push('tipo_invalido');
  const external = EXTERNAL.includes(type);
  const title = str(s.title);
  const summary = str(s.summary);
  const url = str(s.url);
  const quote = str(s.quote);
  if (title.length < 8 || title.length > 200) reasons.push('titulo_fuera_de_rango');
  if (summary.length < 30 || summary.length > 700) reasons.push('resumen_fuera_de_rango');
  if (!isUrl(url)) reasons.push('url_invalida');
  if (!str(s.source)) reasons.push('fuente_obligatoria');
  if (str(s.why_it_matters).length < 20) reasons.push('falta_por_que_importa');
  if (!str(s.angle)) reasons.push('falta_angulo');
  if (!str(s.audience)) reasons.push('falta_audiencia');
  if (!CHANNELS.includes(s.channel_suggestion)) reasons.push('canal_invalido');
  const conf = Number(s.confidence);
  if (!Number.isFinite(conf) || conf < 0 || conf > 1) reasons.push('confianza_invalida');
  if (external && (quote.length < 20 || quote.length > 500)) reasons.push('cita_obligatoria_en_senal_externa');
  const hasDate = /^\d{4}-\d{2}-\d{2}$/.test(str(s.date));
  if (external && !hasDate) reasons.push('fecha_obligatoria_en_senal_externa');

  // Frescura
  let ageDays = null;
  if (hasDate) { const t = Date.parse(str(s.date) + 'T12:00:00Z'); if (Number.isFinite(t)) ageDays = Math.max(0, Math.round((now - t) / 86400000)); else reasons.push('fecha_invalida'); }
  if (ageDays !== null && ageDays < 0) reasons.push('fecha_en_el_futuro');
  if (external && ageDays !== null && ageDays > 90) reasons.push('senal_obsoleta');

  // Verificación (la hace n8n al abrir la URL; aquí se interpreta)
  const httpOk = Number(ctx.httpStatus) >= 200 && Number(ctx.httpStatus) < 300;
  // La cita puede partirse entre etiquetas HTML: se compara contra el texto visible (sin scripts, estilos ni marcado).
  const plain = (h) => String(h || '').replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<!--[\s\S]*?-->/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;|&#34;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&#(\d+);/g, (m, d) => String.fromCharCode(Number(d)));
  const quoteFound = external ? Boolean(ctx.bodyText) && norm(plain(ctx.bodyText)).includes(norm(plain(quote))) : null;
  if (external && !httpOk) reasons.push('url_inaccesible');
  if (external && httpOk && !quoteFound) reasons.push('cita_no_aparece_en_la_pagina');
  const verified = external ? httpOk && quoteFound === true : true; // evergreen/real-work: fuente interna declarada

  // Duplicado
  // Un mismo changelog/URL puede traer varias novedades distintas: la clave incluye un hash de la cita (o del título).
  const fnv = (x) => { let h = 0x811c9dc5; for (let i = 0; i < x.length; i++) { h ^= x.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, '0'); };
  const sourceKey = (type === 'real-work' || type === 'evergreen' ? type.replace('-', '_') : 'hermes_research') + ':' + (url || norm(title).slice(0, 60)) + (external ? '#' + fnv(norm(quote || title)) : '');
  const dup = Array.isArray(ctx.existingKeys) && ctx.existingKeys.includes(sourceKey);

  // Factores
  const f = s.factors && typeof s.factors === 'object' ? s.factors : {};
  const val = (k) => { const v = Number(f[k]); return Number.isFinite(v) ? Math.max(0, Math.min(10, v)) : null; };
  const judged = ['relevance', 'audience_fit', 'novelty', 'utility', 'clarity', 'conversation', 'differentiation'];
  const bd = {};
  judged.forEach((k) => { const v = val(k); if (v === null) reasons.push('factor_faltante:' + k); bd[k] = v === null ? 0 : v; });
  if (external && ageDays !== null) { if (ageDays > 30) bd.novelty = Math.round(bd.novelty * 0.4); else if (ageDays > 14) bd.novelty = Math.round(bd.novelty * 0.8); }
  // La evidencia la calcula el sistema (no la declara Hermes)
  bd.evidence = external ? (verified ? Math.min(10, Math.round(6 + 4 * (Number.isFinite(conf) ? conf : 0))) : 0) : 7;
  bd.non_repetition = dup ? 0 : 10;
  let raw = 0;
  Object.keys(W).forEach((k) => { raw += (W[k] * (bd[k] || 0)) / 10; });
  const score = Math.max(0, Math.min(100, Math.round(raw)));

  let status;
  if (dup) { status = 'duplicate'; if (!reasons.includes('duplicada')) reasons.push('duplicada'); }
  else if (reasons.length) status = 'rejected';
  else if (score >= THRESHOLD) status = 'candidate';
  else status = 'held';

  return { status, signal_score: score, verified, quote_found: quoteFound, http_ok: httpOk, age_days: ageDays, reasons, breakdown: bd, source_key: sourceKey, threshold: THRESHOLD };
}
