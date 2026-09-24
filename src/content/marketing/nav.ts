/**
 * Navegación comercial — ATACAMA_LABS_FINAL_MINIMAL_WEB_SPEC_V3_0_1 §3.
 * Topbar: Plataforma · Agentes · Servicios (A Medida, Páginas Web) · Precios · Conócenos.
 * Rubros, Comercial, Cobranza y Administrativo/Financiero ya no son páginas
 * principales ni aparecen en el topbar (viven dentro de /agentes o redirigen).
 */

export type ServiceId = "agentes" | "plataforma" | "a-medida" | "web";

export interface ServiceNav {
  id: ServiceId;
  label: string;
  href: string;
  blurb: string;
}

/** Catálogo completo, usado por RelatedServices; el dropdown del topbar usa SERVICES_MENU. */
export const SERVICES: readonly ServiceNav[] = [
  {
    id: "agentes",
    label: "Agentes",
    href: "/agentes",
    blurb: "Conversan, consultan información y ejecutan acciones en tus herramientas.",
  },
  {
    id: "plataforma",
    label: "Plataforma",
    href: "/plataforma",
    blurb: "Conversaciones, contactos y próximos pasos en un mismo lugar.",
  },
  {
    id: "a-medida",
    label: "A Medida",
    href: "/a-medida",
    blurb: "Sistemas, integraciones y automatizaciones alrededor de tu proceso.",
  },
  {
    id: "web",
    label: "Páginas Web",
    href: "/paginas-web",
    blurb: "Una web que trabaja: clara, rápida y conectable.",
  },
] as const;

/** Dropdown «Servicios» del topbar (spec V3.0 §3.1): solo A Medida y Páginas Web. */
export const SERVICES_MENU: readonly ServiceNav[] = SERVICES.filter(
  (s) => s.id === "a-medida" || s.id === "web",
);

export interface IndustryNav {
  id: string;
  label: string;
  href: string;
}

/**
 * Rubros: retirados de la navegación (V3.0 §3.2/§4). Se conserva el registro
 * por si se reactivan como landings de campaña; ningún componente activo lo usa.
 */
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
  about: { label: "Conócenos", href: "/conocenos" },
  pricing: { label: "Precios", href: "/precios" },
} as const;

/**
 * CTA persistente del topbar (spec §3.1/§6): pasa a agentCta() en
 * lib/marketing/public-config.ts, que decide entre «Habla con nuestro
 * agente» (embed listo) o el fallback «Agendar diagnóstico».
 */

export const SERVICE_ROUTES: readonly string[] = SERVICES.map((s) => s.href);

export const BRAND = {
  wordmark: "ATACAMA LABS",
  tagline: "Agentes, automatizaciones y sistemas para procesos reales.",
  origin: "Desde Antofagasta, para empresas de Chile.",
} as const;

/** CTA común. */
export const COMMON_CTA = {
  title: "Cuéntanos qué proceso quieres mejorar.",
  body: "Lo revisamos contigo y definimos el siguiente paso.",
} as const;
