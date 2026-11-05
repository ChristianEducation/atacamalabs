import assert from 'node:assert/strict';
import * as ed from './editorial-core.mjs';
import { evaluatePiece } from './engine-core.mjs';

let n = 0;
const ok = (name, fn) => { try { fn(); n++; } catch (e) { console.error('FAIL', name, '\n', e.stack.split('\n').slice(0, 4).join('\n')); process.exitCode = 1; } };

const SRC = [{ kind: 'real_work', title: 'Hermes conectado a herramientas reales', url: 'https://github.com/ChristianEducation/atacamalabs/commit/3d5f85d', verified: true, evidence: [{ url: 'https://github.com/ChristianEducation/atacamalabs/commit/3d5f85d', quote: 'feat: Content Engine MVP' }] }];
const F = { relevance: 9, audience_fit: 8, novelty: 7, evidence: 8, utility: 8, clarity: 8, conversation: 8, differentiation: 8, non_repetition: 8 };
const piece = (o) => ({ version: 1, channel: 'linkedin_profile', format: 'texto', category: 'Founder', topic: 'Lo difícil no fue que el agente respondiera', angle: 'Fue hacer que pudiera trabajar', audience: 'Dueños de pymes', hook: 'Lo difícil no fue hacer que el agente respondiera.', body: 'Esta semana terminé de conectar a Hermes con las herramientas reales de Atacama Labs. Yo pensaba que lo difícil sería la conversación. Me equivoqué: lo difícil fue darle permisos, datos y supervisión para que pudiera trabajar. Aprendí que un agente sin esas tres cosas solo conversa. Hoy cada acción importante pasa por una aprobación mía, y creo que así debe ser al principio.', rationale: 'Experiencia real de construcción', sources: SRC, claims: [{ text: 'Atacama Labs conectó Hermes con sus herramientas', external: false }], factors: F, cta: { type: 'none' }, visual: { need: 'none', rationale: 'La reflexión funciona mejor sola, sin imagen' }, editorial_type: 'build_in_public', ...(o || {}) });

ok('catálogo: 14 tipos editoriales y 16 necesidades visuales (incluye none)', () => {
  assert.equal(ed.edTypes().length, 14);
  for (const t of ['founder', 'educational', 'opinion', 'case', 'build_in_public', 'framework', 'comparison', 'news_explainer', 'resource', 'demo', 'process', 'integration', 'market_signal', 'customer_problem']) assert.ok(ed.edTypes().includes(t), t);
  assert.equal(ed.edVisualNeeds().length, 16); assert.ok(ed.edVisualNeeds().includes('none')); assert.ok(ed.edVisualNeeds().includes('short_video'));
});

ok('cada tipo define canales, largo, formatos, CTA y necesidad de visual (influye en todo)', () => {
  const p = ed.edProfiles();
  for (const t of ed.edTypes()) { const x = p.types[t]; assert.ok(x, t); assert.ok(x.channels.length && x.formats.length && x.cta.length && x.visual.options.length && x.chars[0] < x.chars[1], t); }
  assert.deepEqual(p.types.founder.channels, ['linkedin_profile']); assert.equal(p.types.opinion.visual.need, 'none_default'); assert.equal(p.types.framework.visual.need, 'required');
  assert.equal(p.channels.linkedin_profile.visual_default, 'none');
});

ok('LinkedIn Christian: una pieza personal en primera persona y sin imagen es válida (no se obliga a usar imagen)', () => {
  const r = evaluatePiece(piece(), {});
  assert.deepEqual(r.errors, []); assert.equal(r.editorial.type, 'build_in_public'); assert.equal(r.editorial.visual_need, 'none'); assert.ok(r.score >= 70, String(r.score));
});

ok('LinkedIn Christian NO suena corporativo: tono de empresa y sin primera persona penalizan', () => {
  const corp = piece({ hook: 'Nos complace anunciar nuestra solución integral', body: 'Atacama Labs ofrece soluciones y nuestros servicios a la vanguardia. Nos complace anunciar que somos líderes en el mercado de automatización, contáctanos hoy para conocer nuestros servicios de agentes de IA para su empresa.' });
  const e = ed.edEvaluate(corp);
  assert.ok(e.warnings.includes('tono_corporativo_en_perfil_personal')); assert.ok(e.warnings.includes('perfil_personal_sin_voz_en_primera_persona')); assert.ok(e.penalties >= 8);
  assert.ok(evaluatePiece(corp, {}).score < evaluatePiece(piece(), {}).score);
  assert.deepEqual(ed.edEvaluate(piece()).warnings.filter((w) => /tono_corporativo|sin_voz/.test(w)), []);
});

ok('Instagram NO recibe copy largo: >1000 caracteres de caption se rechaza; ≤600 pasa limpio', () => {
  const slides = [{ layout: 'cover', title: 'Conversar no es trabajar' }, { layout: 'content', title: 'Herramientas' }, { layout: 'cta', title: 'Escríbenos' }];
  const base = { channel: 'instagram', format: 'carrusel', category: 'Educativo', editorial_type: 'educational', visual: { need: 'carousel', rationale: 'Una idea por slide' }, visual_direction: 'Carrusel claro, fondo crema, azul Atacama', slides, cta: { type: 'none' } };
  const long = evaluatePiece(piece({ ...base, hook: 'Qué necesita un agente para trabajar de verdad', body: 'x '.repeat(600) }), {});
  assert.ok(long.errors.some((e) => /instagram_copy_largo/.test(e)), JSON.stringify(long.errors));
  const short = evaluatePiece(piece({ ...base, hook: 'Qué necesita un agente para trabajar de verdad', body: 'Seis cosas que separan un chatbot de un agente que ejecuta. Deslízalo para verlas una por una.' }), {});
  assert.ok(!short.errors.some((e) => /instagram_copy_largo/.test(e)), JSON.stringify(short.errors));
});

ok('Instagram siempre lleva visual: visual none se rechaza', () => {
  const r = ed.edEvaluate(piece({ channel: 'instagram', format: 'carrusel', editorial_type: 'educational', category: 'Educativo', visual: { need: 'none' } }));
  assert.ok(r.errors.some((e) => /instagram_requiere_visual/.test(e)));
});

ok('el contenido puede decidir visual=none y la decisión debe ser coherente con el formato', () => {
  assert.deepEqual(ed.edEvaluate(piece()).errors, []);
  assert.ok(ed.edEvaluate(piece({ format: 'imagen', visual: { need: 'none' } })).errors.some((e) => /visual_none_pero_el_formato_pide_medio/.test(e)));
  assert.ok(ed.edEvaluate(piece({ format: 'texto', visual: { need: 'diagram' } })).errors.some((e) => /formato_texto_con_visual_declarado/.test(e)));
  assert.ok(ed.edEvaluate(piece({ format: 'imagen', visual: { need: 'carousel' } })).errors.some((e) => /visual_carousel_requiere_formato_carrusel/.test(e)));
  assert.ok(ed.edEvaluate(piece({ format: 'imagen', visual: { need: 'inventado' } })).errors.some((e) => /visual_need_invalido/.test(e)));
  assert.deepEqual(ed.edEvaluate(piece({ format: 'imagen', visual: { need: 'diagram', rationale: 'Muestra el flujo' }, visual_direction: 'Diagrama simple canal → agente → herramientas' })).errors, []);
});

ok('sin declarar tipo ni visual la pieza se clasifica sola (aviso, no error) y queda guardada la inferencia', () => {
  const p = piece(); delete p.editorial_type; delete p.visual;
  const e = ed.edEvaluate(p);
  assert.equal(e.type, 'build_in_public'); assert.equal(e.inferred, true); assert.ok(e.warnings.includes('editorial_type_inferido_declaralo_en_la_pieza')); assert.equal(e.visual.inferred, true);
  assert.ok(ed.edEvaluate(piece({ editorial_type: 'inventado' })).errors.some((x) => /editorial_type_invalido/.test(x)));
});

ok('reglas de marca en el visual: robots, neón, circuitos, cyber, hologramas se rechazan; nombrarlos para EVITARLOS está permitido', () => {
  const mk = (vd) => ed.edEvaluate(piece({ format: 'imagen', visual: { need: 'editorial_image', rationale: 'x' }, visual_direction: vd }));
  for (const bad of ['Un robot sonriendo sobre fondo azul', 'Estética cyber con neón y glow', 'Circuitos decorativos alrededor del texto', 'Holograma flotante de una IA']) assert.ok(mk(bad).errors.some((e) => /visual_viola_brand/.test(e)), bad);
  assert.deepEqual(mk('Fondo crema, azul Atacama, sin robots ni neón, mucho aire').errors.filter((e) => /brand/.test(e)), []);
  assert.deepEqual(mk('Evitar circuitos y estética cyber: composición sobria').errors.filter((e) => /brand/.test(e)), []);
});

ok('no convertir todo en «hero»: se avisa si el visual parece una landing o repite composición', () => {
  const e = ed.edEvaluate(piece({ format: 'imagen', visual: { need: 'editorial_image', rationale: 'x', composition: 'texto-izquierda' }, visual_direction: 'Hero de landing con texto grande a la izquierda' }), { recentVisuals: ['texto-izquierda', 'Texto-Izquierda'] });
  assert.ok(e.warnings.some((w) => /parece_un_hero/.test(w))); assert.ok(e.warnings.some((w) => /composicion_repetida/.test(w)));
});

// ---------------------------------------------------------------- Editorial Decision
const WEEK = (o) => ({ target: 5, min: 4, max: 6, done: 1, in_review: 1, coverage: 2, covered: false, runway_days: 2, runway_max: 5, state_label: 'Falta contenido', ...(o || {}) });
const SIG = { topic: 'Conectar a Hermes con herramientas reales', summary: 'Un agente necesita herramientas, datos, permisos y supervisión', kind: 'work' };

ok('una señal produce propuestas DISTINTAS por canal (tipo, formato, ángulo, visual y CTA no se copian)', () => {
  const r = ed.edPlan({ signal: SIG, week: WEEK({ coverage: 0, done: 0, in_review: 0 }), pending: 0, max_pending: 6, recent: [], resources: [], now: Date.parse('2026-10-07T15:00:00Z') });
  assert.equal(r.publish, true); assert.equal(r.proposals.length, 3);
  const [a, b, c] = r.proposals;
  assert.deepEqual([a.channel, b.channel, c.channel], ['linkedin_profile', 'linkedin_page', 'instagram']);
  assert.equal(new Set(r.proposals.map((x) => x.angle_directive)).size, 3); assert.equal(new Set(r.proposals.map((x) => x.format)).size >= 2, true);
  assert.equal(a.format, 'texto'); assert.equal(a.visual.need, 'none'); assert.equal(a.cta_mode, 'none'); assert.match(a.angle_directive, /primera persona|Christian/);
  assert.equal(c.format, 'carrusel'); assert.equal(c.visual.need, 'carousel'); assert.match(c.angle_directive, /6–7 slides/); assert.ok(c.length_chars[1] <= 600);
  assert.match(b.angle_directive, /Autoridad de empresa/); assert.ok(['educational', 'framework', 'process', 'comparison'].includes(b.editorial_type));
});

ok('LinkedIn Atacama prioriza autoridad y LinkedIn Christian parte de la experiencia: una noticia no genera post personal inventado', () => {
  const r = ed.edPlan({ signal: { topic: 'Claude Managed Agents agrega política auto', kind: 'news' }, week: WEEK(), pending: 0, max_pending: 6, recent: [], resources: [], now: Date.parse('2026-10-07T15:00:00Z') });
  assert.ok(!r.proposals.some((x) => x.channel === 'linkedin_profile'));
  assert.equal(r.proposals[0].channel, 'linkedin_page'); assert.equal(r.proposals[0].editorial_type, 'news_explainer'); assert.equal(r.proposals[0].cta_mode, 'none');
});

ok('NO publicar: semana cubierta, cola llena o tema ya cubierto; las excepciones son explícitas', () => {
  const now = Date.parse('2026-10-07T15:00:00Z');
  let r = ed.edPlan({ signal: SIG, week: WEEK({ covered: true, coverage: 5, done: 4, in_review: 1 }), pending: 1, max_pending: 6, recent: [], now });
  assert.equal(r.publish, false); assert.match(r.reason, /semana está cubierta/); assert.deepEqual(r.proposals, []);
  r = ed.edPlan({ signal: SIG, week: WEEK(), pending: 6, max_pending: 6, recent: [], now });
  assert.equal(r.publish, false); assert.match(r.reason, /cola de revisión está llena/);
  r = ed.edPlan({ signal: SIG, week: WEEK(), pending: 1, max_pending: 6, recent: [{ channel: 'linkedin_page', topic: 'Conectar a Hermes con herramientas reales', status: 'in_review', editorial_type: 'educational' }], now });
  assert.equal(r.publish, false); assert.match(r.reason, /pieza parecida/);
  r = ed.edPlan({ signal: { ...SIG, urgent: true, kind: 'news' }, week: WEEK({ covered: true, coverage: 5 }), pending: 1, max_pending: 6, recent: [], now });
  assert.equal(r.publish, true); assert.equal(r.urgency, 'urgent'); assert.equal(r.window_hours, 24);
  r = ed.edPlan({ signal: { ...SIG, urgent: true }, week: WEEK({ covered: true, coverage: 6 }), pending: 1, max_pending: 6, recent: [], now });
  assert.equal(r.publish, false); assert.match(r.reason, /máximo normal/);
  r = ed.edPlan({ signal: SIG, week: WEEK({ covered: true, coverage: 5 }), pending: 6, max_pending: 6, recent: [], explicit: true, now });
  assert.equal(r.publish, true); assert.ok(r.notes.some((x) => /orden explícita/.test(x)));
});

ok('el espacio de la semana limita cuántas cuentas se cubren; el recurso existente se reutiliza en vez de crear otro', () => {
  const now = Date.parse('2026-10-07T15:00:00Z');
  const r = ed.edPlan({ signal: { topic: 'Qué proceso automatizar primero', kind: 'evergreen' }, week: WEEK({ coverage: 4, done: 3, in_review: 1 }), pending: 1, max_pending: 6, recent: [], resources: [{ id: 'r1', slug: 'que-proceso-automatizar-primero', name: 'Qué proceso de tu empresa automatizar primero' }], now });
  assert.equal(r.proposals.length, 1); assert.ok(r.notes.some((x) => /solo deja espacio/.test(x)));
  const page = r.proposals[0]; assert.equal(page.channel, 'linkedin_page'); assert.equal(page.cta_mode, 'resource_link'); assert.equal(page.resource.slug, 'que-proceso-automatizar-primero');
  assert.equal(r.urgency, 'evergreen'); assert.equal(r.window_hours, 72);
});

ok('variedad: no repite el mismo tipo editorial que las últimas piezas de esa cuenta', () => {
  const now = Date.parse('2026-10-07T15:00:00Z');
  const r = ed.edPlan({ signal: { topic: 'Cómo se conecta un agente a un CRM', kind: 'integration' }, week: WEEK(), pending: 0, max_pending: 6, recent: [{ channel: 'linkedin_page', editorial_type: 'educational', topic: 'otro', status: 'published' }], now });
  assert.notEqual(r.proposals.find((x) => x.channel === 'linkedin_page').editorial_type, 'educational');
});

console.log(n + ' ok');
