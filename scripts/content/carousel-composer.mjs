#!/usr/bin/env node
/**
 * Atacama OS v3 · Fase 3 — compositor de carruseles ilustrados (spec §6.5; método híbrido de docs/ESTRATEGIA-CARRUSELES-ILUSTRADOS.md).
 *
 * El modelo (Higgsfield / GPT Image 2.5) hace SOLO la ilustración; este módulo compone encima, con precisión: titular con énfasis azul,
 * texto de apoyo, pill, pasos, logo OFICIAL (public/brand, nunca regenerado), contador «NN / TT», fondo de marca con la cuadrícula de
 * los videos y cierre de marca. Cada lámina compone su propia disposición según su `layout` (no hay plantilla rígida):
 *   portada · arte_texto · pasos · texto · cierre
 * Sin esquinas decorativas, chips ni marcos (prohibidos). Los títulos que no caben se achican solos hasta un mínimo legible.
 * Devuelve, por lámina, la ruta del PNG 1080×1350 y señales para el control de calidad (logo cargado, cuadrícula, título que no cupo).
 *
 * Uso: node scripts/content/carousel-composer.mjs <spec.json> <carpeta-arte> <carpeta-salida>
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FONT = path.join(ROOT, 'src/app/fonts/DMSans-latin-wght.woff2');
const LOGO = path.join(ROOT, 'public/brand/logo-horizontal.svg');
const ISO = path.join(ROOT, 'public/brand/isotipo-azul.svg');

export const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** *énfasis* → <em> (azul Atacama). */
export const rich = (s) => esc(s).replace(/\*\*?([^*]+)\*\*?/g, '<em>$1</em>');
const dataUri = (file, mime) => 'data:' + mime + ';base64,' + fs.readFileSync(file).toString('base64');

export function composerCss(fontUrl) {
  return `@font-face{font-family:"DM Sans";src:url("${fontUrl}") format("woff2");font-weight:100 1000}
*{margin:0;padding:0;box-sizing:border-box}
body{width:1080px;height:1350px;position:relative;overflow:hidden;font-family:"DM Sans",sans-serif;color:#0b1e3f;-webkit-font-smoothing:antialiased;background:#f3f6fd}
.bg{position:absolute;inset:0;background:radial-gradient(62% 46% at 50% 50%,rgba(15,92,237,.17),rgba(15,92,237,0) 72%),linear-gradient(180deg,#eef3fe,#e3ecfc)}
.grid{position:absolute;inset:0;background-image:linear-gradient(rgba(15,92,237,.12) 2px,transparent 2px),linear-gradient(90deg,rgba(15,92,237,.12) 2px,transparent 2px),linear-gradient(rgba(15,92,237,.055) 1px,transparent 1px),linear-gradient(90deg,rgba(15,92,237,.055) 1px,transparent 1px);background-size:120px 120px,120px 120px,40px 40px,40px 40px}
.h{position:absolute;left:60px;width:960px;text-align:center;font-weight:700;letter-spacing:-.035em;line-height:1.06;z-index:5}
.h em{font-style:normal;color:#0f5ced}
.h .l{display:block;white-space:nowrap}
.h.wrap .l{white-space:normal}
.card{position:absolute;left:0;width:1080px;background:#fff;border-radius:56px 56px 0 0;box-shadow:0 -14px 40px rgba(11,30,63,.12);z-index:6}
.b{position:absolute;left:110px;width:860px;text-align:center;font-size:30px;line-height:1.32;z-index:7}
.b em{font-style:normal;font-weight:700;color:#0f5ced}
.logo{position:absolute;left:50%;transform:translateX(-50%);z-index:7}
.n{position:absolute;right:110px;font-size:24px;font-weight:600;color:#0f5ced;letter-spacing:.08em;z-index:7}
.pill{position:absolute;left:50%;transform:translateX(-50%);background:#0f5ced;color:#fff;font-weight:600;font-size:26px;letter-spacing:.02em;padding:14px 34px;border-radius:60px;white-space:nowrap;box-shadow:0 12px 28px rgba(15,92,237,.35);z-index:5}
.art{position:absolute;left:50%;transform:translateX(-50%);z-index:2;object-fit:contain;filter:drop-shadow(0 30px 40px rgba(11,30,63,.26))}
.step{position:absolute;left:90px;width:900px;z-index:7;font-size:34px;display:flex;align-items:center;gap:20px;line-height:1.1}
.step em{font-style:normal;font-weight:700;color:#0f5ced}
.sn{flex:none;width:50px;height:50px;border-radius:50%;background:#0f5ced;color:#fff;font-weight:700;font-size:28px;display:flex;align-items:center;justify-content:center}
.iso{position:absolute;left:50%;transform:translateX(-50%);z-index:5}
.url{position:absolute;left:0;width:1080px;text-align:center;font-size:30px;font-weight:600;color:#0f5ced;z-index:7}`;
}

/** Título: líneas separadas por «|» o salto; la línea `emph` va en azul. */
function titleHtml(slide) {
  const lines = String(slide.title || '').split(/\n|\|/).map((l) => l.trim()).filter(Boolean);
  if (slide.emph) lines.push('*' + String(slide.emph).replace(/\*/g, '') + '*');
  return lines.map((l) => `<span class="l">${rich(l)}</span>`).join('');
}

/** HTML de una lámina. `ctx` = { index, total, artUri, logoUri, isoUri, fontUrl }. */
export function slideHtml(slide, ctx) {
  const n = String(ctx.index + 1).padStart(2, '0') + ' / ' + String(ctx.total).padStart(2, '0');
  const foot = (top) => `<img class="logo" src="${ctx.logoUri}" style="top:${top}px;width:230px" data-role="logo"><div class="n" style="top:${top + 4}px">${n}</div>`;
  const art = (style) => (ctx.artUri ? `<img class="art" src="${ctx.artUri}" style="${style}" data-role="art">` : '');
  let inner = '';
  const L = slide.layout;
  if (L === 'portada') {
    inner = `${slide.pill ? `<div class="pill" style="top:66px">${esc(slide.pill)}</div>` : ''}
<div class="h${slide.wrap ? ' wrap' : ''}" data-role="title" style="top:${slide.pill ? 140 : 90}px;font-size:${slide.size || 60}px">${titleHtml(slide)}</div>
${art(`top:${slide.pill ? 330 : 300}px;width:940px;max-height:880px`)}
<div class="card" style="top:1232px;height:118px"></div>${foot(1268)}`;
  } else if (L === 'arte_texto' || L === 'pasos') {
    const cardTop = L === 'pasos' ? 1030 : 1092;
    inner = `<div class="h${slide.wrap ? ' wrap' : ''}" data-role="title" style="top:62px;font-size:${slide.size || 56}px">${titleHtml(slide)}</div>
${art(`top:${slide.title && String(slide.title).includes('|') ? 230 : 170}px;width:${L === 'pasos' ? 820 : 900}px;max-height:${cardTop - 200}px`)}
<div class="card" style="top:${cardTop}px;height:${1350 - cardTop}px"></div>
${L === 'pasos' ? (slide.steps || []).slice(0, 4).map((s, i) => `<div class="step" style="top:${cardTop + 30 + i * 74}px"><span class="sn">${i + 1}</span><span>${rich(s)}</span></div>`).join('') : `<div class="b" data-role="body" style="top:${cardTop + 26}px">${rich(slide.body || '')}</div>`}
${foot(1350 - 80)}`;
  } else if (L === 'texto') {
    inner = `<div class="h${slide.wrap ? ' wrap' : ''}" data-role="title" style="top:${ctx.artUri ? 70 : 260}px;font-size:${slide.size || 64}px">${titleHtml(slide)}</div>
${art('top:300px;width:760px;max-height:620px')}
<div class="card" style="top:${ctx.artUri ? 980 : 760}px;height:${ctx.artUri ? 370 : 590}px"></div>
<div class="b" data-role="body" style="top:${ctx.artUri ? 1010 : 800}px;font-size:${ctx.artUri ? 30 : 36}px">${rich(slide.body || '')}</div>${foot(1350 - 80)}`;
  } else {
    // cierre de marca: isotipo, titular, llamado y dirección; el logo completo va al pie
    inner = `<img class="iso" src="${ctx.isoUri}" style="top:170px;width:220px" data-role="iso">
<div class="h${slide.wrap ? ' wrap' : ''}" data-role="title" style="top:470px;font-size:${slide.size || 62}px">${titleHtml(slide)}</div>
${slide.body ? `<div class="b" data-role="body" style="top:760px;font-size:34px">${rich(slide.body)}</div>` : ''}
<div class="url" style="top:1060px">atacamalabs.cl</div>
<div class="card" style="top:1232px;height:118px"></div>${foot(1268)}`;
  }
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>${composerCss(ctx.fontUrl)}</style></head><body><div class="bg"></div><div class="grid" data-role="grid"></div>${inner}</body></html>`;
}

/**
 * Compone todas las láminas. `artFor(i)` → ruta del PNG de arte de la lámina i (0-based) o null. Devuelve [{ file, signals }].
 * signals = { has_logo, has_grid, title_shrunk, title_overflow, forbidden: [] }.
 */
export async function composeCarousel(spec, artFor, outDir, opts = {}) {
  const { chromium } = await import('playwright');
  fs.mkdirSync(outDir, { recursive: true });
  const ctx0 = { fontUrl: pathToFileURL(FONT).href, logoUri: dataUri(LOGO, 'image/svg+xml'), isoUri: dataUri(ISO, 'image/svg+xml') };
  const browser = await chromium.launch(process.env.ATACAMA_CHROMIUM_ARGS ? { args: process.env.ATACAMA_CHROMIUM_ARGS.split(' ') } : {});
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
  const out = [];
  const slides = spec.slides || [];
  try {
    for (let i = 0; i < slides.length; i++) {
      if (opts.only && !opts.only.includes(i + 1)) continue;
      const a = artFor ? artFor(i) : null;
      const ctx = { ...ctx0, index: i, total: slides.length, artUri: a && fs.existsSync(a) ? dataUri(a, 'image/png') : null };
      let slide = { ...slides[i] };
      let shrunk = false, overflow = false;
      for (let k = 0; k < 6; k++) {
        await page.setContent(slideHtml(slide, ctx), { waitUntil: 'load' });
        await page.evaluate(() => document.fonts.ready);
        overflow = await page.evaluate(() => { const t = document.querySelector('[data-role="title"]'); if (!t) return false; return [...t.querySelectorAll('.l')].some((l) => l.scrollWidth > l.clientWidth + 1); });
        if (!overflow) break;
        const cur = slide.size || (slide.layout === 'portada' ? 60 : slide.layout === 'texto' ? 64 : 56);
        // Primero se achica hasta 44 px; si aún no cabe, el título pasa a varias líneas (nunca se corta).
        if (cur > 44) slide = { ...slide, size: Math.max(44, Math.round(cur * 0.9)) }; else if (!slide.wrap) slide = { ...slide, wrap: true }; else break;
        shrunk = true;
      }
      const signals = await page.evaluate(() => {
        const logo = document.querySelector('[data-role="logo"]');
        return { has_logo: Boolean(logo && logo.complete && logo.naturalWidth > 0), has_grid: Boolean(document.querySelector('[data-role="grid"]')), forbidden: [...document.querySelectorAll('.br,.chip,.frame')].map((e) => e.className) };
      });
      const file = path.join(outDir, 'lamina-' + String(i + 1).padStart(2, '0') + '.png');
      await page.screenshot({ path: file, clip: { x: 0, y: 0, width: 1080, height: 1350 } });
      out.push({ index: i + 1, file, signals: { ...signals, title_shrunk: shrunk, title_overflow: overflow } });
    }
  } finally { await browser.close(); }
  return out;
}

/** Hoja de contacto (miniaturas de todas las láminas) para la crítica visual. */
export async function contactSheet(files, outFile) {
  const { chromium } = await import('playwright');
  const cols = Math.min(5, files.length), rows = Math.ceil(files.length / cols);
  const W = 216, Hh = 270, G = 12;
  const html = `<!doctype html><html><body style="margin:0;background:#fff;display:grid;grid-template-columns:repeat(${cols},${W}px);gap:${G}px;padding:${G}px">${files.map((f, i) => `<div style="position:relative"><img src="${dataUri(f, 'image/png')}" style="width:${W}px;height:${Hh}px;display:block;border:1px solid #ccd"><span style="position:absolute;top:4px;left:4px;background:#0f5ced;color:#fff;font:700 14px sans-serif;padding:2px 7px;border-radius:9px">${i + 1}</span></div>`).join('')}</body></html>`;
  const browser = await chromium.launch(process.env.ATACAMA_CHROMIUM_ARGS ? { args: process.env.ATACAMA_CHROMIUM_ARGS.split(' ') } : {});
  const page = await browser.newPage({ viewport: { width: cols * (W + G) + G, height: rows * (Hh + G) + G } });
  await page.setContent(html, { waitUntil: 'load' });
  await page.screenshot({ path: outFile, fullPage: true });
  await browser.close();
  return outFile;
}

if (process.argv[1] && process.argv[1].endsWith('carousel-composer.mjs')) {
  const [specPath, artDir, outDir] = process.argv.slice(2);
  if (!specPath || !outDir) { console.error('Uso: node scripts/content/carousel-composer.mjs <spec.json> <carpeta-arte> <carpeta-salida>'); process.exit(1); }
  const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
  composeCarousel(spec, (i) => (artDir ? path.join(artDir, 'arte-' + String(i + 1).padStart(2, '0') + '.png') : null), outDir).then((r) => console.log(JSON.stringify(r, null, 1)));
}
