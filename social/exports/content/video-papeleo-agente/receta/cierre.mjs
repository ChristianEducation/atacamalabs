// Cierre del video (desde el segundo 24.0): hub de herramientas con el logo oficial de Atacama y cierre de marca.
// Todo es función pura del tiempo (determinista). Salida: PNG por cuadro a 960x1708 (se reduce a 480x854 al ensamblar).
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const ROOT = 'C:/Users/alain/ATACAMA-LABS-SPEC-DRIVEN-v1.0/atacama-labs-app';
const VID = 'C:/Users/alain/AppData/Local/Temp/claude/C--Users-alain-ATACAMA-LABS-SPEC-DRIVEN-v1-0/04ebf49b-4382-4804-ab89-2ce89d5c5fc8/scratchpad/vid';
const N = Number(process.argv[2] || 145);
const OUTDIR = path.join(VID, 'cierre-frames');
fs.mkdirSync(OUTDIR, { recursive: true });
const FONT = pathToFileURL(path.join(ROOT, 'src/app/fonts/DMSans-latin-wght.woff2')).href;
const PLATE = pathToFileURL(path.join(VID, 'plate-960.png')).href;
const svgInline = (f) => fs.readFileSync(path.join(ROOT, 'public/brand', f), 'utf8');
const LOGO = 'data:image/svg+xml;base64,' + Buffer.from(svgInline('logo-horizontal.svg')).toString('base64');
const ISO = 'data:image/svg+xml;base64,' + Buffer.from(svgInline('isotipo-azul.svg')).toString('base64');

const WA = 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z';

// Íconos de 160x160 dibujados como recortes de papel (borde crema + sombra suave)
const CREAM = '#f5ecd8';
const frame = (inner) => `<rect x="-6" y="-6" width="172" height="172" rx="38" fill="${CREAM}"/>${inner}`;
const ICONS = {
  calendar: frame(`<rect width="160" height="160" rx="32" fill="#1a73e8"/><path d="M0 32 Q0 0 32 0 H80 L0 80Z" fill="#34a853"/><path d="M80 0 H128 Q160 0 160 32 V60 L100 0Z" fill="#ea4335"/><path d="M0 80 L0 128 Q0 160 32 160 H70 L0 90Z" fill="#fbbc04"/><rect x="22" y="22" width="116" height="116" rx="18" fill="#fff"/><text x="80" y="104" text-anchor="middle" font-family="DM Sans" font-weight="800" font-size="62" fill="#1a73e8">31</text>`),
  doc: frame(`<rect width="160" height="160" rx="32" fill="#1c4fd6"/><g fill="#fff"><rect x="36" y="38" width="88" height="10" rx="5"/><rect x="36" y="62" width="88" height="10" rx="5"/><rect x="36" y="86" width="88" height="10" rx="5"/><rect x="36" y="110" width="56" height="10" rx="5"/></g>`),
  tasks: frame(`<rect width="160" height="160" rx="32" fill="#1c4fd6"/><circle cx="80" cy="80" r="44" fill="none" stroke="#fff" stroke-width="12"/><path d="M58 82 L74 98 L104 64" fill="none" stroke="#fff" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>`),
  whatsapp: frame(`<rect width="160" height="160" rx="40" fill="#1e9d3d"/><g transform="translate(22 22) scale(4.6)"><path d="${WA}" fill="#fff"/></g>`),
  sheets: frame(`<rect width="160" height="160" rx="32" fill="#0f9d58"/><path d="M104 0 L160 56 V32 Q160 0 128 0Z" fill="#0b7a43"/><rect x="34" y="62" width="92" height="66" rx="8" fill="#fff"/><g stroke="#0f9d58" stroke-width="6"><path d="M34 84 H126 M34 106 H126 M64 62 V128 M96 62 V128"/></g>`),
  gmail: frame(`<rect width="160" height="160" rx="32" fill="#fff"/><path d="M22 120 V52 L80 94 L138 52 V120" fill="none" stroke="#ea4335" stroke-width="22" stroke-linejoin="round"/><rect x="22" y="52" width="22" height="68" fill="#4285f4"/><rect x="116" y="52" width="22" height="68" fill="#34a853"/>`),
};

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:"DM Sans";src:url("${FONT}") format("woff2");font-weight:100 1000}
*{margin:0;padding:0}
body{width:480px;height:854px;overflow:hidden;background:#e9d9bd}
#stage{position:absolute;left:0;top:0.3px;width:1080px;height:1920px;transform:scale(.4444444);transform-origin:0 0}
#plate{position:absolute;inset:0;width:1080px;height:1920px;object-fit:cover}
svg{position:absolute;left:0;top:0;overflow:visible}
.sh{filter:drop-shadow(0 8px 9px rgba(70,45,15,.38))}
</style></head><body><div id="stage"><img id="plate" src="${PLATE}">
<svg id="s" width="1080" height="1920" viewBox="0 0 1080 1920">
 <g id="lines" fill="none" stroke="#1747d9" stroke-width="7" stroke-linecap="round"></g>
 <g id="nodes"></g>
 <g id="pulses"></g>
 <g id="center" class="sh"></g>
</svg>
<div id="endcard" style="position:absolute;left:0;top:0;width:1080px;height:1920px;opacity:0">
 <img src="${LOGO}" style="position:absolute;left:150px;top:740px;width:780px">
 <div style="position:absolute;left:0;width:1080px;top:930px;text-align:center;font:500 100px 'DM Sans';letter-spacing:-.03em;color:#16233f">Agentes que <span style="position:relative;font-weight:700;color:#0f5ced">trabajan.<i id="ul" style="position:absolute;left:2%;bottom:-4px;height:7px;width:0;background:#0f5ced;border-radius:4px"></i></span></div>
 <div id="url" style="position:absolute;left:0;width:1080px;top:1105px;text-align:center;font:600 38px 'DM Sans';letter-spacing:.22em;color:#0f5ced;opacity:0">ATACAMALABS.CL</div>
</div></div>
<script>
const ICON = ${JSON.stringify(ICONS)};
const C = { x: 540, y: 960 };
const NODES = [
  { id: 'cal',  kind: 'calendar', from: [540, 558], to: [540, 520], size: 190, move: [0.15, 0.95], pop: 0 },
  { id: 'doc',  kind: 'doc',      from: [540, 940], to: [170, 1160], size: 190, move: [0.15, 0.95] },
  { id: 'mail', kind: 'gmail',    from: [540, 1393], to: [910, 1160], size: 190, move: [0.15, 0.95], morphFrom: 'calendar', morph: [0.45, 0.8] },
  { id: 'wa',   kind: 'whatsapp', to: [170, 760], size: 190, pop: 0.75 },
  { id: 'sh',   kind: 'sheets',   to: [910, 760], size: 190, pop: 0.95 },
  { id: 'tk',   kind: 'tasks',    to: [540, 1400], size: 190, pop: 1.15 },
];
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const eio = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const eout = (t) => 1 - Math.pow(1 - t, 3);
const pop = (u) => (u <= 0 ? 0 : clamp(1 - Math.exp(-7.5 * u) * Math.cos(12 * u), 0, 1.25));
const NS = 'http://www.w3.org/2000/svg';
const gNodes = document.getElementById('nodes'), gLines = document.getElementById('lines'), gPulses = document.getElementById('pulses'), gCenter = document.getElementById('center');
const nodeEls = {}, lineEls = {};
for (const n of NODES) {
  const g = document.createElementNS(NS, 'g'); g.setAttribute('class', 'sh');
  const inner = document.createElementNS(NS, 'g'); inner.innerHTML = ICON[n.kind];
  const inner2 = document.createElementNS(NS, 'g'); inner2.innerHTML = n.morphFrom ? ICON[n.morphFrom] : '';
  g.append(inner2, inner); gNodes.append(g); nodeEls[n.id] = { g, inner, inner2 };
  const l = document.createElementNS(NS, 'path'); l.setAttribute('pathLength', '1'); l.setAttribute('stroke-dasharray', '1'); gLines.append(l); lineEls[n.id] = l;
}
// línea vertical de arranque (empalme con el video original)
const vline = document.createElementNS(NS, 'path'); vline.setAttribute('stroke-width', '7'); gLines.append(vline);
// centro: isotipo oficial sobre botón de papel
gCenter.innerHTML = '<circle r="172" fill="#f5ecd8"/><circle r="150" fill="#fff"/><image href="${ISO}" x="-96" y="-96" width="192" height="192"/>';
const pulses = [];
for (let i = 0; i < 6; i++) { const c = document.createElementNS(NS, 'circle'); c.setAttribute('r', '13'); c.setAttribute('fill', '#2a5bff'); c.setAttribute('stroke', '#fff'); c.setAttribute('stroke-width', '4'); gPulses.append(c); pulses.push(c); }
const SEQ = ['wa', 'cal', 'sh', 'mail', 'tk', 'doc'];

function pos(n, t) {
  if (!n.from) return n.to;
  const [a, b] = n.move; const u = eio(clamp((t - a) / (b - a)));
  return [lerp(n.from[0], n.to[0], u), lerp(n.from[1], n.to[1], u)];
}
function draw(t) {
  const endU = eio(clamp((t - 3.5) / 0.7));      // los nodos se recogen hacia el centro
  const logoU = eout(clamp((t - 4.5) / 0.7));   // aparece el logo
  const absorb = (p) => [lerp(p[0], C.x, endU), lerp(p[1], C.y, endU)];
  // línea vertical inicial
  const vOp = 1 - clamp((t - 0.25) / 0.45);
  vline.setAttribute('d', 'M540 340 V1393'); vline.setAttribute('opacity', vOp);
  for (const n of NODES) {
    const els = nodeEls[n.id];
    let p = pos(n, t); let sc = 1; let op = 1;
    if (n.pop !== undefined) { sc = n.pop === 0 ? 1 : pop(t - n.pop); op = n.pop === 0 ? 1 : (t >= n.pop ? 1 : 0); }
    if (n.id === 'tk') { /* aparece cuando el calendario inferior ya se fue */ }
    // pulso de recepción: pequeño rebote cuando llega una señal
    const idx = SEQ.indexOf(n.id); const ts = 2.0 + idx * 0.25; const bump = 1 + 0.10 * Math.sin(clamp((t - (ts + 0.2)) / 0.3) * Math.PI) * (t < 3.5 ? 1 : 0);
    sc *= bump;
    let q = absorb(p); sc *= 1 - 0.55 * endU; op *= 1 - clamp((endU - 0.55) / 0.45);
    els.g.setAttribute('transform', 'translate(' + q[0] + ' ' + q[1] + ') scale(' + (sc * n.size / 160) + ') translate(-80 -80)');
    els.g.setAttribute('opacity', op);
    if (n.morphFrom) { const m = clamp((t - n.morph[0]) / (n.morph[1] - n.morph[0])); els.inner.setAttribute('opacity', m); els.inner2.setAttribute('opacity', 1 - m); }
    // conector centro → nodo
    const lp = lineEls[n.id]; const draw0 = n.pop === undefined || n.pop === 0 ? 1.2 : n.pop + 0.35; const prog = eio(clamp((t - Math.max(draw0, 1.2)) / 0.55));
    const fade = 1 - clamp((endU - 0.2) / 0.5);
    lp.setAttribute('d', 'M' + C.x + ' ' + C.y + ' L' + q[0] + ' ' + q[1]); lp.setAttribute('stroke-dashoffset', 1 - prog); lp.setAttribute('opacity', fade * (prog > 0 ? 1 : 0));
  }
  // centro
  const cs = pop(t - 1.1) * (1 + 0.18 * endU); const cOp = 1 - clamp((t - 4.0) / 0.45);
  gCenter.setAttribute('transform', 'translate(' + C.x + ' ' + C.y + ') scale(' + cs + ')'); gCenter.setAttribute('opacity', cOp);
  // pulsos de señal: nodo → centro, luego centro → los demás
  pulses.forEach((c, i) => {
    const id = SEQ[i]; const n = NODES.find((x) => x.id === id); const p = pos(n, t); const s0 = 2.0 + i * 0.25;
    const u = clamp((t - s0) / 0.55); const vis = t >= s0 && t < s0 + 0.6 && t < 3.5;
    const dist = Math.hypot(C.x - p[0], C.y - p[1]); const f0 = 118 / dist, f1 = 1 - 176 / dist; const f = lerp(f0, f1, eio(u)); const x = lerp(p[0], C.x, f), y = lerp(p[1], C.y, f);
    c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('opacity', vis ? 1 : 0);
  });
  // tarjeta de cierre
  const end = document.getElementById('endcard');
  end.style.opacity = logoU;
  end.style.transform = 'translateY(' + (1 - logoU) * 26 + 'px)';
  document.getElementById('ul').style.width = (96 * eout(clamp((t - 5.1) / 0.5))) + '%';
  document.getElementById('url').style.opacity = eout(clamp((t - 5.3) / 0.5));
}
window.draw = draw;
</script></body></html>`;

const { chromium } = await import(pathToFileURL(ROOT + '/node_modules/playwright/index.mjs').href);
const b = await chromium.launch();
const pg = await b.newPage({ viewport: { width: 480, height: 854 }, deviceScaleFactor: 2 });
const f = path.join(VID, '_cierre.html'); fs.writeFileSync(f, html);
await pg.goto(pathToFileURL(f).href); await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(500);
const only = process.argv[3] ? process.argv[3].split(',').map(Number) : null;
for (let i = 0; i < N; i++) {
  if (only && !only.includes(i)) continue;
  await pg.evaluate((t) => window.draw(t), i / 24);
  await pg.screenshot({ path: path.join(OUTDIR, 'c' + String(i).padStart(3, '0') + '.png') });
}
await b.close(); console.log('ok', only ? only.length : N);
