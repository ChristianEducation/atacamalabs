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
 *  - Ola B · Editorial Brain: tipo editorial, voz por canal, largo, decisión visual y reglas de marca (edEvaluate).
 */
import { edEvaluate } from './editorial-core.mjs';
import { rfCtaCheck } from './resource-factory-core.mjs';

export function evaluatePiece(piece, ctx = {}) {
  const errors = [];
  const warnings = [];
  const CHANNELS = ['instagram', 'linkedin_page', 'linkedin_profile'];
  const FORMATS = ['texto', 'imagen', 'carrusel', 'demo', 'reel', 'historia'];
  // Motor de Instagram (Frente C): plantillas de historia (las dibuja scripts/content/story-templates.mjs) y lenguajes de motion validados (taller de la VPS).
  const STORY_TEMPLATES = ['ilustrada', 'dolor', 'pregunta', 'chat', 'embudo', 'recurso', 'dato'];
  // Ilustración del método visual obligatorio (escena para GPT Image 2.5): se valida igual en historias y en láminas.
  const artErrors = (art, where) => {
    if (!art || typeof art !== 'object') return [where + '_art_invalido'];
    const e = [];
    const sc = str(art.scene);
    if (sc.length < 30 || sc.length > 1500) e.push(where + '_art_escena_de_30_a_1500_caracteres');
    if (art.texts !== undefined && !Array.isArray(art.texts)) e.push(where + '_art_texts_debe_ser_lista');
    const tx = Array.isArray(art.texts) ? art.texts : [];
    if (tx.length > 8 || tx.some((t) => !str(t) || str(t).length > 120)) e.push(where + '_art_textos_max_8_de_120');
    if (art.character !== undefined && art.character !== null && art.character !== 'llamita') e.push(where + '_art_personaje_invalido');
    if (str(art.character_action).length > 220) e.push(where + '_art_accion_larga');
    return e;
  };
  const MOTION_LANGUAGES = ['paneles-partidos', 'rafaga-de-camara', 'mini-interfaces', 'propuesta'];
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
  if (body.length < (p.format === 'historia' ? 10 : 40)) errors.push('body_muy_corto');
  if (!str(p.rationale)) errors.push('rationale_obligatorio');
  if (!str(p.visual_direction) && ['imagen', 'carrusel', 'demo', 'reel', 'historia'].includes(p.format)) errors.push('visual_direction_obligatoria');

  // Canal ↔ formato
  if (p.channel === 'instagram' && p.format === 'texto') errors.push('instagram_requiere_medio');
  // Historia (solo Instagram): una imagen 1080×1920 dibujada con una plantilla de marca; el texto de la historia vive en p.story (la «descripción» del post no se muestra).
  const story = p.story && typeof p.story === 'object' ? p.story : null;
  if (p.format === 'historia') {
    if (p.channel !== 'instagram') errors.push('historia_solo_instagram');
    if (!story) errors.push('historia_requiere_story');
    else {
      if (!STORY_TEMPLATES.includes(story.template)) errors.push('story_template_invalida');
      const st = str(story.title);
      // Largo del título según la plantilla (si no cabe, choca con el dibujo: p. ej. el embudo). «pregunta» se parte en dos mitades con | (arriba | abajo).
      const TL = { ilustrada: 64, dolor: 72, pregunta: 80, chat: 60, embudo: 46, recurso: 56, dato: 56 };
      if (!st) errors.push('story_sin_titulo'); else if (st.length > (TL[story.template] || 78)) errors.push('story_titulo_largo_para_' + story.template + '_max_' + (TL[story.template] || 78));
      if (story.template === 'pregunta') { const halves = st.split('|'); if (halves.length !== 2 || halves.some((h) => !h.trim() || h.trim().length > 42)) errors.push('story_pregunta_parte_el_titulo_con_barra_arriba_|_abajo_max_42_cada_mitad'); }
      // Nada de textos recortados con puntos suspensivos: se reescriben más cortos.
      ['kicker', 'title', 'body', 'pill'].forEach((k) => { if (/(\.\.\.|…)\s*$/.test(str(story[k]))) errors.push('story_' + k + '_termina_en_puntos_suspensivos_reescribelo_mas_corto'); });
      if (Array.isArray(story.chat) && story.chat.some((m) => m && /(\.\.\.|…)\s*$/.test(str(m.text)))) errors.push('story_chat_termina_en_puntos_suspensivos');
      if (str(story.kicker).length > 32) errors.push('story_kicker_largo');
      if (str(story.body).length > 150) errors.push('story_texto_largo');
      if (str(story.pill).length > 38) errors.push('story_pill_largo');
      if (story.template === 'chat') {
        const chat = Array.isArray(story.chat) ? story.chat : [];
        if (chat.length < 2 || chat.length > 6) errors.push('story_chat_2_a_6_mensajes');
        if (chat.some((m) => !m || !['in', 'out'].includes(m.from) || !str(m.text) || str(m.text).length > 96)) errors.push('story_chat_mensaje_invalido');
      }
      if (story.template === 'embudo') {
        const stg = Array.isArray(story.stages) ? story.stages : [];
        if (stg.length !== 3 || stg.some((x) => !str(x) || str(x).length > 26)) errors.push('story_embudo_3_etapas_cortas');
      }
      if (story.template === 'recurso' && (!str(story.keyword) || str(story.keyword).length > 20)) errors.push('story_recurso_requiere_palabra_clave');
      if (story.template === 'dato' && (!story.figure || !str(story.figure.value) || str(story.figure.value).length > 12 || str(story.figure.label).length > 90)) errors.push('story_dato_requiere_cifra');
      // Reglas de historias v1.1: tipo (§2) y método visual obligatorio (§0.3). «ilustrada» = ilustración GPT Image 2.5 + texto de marca encima.
      if (story.kind !== undefined && !['SUPPORT_STORY', 'ORIGINAL_STORY'].includes(story.kind)) errors.push('story_kind_invalido_usa_SUPPORT_STORY_u_ORIGINAL_STORY');
      if (story.manual_note !== undefined && str(story.manual_note).length > 220) errors.push('story_nota_manual_larga');
      if (story.template === 'ilustrada' && !story.art) errors.push('story_ilustrada_requiere_art');
      if (story.art) artErrors(story.art, 'story').forEach((x) => errors.push(x));
    }
    if (Array.isArray(p.slides) && p.slides.length) warnings.push('historia_ignora_slides');
  } else if (story) warnings.push('story_solo_aplica_a_historia');
  // Reel / motion: el brief de motion declara lenguaje, frases, duración y el pedido de audio (el video lo produce el taller de la VPS).
  const mb = p.motion_brief && typeof p.motion_brief === 'object' ? p.motion_brief : null;
  if (p.format === 'reel') {
    if (!mb) errors.push('reel_requiere_motion_brief');
    else {
      if (!MOTION_LANGUAGES.includes(mb.language)) errors.push('motion_language_invalido');
      const ph = Array.isArray(mb.phrases) ? mb.phrases : [];
      if (ph.length < 1 || ph.length > 6 || ph.some((x) => !str(x) || str(x).length > 70)) errors.push('motion_frases_1_a_6_cortas');
      const du = Number(mb.duration_s);
      if (!(du >= 5 && du <= 30)) errors.push('motion_duracion_5_a_30_s');
      if (mb.audio_prompt !== undefined && (typeof mb.audio_prompt !== 'string' || mb.audio_prompt.length > 500)) errors.push('motion_audio_prompt_invalido');
    }
  } else if (mb) warnings.push('motion_brief_solo_aplica_a_reel');
  const hashtags = Array.isArray(p.hashtags) ? p.hashtags.map(str).filter(Boolean) : [];
  if (hashtags.length > 5) errors.push('demasiados_hashtags');
  const ctaObj = p.cta && typeof p.cta === 'object' ? p.cta : { type: 'none' };
  if (!CTA_TYPES.includes(ctaObj.type || 'none')) errors.push('cta_tipo_invalido');
  if (ctaObj.type === 'comment_keyword' && (!str(ctaObj.keyword) || !str(ctaObj.resource))) errors.push('cta_keyword_requiere_keyword_y_recurso');
  if (ctaObj.type === 'resource' && !str(ctaObj.resource)) errors.push('cta_recurso_obligatorio');
  const ctaText = str(ctaObj.text);
  // Ola A · Resource & Conversation Engine v1: recurso asociado (opcional). «Comenta PALABRA → DM» NO está automatizado: la entrega es manual.
  if (p.cta_mode !== undefined && p.cta_mode !== null && !['none', 'resource_link', 'dm', 'diagnostic'].includes(p.cta_mode)) errors.push('cta_mode_invalido');
  if (p.resource_id !== undefined && p.resource_id !== null && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(p.resource_id))) errors.push('resource_id_invalido');
  if (p.cta_mode === 'resource_link' && !p.resource_id) errors.push('cta_resource_link_requiere_resource_id');
  if (p.resource_id && ctx.resourceChecked && !ctx.resource) errors.push('recurso_no_existe_o_no_activo');
  if (str(p.cta_copy).length > 240) errors.push('cta_copy_largo');
  if (ctaObj.type === 'comment_keyword') warnings.push('comment_keyword_sin_automatizacion_entrega_manual');

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
    if (s && s.art) artErrors(s.art, 'slide_' + (i + 1)).forEach((x) => errors.push(x));
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
  const storyTexts = story ? [story.kicker, story.title, story.body, story.pill, story.figure ? str(story.figure.value) + ' ' + str(story.figure.label) : ''].concat(story.art && Array.isArray(story.art.texts) ? story.art.texts : []).concat(Array.isArray(story.stages) ? story.stages : []).concat(Array.isArray(story.chat) ? story.chat.map((m) => m && m.text) : []).map(str).join(' ') : '';
  const motionTexts = mb && Array.isArray(mb.phrases) ? mb.phrases.map(str).join(' ') : '';
  const allText = [hook, body, ctaText, storyTexts, motionTexts].concat(slides.map((s) => [s && s.kicker, s && s.title, s && s.body].concat(extra(s)).concat((s && s.items) || []).map((x) => (typeof x === 'object' && x ? str(x.title) + ' ' + str(x.text) : str(x))).join(' '))).join('\n');
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
  // Ola B · Editorial Brain por canal: tipo editorial, tono/voz, largo, decisión visual y marca.
  const editorial = edEvaluate(p, { recentVisuals: ctx.recentVisuals });
  editorial.errors.forEach((e) => errors.push(e));
  editorial.warnings.forEach((w) => warnings.push(w));
  penalties += editorial.penalties;
  // Ola B · Authority Resource Factory: el CTA debe ser coherente con la intención de la pieza.
  const ctaChk = rfCtaCheck(p);
  ctaChk.warnings.forEach((w) => warnings.push(w));
  penalties += ctaChk.penalties;
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

  return { ok: errors.length === 0, decision, score, threshold: THRESHOLD, breakdown, penalties, lint_hits: lintHits, errors, warnings, idea_key: ideaKey, post_text: postText, evidence_urls: evidenceUrls, editorial: { type: editorial.type, inferred: editorial.inferred, visual_need: editorial.visual.need, visual_inferred: editorial.visual.inferred } };
}
