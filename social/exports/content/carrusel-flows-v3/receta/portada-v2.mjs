import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const ROOT = 'C:/Users/alain/ATACAMA-LABS-SPEC-DRIVEN-v1.0/atacama-labs-app';
const SP = 'C:/Users/alain/AppData/Local/Temp/claude/C--Users-alain-ATACAMA-LABS-SPEC-DRIVEN-v1-0/04ebf49b-4382-4804-ab89-2ce89d5c5fc8/scratchpad/car1';
// uso: node portada2.mjs <a|b> <ancho> <left> <top> <salida.png>
const [V, W, LEFT, TOP, OUT] = [process.argv[2] || 'a', Number(process.argv[3] || 1000), Number(process.argv[4] || 70), Number(process.argv[5] || 320), process.argv[6] || 'portada2-a.png'];
const FONT = pathToFileURL(path.join(ROOT, 'src/app/fonts/DMSans-latin-wght.woff2')).href;
const logo = 'data:image/svg+xml;base64,' + fs.readFileSync(path.join(ROOT, 'public/brand/logo-horizontal.svg')).toString('base64');
const art = pathToFileURL(path.join(SP, 'v4/cut-' + V + '.png')).href;

const WA_PATH = 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z';
const GREEN = '#5BCB6E';
// icono de WhatsApp (cuadrado redondeado verde con el glifo blanco), como en la referencia
const waIcon = (size) => `<svg width="${size}" height="${size}" viewBox="0 0 100 100"><rect x="0" y="0" width="100" height="100" rx="30" fill="${GREEN}"/><g transform="translate(17 17) scale(2.75)"><path d="${WA_PATH}" fill="#fff"/></g></svg>`;
const waGlyph = (size, color) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><path d="${WA_PATH}" fill="${color}"/></svg>`;
// icono de Flows: tres nodos unidos formando un triángulo
const flowsIcon = (size) => `<svg width="${size}" height="${size}" viewBox="0 0 100 100"><g stroke="${GREEN}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" fill="none"><path d="M24 22 L78 44 L30 80 Z"/></g><circle cx="24" cy="22" r="14" fill="${GREEN}"/><circle cx="78" cy="44" r="14" fill="${GREEN}"/><circle cx="30" cy="80" r="14" fill="${GREEN}"/></svg>`;

const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>
@font-face{font-family:"DM Sans";src:url("${FONT}") format("woff2");font-weight:100 1000}
*{margin:0;padding:0;box-sizing:border-box}
body{width:1080px;height:1350px;position:relative;overflow:hidden;font-family:"DM Sans",sans-serif;color:#0b1e3f;-webkit-font-smoothing:antialiased;background:#f3f6fd}
.bg{position:absolute;inset:0;background:radial-gradient(62% 46% at 50% 50%,rgba(15,92,237,.17),rgba(15,92,237,0) 72%),linear-gradient(180deg,#eef3fe,#e3ecfc)}
.halo{position:absolute;inset:0;background:radial-gradient(58% 36% at 66% 76%,rgba(15,92,237,.34),rgba(15,92,237,0) 74%);z-index:1}
.grid{position:absolute;inset:0;background-image:linear-gradient(rgba(15,92,237,.12) 2px,transparent 2px),linear-gradient(90deg,rgba(15,92,237,.12) 2px,transparent 2px),linear-gradient(rgba(15,92,237,.055) 1px,transparent 1px),linear-gradient(90deg,rgba(15,92,237,.055) 1px,transparent 1px);background-size:120px 120px,120px 120px,40px 40px,40px 40px}
.pill{position:absolute;left:60px;top:58px;background:#0f5ced;color:#fff;font-weight:600;font-size:24px;letter-spacing:.03em;padding:13px 30px 13px 20px;border-radius:60px;white-space:nowrap;box-shadow:0 12px 28px rgba(15,92,237,.35);z-index:5;display:flex;align-items:center;gap:12px}
.h{position:absolute;left:60px;font-weight:700;letter-spacing:-.04em;line-height:1;white-space:nowrap;z-index:5}
.h em{font-style:normal;color:#0f5ced}
.sub{position:absolute;left:62px;font-weight:600;letter-spacing:-.025em;white-space:nowrap;z-index:5;color:#0b1e3f}
.sub em{font-style:normal;color:#0f5ced}
.lock{position:absolute;left:58px;z-index:5;display:flex;align-items:center;gap:26px}
.lock .t1{font-size:112px;font-weight:500;letter-spacing:-.045em;line-height:.95;color:#0a0f1f}
.lock .t2{display:flex;align-items:center;gap:22px;font-size:104px;font-weight:400;letter-spacing:-.04em;line-height:.95;color:${GREEN}}
.img{position:absolute;z-index:2;filter:drop-shadow(0 30px 40px rgba(11,30,63,.28))}
.card{position:absolute;left:0;width:1080px;background:#fff;border-radius:56px 56px 0 0;box-shadow:0 -14px 40px rgba(11,30,63,.12);z-index:6}
.logo{position:absolute;left:50%;transform:translateX(-50%);z-index:7}
.n{position:absolute;font-size:24px;font-weight:600;color:#0f5ced;letter-spacing:.08em;z-index:7}
</style></head><body><div class="bg"></div><div class="halo"></div><div class="grid"></div>
<div class="pill">${waGlyph(34, '#fff')}<span>NUEVO COBRO DE WHATSAPP · DESDE EL 1 DE OCTUBRE</span></div>
<div class="h" style="top:132px;font-size:108px">Menos mensajes,<br><em>menos cobro.</em></div>
<div class="sub" style="top:364px;font-size:56px">Agenda en <em>3 toques</em> con</div>
<div class="lock" style="top:440px">${waIcon(168)}<div><div class="t1">WhatsApp</div><div class="t2"><span>Flows</span>${flowsIcon(66)}</div></div></div>
<img class="img" src="${art}" style="left:${LEFT}px;top:${TOP}px;width:${W}px">
<div class="card" style="top:1232px;height:118px"></div>
<div class="n" style="left:120px;top:1272px">DESLIZA →</div>
<img class="logo" src="${logo}" style="top:1268px;width:240px"><div class="n" style="right:120px;top:1272px">01 / 05</div>
</body></html>`;
const { chromium } = await import(pathToFileURL(ROOT + '/node_modules/playwright/index.mjs').href);
const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1080, height: 1350 } });
const f = path.join(SP, 'v4/_p2.html'); fs.writeFileSync(f, html);
await pg.goto(pathToFileURL(f).href); await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(300);
await pg.screenshot({ path: path.join(SP, 'v4', OUT) }); fs.rmSync(f, { force: true }); await b.close(); console.log('ok');
