#!/usr/bin/env node
/**
 * Atacama OS · Content Engine — renderer de piezas visuales.
 *
 * Lee una pieza canónica (JSON, ver docs/ATACAMA-OS-IMPLEMENTATION.md · Bloque H) y genera un PNG 1080×1350
 * por slide con Playwright/Chromium, siguiendo `brand/content/ATACAMA-LABS-GUIA-PUBLICACIONES.md` (v1.0):
 *   - fondos claros (blanco, crema, azul muy pálido) con aire; el fondo oscuro #041228 es una variante ocasional;
 *   - azul Atacama #0F5CED como acento, azul oscuro #041228 para texto/contraste;
 *   - tipografía sans serif limpia y fina (DM Sans 300/400; negritas solo en palabras clave con *así*);
 *   - una idea fuerte por slide; tarjetas suaves solo cuando ordenan; sombras casi imperceptibles; sin 3D, neón ni circuitos.
 * Logos: SIEMPRE los SVG oficiales de public/brand/ (se incrustan tal cual; nunca se reconstruyen ni se recolorean).
 * Llamita: opcional por slide (`slide.mascot = {sheet, pose}`), solo en portada/cierre; se recorta de las HOJAS OFICIALES
 *   de brand/content/mascot/ (no se redibuja ni se regenera) sobre fondo claro.
 *
 * Tres layouts (cover · content · cta). `content` admite tres estructuras: tarjetas (`items`), comparación lado a lado
 * (`compare`) o una cifra grande (`figure`). Los fondos y la posición del logo varían de forma determinista por pieza.
 *
 * Uso: node scripts/content/render.mjs <pieza.json> [carpeta-salida]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BRAND = path.join(ROOT, 'public/brand');
const MASCOT = path.join(ROOT, 'brand/content/mascot');
const FONT = path.join(ROOT, 'src/app/fonts/DMSans-latin-wght.woff2');
const T = { blue: '#0F5CED', blueOnDark: '#2E74F5', deep: '#041228', ink: '#041228', white: '#FFFFFF', cream: '#FBF8F2', mist: '#F2F6FE' };

/** Recortes (x, y, w, h) de cada pose dentro de las hojas oficiales (1122×1402). */
export const MASCOT_CROPS = {
  poses: { neutral: [100, 30, 240, 430], pregunta: [420, 30, 300, 420], celebra: [750, 30, 330, 420], senala: [60, 450, 330, 400], celular: [450, 450, 260, 400], brazos_arriba: [760, 450, 340, 400], laptop: [40, 860, 290, 380], conectada: [330, 850, 470, 390], tablet: [820, 840, 280, 400] },
  emociones: { neutral: [110, 35, 220, 410], pregunta: [420, 30, 290, 410], alegria: [750, 35, 330, 410], sorpresa: [60, 455, 280, 395], duda: [415, 445, 280, 400], salto: [760, 440, 340, 380], timida: [65, 860, 230, 370], orgullo: [415, 845, 290, 385], duerme: [780, 885, 310, 350] },
};

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** `*palabra*` → énfasis (peso 500 + azul). Es la única negrita permitida. */
const rich = (s) => esc(s).replace(/\*([^*]+)\*/g, '<em>$1</em>');
const svgInline = (file) => fs.readFileSync(path.join(BRAND, file), 'utf8').replace(/<svg /, '<svg style="display:block;width:100%;height:auto" ');
const fnv = (s) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h; };

const CSS = (fontUrl) => `
@font-face { font-family: 'DM Sans'; src: url('${fontUrl}') format('woff2'); font-weight: 100 1000; font-style: normal; }
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: 1080px; height: 1350px; }
.slide { position: relative; width: 1080px; height: 1350px; padding: 96px 96px 88px; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; font-family: 'DM Sans', sans-serif; font-weight: 300; }
.paper { background: ${T.white}; color: ${T.ink}; }
.cream { background: ${T.cream}; color: ${T.ink}; }
.mist { background: ${T.mist}; color: ${T.ink}; }
.dark { background: ${T.deep}; color: ${T.white}; }
.kicker { font-size: 25px; font-weight: 500; letter-spacing: .13em; text-transform: uppercase; color: ${T.blue}; }
.dark .kicker { color: ${T.blueOnDark}; }
h1, h2 { font-weight: 300; letter-spacing: -0.022em; }
h1 { font-size: 100px; line-height: 1.05; }
h2 { font-size: 70px; line-height: 1.1; }
em { font-style: normal; font-weight: 500; color: ${T.blue}; }
.dark em { color: ${T.blueOnDark}; }
.lead { font-size: 35px; line-height: 1.45; font-weight: 300; max-width: 800px; color: rgba(4,18,40,.74); }
.dark .lead { color: rgba(255,255,255,.8); }
.foot { display: flex; justify-content: space-between; align-items: center; }
.logo { width: 232px; }
.count { font-size: 23px; font-weight: 400; letter-spacing: .08em; opacity: .5; }
.rule { width: 64px; height: 3px; background: ${T.blue}; margin-bottom: 40px; }
.dark .rule { background: ${T.blueOnDark}; }
.cards { display: flex; flex-direction: column; gap: 20px; margin-top: 44px; }
.card { display: flex; gap: 26px; align-items: center; padding: 26px 32px; border-radius: 24px; border: 1.5px solid rgba(15,92,237,.16); background: ${T.white}; box-shadow: 0 1px 2px rgba(4,18,40,.04); }
.dark .card { background: rgba(255,255,255,.04); border-color: rgba(255,255,255,.16); box-shadow: none; }
.card .n { flex: none; width: 52px; height: 52px; border-radius: 50%; border: 1.5px solid ${T.blue}; color: ${T.blue}; font-size: 25px; font-weight: 500; display: flex; align-items: center; justify-content: center; }
.card b { display: block; font-size: 30px; font-weight: 500; margin-bottom: 4px; }
.card span { font-size: 26px; line-height: 1.38; font-weight: 300; opacity: .8; }
.duo { display: flex; gap: 22px; margin-top: 48px; }
.duo .card { flex: 1; flex-direction: column; align-items: flex-start; gap: 14px; padding: 32px; }
.duo .card.hl { border-color: ${T.blue}; border-width: 2px; }
.duo .lab { font-size: 22px; font-weight: 500; letter-spacing: .1em; text-transform: uppercase; color: rgba(4,18,40,.55); }
.duo .hl .lab { color: ${T.blue}; }
.duo p { font-size: 30px; line-height: 1.38; font-weight: 300; }
.figure { margin-top: 36px; }
.figure .v { font-size: 210px; line-height: 1; font-weight: 200; letter-spacing: -0.04em; color: ${T.blue}; }
.dark .figure .v { color: ${T.blueOnDark}; }
.figure .l { margin-top: 18px; font-size: 34px; line-height: 1.4; font-weight: 300; max-width: 760px; opacity: .85; }
.pill { display: inline-block; margin-top: 42px; padding: 18px 34px; border-radius: 999px; font-size: 29px; font-weight: 500; background: ${T.blue}; color: #fff; }
.mascot { position: absolute; background-repeat: no-repeat; mix-blend-mode: darken; -webkit-mask-image: radial-gradient(ellipse 60% 58% at 50% 50%, #000 72%, transparent 100%); mask-image: radial-gradient(ellipse 60% 58% at 50% 50%, #000 72%, transparent 100%); }
`;

const logoFile = (theme) => (theme === 'dark' ? 'logo-horizontal-fondo-oscuro.svg' : 'logo-horizontal.svg');

function mascotHtml(m, kind) {
  const crop = MASCOT_CROPS[m.sheet] && MASCOT_CROPS[m.sheet][m.pose];
  if (!crop) throw new Error(`Mascota inexistente: ${m.sheet}/${m.pose}`);
  const [x, y, w, h] = crop;
  const target = kind === 'cover' ? 520 : 470; // alto en px dentro de la slide
  const k = target / h;
  const url = pathToFileURL(path.join(MASCOT, `${m.sheet}.png`)).href;
  const W = Math.round(w * k), H = Math.round(h * k);
  return `<div class="mascot" style="width:${W}px;height:${H}px;right:${kind === 'cover' ? 70 : 90}px;bottom:${kind === 'cover' ? 150 : 170}px;background-image:url('${url}');background-size:${Math.round(1122 * k)}px ${Math.round(1402 * k)}px;background-position:${-Math.round(x * k)}px ${-Math.round(y * k)}px"></div>`;
}

export function slideHtml(slide, index, total, theme, opts = {}) {
  const kicker = slide.kicker ? `<div class="kicker">${esc(slide.kicker)}</div>` : '<div></div>';
  const count = `<div class="count">${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}</div>`;
  const logo = `<div class="logo">${svgInline(logoFile(theme))}</div>`;
  const logoTop = opts.logoTop;
  const head = logoTop ? `<div class="foot">${logo}${count}</div>` : kicker;
  const foot = logoTop ? kicker : `<div class="foot">${logo}${count}</div>`;
  const mascot = slide.mascot && theme !== 'dark' ? mascotHtml(slide.mascot, slide.layout === 'cover' ? 'cover' : 'cta') : '';
  const narrow = slide.mascot ? 'style="max-width:600px"' : '';
  if (slide.layout === 'cover') {
    return `<div class="slide ${theme}">${head}<div ${narrow}><div class="rule"></div><h1${slide.mascot ? ' style="font-size:86px"' : ''}>${rich(slide.title)}</h1>${slide.body ? `<p class="lead" style="margin-top:40px">${esc(slide.body)}</p>` : ''}</div>${foot}${mascot}</div>`;
  }
  if (slide.layout === 'cta') {
    const pill = slide.cta_label ? `<div class="pill">${esc(slide.cta_label)}</div>` : '';
    return `<div class="slide ${theme}">${head}<div ${narrow}><h2 style="font-size:${slide.mascot ? 72 : 84}px">${rich(slide.title)}</h2>${slide.body ? `<p class="lead" style="margin-top:34px">${esc(slide.body)}</p>` : ''}${pill}</div>${foot}${mascot}</div>`;
  }
  let extra = '';
  if (Array.isArray(slide.items) && slide.items.length) {
    extra = `<div class="cards">${slide.items.slice(0, 4).map((it, i) => `<div class="card"><div class="n">${i + 1}</div><div><b>${esc(typeof it === 'string' ? it : it.title)}</b>${typeof it === 'object' && it.text ? `<span>${esc(it.text)}</span>` : ''}</div></div>`).join('')}</div>`;
  } else if (slide.compare) {
    const c = slide.compare;
    extra = `<div class="duo"><div class="card"><div class="lab">${esc(c.left.label)}</div><p>${esc(c.left.text)}</p></div><div class="card hl"><div class="lab">${esc(c.right.label)}</div><p>${esc(c.right.text)}</p></div></div>`;
  } else if (slide.figure) {
    extra = `<div class="figure"><div class="v">${esc(slide.figure.value)}</div><div class="l">${esc(slide.figure.label)}</div></div>`;
  }
  return `<div class="slide ${theme}">${head}<div><h2>${rich(slide.title)}</h2>${slide.body ? `<p class="lead" style="margin-top:34px">${esc(slide.body)}</p>` : ''}${extra}</div>${foot}</div>`;
}

/** Fondos por slide: portada/cierre varían por pieza (hash); si llevan llamita se fuerzan a fondo claro. */
export function themesFor(piece) {
  const seed = fnv(`${piece.topic}|${piece.angle}|${piece.channel}`);
  const lightCovers = ['mist', 'paper', 'cream', 'dark'];
  const cover = lightCovers[seed % 4];
  const body = ['paper', 'cream'][(seed >> 2) % 2];
  const cta = cover === 'dark' ? 'mist' : ['dark', 'mist', 'cream'][(seed >> 4) % 3];
  const themes = (piece.slides || []).map((s, i) => {
    let th = s.layout === 'cover' ? cover : s.layout === 'cta' ? cta : i % 2 ? 'mist' : body;
    if (s.mascot && th === 'dark') th = 'mist';
    return th;
  });
  return { themes, logoTop: Boolean((seed >> 6) & 1) };
}

export async function renderPiece(piece, outDir) {
  const { chromium } = await import('playwright');
  fs.mkdirSync(outDir, { recursive: true });
  const fontUrl = pathToFileURL(FONT).href;
  const { themes, logoTop } = themesFor(piece);
  const slides = piece.slides || [];
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
  const files = [];
  for (let i = 0; i < slides.length; i++) {
    const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>${CSS(fontUrl)}</style></head><body>${slideHtml(slides[i], i, slides.length, themes[i], { logoTop })}</body></html>`;
    const tmp = path.join(outDir, `.slide-${i + 1}.html`);
    fs.writeFileSync(tmp, html);
    await page.goto(pathToFileURL(tmp).href);
    await page.evaluate(() => document.fonts.ready);
    const file = path.join(outDir, `slide-${String(i + 1).padStart(2, '0')}.png`);
    await page.screenshot({ path: file, clip: { x: 0, y: 0, width: 1080, height: 1350 } });
    fs.unlinkSync(tmp);
    files.push(file);
  }
  await browser.close();
  return files;
}

if (process.argv[1] && process.argv[1].endsWith('render.mjs')) {
  const input = process.argv[2];
  if (!input) { console.error('Uso: node scripts/content/render.mjs <pieza.json> [carpeta-salida]'); process.exit(1); }
  const piece = JSON.parse(fs.readFileSync(input, 'utf8'));
  const out = process.argv[3] || path.join(ROOT, 'social/exports/content', path.basename(input).replace(/\.piece\.json$|\.json$/, ''));
  renderPiece(piece, out).then((f) => console.log(f.join('\n')));
}
