import assert from 'node:assert/strict';
import * as oc from './outreach-core.mjs';

let n = 0;
const ok = (name, fn) => { try { fn(); n++; } catch (e) { console.error('FAIL', name, '\n', e.stack.split('\n').slice(0, 4).join('\n')); process.exitCode = 1; } };

const CFG = { mode: 'live', paused: false, from_email: 'christian@atacamalabs.cl', from_name: 'Christian Wevar', daily_cap: 3, window_start: '09:00', window_end: '17:30', tz: 'America/Santiago', legal_footer: null };
const WED = Date.parse('2026-10-07T15:00:00Z');   // miércoles 12:00 Chile (UTC-3)
const SAT = Date.parse('2026-10-10T15:00:00Z');
const LATE = Date.parse('2026-10-07T21:30:00Z');  // 18:30 Chile
const BODY = 'Hola Dra. Pérez, vi que Clínica Rica agenda por WhatsApp y formulario en dos sedes. En Atacama Labs armamos agentes que ordenan esa recepción. ¿Te muestro un ejemplo en 10 minutos?';
const cand = (o) => ({ id: 'c-1', company_name: 'Clínica Rica', status: 'in_ghl', ghl_contact_id: 'G1', ghl_opportunity_id: 'O1', ghl_stage: 'investigado', canonical: { contact: { email: 'dra@clinicarica.cl' } }, drafts: { email_subject: 'Una idea para Clínica Rica', email_body: BODY }, ...(o || {}) });

ok('hash y contentHash: cambia con cualquier edición', () => {
  const a = oc.contentHash('a@x.cl', 'Asunto', BODY);
  assert.equal(a.length, 16); assert.equal(a, oc.contentHash('A@X.cl ', 'Asunto', BODY + ' '));
  assert.notEqual(a, oc.contentHash('a@x.cl', 'Asunto', BODY + '.')); assert.notEqual(a, oc.contentHash('b@x.cl', 'Asunto', BODY));
});
ok('emails', () => { assert.equal(oc.normEmail(' Mailto:Ana@X.CL '), 'ana@x.cl'); assert.ok(oc.isValidEmail('a@b.cl')); assert.ok(!oc.isValidEmail('a@b')); assert.equal(oc.emailDomain('a@Clinica.cl'), 'clinica.cl'); });
ok('suppression por correo y por dominio', () => {
  const list = [{ email: 'x@a.cl', reason: 'unsubscribe' }, { domain: 'mala.cl', reason: 'bounce' }];
  assert.equal(oc.checkSuppression('X@A.cl', list).reason, 'unsubscribe'); assert.equal(oc.checkSuppression('z@mala.cl', list).by, 'domain'); assert.equal(oc.checkSuppression('z@ok.cl', list), null);
});
ok('ventana de envío (Chile)', () => {
  assert.ok(oc.inSendWindow(WED, CFG)); assert.ok(!oc.inSendWindow(SAT, CFG)); assert.ok(!oc.inSendWindow(LATE, CFG));
  const fri = Date.parse('2026-10-09T22:00:00Z'); const nx = oc.nextWindowStart(fri, CFG);
  assert.equal(new Date(nx).toISOString(), '2026-10-12T12:00:00.000Z');  // lunes 09:00 Chile
  assert.equal(oc.nextWindowStart(WED, CFG), WED);
});
ok('días hábiles', () => {
  assert.equal(oc.addBusinessDaysIso(WED, 3, CFG.tz).slice(0, 10), '2026-10-12');   // mié + 3 háb = lun
  assert.equal(oc.addBusinessDaysIso(WED, 0, CFG.tz).slice(0, 10), '2026-10-07');
  assert.equal(oc.zonedParts(WED, CFG.tz).dow, 3);
});
ok('inicio del día en Chile', () => { const s = oc.startOfZonedDay(WED, CFG.tz); assert.equal(new Date(s).toISOString(), '2026-10-07T03:00:00.000Z'); });

ok('newText recorta citas', () => {
  assert.equal(oc.newText('Gracias, me interesa.\n\nEl mar, 6 oct 2026 escribió:\n> hola'), 'Gracias, me interesa.');
  assert.equal(oc.newText('Sí\n> citado\n'), 'Sí');
});
ok('clasificación de entrantes', () => {
  const c = (m) => oc.classifyInbound(m, 'christian@atacamalabs.cl').cls;
  assert.equal(c({ from: 'Christian <christian@atacamalabs.cl>', subject: 'x', body: 'y' }), 'own');
  assert.equal(c({ from: 'Mail Delivery Subsystem <mailer-daemon@googlemail.com>', subject: 'Delivery Status Notification (Failure)', body: 'Address not found. dra@clinicarica.cl 550 5.1.1 user unknown' }), 'bounce');
  assert.equal(oc.classifyInbound({ from: 'mailer-daemon@x.com', subject: 'Undeliverable', body: 'The response from the remote server was: 550 5.1.1 user unknown\nto: <dra@clinicarica.cl>' }, 'a@b.cl').failed_recipient, 'dra@clinicarica.cl');
  assert.equal(c({ from: 'dra@clinicarica.cl', subject: 'Respuesta automática: Una idea', body: 'Estoy fuera de la oficina hasta el lunes' }), 'auto_reply');
  assert.equal(c({ from: 'dra@clinicarica.cl', subject: 'Re: x', body: 'hola', headers: { 'Auto-Submitted': 'auto-replied' } }), 'auto_reply');
  assert.equal(c({ from: 'dra@clinicarica.cl', subject: 'Re: x', body: 'Por favor no me escriban más.\n\nEl mar escribió:\n> ...' }), 'unsubscribe');
  assert.equal(c({ from: 'dra@clinicarica.cl', subject: 'Re: x', body: 'Baja' }), 'unsubscribe');
  assert.equal(c({ from: 'dra@clinicarica.cl', subject: 'Re: x', body: 'Gracias, pero no nos interesa por ahora.' }), 'decline');
  assert.equal(c({ from: 'dra@clinicarica.cl', subject: 'Re: x', body: 'Hola Christian, me interesa. ¿Puedes llamarme mañana?' }), 'reply');
  assert.equal(c({ from: 'dra@clinicarica.cl', subject: 'Re: x', body: 'Tenemos baja demanda en verano, pero sí me interesa ver el ejemplo.' }), 'reply');
});
ok('validateDraft', () => {
  const good = { to_email: 'dra@clinicarica.cl', subject: 'Una idea para Clínica Rica', body: BODY };
  assert.ok(oc.validateDraft(good, {}).ok);
  assert.ok(!oc.validateDraft({ ...good, body: 'corto' }, {}).ok);
  assert.ok(!oc.validateDraft({ ...good, to_email: 'sin-arroba' }, {}).ok);
  assert.ok(!oc.validateDraft({ ...good, body: BODY + ' Hola [Nombre]' }, {}).ok);
  assert.ok(!oc.validateDraft({ ...good, body: BODY + ' {{empresa}}' }, {}).ok);
  assert.ok(!oc.validateDraft({ ...good, body: BODY + ' https://a.cl https://b.cl' }, {}).ok);
  assert.ok(!oc.validateDraft({ ...good, subject: 'GRATIS!!! oferta' }, {}).ok);
  assert.match(oc.validateDraft(good, { suppression: [{ email: 'dra@clinicarica.cl', reason: 'unsubscribe' }] }).errors[0], /suprimido/);
  assert.ok(!oc.validateDraft(good, { allowed_emails: ['otro@clinicarica.cl'] }).ok);
  assert.ok(oc.validateDraft(good, { allowed_emails: ['otro@clinicarica.cl'], override_to: true }).ok);
});
ok('buildMime: cabeceras, UTF-8 y encadenado', () => {
  const m = oc.buildMime({ from: 'christian@atacamalabs.cl', from_name: 'Christian Wevar', to: 'dra@clinicarica.cl', subject: 'Una idea ñandú', text: 'Hola ñ', in_reply_to: '<abc@x.cl>', now: WED });
  const raw = Buffer.from(m.raw.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
  assert.match(raw, /^From: Christian Wevar <christian@atacamalabs.cl>/m); assert.match(raw, /^To: dra@clinicarica.cl/m); assert.match(raw, /^Subject: =\?UTF-8\?B\?/m);
  assert.match(raw, /^List-Unsubscribe: <mailto:christian@atacamalabs.cl\?subject=baja>/m); assert.match(raw, /^In-Reply-To: <abc@x.cl>/m); assert.match(raw, /^Message-ID: <[0-9a-f-]+@atacamalabs.cl>/m);
  const body = raw.split('\r\n\r\n')[1].replace(/\r\n/g, '');
  assert.equal(Buffer.from(body, 'base64').toString('utf8'), 'Hola ñ');
});

// ---------- planDraft
ok('draft desde el borrador del Gateway; un solo borrador vivo por tipo', () => {
  const r = oc.planDraft({ kind: 'initial', by: 'Christian vía Hermes' }, { now: WED, candidate: cand(), history: [], suppression: [], new_id: 'm-1', config: CFG });
  assert.equal(r.response.status, 'created'); assert.equal(r.writes[0].method, 'POST'); assert.equal(r.writes[0].body.status, 'draft'); assert.equal(r.writes[0].body.to_email, 'dra@clinicarica.cl'); assert.equal(r.writes[0].body.content_hash.length, 16);
  assert.match(r.response.message, /NO enviado/);
  const again = oc.planDraft({ kind: 'initial', by: 'x' }, { now: WED, candidate: cand(), history: [r.message], suppression: [], new_id: 'm-2', config: CFG });
  assert.equal(again.response.status, 'updated'); assert.equal(again.writes[0].method, 'PATCH'); assert.ok(again.writes[0].path.endsWith('m-1'));
});
ok('draft: errores (sin candidato, descartado, suprimido, sin correo, ya enviado, seguimiento sin primer correo)', () => {
  const run = (c, h, sup, req) => oc.planDraft({ kind: 'initial', ...(req || {}) }, { now: WED, candidate: c, history: h || [], suppression: sup || [], new_id: 'm-1', config: CFG });
  assert.equal(run(null).response.error, 'candidato_no_encontrado');
  assert.equal(run(cand({ status: 'discarded' })).response.error, 'descartado');
  assert.equal(run(cand(), [], [{ email: 'dra@clinicarica.cl', reason: 'bounce' }]).response.error, 'borrador_invalido');
  assert.equal(run(cand({ canonical: {} })).response.error, 'borrador_invalido');
  assert.equal(run(cand(), [{ id: 'x', kind: 'initial', direction: 'outbound', status: 'sent', to_email: 'dra@clinicarica.cl' }]).response.error, 'ya_enviado');
  assert.equal(run(cand(), [], [], { kind: 'followup_1' }).response.error, 'sin_primer_correo');
  assert.equal(run(cand({ drafts: null }), []).response.error, 'sin_contenido');
});
ok('edición tras aprobar anula la aprobación', () => {
  const live = { id: 'm-1', kind: 'initial', direction: 'outbound', status: 'approved', to_email: 'dra@clinicarica.cl', subject: 'Una idea para Clínica Rica', body: BODY, content_hash: oc.contentHash('dra@clinicarica.cl', 'Una idea para Clínica Rica', BODY) };
  const r = oc.planDraft({ kind: 'initial', body: BODY + ' Saludos.' }, { now: WED, candidate: cand(), history: [live], suppression: [], new_id: 'x', config: CFG });
  assert.equal(r.response.approval_invalidated, true); assert.equal(r.writes[0].body.status, 'draft'); assert.equal(r.writes[0].body.approved_at, null);
});
ok('seguimiento: plantilla editable tras el primer envío; respuesta requiere entrante', () => {
  const first = { id: 'a', kind: 'initial', direction: 'outbound', status: 'sent', to_email: 'dra@clinicarica.cl', subject: 'Una idea', gmail_thread_id: 'T1', rfc_message_id: '<r1@x>' };
  const f = oc.planDraft({ kind: 'followup_1' }, { now: WED, candidate: cand(), history: [first], suppression: [], new_id: 'f-1', config: CFG });
  assert.equal(f.response.status, 'created'); assert.equal(f.message.gmail_thread_id, 'T1'); assert.equal(f.message.in_reply_to, '<r1@x>'); assert.match(f.message.subject, /^Re: /);
  assert.equal(oc.planDraft({ kind: 'reply', body: BODY }, { now: WED, candidate: cand(), history: [first], suppression: [], new_id: 'r', config: CFG }).response.error, 'sin_respuesta_previa');
  const inb = { id: 'i', kind: 'other', direction: 'inbound', status: 'received', gmail_thread_id: 'T1', rfc_message_id: '<i1@x>', created_at: '2026-10-08T00:00:00Z' };
  const r = oc.planDraft({ kind: 'reply', body: BODY, subject: 'Re: Una idea' }, { now: WED, candidate: cand(), history: [first, inb], suppression: [], new_id: 'r', config: CFG });
  assert.equal(r.response.status, 'created'); assert.equal(r.message.in_reply_to, '<i1@x>'); assert.equal(r.message.gmail_thread_id, 'T1');
});

// ---------- planApprove (nivel 3 con código del servidor)
const live0 = () => ({ id: 'm-1', kind: 'initial', direction: 'outbound', status: 'draft', candidate_id: 'c-1', company_name: 'Clínica Rica', to_email: 'dra@clinicarica.cl', subject: 'Una idea para Clínica Rica', body: BODY, content_hash: oc.contentHash('dra@clinicarica.cl', 'Una idea para Clínica Rica', BODY) });
ok('aprobar: sin código → confirmation_required con vista previa; no cambia el estado', () => {
  const r = oc.planApprove({ by: 'Christian vía Hermes' }, { now: WED, candidate: cand(), history: [live0()], suppression: [], config: CFG, rnd: () => 0.5 });
  assert.equal(r.response.status, 'confirmation_required'); assert.match(r.response.confirmation_code, /^CONF-\d{6}$/); assert.equal(r.response.safety.messages_sent, 0);
  assert.ok(r.response.preview.rendered.includes('responde «baja»')); assert.equal(r.writes[0].body.confirm_code, r.response.confirmation_code); assert.ok(!('status' in r.writes[0].body));
});
ok('aprobar: con código correcto y orden → approved y programado en ventana; código de un solo uso', () => {
  const l = { ...live0(), confirm_code: 'CONF-123456', confirm_hash: live0().content_hash, confirm_expires_at: new Date(WED + 600000).toISOString() };
  const r = oc.planApprove({ by: 'Christian vía Hermes', confirmation_code: 'CONF-123456', order_text: 'Sí, envíalo' }, { now: WED, candidate: cand(), history: [l], suppression: [], config: CFG });
  assert.equal(r.response.status, 'approved'); assert.equal(r.writes[0].body.status, 'approved'); assert.equal(r.writes[0].body.confirm_code, null); assert.equal(r.writes[0].body.approval_text, 'Sí, envíalo'); assert.ok(r.writes[0].path.includes('status=eq.draft'));
  assert.equal(r.writes[0].body.scheduled_for, new Date(WED).toISOString());
  const sat = oc.planApprove({ confirmation_code: 'CONF-123456', order_text: 'Sí, envíalo' }, { now: SAT, candidate: cand(), history: [{ ...l, confirm_expires_at: new Date(SAT + 600000).toISOString() }], suppression: [], config: CFG });
  assert.equal(sat.writes[0].body.scheduled_for, '2026-10-12T12:00:00.000Z');
});
ok('aprobar: código inválido, vencido, contenido cambiado, sin orden, suprimido, descartado', () => {
  const l = { ...live0(), confirm_code: 'CONF-123456', confirm_hash: live0().content_hash, confirm_expires_at: new Date(WED + 600000).toISOString() };
  const ap = (o, l2, c2, sup) => oc.planApprove({ confirmation_code: 'CONF-123456', order_text: 'Sí, envíalo', ...(o || {}) }, { now: WED, candidate: c2 || cand(), history: [l2 || l], suppression: sup || [], config: CFG }).response;
  assert.equal(ap({ confirmation_code: 'CONF-000000' }).status, 'invalid_code');
  assert.equal(ap({}, { ...l, confirm_expires_at: new Date(WED - 1000).toISOString() }).status, 'expired_code');
  assert.equal(ap({}, { ...l, body: BODY + ' cambio', content_hash: oc.contentHash(l.to_email, l.subject, BODY + ' cambio') }).status, 'content_changed');
  assert.equal(ap({ order_text: '' }).status, 'needs_explicit_order');
  assert.equal(ap({}, null, null, [{ email: 'dra@clinicarica.cl', reason: 'unsubscribe' }]).status, 'invalid_draft');
  assert.equal(ap({}, null, cand({ status: 'discarded' })).error, 'descartado');
  assert.equal(oc.planApprove({}, { now: WED, candidate: cand(), history: [], suppression: [], config: CFG }).response.error, 'sin_borrador');
  assert.equal(oc.planApprove({}, { now: WED, candidate: cand(), history: [live0(), { ...live0(), id: 'm-2', kind: 'followup_1' }], suppression: [], config: CFG }).response.error, 'varios_borradores');
});
ok('cancelar', () => {
  const r = oc.planCancel({}, { now: WED, candidate: cand(), history: [{ ...live0(), status: 'approved' }] });
  assert.equal(r.response.status, 'cancelled'); assert.equal(r.writes[0].body.status, 'cancelled');
  assert.equal(oc.planCancel({}, { now: WED, candidate: cand(), history: [] }).response.status, 'not_found');
});

// ---------- pickDue
const appr = (o) => ({ ...live0(), status: 'approved', scheduled_for: new Date(WED - 1000).toISOString(), ...(o || {}) });
ok('pickDue: modos, pausa, ventana, tope', () => {
  const cb = { 'c-1': cand() };
  assert.equal(oc.pickDue([appr()], { ...CFG, mode: 'off' }, WED, 0, [], cb).action, 'none');
  assert.equal(oc.pickDue([appr()], { ...CFG, paused: true }, WED, 0, [], cb).action, 'none');
  assert.match(oc.pickDue([appr()], CFG, SAT, 0, [], cb).reason, /ventana/);
  assert.match(oc.pickDue([appr()], CFG, LATE, 0, [], cb).reason, /ventana/);
  assert.match(oc.pickDue([appr()], CFG, WED, 3, [], cb).reason, /tope diario/);
  assert.equal(oc.pickDue([appr()], CFG, WED, 2, [], cb).action, 'send');
  assert.equal(oc.pickDue([appr({ scheduled_for: new Date(WED + 60000).toISOString() })], CFG, WED, 0, [], cb).action, 'none');
  assert.equal(oc.pickDue([], CFG, WED, 0, [], cb).action, 'none');
});
ok('pickDue: cancela suprimidos, descartados, contenido alterado, seguimiento tras respuesta', () => {
  const cb = { 'c-1': cand() };
  assert.equal(oc.pickDue([appr()], CFG, WED, 0, [{ domain: 'clinicarica.cl', reason: 'bounce' }], cb).action, 'cancel');
  assert.equal(oc.pickDue([appr()], CFG, WED, 0, [], { 'c-1': cand({ status: 'discarded' }) }).action, 'cancel');
  assert.match(oc.pickDue([appr({ body: BODY + ' x' })], CFG, WED, 0, [], cb).reason, /cambió/);
  assert.match(oc.pickDue([appr({ kind: 'followup_1' })], CFG, WED, 0, [], cb, { 'c-1': true }).reason, /respondió/);
  assert.equal(oc.pickDue([appr({ kind: 'followup_1' })], CFG, WED, 0, [], cb, {}).action, 'send');
});
ok('pickDue: TEST solo en test_sim, nunca en live; uno por corrida y en orden', () => {
  const t = appr({ company_name: 'Clínica TEST' });
  assert.equal(oc.pickDue([t], CFG, WED, 0, [], { 'c-1': cand({ company_name: 'Clínica TEST' }) }).action, 'none');
  assert.equal(oc.pickDue([t], { ...CFG, mode: 'test_sim' }, WED, 0, [], { 'c-1': cand({ company_name: 'Clínica TEST' }) }).action, 'send');
  assert.equal(oc.pickDue([appr()], { ...CFG, mode: 'test_sim' }, WED, 0, [], { 'c-1': cand() }).action, 'none');
  const a = appr({ id: 'a', candidate_id: 'c-a', scheduled_for: new Date(WED - 5000).toISOString() }), b = appr({ id: 'b', candidate_id: 'c-b', scheduled_for: new Date(WED - 9000).toISOString() });
  assert.equal(oc.pickDue([a, b], CFG, WED, 0, [], { 'c-a': cand({ id: 'c-a' }), 'c-b': cand({ id: 'c-b' }) }).message.id, 'b');
});

// ---------- planSendResult / planInbound
ok('envío exitoso: Supabase + Contactado en GHL con nota; dry_run no toca GHL; fallo marca failed', () => {
  const m = { ...appr(), approved_by: 'Christian vía Hermes' };
  const r = oc.planSendResult(m, cand(), CFG, { ok: true, gmail_message_id: 'g1', gmail_thread_id: 't1', rfc_message_id: '<r@x>' }, WED);
  assert.equal(r.update.status, 'sent'); assert.equal(r.update.effect_key, 'send:m-1'); assert.equal(r.update.gmail_thread_id, 't1');
  assert.equal(r.effects[0].act.type, 'mark_contacted'); assert.equal(r.effects[0].act.follow_up_days, 0); assert.ok(r.writes.some((w) => w.path.startsWith('prospect_candidates') && w.body.status === 'contacted' && w.body.ghl_stage === 'contactado'));
  assert.ok(!r.update.effect_key || r.update.effect_key.startsWith('send:'));
  const d = oc.planSendResult(m, cand(), { ...CFG, mode: 'dry_run' }, { ok: true }, WED);
  assert.equal(d.update.status, 'dry_run'); assert.equal(d.effects.length, 0); assert.ok(!d.writes.some((w) => w.path.startsWith('prospect_candidates')));
  const f = oc.planSendResult(m, cand(), CFG, { ok: false, error: 'quota' }, WED);
  assert.equal(f.update.status, 'failed'); assert.equal(f.effects.length, 0);
  assert.match(oc.planSendResult(m, cand(), { ...CFG, mode: 'test_sim' }, { ok: true }, WED).effects[0].act.note, /SIMULADO/);
});
const sent = () => ({ id: 'm-1', candidate_id: 'c-1', company_name: 'Clínica Rica', to_email: 'dra@clinicarica.cl', kind: 'initial' });
const inbound = (o) => ({ id: 'g9', thread_id: 't1', from: 'Dra <dra@clinicarica.cl>', subject: 'Re: Una idea', body: 'Hola, me interesa. ¿Hablamos mañana?', date: '2026-10-08T14:00:00Z', ...(o || {}) });
ok('entrante: respuesta → Respondió + nota + detiene seguimiento; idempotente por effect_key', () => {
  const cls = oc.classifyInbound(inbound(), CFG.from_email);
  const p = oc.planInbound(inbound(), cls, sent(), cand(), WED);
  assert.equal(p.row.effect_key, 'recv:g9'); assert.equal(p.row.direction, 'inbound'); assert.equal(p.row.classification, 'reply'); assert.equal(p.stop_followups, true);
  assert.equal(p.effects[0].act.stage, 'respondio'); assert.match(p.effects[0].act.note, /RESPUESTA por correo/); assert.equal(p.writes[0].prefer, 'resolution=ignore-duplicates,return=minimal');
});
ok('entrante: baja → suprimir + descartar + DND; rebote → suprimir y detener; auto-respuesta → no detiene; rechazo → detiene sin suprimir', () => {
  const u = oc.planInbound(inbound({ body: 'No me escriban más por favor' }), oc.classifyInbound(inbound({ body: 'No me escriban más por favor' }), CFG.from_email), sent(), cand(), WED);
  assert.ok(u.writes.some((w) => w.path.startsWith('outreach_suppression') && w.body.reason === 'unsubscribe')); assert.ok(u.effects.some((e) => e.act.type === 'discard')); assert.equal(u.stop_followups, true);
  const bm = inbound({ from: 'mailer-daemon@googlemail.com', subject: 'Delivery Status Notification (Failure)', body: 'Address not found\nto: <dra@clinicarica.cl>\n550 5.1.1 user unknown' });
  const b = oc.planInbound(bm, oc.classifyInbound(bm, CFG.from_email), sent(), cand(), WED);
  assert.ok(b.writes.some((w) => w.path.startsWith('outreach_suppression') && w.body.email === 'dra@clinicarica.cl' && w.body.reason === 'bounce')); assert.equal(b.stop_followups, true);
  const am = inbound({ subject: 'Respuesta automática', body: 'Estoy fuera de la oficina' });
  const a = oc.planInbound(am, oc.classifyInbound(am, CFG.from_email), sent(), cand(), WED);
  assert.equal(a.stop_followups, false); assert.equal(a.effects.length, 0);
  const dm = inbound({ body: 'Gracias, pero no nos interesa.' });
  const d = oc.planInbound(dm, oc.classifyInbound(dm, CFG.from_email), sent(), cand(), WED);
  assert.equal(d.stop_followups, true); assert.ok(!d.writes.some((w) => w.path.startsWith('outreach_suppression')));
});

ok('parseGmailThread: texto plano, html, cabeceras y fecha', () => {
  const b64 = (t) => Buffer.from(t, 'utf8').toString('base64url');
  const thread = { id: 't1', messages: [
    { id: 'g1', threadId: 't1', internalDate: String(WED), snippet: 'hola', labelIds: ['SENT'], payload: { mimeType: 'multipart/alternative', headers: [{ name: 'From', value: 'christian@atacamalabs.cl' }, { name: 'Message-ID', value: '<r1@x>' }], parts: [{ mimeType: 'text/plain', body: { data: b64('Hola ñ') } }] } },
    { id: 'g2', threadId: 't1', internalDate: String(WED + 1000), payload: { mimeType: 'multipart/mixed', headers: [{ name: 'From', value: 'Dra <dra@clinicarica.cl>' }, { name: 'Subject', value: 'Re: Una idea' }, { name: 'In-Reply-To', value: '<r1@x>' }], parts: [{ mimeType: 'multipart/alternative', parts: [{ mimeType: 'text/html', body: { data: b64('<p>Me <b>interesa</b></p><p>Llámame</p>') } }] }] } } ] };
  const ms = oc.parseGmailThread(thread);
  assert.equal(ms.length, 2); assert.equal(ms[0].body, 'Hola ñ'); assert.equal(ms[0].rfc_message_id, '<r1@x>'); assert.match(ms[1].body, /Me interesa/); assert.equal(ms[1].in_reply_to, '<r1@x>'); assert.equal(ms[1].date, new Date(WED + 1000).toISOString()); assert.equal(oc.classifyInbound(ms[1], 'christian@atacamalabs.cl').cls, 'reply'); assert.equal(oc.classifyInbound(ms[0], 'christian@atacamalabs.cl').cls, 'own');
});
ok('planSuppress: suprime todos los correos, descarta y cancela lo pendiente', () => {
  const r = oc.planSuppress({ reason: 'pidió no recibir más' }, { now: WED, candidate: cand(), history: [{ id: 'x', direction: 'outbound', status: 'approved', to_email: 'otro@clinicarica.cl' }] });
  assert.equal(r.response.status, 'suppressed'); assert.deepEqual(r.response.suppressed_emails.sort(), ['dra@clinicarica.cl', 'otro@clinicarica.cl']);
  assert.ok(r.writes.some((w) => w.path.startsWith('outreach_suppression') && w.body.reason === 'do_not_contact')); assert.ok(r.writes.some((w) => w.body.status === 'cancelled')); assert.ok(r.writes.some((w) => w.path.startsWith('prospect_candidates') && w.body.status === 'discarded'));
  assert.equal(oc.planSuppress({}, { now: WED, candidate: null }).response.status, 'not_found');
});
// ---------- follow-up comercial
const T0 = Date.parse('2026-10-07T15:00:00Z');                 // primer envío: miércoles 12:00 Chile
const GH = { base: 'https://ghl.test', locationId: 'LOC', userId: 'USR' };
const initialMsg = (o) => ({ id: 'i-1', candidate_id: 'c-1', company_name: 'Clínica Rica', kind: 'initial', direction: 'outbound', status: 'sent', to_email: 'dra@clinicarica.cl', subject: 'Una idea para Clínica Rica', body: BODY, sent_at: new Date(T0).toISOString(), gmail_thread_id: 'T1', rfc_message_id: '<r1@x>', metadata: {}, created_at: new Date(T0).toISOString(), ...(o || {}) });
const fctx = (nowMs, o) => {
  const init = (o && o.initial) || initialMsg();
  const others = (o && o.others) || [];
  let n = 0;
  return { now: nowMs, config: { ...CFG, from_email: 'x@atacamalabs.cl' }, initials: [init], byCandidate: { 'c-1': [init, ...others] }, candidates: { 'c-1': (o && o.cand) || cand() }, suppression: (o && o.suppression) || [], closed: (o && o.closed) || {}, contactTasks: (o && o.contactTasks) || {}, ghl: GH, newId: () => 'new-' + (++n) };
};
ok('followupSlots: +3 y +7 días hábiles desde el primer envío (10:00 Chile)', () => {
  const s = oc.followupSlots(T0, CFG);
  assert.equal(new Date(s[0].due).toISOString(), '2026-10-12T13:00:00.000Z'); assert.equal(new Date(s[1].due).toISOString(), '2026-10-16T13:00:00.000Z');
  assert.equal(s[0].kind, 'followup_1'); assert.equal(s[1].kind, 'followup_2');
  const fri = oc.followupSlots(Date.parse('2026-10-09T20:00:00Z'), CFG);   // viernes tarde: +3 háb = miércoles
  assert.equal(new Date(fri[0].due).toISOString().slice(0, 10), '2026-10-14');
});
ok('antes de la fecha: crea las 2 tareas (+3 y +7), registra next_action y NO crea borradores', () => {
  const p = oc.planFollowups(fctx(T0 + 3600000));
  assert.equal(p.ghl_ops.length, 2); assert.deepEqual(p.ghl_ops.map((o) => o.slot), ['f1', 'f2']);
  assert.equal(p.ghl_ops[0].url, 'https://ghl.test/contacts/G1/tasks'); assert.equal(p.ghl_ops[0].body.title, 'Seguimiento 1 · Clínica Rica'); assert.equal(p.ghl_ops[0].body.dueDate, '2026-10-12T13:00:00.000Z'); assert.equal(p.ghl_ops[1].body.dueDate, '2026-10-16T13:00:00.000Z'); assert.equal(p.ghl_ops[0].body.assignedTo, 'USR');
  assert.ok(!p.writes.some((w) => w.path === 'outreach_messages' && w.method === 'POST'));
  assert.ok(p.writes.some((w) => w.path.startsWith('prospect_candidates') && w.body.next_action_at === '2026-10-12T13:00:00.000Z'));
  assert.equal(p.meta_updates['i-1'].followup_state, 'active');
});
ok('sin duplicados: reutiliza las tareas que ya existen en el contacto y no recrea las ya registradas', () => {
  const p = oc.planFollowups(fctx(T0 + 3600000, { contactTasks: { G1: [{ id: 't-a', title: 'Seguimiento 1 · Clínica Rica' }] } }));
  assert.equal(p.ghl_ops.length, 1); assert.equal(p.ghl_ops[0].slot, 'f2'); assert.equal(p.meta_updates['i-1'].followup_tasks.f1.id, 't-a');
  const done = oc.planFollowups(fctx(T0 + 3600000, { initial: initialMsg({ metadata: { followup_state: 'active', followup_tasks: { f1: { id: 'a' }, f2: { id: 'b' } } } }) }));
  assert.equal(done.ghl_ops.length, 0);
  assert.deepEqual(oc.followupsNeedingTaskCheck(fctx(T0)), [{ contact_id: 'G1', msg_id: 'i-1' }]);
  assert.deepEqual(oc.followupsNeedingTaskCheck(fctx(T0, { initial: initialMsg({ metadata: { followup_tasks: {} } }) })), []);
});
ok('llegado el +3: crea UN borrador followup_1 (draft, nunca aprobado) y no lo repite', () => {
  const now = Date.parse('2026-10-12T14:00:00Z');
  const base = { initial: initialMsg({ metadata: { followup_state: 'active', followup_tasks: { f1: { id: 'a' }, f2: { id: 'b' } } } }) };
  const p = oc.planFollowups(fctx(now, base));
  const ins = p.writes.filter((w) => w.path === 'outreach_messages' && w.method === 'POST');
  assert.equal(ins.length, 1); assert.equal(ins[0].body.kind, 'followup_1'); assert.equal(ins[0].body.status, 'draft'); assert.equal(ins[0].body.approved_at, null); assert.match(ins[0].body.subject, /^Re: /); assert.equal(ins[0].body.gmail_thread_id, 'T1');
  const existing = { id: 'f-1', kind: 'followup_1', direction: 'outbound', status: 'draft', candidate_id: 'c-1' };
  const again = oc.planFollowups(fctx(now, { ...base, others: [existing] }));
  assert.equal(again.writes.filter((w) => w.path === 'outreach_messages' && w.method === 'POST').length, 0);
  const cancelledOne = oc.planFollowups(fctx(now, { ...base, others: [{ ...existing, status: 'cancelled' }] }));
  assert.equal(cancelledOne.writes.filter((w) => w.path === 'outreach_messages' && w.method === 'POST').length, 0);
});
ok('llegado el +7: prepara el followup_2; si el 1 sigue sin aprobar lo caduca; si está aprobado espera; después parar', () => {
  const now = Date.parse('2026-10-16T14:00:00Z');
  const meta = { followup_state: 'active', followup_tasks: { f1: { id: 'a' }, f2: { id: 'b' } } };
  const f1sent = { id: 'f-1', kind: 'followup_1', direction: 'outbound', status: 'sent', candidate_id: 'c-1', to_email: 'dra@clinicarica.cl', subject: 'Re: x' };
  let p = oc.planFollowups(fctx(now, { initial: initialMsg({ metadata: meta }), others: [f1sent] }));
  assert.equal(p.writes.filter((w) => w.method === 'POST' && w.body.kind === 'followup_2').length, 1);
  p = oc.planFollowups(fctx(now, { initial: initialMsg({ metadata: meta }), others: [{ ...f1sent, status: 'draft' }] }));
  assert.ok(p.writes.some((w) => w.method === 'PATCH' && w.body.status === 'cancelled' && /caducó/.test(w.body.error))); assert.equal(p.writes.filter((w) => w.method === 'POST' && w.body.kind === 'followup_2').length, 1);
  p = oc.planFollowups(fctx(now, { initial: initialMsg({ metadata: meta }), others: [{ ...f1sent, status: 'approved' }] }));
  assert.equal(p.writes.filter((w) => w.method === 'POST').length, 0);
  p = oc.planFollowups(fctx(now, { initial: initialMsg({ metadata: meta }), others: [f1sent, { ...f1sent, id: 'f-2', kind: 'followup_2', status: 'sent' }] }));
  assert.equal(p.meta_updates['i-1'].followup_state, 'done'); assert.equal(p.writes.filter((w) => w.method === 'POST').length, 0);
  const after = oc.planFollowups(fctx(now + 86400000 * 5, { initial: initialMsg({ metadata: { ...meta, followup_state: 'done' } }) }));
  assert.equal(after.writes.length + after.ghl_ops.length, 0);
});
ok('se detiene si responde / rechaza / se da de baja / rebota / se descarta / Won-Lost / suprimido: cancela borradores y aprobados, borra tareas, no deja nada vivo', () => {
  const now = Date.parse('2026-10-13T14:00:00Z');
  const meta = { followup_state: 'active', followup_tasks: { f1: { id: 'tk1' }, f2: { id: 'tk2' } } };
  const live = [{ id: 'f-1', kind: 'followup_1', direction: 'outbound', status: 'approved', candidate_id: 'c-1' }, { id: 'f-2', kind: 'followup_2', direction: 'outbound', status: 'draft', candidate_id: 'c-1' }];
  const inb = (cls) => ({ id: 'in-1', direction: 'inbound', classification: cls, candidate_id: 'c-1' });
  const cases = [['respondio', { others: [...live, inb('reply')] }], ['rechazo', { others: [...live, inb('decline')] }], ['baja', { others: [...live, inb('unsubscribe')] }], ['rebote', { others: [...live, inb('bounce')] }], ['descartado', { others: live, cand: cand({ status: 'discarded' }) }], ['oportunidad_won', { others: live, closed: { O1: 'won' } }], ['oportunidad_lost', { others: live, closed: { O1: 'lost' } }], ['suprimido', { others: live, suppression: [{ email: 'dra@clinicarica.cl', reason: 'do_not_contact' }] }]];
  for (const [why, o] of cases) {
    const p = oc.planFollowups(fctx(now, { initial: initialMsg({ metadata: meta }), ...o }));
    assert.equal(p.meta_updates['i-1'].followup_state, 'stopped:' + why, why);
    assert.equal(p.writes.filter((w) => w.method === 'PATCH' && w.body.status === 'cancelled').length, 2, why);
    assert.deepEqual(p.ghl_ops.map((x) => x.kind + ':' + x.url.split('/').pop()), ['task_delete:tk1', 'task_delete:tk2'], why);
    assert.equal(p.writes.filter((w) => w.method === 'POST').length, 0, why);
    assert.ok(p.writes.some((w) => w.path.startsWith('prospect_candidates') && w.body.next_action_at === null), why);
  }
  const auto = oc.planFollowups(fctx(now, { initial: initialMsg({ metadata: meta }), others: [{ id: 'in-2', direction: 'inbound', classification: 'auto_reply', candidate_id: 'c-1' }] }));
  assert.ok(!auto.meta_updates['i-1'] || !String(auto.meta_updates['i-1'].followup_state).startsWith('stopped'));
  const again = oc.planFollowups(fctx(now, { initial: initialMsg({ metadata: { ...meta, followup_state: 'stopped:respondio' } }), others: [inb('reply')] }));
  assert.equal(again.writes.length + again.ghl_ops.length, 0);
});
ok('finalizeFollowups: guarda los ids de las tareas creadas, marca borradas, y un fallo de GHL no registra una tarea inexistente', () => {
  const plan = oc.planFollowups(fctx(T0 + 3600000));
  const fin = oc.finalizeFollowups(plan, [{ statusCode: 201, body: { task: { id: 'ta' } } }, { statusCode: 201, body: { id: 'tb' } }], { now: T0 });
  const mw = fin.writes.find((w) => w.path === 'outreach_messages?id=eq.i-1');
  assert.equal(mw.body.metadata.followup_tasks.f1.id, 'ta'); assert.equal(mw.body.metadata.followup_tasks.f2.id, 'tb'); assert.equal(mw.body.metadata.followup_state, 'active'); assert.equal(fin.errors.length, 0);
  const bad = oc.finalizeFollowups(plan, [{ statusCode: 201, body: { task: { id: 'ta' } } }, { statusCode: 500, body: {} }], { now: T0 });
  const mb = bad.writes.find((w) => w.path === 'outreach_messages?id=eq.i-1');
  assert.ok(mb.body.metadata.followup_tasks.f1 && !mb.body.metadata.followup_tasks.f2); assert.equal(bad.errors.length, 1);
  const stop = oc.planFollowups(fctx(T0 + 86400000, { initial: initialMsg({ metadata: { followup_state: 'active', followup_tasks: { f1: { id: 'tk1' }, f2: { id: 'tk2' } } } }), others: [{ id: 'in', direction: 'inbound', classification: 'reply', candidate_id: 'c-1' }] }));
  const fs2 = oc.finalizeFollowups(stop, [{ statusCode: 200, body: {} }, { statusCode: 200, body: {} }], { now: T0 });
  const ms = fs2.writes.find((w) => w.path === 'outreach_messages?id=eq.i-1');
  assert.ok(ms.body.metadata.followup_tasks.f1.deleted && ms.body.metadata.followup_tasks.f2.deleted); assert.equal(ms.body.metadata.followup_state, 'stopped:respondio');
});
ok('pickDue: un seguimiento no sale si hubo otro correo al mismo prospecto hace menos de 48 h (los demás tipos no se ven afectados)', () => {
  const cb = { 'c-1': cand() };
  const a = appr({ kind: 'followup_1' });
  assert.equal(oc.pickDue([a], CFG, WED, 0, [], cb, {}, { 'c-1': WED - 3600000 }).action, 'none');
  assert.equal(oc.pickDue([a], CFG, WED, 0, [], cb, {}, { 'c-1': WED - 3 * 86400000 }).action, 'send');
  assert.equal(oc.pickDue([appr({ kind: 'reply' })], CFG, WED, 0, [], cb, {}, { 'c-1': WED - 3600000 }).action, 'send');
});
ok('followupOverview: estado por prospecto para Hermes', () => {
  const init = initialMsg({ metadata: { followup_state: 'active' } });
  const v = oc.followupOverview([init], { 'c-1': [init, { id: 'f-1', kind: 'followup_1', direction: 'outbound', status: 'draft' }] }, { 'c-1': cand() }, CFG, Date.parse('2026-10-13T14:00:00Z'));
  assert.equal(v[0].company, 'Clínica Rica'); assert.equal(v[0].followup_1.due_now, true); assert.equal(v[0].followup_1.message.status, 'draft'); assert.equal(v[0].followup_2.due_now, false); assert.equal(v[0].replied, false);
});

ok('cleanDraftText: quita firma/despedida duplicada y separa «Asunto:» incrustado', () => {
  const a = oc.cleanDraftText(null, 'Asunto: Una idea para X\nHola, equipo de X,\n\nTexto del correo con una pregunta final. ¿Te muestro?\n\nChristian Wevar · Atacama Labs · atacamalabs.cl');
  assert.equal(a.subject, 'Una idea para X'); assert.ok(a.body.startsWith('Hola, equipo de X')); assert.ok(a.body.endsWith('¿Te muestro?'));
  assert.equal(oc.cleanDraftText('S', 'Cuerpo. ¿Hablamos?\n\nSaludos,\nChristian').body, 'Cuerpo. ¿Hablamos?');
  assert.equal(oc.cleanDraftText('S', 'Cuerpo con Christian Wevar en medio. Fin.').body, 'Cuerpo con Christian Wevar en medio. Fin.');
  const d = oc.planDraft({ kind: 'initial' }, { now: WED, candidate: cand({ drafts: { email_subject: 'Una idea para Clínica Rica', email_body: BODY + '\n\nChristian Wevar · Atacama Labs · atacamalabs.cl' } }), history: [], suppression: [], new_id: 'm-9', config: CFG });
  assert.ok(!/Christian Wevar/.test(d.writes[0].body.body)); assert.equal(oc.renderEmail(d.writes[0].body, CFG).text.split('Christian Wevar').length, 2);
});
ok('dedupeReviewTasks: borra solo las tareas idénticas repetidas (mismo título y día), conserva la más antigua y respeta las completadas', () => {
  const tasks = { G1: [{ id: 't2', title: 'Revisar prospecto: X', dueDate: '2026-10-08T15:00:00Z', dateAdded: '2026-10-07T13:00:02Z' }, { id: 't1', title: 'Revisar prospecto: X', dueDate: '2026-10-08T15:00:00Z', dateAdded: '2026-10-07T13:00:01Z' }, { id: 't3', title: 'Otra tarea', dueDate: '2026-10-08T15:00:00Z' }, { id: 't4', title: 'Revisar prospecto: X', dueDate: '2026-10-09T15:00:00Z' }, { id: 't5', title: 'Revisar prospecto: X', dueDate: '2026-10-08T15:00:00Z', completed: true }], G2: [{ id: 'u1', title: 'A', dueDate: '2026-10-08' }] };
  const ops = oc.dedupeReviewTasks(tasks, ['G1', 'G2', 'G9'], GH);
  assert.equal(ops.length, 1); assert.ok(ops[0].url.endsWith('/tasks/t2')); assert.equal(ops[0].method, 'DELETE'); assert.equal(ops[0].msg_id, null);
  const fin = oc.finalizeFollowups({ ghl_ops: ops, writes: [], meta_updates: {} }, [{ statusCode: 200, body: {} }], { now: T0 });
  assert.equal(fin.errors.length, 0); assert.equal(fin.writes.length, 0);
});
ok('lista blanca de envío: en live solo sale a los correos autorizados (el resto espera, no se cancela)', () => {
  const cb = { 'c-1': cand() };
  const allow = { ...CFG, send_allowlist: ['c.wevarh@gmail.com'] };
  const r1 = oc.pickDue([appr()], allow, WED, 0, [], cb);
  assert.equal(r1.action, 'none'); assert.match(JSON.stringify(r1.skipped), /lista blanca/);
  assert.equal(oc.pickDue([appr({ to_email: 'C.Wevarh@gmail.com', content_hash: oc.contentHash('C.Wevarh@gmail.com', appr().subject, appr().body) })], allow, WED, 0, [], cb).action, 'send');
  assert.equal(oc.pickDue([appr()], { ...allow, send_allowlist: [] }, WED, 0, [], cb).action, 'send');
  assert.equal(oc.pickDue([appr()], { ...allow, mode: 'test_sim' }, WED, 0, [], { 'c-1': cand({ company_name: 'Clínica TEST' }) }).action, 'send');
});
ok('renderEmail: firma «Christian Wevar | Atacama Labs» + atacamalabs.cl + logo, sin duplicar firma ni pie', () => {
  const r = oc.renderEmail({ subject: 'S', body: BODY }, CFG);
  assert.ok(r.text.includes('Christian Wevar | Atacama Labs\natacamalabs.cl')); assert.ok(r.text.includes('responde «baja»')); assert.ok(!r.text.includes('Atacama Labs · atacamalabs.cl'));
  assert.equal(r.text.split('Christian Wevar').length, 2); assert.equal(r.text.split('atacamalabs.cl').length, 2);
  assert.ok(r.html.includes('Christian Wevar | Atacama Labs') && r.html.includes('href="https://atacamalabs.cl"') && r.html.includes('src="cid:atacama-logo"') && r.html.includes('width="220"'));
  assert.equal(r.html.split('Christian Wevar').length, 2);
  const legal = oc.renderEmail({ subject: 'S', body: BODY }, { ...CFG, legal_footer: 'Atacama Labs SpA · RUT 76.000.000-0 · Antofagasta' });
  assert.ok(legal.text.includes('RUT 76.000.000-0') && legal.html.includes('RUT 76.000.000-0'));
  assert.ok(!oc.renderEmail({ subject: 'S', body: BODY }, CFG, { logo: null }).html.includes('<img'));
  assert.ok(oc.renderEmail({ subject: 'S', body: BODY }, CFG, { logo: 'data:image/png;base64,AAA' }).html.includes('src="data:image/png;base64,AAA"'));
  for (const f of [null, '', 'Atacama Labs · atacamalabs.cl', 'atacamalabs.cl', ' Atacama Labs | atacamalabs.cl ']) assert.ok(oc.isBrandOnlyFooter(f), String(f));
  assert.ok(!oc.isBrandOnlyFooter('Atacama Labs SpA · RUT 76.000.000-0'));
});
ok('renderEmail: el HTML escapa el cuerpo y respeta párrafos y saltos', () => {
  const r = oc.renderEmail({ subject: 'S', body: 'Hola <b>x</b> & «y»\nlínea 2\n\nSegundo párrafo' }, CFG);
  assert.ok(r.html.includes('Hola &lt;b&gt;x&lt;/b&gt; &amp; «y»<br>línea 2') && r.html.includes('<p style="margin:0 0 14px 0;">Segundo párrafo</p>') && !r.html.includes('<b>x</b>'));
});
ok('buildMime con HTML: multipart/alternative [texto, related [html, logo PNG inline cid]]', () => {
  const png = Buffer.from('PNGDATA-1234567890-PNGDATA-1234567890-PNGDATA-1234567890-PNGDATA-1234567890').toString('base64');
  const r = oc.renderEmail({ subject: 'Asunto ñ', body: 'Hola ñ\n\nTexto.' }, CFG);
  const m = oc.buildMime({ from: 'christian@atacamalabs.cl', from_name: 'Christian Wevar', to: 'x@y.cl', subject: r.subject, text: r.text, html: r.html, inline_png_b64: png, now: WED });
  const raw = Buffer.from(m.raw, 'base64url').toString('utf8');
  assert.match(raw, /^Content-Type: multipart\/alternative; boundary="(alt_\w+)"/m);
  const alt = raw.match(/boundary="(alt_\w+)"/)[1], rel = raw.match(/boundary="(rel_\w+)"/)[1];
  assert.ok(raw.includes('--' + alt + '--') && raw.includes('--' + rel + '--'));
  const decode = (re) => { const mm = raw.match(re); return mm ? Buffer.from(mm[1].replace(/\r?\n/g, ''), 'base64') : null; };
  assert.equal(decode(/Content-Type: text\/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n([A-Za-z0-9+/=\r\n]+)/).toString('utf8'), r.text);
  assert.equal(decode(/Content-Type: text\/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n([A-Za-z0-9+/=\r\n]+)/).toString('utf8'), r.html);
  assert.ok(/Content-ID: <atacama-logo>/.test(raw) && /Content-Disposition: inline; filename="logo-atacama-labs.png"/.test(raw));
  assert.equal(decode(/Content-Type: image\/png; name="logo-atacama-labs.png"[^]*?\r\n\r\n([A-Za-z0-9+/=\r\n]+)/).toString('base64'), png);
  assert.match(raw, /^List-Unsubscribe: <mailto:christian@atacamalabs.cl\?subject=baja>/m);
  const plain = oc.buildMime({ from: 'a@b.cl', to: 'x@y.cl', subject: 'S', text: 'hola', now: WED });
  assert.match(Buffer.from(plain.raw, 'base64url').toString('utf8'), /Content-Type: text\/plain/);
});
ok('cleanDraftText: quita la firma nueva («Christian Wevar | Atacama Labs» + atacamalabs.cl)', () => {
  assert.equal(oc.cleanDraftText('S', 'Cuerpo. ¿Hablamos?\n\nChristian Wevar | Atacama Labs\natacamalabs.cl').body, 'Cuerpo. ¿Hablamos?');
});
ok('newText: quita la atribución de Gmail partida en dos líneas', () => {
  assert.equal(oc.newText('prueba\n\nEl mié, 7 oct 2026 a la(s) 11:00 a.m., Christian Wevar\n(christian.wevar@atacamalabs.cl) escribió:'), 'prueba');
  assert.equal(oc.newText('Me interesa.\nEl producto lo conocí el año pasado y me gustó.\nGracias'), 'Me interesa.\nEl producto lo conocí el año pasado y me gustó.\nGracias');
});
ok('el núcleo no contiene secretos', () => {
  assert.ok(!/pit-[0-9a-f-]{20,}|eyJ[A-Za-z0-9_-]{20,}|ya29\./.test(Object.values(oc).map((f) => f.toString()).join('\n')));
});
console.log(n + ' ok');
