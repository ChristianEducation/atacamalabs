// node scripts/ops/strategic-radar-core.test.mjs — Radar estratégico: núcleo puro (spec §7, §8, §17). Fixtures sintéticos, ningún dato real.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as sr from './strategic-radar-core.mjs';

let n = 0;
const ok = (name, fn) => { try { fn(); n++; } catch (e) { console.error('FAIL', name, '\n', e.stack.split('\n').slice(0, 4).join('\n')); process.exitCode = 1; } };
const NOW = Date.parse('2026-11-02T15:00:00Z');
const MIN = 60000, DAY = 86400000;
const iso = (ms) => new Date(ms).toISOString();

const ev = (o) => ({ source_url: 'https://example.org/p', source_title: 'Fuente oficial', source_type: 'official', claim: 'Programa vigente para Chile', excerpt: 'texto corto', source_published_at: null, verified_at: iso(NOW - DAY), ...o });
const reqs = (states) => states.map((s, i) => ({ name: 'Req ' + (i + 1), state: s, evidence_url: s === 'unknown' ? null : 'https://github.com/acme/repo/blob/main/README.md' }));
const TEN = (s) => Array(10).fill(s);
const product = (o) => ({ title: 'Repo X', organization: 'Acme', canonical_url: 'https://github.com/acme/repo', scoring: { license: 25, functionality: 22, integrations: 12, security: 12, deploy: 8, sales_fit: 8 }, requirements: reqs(TEN('implemented')), license_id: 'MIT', license_verified: true, critical_blockers: [], evidence: [ev({ source_type: 'repository' }), ev({ source_url: 'https://github.com/acme/repo/blob/main/LICENSE', source_type: 'documentation', claim: 'Licencia MIT declarada' })], ...o });

// ---- URL canónica y huella ----
ok('canónica: mayúsculas de host, fragmento y tracking convergen', () => {
  assert.equal(sr.srCanonicalUrl('https://GitHub.com/Acme/Repo/?utm_source=a#readme'), 'https://github.com/Acme/Repo');
  assert.equal(sr.srCanonicalUrl('https://github.com/Acme/Repo'), 'https://github.com/Acme/Repo');
  assert.equal(sr.srCanonicalUrl('https://x.cl/a/?FBCLID=1&gclid=2&igshid=3&utm_Medium=x'), 'https://x.cl/a');
});
ok('canónica: conserva identificadores y ordena parámetros; una barra final fuera salvo raíz', () => {
  assert.equal(sr.srCanonicalUrl('https://organizador.cl/evento?id=2026'), 'https://organizador.cl/evento?id=2026');
  assert.notEqual(sr.srCanonicalUrl('https://organizador.cl/evento?id=2026'), sr.srCanonicalUrl('https://organizador.cl/evento?id=2027'));
  assert.equal(sr.srCanonicalUrl('https://a.cl/x?year=2026&event=7&utm_source=z'), 'https://a.cl/x?event=7&year=2026');
  assert.equal(sr.srCanonicalUrl('https://a.cl'), 'https://a.cl/');
  assert.equal(sr.srCanonicalUrl('https://a.cl:443/x/'), 'https://a.cl/x');
  assert.equal(sr.srCanonicalUrl('https://a.cl/X/Y'), 'https://a.cl/X/Y');
  assert.equal(sr.srCanonicalUrl('https://a.cl./x'), 'https://a.cl/x');
});
ok('canónica: rechaza http, credenciales, puertos, locales, IP privadas y data URL', () => {
  for (const bad of ['http://a.cl/x', 'https://user:pw@a.cl/', 'https://a.cl:8443/', 'https://localhost/x', 'https://127.0.0.1/', 'https://10.0.0.5/', 'https://192.168.1.2/', 'https://172.20.0.1/', 'https://169.254.169.254/', 'https://[::1]/', 'https://intranet/x', 'https://app.internal/', 'data:text/html,hola', 'javascript:alert(1)', '', null, undefined, 'no es url'])
    assert.equal(sr.srCanonicalUrl(bad), null, String(bad));
});
ok('sha256 propio coincide con node:crypto (vacío, ASCII, UTF-8, bloques largos)', () => {
  for (const s of ['', 'abc', 'product\nhttps://github.com/acme/repo', 'ñandú — evento 2026', 'x'.repeat(55), 'x'.repeat(56), 'x'.repeat(64), 'y'.repeat(1000)])
    assert.equal(sr.srSha256(s), createHash('sha256').update(s, 'utf8').digest('hex'), s.slice(0, 20));
});
ok('huella: kind+url; evento con fecha real suma sufijo; sin fecha no; kind inválido → null', () => {
  const u = 'https://github.com/acme/repo';
  assert.equal(sr.srFingerprint('product', u), createHash('sha256').update('product\n' + u).digest('hex'));
  assert.match(sr.srFingerprint('partner', u), /^[a-f0-9]{64}$/);
  assert.notEqual(sr.srFingerprint('product', u), sr.srFingerprint('partner', u));
  const e = 'https://org.cl/summit';
  assert.notEqual(sr.srFingerprint('event', e, '2026-11-10'), sr.srFingerprint('event', e, '2027-11-09'));
  assert.equal(sr.srFingerprint('event', e, null), sr.srFingerprint('event', e, 'fecha rara'));
  assert.equal(sr.srFingerprint('event', e, '2026-11-10'), createHash('sha256').update('event\n' + e + '\n2026-11-10').digest('hex'));
  assert.equal(sr.srFingerprint('products', u), null);
  assert.equal(sr.srDbKind('products'), 'product'); assert.equal(sr.srDbKind('x'), null);
});
ok('URLs duplicadas producen la misma huella (un solo ítem)', () => {
  const a = sr.srFingerprint('product', sr.srCanonicalUrl('https://GitHub.com/acme/repo/?utm_source=x#top'));
  const b = sr.srFingerprint('product', sr.srCanonicalUrl('https://github.com/acme/repo'));
  assert.equal(a, b);
});

// ---- Fechas ----
ok('fechas: ISO con offset sí; solo fecha es date_only; sin offset o texto → null (no se inventa hora)', () => {
  assert.equal(sr.srParseDate('2026-11-10T09:00:00-03:00').date_only, false);
  assert.equal(sr.srParseDate('2026-11-10').date_only, true);
  assert.equal(sr.srParseDate('2026-11-10T09:00:00'), null);
  assert.equal(sr.srParseDate('pronto'), null);
  assert.equal(sr.srParseDate(null), null);
});
ok('días: solo-fecha por día calendario en Santiago; timestamp con ceil; no verificable → null', () => {
  assert.equal(sr.srDaysLeft('2026-11-02', NOW), 0);
  assert.equal(sr.srDaysLeft('2026-11-07', NOW), 5);
  assert.equal(sr.srDaysLeft('2026-11-01', NOW), -1);
  assert.equal(sr.srDaysLeft(iso(NOW + 5 * DAY - MIN), NOW), 5);
  assert.equal(sr.srDaysLeft(null, NOW), null);
});
ok('evento: ayer → expired; sin fecha → unverified; futuro → upcoming; fin futuro mantiene vigente', () => {
  assert.equal(sr.srEventState({ event_start_at: '2026-11-01' }, NOW), 'expired');
  assert.equal(sr.srEventState({}, NOW), 'unverified');
  assert.equal(sr.srEventState({ event_start_at: '2026-12-01' }, NOW), 'upcoming');
  assert.equal(sr.srEventState({ event_start_at: iso(NOW - 2 * DAY), event_end_at: iso(NOW + DAY) }, NOW), 'upcoming');
});

// ---- Evidencia ----
ok('evidencia: válida con fuente primaria, fecha de verificación, organización y claim', () => {
  const r = sr.srValidateEvidence({ organization: 'Acme', evidence: [ev()] });
  assert.equal(r.ok, true); assert.equal(r.primary, 1);
});
ok('evidencia: rechaza sin fuente, sin organización, HTTP, claim vacío, sin verified_at, solo secundaria y >5 fuentes', () => {
  const reason = (it) => sr.srValidateEvidence(it).reasons.join('|');
  assert.match(reason({ organization: 'A', evidence: [] }), /evidence_missing/);
  assert.match(reason({ evidence: [ev()] }), /organization_missing/);
  assert.match(reason({ organization: 'A', evidence: [ev({ source_url: 'http://a.cl/x' })] }), /source_url_invalid/);
  assert.match(reason({ organization: 'A', evidence: [ev({ claim: '' })] }), /claim_missing/);
  assert.match(reason({ organization: 'A', evidence: [ev({ verified_at: null })] }), /verified_at_invalid/);
  assert.match(reason({ organization: 'A', evidence: [ev({ verified_at: '2026-10-01' })] }), /verified_at_invalid/);
  assert.match(reason({ organization: 'A', evidence: [ev({ source_type: 'secondary' })] }), /primary_source_missing/);
  assert.match(reason({ organization: 'A', evidence: Array(6).fill(ev()) }), /too_many_sources/);
  assert.match(reason({ organization: 'A', evidence: [ev({ excerpt: 'x'.repeat(351) })] }), /excerpt_too_long/);
  assert.equal(sr.srValidateEvidence(null).ok, false);
});

// ---- Productos ----
ok('producto: 10 reqs implementados + licencia verificada + sin bloqueos → casi listo, 100 %', () => {
  const r = sr.srScoreProduct(product());
  assert.equal(r.coverage_pct, 100); assert.equal(r.nearly_ready, true); assert.equal(r.confidence, 'high'); assert.equal(r.score, 87);
});
ok('producto: 9 implementados + 1 unknown NO es «90 % comprobado» (cobertura provisional)', () => {
  const r = sr.srScoreProduct(product({ requirements: reqs([...Array(9).fill('implemented'), 'unknown']) }));
  assert.equal(r.coverage_pct, 90); assert.equal(r.coverage_provisional, true); assert.equal(r.nearly_ready, false);
});
ok('producto: parcial vale 0,5; missing 0; redondeo', () => {
  assert.equal(sr.srCoverage(reqs([...Array(8).fill('implemented'), 'partial', 'missing'])).coverage_pct, 85);
  assert.equal(sr.srCoverage(reqs(TEN('partial'))).coverage_pct, 50);
  assert.equal(sr.srCoverage(reqs(TEN('missing'))).coverage_pct, 0);
});
ok('producto: repo con estrellas pero licencia sin verificar → licencia 0 y no vendible', () => {
  const r = sr.srScoreProduct(product({ license_verified: false, license_id: null, critical_blockers: ['Licencia no comprobada'] }));
  assert.equal(r.parts.license, 0); assert.equal(r.sellable, false); assert.equal(r.nearly_ready, false); assert.equal(r.score, 62);
});
ok('producto: menos de 10 requisitos → cobertura NULL, confianza baja, nunca casi listo', () => {
  const r = sr.srScoreProduct(product({ requirements: reqs(TEN('implemented')).slice(0, 7) }));
  assert.equal(r.coverage_pct, null); assert.equal(r.confidence, 'low'); assert.equal(r.nearly_ready, false);
});
ok('producto: un requisito implementado sin evidencia bloquea «casi listo»; bloqueo crítico también', () => {
  const q = reqs(TEN('implemented')); q[3].evidence_url = null;
  assert.equal(sr.srScoreProduct(product({ requirements: q })).nearly_ready, false);
  assert.equal(sr.srScoreProduct(product({ critical_blockers: ['AGPL sin plan'] })).nearly_ready, false);
});
ok('producto: el score no se puede inflar (se recorta al máximo de cada criterio, basura → 0)', () => {
  const r = sr.srScoreProduct(product({ scoring: { license: 99, functionality: 99, integrations: 99, security: 99, deploy: 99, sales_fit: 'x' } }));
  assert.equal(r.score, 25 + 25 + 15 + 15 + 10 + 0);
});

// ---- Alianzas ----
ok('alianza: sin oficial o elegibilidad no comprobada → confianza baja', () => {
  const p = { organization: 'Org', scoring: { fit: 25, mutual_benefit: 15, eligibility: 18, access: 10, terms: 10 }, evidence: [ev()] };
  assert.equal(sr.srScorePartner(p).confidence, 'medium'); // 1 fuente oficial, elegibilidad comprobada
  assert.equal(sr.srScorePartner({ ...p, scoring: { ...p.scoring, eligibility: 3 } }).confidence, 'low'); // fuera de Chile/LATAM
  assert.equal(sr.srScorePartner({ ...p, evidence: [ev({ source_type: 'secondary' })] }).confidence, 'low');
  assert.equal(sr.srScorePartner({ ...p, evidence: [ev(), ev({ source_url: 'https://example.org/q', claim: 'Requisitos publicados' })] }).confidence, 'high');
  assert.equal(sr.srScorePartner(p).score, 78);
});
ok('alianza: máximos 30/20/20/15/15 (suma 100)', () => {
  assert.equal(sr.srScorePartner({ scoring: { fit: 99, mutual_benefit: 99, eligibility: 99, access: 99, terms: 99 } }).score, 100);
});

// ---- Eventos ----
ok('evento: sin fecha oficial → verificación 0, confianza baja, no es próximo', () => {
  const r = sr.srScoreEvent({ scoring: { audience: 25, connections: 20, relevance: 15, logistics: 10, verification: 10 }, evidence: [ev()] }, NOW);
  assert.equal(r.state, 'unverified'); assert.equal(r.parts.verification, 0); assert.equal(r.confidence, 'low'); assert.equal(r.date_precision, null);
});
ok('evento: fecha ISO + oficial + zona IANA → vigente, confianza media/alta según fuentes; solo-fecha marca date_only', () => {
  const base = { event_start_at: iso(NOW + 20 * DAY), event_timezone: 'America/Santiago', scoring: { audience: 25, connections: 20, relevance: 15, logistics: 10, verification: 10 } };
  assert.equal(sr.srScoreEvent({ ...base, evidence: [ev()] }, NOW).confidence, 'medium');
  assert.equal(sr.srScoreEvent({ ...base, evidence: [ev(), ev({ source_url: 'https://example.org/agenda', claim: 'Fecha publicada' })] }, NOW).confidence, 'high');
  assert.equal(sr.srScoreEvent({ ...base, event_start_at: '2026-12-01', evidence: [ev()] }, NOW).date_precision, 'date_only');
});
ok('evento pasado → expired', () => {
  assert.equal(sr.srScoreEvent({ event_start_at: '2026-10-30', scoring: {}, evidence: [ev()] }, NOW).state, 'expired');
});

// ---- Ranking y transiciones ----
ok('ranking: excluye pruebas, descartadas y expiradas; ordena por score; null al final; tope 10', () => {
  const items = [{ title: 'B', score: 70, status: 'new' }, { title: 'A', score: 90, status: 'shortlisted' }, { title: 'T', score: 99, status: 'new', is_test: true }, { title: 'D', score: 95, status: 'dismissed' }, { title: 'E', score: 95, status: 'expired' }, { title: 'N', score: null, status: 'new' }];
  assert.deepEqual(sr.srRank(items).map((x) => x.title), ['A', 'B', 'N']);
  assert.equal(sr.srRank(Array.from({ length: 15 }, (_, i) => ({ title: 'x' + i, score: i, status: 'new' }))).length, 10);
});
ok('transiciones exactas; dismissed/expired terminales', () => {
  assert.equal(sr.srTransition('new', 'shortlist'), 'shortlisted'); assert.equal(sr.srTransition('new', 'work'), 'working'); assert.equal(sr.srTransition('new', 'dismiss'), 'dismissed');
  assert.equal(sr.srTransition('shortlisted', 'work'), 'working'); assert.equal(sr.srTransition('shortlisted', 'dismiss'), 'dismissed');
  assert.equal(sr.srTransition('working', 'dismiss'), 'dismissed');
  for (const [f, d] of [['working', 'shortlist'], ['working', 'work'], ['dismissed', 'work'], ['dismissed', 'shortlist'], ['expired', 'work'], ['shortlisted', 'shortlist'], ['new', 'borrar']]) assert.equal(sr.srTransition(f, d), null, f + '/' + d);
});

// ---- Producción ----
const chk = (minAgo, result, extra) => ({ checked_at: iso(NOW - minAgo * MIN), result, ...extra });
ok('producción: una caída aislada = degraded por confirmar (sin alerta)', () => {
  const h = sr.srProductionHealth([chk(5, 'down'), chk(20, 'healthy')], NOW);
  assert.equal(h.state, 'degraded'); assert.equal(h.confirmed_down, false);
});
ok('producción: dos caídas seguidas ≤45 min → down confirmado; separadas >45 min no', () => {
  assert.equal(sr.srProductionHealth([chk(2, 'down'), chk(17, 'down')], NOW).confirmed_down, true);
  assert.equal(sr.srProductionHealth([chk(2, 'down'), chk(50, 'down')], NOW).confirmed_down, false);
  assert.equal(sr.srProductionHealth([chk(2, 'down'), chk(17, 'degraded'), chk(30, 'down')], NOW).confirmed_down, false);
});
ok('producción: con alerta abierta, un solo healthy no la resuelve; dos sí', () => {
  const one = sr.srProductionHealth([chk(1, 'healthy'), chk(16, 'down')], NOW, true);
  assert.equal(one.state, 'down'); assert.equal(one.resolve_alert, false);
  const two = sr.srProductionHealth([chk(1, 'healthy'), chk(16, 'healthy'), chk(31, 'down')], NOW, true);
  assert.equal(two.state, 'healthy'); assert.equal(two.resolve_alert, true);
});
ok('producción: sin chequeos o vencidos >60 min → unknown (jamás down); pruebas ignoradas', () => {
  assert.equal(sr.srProductionHealth([], NOW).state, 'unknown');
  const stale = sr.srProductionHealth([chk(90, 'down'), chk(105, 'down')], NOW);
  assert.equal(stale.state, 'unknown'); assert.equal(stale.reason, 'sin_datos_recientes'); assert.ok(stale.last_checked_at);
  assert.equal(sr.srProductionHealth([chk(1, 'down', { is_test: true }), chk(5, 'down', { is_test: true })], NOW).state, 'unknown');
});

// ---- Daily / Hoy ----
const target = (o) => ({ id: 't1', logical_name: 'Servicio A', status: 'confirmed', monitor_enabled: true, is_test: false, checks: [chk(2, 'down'), chk(17, 'down')], ...o });
const opp = (o) => ({ id: 'o1', kind: 'event', title: 'Evento X', status: 'new', score: 82, confidence: 'medium', deadline_at: iso(NOW + 5 * DAY), last_daily_at: null, next_action: 'Revisar bases', is_test: false, ...o });
ok('Daily: sin hallazgos → vacío; pruebas y candidatos no cuentan', () => {
  assert.deepEqual(sr.srAttention({ targets: [], opportunities: [] }, NOW), []);
  assert.deepEqual(sr.srAttention(null, NOW), []);
  assert.deepEqual(sr.srAttention({ targets: [target({ is_test: true }), target({ id: 't2', status: 'candidate' }), target({ id: 't3', monitor_enabled: false })] }, NOW), []);
});
ok('Daily: caída > plazo ≤7 > plazo 8–14 > producto; máximo 3 aunque haya 5', () => {
  const p = product({ id: 'p1', kind: 'product', status: 'new', score: 88, license_verified: true, license_id: 'MIT', coverage_pct: 100, score_parts: {}, critical_blockers: [], next_action: 'Probar', title: 'Repo X' });
  const out = sr.srAttention({ targets: [target()], opportunities: [opp({ id: 'o10', deadline_at: iso(NOW + 12 * DAY) }), opp({ id: 'o11', kind: 'partner', deadline_at: iso(NOW + 3 * DAY) }), opp({ id: 'o12', deadline_at: iso(NOW + 6 * DAY) }), p] }, NOW);
  assert.equal(out.length, 3);
  assert.deepEqual(out.map((x) => x.class + ':' + x.id), ['production:t1', 'partner:o11', 'event:o12']);
  assert.ok(out.every((x) => x.what && x.why && x.action && x.tab.startsWith('radar_')));
});
ok('Daily: sin plazo confirmado, baja confianza, score <75, ya informado o terminal → no es señal', () => {
  for (const o of [opp({ deadline_at: null }), opp({ confidence: 'low' }), opp({ score: 74 }), opp({ last_daily_at: iso(NOW - DAY) }), opp({ status: 'dismissed' }), opp({ deadline_at: iso(NOW + 15 * DAY) }), opp({ deadline_at: iso(NOW - DAY) })])
    assert.deepEqual(sr.srAttention({ opportunities: [o] }, NOW), []);
  assert.equal(sr.srAttention({ opportunities: [opp({ deadline_at: iso(NOW + 14 * DAY - MIN) })] }, NOW).length, 1);
});
ok('Daily: producto exige score ≥80, licencia, cobertura auditada ≥90 sin provisional ni bloqueos; máximo uno', () => {
  const good = { kind: 'product', status: 'new', score: 85, license_verified: true, license_id: 'MIT', coverage_pct: 95, score_parts: {}, critical_blockers: [], last_daily_at: null, next_action: 'x', is_test: false };
  assert.equal(sr.srAttention({ opportunities: [{ ...good, id: 'a', title: 'A' }, { ...good, id: 'b', title: 'B', score: 90 }] }, NOW).length, 1);
  assert.equal(sr.srAttention({ opportunities: [{ ...good, id: 'a', title: 'A' }, { ...good, id: 'b', title: 'B', score: 90 }] }, NOW)[0].id, 'b');
  for (const bad of [{ score: 79 }, { license_verified: false }, { coverage_pct: 89 }, { coverage_pct: null }, { score_parts: { coverage_provisional: true } }, { critical_blockers: ['x'] }, { status: 'shortlisted' }, { last_daily_at: iso(NOW) }])
    assert.deepEqual(sr.srAttention({ opportunities: [{ ...good, id: 'a', title: 'A', ...bad }] }, NOW), [], JSON.stringify(bad));
});
ok('Daily: daily_max_items se respeta (0 = nada; nunca más de 3)', () => {
  const o = { targets: [target()], opportunities: [opp({ id: 'o1' })], daily_max_items: 0 };
  assert.deepEqual(sr.srAttention(o, NOW), []);
  assert.equal(sr.srAttention({ ...o, daily_max_items: 1 }, NOW).length, 1);
  assert.equal(sr.srAttention({ ...o, daily_max_items: 99 }, NOW).length, 2);
});

// ---- Compuerta ----
ok('gate: pausa global, bandera apagada, sin fuente, cuota y corrida reciente → skip; si no → run con tope', () => {
  const cfg = { products_enabled: true, production_enabled: true, ai_max_items_per_run: 12 };
  const g = (o) => sr.srGate({ kind: 'products', now: NOW, global_pause: false, config: cfg, runs: [], ...o });
  assert.deepEqual(g({}), { mode: 'run', reason: 'ok', max_items: 12 });
  assert.equal(g({ global_pause: true }).reason, 'global_pause');
  assert.equal(g({ config: { ...cfg, products_enabled: false } }).reason, 'flag_off');
  assert.equal(g({ config: null }).reason, 'flag_off');
  assert.equal(g({ has_source: false }).reason, 'no_source');
  assert.equal(g({ kind: 'nada' }).reason, 'kind_invalid');
  assert.equal(g({ runs: [{ kind: 'products', status: 'ok', finished_at: iso(NOW - 3600000) }] }).reason, 'recent_run');
  assert.equal(g({ runs: [{ kind: 'products', status: 'ok', finished_at: iso(NOW - 7 * 3600000) }] }).mode, 'run');
  assert.equal(g({ runs: Array(3).fill({ kind: 'products', status: 'failed', finished_at: iso(NOW - 3600000) }) }).reason, 'quota');
  assert.equal(g({ runs: [{ kind: 'products', status: 'ok', finished_at: iso(NOW - 60000), is_test: true }] }).mode, 'run');
  assert.equal(g({ config: { ...cfg, ai_max_items_per_run: 20 } }).max_items, 12);
  assert.equal(sr.srGate({ kind: 'production', now: NOW, config: cfg, runs: [] }).max_items, 0);
});

// ---- Vista ----
const T = (o) => ({ id: 'x', logical_name: 'Zeta', repo_full_name: 'a/b', status: 'candidate', monitor_enabled: false, is_test: false, ...o });
ok('vista producción: confirmados primero; candidatos «unverified» sin salud verde; conteos', () => {
  const v = sr.srView({ tab: 'production', now: NOW, config: { production_enabled: false }, targets: [T({ id: '1', logical_name: 'Beta' }), T({ id: '2', logical_name: 'Alfa', status: 'confirmed', monitor_enabled: true }), T({ id: '3', logical_name: 'Prueba', is_test: true }), T({ id: '4', logical_name: 'Vieja', status: 'retired' })], checks: [{ target_id: '2', checked_at: iso(NOW - 2 * MIN), result: 'healthy' }], opportunities: [], runs: [] });
  assert.deepEqual(v.items.map((x) => x.logical_name), ['Alfa', 'Beta']);
  assert.equal(v.items[0].http_state, 'healthy'); assert.equal(v.items[1].http_state, 'unverified'); assert.equal(v.items[1].section, 'pending');
  assert.equal(v.enabled, false); assert.equal(v.summary.total, 2); assert.equal(v.summary.pending, 1);
});
ok('vista producción: seed completo (5 candidatos) → ninguno operativo y 5 pendientes', () => {
  const seed = ['Atacama Labs / OS', 'Librería Crecer', 'Pedidos Empresas', 'Registro Almuerzos', 'Casino Escolar'].map((nm, i) => T({ id: 's' + i, logical_name: nm }));
  const v = sr.srView({ tab: 'production', now: NOW, config: {}, targets: seed });
  assert.equal(v.summary.pending, 5); assert.ok(v.items.every((x) => x.http_state === 'unverified' && x.section === 'pending'));
});
ok('vista oportunidades: filtra tipo y pruebas, ordena, marca dato antiguo; no_configurado/unavailable no inventan datos', () => {
  const o = [{ id: '1', kind: 'event', title: 'Viejo', score: 80, status: 'new', last_checked_at: iso(NOW - 10 * DAY) }, { id: '2', kind: 'event', title: 'Nuevo', score: 90, status: 'new', last_checked_at: iso(NOW - DAY) }, { id: '3', kind: 'product', title: 'P', score: 99, status: 'new' }, { id: '4', kind: 'event', title: 'T', score: 99, status: 'new', is_test: true }, { id: '5', kind: 'event', title: 'Sin chequeo', score: 10, status: 'dismissed' }];
  const v = sr.srView({ tab: 'events', now: NOW, config: { events_enabled: true }, opportunities: o, runs: [{ kind: 'events', finished_at: iso(NOW - DAY), status: 'ok' }, { kind: 'products', finished_at: iso(NOW), status: 'ok' }] });
  assert.deepEqual(v.items.map((x) => x.title), ['Nuevo', 'Viejo']);
  assert.equal(v.items[1].stale_days, 10); assert.equal(v.items[0].stale_days, null);
  assert.equal(v.summary.total, 4 - 1 + 0); assert.equal(v.summary.pending, 2); assert.equal(v.summary.last_run_at, iso(NOW - DAY)); assert.equal(v.enabled, true);
  const down = sr.srView({ tab: 'events', now: NOW, source_state: 'unavailable', config: { events_enabled: true }, opportunities: o });
  assert.deepEqual(down.items, []); assert.equal(down.source_state, 'unavailable');
  assert.equal(sr.srView({ tab: 'products', now: NOW }).source_state, 'not_configured');
  assert.equal(sr.srView({ tab: 'raro', now: NOW, config: {} }).tab, 'production');
});

// ---- Revisión estática de la migración (RLS, sin políticas, sin SECURITY DEFINER, aditiva) ----
ok('migración: 6 tablas strategic_*, RLS + revoke, sin políticas/definer/drop/alter ajeno, semilla de 5 candidatos apagados', () => {
  const sql = readFileSync(new URL('../../supabase/migrations/20261024_strategic_radar.sql', import.meta.url), 'utf8');
  const code = sql.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n').toLowerCase();
  const tables = [...code.matchAll(/create table if not exists public\.(\w+)/g)].map((m) => m[1]);
  assert.deepEqual(tables.sort(), ['strategic_evidence', 'strategic_opportunities', 'strategic_prod_checks', 'strategic_prod_targets', 'strategic_radar_config', 'strategic_runs']);
  for (const t of tables) assert.ok(code.includes("'" + t + "'"), 'RLS/revoke cubre ' + t);
  assert.ok(code.includes('enable row level security') && code.includes('revoke all on public.%i from anon, authenticated'));
  for (const bad of ['create policy', 'security definer', 'drop table', 'drop column', 'delete from', 'on delete cascade', 'create trigger', 'create function', 'create view', 'grant ']) assert.ok(!code.includes(bad), bad);
  assert.ok(!/alter table public\.(?!strategic_|%i)/.test(code), 'no altera tablas ajenas');
  assert.ok(code.includes('on conflict (logical_name, is_test) do nothing'));
  assert.equal([...sql.matchAll(/^\s+\('(Atacama Labs \/ OS|Librería Crecer|Pedidos Empresas|Registro Almuerzos|Casino Escolar)'/gm)].length, 5);
  assert.ok(!/(https?:\/\/)/.test(sql.split('-- 7)')[1].split('-- 8)')[0]), 'la semilla no trae URLs');
  const cfg = sql.split('create table if not exists public.strategic_radar_config')[1].split('\n);')[0];
  assert.equal([...cfg.matchAll(/boolean not null default (\w+)/g)].every((m) => m[1] === 'false'), true);
  assert.ok(code.includes('insert into public.strategic_radar_config (id, daily_max_items) values (1, 0)'), 'la fila inicial parte con el Daily estratégico apagado');
});

// n8n incrusta cada función exportada con .toString(): el núcleo debe ser autocontenido (sin constantes de módulo ni helpers sin exportar).
ok('autocontenido: todas las funciones funcionan incrustadas con .toString() en un contexto vacío', () => {
  const src = Object.values(sr).filter((f) => typeof f === 'function').map((f) => f.toString()).join('\n\n');
  assert.equal(Object.values(sr).filter((f) => typeof f !== 'function').length, 0, 'solo funciones exportadas');
  const ctx = vm.createContext({ URL, TextEncoder, Intl, Date, Math, Number, String, Array, Object, JSON, Set, Map, RegExp, encodeURIComponent, decodeURIComponent });
  const emb = vm.runInContext('(function(){' + src + '\nreturn { srView, srAttention, srGate, srFingerprint, srCanonicalUrl, srScoreProduct, srScorePartner, srScoreEvent, srValidateEvidence, srRank, srTransition, srProductionHealth, srCoverage, srDaysLeft, srEventState, srParseDate };})()', ctx);
  assert.equal(emb.srFingerprint('product', emb.srCanonicalUrl('https://GitHub.com/Acme/Repo/?utm_source=a#x')), sr.srFingerprint('product', 'https://github.com/Acme/Repo'));
  assert.equal(emb.srTransition('new', 'shortlist'), 'shortlisted');
  assert.equal(emb.srTransition('dismissed', 'work'), null);
  assert.equal(emb.srTransition('constructor', 'x'), null);
  assert.equal(emb.srGate({ kind: 'products', now: NOW, config: {}, runs: [] }).reason, 'flag_off');
  assert.equal(emb.srView({ tab: 'production', now: NOW, config: {}, targets: [], checks: [] }).tab, 'production');
  assert.equal(emb.srAttention({ targets: [], opportunities: [] }, NOW).length, 0);
  assert.equal(emb.srDaysLeft('2026-11-05', NOW), 3);
});
ok('srView: last_check solo en confirmados monitoreados; candidatos nunca llevan resultado HTTP', () => {
  const T = { id: 'a', logical_name: 'A', status: 'confirmed', monitor_enabled: true, verified_at: iso(NOW - DAY), health_url: 'https://example.org/h', is_test: false };
  const C = { id: 'b', logical_name: 'B', status: 'candidate', monitor_enabled: false, is_test: false };
  const checks = [{ target_id: 'a', checked_at: iso(NOW - 5 * MIN), result: 'healthy', http_status: 200, latency_ms: 120, is_test: false }, { target_id: 'a', checked_at: iso(NOW - 20 * MIN), result: 'down', http_status: 503, is_test: false }, { target_id: 'b', checked_at: iso(NOW - MIN), result: 'healthy', http_status: 200, is_test: false }];
  const v = sr.srView({ tab: 'production', now: NOW, config: {}, targets: [T, C], checks });
  const a = v.items.find((x) => x.id === 'a'), b = v.items.find((x) => x.id === 'b');
  assert.deepEqual(a.last_check, { checked_at: iso(NOW - 5 * MIN), result: 'healthy', http_status: 200, latency_ms: 120, error_code: null });
  assert.equal(b.last_check, null); assert.equal(b.http_state, 'unverified');
});
ok('srTransition no se deja engañar por claves heredadas del prototipo', () => {
  assert.equal(sr.srTransition('__proto__', 'dismiss'), null);
  assert.equal(sr.srTransition('new', 'constructor'), null);
});

console.log(`${n} ok`);
