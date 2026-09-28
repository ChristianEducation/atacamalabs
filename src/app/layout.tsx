import type { Metadata } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";
import site from "@/lib/content";
import { SITE_URL } from "@/lib/site-url";
import { Analytics } from "@/components/marketing/analytics/Analytics";
import "../styles/tokens.css";
import "../styles/shell.css";
import "../styles/ui.css";
import "../styles/demos.css";
import "../styles/pages.css";
import "../styles/inner.css";
import "../styles/lety.css";
import "../styles/v3.css";
import "../styles/section-themes.css";
import "../styles/hero-shell.css";
import "../styles/home.css";
import "../styles/home-selector.css";
import "../styles/web.css";
import "../styles/custom.css";
import "../styles/services-menu.css";
import "../styles/agents.css";
import "../styles/platform.css";
import "../styles/precios.css";
import "../styles/about.css";
import "../styles/diagnostic.css";
import "../styles/legal.css";
import "../styles/rubros.css";
import "../styles/analytics.css";

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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-CL" className={`${newsreader.variable} ${dmSans.variable}`}>
      <body>
        <Analytics />
        {children}
      </body>
    </html>
  );
}
