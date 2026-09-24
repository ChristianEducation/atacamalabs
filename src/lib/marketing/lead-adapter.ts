/**
 * Adaptador de contacto — spec R5.1 / M2.2. La UI tiene su propio modelo; este
 * módulo serializa al contrato REAL y sin cambios de POST /api/leads
 * (requestId UUID, name 2–80, company ≤120, email|teléfono válido, message 20–1200,
 * solution ∈ allowlist, honeypot `website`). No se tocan endpoint, tablas ni RPC:
 * lo que el contrato no admite (rubro, plan, capacidad, «Páginas web») viaja de
 * forma legible dentro del mensaje, respetando la longitud.
 */

export type NeedId = "agentes" | "a-medida" | "web" | "integraciones" | "por-definir";
export type IndustryChoice =
  | "educacion"
  | "salud"
  | "inmobiliarias"
  | "gimnasios"
  | "retail-ecommerce"
  | "servicios-profesionales"
  | "servicios-b2b"
  | "otra"
  | "en-mensaje"
  | "";
export type CapabilityChoice =
  | "comercial"
  | "cobranza"
  | "administrativo-financiero"
  | "atencion"
  | "agendamiento"
  | "integraciones";

export const NEED_OPTIONS: readonly { id: NeedId; label: string }[] = [
  { id: "agentes", label: "Agentes" },
  { id: "a-medida", label: "Automatización o software a medida" },
  { id: "web", label: "Páginas web" },
  { id: "integraciones", label: "Integraciones" },
  { id: "por-definir", label: "Aún no lo sé" },
];

export const INDUSTRY_OPTIONS: readonly { id: IndustryChoice; label: string }[] = [
  { id: "educacion", label: "Educación" },
  { id: "salud", label: "Clínicas / Salud" },
  { id: "inmobiliarias", label: "Inmobiliarias" },
  { id: "gimnasios", label: "Gimnasios" },
  { id: "retail-ecommerce", label: "Retail y ecommerce" },
  { id: "servicios-profesionales", label: "Abogados y servicios profesionales" },
  { id: "servicios-b2b", label: "Servicios B2B" },
  { id: "otra", label: "Otra" },
  { id: "en-mensaje", label: "Prefiero contarlo en el mensaje" },
];

export const CAPABILITY_LABEL: Record<CapabilityChoice, string> = {
  comercial: "Comercial",
  cobranza: "Cobranza",
  "administrativo-financiero": "Administrativo/Financiero",
  atencion: "Atención",
  agendamiento: "Agendamiento",
  integraciones: "Integraciones",
};

export const PLAN_LABEL: Record<string, string> = {
  esencial: "Esencial",
  operacion: "Operación",
  escala: "Escala",
  growth: "Growth",
  pro: "Pro",
  landing: "Landing",
  profesional: "Web Profesional",
  corporativa: "Corporativa",
  ecommerce: "Ecommerce",
};

const AGENT_PLANS = new Set(["esencial", "operacion", "escala", "growth", "pro"]);
const WEB_PLANS = new Set(["landing", "profesional", "corporativa", "ecommerce"]);
const NEEDS = new Set<string>(NEED_OPTIONS.map((n) => n.id));
const INDUSTRIES = new Set<string>(INDUSTRY_OPTIONS.map((i) => i.id).filter(Boolean));
const CAPABILITIES = new Set<string>(Object.keys(CAPABILITY_LABEL));

export interface DiagnosticContext {
  need: NeedId | "";
  industry: IndustryChoice;
  plan: string;
  capability: CapabilityChoice | "";
}

type Raw = string | string[] | undefined;
const first = (v: Raw) => (Array.isArray(v) ? v[0] : v);

/**
 * Preselección desde query (B2 / M2.1): parámetros desconocidos se ignoran, un
 * `plan` incompatible con `necesidad` se descarta, nunca PII.
 */
export function parseDiagnosticQuery(query: Record<string, Raw>): DiagnosticContext {
  const need = first(query.necesidad);
  const industry = first(query.industria);
  const plan = first(query.plan);
  const capability = first(query.capacidad);

  const needOk = need && NEEDS.has(need) ? (need as NeedId) : "";
  let planOk = plan && (AGENT_PLANS.has(plan) || WEB_PLANS.has(plan)) ? plan : "";
  if (planOk) {
    const compatible =
      (AGENT_PLANS.has(planOk) && needOk === "agentes") || (WEB_PLANS.has(planOk) && needOk === "web");
    if (!compatible) planOk = "";
  }
  return {
    need: needOk,
    industry: industry && INDUSTRIES.has(industry) ? (industry as IndustryChoice) : "",
    plan: planOk,
    capability: capability && CAPABILITIES.has(capability) ? (capability as CapabilityChoice) : "",
  };
}

/** solution del contrato real (allowlist existente); lo demás va en el mensaje. */
export function solutionFor(need: NeedId | ""): string {
  switch (need) {
    case "agentes":
      return "atencion-y-seguimiento";
    case "a-medida":
      return "sistemas-a-medida";
    case "integraciones":
      return "integraciones";
    default:
      return "unsure";
  }
}

export interface DiagnosticValues {
  need: NeedId | "";
  industry: IndustryChoice;
  plan: string;
  capability: CapabilityChoice | "";
  process: string;
  name: string;
  company: string;
  email: string;
  phone: string;
}

export const MESSAGE_MAX = 1200;
export const MESSAGE_MIN = 20;

/** Encabezado legible que acompaña al proceso dentro del mensaje. */
export function contextPrefix(values: Pick<DiagnosticValues, "need" | "industry" | "plan" | "capability">): string {
  const parts: string[] = [];
  const need = NEED_OPTIONS.find((n) => n.id === values.need);
  if (need) parts.push(`Necesidad: ${need.label}`);
  const industry = INDUSTRY_OPTIONS.find((i) => i.id === values.industry);
  if (industry && industry.id) parts.push(`Rubro: ${industry.label}`);
  if (values.plan && PLAN_LABEL[values.plan]) parts.push(`Plan de interés: ${PLAN_LABEL[values.plan]}`);
  if (values.capability) parts.push(`Capacidad: ${CAPABILITY_LABEL[values.capability]}`);
  return parts.length ? `[${parts.join(" · ")}]\n\n` : "";
}

export function buildMessage(values: DiagnosticValues): string {
  return `${contextPrefix(values)}${values.process.trim()}`;
}

/** Longitud máxima del proceso descontando el encabezado contextual. */
export function processMax(values: Pick<DiagnosticValues, "need" | "industry" | "plan" | "capability">): number {
  return Math.max(60, MESSAGE_MAX - contextPrefix(values).length);
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
 * Envía al contrato real. `requestId` es la clave idempotente: el llamador la
 * conserva mientras el payload no cambie (doble click/reintento reutilizan la misma).
 */
export async function submitDiagnostic(
  values: DiagnosticValues,
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
        message: buildMessage(values),
        solution: solutionFor(values.need),
        source: "web",
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
