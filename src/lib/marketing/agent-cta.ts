import { track } from "@/lib/analytics";
import { diagnosticHref, type CtaContext } from "./cta-context";

/**
 * Contexto comercial de un CTA que abre a Nayra (CTA + DIAGNÓSTICO · SPEC FINAL
 * V1 §17). El widget de Nayra no recibe metadatos ni mensaje inicial (su API
 * pública es solo `mount`/`unmount`), así que el contexto viaja en los eventos
 * de analítica y en el enlace de respaldo a /diagnostico, sin manipular el chat.
 */
export type AgentCtaContext = CtaContext;

/** Registra el clic y, según el resultado, la apertura de Nayra o la caída al respaldo. */
export function trackAgentCta(context: AgentCtaContext, opened: boolean) {
  const props = {
    source_page: context.source_page,
    source_section: context.source_section,
    source_cta: context.source_cta,
    service: context.service,
    interest: context.interest,
    plan: context.plan,
    campaign: context.campaign,
  };
  track({ name: "cta_clicked", props: { ...props, destination: opened ? "nayra" : "diagnostico" } });
  if (opened) track({ name: "nayra_opened", props });
}

/** Respaldo cuando el widget no está disponible: /diagnostico con el mismo contexto (incluye `cta`). */
export function diagnosticFallback(context: AgentCtaContext): string {
  return diagnosticHref({ ...context, service: context.service ?? "agentes" });
}
