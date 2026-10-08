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
        if (b.action === 'approve' && !b.confirmation_code) return { statusCode: 200, body: { ok: false, status: 'confirmation_required', confirmation_code: 'LI-654321' } };
        if (b.action === 'approve') return { statusCode: 200, body: o.liFails ? { ok: false, status: 'import_error', error: 'import', message: 'Waalaxy rechazó el alta.' } : { ok: true, status: 'imported', state: 'en_campana', state_label: 'En campaña (conexión)' } };
      }
    }
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
  const dbForKey = (key) => key === 'audit' ? w.db.audit : key === 'message' ? [{ ...w.db.message, cand: { id: CID, company_name: 'Clínica Ramis', status: 'in_ghl' } }] : key === 'candidate' ? [w.db.candidate] : key === 'piece' ? [w.db.piece]
    : key === 'messages' ? (o.messages || [w.db.message]) : key === 'candidates' ? (o.candidates || [w.db.candidate]) : key === 'suppression' ? [] : key === 'config' ? [o.config || { mode: 'live', paused: false, daily_cap: 5, window_start: '09:00', window_end: '17:30', tz: 'America/Santiago', linkedin_mode: 'live', linkedin_list_id: 'L1', linkedin_campaign_id: 'C1', linkedin_daily_cap: 10 }] : [];
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
  }
  const fin = (await run('Finish', store))[0].json; store.Finish = fin;
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
t('29: las acciones permitidas son exactamente la lista cerrada (sin ejecutor genérico)', JSON.stringify(wf.nodes.find((n) => n.name === 'Parse').parameters.jsCode.match(/return \['overview'[^\]]*\]/)[0]) === JSON.stringify("return ['overview', 'email_save', 'email_approve', 'email_reject', 'email_reopen', 'linkedin_approve', 'linkedin_reject', 'content_approve', 'content_reject']"));
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

console.log(`\n${pass} ok, ${fail} fallos`);
process.exit(fail ? 1 : 0);
