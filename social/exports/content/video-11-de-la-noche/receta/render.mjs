// Uso: node render.mjs <salidaDir> <frames separados por coma | "all"> [workers]
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ICONS } from './icons.mjs';
const ROOT = 'C:/Users/alain/ATACAMA-LABS-SPEC-DRIVEN-v1.0/atacama-labs-app';
const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\//, ''));
const OUT = process.argv[2];
const WHICH = process.argv[3] || 'all';
const WORKERS = Number(process.argv[4] || 4);
const FPS = 30, DUR = 26.0, N = Math.round(FPS * DUR);
fs.mkdirSync(OUT, { recursive: true });

export const TM = {
  hookNotif: 0.9, hookText: 1.45, splitStart: 2.0, splitEnd: 2.7,
  rings: [4.4, 6.0, 7.6, 9.2], ringDur: 1.0,
  cust: 2.9, agent: 5.0, sheet: 5.5, tap1: 6.9, step2: 7.6, tap2: 8.8, step3: 9.5, tap3: 10.3, done: 10.9,
  morning: 12.0, walk0: 12.3, walk1: 14.3, cards: [12.45, 13.1, 13.75], note: 14.7, win: 15.1, lost: 16.0,
  wipe: 16.9, hub0: 17.3, tag2: 22.9, end: 26.0,
};
if (process.argv[5] === '--tm') { console.log(JSON.stringify(TM)); process.exit(0); }
fs.writeFileSync(path.join(HERE, 'timing.json'), JSON.stringify(TM, null, 1));

const u = (p) => pathToFileURL(path.resolve(p)).href;
const svg64 = (f) => 'data:image/svg+xml;base64,' + fs.readFileSync(path.join(ROOT, 'public/brand', f)).toString('base64');
let html = fs.readFileSync(path.join(HERE, 'page.template.html'), 'utf8');
const rep = {
  __FONT__: u(path.join(ROOT, 'src/app/fonts/DMSans-latin-wght.woff2')),
  __GRAIN__: u(path.join(HERE, 'assets/grain.png')), __OFICINA__: u(path.join(HERE, 'assets/oficina.png')),
  __TEL__: u(path.join(HERE, 'assets/telefono.png')), __OFI__: u(path.join(HERE, 'assets/oficinista.png')),
  __LOGO__: svg64('logo-horizontal.svg'), __ISO__: svg64('isotipo-azul.svg'),
  __TM__: JSON.stringify(TM), __ICONS__: JSON.stringify(ICONS),
};
for (const [k, v] of Object.entries(rep)) html = html.split(k).join(v);
const pageFile = path.join(HERE, 'page.html'); fs.writeFileSync(pageFile, html);

const frames = WHICH === 'all' ? Array.from({ length: N }, (_, i) => i) : WHICH.split(',').map(Number);
const { chromium } = await import(pathToFileURL(ROOT + '/node_modules/playwright/index.mjs').href);
const b = await chromium.launch();
async function worker(w) {
  const pg = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  pg.on('pageerror', (e) => console.log('PAGEERR', e.message));
  await pg.goto(pathToFileURL(pageFile).href); await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(600);
  for (let j = w; j < frames.length; j += WORKERS) {
    const i = frames[j];
    await pg.evaluate((t) => window.draw(t), i / FPS);
    await pg.screenshot({ path: path.join(OUT, 'f' + String(i).padStart(4, '0') + '.png') });
  }
  await pg.close();
}
await Promise.all(Array.from({ length: Math.min(WORKERS, frames.length) }, (_, w) => worker(w)));
await b.close(); console.log('ok', frames.length);
