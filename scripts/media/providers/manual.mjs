// Proveedor «manual»: Christian entrega el asset (captura, foto, imagen propia, video). Se aceptan URLs https ya alojadas o archivos locales (se suben a GHL).
import fs from 'node:fs';
import path from 'node:path';
import { uploadPng } from './renderer.mjs';

export const capabilities = { needs: ['annotated_screenshot', 'editorial_image', 'conceptual_image', 'diagram', 'architecture', 'chart', 'short_video', 'resource_visual'], operations: ['register'], cost_usd: 0 };

export async function produce(env, inputs, opts) {
  const urls = [];
  for (const x of inputs) {
    if (/^https:\/\/\S+$/i.test(x)) { urls.push({ url: x, type: /\.(mp4|mov|webm)(\?|$)/i.test(x) ? 'video/mp4' : 'image/png' }); continue; }
    if (fs.existsSync(x) && /\.png$/i.test(x)) { urls.push(await uploadPng(env, path.resolve(x), opts && opts.test ? 'prueba-' : '')); continue; }
    throw new Error('Entrada no válida: usa una URL https o un archivo .png existente (' + String(x).slice(0, 60) + ')');
  }
  return { urls };
}
