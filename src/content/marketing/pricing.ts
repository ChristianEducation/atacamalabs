/**
 * Catálogo de precios — ATACAMA_LABS_PRECIOS_SPEC_V2_FINAL. Un único catálogo
 * alimenta Precios, Home y Páginas Web: los cambios de tarifa se hacen aquí y
 * en el spec, nunca en cada pantalla. Todo en CLP + IVA. Lety, el dólar de
 * referencia y los links de pago son internos y no viven en este archivo.
 *
 * Agentes: implementación una vez + plan mensual + consumo variable.
 * Páginas web: desarrollo una vez + hosting/mantenimiento mensual.
 */

import type { AgentCtaContext } from "@/lib/marketing/agent-cta";
import { diagnosticHref } from "@/lib/marketing/cta-context";

export type AgentPlanId = "esencial" | "operacion" | "escala";
export type WebPlanId = "landing" | "profesional" | "ecommerce";

/** Beneficio de octubre: nuevas implementaciones contratadas hasta esta fecha. */
export const OCTOBER_BENEFIT = {
  label: "Beneficio octubre",
  note: "Contrata hasta el 31/10/2026 y mantén esta mensualidad mientras continúes en el mismo plan.",
} as const;

/**
 * Agente adicional: mensualidad por cada agente que se suma a un plan (CLP + IVA).
 * ÚNICA fuente de verdad: Precios y el FAQ derivan el texto de esta constante.
 * No compite con la escalera de planes (Esencial + 2 = $287.000 > Operación $279.000).
 */
export const ADDITIONAL_AGENT_MONTHLY = 69000;

export const VAT_NOTE = "Todos los valores + IVA.";

interface PlanBase<Id extends string> {
  id: Id;
  name: string;
  description: string;
  badge?: string;
  featured?: boolean;
  /** Título del bloque de puntos clave («Funciones base», «Todo lo de …, más:»). */
  sectionLabel: string;
  /** Resumen visible en la tarjeta cerrada (4–6 puntos). */
  summary: readonly string[];
  /** Detalle completo bajo «Ver todo lo incluido». */
  details: readonly string[];
  detailsIntro?: string;
  /** Bloque «No incluye» / «Mantenimiento» bajo el detalle. */
  extra?: { title: string; items: readonly string[] };
  cta: string;
}

export interface AgentPlan extends PlanBase<AgentPlanId> {
  family: "agentes";
  /** Mensualidad vigente (octubre) y regular, en CLP + IVA. */
  monthly: number;
  monthlyRegular: number;
  /** Implementación de pago único; `setupFrom` cuando es «desde». */
  setup: number;
  setupFrom?: boolean;
  agents: string;
  credit: string;
}

export interface WebPlan extends PlanBase<WebPlanId> {
  family: "web";
  /** Desarrollo, siempre «desde». */
  development: number;
  hosting: number;
}

/**
 * El contexto de un CTA depende de dónde se pinta la tarjeta (Home, Agentes,
 * Precios, Páginas Web): el catálogo guarda el plan y cada pantalla informa su
 * página y su sección, así el mismo plan no viaja siempre como «precios».
 */
export const agentPlanContext = (plan: AgentPlan, page: string, section: string): AgentCtaContext => ({
  source_page: page,
  source_section: section,
  source_cta: `quiero-${plan.id}`,
  service: "agentes",
  plan: plan.id,
});

export const webPlanHref = (plan: WebPlan, page: string, section: string): string =>
  diagnosticHref({
    source_page: page,
    source_section: section,
    source_cta: `cotizar-${plan.id}`,
    service: "web",
    plan: plan.id,
  });

export const AGENT_PLANS: readonly AgentPlan[] = [
  {
    family: "agentes",
    id: "esencial",
    name: "Esencial",
    description:
      "Para empresas que quieren empezar a automatizar su operación con un agente inteligente conectado a sus herramientas.",
    monthly: 149000,
    monthlyRegular: 199000,
    setup: 297000,
    agents: "1",
    credit: "US$5",
    sectionLabel: "Funciones base",
    summary: [
      "1 agente inteligente",
      "Bandeja omnicanal",
      "Seguimientos y automatizaciones programadas",
      "+400 integraciones disponibles",
      "Plataforma de gestión",
      "US$5 de crédito IA mensual",
    ],
    details: [
      "1 agente inteligente",
      "Bandeja omnicanal",
      "Seguimiento y automatizaciones programadas",
      "+400 integraciones estándar disponibles",
      "API, HTTP y MCP",
      "Plataforma de gestión",
      "Configuración inicial del agente",
      "Instrucciones y conocimiento del negocio",
      "Captura y registro de información",
      "Handoff a una persona",
      "Agendamiento y acciones conectadas cuando formen parte del proceso",
      "Pruebas y puesta en marcha",
      "Soporte Atacama Labs",
      "US$5 de crédito IA mensual",
    ],
    extra: {
      title: "No incluye dentro del plan base",
      items: [
        "Integraciones financieras Chile",
        "Desarrollos especiales",
        "Servicios externos de pago",
        "Consumo variable adicional",
      ],
    },
    cta: "Quiero este plan",
  },
  {
    family: "agentes",
    id: "operacion",
    name: "Operación",
    badge: "Recomendado",
    featured: true,
    description:
      "Para empresas que quieren automatizar más procesos y coordinar varios agentes dentro de una misma operación.",
    monthly: 279000,
    monthlyRegular: 349000,
    setup: 497000,
    agents: "Hasta 3",
    credit: "US$15",
    sectionLabel: "Todo lo de Esencial, más:",
    summary: [
      "Hasta 3 agentes inteligentes",
      "Integraciones especiales",
      "Integraciones financieras Chile: SII, Previred y bancos",
      "US$15 de crédito IA mensual",
      "Soporte prioritario",
    ],
    detailsIntro: "Incluye todo lo de Esencial y además:",
    details: [
      "Hasta 3 agentes inteligentes",
      "Varios procesos o funciones trabajando en paralelo",
      "Agentes independientes o coordinados",
      "Integraciones especiales según alcance",
      "Integraciones financieras Chile: SII, Previred y bancos",
      "Flujos entre sistemas cuando formen parte de la implementación",
      "Soporte prioritario",
      "Ajustes y revisión de funcionamiento",
      "US$15 de crédito IA mensual",
    ],
    cta: "Quiero este plan",
  },
  {
    family: "agentes",
    id: "escala",
    name: "Escala",
    description:
      "Para operaciones que necesitan más agentes, más capacidad y automatización en distintas áreas de la empresa.",
    monthly: 399000,
    monthlyRegular: 499000,
    setup: 697000,
    setupFrom: true,
    agents: "Hasta 5",
    credit: "US$30",
    sectionLabel: "Todo lo de Operación, más:",
    summary: [
      "Hasta 5 agentes inteligentes",
      "Mayor capacidad operativa",
      "Más procesos trabajando en paralelo",
      "US$30 de crédito IA mensual",
    ],
    detailsIntro: "Incluye todo lo de Operación y además:",
    details: [
      "Hasta 5 agentes inteligentes",
      "Mayor capacidad operativa",
      "Más procesos y áreas trabajando en paralelo",
      "US$30 de crédito IA mensual",
    ],
    extra: { title: "Más de 5 agentes", items: ["Cotización a medida"] },
    cta: "Quiero este plan",
  },
];

export const WEB_PLANS: readonly WebPlan[] = [
  {
    family: "web",
    id: "landing",
    name: "Landing",
    description:
      "Para campañas, servicios o lanzamientos que necesitan una página clara, rápida y orientada a convertir.",
    development: 390000,
    hosting: 29900,
    sectionLabel: "Funciones base",
    summary: [
      "1 página",
      "Diseño personalizado y responsive",
      "Formulario / CTA",
      "SEO técnico base + analítica",
      "Dominio .cl por 1 año",
      "Hosting + SSL",
    ],
    details: [
      "1 página",
      "Diseño personalizado",
      "Responsive",
      "Formulario o CTA",
      "SEO técnico base",
      "Analítica esencial",
      "Optimización básica",
      "Publicación",
      "SSL",
      "Dominio .cl por 1 año",
      "Hosting administrado por Atacama",
    ],
    extra: {
      title: "Mantenimiento mensual",
      items: [
        "Hosting",
        "SSL",
        "Respaldos",
        "Monitoreo",
        "Actualizaciones técnicas",
        "Soporte",
        "1 solicitud menor de contenido al mes",
      ],
    },
    cta: "Cotizar Landing",
  },
  {
    family: "web",
    id: "profesional",
    name: "Web Profesional",
    badge: "Recomendada",
    featured: true,
    description:
      "Para empresas que necesitan una presencia completa, explicar bien lo que hacen y convertir visitas en oportunidades.",
    development: 690000,
    hosting: 49900,
    sectionLabel: "Todo lo de Landing, más:",
    summary: [
      "Hasta 5 páginas base",
      "Arquitectura y navegación completa",
      "Formularios e integraciones estándar",
      "SEO técnico + analítica",
      "Hasta 2 solicitudes menores al mes",
    ],
    detailsIntro: "Incluye todo lo de Landing y además:",
    details: [
      "Hasta 5 páginas base",
      "Arquitectura y navegación",
      "Formularios",
      "Integraciones estándar acordadas",
      "Optimización de rendimiento",
      "Hasta 2 solicitudes menores de contenido al mes",
    ],
    cta: "Cotizar Web Profesional",
  },
  {
    family: "web",
    id: "ecommerce",
    name: "Ecommerce",
    description:
      "Para empresas que quieren vender online con catálogo, pagos y administración conectados en una sola operación.",
    development: 990000,
    hosting: 89900,
    sectionLabel: "Todo lo de Web Profesional, más:",
    summary: [
      "Ecommerce completo",
      "Catálogo + carrito + checkout",
      "Pasarela de pago compatible",
      "Portal de administración",
      "Hasta 30 productos iniciales",
    ],
    detailsIntro: "Incluye todo lo de Web Profesional y además:",
    details: [
      "Catálogo",
      "Categorías",
      "Fichas de producto",
      "Carrito",
      "Checkout",
      "Una pasarela de pago compatible",
      "Configuración inicial de despacho",
      "Carga inicial de hasta 30 productos",
      "Portal de administración incluido",
    ],
    extra: {
      title: "Portal de administración",
      items: [
        "Productos",
        "Precios",
        "Stock",
        "Categorías",
        "Pedidos",
        "Estados de pedido",
        "Clientes",
        "Configuraciones principales",
        "Reportes/exportaciones contemplados en alcance",
      ],
    },
    cta: "Cotizar Ecommerce",
  },
];

/** Pesos chilenos con separador de miles: 149000 → «$149.000». */
export function clp(amount: number): string {
  return `$${new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(amount)}`;
}

/** Precio visible del agente adicional, derivado de `ADDITIONAL_AGENT_MONTHLY`. */
export function additionalAgentPrice() {
  return {
    amount: clp(ADDITIONAL_AGENT_MONTHLY),
    unit: "+ IVA / mes",
    label: `${clp(ADDITIONAL_AGENT_MONTHLY)} más IVA al mes por agente adicional`,
  };
}

/**
 * Líneas de precio de un plan, ya con el texto exacto del spec. La mensualidad de
 * agentes se muestra con el beneficio de octubre y el valor regular a su lado.
 */
export function agentPrice(plan: AgentPlan) {
  return {
    amount: clp(plan.monthly),
    unit: "+ IVA / mes",
    regular: `Regular: ${clp(plan.monthlyRegular)} / mes`,
    setup: `Implementación: ${plan.setupFrom ? "desde " : ""}${clp(plan.setup)} + IVA · pago único`,
    label: `${clp(plan.monthly)} más IVA al mes, implementación ${plan.setupFrom ? "desde " : ""}${clp(plan.setup)} más IVA, pago único`,
  };
}

export function webPrice(plan: WebPlan) {
  return {
    amount: `Desde ${clp(plan.development)}`,
    unit: "+ IVA",
    hosting: `Hosting + mantenimiento: ${clp(plan.hosting)} + IVA / mes`,
    label: `Desde ${clp(plan.development)} más IVA, hosting y mantenimiento ${clp(plan.hosting)} más IVA al mes`,
  };
}
