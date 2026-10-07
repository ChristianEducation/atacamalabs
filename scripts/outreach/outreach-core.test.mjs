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
ok('renderEmail agrega firma, pie y línea de baja', () => {
  const r = oc.renderEmail({ subject: 'S', body: BODY }, CFG);
  assert.ok(r.text.includes('Christian Wevar') && r.text.includes('responde «baja»') && r.text.includes('atacamalabs.cl'));
  assert.ok(oc.renderEmail({ subject: 'S', body: BODY }, { ...CFG, legal_footer: 'Atacama Labs SpA · RUT 76.000.000-0' }).text.includes('RUT 76.000.000-0'));
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
ok('el núcleo no contiene secretos', () => {
  assert.ok(!/pit-[0-9a-f-]{20,}|eyJ[A-Za-z0-9_-]{20,}|ya29\./.test(Object.values(oc).map((f) => f.toString()).join('\n')));
});
console.log(n + ' ok');
