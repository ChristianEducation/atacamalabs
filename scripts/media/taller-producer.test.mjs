// node scripts/media/taller-producer.test.mjs — productor del Taller sin red ni créditos: n8n simulado, generador SIMULADO (imágenes que ya
// existen), visión simulada y el compositor real (Playwright). Prueba lámina de prueba primero, QA de texto, topes y «necesita ayuda».
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { produce, simGenerator, pngSize } from './taller-producer.mjs';
import { composeCarousel, contactSheet } from '../content/carousel-composer.mjs';
import { tpExpectedLines } from '../content/taller-producer-core.mjs';

let pass = 0, fail = 0;
const t = (n, c, x = '') => { c ? pass++ : fail++; console.log(c ? 'ok  ' : 'FAIL', n, c ? '' : String(x).slice(0, 400)); };

const work = fs.mkdtempSync(path.join(os.tmpdir(), 'taller-prod-'));
const simDir = path.join(work, 'sim');
fs.mkdirSync(simDir);
// arte simulado: un PNG pequeño de prueba generado con el compositor de la hoja de contacto no sirve; se usa un PNG mínimo válido
const PNG1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
fs.writeFileSync(path.join(simDir, 'a1.png'), PNG1); fs.writeFileSync(path.join(simDir, 'a2.png'), PNG1);

const PID = '44444444-4444-4444-8444-444444444444';
const SPEC = { caption: 'Texto de la publicación con la palabra PROCESO incluida.', slides: [
  { layout: 'portada', pill: 'NUEVO', title: 'Qué automatizar primero', emph: 'en tu clínica.', art: { scene: 'Close-up of a phone with a WhatsApp chat on a plain light background' } },
  { layout: 'arte_texto', title: 'Empieza por lo repetitivo', body: 'Lo que tu equipo responde 40 veces al día.', art: { scene: 'A reception desk with a phone showing repeated questions, plain background' } },
  { layout: 'cierre', title: '¿Qué proceso *te quita más tiempo?*', body: 'Escríbenos.' }] };

function world(o = {}) {
  const calls = [];
  const gateway = async (b) => {
    calls.push(b);
    if (b.action === 'taller_claim') return o.noClaim ? { ok: true, claimed: false, message: 'La producción automática está apagada.' } : { ok: true, claimed: true, piece: { id: PID, topic: 'TEST pieza', format: 'carrusel', lane: 'vps', taller_status: 'en_produccion', credits_spent: o.credits || 0, piece: { keyword: 'PROCESO' } }, next_version: 1, caps: { attempts_per_slide: 3, credits_per_piece: 30, credits_per_week: 200 } };
    if (b.action === 'taller_file') return { ok: true, path: PID + '/v' + b.version_no + '/' + b.name };
    if (b.action === 'taller_version') return { ok: true, version_no: 1 };
    if (b.action === 'taller_help') return { ok: true, status: 'necesita_ayuda' };
    return { ok: false };
  };
  const composed = [];
  const compose = async (spec, artFor, out, opts) => { composed.push(opts.only[0]); return composeCarousel(spec, artFor, out, opts); };
  const vision = { read: async (file) => { const i = Number(path.basename(file).match(/(\d+)/)[1]); if (o.badText && i === 1) return 'Texto equivocado'; const lines = tpExpectedLines(SPEC.slides[i - 1]); return o.accent ? lines.join('\n').replace('Qué', 'Que') : lines.join('\n'); }, critique: async () => ({ score: 8, problems: ['ninguno grave'] }) };
  const gen = o.gen || simGenerator(simDir, 0);
  return { calls, composed, deps: { gateway, generator: gen, vision, compose, contactSheet, cutout: async (f) => f, weekCredits: async () => o.week || 0 } };
}

let w = world();
let r = await produce({ spec: SPEC, test: true, workDir: path.join(work, 'run1') }, w.deps);
const ver = w.calls.find((c) => c.action === 'taller_version');
t('produce: lámina de prueba primero (1, luego 2 y 3), sube 3 láminas + hoja de QA y registra v1 «para revisar» con 0 créditos (simulado)', r.ok === true && r.status === 'para_revisar' && w.composed.join(',') === '1,2,3' && w.calls.filter((c) => c.action === 'taller_file').length === 4 && ver.assets.length === 3 && ver.cost_credits === 0 && ver.qa.score === 8 && ver.qa.images.length === 1 && ver.test === true, JSON.stringify(r));
const f1 = path.join(work, 'run1', PID, 'v1', 'lamina-01.png');
t('produce: cada lámina es 1080×1350 (4:5) y lleva el texto de la publicación', pngSize(f1).w === 1080 && pngSize(f1).h === 1350 && /PROCESO/.test(ver.caption));
t('produce: nunca pide programar ni publicar (solo claim, file, version)', w.calls.every((c) => ['taller_claim', 'taller_file', 'taller_version'].includes(c.action)));

w = world({ badText: true });
r = await produce({ spec: SPEC, test: true, workDir: path.join(work, 'run2') }, w.deps);
t('produce: si la lámina de PRUEBA no pasa el QA en 3 intentos → «necesita ayuda», sin seguir con las demás y sin versión', r.status === 'necesita_ayuda' && /3 intentos/.test(r.message) && w.composed.filter((x) => x === 1).length === 3 && !w.composed.includes(2) && !w.calls.some((c) => c.action === 'taller_version') && w.calls.some((c) => c.action === 'taller_help'), JSON.stringify(r));

w = world({ accent: true });
r = await produce({ spec: SPEC, test: true, workDir: path.join(work, 'run3') }, w.deps);
t('produce: una tilde de diferencia en una línea se admite (y queda anotada)', r.ok === true && w.calls.find((c) => c.action === 'taller_version').qa.slides[0].soft.length === 1);

const paid = { name: 'higgs', estimate: 6, generate: async () => ({ file: path.join(simDir, 'a1.png'), cost: 6 }) };
w = world({ gen: paid, credits: 28 });
r = await produce({ spec: SPEC, test: true, workDir: path.join(work, 'run4') }, w.deps);
t('produce: el tope de 30 créditos por pieza se respeta ANTES de gastar → «necesita ayuda» sin generar', r.status === 'necesita_ayuda' && /tope 30/.test(r.message) && !w.composed.length, JSON.stringify(r));
w = world({ gen: paid, week: 197 });
r = await produce({ spec: SPEC, test: true, workDir: path.join(work, 'run5') }, w.deps);
t('produce: el tope semanal (200) también', r.status === 'necesita_ayuda' && /tope 200/.test(r.message));

w = world();
r = await produce({ spec: { caption: 'corto', slides: [SPEC.slides[0]] }, test: true, workDir: path.join(work, 'run6') }, w.deps);
t('produce: especificación inválida → la devuelve para corregir (la pieza sigue en producción, sin pedir ayuda)', r.status === 'spec_invalida' && !w.calls.some((c) => c.action === 'taller_help'));
w = world({ noClaim: true });
r = await produce({ spec: SPEC, workDir: path.join(work, 'run7') }, w.deps);
t('produce: con la producción apagada no hace nada', r.status === 'sin_pieza' && /apagada/.test(r.message));

const blocked = (await import('./taller-producer.mjs')).higgsGenerator(work);
let err = ''; try { await blocked.generate({ scene: 'x' }, 1); } catch (e) { err = e.message; }
t('Higgsfield BLOQUEADO sin autorización explícita (TALLER_HIGGS=1): no se gasta ni un crédito', /BLOQUEADO/.test(err));

fs.rmSync(work, { recursive: true, force: true });
console.log(`\n${pass} ok, ${fail} fallos`);
process.exit(fail ? 1 : 0);
