#!/usr/bin/env node
/**
 * Atacama OS · workflow n8n «26 LinkedIn Engine» (Bloque 3) — canal LinkedIn con Waalaxy como EJECUTOR.
 *
 * POST /webhook/atacama-linkedin  (X-Atacama-Key)  { action, target?, ... }
 *   list | status | recommend | approve | event | config | set_config | lists | test
 *
 * Waalaxy solo recibe altas (lista y, en modo live, campaña); la verdad comercial vive en GHL (vía Prospect Gateway `act`) y el estado fino en
 * prospect_candidates.channel_state. La API pública de Waalaxy no ofrece webhooks ni consulta de estado: los eventos posteriores
 * (conexión aceptada, mensaje, respuesta) los registra Hermes con `event`. Este workflow NUNCA envía invitaciones ni mensajes por sí mismo.
 */
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import * as core from '../../scripts/linkedin/linkedin-core.mjs';

const SUPABASE = 'https://uwquwjmiofixzugttals.supabase.co';
export const N8N_BASE = 'https://n8n.srv1650725.hstgr.cloud';
const NONE = 'https://localhost.invalid/';
const WAALAXY = 'https://developers.waalaxy.com/';
const SUPABASE_CRED = { supabaseApi: { id: 'XOmXUuyLVSazDIh5', name: 'Atacama Labs - Supabase' } };
const INGEST_CRED = { httpHeaderAuth: { id: 'lUGhlXVaQBEiEh5S', name: 'Atacama Labs - Ingest Key' } };
const WAALAXY_CRED = { waalaxyApi: { id: 'S6oCbITh4Z93ZRjx', name: 'Waalaxy — Atacama OS' } };
const uuid = () => randomUUID();
const full = (timeout = 30000) => ({ response: { response: { fullResponse: true, neverError: true, responseFormat: 'json' } }, timeout });
const code = (name, jsCode, pos) => ({ id: uuid(), name, type: 'n8n-nodes-base.code', typeVersion: 2, position: pos, parameters: { jsCode } });
const to = (n) => [{ node: n, type: 'main', index: 0 }];
const ifNode = (name, expr, pos) => ({ id: uuid(), name, type: 'n8n-nodes-base.if', typeVersion: 2.2, position: pos,
  parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' }, combinator: 'and', conditions: [{ leftValue: `={{ (${expr}) ? "yes" : "no" }}`, rightValue: 'yes', operator: { type: 'string', operation: 'equals' } }] }, options: {} } });
const sbGet = (name, urlExpr, pos) => ({ id: uuid(), name, type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: pos, credentials: SUPABASE_CRED, continueOnFail: true, alwaysOutputData: true,
  parameters: { method: 'GET', url: urlExpr, authentication: 'predefinedCredentialType', nodeCredentialType: 'supabaseApi', options: full() } });
const sbApply = (name, pos) => ({ id: uuid(), name, type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: pos, credentials: SUPABASE_CRED, continueOnFail: true, alwaysOutputData: true,
  parameters: { method: '={{ $json.method || "POST" }}', url: `={{ $json.skip ? "${NONE}" : "${SUPABASE}/rest/v1/" + $json.path }}`, authentication: 'predefinedCredentialType', nodeCredentialType: 'supabaseApi', sendHeaders: true,
    headerParameters: { parameters: [{ name: 'Prefer', value: '={{ $json.prefer || "return=minimal" }}' }] }, sendBody: true, specifyBody: 'json', jsonBody: '={{ JSON.stringify($json.body || {}) }}', options: full() } });
const waGet = (name, pathExpr, pos) => ({ id: uuid(), name, type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: pos, credentials: WAALAXY_CRED, continueOnFail: true, alwaysOutputData: true,
  parameters: { method: 'GET', url: `={{ ${pathExpr} ? "${WAALAXY}" + ${pathExpr} : "${NONE}" }}`, authentication: 'predefinedCredentialType', nodeCredentialType: 'waalaxyApi', sendHeaders: true, headerParameters: { parameters: [{ name: 'x-req-integration-origin', value: 'n8n' }] }, options: full(25000) } });

export const LIB = [...new Map(Object.values(core).filter((f) => typeof f === 'function').map((f) => [f.name, f])).values()].map((f) => f.toString()).join('\n\n');
export const ACTIONS = ['list', 'status', 'recommend', 'approve', 'event', 'config', 'set_config', 'lists', 'test'];
const CAND_SELECT = 'id,company_name,domain,website,status,band,priority_score,ghl_contact_id,ghl_opportunity_id,ghl_stage,last_contact_channel,last_contact_at,next_action_at,channel_state,canonical,created_at';

export const parseCode = `try {
  const first = $('LI Webhook').first().json || {};
  const b = first.body || first;
  const action = String(b.action || '').toLowerCase();
  const ACTIONS = ${JSON.stringify(ACTIONS)};
  if (!ACTIONS.includes(action)) throw new Error('action inválida: usa ' + ACTIONS.join(' | '));
  const needTarget = ['status', 'recommend', 'approve', 'event'].includes(action);
  if (needTarget && !String(b.target || '').trim()) throw new Error('target obligatorio (nombre, dominio, id o URL de LinkedIn del prospecto)');
  const sb = '${SUPABASE}/rest/v1/';
  const u = {
    config: sb + 'outreach_config?id=eq.1&select=*',
    cands: sb + 'prospect_candidates?status=in.(in_ghl,accepted,contacted,discarded)&select=${CAND_SELECT}&order=priority_score.desc&limit=500',
    msgs: ['list', 'approve', 'recommend'].includes(action) ? sb + 'outreach_messages?direction=eq.outbound&status=in.(approved,sending,sent)&select=candidate_id,status&limit=500' : '${NONE}',
    sup: ['list', 'approve', 'recommend'].includes(action) ? sb + 'outreach_suppression?select=email&limit=2000' : '${NONE}',
    wa_lists: action === 'lists' ? 'prospectLists/getProspectLists' : '',
    wa_campaigns: action === 'lists' ? 'campaigns/getAll' : '',
    wa_test: action === 'test' ? 'integrations/test' : '',
  };
  return [{ json: { action, target: String(b.target || '').trim(), by: String(b.by || 'Christian vía Hermes').slice(0, 80), confirmation_code: String(b.confirmation_code || '').trim(), order_text: String(b.order_text || '').slice(0, 400), event: String(b.event || ''), note: String(b.note || b.text || ''), cfg_patch: b.config && typeof b.config === 'object' ? b.config : {}, u } }];
} catch (e) { return [{ json: { fatal: String((e && e.message) || e) } }]; }`;

export const computeCode = `${LIB}

const p = $('Parse').first().json;
const node = (n) => { try { return $(n).first().json || {}; } catch (e) { return {}; } };
const arr = (n) => { const x = node(n); return (x.statusCode || 0) < 300 && Array.isArray(x.body) ? x.body : []; };
const nowMs = Date.now(), nowIso = new Date(nowMs).toISOString();
const cfg = arr('SB Config')[0] || {};
const cands = arr('SB Candidates');
const msgs = arr('SB Messages');
const sup = arr('SB Suppression').map((r) => String(r.email || '').toLowerCase());
const A = p.action;
const day = (ms) => new Date(ms).toLocaleDateString('en-CA', { timeZone: 'America/Santiago' });
const today = day(nowMs);
const importedToday = cands.filter((c) => { const l = (c.channel_state || {}).linkedin; return l && l.mode_at_import === 'live' && l.imported_at && day(Date.parse(l.imported_at)) === today; }).length;
const safeCfg = { linkedin_mode: cfg.linkedin_mode || 'off', linkedin_list_id: cfg.linkedin_list_id || null, linkedin_campaign_id: cfg.linkedin_campaign_id || null, linkedin_test_list_id: cfg.linkedin_test_list_id || null, linkedin_daily_cap: cfg.linkedin_daily_cap, linkedin_test_allowlist: cfg.linkedin_test_allowlist || [], email_mode: cfg.mode };
const out = { writes: [], effects: [], waalaxy: null, audit: null };
let resp;
let cand = null;
if (['status', 'recommend', 'approve', 'event'].includes(A)) {
  const f = findCandidate(cands, p.target);
  if (f.error) resp = { ok: false, status: 'error', error: f.error, message: f.error === 'ambiguo' ? 'Hay varios prospectos con ese nombre: ' + (f.options || []).join(' · ') + '. Indica el dominio o el id.' : 'No encontré ese prospecto.', options: f.options || [] };
  else cand = f.cand;
}
if (!resp) {
  if (A === 'config') resp = { ok: true, status: 'config', config: safeCfg, message: 'Configuración de LinkedIn.' };
  else if (A === 'list') {
    const ov = linkedinOverview(cands, nowMs);
    const open = cands.filter((c) => c.status === 'in_ghl' && c.ghl_stage === 'investigado' && !((c.channel_state || {}).linkedin));
    const emailActive = new Set(msgs.map((m) => m.candidate_id));
    const recs = open.map((c) => ({ c, r: recommendChannel(c, { suppressedEmails: sup }) }));
    const pick = (ch) => recs.filter((x) => x.r.channel === ch);
    const row = (x) => ({ id: x.c.id, company: x.c.company_name, score: x.c.priority_score, band: x.c.band, channel: x.r.channel, confidence: x.r.confidence, reason: x.r.reason, person: x.r.person, role: x.r.role, url: x.r.linkedin_url, missing: x.r.missing });
    const ready = pick('linkedin').map(row);
    const lines = [];
    lines.push('Canal recomendado (' + open.length + ' en Investigado sin canal elegido): LinkedIn ' + ready.length + ' · correo ' + pick('email').length + ' · investigar más ' + pick('none').length + '.');
    ready.slice(0, 6).forEach((x) => lines.push('• LinkedIn · ' + x.company + ' (' + x.score + ') — ' + (x.person || '') + ', ' + (x.role || '') + '. ' + x.reason));
    const em = pick('email').slice(0, 4).map(row); em.forEach((x) => lines.push('• Correo · ' + x.company + ' (' + x.score + ') — ' + x.reason));
    const nn = pick('none').slice(0, 4).map(row); nn.forEach((x) => lines.push('• Investigar más · ' + x.company + ' — ' + x.reason));
    const pending = ov.rows.filter((r) => r.state);
    if (pending.length) { lines.push('En LinkedIn: ' + pending.map((r) => r.company + ' (' + r.state_label + ')').join(' · ')); }
    lines.push('Modo LinkedIn: ' + safeCfg.linkedin_mode + (safeCfg.linkedin_mode === 'off' ? ' (apagado: nada se inserta en Waalaxy)' : ''));
    resp = { ok: true, status: 'list', text: lines.join('\\n'), counts: ov.counts, ready_for_linkedin: ready, email_ready: pick('email').length, needs_research: pick('none').length, in_linkedin: pending, mode: safeCfg.linkedin_mode, email_active: emailActive.size };
  }
  else if (A === 'status') {
    const rec = recommendChannel(cand, { suppressedEmails: sup });
    const v = linkedinView(cand);
    resp = { ok: true, status: 'status', company: cand.company_name, ghl_stage: cand.ghl_stage, recommendation: { channel: rec.channel, confidence: rec.confidence, reason: rec.reason, missing: rec.missing }, state: v.state, state_label: v.state_label, person: v.person || rec.person, role: v.role || rec.role, url: v.url || rec.linkedin_url,
      last_event: v.last_event, last_event_at: v.last_event_at, next_action: v.next_action, reply: v.reply, import_code: v.import_code, campaign_code: v.campaign_code, approved_channel: v.approved_channel,
      text: cand.company_name + ': ' + (v.state ? 'LinkedIn · ' + v.state_label + (v.next_action ? ' — próxima acción: ' + v.next_action : '') : 'sin canal elegido; recomendado: ' + (rec.channel === 'none' ? 'investigar más' : rec.channel)) + '. ' + rec.reason };
  }
  else if (A === 'recommend') { const r = planRecommend({}, { now: nowMs, candidate: cand, suppressedEmails: sup }); resp = r.response; out.writes = r.writes; out.audit = { tool: 'linkedin_recommend', level: 1 }; }
  else if (A === 'approve') {
    const emailActive = msgs.some((m) => m.candidate_id === cand.id);
    const r = planLinkedinApprove({ confirmation_code: p.confirmation_code, order_text: p.order_text, by: p.by }, { now: nowMs, candidate: cand, config: cfg, suppressedEmails: sup, emailActive, importedToday });
    resp = r.response; out.writes = r.writes; out.effects = r.effects;
    if (r.waalaxy) out.waalaxy = { skip: false, wx: r.waalaxy, body: r.waalaxy.body };
    out.audit = { tool: 'linkedin_approve', level: 3 };
  }
  else if (A === 'event') { const r = planLinkedinEvent({ event: p.event, note: p.note }, { now: nowMs, candidate: cand }); resp = r.response; out.writes = r.writes; out.effects = r.effects; out.audit = { tool: 'linkedin_event', level: 1 }; }
  else if (A === 'set_config') {
    const c = p.cfg_patch || {}, patch = {};
    if (['off', 'test', 'live'].includes(c.linkedin_mode)) patch.linkedin_mode = c.linkedin_mode;
    ['linkedin_list_id', 'linkedin_campaign_id', 'linkedin_test_list_id'].forEach((k) => { if (k in c) patch[k] = c[k] ? String(c[k]).slice(0, 60) : null; });
    if (Number.isFinite(Number(c.linkedin_daily_cap)) && Number(c.linkedin_daily_cap) >= 0 && Number(c.linkedin_daily_cap) <= 25) patch.linkedin_daily_cap = Math.floor(Number(c.linkedin_daily_cap));
    if (Array.isArray(c.linkedin_test_allowlist)) patch.linkedin_test_allowlist = c.linkedin_test_allowlist.map((u) => normLinkedInUrl(u)).filter(Boolean);
    if (patch.linkedin_mode === 'live' && !(patch.linkedin_list_id || cfg.linkedin_list_id)) resp = { ok: false, status: 'error', error: 'live_sin_lista', message: 'No se puede pasar a live sin una lista de producción de Waalaxy.' };
    else if (!Object.keys(patch).length) resp = { ok: false, status: 'error', error: 'sin_cambios', message: 'No hay campos válidos para cambiar.' };
    else { out.writes = [{ method: 'PATCH', path: 'outreach_config?id=eq.1', body: { ...patch, updated_at: nowIso } }]; resp = { ok: true, status: 'config_updated', changed: Object.keys(patch), message: 'Configuración de LinkedIn actualizada.' }; out.audit = { tool: 'linkedin_set_config', level: 3 }; }
  }
  else if (A === 'lists') {
    const rl = node('Waalaxy Lists'), rc = node('Waalaxy Campaigns');
    const lists = (rl.statusCode || 0) < 300 && Array.isArray(rl.body) ? rl.body.map((x) => ({ id: x._id, name: x.name, prospects: x.totalProspects != null ? x.totalProspects : x.total })) : null;
    const camps = (rc.statusCode || 0) < 300 && rc.body && Array.isArray(rc.body.campaigns) ? rc.body.campaigns.map((x) => ({ id: x._id, name: x.name, status: x.status })) : null;
    resp = { ok: lists !== null, status: 'lists', lists, campaigns: camps, error_http: lists === null ? (rl.statusCode || 'sin respuesta') : undefined, message: lists === null ? 'No pude leer Waalaxy (credencial o red).' : 'Listas y campañas (pausadas o en curso) de Waalaxy.' };
  }
  else if (A === 'test') { const rt = node('Waalaxy Test'); resp = { ok: (rt.statusCode || 0) < 300, status: 'test', http: rt.statusCode || null, message: (rt.statusCode || 0) < 300 ? 'Credencial de Waalaxy válida.' : 'La credencial de Waalaxy no responde (revisar en n8n).' }; }
}
return [{ json: { out, resp, cand: cand ? { id: cand.id, company_name: cand.company_name, channel_state: cand.channel_state || {}, canonical: cand.canonical, ghl_opportunity_id: cand.ghl_opportunity_id, ghl_contact_id: cand.ghl_contact_id, last_contact_channel: cand.last_contact_channel } : null, action: A, by: p.by, nowIso } }];`;

export const finishCode = `${LIB}

const c = $('Compute').first().json;
const out = c.out;
let resp = { ...c.resp };
let writes = out.writes.slice(), effects = out.effects.slice();
if (out.waalaxy && !out.waalaxy.skip) {
  const res = $('Waalaxy Import').first().json || {};
  const r = applyWaalaxyResult({ ...c.cand, channel_state: c.cand.channel_state }, out.waalaxy.wx, { statusCode: res.statusCode, body: res.body }, Date.now());
  writes = r.writes; effects = r.effects;
  resp = { ...resp, ok: r.ok, status: r.ok ? 'imported' : 'import_error', executed: true, state: r.state, state_label: liLabel(r.state), message: r.message, import_code: r.import_code, campaign_code: r.campaign_code, waalaxy_prospect_id: r.waalaxy_prospect_id };
}
const audit = out.audit ? [{ method: 'POST', path: 'operator_audit_log', body: { request_id: 'li-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7), actor: c.by, tool: out.audit.tool, level: out.audit.level, entity: c.cand ? { candidate_id: c.cand.id, company: c.cand.company_name } : {}, params: { action: c.action }, status: resp.ok ? 'ok' : 'error', result_summary: String(resp.message || resp.status || '').slice(0, 300) }, prefer: 'return=minimal' }] : [];
const gw = effects.filter((e) => e.type === 'gateway_act' && c.cand).map((e, i) => ({ skip: false, body: { action: 'act', request_id: 'li-' + String(c.cand.id).slice(0, 8) + '-' + e.act.type + '-' + Date.now().toString(36) + '-' + i, source: { type: 'linkedin-engine', name: 'Atacama OS · LinkedIn', reference: c.cand.id }, act: e.act, targets: [c.cand.canonical], options: { by: 'Atacama OS' } } }));
return [{ json: { resp, writes: writes.concat(audit), gw: gw.length ? gw : [{ skip: true, body: {} }] } }];`;

export const respondCode = `const f = $('Finish').first().json;
const bad = $('Apply Writes').all().map((i) => i.json).filter((j) => (j.statusCode || 0) >= 300);
const gwBad = $('Gateway Act').all().map((i) => i.json).filter((j) => (j.statusCode || 0) >= 300);
const r = { ...f.resp };
if (bad.length) { r.persist_error = 'Supabase HTTP ' + bad[0].statusCode + ': ' + JSON.stringify(bad[0].body || {}).slice(0, 160); }
if (gwBad.length) { r.ghl_error = 'Gateway HTTP ' + gwBad[0].statusCode + ': ' + JSON.stringify(gwBad[0].body || {}).slice(0, 160); }
r.safety = { messages_sent: 0, note: 'Waalaxy ejecuta la secuencia; Atacama OS solo inserta prospectos aprobados y registra el estado' };
return [{ json: r }];`;

export function buildLinkedin() {
  const nodes = [
    { id: uuid(), name: 'LI Webhook', type: 'n8n-nodes-base.webhook', typeVersion: 2, position: [0, 0], webhookId: uuid(), credentials: INGEST_CRED, parameters: { httpMethod: 'POST', path: 'atacama-linkedin', authentication: 'headerAuth', responseMode: 'lastNode', options: {} } },
    code('Parse', parseCode, [220, 0]),
    ifNode('Valid?', '!$json.fatal', [400, 0]),
    code('Respond Error', "return [{ json: { ok: false, error: $json.fatal, safety: { messages_sent: 0 } } }];", [620, -180]),
    sbGet('SB Config', '={{ $("Parse").first().json.u.config }}', [600, 0]),
    sbGet('SB Candidates', '={{ $("Parse").first().json.u.cands }}', [800, 0]),
    sbGet('SB Messages', '={{ $("Parse").first().json.u.msgs }}', [1000, 0]),
    sbGet('SB Suppression', '={{ $("Parse").first().json.u.sup }}', [1200, 0]),
    waGet('Waalaxy Lists', '$("Parse").first().json.u.wa_lists', [1400, 0]),
    waGet('Waalaxy Campaigns', '$("Parse").first().json.u.wa_campaigns', [1600, 0]),
    waGet('Waalaxy Test', '$("Parse").first().json.u.wa_test', [1800, 0]),
    code('Compute', computeCode, [2000, 0]),
    { id: uuid(), name: 'Waalaxy Import', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [2200, 0], credentials: WAALAXY_CRED, continueOnFail: true, alwaysOutputData: true,
      parameters: { method: 'POST', url: `={{ $("Compute").first().json.out.waalaxy && !$("Compute").first().json.out.waalaxy.skip ? "${WAALAXY}prospects/addProspectFromIntegration" : "${NONE}" }}`, authentication: 'predefinedCredentialType', nodeCredentialType: 'waalaxyApi', sendHeaders: true, headerParameters: { parameters: [{ name: 'x-req-integration-origin', value: 'n8n' }] },
        sendBody: true, specifyBody: 'json', jsonBody: '={{ JSON.stringify($("Compute").first().json.out.waalaxy ? $("Compute").first().json.out.waalaxy.body : {}) }}', options: full(30000) } },
    code('Finish', finishCode, [2400, 0]),
    code('Expand Writes', `const w = $('Finish').first().json.writes || [];\nif (!w.length) return [{ json: { skip: true } }];\nreturn w.map((x) => ({ json: { skip: false, ...x } }));`, [2600, 0]),
    sbApply('Apply Writes', [2800, 0]),
    code('Expand Gateway', `return ($('Finish').first().json.gw || [{ skip: true, body: {} }]).map((x) => ({ json: x }));`, [3000, 0]),
    { id: uuid(), name: 'Gateway Act', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [3200, 0], credentials: INGEST_CRED, continueOnFail: true, alwaysOutputData: true,
      parameters: { method: 'POST', url: `={{ $json.skip ? "${NONE}" : "${N8N_BASE}/webhook/atacama-prospect-gateway" }}`, authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth', sendBody: true, specifyBody: 'json', jsonBody: '={{ JSON.stringify($json.body || {}) }}', options: full(60000) } },
    code('Respond', respondCode, [3400, 0]),
  ];
  const c = { 'LI Webhook': { main: [to('Parse')] }, 'Parse': { main: [to('Valid?')] }, 'Valid?': { main: [to('SB Config'), to('Respond Error')] },
    'SB Config': { main: [to('SB Candidates')] }, 'SB Candidates': { main: [to('SB Messages')] }, 'SB Messages': { main: [to('SB Suppression')] }, 'SB Suppression': { main: [to('Waalaxy Lists')] },
    'Waalaxy Lists': { main: [to('Waalaxy Campaigns')] }, 'Waalaxy Campaigns': { main: [to('Waalaxy Test')] }, 'Waalaxy Test': { main: [to('Compute')] }, 'Compute': { main: [to('Waalaxy Import')] }, 'Waalaxy Import': { main: [to('Finish')] },
    'Finish': { main: [to('Expand Writes')] }, 'Expand Writes': { main: [to('Apply Writes')] }, 'Apply Writes': { main: [to('Expand Gateway')] }, 'Expand Gateway': { main: [to('Gateway Act')] }, 'Gateway Act': { main: [to('Respond')] } };
  return { name: 'Atacama Labs - 26 LinkedIn Engine', nodes, connections: c, settings: { executionOrder: 'v1' } };
}

if (process.argv[1] && process.argv[1].endsWith('linkedin.mjs')) {
  const out = new URL('../atacama-labs-26-linkedin-engine.json', import.meta.url);
  fs.writeFileSync(out, JSON.stringify(buildLinkedin(), null, 2) + '\n');
  console.log('escrito', out.pathname, '· funciones incrustadas:', LIB.split('\nexport function ').length);
}
