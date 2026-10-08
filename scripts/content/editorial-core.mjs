/**
 * Atacama OS · Editorial Brain por canal (Ola B · bloque A) — núcleo puro.
 *
 * LinkedIn Christian, LinkedIn Atacama Labs e Instagram Atacama Labs NO son la misma cuenta con formatos distintos: cada una hace un trabajo editorial
 * propio. Este módulo concentra (1) el catálogo de tipos editoriales y perfiles de canal, (2) la validación editorial de una pieza (tipo, tono, largo,
 * decisión visual y reglas de marca) y (3) la fase previa «Editorial Decision»: dada una señal y el estado de la semana decide si vale la pena publicar,
 * en qué cuentas, con qué enfoque, formato, visual, recurso y CTA. Quien REDACTA sigue siendo Hermes; aquí se decide y se valida, no se escribe.
 *
 * Funciones AUTOCONTENIDAS (sin imports ni constantes de módulo, sin backticks en comentarios de plantillas): se incrustan con Function.prototype.toString
 * en los workflows n8n «12 Content Intake» y «25 Atacama Ops».
 */

export function edTypes() {
  return ['founder', 'educational', 'opinion', 'case', 'build_in_public', 'framework', 'comparison', 'news_explainer', 'resource', 'demo', 'process', 'integration', 'market_signal', 'customer_problem'];
}

export function edVisualNeeds() {
  return ['none', 'editorial_image', 'conceptual_image', 'diagram', 'process_flow', 'architecture', 'comparison', 'before_after', 'framework', 'checklist', 'chart', 'annotated_screenshot', 'carousel', 'resource_visual', 'typographic', 'short_video'];
}

/**
 * Perfiles. channels: rol, tono, formatos preferidos, largo orientativo del texto (hook + cuerpo, en caracteres) y visual por defecto.
 * types: canales recomendados (en orden de preferencia), largo (min/max en caracteres para LinkedIn), formatos, CTA permitidos y necesidad de visual.
 */
export function edProfiles() {
  const channels = {
    linkedin_profile: { label: 'LinkedIn Christian', role: 'Founder / constructor / operador', tone: 'personal, directo, reflexivo, humano; primera persona; sin tono corporativo ni de gurú de IA; sin inventar experiencias; sin vender en cada post', formats: ['texto', 'imagen'], chars: [500, 2200], visual_default: 'none', cta_default: 'none' },
    linkedin_page: { label: 'LinkedIn Atacama Labs', role: 'Autoridad de empresa', tone: 'claro, técnico-operativo y útil; voz de empresa (nosotros / impersonal); demuestra criterio, no promete', formats: ['texto', 'imagen', 'carrusel', 'demo'], chars: [600, 2200], visual_default: 'diagram', cta_default: 'none' },
    instagram: { label: 'Instagram Atacama Labs', role: 'Descubrimiento + claridad visual + marca', tone: 'entender primero, leer después: ideas complejas en formatos que se entienden rápido; copy breve', formats: ['carrusel', 'imagen', 'reel', 'demo'], chars: [80, 600], visual_default: 'carousel', cta_default: 'dm' },
  };
  const t = (ch, min, max, formats, cta, vNeed, vOptions) => ({ channels: ch, chars: [min, max], formats, cta, visual: { need: vNeed, options: vOptions } });
  const types = {
    founder: t(['linkedin_profile'], 500, 2000, ['texto', 'imagen'], ['none', 'dm'], 'optional', ['none', 'editorial_image', 'annotated_screenshot']),
    build_in_public: t(['linkedin_profile', 'linkedin_page'], 500, 2000, ['texto', 'imagen'], ['none', 'dm'], 'optional', ['none', 'annotated_screenshot', 'diagram', 'editorial_image']),
    opinion: t(['linkedin_profile', 'linkedin_page'], 400, 1600, ['texto'], ['none'], 'none_default', ['none', 'typographic', 'editorial_image']),
    customer_problem: t(['linkedin_profile', 'linkedin_page', 'instagram'], 500, 1800, ['texto', 'imagen', 'carrusel'], ['none', 'dm', 'diagnostic'], 'optional', ['none', 'before_after', 'process_flow', 'carousel']),
    case: t(['linkedin_page', 'linkedin_profile', 'instagram'], 700, 2200, ['texto', 'imagen', 'carrusel'], ['dm', 'diagnostic', 'none'], 'recommended', ['before_after', 'process_flow', 'annotated_screenshot', 'carousel']),
    educational: t(['linkedin_page', 'instagram'], 700, 2200, ['texto', 'carrusel', 'imagen'], ['none', 'resource_link', 'diagnostic'], 'recommended', ['carousel', 'diagram', 'checklist', 'process_flow']),
    framework: t(['linkedin_page', 'instagram'], 700, 2000, ['imagen', 'carrusel', 'texto'], ['resource_link', 'none', 'diagnostic'], 'required', ['framework', 'diagram', 'carousel', 'checklist']),
    comparison: t(['linkedin_page', 'instagram'], 600, 1800, ['imagen', 'carrusel', 'texto'], ['none', 'resource_link'], 'required', ['comparison', 'carousel', 'chart']),
    process: t(['linkedin_page', 'instagram', 'linkedin_profile'], 600, 1800, ['imagen', 'carrusel', 'texto'], ['none', 'dm', 'diagnostic'], 'recommended', ['process_flow', 'diagram', 'carousel']),
    integration: t(['linkedin_page', 'linkedin_profile'], 600, 2000, ['imagen', 'texto', 'carrusel'], ['none', 'dm'], 'recommended', ['architecture', 'diagram', 'annotated_screenshot']),
    news_explainer: t(['linkedin_page', 'instagram'], 600, 1800, ['texto', 'imagen', 'carrusel'], ['none'], 'optional', ['none', 'typographic', 'carousel', 'diagram']),
    market_signal: t(['linkedin_page', 'linkedin_profile'], 500, 1600, ['texto', 'imagen'], ['none'], 'optional', ['none', 'chart', 'typographic']),
    resource: t(['linkedin_page', 'instagram', 'linkedin_profile'], 500, 1600, ['imagen', 'carrusel', 'texto'], ['resource_link', 'dm'], 'required', ['resource_visual', 'checklist', 'framework', 'carousel']),
    demo: t(['linkedin_page', 'instagram'], 400, 1400, ['demo', 'reel', 'imagen', 'carrusel'], ['dm', 'diagnostic'], 'required', ['short_video', 'annotated_screenshot', 'carousel']),
  };
  return { channels, types };
}

/** Si la pieza no declara editorial_type, se infiere de su categoría y fuentes (siempre queda clasificada; el tipo explícito manda). */
export function edInferType(piece) {
  const p = piece && typeof piece === 'object' ? piece : {};
  const cat = String(p.category || '');
  const kinds = (Array.isArray(p.sources) ? p.sources : []).map((s) => s && s.kind);
  if (cat === 'Founder' || p.channel === 'linkedin_profile') return kinds.includes('real_work') ? 'build_in_public' : 'founder';
  if (cat === 'Noticia') return 'news_explainer';
  if (cat === 'Caso') return 'case';
  if (cat === 'Demo') return 'demo';
  if (cat === 'Evergreen') return p.cta_mode === 'resource_link' ? 'resource' : 'framework';
  return 'educational';
}

/**
 * Validación editorial de una pieza. Devuelve { type, inferred, errors[], warnings[], penalties, visual:{need,inferred,valid}, profile }.
 * Los errores bloquean la pieza; las advertencias y penalizaciones no. ctx.recentVisuals = composiciones recientes (para no repetir el mismo «hero»).
 */
export function edEvaluate(piece, ctx) {
  const p = piece && typeof piece === 'object' ? piece : {};
  const c = ctx && typeof ctx === 'object' ? ctx : {};
  const errors = [], warnings = [];
  let penalties = 0;
  const prof = edProfiles();
  const types = edTypes();
  const needs = edVisualNeeds();
  const str = (v) => (typeof v === 'string' ? v.trim() : '');
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const declared = str(p.editorial_type);
  let type = declared, inferred = false;
  if (declared && !types.includes(declared)) { errors.push('editorial_type_invalido:' + declared.slice(0, 30)); type = ''; }
  if (!type) { type = edInferType(p); inferred = true; if (!declared) warnings.push('editorial_type_inferido_declaralo_en_la_pieza'); }
  const ch = prof.channels[p.channel];
  const tp = prof.types[type];
  const text = str(p.hook) + '\n' + str(p.body);
  const len = text.length;
  const tn = norm(text);

  // tipo ↔ canal
  if (tp && ch && !tp.channels.includes(p.channel)) { warnings.push('tipo_no_recomendado_para_el_canal:' + type + '@' + p.channel); penalties += 3; }
  if (tp && ch && !tp.formats.includes(p.format) && p.format) warnings.push('formato_poco_habitual_para_el_tipo:' + type + '/' + p.format);

  // largo por canal (el tipo afina el rango en LinkedIn)
  if (ch) {
    const lo = p.channel === 'instagram' ? ch.chars[0] : (tp ? tp.chars[0] : ch.chars[0]);
    const hi = p.channel === 'instagram' ? ch.chars[1] : (tp ? Math.min(tp.chars[1], ch.chars[1]) : ch.chars[1]);
    if (p.channel === 'instagram') {
      const cap = len + (str(p.cta && p.cta.text) ? str(p.cta.text).length : 0);
      if (cap > 1000) errors.push('instagram_copy_largo_maximo_1000_caracteres_el_peso_va_en_las_slides');
      else if (cap > hi) { warnings.push('instagram_copy_largo:' + cap); penalties += 4; }
    } else if (len > hi) { warnings.push('largo_excesivo_para_el_tipo:' + len + '>' + hi); penalties += 3; }
    else if (len < lo * 0.5 && p.format === 'texto') warnings.push('largo_corto_para_el_tipo:' + len + '<' + lo);
  }

  // voz por canal
  const firstSing = (tn.match(/\b(yo|mi|mis|me|he|hice|aprendi|aprendimos|pense|decidi|construi|construyo|vi|note|descubri|escribo|creo|trabajo|estoy)\b/g) || []).length;
  const corporate = tn.match(/nos complace|estamos orgullosos|es un placer anunciar|lider en el mercado|solucion integral|nuestra solucion|nuestros servicios|ofrecemos soluciones|a la vanguardia|llevamos tu empresa|contactanos hoy/g) || [];
  if (p.channel === 'linkedin_profile') {
    if (corporate.length) { warnings.push('tono_corporativo_en_perfil_personal'); penalties += Math.min(8, 4 * corporate.length); }
    if (firstSing < 2) { warnings.push('perfil_personal_sin_voz_en_primera_persona'); penalties += 5; }
  }
  if (p.channel === 'linkedin_page' && firstSing >= 6 && /\byo\b/.test(tn)) { warnings.push('pagina_de_empresa_con_voz_demasiado_personal'); penalties += 2; }

  // decisión visual
  const v = p.visual && typeof p.visual === 'object' ? p.visual : null;
  let need = v ? str(v.need) : '';
  let vInferred = false;
  if (v && !needs.includes(need)) { errors.push('visual_need_invalido:' + need.slice(0, 30)); need = ''; }
  if (!need) {
    vInferred = true;
    need = p.format === 'texto' ? 'none' : p.format === 'carrusel' ? 'carousel' : p.format === 'reel' || p.format === 'demo' ? 'short_video' : (tp ? tp.visual.options.find((o) => o !== 'none') : '') || 'editorial_image';
    warnings.push('visual_sin_decision_explicita_declara_visual.need');
  }
  const IMG = ['editorial_image', 'conceptual_image', 'diagram', 'process_flow', 'architecture', 'comparison', 'before_after', 'framework', 'checklist', 'chart', 'annotated_screenshot', 'resource_visual', 'typographic'];
  if (!vInferred) {
    if (need === 'none' && p.format !== 'texto') errors.push('visual_none_pero_el_formato_pide_medio:' + p.format);
    if (need !== 'none' && p.format === 'texto') errors.push('formato_texto_con_visual_declarado:' + need + '_usa_imagen_o_carrusel_o_visual_none');
    if (need === 'carousel' && p.format !== 'carrusel') errors.push('visual_carousel_requiere_formato_carrusel');
    if (need === 'short_video' && !['reel', 'demo'].includes(p.format)) errors.push('visual_short_video_requiere_formato_reel_o_demo');
    if (IMG.includes(need) && !['imagen', 'carrusel'].includes(p.format)) errors.push('visual_' + need + '_requiere_formato_imagen_o_carrusel');
    if (tp && tp.visual.need === 'required' && need === 'none') warnings.push('este_tipo_suele_necesitar_visual:' + type);
    if (v && !str(v.rationale) && need !== 'none') warnings.push('visual_sin_justificacion');
    if (v && need === 'none' && !str(v.rationale)) warnings.push('visual_none_sin_justificacion');
  }
  if (p.channel === 'instagram' && need === 'none') errors.push('instagram_requiere_visual');
  // reglas de marca en lo que describe el visual (se permite nombrar lo que se EVITA: «sin robots»)
  const vtext = norm(str(p.visual_direction) + ' ' + str(v && v.rationale) + ' ' + str(v && v.prompt));
  const BAD = ['robot', 'holograma', 'cyber', 'neon', 'circuito', 'cripto', 'blockchain', 'matrix', 'cerebro digital', 'glow'];
  BAD.forEach((w) => {
    let i = vtext.indexOf(w);
    while (i >= 0) {
      const before = vtext.slice(Math.max(0, i - 28), i);
      if (!/\b(sin|no|ni|evit\w*|nunca|nada de|ningun\w*)\b/.test(before)) { errors.push('visual_viola_brand:' + w); break; }
      i = vtext.indexOf(w, i + w.length);
    }
  });
  if (/\bhero\b|landing|banner de (la )?web/.test(vtext)) { warnings.push('el_visual_parece_un_hero_de_la_web_las_redes_no_son_la_landing'); penalties += 2; }
  const comp = str(v && v.composition);
  const recent = Array.isArray(c.recentVisuals) ? c.recentVisuals.slice(0, 3).map((x) => norm(x)) : [];
  if (comp && recent.length >= 2 && recent.slice(0, 2).every((x) => x === norm(comp))) { warnings.push('composicion_repetida_en_las_ultimas_piezas:' + comp.slice(0, 30)); penalties += 2; }
  return { type, inferred, errors, warnings, penalties: Math.min(penalties, 12), visual: { need, inferred: vInferred }, profile: ch ? ch.label : null };
}

/** Tipo editorial «natural» de una señal según su origen. */
export function edSignalType(signal) {
  const s = signal && typeof signal === 'object' ? signal : {};
  const hint = String(s.type_hint || '').trim();
  if (edTypes().includes(hint)) return hint;
  const map = { news: 'news_explainer', rss: 'news_explainer', founder: 'founder', work: 'build_in_public', build: 'build_in_public', customer: 'customer_problem', market: 'market_signal', competitor: 'market_signal', resource: 'resource', demo: 'demo', integration: 'integration', process: 'process', opinion: 'opinion', case: 'case', evergreen: 'framework' };
  return map[String(s.kind || '').toLowerCase()] || 'educational';
}

/**
 * EDITORIAL DECISION — fase previa a escribir. Inputs: signal { topic, summary, kind, type_hint, urgent, personal, visualizable }, week (weeklyContent), pending / max_pending
 * (cola de revisión), recent [{ channel, editorial_type, topic, status, created_at }], resources (ya ordenados por afinidad), explicit (orden de Christian).
 * Output: { publish, reason, urgency, window_hours, proposals[], notes[] }. Cada propuesta lleva canal, tipo editorial, directriz de ángulo DISTINTA por canal,
 * formato, largo, visual (con la pregunta que lo justifica), recurso, CTA y cuenta. Una misma señal genera piezas distintas, nunca una copia.
 */
export function edPlan(input) {
  const x = input && typeof input === 'object' ? input : {};
  const sig = x.signal && typeof x.signal === 'object' ? x.signal : {};
  const prof = edProfiles();
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  const toks = (s) => norm(s).split(' ').filter((w) => w.length > 3);
  const notes = [];
  const w = x.week || {};
  const room = Math.max(0, (Number(w.target) || 5) - (Number(w.coverage) || 0));
  const topicTokens = toks(sig.topic);
  const covered = (Array.isArray(x.recent) ? x.recent : []).filter((r) => ['in_review', 'scheduled', 'approved', 'published'].includes(r.status)).find((r) => {
    const rt = toks(r.topic); if (!topicTokens.length || !rt.length) return false;
    const inter = topicTokens.filter((t) => rt.includes(t)).length; return inter / Math.min(topicTokens.length, rt.length) >= 0.6;
  });
  const urgent = sig.urgent === true;
  const kindType = edSignalType(sig);
  const explicit = x.explicit === true;
  const base = { signal: String(sig.topic || '').slice(0, 140), week: { done: w.done, in_review: w.in_review, coverage: w.coverage, target: w.target, max: w.max, runway_days: w.runway_days, state: w.state_label || w.state } };

  // ¿publicar o no?
  let publish = true, reason = 'vale la pena: hay espacio en la semana y la señal no está cubierta';
  const pending = Number(x.pending) || 0, maxPending = Number(x.max_pending) || 6;
  if (!String(sig.topic || '').trim()) return { ...base, publish: false, reason: 'falta el tema de la señal', proposals: [], notes };
  if (covered) { publish = false; reason = 'ya hay una pieza parecida (' + covered.status + '): «' + String(covered.topic).slice(0, 80) + '». Solo con un hecho nuevo.'; }
  else if (pending >= maxPending && !explicit) { publish = false; reason = 'la cola de revisión está llena (' + pending + '/' + maxPending + '): primero se revisa lo pendiente'; }
  else if (!explicit && !urgent && (w.covered || (Number(w.runway_days) || 0) >= (Number(w.runway_max) || 5))) { publish = false; reason = w.covered ? 'la semana está cubierta (' + w.coverage + '/' + w.target + '): se guarda la señal, no se fabrica una pieza normal' : 'ya hay ' + w.runway_days + ' días de contenido por delante'; }
  else if (urgent && (Number(w.coverage) || 0) >= (Number(w.max) || 6) && !explicit) { publish = false; reason = 'aun siendo urgente, ya se llegó al máximo normal de la semana (' + w.max + ')'; }
  else if (explicit && (w.covered || pending >= maxPending)) notes.push('orden explícita: pasa por encima del ritmo/cola, pero Christian verá la advertencia');
  if (!publish) return { ...base, publish, reason, urgency: urgent ? 'urgent' : 'normal', proposals: [], notes };

  // canales que de verdad encajan con esta señal
  const personal = sig.personal === true || ['founder', 'build_in_public', 'customer_problem', 'opinion'].includes(kindType);
  const visualizable = sig.visualizable !== false && !['opinion', 'market_signal'].includes(kindType);
  const recentByChannel = {};
  (Array.isArray(x.recent) ? x.recent : []).forEach((r) => { (recentByChannel[r.channel] = recentByChannel[r.channel] || []).push(r.editorial_type || ''); });
  const lastTypes = (ch) => (recentByChannel[ch] || []).slice(0, 3);
  const pick = (ch, options) => options.find((t) => !lastTypes(ch).includes(t)) || options[0];
  const proposals = [];
  const resource = Array.isArray(x.resources) && x.resources.length ? x.resources[0] : null;
  const days = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

  if (personal) {
    const type = pick('linkedin_profile', kindType === 'customer_problem' ? ['customer_problem', 'founder', 'opinion'] : kindType === 'opinion' ? ['opinion', 'founder'] : ['build_in_public', 'founder', 'opinion']);
    proposals.push({ channel: 'linkedin_profile', account: prof.channels.linkedin_profile.label, editorial_type: type, role: prof.channels.linkedin_profile.role, tone: prof.channels.linkedin_profile.tone, format: 'texto',
      angle_directive: 'Desde la experiencia real de Christian: el problema que vivió, la decisión que tomó y lo que aprendió (primera persona, concreto, sin vender). No inventes vivencias: si faltan detalles, usa Founder Interview (entrevistame).',
      length_chars: prof.types[type].chars, visual: { need: 'none', options: prof.types[type].visual.options, why: 'Un buen post personal puede ser solo texto; imagen solo si hay una captura anotada o un diagrama que de verdad ayuda' }, cta_mode: 'none', cta_why: 'Reflexión/aprendizaje: sin CTA comercial', resource: null });
  }
  {
    const opts = kindType === 'news_explainer' ? ['news_explainer', 'educational'] : kindType === 'resource' ? ['resource', 'framework'] : kindType === 'demo' ? ['demo', 'process'] : ['educational', 'framework', 'process', 'comparison'];
    const type = pick('linkedin_page', opts);
    const tpf = prof.types[type];
    const needsVisual = tpf.visual.need === 'required' || tpf.visual.need === 'recommended';
    const useResource = resource && ['resource', 'framework', 'educational'].includes(type);
    proposals.push({ channel: 'linkedin_page', account: prof.channels.linkedin_page.label, editorial_type: type, role: prof.channels.linkedin_page.role, tone: prof.channels.linkedin_page.tone, format: needsVisual ? (tpf.formats.includes('carrusel') && type !== 'framework' ? 'carrusel' : 'imagen') : 'texto',
      angle_directive: 'Autoridad de empresa: explica el tema como lo haría quien construye estos sistemas (qué necesita, cómo se conecta, dónde sí y dónde no). Estructura clara (4–5 componentes o pasos), sin copiar el enfoque personal de Christian ni el carrusel de Instagram.',
      length_chars: tpf.chars, visual: { need: needsVisual ? tpf.visual.options[0] : 'none', options: tpf.visual.options, why: needsVisual ? 'Una estructura (' + tpf.visual.options[0] + ') se entiende mejor dibujada que contada' : 'El texto solo alcanza para esta idea' },
      cta_mode: useResource ? 'resource_link' : (tpf.cta.includes('diagnostic') && type !== 'news_explainer' ? 'diagnostic' : 'none'), cta_why: useResource ? 'Hay un recurso existente que extiende el tema: reutilizarlo antes de crear otro' : 'Sin recurso que aporte, no se fuerza un CTA', resource: useResource ? { id: resource.id, slug: resource.slug, name: resource.name } : null });
  }
  if (visualizable && x.include_instagram !== false) {
    const type = pick('instagram', kindType === 'customer_problem' ? ['customer_problem', 'process'] : ['educational', 'process', 'comparison', 'framework']);
    proposals.push({ channel: 'instagram', account: prof.channels.instagram.label, editorial_type: type, role: prof.channels.instagram.role, tone: prof.channels.instagram.tone, format: 'carrusel',
      angle_directive: 'Carrusel de 6–7 slides que se entienda sin leer el caption: una idea por slide (conversar ≠ trabajar → pieza 1 → pieza 2 → … → cierre). Caption breve (≤ 600 caracteres), sin repetir el post largo de LinkedIn ni llenar slides de texto.',
      length_chars: prof.channels.instagram.chars, visual: { need: 'carousel', options: ['carousel', 'process_flow', 'before_after', 'checklist'], why: 'Instagram es visual primero: se renderiza con el renderer de carruseles (texto exacto), no con generación de imagen' }, cta_mode: 'dm', cta_why: 'Instagram no enlaza en el caption: DM o link en bio', resource: null, render: 'render-pending (manual)' });
  }
  // el espacio disponible limita cuántas cuentas se cubren: primero la que mejor encaja con el origen de la señal
  const order = personal ? ['linkedin_profile', 'linkedin_page', 'instagram'] : ['linkedin_page', 'instagram', 'linkedin_profile'];
  proposals.sort((a, b) => order.indexOf(a.channel) - order.indexOf(b.channel));
  const limit = explicit ? proposals.length : Math.max(1, Math.min(proposals.length, room || 1));
  if (limit < proposals.length) notes.push('el ritmo semanal solo deja espacio para ' + limit + ' pieza(s): se proponen las que mejor encajan; el resto queda como idea para otra semana');
  const dow = new Date(Number(x.now) || 0).getUTCDay();
  const guide = { 1: 'dolor/problema real', 2: 'educativo/cómo funciona', 3: 'caso/construcción/aprendizaje', 4: 'opinión/mercado/tendencia', 5: 'recurso/checklist/guía' }[dow];
  if (guide) notes.push('guía de variedad de hoy (' + days[dow] + '): ' + guide + ' (orientativa, no obligatoria)');
  const urgency = urgent ? 'urgent' : ['resource', 'framework', 'process'].includes(kindType) ? 'evergreen' : 'normal';
  return { ...base, publish: true, reason, urgency, window_hours: urgency === 'urgent' ? 24 : urgency === 'evergreen' ? 72 : 48, signal_type: kindType, proposals: proposals.slice(0, limit), notes };
}
