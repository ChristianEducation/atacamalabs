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
const NOCHE = pathToFileURL(path.join(HERE, 'assets/llamita-noche.png')).href;
const DUDA = pathToFileURL(path.join(HERE, 'assets/llamita-duda.png')).href;

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
  // 06 · Lunes 12:00 — la pregunta de las 11 de la noche (pantalla bloqueada)
  '06-pregunta-11-noche': () => shell(1080, 1920, `
    <div style="position:absolute;inset:0;background:radial-gradient(80% 50% at 50% 38%,#24408f 0%,#10224f 55%,#070e24 100%)"></div>
    <div class="grid" style="--gl:rgba(255,255,255,.07)"></div>
    <div class="h" style="left:80px;top:262px;width:920px;font-size:84px;color:#fff;text-align:center">Si un cliente te escribe<br>a las 11 de la noche…</div>
    <div class="h" style="left:80px;top:470px;width:920px;font-size:92px;text-align:center;color:var(--sky);font-weight:600;white-space:nowrap">¿quién le contesta?</div>
    <div style="position:absolute;left:0;width:100%;top:690px;text-align:center;font-weight:300;font-size:220px;letter-spacing:-.04em;color:#fff;line-height:1">11:06</div>
    <div style="position:absolute;left:0;width:100%;top:935px;text-align:center;font-weight:500;font-size:36px;letter-spacing:.2em;color:#b9c9f0">DOMINGO</div>
    <div style="position:absolute;left:90px;top:1040px;width:900px;height:210px;border-radius:46px;background:rgba(255,255,255,.15);border:2px solid rgba(255,255,255,.28);box-shadow:0 24px 60px rgba(0,0,0,.35)">
      <div style="position:absolute;left:34px;top:36px;width:84px;height:84px;border-radius:24px;background:#25d366;display:flex;align-items:center;justify-content:center"><svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20l1.4-4.2A8 8 0 1 1 8.2 18.6z"/></svg></div>
      <div style="position:absolute;left:146px;top:30px;font-size:26px;font-weight:600;color:#c9d6f5;letter-spacing:.04em">WHATSAPP · AHORA</div>
      <div style="position:absolute;left:146px;top:70px;font-size:40px;font-weight:700;color:#fff">Andrés Rojas</div>
      <div style="position:absolute;left:146px;top:124px;font-size:34px;font-weight:400;color:#e6efff">Hola, ¿sigue disponible el Corolla?</div>
    </div>
    <div style="position:absolute;left:130px;top:1272px;width:820px;height:150px;border-radius:40px;background:rgba(255,255,255,.08);border:2px solid rgba(255,255,255,.16)">
      <div style="position:absolute;left:34px;top:26px;font-size:24px;font-weight:600;color:#9fb4dd;letter-spacing:.04em">WHATSAPP · HACE 2 MIN</div>
      <div style="position:absolute;left:34px;top:66px;font-size:32px;font-weight:600;color:#dbe6ff">Camila Soto</div>
      <div style="position:absolute;left:34px;top:108px;font-size:28px;color:#b9c9f0">¿Tienen hora para mañana?</div>
    </div>
    <img class="logo" src="${LOGO_DARK}" style="top:1652px;width:380px">
    <div class="url" style="top:1722px;font-size:26px;color:var(--sky)">ATACAMALABS.CL</div>
  `),
  // 07 · Martes 12:00 — el mismo cliente, ahora con agente
  '07-chat-auto-agente': () => chatStory({
    h1: 'Preguntó por el auto<br><em>y le respondieron.</em>', avatar: 'A', who: 'Cliente · Automotora',
    chat: `<div class="sep"><span>Hoy · 11:06 p. m.</span></div>
      <div class="msg in">Hola, ¿sigue disponible el Corolla 2021?</div>
      <div class="msg out">¡Hola Andrés! Sí, está disponible: 88.000 km, automático. Te envío las fotos.<div class="pdf" style="margin:12px 0 0"><i>9</i><div>fotos del auto</div></div></div>
      <div class="msg in">¿Puedo verlo el sábado a las 11?</div>
      <div class="msg out">Listo, dejé tu visita agendada. Un asesor te espera.<span class="ck">✓✓</span></div>`,
    pill: 'Visita agendada',
    body: 'El agente responde, muestra y agenda, y <b>avisa a tu equipo</b> cuando el cliente quiere ir.',
  }),
  // 08 · Martes 14:00 — teaser del carrusel / checklist
  '08-teaser-checklist': () => {
    const rows = ['Se repite', 'Tiene reglas claras', 'Mueves datos a mano', 'Cuesta tiempo o genera errores', 'Se puede medir y revisar'];
    return shell(1080, 1920, `
      <div class="grid"></div>
      <div class="top" style="height:620px"><div class="grid"></div></div>
      <div class="h" style="left:90px;top:262px;width:900px;font-size:88px;color:#fff">Antes de automatizar,<br><em>elige bien.</em></div>
      <div class="body" style="left:90px;width:900px;top:470px;font-size:36px;color:#dbe6ff">5 preguntas para saber por qué proceso partir.</div>
      <div style="position:absolute;left:90px;top:700px;width:900px;height:650px;border-radius:56px;background:#fff;border:3px solid #d5e0f6;box-shadow:0 30px 70px rgba(5,18,60,.22)">
        <div style="position:absolute;left:54px;top:40px;font-size:26px;font-weight:700;letter-spacing:.14em;color:var(--blue)">CHECKLIST · 10 MINUTOS</div>
        ${rows.map((t, i) => `<div style="position:absolute;left:54px;top:${110 + i * 104}px;width:792px;height:84px;display:flex;align-items:center;gap:26px;border-bottom:${i < 4 ? '2px solid #e7eefb' : '0'}"><div style="width:54px;height:54px;border-radius:50%;background:var(--blue);color:#fff;font-weight:700;font-size:30px;display:flex;align-items:center;justify-content:center;flex:none">${i + 1}</div><div style="font-size:44px;font-weight:600;color:var(--ink);letter-spacing:-.01em">${t}</div></div>`).join('')}
      </div>
      <img class="logo" src="${LOGO}" style="top:1470px;width:700px">
      <div class="url" style="top:1640px;font-size:32px">ATACAMALABS.CL</div>
    `);
  },
  // 09 · Martes 12:00 — «Tu agente no duerme» (llamita de noche, Vía Láctea y el celular con el check)
  '09-agente-no-duerme': () => shell(1080, 1920, `
    <div style="position:absolute;inset:0;background:url('${NOCHE}') center top/cover no-repeat"></div>
    <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,8,30,.6) 0%,rgba(0,8,30,.1) 38%,rgba(0,8,30,0) 70%,rgba(0,8,30,.55) 100%)"></div>
    <div class="h" style="left:60px;width:960px;text-align:center;top:262px;font-size:112px;color:#fff;font-weight:600">Tu agente<br><span style="color:var(--sky)">no duerme.</span></div>
    <div class="body" style="left:130px;width:820px;top:590px;font-size:44px;text-align:center;color:#e6efff">Responde a las 11 de la noche, y también en feriado.</div>
    <img class="logo" src="${LOGO_DARK}" style="top:1722px;width:400px">
    <div class="url" style="top:1796px;font-size:26px;color:var(--sky)">ATACAMALABS.CL</div>
  `),
};

// ── Martes 20: historias comerciales (sin precios; 12:00 estáticas A/B, 14:00 con motion C/D) ──
const AMBER = '#ffc53d';
const CTA_AMBER = (top, txt) => `<div class="pill" style="top:${top}px;background:${AMBER};color:#10224f;box-shadow:0 14px 34px rgba(255,197,61,.35);font-size:44px;padding:26px 62px;font-weight:700">${txt}</div>`;
Object.assign(PIECES, {
  // 10 · 12:00 estática A — Beneficio de octubre
  '10-beneficio-octubre': () => shell(1080, 1920, `
    <div style="position:absolute;inset:0;background:linear-gradient(160deg,#0f5ced 0%,#1a3c8e 100%)"></div>
    <div class="grid" style="--gl:rgba(255,255,255,.10)"></div>
    <div style="position:absolute;left:-200px;top:1000px;width:900px;height:900px;border-radius:50%;background:radial-gradient(circle,rgba(88,166,255,.5),rgba(88,166,255,0) 70%)"></div>
    <div style="position:absolute;left:90px;top:262px;background:${AMBER};color:#10224f;font-weight:700;font-size:34px;letter-spacing:.12em;padding:16px 34px;border-radius:60px">BENEFICIO OCTUBRE</div>
    <div class="h" style="left:90px;top:392px;width:900px;font-size:100px;color:#fff;font-weight:600">Contrata tu agente<br><em>antes del</em></div>
    <div style="position:absolute;left:78px;top:690px;font-size:430px;font-weight:700;letter-spacing:-.06em;line-height:1;color:${AMBER}">31</div>
    <div style="position:absolute;left:600px;top:760px;font-size:88px;font-weight:500;color:#fff;line-height:1">de</div>
    <div style="position:absolute;left:600px;top:850px;font-size:124px;font-weight:600;color:#fff;letter-spacing:-.03em;line-height:1">octubre</div>
    <div class="body" style="left:90px;width:900px;top:1190px;font-size:48px;color:#e6efff">y mantén tu mensualidad <b>mientras sigas en el mismo plan.</b></div>
    ${CTA_AMBER(1380, 'Elige tu plan')}
    <div class="url" style="top:1500px;font-size:34px;color:#fff">ATACAMALABS.CL/PRECIOS</div>
    <img class="logo" src="${LOGO_DARK}" style="top:1652px;width:440px">
  `),
  // 11 · 12:00 estática B — Un agente para tu rubro
  '11-un-agente-tu-rubro': () => {
    const chips = [['Salud', '#0f5ced', -2], ['Inmobiliarias', '#ff7a59', 2], ['Educación', '#7c5cff', 1], ['Retail & Ecommerce', '#00a99b', -2], ['Alimentación', '#f5a524', 2], ['Gimnasios', '#e5484d', -1], ['Servicios profesionales', '#1a3c8e', 1], ['B2B & Industria', '#2e74f5', -2]];
    return shell(1080, 1920, `
      <div class="grid"></div>
      <div class="top" style="height:640px"><div class="grid"></div></div>
      <div class="h" style="left:90px;top:262px;width:900px;font-size:104px;color:#fff;font-weight:600">Un agente para<br><em>tu rubro.</em></div>
      <div class="body" style="left:90px;width:900px;top:520px;font-size:38px;color:#dbe6ff">Contesta, agenda y hace seguimiento.</div>
      <div style="position:absolute;left:60px;top:700px;width:960px;display:flex;flex-wrap:wrap;gap:20px 18px;justify-content:center">
        ${chips.map(([t, c, r]) => `<div style="background:${c};color:#fff;font-size:44px;font-weight:600;letter-spacing:-.01em;padding:22px 40px;border-radius:70px;transform:rotate(${r}deg);box-shadow:0 16px 36px ${c}55">${t}</div>`).join('')}
      </div>
      <div style="position:absolute;left:0;width:100%;top:1430px;text-align:center;font-size:38px;color:#5f7094">Mira los planes en</div><div style="position:absolute;left:0;width:100%;top:1482px;text-align:center;font-size:60px;font-weight:700;letter-spacing:-.01em;color:var(--blue)">atacamalabs.cl/precios</div>
      <img class="logo" src="${LOGO}" style="top:1652px;width:440px">
    `);
  },
  // 12 · 14:00 motion C — 3 planes, 3 tamaños (fotograma final)
  '12-tres-planes-tres-tamanos': () => {
    const dots = (n) => Array.from({ length: n }, () => '<span style="display:inline-block;width:46px;height:46px;border-radius:50%;background:#fff;margin-left:14px"></span>').join('');
    const card = (top, w, bg, ink, name, sub, n, tag) => `<div style="position:absolute;left:90px;top:${top}px;width:${w}px;height:240px;border-radius:52px;background:${bg};box-shadow:0 26px 60px rgba(5,18,60,.25)">
      <div style="position:absolute;left:46px;top:42px;font-size:72px;font-weight:600;letter-spacing:-.02em;color:${ink}">${name}</div>
      <div style="position:absolute;left:46px;top:140px;font-size:40px;font-weight:500;color:${ink};opacity:.9">${sub}</div>
      <div style="position:absolute;right:40px;top:62px">${dots(n)}</div>
      ${tag ? `<div style="position:absolute;right:30px;top:-24px;background:${AMBER};color:#10224f;font-weight:700;font-size:28px;letter-spacing:.1em;padding:12px 28px;border-radius:40px">${tag}</div>` : ''}
    </div>`;
    return shell(1080, 1920, `
      <div class="grid"></div>
      <div class="top" style="height:560px"><div class="grid"></div></div>
      <div class="h" style="left:90px;top:262px;width:900px;font-size:92px;color:#fff;font-weight:600">Elige el tamaño<br>de tu <em>operación.</em></div>
      ${card(650, 700, '#58a6ff', '#0b1e3f', 'Esencial', '1 agente', 1, '')}
      ${card(930, 820, '#0f5ced', '#fff', 'Operación', 'Hasta 3 agentes', 3, 'RECOMENDADO')}
      ${card(1210, 900, '#1a3c8e', '#fff', 'Escala', 'Hasta 5 agentes', 5, '')}
      ${CTA_AMBER(1520, 'Beneficio octubre · hasta el 31/10').replace('font-size:44px', 'font-size:38px')}
      <img class="logo" src="${LOGO}" style="top:1678px;width:420px">
    `);
  },
  // 13 · 14:00 motion D — Mientras tú vendes, tu agente trabaja (fotograma final)
  '13-mientras-tu-vendes': () => {
    const rows = [['Responde a cada consulta', '#0f5ced'], ['Agenda la visita o la hora', '#00a99b'], ['Hace el seguimiento', '#f5a524'], ['Te avisa cuando hay interés', '#ff7a59']];
    return shell(1080, 1920, `
      <div class="grid"></div>
      <div class="top" style="height:600px"><div class="grid"></div></div>
      <div class="h" style="left:90px;top:262px;width:900px;font-size:88px;color:#fff;font-weight:600">Mientras tú vendes,<br><em>tu agente trabaja.</em></div>
      <div style="position:absolute;left:90px;top:700px;width:900px;height:640px;border-radius:56px;background:#fff;border:3px solid #d5e0f6;box-shadow:0 30px 70px rgba(5,18,60,.22)">
        ${rows.map(([t, c], i) => `<div style="position:absolute;left:50px;top:${50 + i * 142}px;width:800px;height:100px;display:flex;align-items:center;gap:30px">
          <div style="width:84px;height:84px;border-radius:50%;background:${c};display:flex;align-items:center;justify-content:center;flex:none;box-shadow:0 10px 24px ${c}66"><svg width="46" height="46" viewBox="0 0 52 52"><path d="M14 27 L23 36 L39 17" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
          <div style="font-size:48px;font-weight:600;letter-spacing:-.01em;color:var(--ink)">${t}</div></div>`).join('')}
      </div>
      <div style="position:absolute;left:0;width:100%;top:1420px;text-align:center;font-size:38px;color:#5f7094">Mira los planes en</div><div style="position:absolute;left:0;width:100%;top:1472px;text-align:center;font-size:60px;font-weight:700;letter-spacing:-.01em;color:var(--blue)">atacamalabs.cl/precios</div>
      <img class="logo" src="${LOGO}" style="top:1678px;width:420px">
    `);
  },
});

// ── Carrusel del martes 20 (feed 15:00, 4:5): «Qué proceso automatizar primero» — v2: plantea la duda, directo y concreto ──
const CAR = [
  { col: '#0f5ced', tag: 'Se repite', q: '¿Lo haces todas las semanas?', ex: 'Responder las mismas consultas. Enviar cotizaciones. Confirmar horas.', sm: 'Lo que se repite es lo que más tiempo devuelve.' },
  { col: '#00a99b', tag: 'Tiene reglas claras', q: '¿Podrías explicarlo en una página?', ex: 'Si solo una persona sabe cómo se hace, todavía no está listo.', sm: 'Un agente necesita pasos que se puedan escribir.' },
  { col: '#f5a524', tag: 'Usa pocas herramientas', q: '¿Todo pasa por las herramientas que ya usas?', ex: null, chips: ['WhatsApp', 'Correo', 'Planilla', 'CRM'], sm: 'Mientras menos saltos entre sistemas, más fácil conectarlo.' },
  { col: '#ff7a59', tag: 'Cuesta tiempo o genera errores', q: '¿Te quita tiempo o te genera errores?', ex: 'Respuestas que llegan tarde. Datos mal copiados. Clientes esperando.', sm: 'Parte por lo que más pesa, no por lo más fácil.' },
  { col: '#7c5cff', tag: 'Se puede medir y revisar', q: '¿Sabrías decir si mejoró?', ex: 'Cuánto tardas hoy en responder. Cuántas consultas quedan sin contestar.', sm: 'Y que alguien lo revise antes de que llegue al cliente.' },
];
const CAR4B = { col: '#f5a524', tag: 'Mueves datos a mano', q: '¿Hoy lo pasas a mano de un programa a otro?', ex: 'Copiar la consulta del WhatsApp a una planilla. Pasar un pedido del correo al sistema.', sm: '' };
const carDots = (cur) => `<div style="position:absolute;right:90px;bottom:84px;display:flex;gap:12px">${Array.from({ length: 7 }, (_, i) => `<span style="width:${i === cur ? 38 : 14}px;height:14px;border-radius:8px;background:${i === cur ? 'var(--blue)' : '#c7d6f2'}"></span>`).join('')}</div>`;
const carSlide = (i, o) => { const c = o || CAR[i]; return shell(1080, 1350, `
    <div class="grid"></div>
    <div class="top" style="height:560px"><div class="grid"></div></div>
    <div style="position:absolute;left:90px;top:84px;display:flex;align-items:center;gap:22px"><div style="width:84px;height:84px;border-radius:50%;background:${c.col};color:#fff;font-weight:700;font-size:46px;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 24px ${c.col}66">${i + 1}</div><div style="color:#dbe6ff;font-weight:700;font-size:30px;letter-spacing:.16em">CRITERIO ${i + 1} DE 5</div></div>
    <div class="h" style="left:90px;top:210px;width:900px;font-size:90px;color:#fff;font-weight:600">${c.q}</div>
    <div style="position:absolute;left:90px;top:640px;width:900px;display:flex;flex-direction:column;gap:30px;align-items:flex-start">
      <div style="background:${c.col};color:#fff;font-weight:700;font-size:34px;letter-spacing:.04em;border-radius:50px;padding:12px 32px">${c.tag}</div>
      ${c.ex ? `<div style="font-size:54px;font-weight:600;line-height:1.2;letter-spacing:-.02em;color:var(--ink)">${c.ex}</div>` : ''}
      ${c.chips ? `<div style="display:flex;gap:16px;flex-wrap:wrap">${c.chips.map((x) => `<span style="background:#fff;border:3px solid #d5e0f6;border-radius:50px;padding:14px 34px;font-size:44px;font-weight:600;color:var(--real)">${x}</span>`).join('')}</div>` : ''}
      ${c.sm ? `<div style="font-size:38px;line-height:1.3;color:#5f7094">${c.sm}</div>` : ''}
    </div>
    <img class="logo" src="${LOGO}" style="left:90px;transform:none;bottom:70px;width:300px">${carDots(i + 1)}
  `); };
const carCierre = (head, word, line) => shell(1080, 1350, `
    <div style="position:absolute;inset:0;background:linear-gradient(160deg,#0f5ced 0%,#1a3c8e 100%)"></div>
    <div class="grid" style="--gl:rgba(255,255,255,.10)"></div>
    <div style="position:absolute;left:-200px;top:760px;width:900px;height:900px;border-radius:50%;background:radial-gradient(circle,rgba(88,166,255,.5),rgba(88,166,255,0) 70%)"></div>
    <div class="h" style="left:90px;top:150px;width:900px;font-size:104px;color:#fff;font-weight:600">${head}</div>
    <div style="position:absolute;left:90px;top:610px;width:900px;background:#fff;border-radius:44px;padding:40px 48px 48px;box-shadow:0 30px 70px rgba(5,18,60,.35)">
      <div style="display:flex;align-items:center;gap:20px"><div style="width:64px;height:64px;border-radius:50%;background:#d5e0f6"></div><div style="font-size:32px;color:#5f7094;font-weight:600">Tu comentario</div></div>
      <div style="font-size:112px;font-weight:700;letter-spacing:-.03em;color:var(--blue);margin-top:22px;line-height:1">${word}</div>
    </div>
    <div class="body" style="left:90px;width:900px;top:980px;font-size:52px;color:#fff;font-weight:600;line-height:1.25">${line}</div>
    <img class="logo" src="${LOGO_DARK}" style="left:90px;transform:none;bottom:70px;width:340px">
  `);
Object.assign(PIECES, {
  'c1-gancho': () => shell(1080, 1350, `
    <div style="position:absolute;inset:0;background:linear-gradient(160deg,#0f5ced 0%,#1a3c8e 100%)"></div>
    <div class="grid" style="--gl:rgba(255,255,255,.10)"></div>
    <div style="position:absolute;left:380px;top:640px;width:900px;height:900px;border-radius:50%;background:radial-gradient(circle,rgba(88,166,255,.55),rgba(88,166,255,0) 68%)"></div>
    <div class="h" style="left:90px;top:130px;width:900px;font-size:112px;color:#fff;font-weight:600">¿Qué proceso de tu empresa <em>automatizarías primero?</em></div>
    <img src="${DUDA}" style="position:absolute;left:640px;top:690px;height:600px;filter:drop-shadow(0 28px 40px rgba(5,18,60,.45))">
    <div style="position:absolute;left:560px;top:735px;font-size:140px;font-weight:700;color:${AMBER};transform:rotate(-14deg);line-height:1">?</div>
    <div style="position:absolute;left:915px;top:655px;font-size:190px;font-weight:700;color:${AMBER};transform:rotate(12deg);line-height:1">?</div>
    <div class="body" style="left:90px;width:470px;top:800px;font-size:50px;color:#e6efff">5 preguntas para decidirlo.</div>
    <img class="logo" src="${LOGO_DARK}" style="left:90px;transform:none;bottom:84px;width:340px">
    <div style="position:absolute;left:90px;top:1000px;font-size:42px;font-weight:700;color:${AMBER};letter-spacing:.04em">Desliza →</div>
  `),
  'c2-se-repite': () => carSlide(0), 'c3-reglas-claras': () => carSlide(1), 'c4-datos-a-mano': () => carSlide(2, CAR4B), 'c5-tiempo-errores': () => carSlide(3), 'c6-medir-revisar': () => carSlide(4),
  'c7-comenta-proceso': () => carCierre('¿Cuál de tus procesos cumple los 5?', 'PROCESO', 'Comenta <span style="color:' + AMBER + '">PROCESO</span> y te ayudamos a diagnosticar el tuyo.'),
  // Versión LinkedIn del cierre (20-oct): sin «comenta PROCESO» (LinkedIn no tiene respuesta automática) → mensaje directo
  'c7-mensaje-directo': () => shell(1080, 1350, `
    <div style="position:absolute;inset:0;background:linear-gradient(160deg,#0f5ced 0%,#1a3c8e 100%)"></div>
    <div class="grid" style="--gl:rgba(255,255,255,.10)"></div>
    <div style="position:absolute;left:-200px;top:760px;width:900px;height:900px;border-radius:50%;background:radial-gradient(circle,rgba(88,166,255,.5),rgba(88,166,255,0) 70%)"></div>
    <div class="h" style="left:90px;top:150px;width:900px;font-size:104px;color:#fff;font-weight:600">¿Cuál de tus procesos cumple los 5?</div>
    <div style="position:absolute;left:90px;top:610px;width:900px;background:#fff;border-radius:44px;padding:40px 48px 48px;box-shadow:0 30px 70px rgba(5,18,60,.35)">
      <div style="display:flex;align-items:center;gap:20px"><div style="width:64px;height:64px;border-radius:50%;background:#d5e0f6"></div><div style="font-size:32px;color:#5f7094;font-weight:600">Mensaje directo a Atacama Labs</div></div>
      <div style="font-size:76px;font-weight:700;letter-spacing:-.03em;color:var(--blue);margin-top:22px;line-height:1.08">Quiero revisar mi proceso</div>
    </div>
    <div class="body" style="left:90px;width:900px;top:1015px;font-size:52px;color:#fff;font-weight:600;line-height:1.25">Escríbenos por <span style="color:${AMBER}">mensaje directo</span> y lo revisamos contigo.</div>
    <img class="logo" src="${LOGO_DARK}" style="left:90px;transform:none;bottom:70px;width:340px">
  `),
});

// ── Semana 21–24 oct: historias de solo imagen + imagen del miércoles ──
const GHL_NOTE = 'Cifras de referencia de HighLevel (GHL). Los resultados varían según cada negocio.';
const bgBlue = `<div style="position:absolute;inset:0;background:linear-gradient(160deg,#0f5ced 0%,#1a3c8e 100%)"></div><div class="grid" style="--gl:rgba(255,255,255,.10)"></div><div style="position:absolute;left:-220px;top:1150px;width:1000px;height:1000px;border-radius:50%;background:radial-gradient(circle,rgba(88,166,255,.5),rgba(88,166,255,0) 68%)"></div>`;
const storyLogo = `<img class="logo" src="${LOGO_DARK}" style="top:1690px;width:420px">`;
const statLabel = (t) => `<div style="position:absolute;left:90px;top:270px;background:${AMBER};color:#10224f;font-weight:700;font-size:30px;letter-spacing:.12em;padding:14px 30px;border-radius:50px">${t}</div>`;
const foot = `<div style="position:absolute;left:90px;width:900px;top:1560px;font-size:26px;line-height:1.3;color:#b9c9f0">${GHL_NOTE}</div>`;
const qStory = (n, col, q, ex, chips) => shell(1080, 1920, `
    <div class="grid"></div>
    <div class="top" style="height:900px"><div class="grid"></div></div>
    <div style="position:absolute;left:90px;top:290px;display:flex;align-items:center;gap:24px"><div style="width:92px;height:92px;border-radius:50%;background:${col};color:#fff;font-weight:700;font-size:52px;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 24px ${col}66">${n}</div><div style="color:#dbe6ff;font-weight:700;font-size:32px;letter-spacing:.16em">PREGUNTA ${n} DE 5</div></div>
    <div class="h" style="left:90px;top:440px;width:900px;font-size:98px;color:#fff;font-weight:600">${q}</div>
    <div style="position:absolute;left:90px;top:1010px;width:900px;display:flex;flex-direction:column;gap:30px">
      ${ex ? `<div style="font-size:50px;font-weight:600;line-height:1.22;letter-spacing:-.02em;color:var(--ink)">${ex}</div>` : ''}
      ${chips ? `<div style="display:flex;gap:16px;flex-wrap:wrap">${chips.map((x) => `<span style="background:#fff;border:3px solid #d5e0f6;border-radius:50px;padding:14px 34px;font-size:42px;font-weight:600;color:var(--real)">${x}</span>`).join('')}</div>` : ''}
    </div>
    <div style="position:absolute;left:90px;width:900px;top:1480px;font-size:38px;font-weight:600;color:var(--blue);line-height:1.3">Las 5 preguntas completas, en atacamalabs.cl/recursos</div>
    <img class="logo" src="${LOGO}" style="top:1690px;width:400px">
  `);
Object.assign(PIECES, {
  // Miércoles 21 · feed 4:5 (idea #7 adelantada): «En alimentación, confirmar no es recibir»
  'w0-miercoles-confirmar': () => shell(1080, 1350, `
    <div class="grid"></div>
    <div class="top" style="height:470px"><div class="grid"></div></div>
    <div class="h" style="left:90px;top:90px;width:900px;font-size:76px;color:#fff;font-weight:600">El pedido llegó al WhatsApp. <em>¿Pero alguien lo confirmó?</em></div>
    <div style="position:absolute;left:90px;top:520px;width:900px">
      <div style="background:#fff;border:3px solid #d5e0f6;border-radius:40px;padding:30px 36px;box-shadow:0 24px 60px rgba(5,18,60,.14)">
        <div style="display:flex;align-items:center;gap:18px;margin-bottom:18px"><div style="width:54px;height:54px;border-radius:50%;background:#25d366"></div><div style="font-size:30px;font-weight:600;color:#5f7094">Cliente · Pedido de almuerzos</div></div>
        <div style="background:#f1f5fd;border-radius:26px 26px 26px 8px;padding:20px 26px;font-size:38px;line-height:1.25;color:var(--ink);display:inline-block;max-width:92%">Hola, ¿pueden dejar listos 2 almuerzos para mañana al mediodía?</div>
      </div>
      <div style="display:flex;gap:18px;margin-top:34px">
        ${[['Recibido', '#00a99b', '✓'], ['Confirmado', '#f5a524', '?'], ['Preparado', '#c7d6f2', '–']].map(([t, c, s]) => `<div style="flex:1;background:#fff;border:3px solid ${c};border-radius:30px;padding:26px 14px;text-align:center"><div style="width:76px;height:76px;margin:0 auto 14px;border-radius:50%;background:${c};color:#fff;font-weight:700;font-size:46px;display:flex;align-items:center;justify-content:center">${s}</div><div style="font-size:38px;font-weight:700;color:var(--ink)">${t}</div></div>`).join('')}
      </div>
      <div style="margin-top:26px;font-size:36px;line-height:1.3;color:#3a4d73">Un mensaje que llega no es un pedido que alguien tomó. <b style="color:var(--ink)">¿Quién confirma el tuyo?</b></div>
    </div>
    <div style="position:absolute;right:90px;top:490px;background:${AMBER};color:#10224f;font-weight:700;font-size:24px;letter-spacing:.1em;padding:8px 20px;border-radius:30px">EJEMPLO ILUSTRATIVO</div>
    <img class="logo" src="${LOGO}" style="left:90px;transform:none;bottom:60px;width:300px">
    <div style="position:absolute;right:90px;bottom:70px;font-size:32px;font-weight:700;color:var(--blue)">Guárdalo para revisar tu proceso</div>
  `),
  // Preguntas del checklist (refuerzan el carrusel)
  'w1-q1-semana': () => qStory(1, '#0f5ced', '¿Lo haces todas las semanas?', 'Responder las mismas consultas. Enviar cotizaciones. Confirmar horas.', null),
  'w2-q3-datos': () => qStory(3, '#f5a524', '¿Hoy lo pasas a mano de un programa a otro?', 'Copiar la consulta del WhatsApp a una planilla. Pasar un pedido del correo al sistema.', null),
  'w3-q5-mejoro': () => qStory(5, '#7c5cff', '¿Sabrías decir si mejoró?', 'Cuánto tardas hoy en responder. Cuántas consultas quedan sin contestar.', null),
  // Estadísticas (jueves, con el reel)
  'w4-stat-62': () => shell(1080, 1920, `${bgBlue}${statLabel('AGENTE HUMANO VS. AGENTE DE IA')}
    <div class="h" style="left:90px;top:380px;width:900px;font-size:84px;color:#fff;font-weight:600">De cada 100 llamadas…</div>
    <div style="position:absolute;left:70px;top:520px;font-size:470px;font-weight:700;letter-spacing:-.06em;line-height:1;color:${AMBER}">62<span style="font-size:300px">%</span></div>
    <div class="h" style="left:90px;top:1030px;width:900px;font-size:110px;color:#fff;font-weight:600">se pierden.</div>
    <div style="position:absolute;left:90px;top:1230px;width:900px;background:#fff;border-radius:44px;padding:40px 50px;box-shadow:0 30px 70px rgba(5,18,60,.35)"><div style="font-size:40px;font-weight:600;color:#5f7094">Con un agente de IA:</div><div style="font-size:104px;font-weight:700;letter-spacing:-.03em;color:var(--blue);line-height:1.1">menos de 3</div></div>
    ${foot}${storyLogo}`),
  'w5-stat-34min': () => shell(1080, 1920, `${bgBlue}${statLabel('AGENTE HUMANO VS. AGENTE DE IA')}
    <div class="h" style="left:90px;top:380px;width:900px;font-size:100px;color:#fff;font-weight:600">¿Cuánto tarda <em>en responder?</em></div>
    <div style="position:absolute;left:90px;top:760px;width:900px;background:#fff;border-radius:48px;padding:44px 54px;box-shadow:0 30px 70px rgba(5,18,60,.3)"><div style="font-size:40px;font-weight:600;color:#5f7094">Agente humano</div><div style="font-size:170px;font-weight:700;letter-spacing:-.04em;color:var(--ink);line-height:1.05">~34 min</div></div>
    <div style="position:absolute;left:90px;top:1150px;width:900px;background:${AMBER};border-radius:48px;padding:44px 54px;box-shadow:0 30px 70px rgba(255,197,61,.3)"><div style="font-size:40px;font-weight:700;color:#10224f">Agente de IA</div><div style="font-size:170px;font-weight:700;letter-spacing:-.04em;color:#10224f;line-height:1.05">&lt;1 s</div></div>
    ${foot}${storyLogo}`),
  'w6-stat-23-48': () => shell(1080, 1920, `${bgBlue}${statLabel('AGENTE HUMANO VS. AGENTE DE IA')}
    <div class="h" style="left:90px;top:380px;width:900px;font-size:96px;color:#fff;font-weight:600">Contactos que <em>se vuelven clientes</em></div>
    <div style="position:absolute;left:90px;top:800px;width:430px;background:#fff;border-radius:48px;padding:40px 30px;text-align:center;box-shadow:0 30px 70px rgba(5,18,60,.3)"><div style="font-size:34px;font-weight:600;color:#5f7094">Humano</div><div style="font-size:150px;font-weight:700;letter-spacing:-.04em;color:var(--ink);line-height:1.05">23%</div></div>
    <div style="position:absolute;left:560px;top:800px;width:430px;background:${AMBER};border-radius:48px;padding:40px 30px;text-align:center;box-shadow:0 30px 70px rgba(255,197,61,.3)"><div style="font-size:34px;font-weight:700;color:#10224f">Agente de IA</div><div style="font-size:150px;font-weight:700;letter-spacing:-.04em;color:#10224f;line-height:1.05">48%</div></div>
    <div style="position:absolute;left:0;width:100%;top:1190px;text-align:center"><span style="display:inline-block;background:#1e9d3d;color:#fff;font-weight:700;font-size:58px;padding:22px 56px;border-radius:70px;box-shadow:0 16px 34px rgba(30,157,61,.4)">más del doble</span></div>
    ${foot}${storyLogo}`),
  // Viernes: multicanal
  'w7-multicanal': () => shell(1080, 1920, `${bgBlue}
    <div class="h" style="left:90px;top:300px;width:900px;font-size:100px;color:#fff;font-weight:600">Tus clientes no te escriben <em>solo por WhatsApp.</em></div>
    <div style="position:absolute;left:90px;top:800px;width:900px;display:flex;flex-wrap:wrap;gap:20px">
      ${[['WhatsApp', '#25d366'], ['Instagram', '#e1306c'], ['Facebook', '#1877f2'], ['Correo', '#f5a524'], ['Tu sitio web', '#7c5cff']].map(([t, c], i) => `<div style="background:${c};color:#fff;font-size:54px;font-weight:700;padding:22px 46px;border-radius:70px;transform:rotate(${[-2, 2, 1, -2, 2][i]}deg);box-shadow:0 16px 36px ${c}66">${t}</div>`).join('')}
    </div>
    <div style="position:absolute;left:90px;top:1380px;width:900px;background:#fff;border-radius:44px;padding:36px 50px;box-shadow:0 30px 70px rgba(5,18,60,.35)"><div style="font-size:56px;font-weight:700;color:var(--ink);letter-spacing:-.02em;line-height:1.15">Un agente.<br><span style="color:var(--blue)">Una sola bandeja.</span></div></div>
    ${storyLogo}`),
});

// ── Semana 21–25 oct (v2, calendario por día): piezas nuevas ──
const planesTxt = (t1, t2) => `<div style="position:absolute;left:0;width:100%;top:${t1}px;text-align:center;font-size:38px;color:#5f7094">Mira los planes en</div><div style="position:absolute;left:0;width:100%;top:${t1 + 52}px;text-align:center;font-size:60px;font-weight:700;letter-spacing:-.01em;color:${t2}">atacamalabs.cl/precios</div>`;
Object.assign(PIECES, {
  // Miércoles 14:00 — versión vertical de la imagen del feed
  'w8-wed-recibido-confirmado': () => shell(1080, 1920, `
    <div class="grid"></div>
    <div class="top" style="height:760px"><div class="grid"></div></div>
    <div class="h" style="left:90px;top:300px;width:900px;font-size:100px;color:#fff;font-weight:600">El pedido llegó. <em>¿Pero alguien lo confirmó?</em></div>
    <div style="position:absolute;left:90px;top:840px;width:900px;display:flex;flex-direction:column;gap:26px">
      ${[['Recibido', 'El mensaje llegó al WhatsApp', '#00a99b', '✓'], ['Confirmado', '¿Alguien tomó el pedido?', '#f5a524', '?'], ['Preparado', 'Todavía nadie lo sabe', '#c7d6f2', '–']].map(([t, s, c, g]) => `<div style="display:flex;align-items:center;gap:34px;background:#fff;border:4px solid ${c};border-radius:44px;padding:30px 40px;box-shadow:0 24px 54px rgba(5,18,60,.12)"><div style="width:110px;height:110px;flex:none;border-radius:50%;background:${c};color:#fff;font-weight:700;font-size:66px;display:flex;align-items:center;justify-content:center">${g}</div><div><div style="font-size:60px;font-weight:700;color:var(--ink);letter-spacing:-.02em">${t}</div><div style="font-size:36px;color:#5f7094;margin-top:6px">${s}</div></div></div>`).join('')}
    </div>
    <div style="position:absolute;left:90px;width:900px;top:1500px;font-size:54px;font-weight:700;letter-spacing:-.02em;color:var(--blue)">Confirmar no es recibir.</div>
    <img class="logo" src="${LOGO}" style="top:1690px;width:400px">
  `),
  // Viernes 14:30 — cuenta regresiva del beneficio de octubre
  'w9-quedan-8-dias': () => shell(1080, 1920, `${bgBlue}
    <div style="position:absolute;left:90px;top:270px;background:${AMBER};color:#10224f;font-weight:700;font-size:32px;letter-spacing:.12em;padding:14px 30px;border-radius:50px">BENEFICIO OCTUBRE</div>
    <div class="h" style="left:90px;top:400px;width:900px;font-size:130px;color:#fff;font-weight:600">Quedan</div>
    <div style="position:absolute;left:70px;top:520px;font-size:620px;font-weight:700;letter-spacing:-.06em;line-height:1;color:${AMBER}">8</div>
    <div class="h" style="left:560px;top:850px;width:480px;font-size:150px;color:#fff;font-weight:600">días</div>
    <div class="body" style="left:90px;width:900px;top:1230px;font-size:48px;color:#e6efff;line-height:1.3">para contratar y <b style="color:#fff">mantener tu mensualidad mientras sigas en el mismo plan.</b></div>
    <div style="position:absolute;left:0;width:100%;top:1470px;text-align:center;font-size:38px;color:#dbe6ff">Mira los planes en</div><div style="position:absolute;left:0;width:100%;top:1522px;text-align:center;font-size:62px;font-weight:700;letter-spacing:-.01em;color:${AMBER}">atacamalabs.cl/precios</div>
    ${storyLogo}`),
  // Sábado 12:00 — gancho del video de cotización y seguimiento
  'w10-cotizacion-4-dias': () => shell(1080, 1920, `
    <div class="grid"></div>
    <div class="top" style="height:820px"><div class="grid"></div></div>
    <div class="h" style="left:90px;top:300px;width:900px;font-size:94px;color:#fff;font-weight:600">¿Y qué pasó con la cotización <em>de hace cuatro días?</em></div>
    <div style="position:absolute;left:90px;top:900px;width:900px;background:#fff;border:3px solid #d5e0f6;border-radius:48px;padding:44px 48px;box-shadow:0 30px 70px rgba(5,18,60,.18)">
      <div style="display:flex;align-items:center;gap:26px"><div style="background:var(--blue);color:#fff;border-radius:16px;font-size:32px;font-weight:700;padding:26px 18px">PDF</div><div><div style="font-size:50px;font-weight:700;color:var(--ink)">Cotización enviada</div><div style="font-size:36px;color:#5f7094;margin-top:4px">Hace 4 días</div></div></div>
      <div style="margin-top:34px;display:inline-block;background:#ff7a59;color:#fff;font-weight:700;font-size:40px;padding:14px 34px;border-radius:50px">Sin respuesta</div>
    </div>
    <div class="body" style="left:90px;width:900px;top:1330px;font-size:54px;font-weight:600;line-height:1.25;letter-spacing:-.02em;color:var(--ink)">Cotizar es la mitad del trabajo. <span style="color:var(--blue)">El seguimiento, la otra mitad.</span></div>
    <img class="logo" src="${LOGO}" style="top:1690px;width:400px">
  `),
});

// ── Viernes 23: dos historias que acompañan el carrusel multicanal; domingo: cuenta regresiva ──
Object.assign(PIECES, {
  'w11-misma-pregunta-tres-canales': () => shell(1080, 1920, `
    <div class="grid"></div>
    <div class="top" style="height:600px"><div class="grid"></div></div>
    <div class="h" style="left:90px;top:290px;width:900px;font-size:100px;color:#fff;font-weight:600">La misma pregunta, <em>tres canales.</em></div>
    <div style="position:absolute;left:90px;top:680px;width:900px;display:flex;flex-direction:column;gap:26px">
      ${[['WhatsApp', '#25d366', 'Hola, ¿tienen hora mañana?'], ['Instagram', '#e1306c', 'Hola, ¿tienen hora mañana?'], ['Correo', '#f5a524', 'Asunto: Consulta de horas · ¿Tienen hora mañana?']].map(([c, col, m]) => `<div style="background:#fff;border:3px solid #d5e0f6;border-radius:40px;padding:26px 34px;box-shadow:0 22px 50px rgba(5,18,60,.12)"><div style="display:inline-block;background:${col};color:#fff;font-weight:700;font-size:30px;letter-spacing:.04em;padding:8px 24px;border-radius:40px">${c}</div><div style="font-size:42px;font-weight:600;color:var(--ink);margin-top:14px;line-height:1.2;letter-spacing:-.01em">${m}</div></div>`).join('')}
    </div>
    <div style="position:absolute;left:0;width:100%;top:1330px;text-align:center;font-size:84px;color:var(--blue);font-weight:700;line-height:1">↓</div>
    <div style="position:absolute;left:90px;top:1440px;width:900px;background:var(--blue);color:#fff;border-radius:44px;padding:36px 50px;font-size:56px;font-weight:700;letter-spacing:-.02em;line-height:1.15;box-shadow:0 26px 60px rgba(15,92,237,.4)">Los atiende el mismo agente.</div>
    <img class="logo" src="${LOGO}" style="top:1700px;width:400px">
  `),
  'w12-cinco-bandejas-o-una': () => shell(1080, 1920, `
    <div class="grid"></div>
    <div class="top" style="height:620px"><div class="grid"></div></div>
    <div class="h" style="left:90px;top:290px;width:900px;font-size:100px;color:#fff;font-weight:600">5 canales, 5 bandejas… <em>o una.</em></div>
    <div style="position:absolute;left:90px;top:700px;width:900px;background:#fff;border:3px solid #d5e0f6;border-radius:48px;padding:34px 40px 40px;box-shadow:0 26px 60px rgba(5,18,60,.12)">
      <div style="font-size:30px;font-weight:700;letter-spacing:.14em;color:#5f7094">ANTES</div>
      <div style="position:relative;height:330px;margin-top:6px">
        ${[['WhatsApp', '#25d366', 0, 10, -4, 3], ['Instagram', '#e1306c', 300, 60, 3, 5], ['Facebook', '#1877f2', 560, 0, -2, 2], ['Correo', '#f5a524', 70, 170, 4, 7], ['Tu sitio web', '#7c5cff', 400, 200, -3, 4]].map(([t, c, x, y, r, n]) => `<div style="position:absolute;left:${x}px;top:${y}px;transform:rotate(${r}deg);background:${c};color:#fff;font-weight:700;font-size:40px;padding:16px 34px;border-radius:50px">${t}<span style="position:absolute;right:-14px;top:-18px;background:#e5484d;color:#fff;font-size:26px;border-radius:50%;width:44px;height:44px;display:flex;align-items:center;justify-content:center">${n}</span></div>`).join('')}
      </div>
      <div style="font-size:44px;font-weight:600;color:var(--ink);margin-top:6px">Cinco apps que revisar.</div>
    </div>
    <div style="position:absolute;left:0;width:100%;top:1200px;text-align:center;font-size:80px;color:var(--blue);font-weight:700;line-height:1">↓</div>
    <div style="position:absolute;left:90px;top:1300px;width:900px;background:var(--blue);color:#fff;border-radius:48px;padding:40px 46px;box-shadow:0 30px 70px rgba(15,92,237,.4)">
      <div style="font-size:30px;font-weight:700;letter-spacing:.14em;color:#dbe6ff">CON UN AGENTE</div>
      <div style="font-size:70px;font-weight:700;letter-spacing:-.02em;line-height:1.1;margin-top:8px">Una sola bandeja.</div>
      <div style="font-size:38px;color:#dbe6ff;margin-top:10px">Todas las conversaciones, en un lugar.</div>
    </div>
    <img class="logo" src="${LOGO}" style="top:1710px;width:380px">
  `),
});
PIECES['w13-quedan-6-dias'] = () => PIECES['w9-quedan-8-dias']().replace('line-height:1;color:' + AMBER + '">8</div>', 'line-height:1;color:' + AMBER + '">6</div>');

// ── Carrusel multicanal (viernes 23, feed 15:00): láminas con fotos de Higgsfield ──
const MC = (f) => pathToFileURL(path.join(HERE, '../carrusel-multicanal/arte/' + f)).href;
Object.assign(PIECES, {
  'm1-gancho': () => shell(1080, 1350, `
    <div class="grid"></div>
    <div style="position:absolute;left:0;top:470px;width:1080px;height:880px;background:url('${MC('g1-portada-raw.png')}') 0 -436px/1080px auto no-repeat"></div>
    <div style="position:absolute;left:0;top:470px;width:1080px;height:880px;background:linear-gradient(180deg,rgba(26,60,142,.0) 70%,rgba(11,30,63,.55) 100%)"></div>
    <div class="top" style="height:470px"><div class="grid"></div></div>
    <div class="h" style="left:90px;top:96px;width:900px;font-size:84px;color:#fff;font-weight:600">¿En cuántos lugares te escribe <em>el mismo cliente?</em></div>
    <div style="position:absolute;left:90px;bottom:60px;color:${AMBER};font-weight:700;font-size:40px;letter-spacing:.04em">Desliza →</div>
    <img class="logo" src="${LOGO_DARK}" style="left:auto;right:90px;transform:none;bottom:56px;width:300px">
  `),
});

// ── Portada llamativa del multicanal: celular real + notificaciones desbordadas ──
Object.assign(PIECES, {
  'm1b-gancho': () => {
    const notis = [['WhatsApp', '#25d366', 'Hola, ¿tienen hora mañana?', 'ahora', -2, 70], ['Instagram', '#e1306c', '¿Cuánto cuesta el servicio?', 'hace 2 min', 2, 250], ['Correo', '#f5a524', '¿Me cotizan 3 equipos?', 'hace 9 min', -1.5, 430], ['Sitio web', '#7c5cff', 'Hola, ¿pueden llamarme?', 'hace 14 min', 2.5, 610]];
    return shell(1080, 1350, `
      <div style="position:absolute;inset:0;background:linear-gradient(160deg,#0f5ced 0%,#1a3c8e 100%)"></div>
      <div class="grid" style="--gl:rgba(255,255,255,.10)"></div>
      <div style="position:absolute;left:300px;top:620px;width:900px;height:900px;border-radius:50%;background:radial-gradient(circle,rgba(88,166,255,.55),rgba(88,166,255,0) 68%)"></div>
      <img src="${MC('g1b-celular.png')}" style="position:absolute;left:150px;top:455px;width:1150px;filter:drop-shadow(0 40px 50px rgba(5,18,60,.5))">
      ${notis.map(([c, col, m, t, r, y]) => `<div style="position:absolute;left:${[330, 290, 340, 300][[70, 250, 430, 610].indexOf(y)]}px;top:${470 + y * 0.9}px;width:660px;transform:rotate(${r}deg);background:rgba(255,255,255,.96);border-radius:34px;padding:22px 30px;display:flex;align-items:center;gap:22px;box-shadow:0 26px 54px rgba(5,18,60,.38)"><div style="width:76px;height:76px;flex:none;border-radius:22px;background:${col};color:#fff;font-weight:700;font-size:44px;display:flex;align-items:center;justify-content:center">${c[0]}</div><div style="flex:1"><div style="display:flex;justify-content:space-between;font-size:26px;font-weight:700;color:#5f7094;letter-spacing:.04em"><span>${c.toUpperCase()}</span><span style="font-weight:500">${t}</span></div><div style="font-size:34px;font-weight:600;color:var(--ink);margin-top:4px;line-height:1.15">${m}</div></div></div>`).join('')}
      <div class="h" style="left:80px;top:80px;width:920px;font-size:96px;color:#fff;font-weight:700;letter-spacing:-.035em;line-height:1.02">¿En cuántos lugares te escribe <span style="color:${AMBER}">el mismo cliente?</span></div>
      <img class="logo" src="${LOGO_DARK}" style="left:80px;transform:none;bottom:54px;width:300px">
      <div style="position:absolute;left:80px;bottom:130px;font-size:40px;font-weight:700;color:${AMBER};letter-spacing:.04em">Desliza →</div>
    `);
  },
});

// ── Portada v3: «¿Por cuántos lugares te escriben?» con iconos de canal ──
const CH_ICON = {
  whatsapp: '<svg viewBox="0 0 48 48" width="76" height="76"><rect width="48" height="48" rx="12" fill="#25d366"/><circle cx="24" cy="23" r="12" fill="none" stroke="#fff" stroke-width="3"/><path d="M13 37l3-7 5 4z" fill="#fff"/><path d="M19.5 18.5c0 5 4.5 9.5 9.5 9.5l1.8-2.3-3.2-1.6-1.4 1.2c-1.6-.7-3.3-2.4-4-4l1.2-1.4-1.6-3.2z" fill="#fff"/></svg>',
  instagram: '<svg viewBox="0 0 48 48" width="76" height="76"><defs><linearGradient id="ig" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#feda75"/><stop offset=".4" stop-color="#d62976"/><stop offset="1" stop-color="#4f5bd5"/></linearGradient></defs><rect width="48" height="48" rx="12" fill="url(#ig)"/><rect x="11" y="11" width="26" height="26" rx="8" fill="none" stroke="#fff" stroke-width="3"/><circle cx="24" cy="24" r="6" fill="none" stroke="#fff" stroke-width="3"/><circle cx="32" cy="16" r="2" fill="#fff"/></svg>',
  facebook: '<svg viewBox="0 0 48 48" width="76" height="76"><rect width="48" height="48" rx="12" fill="#1877f2"/><path d="M26.5 40V27h4.3l.7-5h-5v-3.2c0-1.5.5-2.5 2.6-2.5h2.6v-4.5c-.4-.1-1.9-.2-3.4-.2-3.7 0-6.2 2.2-6.2 6.4V22H18v5h4.2v13z" fill="#fff"/></svg>',
  ecommerce: '<svg viewBox="0 0 48 48" width="76" height="76"><rect width="48" height="48" rx="12" fill="#7c5cff"/><path d="M14 20h20l-1.5 16h-17z" fill="none" stroke="#fff" stroke-width="3" stroke-linejoin="round"/><path d="M19 20v-3a5 5 0 0 1 10 0v3" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>',
  gmail: '<svg viewBox="0 0 48 48" width="76" height="76"><rect width="48" height="48" rx="12" fill="#fff" stroke="#dfe5ee" stroke-width="2"/><rect x="10" y="14" width="28" height="20" rx="3" fill="none" stroke="#ea4335" stroke-width="3"/><path d="M11 16l13 11 13-11" fill="none" stroke="#ea4335" stroke-width="3" stroke-linejoin="round"/></svg>',
};
Object.assign(PIECES, {
  'm1c-gancho': () => {
    const notis = [['whatsapp', 'WhatsApp', 'Hola, ¿tienen hora mañana?', 'ahora', 330, -2], ['instagram', 'Instagram', '¿Cuánto cuesta el servicio?', 'hace 2 min', 290, 2], ['facebook', 'Facebook', '¿Atienden los sábados?', 'hace 5 min', 340, -1.5], ['ecommerce', 'Tu ecommerce', '¿Sigue disponible el producto?', 'hace 9 min', 300, 2.5], ['gmail', 'Gmail', '¿Me cotizan 3 equipos?', 'hace 14 min', 335, -2]];
    return shell(1080, 1350, `
      <div style="position:absolute;inset:0;background:linear-gradient(160deg,#0f5ced 0%,#1a3c8e 100%)"></div>
      <div class="grid" style="--gl:rgba(255,255,255,.10)"></div>
      <div style="position:absolute;left:300px;top:560px;width:900px;height:900px;border-radius:50%;background:radial-gradient(circle,rgba(88,166,255,.55),rgba(88,166,255,0) 68%)"></div>
      <img src="${MC('g1b-celular.png')}" style="position:absolute;left:130px;top:340px;width:1200px;filter:drop-shadow(0 40px 50px rgba(5,18,60,.5))">
      ${notis.map(([ic, c, m, t, x, r], i) => `<div style="position:absolute;left:${x}px;top:${380 + i * 128}px;width:670px;transform:rotate(${r}deg);background:rgba(255,255,255,.97);border-radius:32px;padding:18px 26px;display:flex;align-items:center;gap:22px;box-shadow:0 24px 50px rgba(5,18,60,.38)"><div style="flex:none;line-height:0">${CH_ICON[ic]}</div><div style="flex:1"><div style="display:flex;justify-content:space-between;font-size:25px;font-weight:700;color:#5f7094;letter-spacing:.04em"><span>${c.toUpperCase()}</span><span style="font-weight:500">${t}</span></div><div style="font-size:33px;font-weight:600;color:var(--ink);margin-top:3px;line-height:1.15">${m}</div></div></div>`).join('')}
      <div class="h" style="left:80px;top:80px;width:920px;font-size:96px;color:#fff;font-weight:700;letter-spacing:-.035em;line-height:1.02;white-space:nowrap">¿Por cuántos lugares<br><span style="color:${AMBER}">te escriben?</span></div>
      <img class="logo" src="${LOGO_DARK}" style="left:80px;transform:none;bottom:54px;width:300px">
      <div style="position:absolute;left:80px;bottom:130px;font-size:40px;font-weight:700;color:${AMBER};letter-spacing:.04em">Desliza →</div>
    `);
  },
});

// ── Portada v3 con fondo CLARO (para comparar con la azul) ──
Object.assign(PIECES, {
  'm1d-gancho-claro': () => {
    const notis = [['whatsapp', 'WhatsApp', 'Hola, ¿tienen hora mañana?', 'ahora', 330, -2], ['instagram', 'Instagram', '¿Cuánto cuesta el servicio?', 'hace 2 min', 290, 2], ['facebook', 'Facebook', '¿Atienden los sábados?', 'hace 5 min', 340, -1.5], ['ecommerce', 'Tu ecommerce', '¿Sigue disponible el producto?', 'hace 9 min', 300, 2.5], ['gmail', 'Gmail', '¿Me cotizan 3 equipos?', 'hace 14 min', 335, -2]];
    return shell(1080, 1350, `
      <div class="grid"></div>
      <div style="position:absolute;left:330px;top:480px;width:900px;height:900px;border-radius:50%;background:radial-gradient(circle,rgba(88,166,255,.38),rgba(88,166,255,0) 68%)"></div>
      <img src="${MC('g1b-celular.png')}" style="position:absolute;left:130px;top:340px;width:1200px;filter:drop-shadow(0 34px 44px rgba(26,60,142,.28))">
      ${notis.map(([ic, c, m, t, x, r], i) => `<div style="position:absolute;left:${x}px;top:${380 + i * 128}px;width:670px;transform:rotate(${r}deg);background:#fff;border:2px solid #dbe5f7;border-radius:32px;padding:18px 26px;display:flex;align-items:center;gap:22px;box-shadow:0 22px 46px rgba(26,60,142,.22)"><div style="flex:none;line-height:0">${CH_ICON[ic]}</div><div style="flex:1"><div style="display:flex;justify-content:space-between;font-size:25px;font-weight:700;color:#5f7094;letter-spacing:.04em"><span>${c.toUpperCase()}</span><span style="font-weight:500">${t}</span></div><div style="font-size:33px;font-weight:600;color:var(--ink);margin-top:3px;line-height:1.15">${m}</div></div></div>`).join('')}
      <div class="h" style="left:80px;top:80px;width:920px;font-size:96px;color:var(--ink);font-weight:700;letter-spacing:-.035em;line-height:1.02;white-space:nowrap">¿Por cuántos lugares<br><span style="color:var(--blue)">te escriben?</span></div>
      <img class="logo" src="${LOGO}" style="left:80px;transform:none;bottom:50px;width:430px">
      <div style="position:absolute;left:80px;bottom:150px;font-size:42px;font-weight:700;color:var(--blue);letter-spacing:.04em">Desliza →</div>
    `);
  },
});

// ── Portadas claras con canales «orbitando» (estilo de referencia: logo arriba, titular + frase, imagen central) ──
const orbitCircle = (ic, x, y, size, halo, delay) => `<div style="position:absolute;left:${x}px;top:${y}px;width:${size}px;height:${size}px;transform:translate(-50%,-50%);border-radius:50%;background:#fff;border:3px solid #dbe5f7;box-shadow:0 0 0 ${size * 0.14}px ${halo},0 20px 44px rgba(26,60,142,.22);display:flex;align-items:center;justify-content:center"><div style="line-height:0;transform:scale(${size / 124 * 1.0})">${CH_ICON[ic]}</div></div>`;
const coverLight = (centerHtml, circles) => shell(1080, 1350, `
  <div class="grid"></div>
  <div style="position:absolute;left:140px;top:430px;width:800px;height:800px;border-radius:50%;background:radial-gradient(circle,rgba(88,166,255,.34),rgba(88,166,255,0) 68%)"></div>
  <img class="logo" src="${LOGO}" style="top:50px;width:460px">
  <div class="h" style="left:0;width:100%;text-align:center;top:160px;font-size:90px;color:var(--ink);font-weight:700;letter-spacing:-.035em;line-height:1.02">¿Por cuántos lugares<br><span style="color:var(--blue)">te escriben?</span></div>
  <div style="position:absolute;left:0;width:100%;top:392px;text-align:center;font-size:42px;font-weight:500;color:#3a4d73">Un agente. <b style="color:var(--ink)">Todos tus canales.</b></div>
  ${centerHtml}
  ${circles.map(([ic, x, y, halo]) => orbitCircle(ic, x, y, 124, halo)).join('')}
  <div style="position:absolute;left:60px;bottom:52px;background:var(--blue);color:#fff;font-weight:700;font-size:38px;letter-spacing:.03em;padding:20px 44px;border-radius:70px;box-shadow:0 14px 34px rgba(15,92,237,.38)">Desliza →</div>
`);
Object.assign(PIECES, {
  'm1e-celular-orbita': () => coverLight(
    `<img src="${MC('g1b-celular.png')}" style="position:absolute;left:-56px;top:480px;width:1150px;filter:drop-shadow(0 30px 40px rgba(26,60,142,.25))">`,
    [['whatsapp', 150, 640, 'rgba(37,211,102,.16)'], ['instagram', 930, 600, 'rgba(225,48,108,.14)'], ['facebook', 110, 960, 'rgba(24,119,242,.15)'], ['ecommerce', 950, 930, 'rgba(124,92,255,.15)'], ['gmail', 880, 1220, 'rgba(234,67,53,.14)']]),
  'm1f-persona-orbita': () => coverLight(
    `<img src="${MC('g2p-persona.png')}" style="position:absolute;left:290px;top:470px;height:900px;filter:drop-shadow(0 26px 36px rgba(26,60,142,.22))">`,
    [['whatsapp', 150, 640, 'rgba(37,211,102,.16)'], ['instagram', 930, 600, 'rgba(225,48,108,.14)'], ['facebook', 110, 940, 'rgba(24,119,242,.15)'], ['ecommerce', 950, 930, 'rgba(124,92,255,.15)'], ['gmail', 190, 1110, 'rgba(234,67,53,.14)']]),
});

// ── Portada híbrida: celular + notificaciones (la que le gustó) con el encabezado claro centrado ──
Object.assign(PIECES, {
  'm1g-celular-notificaciones-claro': () => {
    const notis = [['whatsapp', 'WhatsApp', 'Hola, ¿tienen hora mañana?', 'ahora', 330, -2], ['instagram', 'Instagram', '¿Cuánto cuesta el servicio?', 'hace 2 min', 290, 2], ['facebook', 'Facebook', '¿Atienden los sábados?', 'hace 5 min', 340, -1.5], ['ecommerce', 'Tu ecommerce', '¿Sigue disponible el producto?', 'hace 9 min', 300, 2.5], ['gmail', 'Gmail', '¿Me cotizan 3 equipos?', 'hace 14 min', 335, -2]];
    return shell(1080, 1350, `
      <div class="grid"></div>
      <div style="position:absolute;left:260px;top:520px;width:900px;height:900px;border-radius:50%;background:radial-gradient(circle,rgba(88,166,255,.38),rgba(88,166,255,0) 68%)"></div>
      <img class="logo" src="${LOGO}" style="top:50px;width:460px">
      <div class="h" style="left:0;width:100%;text-align:center;top:160px;font-size:90px;color:var(--ink);font-weight:700;letter-spacing:-.035em;line-height:1.02">¿Por cuántos lugares<br><span style="color:var(--blue)">te escriben?</span></div>
      <div style="position:absolute;left:0;width:100%;top:392px;text-align:center;font-size:42px;font-weight:500;color:#3a4d73">Un agente. <b style="color:var(--ink)">Todos tus canales.</b></div>
      <img src="${MC('g1b-celular.png')}" style="position:absolute;left:150px;top:490px;width:1150px;filter:drop-shadow(0 34px 44px rgba(26,60,142,.28))">
      ${notis.map(([ic, c, m, t, x, r], i) => `<div style="position:absolute;left:${x}px;top:${530 + i * 118}px;width:670px;transform:rotate(${r}deg);background:#fff;border:2px solid #dbe5f7;border-radius:32px;padding:16px 26px;display:flex;align-items:center;gap:22px;box-shadow:0 22px 46px rgba(26,60,142,.24)"><div style="flex:none;line-height:0">${CH_ICON[ic]}</div><div style="flex:1"><div style="display:flex;justify-content:space-between;font-size:25px;font-weight:700;color:#5f7094;letter-spacing:.04em"><span>${c.toUpperCase()}</span><span style="font-weight:500">${t}</span></div><div style="font-size:33px;font-weight:600;color:var(--ink);margin-top:3px;line-height:1.15">${m}</div></div></div>`).join('')}
      <div style="position:absolute;left:60px;bottom:52px;background:var(--blue);color:#fff;font-weight:700;font-size:38px;letter-spacing:.03em;padding:20px 44px;border-radius:70px;box-shadow:0 14px 34px rgba(15,92,237,.38)">¿Tu celular se ve así? Desliza →</div>
    `);
  },
});

// ── Carrusel multicanal: láminas 2–7 (estilo claro, una idea por lámina, gancho entre láminas) ──
const sTop = (n, dark) => `<img class="logo" src="${dark ? LOGO_DARK : LOGO}" style="left:70px;transform:none;top:48px;width:250px"><div style="position:absolute;right:70px;top:58px;font-size:30px;font-weight:700;color:${dark ? '#b9c9f0' : '#5f7094'};letter-spacing:.08em">${n} / 7</div>`;
const sHead = (html, top = 130) => `<div class="h" style="left:70px;top:${top}px;width:940px;font-size:78px;color:var(--ink);font-weight:700;letter-spacing:-.035em;line-height:1.03">${html}</div>`;
const sHook = (t) => `<div style="position:absolute;right:70px;bottom:50px;background:#fff;border:2px solid #cfdcf5;color:var(--blue);font-weight:700;font-size:34px;padding:16px 36px;border-radius:60px;box-shadow:0 12px 28px rgba(26,60,142,.14)">${t}</div>`;
const sEx = () => '';
const icoS = (k, s) => `<div style="line-height:0;transform:scale(${s});transform-origin:0 0;width:${76 * s}px;height:${76 * s}px">${CH_ICON[k]}</div>`;
Object.assign(PIECES, {
  // 2 · Cada cliente elige su canal (tres personas distintas)
  'm2-cada-cliente': () => {
    const t = [['p1-manana-raw.png', 'instagram', 'Instagram', '8:40', '¿Cuánto cuesta el servicio?', '25%'], ['p2-mediodia-raw.png', 'whatsapp', 'WhatsApp', '13:15', '¿Atienden los sábados?', '55%'], ['p3-noche-raw.png', 'gmail', 'Correo', '22:30', '¿Me cotizan 3 equipos?', '85%']];
    return shell(1080, 1350, `<div class="grid"></div>${sTop(2)}${sHead('Cada cliente escribe <span style="color:var(--blue)">por donde le acomoda.</span>')}
      ${t.map(([img, ic, ch, hr, msg, px], i) => `<div style="position:absolute;left:${70 + i * 320}px;top:340px;width:300px;height:500px;border-radius:34px;overflow:hidden;box-shadow:0 24px 50px rgba(26,60,142,.22);background:url('${MC(img)}') ${px} 50%/cover no-repeat">
        <div style="position:absolute;left:14px;top:14px;background:#fff;border-radius:50px;padding:8px 16px 8px 8px;display:flex;align-items:center;gap:10px;font-weight:700;font-size:24px;color:var(--ink)">${icoS(ic, 0.58)}<span>${ch}</span></div>
        <div style="position:absolute;left:14px;bottom:14px;background:rgba(11,30,63,.78);color:#fff;border-radius:40px;padding:8px 20px;font-weight:700;font-size:30px">${hr}</div></div>
        <div style="position:absolute;left:${70 + i * 320}px;top:866px;width:300px;background:#fff;border:2px solid #dbe5f7;border-radius:28px;padding:20px 22px;font-size:30px;font-weight:600;line-height:1.2;color:var(--ink);box-shadow:0 14px 32px rgba(26,60,142,.12)">${msg}</div>`).join('')}
      
      ${sEx(70, 1020)}${sHook('Y cada canal, por su lado →')}`);
  },
  // 3 · Cada canal por su lado
  'm3-cada-canal': () => {
    const rows = [['whatsapp', 'WhatsApp', 'Hola, ¿tienen hora mañana?', 'Sin responder · 3 h', '#f5a524'], ['instagram', 'Instagram', '¿Cuánto cuesta el servicio?', 'Sin responder · 1 día', '#5aa0e6'], ['ecommerce', 'Tu ecommerce', '¿Sigue disponible el producto?', 'Sin responder · 2 días', '#3b6fb6']];
    return shell(1080, 1350, `<div class="grid"></div>${sTop(3)}${sHead('Cada canal por su lado, <span style="color:var(--blue)">una venta que se enfría.</span>')}
      ${rows.map(([ic, ch, m, st, col], i) => `<div style="position:absolute;left:70px;top:${370 + i * 205}px;width:940px;height:178px;background:#fff;border:2px solid #dbe5f7;border-radius:34px;box-shadow:0 18px 40px rgba(26,60,142,.14);overflow:hidden"><div style="position:absolute;left:0;top:0;bottom:0;width:18px;background:${col}"></div>
        <div style="position:absolute;left:50px;top:40px">${icoS(ic, 1.15)}</div>
        <div style="position:absolute;left:160px;top:30px;font-size:26px;font-weight:700;letter-spacing:.06em;color:#5f7094">${ch.toUpperCase()}</div>
        <div style="position:absolute;left:160px;top:68px;font-size:40px;font-weight:600;color:var(--ink)">${m}</div>
        <div style="position:absolute;left:160px;top:122px;display:inline-block;background:${col};color:#fff;font-weight:700;font-size:25px;padding:6px 20px;border-radius:30px">${st}</div></div>`).join('')}
      
      ${sEx(70, 1120)}${sHook('¿Y si fuera una sola? →')}`);
  },
  // 4 · Un agente, una bandeja (notebook real + bandeja dibujada)
  'm4-un-agente': () => {
    const conv = [['whatsapp', 'Camila', '¿Tienen hora mañana?', '13:02', 'Agente ✓', '#00a99b'], ['instagram', 'Rodrigo', '¿Cuánto cuesta el servicio?', '12:58', 'Agente ✓', '#00a99b'], ['facebook', 'Marta', 'Tuve un problema con mi pedido', '12:40', 'Pasó a tu equipo', '#f5a524'], ['ecommerce', 'Tienda online', '¿Sigue disponible el producto?', '12:31', 'Agente ✓', '#00a99b'], ['gmail', 'Pedro', '¿Me cotizan 3 equipos?', '12:15', 'Agente ✓', '#00a99b']];
    return shell(1080, 1350, `<div class="grid"></div>${sTop(4)}${sHead('Un agente atiende <span style="color:var(--blue)">todos los canales.</span>')}
      <img src="${MC('p4-notebook-cut.png')}" style="position:absolute;left:70px;top:330px;width:940px;filter:drop-shadow(0 30px 40px rgba(26,60,142,.28))">
      <div style="position:absolute;left:129px;top:365px;width:826px;height:569px;background:#fff;border-radius:6px;overflow:hidden">
        <div style="height:62px;background:var(--blue);color:#fff;display:flex;align-items:center;justify-content:space-between;padding:0 24px;font-weight:700;font-size:26px"><span>Bandeja · todos los canales</span><span style="font-size:22px;font-weight:600;opacity:.9">5 conversaciones</span></div>
        ${conv.map(([ic, n, m, t, st, col], i) => `<div style="height:101px;border-bottom:${i < 4 ? '2px solid #e8eef9' : '0'};display:flex;align-items:center;gap:16px;padding:0 20px"><div style="width:54px;height:54px;flex:none">${icoS(ic, 0.71)}</div><div style="flex:1;min-width:0"><div style="font-size:25px;font-weight:700;color:var(--ink)">${n}<span style="font-weight:500;color:#8a99b8;font-size:20px;margin-left:10px">${t}</span></div><div style="font-size:23px;color:#5f7094;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${m}</div></div><div style="background:${col};color:#fff;font-weight:700;font-size:19px;padding:6px 14px;border-radius:20px;white-space:nowrap">${st}</div></div>`).join('')}
      </div>
      ${sEx(70, 1290)}${sHook('¿Y qué hace en cada canal? →')}`);
  },
  // 5 · Qué hace el agente
  'm5-que-hace': () => {
    const it = [['#0f5ced', 'Responde', 'Con la información de tu negocio.', '<path d="M5 6h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-7l-5 4v-4H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"/>'], ['#00a99b', 'Agenda', 'Toma la hora o la visita.', '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/>'], ['#f5a524', 'Hace seguimiento', 'Retoma lo que quedó abierto.', '<path d="M20 12a8 8 0 1 1-2.5-5.8"/><path d="M20 4v5h-5"/>'], ['#7c5cff', 'Pasa a una persona', 'Avisa a tu equipo si hace falta.', '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M17 8h5M20 5.5 22.5 8 20 10.5"/>']];
    return shell(1080, 1350, `<div class="grid"></div>${sTop(5)}${sHead('Qué hace el agente <span style="color:var(--blue)">en cada canal.</span>')}
      ${it.map(([c, t, d, p], i) => `<div style="position:absolute;left:${70 + (i % 2) * 485}px;top:${340 + Math.floor(i / 2) * 360}px;width:455px;height:335px;background:#fff;border:2px solid #dbe5f7;border-radius:38px;padding:32px 34px;box-shadow:0 18px 40px rgba(26,60,142,.14)"><div style="width:84px;height:84px;border-radius:24px;background:${c};display:flex;align-items:center;justify-content:center"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg></div><div style="font-size:40px;font-weight:700;color:var(--ink);letter-spacing:-.02em;margin-top:18px">${t}</div><div style="font-size:29px;color:#5f7094;line-height:1.25;margin-top:6px">${d}</div></div>`).join('')}
      ${sHook('¿Y tu equipo? →')}`);
  },
  // 6 · Qué cambia para tu equipo
  'm6-tu-equipo': () => shell(1080, 1350, `<div class="grid"></div>${sTop(6)}${sHead('Qué cambia <span style="color:var(--blue)">para tu equipo.</span>')}
      <div style="position:absolute;left:70px;top:350px;width:940px;height:410px;border-radius:40px;overflow:hidden;box-shadow:0 26px 56px rgba(26,60,142,.24);background:url('${MC('p6-equipo-raw.png')}') 50% 20%/cover no-repeat"></div>
      ${['Un solo lugar para revisar.', 'Seguimientos programados.', 'Los casos importantes, a una persona.'].map((t, i) => `<div style="position:absolute;left:70px;top:${795 + i * 100}px;width:940px;display:flex;align-items:center;gap:22px"><div style="width:56px;height:56px;flex:none;border-radius:50%;background:var(--blue);display:flex;align-items:center;justify-content:center"><svg width="32" height="32" viewBox="0 0 52 52"><path d="M14 27 L23 36 L39 17" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg></div><div style="font-size:38px;font-weight:600;color:var(--ink);letter-spacing:-.015em;line-height:1.2">${t}</div></div>`).join('')}
      <div style="position:absolute;left:70px;top:1125px;background:#e6efff;color:var(--real);font-weight:700;font-size:30px;padding:14px 30px;border-radius:50px">Bandeja omnicanal desde el plan Esencial</div>
      ${sHook('Así se parte →')}`),
  // 7 · Cierre comercial (azul fuerte)
  'm7-cierre': () => shell(1080, 1350, `
      <div style="position:absolute;inset:0;background:linear-gradient(160deg,#0f5ced 0%,#1a3c8e 100%)"></div><div class="grid" style="--gl:rgba(255,255,255,.10)"></div>
      <div style="position:absolute;left:-200px;top:700px;width:1000px;height:1000px;border-radius:50%;background:radial-gradient(circle,rgba(88,166,255,.5),rgba(88,166,255,0) 68%)"></div>
      <div style="position:absolute;right:70px;top:58px;font-size:30px;font-weight:700;color:#b9c9f0;letter-spacing:.08em">7 / 7</div>
      <img class="logo" src="${LOGO_DARK}" style="left:70px;transform:none;top:40px;width:480px">
      <div class="h" style="left:70px;top:190px;width:940px;font-size:104px;color:#fff;font-weight:700;letter-spacing:-.035em;line-height:1.02">Un agente.<br><span style="color:${AMBER}">Todos tus canales.</span></div>
      <div class="body" style="left:70px;width:900px;top:500px;font-size:44px;color:#e6efff">Elige el tamaño que calza con tu operación.</div>
      <div style="position:absolute;left:70px;top:610px;background:${AMBER};color:#10224f;font-weight:700;font-size:32px;letter-spacing:.06em;padding:14px 32px;border-radius:50px">BENEFICIO OCTUBRE · HASTA EL 31/10</div>
      <div class="body" style="left:70px;width:900px;top:700px;font-size:40px;color:#dbe6ff;line-height:1.3">Contrata antes y <b style="color:#fff">mantén tu mensualidad</b> mientras sigas en el mismo plan.</div>
      <div style="position:absolute;left:70px;top:900px;width:940px;background:#fff;border-radius:44px;padding:40px 48px;box-shadow:0 30px 70px rgba(5,18,60,.38)"><div style="font-size:34px;font-weight:600;color:#5f7094">Mira los planes en</div><div style="font-size:72px;font-weight:700;letter-spacing:-.02em;color:var(--blue);line-height:1.1;margin-top:6px">atacamalabs.cl/precios</div></div>
      <div class="body" style="left:70px;width:940px;top:1160px;font-size:40px;color:#fff;font-weight:600">O escríbenos por mensaje directo.</div>
      <div style="position:absolute;left:70px;bottom:52px;font-size:30px;font-weight:600;color:#b9c9f0;letter-spacing:.04em">Agentes que trabajan.</div>`),
});

// ── Cierre v2: llamita al centro, canales orbitando y recuadro de marca con esquinas ──
const brandBox = () => { const c = (pos) => `<div style="position:absolute;${pos};width:44px;height:44px;border:0 solid ${AMBER}"></div>`;
  return `<div style="position:absolute;left:150px;top:1118px;width:780px;height:190px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px">
    <div style="position:absolute;left:0;top:0;width:46px;height:46px;border-left:6px solid ${AMBER};border-top:6px solid ${AMBER}"></div>
    <div style="position:absolute;right:0;top:0;width:46px;height:46px;border-right:6px solid ${AMBER};border-top:6px solid ${AMBER}"></div>
    <div style="position:absolute;left:0;bottom:0;width:46px;height:46px;border-left:6px solid ${AMBER};border-bottom:6px solid ${AMBER}"></div>
    <div style="position:absolute;right:0;bottom:0;width:46px;height:46px;border-right:6px solid ${AMBER};border-bottom:6px solid ${AMBER}"></div>
    <img src="${LOGO_DARK}" style="width:400px">
    <div style="font-size:38px;font-weight:700;color:#fff;letter-spacing:.02em">Agentes que trabajan.</div>
    <div style="font-size:28px;font-weight:600;color:#b9c9f0;letter-spacing:.14em">ATACAMALABS.CL</div></div>`; };
Object.assign(PIECES, {
  'm7-cierre': () => {
    const cx = 540, cy = 690, R = 345;
    const ang = [-150, -90, -30, 30, 90, 150];
    const items = ['whatsapp', 'instagram', 'facebook', 'gmail', 'ecommerce', 'mas'];
    const halos = ['rgba(37,211,102,.30)', 'rgba(225,48,108,.28)', 'rgba(24,119,242,.30)', 'rgba(234,67,53,.26)', 'rgba(124,92,255,.30)', 'rgba(255,255,255,.22)'];
    return shell(1080, 1350, `
      <div style="position:absolute;inset:0;background:linear-gradient(160deg,#0f5ced 0%,#1a3c8e 100%)"></div>
      <div class="grid" style="--gl:rgba(255,255,255,.09)"></div>
      <div style="position:absolute;left:${cx - 520}px;top:${cy - 520}px;width:1040px;height:1040px;border-radius:50%;background:radial-gradient(circle,rgba(88,166,255,.5),rgba(88,166,255,0) 66%)"></div>
      <div style="position:absolute;left:${cx - R}px;top:${cy - R}px;width:${R * 2}px;height:${R * 2}px;border-radius:50%;border:3px dashed rgba(255,255,255,.30)"></div>
      <div style="position:absolute;left:${cx - 215}px;top:${cy - 215}px;width:430px;height:430px;border-radius:50%;border:2px solid rgba(255,255,255,.16)"></div>
      <div style="position:absolute;right:70px;top:58px;font-size:30px;font-weight:700;color:#b9c9f0;letter-spacing:.08em">7 / 7</div>
      <div class="h" style="left:70px;top:70px;width:900px;font-size:86px;color:#fff;font-weight:700;letter-spacing:-.035em;line-height:1.02">Un agente.<br><span style="color:${AMBER}">Todos tus canales.</span></div>
      <img src="${MC('g7b-llama.png')}" style="position:absolute;left:${cx}px;top:${cy + 8}px;height:520px;transform:translate(-50%,-50%);filter:drop-shadow(0 30px 40px rgba(5,18,60,.45))">
      ${items.map((k, i) => { const a = ang[i] * Math.PI / 180; const x = Math.round(cx + R * Math.cos(a)), y = Math.round(cy + R * Math.sin(a));
        if (k === 'mas') return `<div style="position:absolute;left:${x}px;top:${y}px;width:124px;height:124px;transform:translate(-50%,-50%);border-radius:50%;background:#fff;border:3px solid #dbe5f7;box-shadow:0 0 0 17px ${halos[i]},0 20px 44px rgba(5,18,60,.35);display:flex;flex-direction:column;align-items:center;justify-content:center"><div style="font-size:42px;font-weight:700;color:var(--blue);line-height:1">+400</div><div style="position:absolute;top:132px;left:50%;transform:translateX(-50%);font-size:24px;font-weight:700;color:#fff;white-space:nowrap">integraciones</div></div>`;
        return orbitCircle(k, x, y, 124, halos[i]); }).join('')}
      ${brandBox()}
    `);
  },
});

// ── Cierre v3: fondo blanco, pregunta «¿Listo para llevar tus canales al siguiente nivel?», llamita saltando con los brazos abiertos ──
const brandBoxLight = () => `<div style="position:absolute;left:150px;top:1118px;width:780px;height:190px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px">
    <div style="position:absolute;left:0;top:0;width:46px;height:46px;border-left:6px solid var(--blue);border-top:6px solid var(--blue)"></div>
    <div style="position:absolute;right:0;top:0;width:46px;height:46px;border-right:6px solid var(--blue);border-top:6px solid var(--blue)"></div>
    <div style="position:absolute;left:0;bottom:0;width:46px;height:46px;border-left:6px solid var(--blue);border-bottom:6px solid var(--blue)"></div>
    <div style="position:absolute;right:0;bottom:0;width:46px;height:46px;border-right:6px solid var(--blue);border-bottom:6px solid var(--blue)"></div>
    <img src="${LOGO}" style="width:400px">
    <div style="font-size:38px;font-weight:700;color:var(--ink);letter-spacing:.02em">Agentes que trabajan.</div>
    <div style="font-size:28px;font-weight:600;color:var(--blue);letter-spacing:.14em">ATACAMALABS.CL</div></div>`;
Object.assign(PIECES, {
  'm7-cierre': () => {
    const cx = 540, cy = 705, R = 345;
    const ang = [-150, -90, -30, 30, 90, 150];
    const items = ['whatsapp', 'instagram', 'facebook', 'gmail', 'ecommerce', 'mas'];
    const halos = ['rgba(37,211,102,.22)', 'rgba(225,48,108,.20)', 'rgba(24,119,242,.22)', 'rgba(234,67,53,.18)', 'rgba(124,92,255,.22)', 'rgba(15,92,237,.16)'];
    return shell(1080, 1350, `
      <div class="grid"></div>
      <div style="position:absolute;left:${cx - 520}px;top:${cy - 520}px;width:1040px;height:1040px;border-radius:50%;background:radial-gradient(circle,rgba(88,166,255,.34),rgba(88,166,255,0) 66%)"></div>
      <div style="position:absolute;left:${cx - R}px;top:${cy - R}px;width:${R * 2}px;height:${R * 2}px;border-radius:50%;border:3px dashed rgba(15,92,237,.28)"></div>
      <div style="position:absolute;left:${cx - 215}px;top:${cy - 215}px;width:430px;height:430px;border-radius:50%;border:2px solid rgba(15,92,237,.14)"></div>
      <div style="position:absolute;right:70px;top:58px;font-size:30px;font-weight:700;color:#5f7094;letter-spacing:.08em">7 / 7</div>
      <div class="h" style="left:0;width:100%;text-align:center;top:84px;font-size:70px;color:var(--ink);font-weight:700;letter-spacing:-.035em;line-height:1.05">¿Listo para llevar tus<br>canales al <span style="color:var(--blue)">siguiente nivel?</span></div>
      <img src="${MC('g8-llama.png')}" style="position:absolute;left:${cx}px;top:${cy + 12}px;height:540px;transform:translate(-50%,-50%);filter:drop-shadow(0 26px 30px rgba(26,60,142,.28))">
      ${items.map((k, i) => { const a = ang[i] * Math.PI / 180; const x = Math.round(cx + R * Math.cos(a)), y = Math.round(cy + R * Math.sin(a));
        if (k === 'mas') return `<div style="position:absolute;left:${x}px;top:${y}px;width:124px;height:124px;transform:translate(-50%,-50%);border-radius:50%;background:#fff;border:3px solid #dbe5f7;box-shadow:0 0 0 17px ${halos[i]},0 20px 44px rgba(26,60,142,.22);display:flex;flex-direction:column;align-items:center;justify-content:center"><div style="font-size:42px;font-weight:700;color:var(--blue);line-height:1">+400</div><div style="position:absolute;top:132px;left:50%;transform:translateX(-50%);font-size:24px;font-weight:700;color:#3a4d73;white-space:nowrap">integraciones</div></div>`;
        return orbitCircle(k, x, y, 124, halos[i]); }).join('')}
      ${brandBoxLight()}
    `);
  },
});

const only = process.argv.slice(2);
const browser = await chromium.launch();
for (const [name, fn] of Object.entries(PIECES)) {
  if (only.length && !only.some((o) => name.startsWith(o))) continue;
  const post45 = name.startsWith('02') || /^c[0-9]/.test(name) || name.startsWith('w0') || /^m[0-9]/.test(name);
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
