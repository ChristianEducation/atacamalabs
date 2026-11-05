import site from "@/lib/content";

/**
 * Origen canónico: `content/site.json.publicSettings.canonicalOrigin` (dominio
 * publicado, https://atacamalabs.cl). NEXT_PUBLIC_SITE_URL o localhost solo
 * como respaldo si esa clave se vacía (p. ej. un entorno de pruebas).
 * Ancla las URLs absolutas: sitemap, robots, canonical y Open Graph.
 */
export const SITE_URL =
  site.publicSettings.canonicalOrigin ??
  process.env.NEXT_PUBLIC_SITE_URL ??
  "http://localhost:3000";
