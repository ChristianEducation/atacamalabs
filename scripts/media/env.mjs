// Lectura de .env.local del proyecto (sin imprimir nunca valores) y helpers comunes del worker del Media Gateway.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export function loadEnv() {
  const f = path.join(ROOT, '.env.local');
  if (!fs.existsSync(f)) throw new Error('Falta .env.local en la raíz del proyecto');
  return Object.fromEntries(fs.readFileSync(f, 'utf8').split(/\r?\n/).filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, '')]; }));
}
