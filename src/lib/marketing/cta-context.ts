/**
 * Contrato canónico de contexto de los CTA (CTA + DIAGNÓSTICO · SPEC FINAL V1 §5).
 * Los enlaces públicos usan nombres cortos en español (`servicio`, `interes`,
 * `source`, `section`, `cta`, `plan`, `campaign`); el modelo interno los
 * normaliza a `service`, `interest`, `source_page`, `source_section`,
 * `source_cta`, `plan`, `campaign`. Sin PII en los parámetros. Los ids de
 * sección y CTA van siempre en kebab-case.
 */

import type { IndustrySlug } from "@/content/marketing/industries";

export type Service = "agentes" | "a-medida" | "web" | "general";

export type Interest =
  "comercial" | "cobranza" | "administracion-finanzas" | "atencion" | "agendamiento" | "procesos" | "unsure";

export type AgentPlanKey = "esencial" | "operacion" | "escala";
export type WebPlanKey = "landing" | "profesional" | "ecommerce";

export const SERVICES: readonly Service[] = ["agentes", "a-medida", "web", "general"];
export const INTERESTS: readonly Interest[] = [
  "comercial",
  "cobranza",
  "administracion-finanzas",
  "atencion",
  "agendamiento",
  "procesos",
  "unsure",
];
export const AGENT_PLAN_KEYS: readonly AgentPlanKey[] = ["esencial", "operacion", "escala"];
export const WEB_PLAN_KEYS: readonly WebPlanKey[] = ["landing", "profesional", "ecommerce"];

/** Contexto interno de un CTA comercial. */
export interface CtaContext {
  source_page: string;
  source_section: string;
  source_cta: string;
  service?: Service;
  interest?: Interest;
  plan?: string;
  campaign?: string;
  /** Rubro de origen (slug del registro tipado; nunca texto libre). */
  industry?: IndustrySlug;
}

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Ids de origen: kebab-case corto o nada (nunca texto libre desde la URL). */
export function cleanId(value: string | undefined | null, max = 48): string {
  if (!value) return "";
  const v = value.trim().toLowerCase();
  return v.length <= max && KEBAB.test(v) ? v : "";
}

/** Enlace a /diagnostico con el contexto completo (el parser de la página lo entiende). */
export function diagnosticHref(context: CtaContext): string {
  const params = new URLSearchParams();
  if (context.service && context.service !== "general") params.set("servicio", context.service);
  params.set("source", context.source_page);
  params.set("section", context.source_section);
  params.set("cta", context.source_cta);
  if (context.interest) params.set("interes", context.interest);
  if (context.plan) params.set("plan", context.plan);
  if (context.industry) params.set("industria", context.industry);
  if (context.campaign) params.set("campaign", context.campaign);
  return `/diagnostico?${params.toString()}`;
}

/** Página de origen a partir de la ruta actual: "/" → "home", "/agentes" → "agentes". */
export function sourceFromPath(pathname: string | null | undefined): string {
  const first = (pathname ?? "/").split("/").filter(Boolean)[0];
  return cleanId(first) || "home";
}

/** Interés de agente que corresponde a cada rol del selector de /agentes. */
export function interestForRole(roleId: string): Interest {
  switch (roleId) {
    case "administrativo-financiero":
    case "administracion-finanzas":
      return "administracion-finanzas";
    case "comercial":
    case "cobranza":
    case "atencion":
    case "agendamiento":
    case "procesos":
      return roleId;
    default:
      return "unsure";
  }
}
