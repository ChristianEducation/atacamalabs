/**
 * Navegación comercial — spec/02-SITEMAP-ROUTES.md B2 y spec/06-SHELL-UTILITY.md N1/N2.
 * Las rutas y el menú salen de estos registries: no hay enlaces a páginas inexistentes.
 */

export type ServiceId =
  | "agentes"
  | "comercial"
  | "cobranza"
  | "administrativo-financiero"
  | "a-medida"
  | "web";

export interface ServiceNav {
  id: ServiceId;
  label: string;
  href: string;
  blurb: string;
}

/** Orden exacto de B2. Comercial/Cobranza/Admin-Financiero son empaquetados, no límites técnicos. */
export const SERVICES: readonly ServiceNav[] = [
  {
    id: "agentes",
    label: "Agentes Inteligentes",
    href: "/agentes",
    blurb: "Conversan, consultan información y ejecutan acciones en tus herramientas.",
  },
  {
    id: "comercial",
    label: "Agente Comercial",
    href: "/comercial",
    blurb: "Convierte conversaciones en oportunidades y siguientes pasos.",
  },
  {
    id: "cobranza",
    label: "Agente de Cobranza",
    href: "/cobranza",
    blurb: "Detecta pendientes, contacta con contexto y mantiene el seguimiento al día.",
  },
  {
    id: "administrativo-financiero",
    label: "Agente Administrativo/Financiero",
    href: "/administrativo-financiero",
    blurb: "Respuestas, alertas y tareas administrativas con contexto.",
  },
  {
    id: "a-medida",
    label: "Automatizaciones a Medida",
    href: "/a-medida",
    blurb: "Conectamos sistemas y construimos el flujo alrededor de tu proceso.",
  },
  {
    id: "web",
    label: "Páginas Web",
    href: "/paginas-web",
    blurb: "Experiencias web claras, rápidas y conectables.",
  },
] as const;

export interface IndustryNav {
  id: string;
  label: string;
  href: string;
}

/** Siete rubros, en el orden del footer N2. Educación primero. */
export const INDUSTRIES: readonly IndustryNav[] = [
  { id: "educacion", label: "Educación", href: "/rubros/educacion" },
  { id: "salud", label: "Clínicas/Salud", href: "/rubros/salud" },
  { id: "inmobiliarias", label: "Inmobiliarias", href: "/rubros/inmobiliarias" },
  { id: "gimnasios", label: "Gimnasios", href: "/rubros/gimnasios" },
  { id: "retail-ecommerce", label: "Retail/Ecommerce", href: "/rubros/retail-ecommerce" },
  {
    id: "servicios-profesionales",
    label: "Abogados/Servicios profesionales",
    href: "/rubros/servicios-profesionales",
  },
  { id: "servicios-b2b", label: "Servicios B2B", href: "/rubros/servicios-b2b" },
] as const;

export const NAV_TOP = {
  platform: { label: "Plataforma", href: "/plataforma" },
  agents: { label: "Agentes", href: "/agentes" },
  services: { label: "Servicios" },
  industries: { label: "Rubros", href: "/rubros" },
  about: { label: "Conócenos", href: "/nosotros" },
  pricing: { label: "Precios", href: "/precios" },
  cta: { label: "Agendar diagnóstico", href: "/diagnostico" },
} as const;

export const SERVICE_ROUTES: readonly string[] = SERVICES.filter(
  (s) => s.id !== "agentes",
).map((s) => s.href);

export const BRAND = {
  wordmark: "ATACAMA LABS",
  tagline: "Agentes, automatizaciones y sistemas para procesos reales.",
  origin: "Desde Antofagasta, para empresas de Chile.",
} as const;

/** CTA común B2. */
export const COMMON_CTA = {
  title: "Cuéntanos qué proceso quieres mejorar.",
  body: "Lo revisamos contigo y definimos el siguiente paso.",
} as const;
