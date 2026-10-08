/**
 * Atacama OS · Content Engine — Ola A (núcleo puro): Content Queue Governor, biblioteca de recursos, Founder Interview e inteligencia orgánica.
 *
 * Funciones AUTOCONTENIDAS (sin imports ni constantes de módulo): se prueban con `growth-core.test.mjs` y se incrustan con
 * Function.prototype.toString en los workflows n8n «12 Content Intake» y «27 Content Growth».
 */

/**
 * Content Queue Governor. `origin`: 'autonomous' (cron/radar) | 'explicit' (orden de Christian) | 'founder_interview'.
 * Autónomo con la cola llena → bloqueado (no se crea nada). Una orden explícita o una entrevista siempre pasa, con advertencia visible.
 */
export function growthGovernor(o) {
  const x = o || {};
  const max = Number.isFinite(Number(x.max)) && Number(x.max) > 0 ? Number(x.max) : 6;
  const pending = Math.max(0, Number(x.pending) || 0);
  const origin = ['autonomous', 'explicit', 'founder_interview'].includes(x.origin) ? x.origin : 'explicit';
  const full = pending >= max;
  if (!full) return { allowed: true, warning: null, reason: null, pending, max, origin };
  if (origin === 'autonomous') return { allowed: false, warning: null, reason: 'cola_llena', pending, max, origin };
  return { allowed: true, warning: 'cola_llena_por_orden_explicita', reason: null, pending, max, origin };
}

/** Texto comparable: minúsculas, sin tildes ni signos. */
export function growthNorm(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ ]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Ordena recursos por afinidad con una consulta (tema/problema). Solo recursos activos salvo `includeDraft`. */
export function growthResourceRank(resources, query, opts) {
  const o = opts || {};
  const stop = new Set(['de', 'la', 'el', 'los', 'las', 'un', 'una', 'para', 'por', 'con', 'que', 'en', 'y', 'o', 'a', 'del', 'al', 'mi', 'tu', 'su', 'se', 'es', 'como', 'qué', 'cómo']);
  const toks = (t) => growthNorm(t).split(' ').filter((w) => w.length > 2 && !stop.has(w));
  const q = toks(query);
  const list = (Array.isArray(resources) ? resources : []).filter((r) => r && (r.status === 'active' || (o.includeDraft && r.status === 'draft')));
  const scored = list.map((r) => {
    const name = toks(r.name), topic = toks(r.topic), problem = toks(r.problem), aud = toks(r.audience);
    let s = 0;
    q.forEach((w) => {
      if (name.some((n) => n.startsWith(w) || w.startsWith(n))) s += 3;
      if (topic.some((n) => n.startsWith(w) || w.startsWith(n))) s += 3;
      if (problem.some((n) => n.startsWith(w) || w.startsWith(n))) s += 2;
      if (aud.some((n) => n.startsWith(w) || w.startsWith(n))) s += 1;
    });
    return { ...r, match_score: s };
  }).filter((r) => (q.length ? r.match_score > 0 : true));
  scored.sort((a, b) => b.match_score - a.match_score || String(b.created_at || '').localeCompare(String(a.created_at || '')));
  return scored.slice(0, o.limit || 5);
}

/** Valida y normaliza un recurso antes de guardarlo en la biblioteca. */
export function growthValidateResource(r) {
  const errors = [];
  const x = r && typeof r === 'object' ? r : {};
  const str = (v) => (typeof v === 'string' ? v.trim() : '');
  const TYPES = ['guia', 'checklist', 'plantilla', 'diagnostico', 'prompt', 'documento', 'comparativa', 'caso', 'herramienta', 'pagina'];
  const MODES = ['resource_link', 'dm', 'diagnostic'];
  const slug = str(x.slug);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length > 80) errors.push('slug_invalido');
  const name = str(x.name);
  if (name.length < 5 || name.length > 120) errors.push('nombre_fuera_de_rango');
  if (!TYPES.includes(x.type)) errors.push('tipo_invalido');
  const topic = str(x.topic);
  if (topic.length < 3 || topic.length > 120) errors.push('tema_fuera_de_rango');
  const problem = str(x.problem);
  if (problem.length < 20 || problem.length > 400) errors.push('problema_debe_describir_que_resuelve_20_400');
  const mode = x.cta_mode || 'resource_link';
  if (!MODES.includes(mode)) errors.push('cta_mode_invalido');
  const ctaCopy = str(x.cta_copy);
  if (ctaCopy.length > 240) errors.push('cta_copy_largo');
  const url = str(x.url);
  const host = (/^https:\/\/([^/?#]+)/i.exec(url) || [])[1];
  if (!host) errors.push('url_https_obligatoria');
  else if (!/^(www\.)?atacamalabs\.cl$/i.test(host) && !(x.metadata && x.metadata.external === true)) errors.push('url_fuera_de_atacamalabs_cl');
  const status = x.status || 'draft';
  if (!['draft', 'active', 'retired'].includes(status)) errors.push('estado_invalido');
  const value = { slug, name, type: x.type, topic, audience: str(x.audience) || null, problem, cta_mode: mode, cta_copy: ctaCopy || null, url, status, metadata: x.metadata && typeof x.metadata === 'object' ? x.metadata : {}, created_by: str(x.created_by) || 'hermes' };
  return { ok: errors.length === 0, errors, value };
}

/** URL del recurso con atribución (sin PII): canal, recurso y pieza. */
export function growthUtmUrl(url, p) {
  const o = p || {};
  const src = String(o.channel || '').startsWith('linkedin') ? 'linkedin' : o.channel === 'instagram' ? 'instagram' : 'social';
  const base = String(url || '').split('#')[0];
  const sep = base.includes('?') ? '&' : '?';
  const enc = (v) => encodeURIComponent(String(v || '').slice(0, 60));
  return base + sep + 'utm_source=' + src + '&utm_medium=organic_social&utm_campaign=' + enc(o.slug) + (o.ideaKey ? '&utm_content=' + enc(o.ideaKey) : '');
}

/** Normaliza el reporte de inteligencia orgánica que entrega Hermes. Exige evidencia (páginas leídas) y ángulos propios, no copias. */
export function growthNormIntel(report) {
  const errors = [];
  const x = report && typeof report === 'object' ? report : {};
  const str = (v, m) => (typeof v === 'string' ? v.trim().slice(0, m || 300) : '');
  const arr = (v, m, len) => (Array.isArray(v) ? v.map((i) => str(i, len || 240)).filter(Boolean).slice(0, m || 10) : []);
  const isUrl = (u) => /^https?:\/\/[^\s]+$/i.test(String(u || ''));
  const runId = str(x.run_id, 80);
  if (runId.length < 6) errors.push('run_id_obligatorio');
  const comps = (Array.isArray(x.competitors) ? x.competitors : []).map((c) => {
    const slug = str(c && c.slug, 60);
    const pages = (Array.isArray(c && c.pages_read) ? c.pages_read : []).map((u) => String(u || '').trim()).filter(isUrl).slice(0, 12);
    if (!slug) errors.push('competidor_sin_slug');
    else if (!pages.length) errors.push('competidor_sin_paginas_leidas:' + slug);
    return { slug, pages_read: pages, recent_topics: arr(c && c.recent_topics, 10), formats: arr(c && c.formats, 8, 120), hooks: arr(c && c.hooks, 8), offers: arr(c && c.offers, 8), resources: arr(c && c.resources, 8), repeated_messages: arr(c && c.repeated_messages, 8) };
  });
  if (!comps.length) errors.push('sin_competidores');
  const saturated = arr(x.saturated_topics, 10);
  const gaps = arr(x.gaps, 10);
  const angles = (Array.isArray(x.own_angles) ? x.own_angles : []).map((a) => ({ angle: str(a && a.angle, 300), why: str(a && a.why, 300), channel_suggestion: ['instagram', 'linkedin_page', 'linkedin_profile'].includes(a && a.channel_suggestion) ? a.channel_suggestion : null })).filter((a) => a.angle).slice(0, 8);
  if (!gaps.length && !angles.length) errors.push('sin_huecos_ni_angulos_propios');
  if (angles.some((a) => !a.why)) errors.push('angulo_propio_sin_porque');
  return { ok: errors.length === 0, errors, value: { run_id: runId, competitors: comps, saturated_topics: saturated, gaps, own_angles: angles, notes: str(x.notes, 600) } };
}

/** Elige la siguiente pregunta de Founder Interview: reutiliza una abierta reciente; si no, la de mayor prioridad. */
export function growthPickQuestion(questions, openInterview, nowMs) {
  const now = Number(nowMs) || Date.now();
  if (openInterview && openInterview.status === 'asked' && now - Date.parse(openInterview.asked_at) < 72 * 3600000) return { reuse: true, interview: openInterview, question: null };
  const avail = (Array.isArray(questions) ? questions : []).filter((q) => q && q.status === 'available');
  avail.sort((a, b) => (b.priority || 0) - (a.priority || 0) || String(a.created_at || '').localeCompare(String(b.created_at || '')));
  return { reuse: false, interview: null, question: avail[0] || null };
}

/** La respuesta del fundador debe tener sustancia para estructurarla (la IA no inventa vivencias). */
export function growthCheckAnswer(text) {
  const t = String(text || '').trim();
  if (t.length < 120) return { ok: false, reason: 'respuesta_muy_corta_minimo_120_caracteres', length: t.length };
  if (t.length > 8000) return { ok: false, reason: 'respuesta_muy_larga_maximo_8000', length: t.length };
  return { ok: true, reason: null, length: t.length };
}

/**
 * Anti-invención: una pieza de Founder Interview solo es válida si cada cita de sus fuentes `real_work` aparece LITERALMENTE
 * en la respuesta de Christian y hay al menos una. Así toda vivencia queda anclada a algo que él dijo.
 */
export function growthFounderEvidence(answer, piece) {
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ ]+/g, ' ').replace(/\s+/g, ' ').trim();
  const a = norm(answer);
  const quotes = [];
  ((piece && piece.sources) || []).forEach((s) => { if (s && s.kind === 'real_work') (Array.isArray(s.evidence) ? s.evidence : []).forEach((e) => { if (e && typeof e.quote === 'string' && e.quote.trim()) quotes.push(e.quote.trim()); }); });
  const unmatched = quotes.filter((q) => norm(q).length < 15 || !a.includes(norm(q)));
  if (!quotes.length) return { ok: false, reason: 'founder_sin_cita_de_la_respuesta', matched: 0, unmatched: [] };
  if (unmatched.length) return { ok: false, reason: 'founder_cita_no_esta_en_la_respuesta', matched: quotes.length - unmatched.length, unmatched: unmatched.map((q) => q.slice(0, 60)) };
  return { ok: true, reason: null, matched: quotes.length, unmatched: [] };
}
