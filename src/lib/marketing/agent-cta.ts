/**
 * Contexto comercial de un CTA que abre a Nayra (ATACAMA_LABS_CTA_SYSTEM_SPEC_V1).
 * Cada botón declara desde dónde se pulsó y qué interés muestra; el widget aún
 * no recibe metadatos, así que el contexto viaja en un evento propio (para el
 * análisis que se conectará después) y en el enlace de respaldo a /diagnostico.
 */
export interface AgentCtaContext {
  source_page: string;
  source_section: string;
  source_cta: string;
  service?: "agentes" | "paginas-web" | "a-medida" | "plataforma";
  interest?: string;
  plan?: string;
  campaign?: string;
}

/** Evento de pulsación: lo escuchará el análisis cuando se implemente. */
export const CTA_EVENT = "atacama:cta-click";

export function trackAgentCta(context: AgentCtaContext, opened: boolean) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(CTA_EVENT, { detail: { ...context, destination: opened ? "nayra" : "diagnostico" } }),
  );
}

/** Respaldo cuando el widget no está disponible: /diagnostico con el mismo contexto. */
export function diagnosticFallback(context: AgentCtaContext): string {
  const params = new URLSearchParams();
  const service = context.service ?? "agentes";
  params.set("servicio", service);
  // Compatibilidad con la preselección actual del formulario (`necesidad`); se retira con /diagnostico.
  if (service === "agentes") params.set("necesidad", "agentes");
  params.set("source", context.source_page);
  params.set("section", context.source_section);
  if (context.interest) params.set("interes", context.interest);
  if (context.plan) params.set("plan", context.plan);
  if (context.campaign) params.set("campaign", context.campaign);
  return `/diagnostico?${params.toString()}`;
}
