#!/usr/bin/env node
/**
 * Atacama OS v3 · Fase 5 (spec §6.6-2) — un video, tres formatos (9:16 · 1:1 · 16:9) desde UNA sola línea de tiempo.
 *
 *   node scripts/motion/multiformat.mjs <composicion.html> [--out dir] [--formats 9x16,1x1,16x9] [--fps 30] [--from 0 --to <s>]
 *
 * Contrato de la composición (ver brand/content/motion/lista-de-estados/composition.html):
 *   - lee el formato de `?format=9x16|1x1|16x9` y REENCUADRA texto/UI con CSS (no se recorta un video ancho);
 *   - expone `window.atacamaDuration` (segundos) y `window.atacamaSeek(t)` → dibuja el instante t de forma determinista
 *     (sin Date.now ni azar), así dos renders del mismo tramo dan los mismos frames (prueba de determinismo de la puerta de calidad).
 * Captura cada frame con Playwright/Chromium y lo codifica con ffmpeg (H.264, yuv420p). No usa red ni créditos.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

export const FORMATS = { '9x16': [1080, 1920], '1x1': [1080, 1080], '16x9': [1920, 1080] };

export async function renderFormats(html, { out, formats = Object.keys(FORMATS), fps = 30, from = 0, to = null, scale = 1 } = {}) {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const results = [];
  try {
    for (const f of formats) {
      const [W, H] = FORMATS[f] || [];
      if (!W) throw new Error('formato desconocido: ' + f);
      const w = Math.round(W * scale / 2) * 2, h = Math.round(H * scale / 2) * 2;
      const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
      await page.goto(pathToFileURL(path.resolve(html)).href + '?format=' + f);
      await page.waitForFunction(() => typeof window.atacamaSeek === 'function' && Number(window.atacamaDuration) > 0);
      await page.evaluate(() => document.fonts && document.fonts.ready);
      const dur = await page.evaluate(() => Number(window.atacamaDuration));
      const end = to != null ? Math.min(Number(to), dur) : dur;
      const n = Math.max(1, Math.round((end - from) * fps));
      const tmp = fs.mkdtempSync(path.join(out, '.frames-' + f + '-'));
      for (let i = 0; i < n; i++) {
        await page.evaluate((t) => window.atacamaSeek(t), from + i / fps);
        await page.screenshot({ path: path.join(tmp, String(i).padStart(5, '0') + '.png'), animations: 'disabled' });
      }
      await page.close();
      const file = path.join(out, path.basename(html, path.extname(html)) + '-' + f + '.mp4');
      const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-framerate', String(fps), '-i', path.join(tmp, '%05d.png'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'medium', '-movflags', '+faststart', '-threads', '1', file], { encoding: 'utf8' });
      fs.rmSync(tmp, { recursive: true, force: true });
      if (r.status !== 0) throw new Error('ffmpeg: ' + String(r.stderr).slice(-300));
      results.push({ format: f, file, w, h, frames: n, duration: Math.round((n / fps) * 100) / 100 });
    }
  } finally { await browser.close(); }
  return results;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  const a = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
  const html = process.argv[2];
  if (!html || html.startsWith('--')) { console.log('uso: multiformat.mjs <composicion.html> [--out dir] [--formats 9x16,1x1,16x9] [--fps 30] [--from s --to s] [--scale 0.5]'); process.exit(1); }
  renderFormats(html, { out: a('--out') || path.join(path.dirname(html), 'out'), formats: (a('--formats') || '9x16,1x1,16x9').split(','), fps: Number(a('--fps')) || 30, from: Number(a('--from')) || 0, to: a('--to') != null ? Number(a('--to')) : null, scale: Number(a('--scale')) || 1 })
    .then((r) => console.log(JSON.stringify({ ok: true, outputs: r })))
    .catch((e) => { console.log(JSON.stringify({ ok: false, error: String(e.message || e).slice(0, 400) })); process.exitCode = 1; });
}
