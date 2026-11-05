import assert from 'node:assert/strict';
import fs from 'node:fs';
import { storyHtml, STORY_TEMPLATE_NAMES, DEMO_STORIES } from './story-templates.mjs';
import { evaluatePiece } from './engine-core.mjs';

let n = 0;
const ok = (name, fn) => { try { fn(); n++; } catch (e) { console.error('FAIL', name, '\n', e.stack.split('\n').slice(0, 4).join('\n')); process.exitCode = 1; } };
const hist = JSON.parse(fs.readFileSync(new URL('./examples/instagram-historia.piece.json', import.meta.url), 'utf8'));

ok('hay una plantilla de demostración por cada plantilla y todas generan HTML 1080×1920 con la marca', () => {
  assert.deepEqual(Object.keys(DEMO_STORIES).sort(), [...STORY_TEMPLATE_NAMES].sort());
  for (const [name, st] of Object.entries(DEMO_STORIES)) {
    const h = storyHtml(st);
    assert.match(h, /width: ?1080px; ?height: ?1920px/, name); assert.match(h, /ATACAMALABS\.CL/, name); assert.match(h, /data:image\/svg\+xml;base64,/, name);
    assert.ok(!/#000\b|#000000|black/i.test(h.replace(/base64,[A-Za-z0-9+/=]+/g, '')), name + ': sin negro');
  }
});

ok('las plantillas del renderer y del validador del motor coinciden (el motor acepta exactamente las que se saben dibujar)', () => {
  for (const name of STORY_TEMPLATE_NAMES) {
    const p = JSON.parse(JSON.stringify(hist)); p.story = { ...DEMO_STORIES[name] };
    const r = evaluatePiece(p);
    assert.ok(!r.errors.includes('story_template_invalida'), name + ' → ' + r.errors.join(','));
  }
  const bad = JSON.parse(JSON.stringify(hist)); bad.story.template = 'otra';
  assert.ok(evaluatePiece(bad).errors.includes('story_template_invalida'));
  assert.throws(() => storyHtml({ template: 'otra', title: 'x' }), /desconocida/);
});

ok('el texto se escapa (sin inyección de HTML) y *palabra* es énfasis; el título se parte con | en «pregunta»', () => {
  const h = storyHtml({ template: 'dolor', title: '<img src=x onerror=alert(1)> *fuerte*', body: 'a & b', pill: '<b>x</b>' });
  assert.ok(!h.includes('<img src=x')); assert.match(h, /&lt;img src=x/); assert.match(h, /<em>fuerte<\/em>/); assert.match(h, /a &amp; b/); assert.ok(!h.includes('<b>x</b>'));
  const q = storyHtml({ template: 'pregunta', title: 'Arriba | Abajo' });
  assert.ok(q.indexOf('Arriba') < q.indexOf('Abajo') && q.indexOf('Arriba') < q.indexOf('top:960px'));
});

ok('chat: respeta el orden y el lado de cada mensaje; recurso: la palabra clave va en mayúscula', () => {
  const h = storyHtml(DEMO_STORIES.chat);
  assert.ok(h.indexOf('msg in') < h.indexOf('msg out')); assert.equal((h.match(/class="msg out"/g) || []).length, 2);
  assert.match(storyHtml(DEMO_STORIES.recurso), /Comenta «CHECKLIST»/);
});

ok('usa solo logos oficiales de public/brand (nada de logos reconstruidos) y fuentes DM Sans', () => {
  const src = fs.readFileSync(new URL('./story-templates.mjs', import.meta.url), 'utf8');
  assert.match(src, /logo-horizontal\.svg/); assert.match(src, /DMSans-latin-wght\.woff2/); assert.ok(!/<svg[^>]*>\s*<path[^>]*ATACAMA/i.test(src));
});

console.log(n + ' ok');
