import "server-only";
import { swr } from "./swr";
import type { OpsActionInput, OpsActionState, OverviewResult, Overview } from "./types";

/**
 * Cliente de servidor hacia n8n «29 Ops Actions». Usa una clave EXCLUSIVA de /ops (OPS_APPROVAL_KEY, cabecera X-Ops-Approval),
 * distinta de la que usa Hermes: así ni Hermes ni nadie sin sesión de /ops puede aprobar por esta vía. El navegador nunca ve la clave
 * ni habla con n8n, GHL o Supabase. Todo lo que se aprueba pasa por las rutas reales (Outreach Engine, LinkedIn Engine, GHL Social Planner).
 */
function config() {
  const base = process.env.N8N_BASE_URL?.replace(/\/$/, "");
  const key = process.env.OPS_APPROVAL_KEY;
  return base && key ? { base, key } : null;
}

async function call(body: Record<string, unknown>, timeoutMs: number): Promise<{ ok: boolean; status: number; json: Record<string, unknown> | null }> {
  const cfg = config();
  if (!cfg) return { ok: false, status: 0, json: null };
  const res = await fetch(`${cfg.base}/webhook/atacama-ops-actions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Ops-Approval": cfg.key },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });
  let json: Record<string, unknown> | null = null;
  try { json = (await res.json()) as Record<string, unknown>; } catch { json = null; }
  return { ok: res.ok, status: res.status, json };
}

/** Aprobaciones en memoria con «stale-while-revalidate» (ver swr.ts): pasados 20 s se muestra lo último al instante y se refresca por detrás. Se descarta tras cada acción. */
const overviewCache = swr<Overview>(async () => {
  const r = await call({ action: "overview" }, 28_000);
  const o = r.json as unknown as (Overview & { ok?: boolean }) | null;
  if (!r.ok || !o || o.ok !== true || !o.email || !Array.isArray(o.email.cards) || !o.linkedin) throw new Error("bad_response");
  return { value: o, at: Date.parse(o.generated_at) || Date.now() };
}, { freshMs: 20_000, maxStaleMs: 10 * 60_000 });

export function dropOverview(): void { overviewCache.drop(); }

export async function getOverview(): Promise<OverviewResult> {
  if (!config()) return { ok: false, reason: "not_configured" };
  try {
    const r = await overviewCache.get();
    return { ok: true, overview: r.value };
  } catch (e) {
    return { ok: false, reason: e instanceof Error && e.message === "bad_response" ? "bad_response" : "unreachable" };
  }
}

const ACTIONS = new Set(["email_save", "email_approve", "email_reject", "email_reopen", "linkedin_approve", "linkedin_reject", "content_approve", "content_reject", "autosend_set", "autosend_sweep", "prep_li_sent", "prep_hold", "prep_release", "prep_contact"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Valida la solicitud antes de salir del servidor (lista cerrada de acciones; nada genérico). */
export function checkInput(i: OpsActionInput): string | null {
  if (!ACTIONS.has(i.action)) return "Acción no permitida.";
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(i.request_id ?? "")) return "Falta el identificador de la acción.";
  if (i.action.startsWith("email_") && !UUID.test(i.message_id ?? "")) return "Correo inválido.";
  if ((i.action.startsWith("linkedin_") || i.action.startsWith("prep_")) && !UUID.test(i.candidate_id ?? "")) return "Prospecto inválido.";
  if (i.action === "autosend_set" && typeof i.enabled !== "boolean") return "Falta indicar si se enciende o se apaga.";
  if (i.text !== undefined && (typeof i.text !== "string" || i.text.length > 1500)) return "Texto inválido.";
  if (i.email !== undefined && (typeof i.email !== "string" || i.email.length > 200)) return "Correo inválido.";
  if (i.linkedin !== undefined && (typeof i.linkedin !== "string" || i.linkedin.length > 300)) return "Enlace inválido.";
  if (i.action.startsWith("content_") && !UUID.test(i.piece_id ?? "")) return "Pieza inválida.";
  if (i.subject !== undefined && (typeof i.subject !== "string" || i.subject.length > 300)) return "Asunto inválido.";
  if (i.body !== undefined && (typeof i.body !== "string" || i.body.length > 10_000)) return "Cuerpo inválido.";
  if (i.reason !== undefined && (typeof i.reason !== "string" || i.reason.length > 300)) return "Motivo inválido.";
  return null;
}

export async function runAction(input: OpsActionInput): Promise<OpsActionState> {
  if (!config()) return { ok: false, message: "Las aprobaciones desde /ops aún no están configuradas." };
  const bad = checkInput(input);
  if (bad) return { ok: false, message: bad };
  try {
    const r = await call({ ...input }, 150_000);
    const j = r.json;
    if (!j) return { ok: false, message: r.status === 403 ? "El servicio rechazó la solicitud." : "Sin respuesta del sistema de aprobaciones." };
    // Nunca se muestra éxito si el backend no lo confirmó explícitamente.
    const ok = r.ok && j.ok === true;
    // Un error HTTP del servicio (500, 502…) no trae un motivo pensado para personas: se muestra uno genérico; un rechazo del motor (200 + ok:false) conserva su motivo.
    const friendly = r.ok ? String(j.message ?? "No se pudo completar.") : "El sistema de aprobaciones respondió con un error (HTTP " + r.status + "). No se hizo nada; reintenta en un momento.";
    return {
      ok,
      message: (ok ? String(j.message ?? "Listo.") : friendly).slice(0, 500),
      status: typeof j.status === "string" ? j.status : undefined,
      hash: typeof j.hash === "string" ? j.hash : null,
      needsGhl: j.needs_ghl === true,
      replayed: j.replayed === true,
    };
  } catch {
    return { ok: false, message: "No pude contactar al sistema de aprobaciones. No se hizo nada; revisa e inténtalo de nuevo." };
  }
}
