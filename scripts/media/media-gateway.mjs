#!/usr/bin/env node
/**
 * Atacama OS · Media Gateway — worker local (Ola B · bloque B).
 *
 * Hermes pide un visual (herramienta request_visual → workflow n8n «30 Media Gateway»). El pedido queda registrado (media_assets) y enrutado a un
 * proveedor. Los proveedores que corren en ESTE equipo (el renderer de carruseles con Playwright y, si algún día se autoriza, uno generativo) los
 * ejecuta este worker. Al terminar cierra el asset (ready / failed con error visible) y, si la pieza estaba esperando su medio, la reenvía al
 * Content Intake para que termine `in_review`. Nunca publica, programa ni aprueba.
 *
 *   node scripts/media/media-gateway.mjs list [--status queued,failed]    → assets registrados
 *   node scripts/media/media-gateway.mjs run [--id <uuid>] [--no-submit] [--test]    → produce los assets en cola (renderer) y reenvía la pieza a revisión
 *   node scripts/media/media-gateway.mjs register <asset-id> <https-url|archivo.png> [...]  → asocia un asset propio (proveedor manual)
 * Variables (.env.local): N8N_BASE_URL, ATACAMA_INGEST_KEY, GHL_PRIVATE_INTEGRATION_TOKEN2, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { loadEnv, ROOT } from './env.mjs';
import { mgRenderHash } from './media-gateway-core.mjs';

/** Llama al workflow 30. */
export function gatewayClient(env, fetchImpl) {
  const f = fetchImpl || fetch;
  return async (body) => {
    const r = await f(env.N8N_BASE_URL.replace(/\/$/, '') + '/webhook/atacama-media-gateway', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Atacama-Key': env.ATACAMA_INGEST_KEY }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    return { http: r.status, ...j };
  };
}

/** Lee la pieza de Supabase (service role, solo lectura). */
export function pieceReader(env, fetchImpl) {
  const f = fetchImpl || fetch;
  return async (id) => {
    const q = 'content_pieces?id=eq.' + id + '&select=id,status,origin,interview_id,is_test,piece';
    const r = await f(env.SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/' + q, { headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY } });
    const j = await r.json().catch(() => []);
    return Array.isArray(j) ? j[0] || null : null;
  };
}

/** Reenvía la pieza (con sus medios) al Content Intake con su origen original: termina in_review. */
export function submitPiece(row, media) {
  const tmp = path.join(os.tmpdir(), 'atacama-media-piece-' + row.id + '.json');
  fs.writeFileSync(tmp, JSON.stringify({ ...row.piece, media }));
  const args = [path.join(ROOT, 'scripts/content/submit.mjs'), tmp, '--origin', row.origin || 'explicit'].concat(row.interview_id ? ['--interview', row.interview_id] : [], row.is_test ? ['--test'] : []);
  const out = spawnSync(process.execPath, args, { encoding: 'utf8' });
  fs.rmSync(tmp, { force: true });
  return (out.stdout || '') + (out.stderr || '');
}

/**
 * Produce UN asset en cola. deps = { gateway, readPiece, providers: { renderer, higgsfield, manual }, submit, env, log }.
 * Devuelve { id, status, detail }. Cualquier error queda registrado en el asset (visible), nunca se traga.
 */
export async function runAsset(asset, deps) {
  const log = deps.log || (() => {});
  const close = async (status, extra) => deps.gateway({ action: 'complete', id: asset.id, status, ...extra });
  try {
    if (asset.provider === 'renderer') {
      const row = asset.piece_id ? await deps.readPiece(asset.piece_id) : null;
      if (!row || !row.piece || !(row.piece.slides || []).length) throw new Error('La pieza no tiene slides para renderizar.');
      const out = await deps.providers.renderer.produce(deps.env, row.piece, { test: row.is_test });
      const r = await close('ready', { urls: out.urls, content_hash: mgRenderHash(row.piece) });
      if (!r.ok) throw new Error('El gateway no aceptó el cierre: ' + (r.message || r.error || r.http));
      log('listo', asset.id, out.urls.length + ' medios');
      let submitted = null;
      if (deps.submit && ['drafted', 'scored'].includes(row.status)) submitted = deps.submit(row, out.urls);
      return { id: asset.id, status: 'ready', urls: out.urls.length, submitted: submitted ? 'reenviada al Content Intake' : 'no reenviada' };
    }
    if (asset.provider === 'higgsfield') {
      await deps.providers.higgsfield.produce(deps.env, asset);
      throw new Error('El proveedor generativo devolvió sin resultado.');
    }
    throw new Error('El proveedor «' + asset.provider + '» no se ejecuta automáticamente (' + (asset.provider === 'manual' ? 'usa el comando register con el asset de Christian' : 'sin ejecutor') + ').');
  } catch (e) {
    const msg = String((e && e.message) || e).slice(0, 280);
    await close('failed', { error: msg }).catch(() => {});
    return { id: asset.id, status: 'failed', error: msg };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];
  const env = loadEnv();
  const gateway = gatewayClient(env);
  const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
  if (cmd === 'list') {
    const r = await gateway({ action: 'list', status: flag('--status') || 'requested,queued,generating,failed,unavailable', limit: 50 });
    console.log(JSON.stringify({ providers: r.providers, assets: (r.assets || []).map((a) => ({ id: a.id, need: a.need, provider: a.provider, status: a.status, error: a.error, piece_id: a.piece_id })) }, null, 2));
    return;
  }
  if (cmd === 'run') {
    const one = flag('--id');
    const r = await gateway({ action: 'list', status: 'queued', limit: 50, ...(args.includes('--test') ? { test: true } : {}) });
    const queue = (r.assets || []).filter((a) => !one || a.id === one);
    if (!queue.length) { console.log('No hay assets en cola.'); return; }
    const providers = { renderer: await import('./providers/renderer.mjs'), higgsfield: await import('./providers/higgsfield.mjs'), manual: await import('./providers/manual.mjs') };
    const deps = { gateway, readPiece: pieceReader(env), providers, env, log: (...a) => console.log(...a), submit: args.includes('--no-submit') ? null : submitPiece };
    for (const a of queue) console.log(JSON.stringify(await runAsset(a, deps)));
    return;
  }
  if (cmd === 'register') {
    const [, id, ...inputs] = args;
    if (!id || !inputs.length) { console.error('Uso: register <asset-id> <https-url|archivo.png> [...]'); process.exit(1); }
    const manual = await import('./providers/manual.mjs');
    const out = await manual.produce(env, inputs, {});
    console.log(JSON.stringify(await gateway({ action: 'complete', id, status: 'ready', urls: out.urls })));
    return;
  }
  console.error('Uso: node scripts/media/media-gateway.mjs list | run | register');
  process.exit(1);
}
if (process.argv[1] && process.argv[1].endsWith('media-gateway.mjs')) main().catch((e) => { console.error('ERROR', e.message); process.exit(1); });
