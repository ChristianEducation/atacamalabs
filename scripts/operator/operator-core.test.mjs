import assert from 'node:assert/strict';
import { operatorTools, parseTarget, normStage, parseRequest, resolveQueries, pickTarget, inputsFromParams, buildCalls, shapeResponse, refusalResponse, sanitize } from './operator-core.mjs';

let n = 0;
const ok = (name, fn) => { try { fn(); n++; } catch (e) { console.error('FAIL', name, '\n', e.message); process.exitCode = 1; } };

const NOW = Date.parse('2026-10-07T15:00:00Z');
const SB = 'https://sb.example';
const CFG = { locationId: 'LOC', pipelineId: 'PIPE', stages: { nuevo: 'S1', investigado: 'S2', contactado: 'S3', respondio: 'S4', diagnostico: 'S5', propuesta: 'S6', seguimiento: 'S7' } };
const mk = (tool, params, extra) => parseRequest({ tool, request_id: 'req-' + tool + '-1', params: params || {}, ...(extra || {}) }, NOW);

// --- registro y niveles
ok('registro: niveles', () => {
  const t = operatorTools();
  for (const k of ['analyze_prospects', 'import_prospects', 'get_prospect', 'list_prospects', 'list_pending_prospects', 'prepare_outreach', 'log_manual_contact', 'add_note', 'move_opportunity', 'create_followup', 'get_open_opportunities', 'get_tasks']) assert.equal(t[k].level, 1, k);
  assert.equal(t.force_import_prospect.level, 2);
  assert.equal(t.discard_prospect.level, 2);
  for (const k of ['send_email', 'send_whatsapp', 'publish_content', 'delete_record']) { assert.equal(t[k].level, 3, k); assert.equal(t[k].kind, 'blocked'); }
});
ok('tool desconocida y request_id obligatorio', () => {
  assert.equal(parseRequest({ tool: 'nope', request_id: 'abcd' }, NOW).ok, false);
  const r = parseRequest({ tool: 'get_tasks' }, NOW);
  assert.equal(r.ok, false); assert.match(r.error, /request_id/);
  assert.equal(parseRequest({ tool: 'get_tasks', request_id: 'a b' }, NOW).ok, false);
});
ok('nivel 1 sin refusal, actor fijo', () => {
  const r = mk('get_tasks');
  assert.equal(r.ok, true); assert.equal(r.refusal, undefined); assert.equal(r.actor, 'Christian vía Hermes');
});

// --- nivel 2
ok('nivel 2: sin order_text → needs_explicit_order', () => {
  const r = mk('force_import_prospect', { target: '27', reason: 'Christian quiere intentarlo' });
  assert.equal(r.refusal.status, 'needs_explicit_order');
});
ok('nivel 2: order_text que no pide importar → rechazo', () => {
  const r = mk('force_import_prospect', { target: '27', reason: 'Christian quiere intentarlo' }, { order_text: 'qué te parece la 27?' });
  assert.equal(r.refusal.status, 'needs_explicit_order');
});
ok('nivel 2: sin motivo → needs_reason', () => {
  const r = mk('force_import_prospect', { target: '27' }, { order_text: 'Mete la empresa 27 aunque tenga score bajo' });
  assert.equal(r.refusal.status, 'needs_reason');
});
ok('nivel 2: con orden y motivo → ejecuta', () => {
  const r = mk('force_import_prospect', { target: '27', reason: 'Orden de Christian' }, { order_text: 'Mete la empresa 27 aunque tenga score bajo' });
  assert.equal(r.refusal, undefined);
});
ok('nivel 2: descartar exige verbo de descarte', () => {
  assert.equal(mk('discard_prospect', { target: 'x', reason: 'no calza' }, { order_text: 'mete la 3' }).refusal.status, 'needs_explicit_order');
  assert.equal(mk('discard_prospect', { target: 'x', reason: 'no calza' }, { order_text: 'descarta la empresa Acme' }).refusal, undefined);
});

// --- nivel 3
ok('nivel 3: confirmación requerida, código estable, nada se ejecuta', () => {
  const r = mk('send_email', { target: 'x' });
  assert.equal(r.refusal.status, 'confirmation_required');
  assert.match(r.refusal.confirmation_code, /^CONF-\d{6}$/);
  assert.equal(mk('send_email', { target: 'x' }).refusal.confirmation_code, r.refusal.confirmation_code);
  const rr = refusalResponse(r);
  assert.equal(rr.response.ok, false); assert.equal(rr.response.executed, false); assert.equal(rr.response.safety.messages_sent, 0);
  assert.equal(rr.audit_row.status, 'confirmation_required'); assert.equal(rr.audit_row.level, 3);
});
ok('nivel 3: aun con código → not_enabled', () => {
  const r = mk('send_whatsapp', {}, { confirmation_code: 'CONF-123456' });
  assert.equal(r.refusal.status, 'not_enabled');
  for (const t of ['publish_content', 'delete_record']) assert.ok(mk(t).refusal);
});

// --- targets
ok('parseTarget', () => {
  assert.deepEqual(parseTarget('27'), { kind: 'number', value: 27 });
  assert.deepEqual(parseTarget('#4'), { kind: 'number', value: 4 });
  assert.deepEqual(parseTarget(12), { kind: 'number', value: 12 });
  assert.deepEqual(parseTarget('https://www.rentalin.cl/contacto'), { kind: 'domain', value: 'rentalin.cl' });
  assert.deepEqual(parseTarget('rentalin.cl'), { kind: 'domain', value: 'rentalin.cl' });
  assert.deepEqual(parseTarget('Ana@X.cl'), { kind: 'email', value: 'ana@x.cl' });
  assert.deepEqual(parseTarget('Rentalin Chile'), { kind: 'name', value: 'Rentalin Chile' });
  assert.equal(parseTarget(''), null);
});
ok('normStage', () => {
  assert.equal(normStage('Respondió'), 'respondio'); assert.equal(normStage('contactado'), 'contactado');
  assert.equal(normStage('Diagnóstico'), 'diagnostico'); assert.equal(normStage('xyz'), null);
});

// --- consultas
ok('resolveQueries: nombre, dominio, listas y análisis', () => {
  const byName = resolveQueries(mk('get_prospect', { target: 'Rentalin' }), SB);
  assert.match(byName.rows_url, /company_name=ilike\.\*Rentalin\*/); assert.ok(byName.analysis_url);
  const byNum = resolveQueries(mk('add_note', { target: '27', note: 'x' }), SB);
  assert.equal(byNum.rows_url, null); assert.ok(byNum.analysis_url);
  assert.match(resolveQueries(mk('get_prospect', { target: 'rentalin.cl' }), SB).rows_url, /domain=eq\.rentalin\.cl/);
  assert.match(resolveQueries(mk('list_pending_prospects'), SB).rows_url, /status=eq\.in_ghl/);
  assert.match(resolveQueries(mk('list_pending_prospects', { scope: 'both' }), SB).rows_url, /or=\(/);
  assert.match(resolveQueries(mk('list_prospects', { band: 'Válida', min_score: 70, limit: 500 }), SB).rows_url, /band=eq\.valida.*priority_score=gte\.70.*limit=50/);
  assert.match(resolveQueries(mk('get_analysis'), SB).analysis_url, /operator_analysis_cache/);
});
ok('resolveQueries: no inyecta caracteres peligrosos', () => {
  const u = resolveQueries(mk('get_prospect', { target: 'a*&select=*' }), SB).rows_url;
  assert.ok(!u.includes('&select=*'));
});

// --- pickTarget
const A = { id: 'an1', candidates: [{ company_name: 'Alfa Dental', website: 'https://alfa.cl' }, { company_name: 'Beta Clinica', website: 'https://beta.cl' }, { company_name: 'Alfa Salud', website: 'https://alfasalud.cl' }], results: [{ n: 1, decision: 'create_in_ghl', priority_score: 85 }, { n: 2, decision: 'keep_in_supabase', priority_score: 50 }, { n: 3, decision: 'x', priority_score: 40 }] };
ok('pickTarget: número, nombre, ambiguo, no encontrado', () => {
  const r2 = pickTarget({ target: '2' }, [], A);
  assert.equal(r2.candidate.company_name, 'Beta Clinica'); assert.equal(r2.number, 2); assert.equal(r2.brief.priority_score, 50);
  assert.equal(pickTarget({ target: '9' }, [], A).error, 'numero_fuera_de_rango');
  assert.equal(pickTarget({ target: 'Beta' }, [], A).candidate.company_name, 'Beta Clinica');
  assert.equal(pickTarget({ target: 'Alfa' }, [], A).error, 'ambiguo');
  assert.equal(pickTarget({ target: 'Zeta' }, [], A).error, 'no_encontrado');
  assert.equal(pickTarget({}, [], A).error, 'falta_target');
  const row = { company_name: 'Gamma', canonical: { company_name: 'Gamma', website: 'g.cl' }, candidate_key: 'k' };
  assert.equal(pickTarget({ target: 'Gamma' }, [row], null).source, 'supabase');
  assert.equal(pickTarget({ target: 'G' }, [row, row], null).error, 'ambiguo');
});

// --- inputs
ok('inputsFromParams', () => {
  assert.ok(inputsFromParams({ file_content: '<html><body></body></html>' }).html);
  assert.ok(inputsFromParams({ file_content: 'a,b\n1,2', file_type: 'csv' }).csv);
  assert.equal(inputsFromParams({ file_content: '[{"company_name":"X"}]', file_type: 'json' }).prospects.length, 1);
  assert.ok(inputsFromParams({ file_content: 'texto libre' }).text);
  assert.deepEqual(inputsFromParams({ url: 'https://a.cl' }).urls, ['https://a.cl']);
  assert.deepEqual(inputsFromParams({ urls: ['javascript:x', 'https://b.cl'] }).urls, ['https://b.cl']);
  assert.deepEqual(inputsFromParams({}), {});
});

// --- buildCalls
const rq = (tool, params, extra) => mk(tool, params, extra);
ok('buildCalls analyze: include_candidates y sin entrada', () => {
  const c = buildCalls(rq('analyze_prospects', { file_content: 'texto' }), [], null, CFG);
  assert.equal(c.gateway_body.action, 'analyze'); assert.equal(c.gateway_body.options.include_candidates, true); assert.equal(c.gateway_body.source.type, 'hermes-operator');
  assert.equal(buildCalls(rq('analyze_prospects', {}), [], null, CFG).error.code, 'sin_entrada');
});
ok('buildCalls import desde análisis: elegibles, números, vacío', () => {
  const c = buildCalls(rq('import_prospects', { from_analysis: 'last' }), [], A, CFG);
  assert.equal(c.gateway_body.action, 'import'); assert.equal(c.gateway_body.prospects.length, 1); assert.equal(c.gateway_body.prospects[0].company_name, 'Alfa Dental');
  const c2 = buildCalls(rq('import_prospects', { from_analysis: 'last', numbers: [2, 3, 99] }), [], A, CFG);
  assert.deepEqual(c2.gateway_body.prospects.map((p) => p.company_name), ['Beta Clinica', 'Alfa Salud']);
  assert.equal(buildCalls(rq('import_prospects', { from_analysis: 'last' }), [], null, CFG).error.code, 'sin_analisis');
  const none = { ...A, results: [{ decision: 'x' }, { decision: 'x' }, { decision: 'x' }] };
  assert.equal(buildCalls(rq('import_prospects', { from_analysis: 'last' }), [], none, CFG).error.code, 'nada_que_importar');
  const big = { candidates: Array.from({ length: 30 }, (_, i) => ({ company_name: 'E' + i })), results: [] };
  assert.equal(buildCalls(rq('import_prospects', { from_analysis: 'last', select: 'all' }), [], big, CFG).error.code, 'lote_grande');
});
ok('buildCalls force import: flags y motivo', () => {
  const c = buildCalls(rq('force_import_prospect', { target: '2', reason: 'Orden de Christian' }, { order_text: 'mete la 2 aunque tenga score bajo' }), [], A, CFG);
  assert.equal(c.gateway_body.options.force_import, true); assert.equal(c.gateway_body.options.manual_override_reason, 'Orden de Christian'); assert.equal(c.gateway_body.options.by, 'Christian vía Hermes');
  assert.equal(c.entity.name, 'Beta Clinica');
});
ok('buildCalls actos: log, nota, mover, seguimiento, descartar', () => {
  const log = buildCalls(rq('log_manual_contact', { target: '1', channel: 'Instagram', note: 'DM enviado' }), [], A, CFG).gateway_body.act;
  assert.equal(log.type, 'log_instagram');
  assert.equal(buildCalls(rq('log_manual_contact', { target: '1', channel: 'WhatsApp', outcome: 'sin respuesta' }), [], A, CFG).gateway_body.act.type, 'log_whatsapp');
  assert.equal(buildCalls(rq('log_manual_contact', { target: '1', channel: 'llamada' }), [], A, CFG).gateway_body.act.type, 'log_phone');
  assert.match(buildCalls(rq('log_manual_contact', { target: '1', channel: 'WhatsApp', outcome: 'sin respuesta' }), [], A, CFG).gateway_body.act.note, /sin respuesta/);
  assert.equal(buildCalls(rq('add_note', { target: '1', note: 'hola' }), [], A, CFG).gateway_body.act.type, 'add_note');
  assert.equal(buildCalls(rq('add_note', { target: '1' }), [], A, CFG).error.code, 'falta_nota');
  const mv = buildCalls(rq('move_opportunity', { target: '1', stage: 'Respondió' }), [], A, CFG).gateway_body.act;
  assert.deepEqual([mv.type, mv.stage], ['move_stage', 'respondio']);
  assert.equal(buildCalls(rq('move_opportunity', { target: '1', stage: 'Nada' }), [], A, CFG).error.code, 'etapa_desconocida');
  const fu = buildCalls(rq('create_followup', { target: '1', due_at: '2026-10-09', title: 'Llamar' }), [], A, CFG).gateway_body.act;
  assert.deepEqual([fu.type, fu.due_at, fu.title], ['follow_up', '2026-10-09', 'Llamar']);
  assert.equal(buildCalls(rq('create_followup', { target: '1', due_at: 'basura' }), [], A, CFG).error.code, 'fecha_invalida');
  const ds = buildCalls(rq('discard_prospect', { target: '1', reason: 'no calza' }, { order_text: 'descarta la 1' }), [], A, CFG).gateway_body.act;
  assert.deepEqual([ds.type, ds.reason], ['discard', 'no calza']);
});
ok('buildCalls GHL: oportunidades por etapa y tareas', () => {
  const o = buildCalls(rq('get_open_opportunities', { stage: 'Investigado' }), [], null, CFG).ghl_call;
  assert.match(o.url, /opportunities\/search\?location_id=LOC&pipeline_id=PIPE&status=open&limit=30&pipeline_stage_id=S2/);
  assert.equal(buildCalls(rq('get_open_opportunities', { stage: 'zzz' }), [], null, CFG).error.code, 'etapa_desconocida');
  const t = buildCalls(rq('get_tasks'), [], null, CFG).ghl_call;
  assert.equal(t.method, 'POST'); assert.match(t.url, /locations\/LOC\/tasks\/search/); assert.equal(t.body.completed, false);
});
ok('buildCalls: errores de target', () => {
  assert.equal(buildCalls(rq('add_note', { target: '9', note: 'x' }), [], A, CFG).error.code, 'numero_fuera_de_rango');
  assert.equal(buildCalls(rq('add_note', { target: 'Alfa', note: 'x' }), [], A, CFG).error.status, 'ambiguous');
  assert.equal(buildCalls(rq('add_note', { target: 'Zeta', note: 'x' }), [], A, CFG).error.status, 'not_found');
});

// --- shapeResponse
const gwImport = { ok: true, summary: { received: 2, created_in_ghl: 1, kept_in_supabase: 1, duplicates_in_ghl: 0 }, results: [{ company: 'Alfa Dental', decision: 'create_in_ghl', priority_score: 85, ghl: { contact_id: 'C1', opportunity_id: 'O1' }, status_after: 'in_ghl' }, { company: 'Beta', decision: 'keep_in_supabase', priority_score: 50 }] };
ok('shape: import', () => {
  const req = rq('import_prospects', { from_analysis: 'last' });
  const calls = buildCalls(req, [], A, CFG);
  const s = shapeResponse(req, calls, gwImport, null, [], A, CFG);
  assert.equal(s.response.ok, true); assert.match(s.response.message, /1 entraron a GHL/); assert.match(s.response.message, /No se envió ningún mensaje/);
  assert.equal(s.audit_row.request_id, req.request_id); assert.equal(s.audit_row.actor, 'Christian vía Hermes'); assert.equal(s.audit_row.status, 'executed');
  assert.deepEqual(s.audit_row.entity.ghl_opportunity_ids, ['O1']);
});
ok('shape: analyze guarda caché de candidatos', () => {
  const req = rq('analyze_prospects', { file_content: 'x' });
  const gw = { ok: true, summary: { received: 2, by_band: { alta: 1, pendiente: 1 }, would_enter_ghl: 1 }, notes: [], results: [{ company: 'A', decision: 'create_in_ghl', priority_score: 85, band: 'alta', channels: ['email'] }, { company: 'B', decision: 'keep_in_supabase', priority_score: 50, band: 'pendiente', channels: [] }], candidates: [{ company_name: 'A' }, { company_name: 'B' }] };
  const s = shapeResponse(req, buildCalls(req, [], null, CFG), gw, null, [], null, CFG);
  assert.equal(s.cache_row.candidates.length, 2); assert.equal(s.cache_row.results[1].n, 2);
  assert.equal(s.response.data.top_to_import.length, 1); assert.ok(!('candidates' in s.response.data));
  assert.match(s.response.message, /no escribí nada/);
});
ok('shape: persist_error del Gateway se informa como error (no como éxito)', () => {
  const req = rq('import_prospects', { from_analysis: 'last' });
  const s2 = shapeResponse(req, buildCalls(req, [], A, CFG), { ok: true, persist_error: 'Supabase HTTP 400', summary: { received: 1 }, results: [] }, null, [], A, CFG);
  assert.equal(s2.response.ok, false); assert.equal(s2.response.error, 'persist'); assert.equal(s2.audit_row.status, 'error');
});
ok('shape: gateway caído → error auditado', () => {
  const req = rq('add_note', { target: '1', note: 'x' });
  const s = shapeResponse(req, buildCalls(req, [], A, CFG), null, null, [], A, CFG);
  assert.equal(s.response.ok, false); assert.equal(s.audit_row.status, 'error');
});
ok('shape: acto sin efecto → status error', () => {
  const req = rq('move_opportunity', { target: '1', stage: 'contactado' });
  const gw = { ok: true, results: [{ company: 'Alfa Dental', executed: false, error: 'sin_oportunidad', warnings: ['x'] }] };
  const s = shapeResponse(req, buildCalls(req, [], A, CFG), gw, null, [], A, CFG);
  assert.equal(s.audit_row.status, 'error'); assert.match(s.response.message, /No se pudo/);
});
ok('shape: oportunidades y tareas (oculta ejemplos)', () => {
  const r1 = rq('get_open_opportunities', {});
  const s1 = shapeResponse(r1, buildCalls(r1, [], null, CFG), null, { statusCode: 200, body: { meta: { total: 1 }, opportunities: [{ id: 'O', name: 'Alfa', pipelineStageId: 'S2', contact: { name: 'Ana' } }] } }, [], null, CFG);
  assert.equal(s1.response.data.opportunities[0].stage, 'Investigado');
  const r2 = rq('get_tasks', {});
  const s2 = shapeResponse(r2, buildCalls(r2, [], null, CFG), null, { statusCode: 200, body: { tasks: [{ title: '(Example) x', dueDate: '2026-10-08' }, { title: 'Llamar', dueDate: '2026-10-09T15:00:00Z', _id: 't1' }] } }, [], null, CFG);
  assert.equal(s2.response.data.count, 1);
  const s3 = shapeResponse(r2, buildCalls(r2, [], null, CFG), null, { statusCode: 401, body: {} }, [], null, CFG);
  assert.equal(s3.response.ok, false);
});
ok('shape: listas y get_prospect', () => {
  const rows = [{ company_name: 'Alfa', status: 'in_ghl', band: 'alta', priority_score: 85, ghl_stage: 'Investigado', ghl_opportunity_id: 'O1' }];
  const r = rq('list_pending_prospects', {});
  const s = shapeResponse(r, buildCalls(r, rows, null, CFG), null, null, rows, null, CFG);
  assert.equal(s.response.data.count, 1); assert.match(s.response.message, /Alfa \(85\)/);
  const e = shapeResponse(r, buildCalls(r, [], null, CFG), null, null, [], null, CFG);
  assert.match(e.response.message, /No hay prospectos/);
  const g = rq('get_prospect', { target: '1' });
  const sg = shapeResponse(g, buildCalls(g, [], A, CFG), null, null, [], A, CFG);
  assert.match(sg.response.message, /aún no está guardado/);
});

// --- saneo
ok('sanitize no filtra contenido de archivos', () => {
  const s = sanitize({ file_content: 'x'.repeat(5000), html: '<b>', prospects: [1, 2], note: 'ok', n: 3 });
  assert.equal(s.file_content_bytes, 5000); assert.equal(s.html_bytes, 3); assert.equal(s.prospects_count, 2); assert.ok(!('file_content' in s)); assert.equal(s.note, 'ok');
});
ok('el núcleo no contiene secretos', () => {
  const src = JSON.stringify([operatorTools(), parseRequest.toString(), buildCalls.toString()]);
  assert.ok(!/pit-[0-9a-f-]{20,}|eyJ[A-Za-z0-9_-]{20,}/.test(src));
});

console.log(n + ' ok');
