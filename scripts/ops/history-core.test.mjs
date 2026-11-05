// node scripts/ops/history-core.test.mjs — historial legible (spec §8.4)
import assert from 'node:assert/strict';
import * as hc from './history-core.mjs';

let n = 0;
const ok = (name, fn) => { try { fn(); n++; } catch (e) { console.error('FAIL', name, '\n', e.stack.split('\n').slice(0, 4).join('\n')); process.exitCode = 1; } };
const T0 = Date.parse('2026-10-13T12:56:00Z'); // 09:56 en Chile
const at = (min) => new Date(T0 + min * 60000).toISOString();

ok('agrupa acciones iguales y seguidas: «Hermes guardó 12 borradores (09:56–10:07)»', () => {
  const audit = Array.from({ length: 12 }, (_, i) => ({ id: 'a' + i, actor: 'Christian vía Hermes', tool: 'save_draft', status: 'executed', entity: { company: 'E' + i }, params: {}, created_at: at(i) }));
  const v = hc.historyView({ now: T0 + 3600000, audit });
  assert.equal(v.lines.length, 1);
  assert.equal(v.lines[0].text, 'Hermes guardó 12 borradores (09:56–10:07)');
  assert.equal(v.lines[0].section, 'correo'); assert.equal(v.lines[0].count, 12);
});
ok('un incidente tipo 13-oct se lee en orden: Christian aprobó, el motor canceló, Christian reemplazó', () => {
  const audit = Array.from({ length: 24 }, (_, i) => ({ id: 'b' + i, actor: 'Christian via /ops', tool: 'ops_email_approve', status: 'executed', entity: {}, params: {}, created_at: at(i) }));
  const msgs = Array.from({ length: 23 }, (_, i) => ({ direction: 'outbound', status: 'cancelled', error: 'Cancelado por el motor: el contenido cambió después de la aprobación', updated_at: at(60 + i) }))
    .concat(Array.from({ length: 12 }, (_, i) => ({ direction: 'outbound', status: 'cancelled', error: 'Reemplazado por la versión editada por Christian (13-oct).', updated_at: at(180 + i) })));
  const v = hc.historyView({ now: T0 + 6 * 3600000, audit, msgs });
  const texts = v.lines.map((l) => l.text);
  assert.match(texts[2], /^Christian aprobó 24 correos/);
  assert.match(texts[1], /^Motor canceló 23 correos: el contenido cambió/);
  assert.match(texts[0], /^Christian reemplazó 12 borradores de Hermes por su versión/);
});
ok('no agrupa si pasan más de 45 minutos o cambia el actor', () => {
  const audit = [{ actor: 'Christian via /ops', tool: 'ops_email_approve', status: 'executed', created_at: at(0) }, { actor: 'Christian via /ops', tool: 'ops_email_approve', status: 'executed', created_at: at(50) }, { actor: 'Christian vía Hermes', tool: 'save_draft', status: 'executed', created_at: at(51) }];
  assert.equal(hc.historyView({ now: T0 + 7200000, audit }).lines.length, 3);
});
ok('consultas (list_/get_) no aparecen; pausa, ideas, Taller y config del correo sí, con enlace', () => {
  const audit = [{ actor: 'Christian vía Hermes', tool: 'list_outreach', created_at: at(0) }, { actor: 'Christian via /ops', tool: 'ops_pause_set', params: { decision: 'paused', reason: 'Viaje' }, created_at: at(1) },
    { actor: 'Christian via /ops', tool: 'ops_idea_decide', params: { decision: 'approve' }, created_at: at(2) }, { id: 'c', actor: 'Christian via /ops', tool: 'ops_mail_config_set', entity: { before: { daily_cap: 40 }, after: { daily_cap: 45 } }, created_at: at(3) }];
  const v = hc.historyView({ now: T0 + 3600000, audit });
  assert.equal(v.lines.length, 3);
  assert.ok(v.lines.some((l) => /PAUSÓ todo el sistema \(Viaje\)/.test(l.text) && l.href === '/ops?view=controles'));
  assert.ok(v.lines.some((l) => /tope 40 → 45/.test(l.text)));
});
ok('alertas críticas e importantes entran; estados internos y avisos de corrida no', () => {
  const alerts = [{ alert_key: '_state:hermes', severity: 'info', first_seen_at: at(0) }, { alert_key: 'hash_mismatch:x', severity: 'critical', title: 'Huella no coincide: Alfa', first_seen_at: at(1), status: 'open' }, { alert_key: 'run:1', severity: 'high', title: 'Radar', meta: { notice: 'x' }, first_seen_at: at(2) }];
  const v = hc.historyView({ now: T0 + 3600000, alerts });
  assert.equal(v.lines.length, 1); assert.match(v.lines[0].text, /CRÍTICA: Huella no coincide: Alfa/);
});
ok('filtros disponibles: actores, secciones y días', () => {
  const v = hc.historyView({ now: T0 + 3600000, runs: [{ id: 'r', kind: 'prospect_radar', status: 'ok', summary: { imported: 3 }, created_at: at(0) }], audit: [{ actor: 'Christian via /ops', tool: 'ops_email_approve', created_at: at(5) }] });
  assert.deepEqual(v.actors.sort(), ['Christian', 'Hermes']); assert.deepEqual(v.sections.sort(), ['correo', 'prospeccion']); assert.deepEqual(v.days, ['2026-10-13']);
  assert.match(v.lines.find((l) => l.actor === 'Hermes').text, /corrió el Radar de prospectos · 3 nuevos/);
});
ok('el núcleo es autocontenido', () => { for (const f of Object.values(hc)) assert.ok(!/\bimport\b|require\(/.test(f.toString()), f.name); });
console.log(n + ' ok');
