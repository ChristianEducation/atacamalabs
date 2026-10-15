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
const FPS = 30, DUR = 22.3, N = Math.round(FPS * DUR);
fs.mkdirSync(OUT, { recursive: true });

const TM = {
  hookTitle: 0.5, hookNotif: 1.9, hookText: 3.1, hookAhora: 3.8, splitStart: 4.9, splitEnd: 5.6,
  land: 5.75, rings: [6.0, 7.3, 8.6, 9.9], ringDur: 0.9,
  cust: 5.7, typingA: 5.95, agent: 6.3, sheet: 6.65, tap1: 7.4, step2: 7.7, tap2: 8.2, step3: 8.5, tap3: 8.95, done: 9.4,
  capT: [6.1, 7.5, 8.9],
  spin0: 10.6, spin1: 11.8, morning: 11.0, sunUp: 11.25, pan0: 10.9, pan1: 12.5, clockSwap: 11.5,
  note: 12.4, cards: [12.8, 13.1, 13.4], win: 14.0,
  wipe: 15.3, hub0: 15.7, hubSpeed: 1.9, tag2: 18.9, cursorIn: 20.0, click: 20.9, end: DUR,
};
fs.writeFileSync(path.join(HERE, 'timing47.json'), JSON.stringify(TM, null, 1));

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
const pageFile = path.join(HERE, 'page47.html'); fs.writeFileSync(pageFile, html);

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
