import "server-only";
import type { Panel, PanelResult } from "./types";

/**
 * Lee el estado de Atacama OS desde n8n («25 Atacama Ops», acción `panel`, solo lectura).
 * El servidor de Next.js es el único que conoce la clave: el navegador nunca habla con GHL, n8n ni Supabase.
 * Caché corta en memoria para no repetir una consulta de ~5 s por cada refresco (y si n8n falla, se muestra lo último con aviso).
 */
const TTL_MS = 25_000;
const MAX_STALE_MS = 15 * 60_000;
let cache: { at: number; panel: Panel } | null = null;
let inflight: Promise<PanelResult> | null = null;

function config() {
  const base = process.env.N8N_BASE_URL?.replace(/\/$/, "");
  const key = process.env.ATACAMA_INGEST_KEY;
  return base && key ? { base, key } : null;
}

async function fetchPanel(): Promise<PanelResult> {
  const cfg = config();
  if (!cfg) return { ok: false, reason: "not_configured" };
  try {
    const res = await fetch(`${cfg.base}/webhook/atacama-ops`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Atacama-Key": cfg.key },
      body: JSON.stringify({ action: "panel" }),
      cache: "no-store",
      signal: AbortSignal.timeout(28_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as { ok?: boolean; panel?: Panel };
    if (!json.ok || !json.panel || !Array.isArray(json.panel.attention)) return { ok: false, reason: "bad_response" };
    cache = { at: Date.now(), panel: json.panel };
    return { ok: true, panel: json.panel, stale: false, fetchedAt: cache.at };
  } catch {
    if (cache && Date.now() - cache.at < MAX_STALE_MS) return { ok: true, panel: cache.panel, stale: true, fetchedAt: cache.at };
    return { ok: false, reason: "unreachable" };
  }
}

export async function getPanel(): Promise<PanelResult> {
  if (!config()) return { ok: false, reason: "not_configured" };
  if (cache && Date.now() - cache.at < TTL_MS) return { ok: true, panel: cache.panel, stale: false, fetchedAt: cache.at };
  if (!inflight) inflight = fetchPanel().finally(() => { inflight = null; });
  return inflight;
}
