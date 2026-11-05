/**
 * Navegación comercial — ATACAMA_LABS_FINAL_MINIMAL_WEB_SPEC_V3_0_1 §3.
 * Topbar (RUBROS_Y_FOOTER_SPEC_V1 §3): Plataforma · Agentes · Servicios (A Medida,
 * Páginas Web) · Rubros · Conócenos · Precios. Comercial, Cobranza y
 * Administrativo/Financiero viven dentro de /agentes.
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
export const SERVICES_MENU: readonly ServiceNav[] = SERVICES.filter((s) => s.id === "a-medida" || s.id === "web");

export const NAV_TOP = {
  platform: { label: "Plataforma", href: "/plataforma" },
  agents: { label: "Agentes", href: "/agentes" },
  services: { label: "Servicios" },
  industries: { label: "Rubros", href: "/rubros" },
  about: { label: "Conócenos", href: "/conocenos" },
  pricing: { label: "Precios", href: "/precios" },
} as const;

export const SERVICE_ROUTES: readonly string[] = SERVICES.map((s) => s.href);

/** Footer global (RUBROS_Y_FOOTER_SPEC_V1 §25): cierre de marca, sin CTA comercial. */
export const FOOTER_BRAND = {
  tagline: "Agentes que trabajan.",
  sub: "Conectados a tus herramientas, datos y procesos.",
} as const;

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
