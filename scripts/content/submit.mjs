#!/usr/bin/env node
/**
 * Atacama OS · Content Engine — envía una pieza al workflow n8n «12 Content Intake».
 *
 * Pasos: (1) si la pieza es visual y no trae `media`, la renderiza (render.mjs) y sube cada slide a la
 * biblioteca de medios de GHL; (2) hace POST al webhook de n8n con la clave de ingesta. El workflow valida,
 * puntúa y, si es candidata, la deja en GHL Social Planner como **in_review**. Nunca programa ni publica.
 *
 * Uso: node scripts/content/submit.mjs <pieza.json> [--test] [--no-review]
 *   --test       marca la pieza como PRUEBA (prefijo «[PRUEBA ATACAMA OS — NO PUBLICAR]» y is_test=true)
 *   --no-review  solo valida/puntúa/guarda en Supabase; no crea el post en GHL
 *   --origin X   explicit (default: orden de Christian) | autonomous (respeta el tope de la cola) | founder_interview (con --interview <id>)
 * Variables (.env.local): N8N_BASE_URL, ATACAMA_INGEST_KEY, GHL_PRIVATE_INTEGRATION_TOKEN2, GHL_LOCATION_ID.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { renderPiece } from './render.mjs';
import { mgRenderHash, mgFnv } from '../media/media-gateway-core.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const env = Object.fromEntries(fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').split(/\r?\n/).filter((l) => l.includes('=') && !l.startsWith('#'))
  .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).replace(/^["']|["']$/g, '')]));
const args = process.argv.slice(2);
const file = args.find((a, i) => !a.startsWith('--') && !['--origin', '--interview'].includes(args[i - 1]));
if (!file) { console.error('Uso: node scripts/content/submit.mjs <pieza.json> [--test] [--no-review]'); process.exit(1); }
const isTest = args.includes('--test');
const noReview = args.includes('--no-review');
const flagVal = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const origin = flagVal('--origin') || 'explicit';          // explicit (orden de Christian) | autonomous (cron: respeta el tope de la cola) | founder_interview
const interviewId = flagVal('--interview');
const piece = JSON.parse(fs.readFileSync(file, 'utf8'));

async function uploadToGhl(png) {
  const fd = new FormData();
  fd.append('file', new Blob([fs.readFileSync(png)], { type: 'image/png' }), `atacama-${isTest ? 'prueba-' : ''}${path.basename(png)}`);
  fd.append('hosted', 'false');
  const r = await fetch('https://services.leadconnectorhq.com/medias/upload-file', { method: 'POST', headers: { Authorization: 'Bearer ' + env.GHL_PRIVATE_INTEGRATION_TOKEN2, Version: '2021-07-28', Accept: 'application/json' }, body: fd });
  const j = await r.json();
  if (!r.ok || !j.url) throw new Error('Subida a GHL falló: ' + r.status + ' ' + JSON.stringify(j).slice(0, 200));
  return { url: j.url, type: 'image/png', fileId: j.fileId };
}

// Media Gateway (Ola B): un render idéntico (mismas slides) se REUTILIZA en vez de volver a renderizar y subir; todo render queda registrado en media_assets.
const sbHeaders = env.SUPABASE_SERVICE_ROLE_KEY ? { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY, 'Content-Type': 'application/json' } : null;
const sbUrl = env.SUPABASE_URL ? env.SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/' : null;
const renderHash = mgRenderHash(piece);
let renderedNow = false;
if (['imagen', 'carrusel'].includes(piece.format) && !(piece.media || []).length && (piece.slides || []).length) {
  try {
    if (sbHeaders && sbUrl) {
      const q = await fetch(sbUrl + 'media_assets?status=eq.ready&provider=eq.renderer&content_hash=eq.' + renderHash + '&select=urls&order=created_at.desc&limit=1', { headers: sbHeaders });
      const rows = await q.json().catch(() => []);
      if (Array.isArray(rows) && rows[0] && Array.isArray(rows[0].urls) && rows[0].urls.length === piece.slides.length) { piece.media = rows[0].urls; console.log('Reutilizando render existente (mismo contenido):', piece.media.length, 'medios'); }
    }
  } catch { /* si el registro no responde, se renderiza normalmente */ }
}
if (['imagen', 'carrusel'].includes(piece.format) && !(piece.media || []).length && (piece.slides || []).length) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atacama-render-'));
  const files = await renderPiece(piece, dir);
  piece.media = [];
  for (const f of files) piece.media.push(await uploadToGhl(f));
  renderedNow = true;
  console.log('Render + subida a GHL:', piece.media.length, 'medios');
}

const url = env.N8N_BASE_URL.replace(/\/$/, '') + '/webhook/atacama-content-intake';
const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Atacama-Key': env.ATACAMA_INGEST_KEY }, body: JSON.stringify({ piece, test: isTest, submit_to_review: !noReview, origin, ...(interviewId ? { interview_id: interviewId } : {}) }) });
const out = await res.json().catch(() => ({}));
// Registro del render en el Media Gateway (no bloquea nada si falla).
if (renderedNow && sbHeaders && sbUrl && out && out.piece_id) {
  try {
    const need = piece.visual && piece.visual.need && piece.visual.need !== 'none' ? piece.visual.need : (piece.format === 'carrusel' ? 'carousel' : 'typographic');
    await fetch(sbUrl + 'media_assets?on_conflict=request_key', { method: 'POST', headers: { ...sbHeaders, Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ request_key: mgFnv('submit|' + out.piece_id + '|' + renderHash), piece_id: out.piece_id, need, operation: 'render', provider: 'renderer', status: 'ready', brief: String(piece.hook || piece.topic || '').slice(0, 200), urls: piece.media, content_hash: renderHash, is_test: isTest, created_by: 'submit.mjs', meta: { via: 'submit.mjs' } }) });
  } catch { /* registro opcional */ }
}
console.log(JSON.stringify({ http: res.status, ...out, media_file_ids: (piece.media || []).map((m) => m.fileId).filter(Boolean) }, null, 2));
