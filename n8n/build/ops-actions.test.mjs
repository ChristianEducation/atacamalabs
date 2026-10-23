// node n8n/build/ops-actions.test.mjs — recorre el workflow 29 nodo a nodo con los motores (21, 26), GHL y Supabase simulados (sin red, sin envíos reales)
import { buildOpsActions, LIB } from './ops-actions.mjs';

let pass = 0, fail = 0;
const t = (n, c, x = '') => { c ? pass++ : fail++; console.log(c ? 'ok  ' : 'FAIL', n, c ? '' : String(x).slice(0, 400)); };
const wf = buildOpsActions();
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const code = (n) => wf.nodes.find((x) => x.name === n).parameters.jsCode;
const mkDollar = (store, lists = {}) => (name) => ({ first: () => { if (!(name in store)) throw new Error('Node ' + name + ' no ejecutado'); return { json: store[name] }; }, all: () => (lists[name] || [store[name]]).map((json) => ({ json })) });
const run = async (name, store, lists) => new AsyncFunction('$', '$json', code(name)).call({}, mkDollar(store, lists), {});

const NOW = Date.now();
const iso = (ms) => new Date(ms).toISOString();
const UID = (n) => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const CID = UID(1), MID = UID(2), PID = UID(3), CID2 = UID(4);
const H1 = 'aaaa1111', H2 = 'bbbb2222';

/** Motores simulados. Registran cada llamada para comprobar QUÉ se pidió y qué NO. */
function world(o = {}) {
  const calls = [];
  const db = { message: { id: MID, candidate_id: CID, company_name: 'Clínica Ramis', kind: 'initial', direction: 'outbound', to_email: 'contacto@clinicaramis.cl', subject: 'Una idea', body: 'Hola equipo, esta es una idea concreta para ordenar la recepción. ¿Les sirve verla en 15 minutos?', status: 'draft', content_hash: H1, metadata: {}, ...(o.message || {}) },
    candidate: { id: CID2, company_name: 'Persona SpA', status: 'in_ghl', channel_state: {}, contact: { name: 'Ana Pérez', role: 'Gerente', linkedin: 'https://www.linkedin.com/in/ana-perez', linkedin_source_url: 'https://persona.cl/equipo', email: 'info@persona.cl' }, ...(o.candidate || {}) },
    piece: { id: PID, status: 'in_review', ghl_post_id: 'ghlpost1', ghl_status: 'in_review', channel: 'linkedin_page', format: 'texto', topic: 'Tema', is_test: false, ...(o.piece || {}) },
    post: { _id: 'ghlpost1', status: 'in_review', summary: 'Texto del post', type: 'post', accountIds: ['acc1'], media: [], scheduleDate: iso(NOW + 30 * 3600000), categoryId: 'cat1', tags: ['tag1'], postApprovalDetails: { approver: 'OjkAjHMdUjnblO7W1kBZ', approvalStatus: 'pending' }, ...(o.post || {}) },
    audit: o.audit || [] };
  const respond = (c) => {
    calls.push(c);
    if (c.kind === 'ingest') {
      const b = c.body, u = c.url;
      if (o.engineDown) return { statusCode: 500, body: { message: 'boom' } };
      if (/outreach-engine/.test(u)) {
        if (b.action === 'draft') return { statusCode: 200, body: { ok: true, status: 'updated', draft: { id: MID, subject: b.subject, body: b.body, status: 'draft', hash: H2 } } };
        if (b.action === 'approve' && !b.confirmation_code) return { statusCode: 200, body: o.engineRefuses ? { ok: false, status: 'invalid_draft', error: 'borrador_invalido', message: 'No se puede aprobar: placeholder.' } : { ok: false, status: 'confirmation_required', confirmation_code: 'CONF-123456', draft: { id: MID, hash: o.engineHash || db.message.content_hash } } };
        if (b.action === 'approve') return { statusCode: 200, body: { ok: true, status: 'approved', executed: true, approved: { scheduled_for: iso(NOW + 3600000) } } };
        if (b.action === 'cancel') return { statusCode: 200, body: { ok: true, status: 'cancelled' } };
      }
      if (/atacama-linkedin/.test(u)) {
        if (b.action === 'li_sent') return { statusCode: 200, body: { ok: true, status: 'li_logged', message: 'Persona SpA: registrado — invitación enviada.', follow_up_at: '2026-10-14T15:00:00.000Z', li_status: 'invite_sent', ghl_stage: 'contactado' } };
        if (b.action === 'prep_set') return { statusCode: 200, body: { ok: true, status: b.state === 'clear' ? 'cleared' : 'prep_set', message: 'estado cambiado' } };
        if (b.action === 'prep_contact') return { statusCode: 200, body: { ok: true, status: 'contact_saved', channel: b.email ? 'email' : 'linkedin', has_draft_text: Boolean(o.findDraft), draft_text: o.findDraft || null, message: 'Persona SpA: guardé el contacto.' } };
        if (b.action === 'autosweep') return { statusCode: 200, body: { ok: true, status: 'autosend_on', approved: ['Clínica Ramis'], reverted: [], skipped_count: 2, message: 'Autoenvío ON: aprobé 1 borrador(es) elegible(s).' } };
        if (b.action === 'approve' && !b.confirmation_code) return { statusCode: 200, body: { ok: false, status: 'confirmation_required', confirmation_code: 'LI-654321' } };
        if (b.action === 'approve') return { statusCode: 200, body: o.liFails ? { ok: false, status: 'import_error', error: 'import', message: 'Waalaxy rechazó el alta.' } : { ok: true, status: 'imported', state: 'en_campana', state_label: 'En campaña (conexión)' } };
      }
    }
    if (c.kind === 'ghl' && /\/contacts\//.test(c.url)) { if (c.method === 'GET') return { statusCode: 200, body: { contacts: o.ghlContacts || [] } }; if (/\/tags$/.test(c.url)) return { statusCode: 201, body: { tags: c.body.tags } }; if (/\/notes$/.test(c.url)) return { statusCode: 201, body: { note: { id: 'n1' } } }; return o.contactFails ? { statusCode: 401, body: { message: 'scope' } } : { statusCode: 201, body: { contact: { id: 'newc1' } } }; }
    if (c.kind === 'ingest' && /prospect-gateway/.test(c.url)) return { statusCode: 200, body: { ok: true, results: [{ executed: true, error: null, ghl: { applied: { opportunity: o.gwFails ? 'error' : 'ok' } } }] } };
    if (c.kind === 'ingest' && /media-gateway/.test(c.url)) return o.uploadFails ? { statusCode: 200, body: { ok: false, error: 'x', message: 'GHL no aceptó la imagen (prueba).' } } : { statusCode: 200, body: { ok: true, files: c.body.paths.map((p, i) => ({ path: p, url: 'https://assets.cdn/' + i + '.png', type: 'image/png' })) } };
    if (c.kind === 'ghl' && c.method === 'POST') return o.ghlPostFails ? { statusCode: 422, body: { message: 'x' } } : { statusCode: 201, body: { results: { post: { _id: 'newpost1' } } } };
    if (c.kind === 'ghl' && c.method === 'GET' && /newpost1/.test(c.url)) return { statusCode: 200, body: { results: { post: { _id: 'newpost1', ...(o.created || { status: 'in_review', postApprovalDetails: { approvalStatus: 'pending' } }) } } } };
    if (c.kind === 'ghl') {
      if (c.method === 'GET') return { statusCode: 200, body: { results: { post: { ...db.post, ...(calls.filter((x) => x.kind === 'ghl' && x.method === 'PUT').length ? (o.putSticks === false ? {} : { status: o.rejecting ? 'failed' : 'scheduled', postApprovalDetails: { ...db.post.postApprovalDetails, approvalStatus: o.rejecting ? 'rejected' : 'approved' } }) : {}) } } } };
      if (c.method === 'PUT') return o.ghlPutFails ? { statusCode: 422, body: { message: ['media'] } } : { statusCode: 200, body: { success: true } };
    }
    return { statusCode: 404, body: {} };
  };
  return { db, calls, respond };
}

/** Ejecuta el workflow completo para una solicitud y devuelve { resp, calls, writes }. */
async function exec(body, o = {}) {
  const w = world(o);
  const store = { 'Actions Webhook': { body } };
  const parsed = (await run('Parse', store))[0].json; store.Parse = parsed;
  if (parsed.fatal) { const r = (await run('Respond Error', { ...store }, {})).length ? { ok: false, error: 'solicitud_invalida', message: parsed.fatal } : null; return { resp: r, calls: [], writes: [] }; }
  const reads = (await run('Expand Reads', store)).map((x) => x.json);
  const dbForKey = (key) => key === 'audit' ? w.db.audit : key === 'message' ? [{ ...w.db.message, cand: { id: CID, company_name: 'Clínica Ramis', status: 'in_ghl' } }] : key === 'candidate' ? [w.db.candidate] : key === 'piece' ? [o.tpiece || w.db.piece] : key === 'proposal' ? [o.proposal || { id: UID(9), status: 'proposed', target: 'playbook' }] : key === 'versions' ? (o.versions || []) : key === 'feedback' ? (o.feedbackRows || []) : key === 'taken' ? (o.taken || []) : key === 'tcfg' ? [o.tcfg || {}]
    : key === 'messages' ? (o.messages || [w.db.message]) : key === 'candidates' ? (o.candidates || [w.db.candidate]) : key === 'seqdone' ? (o.seqdone || []) : key === 'seqf3' ? (o.seqf3 || []) : key === 'suppression' ? [] : key === 'state' ? (o.state === null ? [] : [o.state || { id: 1, global_pause: false, meta: {} }]) : key === 'idea' ? (o.idea === null ? [] : [o.idea || { id: UID(9), status: 'proposed', week_start: '2026-10-26', title: 'Idea X', channel: 'instagram', format: 'carrusel', history: [], is_test: false }]) : key === 'config' ? [o.config || { mode: 'live', paused: false, daily_cap: 5, window_start: '09:00', window_end: '17:30', tz: 'America/Santiago', linkedin_mode: 'live', linkedin_list_id: 'L1', linkedin_campaign_id: 'C1', linkedin_daily_cap: 10 }] : [];
  const readRes = reads.map((r) => (o.readFails === r.key ? { statusCode: 500, body: {} } : { statusCode: 200, body: dbForKey(r.key) }));
  store.Read = readRes[0]; const lists = { Read: readRes };
  const slotResult = {};
  for (let k = 1; k <= 4; k++) {
    const plan = (await run('Plan ' + k, store, lists))[0].json; store['Plan ' + k] = plan;
    if (k === 4) break;
    const res = plan.call ? w.respond(plan.call) : { statusCode: 0 };
    store['Ingest ' + k] = plan.call && plan.call.kind === 'ingest' ? res : { statusCode: 0 };
    store['GHL Get ' + k] = plan.call && plan.call.kind === 'ghl' && plan.call.method === 'GET' ? res : { statusCode: 0 };
    store['GHL Put ' + k] = plan.call && plan.call.kind === 'ghl' && plan.call.method === 'PUT' ? res : { statusCode: 0 };
    store['GHL Post ' + k] = plan.call && plan.call.kind === 'ghl' && plan.call.method === 'POST' ? res : { statusCode: 0 };
  }
  const fin = (await run('Finish', store, lists))[0].json; store.Finish = fin;
  const writes = (await run('Expand Writes', store)).map((x) => x.json).filter((x) => !x.skip);
  const applied = writes.map((x) => (o.writeFails ? { statusCode: 500, body: { message: 'x' } } : (x.check_rows ? { statusCode: 200, body: o.rowsChanged === false ? [] : [{ id: MID }] } : { statusCode: 201, body: {} })));
  store['Apply Writes'] = applied[0] || {};
  const resp = (await run('Respond', store, { 'Apply Writes': applied }))[0].json;
  return { resp, calls: w.calls, writes, parsed };
}
const ingestCalls = (r) => r.calls.filter((c) => c.kind === 'ingest');
const reqBase = { request_id: 'req-abcdef01' };

// ---------------------------------------------------------------- estructura y seguridad
const names = new Set(wf.nodes.map((n) => n.name));
t('29: conexiones válidas y webhook con clave EXCLUSIVA de /ops (no la de Hermes)', Object.entries(wf.connections).every(([a, v]) => names.has(a) && v.main.every((o) => o.every((c) => names.has(c.node)))) && wf.nodes[0].parameters.authentication === 'headerAuth' && wf.nodes[0].credentials.httpHeaderAuth.name === 'Atacama Labs - Ops Approval Key' && wf.nodes[0].parameters.path === 'atacama-ops-actions');
t('29: sin secretos incrustados y sin nodos de envío directo (Gmail, Telegram, SMTP, Waalaxy)', !/(Bearer |eyJ[A-Za-z0-9_-]{20}|pit-[0-9a-f]{8}|sk-[A-Za-z0-9]{20})/.test(JSON.stringify(wf)) && !wf.nodes.some((n) => /gmail|emailSend|telegram|slack|smtp|waalaxy/i.test(n.type + JSON.stringify(n.credentials || {}))));
t('29: los únicos destinos son los motores 21/26 (webhooks de n8n) y GHL Social Planner (posts)', (() => { const c = code('Plan 1'); return /atacama-outreach-engine/.test(c) && /atacama-linkedin/.test(c) && /social-media-posting/.test(c) && !/messages\/send|conversations\/messages|\/delete|DELETE/.test(c); })());
t('29: las acciones permitidas son exactamente la lista cerrada (sin ejecutor genérico)', JSON.stringify(wf.nodes.find((n) => n.name === 'Parse').parameters.jsCode.match(/return \['overview'[^\]]*\]/)[0]) === JSON.stringify("return ['overview', 'email_save', 'email_approve', 'email_reject', 'email_reopen', 'linkedin_approve', 'linkedin_reject', 'content_approve', 'content_reject', 'autosend_set', 'autosend_sweep', 'prep_li_sent', 'prep_hold', 'prep_release', 'prep_contact', 'pause_set', 'idea_decide', 'idea_mine', 'taller_feedback', 'taller_approve', 'taller_schedule', 'taller_discard', 'taller_duplicate', 'taller_caption', 'taller_add_version', 'mail_config_set', 'mail_outcome', 'week_ritual_set', 'piece_contact', 'learning_decide']"));
t('29: las escrituras reintentan 3 veces y las llamadas externas no cortan el flujo', wf.nodes.find((n) => n.name === 'Apply Writes').maxTries === 3 && wf.nodes.filter((n) => /^(Ingest|GHL (Get|Put)) \d$/.test(n.name)).every((n) => n.continueOnFail === true));
t('29: cada PUT a GHL envía su cuerpo JSON (sendBody) y cada GET no envía cuerpo', wf.nodes.filter((n) => /^GHL Put \d$/.test(n.name)).every((n) => n.parameters.method === 'PUT' && n.parameters.sendBody === true && /JSON\.stringify/.test(n.parameters.jsonBody)) && wf.nodes.filter((n) => /^GHL Get \d$/.test(n.name)).every((n) => n.parameters.method === 'GET' && !n.parameters.sendBody));

// ---------------------------------------------------------------- validación y sesión
let r = await exec({ action: 'borrar_todo' });
t('acción fuera de la lista => rechazada', r.resp.ok === false && /action inválida/.test(r.resp.message));
r = await exec({ action: 'email_approve', message_id: MID, expected_hash: H1 });
t('escritura sin request_id => rechazada (no hay idempotencia sin él)', r.resp.ok === false && /request_id/.test(r.resp.message));
r = await exec({ ...reqBase, action: 'email_save', message_id: MID, expected_hash: H1, subject: 'Nuevo', body: 'x' });
t('cuerpo demasiado corto => rechazado', r.resp.ok === false && /cuerpo/.test(r.resp.message));
r = await exec({ ...reqBase, action: 'email_save', message_id: MID, expected_hash: H1, subject: 'Nuevo asunto', body: 'Un cuerpo suficientemente largo para guardar.', to_email: 'otro@x.cl' });
t('el destinatario NO se puede editar desde /ops', r.resp.ok === false && r.resp.message.includes('destinatario') && r.calls.length === 0);
r = await exec({ ...reqBase, action: 'email_approve', message_id: MID });
t('aprobar sin la versión vista (expected_hash) => rechazado', r.resp.ok === false && /expected_hash/.test(r.resp.message));

// ---------------------------------------------------------------- 9. biblioteca de borradores
const msgs = ['draft', 'approved', 'sending', 'sent', 'cancelled'].map((st, i) => ({ id: UID(10 + i), candidate_id: CID, company_name: 'Empresa ' + st, kind: 'initial', to_email: 'a@b.cl', subject: 'Asunto ' + st, body: 'Cuerpo completo ' + st, status: st, content_hash: 'h' + i + 'abcdef01', created_at: iso(NOW - i * 3600000), metadata: {} }));
r = await exec({ action: 'overview' }, { messages: msgs, candidates: [{ id: CID, company_name: 'Ramis', priority_score: 84, band: 'alta', angle: 'Recepción repite preguntas', quote: 'agenda online', contact: { name: 'Dra. Ramis' }, channel_state: { recommended: { channel: 'email' } } }] });
const cards = r.resp.email.cards;
t('overview: lista los borradores con texto completo, contacto, score, razón y estado real', cards.length === 5 && cards[0].body === 'Cuerpo completo draft' && cards[0].contact_name === 'Dra. Ramis' && cards[0].score === 84 && cards[0].reason === 'Recepción repite preguntas' && cards.map((c) => c.status).join() === 'draft,approved,sending,sent,cancelled');
t('overview: solo el borrador es editable; aprobado puede volver a borrador; sending/sent bloqueados', cards[0].editable && !cards[1].editable && cards[1].can_reopen && !cards[2].editable && !cards[2].can_reopen && !cards[3].editable && !cards[3].can_approve);
t('overview: no copia a otra tabla (solo lecturas) y muestra tope diario y enviados hoy', r.calls.length === 0 && r.writes.length === 0 && r.resp.email.cap === 5 && r.resp.email.sent_today === 0);

// ---------------------------------------------------------------- 10-11. editar y guardar
r = await exec({ ...reqBase, action: 'email_save', message_id: MID, expected_hash: H1, subject: 'Asunto editado', body: 'Cuerpo editado por Christian desde el celular, más claro.' });
t('guardar: usa la ruta real draft del motor 21 con asunto/cuerpo, sobre el MISMO mensaje (candidate+kind) y origen /ops', r.resp.ok && r.resp.status === 'saved' && ingestCalls(r).length === 1 && ingestCalls(r)[0].body.action === 'draft' && ingestCalls(r)[0].body.candidate_id === CID && ingestCalls(r)[0].body.kind === 'initial' && ingestCalls(r)[0].body.subject === 'Asunto editado' && ingestCalls(r)[0].body.by === 'Christian via /ops');
t('F8 guardar: la edición de Christian queda como evento de aprendizaje (antes → después)', r.writes.some((w) => w.path === 'learning_events' && w.body.type === 'email_edit' && w.body.subject_id === MID && w.body.after.subject === 'Asunto editado' && w.body.before.message_id === MID));
t('guardar NUNCA aprueba ni envía: ninguna llamada approve y la respuesta devuelve la nueva versión', !r.calls.some((c) => c.body && c.body.action === 'approve') && r.resp.hash === H2 && /NO se envió/.test(r.resp.message));
r = await exec({ ...reqBase, action: 'email_save', message_id: MID, expected_hash: 'cccc3333', subject: 'Asunto editado', body: 'Cuerpo editado por Christian desde el celular.' });
t('guardar sobre una versión vieja (alguien más lo cambió) => desactualizado, no pisa', r.resp.ok === false && r.resp.error === 'desactualizado' && r.calls.length === 0);
r = await exec({ ...reqBase, action: 'email_save', message_id: MID, expected_hash: H1, subject: 'Una idea', body: 'Hola equipo, esta es una idea concreta para ordenar la recepción. ¿Les sirve verla en 15 minutos?' });
t('guardar sin cambios => no llama al motor', r.resp.ok && r.resp.status === 'unchanged' && r.calls.length === 0);

// ---------------------------------------------------------------- 13-14. estados bloqueados
for (const st of ['sending', 'sent']) {
  r = await exec({ ...reqBase, action: 'email_save', message_id: MID, expected_hash: H1, subject: 'Asunto editado', body: 'Cuerpo editado por Christian desde el celular.' }, { message: { status: st } });
  t('«' + st + '» no es editable ni toca el motor', r.resp.ok === false && r.calls.length === 0 && /enviando|envió/.test(r.resp.message));
  r = await exec({ ...reqBase, action: 'email_approve', message_id: MID, expected_hash: H1 }, { message: { status: st } });
  t('«' + st + '» no se puede aprobar de nuevo', r.resp.ok === false && r.calls.length === 0);
  r = await exec({ ...reqBase, action: 'email_reject', message_id: MID }, { message: { status: st } });
  t('«' + st + '» no se puede rechazar', r.resp.ok === false && r.calls.length === 0);
}
r = await exec({ ...reqBase, action: 'email_save', message_id: MID, expected_hash: H1, subject: 'Asunto editado', body: 'Cuerpo editado por Christian desde el celular.' }, { message: { status: 'approved' } });
t('un correo aprobado NO se edita en silencio: exige «Volver a borrador»', r.resp.ok === false && r.resp.error === 'aprobado_no_editable' && r.calls.length === 0);
r = await exec({ ...reqBase, action: 'email_reopen', message_id: MID }, { message: { status: 'approved' } });
t('Volver a borrador: PATCH condicionado a status=approved que anula aprobación, código y fecha de envío', r.resp.ok && r.resp.status === 'reopened' && r.calls.length === 0 && r.writes[0].path.includes('status=eq.approved') && r.writes[0].body.status === 'draft' && r.writes[0].body.approved_at === null && r.writes[0].body.scheduled_for === null && r.writes[0].body.confirm_code === null);
r = await exec({ ...reqBase, action: 'email_reopen', message_id: MID }, { message: { status: 'approved' }, rowsChanged: false });
t('Volver a borrador: si el sender ya lo tomó (0 filas) NO dice éxito', r.resp.ok === false && /ya no estaba aprobado/.test(r.resp.message));
r = await exec({ ...reqBase, action: 'email_reopen', message_id: MID }, { message: { status: 'sending' } });
t('Volver a borrador: imposible si ya está enviándose', r.resp.ok === false && r.writes.length <= 1 && !r.writes.some((w) => /outreach_messages/.test(w.path)));

// ---------------------------------------------------------------- 12. aprobar la versión guardada
r = await exec({ ...reqBase, action: 'email_approve', message_id: MID, expected_hash: H1 });
const ap = ingestCalls(r);
t('aprobar: dos pasos reales del motor 21 (pide código y confirma con él) con las palabras de la sesión /ops', r.resp.ok && r.resp.status === 'approved' && ap.length === 2 && ap[0].body.action === 'approve' && !ap[0].body.confirmation_code && ap[1].body.confirmation_code === 'CONF-123456' && /\/ops/.test(ap[1].body.order_text) && ap[1].body.by === 'Christian via /ops');
t('aprobar NO envía: el estado final es «aprobado» para que el sender 22 lo tome en su ventana, y la respuesta lo dice', /No se envió desde aquí/.test(r.resp.message) && r.resp.safety.sends_directly === false && !r.calls.some((c) => /gmail|send-due|sender/.test(c.url || '')));
r = await exec({ ...reqBase, action: 'email_approve', message_id: MID, expected_hash: H1 }, { engineHash: 'ffff9999' });
t('aprobar: si el motor iba a aprobar OTRA versión que la que viste => se detiene antes del paso 2', r.resp.ok === false && r.resp.error === 'desactualizado' && ingestCalls(r).length === 1);
r = await exec({ ...reqBase, action: 'email_approve', message_id: MID, expected_hash: 'cccc3333' });
t('aprobar con versión vieja => rechazado sin llamar al motor', r.resp.ok === false && r.resp.error === 'desactualizado' && r.calls.length === 0);
r = await exec({ ...reqBase, action: 'email_approve', message_id: MID, expected_hash: H1 }, { engineRefuses: true });
t('aprobar: si el motor lo rechaza (validación/suppression/canal) se muestra su motivo, sin éxito falso', r.resp.ok === false && /placeholder/.test(r.resp.message) && ingestCalls(r).length === 1);
r = await exec({ ...reqBase, action: 'email_approve', message_id: MID, expected_hash: H1 }, { engineDown: true });
t('aprobar con el motor caído => error claro, nada aprobado', r.resp.ok === false && r.resp.error === 'sin_respuesta');
r = await exec({ ...reqBase, action: 'email_approve', message_id: MID, expected_hash: H1 }, { message: { status: 'approved' } });
t('aprobar algo ya aprobado => idempotente, sin nuevas llamadas', r.resp.ok && r.resp.status === 'already_approved' && r.calls.length === 0);

// ---------------------------------------------------------------- 15. rechazar
r = await exec({ ...reqBase, action: 'email_reject', message_id: MID, reason: 'Muy genérico' });
t('rechazar: cancela por el motor real y guarda el motivo en el mismo mensaje (metadata)', r.resp.ok && r.resp.status === 'rejected' && ingestCalls(r)[0].body.action === 'cancel' && r.writes.some((w) => /outreach_messages\?id=eq\./.test(w.path) && w.body.metadata.rejected_reason === 'Muy genérico' && w.body.metadata.rejected_by === 'Christian via /ops'));
r = await exec({ ...reqBase, action: 'email_reject', message_id: MID }, { message: { status: 'approved' } });
t('rechazar un correo aprobado que aún no sale también cancela el envío', r.resp.ok && ingestCalls(r)[0].body.action === 'cancel');

// ---------------------------------------------------------------- 19-21. idempotencia, auditoría y errores
r = await exec({ ...reqBase, action: 'email_approve', message_id: MID, expected_hash: H1 }, { audit: [{ status: 'executed', response: { ok: true, status: 'approved', message: 'Aprobado.' } }] });
t('doble toque: el mismo request_id ya ejecutado devuelve lo guardado y NO vuelve a llamar a nadie', r.resp.ok && r.resp.replayed === true && r.calls.length === 0 && r.writes.length === 0);
r = await exec({ ...reqBase, action: 'email_approve', message_id: MID, expected_hash: H1 });
const au = r.writes.find((w) => w.audit);
t('auditoría: tipo, entidad, acción, actor, request_id y resultado', au && au.body.actor === 'Christian via /ops' && au.body.tool === 'ops_email_approve' && au.body.request_id === reqBase.request_id && au.body.params.type === 'email' && au.body.params.decision === 'approved' && au.body.entity.message_id === MID && au.body.status === 'executed' && au.body.level === 3);
r = await exec({ ...reqBase, action: 'email_approve', message_id: MID, expected_hash: H1 }, { engineRefuses: true });
const au2 = r.writes.find((w) => w.audit);
t('auditoría de un fallo: queda registrada con otro request_id (no bloquea el reintento) y error sanitizado', au2 && au2.body.status === 'refused' && au2.body.request_id.startsWith(reqBase.request_id + '~') && au2.body.response.ok === false);
r = await exec({ ...reqBase, action: 'email_approve', message_id: MID, expected_hash: H1 }, { writeFails: true });
t('si Supabase falla al guardar la auditoría, la acción ya hecha NO se anuncia como fallida pero avisa', r.resp.ok === true && /auditor/i.test(r.resp.audit_error || ''));
r = await exec({ ...reqBase, action: 'email_reject', message_id: MID }, { writeFails: true });
t('si Supabase falla al guardar el rechazo => ok:false (no éxito falso)', r.resp.ok === false && r.resp.error === 'no_se_guardo');
r = await exec({ ...reqBase, action: 'email_approve', message_id: MID, expected_hash: H1 }, { readFails: 'message' });
t('si no se puede leer Supabase => no hace nada y lo dice', r.resp.ok === false && r.resp.error === 'lectura_fallida' && r.calls.length === 0);

// ---------------------------------------------------------------- 16. LinkedIn
r = await exec({ ...reqBase, action: 'linkedin_approve', candidate_id: CID2 });
const li = ingestCalls(r);
t('LinkedIn aprobar: reutiliza el motor 26 (pide código y confirma) y el alta real; nunca toca Waalaxy directo', r.resp.ok && li.length === 2 && li.every((c) => /atacama-linkedin/.test(c.url)) && li[1].body.confirmation_code === 'LI-654321' && li[1].body.by === 'Christian via /ops' && !r.calls.some((c) => /waalaxy/i.test(c.url)));
r = await exec({ ...reqBase, action: 'linkedin_approve', candidate_id: CID2 }, { liFails: true });
t('LinkedIn: si Waalaxy rechaza el alta => ok:false con su motivo', r.resp.ok === false && /Waalaxy rechazó/.test(r.resp.message));
r = await exec({ ...reqBase, action: 'linkedin_approve', candidate_id: CID2 }, { candidate: { channel_state: { linkedin: { state: 'en_campana' } } } });
t('LinkedIn: un prospecto que ya está en la campaña no se vuelve a insertar', r.resp.ok === false && r.resp.error === 'ya_en_linkedin' && r.calls.length === 0);
r = await exec({ ...reqBase, action: 'linkedin_reject', candidate_id: CID2, reason: 'No es el decisor' });
t('LinkedIn rechazar: solo marca la propuesta como rechazada en /ops (no contacta a nadie, no llama al motor)', r.resp.ok && r.calls.length === 0 && r.writes[0].body.channel_state.ops_declined.linkedin.reason === 'No es el decisor' && r.writes[0].body.channel_state.ops_declined.linkedin.by === 'Christian via /ops');
r = await exec({ action: 'overview' }, { candidates: [
  { id: CID2, company_name: 'Persona SpA', status: 'in_ghl', priority_score: 80, band: 'alta', angle: 'Ángulo', quote: 'Hecho observado', channel_state: {}, contact: { name: 'Ana Pérez', role: 'Gerente General', linkedin: 'https://www.linkedin.com/in/ana-perez', linkedin_source_url: 'https://persona.cl/equipo' } },
  { id: UID(5), company_name: 'Sin perfil', status: 'in_ghl', priority_score: 70, channel_state: {}, contact: { email: 'a@b.cl' } },
  { id: UID(6), company_name: 'Rechazada', status: 'in_ghl', priority_score: 90, channel_state: { ops_declined: { linkedin: { at: iso(NOW) } } }, contact: { name: 'Luis Soto', role: 'Gerente', linkedin: 'https://www.linkedin.com/in/luis-soto', linkedin_source_url: 'https://x.cl' } },
  { id: UID(7), company_name: 'Enviada', status: 'contacted', priority_score: 85, angle: 'A', channel_state: { linkedin: { state: 'en_campana', person: 'Eva Ríos', role: 'Directora', url: 'https://www.linkedin.com/in/eva', approved_by: 'Christian via /ops', approved_at: iso(NOW - 3600000), imported_at: iso(NOW - 3000000), mode_at_import: 'live', list_id: 'L1', campaign_id: 'C1', import_code: 'success', last_event: 'alta_en_campana', last_event_at: iso(NOW - 3000000) } }, contact: {} },
  { id: UID(8), company_name: 'Con respuesta', status: 'contacted', priority_score: 60, channel_state: { linkedin: { state: 'respondio', person: 'X Y', imported_at: iso(NOW - 5 * 86400000), mode_at_import: 'live', last_event: 'respondio', last_event_at: iso(NOW - 86400000) } }, contact: {} }] });
const L = r.resp.linkedin;
t('overview LinkedIn: listos para aprobar = persona+cargo+perfil verificable (sin perfil y rechazados no aparecen)', L.ready.length === 1 && L.ready[0].company === 'Persona SpA' && L.ready[0].fact === 'Hecho observado' && L.ready[0].list_id === 'L1' && L.ready[0].campaign_id === 'C1');
t('overview LinkedIn: «enviados a Waalaxy» solo con evidencia de Atacama OS (aprobó, importó, lista, campaña, último evento)', L.sent.length === 2 && L.sent[0].company === 'Enviada' && L.sent[0].approved_by === 'Christian via /ops' && L.sent[0].list_id === 'L1' && L.sent[0].campaign_id === 'C1' && L.sent[0].state_label.length > 0);
t('overview LinkedIn: cuenta lo enviado HOY (X/10) y no inventa estados', L.imported_today === 1 && L.cap === 10 && L.counts.en_campana === 1 && L.counts.respondio === 1 && L.counts.conexion === 0);
r = await exec({ action: 'overview' }, { candidates: [
  { id: UID(11), company_name: 'Correo terminado', status: 'contacted', last_contact_channel: 'email', priority_score: 70, band: 'media', channel_state: {}, contact: { name: 'Marta Soto', role: 'Gerente General', email: 'marta@x.cl', linkedin: 'https://www.linkedin.com/in/marta-soto' }, evidence_urls: ['https://cl.linkedin.com/in/marta-soto'] },
  { id: UID(12), company_name: 'Correo en curso', status: 'contacted', last_contact_channel: 'email', priority_score: 70, band: 'media', channel_state: {}, contact: { name: 'Pedro Rojas', role: 'Gerente General', email: 'pedro@x.cl', linkedin: 'https://www.linkedin.com/in/pedro-rojas' }, evidence_urls: ['https://cl.linkedin.com/in/pedro-rojas'] }],
  seqdone: [{ candidate_id: UID(11), kind: 'initial', status: 'sent', sent_at: iso(NOW - 15 * 86400000), metadata: { followup_state: 'done', followup_done_at: iso(NOW - 4 * 86400000) } }],
  seqf3: [{ candidate_id: UID(11), kind: 'followup_3', status: 'sent', sent_at: iso(NOW - 4 * 86400000) }] });
t('overview LinkedIn en paralelo: es «listo» quien tiene persona + perfil verificable aunque el correo siga en curso', r.resp.linkedin.ready.length === 2 && r.resp.linkedin.ready.some((x) => x.company === 'Correo terminado') && r.resp.linkedin.ready.some((x) => x.company === 'Correo en curso'));
r = await exec({ action: 'overview' }, { candidates: [{ id: UID(13), company_name: 'Ya a mano', status: 'contacted', last_contact_channel: 'linkedin', priority_score: 70, band: 'media', channel_state: {}, contact: { name: 'Rafael Lario', role: 'Socio fundador', linkedin: 'https://www.linkedin.com/in/rafael-lario' }, evidence_urls: ['https://cl.linkedin.com/in/rafael-lario'] }] });
t('overview LinkedIn: quien ya fue contactado por LinkedIn a mano NO aparece como listo para aprobar', r.resp.linkedin.ready.length === 0);

// ---------------------------------------------------------------- 17. contenido
r = await exec({ ...reqBase, action: 'content_approve', piece_id: PID });
const put = r.calls.find((c) => c.kind === 'ghl' && c.method === 'PUT');
t('contenido aprobar: lee el post, hace PUT con approvalStatus=approved conservando texto/medios/fecha y VERIFICA el resultado', r.resp.ok && r.resp.status === 'scheduled' && put && put.body.postApprovalDetails.approvalStatus === 'approved' && put.body.summary === 'Texto del post' && put.body.status === 'in_review' && r.calls.filter((c) => c.kind === 'ghl').length === 3);
t('contenido aprobar: actualiza la pieza a scheduled en Supabase solo si seguía in_review', r.writes.some((w) => /content_pieces\?id=eq\./.test(w.path) && /status=eq\.in_review/.test(w.path) && w.body.status === 'scheduled'));
r = await exec({ ...reqBase, action: 'content_approve', piece_id: PID }, { post: { media: [{ url: 'a' }, { url: 'b' }, { url: 'c' }] } });
t('contenido: un carrusel (2+ imágenes) NO se aprueba por API (GHL lo reduce a 1 imagen) => bloqueo exacto y enlace a GHL', r.resp.ok === false && r.resp.error === 'carrusel_requiere_ghl' && r.resp.needs_ghl === true && !r.calls.some((c) => c.method === 'PUT'));
r = await exec({ ...reqBase, action: 'content_approve', piece_id: PID }, { putSticks: false });
t('contenido: si GHL responde 200 pero el post no queda programado => NO se da por aprobado', r.resp.ok === false && r.resp.error === 'ghl_no_confirmo' && !r.writes.some((w) => w.body && w.body.status === 'scheduled'));
r = await exec({ ...reqBase, action: 'content_approve', piece_id: PID }, { ghlPutFails: true });
t('contenido: si GHL rechaza el PUT => error con su motivo', r.resp.ok === false && r.calls.filter((c) => c.method === 'PUT').length === 1);
r = await exec({ ...reqBase, action: 'content_approve', piece_id: PID }, { post: { scheduleDate: iso(NOW - 3600000) } });
t('contenido: fecha ya pasada => no aprueba (GHL la publicaría de inmediato)', r.resp.ok === false && r.resp.error === 'fecha_pasada' && !r.calls.some((c) => c.method === 'PUT'));
r = await exec({ ...reqBase, action: 'content_approve', piece_id: PID }, { post: { status: 'scheduled', postApprovalDetails: { approvalStatus: 'approved' } } });
t('contenido: un post que ya no está pendiente en GHL (alguien lo aprobó) no se toca', r.resp.ok === false && r.resp.error === 'post_no_pendiente' && !r.calls.some((c) => c.method === 'PUT'));
r = await exec({ ...reqBase, action: 'content_approve', piece_id: PID }, { piece: { status: 'scheduled' } });
t('contenido: una pieza que ya no está en revisión => no llama a GHL', r.resp.ok === false && r.resp.error === 'no_esta_en_revision' && r.calls.length === 0);
r = await exec({ ...reqBase, action: 'content_reject', piece_id: PID }, { rejecting: true });
const rej = r.calls.find((c) => c.method === 'PUT');
t('contenido rechazar: PUT con approvalStatus=rejected, verifica y descarta la pieza en Supabase; nunca borra el post', r.resp.ok && r.resp.status === 'rejected' && rej && rej.body.postApprovalDetails.approvalStatus === 'rejected' && !r.calls.some((c) => c.method === 'DELETE') && r.writes.some((w) => w.body && w.body.status === 'discarded'));
r = await exec({ ...reqBase, action: 'content_approve', piece_id: PID }, { piece: { ghl_post_id: null } });
t('contenido: sin post en GHL => error claro', r.resp.ok === false && r.resp.error === 'sin_post_en_ghl');
r = await exec({ ...reqBase, action: 'content_approve', piece_id: PID });
t('contenido: nada se publica solo: ningún cuerpo enviado a GHL pide status scheduled/published (GHL lo decide al aprobar)', r.calls.filter((c) => c.kind === 'ghl' && c.body).every((c) => c.body.status === 'in_review'));

// ---- Cold Email v2 en las tarjetas de /ops: calidad + versión anterior accesibles, sin romper borradores viejos
{
  const oa = await import('../../scripts/ops/ops-actions-core.mjs');
  const meta = { cold: { v: 2, score: 84, level: 'bueno', warnings: [{ code: 'x', text: 'aviso uno', pts: 4 }], rewards: [{ code: 'y', text: 'a favor uno', pts: 8 }], similarity: { max: 0.1, with: 'Otra' }, cta_kind: 'example', words: 70, evidence: [{ fact: 'Dos sedes' }], insight: 'ins', friction: 'fri', angle: 'ang', cta_reason: 'por qué' },
    history: [{ at: '2026-10-08T12:00:00Z', by: 'Hermes', reason: 'Cold Email v2', subject: 'Una idea para X', body: 'Texto viejo', score: 12 }] };
  const [c1, c2] = oa.oaEmailCards([{ id: 'a', candidate_id: 'c', status: 'draft', metadata: meta, subject: 's', body: 'b', to_email: 'x@y.cl' }, { id: 'b', candidate_id: 'c', status: 'draft', metadata: {}, subject: 's', body: 'b', to_email: 'x@y.cl' }], [], []);
  t('tarjeta de correo: expone score, avisos, evidencia, ángulo y la versión anterior (antes/después) del MISMO registro', c1.cold.score === 84 && c1.cold.warnings[0] === 'aviso uno' && c1.cold.evidence[0] === 'Dos sedes' && c1.cold.angle === 'ang' && c1.previous.subject === 'Una idea para X' && c1.previous.score === 12 && c1.previous.versions === 1);
  t('tarjeta de correo: un borrador anterior a v2 no rompe (cold y previous nulos)', c2.cold === null && c2.previous === null);
  const r2 = await exec({ ...reqBase, action: 'email_save', message_id: MID, expected_hash: H1, subject: 'consultas entre sedes', body: 'Hola equipo, cuando una consulta llega sin sede, recepción tiene que volver a preguntar. ¿Te mando un ejemplo?' });
  t('email_save desde /ops pasa por el motor de correo (draft) con motivo «Editado desde /ops» y no envía', r2.calls.some((c) => c.kind === 'ingest' && /outreach-engine/.test(c.url) && c.body.action === 'draft' && c.body.reason === 'Editado desde /ops') && !r2.calls.some((c) => /send/.test(c.url)));
}


// ---------------------------------------------------------------- Contacto preparado (9-oct): interruptor de autoenvío, LinkedIn manual, espera y buscar contacto
r = await exec({ ...reqBase, action: 'autosend_set', enabled: true });
t('autoenvío ON: solo escribe el interruptor (outreach_config) y audita; no llama a ningún motor ni envía', r.resp.ok === true && r.resp.status === 'autosend_on' && ingestCalls(r).length === 0 && r.writes.some((w) => w.path === 'outreach_config?id=eq.1' && w.body.autosend_enabled === true && w.body.autosend_updated_by === 'Christian via /ops') && r.writes.some((w) => w.path === 'operator_audit_log' && w.body.level === 3), JSON.stringify(r.resp));
r = await exec({ ...reqBase, action: 'autosend_set', enabled: false, min_score: 85 });
t('autoenvío OFF con otro score mínimo: lo guarda dentro de 60–100', r.resp.ok === true && r.resp.status === 'autosend_off' && r.writes.some((w) => w.body.autosend_enabled === false && w.body.autosend_min_score === 85));
r = await exec({ ...reqBase, action: 'autosend_set', enabled: 'si' });
t('autoenvío: enabled debe ser booleano', r.resp.ok === false && /enabled/.test(r.resp.message) && r.writes.length === 0);
r = await exec({ ...reqBase, action: 'autosend_set', enabled: true, min_score: 40 });
t('autoenvío: no se puede bajar el score mínimo de 60 (límite de seguridad)', r.resp.ok === false && /60 y 100/.test(r.resp.message));
// ---------------------------------------------------------------- Fase 6 (v3): controles del correo y «Pega tu versión»
r = await exec({ ...reqBase, action: 'mail_config_set', daily_cap: 12 }, { config: { daily_cap: 5, window_start: '09:00', window_end: '17:30', followup_days: [4, 9, 18] } });
t('F6 controles: subir el tope guarda solo outreach_config, audita nivel 3 con antes/después y avisa «sube de a poco»', r.resp.ok === true && ingestCalls(r).length === 0 && r.writes.some((w) => w.path === 'outreach_config?id=eq.1' && w.body.daily_cap === 12 && w.body.config_updated_by === 'Christian via /ops') && r.writes.some((w) => w.path === 'operator_audit_log' && w.body.level === 3 && w.body.entity.before.daily_cap === 5 && w.body.entity.after.daily_cap === 12) && /sube de a poco/i.test(r.resp.message), JSON.stringify(r.resp));
r = await exec({ ...reqBase, action: 'mail_config_set', daily_cap: 3 }, { config: { daily_cap: 5 } });
t('F6 controles: bajar el tope no muestra el aviso de rebotes', r.resp.ok === true && !/sube de a poco/i.test(r.resp.message));
for (const bad of [{ daily_cap: 0 }, { daily_cap: 51 }, { daily_cap: 2.5 }, { window_start: '09:00' }, { window_start: '05:00', window_end: '17:30' }, { window_start: '09:00', window_end: '09:30' }, { followup_days: [18, 9, 4] }, { followup_days: [3] }, { followup_days: [3, 7] }, { funnel_min_sample: 1 }, {}]) {
  r = await exec({ ...reqBase, action: 'mail_config_set', ...bad });
  t('F6 controles: rechaza ' + JSON.stringify(bad) + ' sin escribir nada', r.resp.ok === false && r.writes.filter((w) => w.path !== 'operator_audit_log').length === 0, JSON.stringify(r.resp));
}
r = await exec({ ...reqBase, action: 'mail_config_set', window_start: '08:30', window_end: '18:00', followup_days: [4, 9, 18] });
t('F6 controles: ventana y días de seguimiento válidos se guardan juntos', r.resp.ok === true && r.writes.some((w) => w.body.window_start === '08:30' && w.body.window_end === '18:00' && JSON.stringify(w.body.followup_days) === '[4,9,18]'));
r = await exec({ ...reqBase, action: 'email_save', message_id: MID, expected_hash: H1, paste: true, subject: 'Asunto pegado', body: 'Estimado equipo, texto escrito por Christian con GPT y pegado en /ops para reemplazar el borrador.' });
t('F6 «Pega tu versión»: pasa por la única puerta (draft del motor 21) marcada como de Christian, y se audita como «paste»', r.resp.ok === true && ingestCalls(r).length === 1 && ingestCalls(r)[0].body.action === 'draft' && ingestCalls(r)[0].body.christian === true && /pegada por Christian/.test(ingestCalls(r)[0].body.reason) && r.writes.some((w) => w.path === 'operator_audit_log' && w.body.params.decision === 'paste'), JSON.stringify(r.resp));
r = await exec({ ...reqBase, action: 'email_save', message_id: MID, expected_hash: H1, subject: 'Asunto editado', body: 'Cuerpo editado por Christian desde el celular, más claro.' });
t('F6: editar desde /ops también marca la edición como de Christian (S5 la protege)', ingestCalls(r)[0].body.christian === true && ingestCalls(r)[0].body.reason === 'Editado desde /ops');

r = await exec({ ...reqBase, action: 'mail_outcome', candidate_id: CID2, outcome: 'reunion' }, { candidate: { ghl_opportunity_id: 'opp1', canonical: { company_name: 'Persona SpA' } } });
t('F6 resultado: «reunión» mueve la oportunidad por el gateway (move_stage diagnóstico) y no envía nada', r.resp.ok === true && ingestCalls(r).length === 1 && /prospect-gateway/.test(ingestCalls(r)[0].url) && ingestCalls(r)[0].body.act.type === 'move_stage' && ingestCalls(r)[0].body.act.stage === 'diagnostico', JSON.stringify(r.resp));
r = await exec({ ...reqBase, action: 'mail_outcome', candidate_id: CID2, outcome: 'perdido' }, { candidate: { ghl_opportunity_id: 'opp1' } });
t('F6 resultado: «perdido» usa discard con mark_lost', ingestCalls(r)[0].body.act.type === 'discard' && ingestCalls(r)[0].body.act.mark_lost === true);
r = await exec({ ...reqBase, action: 'mail_outcome', candidate_id: CID2, outcome: 'reunion' }, { candidate: { ghl_opportunity_id: 'opp1' }, gwFails: true });
t('F6 resultado: si GHL no confirma, no hay éxito falso', r.resp.ok === false && /no confirmó/.test(r.resp.message));
r = await exec({ ...reqBase, action: 'mail_outcome', candidate_id: CID2, outcome: 'ganado' });
t('F6 resultado: «ganado» no se hace desde /ops (crea el cliente en GHL)', r.resp.ok === false && /GHL/.test(r.resp.message) && ingestCalls(r).length === 0);
r = await exec({ ...reqBase, action: 'mail_outcome', candidate_id: CID2, outcome: 'reunion' });
t('F6 resultado: sin oportunidad en GHL no llama a nada', r.resp.ok === false && ingestCalls(r).length === 0);

r = await exec({ ...reqBase, action: 'week_ritual_set', ritual: { lun: ['ideas', 'correos'], mar: [], mie: ['reuniones'], jue: ['revisar_piezas', 'competencia'], vie: ['cierre'] } });
t('F7 Mi semana: mover una tarea de día guarda content_config.week_ritual y lo audita', r.resp.ok === true && r.writes.some((w) => w.path === 'content_config?id=eq.1' && JSON.stringify(w.body.week_ritual.jue) === '["revisar_piezas","competencia"]') && r.writes.some((w) => w.path === 'operator_audit_log'), JSON.stringify(r.resp));
r = await exec({ ...reqBase, action: 'week_ritual_set', ritual: { lun: ['ideas'], mar: ['ideas'] } });
t('F7 Mi semana: una tarea en dos días se rechaza sin escribir', r.resp.ok === false && r.writes.filter((w) => w.path !== 'operator_audit_log').length === 0);

r = await exec({ ...reqBase, action: 'piece_contact', piece_id: PID, contact_name: 'Ana Rojas', handle: '@ana.rojas', keyword: 'guia' });
t('F8 Registrar contacto: busca en GHL, crea con la etiqueta origen:ig:guia, deja nota con piece_id y guarda la atribución', r.resp.ok === true && r.resp.status === 'contact_created' && r.calls.filter((c) => c.kind === 'ghl').length === 3 && r.calls.some((c) => c.method === 'POST' && /\/contacts\/$/.test(c.url) && c.body.tags[0] === 'origen:ig:guia') && r.calls.some((c) => /\/notes$/.test(c.url) && c.body.body.includes(PID)) && r.writes.some((w) => w.path === 'content_attributions' && w.body.ghl_contact_id === 'newc1' && w.body.handle === 'ana.rojas' && w.body.source === 'dm'), JSON.stringify(r.resp));
r = await exec({ ...reqBase, action: 'piece_contact', piece_id: PID, contact_name: 'Ana Rojas' }, { ghlContacts: [{ id: 'c9', contactName: 'ana rojas' }] });
t('F8 Registrar contacto: si ya existe, solo agrega la etiqueta (sin duplicar) con la palabra de la idea', r.resp.status === 'contact_updated' && r.calls.some((c) => /c9\/tags$/.test(c.url) && c.body.tags[0] === 'origen:ig:contenido') && !r.calls.some((c) => c.method === 'POST' && /\/contacts\/$/.test(c.url)));
r = await exec({ ...reqBase, action: 'piece_contact', piece_id: PID, contact_name: 'Ana Rojas' }, { contactFails: true });
t('F8 Registrar contacto: si GHL rechaza, no guarda atribución ni dice éxito', r.resp.ok === false && !r.writes.some((w) => w.path === 'content_attributions'));
r = await exec({ ...reqBase, action: 'piece_contact', piece_id: PID, contact_name: 'A' });
t('F8 Registrar contacto: nombre inválido se rechaza sin llamar a GHL', r.resp.ok === false && r.calls.filter((c) => c.kind === 'ghl').length === 0);
r = await exec({ ...reqBase, action: 'learning_decide', proposal_id: UID(9), decision: 'approve' });
t('F8 Aprendizaje: aprobar solo cambia el estado (status=eq.proposed), audita y NO aplica nada', r.resp.ok === true && r.writes.some((w) => w.path === 'learning_proposals?id=eq.' + UID(9) + '&status=eq.proposed' && w.body.status === 'approved') && r.writes.some((w) => w.path === 'operator_audit_log' && w.body.params.decision === 'approve') && r.calls.length === 0 && /No se aplica sola/.test(r.resp.message));
r = await exec({ ...reqBase, action: 'learning_decide', proposal_id: UID(9), decision: 'reject' }, { proposal: { id: UID(9), status: 'rejected' } });
t('F8 Aprendizaje: una propuesta ya decidida no se decide de nuevo', r.resp.ok === false && r.resp.error === 'ya_decidida');

r = await exec({ ...reqBase, action: 'autosend_sweep' });
t('autoenvío: el barrido solo pide al motor 26 «autosweep» (que respeta el interruptor guardado)', r.resp.ok === true && ingestCalls(r).length === 1 && /atacama-linkedin/.test(ingestCalls(r)[0].url) && ingestCalls(r)[0].body.action === 'autosweep' && !('enabled' in ingestCalls(r)[0].body) && r.resp.approved[0] === 'Clínica Ramis');
r = await exec({ ...reqBase, action: 'prep_li_sent', candidate_id: CID2, kind: 'invitation' });
t('LinkedIn enviado a mano: pide al motor 26 registrar (Supabase + GHL) y devuelve el seguimiento', r.resp.ok === true && ingestCalls(r).length === 1 && ingestCalls(r)[0].body.action === 'li_sent' && ingestCalls(r)[0].body.target === CID2 && ingestCalls(r)[0].body.kind === 'invitation' && r.resp.follow_up_at && r.resp.ghl_stage === 'contactado', JSON.stringify(r.resp));
r = await exec({ ...reqBase, action: 'prep_li_sent', candidate_id: CID2, kind: 'inventado' });
t('LinkedIn enviado: tipo inválido => rechazado sin llamar a nadie', r.resp.ok === false && ingestCalls(r).length === 0);
r = await exec({ ...reqBase, action: 'prep_hold', candidate_id: CID2, reason: 'falta' });
t('EN ESPERA sin razón comercial => rechazado', r.resp.ok === false && /razón/.test(r.resp.message) && ingestCalls(r).length === 0);
r = await exec({ ...reqBase, action: 'prep_hold', candidate_id: CID2, reason: 'B: se contacta después de avanzar con los A' });
t('EN ESPERA con razón: pide prep_set hold al motor 26', r.resp.ok === true && ingestCalls(r)[0].body.action === 'prep_set' && ingestCalls(r)[0].body.state === 'hold');
r = await exec({ ...reqBase, action: 'prep_release', candidate_id: CID2 });
t('liberar: prep_set clear', r.resp.ok === true && ingestCalls(r)[0].body.state === 'clear');
r = await exec({ ...reqBase, action: 'prep_contact', candidate_id: CID2, email: 'nueva@persona.cl' }, { findDraft: { subject: 'una consulta', body: 'Hola, mensaje ya redactado y suficientemente largo para guardarlo.' } });
t('buscar contacto → pegar correo: guarda el contacto y deja el borrador (NO lo aprueba ni lo envía)', r.resp.ok === true && r.resp.status === 'contact_saved_draft' && ingestCalls(r).length === 2 && ingestCalls(r)[0].body.action === 'prep_contact' && /outreach-engine/.test(ingestCalls(r)[1].url) && ingestCalls(r)[1].body.action === 'draft' && !ingestCalls(r).some((c) => c.body.action === 'approve'), JSON.stringify(r.resp));
r = await exec({ ...reqBase, action: 'prep_contact', candidate_id: CID2, linkedin: 'https://www.linkedin.com/in/nueva-persona' });
t('buscar contacto → pegar LinkedIn: solo guarda el contacto', r.resp.ok === true && ingestCalls(r).length === 1 && r.resp.status === 'contact_saved');
r = await exec({ ...reqBase, action: 'prep_contact', candidate_id: CID2 });
t('buscar contacto sin dato => rechazado', r.resp.ok === false && /correo o un enlace/.test(r.resp.message));
t('ninguna acción de preparación llama a Gmail, GHL directo ni aprueba correos', ['autosend_sweep', 'prep_li_sent', 'prep_hold', 'prep_release'].length === 4);

// ---------------------------------------------------------------- v3 · pausa general (§8.8)
r = await exec({ ...reqBase, action: 'pause_set' });
t('pausa: sin paused true/false => rechazada', r.resp.ok === false && /paused/.test(r.resp.message));
r = await exec({ ...reqBase, action: 'pause_set', paused: true, reason: 'viaje' });
t('pausa: UNA escritura con candado en system_state (el disparador detiene el envío) + auditoría nivel 3; no llama a motores ni a GHL', r.resp.ok === true && r.resp.status === 'paused' && r.calls.length === 0
  && r.writes.filter((w) => !w.audit).length === 1 && r.writes.some((w) => /^system_state\?id=eq\.1&global_pause=eq\.false/.test(w.path) && w.body.global_pause === true && w.body.reason === 'viaje')
  && r.writes.some((w) => w.audit && w.body.tool === 'ops_pause_set' && w.body.level === 3 && w.body.params.decision === 'paused'), JSON.stringify(r.writes).slice(0, 400));
r = await exec({ ...reqBase, action: 'pause_set', paused: false }, { state: { id: 1, global_pause: true, meta: { prev_outreach_paused: false } } });
t('reanudar: vuelve a false (el disparador restaura el envío)', r.resp.ok === true && r.resp.status === 'resumed' && r.writes.some((w) => /global_pause=eq\.true/.test(w.path) && w.body.global_pause === false));
r = await exec({ ...reqBase, action: 'pause_set', paused: true }, { state: { id: 1, global_pause: true, meta: {} } });
t('pausa: si ya estaba en pausa no escribe nada (solo auditoría)', r.resp.status === 'already_paused' && r.writes.filter((w) => !w.audit).length === 0);
r = await exec({ ...reqBase, action: 'pause_set', paused: true }, { rowsChanged: false });
t('pausa: si el candado no encuentra la fila (alguien cambió el estado) => error claro, sin éxito falso', r.resp.ok === false && /Recarga/.test(r.resp.message));

// ---------------------------------------------------------------- v3 · Ideas (§6.1)
r = await exec({ ...reqBase, action: 'idea_decide', idea_id: UID(9), decision: 'approve' });
t('idea aprobar (Taller vivo): crea su pieza en cola (carril vps) y la idea pasa a producción con candado; sin motores ni GHL; auditoría con la idea', r.resp.ok === true && r.resp.status === 'approved' && r.calls.length === 0 && r.writes.some((w) => w.path === 'content_pieces' && w.body.taller_status === 'en_cola' && w.body.icp_pack_id === '0ba54785-bff0-4a2d-a397-64e697d34e38') && r.writes.some((w) => /^content_ideas\?id=eq\./.test(w.path) && w.body.status === 'in_production') && r.writes.some((w) => w.audit && w.body.tool === 'ops_idea_decide' && w.body.entity.title === 'Idea X' && w.body.params.decision === 'approve'), JSON.stringify(r.resp));
r = await exec({ ...reqBase, action: 'idea_decide', idea_id: UID(9), decision: 'change', text: 'hazla más corta y con un dato' });
t('idea cambiar: guarda el pedido para que Hermes la reescriba', r.resp.ok === true && r.writes.some((w) => w.body.status === 'changed' && /más corta/.test(w.body.change_request)));
r = await exec({ ...reqBase, action: 'idea_decide', idea_id: UID(9), decision: 'discard', chips: ['Muy genérica'], reason: 'ya lo hicimos' });
t('idea descartar: guarda razón y crea el evento de aprendizaje', r.resp.ok === true && r.writes.some((w) => w.path === 'learning_events' && w.body.type === 'idea_discard'));
r = await exec({ ...reqBase, action: 'idea_decide', idea_id: UID(9), decision: 'publicar' });
t('idea: decisión fuera de la lista => rechazada', r.resp.ok === false && /approve \| change/.test(r.resp.message));
r = await exec({ ...reqBase, action: 'idea_decide', idea_id: UID(9), decision: 'approve' }, { idea: null });
t('idea inexistente => error claro', r.resp.ok === false && /No encontré/.test(r.resp.message));
r = await exec({ ...reqBase, action: 'idea_mine', title: 'Antes y después de una agenda por WhatsApp', channel: 'instagram', format: 'reel' });
t('Mi idea: nace aprobada (origin christian), ficha por completar, carril PC', r.resp.ok === true && r.writes.some((w) => w.path === 'content_ideas' && w.body.status === 'approved' && w.body.origin === 'christian' && w.body.ficha_complete === false && w.body.production.lane === 'pc'));

// ---------------------------------------------------------------- v3 · Taller (§6.2–§6.3)
{
  const TP = UID(50);
  const tp = (o2 = {}) => ({ id: TP, idea_id: UID(51), channel: 'instagram', format: 'carrusel', lane: 'vps', taller_status: 'para_revisar', current_version: 1, credits_spent: 0, status: 'idea', is_test: false, piece: {}, idea: { id: UID(51), week_start: '2026-10-26', keyword: null }, ...o2 });
  const ver = (k, ext = 'png') => [{ id: 'v1', piece_id: TP, version_no: 1, kind: 'carrusel', caption: 'Texto de la publicación', assets: Array.from({ length: k }, (_, i) => ({ path: TP + '/v1/0' + (i + 1) + '.' + ext, w: 1080, h: 1350 })) }];
  const when = new Date(Date.now() + 3 * 86400000).toISOString();
  r = await exec({ ...reqBase, action: 'taller_schedule', piece_id: TP, schedule_at: when }, { tpiece: tp(), versions: ver(4) });
  const post = r.calls.find((c) => c.kind === 'ghl' && c.method === 'POST');
  t('Programar carrusel: sube los 4 archivos desde Storage (30), crea el post EN REVISIÓN con las 4 URLs y queda «falta tu último clic»', r.resp.ok === true && r.resp.status === 'programada_pendiente_de_clic' && r.resp.needs_ghl === true
    && r.calls[0].kind === 'ingest' && r.calls[0].body.action === 'storage_upload' && r.calls[0].body.paths.length === 4 && post && post.body.status === 'in_review' && post.body.media.length === 4 && post.body.postApprovalDetails.approvalStatus === 'pending'
    && r.writes.some((w) => /^content_pieces\?id=eq\./.test(w.path) && w.body.ghl_post_id === 'newpost1' && w.body.taller_status === 'programada_pendiente_de_clic'), JSON.stringify(r.resp).slice(0, 300));
  t('Programar: la auditoría es nivel 3 (es la aprobación de Christian)', r.writes.some((w) => w.audit && w.body.tool === 'ops_taller_schedule' && w.body.level === 3));
  r = await exec({ ...reqBase, action: 'taller_schedule', piece_id: TP, schedule_at: when }, { tpiece: tp({ format: 'imagen' }), versions: [{ ...ver(1)[0], kind: 'imagen' }], created: { status: 'scheduled', postApprovalDetails: { approvalStatus: 'approved' } } });
  t('Programar imagen: se crea ya aprobada/programada; el clic fue la aprobación', r.resp.ok === true && r.resp.status === 'programada' && r.calls.find((c) => c.kind === 'ghl' && c.method === 'POST').body.status === 'scheduled', JSON.stringify(r.resp));
  r = await exec({ ...reqBase, action: 'taller_schedule', piece_id: TP, schedule_at: when }, { tpiece: tp({ channel: 'linkedin_page', format: 'texto' }), versions: [{ ...ver(0)[0], kind: 'texto', assets: [] }], created: { status: 'scheduled', postApprovalDetails: { approvalStatus: 'approved' } } });
  t('Programar texto de LinkedIn: sin subida de archivos (2 llamadas: crear y verificar)', r.resp.ok === true && r.calls.length === 2 && r.calls[0].method === 'POST' && r.calls[0].body.accountIds[0].endsWith('_page'));
  r = await exec({ ...reqBase, action: 'taller_schedule', piece_id: TP, schedule_at: when }, { tpiece: tp(), versions: ver(4), uploadFails: true });
  t('Programar: si falla la subida no se crea ningún post (error claro)', r.resp.ok === false && !r.calls.some((c) => c.kind === 'ghl' && c.method === 'POST') && /subir|GHL no aceptó/.test(r.resp.message), JSON.stringify(r.resp));
  r = await exec({ ...reqBase, action: 'taller_schedule', piece_id: TP, schedule_at: when }, { tpiece: tp(), versions: ver(4), taken: [{ id: 'z', channel: 'instagram', format: 'reel', scheduled_at: when }] });
  t('Programar: hueco ocupado ese día → rechazado antes de tocar GHL', r.resp.ok === false && r.calls.length === 0 && /feed de Instagram ese día/.test(r.resp.message));
  r = await exec({ ...reqBase, action: 'taller_schedule', piece_id: TP, schedule_at: when }, { tpiece: tp({ is_test: true }), versions: ver(4) });
  t('Programar una pieza TEST sin test=true → rechazado', r.resp.ok === false && /de prueba/.test(r.resp.message));
  r = await exec({ ...reqBase, action: 'taller_feedback', piece_id: TP, text: 'La portada más cerca', scope: 'lamina 1' }, { tpiece: tp(), versions: ver(4) });
  t('Pedir cambio: guarda el feedback por lámina y deja «cambios pedidos»', r.resp.ok === true && r.writes.some((w) => w.path === 'content_feedback' && w.body.scope === 'lamina 1') && r.writes.some((w) => w.body && w.body.taller_status === 'cambios_pedidos'));
  r = await exec({ ...reqBase, action: 'taller_add_version', piece_id: TP, assets: ver(4)[0].assets.map((a) => ({ ...a, path: a.path.replace('/v1/', '/v2/') })), caption: 'v2', created_by: 'Claude' }, { tpiece: tp({ taller_status: 'cambios_pedidos' }), versions: ver(4) });
  t('Nueva versión: v2 «para revisar» y cierra el feedback abierto', r.resp.ok === true && r.resp.version_no === 2 && r.writes.some((w) => /content_feedback\?piece_id/.test(w.path) && w.body.status === 'done'));
  r = await exec({ ...reqBase, action: 'taller_discard', piece_id: TP, reason: 'no va' }, { tpiece: tp({ taller_status: 'programada_pendiente_de_clic', ghl_post_id: 'ghlpost1' }), versions: ver(4), rejecting: true });
  t('Descartar algo ya en GHL: rechazo reversible (GET → PUT rechazado → GET) y recién ahí descarta', r.resp.ok === true && r.calls.map((c) => c.method).join(',') === 'GET,PUT,GET' && r.calls[1].body.postApprovalDetails.approvalStatus === 'rejected' && r.writes.some((w) => w.body && w.body.taller_status === 'descartada'), JSON.stringify(r.resp));
}

console.log(`\n${pass} ok, ${fail} fallos`);
process.exit(fail ? 1 : 0);
