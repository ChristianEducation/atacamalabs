/**
 * Atacama OS · Cold Email Writing Engine v2 — núcleo puro (Ola B · bloque D).
 *
 * Filosofía: «investigación profunda por detrás, correo simple por delante» y «el primer correo busca una respuesta, no una reunión».
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
  const text = lines.join(' ');
  const sentences = text.replace(/[¿¡]/g, '').split(/(?<=[.!?])\s+/).map((x) => x.trim()).filter((x) => x.length > 1);
  return { greeting, text, sentences };
}

/** Clasifica el cierre del correo: meeting (pide reunión/llamada) | example (ofrece mandar algo) | who (¿lo ve alguien?) | question | statement. */
export function cmCtaKind(body) {
  const p = cmParts(body);
  const last = cmNorm(p.sentences.slice(-2).join(' '));
  // «pedir reunión» se juzga solo por la ÚLTIMA oración (el cierre): «lista para agendar» en la oración anterior describe al agente, no pide una reunión
  const closing = cmNorm(p.sentences.slice(-1).join(' '));
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
  const isFollow = kind === 'followup_1' || kind === 'followup_2';
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

  // ---- PLAYBOOK de correos outbound v1.0 (aprobado por Christian el 13-oct-2026): reglas duras del PRIMER correo.
  // Saludo formal con nombre confiable o «Estimado equipo de…»; sin ofrecer demo/ejemplo/prueba/video/propuesta/auditoría/reunión (salvo allow_offer, cuando el recurso existe de verdad).
  // `d.strict` lo activa el motor para los borradores AUTÓNOMOS de Hermes (auto=true): ahí el incumplimiento bloquea el guardado. En los guardados manuales de Christian solo resta puntos (su criterio manda).
  if (!isFollow && d.allow_offer !== true) {
    const strict = d.strict === true;
    const brk = (hardText, code, warnText) => { if (strict) hard.push(hardText); else warn(code, warnText, 20); };
    const g = cmNorm(parts.greeting);
    if (!/^estimad[oa]s? /.test(g)) brk('el saludo debe ser «Estimado/Estimada [nombre],» o «Estimado equipo de [empresa],» (nunca «Hola»)', 'saludo_no_playbook', 'El saludo no sigue el playbook: «Estimado/Estimada [nombre],» o «Estimado equipo de [empresa],» (no «Hola»).');
    else if (/^estimad[oa]s? (contacto|cliente|senor|senores|sr|sra|sres)\b/.test(g)) brk('saludo genérico («Estimado contacto/cliente»): usa un nombre confiable o «Estimado equipo de [empresa],»', 'saludo_generico', 'Saludo genérico («Estimado contacto/cliente»): usa un nombre confiable o «Estimado equipo de [empresa],».');
    const closing2 = cmNorm(parts.sentences.slice(-2).join(' '));
    if (/\b(te|les|le) (mando|mande|envio|envie|enviare|muestro|muestre|mostrare|comparto|comparta|paso|pase|dejo|deje|preparo|prepare|armo|arme|puedo (mandar|enviar|mostrar|preparar|armar|compartir))\b[^.?!]{0,40}\b(un|una|el|la|algun|alguna|unos|unas)\s+(ejemplo|demo|demostracion|video|propuesta|cotizacion|auditoria|prueba|diagnostico|esquema|flujo|caso|idea)/.test(bn)
      || /\b(te|les|le) (muestro|muestre|mostrare|enseno|ensene|explico|cuento|cuente)\b/.test(closing2)
      || /\b(quieres|quieren|te gustaria|les gustaria|te interesa|les interesa|te sirve|les sirve)\b[^.?!]{0,25}\b(ver|conocer|probar|que (te|les) (mande|muestre|envie))\b/.test(closing2)
      || /\b(\d+\s*(min|minutos)|reunion|videollamada|llamada|agendemos|agendamos|agendar (una|un|la|el|algo)|coordinemos (una|un))\b/.test(closing2)) brk('el primer correo no debe ofrecer demo, ejemplo, prueba, video, propuesta, auditoría ni reunión: cierra con una pregunta conversacional sobre el proceso', 'oferta_prohibida', 'El primer correo ofrece demo, ejemplo, prueba, video, propuesta o reunión: el playbook lo prohíbe; cierra con una pregunta conversacional sobre el proceso.');
  }

  // ---- asunto (playbook: 3–7 palabras, parece un correo real, no una campaña)
  const generic = /^(una idea para|idea para|una propuesta|propuesta (para|de|comercial)|automatizaci[oó]n con (ia|inteligencia artificial)|soluci[oó]n de ia|inteligencia artificial para|oportunidad (para|de)|alianza con|presentaci[oó]n (de|para)|atacama labs|potencia (tu|su)|tenemos una soluci[oó]n)\b/;
  let pts = 0;
  if (generic.test(sn)) { pts = 15; warn('asunto_generico', 'El asunto es genérico («' + subject + '»): usa algo corto y específico del proceso (ej. «solicitudes de arriendo antes de cotizar»).', pts); }
  const sw = cmWords(subject);
  if (sw.length > 8) warn('asunto_largo', 'El asunto tiene ' + sw.length + ' palabras: mejor 3–7.', 4);
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
  } else if (open4 && same(list, (p) => cmOpening(p.body, 4) === open4) >= 2) warn('apertura_repetida', 'La apertura («' + open4 + '…») se repite en otros correos.', 10);
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
  const cta = cmCtaKind(body);
  const ctaHead = cmWords(parts.sentences.slice(-1)[0] || '').slice(0, 5).join(' ');
  if (cta === 'meeting') warn('cta_reunion', isFollow ? 'El seguimiento pide reunión/minutos: baja la fricción con una pregunta fácil de responder.' : 'El primer correo pide reunión/minutos: el playbook lo prohíbe; cierra con una pregunta conversacional sobre el proceso.', isFollow ? 6 : 10);
  if (cta === 'example' && isFollow) warn('cta_ofrece_ejemplo', 'El seguimiento ofrece mandar/mostrar algo: el Playbook §17 prohíbe prometer demos, ejemplos, videos, propuestas o reuniones que no estén preparados.', 14);
  else if (cta === 'example') warn('cta_ofrece_ejemplo', 'El cierre ofrece mandar/mostrar algo: el primer correo solo busca conversación (ej. «¿Les haría sentido conversar sobre cómo automatizar esta primera etapa u otro proceso que hoy les quite tiempo?»).', 12);
  if (ctaHead && same(list, (p) => cmWords(cmParts(p.body).sentences.slice(-1)[0] || '').slice(0, 5).join(' ') === ctaHead) >= 2) warn('cta_repetido', 'El cierre se repite en otros correos: varía la pregunta según el contexto.', 8);
  if (!isFollow && cta === 'statement') warn('cta_ausente', 'El correo no cierra con una pregunta fácil de responder.', 10);

  // ---- foco y largo
  const atcSent = parts.sentences.filter((s) => /(atacama|armamos|implementamos|ayudamos a|nuestros agentes|trabajamos con empresas|somos una)/.test(cmNorm(s)) && !(/^(soy|me llamo) [^.]{0,40}atacama labs[.!]?$/.test(cmNorm(s)) && cmWords(s).length <= 9));
  const atcWords = atcSent.reduce((n, s) => n + cmWords(s).length, 0);
  if (atcSent.length > 1 || (atcSent.length === 1 && nWords > 0 && atcWords / nWords > 0.4)) warn('explica_atacama', 'Explica demasiado a Atacama Labs (' + atcSent.length + ' oraciones): el correo es sobre el prospecto, no sobre nosotros.', atcSent.length > 1 ? 10 : 6);
  if (nWords > 130) warn('largo', 'Tiene ' + nWords + ' palabras: el playbook apunta a 70–120.', 10);
  else if (nWords > 120) warn('largo', 'Tiene ' + nWords + ' palabras: apunta a 70–120.', 4);
  else if (!isFollow && nWords < 40) warn('muy_corto', 'Tiene solo ' + nWords + ' palabras: falta contexto para que tenga sentido.', 8);
  const fr = parts.sentences.filter((s) => /(repite|a mano|manual|se pierde|se pierden|demora|tarda|cuello de botella|duplica|persigue|incomplet|desordenad|fuera de horario|sin respuesta|responder lo mismo)/.test(cmNorm(s))).length;
  const conn = (bn.match(/\b(ademas|tambien|por otro lado|por otra parte|asimismo|por ultimo)\b/g) || []).length;
  if (fr >= 3 || conn >= 2) warn('varios_problemas', 'Toca más de un problema: elige uno solo.', fr >= 3 ? 8 : 4);

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
  if (isFollow && /\b(demo|video|propuesta|cotizacion|presentacion|esquema|ejemplo)\b/.test(bn)) warn('followup_promete', 'El seguimiento menciona demo/ejemplo/video/propuesta: el Playbook §17 prohíbe prometer algo que no esté realmente preparado.', 14);
  if (isFollow && /\b(armamos agentes|implementamos|nuestros agentes|nuestra solucion)\b/.test(bn)) warn('followup_vuelve_a_vender', 'El seguimiento vuelve a presentar la solución: el Playbook §17 pide solo retomar y preguntar (S1) o cerrar con cortesía (S2).', 10);

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
  const mine = cmShingles(parts.text, 3);
  let maxSim = 0, simWith = null;
  for (const p of list) { const j = cmJaccard(mine, cmShingles(cmParts(p.body).text, 3)); if (j > maxSim) { maxSim = j; simWith = p.company_name || p.id || null; } }
  maxSim = Math.round(maxSim * 100) / 100;
  if (maxSim >= 0.5) warn('muy_similar', 'Es casi igual a otro correo (' + Math.round(maxSim * 100) + '% de frases en común con ' + (simWith || 'otro prospecto') + ').', 25);
  else if (maxSim >= 0.35) warn('similar', 'Se parece mucho a otro correo (' + Math.round(maxSim * 100) + '% en común con ' + (simWith || 'otro prospecto') + ').', 15);
  else if (maxSim >= 0.25) warn('algo_similar', 'Comparte bastante estructura de frases con otro correo (' + Math.round(maxSim * 100) + '%).', 6);
  const sig = cmSignature(body);
  const sigRep = sig.split('>').length >= 4 ? same(list, (p) => cmSignature(p.body) === sig) : 0;
  if (sigRep >= 3) warn('misma_estructura', 'Tiene la misma estructura que ' + sigRep + ' correos recientes (' + sig.replace(/>/g, ' → ') + ').', 10);

  // ---- premios
  if (specific) rew('senal_concreta', used ? 'El problema sale de la evidencia investigada.' : 'Menciona algo concreto del proceso.', used ? 10 : 8);
  if (nWords >= 70 && nWords <= 120) rew('breve', 'Largo ideal del playbook (' + nWords + ' palabras).', 8);
  else if ((nWords >= 55 && nWords < 70) || (nWords > 120 && nWords <= 130)) rew('breve', 'Largo razonable (' + nWords + ' palabras).', 3);
  if (cta === 'question') rew('cta_facil', 'Cierra con una pregunta conversacional fácil de responder.', 8);
  else if (cta === 'who') rew('cta_facil', 'Cierra preguntando quién lo ve: fácil de responder.', 4);
  if (/^estimad[oa]s? /.test(cmNorm(parts.greeting))) rew('saludo_formal', 'Saludo profesional del playbook.', 3);
  if (fr <= 1 && conn === 0 && nWords >= 30) rew('un_problema', 'Trata una sola idea.', 6);
  if (!sigRep && !(maxSim >= 0.25)) rew('diverso', 'Su estructura es distinta a la de los demás.', 6);
  if (!buzz.length && !ai.length && !/(somos una agencia|nuestra agencia|soluciones (a medida|personalizadas|integrales))/.test(bn)) rew('natural', 'Lenguaje natural, sin jerga.', 4);
  if (kind === 'followup_1' && cta === 'question' && /\b(resuelt|quita tiempo|ya lo tienen|ya tienen)\b/.test(bn)) rew('followup_valida', 'Valida el dolor con una pregunta que admite «sí» o «ya lo tenemos resuelto» (Playbook §17).', 14);
  if (kind === 'followup_2' && /\b(cierro|no insist|dejo el hilo|dejamos aqui)\b/.test(bn)) rew('followup_cierra', 'Cierra el hilo con educación y sin presión (Playbook §17).', 14);

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
