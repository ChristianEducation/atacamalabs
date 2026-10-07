// node n8n/build/outreach.test.mjs — recorre los workflows 21/22/23 nodo a nodo con Supabase, Gmail y Gateway simulados (sin red)
import { buildEngine, buildSender, buildSync } from './outreach.mjs';
import * as oc from '../../scripts/outreach/outreach-core.mjs';
let pass = 0, fail = 0;
const t = (n, c, x = '') => { c ? pass++ : fail++; console.log(c ? 'ok  ' : 'FAIL', n, c ? '' : x); };
const WF = { engine: buildEngine(), sender: buildSender(), sync: buildSync() };
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const code = (wf, n) => WF[wf].nodes.find((x) => x.name === n).parameters.jsCode;
const mkDollar = (store, lists = {}) => (name) => ({ first: () => ({ json: store[name] }), all: () => (lists[name] || [store[name]]).map((json) => ({ json })), item: { json: store[name] } });
const run = async (wf, name, store, lists, json) => new AsyncFunction('$', '$json', code(wf, name)).call({}, mkDollar(store, lists), json || {});
const ok200 = (body) => ({ statusCode: 200, body });

const WED = Date.parse('2026-10-07T15:00:00Z');
const SAT = Date.parse('2026-10-10T15:00:00Z');
const BODY = 'Hola Dra. Pérez, vi que Clínica Rica agenda por WhatsApp y formulario en dos sedes. En Atacama Labs armamos agentes que ordenan esa recepción. ¿Te muestro un ejemplo en 10 minutos?';
const CAND = { id: '11111111-1111-4111-8111-111111111111', company_name: 'Clínica TEST Rica', status: 'in_ghl', ghl_contact_id: 'G1', ghl_opportunity_id: 'O1', ghl_stage: 'investigado', canonical: { company_name: 'Clínica TEST Rica', contact: { email: 'dra@clinicarica-test.invalid' } }, drafts: { email_subject: 'Una idea para Clínica TEST Rica', email_body: BODY } };
const CFG = (o) => ({ id: 1, mode: 'test_sim', paused: false, from_email: 'christian@atacamalabs.cl', from_name: 'Christian Wevar', daily_cap: 10, window_start: '09:00', window_end: '17:30', tz: 'America/Santiago', legal_footer: null, ...(o || {}) });
const msgRow = (o) => ({ id: 'm-1', candidate_id: CAND.id, company_name: CAND.company_name, kind: 'initial', direction: 'outbound', to_email: 'dra@clinicarica-test.invalid', subject: 'Una idea para Clínica TEST Rica', body: BODY, content_hash: oc.contentHash('dra@clinicarica-test.invalid', 'Una idea para Clínica TEST Rica', BODY), status: 'draft', approved_by: null, scheduled_for: null, created_at: '2026-10-07T14:00:00Z', ...(o || {}) });

// ---------- estructura y seguridad
for (const [k, wf] of Object.entries(WF)) {
  const names = new Set(wf.nodes.map((n) => n.name));
  t(`${k}: conexiones válidas`, Object.entries(wf.connections).every(([a, v]) => names.has(a) && v.main.every((o) => o.every((c) => names.has(c.node)))));
  t(`${k}: sin secretos y sin nodos de envío nativos (Gmail/Telegram/SMTP/WhatsApp)`, !/(Bearer |eyJ[A-Za-z0-9_-]{20}|pit-[0-9a-f]{8}|ya29\.|sk-[A-Za-z0-9]{20})/.test(JSON.stringify(wf)) && !wf.nodes.some((n) => /gmail|emailSend|whatsapp|telegram|slack|smtp/i.test(n.type)));
  t(`${k}: los nodos HTTP toleran fallos`, wf.nodes.filter((n) => n.type === 'n8n-nodes-base.httpRequest').every((n) => n.continueOnFail === true));
}
t('21: webhook con clave de cabecera y ruta propia', WF.engine.nodes[0].parameters.authentication === 'headerAuth' && WF.engine.nodes[0].parameters.path === 'atacama-outreach-engine');
t('21: el motor NUNCA llama a Gmail ni al Gateway (solo Supabase)', WF.engine.nodes.filter((n) => n.type === 'n8n-nodes-base.httpRequest').every((n) => /supabase/i.test(JSON.stringify(n.credentials)) ));
t('22: Gmail solo se llama en modo live (la URL cae en localhost.invalid en otro caso) y solo con un mensaje reclamado', /go_live/.test(WF.sender.nodes.find((n) => n.name === 'Gmail Send').parameters.url) && /localhost\.invalid/.test(WF.sender.nodes.find((n) => n.name === 'Gmail Send').parameters.url) && /length === 1/.test(WF.sender.nodes.find((n) => n.name === 'Gmail Send').parameters.url));
t('22/23: sin credencial de Gmail no hay credenciales de Gmail en los nodos', !JSON.stringify(WF.sender).includes('gmailOAuth2":{') && !JSON.stringify(WF.sync).includes('gmailOAuth2":{'));
t('22: el envío usa un candado (claim approved→sending con Prefer return=representation)', JSON.stringify(WF.sender.nodes.find((n) => n.name === 'Claim').parameters).includes('return=representation') && /status=eq\.approved/.test(code('sender', 'Claim Plan')));

// ---------- 21 Engine
async function engine(body, st = {}) {
  const store = { 'Engine Webhook': { body } };
  const parsed = (await run('engine', 'Parse', store))[0].json; store.Parse = parsed;
  if (parsed.fatal) return { fatal: parsed.fatal };
  store['Load Candidate'] = ok200(st.candidate === undefined ? [CAND] : (st.candidate ? [st.candidate] : []));
  store['Load History'] = ok200(st.history || []);
  store['Load Suppression'] = ok200(st.suppression || []);
  store['Load Config'] = ok200([st.config || CFG({ mode: 'live' })]);
  const dec = (await run('engine', 'Decide', store))[0].json; store.Decide = dec;
  const ex = (await run('engine', 'Expand Writes', store)).map((x) => x.json);
  store['Apply Writes'] = ok200({}); const lists = { 'Apply Writes': ex.map(() => ({ statusCode: st.writeStatus || 201, body: {} })) };
  const resp = (await run('engine', 'Respond', store, lists))[0].json;
  return { parsed, dec, ex, resp };
}
let r = await engine({ action: 'borrar' });
t('21: acción inválida → error claro', /action inválida/.test(r.fatal));
r = await engine({ action: 'draft' });
t('21: draft sin candidate_id → error', /candidate_id/.test(r.fatal));
r = await engine({ action: 'draft', candidate_id: CAND.id, kind: 'xx' });
t('21: kind inválido → error', /kind inválido/.test(r.fatal));
r = await engine({ action: 'draft', candidate_id: CAND.id, kind: 'initial' });
t('21 draft: crea el borrador desde el del Gateway, status draft, sin enviar, hash', r.resp.status === 'created' && r.ex[0].method === 'POST' && r.ex[0].body.status === 'draft' && r.ex[0].body.content_hash.length === 16 && r.resp.safety.messages_sent === 0 && /NO enviado/.test(r.resp.message));
r = await engine({ action: 'draft', candidate_id: CAND.id, kind: 'initial' }, { candidate: null });
t('21 draft: prospecto no guardado → error y 0 escrituras', r.resp.ok === false && r.resp.error === 'candidato_no_encontrado' && r.ex[0].skip === true);
r = await engine({ action: 'draft', candidate_id: CAND.id, kind: 'initial', body: 'x' });
t('21 draft: cuerpo inválido → no guarda', r.resp.error === 'borrador_invalido');
r = await engine({ action: 'approve', candidate_id: CAND.id }, { history: [msgRow()] });
t('21 approve sin código: confirmation_required con vista previa; solo guarda el código', r.resp.status === 'confirmation_required' && /^CONF-\d{6}$/.test(r.resp.confirmation_code) && r.resp.safety.messages_sent === 0 && r.ex.length === 1 && !('status' in r.ex[0].body) && r.ex[0].body.confirm_code === r.resp.confirmation_code);
const code1 = r.resp.confirmation_code;
const withCode = msgRow({ confirm_code: code1, confirm_hash: msgRow().content_hash, confirm_expires_at: new Date(Date.now() + 600000).toISOString() });
const aprBody = { action: 'approve', candidate_id: CAND.id, confirmation_code: code1, order_text: 'Sí, envíalo' };
r = await engine(aprBody, { history: [withCode] });
t('21 approve con código correcto: queda approved, programado, aún no enviado', r.resp.status === 'approved' && r.ex[0].body.status === 'approved' && r.ex[0].body.approved_by === 'Christian vía Hermes' && r.resp.safety.messages_sent === 0);
r = await engine({ ...aprBody, confirmation_code: 'CONF-000000' }, { history: [withCode] });
t('21 approve con código ajeno → rechazado', r.resp.status === 'invalid_code');
r = await engine(aprBody, { history: [{ ...withCode, body: BODY + ' otra cosa' }] });
t('21 approve tras editar el cuerpo → content_changed', r.resp.status === 'content_changed');
r = await engine(aprBody, { history: [withCode], suppression: [{ email: 'dra@clinicarica-test.invalid', reason: 'unsubscribe' }] });
t('21 approve a correo suprimido → rechazado', r.resp.status === 'invalid_draft');
r = await engine({ action: 'cancel', candidate_id: CAND.id }, { history: [msgRow({ status: 'approved' })] });
t('21 cancel: approved → cancelled', r.resp.status === 'cancelled' && r.ex[0].body.status === 'cancelled');
r = await engine({ action: 'get', candidate_id: CAND.id }, { history: [msgRow(), msgRow({ id: 'in-1', direction: 'inbound', status: 'received', classification: 'reply', body: 'me interesa' })] });
t('21 get: pendientes + historial y conteo de enviados/respuestas', r.resp.pending.length === 1 && r.resp.history.length === 2 && /pendiente/.test(r.resp.message));
r = await engine({ action: 'replies', limit: 5 }, { history: [msgRow({ id: 'in-1', direction: 'inbound', status: 'received', classification: 'reply', body: 'me interesa' })] });
t('21 replies: lista entrantes sin tocar nada', r.resp.count === 1 && r.ex[0].skip === true);
r = await engine({ action: 'draft', candidate_id: CAND.id }, { writeStatus: 500 });
t('21: si Supabase falla al guardar, la respuesta lo dice (ok:false)', r.resp.ok === false && r.resp.error === 'supabase');

// ---------- 22 Sender
async function sender(st = {}) {
  const store = { Init: { now: st.now || WED, manual: true, now_override: st.override || null } };
  const cfg = st.config || CFG();
  store['Load Config'] = ok200([cfg]); store['Load Approved'] = ok200(st.approved || []);
  const prep = (await run('sender', 'Prep', store))[0].json; store.Prep = prep;
  store['Load Candidates'] = ok200(st.candidates || [CAND]); store['Load Suppression'] = ok200(st.suppression || []); store['Load Inbound'] = ok200(st.inbound || []); store['Load Sent Today'] = ok200(st.sentToday || []);
  const dec = (await run('sender', 'Decide', store))[0].json; store.Decide = dec;
  if (dec.decision.action === 'cancel') { const cp = (await run('sender', 'Cancel Plan', store))[0].json; return { dec, cancel: cp, resp: (await run('sender', 'Respond Cancel', store))[0].json }; }
  if (dec.decision.action !== 'send') return { dec, resp: (await run('sender', 'Respond None', store))[0].json };
  store['Claim Plan'] = (await run('sender', 'Claim Plan', store))[0].json;
  store.Claim = st.claimLost ? ok200([]) : ok200([{ ...dec.message, status: 'sending' }]);
  store['Gmail Send'] = st.gmail || ok200({ id: 'gm-1', threadId: 'th-1' });
  const res = (await run('sender', 'Result', store))[0].json; store.Result = res;
  store['Gateway Effect'] = st.gwFail ? { statusCode: 500, body: {} } : ok200({ ok: true, results: [{ executed: true }] });
  const ex = (await run('sender', 'Expand Result', store)).map((x) => x.json);
  store['Apply Result'] = ok200({});
  const resp = (await run('sender', 'Respond', store, { 'Apply Result': ex.map(() => ({ statusCode: 200, body: {} })) }))[0].json;
  return { dec, res, ex, resp, prep };
}
const appr = (o) => msgRow({ status: 'approved', approved_by: 'Christian vía Hermes', scheduled_for: new Date(WED - 60000).toISOString(), ...(o || {}) });
r = await sender({ config: CFG({ mode: 'off' }), approved: [appr()] });
t('22 modo off: no envía ni simula nada', r.resp.status === 'idle' && /off/.test(r.resp.message) && r.resp.safety.messages_sent === 0);
r = await sender({ approved: [appr()], now: SAT });
t('22 fuera de ventana (sábado): no envía', /ventana/.test(r.resp.message));
r = await sender({ config: CFG({ mode: 'live', daily_cap: 2 }), approved: [appr({ company_name: 'Clínica Rica', candidate_id: CAND.id })], candidates: [{ ...CAND, company_name: 'Clínica Rica' }], sentToday: [{ id: 'a' }, { id: 'b' }] });
t('22 tope diario alcanzado: no envía', /tope diario/.test(r.resp.message));
r = await sender({ approved: [appr()] });
t('22 test_sim: simula el envío (sin Gmail), Contactado en GHL vía Gateway con nota SIMULADO, marca sent con ids simulados', r.resp.status === 'sent' && r.resp.safety.messages_sent === 0 && /SIMULADO/.test(r.res.gw.body.act.note) && r.res.gw.body.act.type === 'mark_contacted' && r.res.gw.body.action === 'act' && r.ex.some((e) => e.body && e.body.status === 'sent' && /^sim-/.test(e.body.gmail_message_id)) && r.ex.some((e) => e.path && e.path.startsWith('prospect_candidates') && e.body.ghl_stage === 'contactado'));
t('22 test_sim: la URL de Gmail es localhost.invalid (no se llama)', r.dec.go_live === false);
r = await sender({ config: CFG({ mode: 'dry_run' }), approved: [appr()] });
t('22 dry_run: marca dry_run; NO toca GHL ni prospect_candidates', r.resp.status === 'dry_run' && r.res.gw.skip === true && !r.ex.some((e) => e.path && e.path.startsWith('prospect_candidates')));
const LIVE = (o) => CFG({ mode: 'live', ...(o || {}) });
const liveCand = { ...CAND, company_name: 'Clínica Rica' };
const liveAppr = (o) => appr({ company_name: 'Clínica Rica', ...(o || {}) });
r = await sender({ config: LIVE(), approved: [liveAppr()], candidates: [liveCand] });
t('22 live: llama a Gmail con raw+MIME correcto, guarda ids de Gmail y rfc_message_id, 1 mensaje enviado', r.dec.go_live === true && r.resp.status === 'sent' && r.resp.safety.messages_sent === 1 && r.ex.some((e) => e.body && e.body.gmail_message_id === 'gm-1' && e.body.gmail_thread_id === 'th-1' && /^<.+@atacamalabs\.cl>$/.test(e.body.rfc_message_id)) && /^[A-Za-z0-9_-]+$/.test(r.dec.mime.raw));
const mimeTxt = Buffer.from(r.dec.mime.raw.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
t('22 live: el correo lleva remitente, destinatario, línea de baja y List-Unsubscribe', /^From: Christian Wevar <christian@atacamalabs\.cl>/m.test(mimeTxt) && /^To: dra@clinicarica-test\.invalid/m.test(mimeTxt) && /List-Unsubscribe/.test(mimeTxt));
r = await sender({ config: LIVE(), approved: [liveAppr()], candidates: [liveCand], gmail: { statusCode: 401, body: { error: 'unauthorized' } } });
t('22 live: si Gmail falla → status failed, sin efectos en GHL, 0 enviados', r.resp.ok === false && r.resp.status === 'failed' && r.res.gw.skip === true && r.resp.safety.messages_sent === 0);
r = await sender({ config: LIVE(), approved: [liveAppr()], candidates: [liveCand], claimLost: true });
t('22 candado: si otro proceso ya reclamó el mensaje, no se envía de nuevo', r.res.claimed === false && r.resp.safety.messages_sent === 0);
r = await sender({ config: LIVE(), approved: [liveAppr()], candidates: [liveCand], suppression: [{ email: 'dra@clinicarica-test.invalid', reason: 'unsubscribe' }] });
t('22 suprimido: cancela el mensaje (no envía)', r.dec.decision.action === 'cancel' && r.cancel.body.status === 'cancelled' && r.resp.status === 'cancelled');
r = await sender({ config: LIVE(), approved: [liveAppr()], candidates: [{ ...liveCand, status: 'discarded' }] });
t('22 descartado después de aprobar: cancela', r.dec.decision.action === 'cancel');
r = await sender({ config: LIVE(), approved: [liveAppr({ body: BODY + ' cambio sin reaprobar' })], candidates: [liveCand] });
t('22 contenido alterado tras la aprobación: cancela (la aprobación solo vale para el hash aprobado)', r.dec.decision.action === 'cancel' && /cambió/.test(r.dec.decision.reason));
r = await sender({ config: LIVE(), approved: [appr()], candidates: [CAND] });
t('22 candidato TEST jamás sale en modo live', r.dec.decision.action === 'none');
r = await sender({ config: LIVE(), approved: [liveAppr({ kind: 'followup_1' })], candidates: [liveCand], inbound: [{ candidate_id: CAND.id }] });
t('22 seguimiento aprobado pero el prospecto ya respondió: cancela', r.dec.decision.action === 'cancel' && /respondió/.test(r.dec.decision.reason));
r = await sender({ config: LIVE({ from_email: null }), approved: [liveAppr()], candidates: [liveCand] });
t('22 live sin from_email: no envía', r.dec.decision.action === 'none' && /from_email/.test(r.dec.decision.reason));
r = await sender({ config: LIVE({ paused: true }), approved: [liveAppr()], candidates: [liveCand] });
t('22 pausa de emergencia: no envía', /pausa/.test(r.resp.message));
r = await sender({ config: LIVE(), approved: [liveAppr({ id: 'm-b', scheduled_for: new Date(WED - 1000).toISOString() }), liveAppr({ id: 'm-a', scheduled_for: new Date(WED - 9000).toISOString() })], candidates: [liveCand], override: WED + 999999999 });
t('22: la hora no se puede forzar en live y se envía UN solo correo por corrida, el más antiguo', r.dec.message.id === 'm-a' && r.prep.now === WED);

// ---------- 23 Gmail Sync
const b64 = (s) => Buffer.from(s, 'utf8').toString('base64url');
const gthread = (msgs) => ({ id: 'th-1', messages: msgs });
const gmsg = (id, from, subject, text, extra) => ({ id, threadId: 'th-1', internalDate: String(WED + 1000), payload: { headers: [{ name: 'From', value: from }, { name: 'Subject', value: subject }, ...(extra || [])], parts: [{ mimeType: 'text/plain', body: { data: b64(text) } }] } });
async function sync(st = {}) {
  const store = { Init: { now: WED, inject: st.inject || null } };
  store['Load Config'] = ok200([st.config || CFG({ mode: 'live' })]);
  store['Load Open'] = ok200(st.open || [{ id: 'm-1', candidate_id: CAND.id, company_name: 'Clínica Rica', to_email: 'dra@clinicarica-test.invalid', kind: 'initial', gmail_thread_id: 'th-1', sent_at: '2026-10-06T15:00:00Z' }]);
  const prep = (await run('sync', 'Prep', store))[0].json; store.Prep = prep;
  store['Load Known'] = ok200((st.known || []).map((k) => ({ effect_key: k }))); store['Load Candidates'] = ok200(st.candidates || [CAND]);
  const th = (await run('sync', 'Expand Threads', store)).map((x) => x.json);
  const fetched = th.map((x) => (x.skip ? { statusCode: 0 } : ok200(st.threads ? st.threads[x.thread_id] || { messages: [] } : { messages: [] })));
  store['Gmail Fetch'] = fetched[0]; const pr = (await run('sync', 'Process', store, { 'Gmail Fetch': fetched }))[0].json; store.Process = pr;
  const ex = (await run('sync', 'Expand Writes', store)).map((x) => x.json);
  store['Apply Writes'] = ok200({});
  const efx = (await run('sync', 'Expand Effects', store)).map((x) => x.json);
  store['Gateway Effect'] = ok200({ ok: true });
  const resp = (await run('sync', 'Respond', store, { 'Gateway Effect': efx.map(() => ({ statusCode: 200, body: { ok: true } })), 'Apply Writes': ex.map(() => ({ statusCode: 201, body: {} })) }))[0].json;
  return { prep, th, pr, ex, efx, resp };
}
r = await sync({ config: CFG({ mode: 'off' }) });
t('23 modo off: no consulta Gmail y no escribe', r.th.length === 1 && r.th[0].skip === true && r.pr.new_messages === 0);
r = await sync({ threads: { 'th-1': gthread([gmsg('g0', 'christian@atacamalabs.cl', 'Una idea', 'Hola'), gmsg('g1', 'Dra <dra@clinicarica-test.invalid>', 'Re: Una idea', 'Hola Christian, me interesa. ¿Hablamos mañana?\n\nEl mar escribió:\n> Hola')]) } });
t('23 live: respuesta humana → fila inbound idempotente, GHL a Respondió con la nota, seguimiento detenido; mensajes propios ignorados', r.pr.new_messages === 1 && r.ex[0].body.effect_key === 'recv:g1' && r.ex[0].prefer.includes('ignore-duplicates') && r.efx[0].body.act.stage === 'respondio' && /RESPUESTA por correo/.test(r.efx[0].body.act.note) && r.resp.followups_stopped_for === 1 && r.resp.safety.messages_sent === 0 && r.th[0].thread_id === 'th-1');
r = await sync({ known: ['recv:g1'], threads: { 'th-1': gthread([gmsg('g1', 'dra@clinicarica-test.invalid', 'Re: x', 'me interesa')]) } });
t('23 idempotencia: un mensaje ya registrado no se procesa de nuevo (0 efectos)', r.pr.new_messages === 0 && r.efx[0].skip === true);
r = await sync({ threads: { 'th-1': gthread([gmsg('g2', 'Mail Delivery Subsystem <mailer-daemon@googlemail.com>', 'Delivery Status Notification (Failure)', 'Address not found\nto: <dra@clinicarica-test.invalid>\n550 5.1.1 user unknown')]) } });
t('23 rebote: suprime el correo, deja nota y detiene el seguimiento', r.ex.some((e) => e.path.startsWith('outreach_suppression') && e.body.email === 'dra@clinicarica-test.invalid') && r.resp.followups_stopped_for === 1 && /REBOTE/.test(r.efx[0].body.act.note));
r = await sync({ threads: { 'th-1': gthread([gmsg('g3', 'dra@clinicarica-test.invalid', 'Re: x', 'Por favor no me escriban más')]) } });
t('23 baja: suprime, descarta en GHL y detiene todo', r.ex.some((e) => e.path.startsWith('outreach_suppression') && e.body.reason === 'unsubscribe') && r.efx[0].body.act.type === 'discard' && r.resp.followups_stopped_for === 1);
r = await sync({ threads: { 'th-1': gthread([gmsg('g4', 'dra@clinicarica-test.invalid', 'Respuesta automática', 'Estoy fuera de la oficina hasta el lunes')]) } });
t('23 auto-respuesta: se registra pero NO detiene el seguimiento ni mueve la etapa', r.resp.followups_stopped_for === 0 && r.efx[0].skip === true && r.pr.summary[0].cls === 'auto_reply');
r = await sync({ config: CFG({ mode: 'test_sim' }), inject: [{ id: 'sim-9', thread_id: 'th-1', from: 'dra@clinicarica-test.invalid', subject: 'Re: x', body: 'Me interesa, llámame', headers: {} }] });
t('23 test_sim: acepta mensajes inyectados (para pruebas) sin llamar a Gmail', r.th[0].skip === true && r.pr.new_messages === 1 && r.efx[0].body.act.stage === 'respondio');
r = await sync({ config: CFG({ mode: 'live' }), inject: [{ id: 'x', thread_id: 'th-1', from: 'a@b.cl', subject: 's', body: 'b' }] });
t('23 live: ignora mensajes inyectados (solo Gmail real)', r.pr.new_messages === 0);
r = await sync({ threads: { 'th-1': gthread([gmsg('g5', 'otra@persona.cl', 'Re: x', 'hola')]) }, open: [] });
t('23: hilo que no es nuestro (sin envío previo) se ignora', r.pr.new_messages === 0);

console.log(`\n${pass} ok, ${fail} fallos`);
process.exit(fail ? 1 : 0);
