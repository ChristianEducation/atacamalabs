import assert from 'node:assert/strict';
import * as v3 from './v3-core.mjs';

let n = 0;
const ok = (name, fn) => { try { fn(); n++; } catch (e) { console.error('FAIL', name, '\n', e.stack.split('\n').slice(0, 4).join('\n')); process.exitCode = 1; } };

const NOW = Date.parse('2026-10-14T15:00:00Z');
const H = 3600000;
const iso = (msAgo) => new Date(NOW - msAgo).toISOString();

ok('funciones autocontenidas (se incrustan en n8n con toString)', () => {
  for (const f of Object.values(v3)) { const src = f.toString(); assert.ok(!/\bimport\b|\brequire\(/.test(src), f.name); }
});

ok('v3Pause: sin fila o sin pausa = no pausado; con pausa muestra motivo y quién', () => {
  assert.equal(v3.v3Pause(null).paused, false);
  assert.equal(v3.v3Pause({ global_pause: false }).paused, false);
  const p = v3.v3Pause({ global_pause: true, reason: 'viaje', paused_at: iso(H), paused_by: 'Christian via /ops' });
  assert.deepEqual([p.paused, p.reason, p.by], [true, 'viaje', 'Christian via /ops']);
});

ok('v3GateOverride: sin pausa devuelve la compuerta tal cual; con pausa la fuerza a skip con motivo', () => {
  const out = { mode: 'run', reason: 'hay espacio', max_imports: 5 };
  assert.equal(v3.v3GateOverride(out, { global_pause: false }), out);
  const o = v3.v3GateOverride(out, { global_pause: true, reason: 'vacaciones' });
  assert.equal(o.mode, 'skip'); assert.equal(o.paused, true); assert.match(o.reason, /Pausa general activa/); assert.match(o.reason, /vacaciones/);
  assert.equal(v3.v3GateOverride(undefined, { global_pause: true }).mode, 'skip');
});

ok('v3Age: tono fresco < 24 h, atención < 72 h, viejo después', () => {
  assert.equal(v3.v3Age(NOW - 2 * H, NOW).tone, 'fresh');
  assert.equal(v3.v3Age(NOW - 30 * H, NOW).tone, 'warn');
  assert.equal(v3.v3Age(NOW - 80 * H, NOW).tone, 'old');
  assert.equal(v3.v3Age(NOW - 80 * H, NOW).text, 'hace 3 d');
});

ok('v3Inbox: correo en borrador, idea propuesta y pieza para revisar aparecen en ese orden (§8.1)', () => {
  const x = { now: NOW,
    pieces: [{ id: 'p1', topic: 'Carrusel Flows', taller_status: 'para_revisar', updated_at: iso(H), is_test: false }],
    ideas: [{ id: 'i1', title: 'Idea buena', status: 'proposed', created_at: iso(2 * H), is_test: false }],
    messages: [{ id: 'm1', direction: 'outbound', status: 'draft', company_name: 'Clínica Ramis', created_at: iso(50 * H) }] };
  const r = v3.v3Inbox(x);
  assert.deepEqual(r.items.map((i) => i.kind), ['correo', 'idea', 'pieza']);
  assert.equal(r.total, 3);
  assert.equal(r.items[0].tone, 'warn'); assert.deepEqual(r.items[0].examples, ['Clínica Ramis']);
  assert.equal(r.items[1].href, '/ops?view=ideas');
});

ok('v3Inbox: al resolver, desaparecen; nunca muestra datos TEST', () => {
  const x = { now: NOW, ideas: [{ title: 'TEST', status: 'proposed', is_test: true, created_at: iso(H) }, { title: 'aprobada', status: 'approved', is_test: false, created_at: iso(H) }],
    messages: [{ direction: 'outbound', status: 'draft', company_name: 'Empresa TEST', created_at: iso(H) }, { direction: 'outbound', status: 'approved', company_name: 'Alfa', created_at: iso(H) }],
    pieces: [{ taller_status: 'para_revisar', is_test: true, topic: 'x' }, { taller_status: 'programada', is_test: false, topic: 'y' }] };
  const r = v3.v3Inbox(x);
  assert.equal(r.items.length, 0); assert.equal(r.total, 0);
});

ok('v3Inbox: respuestas, contactos, alertas críticas, LinkedIn y publicaciones de GHL', () => {
  const r = v3.v3Inbox({ now: NOW, attention: [{ key: 'replies', count: 2, items: ['Alfa · hace 1 d', 'Beta'] }, { key: 'prep_find', count: 1, items: ['Gamma'] }],
    alerts: [{ alert_key: 'x', status: 'open', severity: 'critical', title: 'Gmail caído', first_seen_at: iso(H) }, { alert_key: 'y', status: 'open', severity: 'info', title: 'nada' }, { alert_key: '_state:hermes', status: 'open', severity: 'critical' }],
    approvals: { linkedin: 1, content: 2 } });
  assert.deepEqual(r.items.map((i) => i.kind), ['respuesta', 'contacto', 'alerta', 'linkedin', 'publicacion']);
  assert.deepEqual(r.items[0].examples, ['Alfa', 'Beta']);
  assert.equal(r.items[2].count, 1);
  assert.equal(r.total, 2 + 1 + 1 + 1 + 2);
});

ok('v3PausePlan: pausar = UNA escritura en system_state con candado (el disparador de base refleja la pausa en el envío)', () => {
  const p = v3.v3PausePlan({ paused: true, reason: 'viaje' }, { id: 1, global_pause: false, meta: {} }, { paused: false }, NOW, 'Christian via /ops');
  assert.equal(p.resp.status, 'paused'); assert.equal(p.writes.length, 1);
  assert.match(p.writes[0].path, /global_pause=eq\.false/); assert.equal(p.writes[0].body.global_pause, true); assert.equal(p.writes[0].body.reason, 'viaje');
  assert.equal(p.writes[0].check_rows, true); assert.match(p.resp.message, /NO se retiene/);
});

ok('v3PausePlan: reanudar avisa si el envío ya estaba en pausa antes', () => {
  const r1 = v3.v3PausePlan({ paused: false }, { global_pause: true, meta: { prev_outreach_paused: false } }, { paused: true }, NOW, 'C');
  assert.equal(r1.resp.status, 'resumed'); assert.equal(r1.writes.length, 1); assert.match(r1.writes[0].path, /global_pause=eq\.true/);
  const r2 = v3.v3PausePlan({ paused: false }, { global_pause: true, meta: { prev_outreach_paused: true } }, { paused: true }, NOW, 'C');
  assert.match(r2.resp.message, /ya estaba en pausa/);
});

ok('v3PausePlan: idempotente (ya pausado / ya funcionando) y sin estado no hace nada', () => {
  assert.equal(v3.v3PausePlan({ paused: true }, { global_pause: true }, {}, NOW, 'C').writes.length, 0);
  assert.equal(v3.v3PausePlan({ paused: false }, { global_pause: false }, {}, NOW, 'C').resp.status, 'already_running');
  assert.equal(v3.v3PausePlan({ paused: true }, null, {}, NOW, 'C').error, 'sin_estado');
});

ok("Fase 7: reuniones de hoy arriba en «Hoy» (con hora de Chile); las de otro día no", () => {
  const now = Date.parse("2026-10-21T15:00:00Z");
  const r = v3.v3Inbox({ now, meetings: [{ meeting_start: "2026-10-21T18:30:00Z", name: "Ana", company: "Clínica X" }, { meeting_start: "2026-10-22T18:30:00Z", name: "Otro" }] });
  assert.equal(r.items[0].kind, "reunion"); assert.equal(r.items[0].count, 1); assert.equal(r.items[0].examples[0], "15:30 · Ana · Clínica X");
});

console.log(n + ' ok');
