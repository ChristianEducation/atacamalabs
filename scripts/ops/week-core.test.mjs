// node scripts/ops/week-core.test.mjs — «Mi semana» y Costos
import assert from 'node:assert/strict';
import * as wk from './week-core.mjs';

let n = 0;
const ok = (name, fn) => { try { fn(); n++; } catch (e) { console.error('FAIL', name, '\n', e.stack.split('\n').slice(0, 4).join('\n')); process.exitCode = 1; } };
const NOW = Date.parse('2026-10-21T15:00:00Z'); // miércoles 21-oct, 12:00 en Chile

ok('días de la semana lun–vie en hora de Chile', () => {
  assert.deepEqual(wk.wkDays(NOW, 'America/Santiago').map((x) => x.date), ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23']);
});
ok('ritual por defecto y tareas con datos reales; progreso y semáforo del cierre', () => {
  const v = wk.weekView({ now: NOW, ideas: [{ week_start: '2026-10-26', status: 'approved' }, { week_start: '2026-10-26', status: 'proposed' }], messages: [{ direction: 'outbound', status: 'draft' }],
    meetings: [{ meeting_start: '2026-10-21T18:00:00Z', name: 'Ana', company: 'Clínica X' }], intel_at: '2026-10-21T14:00:00Z',
    pieces: [{ id: 'a', taller_status: 'programada', needs_by: '2026-10-23T20:00:00Z' }, { id: 'b', taller_status: 'para_revisar', needs_by: '2026-10-23T20:00:00Z' }, { id: 'c', taller_status: 'programada', needs_by: '2026-10-30T20:00:00Z' }] });
  assert.equal(v.week, '2026-10-19');
  const t = Object.fromEntries(v.days.flatMap((d) => d.tasks).map((x) => [x.id, x]));
  assert.equal(t.ideas.done, false); assert.match(t.ideas.detail, /1 por decidir/);
  assert.equal(t.correos.done, false);
  assert.equal(t.competencia.done, true);
  assert.equal(t.revisar_piezas.done, false);
  assert.equal(t.cierre.label, 'Cierre: semana siguiente programada 1 de 2'); assert.equal(t.cierre.light, 'rojo');
  assert.equal(v.meetings_today.length, 1); assert.equal(v.days[2].today, true);
  assert.deepEqual(v.progress, { done: 2, total: 6 }); // competencia + reuniones del martes (ya pasó)
});
ok('semáforo: verde con todo programado, amarillo ≥ 60 %, sin datos si no hay piezas con cierre', () => {
  const p = (s) => ({ taller_status: s, needs_by: '2026-10-23T20:00:00Z' });
  assert.equal(wk.weekView({ now: NOW, pieces: [p('programada'), p('publicada')] }).close.light, 'verde');
  assert.equal(wk.weekView({ now: NOW, pieces: [p('programada'), p('programada'), p('para_revisar')] }).close.light, 'amarillo');
  assert.equal(wk.weekView({ now: NOW, pieces: [] }).close.light, 'sin_datos');
});
ok('ritual editable: se valida (tareas conocidas, sin repetir, ≤ 4 por día) y un ritual inválido guardado cae al de siempre', () => {
  assert.equal(wk.wkValidateRitual({ lun: ['ideas'], mar: ['correos', 'reuniones'], mie: [], jue: ['revisar_piezas'], vie: ['cierre', 'competencia'] }).ok, true);
  assert.equal(wk.wkValidateRitual({ lun: ['ideas'], mar: ['ideas'] }).ok, false);
  assert.equal(wk.wkValidateRitual({ lun: ['bailar'] }).ok, false);
  const v = wk.weekView({ now: NOW, ritual: { lun: ['bailar'] } });
  assert.deepEqual(v.ritual, wk.wkDefaultRitual());
  const moved = wk.weekView({ now: NOW, ritual: { lun: ['ideas', 'correos'], mar: [], mie: ['reuniones'], jue: ['revisar_piezas', 'competencia'], vie: ['cierre'] } });
  assert.deepEqual(moved.days[3].tasks.map((t) => t.id), ['revisar_piezas', 'competencia']);
});
ok('costos: saldo y gasto de Higgsfield, piezas ordenadas por créditos (sin TEST)', () => {
  const c = wk.costsView({ higgs: { balance: 1052.74, spent_week: 12, cap: 200, reserve: 300, week: '2026-10-19' }, pieces: [{ id: 'a', topic: 'A', credits_spent: 3 }, { id: 'b', topic: 'B', credits_spent: 9 }, { id: 't', credits_spent: 50, is_test: true }, { id: 'z', credits_spent: 0 }] });
  assert.equal(c.higgs.balance, 1052.74); assert.deepEqual(c.pieces.map((p) => p.id), ['b', 'a']); assert.equal(c.total_pieces, 12);
  assert.equal(wk.costsView({}).higgs, null);
});
ok('el núcleo es autocontenido', () => { for (const f of Object.values(wk)) assert.ok(!/\bimport\b|require\(/.test(f.toString()), f.name); });
console.log(n + ' ok');
