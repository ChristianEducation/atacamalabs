#!/usr/bin/env node
/**
 * Atacama OS · /ops V2 — pruebas de interfaz (Playwright) contra un n8n SIMULADO.
 *
 *   node scripts/ops/ui-tests.mjs
 *
 * Levanta (1) un servidor que imita los webhooks de n8n (atacama-ops y atacama-ops-actions) con datos de prueba y registra cada llamada,
 * y (2) `next dev` en otro puerto apuntando a ese servidor, con un PIN y claves de prueba. NO toca producción: ni n8n, ni Supabase, ni GHL,
 * ni Gmail, ni Waalaxy; no se envía ni se publica nada real. Valida sesión, navegación, deep links, menú móvil, paridad de información,
 * edición/guardado/aprobación de correos, LinkedIn, contenido, doble toque, errores del backend y que no se filtren claves al navegador.
 */
import http from 'node:http';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MOCK_PORT = 4599, APP_PORT = 3111, PIN = '123456', OPS_KEY = 'test-ops-key-1234567890', INGEST_KEY = 'test-ingest-key-1234567890';
const APP = `http://localhost:${APP_PORT}`;

const SHOTS = process.env.SHOTS || '';   // SHOTS=carpeta guarda capturas de revisión visual (no es parte de las pruebas)
const shot = async (page, name) => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, name + '.png'), fullPage: false }); };
let pass = 0, fail = 0;
const t = (n, c, x = '') => { c ? pass++ : fail++; console.log(c ? 'ok  ' : 'FAIL', n, c ? '' : String(x).slice(0, 300)); };

// ------------------------------------------------------------------ datos simulados
const ISO = (h) => new Date(Date.now() + h * 3600000).toISOString();
const UID = (n) => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const card = (n, status, o = {}) => ({ id: UID(n), candidate_id: UID(100 + n), kind: 'initial', company: 'Empresa ' + n, contact_name: 'Contacto ' + n, contact_role: 'Gerente', to: `contacto${n}@empresa${n}.cl`, subject: 'Una idea para Empresa ' + n, body: `Hola equipo ${n},\n\nRevisé su sitio y creo que podemos ordenar su recepción con un agente.\n\n¿Les sirve verlo en 15 minutos?`,
  status, editable: status === 'draft', can_reopen: status === 'approved', can_approve: status === 'draft', can_reject: status === 'draft' || status === 'approved', hash: 'hash000' + n, created_at: ISO(-n), updated_at: ISO(-n), approved_at: status === 'approved' ? ISO(-1) : null, approved_by: status === 'approved' ? 'Christian via /ops' : null,
  scheduled_for: status === 'approved' ? ISO(2) : null, sent_at: status === 'sent' ? ISO(-3) : null, error: null, score: 90 - n, band: 'alta', reason: 'Recepción repite las mismas preguntas', evidence: 'agenda online', recommended_channel: 'email', suppressed: false, rejected_reason: null, ...o });
const COLD3 = { score: 86, level: 'bueno', warnings: ['La apertura se parece a otro correo'], rewards: ['Usa la evidencia investigada.'], similarity: { max: 0.12, with: 'Empresa 9' }, cta_kind: 'example', words: 72, evidence: ['Dos sedes con agenda por WhatsApp'], insight: 'Recepción averigua la sede', friction: 'Consultas sin sede', angle: 'Ordenar antes de responder', cta_reason: 'Ofrecer un ejemplo baja la fricción', linted_at: ISO(-1) };
const PREV3 = { subject: 'Una idea para Empresa 3', body: 'Texto ANTERIOR plantilla: Vi que atienden dos sedes. Mi hipótesis es que...', score: 8, at: ISO(-5), by: 'Hermes', reason: 'Cold Email v2', versions: 1 };
const CARDS = [card(1, 'draft'), card(2, 'draft'), card(3, 'draft', { cold: COLD3, previous: PREV3 }), card(4, 'approved'), card(5, 'sending'), card(6, 'sent'), card(7, 'cancelled', { rejected_reason: 'Muy genérico' })];
const LI_READY = [{ candidate_id: UID(201), company: 'Persona SpA', person: 'Ana Pérez', role: 'Gerente General', url: 'https://www.linkedin.com/in/ana-perez', score: 80, band: 'alta', angle: 'Agendamiento', fact: 'Reservas por WhatsApp', reason: 'Persona identificada con perfil verificable', list_id: 'L1', campaign_id: 'C1', source: 'https://persona.cl/equipo' }];
const LI_SENT = [{ candidate_id: UID(301), company: 'Enviada Ltda', person: 'Eva Ríos', role: 'Directora', url: 'https://www.linkedin.com/in/eva', approved_by: 'Christian via /ops', approved_at: ISO(-2), imported_at: ISO(-2), list_id: '6ac66b417b5c4af5e7c260e4', campaign_id: '6ac6fd0277c561efd0331116', score: 85, angle: 'A', state: 'en_campana', state_label: 'En campaña (conexión)', last_event: 'alta_en_campana', last_event_at: ISO(-2), import_code: 'success', campaign_code: 'success', mode_at_import: 'live' }];
const overview = () => ({ ok: true, action: 'overview', generated_at: new Date().toISOString(), email: { mode: 'live', paused: false, cap: 5, sent_today: 1, window: '09:00–17:30', cards: state.cards }, linkedin: { mode: 'live', cap: 10, imported_today: 1, counts: { pendiente: 0, en_lista: 0, en_campana: 1, conexion: 0, mensaje: 0, followup: 0, respondio: 0, rechazo: 0, error: 0 }, ready: LI_READY, sent: LI_SENT } });
const preview = (o = {}) => ({ hook: 'Un hook claro', body: 'Cuerpo del post con una idea concreta.', cta: 'Más en atacamalabs.cl', hashtags: ['#automatización'], slides: [], media: [], sources: [{ title: 'Fuente oficial', url: 'https://example.com/f' }], rationale: 'Por qué se eligió', format: 'texto', proposed_at: ISO(30), proposed_label: 'sáb 10 oct 10:00', ghl_post: true, ...o });
const PIECES = [{ id: UID(401), title: 'API Gateway convierte APIs en herramientas MCP', channel: 'LinkedIn Atacama Labs', status: 'in_review', hook: 'x', format: 'texto', category: 'Noticia', score: 85, at: ISO(30), at_label: 'sáb 10 oct 10:00', preview: preview() },
  { id: UID(402), title: 'Carrusel sobre compactación', channel: 'Instagram Atacama', status: 'in_review', hook: 'y', format: 'carrusel', category: 'Educativo', score: 79, at: ISO(60), at_label: 'lun 12 oct 12:30', preview: preview({ format: 'carrusel', media: ['https://example.com/1.png', 'https://example.com/2.png', 'https://example.com/3.png'] }) }];
const PR = (n, o = {}) => ({ id: UID(500 + n), company: 'Prep ' + n, score: 80 - n, band: 'alta', state: 'sin_accion', label: 'Sin acción', reason: '', person: 'Persona ' + n, role: 'Gerente', email: null, email_kind: null, linkedin: null, priority: null, message_id: null, score_mail: null, li: null, find: null, ...o });
const prepData = () => ({
  counts: { email_listo: 3, email_aprobado: 1, linkedin_listo: 1, linkedin_en_curso: 0, waalaxy: 0, buscar_contacto: 1, en_espera: 1, no_contactar: 0, sin_accion: 2, contactado: 4, respondio: 0, otro: 0 },
  lists: {
    email_listo: [PR(1, { state: 'email_listo', email: 'ana@prep1.cl', email_kind: 'direct', score_mail: 88 })], email_aprobado: [], linkedin_listo: [PR(2, { state: 'linkedin_listo', li: { status: 'ready', profile_url: 'https://www.linkedin.com/in/prep-dos', invitation: 'Hola Prep, te vi en Leads Pro. Me gustaría conectar.', message: 'Mensaje preparado para después de conectar, con una pregunta concreta.', prepared_at: ISO(-1), invite_sent_at: null, message_sent_at: null, follow_up_at: null } })],
    linkedin_en_curso: [], waalaxy: [], buscar_contacto: [PR(3, { state: 'buscar_contacto', reason: 'Sin correo ni LinkedIn público', find: { draft: { subject: 'una consulta', body: 'Mensaje ya redactado para Prep 3, solo falta el contacto.' }, at: ISO(-2) } })],
    en_espera: [PR(4, { state: 'en_espera', reason: 'Prioridad B: se contacta después de avanzar con los A', priority: 'B' })], no_contactar: [], sin_accion: [PR(5), PR(6)] },
  valid_unactioned: 2, investigated: 8, sent_today: 1, replies_7d: 0, followup_drafts: 0, generated_at: new Date().toISOString(), autosend: { enabled: state.autosend === true, min_score: 80, updated_at: null } });
const FICHA = { audience_insight: 'Dueños de clínicas', core_message: 'Empieza por lo repetitivo', structure: [{ text: 'Portada' }, { text: 'Tres señales' }, { text: 'Cierre' }], cta: 'Comenta PROCESO', production: { tools: ['composer'], how: 'Carrusel en la VPS', lane: 'vps' }, resource_id: null, keyword: 'PROCESO', cost_note: null, risks: 'Que suene genérico', why: 'Encuesta reciente', evidence: [{ type: 'source', id: 's1', note: 'Encuesta', url: 'https://example.com/e' }], competitor_ref: null, angle: null };
const IDEA = (n, o = {}) => ({ id: UID(700 + n), week_start: '2026-10-26', channel: 'instagram', channel_label: 'Instagram', format: 'carrusel', title: 'Idea de prueba ' + n, hook: 'Gancho ' + n, objective: 'educar', effort: 'medio', primary_metric: 'saves', score: 88 - n, status: 'proposed', origin: 'hermes', ficha_complete: true, deadline: { state: 'alcanza', label: 'Alcanza', left: 5, need: 2, closing: '2026-10-23' }, change_request: null, decision_reason: null, lane: 'vps', piece_id: null, ficha: FICHA, ...o });
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const TPIECE = (n, o = {}) => ({ id: UID(800 + n), title: 'Pieza de prueba ' + n, channel: 'instagram', channel_label: 'Instagram', format: 'carrusel', lane: 'vps', status: 'para_revisar', status_label: 'Para revisar', week_start: '2026-10-26', needs_by: ISO(48), current_version: 2, credits: 21, thumb: PNG,
  scheduled_at: null, ghl_post_id: null, proposed_slot: '2026-10-27T18:00:00.000Z', keyword: null, resource_id: null, idea: { id: UID(900 + n), hook: 'Gancho de la idea', objective: 'educar', primary_metric: 'saves', why: 'Por qué ahora', evidence: [], structure: [] },
  versions: [1, 2].map((v) => ({ id: 'v' + v, version_no: v, kind: 'carrusel', caption: 'Texto v' + v, created_by: v === 1 ? 'Hermes' : 'Claude', created_at: ISO(-v), cost_credits: 10, notes: null, qa: null, assets: [1, 2, 3].map((k) => ({ url: PNG, video: false, label: null })) })),
  feedback: [{ id: 'f1', scope: 'lamina 1', text: 'Portada más cerca', status: 'done', created_at: ISO(-2), version_id: 'v1' }], overdue: false, ...o });
const tallerView = () => ({ generated_at: new Date().toISOString(), labels: {}, counts: {}, carousel_direct: false, pieces: state.tpieces });
const ideasView = () => ({ generated_at: new Date().toISOString(), next_week: '2026-10-26', weeks: [{ week_start: '2026-10-26', is_next: true, counts: { proposed: 2, changed: 0, approved: 0, discarded: 0 }, discarded_weak: 3, weak: [{ title: 'Débil', channel: 'instagram', reasons: ['sin fuente verificada'] }], batch_at: ISO(-2),
  channels: [{ channel: 'instagram', label: 'Instagram', ideas: state.ideas.filter((i) => i.channel === 'instagram' && i.score >= 75), folded: state.ideas.filter((i) => i.channel === 'instagram' && i.score < 75) }, { channel: 'linkedin_page', label: 'LinkedIn · página', ideas: state.ideas.filter((i) => i.channel === 'linkedin_page'), folded: [] }, { channel: 'linkedin_profile', label: 'LinkedIn · personal', ideas: [], folded: [] }] }] });
const v3 = () => ({ pause: { paused: state.paused, reason: state.paused ? 'Viaje' : null, since: state.paused ? ISO(-1) : null, by: state.paused ? 'Christian via /ops' : null, resume_at: null }, nav_v2: state.navV2,
  inbox: { total: 3 + 1 + 2, items: [{ kind: 'correo', prio: 1, count: 3, title: '3 correos por aprobar', from: 'Prospección y correo', age: 'hace 3 d', tone: 'old', href: '/ops?view=aprobaciones&filter=correos', examples: ['Empresa 1', 'Empresa 2'] },
    { kind: 'idea', prio: 2, count: 1, title: '1 idea por decidir', from: 'Redes → Ideas', age: 'hace 2 h', tone: 'fresh', href: '/ops?view=ideas', examples: ['Idea de prueba'] },
    { kind: 'publicacion', prio: 8, count: 2, title: '2 publicaciones en revisión (GHL)', from: 'Redes', age: '', tone: 'fresh', href: '/ops?view=aprobaciones&filter=contenido', examples: [] }] } });
const panel = () => ({ v3: v3(), prep: prepData(), generated_at: new Date().toISOString(), date_label: 'jue 8 oct', tz: 'America/Santiago', missing: [], attention_total: 1, attention: [{ key: 'content_pending', tone: 'act', title: 'Contenido por aprobar', count: 2, items: ['«API Gateway…»'], more: 0 }],
  outreach: { email: { mode: 'live', sent_today: 1, cap: 5, drafts: 3, approved_waiting: 1 }, linkedin: { mode: 'live', imported_today: 1, cap: 10, ready: 1, pending_approval: 0, in_campaign: 1, replied: 0, errors: 0 } },
  approvals: { emails: 3, linkedin: 1, content: 2 },
  prospecting: { backlog: 23, backlog_alta: 13, new_since_run: 2, new_since_run_alta: 1, contacted: 0, overdue_review_tasks: 0, last_run: { at: ISO(-20), label: 'mié 7 oct 10:30', imported: 3, minutes: 6, ago: '20 h' }, latest: [{ company: 'Clínica Ramis SpA', short: 'Clínica Ramis', score: 84, band: 'alta', industry: 'Salud', city: 'Antofagasta', domain: 'clinicaramis.cl', angle: 'Recepción', quote: 'agenda online', source: 'Prospect Radar v2', days: 1, is_new: true }] },
  content: { weekly: { week_start: '2026-10-05', week_end: '2026-10-11', target: 5, min: 4, max: 6, done: 3, published: 1, scheduled: 2, in_review: 2, coverage: 5, state: 'ritmo', state_label: 'En ritmo', runway_days: 3, runway_min: 3, runway_max: 5, runway_ok: true, covered: true },
    queue: { pending: 2, max: 6, full: false }, rss: { enabled: true, feeds_total: 7, feeds_ok: 7, failing: [], new_items: 92, last_checked_ago: '34 min', last_run: null }, intel: { enabled: true, report_ago: '2 d', competitors: ['vambe'], gaps: ['costo real'], saturated: [], own_angles: [], last_run: null },
    resources: { active: 1, rows: [{ slug: 'x', name: 'Qué proceso automatizar primero', type: 'checklist', cta_mode: 'resource_link', url: 'https://atacamalabs.cl/recursos/x', uses: 2 }] }, founder: { pending_answer: 0, answered_without_pieces: 0, last: null },
    signals_count: 5, signals: [{ title: 'Señal de prueba', type: 'news', angle: 'a', at: ISO(-5), ago: '5 h' }], in_review: state.pieces, scheduled: [], published: [], failed: [], metrics_ready: 0 },
  system: { overall: 'ok', components: [{ name: 'Gmail Sender', status: 'ok', reason: 'ok' }, { name: 'Content RSS (ingestión)', status: 'ok', reason: 'ok' }], outreach_mode: 'live', approved_pending: 1, drafts: 3, errors24h: [], hermes_known: true },
  linkedin: { mode: 'live', counts: { pendiente: 0, en_lista: 0, en_campana: 1, conexion: 0, mensaje: 0, followup: 0, respondio: 0, rechazo: 0, error: 0 }, ready: 1, rows: [], note: 'Waalaxy no informa por API si la invitación se envió, si la aceptaron o si respondieron: esos estados los registras tú con Hermes.' } });

// ------------------------------------------------------------------ n8n simulado
const state = { cards: CARDS, pieces: PIECES, calls: [], opsHits: 0, mode: 'ok', autosend: false, paused: false, navV2: true, ideas: [IDEA(1), IDEA(2, { channel: 'linkedin_page', channel_label: 'LinkedIn · página', format: 'texto' }), IDEA(15, { score: 72, title: 'Idea débil plegada' })], tpieces: [TPIECE(1), TPIECE(2, { status: 'en_cola', status_label: 'En cola', current_version: null, versions: [], feedback: [], thumb: null, channel: 'linkedin_page', channel_label: 'LinkedIn · página', format: 'texto' })] };
const mock = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    const send = (code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
    const j = body ? JSON.parse(body) : {};
    if (req.url === '/__calls') return send(200, state.calls);
    if (req.url === '/__reset') { state.calls = []; state.mode = 'ok'; state.cards = CARDS; state.autosend = false; state.paused = false; state.navV2 = true; state.tpieces = [TPIECE(1), TPIECE(2, { status: 'en_cola', status_label: 'En cola', current_version: null, versions: [], feedback: [], thumb: null, channel: 'linkedin_page', channel_label: 'LinkedIn · página', format: 'texto' })]; state.ideas = [IDEA(1), IDEA(2, { channel: 'linkedin_page', channel_label: 'LinkedIn · página', format: 'texto' }), IDEA(15, { score: 72, title: 'Idea débil plegada' })]; return send(200, {}); }
    if (req.url === '/__nav') { state.navV2 = j.v2 !== false; return send(200, {}); }
    if (req.url === '/__mode') { state.mode = j.mode; return send(200, {}); }
    if (req.url === '/webhook/atacama-ops') { state.opsHits++; if (req.headers['x-atacama-key'] !== INGEST_KEY) return send(403, {}); return j.action === 'taller_list' ? send(200, { ok: true, taller: tallerView() }) : j.action === 'ideas_list' ? send(200, { ok: true, ideas: ideasView() }) : send(200, { ok: true, panel: panel() }); }
    if (req.url === '/webhook/atacama-ops-actions') {
      if (req.headers['x-ops-approval'] !== OPS_KEY) return send(403, { message: 'Authorization data is wrong!' });
      if (j.action === 'overview') return send(200, overview());
      state.calls.push({ ...j, at: Date.now() });
      if (state.mode === 'error') return send(200, { ok: false, error: 'rechazado', message: 'El motor rechazó la acción (prueba).' });
      if (state.mode === 'down') return send(500, { message: 'boom' });
      if (j.action === 'content_approve' || j.action === 'content_reject') return send(200, { ok: true, status: j.action === 'content_approve' ? 'scheduled' : 'rejected', message: j.action === 'content_approve' ? 'Aprobada y programada en GHL (prueba).' : 'Rechazada (prueba).' });
      if (j.action && j.action.startsWith('taller_')) { const tp = state.tpieces.find((x) => x.id === j.piece_id); if (tp && j.action === 'taller_schedule') { tp.status = 'programada_pendiente_de_clic'; tp.status_label = 'Falta tu último clic en GHL'; tp.scheduled_at = j.schedule_at; } if (tp && j.action === 'taller_approve') { tp.status = 'lista'; tp.status_label = 'Lista para programar'; } if (tp && j.action === 'taller_feedback') { tp.status = 'cambios_pedidos'; tp.status_label = 'Cambios pedidos'; } return send(200, { ok: true, status: j.action, needs_ghl: j.action === 'taller_schedule', message: j.action === 'taller_schedule' ? 'Carrusel creado en GHL, EN REVISIÓN (prueba).' : 'Taller: ' + j.action + ' (prueba).' }); }
      if (j.action === 'idea_decide') { const it = state.ideas.find((i) => i.id === j.idea_id); if (it) { if (j.decision === 'approve') it.status = 'approved'; if (j.decision === 'change') { it.status = 'changed'; it.change_request = j.text; } if (j.decision === 'discard') state.ideas = state.ideas.filter((i) => i !== it); if (j.decision === 'move') it.week_start = j.week_start; } return send(200, { ok: true, status: j.decision, message: 'Idea: ' + j.decision + ' (prueba).' }); }
      if (j.action === 'idea_mine') { state.ideas.push(IDEA(30, { title: j.title, status: 'approved', origin: 'christian', ficha_complete: false, channel: j.channel, format: j.format })); return send(200, { ok: true, status: 'approved', message: 'Tu idea quedó aprobada (prueba).' }); }
      if (j.action === 'pause_set') { state.paused = j.paused === true; return send(200, { ok: true, status: j.paused ? 'paused' : 'resumed', message: j.paused ? 'PAUSA GENERAL activa (prueba).' : 'Sistema reanudado (prueba).' }); }
      if (j.action === 'autosend_set') { state.autosend = j.enabled === true; return send(200, { ok: true, status: j.enabled ? 'autosend_on' : 'autosend_off', message: 'Envío automático ' + (j.enabled ? 'ON' : 'OFF') + ' (prueba).' }); }
      if (j.action === 'email_save') return send(200, { ok: true, status: 'saved', message: 'Guardado. NO se envió: aprueba el envío cuando estés listo.', hash: 'hashNEW1' });
      return send(200, { ok: true, status: j.action.replace('email_', '').replace('linkedin_', ''), message: 'Hecho (prueba): ' + j.action });
    }
    return send(404, {});
  });
});

async function startApp() {
  const env = { ...process.env, N8N_BASE_URL: `http://localhost:${MOCK_PORT}`, ATACAMA_INGEST_KEY: INGEST_KEY, OPS_APPROVAL_KEY: OPS_KEY, OPS_NO_CACHE: '1', OPS_PANEL_PASSWORD: PIN, OPS_PANEL_SECRET: 'secreto-de-prueba-largo-1234567890', SUPABASE_URL: 'http://127.0.0.1:9', SUPABASE_SERVICE_ROLE_KEY: 'x', NEXT_TELEMETRY_DISABLED: '1' };
  const child = spawn(process.execPath, [path.join(ROOT, 'node_modules/next/dist/bin/next'), 'dev', '-p', String(APP_PORT)], { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = '';
  child.stdout.on('data', (d) => { log += d; }); child.stderr.on('data', (d) => { log += d; });
  for (let i = 0; i < 120; i++) { try { const r = await fetch(APP + '/ops'); if (r.status === 200) return { child, log: () => log }; } catch { /* aún no */ } await new Promise((r) => setTimeout(r, 1000)); }
  child.kill(); throw new Error('next dev no arrancó: ' + log.slice(-500));
}

const waitCall = async (action) => { for (let i = 0; i < 60; i++) { if ((await calls()).some((c) => c.action === action)) return; await new Promise((r) => setTimeout(r, 250)); } };
const calls = async () => (await fetch(`http://localhost:${MOCK_PORT}/__calls`)).json();
const reset = async () => fetch(`http://localhost:${MOCK_PORT}/__reset`, { method: 'POST', body: '{}' });
const setMode = async (mode) => fetch(`http://localhost:${MOCK_PORT}/__mode`, { method: 'POST', body: JSON.stringify({ mode }) });

async function login(page, pin = PIN) {
  await page.goto(APP + '/ops');
  await page.locator('#ops-pin').fill(pin);
  await page.waitForSelector('.ops-side, .ops-bar, .ops-pin-err', { state: 'attached', timeout: 60000 });
}

async function main() {
  await new Promise((r) => mock.listen(MOCK_PORT, r));
  const { child } = await startApp();
  const browser = await chromium.launch();
  try {
    // ---------------------------------------------------------------- sesión
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(APP + '/ops?view=aprobaciones');
    t('sin sesión: se pide el PIN y NO se ve el panel ni datos', (await page.locator('#ops-pin').count()) === 1 && !(await page.content()).includes('Empresa 1') && (await page.locator('.ops-side').count()) === 0);
    await login(page, '000000');
    t('PIN incorrecto: error y sigue sin panel', /incorrecto/i.test(await page.locator('.ops-pin-msg').innerText()) && (await page.locator('.ops-side').count()) === 0);
    await page.waitForTimeout(700);
    await login(page, PIN);
    await page.waitForSelector('.ops-side', { timeout: 20000 });
    t('login correcto: entra al cockpit con barra lateral y estado ON', (await page.locator('.ops-side .ops-on').innerText()) === 'ON' && (await page.locator('h1').first().innerText()) === 'Hoy');

    // ---------------------------------------------------------------- navegación escritorio
    const secs = [['Hoy', 'hoy', 'Hoy'], ['Redes', 'ideas', 'Ideas'], ['Prospección y correo', 'aprobaciones', 'Aprobaciones'], ['Resultados', 'resultados', 'Resultados'], ['Sistema', 'sistema', 'Sistema']];
    let navOk = true;
    for (const [label, id, h1want] of secs) {
      await page.locator('.ops-side a.ops-nav-a', { hasText: new RegExp('^' + label) }).first().click();
      await page.waitForURL(new RegExp('view=' + id));
      await page.waitForFunction((w) => document.querySelector('#ops-main h1') && document.querySelector('#ops-main h1').textContent === w, h1want);
      const cur = await page.locator('.ops-side a[aria-current="page"]').innerText();
      if (!cur.startsWith(label)) { navOk = false; console.log('  sección', label, 'activa:', cur); }
    }
    t('v3 · navegación: las 5 secciones (Hoy, Redes, Prospección y correo, Resultados, Sistema) cambian de vista y marcan la activa', navOk);
    let oldOk = true;
    for (const [id, h1, sec] of [['inicio', 'Hoy', 'Hoy'], ['aprobaciones', 'Aprobaciones', 'Prospección y correo'], ['control', 'Control', 'Prospección y correo'], ['prospeccion', 'Prospección', 'Prospección y correo'], ['outreach', 'Outreach', 'Prospección y correo'], ['contenido', 'Contenido', 'Redes'], ['sistema', 'Sistema', 'Sistema']]) {
      await page.goto(APP + '/ops?view=' + id); await page.waitForSelector('#ops-main h1');
      const got = await page.locator('#ops-main h1').first().innerText();
      const cur = await page.locator('.ops-side a[aria-current="page"]').innerText();
      if (got !== h1 || !cur.startsWith(sec)) { oldOk = false; console.log('  URL vieja', id, '→', got, '/', cur); }
    }
    t('v3 · ninguna URL vieja de /ops queda rota: cada vista vieja abre dentro de su sección nueva', oldOk);
    await page.goto(APP + '/ops?view=control'); await page.waitForSelector('.ops-sec-tabs');
    t('v3 · pestañas de sección: Prospección y correo muestra Aprobaciones, Contacto preparado, Radar y Envíos', (await page.locator('.ops-sec-tabs a').allInnerTexts()).join('|') === 'Aprobaciones|Contacto preparado|Radar|Envíos' && (await page.locator('.ops-sec-tabs a[aria-current="page"]').innerText()) === 'Contacto preparado');
    await fetch(`http://localhost:${MOCK_PORT}/__nav`, { method: 'POST', body: JSON.stringify({ v2: false }) });
    await page.goto(APP + '/ops'); await page.waitForSelector('#ops-main h1');
    t('v3 · interruptor ops_nav_v2=false: vuelve la navegación anterior (7 vistas, portada Inicio)', (await page.locator('.ops-side a.ops-nav-a').count()) === 7 && (await page.locator('#ops-main h1').first().innerText()) === 'Inicio' && (await page.locator('.ops-sec-tabs').count()) === 0);
    t('navegación anterior: badge de aprobaciones (6 = 3 correos + 1 LinkedIn + 2 publicaciones)', (await page.locator('.ops-side a[href="/ops?view=aprobaciones"] .ops-badge').innerText()) === '6');
    await fetch(`http://localhost:${MOCK_PORT}/__nav`, { method: 'POST', body: JSON.stringify({ v2: true }) });
    await page.goto(APP + '/ops?view=outreach&tab=linkedin');
    await page.reload(); await page.waitForFunction(() => document.querySelector('#ops-main h1') && document.querySelector('#ops-main h1').textContent !== 'Cargando…'); await page.waitForSelector('a.ops-tab-on');
    t('deep link: recargar conserva la vista y la pestaña', (await page.locator('h1').first().innerText()) === 'Outreach' && (await page.locator('nav[aria-label="Canal"] a.ops-tab-on').innerText()) === 'LinkedIn');
    t('v3 · badges: Hoy = total de la bandeja (6); Prospección y correo = 3 correos + 1 LinkedIn + 4 de contacto preparado (8)', (await page.locator('.ops-side a[href="/ops?view=hoy"] .ops-badge').innerText()) === '6' && (await page.locator('.ops-side a[href="/ops?view=aprobaciones"] .ops-badge').innerText()) === '8');

    // ---------------------------------------------------------------- paridad de información
    await page.goto(APP + '/ops?view=hoy'); await page.waitForSelector('#ops-main h1');
    await shot(page, 'desktop-inicio');
    const ini = await page.locator('#ops-main').innerText();
    t('Hoy: bandeja de decisiones + pipeline, outreach X/5 y X/10, contenido X/5, sistema y atención', /hoy requiere tu decisión/i.test(ini) && /publicaciones/i.test(ini) && /pipeline/i.test(ini) && /1\/5/.test(ini) && /1\/10/.test(ini) && /3\/5/.test(ini) && /en ritmo/i.test(ini) && /todo ok/i.test(ini) && /necesita tu atención/i.test(ini), ini.slice(0, 500));
    await page.goto(APP + '/ops?view=contenido'); await page.waitForSelector('#ops-main h1');
    const con = await page.locator('#ops-main').innerText();
    t('Contenido: ritmo «3 / 5», estado, publicadas/programadas/en revisión/runway, cola, RSS, inteligencia, recursos, señales y por aprobar', /contenido esta semana: 3 \/ 5/i.test(con) && /en ritmo/i.test(con) && /runway/i.test(con) && /2\/6/.test(con) && /rss · 7\/7/i.test(con) && /inteligencia orgánica/i.test(con) && /recursos activos/i.test(con) && /señal de prueba/i.test(con) && /por aprobar/i.test(con), con.slice(0, 600));
    await page.goto(APP + '/ops?view=sistema'); await page.waitForSelector('#ops-main h1');
    t('Sistema: salud y componentes', /Todo OK/.test(await page.locator('#ops-main').innerText()) && /Gmail Sender/.test(await page.locator('#ops-main').innerText()));
    await page.goto(APP + '/ops?view=prospeccion'); await page.waitForSelector('#ops-main h1');
    t('Prospección: investigados, prioridad alta y el detalle del radar', /Clínica Ramis/.test(await page.locator('#ops-main').innerText()) && /prioridad alta/.test(await page.locator('#ops-main').innerText()));


    // ---------------------------------------------------------------- Control Center (9-oct): Investigado → contacto preparado
    await reset();
    await page.goto(APP + '/ops?view=control'); await page.waitForSelector('#ops-main h1');
    await shot(page, 'desktop-control');
    const ctl = await page.locator('#ops-main').innerText();
    t('Control: métricas (sin acción, emails listos, LinkedIn por enviar, buscar contacto, enviados hoy, respuestas, follow-ups)', /Investigados válidos SIN ACCIÓN/i.test(ctl) && /Emails listos para aprobación/i.test(ctl) && /LinkedIn por enviar/i.test(ctl) && /Buscar contacto/i.test(ctl) && /Enviados hoy/i.test(ctl) && /Respuestas/i.test(ctl) && /Follow-ups/i.test(ctl), ctl.slice(0, 300));
    t('Control: vive en «Prospección y correo» y su pestaña está activa', (await page.locator('.ops-side a[aria-current="page"]').innerText()).startsWith('Prospección y correo') && (await page.locator('.ops-sec-tabs a[aria-current="page"]').innerText()) === 'Contacto preparado');
    t('Control: el envío automático nace en OFF', (await page.getByTestId('autosend-state').innerText()) === 'OFF');
    await page.getByRole('button', { name: /Encender envío automático/ }).click();
    t('Control: encender pide confirmación explícita y no llama a nada todavía', (await page.getByRole('button', { name: 'Sí, encender' }).count()) === 1 && (await calls()).filter((c) => c.action === 'autosend_set').length === 0);
    await page.getByRole('button', { name: 'Sí, encender' }).click();
    await page.waitForSelector('.ops-toast');
    await page.waitForFunction(() => document.querySelector('[data-testid="autosend-state"]') && document.querySelector('[data-testid="autosend-state"]').textContent === 'ON', null, { timeout: 15000 }).catch(() => {});
    const cAuto = await calls();
    t('Control: al confirmar llama a autosend_set (enabled=true) y luego al barrido; el interruptor queda ON', cAuto.some((c) => c.action === 'autosend_set' && c.enabled === true) && cAuto.some((c) => c.action === 'autosend_sweep') && (await page.getByTestId('autosend-state').innerText()) === 'ON', JSON.stringify(cAuto.map((c) => c.action)));
    await page.getByRole('button', { name: 'Apagar envío automático' }).click();
    await page.waitForFunction(() => document.querySelector('[data-testid="autosend-state"]') && document.querySelector('[data-testid="autosend-state"]').textContent === 'OFF', null, { timeout: 15000 }).catch(() => {});
    t('Control: apagar es un solo toque y vuelve a OFF', (await calls()).filter((c) => c.action === 'autosend_set').slice(-1)[0].enabled === false && (await page.getByTestId('autosend-state').innerText()) === 'OFF');
    const li1 = page.locator('article[data-kind="linkedin-manual"]').first();
    t('Control · LinkedIn: perfil con enlace directo, invitación y mensaje listos para copiar', (await li1.locator('a[href^="https://www.linkedin.com/in/prep-dos"]').count()) === 1 && /Me gustaría conectar/.test(await li1.innerText()) && (await li1.getByRole('button', { name: 'Copiar invitación' }).count()) === 1 && (await li1.getByRole('button', { name: 'Copiar mensaje' }).count()) === 1);
    await li1.getByRole('button', { name: 'Envié la invitación' }).click();
    await waitCall('prep_li_sent');
    const cLi = (await calls()).filter((c) => c.action === 'prep_li_sent');
    t('Control · LinkedIn: «Envié la invitación» registra el envío (kind invitation) sobre ese prospecto', cLi.length === 1 && cLi[0].kind === 'invitation' && cLi[0].candidate_id === UID(502), JSON.stringify(cLi));
    const fc = page.locator('article[data-kind="find-contact"]').first();
    await fc.locator('summary').click();
    t('Control · Buscar contacto: muestra el mensaje ya redactado y pide solo el contacto', /Mensaje ya redactado para Prep 3/.test(await fc.innerText()) && (await fc.locator('input').count()) === 2);
    const saveBtn = fc.getByRole('button', { name: 'Guardar contacto' });
    t('Control · Buscar contacto: no se puede guardar vacío', await saveBtn.isDisabled());
    await fc.locator('input[type="email"]').fill('nueva@prep3.cl');
    await saveBtn.click();
    await waitCall('prep_contact');
    const cCt = (await calls()).filter((c) => c.action === 'prep_contact');
    t('Control · Buscar contacto: guarda el correo pegado (sin enviar nada)', cCt.length === 1 && cCt[0].email === 'nueva@prep3.cl' && cCt[0].candidate_id === UID(503) && !(await calls()).some((c) => c.action === 'email_approve'));
    t('Control · En espera: muestra la razón comercial y ofrece liberar', /Prioridad B: se contacta después de avanzar con los A/.test(await page.locator('#ops-main').innerText()) && (await page.getByRole('button', { name: 'Liberar' }).count()) === 1);
    await page.getByRole('button', { name: 'Liberar' }).click();
    await waitCall('prep_release');
    t('Control · En espera: liberar llama a prep_release', (await calls()).some((c) => c.action === 'prep_release' && c.candidate_id === UID(504)));
    t('Control: ninguna clave llega al navegador', !/test-ops-key|test-ingest-key/.test(await page.content()));

    // ---------------------------------------------------------------- biblioteca de borradores (Outreach → Correo)
    await page.goto(APP + '/ops?view=outreach&tab=email');
    await page.waitForSelector('.ops-ap');
    const lib = await page.locator('.ops-ap').count();
    t('biblioteca: lista los borradores y los demás estados reales', lib === 7);
    t('biblioteca: filtro por estado (Borrador → 3)', await (async () => { await page.getByRole('tab', { name: /^Borrador/ }).click(); return (await page.locator('.ops-ap').count()) === 3; })());
    await page.getByRole('tab', { name: /^Todos/ }).click();
    await page.locator('#ops-q').fill('empresa5');
    t('biblioteca: búsqueda por correo/empresa', (await page.locator('.ops-ap').count()) === 1 && /Empresa 5/.test(await page.locator('.ops-ap').innerText()));
    await page.locator('#ops-q').fill('');
    t('biblioteca: «sending» y «sent» bloqueados (sin Editar ni Aprobar)', await (async () => {
      for (const n of [5, 6]) {
        const c = page.locator('.ops-ap', { hasText: `Empresa ${n}` }).first(); await c.locator('summary.ops-ap-sum').click();
        if ((await c.getByRole('button', { name: 'Editar' }).count()) || (await c.getByRole('button', { name: /Aprobar envío/ }).count()) || (await c.getByRole('button', { name: 'Rechazar' }).count())) return false;
      } return true;
    })());
    t('biblioteca: aprobado ofrece «Volver a borrador» y NO «Editar»', await (async () => { const c = page.locator('.ops-ap', { hasText: 'Empresa 4' }).first(); await c.locator('summary.ops-ap-sum').click(); return (await c.getByRole('button', { name: 'Volver a borrador' }).count()) === 1 && (await c.getByRole('button', { name: 'Editar' }).count()) === 0; })());

    // ---------------------------------------------------------------- editar y guardar (NO envía)
    await reset();
    await page.goto(APP + '/ops?view=outreach&tab=email');
    const c1 = page.locator('.ops-ap', { hasText: 'Empresa 1' }).first();
    await c1.locator('summary.ops-ap-sum').click();
    t('detalle: texto completo, destinatario, asunto, score y razón', /contacto1@empresa1\.cl/.test(await c1.innerText()) && /ordenar su recepción/.test(await c1.innerText()) && /Recepción repite/.test(await c1.innerText()));
    await c1.getByRole('button', { name: 'Editar' }).click();
    t('editar: solo asunto y cuerpo (el destinatario no es editable)', (await c1.locator('input.ops-input').count()) === 1 && (await c1.locator('textarea').count()) === 1 && !(await c1.locator('input[type="email"]').count()));
    await c1.locator('input.ops-input').fill('Asunto nuevo de Christian');
    await c1.locator('textarea').fill('Texto nuevo escrito desde el celular, claro y concreto.');
    await c1.getByRole('button', { name: 'Guardar cambios' }).click();
    await page.waitForSelector('.ops-toast');
    const cs = await calls();
    t('guardar: una sola llamada email_save con la versión vista (hash), asunto y cuerpo; NINGUNA aprobación', cs.length === 1 && cs[0].action === 'email_save' && cs[0].message_id === UID(1) && cs[0].expected_hash === 'hash0001' && cs[0].subject === 'Asunto nuevo de Christian' && cs[0].body.startsWith('Texto nuevo') && !cs.some((c) => /approve/.test(c.action)) && /^[A-Za-z0-9_-]{8,64}$/.test(cs[0].request_id));
    t('guardar: avisa «NO se envió» con el mensaje real del backend', /NO se envió/.test(await page.locator('.ops-toast').first().innerText()));

    // ---------------------------------------------------------------- Cold Email v2: calidad y versión anterior
    const cq = page.locator('.ops-ap', { hasText: 'Empresa 3' }).first();
    await cq.locator('summary.ops-ap-sum').click();
    t('calidad del correo: muestra el score Cold Email v2 y la versión anterior como bloques plegables', /Calidad del correo/.test(await cq.innerText()) && /Versión anterior/.test(await cq.innerText()) && /86/.test(await cq.locator('.ops-quality').first().innerText()));
    await cq.locator('.ops-quality summary', { hasText: 'Calidad del correo' }).click();
    t('calidad del correo: evidencia usada, ángulo, razón del CTA y avisos visibles', /Dos sedes con agenda por WhatsApp/.test(await cq.innerText()) && /Ordenar antes de responder/.test(await cq.innerText()) && /baja la fricci/.test(await cq.innerText()) && /se parece a otro correo/.test(await cq.innerText()));
    await cq.locator('.ops-quality summary', { hasText: 'Versión anterior' }).click();
    t('versión anterior: el texto viejo queda accesible para comparar (antes/después)', /Texto ANTERIOR plantilla/.test(await cq.innerText()));
    t('un correo sin datos v2 no muestra el bloque de calidad', !(await page.locator('.ops-ap', { hasText: 'Empresa 2' }).first().locator('.ops-quality').count()));

    // ---------------------------------------------------------------- aprobar / rechazar correo
    await reset();
    await page.goto(APP + '/ops?view=outreach&tab=email');
    const c2 = page.locator('.ops-ap', { hasText: 'Empresa 2' }).first();
    await c2.locator('summary.ops-ap-sum').click();
    await shot(page, 'desktop-correo-abierto');
    await c2.getByRole('button', { name: 'Aprobar envío' }).dblclick();
    await page.waitForSelector('.ops-toast');
    await page.waitForTimeout(600);
    const ap = await calls();
    t('doble toque en «Aprobar envío» => UNA sola llamada, con la versión que se leyó', ap.filter((c) => c.action === 'email_approve').length === 1 && ap[0].expected_hash === 'hash0002' && ap[0].message_id === UID(2));
    t('aprobar: el aviso muestra lo que respondió el sistema (no un texto inventado)', /Hecho \(prueba\): email_approve/.test(await page.locator('.ops-toast').first().innerText()));
    t('Ola B · velocidad: al aprobar, la tarjeta pasa a «Aprobado» al instante (estado optimista) y ofrece «Volver a borrador» sin esperar la recarga', /Aprobado/.test(await c2.innerText()) && (await c2.getByRole('button', { name: 'Volver a borrador' }).count()) === 1 && (await c2.getByRole('button', { name: /Aprobar envío/ }).count()) === 0);
    await reset();
    await page.goto(APP + '/ops?view=outreach&tab=email');
    const c3 = page.locator('.ops-ap', { hasText: 'Empresa 3' }).first();
    await c3.locator('summary.ops-ap-sum').click();
    await c3.getByRole('button', { name: 'Rechazar' }).click();
    await c3.locator('input[id^="r-"]').fill('Muy genérico');
    await c3.getByRole('button', { name: 'Confirmar rechazo' }).click();
    await page.waitForSelector('.ops-toast');
    const rj = await calls();
    t('rechazar: email_reject con el motivo', rj.length === 1 && rj[0].action === 'email_reject' && rj[0].reason === 'Muy genérico' && rj[0].message_id === UID(3));
    await reset();
    await page.goto(APP + '/ops?view=outreach&tab=email');
    const c4 = page.locator('.ops-ap', { hasText: 'Empresa 4' }).first();
    await c4.locator('summary.ops-ap-sum').click();
    await c4.getByRole('button', { name: 'Volver a borrador' }).click();
    await page.waitForSelector('.ops-toast');
    t('«Volver a borrador» llama email_reopen (la aprobación anterior se anula en el backend)', (await calls()).some((c) => c.action === 'email_reopen' && c.message_id === UID(4)));

    // ---------------------------------------------------------------- errores del backend: nunca éxito falso
    await reset(); await setMode('error');
    await page.goto(APP + '/ops?view=outreach&tab=email');
    const c5 = page.locator('.ops-ap', { hasText: 'Empresa 2' }).first();
    await c5.locator('summary.ops-ap-sum').click();
    await c5.getByRole('button', { name: 'Aprobar envío' }).click();
    await page.waitForSelector('.ops-toast-err');
    t('el motor rechaza => aviso de error con su motivo y sin «aprobado»', /El motor rechazó/.test(await page.locator('.ops-toast-err').first().innerText()) && (await page.locator('.ops-toast-ok').count()) === 0);
    await reset(); await setMode('down');
    await page.goto(APP + '/ops?view=outreach&tab=email');
    const c6 = page.locator('.ops-ap', { hasText: 'Empresa 2' }).first();
    await c6.locator('summary.ops-ap-sum').click();
    await c6.getByRole('button', { name: 'Aprobar envío' }).click();
    await page.waitForSelector('.ops-toast-err');
    t('backend caído (500) => error claro, sin éxito falso', (await page.locator('.ops-toast-ok').count()) === 0 && /error|No pude|No se pudo|Sin respuesta/i.test(await page.locator('.ops-toast-err').first().innerText()));
    await reset();

    // ---------------------------------------------------------------- Centro de aprobaciones
    await page.goto(APP + '/ops?view=aprobaciones');
    await page.waitForSelector('.ops-ap');
    t('aprobaciones: reúne correos (3 borradores), LinkedIn (1) y contenido (2) con filtros y conteos', (await page.locator('.ops-ap').count()) === 6 && /Todas6/.test((await page.getByRole('tab', { name: /^Todas/ }).innerText()).replace(/\s/g, '')));
    t('aprobaciones: orden por urgencia — la publicación que sale antes va primero', /publicación/i.test(await page.locator('.ops-ap').first().innerText()));
    await page.getByRole('tab', { name: /^Correos/ }).click();
    t('aprobaciones: filtro Correos', (await page.locator('.ops-ap[data-kind="email"]').count()) === 3 && (await page.locator('.ops-ap[data-kind="content"]').count()) === 0);
    // aprobación masiva: confirmación explícita y cantidad
    await reset();
    await page.locator('.ops-ap[data-kind="email"]').nth(0).locator('input.ops-check').check();
    await page.locator('.ops-ap[data-kind="email"]').nth(1).locator('input.ops-check').check();
    t('masiva: barra con la cantidad y SIN llamadas hasta confirmar', /2 correos seleccionados/.test(await page.locator('.ops-bulk').innerText()) && (await calls()).length === 0);
    await page.getByRole('button', { name: 'Aprobar 2' }).click();
    t('masiva: pide confirmación explícita con la cantidad (no se aprueba con un clic accidental)', /Vas a aprobar 2 correos/.test(await page.locator('.ops-bulk').innerText()) && (await calls()).length === 0);
    await page.getByRole('button', { name: 'Volver' }).click();
    t('masiva: «Volver» cancela sin llamar al sistema', (await calls()).length === 0);
    await page.getByRole('button', { name: 'Aprobar 2' }).click();
    await page.getByRole('button', { name: 'Sí, aprobar 2' }).click();
    for (let i = 0; i < 60 && (await calls()).length < 2; i++) await page.waitForTimeout(250);
    const bk = await calls();
    t('masiva: 2 llamadas email_approve independientes (request_id distintos, versión de cada correo)', bk.length === 2 && bk.every((c) => c.action === 'email_approve') && bk[0].request_id !== bk[1].request_id && bk[0].expected_hash.startsWith('hash000') && new Set(bk.map((c) => c.message_id)).size === 2);

    // ---------------------------------------------------------------- LinkedIn
    await reset();
    await page.goto(APP + '/ops?view=aprobaciones&filter=linkedin');
    const li = page.locator('.ops-ap[data-kind="linkedin"]').first();
    await li.locator('summary.ops-ap-sum').click();
    t('LinkedIn: persona, cargo, empresa, URL, score, ángulo, hecho, motivo y destino', /Ana Pérez/.test(await li.innerText()) && /Gerente General/.test(await li.innerText()) && /linkedin\.com\/in\/ana-perez/.test(await li.innerText()) && /Reservas por WhatsApp/.test(await li.innerText()) && /Atacama OS — LinkedIn Producción/.test(await li.innerText()));
    await li.getByRole('button', { name: 'Aprobar LinkedIn' }).click();
    await page.waitForSelector('.ops-toast');
    t('LinkedIn aprobar => linkedin_approve con el prospecto (el backend aplica tope, exclusión y campaña)', (await calls()).some((c) => c.action === 'linkedin_approve' && c.candidate_id === UID(201)));
    await reset();
    await page.goto(APP + '/ops?view=aprobaciones&filter=linkedin');
    const li2 = page.locator('.ops-ap[data-kind="linkedin"]').first();
    await li2.locator('summary.ops-ap-sum').click();
    await li2.getByRole('button', { name: 'Rechazar' }).click();
    await li2.getByRole('button', { name: 'Confirmar rechazo' }).click();
    await page.waitForSelector('.ops-toast');
    t('LinkedIn rechazar => linkedin_reject', (await calls()).some((c) => c.action === 'linkedin_reject'));
    await page.goto(APP + '/ops?view=outreach&tab=linkedin'); await page.waitForSelector('#ops-main h1');
    const lt = await page.locator('#ops-main').innerText();
    t('Outreach → LinkedIn: enviados hoy X/10, listos para aprobar y «Enviados a Waalaxy» con el rótulo de verdad', /1\/10/.test(lt) && /listos para aprobar/i.test(lt) && /enviados a waalaxy/i.test(lt) && /último estado conocido por atacama os/i.test(lt), lt.slice(0, 500));
    await page.locator('li[data-kind="linkedin-sent"] summary').first().click();
    const sent = await page.locator('li[data-kind="linkedin-sent"]').first().innerText();
    t('enviado: aprobación, fecha de envío, lista, campaña y último estado; no inventa estados externos', /Christian via \/ops/.test(sent) && /6ac66b417b5c4af5e7c260e4/.test(sent) && /6ac6fd0277c561efd0331116/.test(sent) && /En campaña \(conexión\)/.test(sent) && !/Respondió/.test(sent) && !/Aceptó|aceptada/.test(sent));

    // ---------------------------------------------------------------- Contenido
    await reset();
    await page.goto(APP + '/ops?view=contenido'); await page.waitForSelector('#ops-main h1');
    const post = page.locator('.ops-ap[data-kind="content"]').first();
    t('contenido: vista previa completa (texto, fuentes, por qué se eligió, fecha propuesta)', /Un hook claro/.test(await post.innerText()) && /Fuente oficial/.test(await post.innerText()) && /Por qué se eligió/.test(await post.innerText()) && /sáb 10 oct 10:00/.test(await post.innerText()));
    await post.getByRole('button', { name: 'Aprobar y programar' }).click();
    await page.waitForSelector('.ops-toast');
    t('contenido aprobar => content_approve; el aviso es el del backend (GHL), no inventado', (await calls()).some((c) => c.action === 'content_approve' && c.piece_id === UID(401)) && /programada en GHL/.test(await page.locator('.ops-toast').first().innerText()));
    const car = page.locator('.ops-ap[data-kind="content"]', { hasText: 'Carrusel' }).first();   // en Contenido las tarjetas ya vienen abiertas
    t('carrusel (3 imágenes): NO ofrece aprobar por API; enlaza a GHL con la razón (GHL lo reduce a 1 imagen)', (await car.getByRole('button', { name: 'Aprobar y programar' }).count()) === 0 && (await car.getByRole('link', { name: 'Aprobar en GHL' }).count()) === 1 && /lo reduce a 1 imagen/.test(await car.innerText()), (await car.innerText()).slice(0, 300) + ' | botones: ' + (await car.getByRole('button').allInnerTexts()).join(','));
    t('Ola B · velocidad: la publicación aprobada muestra su resultado al instante (sin botones de nuevo)', /aprobada y programada/.test(await post.innerText()) && (await post.getByRole('button', { name: 'Aprobar y programar' }).count()) === 0);
    await reset();
    await page.goto(APP + '/ops?view=contenido'); await page.waitForSelector('#ops-main h1');
    const post2 = page.locator('.ops-ap[data-kind="content"]').first();
    await post2.getByRole('button', { name: 'Rechazar' }).click();
    await post2.getByRole('button', { name: 'Confirmar rechazo' }).click();
    for (let i = 0; i < 40 && !(await calls()).length; i++) await page.waitForTimeout(250);
    t('contenido rechazar => content_reject', (await calls()).some((c) => c.action === 'content_reject' && c.piece_id === UID(401)));

    // ---------------------------------------------------------------- sesión vencida: acción rechazada
    await reset();
    await page.goto(APP + '/ops?view=outreach&tab=email');
    const c7 = page.locator('.ops-ap', { hasText: 'Empresa 2' }).first();
    await c7.locator('summary.ops-ap-sum').click();
    await ctx.clearCookies();
    await c7.getByRole('button', { name: 'Aprobar envío' }).click();
    await page.waitForSelector('#ops-pin, .ops-toast-err', { timeout: 30000 }).catch(() => {});
    t('acción sin sesión (cookie borrada) => rechazada por el servidor: no se llamó al sistema y se pide el PIN o se avisa que la sesión venció', (await calls()).length === 0 && ((await page.locator('#ops-pin').count()) === 1 || /sesión venció/i.test(await page.locator('.ops-toast-err').allInnerTexts().then((a) => a.join(' ')))), page.url() + ' | ' + (await page.locator('body').innerText()).slice(0, 200).replace(/\n/g, ' / '));

    // ---------------------------------------------------------------- seguridad del HTML
    await login(page, PIN);
    await page.waitForSelector('.ops-side');
    // ---------------------------------------------------------------- v3 · Fase 2: Taller
    await reset();
    await page.goto(APP + '/ops?view=taller'); await page.waitForSelector('[data-testid="taller-board"]');
    const tb = await page.getByTestId('taller-board').innerText();
    t('Taller: tablero por estado (Para revisar primero), con red, formato, versión y carril', /Para revisar · 1/i.test(tb) && /En cola · 1/i.test(tb) && /Pieza de prueba 1/.test(tb) && /v2/.test(tb) && /VPS/.test(tb) && tb.toLowerCase().indexOf('para revisar') < tb.toLowerCase().indexOf('en cola'), tb.slice(0, 300));
    await page.getByTestId('taller-board').getByRole('button', { name: 'LinkedIn · página' }).click();
    t('Taller: filtro por red', (await page.locator('[data-testid^="pieza-"]').count()) === 1 && /Pieza de prueba 2/.test(await page.getByTestId('taller-board').innerText()));
    await page.goto(APP + '/ops?view=taller&pieza=' + UID(801)); await page.waitForSelector('[data-testid="taller-detail"]');
    const det = page.getByTestId('taller-detail');
    t('Taller · detalle: visor del carrusel (3 láminas), versiones v1/v2, cambios pedidos resueltos y la idea detrás', (await det.locator('.ops-tl-slides img').count()) === 3 && (await det.getByRole('button', { name: 'v1' }).count()) === 1 && /Lámina 1/.test(await det.getByTestId('feedback').innerText()) && /resuelto/.test(await det.getByTestId('feedback').innerText()) && /La idea detrás/.test(await det.innerText()));
    await det.getByRole('button', { name: 'Comparar' }).click();
    t('Taller · comparar versiones lado a lado', (await det.locator('.ops-tl-cmp .ops-tl-slides').count()) === 2);
    await det.getByLabel('Sobre qué').selectOption('lamina 2');
    await det.getByLabel('Qué cambiar').fill('El título más corto');
    await det.getByRole('button', { name: 'Pedir cambio' }).click();
    await waitCall('taller_feedback');
    let tcall = (await calls()).filter((c) => c.action === 'taller_feedback');
    t('Taller · pedir cambio por lámina: taller_feedback con lámina 2 y el texto', tcall.length === 1 && tcall[0].scope === 'lamina 2' && tcall[0].text === 'El título más corto' && tcall[0].piece_id === UID(801));
    await reset();
    await page.goto(APP + '/ops?view=taller&pieza=' + UID(801)); await page.waitForSelector('[data-testid="taller-detail"]');
    await page.getByTestId('taller-detail').getByRole('button', { name: 'Programar…' }).click();
    const conf = page.getByTestId('schedule-confirm');
    const ct = await conf.innerText();
    t('Programar: confirma QUÉ (carrusel, 3 láminas), CUENTA y FECHA propuesta (primer hueco), y avisa que el carrusel queda en revisión', /Pieza de prueba 1/.test(ct) && /3 láminas/.test(ct) && /Instagram/.test(ct) && /en revisión/i.test(ct) && (await conf.locator('input[type="datetime-local"]').inputValue()) === '2026-10-27T15:00', ct.slice(0, 300));
    t('Programar: no llama a nada antes de confirmar', (await calls()).filter((c) => c.action === 'taller_schedule').length === 0);
    await conf.getByRole('button', { name: 'Sí, programar' }).click();
    await waitCall('taller_schedule');
    tcall = (await calls()).filter((c) => c.action === 'taller_schedule');
    await page.waitForSelector('[data-testid="schedule-done"]', { timeout: 20000 }).catch(() => {});
    t('Programar: UNA llamada taller_schedule con la fecha en UTC (15:00 Chile = 18:00 UTC) y el aviso del último clic en GHL', tcall.length === 1 && tcall[0].schedule_at === '2026-10-27T18:00:00.000Z' && (await page.getByTestId('schedule-done').count()) === 1 && /último clic/.test(await page.getByTestId('schedule-done').innerText()), JSON.stringify(tcall));
    await reset();
    await page.goto(APP + '/ops?view=taller&pieza=' + UID(801)); await page.waitForSelector('[data-testid="taller-detail"]');
    await page.getByTestId('taller-detail').getByRole('button', { name: 'Aprobar' }).click();
    await waitCall('taller_approve');
    t('Taller · aprobar versión → taller_approve', (await calls()).some((c) => c.action === 'taller_approve' && c.piece_id === UID(801)));
    await reset();
    await page.goto(APP + '/ops?view=taller&pieza=' + UID(801)); await page.waitForSelector('[data-testid="taller-detail"]');
    await page.getByTestId('taller-detail').getByRole('button', { name: 'Descartar' }).click();
    await page.getByTestId('taller-detail').getByRole('button', { name: 'Sí, descartar' }).click();
    await waitCall('taller_discard');
    t('Taller · descartar pide confirmación y llama a taller_discard', (await calls()).some((c) => c.action === 'taller_discard'));
    await reset();

    // ---------------------------------------------------------------- v3 · Fase 4: Ideas
    await reset();
    await page.goto(APP + '/ops?view=ideas'); await page.waitForSelector('[data-testid^="idea-"]');
    const iv = await page.locator('#ops-main').innerText();
    t('Ideas: semana próxima por red, con estado, plazo «Alcanza», objetivo, gancho y métrica', /Semana del 26 oct/.test(iv) && /Instagram/.test(iv) && /LinkedIn · página/.test(iv) && /Por decidir/.test(iv) && /Alcanza/.test(iv) && /Objetivo:/.test(iv) && /Gancho 1/.test(iv) && /mide: Guardados/.test(iv), iv.slice(0, 400));
    t('Ideas: las débiles van plegadas y el contador «3 ideas descartadas por débiles» se puede abrir', (await page.locator('details', { hasText: 'idea más débil' }).count()) === 1 && /3 ideas descartadas por débiles/.test(await page.getByTestId('weak').innerText()));
    const card1 = page.getByTestId('idea-' + UID(701));
    await card1.locator('summary', { hasText: 'Ver ficha completa' }).click();
    const fi = await card1.locator('.ops-ficha').innerText();
    t('Ideas: «Ver ficha completa» muestra los 12 campos numerados y las fuentes', ['1. Objetivo', '2. Público / insight', '3. Gancho', '4. Idea central', '5. Formato', '6. Estructura / escenas', '7. CTA', '8. Cómo se produce', '9. Recurso asociado', '10. Costo / esfuerzo', '11. Riesgos', '12. Métrica principal'].every((k) => fi.toLowerCase().includes(k.toLowerCase())) && /fuentes/i.test(fi), fi.slice(0, 300));
    await card1.getByRole('button', { name: 'Aprobar' }).click();
    await waitCall('idea_decide');
    let ic = (await calls()).filter((c) => c.action === 'idea_decide');
    t('Ideas: «Aprobar» llama UNA vez a idea_decide (approve) con la idea; el aviso es el del sistema', ic.length === 1 && ic[0].decision === 'approve' && ic[0].idea_id === UID(701) && /Idea: approve/.test(await page.locator('.ops-toast').first().innerText()));
    await page.waitForSelector('[data-testid="idea-' + UID(701) + '"][data-status="approved"]', { timeout: 20000 });
    t('Ideas: tras aprobar, la tarjeta queda «Aprobada» y ya no ofrece Aprobar', (await card1.getByRole('button', { name: 'Aprobar' }).count()) === 0 && /Aprobada/.test(await card1.innerText()));
    const card2 = page.getByTestId('idea-' + UID(702));
    await card2.getByRole('button', { name: 'Cambiar' }).click();
    t('Ideas: «Cambiar» exige escribir qué cambiar (botón deshabilitado vacío)', await card2.getByRole('button', { name: 'Pedir el cambio' }).isDisabled());
    await card2.locator('textarea').fill('Otro ángulo, más de costos');
    await card2.getByRole('button', { name: 'Pedir el cambio' }).click();
    for (let k = 0; k < 40 && !(await calls()).some((c) => c.action === 'idea_decide' && c.decision === 'change'); k++) await page.waitForTimeout(250);
    ic = (await calls()).filter((c) => c.action === 'idea_decide' && c.decision === 'change');
    t('Ideas: el cambio se manda con el texto', ic.length === 1 && ic[0].text === 'Otro ángulo, más de costos' && ic[0].idea_id === UID(702));
    await page.waitForSelector('[data-testid="idea-' + UID(702) + '"][data-status="changed"]', { timeout: 20000 });
    await card2.getByRole('button', { name: 'Descartar' }).click();
    await card2.getByRole('button', { name: 'Muy genérica' }).click();
    await card2.getByRole('button', { name: 'Sí, descartar' }).click();
    for (let k = 0; k < 40 && !(await calls()).some((c) => c.action === 'idea_decide' && c.decision === 'discard'); k++) await page.waitForTimeout(250);
    ic = (await calls()).filter((c) => c.action === 'idea_decide' && c.decision === 'discard');
    t('Ideas: descartar manda los motivos elegidos', ic.length === 1 && ic[0].chips.join() === 'Muy genérica');
    await page.locator('#ops-mine').scrollIntoViewIfNeeded();
    await page.getByLabel('Tu idea en una frase').fill('Antes y después de una agenda por WhatsApp');
    await page.getByLabel('Formato').selectOption('reel');
    await page.getByRole('button', { name: 'Guardar mi idea' }).click();
    await waitCall('idea_mine');
    ic = (await calls()).filter((c) => c.action === 'idea_mine');
    t('Mi idea: se guarda con título, red, formato y semana (nace aprobada en el backend)', ic.length === 1 && ic[0].title === 'Antes y después de una agenda por WhatsApp' && ic[0].channel === 'instagram' && ic[0].format === 'reel' && ic[0].week_start === '2026-10-26');
    await reset();
    // ---------------------------------------------------------------- v3 · «Hoy» y pausa general
    await reset();
    await page.goto(APP + '/ops?view=hoy'); await page.waitForSelector('[data-testid="inbox"]');
    const kinds = await page.locator('[data-testid="inbox"] li').evaluateAll((els) => els.map((e) => e.getAttribute('data-kind')));
    t('v3 · Hoy: la bandeja muestra correo → idea → publicación, en ese orden, con antigüedad en color', kinds.join(',') === 'correo,idea,publicacion' && (await page.locator('[data-testid="inbox"] li.ops-inbox-old').count()) === 1, kinds.join(','));
    await page.locator('[data-testid="inbox"] li[data-kind="idea"] a').click(); await page.waitForURL(/view=ideas/);
    t('v3 · Hoy: cada ítem lleva directo a su lugar (idea → Redes → Ideas)', (await page.locator('#ops-main h1').first().innerText()) === 'Ideas' && (await page.locator('.ops-side a[aria-current="page"]').innerText()).startsWith('Redes'));
    await page.goto(APP + '/ops?view=controles'); await page.waitForSelector('[data-testid="pause-card"]');
    t('v3 · Controles: pausa general «Funcionando» y lista de motores (Instagram apagado)', (await page.getByTestId('pause-card').getAttribute('data-paused')) === 'false' && /Motor de Instagram/.test(await page.getByTestId('motors').innerText()));
    await page.getByRole('button', { name: 'Pausar todo…' }).click();
    t('v3 · pausar pide confirmación y no llama a nada todavía', (await page.getByRole('button', { name: 'Sí, pausar todo' }).count()) === 1 && (await calls()).filter((c) => c.action === 'pause_set').length === 0);
    await page.getByRole('button', { name: 'Viaje' }).click();
    await page.getByRole('button', { name: 'Sí, pausar todo' }).click();
    await waitCall('pause_set');
    await page.waitForSelector('[data-testid="pause-card"][data-paused="true"]', { timeout: 20000 });
    const pz = (await calls()).filter((c) => c.action === 'pause_set');
    t('v3 · confirmar llama UNA vez a pause_set (paused=true, motivo «Viaje»); la tarjeta pasa a EN PAUSA y la marca del menú también', pz.length === 1 && pz[0].paused === true && pz[0].reason === 'Viaje' && /EN PAUSA/.test(await page.locator('.ops-side .ops-on').innerText()), JSON.stringify(pz));
    t('v3 · en pausa se explica qué quedó detenido y que lo programado en GHL no se retiene', /Quedó detenido/.test(await page.getByTestId('pause-card').innerText()) && /no.{0,3} retiene/i.test(await page.getByTestId('pause-card').innerText()));
    await page.goto(APP + '/ops?view=hoy'); await page.waitForSelector('[data-testid="pause-card"]');
    t('v3 · con pausa activa, «Hoy» muestra el aviso de pausa arriba', (await page.getByTestId('pause-card').first().getAttribute('data-paused')) === 'true');
    await page.getByRole('button', { name: 'Reanudar todo' }).click();
    await page.waitForSelector('[data-testid="pause-card"][data-paused="false"]', { timeout: 20000 });
    const pz2 = (await calls()).filter((c) => c.action === 'pause_set');
    t('v3 · reanudar es un toque (pause_set paused=false) y vuelve «ON»', pz2.length === 2 && pz2[1].paused === false && (await page.locator('.ops-side .ops-on').innerText()) === 'ON');
    await reset();
    await page.goto(APP + '/ops?view=aprobaciones');
    await page.waitForSelector('.ops-ap');
    const html = await page.content();
    t('el navegador nunca recibe las claves (ni la de aprobación ni la de ingesta ni el PIN) ni el nombre de la cabecera', !html.includes(OPS_KEY) && !html.includes(INGEST_KEY) && !html.includes('X-Ops-Approval') && !html.includes(PIN + '<'));
    t('/ops no es indexable (noindex)', /noindex/.test(await page.locator('meta[name="robots"]').getAttribute('content')));
    await page.evaluate(() => document.querySelector('.ops-side form').requestSubmit());   // el indicador de desarrollo de Next.js tapa la esquina del botón (no existe en producción)
    await page.waitForSelector('#ops-pin');
    t('logout: vuelve a pedir el PIN y la vista ya no responde', (await page.locator('.ops-side').count()) === 0);

    // ---------------------------------------------------------------- móvil 390 y 430
    for (const w of [390, 430]) {
      const mctx = await browser.newContext({ viewport: { width: w, height: 800 }, isMobile: true, hasTouch: true });
      const mp = await mctx.newPage();
      await login(mp, PIN);
      await mp.waitForSelector('.ops-bar');
      t(`móvil ${w}: barra superior con «Atacama OS · ON» y hamburguesa; la barra lateral no se ve`, (await mp.locator('.ops-bar .ops-on').isVisible()) && (await mp.locator('.ops-burger').isVisible()) && !(await mp.locator('.ops-side').isVisible()));
      await shot(mp, `movil-${w}-inicio`);
      await mp.locator('.ops-burger').click();
      await mp.waitForSelector('.ops-drawer-open');
      await shot(mp, `movil-${w}-menu`);
      t(`móvil ${w}: menú con overlay, foco en cerrar y scroll del fondo bloqueado`, (await mp.locator('.ops-overlay').isVisible()) && (await mp.evaluate(() => document.activeElement?.getAttribute('aria-label'))) === 'Cerrar menú' && (await mp.evaluate(() => getComputedStyle(document.body).overflow)) === 'hidden');
      await mp.keyboard.press('Escape');
      await mp.waitForSelector('.ops-drawer-open', { state: 'detached' });
      t(`móvil ${w}: Escape cierra el menú, devuelve el foco a la hamburguesa y libera el scroll`, (await mp.evaluate(() => document.activeElement?.getAttribute('aria-label'))) === 'Abrir menú' && (await mp.evaluate(() => getComputedStyle(document.body).overflow)) !== 'hidden');
      await mp.locator('.ops-burger').click();
      await mp.locator('.ops-drawer .ops-close').click();
      t(`móvil ${w}: la X cierra el menú`, (await mp.locator('.ops-drawer-open').count()) === 0);
      await mp.locator('.ops-burger').click();
      await mp.locator('.ops-drawer a', { hasText: /^Prospección y correo/ }).click();
      await mp.waitForURL(/view=aprobaciones/);
      t(`móvil ${w}: elegir una sección cierra el menú y navega`, (await mp.locator('.ops-drawer-open').count()) === 0 && (await mp.locator('h1').first().innerText()) === 'Aprobaciones');
      await mp.waitForSelector('.ops-ap');
      await shot(mp, `movil-${w}-aprobaciones`);
      t(`móvil ${w}: sin scroll horizontal en Aprobaciones`, await mp.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
      for (const v of ['hoy', 'inicio', 'ideas', 'taller', 'taller&pieza=' + UID(801), 'resultados', 'controles', 'control', 'outreach', 'contenido', 'sistema', 'prospeccion']) {
        await mp.goto(`${APP}/ops?view=${v}`);
        await mp.waitForSelector('h1');
        if (!(await mp.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1))) { t(`móvil ${w}: sin scroll horizontal en ${v}`, false); break; }
      }
      t(`móvil ${w}: sin scroll horizontal en las demás vistas`, true);
      await mctx.close();
    }
  } finally {
    await browser.close().catch(() => {});
    child.kill();
    mock.close();
  }
  console.log(`\n${pass} ok, ${fail} fallos`);
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error('ERROR', e); process.exit(2); });
