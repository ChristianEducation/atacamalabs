#!/usr/bin/env node
/**
 * Atacama OS · plantillas de HISTORIA de Instagram (Frente C) — 1080×1920, lenguaje de marca de los videos y de brand/content/historias/.
 * Reciben `piece.story` (validado en engine-core: template, kicker, title, body, pill, chat[], stages[], keyword, figure) y devuelven un PNG.
 * Colores de marca + cuadrícula de 120 px (nada de negro ni texturas), DM Sans, logos SOLO desde public/brand, zonas seguras (texto clave fuera de los
 * primeros/últimos 250 px salvo logo y url). `*palabra*` en un título = énfasis. Determinista: el mismo story produce el mismo PNG.
 *
 *   node scripts/content/story-templates.mjs <pieza.json> [carpeta-salida]     (dibuja la historia de la pieza)
 *   node scripts/content/story-templates.mjs --demo [carpeta-salida]           (una muestra de cada plantilla)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FONT = pathToFileURL(path.join(ROOT, 'src/app/fonts/DMSans-latin-wght.woff2')).href;
const uri = (file) => 'data:image/svg+xml;base64,' + fs.readFileSync(path.join(ROOT, 'public/brand', file)).toString('base64');

export const STORY_TEMPLATE_NAMES = ['dolor', 'pregunta', 'chat', 'embudo', 'recurso', 'dato'];

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const rich = (s) => esc(s).replace(/\*([^*]+)\*/g, '<em>$1</em>').replace(/\n/g, '<br>');

const CSS = (font) => `
@font-face { font-family: "DM Sans"; src: url("${font}") format("woff2"); font-weight: 100 1000; }
:root { --real:#1a3c8e; --blue:#0f5ced; --sky:#58a6ff; --mist:#f3f6fd; --ink:#0b1e3f; --line:rgba(15,92,237,.10); }
* { margin:0; padding:0; box-sizing:border-box; }
html, body { width:1080px; height:1920px; background:#fff; font-family:"DM Sans",sans-serif; -webkit-font-smoothing:antialiased; color:var(--ink); overflow:hidden; }
.canvas { position:relative; width:1080px; height:1920px; overflow:hidden; background:var(--mist); }
.grid { position:absolute; inset:0; background-image:linear-gradient(var(--gl,var(--line)) 2px,transparent 2px),linear-gradient(90deg,var(--gl,var(--line)) 2px,transparent 2px); background-size:120px 120px; }
.top { position:absolute; left:0; top:0; width:100%; background:var(--real); --gl:rgba(255,255,255,.13); overflow:hidden; }
.h { position:absolute; font-weight:500; letter-spacing:-.032em; line-height:1.04; }
.h em { font-style:normal; color:var(--sky); }
.on-light em { color:var(--blue); }
.kick { position:absolute; left:90px; font-size:32px; font-weight:600; letter-spacing:.14em; text-transform:uppercase; color:var(--sky); }
.body { position:absolute; font-weight:400; line-height:1.3; }
.body b { font-weight:600; }
.pill { position:absolute; left:50%; transform:translateX(-50%); background:var(--blue); color:#fff; font-weight:600; white-space:nowrap; border-radius:70px; box-shadow:0 14px 34px rgba(15,92,237,.35); }
.logo { position:absolute; left:50%; transform:translateX(-50%); }
.url { position:absolute; left:0; width:100%; text-align:center; font-weight:500; color:var(--blue); letter-spacing:.14em; }
.phone { position:absolute; background:#fff; border:3px solid #d5e0f6; box-shadow:0 30px 70px rgba(5,18,60,.28); overflow:hidden; }
.ph-head { display:flex; align-items:center; gap:18px; border-bottom:2px solid #e7eefb; font-weight:600; color:var(--ink); }
.av { border-radius:50%; background:var(--blue); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:600; }
.msg { max-width:80%; padding:18px 24px; border-radius:28px; font-size:29px; line-height:1.28; margin:10px 26px; }
.msg.in { background:#f1f5fd; border-bottom-left-radius:8px; }
.msg.out { background:#dce8ff; margin-left:auto; border-bottom-right-radius:8px; }
.card { position:absolute; background:#fff; border:3px solid #d5e0f6; border-radius:44px; box-shadow:0 30px 70px rgba(5,18,60,.16); }
.panel { position:absolute; left:0; width:100%; height:960px; overflow:hidden; display:flex; align-items:center; justify-content:center; text-align:center; }
.panel .h { position:relative; width:900px; font-size:112px; }
`;

const shell = (inner) => `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>${CSS(FONT)}</style></head><body><div class="canvas">${inner}</div></body></html>`;
const footer = (logo, top, urlTop) => `<img class="logo" src="${logo}" style="top:${top}px;width:400px"><div class="url" style="top:${urlTop}px;font-size:28px">ATACAMALABS.CL</div>`;

/** HTML de una historia (string) para `story` = piece.story. */
export function storyHtml(story) {
  const LOGO = uri('logo-horizontal.svg');
  const LOGO_DARK = uri('logo-horizontal-fondo-oscuro.svg');
  const s = story || {};
  const kicker = s.kicker ? `<div class="kick" style="top:196px">${esc(s.kicker)}</div>` : '';
  const head = (size) => `<div class="top" style="height:800px"><div class="grid"></div></div>${kicker}<div class="h" style="left:90px;top:262px;width:900px;font-size:${size || 88}px;color:#fff">${rich(s.title)}</div>`;
  const pill = (top, size) => (s.pill ? `<div class="pill" style="top:${top}px;font-size:${size || 41}px;padding:24px 54px">${esc(s.pill)}</div>` : '');
  const body = (top, size) => (s.body ? `<div class="body" style="left:110px;width:860px;top:${top}px;font-size:${size || 40}px;text-align:center">${rich(s.body)}</div>` : '');
  switch (s.template) {
    case 'dolor':
      return shell(`<div class="grid"></div>${head(96)}
        <div class="card" style="left:130px;top:620px;width:820px;height:640px;display:flex;align-items:center;justify-content:center;padding:70px;text-align:center;font-size:52px;line-height:1.28;font-weight:500">${rich(s.body || '')}</div>
        ${pill(1338)}${footer(LOGO, 1560, 1632)}`);
    case 'pregunta': {
      const parts = String(s.title || '').split('|');
      const a = parts[0] || '', b = parts.slice(1).join('|') || '';
      return shell(`<div class="panel" style="top:0;background:var(--real);--gl:rgba(255,255,255,.13)"><div class="grid"></div><div class="h" style="color:var(--mist)">${rich(a.trim())}</div></div>
        <div class="panel" style="top:960px;background:var(--mist);padding-bottom:240px"><div class="grid"></div><div class="h on-light" style="color:var(--blue)">${rich(b.trim())}</div></div>
        <div style="position:absolute;left:0;top:958px;width:100%;height:4px;background:#fff;box-shadow:0 6px 18px rgba(5,18,60,.25)"></div>
        ${s.pill ? `<div class="pill" style="top:1490px;font-size:41px;padding:24px 54px">${esc(s.pill)}</div>` : ''}${footer(LOGO, 1618, 1690)}`);
    }
    case 'chat': {
      const chat = (s.chat || []).map((m) => `<div class="msg ${m.from === 'out' ? 'out' : 'in'}">${esc(m.text)}</div>`).join('');
      const who = s.kicker || 'Cliente';
      return shell(`<div class="grid"></div><div class="top" style="height:480px"><div class="grid"></div></div>
        <div class="h" style="left:90px;top:262px;width:900px;font-size:72px;color:#fff">${rich(s.title)}</div>
        <div class="phone" style="left:240px;top:540px;width:600px;height:830px;border-radius:70px">
          <div class="ph-head" style="height:112px;padding:0 34px;font-size:30px"><div class="av" style="width:58px;height:58px;font-size:28px">${esc(who.trim().charAt(0).toUpperCase())}</div><div>${esc(who)}<div style="font-size:22px;font-weight:400;color:#5f7094">en línea</div></div></div>
          <div style="padding-top:14px">${chat}</div>
        </div>${pill(1412)}${body(1522, 38)}${footer(LOGO, 1652, 1722)}`);
    }
    case 'embudo': {
      const card = (x, y, r, kind) => `<g transform="translate(${x} ${y}) rotate(${r})"><rect width="150" height="72" rx="14" fill="#fff" stroke="#cfdcf5" stroke-width="2"/><circle cx="34" cy="36" r="17" fill="${kind === 'ok' ? '#0f5ced' : '#d7e0f2'}"/>${kind === 'ok' ? '<path d="M26 36l6 6 11-12" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' : '<text x="34" y="44" text-anchor="middle" font-size="24" font-weight="700" fill="#7a8bb0" font-family="DM Sans">?</text>'}<rect x="62" y="22" width="72" height="9" rx="4" fill="#dfe8f8"/><rect x="62" y="40" width="48" height="9" rx="4" fill="#e9eff9"/></g>`;
      const st = Array.isArray(s.stages) ? s.stages : [];
      const labels = st.map((t, i) => `<text x="${175 + i * 205}" y="752" text-anchor="middle" font-size="26" font-weight="600" fill="#1a3c8e" font-family="DM Sans">${esc(t)}</text>`).join('');
      return shell(`<div class="grid"></div>${head(92)}
        <svg style="position:absolute;left:84px;top:500px" width="912" height="960" viewBox="0 0 760 800">
          ${card(60, 40, -9, 'q')}${card(220, 10, 6, 'q')}${card(400, 30, -5, 'q')}${card(560, 14, 8, 'q')}${card(130, 118, 5, 'q')}${card(320, 108, -7, 'q')}${card(500, 124, 6, 'q')}
          <defs><linearGradient id="fg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2e74f5"/><stop offset="1" stop-color="#0f5ced"/></linearGradient></defs>
          <path d="M110 250 L650 250 L440 470 L440 560 L320 560 L320 470 Z" fill="url(#fg)"/><ellipse cx="380" cy="250" rx="270" ry="22" fill="#58a6ff" opacity=".55"/>
          ${card(100, 640, 0, 'ok')}${card(305, 640, 0, 'ok')}${card(510, 640, 0, 'ok')}${labels}
        </svg>${pill(1430, 40)}${body(1538, 38)}${footer(LOGO, 1668, 1738)}`);
    }
    case 'recurso': {
      const rows = [0, 1, 2, 3].map((i) => `<div style="display:flex;align-items:center;gap:26px;margin:0 0 34px"><span style="width:54px;height:54px;border-radius:14px;background:${i < 3 ? 'var(--blue)' : '#d7e0f2'};color:#fff;display:flex;align-items:center;justify-content:center;font-size:34px;font-weight:700">${i < 3 ? '✓' : ''}</span><span style="height:18px;border-radius:9px;background:#dfe8f8;width:${[420, 360, 470, 300][i]}px"></span></div>`).join('');
      return shell(`<div class="grid"></div>${head(92)}
        <div class="card" style="left:200px;top:610px;width:680px;height:560px;padding:76px 72px">${rows}</div>
        <div class="pill" style="top:1250px;font-size:46px;padding:26px 60px">Comenta «${esc(String(s.keyword || '').toUpperCase())}»</div>
        ${body(1370, 40)}${footer(LOGO, 1618, 1690)}`);
    }
    case 'dato': {
      const f = s.figure || {};
      return shell(`<div class="grid"></div>${head(88)}
        <div class="card" style="left:130px;top:620px;width:820px;height:600px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:50px">
          <div style="font-size:230px;font-weight:600;letter-spacing:-.05em;color:var(--blue);line-height:1">${esc(f.value)}</div>
          <div style="font-size:44px;font-weight:500;margin-top:26px;line-height:1.25">${esc(f.label)}</div></div>
        ${pill(1290)}${body(1410, 38)}${footer(LOGO, 1618, 1690)}`);
    }
    default:
      throw new Error('Plantilla de historia desconocida: ' + s.template);
  }
}

/** Dibuja la historia de una pieza en `outDir/story-01.png`. */
export async function renderStories(piece, outDir) {
  const { chromium } = await import('playwright');
  fs.mkdirSync(outDir, { recursive: true });
  const html = storyHtml(piece.story);
  const tmp = path.join(outDir, '.story.html');
  fs.writeFileSync(tmp, html);
  const browser = await chromium.launch(process.env.ATACAMA_CHROMIUM_ARGS ? { args: process.env.ATACAMA_CHROMIUM_ARGS.split(' ') } : {});
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
    await page.goto(pathToFileURL(tmp).href);
    await page.evaluate(() => document.fonts.ready);
    const file = path.join(outDir, 'story-01.png');
    await page.screenshot({ path: file, clip: { x: 0, y: 0, width: 1080, height: 1920 } });
    return [file];
  } finally { await browser.close(); fs.rmSync(tmp, { force: true }); }
}

export const DEMO_STORIES = {
  dolor: { template: 'dolor', kicker: 'Seguimiento', title: '¿Cuántas consultas se *enfrían* cada semana?', body: 'Cuando nadie responde a tiempo, **el interés se pierde.**'.replace(/\*\*/g, ''), pill: 'Un agente no olvida el seguimiento' },
  pregunta: { template: 'pregunta', title: '¿Quién contesta | cuando tú no puedes?', pill: 'Agentes que trabajan.' },
  chat: { template: 'chat', kicker: 'Cliente · Faena', title: 'Pidió la cotización *y desapareció.*', chat: [{ from: 'in', text: 'Hola, ¿me envías la cotización?' }, { from: 'out', text: 'Aquí la tienes. Cualquier duda, escríbeme.' }, { from: 'out', text: 'Hola, ¿pudiste revisarla? Agendamos una llamada si quieres.' }], pill: 'Seguimiento hasta tener respuesta', body: 'El agente retoma la conversación y avisa a una persona cuando hay interés.' },
  embudo: { template: 'embudo', title: 'Solo lo que *vale tu tiempo.*', stages: ['Consulta', 'Califica', 'Agenda'], pill: 'Atiende a todos, prioriza a quien avanza', body: 'El agente conversa con cada contacto y te pasa a quienes están listos para avanzar.' },
  recurso: { template: 'recurso', kicker: 'Guía gratis', title: 'Checklist: *antes de automatizar*', keyword: 'checklist', body: 'Te lo enviamos por mensaje directo.' },
  dato: { template: 'dato', kicker: 'Dato', title: 'Lo que cuesta *no responder*', figure: { value: '5 min', label: 'es el tiempo de respuesta que muchas consultas esperan' }, pill: 'Un agente responde al instante', body: 'Y deriva a una persona cuando hace falta.' },
};

if (process.argv[1] && process.argv[1].endsWith('story-templates.mjs')) {
  const arg = process.argv[2];
  const { chromium } = await import('playwright');
  const out = process.argv[3] || path.join(ROOT, 'social/exports/historias');
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch(process.env.ATACAMA_CHROMIUM_ARGS ? { args: process.env.ATACAMA_CHROMIUM_ARGS.split(' ') } : {});
  const list = arg === '--demo' ? Object.entries(DEMO_STORIES) : [[path.basename(arg || 'story').replace(/\.json$/, ''), JSON.parse(fs.readFileSync(arg, 'utf8')).story]];
  for (const [name, story] of list) {
    const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
    const tmp = path.join(out, '.t-' + name + '.html'); fs.writeFileSync(tmp, storyHtml(story));
    await page.goto(pathToFileURL(tmp).href); await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(out, name + '.png') }); await page.close(); fs.rmSync(tmp, { force: true }); console.log('ok', name);
  }
  await browser.close();
}
