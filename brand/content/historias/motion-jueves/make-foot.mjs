// Genera un PNG transparente 1080x1920 con la nota de fuente (para superponer al recorte del reel). Uso: node make-foot.mjs <salida.png>
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const ROOT = 'C:/Users/alain/ATACAMA-LABS-SPEC-DRIVEN-v1.0/atacama-labs-app';
const OUT = process.argv[2];
const font = pathToFileURL(path.join(ROOT, 'src/app/fonts/DMSans-latin-wght.woff2')).href;
const html = `<!doctype html><html><head><meta charset="utf-8"><style>@font-face{font-family:"DM Sans";src:url("${font}") format("woff2");font-weight:100 1000}
html,body{margin:0;width:1080px;height:1920px;background:transparent}
.f{position:absolute;left:90px;width:900px;top:1560px;text-align:center;font-family:"DM Sans",sans-serif;font-size:27px;line-height:1.3;color:#5f7094}</style></head>
<body><div class="f">Cifras de referencia de HighLevel (GHL). Los resultados varían según cada negocio.</div></body></html>`;
const f = path.join(path.dirname(OUT), 'foot.html'); fs.writeFileSync(f, html);
const { chromium } = await import(pathToFileURL(ROOT + '/node_modules/playwright/index.mjs').href);
const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await pg.goto(pathToFileURL(f).href); await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(300);
await pg.screenshot({ path: OUT, omitBackground: true }); await b.close(); console.log('ok');
