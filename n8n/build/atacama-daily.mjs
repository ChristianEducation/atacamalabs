#!/usr/bin/env node
/**
 * Atacama OS · Bloque H — generador del workflow "10 Atacama Daily".
 *
 * Un resumen operativo por día (08:30, hora de Santiago) con solo excepciones y datos útiles:
 *   VENTAS (pipeline Atacama en GHL + reuniones de hoy) · PROSPECCIÓN (por aprobar, ingesta 24 h, Hermes)
 *   · SISTEMA (workflows fallidos, cola de sync, OpenClaw) · HOY TE TOCA.
 * Clientes, Proyectos y Contenido aparecen solo cuando existan datos reales (objetos de GHL / cuentas
 * sociales conectadas); no se muestran secciones vacías.
 *
 * Variantes:
 *   mode 'preview'    -> webhook con clave que devuelve el texto (sirve para probar; NO envía nada).
 *   mode 'production' -> disparador programado + envío por Telegram (requiere la credencial de Telegram).
 */
import crypto from 'node:crypto';

const uuid = () => crypto.randomUUID();
const SUPABASE = 'https://uwquwjmiofixzugttals.supabase.co';
const PACK = '0ba54785-bff0-4a2d-a397-64e697d34e38';
const PIPELINE = 'trSWhAcNDyUMmPlYIEib';
const LOCATION = 'pxHuOsiz2i3lM6BtC9IM';
const CALENDAR = 'D3CUkoKxRyze3Kpt8sa9';
const SUPABASE_CRED = { supabaseApi: { id: 'XOmXUuyLVSazDIh5', name: 'Atacama Labs - Supabase' } };
const GHL_CRED = { httpHeaderAuth: { id: '8VKPDkZYHtODhRtk', name: 'Atacama Labs - GHL Header Auth' } };
const GHL_CAL_CRED = { httpHeaderAuth: { id: 'MIOyxnOFWOwL1Rvt', name: 'Atacama Labs - GHL Calendars Auth' } };
const out = (timeout = 20000) => ({ response: { response: { fullResponse: true, neverError: true, responseFormat: 'json' } }, timeout });

const supa = (name, url, pos) => ({
  id: uuid(), name, type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: pos, onError: 'continueRegularOutput',
  parameters: { url, authentication: 'predefinedCredentialType', nodeCredentialType: 'supabaseApi', options: out() },
  credentials: SUPABASE_CRED,
});
const ghl = (name, url, pos, cred = GHL_CRED) => ({
  id: uuid(), name, type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: pos, onError: 'continueRegularOutput',
  parameters: { url, authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth', sendHeaders: true,
    headerParameters: { parameters: [{ name: 'Version', value: '2021-07-28' }, { name: 'Accept', value: 'application/json' }] }, options: out() },
  credentials: cred,
});

const COMPOSE = `// Arma el texto del Atacama Daily. Cada fuente puede fallar sin tumbar el resumen: si falta, se avisa en SISTEMA.
const body = (name) => { const r = $(name).first()?.json ?? {}; const ok = Number(r.statusCode) >= 200 && Number(r.statusCode) < 300; return { ok, data: ok ? r.body : null }; };
const tz = 'America/Santiago';
const now = new Date();
const hoursAgo = (iso) => (iso ? (now.getTime() - new Date(iso).getTime()) / 3600000 : null);
const fmtHour = (iso) => new Intl.DateTimeFormat('es-CL', { hour: '2-digit', minute: '2-digit', timeZone: tz, hour12: false }).format(new Date(iso));
const dateLabel = new Intl.DateTimeFormat('es-CL', { weekday: 'short', day: 'numeric', month: 'short', timeZone: tz }).format(now);
const lines = [];
const todo = [];
const problems = [];

// ---- VENTAS (GHL, pipeline Atacama Labs — Ventas)
const opps = body('GHL Opportunities');
const events = body('GHL Meetings Today');
const stageNames = { 'aad0ad01-bffd-4ea9-b00c-7ab11dc941f6': 'Nuevo', '2216d3ae-d153-4446-bc3b-77d0a240e415': 'Investigado', 'b947fae7-0941-4296-a76b-e9a826dd47d0': 'Contactado', '38059f54-3ebf-47cd-9a10-126589e61b86': 'Respondió', 'fec1e794-fb25-4242-806d-f3c13316df6e': 'Diagnóstico', '62d85e18-1bef-44fa-a82d-cf45462d1ae5': 'Propuesta', 'b8d98d33-b593-4b0e-b0da-0aa8ab0ffa4d': 'Seguimiento' };
if (opps.ok) {
  const list = (opps.data.opportunities || []);
  const open = list.filter((o) => o.status === 'open');
  const by = {};
  for (const o of open) { const n = stageNames[o.pipelineStageId] || 'otra'; by[n] = (by[n] || 0) + 1; }
  const newToday = list.filter((o) => hoursAgo(o.createdAt) !== null && hoursAgo(o.createdAt) <= 24).length;
  const won = list.filter((o) => o.status === 'won').length;
  const lost = list.filter((o) => o.status === 'lost').length;
  const order = ['Nuevo', 'Investigado', 'Contactado', 'Respondió', 'Diagnóstico', 'Propuesta', 'Seguimiento'];
  const stages = order.filter((n) => by[n]).map((n) => n + ' ' + by[n]).join(' · ');
  lines.push('VENTAS');
  lines.push('  abiertas ' + open.length + (stages ? ' (' + stages + ')' : '') + (newToday ? ' · nuevas 24 h: ' + newToday : '') + (won ? ' · ganadas ' + won : '') + (lost ? ' · perdidas ' + lost : ''));
  if (by['Nuevo']) todo.push('Contactar ' + by['Nuevo'] + ' lead(s) nuevo(s) del sitio');
  if (by['Respondió']) todo.push('Responder a ' + by['Respondió'] + ' prospecto(s) que respondió');
} else problems.push('GHL oportunidades no disponible');
if (events.ok) {
  const ev = (events.data.events || []).filter((e) => !['cancelled', 'canceled', 'invalid', 'noshow'].includes(String(e.appointmentStatus || '').toLowerCase()));
  if (ev.length) {
    lines.push('  reuniones hoy: ' + ev.map((e) => fmtHour(e.startTime)).join(', '));
    todo.push('Reunión(es) hoy a las ' + ev.map((e) => fmtHour(e.startTime)).join(', '));
  }
} else problems.push('GHL calendario no disponible');

// ---- PROSPECCIÓN (Supabase)
const pend = body('Prospects Pending Approval');
const inbox = body('Prospect Inbox 24h');
const lastIngest = body('Last Hermes Ingest');
const draftsPend = body('Drafts Awaiting');
const pLines = [];
if (pend.ok) {
  const n = pend.data.length;
  if (n) { pLines.push('  por aprobar: ' + n + (pend.data[0]?.accounts?.name ? ' (' + pend.data.slice(0, 3).map((p) => (p.accounts?.name || '?') + ' ' + p.final_score).join(', ') + (n > 3 ? ', …' : '') + ')' : '')); todo.push('Aprobar ' + n + ' prospecto(s) (hot) — ver lista y ids en prospects');
  }
} else problems.push('Supabase prospectos no disponible');
if (inbox.ok && inbox.data.length) {
  const c = (s) => inbox.data.filter((x) => x.status === s).length;
  pLines.push('  ingesta 24 h: ' + c('accepted') + ' aceptados · ' + c('rejected') + ' rechazados · ' + c('duplicate') + ' duplicados');
  const reasons = {};
  for (const x of inbox.data.filter((y) => y.status === 'rejected')) for (const r of (x.reasons || [])) reasons[r.split(':')[0]] = (reasons[r.split(':')[0]] || 0) + 1;
  const top = Object.entries(reasons).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k, v]) => k + ' ×' + v).join(', ');
  if (top) pLines.push('  rechazos más comunes: ' + top);
}
if (draftsPend.ok && draftsPend.data.length) pLines.push('  borradores de correo listos (sin enviar): ' + draftsPend.data.length);
const lastAt = lastIngest.ok && lastIngest.data[0] ? lastIngest.data[0].received_at : null;
if (lastAt) { const h = hoursAgo(lastAt); if (h > 36) problems.push('Hermes sin ingestas hace ' + Math.round(h) + ' h'); else pLines.push('  última ingesta de Hermes: hace ' + (h < 1 ? '<1' : Math.round(h)) + ' h'); }
else pLines.push('  Hermes: aún sin ingestas registradas');
if (pLines.length) { lines.push('PROSPECCIÓN'); lines.push(...pLines); }

// ---- SISTEMA
const failed = body('n8n Failed Executions');
const wfs = body('n8n Workflows');
const sync = body('Sync Jobs Problem');
const oc = $('OpenClaw Health').first()?.json ?? {};
const sLines = [];
if (failed.ok) {
  const recent = (failed.data.data || []).filter((e) => hoursAgo(e.startedAt) !== null && hoursAgo(e.startedAt) <= 24);
  if (recent.length) {
    const names = {}; const map = Object.fromEntries(((wfs.ok ? wfs.data.data : []) || []).map((w) => [w.id, w.name]));
    for (const e of recent) { const n = (map[e.workflowId] || e.workflowId).replace(/^Atacama Labs[ —-]+/, ''); names[n] = (names[n] || 0) + 1; }
    sLines.push('  workflows con error 24 h: ' + recent.length + ' (' + Object.entries(names).slice(0, 3).map(([k, v]) => k + ' ×' + v).join(', ') + ')');
    todo.push('Revisar ' + recent.length + ' ejecución(es) fallida(s) en n8n');
  }
} else problems.push('n8n no disponible');
if (sync.ok && sync.data.length) { sLines.push('  cola de sincronización con problemas: ' + sync.data.length); todo.push('Revisar cola de sync (' + sync.data.length + ')'); }
if (!(Number(oc.statusCode) >= 200 && Number(oc.statusCode) < 300)) problems.push('OpenClaw no responde');
for (const p of problems) sLines.push('  ⚠ ' + p);
if (sLines.length) { lines.push('SISTEMA'); lines.push(...sLines); }

const header = 'ATACAMA DAILY · ' + dateLabel;
const text = [header, ...lines, '', todo.length ? 'HOY TE TOCA\\n' + todo.map((t) => '  • ' + t).join('\\n') : 'HOY: nada urgente.'].join('\\n');
return [{ json: { text, todo, problems } }];`;

export function buildDaily({ mode = 'preview', ingestKeyCredId, n8nApiCredId, telegramCredId = null, chatId = null, webhookId = uuid() }) {
  const n8nApi = (name, url, pos) => ({ id: uuid(), name, type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: pos, onError: 'continueRegularOutput',
    parameters: { url, authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth', options: out(15000) },
    credentials: { httpHeaderAuth: { id: n8nApiCredId, name: 'Atacama Labs - n8n API (lectura)' } } });
  const nodes = [];
  if (mode === 'preview') {
    nodes.push({ id: uuid(), name: 'Preview Webhook', type: 'n8n-nodes-base.webhook', typeVersion: 2, position: [0, 0], webhookId,
      parameters: { httpMethod: 'POST', path: 'atacama-daily-preview', authentication: 'headerAuth', responseMode: 'lastNode', options: {} },
      credentials: { httpHeaderAuth: { id: ingestKeyCredId, name: 'Atacama Labs - Ingest Key' } } });
  } else {
    nodes.push({ id: uuid(), name: 'Every Morning 08:30', type: 'n8n-nodes-base.scheduleTrigger', typeVersion: 1.2, position: [0, 0],
      parameters: { rule: { interval: [{ field: 'cronExpression', expression: '30 8 * * *' }] } } });
  }
  nodes.push(
    ghl('GHL Opportunities', `https://services.leadconnectorhq.com/opportunities/search?location_id=${LOCATION}&pipeline_id=${PIPELINE}&limit=100`, [240, 0]),
    ghl('GHL Meetings Today', `={{ "https://services.leadconnectorhq.com/calendars/events?locationId=${LOCATION}&calendarId=${CALENDAR}&startTime=" + $now.setZone("America/Santiago").startOf("day").toMillis() + "&endTime=" + $now.setZone("America/Santiago").endOf("day").toMillis() }}`, [480, 0], GHL_CAL_CRED),
    supa('Prospects Pending Approval', `${SUPABASE}/rest/v1/prospects?icp_pack_id=eq.${PACK}&classification=eq.hot&crm_candidate=eq.true&status=eq.new&select=id,final_score,accounts(name)&order=final_score.desc&limit=50`, [720, 0]),
    supa('Prospect Inbox 24h', `={{ "${SUPABASE}/rest/v1/prospect_inbox?icp_pack_id=eq.${PACK}&received_at=gte." + new Date(Date.now() - 24 * 3600 * 1000).toISOString() + "&select=status,reasons&limit=500" }}`, [960, 0]),
    supa('Last Hermes Ingest', `${SUPABASE}/rest/v1/prospect_inbox?icp_pack_id=eq.${PACK}&source=eq.hermes&select=received_at&order=received_at.desc&limit=1`, [1200, 0]),
    supa('Drafts Awaiting', `${SUPABASE}/rest/v1/outreach?status=eq.draft&select=id&limit=200`, [1440, 0]),
    supa('Sync Jobs Problem', `={{ "${SUPABASE}/rest/v1/sync_jobs?icp_pack_id=eq.${PACK}&status=in.(failed,retry_wait)&created_at=gte." + new Date(Date.now() - 7 * 86400000).toISOString() + "&select=id,status&limit=50" }}`, [1680, 0]),
    n8nApi('n8n Failed Executions', 'http://localhost:5678/api/v1/executions?status=error&limit=100', [1920, 0]),
    n8nApi('n8n Workflows', 'http://localhost:5678/api/v1/workflows?limit=100', [2160, 0]),
    { id: uuid(), name: 'OpenClaw Health', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [2400, 0], onError: 'continueRegularOutput',
      parameters: { url: 'http://openclaw-gateway:18790/healthz', options: out(6000) } },
    { id: uuid(), name: 'Compose Daily', type: 'n8n-nodes-base.code', typeVersion: 2, position: [2640, 0], parameters: { jsCode: COMPOSE } },
  );
  const chain = nodes.map((n) => n.name);
  if (mode === 'production') {
    nodes.push({ id: uuid(), name: 'Send Telegram', type: 'n8n-nodes-base.telegram', typeVersion: 1.2, position: [2880, 0],
      parameters: { chatId: String(chatId ?? 'CHAT_ID_PENDIENTE'), text: '={{ $json.text }}', additionalFields: { appendAttribution: false } },
      ...(telegramCredId ? { credentials: { telegramApi: { id: telegramCredId, name: 'Atacama Labs - Telegram Bot' } } } : {}) });
    chain.push('Send Telegram');
  }
  const connections = {};
  for (let i = 0; i < chain.length - 1; i++) connections[chain[i]] = { main: [[{ node: chain[i + 1], type: 'main', index: 0 }]] };
  return { name: mode === 'preview' ? 'Atacama Labs - 10 Atacama Daily (PREVIEW)' : 'Atacama Labs - 10 Atacama Daily', nodes, connections, settings: { executionOrder: 'v1', timezone: 'America/Santiago' } };
}
