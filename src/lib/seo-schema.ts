import site from "@/lib/content";
import { SITE_URL } from "@/lib/site-url";

/**
 * JSON-LD Organization + WebSite — PRODUCTION_READINESS_SPEC_V1 §7. Antes
 * vivía en el root layout y se repetía en cada página (GAP SEO-02); ahora se
 * renderiza una sola vez, en Home. Solo datos reales verificados: sin
 * dirección, RUT, teléfono ni perfiles sociales mientras `publicSettings.*`
 * siga en null.
 */
export function organizationJsonLd() {
  const settings: Record<string, string | null> = site.publicSettings;
  const sameAs = [settings.linkedinCompanyUrl, settings.instagramUrl, settings.githubUrl].filter((v): v is string =>
    Boolean(v),
  );
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: site.brand.name,
    // Variantes reales del nombre (SEO_GROWTH_SPEC_V1 §3): ayuda a buscadores a
    // asociar la escritura sin espacio y el dominio a la misma entidad.
    alternateName: ["AtacamaLabs", "atacamalabs.cl"],
    ...(settings.canonicalOrigin ? { url: settings.canonicalOrigin } : {}),
    logo: `${SITE_URL}/brand/social-avatar-1024.png`,
    ...(settings.contactEmail ? { email: settings.contactEmail } : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
  };
}

/** §7.2 — comunica el nombre preferido del sitio a los buscadores. */
export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: site.brand.name,
    url: `${SITE_URL}/`,
  };
}

/**
 * BreadcrumbList (SEO_GROWTH_SPEC_V1 §4) — para páginas hijas de Rubros y
 * Agentes. `items` es la jerarquía completa incluyendo Home, en orden;
 * `path` es relativo (ej. "/rubros/salud"). No reemplaza a Organization/WebSite,
 * que solo viven en Home.
 */
export function breadcrumbJsonLd(items: readonly { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.path === "/" ? SITE_URL : `${SITE_URL}${item.path}`,
    })),
  };
}
