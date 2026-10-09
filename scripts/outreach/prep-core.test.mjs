import assert from 'node:assert/strict';
import * as pc from './prep-core.mjs';

let n = 0;
const ok = (name, fn) => { try { fn(); n++; } catch (e) { console.error('FAIL', name, '\n', e.stack.split('\n').slice(0, 4).join('\n')); process.exitCode = 1; } };

const NOW = Date.parse('2026-10-09T15:00:00Z'); // viernes
const TZ = 'America/Santiago';
const cand = (o) => ({ id: 'c-1', company_name: 'Empresa Prueba', status: 'in_ghl', ghl_stage: 'investigado', priority_score: 85, band: 'alta', channel_state: {},
  canonical: { contact: { name: 'Ana Pérez', role: 'Gerente', email: 'ana@prueba.cl', linkedin: null }, facts: ['hecho uno largo suficiente'], source_flags: {} }, ...(o || {}) });
const msg = (o) => ({ id: 'm-1', candidate_id: 'c-1', company_name: 'Empresa Prueba', direction: 'outbound', kind: 'initial', status: 'draft', to_email: 'ana@prueba.cl', subject: 'asunto', body: 'cuerpo', metadata: { cold: { score: 88 } }, ...(o || {}) });

ok('correo: directo vs genérico vs inválido', () => {
  assert.equal(pc.prepEmailKind('ana@prueba.cl'), 'direct');
  assert.equal(pc.prepEmailKind('mariajose.dasilva@ocamaq.cl'), 'direct');
  ['info@x.cl', 'contacto@x.cl', 'Comercial@x.cl', 'ventas@x.cl', 'sales@crompion.com', 'atención@x.cl'].forEach((e) => assert.equal(pc.prepEmailKind(e), 'generic', e));
  ['', 'sin-arroba', 'a@b', null].forEach((e) => assert.equal(pc.prepEmailKind(e), 'invalid', String(e)));
});

ok('LinkedIn: solo perfiles personales', () => {
  assert.equal(pc.prepLinkedinUrl('https://cl.linkedin.com/in/Juan-Perez-123/?x=1'), 'https://www.linkedin.com/in/juan-perez-123');
  ['https://www.linkedin.com/company/acme', 'https://evil.com/in/x', '', null].forEach((u) => assert.equal(pc.prepLinkedinUrl(u), null));
});

ok('vías de contacto: correos directos primero, sin duplicados, extras incluidos', () => {
  const r = pc.prepRoutes(cand({ canonical: { contact: { email: 'info@prueba.cl', linkedin: 'https://es.linkedin.com/in/ana-p' }, extra_contacts: { emails: ['ana@prueba.cl', 'info@prueba.cl'] } } }));
  assert.deepEqual(r.emails.map((e) => e.email), ['ana@prueba.cl', 'info@prueba.cl']);
  assert.equal(r.linkedin, 'https://www.linkedin.com/in/ana-p');
});

ok('canal: correo (aunque sea genérico) > LinkedIn > buscar contacto; nunca los dos', () => {
  let r = pc.prepChooseRoute(cand({ canonical: { contact: { email: 'info@prueba.cl' } } }), {});
  assert.equal(r.route, 'email'); assert.equal(r.to_kind, 'generic'); assert.match(r.reason, /genérico/);
  r = pc.prepChooseRoute(cand({ canonical: { contact: { linkedin: 'https://www.linkedin.com/in/ana-perez' } } }), {});
  assert.equal(r.route, 'linkedin');
  r = pc.prepChooseRoute(cand({ canonical: { contact: {} } }), {});
  assert.equal(r.route, 'find_contact');
  r = pc.prepChooseRoute(cand({ canonical: { contact: { email: 'ana@prueba.cl' } } }), { suppressed: ['ana@prueba.cl'] });
  assert.equal(r.route, 'find_contact', 'un correo suprimido no cuenta');
  r = pc.prepChooseRoute(cand({ canonical: { contact: { email: 'ana@prueba.cl' } }, channel_state: { li_manual: { status: 'ready', profile_url: 'https://www.linkedin.com/in/ana' } } }), {});
  assert.equal(r.route, 'linkedin', 'si LinkedIn ya está preparado no se cambia a correo');
});

ok('estado: sin acción → correo listo → aprobado → contactado', () => {
  assert.equal(pc.prepClassify(cand(), [], NOW).state, 'sin_accion');
  assert.equal(pc.prepClassify(cand(), [msg()], NOW).state, 'email_listo');
  assert.equal(pc.prepClassify(cand(), [msg({ status: 'approved' })], NOW).state, 'email_aprobado');
  assert.equal(pc.prepClassify(cand(), [msg({ status: 'sent' })], NOW).state, 'contactado');
  assert.equal(pc.prepClassify(cand({ status: 'discarded' }), [], NOW).state, 'descartado');
  assert.equal(pc.prepClassify(cand({ ghl_stage: 'respondio' }), [], NOW).state, 'respondio');
  assert.equal(pc.prepClassify(cand({ ghl_stage: 'diagnostico' }), [], NOW).state, 'otro');
});

ok('estado: LinkedIn listo / en curso, Waalaxy, en espera, buscar contacto', () => {
  assert.equal(pc.prepClassify(cand({ channel_state: { li_manual: { status: 'ready' } } }), [], NOW).state, 'linkedin_listo');
  assert.equal(pc.prepClassify(cand({ channel_state: { li_manual: { status: 'invite_sent' } } }), [], NOW).state, 'linkedin_en_curso');
  assert.equal(pc.prepClassify(cand({ channel_state: { linkedin: { state: 'en_campana' } } }), [], NOW).state, 'waalaxy');
  assert.equal(pc.prepClassify(cand({ channel_state: { prep: { state: 'hold', reason: 'B: después de los A' } } }), [], NOW).state, 'en_espera');
  assert.equal(pc.prepClassify(cand({ channel_state: { prep: { state: 'no_contact', reason: 'identidad sin cerrar' } } }), [], NOW).state, 'no_contactar');
  const f = cand({ canonical: { contact: {} }, channel_state: { prep: { state: 'find_contact' } } });
  assert.equal(pc.prepClassify(f, [], NOW).state, 'buscar_contacto');
  const found = cand({ canonical: { contact: { email: 'info@x.cl' } }, channel_state: { prep: { state: 'find_contact' } } });
  assert.equal(pc.prepClassify(found, [], NOW).state, 'sin_accion', 'si apareció un correo, vuelve a «sin acción» para redactar');
});

ok('resumen: cuenta cada salida, métrica crítica y envíos de hoy', () => {
  const cs = [cand({ id: 'a' }), cand({ id: 'b' }), cand({ id: 'c', channel_state: { li_manual: { status: 'ready' } } }), cand({ id: 'd', canonical: { contact: {} }, channel_state: { prep: { state: 'find_contact' } } }),
    cand({ id: 'e', channel_state: { prep: { state: 'hold', reason: 'razón comercial clara' } } }), cand({ id: 'f', status: 'contacted', ghl_stage: 'contactado' })];
  const ms = [msg({ id: 'm1', candidate_id: 'a' }), msg({ id: 'm2', candidate_id: 'f', status: 'sent', sent_at: '2026-10-09T13:00:00Z' }), { id: 'in1', candidate_id: 'f', direction: 'inbound', classification: 'reply', created_at: '2026-10-08T12:00:00Z' }];
  const s = pc.prepSummary(cs, ms, NOW, TZ);
  assert.equal(s.counts.email_listo, 1); assert.equal(s.counts.sin_accion, 1); assert.equal(s.valid_unactioned, 1); assert.equal(s.counts.linkedin_listo, 1);
  assert.equal(s.counts.buscar_contacto, 1); assert.equal(s.counts.en_espera, 1); assert.equal(s.counts.contactado, 1);
  assert.equal(s.sent_today, 1); assert.equal(s.replies_7d, 1); assert.equal(s.lists.sin_accion[0].id, 'b');
  assert.equal(s.lists.en_espera[0].reason, 'razón comercial clara');
});

ok('cola para redactar: lleva la evidencia ya investigada y el canal decidido', () => {
  const q = pc.prepQueueItem(cand({ canonical: { contact: { email: 'info@prueba.cl' }, facts: ['f1'], commercial_hypotheses: ['h1'], source_flags: { study_priority: 'A' } } }), {});
  assert.equal(q.route, 'email'); assert.equal(q.to, 'info@prueba.cl'); assert.deepEqual(q.facts, ['f1']); assert.equal(q.study_priority, 'A');
});

ok('aprendizaje: muestras de enviados y ediciones de Christian (original vs final)', () => {
  const ms = [
    msg({ id: 's1', status: 'sent', sent_at: '2026-10-09T12:00:00Z', body: 'Hola,\n\nUna frase. Otra frase.\n\n¿Les sirve?', metadata: { history: [{ by: 'Christian vía Hermes', body: 'x', subject: 's' }] } }),
    msg({ id: 's2', status: 'sent', sent_at: '2026-10-09T12:10:00Z', company_name: 'Otra', body: 'Hola,\n\nFrase nueva.\n\n¿Les sirve?', subject: 'final',
      metadata: { history: [{ by: 'Christian via /ops', at: '2026-10-09T11:00:00Z', subject: 'original', body: 'Hola,\n\nFrase nueva. Frase que sobra, muy larga.\n\n¿Les sirve?' }] } }),
  ];
  const s = pc.prepStyleSamples(ms, 5);
  assert.equal(s.sent.length, 2); assert.equal(s.sent[0].company, 'Otra', 'el más reciente primero');
  assert.equal(s.edits.length, 1, 'solo cuentan las ediciones hechas desde /ops'); assert.equal(s.edits[0].company, 'Otra');
  assert.ok(s.edits[0].removed.some((x) => /sobra/.test(x))); assert.ok(s.profile.avg_words > 0); assert.match(s.guidance, /NO copies hechos/);
});

ok('autoenvío: apagado nunca es elegible; ON exige score, correo directo, publicado, no B/C, sin respuesta ni supresión', () => {
  const cfgOn = { autosend_enabled: true, autosend_min_score: 80 };
  assert.equal(pc.prepAutoDecision(msg(), cand(), { autosend_enabled: false }, {}).eligible, false);
  assert.equal(pc.prepAutoDecision(msg(), cand(), cfgOn, {}).eligible, true);
  const why = (m, c, x) => pc.prepAutoDecision(m, c, cfgOn, x).reasons.join(',');
  assert.match(why(msg({ metadata: { cold: { score: 79 } } }), cand(), {}), /score_bajo_79/);
  assert.match(why(msg({ to_email: 'info@prueba.cl' }), cand({ canonical: { contact: { email: 'info@prueba.cl' } } }), {}), /correo_generico/);
  assert.match(why(msg({ to_email: 'otro@prueba.cl' }), cand(), {}), /destinatario_no_publicado/);
  assert.match(why(msg(), cand({ canonical: { contact: { email: 'ana@prueba.cl' }, source_flags: { study_priority: 'B' } } }), {}), /prioridad_B/);
  assert.match(why(msg(), cand({ channel_state: { prep: { state: 'hold' } } }), {}), /en_espera/);
  assert.match(why(msg(), cand(), { suppressed: ['ana@prueba.cl'] }), /suprimido/);
  assert.match(why(msg(), cand(), { inbound: { 'c-1': true } }), /ya_respondio/);
  assert.match(why(msg({ kind: 'followup_1' }), cand(), {}), /solo_primer_correo/);
  assert.match(why(msg({ status: 'approved' }), cand(), {}), /no_es_borrador/);
});

ok('barrido: ON aprueba solo elegibles (con aprobador propio); OFF revierte únicamente lo que aprobó el autoenvío', () => {
  const cs = [cand({ id: 'c-1' }), cand({ id: 'c-2', canonical: { contact: { email: 'info@x.cl' } } })];
  const ms = [msg({ id: 'm-1' }), msg({ id: 'm-2', candidate_id: 'c-2', to_email: 'info@x.cl' })];
  const on = pc.prepPlanAutosweep({ now: NOW, config: { autosend_enabled: true }, messages: ms, candidates: cs });
  assert.deepEqual(on.approved, ['Empresa Prueba']); assert.equal(on.writes.length, 1);
  assert.match(on.writes[0].path, /outreach_messages\?id=eq\.m-1&status=eq\.draft/); assert.equal(on.writes[0].body.approved_by, 'Atacama OS · autoenvío');
  assert.equal(on.response.skipped[0].reasons.includes('correo_generico'), true);
  const off = pc.prepPlanAutosweep({ now: NOW, config: { autosend_enabled: false }, candidates: cs, messages: [
    msg({ id: 'm-1', status: 'approved', approved_by: 'Atacama OS · autoenvío' }), msg({ id: 'm-3', status: 'approved', approved_by: 'Christian via /ops' }), msg({ id: 'm-4', status: 'approved', approved_by: 'Atacama OS · autoenvío', sent_at: '2026-10-09T12:00:00Z' })] });
  assert.equal(off.writes.length, 1, 'solo el aprobado por el autoenvío y aún no enviado'); assert.equal(off.writes[0].body.status, 'draft'); assert.match(off.writes[0].path, /m-1/);
  const cap = pc.prepPlanAutosweep({ now: NOW, config: { autosend_enabled: true }, candidates: Array.from({ length: 15 }, (_, i) => cand({ id: 'k' + i })), messages: Array.from({ length: 15 }, (_, i) => msg({ id: 'q' + i, candidate_id: 'k' + i })) });
  assert.equal(cap.approved.length, 10, 'tope por barrido');
});

ok('en espera / no contactar exigen razón comercial explícita; buscar contacto deja el mensaje redactado', () => {
  const c = cand({ canonical: { contact: {} } });
  let r = pc.prepPlanSet({ state: 'hold', reason: 'falta correo' }, { now: NOW, candidate: c, messages: [] });
  assert.equal(r.response.ok, false); assert.equal(r.response.error, 'falta_razon');
  r = pc.prepPlanSet({ state: 'hold', reason: 'B: se contacta después de avanzar con los A (instrucción de Christian)' }, { now: NOW, candidate: c, messages: [] });
  assert.equal(r.response.ok, true); assert.equal(r.writes[0].body.channel_state.prep.state, 'hold');
  r = pc.prepPlanSet({ state: 'find_contact' }, { now: NOW, candidate: c, messages: [] });
  assert.equal(r.response.error, 'falta_borrador');
  r = pc.prepPlanSet({ state: 'find_contact', draft: { subject: 'asunto', body: 'Un mensaje ya redactado para que solo falte el contacto de la persona.' } }, { now: NOW, candidate: c, messages: [] });
  assert.equal(r.response.ok, true); assert.ok(r.writes[0].body.channel_state.prep.draft.body);
  r = pc.prepPlanSet({ state: 'find_contact', draft: { body: 'Un mensaje ya redactado para que solo falte el contacto.' } }, { now: NOW, candidate: cand(), messages: [] });
  assert.equal(r.response.error, 'ya_tiene_contacto');
  r = pc.prepPlanSet({ state: 'clear' }, { now: NOW, candidate: cand({ channel_state: { prep: { state: 'hold', reason: 'razón larga' }, linkedin: undefined } }), messages: [] });
  assert.equal(r.response.ok, true); assert.equal(r.writes[0].body.channel_state.prep, undefined);
  r = pc.prepPlanSet({ state: 'hold', reason: 'razón comercial larga' }, { now: NOW, candidate: cand(), messages: [msg({ status: 'sent' })] });
  assert.equal(r.response.error, 'ya_contactado');
});

ok('contacto encontrado: guarda correo o LinkedIn y libera «buscar contacto»', () => {
  const c = cand({ canonical: { contact: { name: 'X' } }, channel_state: { prep: { state: 'find_contact', draft: { subject: 'a', body: 'texto redactado suficientemente largo para guardarlo' } } } });
  let r = pc.prepPlanContact({ email: 'no-es-correo' }, { now: NOW, candidate: c });
  assert.equal(r.response.error, 'correo_invalido');
  r = pc.prepPlanContact({ linkedin: 'https://evil.com/x' }, { now: NOW, candidate: c });
  assert.equal(r.response.error, 'linkedin_invalido');
  r = pc.prepPlanContact({ email: 'Hola@Empresa.cl' }, { now: NOW, candidate: c });
  assert.equal(r.response.ok, true); assert.equal(r.response.has_draft_text, true);
  assert.equal(r.writes[0].body.canonical.contact.email, 'hola@empresa.cl'); assert.equal(r.writes[0].body.canonical.contact.name, 'X', 'no pisa lo demás');
  assert.equal(r.writes[0].body.channel_state.prep, undefined);
});

ok('LinkedIn manual: guardar invitación + mensaje con límites y sin pisar otro canal', () => {
  const base = { profile_url: 'https://www.linkedin.com/in/ana-perez', invitation: 'Hola Ana, te vi en Leads Pro y luego estuve mirando tu trabajo. Me gustaría conectar.', message: 'Hola Ana, vi tu enfoque. Imagino que hay trabajo repetitivo. ¿Hoy cómo manejan esa parte?' };
  let r = pc.prepPlanLiSave({ ...base, invitation: 'x'.repeat(301) }, { now: NOW, candidate: cand(), messages: [] });
  assert.equal(r.response.error, 'invitacion_invalida');
  r = pc.prepPlanLiSave({ ...base, profile_url: 'https://evil.com/in/x' }, { now: NOW, candidate: cand({ canonical: { contact: {} } }), messages: [] });
  assert.equal(r.response.error, 'sin_perfil');
  r = pc.prepPlanLiSave(base, { now: NOW, candidate: cand(), messages: [msg({ status: 'approved' })] });
  assert.equal(r.response.error, 'canal_ocupado');
  r = pc.prepPlanLiSave(base, { now: NOW, candidate: cand({ channel_state: { prep: { state: 'hold', reason: 'x' } } }), messages: [] });
  assert.equal(r.response.ok, true); const cs = r.writes[0].body.channel_state;
  assert.equal(cs.li_manual.status, 'ready'); assert.equal(cs.prep, undefined); assert.equal(r.effects.length, 1);
  assert.equal(pc.prepClassify(cand({ channel_state: cs }), [], NOW).state, 'linkedin_listo');
});

ok('LinkedIn enviado a mano: registra fecha, canal, estado, mensaje y seguimiento a +3 días hábiles; Contactado en GHL', () => {
  const ready = cand({ id: 'c-9', channel_state: { li_manual: { status: 'ready', profile_url: 'https://www.linkedin.com/in/ana-perez', invitation: 'Hola Ana, conectemos.', message: 'Mensaje preparado largo suficiente.', events: [] } } });
  let r = pc.prepPlanLiSent({ kind: 'invitation' }, { now: NOW, candidate: ready });
  assert.equal(r.response.ok, true); const b = r.writes[0].body;
  assert.equal(b.channel_state.li_manual.status, 'invite_sent'); assert.equal(b.ghl_stage, 'contactado'); assert.equal(b.last_contact_channel, 'linkedin'); assert.equal(b.status, 'contacted');
  assert.equal(b.channel_state.li_manual.invite_text_sent, 'Hola Ana, conectemos.');
  assert.equal(r.response.follow_up_at.slice(0, 10), '2026-10-14', 'viernes 9 + 3 hábiles = miércoles 14');
  const eff = r.effects[0].act; assert.equal(eff.type, 'mark_contacted'); assert.equal(eff.channel, 'linkedin'); assert.equal(eff.follow_up_days, 3); assert.match(eff.note, /Hola Ana, conectemos/);
  const inv = cand({ id: 'c-9', channel_state: b.channel_state, ghl_stage: 'contactado', status: 'contacted' });
  r = pc.prepPlanLiSent({ kind: 'invitation' }, { now: NOW, candidate: inv });
  assert.equal(r.response.error, 'ya_enviada');
  r = pc.prepPlanLiSent({ kind: 'message', text: 'Texto final enviado' }, { now: NOW, candidate: inv });
  assert.equal(r.response.ok, true); assert.equal(r.writes[0].body.channel_state.li_manual.status, 'message_sent');
  assert.deepEqual(r.effects.map((e) => e.act.type), ['add_note', 'follow_up']);
  r = pc.prepPlanLiSent({ kind: 'reply' }, { now: NOW, candidate: inv });
  assert.equal(r.response.error, 'falta_texto');
  r = pc.prepPlanLiSent({ kind: 'reply', text: 'Me interesa, hablemos' }, { now: NOW, candidate: inv });
  assert.equal(r.writes[0].body.ghl_stage, 'respondio'); assert.equal(r.effects[0].act.type, 'move_stage');
  r = pc.prepPlanLiSent({ kind: 'message' }, { now: NOW, candidate: cand() });
  assert.equal(r.response.error, 'sin_linkedin_preparado');
  r = pc.prepPlanLiSent({ kind: 'nada' }, { now: NOW, candidate: ready });
  assert.equal(r.response.error, 'tipo_invalido');
});

ok('+3 días hábiles salta fines de semana', () => {
  assert.equal(pc.prepAddBusinessDays(Date.parse('2026-10-09T15:00:00Z'), 3).slice(0, 10), '2026-10-14');
  assert.equal(pc.prepAddBusinessDays(Date.parse('2026-10-12T15:00:00Z'), 3).slice(0, 10), '2026-10-15');
});

ok('los prospectos de prueba (TEST …) no cuentan en las colas ni en los avisos', () => {
  const s = pc.prepSummary([cand({ id: 't', company_name: 'TEST Algo' }), cand({ id: 'r', company_name: 'Real SpA' })], [], NOW, TZ);
  assert.equal(s.valid_unactioned, 1); assert.equal(s.lists.sin_accion[0].company, 'Real SpA');
});

console.log(n + ' ok');
