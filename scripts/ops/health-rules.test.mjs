// node scripts/ops/health-rules.test.mjs — reglas de salud v3 §8.5 / anexo §H1
import assert from 'node:assert/strict';
import { hrRules } from './health-rules.mjs';
import * as oc from './ops-core.mjs';

let n = 0;
const ok = (name, fn) => { try { fn(); n++; } catch (e) { console.error('FAIL', name, '\n', e.stack.split('\n').slice(0, 4).join('\n')); process.exitCode = 1; } };
const NOW = Date.parse('2026-12-01T15:00:00Z');
const D = 86400000;
const acc = (o) => ({ id: 'a1', platform: 'linkedin', name: 'Atacama Labs', active: true, isExpired: false, deleted: false, expire: new Date(NOW + 20 * D).toISOString(), ...o });
const keys = (r) => r.map((x) => x.key + '=' + x.severity);

ok('GHL: vence en > 14 días → nada; < 14 informativa (solo panel); < 7 importante; ≤ 3 crítica; desconectada → crítica', () => {
  assert.deepEqual(hrRules({ now: NOW, ghl_accounts: [acc()] }), []);
  const i = hrRules({ now: NOW, ghl_accounts: [acc({ expire: new Date(NOW + 10 * D).toISOString() })] });
  assert.equal(i[0].severity, 'info'); assert.equal(i[0].meta.panel_only, true); assert.match(i[0].title, /vence en 10 días/);
  assert.equal(hrRules({ now: NOW, ghl_accounts: [acc({ expire: new Date(NOW + 5 * D).toISOString() })] })[0].severity, 'high');
  assert.equal(hrRules({ now: NOW, ghl_accounts: [acc({ expire: new Date(NOW + 2 * D).toISOString() })] })[0].severity, 'critical');
  assert.equal(hrRules({ now: NOW, ghl_accounts: [acc({ isExpired: true })] })[0].severity, 'critical');
  assert.deepEqual(hrRules({ now: NOW, ghl_accounts: [acc({ deleted: true, isExpired: true })] }), []);
});
ok('Higgsfield: bajo la reserva → importante; gasto semanal > 150 importante, > 200 crítica', () => {
  assert.deepEqual(keys(hrRules({ now: NOW, hermes: { higgs: { balance: 1052, spent_week: 0, reserve: 300, week: 'w' } } })), []);
  assert.deepEqual(keys(hrRules({ now: NOW, hermes: { higgs: { balance: 250, spent_week: 0, reserve: 300, week: 'w' } } })), ['higgs_reserve=high']);
  assert.deepEqual(keys(hrRules({ now: NOW, hermes: { higgs: { balance: 900, spent_week: 160, week: 'w' } } })), ['higgs_week:high:w=high']);
  assert.deepEqual(keys(hrRules({ now: NOW, hermes: { higgs: { balance: 900, spent_week: 201, week: 'w' } } })), ['higgs_week:critical:w=critical']);
  assert.deepEqual(hrRules({ now: NOW, hermes: { higgs: null } }), []);
});
ok('Correo: tope alcanzado con aprobados esperando → informativa (solo panel)', () => {
  const sent = Array.from({ length: 3 }, (_, i) => ({ direction: 'outbound', status: 'sent', sent_at: new Date(NOW - (i + 1) * 3600000).toISOString() }));
  const r = hrRules({ now: NOW, outreach: { daily_cap: 3 }, messages: sent.concat([{ direction: 'outbound', status: 'approved' }]) });
  assert.equal(r.length, 1); assert.equal(r[0].severity, 'info'); assert.equal(r[0].meta.panel_only, true);
  assert.deepEqual(hrRules({ now: NOW, outreach: { daily_cap: 4 }, messages: sent.concat([{ direction: 'outbound', status: 'approved' }]) }), []);
});
ok('Taller: pieza con el cierre vencido y sin programar → importante; programada o TEST → nada', () => {
  const p = (o) => ({ id: 'p1', topic: 'Carrusel', taller_status: 'para_revisar', needs_by: new Date(NOW - D).toISOString(), is_test: false, ...o });
  assert.deepEqual(keys(hrRules({ now: NOW, pieces: [p()] })), ['taller_late:p1=high']);
  assert.deepEqual(hrRules({ now: NOW, pieces: [p({ taller_status: 'programada' }), p({ is_test: true }), p({ needs_by: new Date(NOW + D).toISOString() })] }), []);
});
ok('Hermes: job activo que debía correr hace > 3 h → importante; pausado → nada', () => {
  const j = (o) => ({ id: 'j1', name: 'Atacama Labs — Radar', state: 'scheduled', enabled: true, next_run_at: new Date(NOW - 4 * 3600000).toISOString(), ...o });
  assert.deepEqual(keys(hrRules({ now: NOW, hermes: { jobs: [j()] } })), ['hermes_late:j1=high']);
  assert.deepEqual(hrRules({ now: NOW, hermes: { jobs: [j({ state: 'paused' }), j({ next_run_at: new Date(NOW - 3600000).toISOString() })] } }), []);
});
ok('Telegram: las informativas «solo panel» no salen en el texto; las críticas sí', () => {
  const t = oc.alertsText([{ key: 'a', severity: 'info', title: 'Solo panel', detail: '', meta: { panel_only: true } }, { key: 'b', severity: 'critical', title: 'Crítica', detail: 'x', meta: {} }]);
  assert.match(t, /CRÍTICO · Crítica/); assert.doesNotMatch(t, /Solo panel/);
  assert.equal(oc.alertsText([{ key: 'a', severity: 'info', title: 'Solo panel', detail: '', meta: { panel_only: true } }]), '');
});
ok('el núcleo es autocontenido', () => { assert.ok(!/\bimport\b|require\(/.test(hrRules.toString())); });
console.log(n + ' ok');
