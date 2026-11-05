#!/usr/bin/env node
/**
 * Atacama OS · Media Gateway — «carrusel como video» (motion graphics de marca, 9:16 · 1080×1920 · 30 fps).
 *
 * Toma una pieza canónica (la misma del renderer de carruseles: cover · content… · cta) y la anima con el MISMO sistema de marca:
 * DM Sans fina, azul Atacama #0F5CED, azul oscuro #041228, fondos claros, logo oficial (SVG de public/brand/, nunca reconstruido) y, opcionalmente,
 * un clip de la llamita generado A PARTIR DE LA POSE OFICIAL (Higgsfield, imagen→video). Todo el texto, el logo y los colores los dibuja este
 * renderer (Playwright) cuadro a cuadro: ningún modelo generativo escribe texto ni toca el logo. ffmpeg compone y codifica.
 *
 *   node scripts/media/motion-render.mjs <pieza.json> <salida.mp4> [--llama clip.mp4] [--keep-frames]
 *
 * Sin audio (a propósito: sobrio). Nunca publica ni programa nada.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BRAND = path.join(ROOT, 'public/brand');
const FONT = path.join(ROOT, 'src/app/fonts/DMSans-latin-wght.woff2');
const FPS = 30, W = 1080, H = 1920;
const T = { blue: '#0F5CED', deep: '#041228', cream: '#FBF8F2', mist: '#F3F6FD', white: '#FFFFFF' };

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const rich = (s) => esc(s).replace(/\*([^*]+)\*/g, '<em>$1</em>').replace(/\n/g, '<br>');
const svgInline = (f) => fs.readFileSync(path.join(BRAND, f), 'utf8').replace(/<svg /, '<svg style="display:block;width:100%;height:auto" ');

const ICONS = [
  '<svg viewBox="0 0 64 64" fill="none" stroke="#0F5CED" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="28" cy="28" r="14"/><path d="M38.5 38.5 52 52"/><path d="M22 28h12M28 22v12" opacity=".55"/></svg>',
  '<svg viewBox="0 0 64 64" fill="none" stroke="#0F5CED" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><rect x="10" y="12" width="44" height="14" rx="5"/><rect x="10" y="38" width="44" height="14" rx="5"/><path d="M32 26v12"/><circle cx="19" cy="19" r="1.6" fill="#0F5CED"/><circle cx="19" cy="45" r="1.6" fill="#0F5CED"/></svg>',
  '<svg viewBox="0 0 64 64" fill="none" stroke="#0F5CED" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 32h30"/><path d="M32 20l12 12-12 12"/><circle cx="52" cy="32" r="3" fill="#0F5CED"/></svg>',
  '<svg viewBox="0 0 64 64" fill="none" stroke="#0F5CED" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M32 8 14 16v14c0 12 7 20 18 26 11-6 18-14 18-26V16L32 8Z"/><path d="m24 31 6 6 11-12"/></svg>',
];

/** Escenas a partir de la pieza: portada, pasos y cierre. Duraciones en segundos. */
export function buildScenes(piece, hasLlama) {
  const slides = piece.slides || [];
  const scenes = [];
  let at = 0;
  slides.forEach((s, i) => {
    const kind = i === 0 ? 'cover' : i === slides.length - 1 ? 'cta' : 'step';
    const dur = kind === 'cover' ? (hasLlama ? 6.2 : 4.2) : kind === 'cta' ? 5.2 : 3.6;
    const paras = String(s.body || '').split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean);
    const chips = paras[0] && paras[0].includes(' · ') ? paras.shift().split(' · ').map((x) => x.trim()).filter(Boolean) : [];
    scenes.push({ kind, start: at, dur, n: i, total: slides.length, kicker: s.kicker || '', title: s.title || '', paras, chips, theme: kind === 'step' ? (i % 2 ? 'cream' : 'mist') : 'mist', icon: ICONS[(i - 1 + ICONS.length) % ICONS.length] });
    at += dur - 0.4; // cada escena se solapa 0,4 s con la anterior (fundido)
  });
  const total = at + 0.4;
  return { scenes, total };
}

function html(sc, total, hasLlama) {
  const fontUrl = pathToFileURL(FONT).href;
  const logoLight = svgInline('logo-horizontal.svg');
  const steps = sc.filter((s) => s.kind === 'step').length;
  const body = sc.map((s, idx) => {
    const num = String(s.n).padStart(2, '0');
    const bar = s.kind === 'step' ? `<div class="bar">${Array.from({ length: steps }, (_, k) => `<i class="${k < s.n ? 'on' : ''}"></i>`).join('')}</div>` : '';
    const common = `<div class="logo" data-at="0.1" data-dur="0.6" data-t="fade">${logoLight}</div>`;
    if (s.kind === 'cover') {
      const [l1, ...rest] = String(s.title).split('\n');
      return `<section class="scene ${s.theme} cover" data-i="${idx}">${common}
        <div class="kicker" style="top:196px" data-at="0.3" data-dur="0.6" data-t="up">${esc(s.kicker || 'Agentes de IA')}</div>
        <h1 style="top:256px" data-at="0.5" data-dur="0.9" data-t="up">${rich(l1)}</h1>
        <p class="lead blue" style="top:${hasLlama ? 466 : 520}px" data-at="${hasLlama ? 2.6 : 1.9}" data-dur="0.9" data-t="up">${rich(rest.join(' ') || (s.paras[0] || ''))}</p></section>`;
    }
    if (s.kind === 'step') {
      const chips = s.chips.length ? `<div class="chips">${s.chips.map((c, k) => `<span data-at="${1.3 + k * 0.16}" data-dur="0.5" data-t="up">${esc(c)}</span>`).join('')}</div>` : '';
      return `<section class="scene ${s.theme} step" data-i="${idx}">${bar}${common}
        <div class="ghost" data-at="0.2" data-dur="1.0" data-t="fade">${num}</div>
        <div class="card" data-at="0.3" data-dur="0.8" data-t="up"><div class="ico">${s.icon}</div></div>
        <div class="kicker" style="top:1090px" data-at="0.55" data-dur="0.6" data-t="up">Paso ${s.n} de ${steps}</div>
        <h2 style="top:1150px" data-at="0.7" data-dur="0.8" data-t="up">${rich(s.title)}</h2>
        ${s.paras[0] && !chips ? `<p class="lead" style="top:1310px" data-at="1.0" data-dur="0.8" data-t="up">${rich(s.paras[0])}</p>` : ''}
        ${chips ? chips.replace('<div class="chips">', '<div class="chips" style="top:1310px">') : ''}
        ${chips && s.paras[0] ? `<p class="lead blue" style="top:1450px" data-at="2.2" data-dur="0.8" data-t="up">${rich(s.paras[0])}</p>` : ''}
        ${!chips && s.paras[1] ? `<p class="lead blue" style="top:1540px" data-at="1.9" data-dur="0.8" data-t="up">${rich(s.paras[1])}</p>` : ''}</section>`;
    }
    const [t1, ...tr] = String(s.title).split('\n');
    return `<section class="scene ${s.theme} cta" data-i="${idx}">${common}
      <div class="rule" data-at="0.3" data-dur="0.8" data-t="grow"></div>
      <h1 style="top:560px" data-at="0.5" data-dur="0.9" data-t="up">${rich([t1, ...tr].join(' '))}</h1>
      ${s.paras[0] ? `<p class="lead" style="top:1010px" data-at="1.6" data-dur="0.9" data-t="up">${rich(s.paras[0])}</p>` : ''}
      ${s.paras[1] ? `<p class="lead blue big" style="top:1180px" data-at="2.8" data-dur="0.9" data-t="up">${rich(s.paras[1])}</p>` : ''}
      <div class="mascot" data-at="1.1" data-dur="0.9" data-t="pop"></div></section>`;
  }).join('\n');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family:'DM Sans'; src:url('${fontUrl}') format('woff2'); font-weight:100 1000; }
*{box-sizing:border-box;margin:0;padding:0} html,body{width:${W}px;height:${H}px;background:transparent;overflow:hidden;font-family:'DM Sans',sans-serif;color:${T.deep}}
.scene{position:absolute;inset:0;width:${W}px;height:${H}px;overflow:hidden;opacity:0}
.scene.mist{background:${T.mist}} .scene.cream{background:${T.cream}} .scene.cover{background:transparent}
.logo{position:absolute;left:96px;top:104px;width:250px} [data-t]{opacity:0}
.kicker{position:absolute;left:96px;font-size:30px;font-weight:500;letter-spacing:.13em;text-transform:uppercase;color:${T.blue}}
h1,h2{position:absolute;left:96px;right:96px;font-weight:300;letter-spacing:-.022em} h1{font-size:92px;line-height:1.06} h2{font-size:84px;line-height:1.08}
em{font-style:normal;font-weight:500;color:${T.blue}}
.lead{position:absolute;left:96px;right:110px;font-size:48px;line-height:1.42;font-weight:300;color:rgba(4,18,40,.76)} .lead.blue{color:${T.blue};font-weight:400} .lead.big{font-size:56px;font-weight:300}
.cover .lead.blue{font-size:54px;font-weight:400}
.bar{position:absolute;left:96px;right:96px;top:56px;display:flex;gap:12px} .bar i{flex:1;height:5px;border-radius:3px;background:rgba(15,92,237,.16)} .bar i.on{background:${T.blue}}
.ghost{position:absolute;right:84px;top:96px;font-size:210px;font-weight:200;color:rgba(15,92,237,.09);line-height:1}
.card{position:absolute;left:96px;top:340px;width:888px;height:660px;border-radius:40px;background:${T.white};border:1.5px solid #E1E9F8;box-shadow:0 18px 50px rgba(4,18,40,.045);display:flex;align-items:center;justify-content:center} .ico{width:230px;height:230px}
.chips{position:absolute;left:96px;right:96px;display:flex;flex-wrap:wrap;gap:14px} .chips span{opacity:0;font-size:34px;font-weight:400;color:${T.blue};border:1.5px solid rgba(15,92,237,.35);border-radius:999px;padding:12px 26px;background:${T.white}}
.mascot{position:absolute;right:30px;bottom:110px;width:450px;height:573px;background-image:url('${pathToFileURL(path.join(ROOT, 'brand/content/mascot/poses.png')).href}');background-repeat:no-repeat;background-size:${Math.round(1122 * 1.364)}px auto;background-position:-${Math.round(750 * 1.364)}px -${Math.round(30 * 1.364)}px;mix-blend-mode:darken;-webkit-mask-image:radial-gradient(ellipse 60% 58% at 50% 50%,#000 72%,transparent 100%);transform-origin:50% 100%}
.rule{position:absolute;left:96px;top:500px;width:96px;height:6px;background:${T.blue};transform-origin:left center;opacity:0}
</style></head><body>${body}
<script>
const SCENES=${JSON.stringify(sc.map((s) => ({ start: s.start, dur: s.dur, kind: s.kind })))}, TOTAL=${total};
const ease=(x)=>1-Math.pow(1-Math.min(1,Math.max(0,x)),3);
window.frame=(t)=>{
  document.querySelectorAll('.scene').forEach((el,idx)=>{
    const sc=SCENES[idx], local=t-sc.start, last=idx===SCENES.length-1, first=idx===0;
    const fin=first?1:ease(local/0.4), fout=last?1:1-ease((local-(sc.dur-0.4))/0.4);
    el.style.opacity=(local<0)?0:Math.max(0,Math.min(fin,fout));
    el.style.display=(local<-0.05||local>sc.dur+0.1)?'none':'block';
    el.querySelectorAll('[data-t]').forEach((n)=>{
      const at=parseFloat(n.dataset.at||0), dur=parseFloat(n.dataset.dur||0.6), p=ease((local-at)/dur), ty=n.dataset.t;
      n.style.opacity=p;
      n.style.transform= ty==='pop' ? 'scale('+(0.88+0.12*p)+')' : ty==='up' ? 'translateY('+((1-p)*36)+'px)' : ty==='grow' ? 'scaleX('+p+')' : 'none';
    });
  });
};
</script></body></html>`;
}

export async function renderMotion({ piece, out, llama, keepFrames, log }) {
  const say = log || (() => {});
  const { chromium } = await import('playwright');
  const { scenes, total } = buildScenes(piece, Boolean(llama));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atacama-motion-'));
  const frames = path.join(dir, 'frames'); fs.mkdirSync(frames);
  const file = path.join(dir, 'scene.html'); fs.writeFileSync(file, html(scenes, total, Boolean(llama)));
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(file).href); await page.evaluate(() => document.fonts.ready);
  const n = Math.ceil(total * FPS);
  for (let i = 0; i < n; i++) {
    await page.evaluate((t) => window.frame(t), i / FPS);
    await page.screenshot({ path: path.join(frames, String(i + 1).padStart(5, '0') + '.png'), omitBackground: true, type: 'png' });
    if (i % 90 === 0) say('cuadro ' + (i + 1) + '/' + n);
  }
  await browser.close();
  const llamaEnd = Math.min(scenes[0].dur + 0.4, total);
  const args = ['-v', 'error', '-y', '-f', 'lavfi', '-i', `color=c=${T.mist}:s=${W}x${H}:r=${FPS}:d=${total.toFixed(3)}`];
  if (llama) args.push('-i', llama);
  args.push('-framerate', String(FPS), '-i', path.join(frames, '%05d.png'));
  const fc = llama
    ? `[1:v]scale=${W}:${H}:flags=lanczos+accurate_rnd+full_chroma_int:in_color_matrix=bt709:in_range=tv:out_range=full,fps=${FPS},tpad=stop_mode=clone:stop_duration=2,format=rgba,colorkey=0xF3F6FD:0.07:0.10[ll];[0:v][ll]overlay=0:0:eof_action=pass:enable='lt(t,${llamaEnd.toFixed(2)})'[a];[a][2:v]overlay=0:0:format=auto,scale=out_color_matrix=bt709:out_range=tv:flags=accurate_rnd+full_chroma_int,format=yuv420p[v]`
    : `[0:v][1:v]overlay=0:0:format=auto,scale=out_color_matrix=bt709:out_range=tv:flags=accurate_rnd+full_chroma_int,format=yuv420p[v]`;
  args.push('-filter_complex', fc, '-map', '[v]', '-t', total.toFixed(3), '-c:v', 'libx264', '-crf', '17', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out);
  const r = spawnSync('ffmpeg', args, { encoding: 'utf8' });
  if (r.status !== 0) throw new Error('ffmpeg falló: ' + (r.stderr || '').slice(0, 400));
  if (!keepFrames) fs.rmSync(dir, { recursive: true, force: true });
  return { out, seconds: Number(total.toFixed(2)), frames: n, dir: keepFrames ? dir : null };
}

if (process.argv[1] && process.argv[1].endsWith('motion-render.mjs')) {
  const a = process.argv.slice(2);
  const flag = (n) => { const i = a.indexOf('--' + n); return i >= 0 ? a[i + 1] : null; };
  if (a.length < 2) { console.error('uso: node scripts/media/motion-render.mjs <pieza.json> <salida.mp4> [--llama clip.mp4] [--keep-frames]'); process.exit(2); }
  const piece = JSON.parse(fs.readFileSync(a[0], 'utf8'));
  renderMotion({ piece: piece.piece || piece, out: path.resolve(a[1]), llama: flag('llama') ? path.resolve(flag('llama')) : null, keepFrames: a.includes('--keep-frames'), log: console.log })
    .then((r) => console.log(JSON.stringify(r))).catch((e) => { console.error('ERROR', e.message); process.exit(1); });
}
