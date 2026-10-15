// Video 4:5 con voz en off y click en la URL. Uso: node render46.mjs <salidaDir> <frames separados por coma | "all"> [workers]
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

const TM = {
  hookTitle: 0.5, hookNotif: 2.15, hookText: 3.0, hookAhora: 4.45, splitStart: 5.4, splitEnd: 6.1,
  land: 6.25, rings: [6.8, 8.4, 10.0, 11.6], ringDur: 1.0,
  cust: 6.3, typingA: 8.1, agent: 8.5, sheet: 8.9, tap1: 11.05, step2: 11.3, tap2: 11.55, step3: 11.8, tap3: 12.05, done: 12.5,
  capT: [6.9, 8.9, 10.6],
  spin0: 13.1, spin1: 14.3, morning: 13.5, sunUp: 13.8, pan0: 13.4, pan1: 15.0, clockSwap: 14.1,
  note: 15.0, cards: [16.2, 16.5, 16.8], win: 17.3,
  wipe: 18.2, hub0: 18.6, hubSpeed: 1.5, tag2: 22.9, cursorIn: 23.7, click: 24.7, end: DUR,
};
fs.writeFileSync(path.join(HERE, 'timing46.json'), JSON.stringify(TM, null, 1));

const u = (p) => pathToFileURL(path.resolve(p)).href;
const svg64 = (f) => 'data:image/svg+xml;base64,' + fs.readFileSync(path.join(ROOT, 'public/brand', f)).toString('base64');
let html = fs.readFileSync(path.join(HERE, 'page46.head.html'), 'utf8') + fs.readFileSync(path.join(HERE, 'page46.script.html'), 'utf8');
const rep = {
  __FONT__: u(path.join(ROOT, 'src/app/fonts/DMSans-latin-wght.woff2')),
  __GRAIN__: u(path.join(HERE, 'assets/grain.png')), __OFICINA__: u(path.join(HERE, 'assets/oficina.png')),
  __TEL__: u(path.join(HERE, 'assets/telefono.png')),
  __LOGO__: svg64('logo-horizontal.svg'), __ISO__: svg64('isotipo-azul.svg'),
  __TM__: JSON.stringify(TM), __ICONS__: JSON.stringify(ICONS),
};
for (const [k, v] of Object.entries(rep)) html = html.split(k).join(v);
const pageFile = path.join(HERE, 'page46.html'); fs.writeFileSync(pageFile, html);

const frames = WHICH === 'all' ? Array.from({ length: N }, (_, i) => i) : WHICH.split(',').map(Number);
const { chromium } = await import(pathToFileURL(ROOT + '/node_modules/playwright/index.mjs').href);
const b = await chromium.launch();
async function worker(w) {
  const pg = await b.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
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
