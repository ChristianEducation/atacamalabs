#!/usr/bin/env node
/**
 * Atacama OS · workflow n8n «25 Atacama Ops» (Bloque 2 — operación diaria automática).
 *
 * POST /webhook/atacama-ops  (X-Atacama-Key)  { action, params?, hermes? }
 *   daily | panel | today | urgent | health | stale | followups | replies | radar_new | content_status | content_performance |
 *   radar_gate | radar_report | content_radar_report | alerts_poll | alerts_ack
 *
 * Es el ÚNICO lugar que calcula el estado del negocio: lee GHL, Supabase, la API de n8n y los datos de Hermes que le entrega su job, y devuelve texto + decisiones.
 * Solo escribe en sus propias tablas (ops_alerts, ops_runs). NO envía mensajes, NO publica, NO toca GHL/Gmail (salvo las lecturas gmail_check). Hermes (cron + Telegram) programa y entrega.
 */
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import * as core from '../../scripts/ops/ops-core.mjs';

const SUPABASE = 'https://uwquwjmiofixzugttals.supabase.co';
export const N8N_BASE = 'https://n8n.srv1650725.hstgr.cloud';
const GHL = 'https://services.leadconnectorhq.com';
const NONE = 'https://localhost.invalid/';
const SUPABASE_CRED = { supabaseApi: { id: 'XOmXUuyLVSazDIh5', name: 'Atacama Labs - Supabase' } };
const INGEST_CRED = { httpHeaderAuth: { id: 'lUGhlXVaQBEiEh5S', name: 'Atacama Labs - Ingest Key' } };
const GHL_CRED = { httpHeaderAuth: { id: '4Vc6nfxyKjZ14Bep', name: 'GHL — Atacama OS' } };
const N8N_CRED = { httpHeaderAuth: { id: 'V2SOaE1TC54lPbJ2', name: 'Atacama Labs - n8n API (lectura)' } };
export const OPS_CFG = {
  tz: 'America/Santiago', ignore_opps: ['Sushi 72', 'Prueba Atacama'], locationId: 'pxHuOsiz2i3lM6BtC9IM', pipelineId: 'trSWhAcNDyUMmPlYIEib',
  stages: { nuevo: 'aad0ad01-bffd-4ea9-b00c-7ab11dc941f6', investigado: '2216d3ae-d153-4446-bc3b-77d0a240e415', contactado: 'b947fae7-0941-4296-a76b-e9a826dd47d0', respondio: '38059f54-3ebf-47cd-9a10-126589e61b86', diagnostico: 'fec1e794-fb25-4242-806d-f3c13316df6e', propuesta: '62d85e18-1bef-44fa-a82d-cf45462d1ae5', seguimiento: 'b8d98d33-b593-4b0e-b0da-0aa8ab0ffa4d' },
};
const uuid = () => randomUUID();
const full = (timeout = 30000) => ({ response: { response: { fullResponse: true, neverError: true, responseFormat: 'json' } }, timeout });
const code = (name, jsCode, pos) => ({ id: uuid(), name, type: 'n8n-nodes-base.code', typeVersion: 2, position: pos, parameters: { jsCode } });
const to = (n) => [{ node: n, type: 'main', index: 0 }];
const ifNode = (name, expr, pos) => ({ id: uuid(), name, type: 'n8n-nodes-base.if', typeVersion: 2.2, position: pos,
  parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' }, combinator: 'and', conditions: [{ leftValue: `={{ (${expr}) ? "yes" : "no" }}`, rightValue: 'yes', operator: { type: 'string', operation: 'equals' } }] }, options: {} } });
const get = (name, urlExpr, cred, credKind, pos, extra) => ({ id: uuid(), name, type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: pos, credentials: cred, continueOnFail: true, alwaysOutputData: true,
  parameters: { method: 'GET', url: urlExpr, ...(credKind === 'supabase' ? { authentication: 'predefinedCredentialType', nodeCredentialType: 'supabaseApi' } : { authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth' }),
    ...(extra && extra.headers ? { sendHeaders: true, headerParameters: { parameters: extra.headers } } : {}), options: full(extra && extra.timeout) } });
const u = (k) => `={{ $("Parse").first().json.u.${k} }}`;
const sbApply = (name, pos) => ({ id: uuid(), name, type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: pos, credentials: SUPABASE_CRED, continueOnFail: true, alwaysOutputData: true,
  parameters: { method: '={{ $json.method || "POST" }}', url: `={{ $json.skip ? "${NONE}" : "${SUPABASE}/rest/v1/" + $json.path }}`, authentication: 'predefinedCredentialType', nodeCredentialType: 'supabaseApi', sendHeaders: true,
    headerParameters: { parameters: [{ name: 'Prefer', value: '={{ $json.prefer || "return=minimal" }}' }] }, sendBody: true, specifyBody: 'json', jsonBody: '={{ JSON.stringify($json.body || {}) }}', options: full() } });
const GH_HEADERS = [{ name: 'Version', value: '2021-07-28' }, { name: 'Accept', value: 'application/json' }];

export const LIB = [...new Map(Object.values(core).filter((f) => typeof f === 'function').map((f) => [f.name, f])).values()].map((f) => f.toString()).join('\n\n');
const CFG_JSON = JSON.stringify({ tz: OPS_CFG.tz, stages: OPS_CFG.stages, ignore_opps: OPS_CFG.ignore_opps });

export const ACTIONS = ['daily', 'today', 'urgent', 'health', 'stale', 'followups', 'replies', 'radar_new', 'content_status', 'content_performance', 'panel', 'radar_gate', 'content_gate', 'radar_report', 'content_radar_report', 'alerts_poll', 'alerts_ack'];

export const parseCode = `try {
  const first = $('Ops Webhook').first().json || {};
  const b = first.body || first;
  const action = String(b.action || '').toLowerCase();
  const ACTIONS = ${JSON.stringify(ACTIONS)};
  if (!ACTIONS.includes(action)) throw new Error('action inválida: usa ' + ACTIONS.join(' | '));
  const dry = b.dry_run === true;
  // la hora solo se puede simular en consultas de lectura o con dry_run (pruebas); las escrituras siempre usan la hora real
  const now = Number.isFinite(Number(b.now_ms)) && (dry || ['daily', 'today', 'urgent', 'health', 'stale', 'followups', 'replies', 'radar_new', 'content_status', 'content_performance', 'panel', 'radar_gate', 'content_gate'].includes(action)) ? Number(b.now_ms) : Date.now();
  const need = {
    sb: !['alerts_ack'].includes(action) || true,
    ghl: ['daily', 'today', 'urgent', 'stale', 'replies', 'panel'].includes(action),
    n8n: ['daily', 'today', 'urgent', 'health', 'alerts_poll', 'panel'].includes(action),
    deep: (action === 'health' && b.deep === true) || (action === 'alerts_poll' && b.deep_gmail === true) || (action === 'daily' && b.deep === true),
    learn: action === 'content_performance',
    panel: action === 'panel',
  };
  const sb = '${SUPABASE}/rest/v1/', none = '${NONE}';
  const iso = (ms) => new Date(ms).toISOString();
  const n8n = '${N8N_BASE}/api/v1/';
  const u = {
    messages: sb + 'outreach_messages?created_at=gte.' + iso(now - 45 * 86400000) + '&select=id,candidate_id,company_name,kind,direction,status,classification,subject,body,sent_at,created_at,metadata&order=created_at.desc&limit=700',
    cands: sb + 'prospect_candidates?status=in.(in_ghl,accepted,contacted)&select=id,company_name,status,band,priority_score,source_name,created_at,ghl_stage,ghl_opportunity_id,ghl_contact_id,next_action_at,industry,location,domain,angle:canonical->>outreach_angle,quote:canonical->evidence_quotes->0->>quote&order=created_at.desc&limit=400',
    pieces: sb + 'content_pieces?select=id,topic,channel,status,ghl_status,ghl_approval_status,scheduled_at,published_at,is_test,learning,learned_at,created_at,format,category,score,hook:piece->>hook&order=created_at.desc&limit=80',
    metrics: sb + 'content_metrics?captured_at=gte.' + iso(now - 30 * 86400000) + '&select=content_piece_id,metric_window,status,likes,comments,shares,captured_at&order=captured_at.desc&limit=200',
    signals: sb + 'content_sources?signal_status=eq.candidate&select=id,title,created_at,signal_type,angle:signal->>angle&order=created_at.desc&limit=200',
    review: need.panel ? sb + 'content_pieces?is_test=eq.false&status=in.(in_review,drafted,scored,scheduled,approved)&select=id,status,score,rationale,ghl_post_id,scheduled_at,piece&order=created_at.desc&limit=10' : none,
    alerts: sb + 'ops_alerts?select=*&order=last_seen_at.desc&limit=200',
    runs: sb + 'ops_runs?select=*&order=created_at.desc&limit=40',
    config: sb + 'outreach_config?id=eq.1&select=mode,paused,send_allowlist,daily_cap',
    opps: need.ghl ? '${GHL}/opportunities/search?location_id=${OPS_CFG.locationId}&pipeline_id=${OPS_CFG.pipelineId}&status=open&limit=100' : none,
    tasks: need.ghl ? '${GHL}/locations/${OPS_CFG.locationId}/tasks/search' : none,
    wfs: need.n8n ? n8n + 'workflows?limit=100' : none,
    errors: need.n8n ? n8n + 'executions?status=error&limit=100' : none,
    gmail: need.deep ? '${N8N_BASE}/webhook/' : none,
    learn: need.learn ? '${N8N_BASE}/webhook/atacama-content-learnings' : none,
  };
  return [{ json: { action, params: b.params && typeof b.params === 'object' ? b.params : {}, hermes: b.hermes && typeof b.hermes === 'object' ? b.hermes : null, keys: Array.isArray(b.keys) ? b.keys.map(String).slice(0, 50) : [], report: b.report && typeof b.report === 'object' ? b.report : {}, dry, now, need, u } }];
} catch (e) { return [{ json: { fatal: String((e && e.message) || e) } }]; }`;

export const expandExecsCode = `${LIB}

const p = $('Parse').first().json;
if (!p.need.n8n) return [{ json: { skip: true, url: '${NONE}' } }];
return monitoredWorkflows().map((w) => ({ json: { skip: false, wf_id: w.id, url: '${N8N_BASE}/api/v1/executions?workflowId=' + w.id + '&limit=5' } }));`;

export const computeCode = `${LIB}

const CFG = ${CFG_JSON};
const p = $('Parse').first().json;
const node = (n) => { try { return $(n).first().json || {}; } catch (e) { return {}; } };
const arr = (n) => { const x = node(n); return (x.statusCode || 0) < 300 && Array.isArray(x.body) ? x.body : []; };
const ok = (n) => { const x = node(n); return (x.statusCode || 0) >= 200 && (x.statusCode || 0) < 300; };
const missing = [];
if (!ok('SB Messages') || !ok('SB Candidates')) missing.push('supabase');
if (p.need.ghl && !(ok('GHL Opps') && ok('GHL Tasks'))) missing.push('ghl');
if (p.need.n8n && !ok('N8N Workflows')) missing.push('n8n');
const wfBody = node('N8N Workflows').body;
const workflows = p.need.n8n && wfBody && Array.isArray(wfBody.data) ? wfBody.data.map((w) => ({ id: w.id, name: String(w.name || '').replace(/^Atacama Labs\\s*[-—]\\s*/, ''), active: w.active === true })) : [];
const nameOf = {}; workflows.forEach((w) => { nameOf[w.id] = w.name; });
const execs = {};
if (p.need.n8n) { const ex = $('Expand Execs').all().map((i) => i.json); const res = $('N8N Execs').all().map((i) => i.json || {}); ex.forEach((e, i) => { if (e.skip) return; const r = res[i] || {}; execs[e.wf_id] = (r.statusCode || 0) < 300 && r.body && Array.isArray(r.body.data) ? r.body.data.map((x) => ({ status: x.status, startedAt: x.startedAt })) : []; }); }
const errBody = node('N8N Errors').body;
const errCount = {};
(p.need.n8n && errBody && Array.isArray(errBody.data) ? errBody.data : []).filter((e) => p.now - Date.parse(e.startedAt) <= 24 * 3600000).forEach((e) => { const nm = nameOf[e.workflowId] || ('workflow ' + e.workflowId); errCount[nm] = (errCount[nm] || 0) + 1; });
const errors24h = Object.keys(errCount).map((k) => ({ name: k, count: errCount[k] })).sort((a, b) => b.count - a.count);
const gb = (n) => { const x = node(n); return (x.statusCode || 0) < 300 && x.body && typeof x.body === 'object' ? x.body : null; };
const gmail = p.need.deep ? { w22: gb('Gmail Check 22'), w23: gb('Gmail Check 23') } : null;
const oppBody = node('GHL Opps').body, taskBody = node('GHL Tasks').body;
const d = { now: p.now, cfg: CFG, opps: p.need.ghl && oppBody && Array.isArray(oppBody.opportunities) ? oppBody.opportunities : [], tasks: p.need.ghl && taskBody && Array.isArray(taskBody.tasks) ? taskBody.tasks : [],
  messages: arr('SB Messages'), candidates: arr('SB Candidates'), pieces: arr('SB Pieces'), metrics: arr('SB Metrics'), signals_candidate: arr('SB Signals').length, signals_list: arr('SB Signals'), review_pieces: arr('SB Review Pieces'), alerts: arr('SB Alerts'), runs: arr('SB Runs'), outreach: arr('SB Config')[0] || null,
  workflows, execs, errors24h, hermes: p.hermes, gmail, missing };
const A = p.action, writes = [], nowIso = new Date(p.now).toISOString();
if (!d.hermes) { const hs = d.alerts.find((a) => a.alert_key === '_state:hermes'); if (hs && hs.meta && Array.isArray(hs.meta.jobs) && p.now - Date.parse(hs.last_seen_at) < 40 * 60000) d.hermes = hs.meta; }
let out;
if (A === 'daily') { const r = composeDaily(d); const br = composeBrief(d); out = { text: r.text, brief: br.text, action_count: r.action_count, review_count: r.review_count }; }
else if (A === 'panel') { out = { panel: composePanel(d) }; }
else if (A === 'today') { out = composeToday(d); }
else if (A === 'urgent') { out = composeUrgent(d); }
else if (A === 'health') { const h = healthReport(d); out = { text: healthText(h) + (errors24h.length ? '\\nEjecuciones fallidas en 24 h: ' + errors24h.slice(0, 6).map((e) => e.name + ' (' + e.count + ')').join(', ') : '') + (missing.length ? '\\n⚠ ' + missingNotes(d).join(' ') : ''), overall: h.overall, components: h.components, errors24h }; }
else if (A === 'stale') { out = composeStale(d); }
else if (A === 'followups') { out = composeFollowups(d); }
else if (A === 'replies') { out = composeReplies(d); }
else if (A === 'radar_new') { out = composeRadarNew(d); }
else if (A === 'content_status') { out = composeContentStatus(d); }
else if (A === 'content_performance') { const perf = composePerformance(d); const lb = gb('Learnings'); const le = composeLearnings(lb); out = { text: perf.text + '\\n\\n' + le.text, pieces: perf.pieces }; }
else if (A === 'radar_gate') { out = radarGate(d); out.text = 'Radar: ' + out.mode + ' — ' + out.reason; }
else if (A === 'content_gate') { out = contentGate(d); out.text = 'Content Radar: ' + out.mode + ' — ' + out.reason; }
else if (A === 'radar_report' || A === 'content_radar_report') {
  const r = p.report || {};
  const row = { kind: A === 'radar_report' ? 'prospect_radar' : 'content_radar', status: ['ok', 'skipped', 'error'].includes(r.status) ? r.status : 'ok', summary: { mode: String(r.mode || ''), reason: String(r.reason || '').slice(0, 300), searches: Number(r.searches) || 0, pages_opened: Number(r.pages_opened) || 0, candidates: Number(r.candidates) || 0, imported: Number(r.imported) || 0, minutes: Number(r.minutes) || 0 }, est_cost_usd: Number.isFinite(Number(r.est_cost_usd)) ? Number(r.est_cost_usd) : null, started_at: nowIso };
  writes.push({ method: 'POST', path: 'ops_runs', body: row, prefer: 'return=minimal' });
  out = { text: 'Corrida registrada (' + row.kind + ', ' + row.status + ').', recorded: row.kind };
}
else if (A === 'alerts_poll') {
  const ev = evaluateAlerts(d, d.alerts);
  ev.upserts.forEach((a) => {
    if (a.op === 'insert') writes.push({ method: 'POST', path: 'ops_alerts?on_conflict=alert_key', body: { alert_key: a.key, severity: a.severity, title: a.title, detail: a.detail, event: a.event, status: 'open', first_seen_at: nowIso, last_seen_at: nowIso, last_notified_at: null, notify_count: 0, resolved_at: null, meta: a.meta || {} }, prefer: 'resolution=merge-duplicates,return=minimal' });
    else writes.push({ method: 'PATCH', path: 'ops_alerts?alert_key=eq.' + encodeURIComponent(a.key), body: { last_seen_at: nowIso, severity: a.severity, title: a.title, detail: a.detail } });
  });
  if (p.hermes && Array.isArray(p.hermes.jobs)) writes.push({ method: 'POST', path: 'ops_alerts?on_conflict=alert_key', body: { alert_key: '_state:hermes', severity: 'info', title: 'estado de Hermes', detail: '', event: true, status: 'resolved', first_seen_at: nowIso, last_seen_at: nowIso, notify_count: 1, resolved_at: nowIso, meta: p.hermes }, prefer: 'resolution=merge-duplicates,return=minimal' });
  ev.resolve.forEach((k) => writes.push({ method: 'PATCH', path: 'ops_alerts?alert_key=eq.' + encodeURIComponent(k), body: { status: 'resolved', resolved_at: nowIso } }));
  out = { text: alertsText(ev.notify), notify_keys: ev.notify.map((n) => n.key), count: ev.notify.length, resolved: ev.resolve, open_now: ev.current.length, health: ev.health };
}
else if (A === 'alerts_ack') {
  const byKey = {}; d.alerts.forEach((a) => { byKey[a.alert_key] = a; });
  p.keys.forEach((k) => { const row = byKey[k]; if (!row) return; writes.push({ method: 'PATCH', path: 'ops_alerts?alert_key=eq.' + encodeURIComponent(k), body: { last_notified_at: nowIso, notify_count: (row.notify_count || 0) + 1, ...(row.event ? { status: 'resolved', resolved_at: nowIso } : {}) } }); });
  out = { text: 'Confirmadas ' + writes.length + ' alertas.', acked: writes.length };
}
return [{ json: { out: { ok: true, action: A, missing, ...out }, writes: p.dry ? [] : writes, dry: p.dry } }];`;

export const respondCode = `const c = $('Compute').first().json;
const bad = $('Apply Writes').all().map((i) => i.json).filter((j) => (j.statusCode || 0) >= 300);
const r = { ...c.out };
if (bad.length) { r.ok = false; r.persist_error = 'Supabase HTTP ' + bad[0].statusCode + ': ' + JSON.stringify(bad[0].body || {}).slice(0, 160); }
if (c.dry) r.dry_run = true;
r.safety = { messages_sent: 0, writes: 'solo ops_alerts/ops_runs' };
return [{ json: r }];`;

export function buildOps() {
  const nodes = [
    { id: uuid(), name: 'Ops Webhook', type: 'n8n-nodes-base.webhook', typeVersion: 2, position: [0, 0], webhookId: uuid(), credentials: INGEST_CRED, parameters: { httpMethod: 'POST', path: 'atacama-ops', authentication: 'headerAuth', responseMode: 'lastNode', options: {} } },
    code('Parse', parseCode, [220, 0]),
    ifNode('Valid?', '!$json.fatal', [400, 0]),
    code('Respond Error', "return [{ json: { ok: false, error: $json.fatal, safety: { messages_sent: 0 } } }];", [620, -180]),
    get('SB Messages', u('messages'), SUPABASE_CRED, 'supabase', [600, 0]),
    get('SB Candidates', u('cands'), SUPABASE_CRED, 'supabase', [800, 0]),
    get('SB Pieces', u('pieces'), SUPABASE_CRED, 'supabase', [1000, 0]),
    get('SB Metrics', u('metrics'), SUPABASE_CRED, 'supabase', [1200, 0]),
    get('SB Signals', u('signals'), SUPABASE_CRED, 'supabase', [1400, 0]),
    get('SB Review Pieces', u('review'), SUPABASE_CRED, 'supabase', [1500, 0]),
    get('SB Alerts', u('alerts'), SUPABASE_CRED, 'supabase', [1600, 0]),
    get('SB Runs', u('runs'), SUPABASE_CRED, 'supabase', [1800, 0]),
    get('SB Config', u('config'), SUPABASE_CRED, 'supabase', [2000, 0]),
    get('GHL Opps', u('opps'), GHL_CRED, 'ghl', [2200, 0], { headers: GH_HEADERS }),
    { id: uuid(), name: 'GHL Tasks', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [2400, 0], credentials: GHL_CRED, continueOnFail: true, alwaysOutputData: true,
      parameters: { method: 'POST', url: u('tasks'), authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth', sendHeaders: true, headerParameters: { parameters: GH_HEADERS }, sendBody: true, specifyBody: 'json', jsonBody: '={{ JSON.stringify({ completed: false, limit: 100 }) }}', options: full() } },
    get('N8N Workflows', u('wfs'), N8N_CRED, 'n8n', [2600, 0]),
    get('N8N Errors', u('errors'), N8N_CRED, 'n8n', [2800, 0]),
    code('Expand Execs', expandExecsCode, [3000, 0]),
    get('N8N Execs', '={{ $json.skip ? "' + NONE + '" : $json.url }}', N8N_CRED, 'n8n', [3200, 0]),
    { id: uuid(), name: 'Gmail Check 22', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [3400, 0], credentials: INGEST_CRED, continueOnFail: true, alwaysOutputData: true,
      parameters: { method: 'POST', url: `={{ $("Parse").first().json.need.deep ? $("Parse").first().json.u.gmail + "atacama-outreach-send-due" : "${NONE}" }}`, authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth', sendBody: true, specifyBody: 'json', jsonBody: '={{ JSON.stringify({ gmail_check: true }) }}', options: full(45000) } },
    { id: uuid(), name: 'Gmail Check 23', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [3600, 0], credentials: INGEST_CRED, continueOnFail: true, alwaysOutputData: true,
      parameters: { method: 'POST', url: `={{ $("Parse").first().json.need.deep ? $("Parse").first().json.u.gmail + "atacama-gmail-sync" : "${NONE}" }}`, authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth', sendBody: true, specifyBody: 'json', jsonBody: '={{ JSON.stringify({ gmail_check: true }) }}', options: full(45000) } },
    get('Learnings', u('learn'), INGEST_CRED, 'ingest', [3800, 0]),
    code('Compute', computeCode, [4000, 0]),
    code('Expand Writes', `const w = $('Compute').first().json.writes || [];\nif (!w.length) return [{ json: { skip: true } }];\nreturn w.map((x) => ({ json: { skip: false, ...x } }));`, [4200, 0]),
    sbApply('Apply Writes', [4400, 0]),
    code('Respond', respondCode, [4600, 0]),
  ];
  // Learnings se llama con la clave de ingesta (misma credencial que los demás webhooks internos)
  const c = { 'Ops Webhook': { main: [to('Parse')] }, 'Parse': { main: [to('Valid?')] }, 'Valid?': { main: [to('SB Messages'), to('Respond Error')] },
    'SB Messages': { main: [to('SB Candidates')] }, 'SB Candidates': { main: [to('SB Pieces')] }, 'SB Pieces': { main: [to('SB Metrics')] }, 'SB Metrics': { main: [to('SB Signals')] }, 'SB Signals': { main: [to('SB Review Pieces')] }, 'SB Review Pieces': { main: [to('SB Alerts')] },
    'SB Alerts': { main: [to('SB Runs')] }, 'SB Runs': { main: [to('SB Config')] }, 'SB Config': { main: [to('GHL Opps')] }, 'GHL Opps': { main: [to('GHL Tasks')] }, 'GHL Tasks': { main: [to('N8N Workflows')] },
    'N8N Workflows': { main: [to('N8N Errors')] }, 'N8N Errors': { main: [to('Expand Execs')] }, 'Expand Execs': { main: [to('N8N Execs')] }, 'N8N Execs': { main: [to('Gmail Check 22')] },
    'Gmail Check 22': { main: [to('Gmail Check 23')] }, 'Gmail Check 23': { main: [to('Learnings')] }, 'Learnings': { main: [to('Compute')] }, 'Compute': { main: [to('Expand Writes')] }, 'Expand Writes': { main: [to('Apply Writes')] }, 'Apply Writes': { main: [to('Respond')] } };
  return { name: 'Atacama Labs - 25 Atacama Ops', nodes, connections: c, settings: { executionOrder: 'v1' } };
}

if (process.argv[1] && process.argv[1].endsWith('ops.mjs')) {
  const out = new URL('../atacama-labs-25-atacama-ops.json', import.meta.url);
  fs.writeFileSync(out, JSON.stringify(buildOps(), null, 2) + '\n');
  console.log('escrito', out.pathname, '· funciones incrustadas:', LIB.split('\nexport function ').length);
}
