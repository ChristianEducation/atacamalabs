// Capa de motion (PNG con transparencia, 24 fps) para el Reel con el video generado. Uso: node render.mjs <salidaDir> <frames|all> [workers]
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const ROOT = 'C:/Users/alain/ATACAMA-LABS-SPEC-DRIVEN-v1.0/atacama-labs-app';
const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\//, ''));
const OUT = process.argv[2], WHICH = process.argv[3] || 'all', WORKERS = Number(process.argv[4] || 4);
const FPS = 24, DUR = 14.1, N = Math.round(FPS * DUR);
fs.mkdirSync(OUT, { recursive: true });
const TM = { wipe0: -1, wipe1: -1, cta: 10.58, trans0: 11.45, e0: 11.8, end: DUR };
fs.writeFileSync(path.join(HERE, 'timing.json'), JSON.stringify(TM, null, 1));
const svg64 = (f) => 'data:image/svg+xml;base64,' + fs.readFileSync(path.join(ROOT, 'public/brand', f)).toString('base64');
let html = fs.readFileSync(path.join(HERE, 'page.template.html'), 'utf8');
const rep = { __FONT__: pathToFileURL(path.join(ROOT, 'src/app/fonts/DMSans-latin-wght.woff2')).href, __LOGO__: svg64('logo-horizontal.svg'), __TM__: JSON.stringify(TM), __SUBS__: fs.readFileSync(path.join(HERE, 'subs.json'), 'utf8') };
for (const [k, v] of Object.entries(rep)) html = html.split(k).join(v);
const pageFile = path.join(HERE, 'page.html'); fs.writeFileSync(pageFile, html);
const frames = WHICH === 'all' ? Array.from({ length: N }, (_, i) => i) : WHICH.split(',').map(Number);
const { chromium } = await import(pathToFileURL(ROOT + '/node_modules/playwright/index.mjs').href);
const b = await chromium.launch();
async function worker(w) {
  const pg = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  pg.on('pageerror', (e) => console.log('PAGEERR', e.message));
  await pg.goto(pathToFileURL(pageFile).href); await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(500);
  for (let j = w; j < frames.length; j += WORKERS) {
    const i = frames[j];
    await pg.evaluate((t) => window.draw(t), i / FPS);
    await pg.screenshot({ path: path.join(OUT, 'f' + String(i).padStart(4, '0') + '.png'), omitBackground: true });
  }
  await pg.close();
}
await Promise.all(Array.from({ length: Math.min(WORKERS, frames.length) }, (_, w) => worker(w)));
await b.close(); console.log('ok', frames.length);
