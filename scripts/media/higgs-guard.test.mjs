import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as g from './higgs-guard-core.mjs';

let n = 0;
const ok = (name, fn) => { try { fn(); n++; } catch (e) { console.error('FAIL', name, '\n', e.stack.split('\n').slice(0, 4).join('\n')); process.exitCode = 1; } };

ok('semana de Chile: lunes a domingo y cambio de lunes a las 00:00 hora de Chile (verano UTC-3)', () => {
  assert.equal(g.hgWeekKey(Date.UTC(2026, 9, 12, 18, 0)), '2026-10-12');   // lun 12-oct
  assert.equal(g.hgWeekKey(Date.UTC(2026, 9, 18, 12, 0)), '2026-10-12');   // dom 18-oct
  assert.equal(g.hgWeekKey(Date.UTC(2026, 9, 19, 2, 59)), '2026-10-12');   // dom 23:59 Chile
  assert.equal(g.hgWeekKey(Date.UTC(2026, 9, 19, 3, 1)), '2026-10-19');    // lun 00:01 Chile
});

const base = () => g.hgRecord(g.hgNewLedger(), '2026-10-12', { at: 'x', model: 'nano_banana_pro', credits: 170, job_id: 'j1', purpose: 'prueba' });

ok('decide: dentro del tope pasa; avisa al 80 %; el gasto se mide con el registro', () => {
  const L = base();
  assert.equal(g.hgSpent(L, '2026-10-12'), 170);
  const d = g.hgDecide({ ledger: L, weekKey: '2026-10-12', cost: 10, balance: 1500 });
  assert.equal(d.ok, true); assert.equal(d.spent_after, 180); assert.equal(d.remaining_after, 20); assert.match(d.warn, /180 de 200/);
  assert.equal(g.hgDecide({ ledger: g.hgNewLedger(), weekKey: '2026-10-12', cost: 2, balance: 1500 }).warn, null);
});

ok('el tope semanal BLOQUEA de verdad (200) y la semana siguiente parte de cero', () => {
  const L = base();
  const d = g.hgDecide({ ledger: L, weekKey: '2026-10-12', cost: 31, balance: 1500 });
  assert.equal(d.ok, false); assert.equal(d.reason, 'weekly_cap'); assert.match(d.message, /TOPE SEMANAL/);
  assert.equal(g.hgDecide({ ledger: L, weekKey: '2026-10-19', cost: 31, balance: 1500 }).ok, true);
  assert.equal(g.hgDecide({ ledger: L, weekKey: '2026-10-12', cost: 30, balance: 1500 }).ok, true); // 200 exactos caben
});

ok('tope por llamada, reserva de saldo y costo desconocido también bloquean', () => {
  const L = g.hgNewLedger();
  assert.equal(g.hgDecide({ ledger: L, weekKey: 'w', cost: 41, balance: 1500 }).reason, 'per_call');
  assert.equal(g.hgDecide({ ledger: L, weekKey: 'w', cost: 20, balance: 310 }).reason, 'reserve');
  assert.equal(g.hgDecide({ ledger: L, weekKey: 'w', cost: 20, balance: 320 }).ok, true);
  assert.equal(g.hgDecide({ ledger: L, weekKey: 'w', cost: null, balance: 1500 }).reason, 'unknown_cost');
  assert.equal(g.hgDecide({ ledger: L, weekKey: 'w', cost: NaN, balance: 1500 }).ok, false);
  assert.equal(g.hgDecide({ ledger: L, weekKey: 'w', cost: -1, balance: 1500 }).ok, false);
});

ok('los topes del registro se pueden subir a mano (Christian decide) y se respetan', () => {
  const L = { ...base(), cap: 300 };
  assert.equal(g.hgDecide({ ledger: L, weekKey: '2026-10-12', cost: 31, balance: 1500 }).ok, true);
});

ok('registro: conserva 12 semanas y no muta el original', () => {
  let L = g.hgNewLedger();
  for (let i = 0; i < 15; i++) L = g.hgRecord(L, '2026-01-' + String(i + 1).padStart(2, '0'), { at: 'x', model: 'm', credits: 1 });
  assert.equal(Object.keys(L.weeks).length, 12);
  const a = base(); const b = g.hgRecord(a, '2026-10-12', { at: 'y', model: 'm', credits: 5 });
  assert.equal(g.hgSpent(a, '2026-10-12'), 170); assert.equal(g.hgSpent(b, '2026-10-12'), 175);
});

ok('clasificación: consultas pasan, «generate create» pasa por el tope y TODO lo que gasta por otra vía se bloquea', () => {
  assert.equal(g.hgClassify(['account', 'status']).kind, 'passthrough');
  assert.equal(g.hgClassify(['generate', 'cost', 'nano_banana_pro', '--prompt', 'x']).kind, 'passthrough');
  assert.equal(g.hgClassify(['model', 'get', 'sonilo_music']).kind, 'passthrough');
  const c = g.hgClassify(['generate', 'create', 'nano_banana_pro', '--prompt', 'x']); assert.equal(c.kind, 'create'); assert.equal(c.model, 'nano_banana_pro');
  for (const bad of [['generate', 'create', 'kling_3_0', '--prompt', 'x'], ['generate', 'create', 'seedance_2_5', '--prompt', 'x'], ['website', 'create'], ['marketing-studio', 'x'], ['soul-id', 'train'], ['generate', 'workflow', 'reframe'], ['product-photoshoot'], ['marketplace-cards'], ['auth', 'token'], ['workspace', 'select']]) assert.equal(g.hgClassify(bad).kind, 'blocked', bad.join(' '));
});

ok('parseo de la salida del CLI (costo y job id); lo ilegible no se interpreta como gratis', () => {
  assert.equal(g.hgParseCost('{"credits": 2}'), 2); assert.equal(g.hgParseCost('Error: x'), null); assert.equal(g.hgParseCost('{"x":1}'), null);
  assert.equal(g.hgParseJobId('[{"id":"abc"}]'), 'abc'); assert.equal(g.hgParseJobId('{"job":{"id":"z"}}'), 'z'); assert.equal(g.hgParseJobId('no json'), null);
});

ok('guardián de punta a punta con un CLI FALSO: dentro del tope genera y anota; sobre el tope se corta SIN llamar a «create»', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hg-')); const log = path.join(dir, 'calls.log'); const bin = path.join(dir, 'fake-higgs.mjs');
  fs.writeFileSync(bin, `import fs from 'node:fs';
const a = process.argv.slice(2);
fs.appendFileSync(${JSON.stringify(log)}, a.join(' ') + '\\n');
const k = a[0] + ' ' + a[1];
console.log(k === 'account status' ? '{"credits": 1500}' : k === 'generate cost' ? '{"credits": 25}' : k === 'generate create' ? '[{"id":"job-1"}]' : '{}');
`);
  const guard = path.join(path.dirname(fileURLToPath(import.meta.url)), 'higgs-guard.mjs');
  const env = { ...process.env, HIGGSFIELD_BIN: process.execPath, HIGGSFIELD_BIN_PREFIX: bin, ATACAMA_STATE_DIR: dir };
  const run = (...a) => spawnSync(process.execPath, [guard, ...a], { encoding: 'utf8', env });
  for (let i = 0; i < 8; i++) { const r = run('generate', 'create', 'nano_banana_pro', '--prompt', 'x', '--purpose', 'prueba ' + i); assert.equal(r.status, 0, r.stdout + r.stderr); }
  const led = JSON.parse(fs.readFileSync(path.join(dir, 'higgsfield-ledger.json'), 'utf8')); const wk = Object.keys(led.weeks)[0];
  assert.equal(g.hgSpent(led, wk), 200); assert.equal(led.weeks[wk].jobs[0].job_id, 'job-1');
  const before = fs.readFileSync(log, 'utf8').split('\n').filter((l) => l.startsWith('generate create')).length;
  const blocked = run('generate', 'create', 'nano_banana_pro', '--prompt', 'x');
  assert.equal(blocked.status, 4); assert.match(blocked.stdout, /TOPE SEMANAL/);
  assert.equal(fs.readFileSync(log, 'utf8').split('\n').filter((l) => l.startsWith('generate create')).length, before, 'no debe llamar a create al estar topeado');
  assert.equal(run('website', 'create').status, 5);
  assert.match(run('status').stdout, /gastó 200 de 200/);
});

console.log(n + ' ok');
