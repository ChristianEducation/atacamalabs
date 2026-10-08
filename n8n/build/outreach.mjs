#!/usr/bin/env node
/**
 * Atacama OS · workflows n8n del motor de correo (Bloque 1 — activación comercial):
 *   21 Outreach Engine  — borradores, edición, aprobación con confirmación, cancelación y consultas (solo Supabase; NUNCA envía).
 *   22 Outreach Sender  — cada 10 min toma UN correo aprobado (ventana, tope diario, supresión, hash) y lo envía por Gmail; efectos en GHL vía Prospect Gateway.
 *   24 Followup Planner — cada 30 min: tareas +3/+7 días hábiles en GHL, borradores de seguimiento, y cancelación si hay respuesta/rebote/baja/descarte/Won/Lost.
 *   23 Gmail Sync       — cada 10 min lee los hilos enviados, clasifica respuestas/rebotes/bajas, detiene seguimientos y mueve la oportunidad.
 * Modo (tabla outreach_config.mode): off | dry_run | test_sim | live. Gmail solo se llama en `live` y solo si existe la credencial.
 *
 * Uso: node n8n/build/outreach.mjs  → escribe n8n/atacama-labs-21-outreach-engine.json, -22-outreach-sender.json, -23-gmail-sync.json
 *      GMAIL_CRED_ID=<id> GMAIL_CRED_NAME=<nombre> node n8n/build/outreach.mjs   → incluye la credencial OAuth de Gmail en los nodos HTTP de Gmail
 */
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import * as oc from '../../scripts/outreach/outreach-core.mjs';
import * as cm from '../../scripts/outreach/coldmail-core.mjs';

const SUPABASE = 'https://uwquwjmiofixzugttals.supabase.co';
export const N8N_BASE = 'https://n8n.srv1650725.hstgr.cloud';
const SUPABASE_CRED = { supabaseApi: { id: 'XOmXUuyLVSazDIh5', name: 'Atacama Labs - Supabase' } };
const INGEST_CRED = { httpHeaderAuth: { id: 'lUGhlXVaQBEiEh5S', name: 'Atacama Labs - Ingest Key' } };
const GMAIL_CRED = process.env.GMAIL_CRED_ID ? { gmailOAuth2: { id: process.env.GMAIL_CRED_ID, name: process.env.GMAIL_CRED_NAME || 'Atacama Labs - Gmail (envío)' } } : null;
const GHL_CRED = { httpHeaderAuth: { id: '4Vc6nfxyKjZ14Bep', name: 'GHL — Atacama OS' } };
export const GHL_BASE = 'https://services.leadconnectorhq.com';
export const FOLLOW_CFG = { base: GHL_BASE, locationId: 'pxHuOsiz2i3lM6BtC9IM', pipelineId: 'trSWhAcNDyUMmPlYIEib', userId: 'OjkAjHMdUjnblO7W1kBZ' };
const uuid = () => randomUUID();
const full = (timeout = 30000) => ({ response: { response: { fullResponse: true, neverError: true, responseFormat: 'json' } }, timeout });
const code = (name, jsCode, pos) => ({ id: uuid(), name, type: 'n8n-nodes-base.code', typeVersion: 2, position: pos, parameters: { jsCode } });
const NONE = 'https://localhost.invalid/';
const sbGet = (name, urlExpr, pos) => ({ id: uuid(), name, type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: pos, credentials: SUPABASE_CRED, continueOnFail: true, alwaysOutputData: true,
  parameters: { method: 'GET', url: urlExpr, authentication: 'predefinedCredentialType', nodeCredentialType: 'supabaseApi', options: full() } });
/** Ejecutor genérico de escrituras en Supabase: cada ítem es { skip, path, method, body, prefer }. */
const sbApply = (name, pos) => ({ id: uuid(), name, type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: pos, credentials: SUPABASE_CRED, continueOnFail: true, alwaysOutputData: true,
  parameters: { method: '={{ $json.method || "POST" }}', url: `={{ $json.skip ? "${NONE}" : "${SUPABASE}/rest/v1/" + $json.path }}`, authentication: 'predefinedCredentialType', nodeCredentialType: 'supabaseApi', sendHeaders: true,
    headerParameters: { parameters: [{ name: 'Prefer', value: '={{ $json.prefer || "return=minimal" }}' }] }, sendBody: true, specifyBody: 'json', jsonBody: '={{ JSON.stringify($json.body || {}) }}', options: full() } });
const ifNode = (name, expr, pos) => ({ id: uuid(), name, type: 'n8n-nodes-base.if', typeVersion: 2.2, position: pos,
  parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' }, combinator: 'and', conditions: [{ leftValue: `={{ (${expr}) ? "yes" : "no" }}`, rightValue: 'yes', operator: { type: 'string', operation: 'equals' } }] }, options: {} } });
const to = (n) => [{ node: n, type: 'main', index: 0 }];
const webhook = (name, path, pos) => ({ id: uuid(), name, type: 'n8n-nodes-base.webhook', typeVersion: 2, position: pos, webhookId: uuid(), credentials: INGEST_CRED, parameters: { httpMethod: 'POST', path, authentication: 'headerAuth', responseMode: 'lastNode', options: {} } });
const schedule30 = (name, pos) => ({ id: uuid(), name, type: 'n8n-nodes-base.scheduleTrigger', typeVersion: 1.2, position: pos, parameters: { rule: { interval: [{ field: 'minutes', minutesInterval: 30 }] } } });
const schedule = (name, pos) => ({ id: uuid(), name, type: 'n8n-nodes-base.scheduleTrigger', typeVersion: 1.2, position: pos, parameters: { rule: { interval: [{ field: 'minutes', minutesInterval: 10 }] } } });
const gmailHttp = (name, urlExpr, method, bodyExpr, pos) => ({ id: uuid(), name, type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: pos, ...(GMAIL_CRED ? { credentials: GMAIL_CRED } : {}), continueOnFail: true, alwaysOutputData: true,
  parameters: { method, url: urlExpr, authentication: 'predefinedCredentialType', nodeCredentialType: 'gmailOAuth2', ...(bodyExpr ? { sendBody: true, specifyBody: 'json', jsonBody: bodyExpr } : {}), options: full(45000) } });
const ghlGetX = (name, urlExpr, pos) => ({ id: uuid(), name, type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: pos, credentials: GHL_CRED, continueOnFail: true, alwaysOutputData: true,
  parameters: { method: 'GET', url: urlExpr, authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth', sendHeaders: true, headerParameters: { parameters: [{ name: 'Version', value: '2021-07-28' }, { name: 'Accept', value: 'application/json' }] }, options: full() } });
const ghlExecX = (name, pos) => ({ id: uuid(), name, type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: pos, credentials: GHL_CRED, continueOnFail: true, alwaysOutputData: true,
  parameters: { method: '={{ $json.method || "POST" }}', url: '={{ $json.skip ? "' + NONE + '" : $json.url }}', authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth', sendHeaders: true, headerParameters: { parameters: [{ name: 'Version', value: '2021-07-28' }, { name: 'Accept', value: 'application/json' }] }, sendBody: true, specifyBody: 'json', jsonBody: '={{ JSON.stringify($json.body || {}) }}', options: full() } });
const gatewayHttp = (name, pos) => ({ id: uuid(), name, type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: pos, credentials: INGEST_CRED, continueOnFail: true, alwaysOutputData: true,
  parameters: { method: 'POST', url: '={{ $json.skip ? "' + NONE + '" : "' + N8N_BASE + '/webhook/atacama-prospect-gateway" }}', authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth', sendBody: true, specifyBody: 'json', jsonBody: '={{ JSON.stringify($json.body || {}) }}', options: full(120000) } });

export const LIB = [...new Map([...Object.values(cm), ...Object.values(oc)].filter((f) => typeof f === 'function').map((f) => [f.name, f])).values()].map((f) => f.toString()).join('\n\n');

const CAND_SELECT = 'id,company_name,status,canonical,drafts,ghl_contact_id,ghl_opportunity_id,ghl_stage,domain,website,last_contact_at,last_contact_channel,channel_state';
const MSG_SELECT = '*';

/** Expande writes[] en ítems para el ejecutor de Supabase (con un ítem «skip» si no hay nada, para no cortar el flujo). */
export const expandCode = (src) => `const w = (${src}) || [];
if (!w.length) return [{ json: { skip: true } }];
return w.map((x) => ({ json: { skip: false, ...x } }));`;

// =====================================================================================================================
// 21 · Outreach Engine
// =====================================================================================================================
export const engineParseCode = `${LIB}

try {
  const first = $('Engine Webhook').first().json || {};
  const b = first.body || first;
  const action = String(b.action || '').toLowerCase();
  if (!['draft', 'approve', 'cancel', 'get', 'list', 'replies', 'suppress', 'followups', 'lint'].includes(action)) throw new Error('action inválida: usa draft | approve | cancel | get | list | replies | suppress | followups | lint');
  const cid = String(b.candidate_id || '').trim();
  const needsCand = ['draft', 'approve', 'cancel', 'get', 'suppress', 'lint'].includes(action);
  if (needsCand && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cid)) throw new Error('candidate_id (uuid del prospecto guardado) es obligatorio en ' + action);
  const kind = b.kind ? String(b.kind) : null;
  if (kind && !['initial', 'followup_1', 'followup_2', 'reply'].includes(kind)) throw new Error('kind inválido: initial | followup_1 | followup_2 | reply');
  const sb = '${SUPABASE}/rest/v1/';
  const limit = Math.min(Math.max(parseInt(b.limit, 10) || 20, 1), 50);
  const filter = String(b.filter || '').toLowerCase();
  let hist = null;
  if (needsCand) hist = sb + 'outreach_messages?candidate_id=eq.' + cid + '&select=${MSG_SELECT}&order=created_at.desc&limit=40';
  else if (action === 'followups') hist = sb + 'outreach_messages?created_at=gte.' + new Date(Date.now() - 45 * 86400000).toISOString() + '&select=${MSG_SELECT}&order=created_at.desc&limit=600';
  else if (action === 'replies') hist = sb + 'outreach_messages?direction=eq.inbound&' + (/^[0-9a-f-]{36}$/i.test(cid) ? 'candidate_id=eq.' + cid + '&' : '') + 'select=${MSG_SELECT}&order=created_at.desc&limit=' + limit;
  else { const st = { drafts: 'status=eq.draft', approved: 'status=eq.approved', sent: 'status=eq.sent', failed: 'status=eq.failed' }[filter]; hist = sb + 'outreach_messages?direction=eq.outbound&' + (st ? st + '&' : '') + 'select=${MSG_SELECT}&order=created_at.desc&limit=' + limit; }
  return [{ json: { action, candidate_id: cid || null, kind, subject: b.subject != null ? String(b.subject) : null, body: b.body != null ? String(b.body) : null, to_email: b.to_email ? String(b.to_email) : null, override_to: b.override_to === true,
    confirmation_code: b.confirmation_code ? String(b.confirmation_code) : '', order_text: b.order_text ? String(b.order_text) : '', by: String(b.by || 'Christian vía Hermes').slice(0, 60), filter, limit, now: Date.now(),
    reason: b.reason ? String(b.reason) : '', auto: b.auto === true, min_score: b.min_score != null ? Number(b.min_score) : null,
    cold: { evidence: b.evidence, insight: b.insight, friction: b.friction, angle: b.angle, cta_reason: b.cta_reason },
    peers_url: ['draft', 'lint'].includes(action) ? sb + 'outreach_messages?direction=eq.outbound&kind=in.(initial,followup_1,followup_2)&status=in.(draft,approved,sending,sent)&created_at=gte.' + new Date(Date.now() - 75 * 86400000).toISOString() + '&select=id,candidate_id,company_name,kind,status,subject,body&order=created_at.desc&limit=80' : '${NONE}', cand_url: needsCand ? sb + 'prospect_candidates?id=eq.' + cid + '&select=${CAND_SELECT}&limit=1' : '${NONE}', hist_url: hist } }];
} catch (e) { return [{ json: { fatal: String((e && e.message) || e) } }]; }`;

export const engineDecideCode = `${LIB}

const req = $('Parse').first().json;
const arr = (n) => { const j = $(n).first().json || {}; return (j.statusCode || 0) < 300 && Array.isArray(j.body) ? j.body : []; };
const candidate = arr('Load Candidate')[0] || null;
const history = arr('Load History');
const suppression = arr('Load Suppression');
const config = arr('Load Config')[0] || { mode: 'off', daily_cap: 10, window_start: '09:00', window_end: '17:30', tz: 'America/Santiago' };
const peers = arr('Load Peers');
const ctx = { now: req.now, candidate, history, suppression, config, peers, new_id: newId() };
let out;
if (req.action === 'draft') out = planDraft(req, ctx);
else if (req.action === 'lint') out = planLint(req, ctx);
else if (req.action === 'approve') out = planApprove(req, ctx);
else if (req.action === 'cancel') out = planCancel(req, ctx);
else if (req.action === 'suppress') out = planSuppress(req, ctx);
else if (req.action === 'get') {
  if (!candidate) out = { response: { ok: false, status: 'not_found', error: 'candidato_no_encontrado', message: 'El prospecto no está guardado en Atacama OS.' }, writes: [] };
  else { const live = history.filter((m) => m.direction === 'outbound' && ['draft', 'approved', 'sending'].includes(m.status)); const sup = canonicalEmails(candidate).map((e) => checkSuppression(e, suppression)).filter(Boolean);
    out = { response: { ok: true, status: 'executed', company: candidate.company_name, mode: config.mode, pending: live.map((m) => ({ ...messageView(m), body: m.body })), history: history.map(messageView), suppressed: sup.length ? sup : null, message: live.length ? 'Hay ' + live.length + ' correo(s) pendiente(s) de ' + candidate.company_name + '.' : 'No hay correos pendientes de ' + candidate.company_name + ' (' + history.filter((m) => m.direction === 'outbound' && m.status === 'sent').length + ' enviados, ' + history.filter((m) => m.direction === 'inbound').length + ' respuestas).' }, writes: [] }; }
} else if (req.action === 'followups') {
  const initials = history.filter((m) => m.kind === 'initial' && m.direction === 'outbound' && m.status === 'sent');
  const byC = {}; history.forEach((m) => { (byC[m.candidate_id] = byC[m.candidate_id] || []).push(m); });
  const cmap = {}; history.forEach((m) => { if (m.candidate_id && !cmap[m.candidate_id]) cmap[m.candidate_id] = { company_name: m.company_name }; });
  let items = followupOverview(initials, byC, cmap, config, req.now);
  if (req.filter === 'due') items = items.filter((x) => !x.replied && x.state !== 'done' && !String(x.state).startsWith('stopped') && ((x.followup_1.due_now && !x.followup_1.message) || (x.followup_2.due_now && !x.followup_2.message) || ['draft', 'approved'].some((st) => (x.followup_1.message && x.followup_1.message.status === st) || (x.followup_2.message && x.followup_2.message.status === st))));
  out = { response: { ok: true, status: 'executed', mode: config.mode, count: items.length, items, message: items.length ? items.length + ' prospecto(s) en seguimiento' + (req.filter === 'due' ? ' con algo pendiente' : '') + ': ' + items.slice(0, 6).map((x) => x.company + ' [' + x.state + (x.replied ? ', respondió' : '') + ']').join('; ') + '.' : 'No hay seguimientos' + (req.filter === 'due' ? ' pendientes' : '') + '.' }, writes: [] };
} else if (req.action === 'replies') {
  const list = history.map((m) => ({ ...messageView(m), body: m.body }));
  out = { response: { ok: true, status: 'executed', mode: config.mode, count: list.length, items: list, message: list.length ? list.length + ' respuesta(s): ' + list.slice(0, 5).map((x) => x.company + ' [' + x.classification + ']').join('; ') + '.' : 'No hay respuestas.' }, writes: [] };
} else {
  const list = history.map(messageView);
  out = { response: { ok: true, status: 'executed', mode: config.mode, count: list.length, items: list, message: list.length ? list.length + ' mensaje(s).' : 'No hay mensajes.' }, writes: [] };
}
out.response.mode = out.response.mode || config.mode;
out.response.request = { action: req.action, candidate_id: req.candidate_id, kind: req.kind };
return [{ json: { response: out.response, writes: out.writes || [], message: out.message || null } }];`;

export const engineRespondCode = `const d = $('Decide').first().json;
const bad = $('Apply Writes').all().map((i) => i.json).filter((j) => (j.statusCode || 0) >= 300);
const r = { ...d.response };
if (bad.length) { r.ok = false; r.status = 'error'; r.error = 'supabase'; r.message = 'No se pudo guardar en Supabase (HTTP ' + bad[0].statusCode + '): ' + JSON.stringify(bad[0].body || {}).slice(0, 200); }
r.safety = r.safety || { messages_sent: 0 };
return [{ json: r }];`;

export function buildEngine() {
  const nodes = [
    webhook('Engine Webhook', 'atacama-outreach-engine', [0, 0]),
    code('Parse', engineParseCode, [240, 0]),
    ifNode('Valid?', '!$json.fatal', [360, 0]),
    code('Respond Error', "return [{ json: { ok: false, status: 'error', error: $json.fatal, hint: 'Ver docs/OUTREACH.md', safety: { messages_sent: 0 } } }];", [600, -160]),
    sbGet('Load Candidate', '={{ $("Parse").first().json.cand_url }}', [480, 0]),
    sbGet('Load History', '={{ $("Parse").first().json.hist_url }}', [720, 0]),
    sbGet('Load Suppression', `${SUPABASE}/rest/v1/outreach_suppression?select=email,domain,reason&limit=1000`, [960, 0]),
    sbGet('Load Config', `${SUPABASE}/rest/v1/outreach_config?id=eq.1&select=*`, [1200, 0]),
    sbGet('Load Peers', '={{ $("Parse").first().json.peers_url }}', [1320, 0]),
    code('Decide', engineDecideCode, [1440, 0]),
    code('Expand Writes', expandCode('$("Decide").first().json.writes'), [1680, 0]),
    sbApply('Apply Writes', [1920, 0]),
    code('Respond', engineRespondCode, [2160, 0]),
  ];
  const c = { 'Engine Webhook': { main: [to('Parse')] }, 'Parse': { main: [to('Valid?')] }, 'Valid?': { main: [to('Load Candidate'), to('Respond Error')] }, 'Load Candidate': { main: [to('Load History')] }, 'Load History': { main: [to('Load Suppression')] },
    'Load Suppression': { main: [to('Load Config')] }, 'Load Config': { main: [to('Load Peers')] }, 'Load Peers': { main: [to('Decide')] }, 'Decide': { main: [to('Expand Writes')] }, 'Expand Writes': { main: [to('Apply Writes')] }, 'Apply Writes': { main: [to('Respond')] } };
  return { name: 'Atacama Labs - 21 Outreach Engine', nodes, connections: c, settings: { executionOrder: 'v1' } };
}

// =====================================================================================================================
// 22 · Outreach Sender
// =====================================================================================================================
export const senderInitCode = `let body = {};
try { body = $('Send Webhook').first().json.body || {}; } catch (e) { body = {}; }
return [{ json: { now: Date.now(), manual: Boolean(body && body.manual), diag: Boolean(body && body.gmail_check), now_override: Number.isFinite(Number(body && body.now_ms)) ? Number(body.now_ms) : null } }];`;

export const senderDiagCode = `const p = $('Gmail Diag Profile').first().json || {};
const s = $('Gmail Diag Send').first().json || {};
const msg = JSON.stringify((s.body && s.body.error && s.body.error.message) || s.body || s.error || '').slice(0, 160);
const sendOk = (s.statusCode || 0) === 400 && /recipient/i.test(msg);
return [{ json: { ok: (p.statusCode || 0) === 200 && sendOk, workflow: '22 Outreach Sender', credential_access: (p.statusCode || 0) === 200, account: (p.body && p.body.emailAddress) || null, profile_status: p.statusCode || 0, send_scope_ok: sendOk, send_probe_status: s.statusCode || 0, send_probe_message: msg, note: 'La sonda de envío no lleva destinatario: Gmail siempre la rechaza (400 Recipient address required). No se envía nada.', safety: { messages_sent: 0 } } }];`;

export const senderPrepCode = `${LIB}

const init = $('Init').first().json;
const j = (n) => $(n).first().json || {};
const arr = (n) => { const x = j(n); return (x.statusCode || 0) < 300 && Array.isArray(x.body) ? x.body : []; };
const config = arr('Load Config')[0] || { mode: 'off', daily_cap: 10, window_start: '09:00', window_end: '17:30', tz: 'America/Santiago' };
// la hora solo se puede forzar fuera de live (pruebas)
const now = config.mode !== 'live' && init.now_override ? init.now_override : init.now;
const approved = arr('Load Approved');
const ids = [...new Set(approved.map((m) => m.candidate_id).filter(Boolean))];
const sb = '${SUPABASE}/rest/v1/';
const inList = ids.length ? '(' + ids.join(',') + ')' : '(00000000-0000-0000-0000-000000000000)';
return [{ json: { now, config, approved,
  cand_url: sb + 'prospect_candidates?id=in.' + inList + '&select=${CAND_SELECT}',
  inbound_url: sb + 'outreach_messages?direction=eq.inbound&candidate_id=in.' + inList + '&select=candidate_id',
  sent_url: sb + 'outreach_messages?status=eq.sent&direction=eq.outbound&sent_at=gte.' + new Date(startOfZonedDay(now, config.tz)).toISOString() + '&select=id',
  recent_url: sb + 'outreach_messages?status=eq.sent&direction=eq.outbound&sent_at=gte.' + new Date(now - 10 * 86400000).toISOString() + '&select=candidate_id,sent_at&limit=500' } }];`;

// Logo oficial (public/brand/logo-horizontal.svg → PNG con scripts/outreach/build-email-logo.mjs), incrustado en el correo (Gmail no muestra SVG).
export const LOGO_B64 = fs.readFileSync(new URL('../../public/brand/email/logo-horizontal-email.png', import.meta.url)).toString('base64');

export const senderDecideCode = `${LIB}

const LOGO_B64 = '${LOGO_B64}';
const p = $('Prep').first().json;
const arr = (n) => { const x = $(n).first().json || {}; return (x.statusCode || 0) < 300 && Array.isArray(x.body) ? x.body : []; };
const cands = {}; arr('Load Candidates').forEach((c) => { cands[c.id] = c; });
const inbound = {}; arr('Load Inbound').forEach((r) => { inbound[r.candidate_id] = true; });
const sentToday = arr('Load Sent Today').length;
const lastSent = {}; arr('Load Sent Recent').forEach((r) => { const t = Date.parse(r.sent_at); if (Number.isFinite(t) && (!lastSent[r.candidate_id] || t > lastSent[r.candidate_id])) lastSent[r.candidate_id] = t; });
const d = pickDue(p.approved, p.config, p.now, sentToday, arr('Load Suppression'), cands, inbound, lastSent);
const base = { now: p.now, config: p.config, decision: d, sent_today: sentToday, go_live: false };
if (d.action === 'send') {
  const m = d.message;
  const cfg = p.config;
  if (cfg.mode === 'live' && !isValidEmail(cfg.from_email)) return [{ json: { ...base, decision: { action: 'none', reason: 'falta from_email en outreach_config (modo live)' } } }];
  const r = renderEmail(m, cfg);
  const mime = buildMime({ from: cfg.from_email || 'simulado@atacamalabs.cl', from_name: cfg.from_name, to: m.to_email, subject: r.subject, text: r.text, html: r.html, inline_png_b64: LOGO_B64, in_reply_to: m.in_reply_to, references: m.in_reply_to, now: p.now });
  return [{ json: { ...base, go_live: cfg.mode === 'live', message: m, candidate: d.candidate, mime, thread_id: m.gmail_thread_id || null } }];
}
if (d.action === 'cancel') return [{ json: { ...base, message: d.message, candidate: d.candidate || null } }];
return [{ json: base }];`;

export const senderCancelCode = `const d = $('Decide').first().json;
const now = new Date(d.now).toISOString();
return [{ json: { skip: false, method: 'PATCH', path: 'outreach_messages?id=eq.' + d.message.id + '&status=eq.approved', body: { status: 'cancelled', error: 'Cancelado por el motor: ' + d.decision.reason, updated_at: now }, prefer: 'return=minimal' } }];`;

export const senderClaimCode = `const d = $('Decide').first().json;
return [{ json: { claim_url: '${SUPABASE}/rest/v1/outreach_messages?id=eq.' + d.message.id + '&status=eq.approved', now: new Date(d.now).toISOString() } }];`;

export const senderResultCode = `${LIB}

const d = $('Decide').first().json;
const cl = $('Claim').first().json || {};
const claimed = (cl.statusCode || 0) < 300 && Array.isArray(cl.body) && cl.body.length === 1;
if (!claimed) return [{ json: { claimed: false, response: { ok: true, status: 'skipped', message: 'Otro proceso ya tomó este mensaje: no se envía de nuevo.', safety: { messages_sent: 0 } }, writes: [], effects: [] } }];
const m = cl.body[0];
const mode = d.config.mode;
const g = $('Gmail Send').first().json || {};
let res;
if (mode === 'live') res = (g.statusCode || 0) < 300 && g.body && g.body.id ? { ok: true, gmail_message_id: g.body.id, gmail_thread_id: g.body.threadId || null, rfc_message_id: d.mime.message_id } : { ok: false, error: 'Gmail HTTP ' + (g.statusCode || 'sin respuesta') + ': ' + JSON.stringify(g.body || g.error || {}).slice(0, 200) };
else if (mode === 'test_sim') res = { ok: true, gmail_message_id: 'sim-' + m.id, gmail_thread_id: m.gmail_thread_id || 'sim-thread-' + m.id, rfc_message_id: d.mime.message_id };
else res = { ok: true };
const plan = planSendResult({ ...m, approved_by: m.approved_by }, d.candidate, d.config, res, d.now);
const sent = plan.update.status === 'sent' || plan.update.status === 'dry_run';
const response = { ok: plan.ok, status: plan.update.status, mode, message: plan.ok ? (mode === 'live' ? 'Correo enviado a ' + m.to_email : mode === 'test_sim' ? 'Envío SIMULADO (modo test_sim): no se llamó a Gmail.' : 'Simulación (dry_run): no se llamó a Gmail ni se tocó GHL.') : 'Falló el envío: ' + plan.update.error, message_id: m.id, to: m.to_email, thread_id: plan.update.gmail_thread_id || null, safety: { messages_sent: mode === 'live' && plan.ok ? 1 : 0 } };
const gw = plan.effects.length && d.candidate ? { skip: false, body: { action: 'act', request_id: 'ob-' + m.id, source: { type: 'outreach-engine', name: 'Atacama OS · envío', reference: m.id }, act: plan.effects[0].act, targets: [d.candidate.canonical], options: { by: 'Atacama OS' } } } : { skip: true, body: {} };
return [{ json: { claimed: true, response, writes: plan.writes, effects: plan.effects, gw } }];`;

export const senderFinalCode = `const r = $('Result').first().json;
const g = $('Gateway Effect').first().json || {};
const bad = $('Apply Result').all().map((i) => i.json).filter((j) => (j.statusCode || 0) >= 300);
const out = { ...r.response };
if (r.effects && r.effects.length) { const gok = (g.statusCode || 0) < 300 && g.body && g.body.ok !== false; out.ghl = gok ? 'ok' : 'error'; if (!gok) out.ghl_error = 'El Prospect Gateway no aplicó el efecto en GHL (' + (g.statusCode || 'sin respuesta') + '): revisa la oportunidad a mano.'; }
if (bad.length) { out.ok = false; out.persist_error = 'Supabase falló (HTTP ' + bad[0].statusCode + '): ' + JSON.stringify(bad[0].body || {}).slice(0, 200); }
return [{ json: out }];`;

export function buildSender() {
  const nodes = [
    schedule('Every 10 min', [0, -120]),
    webhook('Send Webhook', 'atacama-outreach-send-due', [0, 120]),
    code('Init', senderInitCode, [240, 0]),
    ifNode('Diag?', '$json.diag === true', [360, -240]),
    gmailHttp('Gmail Diag Profile', 'https://gmail.googleapis.com/gmail/v1/users/me/profile', 'GET', null, [600, -300]),
    gmailHttp('Gmail Diag Send', 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send', 'POST', '={{ JSON.stringify({ raw: "U3ViamVjdDogZGlhZw0KDQp4" }) }}', [840, -300]),
    code('Respond Diag', senderDiagCode, [1080, -300]),
    sbGet('Load Config', `${SUPABASE}/rest/v1/outreach_config?id=eq.1&select=*`, [480, 0]),
    sbGet('Load Approved', `${SUPABASE}/rest/v1/outreach_messages?status=eq.approved&direction=eq.outbound&select=*&order=scheduled_for.asc&limit=20`, [720, 0]),
    code('Prep', senderPrepCode, [960, 0]),
    sbGet('Load Candidates', '={{ $("Prep").first().json.cand_url }}', [1200, 0]),
    sbGet('Load Suppression', `${SUPABASE}/rest/v1/outreach_suppression?select=email,domain,reason&limit=1000`, [1440, 0]),
    sbGet('Load Inbound', '={{ $("Prep").first().json.inbound_url }}', [1680, 0]),
    sbGet('Load Sent Today', '={{ $("Prep").first().json.sent_url }}', [1920, 0]),
    sbGet('Load Sent Recent', '={{ $("Prep").first().json.recent_url }}', [2040, 0]),
    code('Decide', senderDecideCode, [2160, 0]),
    ifNode('Send?', '$json.decision.action === "send"', [2400, 0]),
    ifNode('Cancel?', '$json.decision.action === "cancel"', [2640, 180]),
    code('Cancel Plan', senderCancelCode, [2880, 120]),
    sbApply('Apply Cancel', [3120, 120]),
    code('Respond Cancel', "const d = $('Decide').first().json; return [{ json: { ok: true, status: 'cancelled', message: 'Mensaje cancelado por el motor: ' + d.decision.reason, message_id: d.message.id, safety: { messages_sent: 0 } } }];", [3360, 120]),
    code('Respond None', "const d = $('Decide').first().json; return [{ json: { ok: true, status: 'idle', mode: d.config.mode, message: d.decision.reason || 'Nada que enviar.', sent_today: d.sent_today, safety: { messages_sent: 0 } } }];", [2880, 300]),
    code('Claim Plan', senderClaimCode, [2640, -140]),
    { id: uuid(), name: 'Claim', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [2880, -140], credentials: SUPABASE_CRED, continueOnFail: true, alwaysOutputData: true,
      parameters: { method: 'PATCH', url: '={{ $json.claim_url }}', authentication: 'predefinedCredentialType', nodeCredentialType: 'supabaseApi', sendHeaders: true, headerParameters: { parameters: [{ name: 'Prefer', value: 'return=representation' }] }, sendBody: true, specifyBody: 'json', jsonBody: '={{ JSON.stringify({ status: "sending", updated_at: $json.now }) }}', options: full() } },
    gmailHttp('Gmail Send', `={{ $("Decide").first().json.go_live && Array.isArray($("Claim").first().json.body) && $("Claim").first().json.body.length === 1 ? "https://gmail.googleapis.com/gmail/v1/users/me/messages/send" : "${NONE}" }}`, 'POST',
      '={{ JSON.stringify($("Decide").first().json.thread_id ? { raw: $("Decide").first().json.mime.raw, threadId: $("Decide").first().json.thread_id } : { raw: $("Decide").first().json.mime.raw }) }}', [3120, -140]),
    code('Result', senderResultCode, [3360, -140]),
    gatewayHttp('Gateway Effect', [3600, -140]),
    code('Expand Result', expandCode('$("Result").first().json.writes'), [3840, -140]),
    sbApply('Apply Result', [4080, -140]),
    code('Respond', senderFinalCode, [4320, -140]),
  ];
  // El efecto de Gateway usa los ítems de Result: se lo pasa como $json (Result → Gateway Effect toma $json.gw)
  nodes.find((n) => n.name === 'Gateway Effect').parameters.url = `={{ $json.gw && !$json.gw.skip ? "${N8N_BASE}/webhook/atacama-prospect-gateway" : "${NONE}" }}`;
  nodes.find((n) => n.name === 'Gateway Effect').parameters.jsonBody = '={{ JSON.stringify($json.gw ? $json.gw.body : {}) }}';
  const c = {
    'Every 10 min': { main: [to('Init')] }, 'Send Webhook': { main: [to('Init')] }, 'Init': { main: [to('Diag?')] }, 'Diag?': { main: [to('Gmail Diag Profile'), to('Load Config')] }, 'Gmail Diag Profile': { main: [to('Gmail Diag Send')] }, 'Gmail Diag Send': { main: [to('Respond Diag')] }, 'Load Config': { main: [to('Load Approved')] }, 'Load Approved': { main: [to('Prep')] }, 'Prep': { main: [to('Load Candidates')] },
    'Load Candidates': { main: [to('Load Suppression')] }, 'Load Suppression': { main: [to('Load Inbound')] }, 'Load Inbound': { main: [to('Load Sent Today')] }, 'Load Sent Today': { main: [to('Load Sent Recent')] }, 'Load Sent Recent': { main: [to('Decide')] }, 'Decide': { main: [to('Send?')] },
    'Send?': { main: [to('Claim Plan'), to('Cancel?')] }, 'Cancel?': { main: [to('Cancel Plan'), to('Respond None')] }, 'Cancel Plan': { main: [to('Apply Cancel')] }, 'Apply Cancel': { main: [to('Respond Cancel')] },
    'Claim Plan': { main: [to('Claim')] }, 'Claim': { main: [to('Gmail Send')] }, 'Gmail Send': { main: [to('Result')] }, 'Result': { main: [to('Gateway Effect')] }, 'Gateway Effect': { main: [to('Expand Result')] }, 'Expand Result': { main: [to('Apply Result')] }, 'Apply Result': { main: [to('Respond')] },
  };
  return { name: 'Atacama Labs - 22 Outreach Sender', nodes, connections: c, settings: { executionOrder: 'v1' } };
}

// =====================================================================================================================
// 23 · Gmail Sync
// =====================================================================================================================
export const syncInitCode = `let body = {};
try { body = $('Sync Webhook').first().json.body || {}; } catch (e) { body = {}; }
return [{ json: { now: Date.now(), diag: Boolean(body && body.gmail_check), inject: Array.isArray(body && body.inject) ? body.inject : null } }];`;

export const syncPrepCode = `${LIB}

const init = $('Init').first().json;
const arr = (n) => { const x = $(n).first().json || {}; return (x.statusCode || 0) < 300 && Array.isArray(x.body) ? x.body : []; };
const config = arr('Load Config')[0] || { mode: 'off' };
const open = arr('Load Open');
const sb = '${SUPABASE}/rest/v1/';
const ids = [...new Set(open.map((m) => m.candidate_id).filter(Boolean))];
const inList = ids.length ? '(' + ids.join(',') + ')' : '(00000000-0000-0000-0000-000000000000)';
return [{ json: { now: init.now, diag: init.diag === true, config, open, inject: config.mode !== 'live' ? init.inject : null,
  known_url: sb + 'outreach_messages?effect_key=like.recv:*&select=effect_key&order=created_at.desc&limit=1000',
  cand_url: sb + 'prospect_candidates?id=in.' + inList + '&select=${CAND_SELECT}' } }];`;

export const syncExpandThreadsCode = `const p = $('Prep').first().json;
if (p.diag) return [{ json: { skip: false, url: 'https://gmail.googleapis.com/gmail/v1/users/me/profile', diag: 'profile' } }, { json: { skip: false, url: 'https://gmail.googleapis.com/gmail/v1/users/me/labels', diag: 'labels' } }, { json: { skip: false, url: 'https://gmail.googleapis.com/gmail/v1/users/me/threads?maxResults=1&q=in:sent', diag: 'threads' } }];
const live = p.config.mode === 'live';
const threads = [...new Set(p.open.map((m) => m.gmail_thread_id).filter(Boolean))].slice(0, 25);
if (!live || !threads.length) return [{ json: { skip: true, thread_id: null } }];
return threads.map((t) => ({ json: { skip: false, thread_id: t } }));`;

export const syncProcessCode = `${LIB}

const p = $('Prep').first().json;
const arr = (n) => { const x = $(n).first().json || {}; return (x.statusCode || 0) < 300 && Array.isArray(x.body) ? x.body : []; };
if (p.diag) { const f = $('Gmail Fetch').all().map((i) => i.json || {}); const pr = f[0] || {}, lb = f[1] || {}, th = f[2] || {}; return [{ json: { diag: { workflow: '23 Gmail Sync', credential_access: (pr.statusCode || 0) === 200, account: (pr.body && pr.body.emailAddress) || null, messages_total: (pr.body && pr.body.messagesTotal) || 0, read_labels_ok: (lb.statusCode || 0) === 200, read_threads_ok: (th.statusCode || 0) === 200, statuses: [pr.statusCode || 0, lb.statusCode || 0, th.statusCode || 0] }, writes: [], effects: [], summary: [], new_messages: 0, threads_checked: 0, mode: p.config.mode, stopped: {} } }]; }
const known = new Set(arr('Load Known').map((r) => r.effect_key));
const cands = {}; arr('Load Candidates').forEach((c) => { cands[c.id] = c; });
const byThread = {}; p.open.forEach((m) => { if (!byThread[m.gmail_thread_id]) byThread[m.gmail_thread_id] = m; });
let msgs = [];
if (p.config.mode === 'live') { for (const it of $('Gmail Fetch').all()) { const j = it.json || {}; if ((j.statusCode || 0) < 300 && j.body && j.body.messages) msgs = msgs.concat(parseGmailThread(j.body)); } }
else if (p.inject) msgs = p.inject.map((m) => ({ ...m, headers: m.headers || {} }));
const ours = p.config.from_email || '';
const writes = [], effects = [], summary = [];
const stopped = {};
let fresh = 0;
for (const m of msgs) {
  const key = 'recv:' + m.id;
  if (known.has(key)) continue;
  const sent = byThread[m.thread_id];
  if (!sent) continue;
  const cls = classifyInbound(m, ours);
  if (cls.cls === 'own') continue;
  fresh++;
  const cand = cands[sent.candidate_id] || null;
  const plan = planInbound(m, cls, sent, cand, p.now);
  plan.writes.forEach((w) => writes.push(w));
  if (cand && !stopped[cand.id]) { plan.effects.forEach((e) => effects.push({ ...e, cand })); if (plan.stop_followups) stopped[cand.id] = cls.cls; }
  summary.push({ company: plan.row.company_name, cls: cls.cls, summary: plan.summary });
}
const fx = effects.filter((e) => e.type === 'gateway_act' && e.cand).map((e, i) => ({ skip: false, body: { action: 'act', request_id: 'in-' + (e.cand.id || '').slice(0, 8) + '-' + e.act.type + '-' + p.now.toString(36) + '-' + i, source: { type: 'gmail-sync', name: 'Atacama OS · Gmail Sync', reference: e.cand.id }, act: e.act, targets: [e.cand.canonical], options: { by: 'Atacama OS' } } }));
return [{ json: { writes, effects: fx, summary, new_messages: fresh, threads_checked: [...new Set(msgs.map((m) => m.thread_id))].length, mode: p.config.mode, stopped } }];`;

export const syncRespondCode = `const r = $('Process').first().json;
const eff = $('Gateway Effect').all().map((i) => i.json);
const failedFx = eff.filter((j) => j && (j.statusCode || 0) >= 300).length;
const bad = $('Apply Writes').all().map((i) => i.json).filter((j) => (j.statusCode || 0) >= 300);
if (r.diag) return [{ json: { ok: r.diag.credential_access && r.diag.read_labels_ok && r.diag.read_threads_ok, ...r.diag, mode: r.mode, safety: { messages_sent: 0 } } }];
return [{ json: { ok: bad.length === 0, mode: r.mode, new_messages: r.new_messages, threads_checked: r.threads_checked, results: r.summary, followups_stopped_for: Object.keys(r.stopped || {}).length, ghl_effects: r.effects.length, ghl_effect_errors: failedFx, ...(bad.length ? { persist_error: 'Supabase HTTP ' + bad[0].statusCode } : {}), safety: { messages_sent: 0 } } }];`;

export function buildSync() {
  const nodes = [
    schedule('Every 10 min', [0, -120]),
    webhook('Sync Webhook', 'atacama-gmail-sync', [0, 120]),
    code('Init', syncInitCode, [240, 0]),
    sbGet('Load Config', `${SUPABASE}/rest/v1/outreach_config?id=eq.1&select=*`, [480, 0]),
    sbGet('Load Open', `={{ "${SUPABASE}/rest/v1/outreach_messages?status=eq.sent&direction=eq.outbound&gmail_thread_id=not.is.null&sent_at=gte." + new Date($("Init").first().json.now - 30 * 86400000).toISOString() + "&select=id,candidate_id,company_name,to_email,kind,gmail_thread_id,sent_at&order=sent_at.desc&limit=200" }}`, [720, 0]),
    code('Prep', syncPrepCode, [960, 0]),
    sbGet('Load Known', '={{ $("Prep").first().json.known_url }}', [1200, 0]),
    sbGet('Load Candidates', '={{ $("Prep").first().json.cand_url }}', [1440, 0]),
    code('Expand Threads', syncExpandThreadsCode, [1680, 0]),
    gmailHttp('Gmail Fetch', `={{ $json.skip ? "${NONE}" : ($json.url || "https://gmail.googleapis.com/gmail/v1/users/me/threads/" + $json.thread_id + "?format=full") }}`, 'GET', null, [1920, 0]),
    code('Process', syncProcessCode, [2160, 0]),
    code('Expand Writes', expandCode('$("Process").first().json.writes'), [2400, 0]),
    sbApply('Apply Writes', [2640, 0]),
    code('Expand Effects', `const r = $('Process').first().json; const fx = r.effects || []; if (!fx.length) return [{ json: { skip: true, body: {} } }]; return fx.map((f) => ({ json: f }));`, [2880, 0]),
    gatewayHttp('Gateway Effect', [3120, 0]),
    code('Respond', syncRespondCode, [3360, 0]),
  ];
  const c = { 'Every 10 min': { main: [to('Init')] }, 'Sync Webhook': { main: [to('Init')] }, 'Init': { main: [to('Load Config')] }, 'Load Config': { main: [to('Load Open')] }, 'Load Open': { main: [to('Prep')] }, 'Prep': { main: [to('Load Known')] },
    'Load Known': { main: [to('Load Candidates')] }, 'Load Candidates': { main: [to('Expand Threads')] }, 'Expand Threads': { main: [to('Gmail Fetch')] }, 'Gmail Fetch': { main: [to('Process')] }, 'Process': { main: [to('Expand Writes')] },
    'Expand Writes': { main: [to('Apply Writes')] }, 'Apply Writes': { main: [to('Expand Effects')] }, 'Expand Effects': { main: [to('Gateway Effect')] }, 'Gateway Effect': { main: [to('Respond')] } };
  return { name: 'Atacama Labs - 23 Gmail Sync', nodes, connections: c, settings: { executionOrder: 'v1' } };
}

// =====================================================================================================================
// 24 · Followup Planner
// =====================================================================================================================
export const plannerInitCode = `let body = {};
try { body = $('Planner Webhook').first().json.body || {}; } catch (e) { body = {}; }
return [{ json: { now: Date.now(), now_override: Number.isFinite(Number(body && body.now_ms)) ? Number(body.now_ms) : null } }];`;

export const plannerPrepCode = `${LIB}

const init = $('Init').first().json;
const arr = (n) => { const x = $(n).first().json || {}; return (x.statusCode || 0) < 300 && Array.isArray(x.body) ? x.body : []; };
const config = arr('Load Config')[0] || { mode: 'off' };
const now = config.mode !== 'live' && init.now_override ? init.now_override : init.now;
const initials = arr('Load Initials');
const ids = [...new Set(initials.map((m) => m.candidate_id).filter(Boolean))];
const inList = ids.length ? '(' + ids.join(',') + ')' : '(00000000-0000-0000-0000-000000000000)';
const sb = '${SUPABASE}/rest/v1/';
return [{ json: { now, config, initials, off: config.mode === 'off' || !initials.length,
  recent_url: sb + 'prospect_candidates?status=in.(in_ghl,contacted,accepted)&created_at=gte.' + new Date(now - 3 * 86400000).toISOString() + '&select=id,ghl_contact_id&limit=60',
  cand_url: sb + 'prospect_candidates?id=in.' + inList + '&select=${CAND_SELECT}',
  msgs_url: sb + 'outreach_messages?candidate_id=in.' + inList + '&select=*&order=created_at.desc&limit=1000' } }];`;

export const plannerChecksCode = `${LIB}

const p = $('Prep').first().json;
const arr = (n) => { const x = $(n).first().json || {}; return (x.statusCode || 0) < 300 && Array.isArray(x.body) ? x.body : []; };
const candidates = {}; arr('Load Candidates').forEach((c) => { candidates[c.id] = c; });
const byCandidate = {}; arr('Load Messages').forEach((m) => { (byCandidate[m.candidate_id] = byCandidate[m.candidate_id] || []).push(m); });
const closed = {};
['GHL Won', 'GHL Lost'].forEach((n, i) => { const x = $(n).first().json || {}; const opps = (x.statusCode || 0) < 300 && x.body && Array.isArray(x.body.opportunities) ? x.body.opportunities : []; opps.forEach((o) => { closed[o.id] = i === 0 ? 'won' : 'lost'; }); });
const need = p.off ? [] : followupsNeedingTaskCheck({ initials: p.initials, candidates, byCandidate, suppression: arr('Load Suppression'), closed });
arr('Load Recent').forEach((c) => { if (c.ghl_contact_id) need.push({ contact_id: c.ghl_contact_id }); });
if (!need.length) return [{ json: { skip: true, contact_id: null } }];
return [...new Map(need.map((x) => [x.contact_id, x])).values()].map((x) => ({ json: { skip: false, contact_id: x.contact_id, url: '${GHL_BASE}/contacts/' + x.contact_id + '/tasks' } }));`;

export const plannerDecideCode = `${LIB}

const p = $('Prep').first().json;
const arr = (n) => { const x = $(n).first().json || {}; return (x.statusCode || 0) < 300 && Array.isArray(x.body) ? x.body : []; };
const candidates = {}; arr('Load Candidates').forEach((c) => { candidates[c.id] = c; });
const byCandidate = {}; arr('Load Messages').forEach((m) => { (byCandidate[m.candidate_id] = byCandidate[m.candidate_id] || []).push(m); });
const closed = {};
['GHL Won', 'GHL Lost'].forEach((n, i) => { const x = $(n).first().json || {}; const opps = (x.statusCode || 0) < 300 && x.body && Array.isArray(x.body.opportunities) ? x.body.opportunities : []; opps.forEach((o) => { closed[o.id] = i === 0 ? 'won' : 'lost'; }); });
const checks = $('Expand Checks').all().map((i) => i.json);
const res = $('GHL Get Tasks').all().map((i) => i.json);
const contactTasks = {};
checks.forEach((c, i) => { if (c.skip || !c.contact_id) return; const r = res[i] || {}; if ((r.statusCode || 0) < 300 && r.body && Array.isArray(r.body.tasks)) contactTasks[c.contact_id] = r.body.tasks; else contactTasks[c.contact_id] = null; });
// si no se pudieron leer las tareas de un contacto NO se crean (evita duplicados)
const safe = p.initials.filter((m) => { const c = candidates[m.candidate_id]; return !(c && c.ghl_contact_id && contactTasks[c.ghl_contact_id] === null); });
const recentIds = arr('Load Recent').map((c) => c.ghl_contact_id).filter(Boolean);
const dedupe = dedupeReviewTasks(contactTasks, recentIds, ${JSON.stringify(FOLLOW_CFG)});
const plan = p.off ? { ghl_ops: [], writes: [], actions: [], meta_updates: {} } : planFollowups({ now: p.now, config: p.config, initials: safe, byCandidate, candidates, suppression: arr('Load Suppression'), closed, contactTasks, ghl: ${JSON.stringify(FOLLOW_CFG)}, newId: () => newId() });
plan.ghl_ops = plan.ghl_ops.concat(dedupe);
if (dedupe.length) plan.actions.push({ action: 'tareas_duplicadas_borradas', count: dedupe.length, titles: [...new Set(dedupe.map((d) => d.title))].slice(0, 10) });
return [{ json: { off: p.off, plan, now: p.now, mode: p.config.mode, unreadable: Object.keys(contactTasks).filter((k) => contactTasks[k] === null).length } }];`;

export const plannerFinalCode = `${LIB}

const d = $('Decide').first().json;
const results = $('GHL Exec').all().map((i) => i.json);
const fin = finalizeFollowups(d.plan, results.slice(0, d.plan.ghl_ops.length), { now: d.now });
return [{ json: { writes: fin.writes, errors: fin.errors, actions: d.plan.actions } }];`;

export const plannerRespondCode = `const f = $('Finalize').first().json;
const d = $('Decide').first().json;
const bad = $('Apply Writes').all().map((i) => i.json).filter((j) => (j.statusCode || 0) >= 300);
return [{ json: { ok: bad.length === 0 && f.errors.length === 0, mode: d.mode, off: d.off, actions: f.actions, ghl_errors: f.errors, tasks_unreadable: d.unreadable || 0, ...(bad.length ? { persist_error: 'Supabase HTTP ' + bad[0].statusCode } : {}), safety: { messages_sent: 0 } } }];`;

export function buildPlanner() {
  const nodes = [
    schedule30('Every 30 min', [0, -120]),
    webhook('Planner Webhook', 'atacama-followup-planner', [0, 120]),
    code('Init', plannerInitCode, [240, 0]),
    sbGet('Load Config', `${SUPABASE}/rest/v1/outreach_config?id=eq.1&select=*`, [480, 0]),
    sbGet('Load Initials', `={{ "${SUPABASE}/rest/v1/outreach_messages?kind=eq.initial&direction=eq.outbound&status=eq.sent&sent_at=gte." + new Date($("Init").first().json.now - 30 * 86400000).toISOString() + "&select=*&order=sent_at.asc&limit=200" }}`, [720, 0]),
    code('Prep', plannerPrepCode, [960, 0]),
    sbGet('Load Candidates', '={{ $("Prep").first().json.cand_url }}', [1200, 0]),
    sbGet('Load Messages', '={{ $("Prep").first().json.msgs_url }}', [1440, 0]),
    sbGet('Load Recent', '={{ $("Prep").first().json.recent_url }}', [1560, 0]),
    sbGet('Load Suppression', `${SUPABASE}/rest/v1/outreach_suppression?select=email,domain,reason&limit=1000`, [1680, 0]),
    ghlGetX('GHL Won', `${GHL_BASE}/opportunities/search?location_id=${FOLLOW_CFG.locationId}&pipeline_id=${FOLLOW_CFG.pipelineId}&status=won&limit=100`, [1920, 0]),
    ghlGetX('GHL Lost', `${GHL_BASE}/opportunities/search?location_id=${FOLLOW_CFG.locationId}&pipeline_id=${FOLLOW_CFG.pipelineId}&status=lost&limit=100`, [2160, 0]),
    code('Expand Checks', plannerChecksCode, [2400, 0]),
    ghlGetX('GHL Get Tasks', `={{ $json.skip ? "${NONE}" : $json.url }}`, [2640, 0]),
    code('Decide', plannerDecideCode, [2880, 0]),
    code('Expand Ops', expandCode('$("Decide").first().json.plan.ghl_ops.map((o) => ({ ...o }))'), [3120, 0]),
    ghlExecX('GHL Exec', [3360, 0]),
    code('Finalize', plannerFinalCode, [3600, 0]),
    code('Expand Writes', expandCode('$("Finalize").first().json.writes'), [3840, 0]),
    sbApply('Apply Writes', [4080, 0]),
    code('Respond', plannerRespondCode, [4320, 0]),
  ];
  const c = { 'Every 30 min': { main: [to('Init')] }, 'Planner Webhook': { main: [to('Init')] }, 'Init': { main: [to('Load Config')] }, 'Load Config': { main: [to('Load Initials')] }, 'Load Initials': { main: [to('Prep')] }, 'Prep': { main: [to('Load Candidates')] },
    'Load Candidates': { main: [to('Load Messages')] }, 'Load Messages': { main: [to('Load Recent')] }, 'Load Recent': { main: [to('Load Suppression')] }, 'Load Suppression': { main: [to('GHL Won')] }, 'GHL Won': { main: [to('GHL Lost')] }, 'GHL Lost': { main: [to('Expand Checks')] }, 'Expand Checks': { main: [to('GHL Get Tasks')] },
    'GHL Get Tasks': { main: [to('Decide')] }, 'Decide': { main: [to('Expand Ops')] }, 'Expand Ops': { main: [to('GHL Exec')] }, 'GHL Exec': { main: [to('Finalize')] }, 'Finalize': { main: [to('Expand Writes')] }, 'Expand Writes': { main: [to('Apply Writes')] }, 'Apply Writes': { main: [to('Respond')] } };
  return { name: 'Atacama Labs - 24 Followup Planner', nodes, connections: c, settings: { executionOrder: 'v1' } };
}

if (process.argv[1] && process.argv[1].endsWith('outreach.mjs')) {
  const w = (f, o) => { fs.writeFileSync(new URL('../' + f, import.meta.url), JSON.stringify(o, null, 2) + '\n'); console.log('escrito', f); };
  w('atacama-labs-21-outreach-engine.json', buildEngine());
  w('atacama-labs-22-outreach-sender.json', buildSender());
  w('atacama-labs-23-gmail-sync.json', buildSync());
  w('atacama-labs-24-followup-planner.json', buildPlanner());
  console.log('funciones incrustadas:', LIB.split('\nfunction ').length, '· credencial Gmail:', GMAIL_CRED ? 'sí' : 'NO (solo dry_run/test_sim hasta crearla)');
}
