import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as g from './growth-core.mjs';
import { evaluatePiece } from './engine-core.mjs';

let n = 0;
const ok = (name, fn) => { try { fn(); n++; } catch (e) { console.error('FAIL', name, '\n', e.stack.split('\n').slice(0, 4).join('\n')); process.exitCode = 1; } };

ok('Governor: bajo el tope todo pasa; con la cola llena lo autónomo se bloquea y lo explícito pasa con advertencia', () => {
  assert.deepEqual(g.growthGovernor({ pending: 5, max: 6, origin: 'autonomous' }), { allowed: true, warning: null, reason: null, pending: 5, max: 6, origin: 'autonomous' });
  const blocked = g.growthGovernor({ pending: 6, max: 6, origin: 'autonomous' }); assert.equal(blocked.allowed, false); assert.equal(blocked.reason, 'cola_llena');
  const forced = g.growthGovernor({ pending: 9, max: 6, origin: 'explicit' }); assert.equal(forced.allowed, true); assert.equal(forced.warning, 'cola_llena_por_orden_explicita');
  assert.equal(g.growthGovernor({ pending: 6, max: 6, origin: 'founder_interview' }).allowed, true);
});
ok('Governor: tope por defecto 6, origen desconocido = explícito (nunca bloquea por error), valores raros', () => {
  assert.equal(g.growthGovernor({ pending: 6 }).max, 6); assert.equal(g.growthGovernor({ pending: 6 }).allowed, true); assert.equal(g.growthGovernor({ pending: 6, origin: 'otro' }).origin, 'explicit');
  assert.equal(g.growthGovernor({ pending: 'x', max: 'y', origin: 'autonomous' }).allowed, true); assert.equal(g.growthGovernor().pending, 0);
});
const R = [
  { id: '1', slug: 'proceso-primero', name: 'Qué proceso de tu empresa automatizar primero', topic: 'priorización de automatización', problem: 'No sabes qué proceso automatizar primero y terminas automatizando lo que no importa', audience: 'dueños de pymes', status: 'active', created_at: '2026-10-08' },
  { id: '2', slug: 'checklist-whatsapp', name: 'Checklist de WhatsApp Business', topic: 'whatsapp', problem: 'Quieres conectar WhatsApp a tu CRM sin perder mensajes', status: 'active', created_at: '2026-10-01' },
  { id: '3', slug: 'borrador', name: 'Borrador interno de automatización', topic: 'automatización', problem: 'Todavía en borrador sin publicar nada aún', status: 'draft' },
];
ok('Recursos: ranking por tema/problema, ignora borradores y retirados, sin consulta devuelve activos', () => {
  const r = g.growthResourceRank(R, 'qué proceso automatizar primero');
  assert.equal(r[0].slug, 'proceso-primero'); assert.ok(!r.some((x) => x.slug === 'borrador'));
  assert.equal(g.growthResourceRank(R, 'whatsapp crm')[0].slug, 'checklist-whatsapp');
  assert.equal(g.growthResourceRank(R, 'contabilidad tributaria').length, 0);
  assert.equal(g.growthResourceRank(R, '').length, 2); assert.equal(g.growthResourceRank(R, 'automatización', { includeDraft: true }).length, 2);
});
const good = { slug: 'proceso-primero', name: 'Qué proceso automatizar primero', type: 'checklist', topic: 'priorización', problem: 'No sabes qué proceso automatizar primero en tu empresa', url: 'https://atacamalabs.cl/recursos/proceso-primero' };
ok('Recurso: válido, normaliza y exige URL propia, slug, tipo y qué problema resuelve', () => {
  const v = g.growthValidateResource(good); assert.ok(v.ok, v.errors.join()); assert.equal(v.value.cta_mode, 'resource_link'); assert.equal(v.value.status, 'draft');
  const bad = g.growthValidateResource({ ...good, slug: 'Mal Slug', type: 'pdf', problem: 'corto', url: 'http://x.com/a', cta_mode: 'comment_keyword' });
  assert.deepEqual(bad.errors.sort(), ['cta_mode_invalido', 'problema_debe_describir_que_resuelve_20_400', 'slug_invalido', 'tipo_invalido', 'url_https_obligatoria'].sort());
  assert.ok(g.growthValidateResource({ ...good, url: 'https://otro.com/x' }).errors.includes('url_fuera_de_atacamalabs_cl'));
  assert.ok(g.growthValidateResource({ ...good, url: 'https://otro.com/x', metadata: { external: true } }).ok);
});
ok('UTM: atribución por canal, recurso y pieza; conserva query previa; sin PII', () => {
  assert.equal(g.growthUtmUrl('https://atacamalabs.cl/recursos/x', { channel: 'linkedin_page', slug: 'x', ideaKey: 'ab12cd34' }), 'https://atacamalabs.cl/recursos/x?utm_source=linkedin&utm_medium=organic_social&utm_campaign=x&utm_content=ab12cd34');
  assert.match(g.growthUtmUrl('https://a.cl/r?x=1#top', { channel: 'instagram', slug: 'y' }), /^https:\/\/a\.cl\/r\?x=1&utm_source=instagram&utm_medium=organic_social&utm_campaign=y$/);
});
const intel = { run_id: 'intel-20261008-1300', competitors: [{ slug: 'vambe', pages_read: ['https://vambe.ai/blog'], recent_topics: ['agentes de ventas'], hooks: ['¿Pierdes ventas por no responder?'] }], saturated_topics: ['agentes 24/7'], gaps: ['costos reales de implementar'], own_angles: [{ angle: 'Cuánto cuesta realmente poner un agente en producción', why: 'nadie muestra el costo total', channel_suggestion: 'linkedin_page' }] };
ok('Inteligencia orgánica: exige páginas leídas, huecos/ángulos propios con porqué; recorta y normaliza', () => {
  const v = g.growthNormIntel(intel); assert.ok(v.ok, v.errors.join()); assert.equal(v.value.competitors[0].pages_read.length, 1); assert.equal(v.value.own_angles[0].channel_suggestion, 'linkedin_page');
  assert.ok(g.growthNormIntel({ ...intel, competitors: [{ slug: 'vambe', pages_read: [] }] }).errors.includes('competidor_sin_paginas_leidas:vambe'));
  assert.ok(g.growthNormIntel({ ...intel, gaps: [], own_angles: [] }).errors.includes('sin_huecos_ni_angulos_propios'));
  assert.ok(g.growthNormIntel({ ...intel, own_angles: [{ angle: 'x', why: '' }] }).errors.includes('angulo_propio_sin_porque'));
  assert.ok(g.growthNormIntel({}).errors.includes('sin_competidores')); assert.ok(g.growthNormIntel(null).errors.includes('run_id_obligatorio'));
  const big = g.growthNormIntel({ ...intel, gaps: Array.from({ length: 30 }, (_, i) => 'hueco ' + i) }); assert.equal(big.value.gaps.length, 10);
});
ok('Founder: reutiliza una entrevista abierta reciente; si no, la pregunta de mayor prioridad; nada disponible = null', () => {
  const now = Date.parse('2026-10-08T12:00:00Z');
  const open = { id: 'i1', status: 'asked', asked_at: '2026-10-07T12:00:00Z' };
  assert.equal(g.growthPickQuestion([], open, now).reuse, true);
  assert.equal(g.growthPickQuestion([{ id: 'q1', status: 'available', priority: 5 }, { id: 'q2', status: 'available', priority: 9 }, { id: 'q3', status: 'used', priority: 10 }], { ...open, asked_at: '2026-10-01T00:00:00Z' }, now).question.id, 'q2');
  assert.equal(g.growthPickQuestion([], null, now).question, null); assert.equal(g.growthPickQuestion(undefined, null, now).reuse, false);
});
ok('Founder: la respuesta necesita sustancia (120–8000 caracteres)', () => {
  assert.equal(g.growthCheckAnswer('corta').ok, false); assert.ok(g.growthCheckAnswer('a'.repeat(200)).ok); assert.equal(g.growthCheckAnswer('a'.repeat(9000)).ok, false); assert.equal(g.growthCheckAnswer(null).ok, false);
});
const ANSWER = 'Decidí que el correo comercial no se envía solo: cada mensaje lo apruebo yo con un código. Hace dos días vi que 4 correos salieron desde el buzón sin pasar por Atacama OS y entendí que el control no podía depender de mi memoria.';
const pieceWith = (...quotes) => ({ sources: [{ kind: 'real_work', title: 'Entrevista', verified: true, evidence: quotes.map((quote) => ({ quote })) }] });
ok('Founder anti-invención: toda cita debe estar literal en la respuesta y debe haber al menos una', () => {
  assert.ok(g.growthFounderEvidence(ANSWER, pieceWith('cada mensaje lo apruebo yo con un código')).ok);
  assert.ok(g.growthFounderEvidence(ANSWER, pieceWith('Cada mensaje lo apruebo YO con un código!', 'el control no podía depender de mi memoria')).ok, 'tolera mayúsculas y signos');
  const inv = g.growthFounderEvidence(ANSWER, pieceWith('cada mensaje lo apruebo yo con un código', 'perdimos un cliente por culpa del bot')); assert.equal(inv.ok, false); assert.equal(inv.reason, 'founder_cita_no_esta_en_la_respuesta'); assert.equal(inv.unmatched.length, 1);
  assert.equal(g.growthFounderEvidence(ANSWER, pieceWith()).reason, 'founder_sin_cita_de_la_respuesta'); assert.equal(g.growthFounderEvidence(ANSWER, { sources: [] }).ok, false);
  assert.equal(g.growthFounderEvidence(ANSWER, pieceWith('correo')).ok, false, 'citas demasiado cortas no cuentan como evidencia');
});
ok('el ejemplo de pieza de Founder Interview pasa el validador y sus citas están literales en una respuesta', () => {
  const ex = JSON.parse(fs.readFileSync(new URL('./examples/founder-interview.piece.json', import.meta.url), 'utf8'));
  const ev = evaluatePiece(ex, {}); assert.ok(ev.ok, ev.errors.join()); assert.equal(ev.decision, 'candidate');
  assert.ok(g.growthFounderEvidence(ANSWER, ex).ok, 'las dos citas del ejemplo están en la respuesta de muestra');
  assert.equal(g.growthFounderEvidence('Otra respuesta distinta sin esas frases, de más de cuarenta caracteres', ex).ok, false);
});
ok('autocontenido: sin imports ni constantes de módulo (se incrusta en n8n)', () => {
  const fns = Object.values(g).filter((f) => typeof f === 'function'); const src = fns.map((f) => f.toString()).join('\n');
  assert.ok(!/\bimport\b|\brequire\(/.test(src)); const lib = new Function(src + '\nreturn { growthGovernor, growthFounderEvidence };')(); assert.equal(lib.growthGovernor({ pending: 7, origin: 'autonomous' }).allowed, false);
});
console.log(n + ' ok');
