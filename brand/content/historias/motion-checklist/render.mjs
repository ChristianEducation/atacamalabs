// Historia en movimiento (1080x1920, 8 s): «Antes de automatizar, elige bien». Uso: node render.mjs <salidaDir> "<texto de la pastilla>" [workers]
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const ROOT = 'C:/Users/alain/ATACAMA-LABS-SPEC-DRIVEN-v1.0/atacama-labs-app';
const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\//, ''));
const OUT = process.argv[2]; const PILL = process.argv[3] || 'Mañana a las 15:00, en el feed'; const WORKERS = Number(process.argv[4] || 5);
const FPS = 30, DUR = 8, N = FPS * DUR;
fs.mkdirSync(OUT, { recursive: true });
const svg64 = (f) => 'data:image/svg+xml;base64,' + fs.readFileSync(path.join(ROOT, 'public/brand', f)).toString('base64');
let html = fs.readFileSync(path.join(HERE, 'page.template.html'), 'utf8');
const rep = { __FONT__: pathToFileURL(path.join(ROOT, 'src/app/fonts/DMSans-latin-wght.woff2')).href, __LOGO__: svg64('logo-horizontal.svg'), __IMG__: pathToFileURL(path.join(HERE, '../assets/llamita-dia.png')).href, __PILL__: PILL };
for (const [k, v] of Object.entries(rep)) html = html.split(k).join(v);
const pageFile = path.join(HERE, 'page.html'); fs.writeFileSync(pageFile, html);
const { chromium } = await import(pathToFileURL(ROOT + '/node_modules/playwright/index.mjs').href);
const b = await chromium.launch();
async function worker(w) {
  const pg = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  pg.on('pageerror', (e) => console.log('PAGEERR', e.message));
  await pg.goto(pathToFileURL(pageFile).href); await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(500);
  for (let i = w; i < N; i += WORKERS) { await pg.evaluate((t) => window.draw(t), i / FPS); await pg.screenshot({ path: path.join(OUT, 'f' + String(i).padStart(4, '0') + '.png') }); }
  await pg.close();
}
await Promise.all(Array.from({ length: WORKERS }, (_, w) => worker(w)));
await b.close(); console.log('ok', N);
