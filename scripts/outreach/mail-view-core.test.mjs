// node scripts/outreach/mail-view-core.test.mjs — vista «Prospección y correo» (solo lectura).
import assert from 'node:assert/strict';
import * as mv from './mail-view-core.mjs';

let n = 0;
const ok = (name, fn) => { try { fn(); n++; } catch (e) { console.error('FAIL', name, '\n', e.stack.split('\n').slice(0, 4).join('\n')); process.exitCode = 1; } };

const TZ = 'America/Santiago';
const NOW = Date.parse('2026-10-20T14:00:00Z'); // martes 11:00 en Chile (en ventana)
const iso = (ms) => new Date(ms).toISOString();
const cfg = { mode: 'live', paused: false, daily_cap: 3, window_start: '09:00', window_end: '17:30', tz: TZ, followup_days: [4, 9, 18], autosend_enabled: false, autosend_min_score: 80, funnel_min_sample: 2, legal_footer: 'Pie' };
const out = (o) => ({ id: 'm' + Math.random().toString(36).slice(2, 8), candidate_id: 'c1', company_name: 'Empresa', direction: 'outbound', kind: 'initial', status: 'sent', to_email: 'a@b.cl', subject: 'S', body: 'B', created_at: iso(NOW - 86400000), ...o });
const inb = (o) => ({ id: 'i' + Math.random().toString(36).slice(2, 8), candidate_id: 'c1', company_name: 'Empresa', direction: 'inbound', kind: 'other', status: 'received', classification: 'reply', created_at: iso(NOW - 3600000), body: 'Hola', ...o });

ok('Hoy: enviados hoy, ventana, próximo envío y estimación hoy/próximo día con el tope', () => {
  const msgs = [out({ sent_at: iso(NOW - 3600000) }), out({ status: 'approved', candidate_id: 'c2', approved_at: iso(NOW - 7200000) }), out({ status: 'approved', candidate_id: 'c3', approved_at: iso(NOW - 3600000) }), out({ status: 'approved', candidate_id: 'c4', approved_at: iso(NOW - 1800000) })];
  const v = mv.mailView({ now: NOW, cfg, msgs, supp: [], cands: [] });
  assert.equal(v.hoy.sent_today, 1); assert.equal(v.hoy.in_window, true); assert.equal(v.hoy.approved, 3);
  assert.equal(v.hoy.will_today, 2); assert.equal(v.hoy.will_next, 1);
  assert.deepEqual(v.cola.map((q) => q.eta), ['hoy', 'hoy', 'próximo día hábil']);
  assert.match(v.hoy.next_send, /próxima corrida/);
});
ok('Cola: en pausa nada sale hoy y cada fila lo dice', () => {
  const v = mv.mailView({ now: NOW, cfg, msgs: [out({ status: 'approved' })], supp: [], cands: [], pause: { paused: true } });
  assert.equal(v.hoy.paused, true); assert.equal(v.hoy.will_today, 0); assert.equal(v.cola[0].eta, 'en pausa'); assert.equal(v.hoy.next_send, 'en pausa');
});
ok('Cola: fuera de ventana (sábado) todo pasa al próximo día hábil', () => {
  const sat = Date.parse('2026-10-24T14:00:00Z');
  const v = mv.mailView({ now: sat, cfg, msgs: [out({ status: 'approved' }), out({ status: 'approved', candidate_id: 'c2' })], supp: [], cands: [] });
  assert.equal(v.hoy.will_today, 0); assert.deepEqual(v.cola.map((q) => q.eta), ['próximo día hábil', 'próximo día hábil']);
});
ok('Respuestas: clasificación legible y marca si ya hay borrador de respuesta', () => {
  const v = mv.mailView({ now: NOW, cfg, msgs: [out({ sent_at: iso(NOW - 86400000) }), inb({}), out({ kind: 'reply', status: 'draft' })], supp: [], cands: [] });
  assert.equal(v.respuestas.replies[0].cls_label, 'Respuesta'); assert.equal(v.respuestas.replies[0].reply_draft, true);
  assert.equal(v.respuestas.sent[0].answer, 'Respuesta');
});
ok('Seguimientos: el +4 hábil se calcula del envío y se omite si respondieron', () => {
  const sentAt = Date.parse('2026-10-15T14:00:00Z'); // jueves
  const v = mv.mailView({ now: NOW, cfg, msgs: [out({ sent_at: iso(sentAt) }), out({ candidate_id: 'c9', sent_at: iso(sentAt) }), inb({ candidate_id: 'c9' })], supp: [], cands: [] });
  assert.equal(v.seguimientos.upcoming.length, 1);
  assert.equal(v.seguimientos.upcoming[0].due, '2026-10-21'); // jue + 4 hábiles = mié
});
ok('Embudo: etapas acumuladas y desglose solo con muestra suficiente', () => {
  const cands = [{ id: 'c1', status: 'contacted', industry: 'Salud', ghl_stage: 'contactado' }, { id: 'c2', status: 'contacted', industry: 'Salud', ghl_stage: 'respondio' }, { id: 'c3', status: 'in_ghl', industry: 'Minería', ghl_stage: 'investigado' }];
  const msgs = [out({ candidate_id: 'c1', sent_at: iso(NOW - 86400000) }), out({ candidate_id: 'c2', sent_at: iso(NOW - 86400000) }), inb({ candidate_id: 'c2' })];
  const v = mv.mailView({ now: NOW, cfg, msgs, supp: [], cands });
  assert.deepEqual(v.embudo.stages.slice(0, 5).map((s) => s.count), [3, 2, 2, 2, 1]);
  const salud = v.embudo.by_industry.find((x) => x.key === 'Salud');
  assert.equal(salud.enough, true); assert.equal(salud.rate_pct, 50);
  const v2 = mv.mailView({ now: NOW, cfg: { ...cfg, funnel_min_sample: 20 }, msgs, supp: [], cands });
  assert.equal(v2.embudo.by_industry[0].rate_pct, null);
});
ok('Salud §G3: crítica con ≥ 20 envíos y rebote ≥ 5 %; importante ≥ 3 %; sugerencia solo con ≥ 50, < 2 % y 0 reclamos', () => {
  const sent = (k) => Array.from({ length: k }, (_, i) => out({ candidate_id: 'x' + i, sent_at: iso(NOW - 3600000 * (i + 1)) }));
  const b = (k) => Array.from({ length: k }, () => inb({ classification: 'bounce' }));
  assert.equal(mv.mvHealth(sent(20).concat(b(1)), 40, NOW).level, 'critical');
  assert.equal(mv.mvHealth(sent(19).concat(b(1)), 40, NOW).level, 'high');
  assert.equal(mv.mvHealth(sent(100).concat(b(3)), 40, NOW).level, 'high');
  assert.equal(mv.mvHealth(sent(100).concat(b(2)), 40, NOW).level, 'ok');
  assert.equal(mv.mvHealth(sent(60).concat(b(1)), 40, NOW).suggestion.to, 50);
  assert.equal(mv.mvHealth(sent(40), 40, NOW).suggestion.to, null);
  assert.equal(mv.mvHealth(sent(60).concat([inb({ classification: 'unsubscribe', body: 'esto es spam' })]), 40, NOW).suggestion.to, null);
  assert.equal(mv.mvHealth(sent(60), 50, NOW).suggestion.to, null);
});
ok('Salud: ritmo de los últimos 7 días hábiles y lista de supresión', () => {
  const v = mv.mailView({ now: NOW, cfg, msgs: [out({ sent_at: iso(NOW - 3600000) })], supp: [{ email: 'x@y.cl', reason: 'bounce' }], cands: [] });
  assert.equal(v.salud.pace.length, 7); assert.equal(v.salud.pace[0].sent, 1); assert.equal(v.salud.suppression_total, 1);
});
ok('el núcleo es autocontenido (se puede incrustar en n8n)', () => {
  for (const f of Object.values(mv)) { const src = f.toString(); assert.ok(!/\bimport\b|require\(/.test(src), f.name); }
});
console.log(n + ' ok');
