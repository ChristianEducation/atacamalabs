import assert from 'node:assert/strict';
import * as cm from './coldmail-core.mjs';
import * as oc from './outreach-core.mjs';

let n = 0;
const ok = (name, fn) => { try { fn(); n++; } catch (e) { console.error('FAIL', name, '\n', e.stack.split('\n').slice(0, 4).join('\n')); process.exitCode = 1; } };

const CFG = { mode: 'live', paused: false, from_email: 'christian@atacamalabs.cl', from_name: 'Christian Wevar', daily_cap: 5, window_start: '09:00', window_end: '17:30', tz: 'America/Santiago', legal_footer: null };
const WED = Date.parse('2026-10-07T15:00:00Z');

// ---- correos de ejemplo: la plantilla vieja (la que aplanaba todo) y escritos bajo la filosofía nueva
const OLD = (co, extra) => ({ kind: 'initial', subject: 'Una idea para ' + co, body: 'Hola, equipo de ' + co + ',\n\nVi que atienden varias especialidades en dos sucursales y reciben solicitudes por formularios, WhatsApp y llamada. Mi hipótesis (no lo he visto por dentro) es que recepción repite preguntas sobre tratamiento, sucursal y horarios antes de convertir la consulta en hora.\n\nEn Atacama Labs armamos agentes que identifican tratamiento y sucursal, responden lo básico y entregan la consulta ordenada a recepción. ' + (extra || '¿Te parece si lo vemos en 15 minutos esta semana?') });
const GOOD_A = { kind: 'initial', subject: 'consultas entre sedes', body: 'Hola Andrea,\n\nCuando una paciente escribe por WhatsApp preguntando por una limpieza, ¿recepción tiene que averiguar primero en cuál de las dos sedes hay hora? Esa pregunta suele comerse buena parte del día.\n\nSe puede ordenar para que la consulta llegue con sede y tratamiento ya definidos. ¿Te mando un ejemplo de cómo se vería?' };
const GOOD_B = { kind: 'initial', subject: 'cotizaciones incompletas', body: 'Hola Marcelo,\n\nEn ferretería industrial lo típico es que la cotización llegue sin el modelo del equipo y alguien tenga que volver a preguntar por correo. Revisando su catálogo por SKU me quedó la duda de cómo manejan eso hoy.\n\nSi es un dolor real, hay una forma simple de pedir los datos en la primera respuesta. ¿Esto lo ve alguien de ventas?' };
const GOOD_C = { kind: 'initial', subject: 'solicitudes técnicas', body: 'Hola Rodrigo,\n\nEn talleres con foco minero, una solicitud que llega sin equipo, ubicación ni urgencia casi siempre vuelve con tres llamadas. Me llamó la atención que su formulario hoy no pida esos datos.\n\nPuedo mostrarte cómo se pediría todo en un solo paso. ¿Te sirve que te mande un esquema?' };
const EV = { evidence: ['Atienden en dos sedes (Las Condes y Providencia)', 'Reciben consultas por WhatsApp y formulario'] };
const cand = (o) => ({ id: 'c-1', company_name: 'Dentaline', status: 'in_ghl', ghl_contact_id: 'G1', ghl_opportunity_id: 'O1', ghl_stage: 'investigado', canonical: { contact: { email: 'contacto@dentaline.cl' } }, drafts: {}, ...(o || {}) });
const draftRow = (o) => ({ id: 'm-1', candidate_id: 'c-1', company_name: 'Dentaline', kind: 'initial', direction: 'outbound', status: 'draft', to_email: 'contacto@dentaline.cl', subject: OLD('Dentaline').subject, body: OLD('Dentaline').body, content_hash: oc.contentHash('contacto@dentaline.cl', OLD('Dentaline').subject, OLD('Dentaline').body), created_at: '2026-10-07T12:00:00.000Z', metadata: {}, ...(o || {}) });
const ctx = (o) => ({ now: WED, candidate: cand(), history: [], suppression: [], new_id: 'm-9', config: CFG, peers: [], ...(o || {}) });

ok('cmCtaKind distingue reunión, ejemplo, quién lo ve y pregunta', () => {
  assert.equal(cm.cmCtaKind('Hola.\n\nQuizás sirva. ¿Te parece si lo vemos en 15 minutos?'), 'meeting');
  assert.equal(cm.cmCtaKind('Hola.\n\nQuizás sirva. ¿Te mando un ejemplo?'), 'example');
  assert.equal(cm.cmCtaKind('Hola.\n\nQuizás sirva. ¿Esto lo ve alguien de operaciones?'), 'who');
  assert.equal(cm.cmCtaKind('Hola.\n\nQuizás sirva. ¿Cómo lo manejan hoy?'), 'question');
});

ok('linter: la plantilla vieja queda en score bajo y los correos nuevos en bueno', () => {
  const old = cm.coldLint(OLD('Dentaline'), [], {});
  assert.equal(old.level, 'bajo'); assert.ok(old.score <= 55, 'old=' + old.score);
  for (const g of [GOOD_A, GOOD_B, GOOD_C]) { const l = cm.coldLint(g, [], EV); assert.ok(l.score >= 80, g.subject + '=' + l.score + ' ' + JSON.stringify(l.warnings.map((w) => w.code))); assert.deepEqual(l.hard, []); }
});

ok('linter: avisa por asunto genérico, «Vi que», «Mi hipótesis» y CTA de reunión, pero NO bloquea por estilo', () => {
  const l = cm.coldLint(OLD('Vet24'), [], {});
  const codes = l.warnings.map((w) => w.code);
  for (const c of ['asunto_generico', 'apertura_vi_que', 'mi_hipotesis', 'cta_reunion']) assert.ok(codes.includes(c), c + ' falta en ' + codes);
  assert.deepEqual(l.hard, []);
  const p = oc.planDraft({ kind: 'initial', subject: l.score ? 'Una idea para Vet24' : '', body: OLD('Vet24').body }, { now: WED, candidate: cand(), history: [], suppression: [], new_id: 'm-1', config: CFG });
  assert.equal(p.response.ok, true); assert.equal(p.response.status, 'created');
});

ok('linter: repetir el patrón entre borradores castiga más que usarlo una vez (asunto, «Vi que», «hipótesis»)', () => {
  const peers = ['A', 'B', 'C', 'D'].map((x, i) => ({ id: 'p' + i, company_name: x, ...OLD('Empresa ' + x) }));
  const solo = cm.coldLint(OLD('Vet24'), [], {});
  const rep = cm.coldLint(OLD('Vet24'), peers, {});
  assert.ok(rep.score < solo.score, rep.score + ' vs ' + solo.score);
  const codes = rep.warnings.map((w) => w.code);
  for (const c of ['asunto_mismo_patron', 'apertura_vi_que', 'mi_hipotesis', 'cta_repetido', 'misma_estructura']) assert.ok(codes.includes(c), c + ' falta en ' + codes);
  assert.ok(rep.warnings.find((w) => w.code === 'apertura_vi_que').pts > solo.warnings.find((w) => w.code === 'apertura_vi_que').pts);
});

ok('Similarity Guard: 10 correos con la misma estructura se marcan como muy similares; uno distinto no', () => {
  const peers = Array.from({ length: 10 }, (_, i) => ({ id: 'p' + i, company_name: 'Emp' + i, ...OLD('Emp' + i) }));
  const clone = cm.coldLint(OLD('Nueva'), peers, {});
  assert.ok(clone.similarity.max >= 0.5, String(clone.similarity.max)); assert.ok(clone.warnings.some((w) => w.code === 'muy_similar'));
  const distinct = cm.coldLint(GOOD_B, peers, EV);
  assert.ok(distinct.similarity.max < 0.25, String(distinct.similarity.max)); assert.ok(!distinct.warnings.some((w) => /similar/.test(w.code)));
  assert.ok(distinct.rewards.some((r) => r.code === 'diverso'));
});

ok('diversidad: los correos nuevos usan asuntos y CTA distintos entre sí', () => {
  const set = [GOOD_A, GOOD_B, GOOD_C];
  assert.equal(new Set(set.map((g) => g.subject)).size, 3);
  assert.ok(new Set(set.map((g) => cm.cmCtaKind(g.body))).size >= 2);
  for (const g of set) { const peers = set.filter((x) => x !== g).map((x, i) => ({ id: 'q' + i, ...x })); const l = cm.coldLint(g, peers, EV); assert.ok(!l.warnings.some((w) => /asunto_|apertura_|cta_repetido|similar|misma_estructura/.test(w.code)), g.subject + ' ' + JSON.stringify(l.warnings.map((w) => w.code))); }
});

ok('máximo un problema: tres problemas distintos restan puntos', () => {
  const multi = { kind: 'initial', subject: 'recepción y ventas', body: 'Hola Ana,\n\nRecepción repite las mismas preguntas todo el día. Además las cotizaciones se pierden entre correos y nadie las persigue. También el seguimiento a mano de los pedidos demora semanas. Y la agenda queda desordenada.\n\n¿Te mando un ejemplo?' };
  const l = cm.coldLint(multi, [], {});
  assert.ok(l.warnings.some((w) => w.code === 'varios_problemas'));
  assert.ok(!cm.coldLint(GOOD_A, [], EV).warnings.some((w) => w.code === 'varios_problemas'));
});

ok('tono: buzzwords, agencia, tono IA y frases defensivas restan', () => {
  const bad = { kind: 'initial', subject: 'transformación digital', body: 'Hola,\n\nEspero que este mensaje te encuentre bien. En el mundo actual las empresas necesitan soluciones a medida y una transformación digital con sinergia. Somos una agencia de expertos — líderes en IA — y no quiero quitarte tiempo.\n\n¿Agendamos 15 minutos?' };
  const codes = cm.coldLint(bad, [], {}).warnings.map((w) => w.code);
  for (const c of ['buzzwords', 'tono_agencia', 'tono_ia', 'frases_defensivas', 'cta_reunion']) assert.ok(codes.includes(c), c + ' falta en ' + codes);
});

ok('personalización superficial: sin señal concreta resta; la evidencia declarada pero no usada también', () => {
  const generic = { kind: 'initial', subject: 'una consulta', body: 'Hola equipo,\n\nTrabajamos con empresas de su rubro para que su negocio funcione mejor y más ordenado. Nos gustaría conversar sobre cómo podemos colaborar con ustedes.\n\n¿Te mando un ejemplo?' };
  assert.ok(cm.coldLint(generic, [], {}).warnings.some((w) => w.code === 'sin_senal_concreta'));
  assert.ok(cm.coldLint(GOOD_A, [], { evidence: ['Tienen certificación ISO 9001 vigente'] }).warnings.some((w) => w.code === 'evidencia_no_usada'));
  assert.ok(cm.coldLint(GOOD_A, [], EV).evidence_used === true);
});

ok('seguimientos: «solo retomo» penaliza; aportar algo nuevo premia; las plantillas del sistema ya no son «retomo»', () => {
  const weak = { kind: 'followup_1', subject: 'Re: consultas entre sedes', body: 'Hola, retomo mi mensaje anterior por si se perdió. Quedo atento a tu respuesta para coordinar una llamada de 15 minutos.' };
  assert.ok(cm.coldLint(weak, [], {}).warnings.some((w) => w.code === 'followup_sin_aporte'));
  const strong = { kind: 'followup_1', subject: 'Re: consultas entre sedes', body: 'Hola Andrea, te dejo un ejemplo concreto de cómo se vería: la consulta llega con sede y tratamiento definidos y recepción solo confirma la hora. ¿Te sirve que te mande el esquema?' };
  assert.ok(cm.coldLint(strong, [], {}).rewards.some((r) => r.code === 'followup_aporta'));
  for (const k of ['followup_1', 'followup_2']) { const t = oc.followupTemplate(k, { company_name: 'Dentaline' }, 'consultas entre sedes'); assert.ok(!cm.coldLint({ kind: k, ...t }, [], {}).warnings.some((w) => w.code === 'followup_sin_aporte'), k); }
});

ok('bloqueos reales: porcentajes, garantías y números de clientes sin respaldo', () => {
  for (const claim of ['Reducimos el tiempo de respuesta en 40% en todos nuestros clientes.', 'Garantizamos resultados desde el primer mes.', 'Hemos ayudado a más de 30 empresas a automatizar su atención.']) {
    const l = cm.coldLint({ kind: 'initial', subject: 'consultas entre sedes', body: GOOD_A.body.replace('Se puede ordenar', claim + ' Se puede ordenar') }, [], EV);
    assert.ok(l.hard.length >= 1, claim);
  }
  assert.deepEqual(cm.coldLint(GOOD_A, [], EV).hard, []);
});

// ---------------------------------------------------------------- integración con el motor (planDraft / planLint)

ok('regenerar mantiene el MISMO registro, destinatario y estado draft; guarda la versión anterior; no envía', () => {
  const live = draftRow();
  const r = oc.planDraft({ kind: 'initial', subject: GOOD_A.subject, body: GOOD_A.body, by: 'Hermes', reason: 'Cold Email v2', cold: EV }, ctx({ history: [live] }));
  assert.equal(r.response.ok, true); assert.equal(r.response.status, 'updated');
  assert.equal(r.writes.length, 1); assert.equal(r.writes[0].method, 'PATCH'); assert.equal(r.writes[0].path, 'outreach_messages?id=eq.m-1');
  const b = r.writes[0].body;
  assert.equal(b.to_email, 'contacto@dentaline.cl'); assert.equal(b.status, 'draft'); assert.equal(b.approved_at, null); assert.equal(b.subject, GOOD_A.subject);
  assert.equal(b.metadata.history.length, 1); assert.equal(b.metadata.history[0].subject, 'Una idea para Dentaline'); assert.ok(/Vi que/.test(b.metadata.history[0].body)); assert.equal(b.metadata.history[0].reason, 'Cold Email v2');
  assert.ok(b.metadata.cold.score >= 80); assert.equal(b.metadata.cold.evidence.length, 2);
  assert.equal(r.response.safety, undefined); assert.ok(!r.writes.some((w) => w.method === 'POST'));
  assert.notEqual(b.content_hash, live.content_hash);
});

ok('regenerar un borrador aprobado anula la aprobación (el hash cambia) y se exige aprobar de nuevo', () => {
  const live = draftRow({ status: 'approved', approved_by: 'Christian', approved_at: '2026-10-07T13:00:00Z', approval_text: 'ok', scheduled_for: '2026-10-08T12:00:00Z' });
  const r = oc.planDraft({ kind: 'initial', subject: GOOD_B.subject, body: GOOD_B.body, cold: EV }, ctx({ history: [live] }));
  assert.equal(r.response.approval_invalidated, true); assert.equal(r.writes[0].body.status, 'draft'); assert.equal(r.writes[0].body.approved_by, null); assert.equal(r.writes[0].body.scheduled_for, null);
});

ok('el historial conserva las versiones anteriores (máx. 6) en orden', () => {
  let live = draftRow();
  for (let i = 0; i < 8; i++) {
    const body = GOOD_A.body + ' Versión ' + i + ' del texto.';
    const r = oc.planDraft({ kind: 'initial', subject: GOOD_A.subject, body }, ctx({ history: [live] }));
    live = { ...live, ...r.writes[0].body };
  }
  assert.equal(live.metadata.history.length, 6); assert.ok(/Versión 6/.test(live.metadata.history.at(-1).body));
});

ok('auto=true: exige evidencia (hard) y un score mínimo; si queda bajo NO guarda nada y devuelve los avisos', () => {
  const noEv = oc.planDraft({ kind: 'initial', subject: GOOD_A.subject, body: GOOD_A.body, auto: true }, ctx());
  assert.equal(noEv.response.ok, false); assert.equal(noEv.response.status, 'needs_evidence'); assert.deepEqual(noEv.writes, []);
  const low = oc.planDraft({ kind: 'initial', subject: OLD('Dentaline').subject, body: OLD('Dentaline').body, auto: true, cold: EV }, ctx());
  assert.equal(low.response.status, 'low_quality'); assert.deepEqual(low.writes, []); assert.ok(low.response.score < 70); assert.ok(low.response.warnings.length >= 3);
  const good = oc.planDraft({ kind: 'initial', subject: GOOD_A.subject, body: GOOD_A.body, auto: true, cold: EV }, ctx());
  assert.equal(good.response.ok, true); assert.equal(good.response.status, 'created'); assert.equal(good.writes[0].body.metadata.cold.score >= 70, true);
});

ok('guardado manual (Christian) nunca se bloquea por score: se guarda con avisos', () => {
  const r = oc.planDraft({ kind: 'initial', subject: OLD('Dentaline').subject, body: OLD('Dentaline').body }, ctx());
  assert.equal(r.response.ok, true); assert.ok(r.response.cold.score < 50); assert.ok(r.response.warnings.length >= 3);
});

ok('bloqueo duro por afirmación sin respaldo también aplica al guardar', () => {
  const r = oc.planDraft({ kind: 'initial', subject: 'consultas entre sedes', body: GOOD_A.body.replace('¿Te mando', 'Reducimos 40% el tiempo de respuesta. ¿Te mando') }, ctx());
  assert.equal(r.response.ok, false); assert.equal(r.response.status, 'invalid_draft'); assert.deepEqual(r.writes, []);
});

ok('no altera el destinatario: regenerar sin to_email conserva el del borrador, con aviso si se intenta uno no publicado', () => {
  const live = draftRow();
  const keep = oc.planDraft({ kind: 'initial', subject: GOOD_C.subject, body: GOOD_C.body }, ctx({ history: [live] }));
  assert.equal(keep.writes[0].body.to_email, 'contacto@dentaline.cl');
  const other = oc.planDraft({ kind: 'initial', subject: GOOD_C.subject, body: GOOD_C.body, to_email: 'otro@gmail.com' }, ctx({ history: [live] }));
  assert.equal(other.response.ok, false); assert.deepEqual(other.writes, []);
});

ok('la protección existente sigue: aprobar exige el hash de la versión regenerada (código de la versión vieja no sirve)', () => {
  const live = draftRow();
  const first = oc.planApprove({ kind: 'initial' }, ctx({ history: [live] }));
  assert.equal(first.response.status, 'confirmation_required');
  const withCode = { ...live, confirm_code: first.response.confirmation_code, confirm_hash: oc.contentHash(live.to_email, live.subject, live.body), confirm_expires_at: new Date(WED + 600000).toISOString() };
  const regen = oc.planDraft({ kind: 'initial', subject: GOOD_A.subject, body: GOOD_A.body }, ctx({ history: [withCode] }));
  assert.equal(regen.writes[0].body.confirm_code, null);  // el cambio invalida el código pendiente
  const after = { ...withCode, ...regen.writes[0].body };
  const bad = oc.planApprove({ kind: 'initial', confirmation_code: first.response.confirmation_code, order_text: 'sí, apruébalo' }, ctx({ history: [after] }));
  assert.notEqual(bad.response.status, 'approved');
});

ok('planLint es de solo lectura y explica el score contra los demás borradores', () => {
  const live = draftRow();
  const peers = ['x', 'y', 'z'].map((k, i) => ({ id: 'p' + i, candidate_id: 'c-' + (i + 2), company_name: 'Emp' + k, ...OLD('Emp' + k) }));
  const r = oc.planLint({ kind: 'initial' }, ctx({ history: [live], peers }));
  assert.equal(r.response.ok, true); assert.deepEqual(r.writes, []); assert.ok(r.response.score < 40); assert.ok(r.response.warnings.length >= 4); assert.equal(r.response.compared_with, 3);
  const none = oc.planLint({ kind: 'initial' }, ctx());
  assert.equal(none.response.ok, false);
});

ok('las respuestas (kind reply) no pasan por el linter de correo en frío', () => {
  const inbound = { id: 'in-1', candidate_id: 'c-1', direction: 'inbound', kind: 'reply', status: 'received', gmail_thread_id: 't1', created_at: '2026-10-07T13:00:00Z', subject: 'Re: x', rfc_message_id: '<a@b>' };
  const r = oc.planDraft({ kind: 'reply', body: 'Gracias por responder. Te cuento cómo lo veríamos: primero ordenamos las consultas por sede y tratamiento, y luego definimos qué responde el sistema y qué pasa a una persona.' }, ctx({ history: [inbound, { ...draftRow(), kind: 'initial', status: 'sent', sent_at: '2026-10-07T12:30:00Z', gmail_thread_id: 't1' }] }));
  assert.equal(r.response.ok, true); assert.equal(r.response.cold, null);
});

ok('tono cercano: presentarse en una frase corta NO cuenta como explicar a Atacama; el cierre de interés en trato de «ustedes» se reconoce', () => {
  const close = { kind: 'initial', subject: 'consultas entre sedes', body: 'Hola,\n\nCon sedes en Las Condes y Providencia, imagino que cuando alguien escribe por WhatsApp pidiendo una primera evaluación, recepción tiene que averiguar primero en cuál sede le acomoda atenderse.\n\nSoy Christian, de Atacama Labs. Armamos sistemas que se encargan de esa primera conversación para que recepción reciba la consulta con sede y tratamiento ya definidos.\n\n¿Les mando un ejemplo de cómo podría funcionar en su caso?' };
  const l = cm.coldLint(close, [], EV);
  assert.ok(!l.warnings.some((w) => w.code === 'explica_atacama'), JSON.stringify(l.warnings.map((w) => w.code)));
  assert.equal(l.cta_kind, 'example'); assert.ok(l.score >= 80, String(l.score)); assert.deepEqual(l.hard, []);
  for (const q of ['¿Les muestro cómo se vería?', '¿Les cuento cómo se vería?', '¿Les sirve que les mande un ejemplo?', '¿Tiene sentido que les muestre la idea?', '¿Vale la pena que les envíe un esquema?', '¿Les parece que les cuente cómo sería?']) assert.equal(cm.cmCtaKind('Hola.\n\nObservación.\n\n' + q), 'example', q);
  // explicar a Atacama en varias oraciones sigue penalizando
  const much = { ...close, body: close.body.replace('Soy Christian, de Atacama Labs. Armamos', 'Soy Christian. En Atacama Labs ayudamos a empresas de todos los rubros a ordenar su operación. Además armamos') };
  assert.ok(cm.coldLint(much, [], EV).warnings.some((w) => w.code === 'explica_atacama'));
});

ok('un cierre de interés NO se confunde con pedir reunión porque la oración anterior diga «lista para agendar»', () => {
  const body = 'Hola,\n\nContexto.\n\nSoy Christian, de Atacama Labs. Armamos agentes que pueden hacerse cargo de esa primera parte y dejar cada consulta completa, registrada y lista para agendar o derivar cuando realmente necesita a una persona.\n\n¿Les sirve que les mande un ejemplo aplicado a su clínica?';
  assert.equal(cm.cmCtaKind(body), 'example');
  assert.equal(cm.cmCtaKind('Hola.\n\nObservación.\n\n¿Agendamos una llamada de 15 minutos?'), 'meeting');
  assert.equal(cm.cmCtaKind('Hola.\n\nObservación.\n\n¿Podemos agendar una reunión esta semana?'), 'meeting');
  assert.equal(cm.cmCtaKind('Hola.\n\nObservación.\n\n¿Quién lleva esto en ventas? Si quieren, les mando un ejemplo.'), 'example');
});

console.log(n + ' ok');
