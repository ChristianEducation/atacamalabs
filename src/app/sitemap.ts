import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";
import { INDUSTRY_SLUGS } from "@/content/marketing/industries";
import { AGENT_ROLES } from "@/content/marketing/agents";
import { WHATSAPP_CHANNEL } from "@/content/marketing/agent-channels";

/**
 * Rutas públicas indexables — PRODUCTION_READINESS_SPEC_V1 §9.1. `/diagnostico`
 * es una pantalla de conversión (noindex,follow — ver su page.tsx) y queda
 * fuera del sitemap (GAP SEO-06); conserva sus links internos normales.
 */
const STATIC_ROUTES = [
  "/",
  "/agentes",
  "/plataforma",
  "/a-medida",
  "/paginas-web",
  "/precios",
  "/rubros",
  "/conocenos",
  "/privacidad",
  "/terminos",
] as const;

/**
 * Rutas hijas de Rubros y Agentes (SEO_GROWTH_SPEC_V1 §22): se arman desde las
 * mismas fuentes únicas que ya usan sus hubs y `generateStaticParams`, no se
 * listan a mano. Las comparativas/recursos de las Fases B/C quedan fuera
 * hasta que existan y estén listas para indexarse (§20).
 */
const INDUSTRY_ROUTES = INDUSTRY_SLUGS.map((slug) => `/rubros/${slug}`);
const AGENT_ROUTES = [...AGENT_ROLES.map((role) => `/agentes/${role.id}`), `/agentes/${WHATSAPP_CHANNEL.slug}`];

/**
 * Sin `lastModified` (GAP SEO-05): Google exige que represente una
 * modificación real, y hoy no tenemos fechas de contenido verificables por
 * ruta. Sin `priority`/`changefreq` (§9.3): Google no les da valor.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [...STATIC_ROUTES, ...INDUSTRY_ROUTES, ...AGENT_ROUTES].map((path) => ({
    url: `${SITE_URL}${path === "/" ? "" : path}`,
  }));
}
