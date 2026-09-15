import type { MetadataRoute } from "next";
import site from "@/lib/content";
import { SITE_URL } from "@/lib/site-url";

/**
 * Solo rutas públicas con página implementada. content/site.json.routes
 * declara /privacidad como alcance V1, pero esa página no existe todavía
 * (dato pendiente de Christian, WEB-CONTENT.md) — no se lista hasta que
 * exista, para no publicar una URL que 404ea.
 */
const IMPLEMENTED_KINDS = new Set([
  "home",
  "solutions-index",
  "solution",
  "cases-index",
  "case",
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
