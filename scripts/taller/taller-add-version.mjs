#!/usr/bin/env node
/**
 * Atacama OS v3 · Fase 5 (spec §6.6) — sube una versión hecha en el PC (carril `pc`) al Taller → queda «para revisar».
 *
 *   node scripts/taller/taller-add-version.mjs --piece <uuid> --file video.mp4 [--file …] [--qa qa.json] [--caption "…"]
 *        [--credits 0] [--notes "…"] [--test]
 *
 * Usa el workflow 30 (taller_file + taller_version) con la llave de ingesta de .env.local (nunca se imprime; la llave privada de
 * n8n 29 no se usa). Un video del carril pc exige el qa.json de `quality-gate.mjs grade` con pass=true (nota ≥ 8). No programa
 * ni publica nada: Christian revisa y programa desde /ops.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadEnv } from '../media/env.mjs';
import { gatewayClient } from '../media/media-gateway.mjs';

const MIME = { '.mp4': 'video/mp4', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' };

export function tavParse(argv) {
  const o = { files: [], test: false };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i], v = argv[i + 1];
    if (k === '--piece') { o.piece = v; i++; } else if (k === '--file') { o.files.push(v); i++; } else if (k === '--qa') { o.qa = v; i++; }
    else if (k === '--caption') { o.caption = v; i++; } else if (k === '--credits') { o.credits = Number(v); i++; } else if (k === '--notes') { o.notes = v; i++; }
    else if (k === '--version') { o.version = Number(v); i++; } else if (k === '--test') o.test = true;
  }
  const errors = [];
  if (!/^[0-9a-f-]{36}$/i.test(String(o.piece || ''))) errors.push('--piece <uuid> obligatorio');
  if (!o.files.length || o.files.length > 10) errors.push('de 1 a 10 --file');
  o.files.forEach((f) => { if (!MIME[path.extname(f).toLowerCase()]) errors.push('formato no admitido: ' + path.basename(f)); });
  return { o, errors };
}

/** Exige la puerta de calidad para video: qa.pass === true y nota ≥ 8. */
export function tavQaCheck(files, qa) {
  const video = files.some((f) => /\.mp4$/i.test(f));
  if (!video) return { ok: true, qa: qa || null };
  if (!qa || qa.gate !== 'motion-v2') return { ok: false, message: 'Un video necesita su puerta de calidad: corre quality-gate.mjs prepare/grade y pasa --qa qa.json.' };
  if (qa.pass !== true || !(Number(qa.score) >= 8)) return { ok: false, message: 'La puerta de calidad no pasó (nota ' + qa.score + (qa.why && qa.why.length ? ': ' + qa.why.join('; ') : '') + '). Corrige y vuelve a calificar.' };
  return { ok: true, qa };
}

export async function addVersion(o, gateway) {
  const qa = o.qa ? JSON.parse(fs.readFileSync(o.qa, 'utf8')) : null;
  const chk = tavQaCheck(o.files, qa);
  if (!chk.ok) return { ok: false, error: 'puerta_de_calidad', message: chk.message };
  const vn = Number(o.version) || null;
  const no = vn || 1;
  const assets = [];
  for (const f of o.files) {
    const name = path.basename(f).replace(/[^A-Za-z0-9._-]/g, '-').slice(-80);
    const size = fs.statSync(f).size;
    if (size > 10 * 1024 * 1024) return { ok: false, error: 'archivo_grande', message: name + ' pesa más de 10 MB: exporta con más compresión.' };
    const r = await gateway({ action: 'taller_file', piece_id: o.piece, version_no: no, name, mime: MIME[path.extname(f).toLowerCase()], b64: fs.readFileSync(f).toString('base64') });
    if (!r.ok || !r.path) return { ok: false, error: 'subida', message: 'No pude subir ' + name + ': ' + (r.message || r.error || 'HTTP ' + r.http) };
    assets.push({ path: r.path, label: name });
  }
  const v = await gateway({ action: 'taller_version', piece_id: o.piece, test: o.test, version_no: vn || undefined, assets, caption: o.caption || null, qa: chk.qa || undefined, cost_credits: Number(o.credits) || 0, created_by: 'Claude (PC)', notes: o.notes || null });
  return v.ok ? { ok: true, status: v.status, version_no: v.version_no, assets: assets.map((a) => a.path), message: v.message } : { ok: false, error: v.error || 'version', message: v.message || 'El Taller no aceptó la versión.', uploaded: assets.map((a) => a.path) };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  const { o, errors } = tavParse(process.argv.slice(2));
  if (errors.length) { console.log(JSON.stringify({ ok: false, errors })); process.exit(1); }
  const env = loadEnv();
  const sb = (q) => fetch(env.SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/' + q, { headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY } }).then((r) => r.json());
  sb('content_pieces?id=eq.' + o.piece + '&select=current_version,lane,taller_status,is_test').then((rows) => {
    const p = Array.isArray(rows) ? rows[0] : null;
    if (!p) throw new Error('No encontré esa pieza.');
    if (!!p.is_test !== o.test) throw new Error(p.is_test ? 'La pieza es de prueba: agrega --test.' : 'La pieza es real: quita --test.');
    if (!o.version) o.version = (Number(p.current_version) || 0) + 1;
    return addVersion(o, gatewayClient(env));
  }).then((r) => { console.log(JSON.stringify(r)); if (!r.ok) process.exitCode = 2; })
    .catch((e) => { console.log(JSON.stringify({ ok: false, error: String(e.message || e).slice(0, 300) })); process.exitCode = 1; });
}
