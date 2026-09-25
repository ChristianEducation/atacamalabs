"use client";

/**
 * Capa de eventos — docs/WEB-CONTENT.md §SEO, analítica y calidad; spec V2.2.1 R5.2.
 * Sin proveedor conectado todavía (I06: "analítica existente mínima" sin
 * confirmar). Hoy solo registra en consola en desarrollo; cuando exista
 * proveedor real, reemplazar el cuerpo de track() sin tocar los call
 * sites — la forma del evento (nombre + props) ya respeta el contrato.
 *
 * Prohibido explícitamente: email, teléfono, mensaje, querystring libre,
 * nombres, búsquedas libres, transcripciones. Solo IDs/categorías internas.
 */

export type AnalyticsEvent =
  | { name: "lead_form_view"; props?: { solution?: string } }
  | { name: "lead_submit_success"; props: { requestId: string } }
  | { name: "lead_submit_error"; props: { requestId: string; reason: string } }
  | { name: "booking_click"; props?: { source: "contact_success" | "agenda_page" } }
  | { name: "contact_channel_click"; props: { channel: "email" | "whatsapp" } }
  | { name: "case_view"; props: { caseSlug: string } }
  // R5.2 — eventos de UI del frontend V2.2.1
  | {
      name: "marketing_cta_click";
      props: { routeId: string; sectionId: string; ctaId: string; destinationId: string };
    }
  | { name: "demo_scenario_select"; props: { routeId: string; demoId: string; scenarioId: string } }
  | { name: "demo_complete"; props: { demoId: string; scenarioId: string; reducedMotion: boolean } }
  | { name: "plan_interest"; props: { family: "agentes" | "web"; planId: string; priceState: string } }
  | { name: "industry_open"; props: { industryId: string; originSection: string } }
  | { name: "diagnostic_step"; props: { stepNumber: 1 | 2; needId?: string; industryId?: string } }
  | {
      name: "lead_submit_result";
      props: {
        result: "success" | "validation" | "conflict" | "rate_limit" | "unavailable" | "unknown";
      };
    }
  | { name: "booking_open"; props: { originSection: string; providerKey?: string } }
  // CTA + Diagnóstico (spec final): nombres y propiedades canónicos.
  | { name: "cta_clicked"; props: CtaEventProps }
  | { name: "nayra_opened"; props: CtaEventProps }
  | { name: "diagnostic_started"; props: CtaEventProps }
  | { name: "diagnostic_service_selected"; props: CtaEventProps }
  | { name: "diagnostic_step_completed"; props: CtaEventProps & { step: number } }
  | { name: "diagnostic_submitted"; props: CtaEventProps }
  | { name: "calendar_viewed"; props: CtaEventProps }
  | { name: "meeting_scheduled"; props: CtaEventProps };

/** Propiedades comunes de los eventos de CTA/Diagnóstico: solo IDs y categorías, nunca PII. */
export interface CtaEventProps {
  source_page?: string;
  source_section?: string;
  source_cta?: string;
  service?: string;
  interest?: string;
  plan?: string;
  campaign?: string;
  destination?: string;
}

const ALLOWED_EVENT_NAMES = new Set<AnalyticsEvent["name"]>([
  "lead_form_view",
  "lead_submit_success",
  "lead_submit_error",
  "booking_click",
  "contact_channel_click",
  "case_view",
  "marketing_cta_click",
  "demo_scenario_select",
  "demo_complete",
  "plan_interest",
  "industry_open",
  "diagnostic_step",
  "lead_submit_result",
  "booking_open",
  "cta_clicked",
  "nayra_opened",
  "diagnostic_started",
  "diagnostic_service_selected",
  "diagnostic_step_completed",
  "diagnostic_submitted",
  "calendar_viewed",
  "meeting_scheduled",
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
