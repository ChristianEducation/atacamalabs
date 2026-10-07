import assert from 'node:assert/strict';
import * as li from './linkedin-core.mjs';

let n = 0;
const ok = (name, fn) => { try { fn(); n++; } catch (e) { console.error('FAIL', name, '\n', e.stack.split('\n').slice(0, 4).join('\n')); process.exitCode = 1; } };

const NOW = Date.parse('2026-10-08T15:00:00Z');
const URL1 = 'https://www.linkedin.com/in/daniel-colodro-ebner-46498527';
const cand = (o) => ({ id: 'c-1', company_name: 'Empresa Prueba SpA', status: 'in_ghl', ghl_stage: 'investigado', priority_score: 85, band: 'alta', website: 'https://prueba.cl', domain: 'prueba.cl', channel_state: {},
  canonical: { contact: { name: 'Daniel Colodro Ebner', role: 'Gerente Comercial', email: 'info@prueba.cl', linkedin: URL1, linkedin_source_url: 'https://prueba.cl/equipo', public: true } }, ...(o || {}) });
const CFG_TEST = { linkedin_mode: 'test', linkedin_test_list_id: 'LIST-TEST', linkedin_test_allowlist: [URL1], linkedin_daily_cap: 5 };
const CFG_LIVE = { linkedin_mode: 'live', linkedin_list_id: 'LIST-PROD', linkedin_campaign_id: 'CAMP-1', linkedin_daily_cap: 2, linkedin_test_allowlist: [] };
const rnd = () => 0.5;

ok('URL de LinkedIn: solo perfiles personales, normalizados', () => {
  assert.equal(li.normLinkedInUrl('https://cl.linkedin.com/in/Juan-Perez-123/?utm=1#x'), 'https://www.linkedin.com/in/juan-perez-123');
  assert.equal(li.normLinkedInUrl('linkedin.com/in/ana-gomez'), 'https://www.linkedin.com/in/ana-gomez');
  ['https://www.linkedin.com/company/acme', 'https://www.linkedin.com/sales/people/xyz', 'https://lnkd.in/abc', 'https://evil.com/linkedin.com/in/x', 'https://www.linkedin.com/in/', '', null].forEach((u) => assert.equal(li.normLinkedInUrl(u), null, String(u)));
});
ok('persona con nombre vs buzón/equipo genérico y cargo confiable', () => {
  assert.ok(li.isNamedPerson('Ignacio Vergara')); assert.ok(li.isNamedPerson('Dra. Nohemi Cortés'));
  ['Equipo Comercial Maxservicios', 'Contacto Laboratorio Pasteur', 'Sel-Otec Capacitación', 'Gerente', '', null].forEach((x) => assert.ok(!li.isNamedPerson(x), String(x)));
  assert.ok(li.isReliableRole('Gerente Comercial')); assert.ok(!li.isReliableRole('Dueño/a (nombre público NO ENCONTRADO)')); assert.ok(!li.isReliableRole('Director médico (inferencia)'));
});
ok('canal recomendado: LinkedIn solo con persona, cargo, perfil y evidencia; correo genérico cede ante una persona', () => {
  let r = li.recommendChannel(cand());
  assert.equal(r.channel, 'linkedin'); assert.ok(r.linkedin_ready && r.email_ready); assert.match(r.reason, /genérico/);
  r = li.recommendChannel(cand({ canonical: { contact: { name: 'Daniel Colodro Ebner', role: 'Gerente', email: 'daniel@prueba.cl', linkedin: URL1, linkedin_source_url: 'x', public: true } } }));
  assert.equal(r.channel, 'email', 'correo personal publicado gana');
  r = li.recommendChannel(cand({ canonical: { contact: { name: 'Equipo Comercial', role: 'Atención Comercial', email: 'contacto@prueba.cl', public: true } } }));
  assert.equal(r.channel, 'email'); assert.ok(!r.linkedin_ready); assert.match(r.reason, /falta/);
  r = li.recommendChannel(cand({ canonical: { contact: { name: 'Daniel Colodro Ebner', role: 'Gerente', linkedin: URL1 } } }));
  assert.equal(r.channel, 'none'); assert.match(r.missing.join(' '), /evidencia/);
  r = li.recommendChannel(cand({ canonical: { contact: { name: null, role: 'Dueño (NO ENCONTRADO)' } } }));
  assert.equal(r.channel, 'none'); assert.ok(r.missing.length >= 3);
});
ok('canal recomendado: descartado, ya contactado y correo suprimido', () => {
  assert.equal(li.recommendChannel(cand({ status: 'discarded' })).channel, 'none');
  const r = li.recommendChannel(cand({ last_contact_channel: 'email' })); assert.equal(r.channel, 'email'); assert.match(r.reason, /segundo canal/);
  const s = li.recommendChannel(cand({ canonical: { contact: { name: 'Equipo X', role: 'Ventas', email: 'ventas@prueba.cl', public: true } } }), { suppressedEmails: ['ventas@prueba.cl'] }); assert.equal(s.channel, 'none');
});
ok('búsqueda de candidato: id, dominio, nombre y ambigüedad', () => {
  const list = [cand(), cand({ id: 'c-2', company_name: 'Otra Empresa', domain: 'otra.cl', canonical: { contact: {} } }), cand({ id: 'c-3', company_name: 'Otra Empresa Dos', domain: 'dos.cl', canonical: { contact: {} } })];
  assert.equal(li.findCandidate(list, 'c-2').cand.id, 'c-2'); assert.equal(li.findCandidate(list, 'prueba.cl').cand.id, 'c-1'); assert.equal(li.findCandidate(list, 'empresa prueba spa').cand.id, 'c-1');
  assert.equal(li.findCandidate(list, URL1).cand.id, 'c-1');
  assert.equal(li.findCandidate(list, 'otra').error, 'ambiguo'); assert.equal(li.findCandidate(list, 'zzz').error, 'sin_coincidencia'); assert.equal(li.findCandidate(list, '').error, 'falta_target');
});

ok('aprobación: modo off muestra qué haría pero no emite código ni inserta', () => {
  const r = li.planLinkedinApprove({}, { now: NOW, candidate: cand(), config: { linkedin_mode: 'off' } });
  assert.equal(r.response.status, 'mode_off'); assert.equal(r.writes.length, 0); assert.ok(!r.waalaxy); assert.equal(r.response.summary.will_contact, false);
});
ok('aprobación en dos pasos (modo test): código → palabras de Christian → alta SOLO en lista de prueba y sin campaña', () => {
  const c = cand();
  const a = li.planLinkedinApprove({}, { now: NOW, candidate: c, config: CFG_TEST, rnd });
  assert.equal(a.response.status, 'confirmation_required'); assert.match(a.response.confirmation_code, /^LI-\d{6}$/); assert.equal(a.response.safety.linkedin_invites_sent, 0); assert.equal(a.response.summary.will_contact, false); assert.equal(a.response.summary.list_id, 'LIST-TEST');
  const stored = a.writes[0].body.channel_state;
  assert.equal(stored.linkedin.state, 'aprobacion_pendiente');
  const withCode = { ...c, channel_state: stored };
  let b = li.planLinkedinApprove({ confirmation_code: 'LI-000000', order_text: 'sí, hazlo' }, { now: NOW, candidate: withCode, config: CFG_TEST });
  assert.equal(b.response.error, 'codigo_invalido');
  b = li.planLinkedinApprove({ confirmation_code: a.response.confirmation_code, order_text: 'ok' }, { now: NOW + 31 * 60000, candidate: withCode, config: CFG_TEST }); assert.equal(b.response.error, 'codigo_vencido');
  b = li.planLinkedinApprove({ confirmation_code: a.response.confirmation_code, order_text: '' }, { now: NOW + 60000, candidate: withCode, config: CFG_TEST }); assert.equal(b.response.error, 'falta_orden');
  b = li.planLinkedinApprove({ confirmation_code: a.response.confirmation_code, order_text: 'Sí, apruebo el alta de prueba' }, { now: NOW + 60000, candidate: withCode, config: CFG_TEST });
  assert.equal(b.response.status, 'approved_pending_import'); assert.equal(b.waalaxy.body.prospectListId, 'LIST-TEST'); assert.ok(!('campaignId' in b.waalaxy.body)); assert.equal(b.waalaxy.body.canCreateDuplicates, false); assert.equal(b.waalaxy.body.origin.name, 'n8n');
  assert.equal(b.waalaxy.body.prospects[0].url, URL1); assert.equal(b.waalaxy.body.prospects[0].customProfile.firstName, 'Daniel'); assert.equal(b.waalaxy.body.prospects[0].customVariables[0].value, 'c-1');
  const changed = { ...withCode, canonical: { contact: { ...withCode.canonical.contact, role: 'Otro cargo' } } };
  assert.equal(li.planLinkedinApprove({ confirmation_code: a.response.confirmation_code, order_text: 'sí' }, { now: NOW + 60000, candidate: changed, config: CFG_TEST }).response.error, 'contenido_cambio');
});
ok('aprobación: modo test rechaza perfiles fuera de la lista blanca; LinkedIn no listo y conflicto con correo', () => {
  const other = cand({ canonical: { contact: { name: 'Pedro Soto Rojas', role: 'Gerente', linkedin: 'https://www.linkedin.com/in/pedro-soto', linkedin_source_url: 'x' } } });
  assert.equal(li.planLinkedinApprove({}, { now: NOW, candidate: other, config: CFG_TEST }).response.error, 'fuera_de_allowlist');
  assert.equal(li.planLinkedinApprove({}, { now: NOW, candidate: cand({ canonical: { contact: { name: 'Equipo', email: 'a@b.cl' } } }), config: CFG_TEST }).response.error, 'linkedin_no_listo');
  assert.equal(li.planLinkedinApprove({}, { now: NOW, candidate: cand(), config: CFG_TEST, emailActive: true }).response.error, 'canal_email_activo');
  assert.equal(li.planLinkedinApprove({}, { now: NOW, candidate: cand({ status: 'discarded' }), config: CFG_TEST }).response.error, 'descartado');
});
ok('aprobación live: campaña de producción, tope diario y no repetir alta', () => {
  const c = cand();
  const a = li.planLinkedinApprove({}, { now: NOW, candidate: c, config: CFG_LIVE, rnd });
  assert.equal(a.response.summary.will_contact, true); assert.equal(a.response.summary.campaign_id, 'CAMP-1');
  const wc = { ...c, channel_state: a.writes[0].body.channel_state };
  const capped = li.planLinkedinApprove({ confirmation_code: a.response.confirmation_code, order_text: 'sí, adelante' }, { now: NOW + 1000, candidate: wc, config: CFG_LIVE, importedToday: 2 });
  assert.equal(capped.response.error, 'tope_diario');
  const done = li.planLinkedinApprove({ confirmation_code: a.response.confirmation_code, order_text: 'sí, adelante' }, { now: NOW + 1000, candidate: wc, config: CFG_LIVE, importedToday: 1 });
  assert.equal(done.waalaxy.body.campaignId, 'CAMP-1');
  const again = li.planLinkedinApprove({}, { now: NOW, candidate: { ...c, channel_state: { linkedin: { state: 'en_campana' } } }, config: CFG_LIVE });
  assert.equal(again.response.error, 'ya_en_linkedin');
});
ok('resultado de Waalaxy: lista sin campaña, campaña en live, duplicado, errores conocidos y 429', () => {
  const c = cand({ channel_state: { linkedin: { state: 'aprobacion_pendiente', events: [] } } });
  const wx = { url: URL1, person: 'Daniel Colodro Ebner', role: 'Gerente Comercial', list_id: 'LIST-TEST', campaign_id: null, by: 'Christian vía Hermes', mode: 'test' };
  let r = li.applyWaalaxyResult(c, wx, { statusCode: 200, body: { result: [{ importCode: 'success', prospect: { _id: 'P1' } }] } }, NOW);
  assert.equal(r.state, 'en_lista'); assert.ok(r.ok); assert.equal(r.waalaxy_prospect_id, 'P1'); assert.equal(r.effects[0].act.type, 'add_note'); assert.match(r.effects[0].act.note, /SIN campaña/);
  assert.equal(r.writes[0].body.channel_state.linkedin.confirm, null); assert.equal(r.writes[0].body.channel_state.approved_channel, 'linkedin'); assert.ok(!('last_contact_channel' in r.writes[0].body));
  r = li.applyWaalaxyResult(c, { ...wx, campaign_id: 'CAMP-1', mode: 'live' }, { statusCode: 200, body: { result: [{ importCode: 'success', addToCampaignCode: 'success', prospect: { _id: 'P2' } }] } }, NOW);
  assert.equal(r.state, 'en_campana'); assert.equal(r.writes[0].body.last_contact_channel, 'linkedin'); assert.equal(r.effects[0].act.type, 'mark_contacted'); assert.equal(r.effects[0].act.channel, 'linkedin'); assert.ok(!/PRUEBA/.test(r.effects[0].act.note));
  r = li.applyWaalaxyResult(c, { ...wx, campaign_id: 'CAMP-1', mode: 'test' }, { statusCode: 200, body: { result: [{ importCode: 'success', addToCampaignCode: 'success', prospect: { _id: 'P3' } }] } }, NOW);
  assert.match(r.effects[0].act.note, /^\[PRUEBA\]/); assert.ok(!('last_contact_channel' in r.writes[0].body));
  r = li.applyWaalaxyResult(c, wx, { statusCode: 200, body: { result: [{ importCode: 'duplicated_prospect', message: 'x', prospect: { _id: 'P1' } }] } }, NOW);
  assert.equal(r.state, 'en_lista'); assert.match(r.message, /Ya existía/);
  r = li.applyWaalaxyResult(c, wx, { statusCode: 200, body: { result: [{ importCode: 'max_limit_crm' }] } }, NOW); assert.equal(r.state, 'error'); assert.ok(!r.ok);
  r = li.applyWaalaxyResult(c, wx, { statusCode: 401, body: { code: 'M000401-001' } }, NOW); assert.equal(r.state, 'error'); assert.match(r.message, /permisos/);
  r = li.applyWaalaxyResult(c, wx, { statusCode: 429, body: {} }, NOW); assert.match(r.message, /429|limit/i);
  r = li.applyWaalaxyResult(c, wx, { statusCode: 404, body: { code: 'R000404-002' } }, NOW); assert.match(r.message, /lista/);
});
ok('eventos manuales: respondió detiene seguimientos y mueve a Respondió; no retrocede; exige texto', () => {
  const base = cand({ channel_state: { approved_channel: 'linkedin', linkedin: { state: 'en_campana', person: 'Daniel Colodro Ebner', role: 'Gerente', events: [] } } });
  let r = li.planLinkedinEvent({ event: 'conexion_aceptada' }, { now: NOW, candidate: base });
  assert.equal(r.response.state, 'conexion'); assert.ok(!r.response.stop_followups); assert.equal(r.effects[0].act.type, 'add_note');
  const c2 = { ...base, channel_state: r.writes[0].body.channel_state };
  r = li.planLinkedinEvent({ event: 'mensaje_enviado' }, { now: NOW, candidate: c2 }); assert.equal(r.response.state, 'mensaje');
  assert.equal(li.planLinkedinEvent({ event: 'conexion_aceptada' }, { now: NOW, candidate: { ...base, channel_state: r.writes[0].body.channel_state } }).response.error, 'retroceso');
  assert.equal(li.planLinkedinEvent({ event: 'respondio' }, { now: NOW, candidate: base }).response.error, 'falta_texto');
  r = li.planLinkedinEvent({ event: 'respondio', note: 'Me interesa, ¿hablamos el jueves?' }, { now: NOW, candidate: base });
  assert.equal(r.response.state, 'respondio'); assert.ok(r.response.stop_followups); assert.equal(r.effects[0].act.type, 'move_stage'); assert.equal(r.effects[0].act.stage, 'respondio');
  assert.equal(r.writes[0].body.ghl_stage, 'respondio'); assert.equal(r.writes[0].body.next_action_at, null); assert.equal(r.writes[0].body.channel_state.linkedin.reply.text, 'Me interesa, ¿hablamos el jueves?');
  r = li.planLinkedinEvent({ event: 'rechazo', note: 'no por ahora' }, { now: NOW, candidate: base }); assert.equal(r.response.state, 'rechazo'); assert.ok(r.response.stop_followups);
  r = li.planLinkedinEvent({ event: 'detener' }, { now: NOW, candidate: base }); assert.equal(r.response.state, 'detenido');
  assert.equal(li.planLinkedinEvent({ event: 'volar' }, { now: NOW, candidate: base }).response.error, 'evento_invalido');
  assert.equal(li.planLinkedinEvent({ event: 'respondio', note: 'hola' }, { now: NOW, candidate: cand() }).response.error, 'no_esta_en_linkedin');
});
ok('recomendación guardada y resumen para /ops y Hermes', () => {
  const r = li.planRecommend({}, { now: NOW, candidate: cand() });
  assert.equal(r.response.recommendation.channel, 'linkedin'); assert.equal(r.writes[0].body.channel_state.recommended.channel, 'linkedin');
  const withRec = cand({ channel_state: r.writes[0].body.channel_state });
  const pend = cand({ id: 'c-2', company_name: 'B', channel_state: { linkedin: { state: 'aprobacion_pendiente', last_event_at: '2026-10-08T14:00:00Z' } } });
  const resp = cand({ id: 'c-3', company_name: 'C', channel_state: { linkedin: { state: 'respondio', last_event_at: '2026-10-08T14:30:00Z', reply: { text: 'hola' } } } });
  const err = cand({ id: 'c-4', company_name: 'D', channel_state: { linkedin: { state: 'error' } } });
  const ov = li.linkedinOverview([withRec, pend, resp, err, cand({ id: 'c-5', channel_state: {} })], NOW);
  assert.equal(ov.counts.pendiente, 1); assert.equal(ov.counts.respondio, 1); assert.equal(ov.counts.error, 1); assert.equal(ov.ready_for_linkedin, 1); assert.equal(ov.total, 4);
  assert.equal(ov.rows[0].company, 'C'); assert.equal(li.linkedinView(resp).state_label, 'Respondió');
  assert.equal(li.planRecommend({}, { now: NOW, candidate: null }).response.error, 'sin_candidato');
});
ok('el núcleo no contiene secretos ni constantes de módulo', () => {
  const src = Object.values(li).filter((f) => typeof f === 'function').map((f) => f.toString()).join('\n');
  assert.ok(!/pit-[0-9a-f-]{20,}|eyJ[A-Za-z0-9_-]{20,}|Bearer\s+[A-Za-z0-9]{16,}/.test(src));
});
console.log(n + ' ok');
