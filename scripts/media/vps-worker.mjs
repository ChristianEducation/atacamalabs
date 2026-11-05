#!/usr/bin/env node
/**
 * Atacama OS · Media Worker de la VPS (Frente A del spec «máquina de contenido y motion»).
 *
 * Corre DENTRO del contenedor de Hermes como tarea programada SIN modelo (ops/hermes/scripts/media_worker.sh, cada ~5 min). Hace lo mismo que
 * `media-gateway.mjs run` en el PC, pero con la única llave que ya existe en la VPS (la de ingesta de n8n): NO guarda token de GHL ni llave de Supabase.
 *   1. claim  → el workflow 30 entrega el siguiente asset del renderer en cola + su pieza y lo marca «generating» (candado). Sin nada en cola: termina
 *               en silencio SIN abrir Chromium (compuerta barata).
 *   2. render → el MISMO renderer de carruseles (scripts/content/render.mjs), sin duplicarlo.
 *   3. upload → cada PNG se manda en base64 al workflow 30, que lo sube a la biblioteca de medios de GHL.
 *   4. complete (ready + hash de render) y reenvío de la pieza al Content Intake con sus medios: termina `in_review`. NUNCA publica, programa ni aprueba.
 * Error visible: si algo falla, el asset se cierra «failed» con el motivo (se ve en /ops y en las alertas). Un huérfano se reintenta hasta 3 veces.
 *
 *   node scripts/media/vps-worker.mjs [--max 6] [--dry] [--test]   (--dry: solo informa qué hay en cola, sin reclamar · --test: procesa solo los assets de PRUEBA)
 * Variables (las carga el .sh desde /opt/data/.env, nunca se imprimen): ATACAMA_INGEST_KEY, ATACAMA_INGEST_URL (solo se usa su origen).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { mgRenderHash, mgFnv } from './media-gateway-core.mjs';

const clean = (s) => String(s == null ? '' : s).replace(/(bearer|token|key|secret|password)[=: ]+[A-Za-z0-9._-]{8,}/gi, '$1=***').slice(0, 280);

/** Cliente de los webhooks de n8n con la llave de ingesta. */
export function n8nClient(env, fetchImpl) {
  const f = fetchImpl || fetch;
  const origin = new URL(env.ATACAMA_INGEST_URL).origin;
  const post = async (pathName, body, timeoutMs) => {
    const r = await f(origin + pathName, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Atacama-Key': env.ATACAMA_INGEST_KEY }, body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs || 90000) });
    const j = await r.json().catch(() => ({}));
    return { http: r.status, ...j };
  };
  return { gateway: (body) => post('/webhook/atacama-media-gateway', body), intake: (body) => post('/webhook/atacama-content-intake', body, 120000) };
}

/** Sube un PNG (o un MP4 con mime='video/mp4') con hasta 3 intentos (la red de la VPS o GHL pueden fallar un instante). */
export async function uploadWithRetry(gateway, assetId, file, index, label, sleep, mime) {
  const b64 = fs.readFileSync(file).toString('base64');
  let last = null;
  for (let i = 0; i < 3; i++) {
    last = await gateway({ action: 'upload', id: assetId, png_base64: b64, index, label, ...(mime ? { mime } : {}) }).catch((e) => ({ ok: false, message: String((e && e.message) || e) }));
    if (last && last.ok && last.url) return { url: last.url, type: last.type || mime || 'image/png', fileId: last.fileId || undefined };
    if (last && ['estado_no_valido', 'imagen_invalida', 'asset_no_encontrado'].includes(last.error)) break;
    await (sleep || ((ms) => new Promise((r) => setTimeout(r, ms))))(1500 * (i + 1));
  }
  throw new Error((mime === 'video/mp4' ? 'Subida del video falló: ' : 'Subida de la slide ' + (index + 1) + ' falló: ') + clean((last && (last.message || last.error)) || 'sin respuesta'));
}

/**
 * Procesa UN asset reclamado. deps = { gateway, intake, render(piece, dir) → [png], studioFile(slug) → ruta del MP4 | null, log, sleep }.
 * provider «renderer»: dibuja slides (carrusel/imagen) o la historia (piece.story); provider «studio»: sube el MP4 que ya produjo el taller de motion.
 * Devuelve { id, status, detail }. Cualquier error cierra el asset como failed (nunca se traga).
 */
export async function processClaimed(claim, deps) {
  const log = deps.log || (() => {});
  const asset = claim.asset;
  const row = claim.row;
  const title = clean((row && row.piece && (row.piece.hook || row.piece.topic || row.piece.title)) || asset.id).slice(0, 90);
  const fail = async (msg) => { await deps.gateway({ action: 'complete', id: asset.id, status: 'failed', error: clean(msg) }).catch(() => {}); log('FALLÓ', asset.id, clean(msg)); return { id: asset.id, title, status: 'failed', error: clean(msg) }; };
  try {
    const studio = asset.provider === 'studio';
    const isStory = Boolean(row && row.piece && row.piece.format === 'historia');
    if (!row || !row.piece) return await fail('No encontré la pieza de este asset.');
    if (!studio && !(isStory ? row.piece.story : (row.piece.slides || []).length)) return await fail(isStory ? 'La historia no tiene story para dibujar.' : 'La pieza no tiene slides para renderizar.');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atacama-vps-media-'));
    let urls = [];
    let hash = mgRenderHash(row.piece);
    try {
      let files;
      if (studio) {
        const slug = String(asset.composition || '');
        if (!/^[a-z0-9][a-z0-9-]{2,60}$/.test(slug)) return await fail('El asset del taller no trae un nombre de proyecto válido (composition).');
        const mp4 = deps.studioFile ? deps.studioFile(slug) : null;
        if (!mp4 || !fs.existsSync(mp4)) return await fail('No encuentro el video del taller: proyectos/' + slug + '/renders/' + slug + '-normalizado.mp4 (renderízalo con motion_render.sh antes de pedirlo).');
        const size = fs.statSync(mp4).size;
        if (size > 10 * 1024 * 1024) return await fail('El video del taller pesa ' + Math.round(size / 1048576) + ' MB (máximo 10 MB): usa la copia ligera.');
        files = [mp4]; hash = mgFnv('studio|' + slug + '|' + size);
      } else {
        files = await deps.render(row.piece, dir);
        if (!files.length) return await fail('El renderer no produjo imágenes.');
      }
      for (let i = 0; i < files.length; i++) urls.push(await uploadWithRetry(deps.gateway, asset.id, files[i], i, row.is_test ? 'prueba' : '', deps.sleep, studio ? 'video/mp4' : undefined));
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
    // Primero la pieza a revisión (si el Intake la rechaza, el asset queda FAILED y visible); después se cierra el asset como listo.
    let submitted = 'no reenviada';
    if (deps.intake && ['drafted', 'scored'].includes(row.status)) {
      const r = await deps.intake({ piece: { ...row.piece, media: urls }, test: row.is_test === true, submit_to_review: true, origin: row.origin || 'explicit', ...(row.interview_id ? { interview_id: row.interview_id } : {}) });
      submitted = 'Content Intake HTTP ' + r.http + (r.action ? ' · ' + r.action : '') + (r.error ? ' · ' + clean(r.error) : '');
      log('reenviada', asset.id, submitted);
      if (!(r.http >= 200 && r.http < 300 && r.ok !== false && r.action === 'in_review')) return await fail('La pieza no llegó a revisión (' + submitted + (r.reason ? ' · ' + clean(r.reason) : '') + ')');
    }
    const done = await deps.gateway({ action: 'complete', id: asset.id, status: 'ready', urls, content_hash: hash });
    if (!done.ok) return await fail('El gateway no aceptó el cierre: ' + (done.message || done.error || done.http));
    log('listo', asset.id, urls.length + ' medios');
    return { id: asset.id, title, status: 'ready', urls: urls.length, submitted };
  } catch (e) { return await fail((e && e.message) || e); }
}

/** Bucle del worker: reclama y procesa hasta `max` assets; si no hay nada, sale sin tocar nada más. */
export async function runWorker(deps, max) {
  const results = [];
  for (let i = 0; i < (max || 3); i++) {
    const c = await deps.gateway({ action: 'claim', ...(deps.test ? { test: true } : {}) });
    if (!c.ok) { results.push({ status: 'error', error: clean(c.message || c.error || 'claim HTTP ' + c.http) }); break; }
    if (!c.claimed) { if (c.gave_up) results.push({ id: c.gave_up, status: 'failed', error: clean(c.message) }); break; }
    results.push(await processClaimed(c, deps));
  }
  return results;
}

/** Candado de corrida única (un worker a la vez; se considera huérfano a los 30 min). */
export function acquireLock(file, nowMs, pid) {
  try {
    const cur = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (nowMs - cur.at < 30 * 60000) return false;
  } catch { /* sin candado previo o ilegible */ }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ at: nowMs, pid }));
  return true;
}

async function main() {
  const args = process.argv.slice(2);
  const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
  const env = process.env;
  if (!env.ATACAMA_INGEST_KEY || !env.ATACAMA_INGEST_URL) { console.error('ERROR faltan ATACAMA_INGEST_KEY / ATACAMA_INGEST_URL (los carga media_worker.sh desde /opt/data/.env)'); process.exit(1); }
  const { gateway, intake } = n8nClient(env);
  if (args.includes('--dry')) {
    const r = await gateway({ action: 'list', status: 'queued,generating,failed', limit: 50 });
    console.log(JSON.stringify({ ok: r.ok, count: r.count, assets: (r.assets || []).map((a) => ({ id: a.id, status: a.status, provider: a.provider, error: a.error })) }, null, 2));
    return;
  }
  const lock = path.join(env.ATACAMA_STATE_DIR || '/opt/data/state', 'media-worker.lock');
  if (!acquireLock(lock, Date.now(), process.pid)) { console.error('Otro worker sigue corriendo (candado vigente): no hago nada.'); return; }
  try {
    const peek = await gateway({ action: 'list', status: 'queued,generating', limit: 5, ...(args.includes('--test') ? { test: true } : {}) });
    if (peek.ok && !(peek.assets || []).some((a) => ['renderer', 'studio'].includes(a.provider))) return; // compuerta: nada que hacer → silencio, sin abrir Chromium
    const { renderPiece } = await import('../content/render.mjs');
    const { renderStories } = await import('../content/story-templates.mjs');
    // Método visual obligatorio (reglas de historias v1.1 §0.3): lo que trae `art` se ilustra con GPT Image 2.5 vía el guardián de créditos y se
    // compone con la marca; las láminas sin ilustración siguen con el diseño de marca. Si Higgsfield falla, la pieza queda FALLIDA (no se degrada).
    const { renderHybrid, hybridJobs, higgsGenerate } = await import('../content/visual-hybrid.mjs');
    const llamaDir = path.join(env.ATACAMA_MEDIA_DIR || '/opt/data/atacama-media', 'brand', 'llamas');
    const llamaRefs = fs.existsSync(llamaDir) ? fs.readdirSync(llamaDir).filter((x) => /\.(png|jpe?g)$/i.test(x)).map((x) => path.join(llamaDir, x)) : [];
    const hdeps = (piece) => ({ llamaRefs, generate: higgsGenerate({ bin: env.ATACAMA_HIGGS || '/opt/data/scripts/higgs.sh', purpose: 'pieza IG: ' + String(piece.hook || piece.topic || '').slice(0, 60) }) });
    const render = async (piece, dir) => {
      const jobs = hybridJobs(piece);
      if (piece.format === 'historia') return jobs.length ? (await renderHybrid(piece, dir, hdeps(piece))).map((x) => x.file) : renderStories(piece, dir);
      const files = await renderPiece(piece, dir);
      if (!jobs.length) return files;
      (await renderHybrid(piece, path.join(dir, 'hibrido'), hdeps(piece))).forEach((h) => { files[h.index] = h.file; });
      return files;
    };
    const studioFile = (slug) => path.join(env.ATACAMA_STUDIO_DIR || '/opt/data/motion-studio', 'projects', slug, 'renders', slug + '-normalizado.mp4');
    const results = await runWorker({ gateway, intake, render, studioFile, test: args.includes('--test'), log: (...a) => console.error(new Date().toISOString(), ...a) }, parseInt(flag('--max'), 10) || 6);
    const failed = results.filter((r) => r.status === 'failed' || r.status === 'error');
    // Un solo mensaje por corrida: lo que quedó en revisión (títulos) y, aparte, cada fallo con su motivo.
    const okR = results.filter((r) => r.status === 'ready');
    const out = [];
    if (okR.length) out.push('✅ Media Worker: dejó ' + okR.length + (okR.length === 1 ? ' pieza lista' : ' piezas listas') + ' en revisión: ' + okR.map((r) => '«' + r.title.slice(0, 60) + '»').join(', ') + '.');
    failed.forEach((r) => out.push('⚠️ Media Worker: no pude dejar lista «' + (r.title || r.id) + '»: ' + r.error + ' (queda marcado como fallido en /ops).'));
    if (out.length) console.log(out.join('\n'));
    if (failed.length) console.error(JSON.stringify(failed));
  } finally { fs.rmSync(lock, { force: true }); }
}
if (process.argv[1] && process.argv[1].endsWith('vps-worker.mjs')) main().catch((e) => { console.error('ERROR', clean(e && e.message)); process.exit(1); });
