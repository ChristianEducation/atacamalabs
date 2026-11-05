#!/usr/bin/env node
/**
 * Atacama OS · MÉTODO VISUAL OBLIGATORIO (reglas de historias v1.1 §0.3) — historias, imágenes y láminas de carrusel con ilustración.
 *   1) La ILUSTRACIÓN la dibuja GPT Image 2.5 (Higgsfield) a partir de `art.scene` (+ textos cortos exactos dentro de la escena).
 *   2) La COMPOSICIÓN de marca la pone este módulo (nunca el modelo): titular DM Sans 700 con *palabra* en azul, pastilla, panel claro,
 *      logo oficial, URL e isotipo oficial translúcido. Así el texto visible nunca tiene erratas y el logo nunca se reconstruye.
 * Uso: renderHybrid(piece, outDir, { generate }) → [png]. `generate(prompt, aspect, refs)` devuelve la ruta local de la ilustración
 * (ver higgsGenerate: en la VPS pasa por el guardián de créditos /opt/data/scripts/higgs.sh; en el PC por el CLI `higgsfield`).
 *
 *   node scripts/content/visual-hybrid.mjs <pieza.json> [carpeta-salida]      → genera (gasta créditos) y compone
 *   node scripts/content/visual-hybrid.mjs --compose <ilustracion.png> <pieza.json> <salida.png>  → solo compone (sin créditos)
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const HYBRID_MODEL = 'gpt_image_2_5';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const rich = (s) => esc(s).replace(/\*([^*]+)\*/g, '<em>$1</em>').replace(/\n/g, '<br>');
/** Texto de apoyo: **negrita** y *énfasis*. */
const richBody = (s) => esc(s).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/\*([^*]+)\*/g, '<em>$1</em>').replace(/\n/g, '<br>');

/** Formatos de salida: historia 9:16 y publicación/lámina 4:5. */
export const LAYOUTS = {
  historia: { w: 1080, h: 1920, aspect: '9:16', empty: 'Leave the top 28% and the bottom 28% of the canvas completely empty (only the soft background).' },
  post: { w: 1080, h: 1350, aspect: '4:5', empty: 'Leave the top 20% and the bottom 16% of the canvas completely empty (only the soft background).' },
};

/** Prompt de la ilustración: estilo de marca fijo + escena + textos exactos dentro de la escena + llamita (si va) con reglas de anatomía. */
export function buildArtPrompt(art, layoutName) {
  const a = art && typeof art === 'object' ? art : {};
  const L = LAYOUTS[layoutName] || LAYOUTS.historia;
  const lines = [
    `Vertical ${L.aspect} social media illustration, clean premium modern marketing design, bright and sharp, soft studio light, gentle shadows, subtle glass reflections.`,
    'Background: soft Atacama-blue gradient (from #DCE8FC at the top to #B9D0F7 at the bottom) with a very faint square grid. Plain background: NO decorative icons, NO check marks, NO random shapes.',
    L.empty,
    'Scene: ' + String(a.scene || '').trim(),
    'Framing: close-up, the main object fills at least 60% of the width of the canvas; few elements (at most 4-5 cards or bubbles); every piece of text inside the scene must be LARGE and easily legible on a phone screen, never tiny.',
  ];
  const texts = Array.isArray(a.texts) ? a.texts.filter((t) => String(t || '').trim()) : [];
  if (texts.length) lines.push('Text that must appear inside the scene, in Spanish, written EXACTLY like this (crisp and legible, no other text): ' + texts.map((t) => '"' + String(t).trim() + '"').join('; ') + '.');
  if (a.character === 'llamita') lines.push('Include the cute plush llama character from the reference images (fluffy cream wool, brown hooves and ears, big dark glossy eyes, small blue knitted scarf), with this expression and action: ' + String(a.character_action || 'friendly, attentive').trim() + '. Correct anatomy: exactly FOUR legs, two ears, one head, natural proportions.');
  lines.push('Palette: Atacama blue #0F5CED, deep blue #1A3C8E, sky #58A6FF, white and light neutrals. No green messaging app branding, no WhatsApp logo, no brand logos, no headline, no watermark, no robots, no neon, no circuits, no dark background.');
  return lines.join('\n');
}

/** HTML de la composición de marca sobre la ilustración. */
export function overlayHtml({ layout, artFile, title, pill, body, slide, scrim }) {
  const L = LAYOUTS[layout] || LAYOUTS.historia;
  const FONT = pathToFileURL(path.join(ROOT, 'src/app/fonts/DMSans-latin-wght.woff2')).href;
  const b64 = (f) => 'data:image/svg+xml;base64,' + fs.readFileSync(path.join(ROOT, 'public/brand', f)).toString('base64');
  const logo = b64('logo-horizontal.svg'), iso = b64('isotipo-azul.svg');
  const art = pathToFileURL(path.resolve(artFile)).href;
  const story = layout === 'historia';
  const marks = (story ? [[40, 130, 150, -8, .3], [860, 180, 120, 10, .26], [15, 640, 150, 6, .28], [880, 820, 190, -6, .32], [30, 1180, 130, 8, .26], [900, 1290, 140, -10, .3]]
    : [[24, 300, 110, -8, .26], [946, 360, 100, 10, .24], [20, 860, 120, 6, .24], [944, 930, 110, -6, .26]])
    .map(([x, y, w, r, o]) => `<img src="${iso}" style="position:absolute;left:${x}px;top:${y}px;width:${w}px;opacity:${o};transform:rotate(${r}deg)">`).join('');
  const G = story
    ? { art: 'left:0;top:95px;width:1080px;height:1910px', h: 'top:205px;font-size:96px', hMax: 300, pill: 'top:1480px', panel: 'top:1585px;height:600px', body: 'top:1650px', logo: 'top:1778px', url: 'top:1850px' }
    : { art: 'left:150px;top:232px;width:780px;height:975px', h: 'top:56px;font-size:74px', hMax: 160, pill: 'top:1128px', panel: 'top:1208px;height:300px', body: 'top:1060px', logo: 'top:1250px', url: 'top:1300px' };
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>
@font-face{font-family:"DM Sans";src:url("${FONT}") format("woff2");font-weight:100 1000}
*{margin:0;padding:0;box-sizing:border-box} body{width:${L.w}px;height:${L.h}px;position:relative;overflow:hidden;font-family:"DM Sans",sans-serif;color:#0b1e3f;-webkit-font-smoothing:antialiased;background:linear-gradient(180deg,#dce8fc 0%,#c8dbf9 55%,#b9d0f7 100%)}
.art{position:absolute;${G.art};background:url("${art}") center/100% 100% no-repeat;${story ? '-webkit-mask-image:linear-gradient(to bottom,transparent 0,#000 5%,#000 100%)' : '-webkit-mask-image:linear-gradient(to right,transparent 0,#000 9%,#000 91%,transparent 100%),linear-gradient(to bottom,transparent 0,#000 6%,#000 94%,transparent 100%);-webkit-mask-composite:source-in;mask-composite:intersect'}}
.h{position:absolute;left:70px;width:940px;${G.h};text-align:center;font-weight:700;letter-spacing:-.035em;line-height:1.02}
.h em{font-style:normal;color:#0f5ced}
.panel{position:absolute;left:-120px;width:${L.w + 240}px;${G.panel};border-radius:50% 50% 0 0/130px 130px 0 0;background:linear-gradient(180deg,#f6f9ff,#e7effc)}
.pill{position:absolute;left:50%;transform:translateX(-50%);${G.pill};background:#0f5ced;color:#fff;font-weight:600;font-size:${story ? 42 : 34}px;padding:${story ? '24px 56px' : '18px 44px'};border-radius:70px;white-space:nowrap;box-shadow:0 14px 34px rgba(15,92,237,.38)}
.b{position:absolute;left:110px;width:860px;${G.body};text-align:center;font-size:${story ? 34 : 28}px;line-height:1.32}
.b b{font-weight:700}
.scrim{position:absolute;left:0;width:${L.w}px;top:1038px;height:172px;background:linear-gradient(180deg,rgba(192,213,248,0) 0,rgba(192,213,248,.985) 14%,rgba(192,213,248,1) 100%)}
.logo{position:absolute;left:50%;transform:translateX(-50%);${G.logo};width:${story ? 360 : 300}px}
.url{position:absolute;left:0;width:100%;${G.url};text-align:center;font-size:${story ? 26 : 22}px;font-weight:500;letter-spacing:.14em;color:#0f5ced}
.n{position:absolute;right:56px;top:${L.h - 64}px;font-size:22px;font-weight:500;color:#5f7094;letter-spacing:.08em}
</style></head><body><div class="art"></div>${marks}<div class="h" id="h">${rich(title)}</div><div class="panel"></div>
${scrim && !story ? '<div class="scrim"></div>' : ''}${pill ? `<div class="pill">${esc(pill)}</div>` : ''}${body ? `<div class="b">${richBody(body)}</div>` : ''}
<img class="logo" src="${logo}"><div class="url">ATACAMALABS.CL</div>${slide ? `<div class="n">${esc(slide)}</div>` : ''}
<script>const h=document.getElementById('h');let fs=parseFloat(getComputedStyle(h).fontSize);while(h.offsetHeight>${G.hMax}&&fs>48){fs-=4;h.style.fontSize=fs+'px';}</script></body></html>`;
}

/** Compone una ilustración ya generada con los textos de marca → PNG. */
export async function composeHybrid({ layout, artFile, title, pill, body, slide, scrim, out }) {
  const { chromium } = await import('playwright');
  const L = LAYOUTS[layout] || LAYOUTS.historia;
  const tmp = out + '.html';
  fs.writeFileSync(tmp, overlayHtml({ layout, artFile, title, pill, body, slide, scrim }));
  const browser = await chromium.launch(process.env.ATACAMA_CHROMIUM_ARGS ? { args: process.env.ATACAMA_CHROMIUM_ARGS.split(' ') } : {});
  try {
    const page = await browser.newPage({ viewport: { width: L.w, height: L.h }, deviceScaleFactor: 1 });
    await page.goto(pathToFileURL(path.resolve(tmp)).href);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(150);
    await page.screenshot({ path: out, clip: { x: 0, y: 0, width: L.w, height: L.h } });
    return out;
  } finally { await browser.close(); fs.rmSync(tmp, { force: true }); }
}

/** Qué ilustraciones necesita una pieza: historia «ilustrada» → 1; imagen → 1; carrusel → solo las láminas con `art`. */
export function hybridJobs(piece) {
  const p = piece && typeof piece === 'object' ? piece : {};
  if (p.format === 'historia' && p.story && p.story.art) return [{ layout: 'historia', art: p.story.art, title: p.story.title, pill: p.story.pill, body: p.story.body }];
  const slides = Array.isArray(p.slides) ? p.slides : [];
  return slides.map((s, i) => (s && s.art ? { layout: 'post', art: s.art, title: s.title, pill: s.pill, body: s.body, scrim: s.scrim === true, index: i, slide: p.format === 'carrusel' ? String(i + 1).padStart(2, '0') + ' / ' + String(slides.length).padStart(2, '0') : null } : null)).filter(Boolean);
}

/** Generador real con Higgsfield: devuelve la ruta del PNG descargado. En la VPS usa el guardián (tope de créditos). */
export function higgsGenerate({ bin, purpose, refs } = {}) {
  return async (prompt, aspect, outFile, callRefs) => {
    const runner = bin || process.env.ATACAMA_HIGGS || 'higgsfield';
    const args = ['generate', 'create', HYBRID_MODEL, '--prompt', prompt, '--aspect_ratio', aspect, '--resolution', '2k', '--quality', 'high', '--wait', '--json'];
    (callRefs && callRefs.length ? callRefs : refs || []).forEach((r) => args.push('--image-references', r));
    if (purpose && /higgs\.sh$/.test(runner)) args.push('--purpose', purpose);
    const r = spawnSync(runner, args, { encoding: 'utf8', timeout: 15 * 60000, shell: process.platform === 'win32' });
    const m = String(r.stdout || '').match(/"result_url":\s*"([^"]+)"/);
    if (r.status !== 0 || !m) throw new Error('Higgsfield no entregó la ilustración: ' + String(r.stdout || r.stderr || '').replace(/\s+/g, ' ').slice(0, 200));
    const res = await fetch(m[1]);
    if (!res.ok) throw new Error('No pude descargar la ilustración (HTTP ' + res.status + ')');
    fs.writeFileSync(outFile, Buffer.from(await res.arrayBuffer()));
    return outFile;
  };
}

/** Pieza → PNG(s) compuestos. Para carruseles devuelve SOLO las láminas ilustradas, con su índice (el resto lo dibuja el renderer de marca). */
export async function renderHybrid(piece, outDir, deps) {
  fs.mkdirSync(outDir, { recursive: true });
  const jobs = hybridJobs(piece);
  if (!jobs.length) throw new Error('La pieza no trae ninguna ilustración (art) para el método híbrido.');
  const refs = (piece.art_refs || []).concat(jobs.some((j) => j.art.character === 'llamita') ? (deps.llamaRefs || []) : []);
  const out = [];
  for (let k = 0; k < jobs.length; k++) {
    const j = jobs[k];
    const artFile = path.join(outDir, 'arte-' + (k + 1) + '.png');
    await deps.generate(buildArtPrompt(j.art, j.layout), LAYOUTS[j.layout].aspect, artFile, refs);
    const file = path.join(outDir, (j.layout === 'historia' ? 'historia' : 'lamina') + '-' + String((j.index ?? k) + 1).padStart(2, '0') + '.png');
    await composeHybrid({ layout: j.layout, artFile, title: j.title, pill: j.pill, body: j.body, slide: j.slide, scrim: j.scrim, out: file });
    out.push({ file, index: j.index ?? 0 });
  }
  return out;
}

if (process.argv[1] && process.argv[1].endsWith('visual-hybrid.mjs')) {
  const a = process.argv.slice(2);
  if (a[0] === '--compose') {
    const piece = JSON.parse(fs.readFileSync(a[2], 'utf8'));
    const j = hybridJobs(piece)[0];
    composeHybrid({ layout: j.layout, artFile: a[1], title: j.title, pill: j.pill, body: j.body, slide: j.slide, out: a[3] }).then((f) => console.log(f));
  } else {
    const piece = JSON.parse(fs.readFileSync(a[0], 'utf8'));
    const dir = a[1] || fs.mkdtempSync(path.join(os.tmpdir(), 'hibrido-'));
    renderHybrid(piece, dir, { generate: higgsGenerate({ purpose: 'pieza ' + (piece.topic || '').slice(0, 60) }) }).then((r) => console.log(r.map((x) => x.file).join('\n')));
  }
}
