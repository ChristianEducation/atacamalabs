import type { Metadata } from "next";
import { Manrope, Inter } from "next/font/google";
import "./globals.css";
import site from "@/lib/content";
import { SITE_URL } from "@/lib/site-url";

const manrope = Manrope({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const title = "Atacama Labs — Software, sistemas y automatización para empresas";
const description =
  "Atacama Labs: software, sistemas y automatización para empresas, desde Antofagasta.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title,
  description,
  openGraph: {
    type: "website",
    locale: "es_CL",
    siteName: site.brand.name,
    title,
    description,
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

/**
 * JSON-LD Organization — solo campos verificados hoy (nombre, descriptor,
 * origen y logo). sameAs/url/email quedan fuera mientras
 * publicSettings.* siga en null (I01/I04); no fabricar perfiles/URLs.
 */
function organizationJsonLd() {
  const sameAs = (
    [
      site.publicSettings.linkedinCompanyUrl,
      site.publicSettings.instagramUrl,
      site.publicSettings.githubUrl,
    ] as (string | null)[]
  ).filter((v): v is string => Boolean(v));

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: site.brand.name,
    description: site.brand.descriptor,
    ...(site.publicSettings.canonicalOrigin
      ? { url: site.publicSettings.canonicalOrigin }
      : {}),
    logo: `${SITE_URL}/brand/logo-mark.svg`,
    ...(site.publicSettings.contactEmail
      ? { email: site.publicSettings.contactEmail }
      : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
  };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${manrope.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
        />
        {children}
      </body>
    </html>
  );
}
