#!/usr/bin/env node
/**
 * Historias «atacamizadas»: 5 piezas inspiradas en la ESTRUCTURA de los anuncios de la competencia (pregunta de dolor → prueba en un chat →
 * resultado → cómo trabaja el agente → logo), con nuestro lenguaje (paneles partidos, cuadrícula, azules de marca, llamita), copy propio
 * y SIN copiar sus textos, composiciones ni imágenes.
 *
 * Uso: node brand/content/historias/build.mjs [01 02 03 04 05]   → out/NN-nombre.png
 * Historias 1080×1920 (zonas seguras: sin texto clave en los primeros 250 px ni en los últimos 250 px); banner 1200×628.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../..');
const OUT = path.join(HERE, 'out');
fs.mkdirSync(OUT, { recursive: true });
const FONT = pathToFileURL(path.join(ROOT, 'src/app/fonts/DMSans-latin-wght.woff2')).href;
const uri = (file) => 'data:image/svg+xml;base64,' + fs.readFileSync(path.join(ROOT, 'public/brand', file)).toString('base64');
const LOGO = uri('logo-horizontal.svg');          // sobre fondo claro
const LOGO_DARK = uri('logo-horizontal-fondo-oscuro.svg'); // sobre azul profundo
const LLAMA = pathToFileURL(path.join(HERE, 'assets/llamita-frio-atacama.jpg')).href;

const CSS = `
@font-face { font-family: "DM Sans"; src: url("${FONT}") format("woff2"); font-weight: 100 1000; }
:root { --real:#1a3c8e; --blue:#0f5ced; --sky:#58a6ff; --mist:#f3f6fd; --ink:#0b1e3f; --line:rgba(15,92,237,.10); }
* { margin:0; padding:0; box-sizing:border-box; }
html, body { width:100%; height:100%; background:#fff; font-family:"DM Sans",sans-serif; -webkit-font-smoothing:antialiased; color:var(--ink); }
.canvas { position:relative; overflow:hidden; background:var(--mist); }
.grid { position:absolute; inset:0; background-image:linear-gradient(var(--gl,var(--line)) 2px,transparent 2px),linear-gradient(90deg,var(--gl,var(--line)) 2px,transparent 2px); background-size:120px 120px; }
.top { position:absolute; left:0; top:0; width:100%; background:var(--real); --gl:rgba(255,255,255,.13); overflow:hidden; }
.h { position:absolute; font-weight:500; letter-spacing:-.032em; line-height:1.04; }
.h em { font-style:normal; color:var(--sky); }
.body { position:absolute; font-weight:400; line-height:1.3; }
.body b { font-weight:600; }
.pill { position:absolute; left:50%; transform:translateX(-50%); background:var(--blue); color:#fff; font-weight:600; white-space:nowrap; border-radius:70px; box-shadow:0 14px 34px rgba(15,92,237,.35); }
.logo { position:absolute; left:50%; transform:translateX(-50%); }
.url { position:absolute; left:0; width:100%; text-align:center; font-weight:500; color:var(--blue); letter-spacing:.14em; }
.phone { position:absolute; background:#fff; border:3px solid #d5e0f6; box-shadow:0 30px 70px rgba(5,18,60,.28); overflow:hidden; }
.ph-head { display:flex; align-items:center; gap:18px; border-bottom:2px solid #e7eefb; font-weight:600; color:var(--ink); }
.av { border-radius:50%; background:var(--blue); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:600; }
.sep { text-align:center; margin:18px 0 6px; }
.sep span { display:inline-block; font-size:23px; color:#5f7094; background:#eef3fc; padding:6px 18px; border-radius:14px; }
.msg { max-width:80%; padding:18px 24px; border-radius:28px; font-size:29px; line-height:1.28; margin:10px 26px; }
.msg.in { background:#f1f5fd; border-bottom-left-radius:8px; }
.msg.out { background:#dce8ff; margin-left:auto; border-bottom-right-radius:8px; }
.ck { display:block; text-align:right; font-size:21px; color:var(--blue); margin-top:6px; letter-spacing:-.1em; }
.pdf { display:flex; align-items:center; gap:14px; background:#fff; border:2px solid #cfdcf5; border-radius:16px; padding:12px 16px; margin-bottom:12px; font-size:24px; }
.pdf i { font-style:normal; background:var(--blue); color:#fff; border-radius:8px; font-size:17px; font-weight:700; padding:12px 9px; }
`;

const shell = (w, h, inner) => `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>${CSS} body{width:${w}px;height:${h}px}</style></head><body><div class="canvas" style="width:${w}px;height:${h}px">${inner}</div></body></html>`;

// ── Chat de teléfono reutilizable (historias 04 y 05) ──
const chatStory = ({ h1, chat, pill, body, avatar, who }) => shell(1080, 1920, `
  <div class="grid"></div>
  <div class="top" style="height:480px"><div class="grid"></div></div>
  <div class="h" style="left:90px;top:262px;width:900px;font-size:72px;color:#fff">${h1}</div>
  <div class="phone" style="left:240px;top:540px;width:600px;height:830px;border-radius:70px">
    <div class="ph-head" style="height:112px;padding:0 34px;font-size:30px"><div class="av" style="width:58px;height:58px;font-size:28px">${avatar}</div><div>${who}<div style="font-size:22px;font-weight:400;color:#5f7094">en línea</div></div></div>
    ${chat}
  </div>
  <div class="pill" style="top:1412px;font-size:41px;padding:24px 54px">${pill}</div>
  <div class="body" style="left:110px;width:860px;top:1522px;font-size:38px;text-align:center">${body}</div>
  <img class="logo" src="${LOGO}" style="top:1652px;width:380px">
  <div class="url" style="top:1722px;font-size:26px">ATACAMALABS.CL</div>
`);

const PIECES = {
  // 01 · La llamita con frío en el Atacama («que no se enfríe» = la conversación)
  '01-llamita-frio': () => shell(1080, 1920, `
    <div style="position:absolute;inset:0;background:url('${LLAMA}') center/cover no-repeat"></div>
    <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(243,246,253,.55) 0%,rgba(243,246,253,0) 38%,rgba(243,246,253,0) 78%,rgba(243,246,253,.65) 100%)"></div>
    <div class="h" style="left:0;width:100%;text-align:center;top:270px;font-size:96px;color:var(--ink)">Que no se enfríen<br><span style="color:var(--real)">tus cotizaciones.</span></div>
    <div class="body" style="left:140px;width:800px;top:560px;font-size:42px;text-align:center;color:var(--ink)">Cuando alguien pregunta y nadie responde a tiempo, <b>el interés se enfría.</b> Un agente hace seguimiento hasta tener una respuesta.</div>
    <img class="logo" src="${LOGO}" style="top:1700px;width:420px">
  `),
  // 02 · Publicación 4:5 (1080×1350): recepción que sigue trabajando (antes banner horizontal 1200×628)
  '02-recepcion-post': () => shell(1080, 1350, `
    <div class="grid"></div>
    <div class="top" style="height:380px"><div class="grid"></div></div>
    <div class="h" style="left:80px;top:62px;width:920px;font-size:76px;color:#fff">Una recepción que<br>sigue <em>trabajando.</em></div>
    <div class="body" style="left:80px;top:228px;width:920px;font-size:31px;color:#e6efff">Agenda, confirma y responde consultas por WhatsApp, y deriva a tu equipo cuando hace falta.</div>
    <div class="phone" style="left:250px;top:330px;width:580px;height:650px;border-radius:64px">
      <div class="ph-head" style="height:100px;padding:0 30px;font-size:28px"><div class="av" style="width:52px;height:52px;font-size:25px">C</div><div>Clínica · Recepción<div style="font-size:20px;font-weight:400;color:#5f7094">en línea</div></div></div>
      <div class="msg in" style="font-size:26px;margin:12px 22px">Hola, ¿tienen hora mañana en la tarde?</div>
      <div class="msg out" style="font-size:26px;margin:8px 22px">Hay opciones a las 16:30 y 18:00. ¿Cuál prefieres?</div>
      <div class="msg in" style="font-size:26px;margin:8px 22px">16:30</div>
      <div style="margin:16px 22px 0;display:flex;gap:12px;align-items:center;background:#eef3fd;border:2px solid #cfdcf5;border-radius:18px;padding:14px 18px;font-size:23px;font-weight:600;color:var(--real)"><span style="background:var(--blue);color:#fff;border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-size:20px">✓</span>Cita registrada · Seguimiento activo</div>
    </div>
    <img class="logo" src="${LOGO}" style="top:1148px;width:380px">
    <div class="url" style="top:1218px;font-size:26px">ATACAMALABS.CL</div>
  `),
  // 03 · Embudo plano: solo lo que vale tu tiempo
  '03-solo-lo-que-vale': () => {
    const card = (x, y, r, kind) => `<g transform="translate(${x} ${y}) rotate(${r})"><rect width="150" height="72" rx="14" fill="#fff" stroke="#cfdcf5" stroke-width="2"/><circle cx="34" cy="36" r="17" fill="${kind === 'ok' ? '#0f5ced' : '#d7e0f2'}"/>${kind === 'ok' ? '<path d="M26 36l6 6 11-12" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' : '<text x="34" y="44" text-anchor="middle" font-size="24" font-weight="700" fill="#7a8bb0" font-family="DM Sans">?</text>'}<rect x="62" y="22" width="72" height="9" rx="4" fill="#dfe8f8"/><rect x="62" y="40" width="48" height="9" rx="4" fill="#e9eff9"/></g>`;
    return shell(1080, 1920, `
      <div class="grid"></div>
      <div class="top" style="height:800px"><div class="grid"></div></div>
      <div class="h" style="left:90px;top:262px;width:900px;font-size:92px;color:#fff">Solo lo que<br><em>vale tu tiempo.</em></div>
      <svg style="position:absolute;left:84px;top:500px" width="912" height="960" viewBox="0 0 760 800">
        ${card(60, 40, -9, 'q')}${card(220, 10, 6, 'q')}${card(400, 30, -5, 'q')}${card(560, 14, 8, 'q')}${card(130, 118, 5, 'q')}${card(320, 108, -7, 'q')}${card(500, 124, 6, 'q')}
        <defs><linearGradient id="fg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2e74f5"/><stop offset="1" stop-color="#0f5ced"/></linearGradient></defs>
        <path d="M110 250 L650 250 L440 470 L440 560 L320 560 L320 470 Z" fill="url(#fg)"/>
        <ellipse cx="380" cy="250" rx="270" ry="22" fill="#58a6ff" opacity=".55"/>
        ${card(100, 640, 0, 'ok')}${card(305, 640, 0, 'ok')}${card(510, 640, 0, 'ok')}
      </svg>
      <div class="pill" style="top:1430px;font-size:40px;padding:24px 52px">Atiende a todos, prioriza a quien avanza</div>
      <div class="body" style="left:110px;width:860px;top:1538px;font-size:38px;text-align:center">El agente conversa con cada contacto y te pasa a quienes están <b>listos para avanzar.</b></div>
      <img class="logo" src="${LOGO}" style="top:1668px;width:380px">
      <div class="url" style="top:1738px;font-size:26px">ATACAMALABS.CL</div>
    `);
  },
  // 04 · Minería: cotización que no tuvo respuesta
  '04-cotizacion-mineria': () => chatStory({
    h1: 'Pidió la cotización<br><em>y desapareció.</em>', avatar: 'M', who: 'Cliente · Faena',
    chat: `<div class="sep"><span>Hace 3 días</span></div>
      <div class="msg in">Hola, ¿me envías la cotización de la retroexcavadora?</div>
      <div class="msg out"><div class="pdf"><i>PDF</i><div>Cotización.pdf<div style="font-size:19px;color:#6b7a99">1 página</div></div></div>Aquí la tienes. Cualquier duda, escríbeme.</div>
      <div class="sep"><span>Hoy</span></div>
      <div class="msg out">Hola, ¿pudiste revisar la cotización? Si quieres, agendamos una llamada.<span class="ck">✓✓</span></div>`,
    pill: 'Seguimiento hasta tener respuesta',
    body: 'El agente retoma la conversación y <b>avisa a una persona</b> cuando hay interés.',
  }),
  // 05 · Salud: hora que no se confirmó
  '05-hora-salud': () => chatStory({
    h1: 'Preguntó por la hora<br><em>y no volvió.</em>', avatar: 'P', who: 'Paciente · Clínica',
    chat: `<div class="sep"><span>Hace 2 días</span></div>
      <div class="msg in">Hola, ¿tienen hora para ortodoncia esta semana?</div>
      <div class="msg out">Hay jueves 15:30 y viernes 11:00. ¿Cuál prefieres?</div>
      <div class="sep"><span>Hoy</span></div>
      <div class="msg out">Te dejé reservada la hora del jueves 15:30. ¿La confirmo?<span class="ck">✓✓</span></div>
      <div class="msg in">Sí, confírmala.</div>`,
    pill: 'Hora confirmada',
    body: 'El agente agenda, confirma y reconfirma, y <b>deriva a tu equipo</b> cuando hace falta.',
  }),
};

const only = process.argv.slice(2);
const browser = await chromium.launch();
for (const [name, fn] of Object.entries(PIECES)) {
  if (only.length && !only.some((o) => name.startsWith(o))) continue;
  const post45 = name.startsWith('02');
  const page = await browser.newPage({ viewport: { width: 1080, height: post45 ? 1350 : 1920 } });
  const file = path.join(OUT, name + '.html');
  fs.writeFileSync(file, fn());
  await page.goto(pathToFileURL(file).href);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(OUT, name + '.png') });
  await page.close();
  console.log('ok', name);
}
await browser.close();
