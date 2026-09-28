import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";

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
 * Sin `lastModified` (GAP SEO-05): Google exige que represente una
 * modificación real, y hoy no tenemos fechas de contenido verificables por
 * ruta. Sin `priority`/`changefreq` (§9.3): Google no les da valor.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return STATIC_ROUTES.map((path) => ({ url: `${SITE_URL}${path === "/" ? "" : path}` }));
}
