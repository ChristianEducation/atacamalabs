/**
 * Atacama OS · Prospección — núcleo de ADMISIÓN a GHL (funciones puras).
 *
 * Igual que engine-core / metrics-core: funciones AUTOCONTENIDAS (sin imports; las que se llaman entre sí se incrustan juntas)
 * para probarse con `admit-core.test.mjs` y pegarse tal cual en el workflow n8n «18 Prospect Admit».
 *
 * Política (no se cambia aquí, solo se aplica): solo entra a GHL (etapa «Investigado») un prospecto con score ≥ 80, clase A
 * (hot + crm_candidate) y TODOS estos gates: empresa real con sitio propio, evidencia literal verificada del dolor (cita encontrada en
 * la URL), al menos 3 factores con evidencia literal, contacto público con su fuente, motivo para escribir ahora y ángulo comercial.
 * Lo que no pasa se queda en Supabase (con el motivo); nada se envía y nada pasa a «Contactado».
 */

/** Hechos vs inferencias: «literal» = nivel 2 con cita encontrada en la página; «inferencia»; «sin verificar». */
export function evidenceKind(r) {
  const meta = (r && r.raw_metadata) || {};
  const level = Number(meta.level);
  const certainty = meta.certainty || 'inferred';
  if (certainty === 'observed' && level === 2 && r.evidence_text && r.source_url) return 'literal';
  if (certainty === 'inferred') return 'inferencia';
  return 'sin_verificar';
}

/**
 * ¿La cita REALMENTE demuestra el factor? La verificación de citas solo prueba que el texto existe en la página; no que sirva de evidencia.
 * Un título («MAESTRANZA Y TORNERIA»), un teléfono o un saludo no demuestran dolor ni nada. Heurística conservadora y documentada:
 *  - cualquier factor: la cita debe tener al menos 4 palabras (sin números ni signos); para el dolor, 3 palabras;
 *  - dolor: la cita debe mencionar un proceso manual/de atención observable (WhatsApp, cotizar, agendar, formulario, solicitudes, llamadas, pedidos, horario…).
 */
export function evidenceSupports(factor, quote, finding) {
  const words = (s) => String(s || '').replace(/[+()\d·|/@_:;.,\-–—]+/g, ' ').split(/\s+/).filter((w) => w.length > 1);
  const q = String(quote || '');
  const wc = words(q).length;
  if (String(factor) === 'pain') {
    if (wc < 3) return false;
    return /(whatsapp|cotiz|agend|reserv|solicit|formulario|escr[ií]b|mensaje|llam(a|e|ada)|pedido|consult|fuera de horario|respond|seguimiento|manual|planilla|excel|presupuesto|inscripci|vacante|trabaja con nosotros|recepcionista|atenci[oó]n al cliente|horario|demora|esper)/i.test(q);
  }
  return wc >= 4;
}

export function normalizeVertical(v) {
  const OPT = ['Salud', 'Inmobiliarias', 'Educación', 'Retail & Ecommerce', 'Alimentación & Casinos', 'Gimnasios', 'Servicios Profesionales', 'B2B & Industria', 'Contabilidad & Finanzas', 'Otro'];
  const s = String(v || '').trim();
  return OPT.includes(s) ? s : 'Otro';
}

/** Solución de interés orientativa (campo de GHL con opciones fijas). Solo una guía para quien revisa. */
export function mapSolution(text) {
  const t = String(text || '').toLowerCase();
  if (/sistema|software|a medida|plataforma propia|app /.test(t)) return 'sistemas-a-medida';
  if (/integr|conectar|crm|erp|sincroniz/.test(t)) return 'integraciones';
  if (/agente|atenci|whatsapp|cotiz|agend|reserva|seguimiento|responde/.test(t)) return 'atencion-y-seguimiento';
  if (/automat|proceso|factura|cobranza|pedido/.test(t)) return 'automatizacion-de-procesos';
  return 'unsure';
}

/** Canal de contacto (opciones de GHL: Correo, WhatsApp, Instagram, LinkedIn, Llamada, Formulario web, Referido). */
export function mapChannel(contact, declared) {
  const c = contact || {};
  const d = String(declared || '').toLowerCase();
  const byDecl = { email: 'Correo', correo: 'Correo', whatsapp: 'WhatsApp', phone: 'Llamada', llamada: 'Llamada', telefono: 'Llamada', linkedin: 'LinkedIn', instagram: 'Instagram', form: 'Formulario web', formulario: 'Formulario web' }[d];
  if (byDecl) return byDecl;
  if (c.email) return 'Correo';
  if (c.whatsapp) return 'WhatsApp';
  if (c.phone) return 'Llamada';
  if (c.linkedin_url) return 'LinkedIn';
  return 'Formulario web';
}

/**
 * Evalúa si un prospecto puede entrar a GHL. row = { prospect, account, contact, research[] } (filas de Supabase).
 * Devuelve { ok, reasons[], literal_factors[], best_evidence, checks }.
 */
export function evaluateAdmission(row) {
  const p = (row && row.prospect) || {};
  const a = (row && row.account) || {};
  const c = (row && row.contact) || null;
  const rs = Array.isArray(row && row.research) ? row.research : [];
  const h = (a.metadata && a.metadata.hermes) || {};
  const reasons = [];
  const len = (v) => String(v == null ? '' : v).trim().length;

  if (p.classification !== 'hot' || p.crm_candidate !== true) reasons.push('no_es_clase_A');
  if (!(Number(p.final_score) >= 80)) reasons.push('score_bajo_80');
  if (p.status !== 'new') reasons.push('estado_no_new');
  if (p.ghl_opportunity_id) reasons.push('ya_en_ghl');
  if (!a.name || !(a.domain || a.website)) reasons.push('empresa_sin_sitio_propio');
  if (p.pain_verified !== true) reasons.push('dolor_no_verificado');

  const literal = rs.filter((r) => evidenceKind(r) === 'literal');
  const literalFactors = [...new Set(literal.map((r) => String(r.research_type || '').replace('factor:', '')))].filter((f) => f && f !== 'access');
  const painLiteral = literal.find((r) => r.research_type === 'factor:pain');
  if (!painLiteral) reasons.push('sin_evidencia_literal_del_dolor');
  else if (!evidenceSupports('pain', painLiteral.evidence_text, painLiteral.finding)) reasons.push('cita_del_dolor_no_describe_un_proceso');
  if (literalFactors.length < 3) reasons.push('evidencia_literal_insuficiente');

  const contactOk = Boolean(c && (c.email || c.phone || c.whatsapp) && c.source_url && (!c.metadata || c.metadata.public !== false));
  if (!contactOk) reasons.push('sin_contacto_publico_con_fuente');

  const whyNow = h.why_now || h.reason || '';
  if (len(whyNow) < 20) reasons.push('sin_motivo_para_ahora');
  if (len(h.commercial_angle) < 20) reasons.push('sin_angulo_comercial');

  const best = painLiteral || literal[0] || null;
  return {
    ok: reasons.length === 0, reasons,
    literal_factors: literalFactors,
    best_evidence: best ? { url: best.source_url, quote: best.evidence_text, finding: best.finding, factor: String(best.research_type).replace('factor:', '') } : null,
    why_now: String(whyNow).trim(), commercial_angle: String(h.commercial_angle || '').trim(),
  };
}


/** Revisa un borrador de contacto. Devuelve la lista de problemas (vacía = aprobado). */
export function lintDraft(subject, message, ctx) {
  const FORBIDDEN = [
    [/vi que (est[aá]n|estás|est[aá]s|tienen|tienes) (teniendo )?(problemas|dificultades)/i, 'afirma_un_problema_no_demostrado'],
    [/revolucion|disrupt|transforma(r|mos) (tu|su) (negocio|empresa)|el mejor|garantizamos|100 ?%|sin riesgo|inigualable/i, 'exageracion'],
    [/chatbot/i, 'dice_chatbot'],
    [/como (conversamos|hablamos|acordamos)|seguimiento (de|a) (nuestra|mi) (conversaci[oó]n|llamada)|de nuevo|nuevamente/i, 'finge_relacion_previa'],
    // Playbook de correos outbound v1.0: la investigación es invisible y el primer correo no ofrece demo/ejemplo/reunión.
    [/\bvi que\b|\bveo que\b|estuve (mirando|revisando)|revisando (su|tu) (sitio|web|p[aá]gina)|\bnot[eé] que\b|me fij[eé] que|en (su|tu) (sitio|p[aá]gina|web)\b|https?:|www\./i, 'evidencia_expuesta'],
    [/\b\d+\s*(min|minutos)\b|\breuni[oó]n\b|videollamada|\bdemo\b|\bpropuesta\b|auditor[ií]a|\b(te|les) (mando|muestro|env[ií]o|comparto|dejo|paso)\b/i, 'ofrece_demo_o_reunion'],
  ];
  const probs = [];
  const text = String(message || '').trim();
  const words = text.split(/\s+/).filter(Boolean).length;
  if (words < 40) probs.push('muy_corto');
  if (words > 140) probs.push('muy_largo');
  if (!/^estimad[oa]s? /i.test(text)) probs.push('saludo_no_estimado');
  else if (/^estimad[oa]s? (contacto|cliente|se(ñ|n)ores?|sres?)\b/i.test(text)) probs.push('saludo_generico');
  if (!String(subject || '').trim() || String(subject).length > 90) probs.push('asunto_invalido');
  const co = String((ctx && ctx.company) || '').trim();
  let t2 = text; // el nombre de la empresa (p. ej. «Empresa Demo») no cuenta como oferta de demo
  co.split(/\s+/).filter((w) => w.length >= 3).forEach((w) => { t2 = t2.split(w).join(' '); });
  let s2 = String(subject || '');
  co.split(/\s+/).filter((w) => w.length >= 3).forEach((w) => { s2 = s2.split(w).join(' '); });
  FORBIDDEN.forEach(([re, tag]) => { const plain = tag === 'evidencia_expuesta' || tag === 'ofrece_demo_o_reunion'; if (re.test(plain ? t2 : text) || re.test(plain ? s2 : String(subject || ''))) probs.push(tag); });
  if (!/\?/.test(text)) probs.push('sin_pregunta_final');
  const name = String((ctx && ctx.company) || '').toLowerCase().split(/\s+/)[0];
  if (name && name.length > 2 && !text.toLowerCase().includes(name) && !String(subject || '').toLowerCase().includes(name)) probs.push('no_menciona_a_la_empresa');
  const services = (text.match(/\b(chatbot|sitio web|p[aá]gina web|ecommerce|crm|erp|app m[oó]vil|marketing|seo|dise[ñn]o)\b/gi) || []).length;
  if (services > 3) probs.push('ofrece_demasiados_servicios');
  return probs;
}

export function host(u) { const m = String(u || '').match(/^https?:\/\/([^\/?#]+)/i); return m ? m[1].replace(/^www\./, '') : String(u || ''); }

/** Borrador: usa el de Hermes si pasa la revisión; si no, una plantilla honesta basada SOLO en la cita verificada. Nunca se envía. */
export function buildDraft(row, adm) {
  const a = row.account || {};
  const h = (a.metadata && a.metadata.hermes) || {};
  const c = row.contact || {};
  const company = a.name || 'tu empresa';
  const ctx = { company };
  const hSubject = String(h.draft_subject || '').trim();
  const hBody = String(h.draft || '').trim();
  const hProbs = hBody ? lintDraft(hSubject, hBody, ctx) : ['sin_borrador_de_hermes'];
  if (!hProbs.length) return { subject: hSubject, message: hBody, source: 'hermes', lint: [] };
  // Playbook de correos outbound v1.0: saludo «Estimado equipo de…» (no hay certeza de género/nombre confiable en esta plantilla), investigación invisible (sin citar la web ni la cita verificada),
  // un solo problema planteado con prudencia, el agente trabaja dentro del proceso y cierre conversacional sin ofrecer demo/ejemplo/reunión. Es solo una base: contact-prep la reescribe con criterio.
  const lines = ['Estimado equipo de ' + company + ',', ''];
  lines.push('En operaciones como la de ' + company + ', suele haber bastante trabajo previo en reunir información, completar lo que falta y ordenar cada solicitud antes de que una persona pueda continuar.', '');
  lines.push('Soy Christian, de Atacama Labs. Armamos agentes que pueden hacerse cargo de esa primera parte, dejar cada solicitud registrada y lista para que el equipo continúe, y derivarla a una persona cuando realmente hace falta.', '');
  lines.push('¿Les haría sentido conversar sobre cómo automatizar esta primera etapa u otro proceso que hoy les esté quitando tiempo?', '', 'Christian Wevar · Atacama Labs · atacamalabs.cl');
  const message = lines.join('\n');
  const subject = 'la etapa previa a cada solicitud';
  return { subject, message, source: 'plantilla', lint: lintDraft(subject, message, ctx), hermes_lint: hProbs };
}

/** Textos y cargas para GHL. cfg = { pipelineId, stageId, fields:{...}, contactFields:{...} } */
export function buildGhlPayloads(row, adm, draft, cfg) {
  const p = row.prospect;
  const a = row.account;
  const c = row.contact || {};
  const h = (a.metadata && a.metadata.hermes) || {};
  const company = a.name;
  const channel = mapChannel(c, h.contact_channel);
  const vertical = normalizeVertical(h.vertical);
  const contactName = String(c.name || '').trim();
  const contact = {
    locationId: cfg.locationId, name: contactName || company, companyName: company, website: a.website || undefined,
    email: c.email || undefined, phone: c.phone || c.whatsapp || undefined, source: 'atacama-labs-prospecting',
    tags: ['prospecto-hermes', 'prospecto-por-revisar'],
    customFields: [{ id: cfg.contactFields.origen_detallado, field_value: 'Prospección outbound' }].concat(c.job_title ? [{ id: cfg.contactFields.primary_contact_role, field_value: String(c.job_title).slice(0, 120) }] : []),
  };
  const angle = adm.commercial_angle;
  const opportunity = {
    locationId: cfg.locationId, pipelineId: cfg.pipelineId, pipelineStageId: cfg.stageId, name: (company + ' — Prospecto').slice(0, 120), status: 'open',
    customFields: [
      { id: cfg.fields.fuente, field_value: 'outbound_manual' },
      { id: cfg.fields.solucion_de_interes, field_value: mapSolution(h.offer + ' ' + angle) },
      { id: cfg.fields.icp_vertical, field_value: vertical },
      { id: cfg.fields.evidencia_url, field_value: adm.best_evidence ? adm.best_evidence.url : '' },
      { id: cfg.fields.canal_de_contacto, field_value: channel },
      { id: cfg.fields.qualification_score, field_value: Number(p.final_score) },
      { id: cfg.fields.commercial_angle, field_value: angle.slice(0, 500) },
      { id: cfg.fields.prospect_key, field_value: p.prospect_key },
    ],
  };
  return { contact, opportunity, note: buildReviewNote(row, adm, draft, channel), channel, vertical };
}

/** Nota de revisión (para entender en menos de 60 s por qué escribirle). */
export function buildReviewNote(row, adm, draft, channel) {
  const p = row.prospect;
  const a = row.account;
  const c = row.contact || {};
  const h = (a.metadata && a.metadata.hermes) || {};
  const rs = Array.isArray(row.research) ? row.research : [];
  const f = (p.metadata && p.metadata.factors) || {};
  const mark = { literal: '✔', inferencia: '~', sin_verificar: '?' };
  const ev = rs.filter((r) => String(r.research_type).startsWith('factor:') && r.research_type !== 'factor:access').map((r) => {
    const k = evidenceKind(r);
    const q = r.evidence_text ? ' «' + String(r.evidence_text).replace(/\s+/g, ' ').slice(0, 220) + '»' : '';
    return ' ' + mark[k] + ' [' + String(r.research_type).replace('factor:', '') + '] ' + String(r.finding || '').slice(0, 200) + q + ' — ' + r.source_url;
  });
  const factorLine = Object.keys(f).map((k) => k + ' ' + (f[k].points != null ? f[k].points : '?') + '/' + f[k].weight).join(' · ');
  const person = [c.name, c.job_title].filter(Boolean).join(', ') || 'sin persona identificada (casilla de la empresa)';
  const contactLine = [c.email, c.phone, c.whatsapp && 'WhatsApp ' + c.whatsapp].filter(Boolean).join(' · ');
  const lines = [
    'PROSPECTO PARA REVISIÓN — ' + a.name + ' (' + (a.domain || a.website) + ')',
    'Score ' + p.final_score + '/100 · clase A · ' + normalizeVertical(h.vertical) + (a.city ? ' · ' + a.city : ''),
    '',
    'POR QUÉ ESCRIBIRLE AHORA: ' + adm.why_now,
    'ÁNGULO COMERCIAL: ' + adm.commercial_angle,
    '',
    'SEÑAL OBSERVADA: ' + (h.signal || '—'),
    'DOLOR (hipótesis a partir de la evidencia): ' + (h.pain || '—'),
    'ENCAJE: ' + (h.fit || '—'),
    'POSIBLE SOLUCIÓN (hipótesis): ' + (h.offer || '—'),
    '',
    'EVIDENCIA  (✔ cita literal verificada en la URL · ~ inferencia · ? no verificada):',
  ].concat(ev, [
    '',
    'CONTACTO PÚBLICO (' + channel + '): ' + person + ' · ' + contactLine + ' · fuente ' + (c.source_url || '—'),
    'Puntos por factor: ' + factorLine,
    'Confianza de Hermes: ' + (h.confidence != null ? h.confidence : '—') + ' · origen: ' + (h.source || 'hermes'),
    '',
    'BORRADOR (' + draft.source + ', NO ENVIADO) — Asunto: ' + draft.subject,
    draft.message,
    '',
    'DECISIÓN: nada se envía hasta que lo apruebes. Para aprobar, pon la etiqueta «aprobado-para-contactar» en este contacto; para descartar, «descartado-prospecto». (No se mueve a «Contactado» automáticamente.)',
  ]);
  return lines.join('\n').slice(0, 6000);
}

/** ¿Hay un contacto existente que coincida (correo, teléfono o dominio del correo)? → no se toca, queda en revisión manual. */
export function findExistingContact(results, email, phone, domain) {
  const list = Array.isArray(results) ? results : [];
  const digits = (s) => String(s || '').replace(/\D/g, '');
  const pd = digits(phone).slice(-9);
  const hit = list.find((x) => {
    const e = String(x.email || '').toLowerCase();
    if (email && e === String(email).toLowerCase()) return true;
    if (domain && e.endsWith('@' + domain)) return true;
    if (pd.length >= 8 && digits(x.phone).slice(-9) === pd) return true;
    return false;
  });
  return hit ? { id: hit.id, name: hit.contactName || hit.name || null } : null;
}
