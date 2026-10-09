import "server-only";
import { after } from "next/server";

/**
 * «Stale-while-revalidate» en memoria del servidor para las lecturas lentas de /ops (n8n tarda ~1–5 s):
 *  - dato fresco (< freshMs): se devuelve tal cual;
 *  - dato viejo pero útil (< maxStaleMs): se devuelve AL INSTANTE y se refresca por detrás (`after` corre tras enviar la respuesta);
 *  - sin dato (arranque en frío) o demasiado viejo: se espera la lectura real.
 * Si la lectura falla y hay un dato anterior, se muestra ese (marcado como viejo); si no hay nada, el error sube.
 * `drop()` borra el dato (se usa tras aprobar/rechazar para que lo siguiente que se lea sea el estado real).
 * OPS_NO_CACHE=1 lo desactiva (pruebas de interfaz, donde el estado simulado cambia entre pasos).
 */
export type Swr<T> = { get: () => Promise<{ value: T; at: number; stale: boolean }>; drop: () => void };

export function swr<T>(fetcher: () => Promise<{ value: T; at: number }>, opts: { freshMs: number; maxStaleMs: number }): Swr<T> {
  let entry: { value: T; at: number } | null = null;
  let inflight: Promise<{ value: T; at: number }> | null = null;
  let gen = 0; // cada drop() sube la generación: una lectura que venía en camino ANTES de la acción no puede volver a guardar datos viejos
  const load = () => {
    if (!inflight) { const g = gen; const p: Promise<{ value: T; at: number }> = fetcher().then((r) => { if (g === gen) entry = r; return r; }).finally(() => { if (inflight === p) inflight = null; }); inflight = p; }
    return inflight;
  };
  return {
    drop: () => { gen++; entry = null; inflight = null; },
    get: async () => {
      if (process.env.OPS_NO_CACHE === "1") { const r = await load(); return { ...r, stale: false }; }
      const now = Date.now();
      if (entry && now - entry.at < opts.freshMs) return { ...entry, stale: false };
      if (entry && now - entry.at < opts.maxStaleMs) {
        const keep = entry;
        try { after(() => { load().catch(() => {}); }); } catch { load().catch(() => {}); }
        return { ...keep, stale: false };
      }
      try {
        const r = await load();
        return { ...r, stale: false };
      } catch (e) {
        if (entry && now - entry.at < opts.maxStaleMs) return { ...entry, stale: true };
        throw e;
      }
    },
  };
}
