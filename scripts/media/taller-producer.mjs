#!/usr/bin/env node
/**
 * Atacama OS v3 · Fase 3 — productor automático de piezas del Taller (corre en la VPS; también en el PC para pruebas).
 *
 *   node scripts/media/taller-producer.mjs --spec <spec.json> [--piece <uuid>] [--generator sim|higgs] [--sim-dir <carpeta>] [--test] [--sim-cost N]
 *
 * 1) Reclama la pieza (n8n 30 taller_claim; respeta la pausa general y el interruptor taller_production_enabled; TEST solo con --test).
 * 2) Valida la especificación que escribió Hermes (copia y arte por lámina).
 * 3) LÁMINA DE PRUEBA PRIMERO: genera el arte (sim = imágenes que ya existen; higgs = BLOQUEADO salvo TALLER_HIGGS=1 y dentro de los topes),
 *    recorta el fondo si se pide, compone (carousel-composer) y hace el QA (tamaño, logo, cuadrícula y TEXTO EXACTO leído con la visión de Hermes).
 *    Si la de prueba no pasa en 3 intentos → «necesita ayuda» y no se sigue. Luego las demás, con los mismos topes.
 * 4) Hoja de contacto + crítica visual (visión de Hermes) → notas de la versión.
 * 5) Sube los PNG al bucket privado «taller» (n8n 30 taller_file) y registra la versión (taller_version) → la pieza queda «para revisar».
 * Topes duros: 3 intentos por lámina, 30 créditos por pieza, 200 por semana (se cuentan ANTES de gastar). Nunca programa ni publica.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tpValidateSpec, tpOrder, tpCanSpend, tpQaSlide, tpExpectedLines } from '../content/taller-producer-core.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** Ancho y alto de un PNG (cabecera IHDR). */
export function pngSize(file) {
  const b = fs.readFileSync(file);
  if (b.length < 24 || b.toString('ascii', 1, 4) !== 'PNG') return { w: 0, h: 0 };
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

/** Generador SIMULADO: devuelve imágenes que ya existen (anexo §F4), sin gastar créditos. */
export function simGenerator(dir, cost = 0) {
  const files = fs.readdirSync(dir).filter((f) => /\.png$/i.test(f)).sort().map((f) => path.join(dir, f));
  if (!files.length) throw new Error('No hay imágenes en ' + dir);
  let k = 0;
  return { name: 'sim', generate: async () => ({ file: files[(k++) % files.length], cost: Number(cost) || 0 }) };
}

/** Generador real con Higgsfield (GPT Image 2.5) a través del guardián del tope semanal. BLOQUEADO salvo TALLER_HIGGS=1 (autorización de Christian). */
export function higgsGenerator(workDir) {
  return { name: 'higgs', generate: async (art, idx) => {
    if (process.env.TALLER_HIGGS !== '1') throw new Error('BLOQUEADO: Higgsfield no está autorizado para la producción automática (falta TALLER_HIGGS=1 por decisión de Christian).');
    const out = path.join(workDir, 'arte-' + String(idx).padStart(2, '0') + '-' + Date.now() + '.png');
    const prompt = [art.scene, art.texts && art.texts.length ? 'Exact Spanish texts visible inside the scene: ' + art.texts.map((t) => '"' + t + '"').join(', ') : '', 'Plain flat light background for cutout. No logos, no headlines, no robots, no neon.'].filter(Boolean).join('. ');
    const r = spawnSync('/opt/data/scripts/higgs.sh', ['generate', 'create', 'gpt_image_2_5', '--prompt', prompt, '--aspect-ratio', '4:5', '--output', out, '--purpose', 'Taller · lámina ' + idx], { encoding: 'utf8', timeout: 600000 });
    if (r.status !== 0 || !fs.existsSync(out)) throw new Error('Higgsfield no entregó la imagen (' + String(r.stdout || r.stderr || '').slice(0, 200) + ')');
    const m = String(r.stdout || '').match(/(\d+(?:\.\d+)?)\s*cr[eé]ditos?/i);
    return { file: out, cost: m ? Number(m[1]) : 4 };
  } };
}

/** Visión de Hermes (Fase 0: lee texto exacto). Devuelve el texto de la respuesta, sin la línea de sesión ni colores. */
export function hermesVision() {
  const ask = (file, q) => {
    const r = spawnSync('/opt/hermes/.venv/bin/hermes', ['chat', '-Q', '-q', q, '--image', file], { encoding: 'utf8', timeout: 240000, cwd: '/tmp', env: { ...process.env, HOME: '/opt/data' } });
    return String(r.stdout || '').replace(/\x1b\[[0-9;]*m/g, '').split('\n').filter((l) => !/^session_id:|^\s*Then remove|^\s*$/.test(l)).join('\n').trim();
  };
  return {
    read: async (file) => ask(file, 'Prueba de control de calidad. Transcribe EXACTAMENTE todo el texto visible en la imagen, línea por línea, respetando tildes y mayúsculas. Sin comentarios.'),
    critique: async (file) => {
      const t = ask(file, 'Eres director de arte de Atacama Labs (marca sobria, azul #0F5CED, fondos claros, cuadrícula, llamita oficial bípeda). El isotipo oficial es una montaña azul de líneas (aparece en el cierre y en el logo del pie): NO es un logo inventado. Revisa esta hoja de contacto de un carrusel. Responde SOLO un JSON {"score": 1-10, "problems": ["…máximo 3, en español"]}. Penaliza: texto cortado o ilegible en celular, escenas lejanas o amontonadas, llamita deforme, logos inventados, estética de robots/neón.');
      try { const j = JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1)); return { score: Number(j.score) || null, problems: Array.isArray(j.problems) ? j.problems.slice(0, 3).map(String) : [], raw: t.slice(0, 400) }; } catch { return { score: null, problems: [], raw: t.slice(0, 400) }; }
    },
  };
}

/** Recorte de fondo liso (Pillow, sin numpy). Devuelve la ruta recortada o la original si el fondo no era liso. */
export function pythonCutout(py) {
  return async (file) => {
    const out = file.replace(/\.png$/i, '') + '-cut.png';
    const r = spawnSync(py || 'python3', [path.join(ROOT, 'scripts/media/cutout.py'), file, out], { encoding: 'utf8', timeout: 120000 });
    return r.status === 0 && fs.existsSync(out) ? out : file;
  };
}

/**
 * Produce una versión. `deps` = { gateway(body)→json, generator, vision, compose(spec, artFor, outDir, opts), contactSheet(files, out), cutout(file), weekCredits() }.
 * Devuelve { ok, status, message, version_no?, problems? }.
 */
export async function produce({ pieceId, spec, test, workDir }, deps) {
  const claim = await deps.gateway({ action: 'taller_claim', piece_id: pieceId || undefined, test: Boolean(test) });
  if (!claim || !claim.claimed) return { ok: false, status: 'sin_pieza', message: (claim && claim.message) || 'No pude reclamar una pieza.' };
  const piece = claim.piece;
  const caps = claim.caps || { attempts_per_slide: 3, credits_per_piece: 30, credits_per_week: 200 };
  const v = tpValidateSpec(spec, piece);
  if (!v.ok) return { ok: false, status: 'spec_invalida', piece_id: piece.id, message: 'La especificación no sirve: ' + v.errors.join(' · ') + '. Corrígela y vuelve a llamar (la pieza sigue en producción).' };
  const help = async (reason) => { await deps.gateway({ action: 'taller_help', piece_id: piece.id, reason, test: Boolean(test) }); return { ok: false, status: 'necesita_ayuda', piece_id: piece.id, message: reason }; };
  const slides = v.spec.slides;
  const out = path.join(workDir, piece.id, 'v' + claim.next_version);
  fs.mkdirSync(out, { recursive: true });
  let pieceCredits = Number(piece.credits_spent) || 0;
  let weekCredits = Number(await deps.weekCredits()) || 0;
  let spent = 0, totalAttempts = 0;
  const art = {}, results = {};
  const order = tpOrder(slides.length);
  for (const idx of [order.test, ...order.rest].filter(Boolean)) {
    const s = slides[idx - 1];
    let attempts = 0, last = null;
    for (;;) {
      const cost = s.art ? (deps.generator.estimate || 4) : 0;
      const can = tpCanSpend({ slide_attempts: attempts, piece_credits: pieceCredits, week_credits: weekCredits, cost: deps.generator.name === 'sim' ? 0 : cost }, caps);
      if (!can.ok) return help('Lámina ' + idx + (idx === order.test ? ' (de prueba)' : '') + ': ' + can.reason + (last ? ' Último problema: ' + last.problems.join('; ') : ''));
      if (s.art) {
        let g;
        try { g = await deps.generator.generate(s.art, idx); } catch (e) { return help('Lámina ' + idx + ': ' + String(e.message || e).slice(0, 240)); }
        pieceCredits += g.cost; weekCredits += g.cost; spent += g.cost;
        art[idx] = s.art.cutout ? await deps.cutout(g.file) : g.file;
      }
      const comp = (await deps.compose(v.spec, (i) => art[i + 1] || null, out, { only: [idx] }))[0];
      const size = pngSize(comp.file);
      const read = await deps.vision.read(comp.file);
      const qa = tpQaSlide({ ...size, read, expected: tpExpectedLines(s), has_logo: comp.signals.has_logo, has_grid: comp.signals.has_grid, forbidden: comp.signals.forbidden });
      attempts++; totalAttempts++;
      last = qa;
      if (qa.ok) { results[idx] = { file: comp.file, qa, attempts }; break; }
      // Sin arte, la composición es determinista: repetir no cambia nada → se pide ayuda de inmediato.
      if (!s.art) return help('Lámina ' + idx + ': ' + qa.problems.join('; '));
    }
  }
  const files = Object.keys(results).sort((a, b) => a - b).map((k) => results[k].file);
  const sheet = await deps.contactSheet(files, path.join(out, 'qa-hoja.png'));
  const crit = await deps.vision.critique(sheet);
  const vn = claim.next_version;
  const put = async (file, name) => {
    const r = await deps.gateway({ action: 'taller_file', piece_id: piece.id, version_no: vn, name, mime: 'image/png', b64: fs.readFileSync(file).toString('base64') });
    if (!r || !r.ok) throw new Error('No pude guardar ' + name + ': ' + ((r && r.message) || 'sin respuesta'));
    return r.path;
  };
  const assets = [];
  for (let i = 0; i < files.length; i++) { const name = String(i + 1).padStart(2, '0') + '.png'; const p = await put(files[i], name); const sz = pngSize(files[i]); assets.push({ path: p, w: sz.w, h: sz.h }); }
  const qaPath = await put(sheet, 'qa-hoja.png');
  const ver = await deps.gateway({ action: 'taller_version', piece_id: piece.id, test: Boolean(test), version_no: vn, assets, caption: v.spec.caption || null, cost_credits: spent, attempts: totalAttempts, created_by: 'Hermes (VPS · ' + deps.generator.name + ')',
    notes: crit.problems.length ? 'Crítica: ' + crit.problems.join(' · ') : null, qa: { score: crit.score, problems: crit.problems, images: [qaPath], slides: Object.keys(results).map((k) => ({ i: Number(k), attempts: results[k].attempts, soft: results[k].qa.soft })) } });
  if (!ver || !ver.ok) return { ok: false, status: 'version_no_guardada', piece_id: piece.id, message: (ver && ver.message) || 'No pude registrar la versión.' };
  return { ok: true, status: 'para_revisar', piece_id: piece.id, version_no: vn, credits: spent, score: crit.score, message: 'v' + vn + ' de «' + piece.topic + '» lista para revisar en el Taller (' + files.length + ' láminas, ' + spent + ' créditos).' };
}

if (process.argv[1] && process.argv[1].endsWith('taller-producer.mjs')) {
  const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
  const has = (k) => process.argv.includes(k);
  const specPath = arg('--spec');
  if (!specPath) { console.error('uso: taller-producer.mjs --spec <spec.json> [--piece <uuid>] [--generator sim|higgs] [--sim-dir <carpeta>] [--test]'); process.exit(2); }
  const { n8nClient } = await import('./vps-worker.mjs');
  const { composeCarousel, contactSheet } = await import('../content/carousel-composer.mjs');
  const env = process.env;
  const gw = n8nClient(env).gateway;
  const work = env.TALLER_WORK_DIR || path.join(env.ATACAMA_STATE_DIR || '/tmp', 'taller');
  const genName = arg('--generator') || 'sim';
  const generator = genName === 'higgs' ? higgsGenerator(work) : simGenerator(arg('--sim-dir') || path.join(ROOT, 'brand/content/recetas/sim'), arg('--sim-cost'));
  const weekCredits = async () => { try { const { hgWeekKey, hgSpent } = await import('./higgs-guard-core.mjs'); const f = path.join(env.ATACAMA_STATE_DIR || '/opt/data/state', 'higgsfield-ledger.json'); return fs.existsSync(f) ? hgSpent(JSON.parse(fs.readFileSync(f, 'utf8')), hgWeekKey(Date.now())) : 0; } catch { return 0; } };
  produce({ pieceId: arg('--piece'), spec: JSON.parse(fs.readFileSync(specPath, 'utf8')), test: has('--test'), workDir: work },
    { gateway: gw, generator, vision: hermesVision(), compose: composeCarousel, contactSheet, cutout: pythonCutout(env.TALLER_PYTHON || '/opt/hermes/.venv/bin/python'), weekCredits })
    .then((r) => { console.log(JSON.stringify(r)); process.exit(r.ok ? 0 : 1); })
    .catch((e) => { console.log(JSON.stringify({ ok: false, status: 'error', message: String(e.message || e).slice(0, 300) })); process.exit(1); });
}
