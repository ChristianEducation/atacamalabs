import assert from 'node:assert/strict';
import * as rf from './resource-factory-core.mjs';
import { growthValidateResource, growthUtmUrl } from './growth-core.mjs';
import { evaluatePiece } from './engine-core.mjs';

let n = 0;
const ok = (name, fn) => { try { fn(); n++; } catch (e) { console.error('FAIL', name, '\n', e.stack.split('\n').slice(0, 4).join('\n')); process.exitCode = 1; } };

const ROW = (o) => ({ id: 'r-' + (o && o.slug), status: 'active', cta_mode: 'resource_link', url: 'https://atacamalabs.cl/recursos/' + (o && o.slug), created_at: '2026-10-08T00:00:00Z', ...(o || {}) });
const MAPA = ROW({ slug: 'que-proceso-automatizar-primero', name: 'Qué proceso de tu empresa automatizar primero', type: 'checklist', topic: 'elegir el primer proceso a automatizar', problem: 'Cinco criterios para elegir el primer proceso a automatizar en una pyme', audience: 'pymes' });

ok('15 formatos prioritarios; cada uno se mapea a un type permitido hoy por la tabla (sin migración)', () => {
  const f = rf.rfFormats();
  assert.equal(Object.keys(f).length, 15);
  for (const [k, v] of Object.entries(f)) { assert.ok(['guia', 'checklist', 'plantilla', 'diagnostico', 'prompt', 'documento', 'comparativa', 'caso', 'herramienta', 'pagina'].includes(v.type), k); assert.ok(v.fits.length && ['low', 'medium', 'high'].includes(v.effort), k); }
  for (const k of ['mapa_de_procesos', 'checklist_interactivo', 'mini_diagnostico', 'calculadora', 'comparador', 'framework', 'canvas', 'plantilla', 'arquitectura_visual', 'guia_corta', 'caso_desmontado', 'mini_auditoria', 'demo', 'recurso_interactivo', 'herramienta_web']) assert.ok(f[k], k);
});

ok('backlog inicial: los 6 candidatos del plan, todos válidos con el validador existente y con diferenciador real', () => {
  const b = rf.rfBacklog();
  assert.equal(b.length, 6);
  assert.deepEqual(b.map((x) => x.slug), ['que-proceso-automatizar-primero', 'agente-vs-automatizacion-vs-chatbot', 'calculadora-trabajo-manual', 'canvas-mapear-un-proceso', 'checklist-antes-de-automatizar', 'arquitectura-minima-de-un-agente']);
  const f = rf.rfFormats();
  for (const c of b) {
    const v = growthValidateResource({ slug: c.slug, name: c.name, type: f[c.format].type, topic: c.topic, audience: c.audience, problem: c.problem, cta_mode: c.cta_mode, cta_copy: c.cta_copy, url: c.url, status: 'draft', metadata: { format: c.format, differentiator: c.differentiator } });
    assert.equal(v.ok, true, c.slug + ' ' + JSON.stringify(v.errors));
    const q = rf.rfValidateNew({ ...v.value });
    assert.deepEqual(q.errors, [], c.slug + ' ' + JSON.stringify(q.errors));
  }
  assert.equal(new Set(b.map((x) => x.slug)).size, 6);
});

ok('calidad de un recurso nuevo: sin formato, sin diferenciador, ebook/PDF genérico o solo-para-CTA se rechazan', () => {
  const good = { name: 'Calculadora de trabajo manual', problem: 'Calcula horas y costo del trabajo repetitivo en una pyme', type: 'herramienta', status: 'draft', metadata: { format: 'calculadora', differentiator: 'Devuelve el resultado sin pedir correo, con los datos de quien la usa' } };
  assert.deepEqual(rf.rfValidateNew(good).errors, []);
  assert.ok(rf.rfValidateNew({ ...good, metadata: {} }).errors.some((e) => /formato_de_recurso_obligatorio/.test(e)));
  assert.ok(rf.rfValidateNew({ ...good, metadata: { format: 'calculadora' } }).errors.some((e) => /diferenciador_obligatorio/.test(e)));
  assert.ok(rf.rfValidateNew({ ...good, metadata: { format: 'inventado', differentiator: 'x'.repeat(30) } }).errors.some((e) => /formato_de_recurso_invalido/.test(e)));
  assert.ok(rf.rfValidateNew({ ...good, name: 'Ebook gratis de automatización' }).errors.some((e) => /generico/.test(e)));
  assert.ok(rf.rfValidateNew({ ...good, type: 'documento' }).errors.some((e) => /documento/.test(e)));
  assert.ok(rf.rfValidateNew({ ...good, metadata: { ...good.metadata, only_for_cta: true } }).errors.some((e) => /solo_para_tener_un_cta/.test(e)));
});

ok('reutiliza un recurso existente en vez de crear otro (mismo problema)', () => {
  const r = rf.rfAssess({ topic: 'Qué proceso automatizar primero en mi empresa', summary: 'elegir el primer proceso a automatizar', editorial_type: 'educational', channel: 'linkedin_page' }, [MAPA]);
  assert.equal(r.action, 'reuse'); assert.equal(r.resource.slug, 'que-proceso-automatizar-primero'); assert.match(r.reason, /se reutiliza, no se crea otro/);
});

ok('no duplica: si el recurso ya está en la backlog como borrador, no propone crear otro', () => {
  const draft = ROW({ slug: 'calculadora-trabajo-manual', status: 'draft', name: 'Calculadora de trabajo manual: cuánto te cuesta repetir tareas', type: 'herramienta', topic: 'costo del trabajo manual repetitivo', problem: 'Calcula horas mensuales, costo estimado y potencial de automatización' });
  const r = rf.rfAssess({ topic: 'Cuánto cuesta el trabajo manual repetitivo en tu empresa', summary: 'calcular horas y costo', editorial_type: 'customer_problem', channel: 'linkedin_page' }, [MAPA, draft]);
  assert.equal(r.action, 'backlog'); assert.match(r.reason, /no se duplica/);
});

ok('propone un candidato de la backlog solo si encaja; nunca inventa recursos irrelevantes', () => {
  const prop = rf.rfAssess({ topic: 'Agente, automatización o chatbot: qué necesita tu proceso', summary: 'diferencia entre agente automatización y chatbot', editorial_type: 'comparison', channel: 'linkedin_page' }, [MAPA]);
  assert.equal(prop.action, 'propose'); assert.equal(prop.candidate.slug, 'agente-vs-automatizacion-vs-chatbot'); assert.equal(prop.candidate.type, 'comparativa');
  const irrelevant = rf.rfAssess({ topic: 'Cómo cambió el pricing de una API de modelos', summary: 'nuevo precio por token', editorial_type: 'educational', channel: 'linkedin_page' }, [MAPA]);
  assert.equal(irrelevant.action, 'none'); assert.match(irrelevant.reason, /no se crea uno solo para tener un CTA/);
  for (const t of ['opinion', 'founder', 'build_in_public', 'news_explainer', 'market_signal']) assert.equal(rf.rfAssess({ topic: 'Qué proceso automatizar primero', editorial_type: t }, [MAPA]).action, 'none', t);
});

ok('CTA según intención: sin CTA, recurso directo, DM, diagnóstico y comentario con palabra clave (siempre entrega manual)', () => {
  const act = { id: 'r1', status: 'active', format: 'calculadora' };
  assert.equal(rf.rfCta({ editorial_type: 'opinion', channel: 'linkedin_profile', resource: act }).cta_mode, 'none');
  assert.equal(rf.rfCta({ editorial_type: 'news_explainer', channel: 'linkedin_page' }).cta_mode, 'none');
  assert.equal(rf.rfCta({ editorial_type: 'educational', channel: 'linkedin_page', resource: act }).cta_mode, 'resource_link');
  const ig = rf.rfCta({ editorial_type: 'educational', channel: 'instagram', resource: act });
  assert.equal(ig.cta_mode, 'dm'); assert.match(ig.why, /no enlaza/);
  assert.equal(rf.rfCta({ editorial_type: 'customer_problem', channel: 'linkedin_page' }).cta_mode, 'diagnostic');
  assert.equal(rf.rfCta({ editorial_type: 'case', channel: 'linkedin_page' }).cta_mode, 'dm');
  assert.equal(rf.rfCta({ editorial_type: 'educational', channel: 'linkedin_page' }).cta_mode, 'none');
  const kw = rf.rfCta({ editorial_type: 'educational', channel: 'linkedin_profile', resource: act, allow_keyword: true });
  assert.equal(kw.cta_type, 'comment_keyword'); assert.equal(kw.manual_delivery, true); assert.match(kw.why, /MANUAL/);
  assert.notEqual(rf.rfCta({ editorial_type: 'educational', channel: 'linkedin_page', resource: act, allow_keyword: true }).cta_type, 'comment_keyword');
  assert.notEqual(rf.rfCta({ editorial_type: 'educational', channel: 'linkedin_profile', resource: { id: 'r2', status: 'active', format: 'guia_corta' }, allow_keyword: true }).cta_type, 'comment_keyword');
});

ok('la pieza queda asociada al recurso con metadata y UTM correctos (canal, recurso, pieza) y el CTA es coherente', () => {
  const url = growthUtmUrl(MAPA.url, { channel: 'linkedin_page', slug: MAPA.slug, ideaKey: 'abc12345' });
  assert.equal(url, 'https://atacamalabs.cl/recursos/que-proceso-automatizar-primero?utm_source=linkedin&utm_medium=organic_social&utm_campaign=que-proceso-automatizar-primero&utm_content=abc12345');
  assert.match(growthUtmUrl(MAPA.url, { channel: 'instagram', slug: 'x' }), /utm_source=instagram/);
  const piece = { version: 1, channel: 'linkedin_page', format: 'texto', category: 'Educativo', editorial_type: 'educational', visual: { need: 'none', rationale: 'Texto solo' }, topic: 'Cómo elegir el primer proceso a automatizar', angle: 'Cinco criterios simples', audience: 'Dueños de pymes', hook: 'Casi todas las empresas tienen diez procesos candidatos', body: 'Elegir el primero cuesta más que automatizarlo. Estos cinco criterios ordenan la lista: se repite, tiene reglas, usa pocas herramientas, el error cuesta poco y se puede medir. Mide cada proceso con ellos antes de decidir nada y quédate con el que más puntos tenga.', rationale: 'Útil y propio', sources: [{ kind: 'real_work', title: 'Checklist propio', url: 'https://atacamalabs.cl/recursos/que-proceso-automatizar-primero', verified: true, evidence: [] }], claims: [{ text: 'Atacama Labs publicó un checklist', external: false }], factors: { relevance: 9, audience_fit: 8, novelty: 7, evidence: 8, utility: 9, clarity: 8, conversation: 7, differentiation: 8, non_repetition: 8 }, resource_id: '11111111-1111-4111-8111-111111111111', cta_mode: 'resource_link', cta: { type: 'link', text: 'Armamos un checklist para esto: {{resource_url}}' } };
  const r = evaluatePiece(piece, { resource: { id: piece.resource_id }, resourceChecked: true });
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  assert.deepEqual(rf.rfCtaCheck(piece), { warnings: [], penalties: 0 });
  const bad = rf.rfCtaCheck({ ...piece, editorial_type: 'opinion' });
  assert.ok(bad.warnings.some((w) => /cta_comercial_en_pieza_de_opinion/.test(w))); assert.ok(bad.penalties > 0);
  assert.ok(rf.rfCtaCheck({ ...piece, channel: 'instagram' }).warnings.some((w) => /instagram_no_enlaza/.test(w)));
});

ok('autoridad vs atención: conversación y leads pesan más que likes; lo no medible se declara', () => {
  const pieces = [
    { id: 'a', topic: 'Pieza viral', channel: 'linkedin_page', status: 'published', editorial_type: 'news_explainer' },
    { id: 'b', topic: 'Pieza con conversación', channel: 'linkedin_profile', status: 'published', editorial_type: 'build_in_public' },
    { id: 'c', topic: 'Pieza con recurso y lead', channel: 'linkedin_page', status: 'published', editorial_type: 'educational', resource_id: 'r1' },
    { id: 'd', topic: 'Sin métricas todavía', channel: 'linkedin_page', status: 'published', editorial_type: 'educational' },
    { id: 'e', topic: 'Test', channel: 'linkedin_page', status: 'published', is_test: true },
  ];
  const metrics = [
    { content_piece_id: 'a', metric_window: '72h', likes: 40, comments: 1, shares: 0 },
    { content_piece_id: 'b', metric_window: '24h', likes: 3, comments: 4, shares: 1 }, { content_piece_id: 'b', metric_window: '7d', likes: 6, comments: 8, shares: 2 },
    { content_piece_id: 'c', metric_window: '7d', likes: 5, comments: 0, shares: 0 },
  ];
  const r = rf.rfAuthority({ pieces, metrics, resources: [{ id: 'r1', slug: 'que-proceso-automatizar-primero' }], leads: [{ source_page: '/recursos/que-proceso-automatizar-primero', campaign: null }, { source_page: 'home', campaign: 'que-proceso-automatizar-primero' }] });
  const by = Object.fromEntries(r.rows.map((x) => [x.id, x]));
  assert.equal(by.a.klass, 'atencion'); assert.equal(by.b.klass, 'autoridad'); assert.equal(by.c.klass, 'autoridad'); assert.equal(by.c.leads, 2); assert.equal(by.d.klass, 'sin_datos'); assert.ok(!by.e);
  assert.equal(by.b.attention, 16); assert.equal(by.b.conversation, 22);
  assert.equal(r.pieces_measured, 3); assert.equal(r.pieces_without_data, 1); assert.equal(r.attention_only, 1); assert.equal(r.authority, 2);
  assert.equal(r.top_authority[0].title, 'Pieza con recurso y lead');
  assert.ok(r.learn.some((l) => /generan más conversación/.test(l))); assert.ok(r.learn.some((l) => /llamaron la atención/.test(l)));
  assert.ok(r.blind_spots.some((b) => /guardados, clics y visitas/.test(b))); assert.ok(r.blind_spots.some((b) => /UTM/.test(b)));
  assert.equal(rf.rfAuthority({}).pieces_measured, 0);
});

console.log(n + ' ok');
