import type { Metadata } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";
import site from "@/lib/content";
import { SITE_URL } from "@/lib/site-url";
import "../styles/tokens.css";
import "../styles/shell.css";
import "../styles/ui.css";
import "../styles/demos.css";
import "../styles/pages.css";
import "../styles/inner.css";
import "../styles/lety.css";

/**
 * Fuentes autoalojadas (spec C2): Newsreader (títulos, 500 roman; cursiva 500
 * solo en una palabra del hero) + DM Sans (UI y cuerpo). Variables oficiales
 * WOFF2 subset latino (incluye español); licencias OFL junto a los archivos.
 */
const newsreader = localFont({
  src: [
    { path: "./fonts/Newsreader-latin-wght.woff2", style: "normal", weight: "200 800" },
    { path: "./fonts/Newsreader-latin-wght-italic.woff2", style: "italic", weight: "200 800" },
  ],
  variable: "--font-newsreader",
  display: "swap",
  fallback: ["Georgia", "serif"],
});

const dmSans = localFont({
  src: [{ path: "./fonts/DMSans-latin-wght.woff2", style: "normal", weight: "100 1000" }],
  variable: "--font-dm-sans",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

const title = "Atacama Labs — Agentes que trabajan en tu empresa";
const description =
  "Agentes que realmente trabajan en tu empresa: conversan, consultan información, actualizan sistemas y ejecutan procesos conectados a tus herramientas.";

export const metadata: Metadata = {
  // Preview/sin dominio canónico verificado: no indexar (spec N4).
  robots:
    !site.publicSettings.canonicalOrigin || process.env.VERCEL_ENV === "preview"
      ? { index: false, follow: false }
      : undefined,
  metadataBase: new URL(SITE_URL),
  title: { default: title, template: "%s" },
  description,
  openGraph: {
    type: "website",
    locale: "es_CL",
    siteName: site.brand.name,
    title,
    description,
  },
  twitter: { card: "summary_large_image", title, description },
};

/**
 * JSON-LD Organization — solo datos reales verificados. Sin sameAs/url/email
 * mientras publicSettings.* siga en null; sin Review, AggregateRating, Product
 * ni Offer (precios pendientes).
 */
function organizationJsonLd() {
  const settings: Record<string, string | null> = site.publicSettings;
  const sameAs = [settings.linkedinCompanyUrl, settings.instagramUrl, settings.githubUrl].filter(
    (v): v is string => Boolean(v),
  );
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: site.brand.name,
    ...(settings.canonicalOrigin ? { url: settings.canonicalOrigin } : {}),
    ...(settings.contactEmail ? { email: settings.contactEmail } : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
  };
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-CL" className={`${newsreader.variable} ${dmSans.variable}`}>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
        />
        {children}
      </body>
    </html>
  );
}
