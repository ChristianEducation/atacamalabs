// Solo para scripts/ops/swr.test.mjs: fuera de Next.js no existe `after` (ni se resuelve «next/server» sin extensión); se sustituye por un stub que falla
// como lo haría fuera de una petición, y swr.ts debe caer al refresco directo.
import { register } from 'node:module';
register('data:text/javascript,' + encodeURIComponent("export async function resolve(s, c, n) { if (s === 'next/server') return { url: 'data:text/javascript,' + encodeURIComponent('export const after = () => { throw new Error(\"fuera de una petición\"); };'), shortCircuit: true }; return n(s, c); }"));
