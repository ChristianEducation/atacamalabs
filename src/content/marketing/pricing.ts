/**
 * Catálogo de precios — spec/implementation/02-PRICING.md (R2).
 * Un único catálogo alimenta Home, Agentes y Precios. Todos los importes están
 * en null (pendiente de aprobación comercial, FV-U01/FV-U02): se muestran como
 * «Consultar». Los importes del 006 anterior NO se trasladan (DEC-09) y la
 * referencia interna del ecommerce (990000) no se serializa al cliente público.
 */

export type AgentPlanId = "esencial" | "growth" | "pro";
export type WebPlanId = "landing" | "corporativa" | "ecommerce";
export type PriceState = "pending" | "reference" | "confirmed" | "temporarilyUnavailable";
export type ChargePeriod = "one_time" | "month" | "year" | null;

export interface PlanFeature {
  label: string;
  value: string | null;
  confirmed: boolean;
}

export interface PlanPrice {
  state: PriceState;
  confirmedAmountCLP: number | null;
  period: ChargePeriod;
  qualifier: "fixed" | "from" | null;
  /** Frase exacta aprobada; nunca se infiere IVA. */
  taxLabel: string | null;
  setupAmountCLP: number | null;
  setupStatus: "not_applicable" | "included" | "separate" | "pending";
  extraCostsLabel: string | null;
  scopeConfirmed: boolean;
  conditions: readonly string[];
  approvedAt: string | null;
}

export interface Plan<Id extends string> {
  family: "agentes" | "web";
  id: Id;
  name: string;
  description: string;
  price: PlanPrice;
  features: readonly PlanFeature[];
  /** Solo Growth en Agentes; nunca «El más vendido» sin evidencia. */
  badge?: string;
  /** Corporativa puede destacarse con borde azul (I4). */
  highlighted?: boolean;
  cta: { label: string; href: string };
}

const PENDING_PRICE: PlanPrice = {
  state: "pending",
  confirmedAmountCLP: null,
  period: null,
  qualifier: null,
  taxLabel: null,
  setupAmountCLP: null,
  setupStatus: "pending",
  extraCostsLabel: null,
  scopeConfirmed: false,
  conditions: [],
  approvedAt: null,
};

const TBD = "A definir en propuesta";

const agentFeatures: readonly PlanFeature[] = [
  { label: "Cantidad de agentes", value: null, confirmed: false },
  { label: "Canales", value: null, confirmed: false },
  { label: "Volumen / consumo", value: null, confirmed: false },
  { label: "Integraciones y acciones", value: null, confirmed: false },
  { label: "Configuración / acompañamiento", value: null, confirmed: false },
  { label: "Soporte", value: null, confirmed: false },
];

const webFeatures: readonly PlanFeature[] = [
  { label: "Páginas o secciones", value: null, confirmed: false },
  { label: "Contenido y diseño", value: null, confirmed: false },
  { label: "Contacto / funciones", value: null, confirmed: false },
  { label: "Integraciones", value: null, confirmed: false },
  { label: "Publicación / infraestructura", value: null, confirmed: false },
  { label: "Acompañamiento", value: null, confirmed: false },
];

export const AGENT_PLANS: readonly Plan<AgentPlanId>[] = [
  {
    family: "agentes",
    id: "esencial",
    name: "Esencial",
    description: "Para empezar con un agente y un alcance inicial definido.",
    price: PENDING_PRICE,
    features: agentFeatures,
    cta: { label: "Empezar con Esencial", href: "/diagnostico?necesidad=agentes&plan=esencial" },
  },
  {
    family: "agentes",
    id: "growth",
    name: "Growth",
    description: "Para ampliar agentes, volumen, acompañamiento u operación.",
    price: PENDING_PRICE,
    features: agentFeatures,
    badge: "Para equipos en crecimiento",
    highlighted: true,
    cta: { label: "Empezar con Growth", href: "/diagnostico?necesidad=agentes&plan=growth" },
  },
  {
    family: "agentes",
    id: "pro",
    name: "Pro",
    description: "Para equipos con mayor volumen, complejidad o necesidades de soporte.",
    price: PENDING_PRICE,
    features: agentFeatures,
    cta: { label: "Empezar con Pro", href: "/diagnostico?necesidad=agentes&plan=pro" },
  },
];

export const WEB_PLANS: readonly Plan<WebPlanId>[] = [
  {
    family: "web",
    id: "landing",
    name: "Landing",
    description: "Una oferta y una acción principal.",
    price: PENDING_PRICE,
    features: webFeatures,
    cta: { label: "Cotizar Landing", href: "/diagnostico?necesidad=web&plan=landing" },
  },
  {
    family: "web",
    id: "corporativa",
    name: "Corporativa",
    description: "Varias líneas de negocio con navegación clara.",
    price: PENDING_PRICE,
    features: webFeatures,
    highlighted: true,
    cta: { label: "Cotizar Corporativa", href: "/diagnostico?necesidad=web&plan=corporativa" },
  },
  {
    family: "web",
    id: "ecommerce",
    name: "Ecommerce",
    description: "Catálogo y recorrido de compra.",
    price: PENDING_PRICE,
    features: webFeatures,
    cta: { label: "Cotizar Ecommerce", href: "/diagnostico?necesidad=web&plan=ecommerce" },
  },
];

export const PRICE_PENDING_COPY = {
  price: "Consultar",
  sub: "Alcance y valor por confirmar",
  value: TBD,
  unavailable: "Plan en revisión",
  webDelivery: "Plazo según contenido y alcance",
  extraAgent: "¿Necesitas ampliar el alcance? Lo revisamos contigo.",
} as const;

const clp = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 });
const PERIOD_TEXT: Record<Exclude<ChargePeriod, null>, string> = {
  one_time: "pago único",
  month: "al mes",
  year: "al año",
};

export interface RenderedPrice {
  headline: string;
  sub: string;
  accessibleLabel: string;
  confirmed: boolean;
  cta: "consult" | "request" | "alternatives";
}

/**
 * Representación exacta R2.2. Importes nulos o términos inconsistentes caen en
 * modo seguro «pending» (nunca 0/gratis, nunca stacktrace). No infiere IVA ni periodicidad.
 */
export function renderPrice(price: PlanPrice): RenderedPrice {
  if (price.state === "temporarilyUnavailable") {
    return {
      headline: PRICE_PENDING_COPY.unavailable,
      sub: "Conversemos sobre alternativas.",
      accessibleLabel: PRICE_PENDING_COPY.unavailable,
      confirmed: false,
      cta: "alternatives",
    };
  }
  const consistent =
    price.state === "confirmed" &&
    price.confirmedAmountCLP !== null &&
    price.confirmedAmountCLP > 0 &&
    price.period !== null &&
    price.taxLabel !== null &&
    price.scopeConfirmed &&
    price.qualifier !== null;
  if (!consistent) {
    return {
      headline: PRICE_PENDING_COPY.price,
      sub: PRICE_PENDING_COPY.sub,
      accessibleLabel: `${PRICE_PENDING_COPY.price}. ${PRICE_PENDING_COPY.sub}`,
      confirmed: false,
      cta: "consult",
    };
  }
  const amount = `CLP $${clp.format(price.confirmedAmountCLP as number)}`;
  const headline = price.qualifier === "from" ? `Desde ${amount}` : amount;
  const period = PERIOD_TEXT[price.period as Exclude<ChargePeriod, null>];
  return {
    headline,
    sub: `${period} · ${price.taxLabel}`,
    accessibleLabel: `${headline}, ${period}, ${price.taxLabel}`,
    confirmed: true,
    cta: "request",
  };
}

export const ALL_PLANS_PENDING = [...AGENT_PLANS, ...WEB_PLANS].every(
  (plan) => renderPrice(plan.price).confirmed === false,
);
