import "server-only";
import type { Panel, PanelResult } from "./types";
import { swr } from "./swr";
import { dropOverview } from "./actions-client";

/**
 * Lee el estado de Atacama OS desde n8n («25 Atacama Ops», acción `panel`, solo lectura).
 * El servidor de Next.js es el único que conoce la clave: el navegador nunca habla con GHL, n8n ni Supabase.
 *
 * Velocidad: la consulta a n8n tarda ~4 s. Se guarda en memoria con «stale-while-revalidate» (ver swr.ts): pasados 30 s se sigue mostrando lo
 * último AL INSTANTE y se refresca por detrás; solo el primer arranque en frío espera. Tras aprobar/rechazar/editar, `invalidatePanel()` la descarta.
 * Si n8n falla, se muestra lo último guardado con aviso.
 */
const panelCache = swr<Panel>(async () => {
  const cfg = config();
  if (!cfg) throw new Error("not_configured");
  const res = await fetch(`${cfg.base}/webhook/atacama-ops`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Atacama-Key": cfg.key },
    body: JSON.stringify({ action: "panel" }),
    cache: "no-store",
    signal: AbortSignal.timeout(28_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as { ok?: boolean; panel?: Panel };
  if (!json.ok || !json.panel || !Array.isArray(json.panel.attention)) throw new Error("bad_response");
  return { value: json.panel, at: Date.parse(json.panel.generated_at) || Date.now() };
}, { freshMs: 30_000, maxStaleMs: 15 * 60_000 });

function config() {
  const base = process.env.N8N_BASE_URL?.replace(/\/$/, "");
  const key = process.env.ATACAMA_INGEST_KEY;
  return base && key ? { base, key } : null;
}

export async function getPanel(): Promise<PanelResult> {
  if (!config()) return { ok: false, reason: "not_configured" };
  try {
    const r = await panelCache.get();
    return { ok: true, panel: r.value, stale: r.stale, fetchedAt: r.at };
  } catch {
    return { ok: false, reason: "unreachable" };
  }
}

/** Tras aprobar/rechazar/editar: descarta las cachés (panel y aprobaciones) para que lo siguiente que se lea sea el estado real. */
export function invalidatePanel(): void {
  panelCache.drop();
  dropOverview();
}
