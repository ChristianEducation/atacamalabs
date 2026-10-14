import "server-only";
import type { IdeasView } from "./types";
import { swr } from "./swr";

/**
 * Atacama OS v3 — lecturas propias de las vistas nuevas (n8n «25 Atacama Ops», solo lectura, clave de ingesta que el navegador nunca ve).
 * Mismo patrón que data.ts: memoria con «stale-while-revalidate» y descarte tras cada acción (invalidateV3).
 */
function config() {
  const base = process.env.N8N_BASE_URL?.replace(/\/$/, "");
  const key = process.env.ATACAMA_INGEST_KEY;
  return base && key ? { base, key } : null;
}

async function read<T>(action: string, pick: (j: Record<string, unknown>) => T | null): Promise<{ value: T; at: number }> {
  const cfg = config();
  if (!cfg) throw new Error("not_configured");
  const res = await fetch(`${cfg.base}/webhook/atacama-ops`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Atacama-Key": cfg.key },
    body: JSON.stringify({ action }),
    cache: "no-store",
    signal: AbortSignal.timeout(28_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as Record<string, unknown>;
  const v = json.ok === true ? pick(json) : null;
  if (!v) throw new Error("bad_response");
  return { value: v, at: Date.now() };
}

const ideasCache = swr<IdeasView>(() => read("ideas_list", (j) => {
  const v = j.ideas as IdeasView | undefined;
  return v && Array.isArray(v.weeks) ? v : null;
}), { freshMs: 20_000, maxStaleMs: 10 * 60_000 });

export type V3Result<T> = { ok: true; value: T } | { ok: false; reason: "not_configured" | "unreachable" };

export async function getIdeas(): Promise<V3Result<IdeasView>> {
  if (!config()) return { ok: false, reason: "not_configured" };
  try { return { ok: true, value: (await ideasCache.get()).value }; } catch { return { ok: false, reason: "unreachable" }; }
}

/** Tras cualquier acción de /ops: lo siguiente que se lea es el estado real. */
export function invalidateV3(): void {
  ideasCache.drop();
}
