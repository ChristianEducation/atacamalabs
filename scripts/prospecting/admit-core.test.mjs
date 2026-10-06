// node scripts/prospecting/admit-core.test.mjs
import { evidenceKind, evidenceSupports, normalizeVertical, mapSolution, mapChannel, evaluateAdmission, lintDraft, buildDraft, buildGhlPayloads, buildReviewNote, findExistingContact } from './admit-core.mjs';
let pass = 0, fail = 0;
const t = (n, c, x = '') => { c ? pass++ : fail++; console.log(c ? 'ok  ' : 'FAIL', n, c ? '' : x); };
const clone = (o) => JSON.parse(JSON.stringify(o));

const ev = (factor, level, certainty, quote) => ({ research_type: 'factor:' + factor, finding: 'Hallazgo de ' + factor + ' suficientemente largo', evidence_text: quote === undefined ? (factor === 'pain' ? 'Agenda tu hora por WhatsApp y te respondemos' : 'cita literal de ' + factor) : quote, source_url: 'https://empresa-demo.cl/' + factor, source_date: null, raw_metadata: { level, certainty } });
const good = {
  prospect: { id: 'p1', classification: 'hot', crm_candidate: true, final_score: 85, status: 'new', ghl_opportunity_id: null, pain_verified: true, prospect_key: 'account:abc', metadata: { factors: { pain: { points: 20, weight: 20 }, fit: { points: 15, weight: 15 }, automation: { points: 15, weight: 15 } } } },
  account: { id: 'a1', name: 'Empresa Demo SpA', domain: 'empresa-demo.cl', website: 'https://empresa-demo.cl', city: 'Antofagasta', metadata: { hermes: { vertical: 'Salud', signal: 'Agenda por formulario y WhatsApp manual', pain: 'Responden a mano cada solicitud de hora', fit: 'Atiende por WhatsApp', offer: 'un agente que agenda y confirma las horas por WhatsApp', why_now: 'Publicaron hoy una vacante de recepcionista para atender WhatsApp', commercial_angle: 'Liberar a recepción de agendar manualmente las horas del día', confidence: 0.8, source: 'search', draft: '', draft_subject: '' } } },
  contact: { name: 'Ana Pérez', job_title: 'Gerente', email: 'ana@empresa-demo.cl', phone: '+56911112222', source_url: 'https://empresa-demo.cl/contacto', metadata: { public: true } },
  research: [ev('pain', 2, 'observed'), ev('fit', 2, 'observed'), ev('automation', 2, 'observed'), ev('volume', 1, 'unverified'), { research_type: 'factor:access', finding: 'Canal público', evidence_text: null, source_url: 'https://empresa-demo.cl/contacto', raw_metadata: { level: 2, certainty: 'observed' } }],
};

// --- evidencia
t('evidencia literal: nivel 2 + observed + cita + URL', evidenceKind(ev('pain', 2, 'observed')) === 'literal');
t('evidencia sin cita no es literal', evidenceKind(ev('pain', 2, 'observed', null)) === 'sin_verificar');
t('evidencia inferida es inferencia', evidenceKind(ev('pain', 1, 'inferred')) === 'inferencia');
t('cita no encontrada (unverified) no es literal', evidenceKind(ev('pain', 1, 'unverified')) === 'sin_verificar');

// --- mapas
t('vertical válida se conserva, desconocida => Otro', normalizeVertical('Salud') === 'Salud' && normalizeVertical('Minería') === 'Otro' && normalizeVertical(null) === 'Otro');
t('solución: agenda/WhatsApp => atención y seguimiento; integr => integraciones; nada => unsure', mapSolution('agenda por WhatsApp') === 'atencion-y-seguimiento' && mapSolution('conectar CRM y ERP') === 'integraciones' && mapSolution('software a medida') === 'sistemas-a-medida' && mapSolution('xyz') === 'unsure');
t('canal: declarado manda; si no, el mejor disponible', mapChannel({ email: 'a@b.cl' }, 'whatsapp') === 'WhatsApp' && mapChannel({ email: 'a@b.cl' }) === 'Correo' && mapChannel({ phone: '123' }) === 'Llamada' && mapChannel({}) === 'Formulario web');

// --- admisión
let r = evaluateAdmission(good);
t('prospecto completo => admitido', r.ok && r.reasons.length === 0 && r.best_evidence.factor === 'pain' && r.literal_factors.length === 3, JSON.stringify(r));
const mut = (fn) => { const x = clone(good); fn(x); return evaluateAdmission(x); };
t('score 79 => no', mut((x) => { x.prospect.final_score = 79; }).reasons.includes('score_bajo_80'));
t('no clase A => no', mut((x) => { x.prospect.crm_candidate = false; }).reasons.includes('no_es_clase_A'));
t('ya en GHL => no (anti-duplicado)', mut((x) => { x.prospect.ghl_opportunity_id = 'opp1'; }).reasons.includes('ya_en_ghl'));
t('estado distinto de new (p. ej. aprobado/contactado) => no', mut((x) => { x.prospect.status = 'contacted'; }).reasons.includes('estado_no_new'));
t('sin sitio propio => no', mut((x) => { x.account.domain = null; x.account.website = null; }).reasons.includes('empresa_sin_sitio_propio'));
t('dolor sin cita literal (no encontrada) => no aunque el score diga 80', mut((x) => { x.research[0] = ev('pain', 1, 'unverified'); }).reasons.includes('sin_evidencia_literal_del_dolor'));
t('menos de 3 factores literales => no', mut((x) => { x.research[2] = ev('automation', 1, 'inferred'); }).reasons.includes('evidencia_literal_insuficiente'));
t('el factor access no cuenta como evidencia literal', evaluateAdmission(good).literal_factors.indexOf('access') === -1);
t('sin contacto público => no', mut((x) => { x.contact = null; }).reasons.includes('sin_contacto_publico_con_fuente'));
t('contacto sin URL de fuente => no', mut((x) => { x.contact.source_url = null; }).reasons.includes('sin_contacto_publico_con_fuente'));
t('sin motivo para escribir ahora => no', mut((x) => { x.account.metadata.hermes.why_now = ''; x.account.metadata.hermes.reason = 'corto'; }).reasons.includes('sin_motivo_para_ahora'));
t('sin ángulo comercial => no', mut((x) => { x.account.metadata.hermes.commercial_angle = ''; }).reasons.includes('sin_angulo_comercial'));
t('why_now cae a reason (contrato anterior)', mut((x) => { delete x.account.metadata.hermes.why_now; x.account.metadata.hermes.reason = 'Razón específica de más de veinte caracteres'; }).ok);

// --- la cita debe DEMOSTRAR el factor (no solo existir)
t('evidencia: un título no demuestra dolor', evidenceSupports('pain', 'MAESTRANZA Y TORNERIA', 'x') === false);
t('evidencia: un teléfono no demuestra dolor', evidenceSupports('pain', 'Contáctanos al +56 9 8852 0730', 'x') === false && evidenceSupports('pain', 'Llamadas: (56) 9 6727 6825', 'x') === false && evidenceSupports('pain', '+56 9 2029 3625 contacto@centropulmari.cl', 'x') === false);
t('evidencia: un saludo no demuestra encaje ni volumen', evidenceSupports('fit', 'Bienvenidos a Centro Salud 360', 'x') === false && evidenceSupports('volume', 'Más de 500 familias', 'x') === false);
t('evidencia: dolor con proceso observable sí cuenta', evidenceSupports('pain', 'Agenda tu hora por WhatsApp y te respondemos', 'x') && evidenceSupports('pain', 'Cotiza por WhatsApp', 'x') && evidenceSupports('pain', 'Solicita tu cotización llenando el formulario', 'x'));
t('evidencia: encaje con una descripción real del servicio sí cuenta', evidenceSupports('fit', 'Servicio de maestranza y tornería industrial, especializado en mecanizado', 'x'));
r = mut((x) => { x.research[0] = { ...ev('pain', 2, 'observed', 'Contáctanos al +56 9 8852 0730'), finding: 'Dolor de atención telefónica suficientemente largo' }; });
t('admisión: una cita del dolor que existe pero no describe un proceso NO deja pasar al CRM aunque el score diga 85', r.reasons.includes('cita_del_dolor_no_describe_un_proceso') && !r.ok, JSON.stringify(r.reasons));

// --- borrador
const okBody = 'Hola Ana,\n\nEn empresa-demo.cl leí que reciben las solicitudes de hora por WhatsApp. Si hoy las agendan a mano, en Atacama Labs podemos armar un agente que las agende y confirme, y que Empresa Demo solo intervenga cuando haga falta.\n\n¿Te muestro cómo se vería para Empresa Demo en 10 minutos?\n\nChristian';
t('borrador correcto pasa la revisión', lintDraft('Una idea para Empresa Demo', okBody, { company: 'Empresa Demo SpA' }).length === 0, JSON.stringify(lintDraft('Una idea para Empresa Demo', okBody, { company: 'Empresa Demo SpA' })));
t('lint: «Vi que están teniendo problemas» se rechaza', lintDraft('Hola', 'Hola Ana, vi que están teniendo problemas con las citas en Empresa Demo y quiero ayudarles a resolverlo con nuestro trabajo de automatización personalizada, ¿hablamos esta semana?', { company: 'Empresa Demo' }).includes('afirma_un_problema_no_demostrado'));
t('lint: exageraciones y chatbot', (() => { const p = lintDraft('Hola', 'Hola Empresa Demo, revolucionamos tu negocio con IA: nuestro chatbot es el mejor y garantizamos 100% de resultados para ustedes sin ningún riesgo, ¿hablamos esta semana?', { company: 'Empresa Demo' }); return p.includes('exageracion') && p.includes('dice_chatbot'); })());
t('lint: finge relación previa', lintDraft('Hola', 'Hola Ana, como conversamos la semana pasada sobre Empresa Demo y su agenda de horas, te escribo de nuevo para avanzar con una propuesta concreta para ustedes, ¿te parece bien?', { company: 'Empresa Demo' }).includes('finge_relacion_previa'));
t('lint: demasiado largo / sin pregunta / sin empresa', (() => { const p = lintDraft('Hola', 'palabra '.repeat(150), { company: 'Empresa Demo' }); return p.includes('muy_largo') && p.includes('sin_pregunta_final') && p.includes('no_menciona_a_la_empresa'); })());
let d = buildDraft(good, evaluateAdmission(good));
t('sin borrador de Hermes => plantilla honesta con la cita verificada y sin afirmar problemas', d.source === 'plantilla' && d.message.includes('Agenda tu hora por WhatsApp') && /hipótesis/i.test(d.message) && d.lint.length === 0 && !/vi que/i.test(d.message), JSON.stringify(d));
const withHermes = clone(good); withHermes.account.metadata.hermes.draft = okBody; withHermes.account.metadata.hermes.draft_subject = 'Una idea para Empresa Demo';
d = buildDraft(withHermes, evaluateAdmission(withHermes));
t('borrador de Hermes válido se conserva', d.source === 'hermes' && d.message === okBody);
const badHermes = clone(good); badHermes.account.metadata.hermes.draft = 'Estimado cliente, revolucionamos su negocio con IA. ¿Hablamos?'; badHermes.account.metadata.hermes.draft_subject = 'Hola';
d = buildDraft(badHermes, evaluateAdmission(badHermes));
t('borrador de Hermes malo se reemplaza por la plantilla y se anota el motivo', d.source === 'plantilla' && d.hermes_lint.length > 0 && d.lint.length === 0);

// --- GHL
const cfg = { locationId: 'LOC', pipelineId: 'PIPE', stageId: 'STAGE', fields: { fuente: 'f1', solucion_de_interes: 'f2', icp_vertical: 'f3', evidencia_url: 'f4', canal_de_contacto: 'f5', qualification_score: 'f6', commercial_angle: 'f7', prospect_key: 'f8' }, contactFields: { origen_detallado: 'c1', primary_contact_role: 'c2' } };
const adm = evaluateAdmission(good);
const g = buildGhlPayloads(good, adm, buildDraft(good, adm), cfg);
const fv = (id) => (g.opportunity.customFields.find((x) => x.id === id) || {}).field_value;
t('oportunidad: etapa Investigado, abierta, sin contactId (se agrega luego)', g.opportunity.pipelineStageId === 'STAGE' && g.opportunity.status === 'open' && g.opportunity.contactId === undefined);
t('campos existentes reutilizados: evidencia, vertical, canal, score, ángulo, prospect key, fuente', fv('f4') === 'https://empresa-demo.cl/pain' && fv('f3') === 'Salud' && fv('f5') === 'Correo' && fv('f6') === 85 && fv('f7').startsWith('Liberar') && fv('f8') === 'account:abc' && fv('f1') === 'outbound_manual', JSON.stringify(g.opportunity.customFields));
t('contacto: origen detallado «Prospección outbound», etiquetas de revisión, fuente propia, cargo', g.contact.customFields[0].field_value === 'Prospección outbound' && g.contact.tags.includes('prospecto-por-revisar') && g.contact.source === 'atacama-labs-prospecting' && g.contact.customFields[1].field_value === 'Gerente');
t('contacto sin persona => se nombra con la empresa', buildGhlPayloads({ ...good, contact: { ...good.contact, name: null } }, adm, buildDraft(good, adm), cfg).contact.name === 'Empresa Demo SpA');
t('no hay ningún campo de envío ni etapa Contactado', !JSON.stringify(g).includes('contactado') && !JSON.stringify(g).toLowerCase().includes('sent'));
const note = g.note;
t('nota: por qué ahora, ángulo, evidencia con marcas, contacto, borrador NO ENVIADO y cómo aprobar', /POR QUÉ ESCRIBIRLE AHORA: Publicaron/.test(note) && /ÁNGULO COMERCIAL: Liberar/.test(note) && note.includes('✔ [pain]') && note.includes('? [volume]') && /NO ENVIADO/.test(note) && /aprobado-para-contactar/.test(note) && note.includes('ana@empresa-demo.cl'), note);
t('nota: las 3 primeras líneas dan la decisión (≤60 s)', note.split('\n').slice(0, 5).join(' ').includes('Score 85/100') && note.split('\n')[0].includes('Empresa Demo SpA'));
t('nota: lo no demostrado se rotula hipótesis', /hipótesis/i.test(note));

// --- duplicados en GHL
t('duplicado por correo exacto', findExistingContact([{ id: 'x', email: 'ANA@empresa-demo.cl' }], 'ana@empresa-demo.cl', null, 'empresa-demo.cl').id === 'x');
t('duplicado por dominio del correo', findExistingContact([{ id: 'y', email: 'otra@empresa-demo.cl' }], 'ana@empresa-demo.cl', null, 'empresa-demo.cl').id === 'y');
t('duplicado por teléfono (últimos 9 dígitos)', findExistingContact([{ id: 'z', phone: '+56 9 1111 2222' }], null, '911112222', null).id === 'z');
t('sin coincidencias => null', findExistingContact([{ id: 'w', email: 'x@otra.cl', phone: '+56 9 0000 0001' }], 'ana@empresa-demo.cl', '+56911112222', 'empresa-demo.cl') === null && findExistingContact([], 'a@b.cl') === null);

console.log(`\n${pass} ok ${fail} fallos`);
process.exit(fail ? 1 : 0);
