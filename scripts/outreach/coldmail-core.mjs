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

  // ---- asunto
  const generic = /^(una idea para|idea para|propuesta (para|de|comercial)|automatizaci[oó]n con ia|soluci[oó]n de ia|inteligencia artificial para|oportunidad (para|de)|alianza con|presentaci[oó]n (de|para)|atacama labs)\b/;
  let pts = 0;
  if (generic.test(sn)) { pts = 15; warn('asunto_generico', 'El asunto es genérico («' + subject + '»): usa algo corto y específico del proceso (ej. «reservas por WhatsApp»).', pts); }
  const sw = cmWords(subject);
  if (sw.length > 8) warn('asunto_largo', 'El asunto tiene ' + sw.length + ' palabras: mejor 2–6.', 4);
  const pre = sw.slice(0, 3).join(' ');
  const sameSubj = list.filter((p) => cmNorm(p.subject) === sn).length;
  const samePre = sw.length >= 2 ? same(list, (p) => cmWords(p.subject).slice(0, 3).join(' ') === pre) : 0;
  if (sameSubj >= 1) warn('asunto_repetido', 'Otro correo ya usa exactamente este asunto.', 12);
  else if (samePre >= 3) warn('asunto_mismo_patron', 'Este asunto sigue el mismo patrón que ' + samePre + ' correos recientes («' + pre + '…»).', 14);
  else if (samePre >= 1) warn('asunto_mismo_patron', 'Este asunto empieza igual que otro correo reciente («' + pre + '…»).', 7);

  // ---- apertura
  const open3 = cmOpening(body, 3), open4 = cmOpening(body, 4);
  if (/^(vi|vimos|he visto)\b/.test(open3) || /^vi que\b/.test(cmNorm(parts.sentences[0] || ''))) {
    const rep = same(list, (p) => /^(vi|vimos|he visto)\b/.test(cmOpening(p.body, 3)));
    warn('apertura_vi_que', '«Vi que…» abre el correo' + (rep >= 2 ? ' y se repite en ' + rep + ' correos recientes' : '') + ': prueba una observación, pregunta o contraste.', rep >= 2 ? 18 : 8);
  } else if (open4 && same(list, (p) => cmOpening(p.body, 4) === open4) >= 2) warn('apertura_repetida', 'La apertura («' + open4 + '…») se repite en otros correos.', 10);
  if (/hipotesis/.test(bn)) {
    const rep = same(list, (p) => /hipotesis/.test(cmNorm(p.body)));
    warn('mi_hipotesis', '«Mi hipótesis…» aparece' + (rep >= 2 ? ' y ya está en ' + rep + ' correos recientes' : '') + ': suena a plantilla.', rep >= 2 ? 16 : 8);
  }
  if (/(no lo he visto por dentro|no lo he visto desde dentro|no se si les pasa|no se si te pasa|perdona que te escriba|disculpa la molestia|no quiero quitarte tiempo|no es spam|sin compromiso|espero no molestar)/.test(bn)) {
    const m = (bn.match(/no lo he visto por dentro|no lo he visto desde dentro|perdona que te escriba|disculpa la molestia|no quiero quitarte tiempo|no es spam|sin compromiso|espero no molestar/g) || []).length;
    if (m) warn('frases_defensivas', 'Frases defensivas innecesarias (' + m + '): restan confianza.', Math.min(9, 3 * m));
  }

  // ---- CTA
  const cta = cmCtaKind(body);
  const ctaHead = cmWords(parts.sentences.slice(-1)[0] || '').slice(0, 5).join(' ');
  if (cta === 'meeting') warn('cta_reunion', 'El primer correo pide reunión/minutos: baja la fricción (ej. «¿te mando un ejemplo?»).', isFollow ? 6 : 10);
  if (ctaHead && same(list, (p) => cmWords(cmParts(p.body).sentences.slice(-1)[0] || '').slice(0, 5).join(' ') === ctaHead) >= 2) warn('cta_repetido', 'El cierre se repite en otros correos.', 8);
  if (!isFollow && cta === 'statement') warn('cta_ausente', 'El correo no cierra con algo fácil de responder (una pregunta corta).', 6);

  // ---- foco y largo
  const atcSent = parts.sentences.filter((s) => /(atacama|armamos|implementamos|ayudamos a|nuestros agentes|trabajamos con empresas|somos una)/.test(cmNorm(s)) && !(/^(soy|me llamo) [^.]{0,40}atacama labs[.!]?$/.test(cmNorm(s)) && cmWords(s).length <= 9));
  const atcWords = atcSent.reduce((n, s) => n + cmWords(s).length, 0);
  if (atcSent.length > 1 || (atcSent.length === 1 && nWords > 0 && atcWords / nWords > 0.4)) warn('explica_atacama', 'Explica demasiado a Atacama Labs (' + atcSent.length + ' oraciones): el correo es sobre el prospecto, no sobre nosotros.', atcSent.length > 1 ? 10 : 6);
  if (nWords > 130) warn('largo', 'Tiene ' + nWords + ' palabras: un correo en frío funciona mejor con 50–100.', 10);
  else if (nWords > 100) warn('largo', 'Tiene ' + nWords + ' palabras: apunta a 50–100.', 4);
  else if (nWords < 30) warn('muy_corto', 'Tiene solo ' + nWords + ' palabras: falta contexto para que tenga sentido.', 8);
  const fr = parts.sentences.filter((s) => /(repite|a mano|manual|se pierde|se pierden|demora|tarda|cuello de botella|duplica|persigue|incomplet|desordenad|fuera de horario|sin respuesta|responder lo mismo)/.test(cmNorm(s))).length;
  const conn = (bn.match(/\b(ademas|tambien|por otro lado|por otra parte|asimismo|por ultimo)\b/g) || []).length;
  if (fr >= 3 || conn >= 2) warn('varios_problemas', 'Toca más de un problema: elige uno solo.', fr >= 3 ? 8 : 4);

  // ---- tono
  const buzz = bn.match(/\b(sinergia|disruptiv\w*|revolucion\w*|transformacion digital|solucion integral|innovador\w*|de vanguardia|lider en|potenciar|llevar (tu|su) (negocio|empresa) al siguiente nivel|optimizar procesos|ecosistema|360|a la medida de sus necesidades|de ultima generacion|impulsar su crecimiento)\b/g) || [];
  if (buzz.length) warn('buzzwords', 'Jerga/buzzwords: ' + buzz.slice(0, 3).join(', ') + '.', Math.min(12, 4 * buzz.length));
  if (/(somos una agencia|nuestra agencia|soluciones (a medida|personalizadas|integrales)|equipo de expertos|amplia experiencia)/.test(bn)) warn('tono_agencia', 'Suena a agencia («soluciones a medida», «equipo de expertos»).', 6);
  const ai = [];
  if (/espero que (este|el) (mensaje|correo)/.test(bn)) ai.push('«espero que este mensaje…»');
  if (/(en el mundo actual|en la era de|en un mundo (cada vez|donde)|en el panorama actual)/.test(bn)) ai.push('apertura grandilocuente');
  if (/\bno (es|son) solo [^.]{3,60}(sino|,\s*es)\b/.test(bn) || /\bno solo [^.]{3,60}sino\b/.test(bn)) ai.push('«no es solo X, sino Y»');
  if (/(me permito|quisiera presentar|tengo el agrado|le escribo para presentar)/.test(bn)) ai.push('fórmula de carta formal');
  if ((body.match(/—/g) || []).length >= 2 || /[\u{1F300}-\u{1FAFF}]/u.test(body)) ai.push('rayas largas/emojis');
  if (ai.length) warn('tono_ia', 'Suena generado: ' + ai.join('; ') + '.', Math.min(10, 5 * ai.length));
  if (isFollow && /\b(retomo|retomar|solo queria|por si se perdio|recordarte|seguimiento de mi|quedo atento|reflotar)\b/.test(bn)) warn('followup_sin_aporte', 'El seguimiento solo recuerda: agrega algo nuevo (ejemplo, dato, versión más simple o pregunta distinta).', 12);

  // ---- personalización real (evidencia usada / señal concreta)
  let used = false;
  if (c.evidence.length) {
    const stop = { empresa: 1, sucursal: 0, atacama: 1, clientes: 1, cliente: 1, servicio: 1, servicios: 1, general: 1, sitio: 1, pagina: 1, mensaje: 1 };
    for (const e of c.evidence) { for (const w of cmWords(e.fact)) { if (w.length >= 6 && !stop[w] && new RegExp('\\b' + w + '\\b').test(bn)) { used = true; break; } } if (used) break; }
  }
  const procWords = bn.match(/\b(reserva\w*|cotizacion\w*|solicitud\w*|agenda\w*|recepcion|sucursal\w*|sede\w*|turno\w*|pedido\w*|stock|despacho\w*|factura\w*|cobranza\w*|whatsapp|formulario\w*|catalogo|sku|reclamo\w*|ticket\w*|postventa|inventario|cita\w*|horas?|presupuesto\w*|matricula\w*|admision|postulacion\w*|derivacion\w*|seguimiento|orden(es)? de trabajo|mantencion\w*)\b/g) || [];
  const distinctProc = Object.keys(procWords.reduce((o, w) => { o[w] = 1; return o; }, {})).length;
  const specific = used || distinctProc >= 2 || /\b\d{2,}\b/.test(parts.text);
  if (c.evidence.length && !used) warn('evidencia_no_usada', 'Declaraste evidencia pero el correo no la usa: la observación debe salir de ella.', 8);
  if (!specific) warn('sin_senal_concreta', 'No hay una señal concreta del prospecto (proceso, dato o situación): quedaría igual para cualquier empresa.', 14);

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
  if (specific) rew('senal_concreta', used ? 'Usa la evidencia investigada.' : 'Menciona algo concreto del proceso.', used ? 12 : 8);
  if (nWords >= 45 && nWords <= 100) rew('breve', 'Largo ideal (' + nWords + ' palabras).', 8);
  else if (nWords > 100 && nWords <= 130) rew('breve', 'Largo razonable (' + nWords + ' palabras).', 3);
  if (cta === 'example' || cta === 'who' || cta === 'question') rew('cta_facil', 'Cierra con algo fácil de responder.', 8);
  if (fr <= 1 && conn === 0 && nWords >= 30) rew('un_problema', 'Trata una sola idea.', 6);
  if (!sigRep && !(maxSim >= 0.25)) rew('diverso', 'Su estructura es distinta a la de los demás.', 6);
  if (!buzz.length && !ai.length && !/(somos una agencia|nuestra agencia|soluciones (a medida|personalizadas|integrales))/.test(bn)) rew('natural', 'Lenguaje natural, sin jerga.', 4);
  if (isFollow && /\b(ejemplo|esquema|caso|dato|version mas simple|asi lo plantearia|asi lo veria|recurso|idea concreta)\b/.test(bn)) rew('followup_aporta', 'El seguimiento aporta algo nuevo.', 8);

  let score = 60;
  for (const r of rewards) score += r.pts;
  for (const w of warnings) score -= w.pts;
  score = Math.max(0, Math.min(100, Math.round(score)));
  const level = score >= 80 ? 'bueno' : score >= 65 ? 'aceptable' : 'bajo';
  warnings.sort((a, b) => b.pts - a.pts);
  return { v: 2, score, level, warnings, rewards, hard, metrics: { words: nWords, subject_words: sw.length }, similarity: { max: maxSim, with: simWith }, signature: sig, cta_kind: cta, opening: open3, evidence_used: used };
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
