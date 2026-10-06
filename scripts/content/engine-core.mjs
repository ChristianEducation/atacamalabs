/**
 * Atacama OS · Content Engine — núcleo de validación y scoring de piezas.
 *
 * Una sola fuente de verdad: esta función se prueba con `scripts/content/engine-core.test.mjs`
 * y se incrusta tal cual (Function.prototype.toString) en el nodo Code del workflow n8n
 * «12 Content Intake» (n8n/build/content-engine.mjs). Por eso debe ser AUTOCONTENIDA:
 * no puede usar imports ni variables externas, ni `new URL` (el sandbox de n8n no lo garantiza).
 *
 * Reglas editoriales que aplica (guía de publicaciones + prompt del Bloque H):
 *  - una afirmación factual externa necesita fuente verificable; cifras/porcentajes deben tener respaldo;
 *  - nada genérico de IA (lista de frases de relleno penaliza);
 *  - calidad > frecuencia: score >= 70 para ser candidata; < 70 no se fuerza;
 *  - no repetición por idea_key.
 */
export function evaluatePiece(piece, ctx = {}) {
  const errors = [];
  const warnings = [];
  const CHANNELS = ['instagram', 'linkedin_page', 'linkedin_profile'];
  const FORMATS = ['texto', 'imagen', 'carrusel', 'demo', 'reel'];
  const CATEGORIES = ['Educativo', 'Caso', 'Demo', 'Noticia', 'Evergreen', 'Founder'];
  const SOURCE_KINDS = ['hermes_research', 'real_work', 'evergreen', 'manual'];
  const CTA_TYPES = ['none', 'comment_keyword', 'resource', 'dm', 'link'];
  const LAYOUTS = ['cover', 'content', 'cta'];
  const FACTORS = { relevance: 15, audience_fit: 12, novelty: 8, evidence: 15, utility: 12, clarity: 10, conversation: 8, differentiation: 10, non_repetition: 10 };
  const THRESHOLD = 70;
  const isUrl = (u) => /^https?:\/\/[^\s/$.?#][^\s]*$/i.test(String(u || ''));
  const str = (v) => (typeof v === 'string' ? v.trim() : '');
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9% ]+/g, ' ').replace(/\s+/g, ' ').trim();
  const fnv = (s) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, '0'); };

  const p = piece && typeof piece === 'object' ? piece : {};
  if (p.version !== 1) errors.push('version_invalida');
  if (!CHANNELS.includes(p.channel)) errors.push('canal_invalido');
  if (!FORMATS.includes(p.format)) errors.push('formato_invalido');
  if (!CATEGORIES.includes(p.category)) errors.push('categoria_invalida');
  const topic = str(p.topic);
  const angle = str(p.angle);
  const hook = str(p.hook);
  const body = str(p.body);
  if (topic.length < 5 || topic.length > 140) errors.push('topic_fuera_de_rango');
  if (!angle) errors.push('angle_obligatorio');
  if (!str(p.audience)) errors.push('audience_obligatoria');
  if (hook.length < 8 || hook.length > 160) errors.push('hook_fuera_de_rango');
  if (body.length < 40) errors.push('body_muy_corto');
  if (!str(p.rationale)) errors.push('rationale_obligatorio');
  if (!str(p.visual_direction) && ['imagen', 'carrusel', 'demo', 'reel'].includes(p.format)) errors.push('visual_direction_obligatoria');

  // Canal ↔ formato
  if (p.channel === 'instagram' && p.format === 'texto') errors.push('instagram_requiere_medio');
  const hashtags = Array.isArray(p.hashtags) ? p.hashtags.map(str).filter(Boolean) : [];
  if (hashtags.length > 5) errors.push('demasiados_hashtags');
  const ctaObj = p.cta && typeof p.cta === 'object' ? p.cta : { type: 'none' };
  if (!CTA_TYPES.includes(ctaObj.type || 'none')) errors.push('cta_tipo_invalido');
  if (ctaObj.type === 'comment_keyword' && (!str(ctaObj.keyword) || !str(ctaObj.resource))) errors.push('cta_keyword_requiere_keyword_y_recurso');
  if (ctaObj.type === 'resource' && !str(ctaObj.resource)) errors.push('cta_recurso_obligatorio');
  const ctaText = str(ctaObj.text);

  // Texto final del post
  let postText = hook + '\n\n' + body;
  if (ctaText) postText += '\n\n' + ctaText;
  if (hashtags.length) postText += '\n\n' + hashtags.map((h) => (h.startsWith('#') ? h : '#' + h)).join(' ');
  const maxLen = p.channel === 'instagram' ? 2200 : 3000;
  if (postText.length > maxLen) errors.push('texto_excede_limite_' + maxLen);

  // Slides
  const slides = Array.isArray(p.slides) ? p.slides : [];
  if (['imagen', 'carrusel'].includes(p.format)) {
    const min = p.format === 'imagen' ? 1 : 3;
    const max = p.format === 'imagen' ? 1 : 10;
    if (slides.length < min || slides.length > max) errors.push('cantidad_de_slides_invalida');
  }
  const POSES = ['neutral', 'pregunta', 'celebra', 'senala', 'celular', 'brazos_arriba', 'laptop', 'conectada', 'tablet'];
  const EMOCIONES = ['neutral', 'pregunta', 'alegria', 'sorpresa', 'duda', 'salto', 'timida', 'orgullo', 'duerme'];
  let mascotCount = 0;
  slides.forEach((s, i) => {
    if (!LAYOUTS.includes(s && s.layout)) errors.push('slide_' + (i + 1) + '_layout_invalido');
    // Guía §6: la llamita es opcional, solo en portada o cierre, nunca en slides densos ni en todas las slides.
    if (s && s.mascot) {
      mascotCount++;
      const okPose = (s.mascot.sheet === 'poses' && POSES.includes(s.mascot.pose)) || (s.mascot.sheet === 'emociones' && EMOCIONES.includes(s.mascot.pose));
      if (!okPose) errors.push('slide_' + (i + 1) + '_mascota_invalida');
      if (s.layout === 'content') errors.push('slide_' + (i + 1) + '_mascota_solo_en_portada_o_cierre');
    }
    if (s && s.figure) {
      if (!str(s.figure.value) || str(s.figure.value).length > 12) errors.push('slide_' + (i + 1) + '_cifra_invalida');
      if (str(s.figure.label).length > 80) errors.push('slide_' + (i + 1) + '_cifra_etiqueta_larga');
    }
    if (s && s.compare) {
      const sides = [s.compare.left, s.compare.right];
      if (sides.some((c) => !c || !str(c.label) || str(c.label).length > 28 || str(c.text).length > 110)) errors.push('slide_' + (i + 1) + '_comparacion_invalida');
    }
    if (s && ((s.figure ? 1 : 0) + (s.compare ? 1 : 0) + (Array.isArray(s.items) && s.items.length ? 1 : 0)) > 1) errors.push('slide_' + (i + 1) + '_mezcla_de_estructuras');
    const t = str(s && s.title);
    if (!t) errors.push('slide_' + (i + 1) + '_sin_titulo');
    if (t.length > 90) errors.push('slide_' + (i + 1) + '_titulo_largo');
    if (str(s && s.body).length > 180) errors.push('slide_' + (i + 1) + '_texto_largo');
    if (Array.isArray(s && s.items) && s.items.length > 4) errors.push('slide_' + (i + 1) + '_muchas_ideas');
  });
  if (p.format === 'carrusel' && slides.length && slides[0].layout !== 'cover') warnings.push('primera_slide_no_es_portada');
  if (mascotCount > 2 || (slides.length > 2 && mascotCount > Math.ceil(slides.length / 2))) errors.push('demasiada_mascota');

  // Fuentes y claims
  const sources = Array.isArray(p.sources) ? p.sources : [];
  if (!sources.length) errors.push('sin_fuentes');
  sources.forEach((s, i) => {
    if (!SOURCE_KINDS.includes(s && s.kind)) errors.push('fuente_' + (i + 1) + '_tipo_invalido');
    if (!str(s && s.title)) errors.push('fuente_' + (i + 1) + '_sin_titulo');
    if (s && s.url && !isUrl(s.url)) errors.push('fuente_' + (i + 1) + '_url_invalida');
  });
  const evidenceUrls = (Array.isArray(p.evidence_urls) ? p.evidence_urls : []).map(str).filter(Boolean);
  if (evidenceUrls.some((u) => !isUrl(u))) errors.push('evidence_url_invalida');
  const verifiedSources = sources.filter((s) => s && s.verified === true);
  const claims = Array.isArray(p.claims) ? p.claims : [];
  claims.forEach((c, i) => {
    if (!str(c && c.text)) errors.push('claim_' + (i + 1) + '_sin_texto');
    if (c && c.external === true) {
      if (!isUrl(c.source_url)) errors.push('claim_externo_sin_fuente:' + str(c.text).slice(0, 40));
      else if (!verifiedSources.some((s) => s.url === c.source_url || (Array.isArray(s.evidence) && s.evidence.some((e) => e && e.url === c.source_url)))) errors.push('claim_externo_fuente_no_verificada:' + str(c.text).slice(0, 40));
    }
  });
  // Cifras / porcentajes en el texto deben tener respaldo en un claim
  const extra = (s) => [s && s.figure ? str(s.figure.value) + ' ' + str(s.figure.label) : '', s && s.compare ? [s.compare.left, s.compare.right].map((c) => (c ? str(c.label) + ' ' + str(c.text) : '')).join(' ') : ''];
  const allText = [hook, body, ctaText].concat(slides.map((s) => [s && s.kicker, s && s.title, s && s.body].concat(extra(s)).concat((s && s.items) || []).map((x) => (typeof x === 'object' && x ? str(x.title) + ' ' + str(x.text) : str(x))).join(' '))).join('\n');
  const claimBlob = norm(claims.map((c) => str(c && c.text)).join(' | '));
  const figures = allText.match(/\d[\d.,]*\s?%|\$\s?\d[\d.,]*|\d[\d.,]*\s?(millones|mil millones|veces)\b/gi) || [];
  figures.forEach((f) => { if (!claimBlob.includes(norm(f))) errors.push('cifra_sin_respaldo:' + f.trim()); });
  if (p.category === 'Noticia' && !claims.some((c) => c && c.external === true)) errors.push('noticia_sin_claim_externo');

  // Lint de marca / relleno de IA
  const BANNED = [/revolucion/i, /game.?changer/i, /en el mundo actual/i, /desbloque/i, /potencia tu/i, /el futuro (ya )?(est[aá]|es)/i, /innovador/i, /soluciones? integrales?/i, /sinergia/i, /disruptiv/i, /hoy m[aá]s que nunca/i, /llev(a|ar) (tu|su) negocio al siguiente nivel/i, /transformaci[oó]n digital/i, /en este post/i, /sum[eé]rgete/i, /\bdescubre c[oó]mo\b/i];
  let penalties = 0;
  const lintHits = [];
  BANNED.forEach((re) => { if (re.test(allText)) { penalties += 3; lintHits.push(String(re.source)); } });
  if (/agenda (una|tu) llamada/i.test(allText)) { penalties += 4; lintHits.push('cta_generico_agenda_llamada'); }
  if (/\bno sirve\b|somos mejores|mejor que (la competencia|otros)|garantizad[oa]|sin riesgo|el mejor del mercado/i.test(allText)) { penalties += 4; lintHits.push('ataque_o_promesa_exagerada'); }
  const emojiCount = (allText.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu) || []).length;
  if (emojiCount > 3) { penalties += 3; lintHits.push('exceso_de_emojis'); }
  penalties = Math.min(penalties, 20);

  // Factores 0–10 (los asigna quien genera la pieza; aquí se validan, se acotan y se aplican topes)
  const f = p.factors && typeof p.factors === 'object' ? p.factors : {};
  const breakdown = {};
  let raw = 0;
  Object.keys(FACTORS).forEach((k) => {
    let v = Number(f[k] && typeof f[k] === 'object' ? f[k].value : f[k]);
    if (!Number.isFinite(v)) { errors.push('factor_faltante:' + k); v = 0; }
    v = Math.max(0, Math.min(10, v));
    if (k === 'evidence' && !verifiedSources.length) v = Math.min(v, 2);
    if (k === 'non_repetition' && Array.isArray(ctx.existingIdeaKeys)) { /* se fija abajo con idea_key */ }
    breakdown[k] = v;
  });
  const ideaKey = fnv(norm(p.channel) + '|' + norm(topic) + '|' + norm(angle));
  if (Array.isArray(ctx.existingIdeaKeys) && ctx.existingIdeaKeys.includes(ideaKey)) { errors.push('idea_repetida'); breakdown.non_repetition = 0; }
  Object.keys(FACTORS).forEach((k) => { raw += (FACTORS[k] * breakdown[k]) / 10; });
  const score = Math.max(0, Math.min(100, Math.round(raw - penalties)));

  let decision;
  if (errors.length) decision = 'rejected';
  else if (score >= THRESHOLD) decision = 'candidate';
  else decision = 'below_threshold';

  return { ok: errors.length === 0, decision, score, threshold: THRESHOLD, breakdown, penalties, lint_hits: lintHits, errors, warnings, idea_key: ideaKey, post_text: postText, evidence_urls: evidenceUrls };
}
