#!/usr/bin/env node
/**
 * Autoprueba del envío REAL de Atacama OS: UN solo correo, a TU propio correo, para verificar Gmail, el hilo, la respuesta y el paso a «Respondió».
 *
 *   node scripts/outreach/self-test.mjs status
 *   node scripts/outreach/self-test.mjs prepare                       # crea el prospecto «Autoprueba Christian Wevar» en Investigado + borrador. NO envía. mode sigue off.
 *   node scripts/outreach/self-test.mjs arm --confirm "<palabras de Christian>"   # SOLO con su autorización explícita: aprueba, activa live restringido y envía UN correo
 *   node scripts/outreach/self-test.mjs sync                          # lee el hilo en Gmail (live restringido) y procesa tu respuesta
 *   node scripts/outreach/self-test.mjs disarm                        # vuelve a mode=off (y cancela cualquier aprobado sin enviar)
 *   node scripts/outreach/self-test.mjs cleanup                       # borra el prospecto de la prueba por id exacto (GHL + Supabase)
 *
 * Barreras: lista blanca de envío (send_allowlist = solo el destinatario de la prueba), daily_cap = 1, se niega a armar si hay otro mensaje
 * aprobado, si falta tu confirmación, o si el borrador cambió. Las claves se leen de .env.local y nunca se imprimen.
 */
import fs from 'node:fs';
import { renderEmail } from './outreach-core.mjs';

const ENV_PATH = new URL('../../.env.local', import.meta.url);
const env = Object.fromEntries(fs.readFileSync(ENV_PATH, 'utf8').split(/\r?\n/).filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).replace(/^["']|["']$/g, '')]));
const N8N = env.N8N_BASE_URL.replace(/\/$/, '');
const SB = env.SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/';
const SBK = env.SUPABASE_SERVICE_ROLE_KEY;
const GHLT = env.GHL_PRIVATE_INTEGRATION_TOKEN2;
const LOC = env.GHL_LOCATION_ID || 'pxHuOsiz2i3lM6BtC9IM';
const ARGS = process.argv.slice(2);
const cmd = ARGS[0] || 'status';
const flag = (n) => { const i = ARGS.indexOf('--' + n); return i >= 0 ? ARGS[i + 1] : null; };

export const SELF = {
  company: 'Autoprueba Christian Wevar',
  sender: 'christian.wevar@atacamalabs.cl',
  recipient: (flag('to') || 'c.wevarh@gmail.com').toLowerCase(),
  subject: 'Autoprueba de Atacama OS: verificación del correo',
  body: 'Hola Christian,\n\nEste es el correo de autoprueba del sistema de envío de Atacama OS: confirma que Gmail, el hilo y el pie de firma funcionan antes de escribirle a ningún prospecto real.\n\nPara probar la detección de respuestas, responde a este correo con la palabra «prueba» (puedes hacerlo desde tu teléfono). En unos minutos la oportunidad de esta autoprueba debería pasar a «Respondió» en GHL.\n\nNo hay nada más que hacer.',
};

const sb = async (path, method = 'GET', body) => { const r = await fetch(SB + path, { method, headers: { apikey: SBK, Authorization: 'Bearer ' + SBK, 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: body ? JSON.stringify(body) : undefined }); const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t.slice(0, 200); } return { s: r.status, j }; };
const hook = async (p, body) => { const r = await fetch(N8N + '/webhook/' + p, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Atacama-Key': env.ATACAMA_INGEST_KEY }, body: JSON.stringify(body) }); const t = await r.text(); try { return { s: r.status, j: JSON.parse(t) }; } catch { return { s: r.status, j: { raw: t.slice(0, 300) } }; } };
const ghl = async (m, p, b) => { const r = await fetch('https://services.leadconnectorhq.com' + p, { method: m, headers: { Authorization: 'Bearer ' + GHLT, Version: '2021-07-28', Accept: 'application/json', ...(b ? { 'Content-Type': 'application/json' } : {}) }, body: b ? JSON.stringify(b) : undefined }); const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = { raw: t.slice(0, 200) }; } return { s: r.status, j }; };
const setCfg = (o) => sb('outreach_config?id=eq.1', 'PATCH', { ...o, updated_at: new Date().toISOString() });
const die = (m) => { console.error('✖ ' + m); process.exit(1); };
const STAGES = { 'aad0ad01-bffd-4ea9-b00c-7ab11dc941f6': 'Nuevo', '2216d3ae-d153-4446-bc3b-77d0a240e415': 'Investigado', 'b947fae7-0941-4296-a76b-e9a826dd47d0': 'Contactado', '38059f54-3ebf-47cd-9a10-126589e61b86': 'Respondió' };

async function cand() { const r = await sb('prospect_candidates?select=*&company_name=eq.' + encodeURIComponent(SELF.company)); return r.j[0] || null; }
async function msgs(c) { return c ? (await sb('outreach_messages?select=*&candidate_id=eq.' + c.id + '&order=created_at.asc')).j : []; }

async function status() {
  const cfg = (await sb('outreach_config?select=*&id=eq.1')).j[0];
  console.log('Configuración:', JSON.stringify({ mode: cfg.mode, paused: cfg.paused, from_email: cfg.from_email, daily_cap: cfg.daily_cap, send_allowlist: cfg.send_allowlist, legal_footer: cfg.legal_footer }));
  const c = await cand();
  if (!c) { console.log('Prospecto de autoprueba: no existe (corre `prepare`).'); return { cfg, c: null }; }
  const ms = await msgs(c);
  let stage = null;
  if (c.ghl_opportunity_id) { const o = await ghl('GET', '/opportunities/' + c.ghl_opportunity_id); const op = o.j.opportunity || o.j; stage = STAGES[op.pipelineStageId] || op.pipelineStageId; }
  console.log('Prospecto:', c.company_name, '| estado:', c.status, '| etapa GHL:', stage);
  ms.forEach((m) => console.log('  ·', m.direction.padEnd(8), m.kind.padEnd(10), m.status.padEnd(9), m.classification || '-', '| hilo:', m.gmail_thread_id || '-', '| para:', m.to_email || '-', '| enviado:', m.sent_at || '-'));
  const approvedOthers = (await sb('outreach_messages?select=id,company_name&status=eq.approved')).j.filter((m) => !c || m.company_name !== SELF.company);
  if (approvedOthers.length) console.log('⚠ Hay otros mensajes aprobados (no de la autoprueba):', approvedOthers.map((m) => m.company_name).join(', '));
  return { cfg, c, ms, stage };
}

async function prepare() {
  if (await cand()) { console.log('La autoprueba ya existe; usa `status`.'); return; }
  const p = { company_name: SELF.company, website: 'https://autoprueba-christian-wevar.invalid', industry: 'Autoprueba interna', location: 'Antofagasta', contact: { name: 'Christian Wevar', role: 'Fundador (autoprueba)', email: SELF.recipient },
    facts: ['Prueba interna del circuito de envío de Atacama OS con un correo propio'], commercial_hypotheses: ['Verificar el envío real, el hilo y la detección de respuestas antes de contactar prospectos'], proposed_solution: 'Autoprueba del motor de correo', evidence_urls: ['https://autoprueba-christian-wevar.invalid'] };
  const r = await hook('atacama-prospect-gateway', { action: 'import', request_id: 'autoprueba-2026-10-08b', source: { type: 'manual', name: 'Autoprueba de envío' }, options: { force_import: true, manual_override_reason: 'Autoprueba del envío real a Christian (no es un prospecto)', by: 'Claude Code · autoprueba', validate: 'none' }, prospects: [p] });
  console.log('Gateway:', r.s, JSON.stringify(r.j.summary), r.j.persist_error || '');
  await new Promise((x) => setTimeout(x, 2000));
  const c = await cand(); if (!c) die('el Gateway no guardó el prospecto de autoprueba');
  const d = await hook('atacama-outreach-engine', { action: 'draft', candidate_id: c.id, kind: 'initial', subject: SELF.subject, body: SELF.body, by: 'Claude Code · autoprueba' });
  console.log('Borrador:', d.j.status, '-', d.j.message);
  if (!d.j.ok) die('no se pudo crear el borrador: ' + (d.j.message || ''));
  await setCfg({ from_email: SELF.sender, from_name: 'Christian Wevar', daily_cap: 1, send_allowlist: [SELF.recipient], legal_footer: 'Atacama Labs · atacamalabs.cl' });
  console.log('Configuración de la prueba lista (mode sigue off): remitente', SELF.sender, '· destinatario autorizado', SELF.recipient, '· tope 1/día');
  const cfgNow = (await sb('outreach_config?select=*&id=eq.1')).j[0];
  const rendered = renderEmail({ subject: SELF.subject, body: SELF.body }, cfgNow);
  console.log('\n--- CORREO EXACTO QUE SE ENVIARÍA ---\nDe: ' + (cfgNow.from_name || 'Christian Wevar') + ' <' + cfgNow.from_email + '>\nPara: ' + SELF.recipient + '\nAsunto: ' + rendered.subject + '\n\n' + rendered.text + '\n--------------------------------------');
}

async function arm() {
  const phrase = flag('confirm'); if (!phrase || phrase.length < 8) die('falta --confirm "<las palabras exactas con las que Christian autorizó el envío de prueba>"');
  const { cfg, c, ms } = await status();
  if (!c) die('primero `prepare`');
  const live = (ms || []).find((m) => m.kind === 'initial' && m.direction === 'outbound');
  if (!live) die('no hay borrador de la autoprueba'); if (live.status === 'sent') die('la autoprueba ya se envió: un solo envío (usa `sync`/`status`)');
  if (live.to_email.toLowerCase() !== SELF.recipient) die('el destinatario del borrador no es el autorizado');
  const others = (await sb('outreach_messages?select=id,company_name&status=in.(approved,sending)')).j.filter((m) => m.company_name !== SELF.company);
  if (others.length) die('hay otros mensajes aprobados/enviándose; no se arma la prueba: ' + others.map((m) => m.company_name).join(', '));
  if (!(cfg.send_allowlist || []).map((x) => x.toLowerCase()).includes(SELF.recipient) || (cfg.send_allowlist || []).length !== 1) die('la lista blanca debe contener solo ' + SELF.recipient);
  if (cfg.paused) die('el sistema está en pausa');
  // 1) aprobar con el código del servidor (dos pasos), con las palabras de Christian
  const a1 = await hook('atacama-outreach-engine', { action: 'approve', candidate_id: c.id, kind: 'initial', by: 'Christian (autoprueba)' });
  if (a1.j.status !== 'confirmation_required') die('no se obtuvo el código de confirmación: ' + JSON.stringify(a1.j).slice(0, 200));
  const a2 = await hook('atacama-outreach-engine', { action: 'approve', candidate_id: c.id, kind: 'initial', confirmation_code: a1.j.confirmation_code, order_text: phrase, by: 'Christian (autoprueba)' });
  if (!a2.j.ok) die('no se pudo aprobar: ' + (a2.j.message || ''));
  console.log('Aprobado:', a2.j.message);
  // 2) activar live restringido SOLO mientras dure la prueba, y enviar UNA vez
  await setCfg({ mode: 'live', daily_cap: 1 });
  console.log('mode = live (restringido: lista blanca de 1 destinatario, tope 1).');
  const s = await hook('atacama-outreach-send-due', { manual: true });
  console.log('Sender:', s.s, JSON.stringify(s.j));
  if (s.j.status !== 'sent') { console.error('✖ no salió; apagando.'); await setCfg({ mode: 'off' }); process.exit(1); }
  console.log('✔ Enviado. El modo sigue en live (restringido) para que Gmail Sync lea tu respuesta. Cuando termines: `disarm`.');
}

async function sync() { const r = await hook('atacama-gmail-sync', {}); console.log('Sync:', r.s, JSON.stringify(r.j)); await status(); }
async function disarm() {
  await setCfg({ mode: 'off' });
  const c = await cand(); if (c) await sb('outreach_messages?candidate_id=eq.' + c.id + '&status=in.(draft,approved)', 'PATCH', { status: 'cancelled', error: 'autoprueba terminada', updated_at: new Date().toISOString() });
  console.log('mode = off. Mensajes pendientes de la autoprueba cancelados. send_allowlist se mantiene (solo tu correo) hasta que se defina el lote real.');
}

async function cleanup() {
  const c = await cand(); if (!c) { console.log('Nada que limpiar.'); return; }
  if (c.company_name !== SELF.company) die('nombre inesperado');
  const ms = await msgs(c);
  if (c.ghl_contact_id) { const t = await ghl('GET', '/contacts/' + c.ghl_contact_id + '/tasks'); for (const x of t.j.tasks || []) await ghl('DELETE', '/locations/' + LOC + '/tasks/' + (x.id || x._id)); }
  if (c.ghl_opportunity_id) console.log('opp', (await ghl('DELETE', '/opportunities/' + c.ghl_opportunity_id)).s);
  if (c.ghl_contact_id) console.log('contacto', (await ghl('DELETE', '/contacts/' + c.ghl_contact_id)).s);
  for (const m of ms) await sb('outreach_messages?id=eq.' + m.id, 'DELETE');
  await sb('prospect_candidates?id=eq.' + c.id, 'DELETE');
  const log = (await sb('prospect_gateway_log?select=id&request_id=like.autoprueba-*')).j; for (const l of log) await sb('prospect_gateway_log?id=eq.' + l.id, 'DELETE');
  console.log('Autoprueba borrada por id exacto (' + ms.length + ' mensajes). El hilo en Gmail queda en tu buzón (puedes archivarlo).');
}

async function preview() {
  const cfgNow = (await sb('outreach_config?select=*&id=eq.1')).j[0];
  const c = await cand(); const live = c ? (await msgs(c)).find((m) => m.kind === 'initial' && m.direction === 'outbound') : null;
  if (!live) die('no hay borrador de la autoprueba (corre `prepare`)');
  const rendered = renderEmail({ subject: live.subject, body: live.body }, cfgNow);
  console.log('Estado del borrador:', live.status, '\nDe: ' + (cfgNow.from_name || 'Christian Wevar') + ' <' + cfgNow.from_email + '>\nPara: ' + live.to_email + '\nAsunto: ' + rendered.subject + '\n\n' + rendered.text);
}

const fns = { status, prepare, preview, arm, sync, disarm, cleanup };
if (!fns[cmd]) die('comando desconocido: ' + cmd);
await fns[cmd]();
