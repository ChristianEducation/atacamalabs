#!/usr/bin/env node
/**
 * Atacama OS · Content Engine MVP — genera el workflow n8n «12 Content Intake».
 *
 * Flujo: webhook ← pieza canónica (Hermes / trabajo real / evergreen)
 *   → consulta de ideas ya existentes (anti-repetición, Supabase)
 *   → validación + scoring (scripts/content/engine-core.mjs incrustado tal cual)
 *   → rechazo | retención (score < 70) | candidata
 *   → guarda fuentes y pieza en Supabase (content_sources / content_pieces)
 *   → GHL Social Planner con status **in_review** (aprobador: Christian). NUNCA scheduled ni published.
 *
 * Seguridad: el cuerpo del post a GHL se arma aquí con `status: 'in_review'` fijo; hay una guarda que aborta si
 * algo lo cambiara. No toca Gmail, prospección ni scoring comercial.
 *
 * Uso: node n8n/build/content-engine.mjs   → escribe n8n/atacama-labs-12-content-intake.json
 */
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import { evaluatePiece } from '../../scripts/content/engine-core.mjs';
import { summaryHash } from '../../scripts/content/metrics-core.mjs';
import * as schedule from '../../scripts/content/schedule-core.mjs';

const SCHEDULE_LIB = Object.values(schedule).filter((f) => typeof f === 'function').map((f) => f.toString()).join('\n\n');

const SUPABASE = 'https://uwquwjmiofixzugttals.supabase.co';
const PACK_ID = '0ba54785-bff0-4a2d-a397-64e697d34e38'; // icp_packs.atacama-labs
export const GHL_LOCATION = 'pxHuOsiz2i3lM6BtC9IM';
export const ACCOUNTS = {
  instagram: '6ac43e3ecfe0752734a5fe1e_pxHuOsiz2i3lM6BtC9IM_17841424613699090',
  linkedin_page: '6ac4fabe3356d12d204557ea_pxHuOsiz2i3lM6BtC9IM_145278681_page',
  linkedin_profile: '6ac4fabe3356d12d204557ea_pxHuOsiz2i3lM6BtC9IM_D9Z-EPMxLu_profile',
};
// Categorías de Social Planner (creadas por interfaz el 6-oct-2026; la API de integración no puede crearlas)
export const CATEGORY_IDS = { Educativo: '6ac5265a4f30bdd64eaa5807', Caso: '6ac52690faf51cff54e27cf4', Demo: '6ac52699faf51cff54e29123', Noticia: '6ac527bf0c6e2434babc5054', Evergreen: '6ac527cc3abea0cc82a7ad8a', Founder: '6ac527f0d3e22f4c60cc70d4' };
// Etiquetas de Social Planner por formato (creadas por interfaz el 6-oct-2026; los posts exigen ObjectIds existentes)
export const TAG_IDS = { texto: '6ac53738c1fd27a1b5e78aa3', imagen: '6ac53738c1fd27a1b5e78aa4', carrusel: '6ac53738c1fd27a1b5e78aa5', demo: '6ac53738c1fd27a1b5e78aa6', reel: '6ac53738c1fd27a1b5e78aa7' };
export const APPROVER_USER_ID = 'OjkAjHMdUjnblO7W1kBZ'; // usuario operativo de Social Planner (ver docs, Bloque I)
const SUPABASE_CRED = { supabaseApi: { id: 'XOmXUuyLVSazDIh5', name: 'Atacama Labs - Supabase' } };
const GHL_CRED = { httpHeaderAuth: { id: '4Vc6nfxyKjZ14Bep', name: 'GHL — Atacama OS' } };
const INGEST_CRED = { httpHeaderAuth: { id: 'lUGhlXVaQBEiEh5S', name: 'Atacama Labs - Ingest Key' } };

const full = (timeout = 30000) => ({ response: { response: { fullResponse: true, neverError: true, responseFormat: 'json' } }, timeout });
const code = (name, jsCode, pos) => ({ id: randomUUID(), name, type: 'n8n-nodes-base.code', typeVersion: 2, position: pos, parameters: { jsCode } });
const iff = (name, expr, pos) => ({ id: randomUUID(), name, type: 'n8n-nodes-base.if', typeVersion: 2.2, position: pos,
  parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' }, combinator: 'and',
    conditions: [{ leftValue: `={{ (${expr}) ? "yes" : "no" }}`, rightValue: 'yes', operator: { type: 'string', operation: 'equals' } }] } } });
const sb = (name, method, urlExpr, bodyExpr, pos, prefer) => ({ id: randomUUID(), name, type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: pos, credentials: SUPABASE_CRED,
  parameters: { method, url: urlExpr, authentication: 'predefinedCredentialType', nodeCredentialType: 'supabaseApi', sendHeaders: Boolean(prefer),
    ...(prefer ? { headerParameters: { parameters: [{ name: 'Prefer', value: prefer }] } } : {}),
    ...(bodyExpr ? { sendBody: true, specifyBody: 'json', jsonBody: bodyExpr } : {}), options: full() } });

const EVALUATE = `${evaluatePiece.toString()}

${SCHEDULE_LIB}

const PACK_ID = '${PACK_ID}';
const ACCOUNTS = ${JSON.stringify(ACCOUNTS)};
const APPROVER = '${APPROVER_USER_ID}';
const CATEGORIES = ${JSON.stringify(CATEGORY_IDS)};
const TAGS = ${JSON.stringify(TAG_IDS)};
const first = $('Intake Webhook').first().json ?? {};
const body = first.body ?? first;
if (body.icp_pack_id && body.icp_pack_id !== PACK_ID) throw new Error('SEGURIDAD: icp_pack_id no coincide con el pack de Atacama Labs.');
const piece = body.piece;
if (!piece || !Array.isArray(piece.sources)) return [{ json: { action: 'reject', test: false, evaluation: evaluatePiece(piece, {}) } }];
const isTest = body.test === true;
// La verificación de fuentes externas NO la declara la pieza: viene de content_sources (gate de señales, workflow 13).
const dbRows = ($('Fetch Sources').first().json || {}).body;
const dbMap = {};
(Array.isArray(dbRows) ? dbRows : []).forEach((r) => { dbMap[r.source_key] = r; });
const keyOf = (s) => s.key || ((s.kind === 'real_work' || s.kind === 'evergreen' ? s.kind : 'hermes_research') + ':' + (s.url || ''));
piece.sources = piece.sources.map((s) => { const internal = s.kind === 'real_work' || s.kind === 'evergreen'; const db = dbMap[keyOf(s)]; return { ...s, verified: internal ? s.verified === true : Boolean(db && db.verified) }; });
const wantsReview = body.submit_to_review !== false;
const rows = ($('Fetch Keys').first().json || {}).body;
const existing = Array.isArray(rows) ? rows.map((r) => r.idea_key) : [];
const ev = evaluatePiece(piece, { existingIdeaKeys: existing });
const base = { test: isTest, evaluation: ev };
if (ev.decision === 'rejected') return [{ json: { ...base, action: 'reject' } }];

// ¿falta el render? Instagram y los formatos visuales requieren medio ya subido (URL).
const media = Array.isArray(piece.media) ? piece.media.filter((m) => m && /^https?:\\/\\//.test(m.url || '')) : [];
const needsMedia = piece.channel === 'instagram' || ['imagen', 'carrusel', 'demo', 'reel'].includes(piece.format);
let action = ev.decision === 'candidate' ? 'submit' : 'hold';
let holdReason = ev.decision === 'candidate' ? null : 'score_bajo_el_umbral';
if (action === 'submit' && needsMedia && !media.length) { action = 'hold'; holdReason = 'falta_render_o_medio'; }
if (action === 'submit' && !wantsReview) { action = 'hold'; holdReason = 'submit_to_review_false'; }

const slug = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
const existingSourceIds = piece.sources.map((s) => dbMap[keyOf(s)] && dbMap[keyOf(s)].id).filter(Boolean);
const sourcesBody = piece.sources.filter((s) => !dbMap[keyOf(s)]).map((s) => ({ icp_pack_id: PACK_ID, source_key: s.kind + ':' + (s.url ? s.url : slug(s.title)), kind: s.kind, title: s.title, url: s.url || null,
  summary: s.summary || null, evidence: s.evidence || [], verified: s.verified === true }));
const pieceRow = { icp_pack_id: PACK_ID, idea_key: ev.idea_key, topic: piece.topic, angle: piece.angle, audience: piece.audience, channel: piece.channel, format: piece.format,
  category: piece.category, score: ev.score, score_breakdown: ev.breakdown, rationale: piece.rationale, evidence_urls: ev.evidence_urls, piece,
  status: action === 'submit' ? 'drafted' : 'scored', ghl_account_id: ACCOUNTS[piece.channel], is_test: isTest, updated_at: new Date().toISOString() };

// Fecha PROPUESTA — NUNCA hay fallback a +7 días (regla del 7-oct-2026; ver scripts/content/schedule-core.mjs): Noticia → próximo hueco (≤ 24 h), normal → ≤ 48 h,
// Evergreen → ≤ 72 h, siempre America/Santiago y máx. 1 publicación por cuenta y día (se consideran los posts de Atacama OS y los manuales). Una fecha sugerida posterior
// a 72 h solo vale con schedule_justification escrita. Es solo una propuesta: el post nace in_review y nada se programa ni publica sin aprobación.
const nodeJson = (n) => { try { return $(n).first().json || {}; } catch (e) { return {}; } };
const taken = [];
const rowsSched = nodeJson('Fetch Scheduled').body;
(Array.isArray(rowsSched) ? rowsSched : []).forEach((r) => { if (r && r.scheduled_at) taken.push({ account: r.ghl_account_id, at: Date.parse(r.scheduled_at) }); });
const gp = (nodeJson('List GHL Posts').body || {}).results;
((gp && Array.isArray(gp.posts)) ? gp.posts : []).forEach((q) => { if (q && q.scheduleDate && !['deleted', 'failed'].includes(q.status)) (q.accountIds || []).forEach((a) => taken.push({ account: a, at: Date.parse(q.scheduleDate) })); });
const sched = proposeSlot({ now: Date.now(), channel: piece.channel, category: piece.category, account: ACCOUNTS[piece.channel], suggestion: piece.schedule_suggestion, justification: piece.schedule_justification, taken });
const when = sched.ms;
const summary = (isTest ? '[PRUEBA ATACAMA OS — NO PUBLICAR] ' : '') + ev.post_text;
// Las etiquetas/categorías de Social Planner exigen ObjectIds creados desde la interfaz (la API con token de integración no puede crearlos): por ahora formato y categoría viajan en Supabase.
const ghlBody = { accountIds: [ACCOUNTS[piece.channel]], summary, type: 'post', status: 'in_review', userId: APPROVER, media: media.map((m) => ({ url: m.url, type: m.type || 'image/png' })),
  scheduleDate: new Date(when).toISOString(), postApprovalDetails: { approver: APPROVER }, ...(CATEGORIES[piece.category] ? { categoryId: CATEGORIES[piece.category] } : {}), ...(TAGS[piece.format] ? { tags: [TAGS[piece.format]] } : {}) };
if (ghlBody.status !== 'in_review') throw new Error('SEGURIDAD: este workflow solo puede crear posts en in_review.');
return [{ json: { ...base, action, holdReason, sourcesBody, existingSourceIds, pieceRow, ghlBody, schedule: sched } }];`;

const BUILD_ROW = `if (($json.statusCode || 0) >= 300) throw new Error('Supabase content_sources falló (HTTP ' + $json.statusCode + '): ' + JSON.stringify($json.body || {}).slice(0, 300));
const ev = $('Evaluate').first().json;
const ids = (Array.isArray($json.body) ? $json.body : []).map((r) => r.id).filter(Boolean).concat(ev.existingSourceIds || []);
return [{ json: { ...ev, pieceRowFull: { ...ev.pieceRow, source_ids: ids } } }];`;

const CHECK_GHL = `${summaryHash.toString()}

const up = $('Upsert Piece').first().json;
if ((up.statusCode || 0) >= 300) throw new Error('Supabase content_pieces falló (HTTP ' + up.statusCode + '): ' + JSON.stringify(up.body || {}).slice(0, 300));
const ev = $('Build Row').first().json;
const res = $json || {};
const post = (res.body && res.body.results && res.body.results.post) || null;
if (!post || !post._id) throw new Error('GHL no creó el post (HTTP ' + res.statusCode + '): ' + JSON.stringify(res.body || {}).slice(0, 300));
if (post.status !== 'in_review') throw new Error('SEGURIDAD: GHL devolvió estado ' + post.status + ' (se esperaba in_review). Revisar/borrar el post ' + post._id);
return [{ json: { ...ev, ghl_post_id: post._id, patchBody: { status: 'in_review', ghl_post_id: post._id, ghl_status: 'in_review', ghl_summary_hash: summaryHash(post.summary || ev.ghlBody.summary), updated_at: new Date().toISOString() } } }];`;

const RESP_REJECT = `const e = $json.evaluation;
return [{ json: { ok: false, action: 'rejected', errors: e.errors, warnings: e.warnings, score: e.score } }];`;
const RESP_HELD = `const ev = $('Build Row').first().json;
const saved = Array.isArray($('Upsert Piece').first().json.body) ? $('Upsert Piece').first().json.body[0] : null;
return [{ json: { ok: true, action: 'held', reason: ev.holdReason, score: ev.evaluation.score, piece_id: saved && saved.id, status: saved && saved.status, breakdown: ev.evaluation.breakdown, lint_hits: ev.evaluation.lint_hits } }];`;
const RESP_SUBMITTED = `const c = $('Check GHL').first().json;
return [{ json: { ok: true, action: 'in_review', ghl_post_id: c.ghl_post_id, piece_id: ((($('Mark In Review').first().json.body) || [])[0] || {}).id || null, score: c.evaluation.score, channel: c.pieceRow.channel, status: 'in_review',
  proposed_for: c.schedule.iso, proposed_label: c.schedule.label, proposed_in_hours: c.schedule.hours_ahead, schedule_warnings: c.schedule.warnings,
  note: 'Quedó en GHL Social Planner como in_review (fecha propuesta: ' + c.schedule.label + ' hora de Chile). Nada se programó ni publicó.' } }];`;

export function buildContentIntake() {
  const nodes = [
    { id: randomUUID(), name: 'Intake Webhook', type: 'n8n-nodes-base.webhook', typeVersion: 2, position: [0, 0], webhookId: randomUUID(), credentials: INGEST_CRED,
      parameters: { httpMethod: 'POST', path: 'atacama-content-intake', authentication: 'headerAuth', responseMode: 'lastNode', options: {} } },
    sb('Fetch Keys', 'GET', `${SUPABASE}/rest/v1/content_pieces?icp_pack_id=eq.${PACK_ID}&select=idea_key&limit=1000`, null, [240, 0]),
    sb('Fetch Sources', 'GET', `${SUPABASE}/rest/v1/content_sources?icp_pack_id=eq.${PACK_ID}&select=id,source_key,verified&limit=3000`, null, [360, 0]),
    { ...sb('Fetch Scheduled', 'GET', `={{ "${SUPABASE}/rest/v1/content_pieces?icp_pack_id=eq.${PACK_ID}&scheduled_at=gte." + new Date(Date.now() - 36 * 3600000).toISOString() + "&status=in.(drafted,in_review,approved,scheduled,published)&select=ghl_account_id,scheduled_at,status&limit=300" }}`, null, [480, 0]), continueOnFail: true, alwaysOutputData: true },
    { id: randomUUID(), name: 'List GHL Posts', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [600, 0], credentials: GHL_CRED, continueOnFail: true, alwaysOutputData: true,
      parameters: { method: 'POST', url: `https://services.leadconnectorhq.com/social-media-posting/${GHL_LOCATION}/posts/list`, authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth',
        sendHeaders: true, headerParameters: { parameters: [{ name: 'Version', value: '2021-07-28' }, { name: 'Accept', value: 'application/json' }] },
        sendBody: true, specifyBody: 'json', jsonBody: `={{ JSON.stringify({ type: 'all', accounts: ${JSON.stringify(Object.values(ACCOUNTS).join(','))}, skip: '0', limit: '100', fromDate: new Date(Date.now() - 2 * 86400000).toISOString(), toDate: new Date(Date.now() + 45 * 86400000).toISOString(), includeUsers: 'false' }) }}`, options: full() } },
    code('Evaluate', EVALUATE, [720, 0]),
    iff('Rejected?', '$json.action === "reject"', [720, 0]),
    code('Respond Rejected', RESP_REJECT, [960, -140]),
    sb('Upsert Sources', 'POST', `${SUPABASE}/rest/v1/content_sources?on_conflict=icp_pack_id,source_key`, '={{ JSON.stringify($json.sourcesBody) }}', [960, 60], 'resolution=merge-duplicates,return=representation'),
    code('Build Row', BUILD_ROW, [1200, 60]),
    sb('Upsert Piece', 'POST', `${SUPABASE}/rest/v1/content_pieces?on_conflict=icp_pack_id,idea_key`, '={{ JSON.stringify($json.pieceRowFull) }}', [1440, 60], 'resolution=merge-duplicates,return=representation'),
    iff('Submit?', '$("Build Row").first().json.action === "submit"', [1680, 60]),
    code('Respond Held', RESP_HELD, [1920, -80]),
    { id: randomUUID(), name: 'Create GHL Post', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [1920, 160], credentials: GHL_CRED,
      parameters: { method: 'POST', url: `https://services.leadconnectorhq.com/social-media-posting/${GHL_LOCATION}/posts`, authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth',
        sendHeaders: true, headerParameters: { parameters: [{ name: 'Version', value: '2021-07-28' }, { name: 'Accept', value: 'application/json' }] },
        sendBody: true, specifyBody: 'json', jsonBody: '={{ JSON.stringify($("Build Row").first().json.ghlBody) }}', options: full() } },
    code('Check GHL', CHECK_GHL, [2160, 160]),
    sb('Mark In Review', 'PATCH', `={{ "${SUPABASE}/rest/v1/content_pieces?icp_pack_id=eq.${PACK_ID}&idea_key=eq." + $json.evaluation.idea_key }}`, '={{ JSON.stringify($json.patchBody) }}', [2400, 160], 'return=representation'),
    sb('Mark Sources Used', 'PATCH', `={{ "${SUPABASE}/rest/v1/content_sources?icp_pack_id=eq.${PACK_ID}&signal_status=eq.candidate&id=in.(" + (($('Build Row').first().json.pieceRowFull.source_ids || []).concat(['00000000-0000-0000-0000-000000000000'])).join(',') + ")" }}`, '={{ JSON.stringify({ signal_status: "used" }) }}', [2640, 160], 'return=minimal'),
    code('Respond Submitted', RESP_SUBMITTED, [2880, 160]),
  ];
  const to = (n) => [{ node: n, type: 'main', index: 0 }];
  const connections = {
    'Intake Webhook': { main: [to('Fetch Keys')] },
    'Fetch Keys': { main: [to('Fetch Sources')] },
    'Fetch Sources': { main: [to('Fetch Scheduled')] },
    'Fetch Scheduled': { main: [to('List GHL Posts')] },
    'List GHL Posts': { main: [to('Evaluate')] },
    'Evaluate': { main: [to('Rejected?')] },
    'Rejected?': { main: [to('Respond Rejected'), to('Upsert Sources')] },
    'Upsert Sources': { main: [to('Build Row')] },
    'Build Row': { main: [to('Upsert Piece')] },
    'Upsert Piece': { main: [to('Submit?')] },
    'Submit?': { main: [to('Create GHL Post'), to('Respond Held')] },
    'Create GHL Post': { main: [to('Check GHL')] },
    'Check GHL': { main: [to('Mark In Review')] },
    'Mark In Review': { main: [to('Mark Sources Used')] },
    'Mark Sources Used': { main: [to('Respond Submitted')] },
  };
  return { name: 'Atacama Labs - 12 Content Intake', nodes, connections, settings: { executionOrder: 'v1' } };
}

if (process.argv[1] && process.argv[1].endsWith('content-engine.mjs')) {
  const out = new URL('../atacama-labs-12-content-intake.json', import.meta.url);
  fs.writeFileSync(out, JSON.stringify(buildContentIntake(), null, 2) + '\n');
  console.log('escrito', out.pathname);
}
