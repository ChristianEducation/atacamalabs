#!/usr/bin/env node
// node --experimental-strip-types scripts/ops/strategic-parse.test.mjs — el validador que protege a /ops de una respuesta mal formada de n8n (spec RADAR §6.3: nada de `as` a ciegas).
import assert from 'node:assert/strict';
import { parseStrategicView, parseTarget, parseOpportunity, isStrategicTab } from '../../src/lib/ops/strategic.ts';

let n = 0;
const ok = (name, fn) => { try { fn(); n++; } catch (e) { console.error('FAIL', name, '\n', String(e.stack).split('\n').slice(0, 4).join('\n')); process.exitCode = 1; } };

const target = (o = {}) => ({ id: 't1', logical_name: 'Librería Crecer', repo_full_name: null, repo_branch: null, deployment_url: null, health_url: null, provider: null, status: 'candidate', monitor_enabled: false, verified_at: null, notes: null, last_deploy_sha: null, section: 'pending', http_state: 'unverified', health_reason: 'sin_verificar', last_checked_at: null, last_check: null, ...o });
const ev = (o = {}) => ({ source_url: 'https://github.com/acme/repo', source_title: 'Repo', source_type: 'repository', claim: 'Existe este código', excerpt: null, source_published_at: null, verified_at: '2026-11-02T15:00:00Z', ...o });
const opp = (o = {}) => ({ id: 'o1', kind: 'product', title: 'Repo', organization: 'Acme', canonical_url: 'https://github.com/acme/repo', summary: 'Resumen', business_case: 'Caso', target_customer: null, next_action: 'Validar', status: 'new', score: 80, score_parts: { license: 25 }, confidence: 'medium', license_id: null, license_verified: false, coverage_pct: null, critical_blockers: [], evidence: [ev()], stale_days: null, unverified: false, ...o });
const view = (tab, items, o = {}) => ({ generated_at: '2026-11-02T15:00:00Z', tab, enabled: false, source_state: 'ok', summary: { total: items.length, pending: items.length, alerts: 0, last_run_at: null }, items, runs: [], ...o });

ok('acepta una vista de producción válida y la copia limpia', () => {
  const v = parseStrategicView(view('production', [target(), target({ id: 't2', status: 'confirmed', section: 'confirmed', monitor_enabled: true, http_state: 'healthy', last_check: { checked_at: '2026-11-02T15:00:00Z', result: 'healthy', http_status: 200, latency_ms: 120, error_code: null } })]));
  assert.ok(v); assert.equal(v.items.length, 2); assert.equal(v.items[1].last_check.http_status, 200);
});
ok('acepta una vista de oportunidades válida', () => {
  const v = parseStrategicView(view('products', [opp(), opp({ id: 'o2', score: null, status: 'shortlisted' })]));
  assert.ok(v); assert.equal(v.items[1].score, null);
});
ok('los campos desconocidos NO pasan a la interfaz (se copia a un objeto nuevo)', () => {
  const v = parseStrategicView(view('production', [target({ secreto: 'x', service_role: 'y' })]));
  assert.ok(v); assert.ok(!('secreto' in v.items[0]) && !('service_role' in v.items[0]));
  const o = parseOpportunity(opp({ fingerprint: 'abc', decision_by_secret: 1 }));
  assert.ok(o); assert.ok(!('fingerprint' in o));
});
ok('una sola fila mal formada rechaza la vista completa (no se muestra «menos filas» como si fuera todo)', () => {
  for (const bad of [target({ logical_name: null }), target({ id: 5 }), target({ status: 'hackeado' }), target({ http_state: 'verde' }), target({ monitor_enabled: 'si' }), target({ last_check: { result: 'x' } })]) {
    assert.equal(parseStrategicView(view('production', [target(), bad])), null, JSON.stringify(bad).slice(0, 60));
  }
  for (const bad of [opp({ title: '' }), opp({ kind: 'cripto' }), opp({ status: 'nuevo' }), opp({ confidence: 'altisima' }), opp({ canonical_url: null }), opp({ evidence: [ev({ source_type: 'blog' })] }), opp({ evidence: [ev({ claim: null })] }), opp({ evidence: [null] })]) {
    assert.equal(parseStrategicView(view('events', [opp({ kind: 'event' }), bad])), null, JSON.stringify(bad).slice(0, 60));
  }
});
ok('rechaza una vista con forma rota', () => {
  const good = view('events', [opp({ kind: 'event' })]);
  for (const bad of [null, undefined, 'x', 5, [], {}, { ...good, tab: 'otra' }, { ...good, source_state: 'genial' }, { ...good, generated_at: null }, { ...good, enabled: 'si' }, { ...good, items: 'x' }, { ...good, runs: null }, { ...good, summary: null }, { ...good, summary: { total: '1', pending: 0, alerts: 0 } }, { ...good, runs: [{ id: 'r' }] }]) {
    assert.equal(parseStrategicView(bad), null, JSON.stringify(bad)?.slice(0, 60));
  }
});
ok('un puntaje/cobertura que no es número queda null (nunca 0 inventado)', () => {
  const o = parseOpportunity(opp({ score: '90', coverage_pct: 'alto' }));
  assert.equal(o.score, null); assert.equal(o.coverage_pct, null);
});
ok('licencia sin verificar queda false aunque llegue un valor raro', () => {
  assert.equal(parseOpportunity(opp({ license_verified: 'true' })).license_verified, false);
  assert.equal(parseOpportunity(opp({ license_verified: true, license_id: 'MIT' })).license_verified, true);
});
ok('las pestañas válidas son exactamente cuatro', () => {
  for (const t of ['production', 'products', 'partners', 'events']) assert.ok(isStrategicTab(t));
  for (const t of ['prod', 'Production', '', null, undefined, 'radar_produccion', "events'--"]) assert.ok(!isStrategicTab(t));
});
ok('parseTarget exige sección y estado coherentes con el contrato', () => {
  assert.ok(parseTarget(target()));
  assert.equal(parseTarget(target({ section: 'otro' })), null);
  assert.equal(parseTarget(null), null);
});

console.log(`${n} ok`);
