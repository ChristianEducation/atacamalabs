import assert from 'node:assert/strict';
import * as tp from './taller-producer-core.mjs';

let n = 0;
const ok = (name, fn) => { try { fn(); n++; } catch (e) { console.error('FAIL', name, '\n', e.stack.split('\n').slice(0, 4).join('\n')); process.exitCode = 1; } };

ok('autocontenidas', () => { for (const f of Object.values(tp)) assert.ok(!/\bimport\b|\brequire\(/.test(f.toString()), f.name); });

ok('topes (§F3): 3 intentos por lámina, 30 por pieza, 200 por semana; se cuenta ANTES de gastar', () => {
  const c = tp.tpCaps({});
  assert.deepEqual(c, { attempts_per_slide: 3, credits_per_piece: 30, credits_per_week: 200 });
  assert.equal(tp.tpCanSpend({ slide_attempts: 2, piece_credits: 20, week_credits: 100, cost: 4 }, c).ok, true);
  assert.match(tp.tpCanSpend({ slide_attempts: 3, cost: 4 }, c).reason, /3 intentos/);
  assert.match(tp.tpCanSpend({ slide_attempts: 0, piece_credits: 28, cost: 4 }, c).reason, /tope 30/);
  assert.match(tp.tpCanSpend({ slide_attempts: 0, piece_credits: 0, week_credits: 198, cost: 4 }, c).reason, /tope 200/);
  assert.equal(tp.tpCaps({ taller_max_credits_per_piece: 10 }).credits_per_piece, 10);
});

ok('texto exacto (§F1): admite ≤ 1 diferencia de tilde/mayúscula por línea; cualquier otra diferencia falla', () => {
  assert.equal(tp.tpTextCheck(['Qué proceso automatizar primero'], 'QUÉ PROCESO\nQue proceso automatizar primero').ok, true);
  assert.equal(tp.tpTextCheck(['Qué proceso automatizar primero'], 'Qué proceso automatizar primer').ok, false);
  assert.equal(tp.tpTextCheck(['Menos mensajes, menos cobro.'], 'Menos  mensajes,   menos cobro.').ok, true);
  assert.deepEqual(tp.tpTextCheck(['Agenda en 3 toques'], 'Agenda en 5 toques').missing, ['Agenda en 3 toques']);
  assert.equal(tp.tpSoftDiffs('Agéndalo', 'Agendalo'), 1);
  assert.equal(tp.tpSoftDiffs('Agéndalo', 'Agendala'), null);
});

ok('QA de lámina: tamaño 4:5, texto, logo, cuadrícula y prohibidos', () => {
  assert.equal(tp.tpQaSlide({ w: 1080, h: 1350, read: 'Hola mundo', expected: ['Hola mundo'], has_logo: true, has_grid: true }).ok, true);
  const bad = tp.tpQaSlide({ w: 1080, h: 1080, read: 'x', expected: ['Hola mundo'], has_logo: false, has_grid: true, forbidden: ['marco en las esquinas'] });
  assert.equal(bad.ok, false); assert.equal(bad.problems.length, 4);
});

ok('lámina de prueba primero', () => {
  assert.deepEqual(tp.tpOrder(5), { test: 1, rest: [2, 3, 4, 5] });
  assert.deepEqual(tp.tpOrder(0), { test: null, rest: [] });
});

ok('especificación de Hermes: layouts, títulos, cierre, palabra clave, escena sin logos/robots, historias sin texto', () => {
  const piece = { format: 'carrusel', piece: { keyword: 'PROCESO' } };
  const good = { caption: 'Texto de la publicación con PROCESO incluido.', slides: [{ layout: 'portada', title: 'Qué automatizar primero', art: { scene: 'Close-up of a phone with a WhatsApp chat on a plain background' } }, { layout: 'texto', title: 'Paso uno', body: 'Algo breve' }, { layout: 'cierre', title: 'Atacama Labs' }] };
  assert.equal(tp.tpValidateSpec(good, piece).ok, true);
  assert.ok(tp.tpValidateSpec({ ...good, caption: 'Sin la palabra clave aquí, más de veinte.' }, piece).errors.some((e) => /palabra clave/.test(e)));
  assert.ok(tp.tpValidateSpec({ ...good, slides: [good.slides[0], { ...good.slides[1], layout: 'texto' }] }, piece).errors.some((e) => /cierre/.test(e)));
  assert.ok(tp.tpValidateSpec({ ...good, slides: [{ ...good.slides[0], art: { scene: 'a robot with the Atacama logo and neon lights everywhere' } }, good.slides[2]] }, piece).errors.some((e) => /logos/.test(e)));
  assert.ok(tp.tpValidateSpec({ caption: 'texto', slides: [good.slides[0]] }, { format: 'historia' }).errors.some((e) => /historias no llevan texto/.test(e)));
});

ok('líneas esperadas de una lámina (sin marcas de énfasis)', () => {
  assert.deepEqual(tp.tpExpectedLines({ pill: 'NUEVO', title: 'Menos mensajes,|*menos cobro.*', steps: ['Revisamos', 'Configuramos'] }), ['NUEVO', 'Menos mensajes,', 'menos cobro.', 'Revisamos', 'Configuramos']);
});

ok('correcciones repetidas → reglas propuestas (≥ 2 veces), nunca aplicadas solas', () => {
  const r = tp.tpRuleCandidates([{ reason: 'lamina 1: la portada más cerca' }, { reason: 'global: más cerca el celular' }, { reason: 'lamina 2: color' }]);
  assert.equal(r.length, 1); assert.match(r[0].rule, /Encuadre cercano/); assert.equal(r[0].n, 2);
});

ok('reclamo: apagado → nada; pausa → nada; prioriza cambios pedidos; TEST solo con test', () => {
  const rows = [{ id: 'a', lane: 'vps', taller_status: 'en_cola', needs_by: '2026-10-23' }, { id: 'b', lane: 'vps', taller_status: 'cambios_pedidos', needs_by: '2026-10-30' }, { id: 'c', lane: 'pc', taller_status: 'en_cola' }, { id: 't', lane: 'vps', taller_status: 'en_cola', is_test: true }];
  assert.equal(tp.tpPickClaim(rows, {}, {}).action, 'none');
  assert.equal(tp.tpPickClaim(rows, { taller_production_enabled: true }, { global_pause: true }).action, 'none');
  assert.equal(tp.tpPickClaim(rows, { taller_production_enabled: true }, {}).piece.id, 'b');
  assert.equal(tp.tpPickClaim(rows, {}, {}, { test: true }).piece.id, 't');
  assert.equal(tp.tpPickClaim(rows, { taller_production_enabled: true }, {}, { piece_id: 'c' }).action, 'none');
});

console.log(n + ' ok');
