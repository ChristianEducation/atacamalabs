/**
 * Atacama OS · Cold Email Writing Engine v2 — núcleo puro (Ola B · bloque D).
 *
 * Filosofía: «investigación profunda por detrás, correo claro por delante». Estándar vigente desde el 3-nov-2026: GUÍA V2 (brand/outreach/ATACAMA-LABS-ESTILO-CORREOS.md)
 * con tres viñetas «beneficio: solución» y cierre cordial con invitación a una breve conversación (reemplaza al Playbook v1.0 del 13-oct, que prohibía ofrecer reunión).
 * Este módulo NO escribe correos: evalúa (linter + Similarity Guard) lo que escribe Hermes o Christian, da un score 0–100 con avisos
 * explicables y solo BLOQUEA lo que es un problema real (afirmaciones cuantificadas sin respaldo, borrador automático sin evidencia).
 * Las decisiones de estilo («Una idea para…», «Vi que…», «Mi hipótesis…») restan puntos —más si se repiten entre borradores— pero nunca bloquean.
 *
 * Funciones AUTOCONTENIDAS (sin imports ni constantes de módulo, sin plantillas con backticks): se incrustan con Function.prototype.toString
 * en los workflows n8n 21 (Outreach Engine) y 29 (Ops Actions).
 */

export function cmNorm(s) {
  return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

export function cmWords(s) {
  return cmNorm(s).split(/[^a-z0-9ñ%]+/).filter(Boolean);
}

/** Separa saludo y oraciones del cuerpo (sin firma: el sistema la agrega). */
export function cmParts(body) {
  const lines = String(body == null ? '' : body).replace(/\r/g, '').split('\n').map((l) => l.trim()).filter(Boolean);
  let greeting = '';
  if (lines.length && /^(hola|buenos dias|buenas tardes|buenas|estimad[oa]s?|hey)\b/.test(cmNorm(lines[0])) && lines[0].length < 80) greeting = lines.shift();
  let guard = 0;
  while (lines.length && guard++ < 6 && /^(saludos( cordiales)?|atentamente|cordialmente|un saludo|christian( wevar)?|atacama labs|fundador)[,.!]?(\s*[|·].*)?$/.test(cmNorm(lines[lines.length - 1]))) lines.pop();
  const text = lines.join(' ');
  const sentences = text.replace(/[¿¡]/g, '').split(/(?<=[.!?])\s+/).map((x) => x.trim()).filter((x) => x.length > 1);
  return { greeting, text, sentences };
}

/** Clasifica el cierre del correo: meeting (pide reunión/llamada) | example (ofrece mandar algo) | who (¿lo ve alguien?) | question | statement. */
export function cmCtaKind(body, initial) {
  const p = cmParts(body);
  const last = cmNorm(p.sentences.slice(-2).join(' '));
  // «pedir reunión» se juzga solo por la ÚLTIMA oración (el cierre): «lista para agendar» en la oración anterior describe al agente, no pide una reunión
  const closing = cmNorm(p.sentences.slice(-1).join(' '));
  // Estándar V2 (primer correo): «Me gustaría mostrarle… Si le resulta interesante, con gusto podemos coordinar una breve conversación. Quedo atento…»
  if (initial) { const tail = cmNorm(p.sentences.slice(-4).join(' ')); if (/(coordinar|conversar|conversacion|conversemos|reunion|llamada|agendar)/.test(tail) && /(con gusto|me gustaria|nos gustaria|si le resulta|si les resulta|si le interesa|si les interesa|si lo estima|quedo atento)/.test(tail)) return 'invitation'; }
  if (/(\b\d+\s*(min|minutos)\b|reunion|llamada|videollamada|agendemos|conversemos|conversar (un|unos)|\bcafe\b|demo en vivo|calendario|agendar (una|un|la|el|algo)\b|coordinar (una|un|la|el)\b)/.test(closing)) return 'meeting';
  if (/(te mando|te envio|te muestro|te dejo|te comparto|te paso|te cuento|les mando|les envio|les muestro|les dejo|les comparto|les paso|les cuento|puedo mandarte|puedo enviarte|puedo mostrarles|te puedo mostrar|quieres ver|quieren ver|te sirve que|les sirve que|vale la pena que (te|les)|tiene sentido que (te|les)|les parece que)/.test(last)) return 'example';
  if (/(lo ve alguien|quien (ve|lleva|maneja|se encarga)|con quien (hablo|puedo)|es algo que (ve|ven)|corresponde a|le corresponde)/.test(last)) return 'who';
  if (/\?/.test(last)) return 'question';
  return 'statement';
}

/** Primeras palabras de la apertura (tras el saludo), normalizadas. */
export function cmOpening(body, n) {
  const p = cmParts(body);
  return cmWords(p.sentences[0] || '').slice(0, n || 3).join(' ');
}

/** «Firma» estructural del correo: secuencia de tipos de oración. Dos correos con la misma firma son la misma plantilla. */
export function cmSignature(body) {
  const p = cmParts(body);
  const tags = p.sentences.map((s) => {
    const t = cmNorm(s);
    if (/^(vi|vimos|he visto|revise|revisando)\b/.test(t) || /\bvi que\b/.test(t)) return 'vi';
    if (/hipotesis/.test(t)) return 'hip';
    if (/(atacama|armamos|implementamos|ayudamos|nuestros agentes|trabajamos con)/.test(t)) return 'atc';
    if (/(\b\d+\s*(min|minutos)\b|reunion|llamada|agendar|agendemos)/.test(t)) return 'm15';
    if (/\?\s*$/.test(s.trim())) return 'q';
    return 'o';
  });
  return tags.join('>');
}

export function cmShingles(text, n) {
  const w = cmWords(text);
  const k = n || 3;
  const set = {};
  for (let i = 0; i + k <= w.length; i++) set[w.slice(i, i + k).join(' ')] = 1;
  return set;
}

export function cmJaccard(a, b) {
  const ka = Object.keys(a), kb = Object.keys(b);
  if (!ka.length || !kb.length) return 0;
  let inter = 0;
  for (const k of ka) if (b[k]) inter++;
  return inter / (ka.length + kb.length - inter);
}

/** Normaliza lo que Hermes manda sobre su razonamiento: evidencia → insight → fricción → ángulo → CTA. Todo opcional. */
export function cmNormCold(c) {
  const x = c && typeof c === 'object' ? c : {};
  const s = (v, n) => String(v == null ? '' : v).trim().slice(0, n);
  let ev = Array.isArray(x.evidence) ? x.evidence : (typeof x.evidence === 'string' && x.evidence.trim() ? [x.evidence] : []);
  ev = ev.map((e) => (typeof e === 'string' ? { fact: s(e, 300) } : { fact: s(e && e.fact, 300), url: s(e && e.url, 300) || undefined })).filter((e) => e.fact.length >= 6).slice(0, 6);
  return { evidence: ev, insight: s(x.insight, 400), friction: s(x.friction, 400), angle: s(x.angle, 300), cta_reason: s(x.cta_reason, 300) };
}

/**
 * Evalúa un correo en frío. d = { subject, body, kind }, peers = otros borradores/enviados recientes de OTROS prospectos
 * ([{ id, subject, body, company_name }]), cold = razonamiento opcional (cmNormCold).
 * Devuelve { score, level, warnings[], rewards[], hard[], metrics, similarity, signature, cta_kind, opening }.
 */
export function coldLint(d, peers, cold) {
  const kind = String((d && d.kind) || 'initial');
  const isFollow = kind === 'followup_1' || kind === 'followup_2' || kind === 'followup_3';
  const isValueFollow = kind === 'followup_1' || kind === 'followup_2'; // dolor y valor (100–170 palabras); el 3 solo cierra el hilo
  const subject = String((d && d.subject) || '').trim();
  const body = String((d && d.body) || '').trim();
  const sn = cmNorm(subject), bn = cmNorm(body);
  const parts = cmParts(body);
  const words = cmWords(parts.text);
  const nWords = words.length;
  const list = Array.isArray(peers) ? peers.filter((p) => p && (p.body || p.subject)) : [];
  const c = cmNormCold(cold);
  const warnings = [], rewards = [], hard = [];
  const warn = (code, text, pts) => { warnings.push({ code, text, pts }); };
  const rew = (code, text, pts) => { rewards.push({ code, text, pts }); };
  const same = (arr, fn) => arr.filter(fn).length;

  // ---- bloqueos reales (nunca de estilo)
  if (/\b\d{1,3}(?:[.,]\d+)?\s?%/.test(body) || /\b(garantiz|garantia de|sin riesgo alguno|resultados asegurados)/.test(bn)) hard.push('afirmación cuantificada o garantía sin respaldo verificable (porcentajes, «garantizamos»): quítala o respáldala con evidencia');
  if (/\b(hemos|hicimos|logramos)\s+(ayudado|trabajado|implementado|automatizado|aumentado|reducido)\b[^.]*\b\d+/.test(bn) || /\bm[aá]s de \d+ (clientes|empresas|proyectos)\b/.test(bn)) hard.push('afirma resultados o cantidad de clientes sin evidencia: Atacama no debe declarar números que no pueda respaldar');

  // ---- ESTÁNDAR V2 de correos comerciales (aprobado por Christian el 3-nov-2026; reemplaza al Playbook v1.0 del 13-oct): reglas del PRIMER correo.
  // Saludo «Estimado/a …», cordialidad («espero que se encuentre muy bien») y TRES viñetas «beneficio: solución concreta». Ya no se prohíbe invitar a una breve conversación o reunión.
  // `d.strict` lo activa el motor para los borradores AUTÓNOMOS de Hermes (auto=true): ahí el incumplimiento bloquea el guardado. En los guardados manuales de Christian solo resta puntos (su criterio manda).
  const bulletLines = String(body).replace(/\r/g, '').split('\n').map((l) => l.trim()).filter((l) => /^(?:[-•*–]|\d+[.)])\s+\S/.test(l)).map((l) => l.replace(/^(?:[-•*–]|\d+[.)])\s+/, ''));
  const nBul = bulletLines.length;
  const v2 = !isFollow && nBul >= 2; // estructura estándar: partes fijas (cordialidad, enfoque, cierre) que no deben penalizarse por repetirse
  const benefitRe = /^(evitar|reducir|disminuir|ordenar|ganar|recuperar|acelerar|liberar|mejorar|simplificar|agilizar|facilitar|centralizar|asegurar|aumentar|minimizar|prevenir|captar|bajar|cuidar|lograr|no perder)\b/;
  const techRe = /\b(whatsapp|crm|erp|api|apis|chatbot|correo|software|base de datos|bases de datos|planillas?)\b/g;
  let sinBeneficio = 0, soloTecnologia = 0;
  for (const b of bulletLines) {
    const bn2 = cmNorm(b);
    if (!benefitRe.test(bn2)) { sinBeneficio++; if ((bn2.match(techRe) || []).length >= 2 || cmWords(b).length <= 6) soloTecnologia++; }
  }
  if (!isFollow && d.allow_offer !== true) {
    const strict = d.strict === true;
    const brk = (hardText, code, warnText) => { if (strict) hard.push(hardText); else warn(code, warnText, 20); };
    const g = cmNorm(parts.greeting);
    if (!/^estimad[oa](?:\/a)?s? /.test(g)) brk('el saludo debe ser «Estimado/a [nombre]:» o «Estimado equipo de [empresa]:» (nunca «Hola»)', 'saludo_no_estandar', 'El saludo no sigue el estándar: «Estimado/a [nombre]:» o «Estimado equipo de [empresa]:» (no «Hola»).');
    else if (/^estimad[oa](?:\/a)?s? (contacto|cliente|senor|senores|sr|sra|sres)\b/.test(g)) brk('saludo genérico («Estimado contacto/cliente»): usa un nombre confiable o «Estimado equipo de [empresa]:»', 'saludo_generico', 'Saludo genérico («Estimado contacto/cliente»): usa un nombre confiable o «Estimado equipo de [empresa]:».');
    if (!/\b(espero|esperando) que [^.]{0,30}encuentr/.test(bn)) brk('falta la cordialidad del estándar: «Junto con saludar, espero que se encuentre muy bien.»', 'sin_cordialidad', 'Falta la cordialidad del estándar («Junto con saludar, espero que se encuentre muy bien.»).');
    if (nBul !== 3) brk('el correo inicial debe traer exactamente tres viñetas con aplicaciones concretas para el rubro («beneficio: solución»); trae ' + nBul, 'tres_ejemplos', 'El estándar pide exactamente tres viñetas con aplicaciones concretas para el rubro (hay ' + nBul + ').');
    else if (!/por ejemplo[^.:]{0,14}(podemos|podriamos)/.test(bn)) warn('sin_frase_de_entrada', 'Antes de las viñetas conviene la frase «En el sector [rubro], por ejemplo, podemos ayudar a:».', 6);
    if (nBul >= 2 && sinBeneficio > 0) warn('vineta_sin_beneficio', sinBeneficio + ' viñeta(s) no parten del beneficio o dolor que se resuelve («Evitar…», «Reducir…», «Disminuir…»)' + (soloTecnologia ? ' y ' + soloTecnologia + ' parecen una lista de tecnologías' : '') + ': cada una debe decir qué resuelve y cómo, no solo qué herramientas usa.', Math.min(14, 5 * sinBeneficio + 3 * soloTecnologia));
    // Promesas que Atacama no puede cumplir: entregables, precios o condiciones comerciales sin validar (la invitación a conversar sí está permitida).
    if (/\b(le|les|te) (envio|mando|enviare|mandare|preparo|preparare)\b[^.?!]{0,40}\b(propuesta|cotizacion|demo|video|auditoria|presupuesto)|prueba gratis|gratuit[oa]|sin costo|descuento|\bprecios?\b/.test(bn)) warn('promete_recurso', 'Promete un entregable o condición comercial (propuesta, demo, prueba gratis, precios): invita a conversar sin comprometer algo que no esté validado.', 12);
  }

  // ---- asunto (estándar V2: específico del rubro o la empresa, 4–9 palabras, parece un correo real, no una campaña)
  const generic = /^(propuesta (de|comercial)|automatizaci[oó]n con (ia|inteligencia artificial)|soluci[oó]n de ia|inteligencia artificial para|oportunidad (para|de)|alianza con|presentaci[oó]n (de|para)|atacama labs|potencia (tu|su)|tenemos una soluci[oó]n)\b/;
  let pts = 0;
  if (generic.test(sn)) { pts = 15; warn('asunto_generico', 'El asunto es genérico («' + subject + '»): usa algo corto y específico del proceso (ej. «solicitudes de arriendo antes de cotizar»).', pts); }
  const sw = cmWords(subject);
  if (sw.length > 10) warn('asunto_largo', 'El asunto tiene ' + sw.length + ' palabras: mejor 4–9.', 4);
  else if (sw.length === 1) warn('asunto_corto', 'El asunto tiene una sola palabra: mejor 3–7.', 3);
  const letters = subject.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, '');
  if ((letters.length >= 6 && letters === letters.toUpperCase()) || /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(subject)) warn('asunto_publicitario', 'El asunto usa MAYÚSCULAS o emojis: parece campaña.', 8);
  const pre = sw.slice(0, 3).join(' ');
  const sameSubj = list.filter((p) => cmNorm(p.subject) === sn).length;
  const samePre = sw.length >= 2 ? same(list, (p) => cmWords(p.subject).slice(0, 3).join(' ') === pre) : 0;
  if (sameSubj >= 1) warn('asunto_repetido', 'Otro correo ya usa exactamente este asunto.', 12);
  else if (samePre >= 3) warn('asunto_mismo_patron', 'Este asunto sigue el mismo patrón que ' + samePre + ' correos recientes («' + pre + '…»).', 14);
  else if (samePre >= 1) warn('asunto_mismo_patron', 'Este asunto empieza igual que otro correo reciente («' + pre + '…»).', 7);

  // ---- apertura
  const open3 = cmOpening(body, 3), open4 = cmOpening(body, 4);
  // Playbook §12: no abrir con fórmulas que delatan la investigación («Vi que…», «Revisando su sitio…», «Estuve mirando…», «Noté que…», «En su web dicen…»).
  const peek = /\b(vi que|veo que|vimos que|he visto que|revisando (su|tu|el) (sitio|web|pagina)|estuve (mirando|revisando|viendo)|en (su|tu) (web|sitio|pagina)[^.]{0,25}(dicen|indican|mencionan|senalan|publican)|note que|me fije que)\b/;
  const firstS = cmNorm(parts.sentences[0] || '');
  if (peek.test(firstS) || /^(vi|vimos|he visto)\b/.test(open3)) {
    const rep = same(list, (p) => peek.test(cmNorm(cmParts(p.body).sentences[0] || '')) || /^(vi|vimos|he visto)\b/.test(cmOpening(p.body, 3)));
    warn('apertura_vi_que', 'El correo abre con una fórmula de investigación («Vi que…», «Revisando su sitio…»)' + (rep >= 2 ? ' y se repite en ' + rep + ' correos recientes' : '') + ': parte del contexto del proceso o de la fricción; la investigación debe ser invisible.', rep >= 2 ? 22 : 14);
  } else if (peek.test(bn)) {
    warn('frase_investigacion', 'Usa una fórmula que muestra que investigaste («vi que», «noté que», «en su web dicen»): personaliza el problema, no la evidencia.', 8);
  } else if (!v2 && open4 && same(list, (p) => cmOpening(p.body, 4) === open4) >= 2) warn('apertura_repetida', 'La apertura («' + open4 + '…») se repite en otros correos.', 10);
  if (/hipotesis/.test(bn)) {
    const rep = same(list, (p) => /hipotesis/.test(cmNorm(p.body)));
    warn('mi_hipotesis', '«Mi hipótesis…» aparece' + (rep >= 2 ? ' y ya está en ' + rep + ' correos recientes' : '') + ': suena a plantilla.', rep >= 2 ? 16 : 8);
  }
  // Playbook §12: «Imagino que…» y «Ahí suele aparecer el trabajo repetitivo…» no deben ser la estructura estándar.
  const muletillas = (bn.match(/\b(imagino que|ahi suele aparecer el trabajo repetitivo)\b/g) || []).length;
  if (muletillas) {
    const rep = same(list, (p) => /\b(imagino que|ahi suele aparecer el trabajo repetitivo)\b/.test(cmNorm(p.body)));
    warn('muletilla_repetida', 'Usa «imagino que…» o «ahí suele aparecer el trabajo repetitivo…»' + (rep >= 2 ? ', que ya están en ' + rep + ' correos recientes' : '') + ': varía la redacción.', rep >= 2 ? 14 : (muletillas > 1 ? 8 : 4));
  }
  // Playbook §1 y §6: investigación invisible. Correos, enlaces, teléfonos o «en su sitio web…» exponen el trabajo de búsqueda; el exceso de detalles también.
  if (/@|https?:|www\.|\b[a-z0-9-]+\.(cl|com|net|org)\b|\+?56\s?9\s?\d{4}|\b\d{8,}\b/.test(body) || /\b(en|de) (su|tu|la) (pagina|sitio|web)( web)?\b|\bsu sitio web\b|\bsu pagina web\b/.test(bn)) warn('evidencia_expuesta', 'El correo deja ver la investigación (correo, enlace, teléfono o «en su sitio web…»): personaliza el problema, no la evidencia de que investigaste.', 14);
  if (/\b(\d+|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce)\s+(sucursales|sedes|numeros|whatsapp|servicios|locales|canales|plataformas|oficinas|tiendas|formularios)\b/.test(bn)) warn('detalle_excesivo', 'Acumula detalles contables de la empresa («dos sucursales», «tres WhatsApp»): se siente excesivamente investigado.', 8);
  if (/(no lo he visto por dentro|no lo he visto desde dentro|no se si les pasa|no se si te pasa|perdona que te escriba|disculpa la molestia|no quiero quitarte tiempo|no es spam|sin compromiso|espero no molestar)/.test(bn)) {
    const m = (bn.match(/no lo he visto por dentro|no lo he visto desde dentro|perdona que te escriba|disculpa la molestia|no quiero quitarte tiempo|no es spam|sin compromiso|espero no molestar/g) || []).length;
    if (m) warn('frases_defensivas', 'Frases defensivas innecesarias (' + m + '): restan confianza.', Math.min(9, 3 * m));
  }

  // ---- CTA
  const cta = cmCtaKind(body, !isFollow);
  const ctaHead = cmWords(parts.sentences.slice(-1)[0] || '').slice(0, 5).join(' ');
  if (cta === 'meeting' && isFollow) warn('cta_reunion', 'El seguimiento pide reunión/minutos: baja la fricción con una pregunta fácil de responder.', 6);
  if (cta === 'example' && isFollow) warn('cta_ofrece_ejemplo', 'El seguimiento ofrece mandar/mostrar algo: el Playbook §17 prohíbe prometer demos, ejemplos, videos, propuestas o reuniones que no estén preparados.', 14);
  if (!v2 && ctaHead && same(list, (p) => cmWords(cmParts(p.body).sentences.slice(-1)[0] || '').slice(0, 5).join(' ') === ctaHead) >= 2) warn('cta_repetido', 'El cierre se repite en otros correos: varía la pregunta según el contexto.', 8);
  if (!isFollow && cta === 'statement') warn('cta_ausente', 'El correo no cierra con una invitación cordial a una breve conversación (ej. «Si le resulta interesante, con gusto podemos coordinar una breve conversación.»).', 10);

  // ---- foco y largo
  const atcSent = parts.sentences.filter((s) => /(atacama|armamos|implementamos|ayudamos a|nuestros agentes|trabajamos con empresas|somos una)/.test(cmNorm(s)) && !(/^(soy|me llamo) [^.]{0,40}atacama labs[.!]?$/.test(cmNorm(s)) && cmWords(s).length <= 9));
  const atcWords = atcSent.reduce((n, s) => n + cmWords(s).length, 0);
  if (isFollow ? (atcSent.length > 1 || (atcSent.length === 1 && nWords > 0 && atcWords / nWords > 0.4)) : (atcSent.length > 3 || (nWords > 0 && atcWords / nWords > 0.5))) warn('explica_atacama', 'Explica demasiado a Atacama Labs (' + atcSent.length + ' oraciones): el correo es sobre el prospecto, no sobre nosotros.', atcSent.length > 1 ? 10 : 6);
  if (!isFollow) {
    if (nWords > 230) warn('largo', 'Tiene ' + nWords + ' palabras: el estándar V2 apunta a 130–190.', 10);
    else if (nWords > 210) warn('largo', 'Tiene ' + nWords + ' palabras: apunta a 130–190.', 4);
    else if (nWords < 40) warn('muy_corto', 'Tiene solo ' + nWords + ' palabras: falta contexto para que tenga sentido.', 8);
    else if (nWords < 100) warn('corto', 'Tiene ' + nWords + ' palabras: con las tres viñetas el estándar V2 apunta a 130–190.', 4);
  } else if (isValueFollow ? nWords > 190 : nWords > 130) warn('largo', 'Tiene ' + nWords + ' palabras: el seguimiento apunta a ' + (isValueFollow ? '100–170' : '40–70') + '.', 10);
  else if (isValueFollow ? nWords > 170 : nWords > 120) warn('largo', 'Tiene ' + nWords + ' palabras: apunta a ' + (isValueFollow ? '100–170' : '40–70') + '.', 4);
  else if (isValueFollow && nWords < 80) warn('followup_corto', 'Tiene solo ' + nWords + ' palabras: los seguimientos 1 y 2 deben aportar contexto o valor (100–170 palabras), no solo retomar.', 8);
  const fr = parts.sentences.filter((s) => /(repite|a mano|manual|se pierde|se pierden|demora|tarda|cuello de botella|duplica|persigue|incomplet|desordenad|fuera de horario|sin respuesta|responder lo mismo)/.test(cmNorm(s))).length;
  const conn = (bn.match(/\b(ademas|tambien|por otro lado|por otra parte|asimismo|por ultimo)\b/g) || []).length;
  if (!isValueFollow && !v2 && (fr >= 3 || conn >= 2)) warn('varios_problemas', 'Toca más de un problema: elige uno solo (o usa el formato de tres viñetas del estándar V2).', fr >= 3 ? 8 : 4);

  // ---- tono
  const buzz = bn.match(/\b(sinergia|disruptiv\w*|revolucion\w*|transformacion digital|transformar (tu|su) (empresa|negocio)|solucion integral|innovador\w*|de vanguardia|lider en|potenciar|potencia (tu|su) (negocio|empresa)|llevar (tu|su) (negocio|empresa) al siguiente nivel|optimizar procesos|ecosistema|360|a la medida de sus necesidades|de ultima generacion|impulsar su crecimiento)\b/g) || [];
  if (buzz.length) warn('buzzwords', 'Jerga/buzzwords: ' + buzz.slice(0, 3).join(', ') + '.', Math.min(12, 4 * buzz.length));
  if (/(somos una agencia|nuestra agencia|soluciones (a medida|personalizadas|integrales)|equipo de expertos|amplia experiencia)/.test(bn)) warn('tono_agencia', 'Suena a agencia («soluciones a medida», «equipo de expertos»).', 6);
  // Playbook §3: el agente trabaja dentro del proceso, no es «un chatbot» ni un «asistente inteligente 24/7» genérico.
  if (/\bchatbots?\b|asistente (virtual|inteligente)|\b24\s?\/\s?7\b/.test(bn)) warn('suena_chatbot', 'Suena a chatbot genérico («chatbot», «asistente inteligente», «24/7»): explica el trabajo que el agente ejecuta dentro del proceso.', 8);
  // Playbook §7: no presentar una inferencia como hecho («su equipo pierde mucho tiempo…», «responden todo a mano»).
  if (/\b(su|tu) (equipo|personal|gente)\b[^.?!]{0,50}\b(pierde|pierden|dedica|dedican|gasta|gastan|responde|responden|hace|hacen|copia|copian|revisa|revisan)\b[^.?!]{0,50}\b(mucho|todo|siempre|a mano|manual\w*)\b|\b(ustedes|usted) (pierden|pierde|responden|hacen|copian|revisan)\b[^.?!]{0,50}\b(mucho|todo|siempre|a mano|manual\w*)\b|\bhoy (lo|las|los) (hacen|responden|gestionan|coordinan) (a mano|manualmente)\b/.test(bn)) warn('inferencia_como_hecho', 'Presenta como hecho algo que solo es una inferencia (ej. «su equipo pierde mucho tiempo»): usa «suele ocurrir…», «en este tipo de operación…».', 10);
  const ai = [];
  if (/espero que (este|el) (mensaje|correo)/.test(bn)) ai.push('«espero que este mensaje…»');
  if (/(en el mundo actual|en la era de|en un mundo (cada vez|donde)|en el panorama actual)/.test(bn)) ai.push('apertura grandilocuente');
  if (/\bno (es|son) solo [^.]{3,60}(sino|,\s*es)\b/.test(bn) || /\bno solo [^.]{3,60}sino\b/.test(bn)) ai.push('«no es solo X, sino Y»');
  if (/(me permito|quisiera presentar|tengo el agrado|le escribo para presentar)/.test(bn)) ai.push('fórmula de carta formal');
  if ((body.match(/—/g) || []).length >= 2 || /[\u{1F300}-\u{1FAFF}]/u.test(body)) ai.push('rayas largas/emojis');
  if (ai.length) warn('tono_ia', 'Suena generado: ' + ai.join('; ') + '.', Math.min(10, 5 * ai.length));
  if (isFollow && /\b(demo|video|propuesta|cotizacion|presentacion|esquema)\b|(?<!por )\bejemplo\b/.test(bn)) warn('followup_promete', 'El seguimiento menciona demo/ejemplo/video/propuesta: el Playbook §17 prohíbe prometer algo que no esté realmente preparado.', 14);
  if (kind === 'followup_3' && /\b(armamos agentes|implementamos|nuestros agentes|nuestra solucion)\b/.test(bn)) warn('followup_vuelve_a_vender', 'El seguimiento vuelve a presentar la solución: el Playbook §17 pide solo retomar y preguntar (S1) o cerrar con cortesía (S2).', 10);

  // ---- personalización real (evidencia usada / señal concreta)
  let used = false;
  if (c.evidence.length) {
    const stop = { empresa: 1, sucursal: 0, atacama: 1, clientes: 1, cliente: 1, servicio: 1, servicios: 1, general: 1, sitio: 1, pagina: 1, mensaje: 1 };
    for (const e of c.evidence) { for (const w of cmWords(e.fact)) { if (w.length >= 6 && !stop[w] && new RegExp('\\b' + w + '\\b').test(bn)) { used = true; break; } } if (used) break; }
  }
  const procWords = bn.match(/\b(reserva\w*|cotizacion\w*|solicitud\w*|agenda\w*|recepcion|sucursal\w*|sede\w*|turno\w*|pedido\w*|stock|despacho\w*|factura\w*|cobranza\w*|whatsapp|formulario\w*|catalogo|sku|reclamo\w*|ticket\w*|postventa|inventario|cita\w*|horas?|presupuesto\w*|matricula\w*|admision|postulacion\w*|derivacion\w*|seguimiento|orden(es)? de trabajo|mantencion\w*)\b/g) || [];
  const distinctProc = Object.keys(procWords.reduce((o, w) => { o[w] = 1; return o; }, {})).length;
  // Con la investigación invisible el correo ya no repite la evidencia: el problema es específico si nombra cosas concretas del proceso (palabras de proceso, cifras o una enumeración de antecedentes/datos del rubro).
  const listy = parts.sentences.some((s) => (s.match(/,/g) || []).length >= 2 && /\b(y|e)\b/.test(s) && cmWords(s).length >= 12);
  const specific = used || distinctProc >= 2 || /\b\d{2,}\b/.test(parts.text) || listy;
  // (playbook: la investigación es invisible; ya no se exige que el correo repita la evidencia, solo que el problema sea específico)
  if (!specific && !isFollow) warn('sin_senal_concreta', 'No hay una señal concreta del prospecto (proceso, dato o situación): quedaría igual para cualquier empresa.', 14);

  // ---- similitud con otros borradores
  // las frases fijas del estándar V2 (saludo, presentación, enfoque, cierre) se descartan: la similitud se mide en lo que sí se personaliza (viñetas y contexto)
  const stripStd = (b) => String(b == null ? '' : b).replace(/\r/g, '').split('\n').map((l) => l.trim()).filter((l) => l && !/^(estimad|junto con saludar|esperando que|le escribo|les escribo|ayudamos a|primero entendemos|me gustaria mostrar|nos gustaria mostrar|si le resulta|si les resulta|quedo atento|saludos|atentamente|en (el sector|empresas como)[^:]{0,70}por ejemplo)/.test(cmNorm(l))).join(' ');
  const mine = cmShingles(stripStd(body), 3);
  let maxSim = 0, simWith = null;
  for (const p of list) { const j = cmJaccard(mine, cmShingles(stripStd(p.body), 3)); if (j > maxSim) { maxSim = j; simWith = p.company_name || p.id || null; } }
  maxSim = Math.round(maxSim * 100) / 100;
  if (maxSim >= 0.5) warn('muy_similar', 'Es casi igual a otro correo (' + Math.round(maxSim * 100) + '% de frases en común con ' + (simWith || 'otro prospecto') + ').', 25);
  else if (maxSim >= 0.35) warn('similar', 'Se parece mucho a otro correo (' + Math.round(maxSim * 100) + '% en común con ' + (simWith || 'otro prospecto') + ').', 15);
  else if (maxSim >= 0.25) warn('algo_similar', 'Comparte bastante estructura de frases con otro correo (' + Math.round(maxSim * 100) + '%).', 6);
  const sig = cmSignature(body);
  const sigRep = !v2 && sig.split('>').length >= 4 ? same(list, (p) => cmSignature(p.body) === sig) : 0;
  if (sigRep >= 3) warn('misma_estructura', 'Tiene la misma estructura que ' + sigRep + ' correos recientes (' + sig.replace(/>/g, ' → ') + ').', 10);

  // ---- premios
  if (specific) rew('senal_concreta', used ? 'El problema sale de la evidencia investigada.' : 'Menciona algo concreto del proceso.', used ? 10 : 8);
  if (!isFollow) {
    if (nWords >= 130 && nWords <= 190) rew('breve', 'Largo ideal del estándar V2 (' + nWords + ' palabras).', 8);
    else if ((nWords >= 110 && nWords < 130) || (nWords > 190 && nWords <= 210)) rew('breve', 'Largo razonable (' + nWords + ' palabras).', 3);
  } else if (nWords >= 70 && nWords <= 120) rew('breve', 'Largo ideal (' + nWords + ' palabras).', 8);
  else if ((nWords >= 55 && nWords < 70) || (nWords > 120 && nWords <= 130)) rew('breve', 'Largo razonable (' + nWords + ' palabras).', 3);
  if (cta === 'invitation') rew('cta_invitacion', 'Cierra con una invitación cordial a una breve conversación (estándar V2).', 8);
  else if (cta === 'question') rew('cta_facil', 'Cierra con una pregunta conversacional fácil de responder.', 8);
  else if (cta === 'who') rew('cta_facil', 'Cierra preguntando quién lo ve: fácil de responder.', 4);
  if (/^estimad[oa](?:\/a)?s? /.test(cmNorm(parts.greeting))) rew('saludo_formal', 'Saludo profesional del estándar.', 3);
  if (!isFollow && /\b(espero|esperando) que [^.]{0,30}encuentr/.test(bn)) rew('cordialidad', 'Incluye la cordialidad del estándar.', 3);
  if (v2 && nBul === 3 && sinBeneficio === 0) rew('tres_aplicaciones', 'Tres aplicaciones concretas, cada una con su beneficio y su solución.', 10);
  else if (!v2 && fr <= 1 && conn === 0 && nWords >= 30) rew('un_problema', 'Trata una sola idea.', 6);
  if (!sigRep && !(maxSim >= 0.25)) rew('diverso', 'Su estructura es distinta a la de los demás.', 6);
  if (!buzz.length && !ai.length && !/(somos una agencia|nuestra agencia|soluciones (a medida|personalizadas|integrales))/.test(bn)) rew('natural', 'Lenguaje natural, sin jerga.', 4);
  if (isValueFollow && cta === 'question' && nWords >= 100 && nWords <= 170) rew('followup_valor', 'Seguimiento con contexto del rubro y una pregunta fácil de responder (dolor → valor).', 14);
  if (isValueFollow && /\b(solo (para )?(saber|confirmar|preguntar)|queria saber si|reviso si|por si quedo abajo|espero que hayas|te escribo de nuevo)\b/.test(bn)) warn('followup_vacio', 'El seguimiento no aporta nada nuevo («solo para saber si viste…»): cada toque debe traer un dato, una cuenta o un patrón del rubro.', 14);
  if (kind === 'followup_3' && /\b(cierro|no insist\w*|dejo (este|el) hilo|dejamos aqui)\b/.test(bn)) rew('followup_cierra', 'Cierra el hilo con educación y sin presión (último correo de la secuencia).', 14);

  let score = 60;
  for (const r of rewards) score += r.pts;
  for (const w of warnings) score -= w.pts;
  score = Math.max(0, Math.min(100, Math.round(score)));
  const level = score >= 80 ? 'bueno' : score >= 65 ? 'aceptable' : 'bajo';
  warnings.sort((a, b) => b.pts - a.pts);
  return { v: 3, score, level, warnings, rewards, hard, metrics: { words: nWords, subject_words: sw.length }, similarity: { max: maxSim, with: simWith }, signature: sig, cta_kind: cta, opening: open3, evidence_used: used };
}

/** Resumen compacto que se guarda en outreach_messages.metadata.cold (sin duplicar el texto del correo). */
export function coldSummary(lint, cold, nowIso, by) {
  const c = cmNormCold(cold);
  return { v: 2, score: lint.score, level: lint.level, warnings: lint.warnings.slice(0, 8).map((w) => ({ code: w.code, text: w.text, pts: w.pts })), rewards: lint.rewards.map((r) => ({ code: r.code, text: r.text, pts: r.pts })),
    similarity: lint.similarity, cta_kind: lint.cta_kind, words: lint.metrics.words, evidence: c.evidence, insight: c.insight || null, friction: c.friction || null, angle: c.angle || null, cta_reason: c.cta_reason || null, linted_at: nowIso, by: by || null };
}

/** Agrega la versión anterior al historial del mismo registro (máx. 6, la más nueva al final). */
export function coldHistory(prev, live, nowIso, reason, by) {
  const h = Array.isArray(prev && prev.history) ? prev.history.slice(-5) : [];
  h.push({ at: nowIso, by: by || null, reason: reason || 'regenerado', subject: live.subject, body: live.body, score: prev && prev.cold && typeof prev.cold.score === 'number' ? prev.cold.score : null, hash: live.content_hash || null });
  return h;
}
