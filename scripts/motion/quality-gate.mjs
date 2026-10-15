#!/usr/bin/env node
/**
 * Atacama OS v3 · Fase 5 (spec §6.6-1) — puerta de calidad con los propios frames, ANTES de subir un video al Taller.
 *
 *   node scripts/motion/quality-gate.mjs prepare <video.mp4> [--out dir] [--twin otro.mp4 | --render "comando con {out}"]
 *      → hoja de contacto a 2 fps · prueba de teléfono a 360 px · tira de 12 frames alrededor de la acción más rápida ·
 *        el video repetido ×2 (costura del loop) · determinismo (dos renders del mismo tramo = mismos frames, por framemd5)
 *   node scripts/motion/quality-gate.mjs grade <dir> --scores notas.json
 *      → notas.json = {"scores":{"gancho":9,"lectura":8,…},"worst":[{"t":1.25,"issue":"…"},…3]}; escribe <dir>/qa.json
 *        (pasa con promedio ≥ 8, ningún criterio < 6 y determinismo OK). Ese qa.json es el que acepta taller-add-version.
 * Requiere ffmpeg/ffprobe en el PATH. No sube nada ni gasta créditos.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { qgFastestWindow, qgGrade, qgParseScenes, qgQa } from './qgate-core.mjs';

const run = (cmd, args, opt = {}) => {
  const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...opt });
  if (r.status !== 0 && !opt.allowFail) throw new Error(cmd + ' falló: ' + String(r.stderr || '').slice(-400));
  return r;
};
const arg = (name) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : null; };

export function probe(video) {
  const r = run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,r_frame_rate:format=duration', '-of', 'json', video]);
  const j = JSON.parse(r.stdout);
  const [a, b] = String(j.streams[0].r_frame_rate || '30/1').split('/').map(Number);
  return { w: j.streams[0].width, h: j.streams[0].height, fps: b ? a / b : a, duration: Number(j.format.duration) };
}

export function frameHash(video) {
  const r = run('ffmpeg', ['-v', 'error', '-i', video, '-map', '0:v:0', '-f', 'framemd5', '-']);
  const lines = r.stdout.split(/\r?\n/).filter((l) => l && !l.startsWith('#')).map((l) => l.split(',').pop().trim());
  return { frames: lines.length, hash: crypto.createHash('sha256').update(lines.join('\n')).digest('hex') };
}

export function prepare(video, out, { twin, render } = {}) {
  fs.mkdirSync(out, { recursive: true });
  const p = probe(video);
  const n = Math.max(1, Math.ceil(p.duration * 2)), cols = 6, rows = Math.ceil(n / cols);
  run('ffmpeg', ['-v', 'error', '-y', '-i', video, '-vf', `fps=2,scale=270:-2,tile=${cols}x${rows}:padding=6:margin=6:color=white`, '-frames:v', '1', path.join(out, 'contact-2fps.png')]);
  const ts = [Math.min(1, p.duration / 4), p.duration / 2, Math.max(0, p.duration - 0.2)];
  ts.forEach((t, i) => run('ffmpeg', ['-v', 'error', '-y', '-ss', t.toFixed(3), '-i', video, '-frames:v', '1', '-vf', 'scale=360:-2', path.join(out, '_phone' + i + '.png')]));
  run('ffmpeg', ['-v', 'error', '-y', '-i', path.join(out, '_phone0.png'), '-i', path.join(out, '_phone1.png'), '-i', path.join(out, '_phone2.png'), '-filter_complex', 'hstack=inputs=3', path.join(out, 'phone-360.png')]);
  ts.forEach((t, i) => fs.rmSync(path.join(out, '_phone' + i + '.png'), { force: true }));
  const sc = run('ffmpeg', ['-v', 'error', '-i', video, '-vf', "select='gte(scene,0)',metadata=print:file=-", '-f', 'null', '-'], { allowFail: true });
  const win = qgFastestWindow(qgParseScenes(sc.stdout), p.duration, 1);
  run('ffmpeg', ['-v', 'error', '-y', '-ss', String(win.start), '-t', String(Math.max(0.1, win.end - win.start)), '-i', video, '-vf', `fps=${12 / Math.max(0.1, win.end - win.start)},scale=220:-2,tile=12x1:padding=4:color=white`, '-frames:v', '1', path.join(out, 'strip-12.png')]);
  run('ffmpeg', ['-v', 'error', '-y', '-stream_loop', '1', '-i', video, '-c', 'copy', path.join(out, 'loop-x2.mp4')]);
  let determinism = { ok: false, method: 'sin_probar', note: 'pasa --twin <segundo render> o --render "comando {out}"' };
  let twinPath = twin;
  if (!twinPath && render) { twinPath = path.join(out, 'twin.mp4'); run(process.platform === 'win32' ? 'cmd' : 'sh', process.platform === 'win32' ? ['/c', render.replace('{out}', twinPath)] : ['-c', render.replace('{out}', twinPath)]); }
  if (twinPath) {
    const a = frameHash(video), b = frameHash(twinPath);
    determinism = { ok: a.hash === b.hash && a.frames === b.frames, method: 'framemd5', frames: a.frames, a: a.hash.slice(0, 16), b: b.hash.slice(0, 16) };
  }
  const checks = { video: path.basename(video), w: p.w, h: p.h, fps: Math.round(p.fps * 100) / 100, duration: Math.round(p.duration * 100) / 100, fastest: win, determinism,
    images: ['contact-2fps.png', 'phone-360.png', 'strip-12.png', 'loop-x2.mp4'] };
  fs.writeFileSync(path.join(out, 'checks.json'), JSON.stringify(checks, null, 1));
  return checks;
}

export function grade(dir, notes) {
  const checks = JSON.parse(fs.readFileSync(path.join(dir, 'checks.json'), 'utf8'));
  const g = qgGrade(notes.scores, { determinism: checks.determinism, worst: notes.worst });
  if (!g.ok) return { ok: false, errors: g.errors };
  const qa = qgQa(g, checks);
  fs.writeFileSync(path.join(dir, 'qa.json'), JSON.stringify(qa, null, 1));
  return { ok: true, qa };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  const [cmd, target] = process.argv.slice(2);
  try {
    if (cmd === 'prepare' && target) {
      const out = arg('--out') || path.join(path.dirname(target), 'qa-' + path.basename(target, path.extname(target)));
      const c = prepare(target, out, { twin: arg('--twin'), render: arg('--render') });
      console.log(JSON.stringify({ ok: true, out, determinism: c.determinism, fastest: c.fastest, next: 'mira contact-2fps.png, phone-360.png, strip-12.png y loop-x2.mp4; luego: grade ' + out + ' --scores notas.json' }));
    } else if (cmd === 'grade' && target && arg('--scores')) {
      const r = grade(target, JSON.parse(fs.readFileSync(arg('--scores'), 'utf8')));
      console.log(JSON.stringify(r.ok ? { ok: true, pass: r.qa.pass, score: r.qa.score, why: r.qa.why, qa: path.join(target, 'qa.json') } : r));
      if (!r.ok || !r.qa.pass) process.exitCode = 2;
    } else {
      console.log('uso: quality-gate.mjs prepare <video.mp4> [--out dir] [--twin b.mp4 | --render "cmd {out}"]  ·  grade <dir> --scores notas.json');
      process.exitCode = 1;
    }
  } catch (e) { console.log(JSON.stringify({ ok: false, error: String(e.message || e).slice(0, 400) })); process.exitCode = 1; }
}
