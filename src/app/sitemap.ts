import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";
import { INDUSTRY_LIST } from "@/content/marketing/industries";

/**
 * Solo rutas públicas implementadas (spec B1). /privacidad no se lista hasta
 * que exista contenido aprobado; /casos y /proyectos ya no existen (redirigen).
 */
const STATIC_ROUTES = [
  "/",
  "/agentes",
  "/comercial",
  "/cobranza",
  "/administrativo-financiero",
  "/a-medida",
  "/paginas-web",
  "/plataforma",
  "/rubros",
  "/nosotros",
  "/precios",
  "/diagnostico",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [...STATIC_ROUTES, ...INDUSTRY_LIST.map((i) => `/rubros/${i.slug}`)];
  return paths.map((path) => ({ url: `${SITE_URL}${path === "/" ? "" : path}`, lastModified: new Date() }));
}
