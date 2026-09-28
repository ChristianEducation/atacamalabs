import type { Metadata } from "next";
import site from "@/lib/content";
import { SITE_URL } from "@/lib/site-url";

/**
 * Helper único de metadata — PRODUCTION_READINESS_SPEC_V1 §5. Cada página
 * comercial llama a `pageMetadata()` en vez de armar su propio bloque de
 * `openGraph`/`twitter`/canonical a mano, para que todas las rutas queden
 * consistentes (GAP SEO-01).
 */
export interface PageMetadataInput {
  /** Título de la pestaña y de `og:title`/`twitter:title`. Sin sufijo: agregarlo ya en el texto (ej. "… | Atacama Labs"). */
  title: string;
  description: string;
  /** Ruta relativa, ej. "/precios" o "/" para Home. */
  path: string;
  /** true para páginas que no deben indexarse (ej. /diagnostico). */
  noindex?: boolean;
}

export function pageMetadata({ title, description, path, noindex }: PageMetadataInput): Metadata {
  const url = path === "/" ? SITE_URL : `${SITE_URL}${path}`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      type: "website",
      locale: "es_CL",
      siteName: site.brand.name,
      url,
      title,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}
