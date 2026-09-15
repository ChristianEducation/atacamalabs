"use client";

/**
 * Capa de eventos — docs/WEB-CONTENT.md §SEO, analítica y calidad.
 * Sin proveedor conectado todavía (I06: "analítica existente mínima" sin
 * confirmar). Hoy solo registra en consola en desarrollo; cuando exista
 * proveedor real, reemplazar el cuerpo de track() sin tocar los call
 * sites — la forma del evento (nombre + props) ya respeta el contrato.
 *
 * Prohibido explícitamente: email, teléfono, mensaje, querystring libre,
 * nombres. Solo IDs/categorías internas no sensibles.
 */

export type AnalyticsEvent =
  | { name: "lead_form_view"; props?: { solution?: string } }
  | { name: "lead_submit_success"; props: { requestId: string } }
  | { name: "lead_submit_error"; props: { requestId: string; reason: string } }
  | { name: "booking_click"; props?: { source: "contact_success" | "agenda_page" } }
  | { name: "contact_channel_click"; props: { channel: "email" | "whatsapp" } }
  | { name: "case_view"; props: { caseSlug: string } };

const ALLOWED_EVENT_NAMES = new Set<AnalyticsEvent["name"]>([
  "lead_form_view",
  "lead_submit_success",
  "lead_submit_error",
  "booking_click",
  "contact_channel_click",
  "case_view",
]);

const PII_LIKE_KEYS = ["email", "phone", "message", "name", "query", "querystring"];

export function track(event: AnalyticsEvent) {
  if (!ALLOWED_EVENT_NAMES.has(event.name)) return;

  const props = (event.props ?? {}) as Record<string, unknown>;
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (PII_LIKE_KEYS.includes(key.toLowerCase())) continue;
    sanitized[key] = value;
  }

  if (process.env.NODE_ENV !== "production") {
    console.debug("[analytics]", event.name, sanitized);
  }

  // TODO(002/2.x posterior): enviar a la solución de analítica confirmada
  // por Christian (I06) una vez esté conectada. No habilitar hasta entonces.
}
