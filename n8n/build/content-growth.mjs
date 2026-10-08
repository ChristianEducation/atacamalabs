#!/usr/bin/env node
/**
 * Atacama OS · workflow n8n «27 Content Growth» (Ola A) — una sola puerta para lo que Hermes necesita de Ola A.
 *
 * POST /webhook/atacama-content-growth  (X-Atacama-Key)  { action, ... }
 *   queue_status · founder_start · founder_add_question · founder_answer · founder_cancel · founder_status
 *   resources_list · resource_register · resource_retire
 *   rss_pending · rss_mark · rss_status
 *   competitors_list · competitor_report · intel_latest
 *
 * Reutiliza content_sources / content_pieces / el Content Intake (12); NO publica, NO contacta a nadie y NO crea piezas por sí mismo:
 * las piezas siempre entran por «12 Content Intake» y terminan `in_review`. Todo queda en Supabase con idempotencia.
 */
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import * as growth from '../../scripts/content/growth-core.mjs';
import * as resourceFactory from '../../scripts/content/resource-factory-core.mjs';

const SUPABASE = 'https://uwquwjmiofixzugttals.supabase.co';
const PACK_ID = '0ba54785-bff0-4a2d-a397-64e697d34e38';
const NONE = 'https://localhost.invalid/';
const SUPABASE_CRED = { supabaseApi: { id: 'XOmXUuyLVSazDIh5', name: 'Atacama Labs - Supabase' } };
const INGEST_CRED = { httpHeaderAuth: { id: 'lUGhlXVaQBEiEh5S', name: 'Atacama Labs - Ingest Key' } };
const full = (timeout = 30000) => ({ response: { response: { fullResponse: true, neverError: true, responseFormat: 'json' } }, timeout });
const code = (name, jsCode, pos) => ({ id: randomUUID(), name, type: 'n8n-nodes-base.code', typeVersion: 2, position: pos, parameters: { jsCode } });
const to = (n) => [{ node: n, type: 'main', index: 0 }];
const ifNode = (name, expr, pos) => ({ id: randomUUID(), name, type: 'n8n-nodes-base.if', typeVersion: 2.2, position: pos,
  parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' }, combinator: 'and', conditions: [{ leftValue: `={{ (${expr}) ? "yes" : "no" }}`, rightValue: 'yes', operator: { type: 'string', operation: 'equals' } }] }, options: {} } });
const sbApply = (name, pos) => ({ id: randomUUID(), name, type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: pos, credentials: SUPABASE_CRED, continueOnFail: true, alwaysOutputData: true, retryOnFail: true, maxTries: 3, waitBetweenTries: 1500,
  parameters: { method: '={{ $json.method || "POST" }}', url: `={{ $json.skip ? "${NONE}" : "${SUPABASE}/rest/v1/" + $json.path }}`, authentication: 'predefinedCredentialType', nodeCredentialType: 'supabaseApi', sendHeaders: true,
    headerParameters: { parameters: [{ name: 'Prefer', value: '={{ $json.prefer || "return=minimal" }}' }] }, sendBody: true, specifyBody: 'json', jsonBody: '={{ JSON.stringify($json.body || {}) }}', options: full() } });

export const LIB = [...Object.values(growth), ...Object.values(resourceFactory)].filter((f) => typeof f === 'function').map((f) => f.toString()).join('\n\n');
export const ACTIONS = ['queue_status', 'founder_start', 'founder_add_question', 'founder_answer', 'founder_cancel', 'founder_status', 'resources_list', 'resource_register', 'resource_retire', 'rss_pending', 'rss_mark', 'rss_status', 'competitors_list', 'competitor_report', 'intel_latest', 'signals_candidates', 'resource_opportunity', 'resource_backlog'];

export const PARSE = `try {
  const w = $('Growth Webhook').first().json || {};
  const b = w.body || w;
  const action = String(b.action || '').toLowerCase();
  const ACTIONS = ${JSON.stringify(ACTIONS)};
  if (!ACTIONS.includes(action)) throw new Error('action inválida: usa ' + ACTIONS.join(' | '));
  const isUuid = (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v || ''));
  const slugOk = (v) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(String(v || ''));
  const sb = '${SUPABASE}/rest/v1/';
  const reads = [];
  const add = (key, path) => reads.push({ key, url: sb + path });
  add('config', 'content_config?id=eq.1&select=*');
  const iid = b.interview_id;
  if (iid !== undefined && iid !== null && iid !== '' && !isUuid(iid)) throw new Error('interview_id inválido');
  let probe = null;
  if (action === 'queue_status') {
    add('pending', 'content_pieces?icp_pack_id=eq.${PACK_ID}&status=eq.in_review&is_test=eq.false&select=id,channel,topic');
    add('candidates', 'content_sources?icp_pack_id=eq.${PACK_ID}&signal_status=eq.candidate&select=id,title,signal_type,signal_score&order=signal_score.desc&limit=20');
    add('waiting_render', 'content_pieces?icp_pack_id=eq.${PACK_ID}&status=eq.drafted&is_test=eq.false&select=id,channel,format,topic');
    add('new_items', 'content_feed_items?status=eq.new&select=id&limit=400');
    add('interviews', 'founder_interviews?status=in.(asked,answered)&is_test=eq.false&select=id,status,asked_at&order=asked_at.desc&limit=5');
  } else if (action === 'founder_start') {
    add('questions', 'founder_questions?status=eq.available&select=*&order=priority.desc&limit=30');
    add('open', 'founder_interviews?status=in.(asked,answered)&is_test=eq.' + (b.test === true ? 'true' : 'false') + '&select=*&order=asked_at.desc&limit=1');
  } else if (action === 'founder_add_question') {
    add('questions', 'founder_questions?select=id,question&limit=500');
  } else if (action === 'founder_answer' || action === 'founder_cancel') {
    add('interview', iid ? 'founder_interviews?id=eq.' + iid + '&select=*' : 'founder_interviews?status=eq.asked&is_test=eq.' + (b.test === true ? 'true' : 'false') + '&select=*&order=asked_at.desc&limit=1');
  } else if (action === 'founder_status') {
    add('interviews', 'founder_interviews?is_test=eq.false&select=id,status,question,answer_source,piece_ids,asked_at,answered_at&order=asked_at.desc&limit=10');
  } else if (action === 'resources_list' || action === 'resource_opportunity' || action === 'resource_backlog') {
    add('resources', 'content_resources?select=*&order=created_at.desc&limit=200');
  } else if (action === 'resource_register' || action === 'resource_retire') {
    const slug = String(b.slug || (b.resource || {}).slug || '').trim();
    if (!slugOk(slug)) throw new Error('slug inválido (kebab-case)');
    add('resource', 'content_resources?slug=eq.' + slug + '&select=*');
    const st = String(b.status || (b.resource || {}).status || 'draft');
    const url = String(b.url || (b.resource || {}).url || '');
    if (action === 'resource_register' && st === 'active' && /^https:\\/\\//.test(url)) probe = url;
  } else if (action === 'rss_pending') {
    const since = new Date(Date.now() - 10 * 86400000).toISOString();
    add('items_dated', 'content_feed_items?status=eq.new&published_at=gte.' + since + '&select=*&order=relevance.desc,published_at.desc&limit=80');
    add('items_undated', 'content_feed_items?status=eq.new&published_at=is.null&select=*&order=relevance.desc,ingested_at.desc&limit=40');
    add('feeds', 'content_feeds?select=id,slug,name,topic,priority&limit=100');
    add('pending', 'content_pieces?icp_pack_id=eq.${PACK_ID}&status=eq.in_review&is_test=eq.false&select=id');
  } else if (action === 'rss_status') {
    add('feeds', 'content_feeds?select=*&order=priority.desc&limit=100');
    add('new_items', 'content_feed_items?status=eq.new&select=id,feed_slug&limit=500');
  } else if (action === 'competitors_list') {
    add('competitors', 'content_competitors?select=*&order=created_at.asc&limit=50');
    add('reports', 'content_intel_reports?select=id,run_id,created_at,competitors_scanned,signals_submitted,report&order=created_at.desc&limit=1');
  } else if (action === 'competitor_report') {
    const rid = String((b.report || {}).run_id || b.run_id || '');
    add('existing', 'content_intel_reports?run_id=eq.' + encodeURIComponent(rid.slice(0, 80)) + '&select=id,run_id');
    add('competitors', 'content_competitors?select=id,slug,name&limit=50');
  } else if (action === 'signals_candidates') {
    add('signals', 'content_sources?icp_pack_id=eq.${PACK_ID}&signal_status=eq.candidate&select=id,source_key,title,url,summary,signal_type,signal_score,signal,evidence,source_date,created_at&order=signal_score.desc&limit=15');
    add('pending', 'content_pieces?icp_pack_id=eq.${PACK_ID}&status=eq.in_review&is_test=eq.false&select=id');
    add('recent', 'content_pieces?icp_pack_id=eq.${PACK_ID}&is_test=eq.false&select=topic,channel,status,hook:piece->>hook&order=created_at.desc&limit=30');
  } else if (action === 'intel_latest') {
    add('reports', 'content_intel_reports?select=*&order=created_at.desc&limit=1');
  }
  return [{ json: { action, b: { ...b, action: undefined }, reads, probe } }];
} catch (e) { return [{ json: { fatal: String((e && e.message) || e) } }]; }`;

export const EXPAND_READS = `const p = $('Parse').first().json;
return p.reads.map((r) => ({ json: r }));`;

export const COMPUTE = `${LIB}

const p = $('Parse').first().json;
const b = p.b || {};
const A = p.action;
const reads = p.reads;
const res = $('Read').all().map((i) => i.json);
const R = {}; const bad = [];
reads.forEach((r, i) => { const x = res[i] || {}; if (!x.statusCode || x.statusCode >= 300) bad.push(r.key + ': ' + (x.statusCode ? 'HTTP ' + x.statusCode : 'sin respuesta')); R[r.key] = Array.isArray(x.body) ? x.body : []; });
if (bad.length) return [{ json: { resp: { ok: false, error: 'lectura_fallida', message: 'No pude leer Supabase: ' + bad.join('; '), safety: { published: 0, contacted: 0 } }, writes: [] } }];
const probeRes = p.probe ? ($('Probe URL').first().json || {}) : null;
const cfg = R.config[0] || { max_pending_in_review: 6, rss_enabled: true, competitor_enabled: true };
const nowMs = Date.now(), nowIso = new Date(nowMs).toISOString();
const uuid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => { const r = (Math.random() * 16) | 0; return (c === 'x' ? r : (r & 3) | 8).toString(16); });
const str = (v, m) => (typeof v === 'string' ? v.trim().slice(0, m || 400) : '');
const writes = [];
let resp = { ok: true, action: A };
const fail = (error, message, extra) => { resp = { ok: false, action: A, error, message, ...(extra || {}) }; };

if (A === 'queue_status') {
  const pending = R.pending.length, max = Number(cfg.max_pending_in_review) || 6;
  resp = { ok: true, action: A, pending_in_review: pending, max_pending_in_review: max, can_generate_autonomously: pending < max,
    candidate_signals: R.candidates.length, top_candidates: R.candidates.slice(0, 5), carousels_waiting_render: R.waiting_render.filter((x) => ['carrusel', 'imagen', 'demo', 'reel'].includes(x.format) || x.channel === 'instagram').length,
    new_rss_items: R.new_items.length, open_interviews: R.interviews,
    text: pending >= max ? 'Cola llena (' + pending + '/' + max + '): el sistema sigue recolectando señales pero no crea piezas por su cuenta hasta que revises.' : 'Cola con espacio (' + pending + '/' + max + ').' };
} else if (A === 'founder_start') {
  const open = R.open[0] || null;
  if (open && open.status === 'answered') resp = { ok: true, action: A, interview_id: open.id, status: 'answered', reused: true, question: open.question, message: 'Ya hay una entrevista respondida sin pieza: envía las piezas con submit_content_piece (origin=founder_interview, interview_id) o cancélala con founder_cancel.' };
  else {
    const pick = growthPickQuestion(R.questions, open, nowMs);
    if (pick.reuse) resp = { ok: true, action: A, interview_id: pick.interview.id, status: 'asked', reused: true, question: pick.interview.question, context: pick.interview.context, message: 'Sigue abierta la pregunta de hace poco: espera la respuesta de Christian.' };
    else if (!pick.question) resp = { ok: true, action: A, question: null, needs_questions: true, message: 'No quedan preguntas disponibles. Propón una basada en un hecho REAL reciente con founder_add_question (con contexto).' };
    else {
      const id = uuid();
      writes.push({ method: 'POST', path: 'founder_interviews', body: { id, question_id: pick.question.id, question: pick.question.question, context: pick.question.context, status: 'asked', is_test: b.test === true, asked_at: nowIso, updated_at: nowIso } });
      if (b.test !== true) writes.push({ method: 'PATCH', path: 'founder_questions?id=eq.' + pick.question.id, body: { status: 'used' } });   // una prueba no gasta preguntas reales
      resp = { ok: true, action: A, interview_id: id, status: 'asked', reused: false, question: pick.question.question, context: pick.question.context, topic: pick.question.topic,
        message: 'Pregúntale esto a Christian (texto o audio). Cuando responda, llama founder_answer con su respuesta TEXTUAL.' };
    }
  }
} else if (A === 'founder_add_question') {
  const q = str(b.question, 500), ctx = str(b.context, 600);
  if (q.length < 20) fail('pregunta_muy_corta', 'La pregunta debe tener al menos 20 caracteres.');
  else if (ctx.length < 20) fail('falta_contexto_real', 'Toda pregunta necesita el hecho REAL que la motiva (mínimo 20 caracteres): nada genérico.');
  else if (R.questions.some((x) => growthNorm(x.question) === growthNorm(q))) resp = { ok: true, action: A, duplicate: true, message: 'Ya existe una pregunta igual.' };
  else { const id = uuid(); writes.push({ method: 'POST', path: 'founder_questions', body: { id, question: q, context: ctx, topic: str(b.topic, 60) || null, priority: Math.max(1, Math.min(10, Number(b.priority) || 5)), status: 'available', created_by: 'hermes' } }); resp = { ok: true, action: A, question_id: id }; }
} else if (A === 'founder_answer') {
  const it = R.interview[0];
  const chk = growthCheckAnswer(b.answer);
  if (!it) fail('entrevista_no_encontrada', 'No hay una entrevista abierta. Llama founder_start primero.');
  else if (it.status === 'cancelled') fail('entrevista_cancelada', 'Esa entrevista fue cancelada.');
  else if (!chk.ok) fail(chk.reason, 'La respuesta no tiene sustancia suficiente para estructurarla (mínimo 120 caracteres): pídele a Christian más detalle de lo que pasó.', { length: chk.length });
  else if (it.status !== 'asked' && it.answer_text && it.answer_text.trim() === String(b.answer).trim()) resp = { ok: true, action: A, interview_id: it.id, status: it.status, replayed: true };
  else if (it.status === 'submitted') fail('entrevista_ya_enviada', 'Esa entrevista ya generó piezas.');
  else {
    const src = b.source === 'audio' ? 'audio' : 'text';
    writes.push({ method: 'PATCH', path: 'founder_interviews?id=eq.' + it.id, body: { status: 'answered', answer_text: String(b.answer).trim(), answer_source: src, answered_at: nowIso, updated_at: nowIso } });
    resp = { ok: true, action: A, interview_id: it.id, status: 'answered', answer_source: src, question: it.question,
      next: 'Estructura 1–3 piezas (linkedin_profile en primera persona; linkedin_page como adaptación distinta; Instagram solo si aporta). Cada fuente real_work debe llevar evidence con citas LITERALES de la respuesta. Envíalas con submit_content_piece(origin=founder_interview, interview_id).' };
  }
} else if (A === 'founder_cancel') {
  const it = R.interview[0];
  if (!it) fail('entrevista_no_encontrada', 'No hay entrevista que cancelar.');
  else if (it.status === 'submitted') fail('entrevista_ya_enviada', 'Ya generó piezas.');
  else { writes.push({ method: 'PATCH', path: 'founder_interviews?id=eq.' + it.id, body: { status: 'cancelled', updated_at: nowIso } }); if (it.question_id) writes.push({ method: 'PATCH', path: 'founder_questions?id=eq.' + it.question_id, body: { status: 'available' } }); resp = { ok: true, action: A, interview_id: it.id, status: 'cancelled' }; }
} else if (A === 'founder_status') {
  resp = { ok: true, action: A, interviews: R.interviews, pending_answer: R.interviews.filter((x) => x.status === 'asked').length, answered_without_pieces: R.interviews.filter((x) => x.status === 'answered').length };
} else if (A === 'resources_list') {
  const st = b.status ? String(b.status) : null;
  const base = R.resources.filter((r) => (st ? r.status === st : r.status !== 'retired'));
  const ranked = b.query ? growthResourceRank(base.map((r) => ({ ...r, status: r.status === 'draft' && !st ? 'draft' : r.status })), String(b.query), { includeDraft: true, limit: 8 }) : base.slice(0, 20).map((r) => ({ ...r, match_score: null }));
  resp = { ok: true, action: A, count: ranked.length, resources: ranked.map((r) => ({ id: r.id, slug: r.slug, name: r.name, type: r.type, topic: r.topic, audience: r.audience, problem: r.problem, cta_mode: r.cta_mode, cta_copy: r.cta_copy, url: r.url, status: r.status, match_score: r.match_score })),
    message: ranked.length ? 'Antes de crear un recurso nuevo, reutiliza uno de estos si responde al mismo problema.' : 'No hay un recurso adecuado: puedes proponer uno nuevo con resource_register (queda en borrador hasta que exista su página).' };
} else if (A === 'resource_opportunity') {
  const r = rfAssess({ topic: str(b.topic, 200), summary: str(b.summary, 600), editorial_type: str(b.editorial_type, 30), channel: str(b.channel, 30) }, R.resources);
  const cta = rfCta({ editorial_type: str(b.editorial_type, 30) || 'educational', channel: str(b.channel, 30) || 'linkedin_page', resource: r.action === 'reuse' ? { id: r.resource.id, status: 'active', format: ((R.resources.find((x) => x.id === r.resource.id) || {}).metadata || {}).format } : null, allow_keyword: b.allow_keyword === true });
  resp = { ok: true, action: A, decision: r.action, reason: r.reason, resource: r.resource || null, candidate: r.candidate || null, matches: r.matches, cta, message: r.action === 'reuse' ? 'Reutiliza este recurso: resource_id en la pieza, cta_mode ' + cta.cta_mode + ' y {{resource_url}} en el texto del CTA.' : r.action === 'propose' ? 'Puedes registrar el candidato con content_resources(action="register") (queda en borrador hasta que exista su página); la pieza de hoy sale sin recurso.' : 'Publica la pieza sin recurso. ' + cta.why };
} else if (A === 'resource_backlog') {
  const have = {}; R.resources.forEach((x) => { have[x.slug] = x; });
  const fm = rfFormats();
  resp = { ok: true, action: A, count: rfBacklog().length, backlog: rfBacklog().map((c) => ({ slug: c.slug, name: c.name, format: c.format, type: fm[c.format].type, interactive: fm[c.format].interactive, effort: fm[c.format].effort, priority: c.priority, state: have[c.slug] ? have[c.slug].status : 'sin_registrar', differentiator: c.differentiator })).sort((a, c) => c.priority - a.priority),
    message: 'Backlog editorial de recursos. Un recurso pasa a activo solo cuando existe su página y responde 200; no se crean recursos solo para tener un CTA.' };
} else if (A === 'resource_register') {
  const input = { ...(b.resource || {}), ...b };
  const v = growthValidateResource({ slug: input.slug, name: input.name, type: input.type, topic: input.topic, audience: input.audience, problem: input.problem, cta_mode: input.cta_mode, cta_copy: input.cta_copy, url: input.url, status: input.status, metadata: input.metadata, created_by: 'hermes' });
  const ex = R.resource[0] || null;
  if (!v.ok) fail('recurso_invalido', 'El recurso no es válido: ' + v.errors.join(', '), { errors: v.errors });
  else if (v.value.status === 'active' && !(probeRes && probeRes.statusCode === 200)) fail('url_no_responde_200', 'No se puede activar: la URL del recurso no respondió 200 (' + (probeRes ? probeRes.statusCode || 'sin respuesta' : 'sin verificar') + '). Publica la página y vuelve a registrar.');
  else if (ex && ex.status === 'retired') fail('recurso_retirado', 'Ese slug pertenece a un recurso retirado.');
  else if (!ex && rfValidateNew(v.value).errors.length) { const q = rfValidateNew(v.value); fail('recurso_de_baja_calidad', 'El recurso no cumple el estándar de autoridad: ' + q.errors.join(', '), { errors: q.errors, warnings: q.warnings }); }
  else if (ex) { const patch = { ...v.value, metadata: { ...(ex.metadata || {}), ...(v.value.metadata || {}) }, updated_at: nowIso }; delete patch.created_by; writes.push({ method: 'PATCH', path: 'content_resources?id=eq.' + ex.id, body: patch }); resp = { ok: true, action: A, resource_id: ex.id, slug: v.value.slug, status: v.value.status, updated: true }; }
  else { const id = uuid(); writes.push({ method: 'POST', path: 'content_resources', body: { id, ...v.value } }); resp = { ok: true, action: A, resource_id: id, slug: v.value.slug, status: v.value.status, created: true, note: v.value.status === 'draft' ? 'Queda en borrador: pasa a active cuando su página responda 200.' : null }; }
} else if (A === 'resource_retire') {
  const ex = R.resource[0];
  if (!ex) fail('recurso_no_encontrado', 'No existe ese recurso.');
  else { writes.push({ method: 'PATCH', path: 'content_resources?id=eq.' + ex.id, body: { status: 'retired', updated_at: nowIso } }); resp = { ok: true, action: A, resource_id: ex.id, status: 'retired' }; }
} else if (A === 'rss_pending') {
  const feeds = {}; R.feeds.forEach((f) => { feeds[f.id] = f; });
  const limit = Math.max(1, Math.min(25, Number(b.limit) || 12)), minRel = Number.isFinite(Number(b.min_relevance)) ? Number(b.min_relevance) : 2;
  const seen = new Set();
  const items = R.items_dated.concat(R.items_undated).filter((x) => { if (seen.has(x.id)) return false; seen.add(x.id); return x.relevance >= minRel; })
    .sort((a, c) => (c.relevance - a.relevance) || ((Date.parse(c.published_at || c.ingested_at) || 0) - (Date.parse(a.published_at || a.ingested_at) || 0))).slice(0, limit);
  const pending = R.pending.length, max = Number(cfg.max_pending_in_review) || 6;
  resp = { ok: true, action: A, count: items.length, pieces_allowed: pending < max, pending_in_review: pending, max_pending_in_review: max,
    items: items.map((x) => ({ id: x.id, feed: (feeds[x.feed_id] || {}).name || x.feed_slug, feed_slug: x.feed_slug, title: x.title, url: x.url, summary: x.summary, published_at: x.published_at, ingested_at: x.ingested_at, relevance: x.relevance })),
    message: 'Marca cada artículo revisado con rss_mark (signal si abriste una señal, ignored si no sirve) para que no vuelva a aparecer.' };
} else if (A === 'rss_mark') {
  const ids = (Array.isArray(b.item_ids) ? b.item_ids : []).filter((x) => /^[0-9a-f-]{36}$/i.test(String(x))).slice(0, 60);
  const st = b.status === 'signal' ? 'signal' : b.status === 'ignored' ? 'ignored' : null;
  if (!ids.length || !st) fail('parametros_invalidos', 'Envía item_ids (uuid) y status = signal | ignored.');
  else { const body = { status: st, note: str(b.note, 200) || null }; if (st === 'signal' && /^[0-9a-f-]{36}$/i.test(String(b.signal_source_id || ''))) body.signal_source_id = b.signal_source_id; writes.push({ method: 'PATCH', path: 'content_feed_items?id=in.(' + ids.join(',') + ')', body }); resp = { ok: true, action: A, marked: ids.length, status: st }; }
} else if (A === 'rss_status') {
  const counts = {}; R.new_items.forEach((x) => { counts[x.feed_slug] = (counts[x.feed_slug] || 0) + 1; });
  resp = { ok: true, action: A, rss_enabled: cfg.rss_enabled !== false, feeds: R.feeds.map((f) => ({ slug: f.slug, name: f.name, enabled: f.enabled, last_checked_at: f.last_checked_at, last_status: f.last_status, last_error: f.last_error, consecutive_failures: f.consecutive_failures, new_items: counts[f.slug] || 0 })),
    new_items_total: R.new_items.length, attention: R.feeds.filter((f) => f.enabled && (f.consecutive_failures >= 3 || !f.last_checked_at)).map((f) => f.slug) };
} else if (A === 'competitors_list') {
  const last = R.reports[0] || null;
  resp = { ok: true, action: A, competitor_enabled: cfg.competitor_enabled !== false, competitors: R.competitors.filter((c) => c.enabled).map((c) => ({ slug: c.slug, name: c.name, domain: c.domain, urls: c.urls, notes: c.notes, last_scanned_at: c.last_scanned_at })),
    last_report: last ? { run_id: last.run_id, created_at: last.created_at, competitors_scanned: last.competitors_scanned, saturated_topics: (last.report || {}).saturated_topics, gaps: (last.report || {}).gaps } : null };
} else if (A === 'competitor_report') {
  const n = growthNormIntel({ ...(b.report || {}), run_id: (b.report || {}).run_id || b.run_id });
  const known = {}; R.competitors.forEach((c) => { known[c.slug] = c; });
  const unknown = n.value.competitors.map((c) => c.slug).filter((s) => !known[s]);
  if (!n.ok) fail('reporte_invalido', 'El reporte no cumple el formato: ' + n.errors.join(', '), { errors: n.errors });
  else if (unknown.length) fail('competidor_desconocido', 'Competidores que no existen en la lista: ' + unknown.join(', '), { unknown });
  else if (R.existing.length) resp = { ok: true, action: A, duplicate: true, run_id: n.value.run_id, message: 'Ese run_id ya estaba guardado (no se duplicó).' };
  else {
    const slugs = n.value.competitors.map((c) => c.slug);
    writes.push({ method: 'POST', path: 'content_intel_reports', body: { run_id: n.value.run_id, competitors_scanned: slugs, report: n.value, signals_submitted: Math.max(0, Math.min(50, Number(b.signals_submitted) || 0)) } });
    slugs.forEach((s) => writes.push({ method: 'PATCH', path: 'content_competitors?id=eq.' + known[s].id, body: { last_scanned_at: nowIso } }));
    resp = { ok: true, action: A, run_id: n.value.run_id, competitors_scanned: slugs, gaps: n.value.gaps.length, own_angles: n.value.own_angles.length };
  }
} else if (A === 'signals_candidates') {
  const pending = R.pending.length, max = Number(cfg.max_pending_in_review) || 6;
  resp = { ok: true, action: A, count: R.signals.length, pieces_allowed: pending < max, pending_in_review: pending, max_pending_in_review: max,
    signals: R.signals.map((x) => { const g = x.signal || {}; return { id: x.id, source_key: x.source_key, type: x.signal_type, score: x.signal_score, title: x.title, url: x.url, summary: x.summary, source: g.source || null, date: g.date || x.source_date || null, quote: g.quote || ((Array.isArray(x.evidence) ? x.evidence : []).find((e) => e && e.quote) || {}).quote || null, quote_verified: Array.isArray(x.evidence) && x.evidence.some((e) => e && e.quote_found === true), why_it_matters: g.why_it_matters || null, angle: g.angle || null, audience: g.audience || null, channel_suggestion: g.channel_suggestion || null }; }),
    already_covered: R.recent.map((x) => ({ topic: x.topic, channel: x.channel, status: x.status, hook: x.hook })),
    message: 'Para cada señal verifica que no esté cubierta en already_covered y envía la pieza con submit_content_piece (origin=autonomous). En sources[0] copia source_key como "key": así el sistema reconoce la fuente verificada.' };
} else if (A === 'intel_latest') {
  const r = R.reports[0] || null;
  resp = { ok: true, action: A, report: r ? { run_id: r.run_id, created_at: r.created_at, competitors_scanned: r.competitors_scanned, saturated_topics: (r.report || {}).saturated_topics, gaps: (r.report || {}).gaps, own_angles: (r.report || {}).own_angles } : null };
}
resp.safety = { published: 0, contacted: 0, note: 'Ola A no publica ni contacta; las piezas entran por el Content Intake y terminan en revisión.' };
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

export function buildContentGrowth() {
  const nodes = [
    { id: randomUUID(), name: 'Growth Webhook', type: 'n8n-nodes-base.webhook', typeVersion: 2, position: [0, 0], webhookId: randomUUID(), credentials: INGEST_CRED, parameters: { httpMethod: 'POST', path: 'atacama-content-growth', authentication: 'headerAuth', responseMode: 'lastNode', options: {} } },
    code('Parse', PARSE, [220, 0]),
    ifNode('Valid?', '!$json.fatal', [400, 0]),
    code('Respond Error', "return [{ json: { ok: false, error: $json.fatal, safety: { published: 0, contacted: 0 } } }];", [620, -180]),
    code('Expand Reads', EXPAND_READS, [620, 0]),
    { id: randomUUID(), name: 'Read', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [840, 0], credentials: SUPABASE_CRED, continueOnFail: true, alwaysOutputData: true,
      parameters: { method: 'GET', url: '={{ $json.url }}', authentication: 'predefinedCredentialType', nodeCredentialType: 'supabaseApi', options: full() } },
    { id: randomUUID(), name: 'Probe URL', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [1060, 0], continueOnFail: true, alwaysOutputData: true,
      parameters: { method: 'GET', url: `={{ $("Parse").first().json.probe || "${NONE}" }}`, sendHeaders: true, headerParameters: { parameters: [{ name: 'User-Agent', value: 'AtacamaOS-ResourceCheck/1.0' }] }, options: { response: { response: { fullResponse: true, neverError: true, responseFormat: 'text' } }, timeout: 20000 } } },
    code('Compute', COMPUTE, [1280, 0]),
    code('Expand Writes', EXPAND_WRITES, [1500, 0]),
    sbApply('Apply Writes', [1720, 0]),
    code('Respond', RESPOND, [1940, 0]),
  ];
  const c = { 'Growth Webhook': { main: [to('Parse')] }, 'Parse': { main: [to('Valid?')] }, 'Valid?': { main: [to('Probe URL'), to('Respond Error')] }, 'Probe URL': { main: [to('Expand Reads')] }, 'Expand Reads': { main: [to('Read')] }, 'Read': { main: [to('Compute')] }, 'Compute': { main: [to('Expand Writes')] }, 'Expand Writes': { main: [to('Apply Writes')] }, 'Apply Writes': { main: [to('Respond')] } };
  return { name: 'Atacama Labs - 27 Content Growth', nodes, connections: c, settings: { executionOrder: 'v1' } };
}

if (process.argv[1] && process.argv[1].endsWith('content-growth.mjs')) {
  const out = new URL('../atacama-labs-27-content-growth.json', import.meta.url);
  fs.writeFileSync(out, JSON.stringify(buildContentGrowth(), null, 2) + '\n');
  console.log('escrito', out.pathname);
}
