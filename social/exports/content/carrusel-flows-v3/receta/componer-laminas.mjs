import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const ROOT = 'C:/Users/alain/ATACAMA-LABS-SPEC-DRIVEN-v1.0/atacama-labs-app';
const DIR = process.argv[2];
const ONLY = process.argv[3] ? process.argv[3].split(',').map(Number) : [1, 2, 3, 4, 5];
const U = (f) => pathToFileURL(path.resolve(DIR, f)).href;
const FONT = pathToFileURL(path.join(ROOT, 'src/app/fonts/DMSans-latin-wght.woff2')).href;
const b64 = (f) => 'data:image/svg+xml;base64,' + fs.readFileSync(path.join(ROOT, 'public/brand', f)).toString('base64');
const logo = b64('logo-horizontal.svg');

const CSS = `
@font-face{font-family:"DM Sans";src:url("${FONT}") format("woff2");font-weight:100 1000}
*{margin:0;padding:0;box-sizing:border-box}
body{width:1080px;height:1350px;position:relative;overflow:hidden;font-family:"DM Sans",sans-serif;color:#0b1e3f;-webkit-font-smoothing:antialiased;background:#f3f6fd}
.bg{position:absolute;inset:0;background:radial-gradient(62% 46% at 50% 50%,rgba(15,92,237,.17),rgba(15,92,237,0) 72%),linear-gradient(180deg,#eef3fe,#e3ecfc)}
.grid{position:absolute;inset:0;background-image:linear-gradient(rgba(15,92,237,.12) 2px,transparent 2px),linear-gradient(90deg,rgba(15,92,237,.12) 2px,transparent 2px),linear-gradient(rgba(15,92,237,.055) 1px,transparent 1px),linear-gradient(90deg,rgba(15,92,237,.055) 1px,transparent 1px);background-size:120px 120px,120px 120px,40px 40px,40px 40px}
.br{position:absolute;width:64px;height:64px;border:5px solid #0f5ced;z-index:9}
.tl{left:38px;top:38px;border-right:0;border-bottom:0}.tr{right:38px;top:38px;border-left:0;border-bottom:0}
.bl{left:38px;bottom:38px;border-right:0;border-top:0}.brr{right:38px;bottom:38px;border-left:0;border-top:0}
.h{position:absolute;left:0;width:1080px;text-align:center;font-weight:700;letter-spacing:-.035em;line-height:1.05;white-space:nowrap;z-index:5}
.h em{font-style:normal;color:#0f5ced}
.card{position:absolute;left:0;width:1080px;background:#fff;border-radius:56px 56px 0 0;box-shadow:0 -14px 40px rgba(11,30,63,.12);z-index:6}
.b{position:absolute;left:110px;width:860px;text-align:center;font-size:28px;line-height:1.32;z-index:7}
.b b{font-weight:700}
.logo{position:absolute;left:50%;transform:translateX(-50%);z-index:7}
.n{position:absolute;font-size:24px;font-weight:600;color:#0f5ced;letter-spacing:.08em;z-index:7}
.pill{position:absolute;left:50%;transform:translateX(-50%);background:#0f5ced;color:#fff;font-weight:600;font-size:26px;letter-spacing:.02em;padding:14px 34px;border-radius:60px;white-space:nowrap;box-shadow:0 12px 28px rgba(15,92,237,.35);z-index:5}
.img{position:absolute;z-index:2;filter:drop-shadow(0 30px 40px rgba(11,30,63,.26))}
.num{position:absolute;width:62px;height:62px;border-radius:50%;background:#0f5ced;color:#fff;font-weight:700;font-size:34px;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 24px rgba(15,92,237,.4);z-index:8}
`;
const frame = (inner, extraCss = '') => `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>${CSS}${extraCss}</style></head><body><div class="bg"></div><div class="grid"></div>${inner}</body></html>`;
const textCard = (top, body, n) => `<div class="card" style="top:${top}px;height:${1350 - top}px"></div><div class="b" style="top:${top + 20}px">${body}</div><img class="logo" src="${logo}" style="top:${1350 - 82}px;width:230px"><div class="n" style="right:120px;top:${1350 - 78}px">${n} / 05</div>`;

const SLIDES = {
  1: frame(`
<div class="pill" style="top:66px">NUEVO COBRO DESDE EL 1 DE OCTUBRE</div>
<div class="h" style="top:140px;font-size:57px">¿Agendar una hora en 8 mensajes?<br><em>Bastan 3 toques.</em></div>
<img class="img" src="${U('v2/cut-p1.png')}" style="left:70px;top:186px;width:940px">
<div class="card" style="top:1232px;height:118px"></div><img class="logo" src="${logo}" style="top:1268px;width:240px"><div class="n" style="right:120px;top:1272px">01 / 05</div>`),
  2: frame(`
<div class="h" style="top:62px;font-size:56px">Agendar una hora son 8 mensajes.<br><em>4 los pagas tú.</em></div>
<img class="img" src="${U('t2/cut.png')}" style="left:65px;top:84px;width:950px">
${textCard(1092, 'Desde el 1 de octubre, lo que tu empresa responde dentro de las 24 h <b>tiene costo</b>, pasados los 1.000 gratis al mes por número. Lo que escribe el cliente, no.', '02')}`),
  3: frame(`
<div class="h" style="top:62px;font-size:62px">El mismo trámite en <em>3 toques.</em></div>
<img class="img" src="${U('v2/crop-p3a.png')}" style="left:6px;top:300px;width:372px;transform:rotate(-2deg)">
<img class="img" src="${U('v2/crop-p3c.png')}" style="left:702px;top:300px;width:372px;transform:rotate(2deg)">
<img class="img" src="${U('v2/crop-p3b.png')}" style="left:348px;top:205px;width:384px;z-index:3">
<div class="num" style="left:163px;top:232px">1</div><div class="num" style="left:509px;top:136px">2</div><div class="num" style="left:855px;top:232px">3</div>
${textCard(1092, 'Un formulario dentro del chat (WhatsApp Flows) reemplaza las preguntas una por una. <b>Menos idas y vueltas.</b>', '03')}`),
  4: frame(`
<div class="h" style="top:56px;font-size:58px">Y nosotros lo dejamos <em>configurado.</em></div>
<img class="img" src="${U('v2/crop-p4d.png')}" style="left:324px;top:134px;height:888px">
<div class="card" style="top:1030px;height:320px"></div>
<div class="step" style="top:1060px"><span class="sn">1</span><span>Revisamos tu <b>proceso de agenda</b></span></div>
<div class="step" style="top:1136px"><span class="sn">2</span><span>Configuramos el <b>agente y el formulario</b></span></div>
<div class="step" style="top:1212px"><span class="sn">3</span><span>Lo conectamos a tu agenda y <b>lo probamos contigo</b></span></div>
<img class="logo" src="${logo}" style="top:1292px;width:200px"><div class="n" style="right:120px;top:1296px">04 / 05</div>`, `.step{position:absolute;left:90px;width:900px;z-index:7;font-size:34px;display:flex;align-items:center;gap:20px;line-height:1.1}.step b{font-weight:700;color:#0f5ced}.sn{flex:none;width:50px;height:50px;border-radius:50%;background:#0f5ced;color:#fff;font-weight:700;font-size:28px;display:flex;align-items:center;justify-content:center}`),
  5: frame(`
<div style="position:absolute;inset:0;background:radial-gradient(48% 30% at 50% 47%,rgba(15,92,237,.22),rgba(15,92,237,0) 72%);z-index:1"></div>
<img class="logo" src="${logo}" style="top:490px;width:700px;z-index:4">
<div class="h" style="top:625px;font-size:80px;font-weight:500;letter-spacing:-.03em">Agentes que <em style="font-weight:600;position:relative">trabajan.<span style="position:absolute;left:3%;right:3%;bottom:-8px;height:5px;background:#0f5ced;border-radius:4px"></span></em></div>
<div style="position:absolute;left:0;width:1080px;top:820px;text-align:center;font-size:26px;font-weight:500;letter-spacing:.2em;color:#0f5ced;z-index:4">ATACAMALABS.CL</div>
<div class="br" style="left:96px;top:420px;border-right:0;border-bottom:0;width:58px;height:58px"></div><div class="br" style="right:96px;top:420px;border-left:0;border-bottom:0;width:58px;height:58px"></div><div class="br" style="left:96px;top:900px;border-right:0;border-top:0;width:58px;height:58px"></div><div class="br" style="right:96px;top:900px;border-left:0;border-top:0;width:58px;height:58px"></div>
<div class="n" style="right:120px;top:1262px">05 / 05</div>`),
};

const { chromium } = await import(pathToFileURL(ROOT + '/node_modules/playwright/index.mjs').href);
const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1080, height: 1350 } });
for (const k of ONLY) {
  const f = path.join(DIR, `lam-${k}.html`); fs.writeFileSync(f, SLIDES[k]);
  await pg.goto(pathToFileURL(f).href); await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(300);
  await pg.screenshot({ path: path.join(DIR, `lam-${k}.png`) }); fs.rmSync(f, { force: true }); console.log('ok', k);
}
await b.close();
