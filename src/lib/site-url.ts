import site from "@/lib/content";

/**
 * Origen canónico. content/site.json.publicSettings.canonicalOrigin es null
 * hasta que el dominio esté bajo control verificado (I04/I01) — mientras
 * tanto se usa NEXT_PUBLIC_SITE_URL (build/deploy) o localhost en dev.
 * No inventar que atacamalabs.cl ya está publicando: esto solo ancla URLs
 * relativas (OG, sitemap); confirmar contra el dominio real antes de 4.2.
 */
export const SITE_URL =
  site.publicSettings.canonicalOrigin ??
  process.env.NEXT_PUBLIC_SITE_URL ??
  "http://localhost:3000";
