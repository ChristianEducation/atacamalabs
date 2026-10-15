// node scripts/motion/qgate-core.test.mjs — puerta de calidad (Motion v2) y herramientas del carril PC
import assert from 'node:assert/strict';
import * as qg from './qgate-core.mjs';
import { tavParse, tavQaCheck } from '../taller/taller-add-version.mjs';
import { tpSummary, tpText } from '../taller/taller-pendientes.mjs';

let n = 0;
const ok = (name, fn) => { try { fn(); n++; } catch (e) { console.error('FAIL', name, '\n', e.stack.split('\n').slice(0, 4).join('\n')); process.exitCode = 1; } };
const S = { gancho: 8, lectura: 8, movimiento: 8, variedad: 7, composicion: 8, marca: 9, sincronia: 8 };
const W = [{ t: 0, issue: 'primer frame vacío' }, { t: 3.2, issue: 'corte seco' }, { t: 5.6, issue: 'cursor solo' }];

ok('pasa con promedio ≥ 8, ninguno < 6 y determinismo OK', () => {
  const g = qg.qgGrade(S, { determinism: { ok: true }, worst: W });
  assert.deepEqual([g.pass, g.score, g.why.length], [true, 8, 0]);
});
ok('no pasa sin determinismo, con un criterio < 6 o promedio bajo', () => {
  assert.match(qg.qgGrade(S, { determinism: { ok: false }, worst: W }).why.join(), /determinista/);
  assert.match(qg.qgGrade({ ...S, marca: 5 }, { determinism: { ok: true }, worst: W }).why.join(), /bajo 6: marca/);
  assert.equal(qg.qgGrade({ ...S, gancho: 6, variedad: 6 }, { determinism: { ok: true }, worst: W }).pass, false);
});
ok('exige las 7 notas y los 3 peores problemas con su segundo', () => {
  const g = qg.qgGrade({ gancho: 9 }, { determinism: { ok: true }, worst: W.slice(0, 1) });
  assert.equal(g.ok, false); assert.ok(g.errors.some((e) => /sincronia/.test(e))); assert.ok(g.errors.some((e) => /3 peores/.test(e)));
});
ok('ventana de la acción más rápida y lectura de puntajes de escena', () => {
  const sc = qg.qgParseScenes('frame:0 pts:0 pts_time:0.5\nlavfi.scene_score=0.01\nframe:1 pts:1 pts_time:2.0\nlavfi.scene_score=0.4\n');
  assert.deepEqual(sc, [{ t: 0.5, score: 0.01 }, { t: 2, score: 0.4 }]);
  assert.deepEqual(qg.qgFastestWindow(sc, 6, 1), { center: 2, start: 1.5, end: 2.5, peak: 0.4 });
  assert.equal(qg.qgFastestWindow([{ t: 5.9, score: 1 }], 6, 1).start, 5);
});
ok('taller-add-version: parámetros y puerta de calidad para video', () => {
  assert.ok(tavParse(['--file', 'a.mp4']).errors.some((e) => /--piece/.test(e)));
  assert.ok(tavParse(['--piece', '00000000-0000-4000-8000-000000000001', '--file', 'a.gif']).errors.some((e) => /no admitido/.test(e)));
  assert.equal(tavQaCheck(['a.mp4'], null).ok, false);
  assert.equal(tavQaCheck(['a.mp4'], { gate: 'motion-v2', pass: false, score: 8.2, why: ['x'] }).ok, false);
  assert.equal(tavQaCheck(['a.mp4'], { gate: 'motion-v2', pass: true, score: 8 }).ok, true);
  assert.equal(tavQaCheck(['a.png', 'b.png'], null).ok, true);
});
ok('taller-pendientes: cambios pedidos primero, con feedback abierto; sin piezas lo dice', () => {
  const l = tpSummary([{ id: 'a', topic: 'Reel A', taller_status: 'en_pc_con_claude', needs_by: '2026-10-20T12:00:00Z', format: 'reel', channel: 'instagram' }, { id: 'b', topic: 'Reel B', taller_status: 'cambios_pedidos', format: 'reel', channel: 'instagram', idea: { hook: 'Gancho' } }],
    [{ piece_id: 'b', status: 'open', scope: 'global', text: 'más corto' }, { piece_id: 'b', status: 'done', text: 'viejo' }], Date.parse('2026-10-15T12:00:00Z'));
  assert.deepEqual(l.map((x) => x.id), ['b', 'a']); assert.deepEqual(l[0].feedback, ['más corto']); assert.equal(l[1].days_left, 5);
  assert.match(tpText(l), /CAMBIOS PEDIDOS/); assert.match(tpText([]), /no hay piezas pendientes/);
});

console.log(n + ' pruebas de Motion v2 ok');
