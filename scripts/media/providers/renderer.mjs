// Proveedor «renderer»: el renderer de carruseles de Atacama (Playwright, texto exacto, marca oficial). Determinista y sin costo.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { renderPiece } from '../../content/render.mjs';

export const capabilities = { needs: ['carousel', 'typographic', 'comparison', 'before_after', 'checklist', 'framework', 'resource_visual', 'process_flow'], operations: ['render'], cost_usd: 0 };

/** Sube un PNG a la biblioteca de medios de GHL y devuelve { url, type, fileId }. */
export async function uploadPng(env, file, label) {
  const fd = new FormData();
  fd.append('file', new Blob([fs.readFileSync(file)], { type: 'image/png' }), 'atacama-' + (label || '') + path.basename(file));
  fd.append('hosted', 'false');
  const r = await fetch('https://services.leadconnectorhq.com/medias/upload-file', { method: 'POST', headers: { Authorization: 'Bearer ' + env.GHL_PRIVATE_INTEGRATION_TOKEN2, Version: '2021-07-28', Accept: 'application/json' }, body: fd });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.url) throw new Error('Subida a GHL falló: HTTP ' + r.status);
  return { url: j.url, type: 'image/png', fileId: j.fileId };
}

/** Renderiza las slides de la pieza y las sube. Devuelve las URLs (en orden). */
export async function produce(env, piece, opts) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atacama-media-'));
  try {
    const files = await renderPiece(piece, dir);
    const urls = [];
    for (const f of files) urls.push(await uploadPng(env, f, opts && opts.test ? 'prueba-' : ''));
    return { urls, files: files.length };
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
