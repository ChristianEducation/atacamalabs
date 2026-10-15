// node scripts/ops/results-core.test.mjs — Contenido → ventas, resumen del lunes, iteraciones y aprendizaje (Fase 8)
import assert from 'node:assert/strict';
import * as rs from './results-core.mjs';
import * as ln from './learning-core.mjs';

let n = 0;
const ok = (name, fn) => { try { fn(); n++; } catch (e) { console.error('FAIL', name, '\n', e.stack.split('\n').slice(0, 4).join('\n')); process.exitCode = 1; } };
const NOW = Date.parse('2026-10-19T12:00:00Z'); // lunes 19-oct
const U = (i) => '00000000-0000-4000-8000-' + String(i).padStart(12, '0');
const res = [{ id: U(90), slug: 'guia-whatsapp', name: 'Guía WhatsApp', status: 'active' }];
const pieces = [
  { id: U(1), topic: 'Carrusel WhatsApp', channel: 'instagram', format: 'carrusel', published_at: '2026-10-13T15:00:00Z', resource_id: U(90), idea: { keyword: 'guia' }, taller_status: 'publicada', created_at: '2026-10-10T00:00:00Z' },
  { id: U(2), topic: 'Reel sin resultados', channel: 'instagram', format: 'reel', published_at: '2026-10-14T15:00:00Z', taller_status: 'publicada', created_at: '2026-10-10T00:00:00Z' },
  { id: U(3), topic: 'TEST', is_test: true, published_at: '2026-10-14T15:00:00Z' },
];
const att = [{ piece_id: U(1), created_at: '2026-10-14T10:00:00Z' }, { piece_id: U(1), created_at: '2026-10-15T10:00:00Z' }, { piece_id: U(3), is_test: true, created_at: '2026-10-15T10:00:00Z' }];
const leads = [
  { source_section: 'recurso-cierre', source_page: '/recursos/guia-whatsapp', created_at: '2026-10-16T10:00:00Z', meeting_start: '2026-10-20T14:00:00Z' },
  { source_section: 'recurso-cierre', source_page: '/recursos/otro', created_at: '2026-10-16T10:00:00Z' },
  { source_section: 'hero', source_page: '/', created_at: '2026-10-16T10:00:00Z' },
];

ok('slug del recurso desde la página', () => { assert.equal(rs.rsSlugOf('/recursos/guia-whatsapp?x=1'), 'guia-whatsapp'); assert.equal(rs.rsSlugOf('/'), null); });
ok('validación de «Registrar contacto de esta pieza»', () => {
  assert.equal(rs.rsPieceContactInput({ piece_id: U(1), contact_name: 'Ana', handle: '@ana.p', keyword: 'Guia' }).handle, 'ana.p');
  assert.equal(rs.rsPieceContactInput({ piece_id: 'x', contact_name: 'Ana' }).error, 'falta_pieza');
  assert.equal(rs.rsPieceContactInput({ piece_id: U(1), contact_name: 'A' }).error, 'falta_nombre');
  assert.equal(rs.rsPieceContactInput({ piece_id: U(1), contact_name: 'Ana', handle: 'a b' }).error, 'usuario_invalido');
});
ok('reporte por pieza y recurso: solo cifras reales, sin pruebas', () => {
  const v = rs.resultsView({ now: NOW, pieces, resources: res, attributions: att, leads, metrics: [{ content_piece_id: U(1), metric_window: '24h', likes: 3 }, { content_piece_id: U(1), metric_window: '7d', likes: 9, comments: 2 }] });
  const p1 = v.pieces.find((p) => p.id === U(1));
  assert.deepEqual([p1.contacts_dm, p1.contacts_web, p1.meetings, p1.keyword, p1.metrics.likes], [2, 1, 1, 'guia', 9]);
  assert.ok(!v.pieces.some((p) => p.id === U(3)));
  assert.deepEqual(v.resources[0], { slug: 'guia-whatsapp', name: 'Guía WhatsApp', web_leads: 1, meetings: 1, contacts_dm: 2, pieces: 1 });
  assert.equal(v.unknown_web, 1);
  assert.match(v.note, /Atribución parcial/);
});
ok('resumen del lunes: una línea por pieza con resultados; sin datos lo dice', () => {
  const s = rs.rsMondaySummary({ now: NOW, pieces: pieces.filter((p) => !p.is_test), attributions: att.filter((a) => !a.is_test), leads, resources: res });
  assert.equal(s.week, '2026-10-12');
  assert.deepEqual(s.lines.map((l) => l.text), ['«Carrusel WhatsApp» trajo 3 contactos y 1 reunión.']);
  const e = rs.rsMondaySummary({ now: NOW, pieces, attributions: [], leads: [], resources: res });
  assert.match(e.empty_text, /ninguna pieza/);
});
ok('iteraciones por pieza', () => {
  const it = rs.rsIterations({ pieces, versions: [{ piece_id: U(1), version_no: 1, cost_credits: 4, created_at: '2026-10-10T00:00:00Z' }, { piece_id: U(1), version_no: 2, cost_credits: 2.5, created_at: '2026-10-11T12:00:00Z' }, { piece_id: U(2), version_no: 1, created_at: '2026-10-10T00:00:00Z' }], feedback: [{ piece_id: U(1) }] });
  assert.deepEqual([it[0].versions, it[0].feedback, it[0].credits, it[0].days, it[1].first_try], [2, 1, 6.5, 1.5, true]);
});

// ---------------------------------------------------------------- aprendizaje
const edits = Array.from({ length: 31 }, (_, i) => ({ id: 'e' + i, type: 'email_edit', subject_id: 'm' + i, before: { subject: 'Hola', body: 'Estimado Juan,\nle ofrezco una demo gratuita para mostrarle ejemplos concretos de agentes.\nSaludos cordiales' }, after: { subject: 'Hola', body: 'Estimado Juan,\n¿cómo lo resuelven hoy?\nSaludos cordiales' } }));
ok('patrones: acorta y quita «demo» con muestra suficiente; ignora pruebas', () => {
  const p = ln.lnPatterns(edits.concat([{ id: 't', type: 'email_edit', is_test: true, before: { body: 'x y z w' }, after: { body: 'x' } }]), 30);
  const acorta = p.find((x) => x.id === 'playbook:acorta');
  assert.equal(acorta.n, 31); assert.equal(acorta.sufficient, true);
  assert.ok(p.find((x) => x.id === 'evaluador:quita:gratuita'));
  assert.ok(!p.find((x) => x.id === 'playbook:saludo'));
});
ok('con 12 ejemplos: muestra insuficiente y la propuesta se descarta', () => {
  const few = edits.slice(0, 12);
  const c = ln.lnContext({ events: few, proposals: [], min: 30, enabled: true });
  assert.equal(c.reason, 'muestra insuficiente en todos los patrones');
  const pl = ln.lnProposePlan([{ pattern_id: 'playbook:acorta', proposal: 'Acortar los correos a 70–90 palabras como hace Christian.', citations: [{ event_id: 'e0' }, { event_id: 'e1' }, { event_id: 'e2' }] }], { events: few, proposals: [], min: 30, now: NOW });
  assert.equal(pl.writes.length, 0); assert.match(pl.resp.discarded[0].why, /muestra insuficiente \(12 de 30\)/);
});
ok('propuesta válida: cita ≥ 3 eventos del patrón y no duplica una abierta', () => {
  const x = { pattern_id: 'playbook:acorta', proposal: 'Acortar los correos a 70–90 palabras como hace Christian.', citations: [{ event_id: 'e0' }, { event_id: 'e1' }, { event_id: 'e2' }, { event_id: 'zzz' }] };
  const pl = ln.lnProposePlan([x, x], { events: edits, proposals: [], min: 30, now: NOW, is_test: true });
  assert.equal(pl.writes.length, 1); assert.equal(pl.resp.discarded[0].why, 'ya hay una propuesta abierta para ese patrón');
  const b = pl.writes[0].body;
  assert.deepEqual([b.target, b.sample_size, b.is_test, b.evidence.length, b.evidence[0].id], ['playbook', 31, true, 4, 'playbook:acorta']);
  assert.match(ln.lnProposePlan([{ ...x, citations: [{ event_id: 'e0' }] }], { events: edits, proposals: [], min: 30, now: NOW }).resp.discarded[0].why, /≥ 3 citas/);
  assert.equal(ln.lnContext({ events: edits, proposals: [], enabled: false }).mode, 'skip');
});
ok('decidir: aprueba sin aplicar; no decide dos veces; prueba protegida', () => {
  const pr = { id: U(7), status: 'proposed' };
  const a = ln.lnDecidePlan({ decision: 'approve' }, pr, { now: NOW, by: 'Christian via /ops' });
  assert.equal(a.writes[0].body.status, 'approved'); assert.match(a.resp.message, /No se aplica sola/);
  assert.match(a.writes[0].path, /status=eq\.proposed/);
  assert.equal(ln.lnDecidePlan({ decision: 'reject' }, { ...pr, status: 'approved' }, { now: NOW }).error, 'ya_decidida');
  assert.equal(ln.lnDecidePlan({ decision: 'reject' }, { ...pr, is_test: true }, { now: NOW }).error, 'propuesta_test');
});
ok('vista de Aprendizaje: abiertas primero, patrones y conteo', () => {
  const v = ln.lnView({ events: edits, proposals: [{ id: 'a', status: 'rejected', created_at: '2026-10-18' }, { id: 'b', status: 'proposed', created_at: '2026-10-10', evidence: [{ type: 'pattern', label: 'X' }, { type: 'event', id: 'e0' }] }], min: 30 });
  assert.deepEqual(v.proposals.map((p) => p.id), ['b', 'a']); assert.equal(v.proposals[0].citations, 1); assert.equal(v.by_type.email_edit, 31); assert.ok(v.sufficient >= 1);
});

console.log(n + ' pruebas de resultados/aprendizaje ok');
