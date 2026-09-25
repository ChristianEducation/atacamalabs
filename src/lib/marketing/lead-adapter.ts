/**
 * Adaptador de Diagnóstico (CTA + DIAGNÓSTICO · SPEC FINAL V1). Dos trabajos:
 *
 * 1. Leer el contexto que trae la URL (`servicio`, `interes`, `plan`, `source`,
 *    `section`, `cta`, `campaign`) y tolerar los enlaces antiguos (`necesidad`,
 *    `capacidad`, `industria`) durante la migración.
 * 2. Serializar el formulario a POST /api/leads: el `message` humano que exige el
 *    contrato (20–1200 caracteres) más el contexto estructurado y `diagnostic_data`.
 */

import {
  AGENT_PLAN_KEYS,
  WEB_PLAN_KEYS,
  INTERESTS,
  SERVICES,
  cleanId,
  type Interest,
  type Service,
} from "./cta-context";

/* ---------- Opciones de la pantalla ---------- */

export const SERVICE_OPTIONS: readonly { id: Exclude<Service, "general"> | "general"; label: string }[] = [
  { id: "agentes", label: "Agentes" },
  { id: "a-medida", label: "Automatizar un proceso / A Medida" },
  { id: "web", label: "Página Web" },
  { id: "general", label: "No estoy seguro" },
];

export const AGENT_GOAL_OPTIONS: readonly { id: Interest; label: string }[] = [
  { id: "comercial", label: "Vender" },
  { id: "atencion", label: "Atender consultas" },
  { id: "agendamiento", label: "Agendar" },
  { id: "cobranza", label: "Cobrar" },
  { id: "administracion-finanzas", label: "Administración / Finanzas" },
  { id: "procesos", label: "Automatizar otro proceso" },
  { id: "unsure", label: "No estoy seguro" },
];

export const WEB_TYPE_OPTIONS: readonly { id: string; label: string }[] = [
  { id: "landing", label: "Landing" },
  { id: "profesional", label: "Web Profesional" },
  { id: "ecommerce", label: "Ecommerce" },
  { id: "unsure", label: "No estoy seguro" },
];

export const WEB_GOAL_OPTIONS: readonly { id: string; label: string }[] = [
  { id: "conseguir-contactos", label: "Conseguir contactos" },
  { id: "mostrar-servicios", label: "Mostrar servicios" },
  { id: "vender-online", label: "Vender online" },
  { id: "renovar-web", label: "Renovar una web existente" },
  { id: "otro", label: "Otro" },
];

export const SERVICE_LABEL: Record<Service, string> = {
  agentes: "Agentes",
  "a-medida": "A Medida",
  web: "Página Web",
  general: "General",
};

export const PLAN_LABEL: Record<string, string> = {
  esencial: "Esencial",
  operacion: "Operación",
  escala: "Escala",
  landing: "Landing",
  profesional: "Web Profesional",
  ecommerce: "Ecommerce",
};

const INTEREST_LABEL: Record<Interest, string> = {
  comercial: "Comercial",
  cobranza: "Cobranza",
  "administracion-finanzas": "Administración / Finanzas",
  atencion: "Atención",
  agendamiento: "Agendamiento",
  procesos: "Procesos",
  unsure: "Por definir",
};

/* ---------- Contexto desde la URL ---------- */

export interface DiagnosticContext {
  service: Service | "";
  interest: Interest | "";
  plan: string;
  source_page: string;
  source_section: string;
  source_cta: string;
  campaign: string;
  /** Rubro que llegue en enlaces antiguos: se conserva como metadata, no genera pregunta. */
  legacy_industry: string;
}

type Raw = string | string[] | undefined;
const first = (v: Raw) => (Array.isArray(v) ? v[0] : v);

const LEGACY_SERVICE: Record<string, Service> = {
  agentes: "agentes",
  "a-medida": "a-medida",
  web: "web",
  integraciones: "a-medida",
  "por-definir": "general",
};

const LEGACY_INTEREST: Record<string, Interest> = {
  comercial: "comercial",
  cobranza: "cobranza",
  "administrativo-financiero": "administracion-finanzas",
  atencion: "atencion",
  agendamiento: "agendamiento",
  integraciones: "procesos",
};

const isAgentPlan = (plan: string) => (AGENT_PLAN_KEYS as readonly string[]).includes(plan);
const isWebPlan = (plan: string) => (WEB_PLAN_KEYS as readonly string[]).includes(plan);

/**
 * Prioridad: parámetro nuevo → alias antiguo → ignorar. Un `plan` sin `servicio`
 * lo infiere; un `plan` incompatible con el servicio se descarta. Los planes
 * antiguos (`growth`, `pro`, `corporativa`) no se convierten: se ignoran.
 */
export function parseDiagnosticQuery(query: Record<string, Raw>): DiagnosticContext {
  const servicio = first(query.servicio);
  const necesidad = first(query.necesidad);
  const interes = first(query.interes);
  const capacidad = first(query.capacidad);
  const rawPlan = first(query.plan) ?? "";

  let service: Service | "" = "";
  if (servicio && (SERVICES as readonly string[]).includes(servicio)) service = servicio as Service;
  else if (necesidad && LEGACY_SERVICE[necesidad]) service = LEGACY_SERVICE[necesidad];

  let plan = isAgentPlan(rawPlan) || isWebPlan(rawPlan) ? rawPlan : "";
  if (plan && !service) service = isAgentPlan(plan) ? "agentes" : "web";
  if (plan && ((service === "agentes" && !isAgentPlan(plan)) || (service === "web" && !isWebPlan(plan)))) plan = "";
  if (plan && service !== "agentes" && service !== "web") plan = "";

  let interest: Interest | "" = "";
  if (interes && (INTERESTS as readonly string[]).includes(interes)) interest = interes as Interest;
  else if (capacidad && LEGACY_INTEREST[capacidad]) interest = LEGACY_INTEREST[capacidad];
  if (interest && service && service !== "agentes") interest = "";
  if (interest && !service) service = "agentes";

  return {
    service,
    interest,
    plan,
    source_page: cleanId(first(query.source)) || "directo",
    source_section: cleanId(first(query.section)),
    source_cta: cleanId(first(query.cta)),
    campaign: cleanId(first(query.campaign)),
    legacy_industry: cleanId(first(query.industria)),
  };
}

/** Título de la página según lo que ya se sabe (spec §21). */
export function headingFor(service: Service | "", plan: string): string {
  if (service === "web" && plan === "ecommerce") return "Cuéntanos sobre tu Ecommerce.";
  if (service === "web") return "Cuéntanos sobre tu nueva web.";
  if (service === "a-medida") return "Cuéntanos qué proceso quieres mejorar.";
  if (service === "agentes") return "Cuéntanos qué quieres delegar.";
  return "Cuéntanos qué quieres mejorar.";
}

/* ---------- Envío ---------- */

export interface DiagnosticValues {
  service: Service | "";
  interest: Interest | "";
  plan: string;
  /** Meta del sitio web (solo Web sin plan definido: el formato que elige la persona). */
  webGoal: string;
  /** Respuesta abierta de la pregunta contextual. */
  answer: string;
  name: string;
  company: string;
  email: string;
  phone: string;
}

export const MESSAGE_MAX = 1200;
export const MESSAGE_MIN = 20;
/** Máximo de la respuesta abierta: deja espacio al encabezado que se antepone. */
export const ANSWER_MAX = 900;

/** Solución del contrato actual (lista permitida): lo demás viaja en los campos nuevos. */
export function solutionFor(service: Service | "", interest: Interest | ""): string {
  if (service === "agentes") return interest === "procesos" ? "automatizacion-de-procesos" : "atencion-y-seguimiento";
  if (service === "a-medida") return "sistemas-a-medida";
  return "unsure";
}

/** Mensaje humano que exige el contrato: encabezado de contexto + lo que la persona escribió o eligió. */
export function buildMessage(values: DiagnosticValues, source: string): string {
  const parts: string[] = [];
  parts.push(`Servicio: ${SERVICE_LABEL[values.service || "general"]}`);
  if (values.plan && PLAN_LABEL[values.plan]) parts.push(`Plan: ${PLAN_LABEL[values.plan]}`);
  if (values.interest) parts.push(`Interés: ${INTEREST_LABEL[values.interest]}`);
  if (source) parts.push(`Origen: ${source}`);
  const header = `[${parts.join(" · ")}]`;

  let body = values.answer.trim();
  if (!body) {
    if (values.service === "agentes" && values.interest && values.interest !== "unsure") {
      body = `Quiere un agente para ${INTEREST_LABEL[values.interest].toLowerCase()}.`;
    } else if (values.service === "web") {
      const goal = WEB_GOAL_OPTIONS.find((g) => g.id === values.webGoal)?.label;
      body = goal ? `Quiere una web. Objetivo principal: ${goal.toLowerCase()}.` : "Quiere cotizar una web.";
    } else {
      body = "Quiere conversar sobre su caso.";
    }
  }
  return `${header}\n${body}`.slice(0, MESSAGE_MAX);
}

/** Respuestas estructuradas (van a `diagnostic_data` sin crear una columna por pregunta). */
export function buildDiagnosticData(values: DiagnosticValues, legacyIndustry: string): Record<string, string> {
  const data: Record<string, string> = {};
  if (values.service === "agentes") {
    if (values.interest) data.agent_goal = values.interest;
    if (values.answer.trim()) data.delegation_note = values.answer.trim();
  } else if (values.service === "a-medida") {
    if (values.answer.trim()) data.process_description = values.answer.trim();
  } else if (values.service === "web") {
    if (values.webGoal) data.web_goal = values.webGoal;
    if (values.answer.trim()) data.web_note = values.answer.trim();
  } else if (values.answer.trim()) {
    data.general_note = values.answer.trim();
  }
  if (legacyIndustry) data.legacy_industry = legacyIndustry;
  return data;
}

export type SubmitOutcome =
  | { kind: "created"; receiptId: string }
  | { kind: "replay"; receiptId: string }
  | { kind: "validation"; errors: Record<string, string> }
  | { kind: "conflict" }
  | { kind: "rate_limited"; retryAfter?: number }
  | { kind: "unavailable" }
  | { kind: "network" };

/**
 * Envía a POST /api/leads. `requestId` es la clave idempotente: el llamador la
 * conserva mientras el payload no cambie (doble clic/reintento reutilizan la misma).
 */
export async function submitDiagnostic(
  values: DiagnosticValues,
  context: DiagnosticContext,
  requestId: string,
  honeypot: string,
): Promise<SubmitOutcome> {
  let response: Response;
  try {
    response = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId,
        name: values.name.trim(),
        company: values.company.trim() || undefined,
        email: values.email.trim() || undefined,
        phone: values.phone.trim() || undefined,
        message: buildMessage(values, context.source_page),
        solution: solutionFor(values.service, values.interest),
        source: "web",
        // Contexto estructurado (la base lo persiste en la fase de backend).
        service: values.service || "general",
        plan: values.plan || undefined,
        interest: values.interest || undefined,
        source_page: context.source_page,
        source_section: context.source_section || undefined,
        source_cta: context.source_cta || undefined,
        campaign: context.campaign || undefined,
        diagnostic_data: buildDiagnosticData(values, context.legacy_industry),
        website: honeypot || undefined,
      }),
    });
  } catch {
    return { kind: "network" };
  }

  const body = await response.json().catch(() => ({}) as Record<string, unknown>);

  if (response.status === 201) return { kind: "created", receiptId: String(body.receiptId ?? requestId) };
  if (response.status === 200) return { kind: "replay", receiptId: String(body.receiptId ?? requestId) };
  if (response.status === 400 || response.status === 422) {
    return { kind: "validation", errors: (body.errors as Record<string, string>) ?? {} };
  }
  if (response.status === 409) return { kind: "conflict" };
  if (response.status === 429) {
    const retryAfter = Number(response.headers.get("Retry-After") ?? 0) || undefined;
    return { kind: "rate_limited", retryAfter };
  }
  if (response.status === 503) return { kind: "unavailable" };
  return { kind: "network" };
}

export function newRequestId(): string {
  return crypto.randomUUID();
}
