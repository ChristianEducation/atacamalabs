import assert from 'node:assert/strict';
import * as oc from './ops-core.mjs';

let n = 0;
const ok = (name, fn) => { try { fn(); n++; } catch (e) { console.error('FAIL', name, '\n', e.stack.split('\n').slice(0, 4).join('\n')); process.exitCode = 1; } };

const NOW = Date.parse('2026-10-08T11:30:00Z');            // jueves 08:30 Chile
const iso = (msAgo) => new Date(NOW - msAgo).toISOString();
const H = 3600000, D = 86400000;
const STAGES = { nuevo: 'S-nuevo', investigado: 'S-inv', contactado: 'S-con', respondio: 'S-resp', diagnostico: 'S-diag', propuesta: 'S-prop', seguimiento: 'S-seg' };
const CFG = { tz: 'America/Santiago', stages: STAGES };
const opp = (name, stage, daysAgo, o) => ({ id: 'o-' + name, name: name + ' — Prospecto', pipelineStageId: STAGES[stage], contactId: 'c-' + name, lastStageChangeAt: iso(daysAgo * D), createdAt: iso(daysAgo * D), ...(o || {}) });
const msg = (o) => ({ id: 'm' + Math.random().toString(36).slice(2, 7), candidate_id: 'k1', company_name: 'Alfa', kind: 'other', direction: 'inbound', status: 'received', created_at: iso(2 * H), metadata: {}, ...(o || {}) });
const WF_ACTIVE = oc.monitoredWorkflows().map((w) => ({ id: w.id, name: w.label, active: true }));
const execs = (status, mins) => Array.from({ length: 3 }, (_, i) => ({ status, startedAt: iso((mins + i * 5) * 60000) }));
const HEALTHY_EXECS = () => { const e = {}; oc.monitoredWorkflows().forEach((w) => { e[w.id] = execs('success', w.every ? Math.min(w.every, 5) : 120); }); return e; };
const HERMES_OK = () => ({ gateway_ok: true, disk_pct: 40, jobs: [{ id: 'j1', name: 'Atacama Labs — Prospect Radar', state: 'paused', enabled: false }, { id: 'j2', name: 'Atacama Labs — Content Radar', state: 'paused', enabled: false }, { id: 'j4', name: 'Atacama Labs — Content RSS', state: 'scheduled', enabled: true, last_status: 'ok', last_run_at: iso(5 * H), next_run_at: new Date(NOW + 1 * H).toISOString(), failure_streak: 0 }, { id: 'j5', name: 'Atacama Labs — Content Pieces', state: 'scheduled', enabled: true, last_status: 'ok', last_run_at: iso(5 * H), next_run_at: new Date(NOW + 1 * H).toISOString(), failure_streak: 0 }, { id: 'j6', name: 'Atacama Labs — Competitor Intelligence', state: 'scheduled', enabled: true, last_status: 'ok', last_run_at: iso(2 * D), next_run_at: new Date(NOW + 1 * H).toISOString(), failure_streak: 0 }, { id: 'j3', name: 'atacama-daily', state: 'scheduled', enabled: true, last_status: 'ok', last_run_at: iso(23 * H), next_run_at: new Date(NOW + 1 * H).toISOString(), failure_streak: 0 }] });
const base = (o) => ({ now: NOW, cfg: CFG, opps: [], tasks: [], messages: [], candidates: [], pieces: [], metrics: [], signals_candidate: 0, alerts: [], runs: [], outreach: { mode: 'off' }, workflows: WF_ACTIVE, execs: HEALTHY_EXECS(), hermes: HERMES_OK(), errors24h: [], gmail: null, ...(o || {}) });

ok('fechas Chile: día, diferencia de días y formato', () => {
  assert.equal(oc.dayKey(NOW, 'America/Santiago'), '2026-10-08');
  assert.equal(oc.dayKey(Date.parse('2026-10-08T02:00:00Z'), 'America/Santiago'), '2026-10-07');
  assert.equal(oc.daysSince(NOW - 3 * D, NOW, 'America/Santiago'), 3);
  assert.equal(oc.fmtDate(NOW, 'America/Santiago'), 'jue 8 oct');
  assert.equal(oc.plural(1, 'tarea', 'tareas'), '1 tarea'); assert.equal(oc.names(['a', 'b', 'c', 'd', 'e']), 'a, b, c y 2 más'); assert.equal(oc.ageText(30 * 60000), '30 min'); assert.equal(oc.ageText(5 * H), '5 h'); assert.equal(oc.ageText(3 * D), '3 días');
});
ok('execHealth: ok, error aislado, racha, desactivado y programados atrasados', () => {
  const w = { critical: true, every: 10 }, wh = { critical: true, every: null };
  assert.equal(oc.execHealth(w, execs('success', 4), true, NOW).status, 'ok');
  assert.equal(oc.execHealth(w, [{ status: 'error', startedAt: iso(3 * 60000) }, ...execs('success', 8)], true, NOW).status, 'atencion');
  assert.equal(oc.execHealth(w, execs('error', 3), true, NOW).status, 'fallo');
  assert.equal(oc.execHealth(wh, [{ status: 'success', startedAt: iso(60000) }, { status: 'error', startedAt: iso(2 * 60000) }], true, NOW).status, 'ok');
  assert.equal(oc.execHealth(w, execs('success', 4), false, NOW).status, 'fallo');
  assert.equal(oc.execHealth({ critical: false, every: 10 }, execs('success', 4), false, NOW).status, 'atencion');
  assert.equal(oc.execHealth(w, execs('success', 45), true, NOW).status, 'atencion');
  assert.equal(oc.execHealth(w, execs('success', 90), true, NOW).status, 'fallo');
  assert.equal(oc.execHealth(w, [], true, NOW).status, 'atencion'); assert.equal(oc.execHealth(wh, [], true, NOW).status, 'ok');
});
ok('jobs de Hermes: pausado esperado, fallos seguidos, corrida perdida', () => {
  const j = oc.hermesJobChecks({ jobs: [{ id: '1', name: 'Atacama Labs — Prospect Radar', state: 'paused' }, { id: '2', name: 'atacama-alerts', state: 'scheduled', enabled: true, failure_streak: 2, last_status: 'error' }, { id: '3', name: 'atacama-daily', state: 'scheduled', enabled: true, last_status: 'ok', next_run_at: iso(5 * H) }, { id: '4', name: 'otro job', state: 'scheduled' }] }, NOW);
  assert.equal(j.length, 3); assert.equal(j[0].status, 'ok'); assert.ok(j[0].paused); assert.equal(j[1].status, 'fallo'); assert.equal(j[2].status, 'atencion');
});

// ---------- A. Daily con datos actuales
const rich = () => base({
  opps: [opp('Ramis', 'respondio', 1), opp('Vet24', 'respondio', 0), opp('Rentalin', 'diagnostico', 6), opp('Maipú', 'investigado', 2), opp('Kennedy', 'propuesta', 2), opp('Smile', 'contactado', 12)],
  tasks: [{ id: 't1', title: 'Revisar respuesta y definir próximo paso', dueDate: iso(30 * H), contactId: 'c-Ramis' }, { id: 't2', title: 'Revisar prospecto: A', dueDate: iso(2 * D), contactId: 'x' }, { id: 't3', title: 'Revisar prospecto: B', dueDate: iso(2 * D), contactId: 'y' }, { id: 't4', title: '(Example) tarea', dueDate: iso(9 * D) }, { id: 't5', title: 'Futura', dueDate: new Date(NOW + 3 * D).toISOString(), contactId: 'c-Vet24' }],
  messages: [
    msg({ id: 'in1', company_name: 'Ramis', direction: 'inbound', classification: 'reply', body: 'Me interesa, ¿hablamos?', created_at: iso(5 * H) }),
    msg({ id: 'i1', candidate_id: 'k2', company_name: 'Dentaline', kind: 'initial', direction: 'outbound', status: 'sent', sent_at: iso(10 * D), metadata: { followup_state: 'active', followup_tasks: { f1: { id: 'a', due: iso(5 * D) }, f2: { id: 'b', due: new Date(NOW + 2 * D).toISOString() } } } }),
    msg({ id: 'i2', candidate_id: 'k3', company_name: 'CIPO', kind: 'initial', direction: 'outbound', status: 'sent', sent_at: iso(6 * D), metadata: { followup_state: 'active', followup_tasks: { f1: { id: 'c', due: iso(0.1 * D) }, f2: { id: 'd', due: new Date(NOW + 4 * D).toISOString() } } } }),
    msg({ id: 'f1', candidate_id: 'k3', company_name: 'CIPO', kind: 'followup_1', direction: 'outbound', status: 'draft' }),
    msg({ id: 'ok1', candidate_id: 'k4', company_name: 'Cerrado', kind: 'initial', direction: 'outbound', status: 'sent', metadata: { followup_state: 'stopped:respondio', followup_tasks: { f1: { due: iso(5 * D) } } } }),
  ],
  candidates: [
    { company_name: 'Radar1', status: 'in_ghl', ghl_stage: 'investigado', band: 'alta', priority_score: 85, source_name: 'Prospect Radar v2', created_at: iso(3 * H) },
    { company_name: 'Radar2', status: 'in_ghl', ghl_stage: 'investigado', band: 'valida', priority_score: 70, source_name: 'Prospect Radar v2', created_at: iso(3 * H) },
    { company_name: 'Lote1', status: 'in_ghl', ghl_stage: 'investigado', band: 'alta', priority_score: 84, source_name: 'Primer lote', created_at: iso(5 * D) },
  ],
  pieces: [
    { id: 'p1', topic: 'Agentes que piden permiso', channel: 'linkedin_page', status: 'in_review', ghl_status: 'in_review', ghl_approval_status: 'pending' },
    { id: 'p2', topic: 'Alta automática de clientes', channel: 'linkedin_profile', status: 'scheduled', scheduled_at: new Date(NOW + 5 * H).toISOString(), is_test: false },
    { id: 'p3', topic: 'Publicada ayer', channel: 'instagram', status: 'published', published_at: iso(30 * H) },
    { id: 'pt', topic: 'TEST', channel: 'instagram', status: 'failed', is_test: true },
  ],
  metrics: [{ content_piece_id: 'p3', metric_window: '24h', status: 'ok', captured_at: iso(2 * H), likes: 12, comments: 3, shares: 1 }],
  signals_candidate: 2, errors24h: [{ name: 'Prospect Ingest', count: 2 }],
});
ok('A. Daily con datos reales: secciones por prioridad, nombres y conteos correctos', () => {
  const r = oc.composeDaily(rich());
  const t = r.text;
  assert.match(t, /^ATACAMA DAILY · jue 8 oct/); assert.ok(t.indexOf('NECESITA TU ACCIÓN') < t.indexOf('PARA REVISAR') && t.indexOf('PARA REVISAR') < t.indexOf('TODO BIEN'));
  assert.match(t, /2 respuestas por atender: Ramis, Vet24/); assert.match(t, /1 llegó en las últimas 36 h/);
  assert.match(t, /1 seguimiento vencido: Dentaline \(sin borrador\)/); assert.match(t, /1 seguimiento para hoy: CIPO \(borrador listo\)/);
  assert.match(t, /1 oportunidad estancada: Rentalin \(diagnostico, 6 d\)/); assert.match(t, /Ramis|Vet24/);
  assert.match(t, /1 publicación pendiente de aprobación: «Agentes que piden permiso»/);
  assert.match(t, /2 candidatos nuevos \(1 prioridad alta\) · del Radar: Radar1, Radar2/); assert.match(t, /3 prospectos en Investigado sin decisión \(el más antiguo: 5 d\)/);
  assert.match(t, /Programadas: «Alta automática de clientes»/); assert.match(t, /Métricas 24h listas: «Publicada ayer».*12 likes, 3 comentarios, 1 compartidos/);
  assert.match(t, /2 señales candidatas de contenido sin pieza/); assert.match(t, /Ejecuciones fallidas en 24 h: Prospect Ingest \(2\)/);
  assert.match(t, /2 tareas vencidas: 2 «Revisar prospecto»|tareas vencidas/); assert.ok(!t.includes('(Example)')); assert.ok(!/TEST/.test(t));
  assert.ok(t.length < 2600, 'largo ' + t.length); assert.ok(r.action_count >= 5);
});
ok('A. Daily: oportunidad sin próximo paso y tareas importantes', () => {
  const d = rich();
  d.tasks = d.tasks.filter((t) => t.contactId !== 'c-Ramis');
  const r = oc.composeDaily(d);
  assert.match(r.text, /oportunidad(es)? sin próximo paso: .*Ramis/);
});
ok('B. Daily sin novedades: corto, sin secciones vacías ni relleno', () => {
  const r = oc.composeDaily(base());
  assert.match(r.text, /Sin novedades: nada que requiera tu acción hoy/); assert.ok(!r.text.includes('NECESITA TU ACCIÓN') && !r.text.includes('PARA REVISAR')); assert.match(r.text, /TODO BIEN[\s\S]*Sistema operativo/); assert.equal(r.action_count, 0);
  assert.ok(r.text.length < 500);
});
ok('C. respuesta nueva controlada → aparece como acción y dispara alerta de evento', () => {
  const d = base({ messages: [msg({ id: 'inX', company_name: 'Clínica TEST', direction: 'inbound', classification: 'reply', body: 'Hola, me interesa', created_at: iso(10 * 60000) })] });
  assert.match(oc.composeDaily(d).text, /1 respuesta nueva: Clínica TEST/);
  const a = oc.evaluateAlerts(d, []);
  assert.equal(a.notify.length, 1); assert.equal(a.notify[0].key, 'reply:inX'); assert.equal(a.notify[0].severity, 'high'); assert.ok(a.notify[0].event);
  assert.match(oc.alertsText(a.notify), /IMPORTANTE · Respondió: Clínica TEST — Hola, me interesa/);
});
ok('D. seguimiento vencido y de hoy se distinguen; los detenidos/enviados no cuentan', () => {
  const c = oc.summarizeCommercial(rich());
  assert.equal(c.followups.overdue.length, 1); assert.equal(c.followups.today.length, 1); assert.equal(c.followups.drafts.length, 1);
  assert.ok(!c.followups.overdue.concat(c.followups.today).some((f) => f.company === 'Cerrado'));
  const d = rich(); d.messages.push(msg({ candidate_id: 'k2', company_name: 'Dentaline', kind: 'followup_1', direction: 'outbound', status: 'sent' }));
  assert.equal(oc.summarizeCommercial(d).followups.overdue.length, 0);
});
ok('E. oportunidad estancada por etapa (umbrales) y Investigado no cuenta como estancada', () => {
  const c = oc.summarizeCommercial(base({ opps: [opp('A', 'propuesta', 8), opp('B', 'propuesta', 3), opp('C', 'investigado', 40), opp('D', 'contactado', 10), opp('E', 'nuevo', 2)] }));
  assert.deepEqual(c.stale.map((s) => s.company).sort(), ['A', 'D', 'E']);
});
ok('F. prospectos nuevos del Radar v2 y backlog', () => {
  const c = oc.summarizeCommercial(rich());
  assert.equal(c.prospects.new_24h, 2); assert.equal(c.prospects.radar_new.length, 2); assert.equal(c.prospects.backlog, 3); assert.equal(c.prospects.backlog_alta, 2); assert.deepEqual(c.prospects.backlog_top[0], 'Radar1');
});
ok('G. contenido pendiente / programado / publicado / métricas / error de publicación', () => {
  const ct = oc.summarizeContent(rich());
  assert.equal(ct.pending_review.length, 1); assert.equal(ct.scheduled.length, 1); assert.equal(ct.published_recent.length, 1); assert.equal(ct.snapshots.length, 1); assert.equal(ct.total_pieces, 3);
  const late = oc.summarizeContent(base({ pieces: [{ id: 'z', topic: 'Se atrasó', channel: 'linkedin_page', status: 'scheduled', scheduled_at: iso(3 * H) }] }));
  assert.equal(late.late.length, 1);
  assert.match(oc.composeDaily(base({ pieces: [{ id: 'z', topic: 'Se atrasó', channel: 'linkedin_page', status: 'scheduled', scheduled_at: iso(3 * H) }] })).text, /Publicación con problema: «Se atrasó»/);
});
ok('H. fallo simulado de workflow → fallo en health, acción en el Daily y alerta crítica', () => {
  const ex = HEALTHY_EXECS(); ex['Bx4tC1Qn5H6097BL'] = execs('error', 2);
  const d = base({ execs: ex });
  const h = oc.healthReport(d);
  assert.equal(h.overall, 'fallo'); assert.match(oc.healthText(h), /FALLO · Gmail Sync: 3 errores seguidos/);
  assert.match(oc.composeDaily(d).text, /FALLO · Gmail Sync/);
  const a = oc.evaluateAlerts(d, []);
  assert.equal(a.notify.filter((x) => x.key === 'wf_down:Bx4tC1Qn5H6097BL' && x.severity === 'critical').length, 1);
});
ok('I. health general: OK, atención y fallo con motivo; incluye modo de envío', () => {
  const ok1 = oc.healthReport(base());
  assert.equal(ok1.overall, 'ok'); assert.match(oc.healthText(ok1), /^ESTADO DE ATACAMA OS: OK · todo funcionando/); assert.match(oc.healthText(ok1), /Envío real de correos: apagado \(modo off\)/);
  ['Prospect Gateway', 'Hermes Operator', 'Outreach Engine', 'Gmail Sender', 'Gmail Sync', 'Followup Planner', 'Prospect Radar', 'Content Radar', 'Content Engine', 'Métricas de contenido'].forEach((nm) => assert.ok(ok1.components.some((c) => c.name === nm), nm));
  const wfs = WF_ACTIVE.map((w) => (w.id === 'rWulaiKeio0CsXrs' ? { ...w, active: false } : w));
  const bad = oc.healthReport(base({ workflows: wfs }));
  assert.equal(bad.overall, 'fallo'); assert.match(oc.healthText(bad), /Followup Planner: está desactivado/);
  const gm = oc.healthReport(base({ gmail: { w22: { credential_access: false }, w23: { credential_access: true, account: 'x@y.cl' } } }));
  assert.equal(gm.components.find((c) => c.name === 'Gmail Sender').status, 'fallo'); assert.match(gm.components.find((c) => c.name === 'Gmail Sync').reason, /Gmail conectado \(x@y.cl\)/);
  const jobBad = oc.healthReport(base({ hermes: { ...HERMES_OK(), jobs: [{ id: 'j', name: 'Atacama Labs — Prospect Radar', state: 'scheduled', enabled: true, failure_streak: 3, last_status: 'error' }] } }));
  assert.equal(jobBad.components.find((c) => c.name === 'Prospect Radar').status, 'fallo');
  assert.equal(oc.healthReport(base({ hermes: { ...HERMES_OK(), disk_pct: 91 } })).components.find((c) => /servidor/.test(c.name)).status, 'atencion');
});
ok('J. dedupe de alertas: una vez, no se repite, crítica se repite a las 12 h (máx. 3), se resuelve al limpiarse y reabre', () => {
  const ex = HEALTHY_EXECS(); ex['aRvzG87Qg4uqI5bD'] = execs('error', 1);
  const d = base({ execs: ex });
  let a = oc.evaluateAlerts(d, []);
  assert.equal(a.notify.length, 1); const key = a.notify[0].key;
  const row = (o) => ({ alert_key: key, severity: 'critical', status: 'open', event: false, last_notified_at: iso(10 * 60000), notify_count: 1, ...(o || {}) });
  a = oc.evaluateAlerts(d, [row()]); assert.equal(a.notify.length, 0); assert.equal(a.upserts[0].op, 'touch');
  a = oc.evaluateAlerts(d, [row({ last_notified_at: iso(13 * H) })]); assert.equal(a.notify.length, 1); assert.ok(a.notify[0].repeat); assert.match(oc.alertsText(a.notify), /sigue sin resolverse/);
  a = oc.evaluateAlerts(d, [row({ last_notified_at: iso(13 * H), notify_count: 3 })]); assert.equal(a.notify.length, 0);
  a = oc.evaluateAlerts(base(), [row()]); assert.deepEqual(a.resolve, [key]); assert.equal(a.notify.length, 0);
  a = oc.evaluateAlerts(d, [row({ status: 'resolved' })]); assert.equal(a.notify.length, 1); assert.ok(a.upserts[0].reopen);
  const ev = base({ messages: [msg({ id: 'r1', direction: 'inbound', classification: 'reply', created_at: iso(H) })] });
  assert.equal(oc.evaluateAlerts(ev, []).notify.length, 1);
  assert.equal(oc.evaluateAlerts(ev, [{ alert_key: 'reply:r1', severity: 'high', status: 'open', event: true, last_notified_at: iso(H), notify_count: 1 }]).notify.length, 0);
  assert.equal(oc.evaluateAlerts(ev, [{ alert_key: 'reply:r1', severity: 'high', status: 'resolved', event: true, last_notified_at: iso(H), notify_count: 1 }]).notify.length, 0);   // un evento ya avisado y cerrado NO se repite en cada ciclo
  assert.equal(oc.alertsText([]), '');
});
ok('alertas: solo lo que merece interrumpir (ejecución normal, jobs pausados y autorrespuestas no alertan)', () => {
  const a = oc.evaluateAlerts(base({ messages: [msg({ direction: 'inbound', classification: 'auto_reply', created_at: iso(H) }), msg({ direction: 'inbound', classification: 'unsubscribe', created_at: iso(H) })] }), []);
  assert.equal(a.notify.length, 0);
  const ex = HEALTHY_EXECS(); ex['ZlYTYp9AVdCYPdwS'] = [{ status: 'error', startedAt: iso(10 * 60000) }, { status: 'error', startedAt: iso(30 * 60000) }, { status: 'success', startedAt: iso(50 * 60000) }];
  assert.ok(oc.evaluateAlerts(base({ execs: ex }), []).notify.some((x) => x.key === 'gateway_blocked'));
  assert.ok(oc.evaluateAlerts(base({ gmail: { w22: { credential_access: true }, w23: { credential_access: false } } }), []).notify.some((x) => x.key === 'gmail_auth:w23'));
  assert.ok(oc.evaluateAlerts(base({ pieces: [{ id: 'q', topic: 'No salió', channel: 'instagram', status: 'approved', scheduled_at: iso(2 * H) }] }), []).notify.some((x) => x.key === 'publish_failed:q'));
  assert.ok(oc.evaluateAlerts(base({ hermes: { ...HERMES_OK(), gateway_ok: false } }), []).notify.some((x) => x.key === 'hermes_gateway'));
});
ok('compuerta del Radar: corre, se salta por backlog / tope semanal / corrida reciente', () => {
  const cands = (k) => Array.from({ length: k }, (_, i) => ({ company_name: 'c' + i, status: 'in_ghl', ghl_stage: 'investigado', created_at: iso(2 * D) }));
  const run = (h, mode) => ({ kind: 'prospect_radar', status: 'ok', summary: { mode: mode || 'import' }, created_at: iso(h * H) });
  let g = oc.radarGate(base({ candidates: cands(14), runs: [run(72)] })); assert.equal(g.mode, 'import'); assert.equal(g.max_imports, 5);
  g = oc.radarGate(base({ candidates: cands(23) })); assert.equal(g.mode, 'import'); assert.equal(g.max_imports, 2);
  g = oc.radarGate(base({ candidates: cands(25) })); assert.equal(g.mode, 'skip'); assert.match(g.reason, /Investigado sin decisión/);
  g = oc.radarGate(base({ candidates: cands(2), runs: [run(5)] })); assert.equal(g.mode, 'skip'); assert.match(g.reason, /ya corrió/);
  g = oc.radarGate(base({ candidates: cands(2), runs: [run(30), run(80), run(120)] })); assert.equal(g.mode, 'skip'); assert.match(g.reason, /tope semanal/);
  g = oc.radarGate(base({ candidates: cands(2), runs: [{ kind: 'prospect_radar', status: 'skipped', summary: { mode: 'skip' }, created_at: iso(30 * H) }] })); assert.equal(g.mode, 'import');
});
ok('rendimiento del contenido: sin publicaciones, sin snapshots y con cifras (sin inventar impresiones)', () => {
  assert.match(oc.composePerformance(base({ pieces: [{ id: 'p', topic: 'X', channel: 'linkedin_page', status: 'scheduled', scheduled_at: new Date(NOW + 5 * H).toISOString() }] })).text, /Todavía no hay publicaciones publicadas con métricas\. La próxima: «X»/);
  assert.match(oc.composePerformance(base({ pieces: [{ id: 'p', topic: 'X', channel: 'instagram', status: 'published', published_at: iso(5 * H) }] })).text, /1 pieza publicada pero aún sin snapshots/);
  const r = oc.composePerformance(base({ pieces: [{ id: 'a', topic: 'A', channel: 'instagram', status: 'published', published_at: iso(5 * D) }, { id: 'b', topic: 'B', channel: 'linkedin_page', status: 'published', published_at: iso(5 * D) }], metrics: [{ content_piece_id: 'a', metric_window: '72h', status: 'ok', likes: 5, comments: 1, shares: 0, captured_at: iso(D) }, { content_piece_id: 'b', metric_window: '72h', status: 'ok', likes: 20, comments: 4, shares: 2, captured_at: iso(D) }] }));
  assert.match(r.text, /1\. «B» \(linkedin_page, 72h\): 26/); assert.match(r.text, /no entrega impresiones por publicación/); assert.match(r.text, /Muestra pequeña \(n=2\)/); assert.ok(!/impresiones: \d/.test(r.text));
});
ok('Ola B: rendimiento separa atención de autoridad (conversación y leads) y declara lo que no se puede medir', () => {
  const pieces = [{ id: 'a', topic: 'Viral', channel: 'linkedin_page', status: 'published', published_at: iso(5 * D), editorial_type: 'news_explainer' }, { id: 'b', topic: 'Conversada', channel: 'linkedin_profile', status: 'published', published_at: iso(5 * D), editorial_type: 'build_in_public' }];
  const metrics = [{ content_piece_id: 'a', metric_window: '72h', status: 'ok', likes: 40, comments: 1, shares: 0, captured_at: iso(D) }, { content_piece_id: 'b', metric_window: '72h', status: 'ok', likes: 6, comments: 8, shares: 2, captured_at: iso(D) }];
  const r = oc.composePerformance(base({ pieces, metrics, resources: [], leads: [] }));
  assert.match(r.text, /Atención vs autoridad \(2 medidas\): 1 con conversación\/leads, 1 solo atención/); assert.match(r.text, /No se puede medir hoy: guardados, clics ni visitas/);
  assert.equal(r.authority.attention_only, 1); assert.equal(r.authority.authority, 1);
  assert.ok(!/Atención vs autoridad/.test(oc.composePerformance(base({ pieces: [{ id: 'p', topic: 'X', channel: 'instagram', status: 'published', published_at: iso(5 * H) }] })).text));
});
ok('urgente: solo lo que requiere acción; nada urgente no inventa', () => {
  assert.match(oc.composeUrgent(rich()).text, /^URGENTE \(\d+\):/);
  assert.match(oc.composeUrgent(base()).text, /^Nada urgente ahora \(jue 8 oct\)\. Todo en orden\./);
  assert.ok(oc.composeUrgent(base({ candidates: [{ company_name: 'x', status: 'in_ghl', ghl_stage: 'investigado', created_at: iso(H), source_name: 'Radar' }] })).text.includes('Para revisar'));
});
ok('el núcleo no contiene secretos ni usa constantes de módulo', () => {
  const src = Object.values(oc).filter((f) => typeof f === 'function').map((f) => f.toString()).join('\n');
  assert.ok(!/pit-[0-9a-f-]{20,}|eyJ[A-Za-z0-9_-]{20,}|ya29\./.test(src));
});
ok('ignore_opps: las oportunidades de prueba configuradas no ensucian el Daily', () => {
  const d = base({ opps: [opp('Sushi 72', 'respondio', 30), opp('Prueba Atacama', 'propuesta', 30), opp('Real', 'propuesta', 10)], cfg: { ...CFG, ignore_opps: ['Sushi 72', 'Prueba Atacama'] } });
  const c = oc.summarizeCommercial(d);
  assert.deepEqual(c.stale.map((s) => s.company), ['Real']);
  assert.ok(!/Sushi|Prueba Atacama/.test(oc.composeDaily(d).text));
});
ok('sin estado de Hermes: «no informado», no una falsa falla ni un falso OK', () => {
  const h = oc.healthReport(base({ hermes: undefined }));
  assert.notEqual(h.overall, 'fallo');
  assert.match(h.components.find((c) => c.name === 'Prospect Radar').reason, /no informado/i);
  assert.match(h.components.find((c) => c.name === 'Content Radar').reason, /no informado/i);
});
ok('vistas de consulta de Hermes: hoy, quietas, respuestas, seguimientos, radar y contenido', () => {
  const d = rich();
  assert.match(oc.composeToday(d).text, /Ramis/); assert.match(oc.composeStale(d).text, /Rentalin/);
  assert.match(oc.composeReplies(d).text, /Ramis/); assert.match(oc.composeFollowups(d).text, /Dentaline/);
  assert.match(oc.composeRadarNew(d).text, /Radar1/); assert.match(oc.composeContentStatus(d).text, /Agentes que piden permiso/);
  const v = base();
  [oc.composeToday(v), oc.composeStale(v), oc.composeReplies(v), oc.composeFollowups(v), oc.composeRadarNew(v), oc.composeContentStatus(v)].forEach((r) => assert.ok(r.text && r.text.length < 400 && !/undefined|NaN|\[object/.test(r.text)));
});
ok('aprendizajes: sin datos no inventa; con datos marca lo tentativo', () => {
  assert.match(oc.composeLearnings({ ok: true, n_learnings: 0 }).text, /Todavía no hay aprendizajes/);
  assert.match(oc.composeLearnings(null).text, /No pude leer/);
  const r = oc.composeLearnings({ ok: true, n_learnings: 2, by_channel: [{ key: 'instagram', n: 2, avg_actions: 7, tentative: true }], do_not_repeat_hooks: ['Hook viejo'] });
  assert.match(r.text, /instagram \(n=2, promedio 7 interacciones, tentativo\)/); assert.match(r.text, /Hook viejo/); assert.ok(!/impresion/i.test(r.text));
});
ok('compuerta del Content Radar: corre, o se salta por cadencia / revisión pendiente / señales sin usar', () => {
  const piece = (i) => ({ id: 'pr' + i, topic: 'T' + i, channel: 'instagram', status: 'in_review', ghl_status: 'in_review', ghl_approval_status: 'pending' });
  let g = oc.contentGate(base()); assert.equal(g.mode, 'run'); assert.equal(g.max_signals, 5);
  g = oc.contentGate(base({ runs: [{ kind: 'content_radar', status: 'ok', created_at: iso(2 * D) }] })); assert.equal(g.mode, 'skip'); assert.match(g.reason, /ya corrió/);
  g = oc.contentGate(base({ runs: [{ kind: 'content_radar', status: 'skipped', created_at: iso(1 * D) }] })); assert.equal(g.mode, 'run');
  // Ola A · Governor: con piezas pendientes el radar SIGUE recolectando; solo avisa si se pueden crear piezas (tope configurable, 6 por defecto)
  g = oc.contentGate(base({ pieces: [piece(1), piece(2), piece(3)] })); assert.equal(g.mode, 'run'); assert.equal(g.pieces_allowed, true); assert.equal(g.max_pending_in_review, 6);
  g = oc.contentGate(base({ pieces: [1, 2, 3, 4, 5, 6].map(piece) })); assert.equal(g.mode, 'run'); assert.equal(g.pieces_allowed, false); assert.match(g.reason, /cola llena/);
  g = oc.contentGate(base({ content_cfg: { max_pending_in_review: 2 }, pieces: [piece(1), piece(2)] })); assert.equal(g.pieces_allowed, false);
  g = oc.contentGate(base({ signals_candidate: 12 })); assert.equal(g.mode, 'skip'); assert.match(g.reason, /señales candidatas/);
});
ok('alerta guardada pero nunca confirmada (Telegram falló) se reintenta; un evento ya avisado no', () => {
  const ev = base({ messages: [msg({ id: 'r9', direction: 'inbound', classification: 'reply', created_at: iso(H) })] });
  const a = oc.evaluateAlerts(ev, [{ alert_key: 'reply:r9', severity: 'high', status: 'open', event: true, last_notified_at: null, notify_count: 0 }]);
  assert.equal(a.notify.length, 1);
  assert.equal(oc.evaluateAlerts(ev, [{ alert_key: 'reply:r9', severity: 'high', status: 'open', event: true, last_notified_at: iso(H), notify_count: 1 }]).notify.length, 0);
});
ok('panel: atención, prospección, contenido y sistema en una estructura estable', () => {
  const d = rich(); d.signals_list = [{ title: 'n8n 2.43 reduce costo con prompt caching en agentes de producción', signal_type: 'news', created_at: iso(H), angle: 'a' }];
  d.candidates[0] = { ...d.candidates[0], industry: 'Salud', location: 'Antofagasta', domain: 'radar1.cl', angle: 'Automatizar agenda', quote: 'Agenda por WhatsApp' };
  d.runs = [{ id: 'r1', kind: 'prospect_radar', status: 'ok', summary: { mode: 'import', imported: 2, minutes: 3 }, created_at: iso(2 * H) }];
  const p = oc.composePanel(d);
  assert.equal(p.date_label, 'jue 8 oct'); assert.ok(p.attention_total >= 4);
  assert.ok(p.attention.some((a) => a.key === 'replies' && a.count === 2)); assert.ok(p.attention.some((a) => a.key === 'content_pending'));
  assert.equal(p.prospecting.backlog, 3); assert.equal(p.prospecting.backlog_alta, 2); assert.equal(p.prospecting.contacted, 0);
  assert.equal(p.prospecting.last_run.imported, 2); assert.equal(p.prospecting.latest[0].industry, 'Salud');
  assert.equal(p.content.signals_count, 2); assert.equal(p.content.signals.length, 1); assert.equal(p.content.in_review.length, 1); assert.equal(p.content.scheduled.length, 1); assert.equal(p.content.published[0].metrics.length, 1);
  assert.equal(p.system.overall, 'ok'); assert.equal(p.system.outreach_mode, 'off');
  assert.ok(!/[0-9a-f]{8}-[0-9a-f]{4}/.test(JSON.stringify(p.attention)), 'sin ids en atención');
});
ok('panel: lo nuevo desde la última corrida se marca', () => {
  const mk = (n, ms) => ({ company_name: n, status: 'in_ghl', ghl_stage: 'investigado', band: 'alta', priority_score: 90, source_name: 'Prospect Radar v2', created_at: iso(ms) });
  const d = base({ candidates: [mk('Nuevo1', 110 * 60000), mk('Nuevo2', 109 * 60000), mk('Viejo', 30 * H)], runs: [{ id: 'r1', kind: 'prospect_radar', status: 'ok', summary: { mode: 'import', imported: 2, minutes: 3 }, created_at: iso(100 * 60000) }] });
  const p = oc.composePanel(d);
  assert.equal(p.prospecting.new_since_run, 2); assert.equal(p.prospecting.latest.filter((x) => x.is_new).length, 2); assert.equal(p.prospecting.backlog, 3);
});
ok('panel sin datos: estructura vacía válida, sin undefined', () => {
  const p = oc.composePanel(base());
  assert.equal(p.attention_total, 0); assert.equal(p.prospecting.last_run, null); assert.equal(p.prospecting.latest.length, 0); assert.ok(!/undefined|NaN/.test(JSON.stringify(p)));
});
ok('nombres cortos y recortes para Telegram', () => {
  assert.equal(oc.shortName('Laboratorio Clínico Luis Pasteur Antofagasta'), 'Luis Pasteur'); assert.equal(oc.shortName('EDL Servicios y Maquinarias'), 'EDL'); assert.equal(oc.shortName('Maxservicios'), 'Maxservicios');
  assert.equal(oc.clip('uno dos tres cuatro cinco', 14), 'uno dos tres…'); assert.equal(oc.clip('corto', 14), 'corto');
});
ok('Daily corto de Telegram: sin ids, rutas ni ejecuciones; con resumen y sin relleno', () => {
  const b = oc.composeBrief(rich()).text;
  assert.match(b, /^ATACAMA DAILY · jue 8 oct/); assert.match(b, /NECESITA TU ACCIÓN/); assert.match(b, /PROSPECCIÓN: .*3 en Investigado \(2 prioridad alta\)/); assert.match(b, /CONTENIDO: 1 por aprobar · 1 programada/); assert.match(b, /SISTEMA: todo operativo · envío de correos apagado/);
  assert.ok(b.split('\n').length <= 20, 'líneas ' + b.split('\n').length); assert.ok(b.length < 700, 'largo ' + b.length);
  assert.ok(!/Ejecuciones fallidas|\/opt\/|\.json|job|[0-9a-f]{8}-[0-9a-f]{4}/i.test(b));
  assert.match(oc.composeBrief(base()).text, /Nada urgente hoy/);
  assert.match(b, /\n\nPROSPECCIÓN: [^\n]*\n\nCONTENIDO: [^\n]*\n\nSISTEMA: /, 'cada sección en su propio párrafo, con saltos de línea reales');
  assert.ok(!b.includes('\\n'), 'sin \\n literales');
  assert.ok(oc.alertsText([{ severity: 'info', title: 'a', meta: { notice: 'PROSPECT RADAR\nx' } }, { severity: 'info', title: 'b', meta: { notice: 'CONTENT RADAR\ny' } }]).includes('x\n\nCONTENT RADAR'), 'dos avisos juntos van separados por una línea en blanco');
  const bad = oc.composeBrief(base({ workflows: WF_ACTIVE.map((w) => (w.id === 'rWulaiKeio0CsXrs' ? { ...w, active: false } : w)) })).text;
  assert.match(bad, /SISTEMA: FALLO Followup Planner/);
});
ok('aviso del Prospect Radar: formato corto con top, prioridad alta y 0 contactados; sin ids ni rutas', () => {
  const mk = (n, sc, band, ms) => ({ company_name: n, status: 'in_ghl', ghl_stage: 'investigado', band, priority_score: sc, source_name: 'Prospect Radar v2', created_at: iso(ms) });
  const d = base({ candidates: [mk('Maxservicios', 91, 'alta', 119 * 60000), mk('Laboratorio Clínico Luis Pasteur Antofagasta', 91, 'alta', 118 * 60000), mk('EDL Servicios y Maquinarias', 91, 'alta', 117 * 60000), mk('Sel Otec', 85, 'alta', 116 * 60000), mk('Viejo', 70, 'valida', 40 * H)] });
  const run = { id: 'run1', kind: 'prospect_radar', status: 'ok', summary: { mode: 'import', imported: 4, minutes: 3 }, created_at: iso(110 * 60000) };
  const n = oc.runNotice(d, run);
  assert.equal(n.text, 'PROSPECT RADAR\n4 nuevos · 4 prioridad alta\nTop: Maxservicios 91 · Luis Pasteur 91 · EDL 91\nTodos en Investigado. 0 contactados.');
  assert.match(oc.runNotice(base(), run).text, /Sin candidatos nuevos/); assert.match(oc.runNotice(base(), { ...run, status: 'error' }).text, /falló/);
});
ok('aviso del Content Radar: señales nuevas, sin pieza y «nada publicado»', () => {
  const d = base({ signals_candidate: 7, signals_list: [{ title: 'n8n 2.43.1 optimiza costos y latencia manteniendo el system prompt estático', created_at: iso(105 * 60000) }, { title: 'Otra señal', created_at: iso(104 * 60000) }, { title: 'Vieja', created_at: iso(5 * D) }] });
  const n = oc.runNotice(d, { id: 'c1', kind: 'content_radar', status: 'ok', summary: { minutes: 4 }, created_at: iso(100 * 60000) });
  assert.match(n.text, /^CONTENT RADAR\n2 señales nuevas · 7 candidatas sin pieza\n• n8n 2\.43\.1/); assert.match(n.text, /Nada publicado ni aprobado\.$/);
});
ok('avisos de corrida: una sola vez por corrida, las omitidas no avisan y el estado de Hermes no es una alerta', () => {
  const d = base({ runs: [{ id: 'run9', kind: 'prospect_radar', status: 'ok', summary: { mode: 'import', minutes: 3 }, created_at: iso(30 * 60000) }, { id: 'run8', kind: 'prospect_radar', status: 'skipped', summary: { mode: 'skip' }, created_at: iso(20 * 60000) }] });
  let a = oc.evaluateAlerts(d, [{ alert_key: '_state:hermes', severity: 'info', status: 'resolved', event: true, notify_count: 1, meta: {} }]);
  assert.equal(a.notify.length, 1); assert.equal(a.notify[0].key, 'run:run9'); assert.match(oc.alertsText(a.notify), /^PROSPECT RADAR/); assert.ok(!/ATACAMA OS · alerta/.test(oc.alertsText(a.notify)));
  a = oc.evaluateAlerts(d, [{ alert_key: 'run:run9', severity: 'info', status: 'resolved', event: true, notify_count: 1 }]); assert.equal(a.notify.length, 0); assert.deepEqual(a.resolve, []);
  const mixed = oc.alertsText([{ severity: 'high', title: 'Respondió: X', detail: 'hola' }, { severity: 'info', title: 't', meta: { notice: 'PROSPECT RADAR\n1 nuevo' } }]);
  assert.match(mixed, /^ATACAMA OS · alerta\n• IMPORTANTE · Respondió: X — hola\n\nPROSPECT RADAR/);
});
ok('panel: las piezas en revisión traen preview completo (copy, slides, medios, fuentes, fecha propuesta)', () => {
  const d = rich();
  d.review_pieces = [{ id: 'p1', status: 'in_review', score: 82, rationale: 'Cambio real y útil para pymes.', ghl_post_id: 'g1', scheduled_at: new Date(NOW + 3 * D).toISOString(), piece: { format: 'carrusel', hook: 'Tu agente de WhatsApp se vuelve caro en chats largos', body: 'Línea 1\n\nLínea 2', cta: { type: 'link', text: 'Más en atacamalabs.cl' }, hashtags: ['#a'],
    slides: [{ layout: 'cover', kicker: 'WhatsApp', title: 'Chats largos, *costos* altos' }, { layout: 'content', title: 'Qué cambió', items: [{ title: 'A', text: 'b' }] }, { layout: 'content', title: 'Antes y después', compare: { left: { label: 'Antes', text: 'x' }, right: { label: 'Ahora', text: 'y' } } }],
    media: [{ url: 'https://cdn.example.com/1.png' }, { url: 'http://insegura/2.png' }], sources: [{ title: 'Notas de versión', url: 'https://docs.anthropic.com/x' }] } }];
  const pv = oc.composePanel(d).content.in_review[0].preview;
  assert.equal(pv.body, 'Línea 1\n\nLínea 2'); assert.equal(pv.slides.length, 3); assert.equal(pv.slides[0].title, 'Chats largos, costos altos'); assert.deepEqual(pv.slides[2].compare, ['Antes: x', 'Ahora: y']);
  assert.deepEqual(pv.media, ['https://cdn.example.com/1.png']); assert.equal(pv.sources[0].url, 'https://docs.anthropic.com/x'); assert.ok(pv.proposed_label); assert.equal(pv.cta, 'Más en atacamalabs.cl'); assert.equal(pv.ghl_post, true);
  assert.equal(oc.composePanel(rich()).content.in_review[0].preview, null);
});
ok('Ola B: la vista previa muestra el enfoque editorial (tipo y decisión visual) y editorialDecision no escribe nada', () => {
  const d = rich();
  d.review_pieces = [{ id: 'p1', status: 'in_review', score: 82, rationale: 'x', ghl_post_id: 'g1', scheduled_at: new Date(NOW + 3 * D).toISOString(), piece: { format: 'texto', hook: 'Hook de prueba largo', body: 'Cuerpo', editorial_type: 'news_explainer', visual: { need: 'none', rationale: 'Funciona mejor solo con texto' } } }];
  const pv = oc.composePanel(d).content.in_review[0].preview;
  assert.deepEqual(pv.editorial, { type: 'news_explainer', visual_need: 'none', visual_why: 'Funciona mejor solo con texto' });
  const old = rich(); old.review_pieces = [{ id: 'p1', status: 'in_review', piece: { format: 'texto', hook: 'Hook viejo de prueba', body: 'c' } }];
  assert.equal(oc.composePanel(old).content.in_review[0].preview.editorial, null);
  const r = oc.editorialDecision(rich(), { signal: { topic: 'Conectar a Hermes con herramientas reales', kind: 'work' } });
  assert.equal(typeof r.publish, 'boolean'); assert.ok(r.text.startsWith('Editorial Decision:')); assert.ok(!('writes' in r));
});
ok('el estado de bloqueo del login (_lock:*) no es una alerta ni se resuelve solo', () => {
  const a = oc.evaluateAlerts(base(), [{ alert_key: '_lock:global', severity: 'info', status: 'open', event: false, notify_count: 0, meta: { fails: [1], until: 0 } }, { alert_key: '_lock:ip:abc', severity: 'info', status: 'resolved', event: true, notify_count: 1, meta: {} }]);
  assert.equal(a.notify.length, 0); assert.deepEqual(a.resolve, []);
});
ok('LinkedIn en el panel: conteos por estado, listos, filas y nota de la limitación de Waalaxy; pendientes y errores piden acción', () => {
  const mk = (id, name, li, extra) => ({ company_name: name, id, status: 'in_ghl', ghl_stage: 'investigado', band: 'alta', priority_score: 85, source_name: 'x', created_at: iso(5 * D), channel_state: li ? { linkedin: li } : {}, ...(extra || {}) });
  const d = base({ candidates: [mk('1', 'Alfa', { state: 'aprobacion_pendiente', person: 'Ana', role: 'Gerente' }), mk('2', 'Beta', { state: 'respondio', last_event_at: iso(H), reply: { text: 'Hola, me interesa' } }), mk('3', 'Gamma', { state: 'error', next_action: 'Revisar el error de Waalaxy' }), mk('4', 'Delta', { state: 'en_campana' }), mk('5', 'Eps', null)], outreach: { mode: 'off', linkedin_mode: 'test' } });
  const p = oc.composePanel(d);
  assert.equal(p.linkedin.mode, 'test'); assert.equal(p.linkedin.counts.pendiente, 1); assert.equal(p.linkedin.counts.respondio, 1); assert.equal(p.linkedin.counts.error, 1); assert.equal(p.linkedin.counts.en_campana, 1);
  assert.ok(p.linkedin.rows.some((r) => r.company === 'Beta' && r.reply === 'Hola, me interesa')); assert.match(p.linkedin.note, /no informa/);
  assert.ok(p.attention.some((a) => a.key === 'li_pending' && a.items[0] === 'Alfa')); assert.ok(p.attention.some((a) => a.key === 'li_error'));
  const al = oc.evaluateAlerts(d, []); assert.ok(al.notify.some((x) => x.key === 'li_error:3' && x.severity === 'high'));
  assert.equal(oc.evaluateAlerts(base(), []).notify.some((x) => /^li_error/.test(x.key)), false);
});
ok('LinkedIn Engine es un workflow vigilado (no crítico): su falla se ve, pero no dispara alerta crítica', () => {
  assert.ok(oc.monitoredWorkflows().some((w) => w.id === 've4uKTMQkGWzzmBV' && w.critical === false));
  const h = oc.healthReport(base()); assert.ok(h.components.some((c) => c.name === 'LinkedIn Engine'));
});
ok('correo colgado en «enviando» > 15 min genera alerta; uno recién reclamado no', () => {
  const m = (min) => ({ id: 'q1', direction: 'outbound', status: 'sending', company_name: 'Alfa', created_at: iso(3 * D), updated_at: iso(min * 60000), kind: 'initial' });
  assert.ok(oc.evaluateAlerts(base({ messages: [m(40)] }), []).notify.some((x) => x.key === 'sending_stuck:q1' && x.severity === 'high'));
  assert.ok(!oc.evaluateAlerts(base({ messages: [m(3)] }), []).notify.some((x) => /^sending_stuck/.test(x.key)));
});
ok('si Hermes deja de reportar, el panel lo muestra (atención a los 35 min, fallo a los 90)', () => {
  const st = (min) => oc.healthReport(base({ hermes_age_ms: min * 60000 })).components.find((c) => /reporte de alertas/.test(c.name));
  assert.equal(st(10).status, 'ok'); assert.equal(st(50).status, 'atencion'); assert.equal(st(120).status, 'fallo'); assert.match(st(120).reason, /no reporta hace 120 min/);
  assert.ok(!oc.healthReport(base()).components.some((c) => /reporte de alertas/.test(c.name)), 'sin snapshot no se inventa el componente');
});
// ---------- Ola A: Governor, RSS, inteligencia orgánica, recursos y Founder Interview
const piece6 = (i) => ({ id: 'q' + i, topic: 'Tema ' + i, channel: 'linkedin_page', status: 'in_review', ghl_status: 'in_review', ghl_approval_status: 'pending', created_at: iso(H) });
ok('summarizeGrowth: cola (6 por defecto), RSS, inteligencia orgánica, recursos con uso y Founder', () => {
  const g = oc.summarizeGrowth(base({
    pieces: [1, 2, 3].map(piece6), content_cfg: { max_pending_in_review: 6, rss_enabled: true, competitor_enabled: true },
    feeds: [{ slug: 'a', enabled: true, last_status: 'ok', consecutive_failures: 0, last_checked_at: iso(H) }, { slug: 'b', enabled: true, last_status: 'error', last_error: 'http_503', consecutive_failures: 3, last_checked_at: iso(2 * H) }, { slug: 'c', enabled: false }],
    feed_new: [{ relevance: 7 }, { relevance: 1 }], runs: [{ kind: 'content_rss', status: 'ok', created_at: iso(4 * H), summary: {} }],
    intel: { created_at: iso(2 * D), competitors_scanned: ['vambe'], report: { gaps: ['costo real'], saturated_topics: ['24/7'], own_angles: [{ angle: 'Cuánto cuesta' }] } },
    resources: [{ id: 'r1', slug: 'x', name: 'X', type: 'checklist', cta_mode: 'resource_link', url: 'https://atacamalabs.cl/recursos/x', status: 'active' }, { id: 'r2', slug: 'y', status: 'draft' }], resource_use: [{ resource_id: 'r1' }, { resource_id: 'r1' }],
    interviews: [{ status: 'answered', question: '¿Por qué?', asked_at: iso(3 * H) }, { status: 'asked', question: 'Otra', asked_at: iso(9 * D) }] }));
  assert.deepEqual([g.queue.pending, g.queue.max, g.queue.full], [3, 6, false]);
  assert.equal(g.rss.feeds_total, 2); assert.equal(g.rss.feeds_ok, 1); assert.equal(g.rss.failing[0].slug, 'b'); assert.equal(g.rss.new_items, 2); assert.ok(g.rss.last_run);
  assert.deepEqual(g.intel.gaps, ['costo real']); assert.equal(g.intel.competitors[0], 'vambe'); assert.equal(g.intel.own_angles[0], 'Cuánto cuesta');
  assert.equal(g.resources.active, 1); assert.equal(g.resources.rows[0].uses, 2);
  assert.equal(g.founder.pending_answer, 1); assert.equal(g.founder.answered_without_pieces, 1);
  assert.equal(oc.summarizeGrowth(base({ pieces: [1, 2, 3, 4, 5, 6].map(piece6) })).queue.full, true);
  assert.equal(oc.summarizeGrowth(base()).queue.max, 6, 'sin configuración: tope 6');
});
ok('compuerta RSS: corre solo con artículos relevantes nuevos; respeta desactivado, cadencia y señales sin pieza', () => {
  assert.match(oc.rssGate(base({ feed_new: [] })).reason, /sin artículos nuevos relevantes/);
  assert.equal(oc.rssGate(base({ feed_new: [{ relevance: 1 }] })).mode, 'skip');
  const run = oc.rssGate(base({ feed_new: [{ relevance: 6 }, { relevance: 3 }] })); assert.equal(run.mode, 'run'); assert.equal(run.max_signals, 3); assert.equal(run.relevant_items, 2);
  assert.equal(oc.rssGate(base({ content_cfg: { rss_enabled: false }, feed_new: [{ relevance: 9 }] })).mode, 'skip');
  assert.match(oc.rssGate(base({ feed_new: [{ relevance: 9 }], runs: [{ kind: 'content_rss', status: 'ok', created_at: iso(3 * H) }] })).reason, /ya corrió/);
  assert.equal(oc.rssGate(base({ feed_new: [{ relevance: 9 }], signals_candidate: 12 })).mode, 'skip');
});
ok('compuerta de inteligencia orgánica: semanal, solo si está activada', () => {
  assert.equal(oc.competitorGate(base()).mode, 'run');
  assert.equal(oc.competitorGate(base({ runs: [{ kind: 'competitor_intel', status: 'ok', created_at: iso(2 * D) }] })).mode, 'skip');
  assert.equal(oc.competitorGate(base({ runs: [{ kind: 'competitor_intel', status: 'ok', created_at: iso(6 * D) }] })).mode, 'run');
  assert.equal(oc.competitorGate(base({ content_cfg: { competitor_enabled: false } })).mode, 'skip');
});
ok('compuerta de piezas: sin señales o con la cola llena NO corre (no gasta IA); con espacio acota max_pieces', () => {
  assert.match(oc.piecesGate(base({ signals_candidate: 0 })).reason, /no hay señales candidatas/);
  assert.match(oc.piecesGate(base({ signals_candidate: 4, pieces: [1, 2, 3, 4, 5, 6].map(piece6) })).reason, /cola de revisión llena/);
  let g = oc.piecesGate(base({ signals_candidate: 4, pieces: [1, 2].map(piece6) })); assert.equal(g.mode, 'run'); assert.equal(g.max_pieces, 2);
  g = oc.piecesGate(base({ signals_candidate: 4, pieces: [1, 2, 3, 4].map(piece6) })); assert.equal(g.mode, 'run'); assert.equal(g.max_pieces, 1, 'solo cabe una pieza más para llegar a 5');
  assert.match(oc.piecesGate(base({ signals_candidate: 4, runs: [{ kind: 'content_pieces', status: 'ok', created_at: iso(3 * H) }] })).reason, /ya corrió/);
});
ok('panel: cola, RSS, inteligencia, recursos y Founder; avisa cola llena, feeds caídos y entrevista sin pieza', () => {
  const pn = oc.composePanel(base({ pieces: [1, 2, 3, 4, 5, 6].map(piece6), feeds: [{ slug: 'b', enabled: true, last_status: 'error', last_error: 'http_503', consecutive_failures: 3 }], interviews: [{ status: 'answered', question: 'x', asked_at: iso(H) }], resources: [], content_cfg: {} }));
  assert.equal(pn.content.queue.full, true); assert.equal(pn.content.queue.max, 6); assert.ok(pn.content.rss && pn.content.intel && pn.content.resources && pn.content.founder);
  const keys = pn.attention.map((a) => a.key); assert.ok(keys.includes('content_queue_full') && keys.includes('rss_failing') && keys.includes('founder_answered'));
  assert.ok(!oc.composePanel(base()).attention.some((a) => a.key === 'content_queue_full'));
});
ok('alertas: feed RSS con 3+ fallos avisa; los avisos de corrida de Ola A son cortos y el RSS exitoso es silencioso', () => {
  const ev = oc.evaluateAlerts(base({ feeds: [{ slug: 'b', enabled: true, consecutive_failures: 3, last_error: 'http_503' }] }), []);
  assert.ok(ev.notify.some((x) => x.key === 'rss_feed:b'));
  const runs = [{ id: 'r1', kind: 'content_rss', status: 'ok', created_at: iso(H), summary: {} }, { id: 'r2', kind: 'content_pieces', status: 'ok', created_at: iso(H), summary: { minutes: 6 } }, { id: 'r3', kind: 'competitor_intel', status: 'ok', created_at: iso(H), summary: {} }];
  const ev2 = oc.evaluateAlerts(base({ runs, pieces: [{ ...piece6(1), created_at: iso(H) }], intel: { created_at: iso(H), competitors_scanned: ['vambe'], report: { gaps: ['costo real'] } } }), []);
  const keys = ev2.notify.map((x) => x.key);
  assert.ok(!keys.includes('run:r1')); assert.ok(keys.includes('run:r2') && keys.includes('run:r3'));
  const t = oc.alertsText(ev2.notify); assert.match(t, /CONTENT[\s\S]*Nada publicado ni aprobado/); assert.match(t, /INTELIGENCIA ORGÁNICA/); assert.doesNotMatch(t, /[0-9a-f]{8}-[0-9a-f]{4}/);
  assert.equal(oc.runNotice(base(), { kind: 'content_rss', status: 'ok', created_at: iso(H) }), null);
  assert.equal(oc.runNotice(base(), { kind: 'content_rss', status: 'error', created_at: iso(H), summary: { reason: 'timeout' } }).severity, 'high');
});
ok('salud: los workflows 27/28 y los jobs nuevos de Hermes aparecen; un feed caído da atención', () => {
  const h = oc.healthReport(base({ feeds: [{ slug: 'b', enabled: true, consecutive_failures: 4, last_error: 'http_503', last_status: 'error' }] }));
  const names = h.components.map((c) => c.name);
  ['Content RSS (ingestión)', 'Content RSS (Hermes)', 'Content Pieces (Hermes)', 'Inteligencia orgánica (Hermes)'].forEach((n) => assert.ok(names.includes(n), n));
  assert.equal(h.components.find((c) => c.name === 'Content RSS (ingestión)').status, 'atencion');
  assert.equal(oc.healthReport(base()).components.find((c) => c.name === 'Content RSS (ingestión)').status, 'ok');
});

// ---------- /ops V2: ritmo editorial semanal (America/Santiago, semana lun–dom; NOW = jueves 8-oct 08:30 Chile)
const wkPiece = (i, st, atMs, extra) => ({ id: 'w' + i, topic: 'T' + i, channel: 'linkedin_page', status: st, ghl_status: st, is_test: false, created_at: iso(2 * D), ...(st === 'published' ? { published_at: new Date(atMs).toISOString() } : { scheduled_at: new Date(atMs).toISOString() }), ...(extra || {}) });
const MON = Date.parse('2026-10-05T15:00:00Z'), FRI = Date.parse('2026-10-09T15:00:00Z'), NEXTMON = Date.parse('2026-10-12T15:00:00Z'), SAT = Date.parse('2026-10-10T15:00:00Z'), PREVFRI = Date.parse('2026-10-02T15:00:00Z');
ok('ritmo semanal: X = publicadas + programadas de ESTA semana (lun–dom Chile); en revisión aparte; otras semanas no cuentan', () => {
  const w = oc.weeklyContent(base({ pieces: [wkPiece(1, 'published', MON), wkPiece(2, 'scheduled', FRI), wkPiece(3, 'in_review', SAT), wkPiece(4, 'published', PREVFRI), wkPiece(5, 'scheduled', NEXTMON)] }));
  assert.equal(w.week_start, '2026-10-05'); assert.equal(w.week_end, '2026-10-11'); assert.equal(w.published, 1); assert.equal(w.scheduled, 1); assert.equal(w.in_review, 1); assert.equal(w.done, 2); assert.equal(w.coverage, 3); assert.equal(w.target, 5);
  assert.equal(oc.weeklyContent(base({ pieces: [{ ...wkPiece(6, 'published', MON), is_test: true }] })).done, 0, 'las piezas de prueba no cuentan');
});
ok('ritmo semanal: etiquetas exactas por X (0–2 falta · 3 en ritmo · 4–5 correcto · 6 cubierta · >6 no generar)', () => {
  const lab = (n) => oc.weeklyContent(base({ pieces: Array.from({ length: n }, (_, i) => wkPiece(i, 'published', MON + i * 3600000)) })).state_label;
  assert.equal(lab(0), 'Falta contenido'); assert.equal(lab(2), 'Falta contenido'); assert.equal(lab(3), 'En ritmo'); assert.equal(lab(4), 'Ritmo correcto'); assert.equal(lab(5), 'Ritmo correcto'); assert.equal(lab(6), 'Semana cubierta');
  assert.match(lab(7), /^No generar más automáticamente salvo señal excepcional o instrucción explícita$/);
});
ok('runway: días hasta la última pieza programada o en revisión (0 si no hay); el mínimo sano es 3', () => {
  assert.equal(oc.weeklyContent(base()).runway_days, 0);
  const w = oc.weeklyContent(base({ pieces: [wkPiece(1, 'scheduled', FRI), wkPiece(2, 'in_review', SAT)] }));
  assert.equal(w.runway_days, 2); assert.equal(w.runway_ok, false);
  assert.equal(oc.weeklyContent(base({ pieces: [wkPiece(1, 'scheduled', NEXTMON + 2 * D)] })).runway_days, 6);
});
ok('ritmo: la regla es configurable en content_config (objetivo, mínimo, máximo, runway)', () => {
  const w = oc.weeklyContent(base({ content_cfg: { weekly_target: 3, weekly_min: 2, weekly_max: 4, runway_min_days: 2, runway_max_days: 7 }, pieces: [1, 2, 3].map((i) => wkPiece(i, 'published', MON + i * 3600000)) }));
  assert.deepEqual([w.target, w.min, w.max, w.runway_min, w.runway_max], [3, 2, 4, 2, 7]); assert.equal(w.covered, true); assert.equal(w.state_label, 'Ritmo correcto');
});
ok('Content Engine: con la semana cubierta (publicadas+programadas+en revisión ≥ 5) NO fabrica piezas normales, aunque haya señales', () => {
  const full = [1, 2, 3].map((i) => wkPiece(i, 'published', MON + i * 3600000)).concat([wkPiece(4, 'scheduled', FRI), wkPiece(5, 'in_review', SAT)]);
  const g = oc.piecesGate(base({ signals_candidate: 5, pieces: full }));
  assert.equal(g.mode, 'skip'); assert.match(g.reason, /semana cubierta \(5\/5/); assert.match(g.reason, /radares siguen recolectando/); assert.equal(g.week_coverage, 5);
  assert.equal(oc.piecesGate(base({ signals_candidate: 5, pieces: full.slice(0, 4) })).mode, 'run', 'a 4/5 todavía genera');
});
ok('Content Engine: en revisión SÍ cuenta para decidir (5 en revisión = semana cubierta) aunque X sea 0', () => {
  const g = oc.piecesGate(base({ signals_candidate: 3, pieces: [1, 2, 3, 4, 5].map((i) => wkPiece(i, 'in_review', FRI + i * 3600000)) }));
  assert.equal(g.mode, 'skip'); assert.equal(oc.weeklyContent(base({ pieces: [1, 2, 3, 4, 5].map((i) => wkPiece(i, 'in_review', FRI + i * 3600000)) })).done, 0);
});
ok('Content Engine: una señal URGENTE (noticia, score ≥ 90, ≤ 48 h) puede pasar el ritmo con 1 pieza, pero nunca el máximo ni el tope de la cola', () => {
  const full = [1, 2, 3].map((i) => wkPiece(i, 'published', MON + i * 3600000)).concat([wkPiece(4, 'scheduled', FRI), wkPiece(5, 'in_review', SAT)]);
  const urgent = { signals_list: [{ id: 's', title: 'Cambio de precios de WhatsApp API', signal_type: 'news', signal_score: 93, created_at: iso(3 * H) }] };
  const g = oc.piecesGate(base({ signals_candidate: 1, pieces: full, ...urgent })); assert.equal(g.mode, 'run'); assert.equal(g.max_pieces, 1); assert.match(g.reason, /URGENTE/);
  assert.equal(oc.piecesGate(base({ signals_candidate: 1, pieces: full.concat([wkPiece(6, 'scheduled', SAT + H)]), ...urgent })).mode, 'skip', 'con 6 ya no');
  assert.equal(oc.piecesGate(base({ signals_candidate: 1, pieces: full, signals_list: [{ id: 's', title: 'x', signal_type: 'news', signal_score: 85, created_at: iso(3 * H) }] })).mode, 'skip', 'score < 90 no es urgente');
  assert.equal(oc.piecesGate(base({ signals_candidate: 1, pieces: full, signals_list: [{ id: 's', title: 'x', signal_type: 'news', signal_score: 95, created_at: iso(5 * D) }] })).mode, 'skip', 'una señal vieja no es urgente');
  assert.equal(oc.piecesGate(base({ signals_candidate: 1, pieces: [1, 2, 3, 4, 5, 6].map((i) => piece6(i)), ...urgent })).mode, 'skip', 'la cola llena (6/6) manda siempre');
});
ok('Content Engine: runway lleno (≥ 5 días por delante) también detiene la generación normal', () => {
  const g = oc.piecesGate(base({ signals_candidate: 2, pieces: [wkPiece(1, 'scheduled', NEXTMON + 2 * D)] }));
  assert.equal(g.mode, 'skip'); assert.match(g.reason, /días de contenido por delante/);
});
ok('panel V2: contenido semanal, resumen de outreach (X/5 correo, X/10 LinkedIn) y conteo de aprobaciones', () => {
  const todaySent = { id: 'm1', direction: 'outbound', kind: 'initial', status: 'sent', sent_at: iso(H), company_name: 'A', created_at: iso(H) };
  const pn = oc.composePanel(base({ outreach: { mode: 'live', daily_cap: 5, linkedin_mode: 'live', linkedin_daily_cap: 10 }, messages: [todaySent, { id: 'm2', direction: 'outbound', kind: 'initial', status: 'draft', company_name: 'B', created_at: iso(H) }],
    candidates: [{ company_name: 'LI', status: 'contacted', channel_state: { linkedin: { state: 'en_campana', imported_at: iso(2 * H), mode_at_import: 'live' } }, created_at: iso(D) }, { company_name: 'Vieja', status: 'contacted', channel_state: { linkedin: { state: 'en_campana', imported_at: iso(3 * D), mode_at_import: 'live' } }, created_at: iso(D) }],
    pieces: [wkPiece(1, 'in_review', FRI), wkPiece(2, 'published', MON)] }));
  assert.equal(pn.content.weekly.done, 1); assert.equal(pn.content.weekly.target, 5); assert.equal(pn.content.weekly.in_review, 1);
  assert.equal(pn.outreach.email.sent_today, 1); assert.equal(pn.outreach.email.cap, 5); assert.equal(pn.outreach.email.drafts, 1);
  assert.equal(pn.outreach.linkedin.imported_today, 1); assert.equal(pn.outreach.linkedin.cap, 10); assert.equal(pn.outreach.linkedin.in_campaign, 2);
  assert.equal(pn.approvals.emails, 1); assert.equal(pn.approvals.content, 1);
});

console.log(n + ' ok');
