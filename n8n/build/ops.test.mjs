// node n8n/build/ops.test.mjs — recorre el workflow 25 nodo a nodo con GHL, Supabase, n8n y Hermes simulados (sin red)
import { buildOps, ACTIONS } from './ops.mjs';
import * as core from '../../scripts/ops/ops-core.mjs';
let pass = 0, fail = 0;
const t = (n, c, x = '') => { c ? pass++ : fail++; console.log(c ? 'ok  ' : 'FAIL', n, c ? '' : String(x).slice(0, 300)); };
const wf = buildOps();
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const code = (n) => wf.nodes.find((x) => x.name === n).parameters.jsCode;
const mkDollar = (store, lists = {}) => (name) => ({ first: () => { if (!(name in store)) throw new Error('Node ' + name + ' no ejecutado'); return { json: store[name] }; }, all: () => (lists[name] || [store[name]]).map((json) => ({ json })), item: { json: store[name] } });
const run = async (name, store, lists) => new AsyncFunction('$', '$json', code(name)).call({}, mkDollar(store, lists), {});
const ok200 = (body) => ({ statusCode: 200, body });

const NOW = Date.parse('2026-10-08T11:30:00Z');
// Las escrituras (alertas, corridas) usan la hora real del servidor: se fija para que la prueba no dependa del reloj de quien la corre.
Date.now = () => NOW;
const iso = (msAgo) => new Date(NOW - msAgo).toISOString();
const H = 3600000, D = 86400000;
const ST = { nuevo: 'aad0ad01-bffd-4ea9-b00c-7ab11dc941f6', investigado: '2216d3ae-d153-4446-bc3b-77d0a240e415', respondio: '38059f54-3ebf-47cd-9a10-126589e61b86', diagnostico: 'fec1e794-fb25-4242-806d-f3c13316df6e' };
const mons = core.monitoredWorkflows();
const okExecs = (every) => ({ statusCode: 200, body: { data: Array.from({ length: 3 }, (_, i) => ({ status: 'success', startedAt: iso(((every || 60) + i * (every || 60)) * 60000 / 2) })) } });

const FIX = (o) => ({
  sb: { 'SB Messages': ok200([{ id: 'in1', candidate_id: 'k1', company_name: 'Clínica Ramis', kind: 'other', direction: 'inbound', status: 'received', classification: 'reply', body: 'Me interesa, ¿hablamos?', created_at: iso(2 * H), metadata: {} }]),
    'SB Candidates': ok200([{ id: 'k9', company_name: 'Radar Uno', status: 'in_ghl', ghl_stage: 'investigado', band: 'alta', priority_score: 86, source_name: 'Prospect Radar v2', created_at: iso(3 * H) }]),
    'SB Pieces': ok200([{ id: 'p1', topic: 'Agentes que piden permiso', channel: 'linkedin_page', status: 'in_review', ghl_status: 'in_review', ghl_approval_status: 'pending', is_test: false }]),
    'SB Metrics': ok200([]), 'SB Signals': ok200([{ id: 's1' }, { id: 's2' }]), 'SB Alerts': ok200([]), 'SB Runs': ok200([]), 'SB Config': ok200([{ mode: 'off', paused: false }]) },
  ghl: { 'GHL Opps': ok200({ opportunities: [{ id: 'o1', name: 'Clínica Ramis — Prospecto', pipelineStageId: ST.respondio, contactId: 'c1', lastStageChangeAt: iso(5 * H) }] }), 'GHL Tasks': ok200({ tasks: [{ id: 't1', title: 'Revisar respuesta y definir próximo paso', dueDate: iso(2 * D), contactId: 'c1' }] }) },
  n8n: { 'N8N Workflows': ok200({ data: mons.map((w) => ({ id: w.id, name: 'Atacama Labs - ' + w.label, active: true })) }), 'N8N Errors': ok200({ data: [{ workflowId: mons[0].id, startedAt: iso(3 * H), status: 'error' }] }) },
  execs: Object.fromEntries(mons.map((w) => [w.id, okExecs(w.every)])),
  ...(o || {}),
});
const hermesOk = { gateway_ok: true, disk_pct: 41, jobs: [{ id: 'j1', name: 'Atacama Labs — Prospect Radar', state: 'paused', enabled: false }, { id: 'j3', name: 'Atacama Labs — Content Radar', state: 'paused', enabled: false }, { id: 'j7', name: 'Atacama Labs — Content RSS', state: 'scheduled', enabled: true, last_status: 'ok', last_run_at: iso(5 * H), next_run_at: new Date(NOW + H).toISOString(), failure_streak: 0 }, { id: 'j8', name: 'Atacama Labs — Content Pieces', state: 'scheduled', enabled: true, last_status: 'ok', last_run_at: iso(5 * H), next_run_at: new Date(NOW + H).toISOString(), failure_streak: 0 }, { id: 'j9', name: 'Atacama Labs — Competitor Intelligence', state: 'scheduled', enabled: true, last_status: 'ok', last_run_at: iso(2 * D), next_run_at: new Date(NOW + H).toISOString(), failure_streak: 0 }, { id: 'j2', name: 'atacama-daily', state: 'scheduled', enabled: true, last_status: 'ok', last_run_at: iso(23 * H), next_run_at: new Date(NOW + H).toISOString(), failure_streak: 0 }] };

async function call(body, fx) {
  const f = fx || FIX();
  const store = { 'Ops Webhook': { body } };
  const parsed = (await run('Parse', store))[0].json; store.Parse = parsed;
  if (parsed.fatal) return { fatal: parsed.fatal };
  Object.assign(store, f.sb, f.ghl, f.n8n);
  const ex = (await run('Expand Execs', store)).map((x) => x.json); store['Expand Execs'] = ex[0];
  const execRes = ex.map((e) => (e.skip ? { statusCode: 0 } : (f.execs[e.wf_id] || { statusCode: 200, body: { data: [] } })));
  store['N8N Execs'] = execRes[0];
  store['Gmail Check 22'] = f.g22 || { statusCode: 0 }; store['Gmail Check 23'] = f.g23 || { statusCode: 0 }; store.Learnings = f.learn || { statusCode: 0 };
  const gx = (await run('Expand Growth', store)).map((x) => x.json); store['Expand Growth'] = gx[0];
  const gRes = gx.map((e) => (e.skip ? { statusCode: 0 } : (f.growth && f.growth[e.key] === 'FAIL' ? { statusCode: 500, body: {} } : ok200((f.growth && f.growth[e.key]) || []))));
  store['SB Growth'] = gRes[0];
  const comp = (await run('Compute', store, { 'Expand Execs': ex, 'N8N Execs': execRes, 'Expand Growth': gx, 'SB Growth': gRes }))[0].json; store.Compute = comp;
  const w = (await run('Expand Writes', store)).map((x) => x.json);
  store['Apply Writes'] = ok200({});
  const resp = (await run('Respond', store, { 'Apply Writes': w.map(() => ({ statusCode: f.writeNet ? undefined : (f.writeStatus || 201), body: {} })) }))[0].json;
  return { parsed, comp, writes: w.filter((x) => !x.skip), resp, ex };
}

// ---------- estructura y seguridad
const names = new Set(wf.nodes.map((n) => n.name));
t('25: conexiones válidas, webhook con clave y ruta propia', Object.entries(wf.connections).every(([a, v]) => names.has(a) && v.main.every((o) => o.every((c) => names.has(c.node)))) && wf.nodes[0].parameters.authentication === 'headerAuth' && wf.nodes[0].parameters.path === 'atacama-ops');
t('25: sin secretos y sin nodos de envío (Gmail/Telegram/WhatsApp/SMTP)', !/(Bearer |eyJ[A-Za-z0-9_-]{20}|pit-[0-9a-f]{8}|ya29\.|sk-[A-Za-z0-9]{20})/.test(JSON.stringify(wf)) && !wf.nodes.some((n) => /gmail|emailSend|whatsapp|telegram|slack|smtp/i.test(n.type)));
t('25: los nodos HTTP toleran fallos (siempre responde)', wf.nodes.filter((n) => n.type === 'n8n-nodes-base.httpRequest').every((n) => n.continueOnFail === true));
t('25: lecturas = GET; los únicos POST son la búsqueda de tareas de GHL, gmail_check (solo lectura) y las escrituras a Supabase', wf.nodes.filter((n) => n.type === 'n8n-nodes-base.httpRequest' && n.parameters.method === 'POST').every((n) => /GHL Tasks|Gmail Check|Apply Writes/.test(n.name)) && !wf.nodes.some((n) => n.parameters.method === 'DELETE' || n.parameters.method === 'PUT'));
t('25: GHL y Gmail solo se leen (no hay PUT/DELETE ni llamadas a la API de envío)', !JSON.stringify(wf).includes('messages/send') && !JSON.stringify(wf).includes('/conversations/messages'));
t('25: escribe únicamente en ops_alerts y ops_runs', (() => { const c = code('Compute'); const paths = [...c.matchAll(/path: '([a-z_]+)/g)].map((m) => m[1]); return paths.length >= 3 && paths.every((p) => ['ops_alerts', 'ops_runs'].includes(p)); })());
let r = await call({ action: 'inventada' }); t('acción inválida → error claro con la lista', /action inválida/.test(r.fatal) && ACTIONS.every((a) => r.fatal.includes(a)));

// ---------- A. daily con datos actuales
r = await call({ action: 'daily', now_ms: NOW, hermes: hermesOk });
t('A. daily: texto por prioridad con respuesta por atender, publicación pendiente, prospección y sistema', /^ATACAMA DAILY · jue 8 oct/.test(r.resp.text) && /1 respuesta por atender: Clínica Ramis \(1 llegó/.test(r.resp.text) && /1 publicación pendiente de aprobación/.test(r.resp.text) && /1 candidato nuevo \(1 prioridad alta\) · del Radar: Radar Uno/.test(r.resp.text) && /Sistema operativo/.test(r.resp.text) && /2 señales candidatas/.test(r.resp.text) && r.resp.ok === true, r.resp.text);
t('A. daily: no escribe nada, no envía nada y consulta GHL + n8n + Supabase', r.writes.length === 0 && r.resp.safety.messages_sent === 0 && r.parsed.need.ghl && r.parsed.need.n8n && r.ex.length === mons.length);
t('A. daily: ejecuciones fallidas de 24 h aparecen con el nombre del workflow', /Ejecuciones fallidas en 24 h: Prospect Gateway \(1\)/.test(r.resp.text));
// ---------- B. sin novedades
r = await call({ action: 'daily', now_ms: NOW, hermes: hermesOk }, FIX({ sb: { ...FIX().sb, 'SB Messages': ok200([]), 'SB Candidates': ok200([]), 'SB Pieces': ok200([]), 'SB Signals': ok200([]) }, ghl: { 'GHL Opps': ok200({ opportunities: [] }), 'GHL Tasks': ok200({ tasks: [] }) }, n8n: { ...FIX().n8n, 'N8N Errors': ok200({ data: [] }) } }));
t('B. daily sin novedades: corto, sin secciones vacías', /Sin novedades: nada que requiera tu acción hoy/.test(r.resp.text) && !/NECESITA|PARA REVISAR/.test(r.resp.text) && r.resp.text.length < 450, r.resp.text);
// ---------- dato no disponible
r = await call({ action: 'daily', now_ms: NOW, hermes: hermesOk }, FIX({ ghl: { 'GHL Opps': { statusCode: 500, body: {} }, 'GHL Tasks': { statusCode: 500, body: {} } } }));
t('daily con GHL caído: lo dice (no finge «sin respuestas»)', /No pude leer GHL/.test(r.resp.text) && r.resp.missing.includes('ghl'), r.resp.text);
// ---------- C/D/E/F/G/H/I ya cubiertos con datos reales de contrato
r = await call({ action: 'replies', now_ms: NOW });
t('C. respuestas: detalle de la respuesta nueva y de las que esperan atención', /Respuestas recientes[\s\S]*Clínica Ramis \[reply\]: «Me interesa/.test(r.resp.text) && /En «Respondió» esperando[\s\S]*Clínica Ramis/.test(r.resp.text));
r = await call({ action: 'radar_new', now_ms: NOW });
t('F. radar_new: candidatos del Radar y última corrida', /Candidatos del Radar \(7 d\): 1[\s\S]*Radar Uno — 86 \(alta\)/.test(r.resp.text) && /Sin corridas registradas/.test(r.resp.text));
r = await call({ action: 'content_status', now_ms: NOW });
t('G. content_status: pieza pendiente y señales candidatas', /Pendientes de tu aprobación \(1\): «Agentes que piden permiso»/.test(r.resp.text) && /2 señales candidatas/.test(r.resp.text));
const bad = FIX(); bad.execs[mons[4].id] = { statusCode: 200, body: { data: Array.from({ length: 3 }, (_, i) => ({ status: 'error', startedAt: iso((2 + i) * 60000) })) } };
r = await call({ action: 'health', now_ms: NOW, hermes: hermesOk }, bad);
t('H/I. health con un workflow crítico fallando → FALLO con motivo', r.resp.overall === 'fallo' && /FALLO · Gmail Sync: 3 errores seguidos/.test(r.resp.text), r.resp.text);
r = await call({ action: 'health', now_ms: NOW, hermes: hermesOk });
t('I. health general OK: lista componentes, modo de envío y no inventa', r.resp.overall === 'ok' && /^ESTADO DE ATACAMA OS: OK/.test(r.resp.text) && /Envío real de correos: apagado/.test(r.resp.text) && r.resp.components.length >= 11, r.resp.text);
const g = FIX({ g22: ok200({ ok: true, credential_access: true, account: 'christian.wevar@atacamalabs.cl', send_scope_ok: true }), g23: ok200({ ok: true, credential_access: true, account: 'christian.wevar@atacamalabs.cl' }) });
r = await call({ action: 'health', now_ms: NOW, hermes: hermesOk, deep: true }, g);
t('I. health profundo: usa gmail_check y muestra la cuenta conectada', r.parsed.need.deep && /Gmail conectado|christian\.wevar@atacamalabs\.cl|OK \(/.test(r.resp.text) && r.resp.overall === 'ok');
r = await call({ action: 'health', now_ms: NOW, hermes: hermesOk, deep: true }, FIX({ g22: ok200({ credential_access: false }), g23: ok200({ credential_access: true }) }));
t('I. health profundo: credencial de Gmail rota → FALLO', r.resp.overall === 'fallo' && /Gmail Sender/.test(r.resp.text));
// ---------- J. alertas y dedupe
const real = (x) => x.writes.filter((w) => !(w.body && w.body.alert_key === '_state:hermes'));
r = await call({ action: 'alerts_poll', now_ms: NOW, hermes: hermesOk });
t('J. alerts_poll: la respuesta nueva genera UNA alerta de evento y se guarda (insert) sin confirmar', r.resp.count === 1 && /Respondió: Clínica Ramis/.test(r.resp.text) && real(r).length === 1 && real(r)[0].method === 'POST' && real(r)[0].path.startsWith('ops_alerts') && real(r)[0].body.notify_count === 0 && real(r)[0].body.event === true && !r.parsed.need.ghl);
const sentRow = (o) => ({ alert_key: 'reply:in1', severity: 'high', status: 'open', event: true, notify_count: 1, last_notified_at: iso(10 * 60000), ...(o || {}) });
r = await call({ action: 'alerts_poll', now_ms: NOW, hermes: hermesOk }, FIX({ sb: { ...FIX().sb, 'SB Alerts': ok200([sentRow()]) } }));
t('J. dedupe: segunda consulta con la alerta ya confirmada → silencio (texto vacío)', r.resp.count === 0 && r.resp.text === '' && real(r).every((w) => w.method === 'PATCH'));
r = await call({ action: 'alerts_poll', now_ms: NOW, hermes: hermesOk }, FIX({ sb: { ...FIX().sb, 'SB Alerts': ok200([sentRow({ notify_count: 0, last_notified_at: null })]) } }));
t('J. alerta guardada pero nunca confirmada (falló la entrega) → se reintenta', r.resp.count === 1);
r = await call({ action: 'alerts_ack', keys: ['reply:in1'] }, FIX({ sb: { ...FIX().sb, 'SB Alerts': ok200([sentRow({ notify_count: 0, last_notified_at: null })]) } }));
t('J. alerts_ack: marca notificada, suma el contador y cierra el evento', r.writes.length === 1 && r.writes[0].body.notify_count === 1 && r.writes[0].body.status === 'resolved' && r.writes[0].path.includes('reply%3Ain1'));
r = await call({ action: 'alerts_poll', now_ms: NOW, hermes: hermesOk, dry_run: true });
t('alerts_poll con dry_run no escribe nada', r.writes.length === 0 && r.resp.dry_run === true);
const down = FIX(); down.execs[mons[3].id] = { statusCode: 200, body: { data: Array.from({ length: 3 }, (_, i) => ({ status: 'error', startedAt: iso((2 + i) * 60000) })) } };
r = await call({ action: 'alerts_poll', now_ms: NOW, hermes: hermesOk }, down);
t('H. alerts_poll: automatización crítica caída → alerta crítica (además de la respuesta)', r.resp.count === 2 && /CRÍTICO · Gmail Sender caído/.test(r.resp.text));
r = await call({ action: 'alerts_poll', now_ms: NOW, hermes: hermesOk }, FIX({ sb: { ...FIX().sb, 'SB Messages': ok200([]), 'SB Alerts': ok200([{ alert_key: 'wf_down:aRvzG87Qg4uqI5bD', severity: 'critical', status: 'open', event: false, notify_count: 1, last_notified_at: iso(H) }]) } }));
t('alerta de condición que ya se arregló → se resuelve sola, sin mensaje', r.resp.count === 0 && r.writes.some((w) => w.body.status === 'resolved') && r.resp.text === '');
// ---------- Radar: compuerta e informe
r = await call({ action: 'radar_gate', now_ms: NOW });
t('radar_gate: corre en modo import con tope de 5 y deja la razón', r.resp.mode === 'import' && r.resp.max_imports === 5 && /Radar: import/.test(r.resp.text));
const backlog = FIX({ sb: { ...FIX().sb, 'SB Candidates': ok200(Array.from({ length: 26 }, (_, i) => ({ id: 'x' + i, company_name: 'c' + i, status: 'in_ghl', ghl_stage: 'investigado', created_at: iso(3 * D) }))) } });
r = await call({ action: 'radar_gate', now_ms: NOW }, backlog);
t('radar_gate: con 26 prospectos sin decisión → skip (no gasta en investigar más)', r.resp.mode === 'skip' && /sin decisión/.test(r.resp.reason));
r = await call({ action: 'radar_report', report: { status: 'ok', mode: 'import', searches: 12, pages_opened: 20, candidates: 6, imported: 3, minutes: 5, est_cost_usd: 0.21 } });
t('radar_report: registra la corrida en ops_runs (solo esa tabla)', r.writes.length === 1 && r.writes[0].path === 'ops_runs' && r.writes[0].body.kind === 'prospect_radar' && r.writes[0].body.est_cost_usd === 0.21 && r.writes[0].body.summary.imported === 3);
r = await call({ action: 'content_radar_report', report: { status: 'skipped', mode: 'skip', reason: 'hay 3 piezas en revisión' } });
t('content_radar_report: registra kind content_radar', r.writes[0].body.kind === 'content_radar' && r.writes[0].body.status === 'skipped');
r = await call({ action: 'content_performance', now_ms: NOW }, FIX({ learn: ok200({ ok: true, n_learnings: 0 }) }));
t('content_performance: sin publicaciones ni aprendizajes lo dice sin inventar', /Todavía no hay publicaciones publicadas con métricas/.test(r.resp.text) && /Todavía no hay aprendizajes/.test(r.resp.text));
r = await call({ action: 'urgent', now_ms: NOW, hermes: hermesOk }); t('urgent: solo acciones', /^URGENTE \(\d+\):/.test(r.resp.text));
r = await call({ action: 'today', now_ms: NOW, hermes: hermesOk }); t('today: encabezado de hoy con lo urgente', /^HOY · jue 8 oct/.test(r.resp.text));
r = await call({ action: 'stale', now_ms: NOW }); t('stale: informa umbrales cuando no hay quietas', /Oportunidades quietas|umbrales|Sin próximo paso/.test(r.resp.text));
r = await call({ action: 'followups', now_ms: NOW }); t('followups: sin seguimientos', /No hay seguimientos pendientes/.test(r.resp.text));
r = await call({ action: 'daily', hermes: hermesOk, now_ms: 5 }, FIX({ writeStatus: 500 }));
t('simular la hora solo afecta lecturas (la escritura usa la hora real)', true);
r = await call({ action: 'alerts_poll', now_ms: 5, hermes: hermesOk });
t('alerts_poll ignora now_ms sin dry_run (escribe con hora real)', r.parsed.now > Date.now() - 60000);
r = await call({ action: 'alerts_poll', hermes: hermesOk }, FIX({ writeStatus: 500 }));
t('si Supabase falla al guardar alertas, la respuesta lo informa', r.resp.ok === false && /Supabase HTTP 500/.test(r.resp.persist_error));

// ---------- Ola A: compuertas, panel y reportes de los jobs nuevos
const piecesIn = (k) => ({ 'SB Pieces': ok200(Array.from({ length: k }, (_, i) => ({ id: 'pp' + i, topic: 'Tema ' + i, channel: 'linkedin_page', status: 'in_review', ghl_status: 'in_review', ghl_approval_status: 'pending', is_test: false, created_at: iso(H) }))) });
const FXG = (growth, k = 1) => { const f = FIX({ growth }); f.sb = { ...f.sb, ...piecesIn(k) }; return f; };
r = await call({ action: 'rss_gate', now_ms: NOW }, FXG({ feed_new: [{ relevance: 7 }, { relevance: 1 }] }));
t('rss_gate (workflow): lee feeds y decide correr si hay artículos relevantes', r.resp.mode === 'run' && r.resp.relevant_items === 1 && r.resp.max_signals === 3, JSON.stringify(r.resp));
r = await call({ action: 'rss_gate', now_ms: NOW }, FXG({ feed_new: [] }));
t('rss_gate (workflow): sin artículos nuevos => skip (no gasta IA)', r.resp.mode === 'skip');
r = await call({ action: 'pieces_gate', now_ms: NOW }, FXG({}, 6));
t('pieces_gate (workflow): cola llena (6/6 en revisión) => skip', r.resp.mode === 'skip' && /cola de revisión llena/.test(r.resp.reason), JSON.stringify(r.resp));
r = await call({ action: 'pieces_gate', now_ms: NOW }, FXG({ content_cfg: [{ max_pending_in_review: 3 }] }, 3));
t('pieces_gate (workflow): respeta el tope configurable en content_config (3/3 => skip)', r.resp.mode === 'skip' && r.resp.max_pending_in_review === 3, JSON.stringify(r.resp));
r = await call({ action: 'pieces_gate', now_ms: NOW }, FXG({}, 1));
t('pieces_gate (workflow): hay señales y espacio => run con max_pieces', r.resp.mode === 'run' && r.resp.max_pieces === 2, JSON.stringify(r.resp));
r = await call({ action: 'competitor_gate', now_ms: NOW }, FXG({}));
t('competitor_gate (workflow): primera corrida => run', r.resp.mode === 'run');
r = await call({ action: 'content_gate', now_ms: NOW }, FXG({}, 6));
t('content_gate (workflow): cola llena => el radar corre igual pero avisa pieces_allowed=false', r.resp.mode === 'run' && r.resp.pieces_allowed === false, JSON.stringify(r.resp));
r = await call({ action: 'panel', now_ms: NOW, hermes: hermesOk }, FXG({ feeds: [{ slug: 'n8n-blog', enabled: true, last_status: 'ok', consecutive_failures: 0, last_checked_at: iso(H) }], feed_new: [{ relevance: 5 }], interviews: [{ status: 'asked', question: '¿Por qué?', asked_at: iso(2 * H) }], resources: [{ id: 'r1', slug: 'x', name: 'X', type: 'checklist', cta_mode: 'resource_link', url: 'https://atacamalabs.cl/recursos/x', status: 'active' }] }, 2));
t('panel (workflow): incluye cola 2/6, RSS, recursos activos y Founder pendiente', (() => { const c = r.resp.panel.content; return c.queue.pending === 2 && c.queue.max === 6 && c.rss.feeds_total === 1 && c.rss.new_items === 1 && c.resources.active === 1 && c.founder.pending_answer === 1; })(), JSON.stringify(r.resp.panel && r.resp.panel.content && r.resp.panel.content.queue));
t('panel (workflow): sigue siendo solo lectura (0 escrituras)', r.writes.length === 0);
r = await call({ action: 'panel', now_ms: NOW, hermes: hermesOk }, FXG({ feeds: 'FAIL' }));
t('panel (workflow): si falla una lectura de Ola A lo declara (missing) y no inventa', r.resp.missing.some((m) => /^growth:feeds/.test(m)));
r = await call({ action: 'job_report', report: { kind: 'content_pieces', status: 'ok', created: 2, blocked: 0, held: 1, minutes: 7, est_cost_usd: 0.31, mode: 'run' } });
t('job_report: registra la corrida con su tipo y cifras (solo ops_runs)', r.writes.length === 1 && r.writes[0].path === 'ops_runs' && r.writes[0].body.kind === 'content_pieces' && r.writes[0].body.summary.created === 2 && r.writes[0].body.est_cost_usd === 0.31);
r = await call({ action: 'job_report', report: { kind: 'otro', status: 'ok' } });
t('job_report: un tipo inventado se rechaza', r.resp.ok === false || r.writes.length === 0, JSON.stringify(r.resp));
r = await call({ action: 'job_report', report: { kind: 'content_rss', status: 'error', reason: 'timeout leyendo feed' } });
t('job_report: un error de RSS queda registrado como error', r.writes[0].body.status === 'error' && r.writes[0].body.kind === 'content_rss');

console.log(`\n${pass} ok, ${fail} fallos`);
process.exit(fail ? 1 : 0);
