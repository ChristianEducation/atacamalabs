import type { MetadataRoute } from "next";
import site from "@/lib/content";
import { SITE_URL } from "@/lib/site-url";

/**
 * Solo rutas públicas con página implementada. content/site.json.routes
 * declara /privacidad como alcance V1, pero esa página no existe todavía
 * (dato pendiente de Christian, WEB-CONTENT.md) — no se lista hasta que
 * exista, para no publicar una URL que 404ea.
 *
 * "cases-index"/"case" (/proyectos, /proyectos/[slug]) quedan fuera desde
 * 2026-09-17: decisión explícita de Christian de sacar casos/proyectos del
 * flujo público/comercial. Las rutas siguen existiendo técnicamente (sin
 * enlaces entrantes) y llevan robots:{index:false} — no se listan aquí para
 * no promoverlas a buscadores.
 */
const IMPLEMENTED_KINDS = new Set([
  "home",
  "agents",
  "solutions-index",
  "solution",
  "process",
  "pricing",
  "about",
  "contact",
  "booking",
]);

export default function sitemap(): MetadataRoute.Sitemap {
  return site.routes
    .filter((route) => IMPLEMENTED_KINDS.has(route.kind))
    .map((route) => ({
      url: `${SITE_URL}${route.path}`,
      lastModified: new Date(),
    }));
}
