#!/usr/bin/env node
/**
 * Prueba del verificador de preactivación: lo corre de verdad contra un servidor local que EJECUTA los Code nodes reales de los workflows 25 y 29
 * (sin red externa, sin credenciales reales). Comprueba que el verificador: pasa con todo apagado, FALLA cuando algo está encendido por error,
 * FALLA si el entorno de n8n no trae URL, y nunca imprime claves.
 */
import http from 'node:http';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildOps } from '../../n8n/build/ops.mjs';
import { buildOpsActions } from '../../n8n/build/ops-actions.mjs';
import * as core from './ops-core.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const wf25 = buildOps(), wf29 = buildOpsActions();
const code = (wf, nm) => wf.nodes.find((x) => x.name === nm).parameters.jsCode;
const mkDollar = (store, lists = {}) => (name) => ({ first: () => { if (!(name in store)) throw new Error('Node ' + name + ' no ejecutado'); return { json: store[name] }; }, all: () => (lists[name] || [store[name]]).map((json) => ({ json })) });
const ok200 = (body) => ({ statusCode: 200, body });
const mons = core.monitoredWorkflows();

let n = 0;
const test = async (name, fn) => { try { await fn(); n++; } catch (e) { console.error('FAIL', name, '\n', String(e.stack).split('\n').slice(0, 5).join('\n')); process.exitCode = 1; } };

/** Servidor que ejecuta los nodos reales del 25. `sandbox.url=false` simula un n8n sin `URL`. `cfg` = fila de strategic_radar_config. */
function startServer(state) {
  const run = async (wf, nm, store, lists) => new AsyncFunction('$', '$json', 'URL', code(wf, nm)).call({}, mkDollar(store, lists), {}, state.sandbox.url === false ? undefined : URL)
  ;
  const rows = (key) => ({ sr_cfg: [state.cfg], sr_targets: state.targets, sr_checks: [], sr_opps: [], sr_runs: [], sys_state: [{ id: 1, global_pause: false, meta: {} }], sr_existing: [], sr_evidence: [], sr_run: [], sr_tmon: [], sr_target: [], sr_recent: [] })[key] || [];
  async function ops25(body) {
    const store = { 'Ops Webhook': { body } };
    const parsed = (await run(wf25, 'Parse', store))[0].json; store.Parse = parsed;
    if (parsed.fatal) return { ok: false, error: parsed.fatal };
    Object.assign(store, { 'SB Messages': ok200([]), 'SB Candidates': ok200([]), 'SB Pieces': ok200([]), 'SB Metrics': ok200([]), 'SB Signals': ok200([]), 'SB Review Pieces': ok200([]), 'SB Alerts': ok200([]), 'SB Runs': ok200([]), 'SB Config': ok200([{ mode: 'off', paused: false }]), 'GHL Opps': ok200({ opportunities: [] }), 'GHL Tasks': ok200({ tasks: [] }), 'GHL Accounts': ok200({}), 'N8N Workflows': ok200({ data: mons.map((w) => ({ id: w.id, name: 'Atacama Labs - ' + w.label, active: true })) }), 'N8N Errors': ok200({ data: [] }) });
    const ex = (await run(wf25, 'Expand Execs', store)).map((x) => x.json); store['Expand Execs'] = ex[0];
    const execRes = ex.map(() => ({ statusCode: 200, body: { data: [] } })); store['N8N Execs'] = execRes[0];
    store['Gmail Check 22'] = { statusCode: 0 }; store['Gmail Check 23'] = { statusCode: 0 }; store.Learnings = { statusCode: 0 };
    const gx = (await run(wf25, 'Expand Growth', store)).map((x) => x.json); store['Expand Growth'] = gx[0];
    const gRes = gx.map((e) => (e.skip ? { statusCode: 0 } : ok200(rows(e.key))));
    store['SB Growth'] = gRes[0];
    store['Sign Prep'] = (await run(wf25, 'Sign Prep', store, { 'Expand Growth': gx, 'SB Growth': gRes }))[0].json; store['SB Sign'] = { statusCode: 0 };
    const comp = (await run(wf25, 'Compute', store, { 'Expand Execs': ex, 'N8N Execs': execRes, 'Expand Growth': gx, 'SB Growth': gRes }))[0].json;
    return { ...comp.out, ...(body.dry_run === true ? { dry_run: comp.out.dry_run ?? true } : {}) };
  }
  async function ops29(body) {
    const store = { 'Actions Webhook': { body } };
    const parsed = (await run(wf29, 'Parse', store))[0].json;
    if (parsed.fatal) return { ok: false, error: 'solicitud_invalida', message: parsed.fatal };
    return { ok: true, email: {}, linkedin: {} };
  }
  const server = http.createServer((req, res) => {
    let b = ''; req.on('data', (c) => { b += c; });
    req.on('end', async () => {
      state.log.push(req.url + ' ' + (req.headers['x-atacama-key'] ? 'k' : '') + (req.headers['x-ops-approval'] ? 'a' : ''));
      let out;
      try {
        const body = JSON.parse(b || '{}');
        if (req.url === '/webhook/atacama-ops') { if (req.headers['x-atacama-key'] !== 'KEY-DE-PRUEBA-NO-DEBE-SALIR') { res.writeHead(403); return res.end('{}'); } out = await ops25(body); }
        else if (req.url === '/webhook/atacama-ops-actions') { if (req.headers['x-ops-approval'] !== 'APROB-DE-PRUEBA-NO-DEBE-SALIR') { res.writeHead(403); return res.end('{}'); } out = await ops29(body); }
        else { res.writeHead(404); return res.end('{}'); }
      } catch (e) { out = { ok: false, error: 'fatal ' + String(e.message).slice(0, 100) }; }
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(out));
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port })));
}

const OFF = { id: 1, production_enabled: false, products_enabled: false, partners_enabled: false, events_enabled: false, telegram_noncritical_enabled: false, daily_max_items: 0, ai_max_items_per_run: 12 };
const SEED = ['Atacama Labs / OS', 'Librería Crecer', 'Pedidos Empresas', 'Registro Almuerzos', 'Casino Escolar'].map((nm, i) => ({ id: '00000000-0000-4000-8000-00000000000' + (i + 1), logical_name: nm, status: 'candidate', monitor_enabled: false, is_test: false, repo_full_name: null, health_url: null, deployment_url: null }));
const verify = (port, extra = []) => new Promise((resolve) => {
  const envf = path.join(os.tmpdir(), 'radar-verify-' + port + '.env');
  fs.writeFileSync(envf, `N8N_BASE_URL=http://127.0.0.1:${port}
ATACAMA_INGEST_KEY=KEY-DE-PRUEBA-NO-DEBE-SALIR
OPS_APPROVAL_KEY=APROB-DE-PRUEBA-NO-DEBE-SALIR
`);
  const c = spawn(process.execPath, [path.join(ROOT, 'scripts/ops/radar-verify.mjs'), 'n8n', '--env', envf, ...extra], { env: { ...process.env, RADAR_VERIFY_ALLOW_HTTP: '1' } });
  let out = ''; c.stdout.on('data', (d) => { out += d; }); c.stderr.on('data', (d) => { out += d; });
  const t = setTimeout(() => c.kill(), 120000);
  c.on('close', (status) => { clearTimeout(t); fs.rmSync(envf, { force: true }); resolve({ status, out }); });
});

await test('todo apagado y entorno completo: el verificador pasa TODO, sin imprimir claves, y no escribe nada', async () => {
  const state = { cfg: OFF, targets: SEED, sandbox: {}, log: [] };
  const { server, port } = await startServer(state);
  try {
    const r = await verify(port);
    if (process.env.RV_DEBUG) console.log(r.out);
    assert.equal(r.status, 0, r.out);
    assert.ok(!/^FAIL /m.test(r.out), r.out);
    assert.match(r.out, /PASS compuerta production/); assert.match(r.out, /PASS entorno de n8n \(products\)/); assert.match(r.out, /PASS entorno de n8n \(events\)/); assert.match(r.out, /PASS workflow 29: reconoce las acciones del Radar/);
    assert.ok(!/KEY-DE-PRUEBA|APROB-DE-PRUEBA/.test(r.out), 'jamás imprime claves');
    assert.ok((r.out.match(/PASS/g) || []).length >= 20, r.out);
  } finally { server.close(); }
});
await test('si una bandera está encendida por error, el verificador FALLA y no hace sondeos que puedan escribir', async () => {
  const state = { cfg: { ...OFF, products_enabled: true }, targets: SEED, sandbox: {}, log: [] };
  const { server, port } = await startServer(state);
  try {
    const r = await verify(port);
    assert.equal(r.status, 1); assert.match(r.out, /FAIL compuerta products/);
    assert.ok(!/ingesta real con la bandera apagada/.test(r.out), 'sin bandera comprobadamente apagada no se hace el sondeo real');
  } finally { server.close(); }
});
await test('si el n8n NO trae URL, el verificador lo detecta con un motivo claro (runtime_incompleto) y falla cerrado', async () => {
  const state = { cfg: OFF, targets: SEED, sandbox: { url: false }, log: [] };
  const { server, port } = await startServer(state);
  try {
    const r = await verify(port);
    assert.equal(r.status, 1); assert.match(r.out, /FAIL entorno de n8n \(products\)/); assert.match(r.out, /FALTA URL EN EL SANDBOX/);
  } finally { server.close(); }
});
await test('si falta la tabla (migración sin aplicar) la vista dice «unavailable» y el verificador falla', async () => {
  const state = { cfg: OFF, targets: SEED, sandbox: {}, log: [] };
  const { server, port } = await startServer(state);
  state.cfg = null; // sin fila de configuración => not_configured
  try { const r = await verify(port); assert.equal(r.status, 1); assert.match(r.out, /FAIL vista/); } finally { server.close(); }
});
await test('un servicio con monitoreo encendido mientras todo debería estar apagado: el verificador lo señala', async () => {
  const state = { cfg: OFF, targets: [{ ...SEED[0], status: 'confirmed', monitor_enabled: true, health_url: 'https://x.example.org/h', verified_at: new Date().toISOString() }], sandbox: {}, log: [] };
  const { server, port } = await startServer(state);
  try { const r = await verify(port); assert.equal(r.status, 1); assert.match(r.out, /^FAIL producción: ningún servicio muestra salud/m); } finally { server.close(); }
});
await test('no hace nada contra una URL que no sea https (salvo localhost de pruebas)', async () => {
  const envf = path.join(os.tmpdir(), 'radar-verify-http.env');
  fs.writeFileSync(envf, `N8N_BASE_URL=http://n8n.example.org
ATACAMA_INGEST_KEY=x
`);
  const r = await new Promise((resolve) => { const c = spawn(process.execPath, [path.join(ROOT, 'scripts/ops/radar-verify.mjs'), 'n8n', '--env', envf]); let e = ''; c.stderr.on('data', (d) => { e += d; }); c.on('close', (status) => resolve({ status, stderr: e })); });
  fs.rmSync(envf, { force: true });
  assert.equal(r.status, 2); assert.match(r.stderr, /https/);
});
console.log(`${n} ok`);
