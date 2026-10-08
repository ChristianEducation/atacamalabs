#!/usr/bin/env node
/**
 * Atacama OS · Ola A — carruseles/imágenes esperando render.
 *
 * Hermes redacta la pieza pero no puede renderizar el carrusel (Playwright vive en este equipo). El Content Intake la deja retenida
 * (`falta_render_o_medio`, estado drafted). Este script las lista y, con --run, las renderiza, sube las slides a GHL y las reenvía al
 * Content Intake con su origen original (una pieza autónoma sigue respetando el tope de la cola). Termina en `in_review`: nunca publica.
 *
 *   node scripts/content/render-pending.mjs                 → lista las pendientes
 *   node scripts/content/render-pending.mjs --run [--id <uuid>]   → renderiza y envía (todas o una)
 * Variables (.env.local): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, N8N_BASE_URL, ATACAMA_INGEST_KEY, GHL_PRIVATE_INTEGRATION_TOKEN2, GHL_LOCATION_ID.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const env = Object.fromEntries(fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').split(/\r?\n/).filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, '')]; }));
const args = process.argv.slice(2);
const RUN = args.includes('--run');
const ONE = args.includes('--id') ? args[args.indexOf('--id') + 1] : null;
const H = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY };

/** Pieza visual retenida por falta de render (nunca las de prueba). */
export const isWaitingRender = (r) => r && ['drafted', 'scored'].includes(r.status) && Number(r.score == null ? 100 : r.score) >= 70 && r.is_test === false && r.piece && ['imagen', 'carrusel'].includes(r.piece.format) && !(r.piece.media || []).length && (r.piece.slides || []).length > 0;

async function main() {
  const q = `content_pieces?status=in.(drafted,scored)&is_test=eq.false&select=id,topic,channel,format,origin,interview_id,piece,score,created_at&order=created_at.asc&limit=50`;
  const rows = ((await (await fetch(env.SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/' + q, { headers: H })).json()) || []).map((r) => ({ ...r, is_test: false, status: 'drafted' })).filter((r) => (ONE ? r.id === ONE : true) && isWaitingRender(r));
  if (!rows.length) { console.log('No hay carruseles ni imágenes esperando render.'); return; }
  console.log(rows.length + ' esperando render:'); rows.forEach((r) => console.log(' -', r.id, r.channel, r.format, '·', String(r.topic).slice(0, 70)));
  if (!RUN) { console.log('\nPara renderizar y enviar a revisión: node scripts/content/render-pending.mjs --run [--id <uuid>]'); return; }
  for (const r of rows) {
    const tmp = path.join(os.tmpdir(), 'atacama-pending-' + r.id + '.json');
    fs.writeFileSync(tmp, JSON.stringify(r.piece));
    const a = [path.join(ROOT, 'scripts/content/submit.mjs'), tmp, '--origin', r.origin || 'explicit'].concat(r.interview_id ? ['--interview', r.interview_id] : []);
    console.log('\n→ ' + r.id);
    const out = spawnSync(process.execPath, a, { encoding: 'utf8' });
    console.log((out.stdout || '') + (out.stderr || ''));
    fs.rmSync(tmp, { force: true });
  }
}
if (process.argv[1] && process.argv[1].endsWith('render-pending.mjs')) main().catch((e) => { console.error('ERROR', e.message); process.exit(1); });
