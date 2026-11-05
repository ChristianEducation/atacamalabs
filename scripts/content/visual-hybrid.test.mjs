import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildArtPrompt, overlayHtml, hybridJobs, renderHybrid, LAYOUTS, HYBRID_MODEL } from './visual-hybrid.mjs';
import { evaluatePiece } from './engine-core.mjs';

let n = 0;
const ok = async (name, fn) => { try { await fn(); n++; } catch (e) { console.error('FAIL', name, '\n', e.stack.split('\n').slice(0, 4).join('\n')); process.exitCode = 1; } };
const ILU = JSON.parse(fs.readFileSync(new URL('./examples/instagram-historia-ilustrada.piece.json', import.meta.url), 'utf8'));
const clone = (o) => JSON.parse(JSON.stringify(o));

await ok('el modelo de ilustración es GPT Image 2.5 y hay formato historia 9:16 y publicación 4:5', () => {
  assert.equal(HYBRID_MODEL, 'gpt_image_2_5'); assert.equal(LAYOUTS.historia.aspect, '9:16'); assert.equal(LAYOUTS.post.aspect, '4:5');
});

await ok('prompt de la ilustración: estilo de marca, espacio libre para el titular, textos exactos y NADA de logos/titulares en la imagen', () => {
  const p = buildArtPrompt(ILU.story.art, 'historia');
  assert.match(p, /9:16/); assert.match(p, /top 28%/); assert.match(p, /"Cotización_Camioneta\.pdf"/); assert.match(p, /EXACTLY/);
  assert.match(p, /no brand logos, no headline/); assert.match(p, /NO decorative icons/); assert.ok(!/llama/i.test(p), 'sin llamita si no se pide');
});

await ok('con llamita: referencia del personaje, expresión pedida y regla de anatomía (4 patas)', () => {
  const p = buildArtPrompt({ scene: 'x'.repeat(40), character: 'llamita', character_action: 'durmiendo abrazando un celular' }, 'historia');
  assert.match(p, /plush llama/); assert.match(p, /durmiendo abrazando un celular/); assert.match(p, /exactly FOUR legs/);
});

await ok('composición: titular con *énfasis* azul, **negrita** en el apoyo, logo e isotipo OFICIALES, texto escapado', () => {
  const h = overlayHtml({ layout: 'historia', artFile: 'arte.png', title: 'Hola <b>x</b> *azul*', pill: 'Pastilla', body: 'Un **agente** responde' });
  assert.match(h, /<em>azul<\/em>/); assert.match(h, /<b>agente<\/b>/); assert.ok(!h.includes('<b>x</b>')); assert.match(h, /&lt;b&gt;x/);
  assert.equal((h.match(/data:image\/svg\+xml;base64,/g) || []).length, 7, 'logo + 6 isotipos desde public/brand');
  assert.match(h, /ATACAMALABS\.CL/); assert.match(h, /width:1080px;height:1920px/);
  const post = overlayHtml({ layout: 'post', artFile: 'a.png', title: 'T', slide: '02 / 05' });
  assert.match(post, /width:1080px;height:1350px/); assert.match(post, /02 \/ 05/); assert.ok(!/class="pill"/.test(post));
});

await ok('qué se ilustra: historia ilustrada → 1; carrusel → SOLO las láminas con art (con su número); sin art → nada', () => {
  assert.equal(hybridJobs(ILU).length, 1); assert.equal(hybridJobs(ILU)[0].layout, 'historia');
  const car = { format: 'carrusel', slides: [{ layout: 'cover', title: 'a', art: { scene: 'x'.repeat(40) } }, { layout: 'content', title: 'b' }, { layout: 'cta', title: 'c', art: { scene: 'y'.repeat(40) } }] };
  const j = hybridJobs(car); assert.deepEqual(j.map((x) => x.index), [0, 2]); assert.equal(j[1].slide, '03 / 03'); assert.equal(j[0].layout, 'post');
  assert.equal(hybridJobs({ format: 'historia', story: { template: 'dolor', title: 'x' } }).length, 0);
});

await ok('renderHybrid llama al generador UNA vez por ilustración, con referencias de llamita solo si hay llamita, y falla claro sin art', async () => {
  const calls = [];
  const piece = clone(ILU); piece.story.art.character = 'llamita';
  const dir = fs.mkdtempSync((process.env.TEMP || '/tmp') + '/vh-');
  const deps = { llamaRefs: ['ref.png'], generate: async (prompt, aspect, file, refs) => { calls.push({ aspect, refs, prompt }); fs.copyFileSync(new URL('../../public/brand/og-share.png', import.meta.url), file); return file; } };
  const out = await renderHybrid(piece, dir, deps);
  assert.equal(calls.length, 1); assert.equal(calls[0].aspect, '9:16'); assert.deepEqual(calls[0].refs, ['ref.png']); assert.ok(fs.existsSync(out[0].file));
  await assert.rejects(renderHybrid({ format: 'historia', story: { template: 'dolor', title: 'x' } }, dir, deps), /no trae ninguna ilustración/);
});

await ok('validador: historia «ilustrada» exige art con escena; textos de la escena ≤ 8 y cortos; personaje solo llamita; láminas con art también se validan', () => {
  assert.equal(evaluatePiece(ILU).decision, 'candidate', JSON.stringify(evaluatePiece(ILU).errors));
  const e = (mut) => { const x = clone(ILU); mut(x); return evaluatePiece(x).errors; };
  assert.ok(e((x) => { delete x.story.art; }).includes('story_ilustrada_requiere_art'));
  assert.ok(e((x) => { x.story.art.scene = 'corta'; }).includes('story_art_escena_de_30_a_1500_caracteres'));
  assert.ok(e((x) => { x.story.art.texts = Array(9).fill('t'); }).includes('story_art_textos_max_8_de_120'));
  assert.ok(e((x) => { x.story.art.character = 'robot'; }).includes('story_art_personaje_invalido'));
  assert.ok(e((x) => { x.story.kind = 'REPOST_FEED'; }).includes('story_kind_invalido_usa_SUPPORT_STORY_u_ORIGINAL_STORY'));
  assert.ok(e((x) => { x.story.art.texts = ['Ahorra 40% del tiempo']; }).some((m) => m.startsWith('cifra_sin_respaldo')), 'una cifra dentro de la escena también necesita respaldo');
  const car = JSON.parse(fs.readFileSync(new URL('./examples/instagram-evergreen-test.piece.json', import.meta.url), 'utf8'));
  car.slides[0].art = { scene: 'mal' };
  assert.ok(evaluatePiece(car).errors.includes('slide_1_art_escena_de_30_a_1500_caracteres'));
});

console.log(n + ' ok');
