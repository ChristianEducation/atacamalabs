import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";

/**
 * Rutas públicas implementadas — spec V3.0 §4. Comercial/Cobranza/
 * Administrativo-Financiero y Rubros ya no son páginas propias (redirigen).
 * /privacidad no se lista hasta que exista contenido aprobado.
 */
const STATIC_ROUTES = [
  "/",
  "/agentes",
  "/plataforma",
  "/a-medida",
  "/paginas-web",
  "/precios",
  "/conocenos",
  "/diagnostico",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return STATIC_ROUTES.map((path) => ({ url: `${SITE_URL}${path === "/" ? "" : path}`, lastModified: new Date() }));
}
