#!/usr/bin/env node
/**
 * Atacama OS · Content Engine — renderer de piezas visuales (MVP).
 *
 * Lee una pieza canónica (JSON, ver docs/ATACAMA-OS-IMPLEMENTATION.md · Bloque H) y genera un PNG 1080×1350
 * por slide con Playwright/Chromium. Identidad vigente (brand/content/README.md y public/brand/README.md):
 *   azul Atacama #0F5CED · azul oscuro #041228 · tinta #121A2B · gris claro #F0F2F4 · azul sobre oscuro #2E74F5
 *   Newsreader (títulos, peso fino) + DM Sans (texto), fondos limpios, mucho aire, una idea fuerte por slide.
 * Logos: SIEMPRE los SVG oficiales de public/brand/ (se incrustan tal cual; no se reconstruyen).
 * Mascota: opcional y NO incluida (las hojas oficiales de la llamita aún no están en el repo).
 *
 * Tres layouts (cover · content · cta) con variantes de fondo elegidas de forma determinista por pieza, de modo
 * que dos piezas distintas no salgan idénticas.
 *
 * Uso: node scripts/content/render.mjs <pieza.json> [carpeta-salida]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BRAND = path.join(ROOT, 'public/brand');
const FONTS = path.join(ROOT, 'src/app/fonts');
const T = { blue: '#0F5CED', blueOnDark: '#2E74F5', deep: '#041228', ink: '#121A2B', soft: '#F0F2F4', white: '#FFFFFF' };

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const svgInline = (file) => fs.readFileSync(path.join(BRAND, file), 'utf8').replace(/<svg /, '<svg style="display:block;width:100%;height:auto" ');
const fnv = (s) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h; };

const CSS = (fontUrls) => `
@font-face { font-family: 'Newsreader'; src: url('${fontUrls.news}') format('woff2'); font-weight: 200 800; font-style: normal; }
@font-face { font-family: 'Newsreader'; src: url('${fontUrls.newsItalic}') format('woff2'); font-weight: 200 800; font-style: italic; }
@font-face { font-family: 'DM Sans'; src: url('${fontUrls.dm}') format('woff2'); font-weight: 100 1000; font-style: normal; }
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: 1080px; height: 1350px; }
.slide { position: relative; width: 1080px; height: 1350px; padding: 96px 96px 88px; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; font-family: 'DM Sans', sans-serif; }
.light { background: ${T.white}; color: ${T.ink}; }
.soft { background: ${T.soft}; color: ${T.ink}; }
.dark { background: ${T.deep}; color: ${T.white}; }
.blue { background: ${T.blue}; color: ${T.white}; }
.kicker { font-size: 26px; font-weight: 500; letter-spacing: .14em; text-transform: uppercase; }
.light .kicker, .soft .kicker { color: ${T.blue}; }
.dark .kicker { color: ${T.blueOnDark}; }
.blue .kicker { color: rgba(255,255,255,.78); }
h1, h2 { font-family: 'Newsreader', serif; font-weight: 300; letter-spacing: -0.012em; }
h1 { font-size: 104px; line-height: 1.04; }
h2 { font-size: 72px; line-height: 1.08; }
.lead { font-size: 36px; line-height: 1.45; font-weight: 300; max-width: 820px; }
.light .lead, .soft .lead { color: rgba(18,26,43,.78); }
.dark .lead, .blue .lead { color: rgba(255,255,255,.82); }
.foot { display: flex; justify-content: space-between; align-items: flex-end; }
.logo { width: 250px; }
.count { font-size: 24px; font-weight: 400; letter-spacing: .08em; opacity: .55; }
.mark { position: absolute; right: -120px; top: -40px; width: 620px; opacity: .06; }
.cards { display: flex; flex-direction: column; gap: 22px; margin-top: 44px; }
.card { display: flex; gap: 28px; align-items: flex-start; padding: 28px 32px; border-radius: 22px; border: 1.5px solid rgba(18,26,43,.14); background: rgba(255,255,255,.7); }
.dark .card { border-color: rgba(255,255,255,.18); background: rgba(255,255,255,.04); }
.card .n { font-family: 'Newsreader', serif; font-size: 44px; font-weight: 300; color: ${T.blue}; min-width: 52px; line-height: 1; }
.dark .card .n { color: ${T.blueOnDark}; }
.card b { display: block; font-size: 30px; font-weight: 600; margin-bottom: 6px; }
.card span { font-size: 27px; line-height: 1.4; font-weight: 300; opacity: .82; }
.pill { display: inline-block; margin-top: 40px; padding: 18px 34px; border-radius: 999px; font-size: 30px; font-weight: 500; border: 1.5px solid currentColor; }
.rule { width: 72px; height: 3px; background: ${T.blue}; margin-bottom: 40px; }
.dark .rule, .blue .rule { background: ${T.blueOnDark}; }
.blue .rule { background: rgba(255,255,255,.7); }
`;

function logoFor(theme) {
  return svgInline(theme === 'blue' ? 'logo-horizontal-blanco.svg' : theme === 'dark' ? 'logo-horizontal-fondo-oscuro.svg' : 'logo-horizontal.svg');
}
function markFor(theme) {
  return svgInline(theme === 'dark' || theme === 'blue' ? 'isotipo-blanco.svg' : 'isotipo-azul.svg');
}

export function slideHtml(slide, index, total, theme) {
  const kicker = slide.kicker ? `<div class="kicker">${esc(slide.kicker)}</div>` : '<div></div>';
  const count = `<div class="count">${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}</div>`;
  const foot = `<div class="foot"><div class="logo">${logoFor(theme)}</div>${count}</div>`;
  const mark = slide.layout === 'content' ? '' : `<div class="mark">${markFor(theme)}</div>`;
  if (slide.layout === 'cover') {
    return `<div class="slide ${theme}">${mark}${kicker}<div><div class="rule"></div><h1>${esc(slide.title)}</h1>${slide.body ? `<p class="lead" style="margin-top:44px">${esc(slide.body)}</p>` : ''}</div>${foot}</div>`;
  }
  if (slide.layout === 'cta') {
    const pill = slide.cta_label ? `<div class="pill">${esc(slide.cta_label)}</div>` : '';
    return `<div class="slide ${theme}">${mark}${kicker}<div><h2 style="font-size:88px">${esc(slide.title)}</h2>${slide.body ? `<p class="lead" style="margin-top:36px">${esc(slide.body)}</p>` : ''}${pill}</div>${foot}</div>`;
  }
  const items = Array.isArray(slide.items) ? slide.items.slice(0, 4) : [];
  const cards = items.length
    ? `<div class="cards">${items.map((it, i) => `<div class="card"><div class="n">${i + 1}</div><div><b>${esc(typeof it === 'string' ? it : it.title)}</b>${typeof it === 'object' && it.text ? `<span>${esc(it.text)}</span>` : ''}</div></div>`).join('')}</div>`
    : '';
  return `<div class="slide ${theme}">${kicker}<div><h2>${esc(slide.title)}</h2>${slide.body ? `<p class="lead" style="margin-top:36px">${esc(slide.body)}</p>` : ''}${cards}</div>${foot}</div>`;
}

/** Elige el tema de cada slide: portada y cierre varían por pieza (hash de idea); el contenido alterna claro / gris. */
export function themesFor(piece) {
  const seed = fnv(`${piece.topic}|${piece.angle}|${piece.channel}`);
  const cover = ['light', 'dark', 'blue'][seed % 3];
  const cta = cover === 'dark' ? 'blue' : cover === 'blue' ? 'dark' : ['dark', 'blue'][(seed >> 3) % 2];
  return (piece.slides || []).map((s, i, a) => (s.layout === 'cover' ? cover : s.layout === 'cta' ? cta : i % 2 ? 'soft' : 'light'));
}

export async function renderPiece(piece, outDir) {
  const { chromium } = await import('playwright');
  fs.mkdirSync(outDir, { recursive: true });
  const fontUrls = {
    news: pathToFileURL(path.join(FONTS, 'Newsreader-latin-wght.woff2')).href,
    newsItalic: pathToFileURL(path.join(FONTS, 'Newsreader-latin-wght-italic.woff2')).href,
    dm: pathToFileURL(path.join(FONTS, 'DMSans-latin-wght.woff2')).href,
  };
  const themes = themesFor(piece);
  const slides = piece.slides || [];
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
  const files = [];
  for (let i = 0; i < slides.length; i++) {
    const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>${CSS(fontUrls)}</style></head><body>${slideHtml(slides[i], i, slides.length, themes[i])}</body></html>`;
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
