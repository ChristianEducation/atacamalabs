#!/usr/bin/env node
/**
 * Radar estratégico · pruebas de contrato (spec §13): forma de las respuestas, fallbacks, compuerta, Daily y que NADA escribe.
 * Ejecuta de verdad los Code nodes del workflow 25 (Parse → Expand Growth → Compute) con respuestas simuladas de Supabase: sin red, sin credenciales.
 */
import assert from 'node:assert/strict';
import { buildOps, ACTIONS } from '../../n8n/build/ops.mjs';
import * as core from './ops-core.mjs';

let n = 0;
const ok = async (name, fn) => { try { await fn(); n++; } catch (e) { console.error('FAIL', name, '\n', String(e.stack).split('\n').slice(0, 5).join('\n')); process.exitCode = 1; } };

const wf = buildOps();
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const code = (nm) => wf.nodes.find((x) => x.name === nm).parameters.jsCode;
const mkDollar = (store, lists = {}) => (name) => ({ first: () => { if (!(name in store)) throw new Error('Node ' + name + ' no ejecutado'); return { json: store[name] }; }, all: () => (lists[name] || [store[name]]).map((json) => ({ json })), item: { json: store[name] } });
const run = async (nm, store, lists) => new AsyncFunction('$', '$json', code(nm)).call({}, mkDollar(store, lists), {});
const ok200 = (body) => ({ statusCode: 200, body });

const NOW = Date.parse('2026-11-02T15:00:00Z');
const MIN = 60000, DAY = 86400000;
const iso = (ms) => new Date(ms).toISOString();
const mons = core.monitoredWorkflows();

const BASE = () => ({
  sb: { 'SB Messages': ok200([]), 'SB Candidates': ok200([]), 'SB Pieces': ok200([]), 'SB Metrics': ok200([]), 'SB Signals': ok200([]), 'SB Alerts': ok200([]), 'SB Runs': ok200([]), 'SB Config': ok200([{ mode: 'off', paused: false }]) },
  ghl: { 'GHL Opps': ok200({ opportunities: [] }), 'GHL Tasks': ok200({ tasks: [] }) },
  n8n: { 'N8N Workflows': ok200({ data: mons.map((w) => ({ id: w.id, name: 'Atacama Labs - ' + w.label, active: true })) }), 'N8N Errors': ok200({ data: [] }) },
});

/** Ejecuta Parse + lecturas + Compute como lo haría n8n. `growth[key]` = filas, o 'FAIL' para simular tabla ausente / red caída. */
async function call(body, growth = {}, alerts = []) {
  const f = BASE(); if (alerts.length) f.sb['SB Alerts'] = ok200(alerts);
  const store = { 'Ops Webhook': { body: { now_ms: NOW, ...body } } };
  const parsed = (await run('Parse', store))[0].json; store.Parse = parsed;
  if (parsed.fatal) return { fatal: parsed.fatal };
  Object.assign(store, f.sb, f.ghl, f.n8n);
  const ex = (await run('Expand Execs', store)).map((x) => x.json); store['Expand Execs'] = ex[0];
  const execRes = ex.map(() => ({ statusCode: 200, body: { data: [] } })); store['N8N Execs'] = execRes[0];
  store['Gmail Check 22'] = { statusCode: 0 }; store['Gmail Check 23'] = { statusCode: 0 }; store.Learnings = { statusCode: 0 };
  const gx = (await run('Expand Growth', store)).map((x) => x.json); store['Expand Growth'] = gx[0];
  const gRes = gx.map((e) => (e.skip ? { statusCode: 0 } : growth[e.key] === 'FAIL' ? { statusCode: 404, body: {} } : ok200(growth[e.key] || [])));
  store['SB Growth'] = gRes[0];
  store['Sign Prep'] = (await run('Sign Prep', store, { 'Expand Growth': gx, 'SB Growth': gRes }))[0].json; store['SB Sign'] = { statusCode: 0 };
  const comp = (await run('Compute', store, { 'Expand Execs': ex, 'N8N Execs': execRes, 'Expand Growth': gx, 'SB Growth': gRes }))[0].json; store.Compute = comp;
  return { parsed, comp, out: comp.out, writes: comp.writes, reads: gx.filter((x) => !x.skip) };
}

const CFG = (o) => ({ id: 1, production_enabled: false, products_enabled: false, partners_enabled: false, events_enabled: false, telegram_noncritical_enabled: false, daily_max_items: 0, ai_max_items_per_run: 12, ...o });
const SEED = ['Atacama Labs / OS', 'Librería Crecer', 'Pedidos Empresas', 'Registro Almuerzos', 'Casino Escolar'].map((nm, i) => ({ id: 't' + i, logical_name: nm, repo_full_name: null, status: 'candidate', monitor_enabled: false, verified_at: null, deployment_url: null, health_url: null, is_test: false }));
const opp = (o) => ({ id: 'o1', kind: 'event', title: 'Evento B2B Antofagasta', status: 'new', score: 82, confidence: 'high', deadline_at: iso(NOW + 5 * DAY), next_action: 'Decidir si postular', last_daily_at: null, is_test: false, ...o });
const down = (id, minsAgo) => ({ target_id: id, checked_at: iso(NOW - minsAgo * MIN), result: 'down', is_test: false });

// ---------- registro de acciones
await ok('25: las tres acciones del Radar existen y no hay acciones de escritura estratégicas', () => {
  for (const a of ['strategic_view', 'strategic_today', 'strategic_gate']) assert.ok(ACTIONS.includes(a), a);
  assert.deepEqual(ACTIONS.filter((a) => /^strategic_/.test(a)).sort(), ['strategic_gate', 'strategic_today', 'strategic_view']);
});

// ---------- lecturas
await ok('Parse: strategic_view sin tab = producción; solo SELECT a tablas strategic_* y todo con is_test=false', async () => {
  const r = await call({ action: 'strategic_view' });
  assert.equal(r.parsed.params && Object.keys(r.parsed.params).length, 0);
  const keys = r.reads.map((x) => x.key).sort();
  assert.deepEqual(keys, ['sr_cfg', 'sr_checks', 'sr_runs', 'sr_targets']);
  for (const x of r.reads.filter((q) => q.key !== 'sr_cfg')) assert.ok(/supabase\.co\/rest\/v1\/strategic_/.test(x.url) && x.url.includes('is_test=eq.false'), x.key);
  assert.ok(r.reads.every((q) => !/content_|outreach_|prospect_|ops_runs/.test(q.url)), 'no lee tablas ajenas');
});
await ok('Parse: cada pestaña pide su categoría; una pestaña inválida cae en producción', async () => {
  assert.ok((await call({ action: 'strategic_view', params: { tab: 'products' } })).reads.some((x) => x.key === 'sr_opps' && x.url.includes('kind=eq.product&')));
  assert.ok((await call({ action: 'strategic_view', params: { tab: 'partners' } })).reads.some((x) => x.key === 'sr_opps' && x.url.includes('kind=eq.partner&')));
  assert.ok((await call({ action: 'strategic_view', params: { tab: 'events' } })).reads.some((x) => x.key === 'sr_opps' && x.url.includes('kind=eq.event&')));
  const bad = await call({ action: 'strategic_view', params: { tab: "x'; drop table--" } });
  assert.equal(bad.out.strategic.tab, 'production');
  assert.ok(bad.reads.every((x) => !/drop/i.test(x.url)));
});
await ok('Parse: el parámetro no puede inyectar rutas, tablas ni URLs', async () => {
  const r = await call({ action: 'strategic_gate', params: { kind: 'products&select=*&service_role=1', table: 'users', url: 'https://evil.test', path: '../x' } });
  assert.ok(r.reads.every((x) => x.url.startsWith('https://uwquwjmiofixzugttals.supabase.co/rest/v1/') && !/evil|users|service_role/.test(x.url)));
  assert.equal(r.out.mode, 'skip');
});

// ---------- estado vacío / apagado
await ok('View producción, todo apagado: 5 candidatos «Por verificar», sin salud, sin alertas, sin contadores falsos', async () => {
  const r = await call({ action: 'strategic_view' }, { sr_cfg: [CFG()], sr_targets: SEED });
  const s = r.out.strategic;
  assert.equal(r.out.ok, true); assert.equal(r.out.action, 'strategic_view');
  assert.equal(s.enabled, false); assert.equal(s.source_state, 'ok'); assert.equal(s.items.length, 5);
  assert.ok(s.items.every((t) => t.section === 'pending' && t.http_state === 'unverified' && t.last_checked_at === null));
  assert.deepEqual(s.summary, { total: 5, pending: 5, alerts: 0, last_run_at: null });
  assert.equal(r.writes.length, 0);
});
await ok('View productos/alianzas/eventos, apagado y sin datos: items [] y enabled false (la pestaña igual se puede abrir)', async () => {
  for (const tab of ['products', 'partners', 'events']) {
    const s = (await call({ action: 'strategic_view', params: { tab } }, { sr_cfg: [CFG()] })).out.strategic;
    assert.equal(s.tab, tab); assert.equal(s.enabled, false); assert.equal(s.source_state, 'ok'); assert.deepEqual(s.items, []);
  }
});
await ok('View: oportunidades reales llegan ordenadas y las de prueba/descartadas no se muestran', async () => {
  const rows = [opp({ id: 'a', kind: 'product', score: 60, title: 'B' }), opp({ id: 'b', kind: 'product', score: 90, title: 'A' }), opp({ id: 'c', kind: 'product', score: 99, is_test: true }), opp({ id: 'd', kind: 'product', score: 95, status: 'dismissed' })];
  const s = (await call({ action: 'strategic_view', params: { tab: 'products' } }, { sr_cfg: [CFG({ products_enabled: true })], sr_opps: rows })).out.strategic;
  assert.deepEqual(s.items.map((i) => i.id), ['b', 'a']);
  assert.equal(s.enabled, true);
});

// ---------- fallos: nunca un vacío falso
await ok('Tabla ausente (migración sin aplicar) o lectura parcial = source_state unavailable, sin items ni contadores', async () => {
  for (const g of [{ sr_cfg: 'FAIL' }, { sr_cfg: [CFG()], sr_targets: 'FAIL' }, { sr_cfg: [CFG()], sr_targets: SEED, sr_checks: 'FAIL' }]) {
    const s = (await call({ action: 'strategic_view' }, g)).out.strategic;
    assert.equal(s.source_state, 'unavailable'); assert.deepEqual(s.items, []); assert.deepEqual(s.summary, { total: 0, pending: 0, alerts: 0, last_run_at: null });
  }
});
await ok('Sin fila de configuración = not_configured (no «ok»)', async () => {
  const s = (await call({ action: 'strategic_view' }, { sr_cfg: [], sr_targets: SEED })).out.strategic;
  assert.equal(s.source_state, 'not_configured');
});

// ---------- salud HTTP
await ok('View producción: confirmado + monitoreado con dos caídas seguidas = down; la alerta abierta se refleja', async () => {
  const T = { id: 'tc', logical_name: 'Librería Crecer', status: 'confirmed', monitor_enabled: true, verified_at: iso(NOW - DAY), health_url: 'https://example.org/health', is_test: false };
  const r = await call({ action: 'strategic_view' }, { sr_cfg: [CFG({ production_enabled: true })], sr_targets: [T, ...SEED], sr_checks: [down('tc', 5), down('tc', 20)] });
  const s = r.out.strategic;
  assert.equal(s.items[0].id, 'tc'); assert.equal(s.items[0].http_state, 'down'); assert.equal(s.items[0].section, 'confirmed'); assert.equal(s.summary.alerts, 1);
  assert.ok(s.items.slice(1).every((t) => t.section === 'pending' && t.http_state === 'unverified'));
});
await ok('View producción: un solo timeout = degradado por confirmar; >60 min sin chequeos = unknown con última hora, nunca down', async () => {
  const T = { id: 'tc', logical_name: 'X', status: 'confirmed', monitor_enabled: true, verified_at: iso(NOW - DAY), health_url: 'https://example.org/h', is_test: false };
  const one = (await call({ action: 'strategic_view' }, { sr_cfg: [CFG()], sr_targets: [T], sr_checks: [down('tc', 5)] })).out.strategic.items[0];
  assert.equal(one.http_state, 'degraded');
  const old = (await call({ action: 'strategic_view' }, { sr_cfg: [CFG()], sr_targets: [T], sr_checks: [down('tc', 90), down('tc', 100)] })).out.strategic.items[0];
  assert.equal(old.http_state, 'unknown'); assert.ok(old.last_checked_at);
});

// ---------- strategic_today
await ok('today: apagado/sin datos = items [] (el Daily no cambia)', async () => {
  const r = await call({ action: 'strategic_today' }, { sr_cfg: [CFG()], sr_targets: [], sr_checks: [], sr_opps: [] });
  assert.deepEqual(r.out.items, []); assert.equal(r.out.ok, true); assert.equal(r.out.action, 'strategic_today'); assert.equal(r.writes.length, 0);
});
await ok('today: con daily_max_items = 0 (estado inicial) NO sale nada aunque haya hallazgos', async () => {
  const T = { id: 'tc', logical_name: 'X', status: 'confirmed', monitor_enabled: true, is_test: false };
  const r = await call({ action: 'strategic_today' }, { sr_cfg: [CFG({ daily_max_items: 0 })], sr_targets: [T], sr_checks: [down('tc', 5), down('tc', 20)], sr_opps: [opp()] });
  assert.deepEqual(r.out.items, []);
});
await ok('today: 5 hallazgos elegibles → máximo 3, en orden caído > plazo ≤7 > plazo 8–14 > producto', async () => {
  const T = { id: 'tc', logical_name: 'Librería Crecer', status: 'confirmed', monitor_enabled: true, is_test: false };
  const prod = opp({ id: 'p1', kind: 'product', title: 'Prod', deadline_at: null, score: 88, license_verified: true, license_id: 'MIT', coverage_pct: 95, critical_blockers: [], score_parts: {} });
  const opps = [prod, opp({ id: 'e12', title: 'Evento 12d', deadline_at: iso(NOW + 12 * DAY) }), opp({ id: 'e5', title: 'Evento 5d' }), opp({ id: 'e3', kind: 'partner', title: 'Programa 3d', deadline_at: iso(NOW + 3 * DAY) })];
  const r = await call({ action: 'strategic_today' }, { sr_cfg: [CFG({ daily_max_items: 3 })], sr_targets: [T], sr_checks: [down('tc', 5), down('tc', 20)], sr_opps: opps });
  assert.equal(r.out.items.length, 3);
  assert.deepEqual(r.out.items.map((i) => i.class + ':' + i.id), ['production:tc', 'partner:e3', 'event:e5']);
  assert.ok(r.out.items.every((i) => i.what && i.why && i.action && /^radar_/.test(i.tab)));
});
await ok('today: evento ya informado, sin plazo, de prueba o de baja confianza → no es señal', async () => {
  const opps = [opp({ id: 'a', last_daily_at: iso(NOW - DAY) }), opp({ id: 'b', deadline_at: null }), opp({ id: 'c', is_test: true }), opp({ id: 'd', confidence: 'low' }), opp({ id: 'e', score: 60 })];
  const r = await call({ action: 'strategic_today' }, { sr_cfg: [CFG({ daily_max_items: 3 })], sr_opps: opps });
  assert.deepEqual(r.out.items, []);
});
await ok('today: lectura caída → items [] y source_state unavailable (el Daily sigue sin bloque)', async () => {
  const r = await call({ action: 'strategic_today' }, { sr_cfg: [CFG({ daily_max_items: 3 })], sr_opps: 'FAIL' });
  assert.deepEqual(r.out.items, []); assert.equal(r.out.source_state, 'unavailable');
  assert.deepEqual((await call({ action: 'strategic_today' }, { sr_cfg: 'FAIL' })).out.items, []);
});

// ---------- strategic_gate
await ok('gate: bandera apagada, tabla ausente o kind inválido → skip', async () => {
  assert.equal((await call({ action: 'strategic_gate', params: { kind: 'products' } }, { sr_cfg: [CFG()] })).out.reason, 'flag_off');
  assert.equal((await call({ action: 'strategic_gate', params: { kind: 'products' } }, { sr_cfg: 'FAIL' })).out.reason, 'source_unavailable');
  const bad = (await call({ action: 'strategic_gate', params: { kind: 'oro' } }, { sr_cfg: [CFG({ products_enabled: true })] })).out;
  assert.equal(bad.mode, 'skip'); assert.equal(bad.reason, 'kind_invalid');
});
await ok('gate: encendido corre con tope (≤12); pausa general, corrida reciente y cuota lo detienen', async () => {
  const on = (o) => ({ sr_cfg: [CFG({ products_enabled: true, ...o })] });
  const run1 = (await call({ action: 'strategic_gate', params: { kind: 'products' } }, on({ ai_max_items_per_run: 5 }))).out;
  assert.deepEqual([run1.mode, run1.max_items], ['run', 5]);
  assert.equal((await call({ action: 'strategic_gate', params: { kind: 'products' } }, { ...on(), sys_state: [{ id: 1, global_pause: true, reason: 'viaje', meta: {} }] })).out.mode, 'skip');
  assert.equal((await call({ action: 'strategic_gate', params: { kind: 'products' } }, { ...on(), sr_runs: [{ kind: 'products', status: 'ok', finished_at: iso(NOW - 60 * MIN), is_test: false }] })).out.reason, 'recent_run');
  const failed = [1, 2, 3].map((i) => ({ kind: 'products', status: 'failed', finished_at: iso(NOW - i * 60 * MIN), is_test: false }));
  assert.equal((await call({ action: 'strategic_gate', params: { kind: 'products' } }, { ...on(), sr_runs: failed })).out.reason, 'quota');
});
await ok('gate producción: sin target confirmado y monitoreado = no_source; con uno corre sin IA (max_items 0)', async () => {
  const cfg = { sr_cfg: [CFG({ production_enabled: true })] };
  assert.equal((await call({ action: 'strategic_gate', params: { kind: 'production' } }, cfg)).out.reason, 'no_source');
  const r = (await call({ action: 'strategic_gate', params: { kind: 'production' } }, { ...cfg, sr_tmon: [{ id: 'tc' }] })).out;
  assert.deepEqual([r.mode, r.max_items], ['run', 0]);
  assert.ok(/^Radar estratégico \(production\): run/.test(r.text));
});

// ---------- sin regresiones: Daily, panel y demás no leen ni muestran nada estratégico
await ok('daily y panel no hacen ninguna lectura del Radar ni cambian de texto', async () => {
  for (const action of ['daily', 'panel', 'today', 'health']) {
    const r = await call({ action });
    assert.ok(!r.reads.some((x) => /strategic_|^sr_/.test(x.key + x.url)), action + ' no debe leer el Radar');
    assert.ok(!/Radar estratégico/.test(JSON.stringify(r.out)), action + ' no menciona el Radar');
  }
});
await ok('las acciones estratégicas jamás escriben ni envían (writes = [], sin mensajes)', async () => {
  for (const a of [{ action: 'strategic_view' }, { action: 'strategic_today' }, { action: 'strategic_gate', params: { kind: 'events' } }]) {
    const r = await call(a, { sr_cfg: [CFG({ events_enabled: true })] });
    assert.deepEqual(r.writes, []);
  }
});
await ok('el workflow 25 no suma nodos de envío ni credenciales nuevas por el Radar', () => {
  assert.ok(!wf.nodes.some((x) => /gmail|emailSend|whatsapp|telegram|slack|smtp/i.test(x.type)));
  const creds = new Set(wf.nodes.flatMap((x) => Object.values(x.credentials || {}).map((c) => c.id)));
  assert.deepEqual([...creds].sort(), ['4Vc6nfxyKjZ14Bep', 'V2SOaE1TC54lPbJ2', 'XOmXUuyLVSazDIh5', 'lUGhlXVaQBEiEh5S']);
});

console.log(`${n} ok`);
