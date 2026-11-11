import assert from 'node:assert/strict';
import * as cm from './coldmail-core.mjs';
import * as oc from './outreach-core.mjs';
import * as ftt from './followup-templates.mjs';
import * as ev from './email-v2-core.mjs';

let n = 0;
const ok = (name, fn) => { try { fn(); n++; } catch (e) { console.error('FAIL', name, '\n', e.stack.split('\n').slice(0, 4).join('\n')); process.exitCode = 1; } };

const CFG = { mode: 'live', paused: false, from_email: 'christian@atacamalabs.cl', from_name: 'Christian Wevar', daily_cap: 5, window_start: '09:00', window_end: '17:30', tz: 'America/Santiago', legal_footer: null };
const WED = Date.parse('2026-10-07T15:00:00Z');

// ---- correos de ejemplo: la plantilla vieja (la que aplanaba todo) y correos del ESTÁNDAR V2 (guía aprobada por Christian el 3-nov-2026: tres viñetas «beneficio: solución»)
const OLD = (co, extra) => ({ kind: 'initial', subject: 'Una idea para ' + co, body: 'Hola, equipo de ' + co + ',\n\nVi que atienden varias especialidades en dos sucursales y reciben solicitudes por formularios, WhatsApp y llamada. Mi hipótesis (no lo he visto por dentro) es que recepción repite preguntas sobre tratamiento, sucursal y horarios antes de convertir la consulta en hora.\n\nEn Atacama Labs armamos agentes que identifican tratamiento y sucursal, responden lo básico y entregan la consulta ordenada a recepción. ' + (extra || '¿Te parece si lo vemos en 15 minutos esta semana?') });
const V2 = (greet, sector, bullets) => greet + ':\n\nJunto con saludar, espero que se encuentre muy bien.\n\nLe escribo desde Atacama Labs, empresa especializada en agentes de inteligencia artificial, automatización e integración de sistemas. Ayudamos a simplificar tareas operativas y comerciales con soluciones que se conectan con las herramientas que ya usan.\n\nEn el sector ' + sector + ', por ejemplo, podemos ayudar a:\n\n' + bullets.map((b) => '- ' + b).join('\n') + '\n\nPrimero entendemos cómo trabaja cada empresa y después elegimos la tecnología.\n\nMe gustaría mostrarle cómo alguna de estas soluciones podría aplicarse a su operación. Si le resulta interesante, con gusto podemos coordinar una breve conversación.\n\nQuedo atento a sus comentarios.';
const GOOD_A = { kind: 'initial', subject: 'consultas entre sedes antes de agendar', body: V2('Estimada Andrea', 'odontológico', ['Reducir horas perdidas por inasistencias: recordando citas y facilitando su confirmación o reagendamiento entre sedes.', 'Evitar consultas sin respuesta: orientando sobre tratamientos y pasos para pedir una hora, también fuera del horario de atención.', 'Disminuir tareas administrativas: conectando WhatsApp, correo y la agenda para que recepción reciba cada consulta ordenada.']) };
const GOOD_B = { kind: 'initial', subject: 'datos para cotizar un pedido', body: V2('Estimado Marcelo', 'de equipos industriales', ['Evitar cotizaciones que se enfrían: pidiendo modelo, cantidad y plazo en la primera respuesta y haciendo seguimiento a cada solicitud.', 'Reducir idas y vueltas por correo: dejando cada solicitud completa y lista para que ventas cotice.', 'Ordenar la información comercial: conectando correo, WhatsApp y el CRM para que nada quede en bandejas personales.']) };
const GOOD_C = { kind: 'initial', subject: 'primer filtro de solicitudes técnicas', body: V2('Estimado equipo de Taller Norte', 'de talleres y servicio técnico', ['Acelerar la evaluación de requerimientos: reuniendo equipo, ubicación y urgencia antes de que ingeniería los revise.', 'Evitar llamadas repetidas: clasificando cada solicitud y preguntando lo que falta.', 'Disminuir el trabajo de registro: dejando los antecedentes en un solo lugar, conectado con las herramientas del equipo.']) };
const EV = { evidence: ['Atienden en dos sedes (Las Condes y Providencia)', 'Reciben consultas por WhatsApp y formulario'] };
const cand = (o) => ({ id: 'c-1', company_name: 'Dentaline', status: 'in_ghl', ghl_contact_id: 'G1', ghl_opportunity_id: 'O1', ghl_stage: 'investigado', canonical: { contact: { email: 'contacto@dentaline.cl' } }, drafts: {}, ...(o || {}) });
const draftRow = (o) => ({ id: 'm-1', candidate_id: 'c-1', company_name: 'Dentaline', kind: 'initial', direction: 'outbound', status: 'draft', to_email: 'contacto@dentaline.cl', subject: OLD('Dentaline').subject, body: OLD('Dentaline').body, content_hash: oc.contentHash('contacto@dentaline.cl', OLD('Dentaline').subject, OLD('Dentaline').body), created_at: '2026-10-07T12:00:00.000Z', metadata: {}, ...(o || {}) });
const ctx = (o) => ({ now: WED, candidate: cand(), history: [], suppression: [], new_id: 'm-9', config: CFG, peers: [], ...(o || {}) });
const strictLint = (d, peers, cold) => cm.coldLint({ ...d, strict: true }, peers, cold);
const withBefore = (g, marker, txt) => ({ ...g, body: g.body.replace(marker, txt + ' ' + marker) });

ok('cmCtaKind distingue reunión, ejemplo, quién lo ve y pregunta; y reconoce la invitación cordial del estándar V2 solo en primeros correos', () => {
  assert.equal(cm.cmCtaKind('Hola.\n\nQuizás sirva. ¿Te parece si lo vemos en 15 minutos?'), 'meeting');
  assert.equal(cm.cmCtaKind('Hola.\n\nQuizás sirva. ¿Te mando un ejemplo?'), 'example');
  assert.equal(cm.cmCtaKind('Hola.\n\nQuizás sirva. ¿Esto lo ve alguien de operaciones?'), 'who');
  assert.equal(cm.cmCtaKind('Hola.\n\nQuizás sirva. ¿Cómo lo manejan hoy?'), 'question');
  assert.equal(cm.cmCtaKind(GOOD_A.body, true), 'invitation');
  assert.notEqual(cm.cmCtaKind(GOOD_A.body), 'invitation', 'sin la marca de primer correo no se reconoce (seguimientos)');
  assert.equal(cm.cmCtaKind(GOOD_A.body + '\n\nSaludos cordiales,\n\nChristian Wevar', true), 'invitation', 'la despedida y el nombre al final no cuentan');
});

ok('estándar V2: los correos nuevos puntúan «bueno» sin avisos de estilo y sin bloqueos, incluso en modo estricto', () => {
  for (const g of [GOOD_A, GOOD_B, GOOD_C]) {
    const l = strictLint(g, [], EV);
    assert.ok(l.score >= 80, g.subject + '=' + l.score + ' ' + JSON.stringify(l.warnings.map((w) => w.code)));
    assert.deepEqual(l.hard, [], g.subject);
    assert.equal(l.cta_kind, 'invitation', g.subject);
    for (const r of ['saludo_formal', 'cordialidad', 'tres_aplicaciones', 'cta_invitacion']) assert.ok(l.rewards.some((x) => x.code === r), g.subject + ' ' + r);
    assert.ok(l.metrics.words >= 110 && l.metrics.words <= 230, g.subject + ' ' + l.metrics.words);
  }
});

ok('estándar V2: las plantillas de respaldo por rubro (email-v2-core) cumplen el linter estricto y traen tres viñetas «beneficio: solución»', () => {
  const rubros = { seguros: 'corredora de seguros', hoteles: 'hotel', restaurantes: 'restaurante', casinos_colegios: 'casino de colegio', casinos_empresas: 'servicios de alimentación', salud: 'clínica dental', corredoras: 'corredora de propiedades', generico: 'ferretería' };
  for (const [key, hint] of Object.entries(rubros)) {
    for (const first of ['', 'María']) {
      const d = ev.emailDraftV2({ company: 'Empresa Prueba', firstName: first, hint });
      assert.equal(d.kit, key, hint);
      const l = strictLint({ kind: 'initial', subject: d.subject, body: d.body }, [], EV);
      assert.deepEqual(l.hard, [], key + ' ' + JSON.stringify(l.hard));
      assert.ok(l.score >= 80, key + '=' + l.score + ' ' + JSON.stringify(l.warnings.map((w) => w.code)));
      assert.equal(d.body.split('\n').filter((x) => x.startsWith('- ')).length, 3, key);
      assert.ok(d.body.startsWith(first ? 'Estimado/a María:' : 'Estimado equipo de Empresa Prueba:'), key);
      assert.ok(/^(Evitar|Reducir|Disminuir)/.test(ev.emailKitV2(hint, 'X').bullets[0]), key);
      assert.ok(!/\d+\s?%|garantiz|precio/i.test(d.body), key + ' sin cifras ni promesas');
    }
  }
  // el ejemplo de la guía (corredora de seguros) queda literal
  assert.deepEqual(ev.emailKitV2('corredora de seguros', 'X').bullets, ['Evitar oportunidades de venta perdidas: atendiendo y dando seguimiento a potenciales clientes.', 'Reducir cotizaciones sin respuesta: automatizando el seguimiento comercial.', 'Disminuir tareas administrativas: conectando WhatsApp, correo y CRM.']);
});

ok('estándar V2: la plantilla vieja («Hola», «Vi que», «Mi hipótesis», sin viñetas ni cordialidad) queda en score bajo', () => {
  const old = cm.coldLint(OLD('Dentaline'), [], {});
  assert.equal(old.level, 'bajo'); assert.ok(old.score <= 40, 'old=' + old.score);
  const codes = old.warnings.map((w) => w.code);
  for (const c of ['saludo_no_estandar', 'sin_cordialidad', 'tres_ejemplos', 'apertura_vi_que', 'mi_hipotesis', 'detalle_excesivo']) assert.ok(codes.includes(c), c + ' falta en ' + codes);
});

ok('estándar V2: saludo, cordialidad y tres viñetas — en modo estricto (borrador autónomo) BLOQUEAN; en guardado manual solo restan', () => {
  const hola = { ...GOOD_B, body: GOOD_B.body.replace('Estimado Marcelo', 'Hola Marcelo') };
  assert.ok(strictLint(hola, [], EV).hard.some((h) => /saludo/.test(h)));
  const manual = cm.coldLint(hola, [], EV); assert.deepEqual(manual.hard, []); assert.ok(manual.warnings.some((w) => w.code === 'saludo_no_estandar'));
  for (const bad of ['Estimado contacto', 'Estimado cliente', 'Estimados señores']) assert.ok(strictLint({ ...GOOD_B, body: GOOD_B.body.replace('Estimado Marcelo', bad) }, [], EV).hard.length >= 1, bad);
  assert.deepEqual(strictLint({ ...GOOD_B, body: GOOD_B.body.replace('Estimado Marcelo', 'Estimado equipo de Ferretería Sur') }, [], EV).hard, []);
  assert.deepEqual(strictLint({ ...GOOD_B, body: GOOD_B.body.replace('Estimado Marcelo', 'Estimado/a Marcelo') }, [], EV).hard, [], '«Estimado/a» es válido');
  // cordialidad: «espero que se encuentre muy bien» (o «esperando que se encuentre bien»)
  const sinCord = { ...GOOD_B, body: GOOD_B.body.replace('Junto con saludar, espero que se encuentre muy bien.', 'Le escribo por un tema operativo.') };
  assert.ok(strictLint(sinCord, [], EV).hard.some((h) => /cordialidad/.test(h)));
  assert.ok(cm.coldLint(sinCord, [], EV).warnings.some((w) => w.code === 'sin_cordialidad'));
  assert.deepEqual(strictLint({ ...GOOD_B, body: GOOD_B.body.replace('Junto con saludar, espero que se encuentre muy bien.', 'Esperando que se encuentre bien,') }, [], EV).hard, []);
  // tres viñetas exactas
  const dos = { ...GOOD_B, body: GOOD_B.body.split('\n').filter((l) => !/^- Ordenar/.test(l)).join('\n') };
  assert.ok(strictLint(dos, [], EV).hard.some((h) => /tres viñetas/.test(h)));
  assert.ok(cm.coldLint(dos, [], EV).warnings.some((w) => w.code === 'tres_ejemplos'));
  assert.ok(strictLint({ ...GOOD_B, body: GOOD_B.body + '\n- Una cuarta viñeta: haciendo algo más.' }, [], EV).hard.some((h) => /tres viñetas/.test(h)));
  // la invitación a una breve conversación o reunión YA NO se bloquea (reemplaza la regla del Playbook v1.0)
  for (const q of ['¿Les parece una llamada de 10 minutos?', '¿Podemos coordinar una reunión esta semana?', 'Si le resulta interesante, con gusto podemos coordinar una breve conversación.']) {
    const d = { ...GOOD_B, body: GOOD_B.body.replace('Si le resulta interesante, con gusto podemos coordinar una breve conversación.', q) };
    assert.deepEqual(strictLint(d, [], EV).hard, [], q);
    assert.ok(!cm.coldLint(d, [], EV).warnings.some((w) => /oferta_prohibida|cta_reunion/.test(w.code)), q);
  }
  // pero no se prometen entregables ni condiciones comerciales no validadas
  for (const bad of ['Le envío una propuesta con precios.', 'Le mando una demo.', 'Ofrecemos una prueba gratis.', 'Hay un descuento especial.']) {
    const d = { ...GOOD_B, body: GOOD_B.body.replace('Quedo atento a sus comentarios.', bad + ' Quedo atento a sus comentarios.') };
    assert.deepEqual(strictLint(d, [], EV).hard, [], bad + ' avisa pero no bloquea');
    assert.ok(cm.coldLint(d, [], EV).warnings.some((w) => w.code === 'promete_recurso'), bad);
  }
  // si el recurso existe de verdad el motor puede permitirlo (allow_offer salta las reglas del primer correo)
  assert.deepEqual(strictLint({ ...GOOD_B, allow_offer: true, body: 'Hola Marcelo, ¿te mando el esquema que armamos para este caso?' }, [], EV).hard, []);
  // los seguimientos no se rigen por estas reglas
  assert.deepEqual(strictLint({ kind: 'followup_1', subject: 'Re: x', body: 'Hola Andrea, te dejo un ejemplo concreto de cómo se vería. ¿Te sirve que te mande el esquema?' }, [], {}).hard, []);
});

ok('viñetas: cada una debe partir del beneficio y no ser una lista de tecnologías', () => {
  const tech = { ...GOOD_B, body: GOOD_B.body.replace(/^- Evitar[^\n]*$/m, '- WhatsApp, CRM y API de correo.').replace(/^- Reducir[^\n]*$/m, '- Chatbot con software y base de datos.') };
  const l = cm.coldLint(tech, [], EV);
  const w = l.warnings.find((x) => x.code === 'vineta_sin_beneficio'); assert.ok(w, JSON.stringify(l.warnings.map((x) => x.code)));
  assert.ok(/tecnolog/.test(w.text)); assert.ok(!l.rewards.some((r) => r.code === 'tres_aplicaciones'));
  assert.deepEqual(strictLint(tech, [], EV).hard, [], 'es un aviso de calidad, no un bloqueo');
  assert.ok(!cm.coldLint(GOOD_B, [], EV).warnings.some((x) => x.code === 'vineta_sin_beneficio'));
});

ok('playbook: la investigación debe ser invisible (fórmulas «Vi que», enlaces, correos, conteos de sedes) y las inferencias no se afirman como hechos', () => {
  const peek = (txt) => cm.coldLint(withBefore(GOOD_B, 'Primero entendemos', txt), [], EV).warnings.map((w) => w.code);
  for (const open of ['Vi que en la venta de equipos industriales es habitual.', 'Revisando su sitio noté que es habitual.', 'Estuve mirando su catálogo y es habitual.', 'En su web dicen que es habitual.', 'Noté que es habitual.']) assert.ok(peek(open).some((c) => /apertura_vi_que|frase_investigacion/.test(c)), open);
  assert.ok(peek('En su sitio web, contacto@empresa.cl y +56 9 1234 5678, es habitual.').includes('evidencia_expuesta'));
  assert.ok(peek('Con dos sucursales, tres números de WhatsApp y 14 servicios es habitual.').includes('detalle_excesivo'));
  assert.ok(peek('Su equipo pierde mucho tiempo respondiendo lo mismo.').includes('inferencia_como_hecho'));
  assert.ok(!peek('En la venta de equipos industriales suele ocurrir.').some((c) => /apertura_vi_que|frase_investigacion|evidencia_expuesta|detalle_excesivo|inferencia_como_hecho/.test(c)));
  const chat = cm.coldLint({ ...GOOD_B, body: GOOD_B.body.replace('Ayudamos a simplificar', 'Instalamos un chatbot con asistente inteligente 24/7 y ayudamos a simplificar') }, [], EV);
  assert.ok(chat.warnings.some((w) => w.code === 'suena_chatbot'));
});

ok('playbook: «imagino que…» y «ahí suele aparecer el trabajo repetitivo» restan, más si ya están en otros correos', () => {
  const m = withBefore(GOOD_A, 'Primero entendemos', 'Imagino que hay mucho trabajo repetitivo.');
  const solo = cm.coldLint(m, [], EV); assert.ok(solo.warnings.some((w) => w.code === 'muletilla_repetida'));
  const peers = [1, 2, 3].map((i) => ({ id: 'p' + i, company_name: 'E' + i, ...withBefore(GOOD_C, 'Primero entendemos', 'Imagino que vuelve a pasar.') }));
  const rep = cm.coldLint(m, peers, EV);
  assert.ok(rep.warnings.find((w) => w.code === 'muletilla_repetida').pts > solo.warnings.find((w) => w.code === 'muletilla_repetida').pts);
});

ok('asunto específico (los de la guía V2 ya no se castigan), sin campaña, y largo de 130–190 palabras', () => {
  const sub = (s) => cm.coldLint({ ...GOOD_A, subject: s }, [], EV).warnings.map((w) => w.code);
  assert.ok(!sub('Una idea para mejorar los procesos de Dentaline').some((c) => /asunto_/.test(c)), 'asunto de la guía V2');
  assert.ok(!sub('Una propuesta para simplificar la coordinación de pedidos').some((c) => /asunto_/.test(c)), 'asunto de la guía V2');
  assert.ok(sub('Propuesta comercial para Dentaline').includes('asunto_generico'));
  assert.ok(sub('Potencia tu empresa con IA').includes('asunto_generico'));
  assert.ok(sub('Automatización con Inteligencia Artificial').includes('asunto_generico'));
  assert.ok(sub('OFERTA ESPECIAL AUTOMATIZACIÓN').includes('asunto_publicitario'));
  assert.ok(sub('consultas entre sedes antes de agendar una hora con la clínica de hoy').includes('asunto_largo'));
  assert.ok(!sub('consultas entre sedes antes de agendar').some((c) => /asunto_/.test(c)));
  const largo = cm.coldLint({ ...GOOD_A, body: GOOD_A.body + ' ' + 'Además queremos aclarar que cada consulta se registra con detalle para que nadie pierda información importante durante el proceso completo de atención. '.repeat(4) }, [], EV);
  assert.ok(largo.warnings.some((w) => w.code === 'largo'));
  assert.ok(cm.coldLint({ kind: 'initial', subject: 'consultas por sede', body: 'Estimada Andrea,\n\nSuele haber trabajo previo en cada consulta.\n\n¿Les haría sentido conversar?' }, [], {}).warnings.some((w) => w.code === 'muy_corto'));
  assert.ok(cm.coldLint(GOOD_A, [], EV).rewards.some((r) => r.code === 'breve'), 'largo ideal premia');
});

ok('linter: repetir el patrón entre borradores castiga más que usarlo una vez (asunto, «Vi que», «hipótesis»)', () => {
  const peers = ['A', 'B', 'C', 'D'].map((x, i) => ({ id: 'p' + i, company_name: x, ...OLD('Empresa ' + x) }));
  const solo = cm.coldLint(OLD('Vet24'), [], {});
  const rep = cm.coldLint(OLD('Vet24'), peers, {});
  const pts = (l) => l.warnings.reduce((a, w) => a + w.pts, 0);
  assert.ok(pts(rep) > pts(solo), pts(rep) + ' vs ' + pts(solo));
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

ok('V2: las partes fijas del estándar (saludo, presentación, enfoque, cierre) NO cuentan como similitud; las viñetas copiadas sí', () => {
  const peers = [GOOD_A, GOOD_B, GOOD_C].map((x, i) => ({ id: 'q' + i, company_name: 'P' + i, ...x }));
  const l = cm.coldLint({ ...GOOD_A, subject: 'otro asunto distinto de agenda', body: GOOD_A.body.replace('Estimada Andrea', 'Estimado Pedro') }, peers.slice(1), EV);
  assert.ok(l.similarity.max < 0.25, 'solo con las partes fijas iguales y viñetas distintas: ' + l.similarity.max);
  const copia = cm.coldLint({ ...GOOD_A, body: GOOD_A.body.replace('Estimada Andrea', 'Estimado Pedro') }, [{ id: 'z', company_name: 'Z', ...GOOD_A }], EV);
  assert.ok(copia.similarity.max >= 0.5 && copia.warnings.some((w) => w.code === 'muy_similar'), 'viñetas idénticas = misma plantilla');
});

ok('diversidad: los correos nuevos usan asuntos y viñetas distintos entre sí, sin penalizar el saludo y cierre estándar', () => {
  const set = [GOOD_A, GOOD_B, GOOD_C];
  assert.equal(new Set(set.map((g) => g.subject)).size, 3);
  assert.equal(new Set(set.map((g) => g.body.split('\n').find((l) => l.startsWith('- ')))).size, 3);
  for (const g of set) { const peers = set.filter((x) => x !== g).map((x, i) => ({ id: 'q' + i, ...x })); const l = cm.coldLint(g, peers, EV); assert.ok(!l.warnings.some((w) => /asunto_|apertura_|cta_repetido|similar|misma_estructura/.test(w.code)), g.subject + ' ' + JSON.stringify(l.warnings.map((w) => w.code))); }
});

ok('máximo un problema (correos sin viñetas): tres problemas distintos restan puntos; el formato de tres viñetas no', () => {
  const multi = { kind: 'initial', subject: 'recepción y ventas', body: 'Estimada Ana,\n\nRecepción repite las mismas preguntas todo el día. Además las cotizaciones se pierden entre correos y nadie las persigue. También el seguimiento a mano de los pedidos demora semanas. Y la agenda queda desordenada.\n\n¿Les haría sentido conversar?' };
  const l = cm.coldLint(multi, [], {});
  assert.ok(l.warnings.some((w) => w.code === 'varios_problemas'));
  assert.ok(!cm.coldLint(GOOD_A, [], EV).warnings.some((w) => w.code === 'varios_problemas'));
});

ok('tono: buzzwords, agencia, tono IA y frases defensivas restan', () => {
  const bad = { kind: 'initial', subject: 'transformación digital', body: 'Hola,\n\nEspero que este mensaje te encuentre bien. En el mundo actual las empresas necesitan soluciones a medida y una transformación digital con sinergia. Somos una agencia de expertos — líderes en IA — y no quiero quitarte tiempo.\n\n¿Agendamos 15 minutos?' };
  const codes = cm.coldLint(bad, [], {}).warnings.map((w) => w.code);
  for (const c of ['buzzwords', 'tono_agencia', 'tono_ia', 'frases_defensivas', 'saludo_no_estandar', 'tres_ejemplos']) assert.ok(codes.includes(c), c + ' falta en ' + codes);
  assert.ok(cm.coldLint({ ...GOOD_A, body: GOOD_A.body.replace('Ayudamos a simplificar', 'Podemos transformar su empresa y potenciar su negocio con agentes para simplificar') }, [], EV).warnings.some((w) => w.code === 'buzzwords'));
});

ok('personalización: sin señal concreta resta; la investigación es invisible (ya no se exige repetir la evidencia declarada)', () => {
  const generic = { kind: 'initial', subject: 'una consulta', body: 'Estimado equipo,\n\nTrabajamos con empresas de su rubro para que su negocio funcione mejor y más ordenado. Nos gustaría conversar sobre cómo podemos colaborar con ustedes.\n\n¿Les haría sentido conversar?' };
  assert.ok(cm.coldLint(generic, [], {}).warnings.some((w) => w.code === 'sin_senal_concreta'));
  assert.ok(!cm.coldLint(GOOD_A, [], { evidence: ['Tienen certificación ISO 9001 vigente'] }).warnings.some((w) => w.code === 'evidencia_no_usada'));
  assert.ok(cm.coldLint(GOOD_A, [], EV).evidence_used === true);
});

ok('seguimientos (Playbook §17 revisado): prometer y el seguimiento vacío penalizan; dolor y valor premian; el cierre premia; las plantillas por rubro pasan limpias', () => {
  const sub = 'Re: consultas entre sedes';
  const promete = { kind: 'followup_1', subject: sub, body: 'Hola Andrea, te dejo un ejemplo concreto de cómo se vería. ¿Te sirve que te mande el esquema o una demo?' };
  const lp = cm.coldLint(promete, [], {});
  assert.ok(lp.warnings.some((w) => w.code === 'followup_promete'));
  assert.ok(lp.warnings.some((w) => w.code === 'cta_ofrece_ejemplo'));
  // «por ejemplo» (para ilustrar una cuenta) NO es prometer un ejemplo
  const ilustra = { kind: 'followup_2', subject: sub, body: 'Estimado equipo de X,\n\nUna cuenta simple: pedidos por día × minutos. Por ejemplo, 150 pedidos × 1 minuto son 2,5 horas diarias antes de contar correcciones, y con cualquier planilla se puede medir en una semana de trabajo normal. Anotarlo ayuda a decidir qué conviene ordenar primero en la operación diaria.\n\n¿Cómo registran hoy los pedidos de cada turno?' };
  assert.ok(!cm.coldLint(ilustra, [], {}).warnings.some((w) => w.code === 'followup_promete'));
  const vende = { kind: 'followup_3', subject: sub, body: 'Estimado equipo de Dentaline,\n\nArmamos agentes que responden la primera consulta y dejan el caso listo. ¿Lo conversamos?' };
  assert.ok(cm.coldLint(vende, [], {}).warnings.some((w) => w.code === 'followup_vuelve_a_vender'), 'el cierre no vuelve a vender');
  // el seguimiento vacío («retomo por si quedó abajo») y el muy corto ya no pasan como buenos en los pasos 1 y 2
  const vacio = { kind: 'followup_1', subject: sub, body: 'Estimado equipo de Rentalin,\n\nRetomo esto por si quedó abajo en la bandeja.\n\n¿Ese trabajo previo a cotizar hoy les quita tiempo, o es una parte que ya tienen bastante resuelta?' };
  const lv = cm.coldLint(vacio, [], {});
  assert.ok(lv.warnings.some((w) => w.code === 'followup_vacio')); assert.ok(lv.warnings.some((w) => w.code === 'followup_corto'));
  const f3 = { kind: 'followup_3', subject: sub, body: 'Estimado equipo de Rentalin,\n\nCierro el hilo por acá para no insistir. Si en algún momento quieren revisar esta u otra parte del proceso que siga siendo repetitiva, encantado de conversarlo.' };
  const l3 = cm.coldLint(f3, [], {});
  assert.ok(l3.rewards.some((r) => r.code === 'followup_cierra'));
  assert.ok(!l3.warnings.some((w) => ['muy_corto', 'followup_corto', 'followup_promete', 'cta_ofrece_ejemplo', 'cta_reunion', 'followup_vuelve_a_vender'].includes(w.code)));
  // las plantillas por rubro, en sus 3 variantes, pasan limpias
  for (const v of [null, 'corredoras', 'clinicas', 'casinos_colegios', 'casinos_empresas']) {
    for (const k of ['followup_1', 'followup_2', 'followup_3']) {
      for (const i of [0, 1, 2]) {
        const body = 'Estimado equipo de Dentaline,\n\n' + ftt.followupBody(k, v, i);
        const l = cm.coldLint({ kind: k, subject: 'Re: consultas entre sedes', body }, [], {});
        const tag = (v || 'generico') + '/' + k + '/v' + i;
        assert.deepEqual(l.hard, [], tag);
        assert.ok(!l.warnings.some((w) => ['followup_promete', 'cta_ofrece_ejemplo', 'followup_vuelve_a_vender', 'followup_vacio', 'followup_corto', 'muy_corto', 'largo', 'cta_reunion', 'buzzwords', 'tono_ia'].includes(w.code)), tag + ' ' + JSON.stringify(l.warnings.map((w) => w.code)));
        assert.ok(l.score >= (k === 'followup_3' ? 80 : 90), tag + ' score ' + l.score);
        if (k !== 'followup_3') assert.ok(l.rewards.some((r) => r.code === 'followup_valor'), tag + ' dolor/valor con 100–170 palabras');
        else assert.ok(l.rewards.some((r) => r.code === 'followup_cierra'), tag);
      }
    }
  }
  // followupTemplate arma saludo + asunto original y reparte las variantes entre prospectos
  const usados = new Set();
  for (let i = 0; i < 40; i++) { const t = oc.followupTemplate('followup_2', { id: 'c' + i, company_name: 'Dentaline', canonical: { vertical: 'clinicas' } }, 'consultas entre sedes'); assert.ok(/^Estimado equipo de Dentaline,/.test(t.body)); assert.equal(t.subject, 'Re: consultas entre sedes'); usados.add(t.body); }
  assert.equal(usados.size, 3, 'los prospectos reciben 3 textos distintos');
  // casinos: si el primer correo ya presentó la plataforma con los agentes, el seguimiento 1 NO repite la frase de la experiencia; si no, la incluye
  for (const v of ['casinos_colegios', 'casinos_empresas']) {
    for (let i = 0; i < 12; i++) {
      const cd = { id: 'k' + i, company_name: 'Casino X', canonical: { vertical: v } };
      const con = oc.followupTemplate('followup_1', cd, 'Pedidos', 'Gracias a nuestra experiencia trabajando con casinos escolares, armamos una solución que une una plataforma para gestionar los pedidos con agentes.');
      const sin = oc.followupTemplate('followup_1', cd, 'Pedidos', 'En los casinos suele haber un trabajo repetido: cruzar pagos. ¿Les haría sentido conversar?');
      assert.ok(!/gracias a nuestra experiencia/i.test(con.body) && /La plataforma y los agentes que les mencioné/.test(con.body), v + ' con mención: no repite');
      assert.ok(/gracias a nuestra experiencia/i.test(sin.body), v + ' sin mención: la agrega');
      const l = cm.coldLint({ kind: 'followup_1', subject: con.subject, body: con.body }, [], {});
      assert.deepEqual(l.hard, [], v + ' lint'); assert.ok(l.rewards.some((r) => r.code === 'followup_valor'), v + ' largo 100–170');
    }
  }
});

ok('bloqueos reales: porcentajes, garantías y números de clientes sin respaldo', () => {
  for (const claim of ['Reducimos el tiempo de respuesta en 40% en todos nuestros clientes.', 'Garantizamos resultados desde el primer mes.', 'Hemos ayudado a más de 30 empresas a automatizar su atención.']) {
    const l = cm.coldLint(withBefore(GOOD_A, 'Primero entendemos', claim), [], EV);
    assert.ok(l.hard.length >= 1, claim);
  }
  assert.deepEqual(cm.coldLint(GOOD_A, [], EV).hard, []);
});

// ---------------------------------------------------------------- integración con el motor (planDraft / planLint)

ok('regenerar mantiene el MISMO registro, destinatario y estado draft; guarda la versión anterior; no envía', () => {
  const live = draftRow();
  const r = oc.planDraft({ kind: 'initial', subject: GOOD_A.subject, body: GOOD_A.body, by: 'Hermes', reason: 'Estándar V2', cold: EV }, ctx({ history: [live] }));
  assert.equal(r.response.ok, true); assert.equal(r.response.status, 'updated');
  assert.equal(r.writes.length, 1); assert.equal(r.writes[0].method, 'PATCH'); assert.equal(r.writes[0].path, 'outreach_messages?id=eq.m-1');
  const b = r.writes[0].body;
  assert.equal(b.to_email, 'contacto@dentaline.cl'); assert.equal(b.status, 'draft'); assert.equal(b.approved_at, null); assert.equal(b.subject, 'Consultas entre sedes antes de agendar', 'el asunto del correo inicial se guarda con mayúscula inicial');
  assert.equal(b.metadata.history.length, 1); assert.equal(b.metadata.history[0].subject, 'Una idea para Dentaline'); assert.ok(/Vi que/.test(b.metadata.history[0].body)); assert.equal(b.metadata.history[0].reason, 'Estándar V2');
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

ok('auto=true: exige evidencia, cumplir el estándar V2 (saludo, cordialidad, tres viñetas) y un score mínimo; si no, NO guarda nada y devuelve el motivo', () => {
  const noEv = oc.planDraft({ kind: 'initial', subject: GOOD_A.subject, body: GOOD_A.body, auto: true }, ctx());
  assert.equal(noEv.response.ok, false); assert.equal(noEv.response.status, 'needs_evidence'); assert.deepEqual(noEv.writes, []);
  // la plantilla vieja incumple el estándar (saludo «Hola», sin cordialidad ni viñetas): bloqueo duro
  const old = oc.planDraft({ kind: 'initial', subject: OLD('Dentaline').subject, body: OLD('Dentaline').body, auto: true, cold: EV }, ctx());
  assert.equal(old.response.status, 'invalid_draft'); assert.deepEqual(old.writes, []); assert.ok(old.response.errors.some((e) => /saludo/.test(e))); assert.ok(old.response.errors.some((e) => /viñetas/.test(e))); assert.ok(old.response.errors.some((e) => /cordialidad/.test(e)));
  // un correo que cumple el estándar de forma pero queda flojo (jerga, agencia, viñetas de tecnologías) sigue cayendo por score mínimo
  const weak = { subject: 'consultas', body: 'Estimado equipo de Dentaline:\n\nEsperando que se encuentre bien, somos una agencia que ofrece soluciones a medida y una transformación digital con sinergia para empresas de su rubro y de todo tamaño.\n\nEn empresas como la suya podemos ayudar a:\n\n- Soluciones integrales de WhatsApp, CRM y API.\n- Chatbot asistente virtual 24/7 con software.\n- Transformación digital de su negocio.\n\nQuedamos atentos.' };
  const low = oc.planDraft({ kind: 'initial', subject: weak.subject, body: weak.body, auto: true, cold: EV }, ctx());
  assert.equal(low.response.status, 'low_quality', JSON.stringify(low.response)); assert.deepEqual(low.writes, []); assert.ok(low.response.score < 70); assert.ok(low.response.warnings.length >= 3);
  const good = oc.planDraft({ kind: 'initial', subject: GOOD_A.subject, body: GOOD_A.body, auto: true, cold: EV }, ctx());
  assert.equal(good.response.ok, true); assert.equal(good.response.status, 'created'); assert.equal(good.writes[0].body.metadata.cold.score >= 70, true);
});

ok('guardado manual (Christian) nunca se bloquea por score ni por el saludo/viñetas del estándar: se guarda con avisos', () => {
  const r = oc.planDraft({ kind: 'initial', subject: OLD('Dentaline').subject, body: OLD('Dentaline').body }, ctx());
  assert.equal(r.response.ok, true); assert.ok(r.response.cold.score < 50); assert.ok(r.response.warnings.length >= 3);
});

ok('bloqueo duro por afirmación sin respaldo también aplica al guardar', () => {
  const r = oc.planDraft({ kind: 'initial', subject: 'consultas entre sedes', body: withBefore(GOOD_A, 'Primero entendemos', 'Reducimos 40% el tiempo de respuesta.').body }, ctx());
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

ok('tono cercano: la presentación breve del estándar NO cuenta como explicar a Atacama; explicar en muchas oraciones sí penaliza', () => {
  const l = strictLint(GOOD_A, [], EV);
  assert.ok(!l.warnings.some((w) => w.code === 'explica_atacama'), JSON.stringify(l.warnings.map((w) => w.code)));
  assert.equal(l.cta_kind, 'invitation'); assert.ok(l.score >= 80, String(l.score)); assert.deepEqual(l.hard, []);
  const much = withBefore(GOOD_A, 'Primero entendemos', 'Atacama Labs es una empresa chilena. Nuestros agentes trabajan dentro del proceso. Armamos agentes para cada rubro.');
  assert.ok(cm.coldLint(much, [], EV).warnings.some((w) => w.code === 'explica_atacama'));
});

ok('cmCtaKind: un cierre de interés NO se confunde con pedir reunión porque la oración anterior diga «lista para agendar»', () => {
  const body = 'Hola,\n\nContexto.\n\nSoy Christian, de Atacama Labs. Armamos agentes que pueden hacerse cargo de esa primera parte y dejar cada consulta completa, registrada y lista para agendar o derivar cuando realmente necesita a una persona.\n\n¿Les sirve que les mande un ejemplo aplicado a su clínica?';
  assert.equal(cm.cmCtaKind(body), 'example');
  assert.equal(cm.cmCtaKind('Hola.\n\nObservación.\n\n¿Agendamos una llamada de 15 minutos?'), 'meeting');
  assert.equal(cm.cmCtaKind('Hola.\n\nObservación.\n\n¿Podemos agendar una reunión esta semana?'), 'meeting');
  assert.equal(cm.cmCtaKind('Hola.\n\nObservación.\n\n¿Quién lleva esto en ventas? Si quieren, les mando un ejemplo.'), 'example');
  assert.equal(cm.cmCtaKind('Estimado equipo.\n\nObservación.\n\n¿Les haría sentido conversar sobre cómo automatizar esta primera etapa?'), 'question');
});

console.log(n + ' ok');
