import assert from 'node:assert/strict';
import * as ic from './ideas-core.mjs';

let n = 0;
const ok = (name, fn) => { try { fn(); n++; } catch (e) { console.error('FAIL', name, '\n', e.stack.split('\n').slice(0, 4).join('\n')); process.exitCode = 1; } };

const MON = Date.parse('2026-10-19T13:00:00Z');   // lunes 19-oct 10:00 Chile
const SRC = '11111111-1111-4111-8111-111111111111', SRC2 = '22222222-2222-4222-8222-222222222222';
const KNOWN = { sources: { [SRC]: true, [SRC2]: false }, intel: ['intel-1'], metrics: [], resources: [] };
const good = (o = {}) => ({ channel: 'instagram', format: 'carrusel', title: 'Qué proceso automatizar primero en una clínica', hook: '¿Tu recepción responde lo mismo 40 veces al día?',
  objective: 'educar', audience_insight: 'Dueños de clínicas que sienten que recepción no da abasto', core_message: 'Empieza por lo repetitivo y medible',
  structure: ['Portada con el gancho', 'Tres señales de un proceso automatizable', 'Cierre con el recurso'], cta: 'Comenta PROCESO y te mando la plantilla',
  production: { tools: ['Higgsfield', 'composer'], how: 'Carrusel ilustrado en la VPS', material: 'plantilla del recurso' }, effort: 'medio', risks: 'Que suene genérico',
  keyword: 'proceso', evidence: [{ type: 'source', id: SRC, note: 'Encuesta de atención' }], score_breakdown: { evidence: 28, relevance: 22, differentiation: 15, freshness: 10, feasibility: 8 }, ...o });

ok('autocontenidas (se incrustan en n8n)', () => { for (const f of Object.values(ic)) assert.ok(!/\bimport\b|\brequire\(/.test(f.toString()), f.name); });

ok('fechas: lunes de la semana (Chile) y suma de días', () => {
  assert.equal(ic.ideasMonday(MON), '2026-10-19');
  assert.equal(ic.ideasMonday(Date.parse('2026-10-19T02:00:00Z')), '2026-10-12');   // domingo 18 a las 23:00 en Chile
  assert.equal(ic.ideasAddDays('2026-10-26', -3), '2026-10-23');
});

ok('carril y métrica por defecto (anexo §D4)', () => {
  assert.equal(ic.ideasLane('reel'), 'pc'); assert.equal(ic.ideasLane('carrusel'), 'vps');
  assert.equal(ic.ideasDefaultMetric('educar'), 'saves'); assert.equal(ic.ideasDefaultMetric('autoridad', 'reel'), 'watch_time'); assert.equal(ic.ideasDefaultMetric('recurso'), 'dms'); assert.equal(ic.ideasDefaultMetric('conversaciones'), 'intent_comments'); assert.equal(ic.ideasDefaultMetric('servicio'), 'profile_visits');
});

ok('puntaje acotado por parte (30/25/20/15/10)', () => {
  assert.equal(ic.ideasScore({ evidence: 99, relevance: 25, differentiation: 20, freshness: 15, feasibility: 10 }).total, 100);
  assert.equal(ic.ideasScore({}).total, 0);
});

ok('ficha: completa con los 12 campos (CTA y recurso opcionales); detecta lo que falta', () => {
  assert.equal(ic.ideasFicha(ic.ideasNorm(good()).row).complete, true);
  const f = ic.ideasFicha(ic.ideasNorm(good({ hook: '', risks: '', structure: [] })).row);
  assert.equal(f.complete, false); assert.deepEqual(f.missing, ['gancho', 'estructura / escenas', 'riesgos']);
  assert.equal(ic.ideasFicha(ic.ideasNorm(good({ cta: '' })).row).complete, true);
});

ok('plazo (anexo §D3): el fin de semana cuenta; lunes 10:00 → domingo 25 alcanza para medio; jueves 14:00 no alcanza para alto+PC', () => {
  const i = { week_start: '2026-10-26', effort: 'medio', format: 'carrusel' };
  const d1 = ic.ideasDeadline(i, MON); assert.equal(d1.closing, '2026-10-25'); assert.equal(d1.left, 7); assert.equal(d1.state, 'alcanza');
  const thu = Date.parse('2026-10-29T17:00:00Z');   // jueves 14:00 Chile: quedan viernes, sábado y domingo
  const j = { ...i, week_start: '2026-11-02' };
  assert.equal(ic.ideasDeadline({ ...j, effort: 'bajo' }, thu).state, 'alcanza');
  assert.equal(ic.ideasDeadline({ ...j, effort: 'alto', format: 'reel' }, thu).state, 'no_alcanza');
  // fin de semana 23–25 oct: sin «No alcanza» (Christian asume el riesgo)
  assert.equal(ic.ideasDeadline({ ...i, effort: 'alto', format: 'reel' }, Date.parse('2026-10-23T20:00:00Z')).state, 'justo');
});

ok('propuesta: guarda lote + ideas buenas; descarta débiles (ficha, fuente, puntaje, duplicado) y cuenta las descartadas', () => {
  const p = { week_start: '2026-10-26', ideas: [good(), good({ title: 'Ficha floja', hook: '' }), good({ title: 'Sin fuente verificada', evidence: [{ type: 'source', id: SRC2 }] }), good({ title: 'Puntaje bajo de verdad', score_breakdown: { evidence: 10 } }), good({ title: 'Qué proceso automatizar primero en tu clínica' }), good({ channel: 'linkedin_page', format: 'texto', title: 'Agentes que fallan en silencio', hook: 'Un agente puede responder bien y fallar igual', evidence: [{ type: 'intel', id: 'intel-1' }] })] };
  const r = ic.ideasProposePlan(p, { now: MON, known: KNOWN, recent: [], batch_id: 'b-1' });
  assert.equal(r.resp.proposed, 2); assert.equal(r.resp.discarded_weak, 4);
  const ideas = r.writes.filter((w) => w.path === 'content_ideas');
  assert.equal(ideas.length, 2); assert.ok(ideas.every((w) => w.body.status === 'proposed' && w.body.batch_id === 'b-1' && w.body.ficha_complete === true && w.body.week_start === '2026-10-26'));
  assert.equal(r.writes[0].path, 'content_idea_batches'); assert.equal(r.writes[0].body.discarded_weak, 4);
  assert.ok(r.resp.weak.some((x) => /parece/.test(x.reasons.join())) && r.resp.weak.some((x) => /sin fuente verificada/.test(x.reasons.join())));
  assert.ok(r.writes.some((w) => w.path === 'ops_runs' && w.body.kind === 'ideas_week'));
});

ok('propuesta: tope por red (Instagram 7) y total 12; no repite las últimas 4 semanas', () => {
  const many = Array.from({ length: 9 }, (_, k) => good({ title: 'Tema distinto número ' + ['uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'][k] + ' sobre ' + ['agenda', 'cobros', 'stock', 'turnos', 'reclamos', 'cotizaciones', 'inventario', 'despacho', 'postventa'][k], hook: 'Pregunta distinta sobre ' + ['agenda', 'cobros', 'stock', 'turnos', 'reclamos', 'cotizaciones', 'inventario', 'despacho', 'postventa'][k] }));
  const r = ic.ideasProposePlan({ week_start: '2026-10-26', ideas: many }, { now: MON, known: KNOWN, recent: [], batch_id: 'b' });
  assert.equal(r.resp.proposed, 7); assert.ok(r.resp.weak.filter((w) => /tope/.test(w.reasons.join())).length === 2);
  const r2 = ic.ideasProposePlan({ week_start: '2026-10-26', ideas: [good()] }, { now: MON, known: KNOWN, recent: [{ title: 'Qué proceso automatizar primero en una clínica' }], batch_id: 'b' });
  assert.equal(r2.resp.proposed, 0);
});

ok('propuesta: semana debe ser lunes; sin ideas → error', () => {
  assert.equal(ic.ideasProposePlan({ week_start: '2026-10-27', ideas: [good()] }, { now: MON }).error, 'semana_invalida');
  assert.equal(ic.ideasProposePlan({ week_start: '2026-10-26', ideas: [] }, { now: MON }).error, 'sin_ideas');
});

ok('decidir: aprobar (con candado de estado), cambiar exige texto, descartar guarda razón + evento de aprendizaje, mover valida el lunes', () => {
  const idea = { id: 'i1', status: 'proposed', week_start: '2026-10-26', title: 'X', channel: 'instagram', format: 'carrusel', history: [] };
  const a = ic.ideasDecidePlan({ decision: 'approve' }, idea, { now: MON });
  assert.equal(a.resp.status, 'approved'); assert.match(a.writes[0].path, /status=in\.\(proposed\)/); assert.match(a.resp.message, /no se publica/);
  assert.equal(ic.ideasDecidePlan({ decision: 'change', text: 'ok' }, idea, { now: MON }).error, 'falta_cambio');
  const c = ic.ideasDecidePlan({ decision: 'change', text: 'Otro ángulo, más de costos' }, idea, { now: MON });
  assert.equal(c.writes[0].body.status, 'changed'); assert.equal(c.writes[0].body.change_request, 'Otro ángulo, más de costos');
  const d = ic.ideasDecidePlan({ decision: 'discard', chips: ['Muy genérica'], reason: 'ya lo dijimos' }, idea, { now: MON });
  assert.equal(d.writes[0].body.status, 'discarded'); assert.equal(d.writes[1].path, 'learning_events'); assert.equal(d.writes[1].body.type, 'idea_discard'); assert.match(d.writes[1].body.reason, /Muy genérica — ya lo dijimos/);
  assert.equal(ic.ideasDecidePlan({ decision: 'move', week_start: '2026-10-27' }, idea, { now: MON }).error, 'semana_invalida');
  assert.equal(ic.ideasDecidePlan({ decision: 'move', week_start: '2026-10-12' }, idea, { now: MON }).error, 'semana_pasada');
  assert.equal(ic.ideasDecidePlan({ decision: 'move', week_start: '2026-11-02' }, idea, { now: MON }).writes[0].body.week_start, '2026-11-02');
  assert.equal(ic.ideasDecidePlan({ decision: 'approve' }, { ...idea, status: 'in_production' }, { now: MON }).error, 'no_aprobable');
});

ok('Mi idea: nace aprobada, origin christian, ficha incompleta (Hermes la completa)', () => {
  const m = ic.ideasMinePlan({ title: 'Mostrar el antes/después de una agenda', channel: 'instagram', format: 'reel' }, { now: MON, id: 'm1' });
  const b = m.writes[0].body;
  assert.equal(b.status, 'approved'); assert.equal(b.origin, 'christian'); assert.equal(b.ficha_complete, false); assert.equal(b.week_start, '2026-10-26'); assert.equal(b.production.lane, 'pc');
  assert.equal(ic.ideasMinePlan({ title: 'x', channel: 'instagram' }, { now: MON }).error, 'falta_titulo');
});

ok('reescribir: un «Cambiar» vuelve a proposed con ficha nueva; «Mi idea» se completa y sigue aprobada', () => {
  const ch = { id: 'i1', status: 'changed', channel: 'instagram', format: 'carrusel', title: 'Viejo', change_request: 'otro ángulo', evidence: [{ type: 'source', id: SRC }], history: [] };
  const r = ic.ideasRevisePlan(good({ title: 'Nuevo ángulo de costos' }), ch, { now: MON, known: KNOWN });
  assert.equal(r.writes[0].body.status, 'proposed'); assert.equal(r.writes[0].body.change_request, null); assert.match(r.writes[0].path, /status=eq\.changed/); assert.equal(r.writes[0].body.history.slice(-1)[0].before.title, 'Viejo');
  const mine = { id: 'm1', status: 'approved', origin: 'christian', ficha_complete: false, channel: 'instagram', format: 'reel', title: 'Mi idea', history: [] };
  const r2 = ic.ideasRevisePlan(good({ format: 'reel', evidence: [] }), mine, { now: MON, known: KNOWN });
  assert.equal(r2.writes[0].body.status, 'approved'); assert.equal(r2.writes[0].body.ficha_complete, true);
  assert.equal(ic.ideasRevisePlan(good(), { ...ch, status: 'proposed' }, { now: MON }).error, 'no_revisable');
  assert.equal(ic.ideasRevisePlan(good({ risks: '' }), ch, { now: MON, known: KNOWN }).error, 'ficha_incompleta');
});

ok('vista: agrupa por semana y red, pliega las débiles, trae plazo y el contador de descartadas', () => {
  const ideas = [{ id: 'a', week_start: '2026-10-26', channel: 'instagram', format: 'carrusel', title: 'A', status: 'proposed', score: 90, effort: 'bajo' }, { id: 'b', week_start: '2026-10-26', channel: 'instagram', format: 'reel', title: 'B', status: 'proposed', score: 72, effort: 'alto' },
    { id: 'c', week_start: '2026-10-26', channel: 'linkedin_page', format: 'texto', title: 'C', status: 'approved', score: 80 }, { id: 'd', week_start: '2026-10-26', channel: 'instagram', format: 'texto', title: 'D', status: 'discarded', score: 85 }, { id: 't', week_start: '2026-10-26', channel: 'instagram', format: 'texto', title: 'T', status: 'proposed', is_test: true }];
  const v = ic.ideasListView(ideas, [{ week_start: '2026-10-26', discarded_weak: 3, discarded: [{ title: 'x', reasons: ['ficha incompleta'] }], created_at: '2026-10-19T10:30:00Z' }], MON);
  assert.equal(v.weeks.length, 1); const w = v.weeks[0];
  assert.equal(w.is_next, true); assert.equal(w.discarded_weak, 3); assert.equal(w.counts.proposed, 2);
  const ig = w.channels.find((c) => c.channel === 'instagram');
  assert.deepEqual(ig.ideas.map((i) => i.id), ['a']); assert.deepEqual(ig.folded.map((i) => i.id), ['b']); assert.equal(ig.ideas[0].deadline.state, 'alcanza');
  assert.equal(w.channels.find((c) => c.channel === 'linkedin_page').ideas[0].status, 'approved');
});

ok('compuerta del job: skip con pausa o con el job apagado; revise si ya hay propuesta y hay cambios', () => {
  const base = { now: MON, content_cfg: { ideas_enabled: true }, system_state: { global_pause: false }, ideas_all: [], pieces: [] };
  assert.equal(ic.ideasGateView(base).mode, 'run'); assert.equal(ic.ideasGateView(base).week_start, '2026-10-26');
  assert.equal(ic.ideasGateView({ ...base, system_state: { global_pause: true } }).mode, 'skip');
  assert.equal(ic.ideasGateView({ ...base, content_cfg: { ideas_enabled: false } }).mode, 'skip');
  const withProp = { ...base, ideas_all: [{ id: 'x', week_start: '2026-10-26', origin: 'hermes', status: 'proposed', title: 'X' }, { id: 'y', week_start: '2026-10-26', origin: 'hermes', status: 'changed', title: 'Y', change_request: 'otro' }] };
  const g = ic.ideasGateView(withProp); assert.equal(g.mode, 'revise'); assert.equal(g.changes.length, 1);
});

ok('ids: formato uuid v4', () => { assert.match(ic.ideasNewId(), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/); });

console.log(n + ' ok');
