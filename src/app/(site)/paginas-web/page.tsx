import type { Metadata } from "next";
import { HeroShell } from "@/components/marketing/pages/HeroShell";
import { WebsiteHeroBrowser } from "@/components/marketing/pages/WebsiteHeroBrowser";
import { WebsitePlans } from "@/components/marketing/pages/WebsitePlans";
import { WebsiteConnectionScene } from "@/components/marketing/pages/WebsiteConnectionScene";
import { WebsiteFaq, WebsiteIncludes, WebsiteProcess } from "@/components/marketing/pages/WebsiteSections";
import { SoftCTA } from "@/components/marketing/pages/HomeCTA";
import { WEB_META } from "@/content/marketing/web";
import { WEB_CTA } from "@/content/marketing/web-page";

export const metadata: Metadata = {
  title: "Páginas Web — Atacama Labs",
  description: WEB_META,
  alternates: { canonical: "/paginas-web" },
};

/**
 * /paginas-web — ATACAMA_LABS_PAGINAS_WEB_SPEC_V1 §3. Orden: Hero (browser que
 * se construye) → Tres formatos → Puede ser el comienzo del proceso → Qué
 * incluye → Proceso → FAQ → CTA. «Trabajo real» (§9) queda fuera hasta contar
 * con casos y capturas verificados.
 */
export default function WebsitesPage() {
  return (
    <>
      <HeroShell
        size="l"
        className="mk-hero--web"
        eyebrow="PÁGINAS WEB"
        title={
          <>
            Una web que <span className="mk-hero__accent">trabaja</span>.
          </>
        }
        lead="Diseñamos landing pages, sitios corporativos y ecommerce claros, rápidos y pensados para llevar al visitante al siguiente paso."
        actions={[
          { label: "Cotizar mi web", href: "/diagnostico?necesidad=web" },
          { label: "Ver planes", href: "#formatos", variant: "secondary" },
        ]}
        visual={<WebsiteHeroBrowser />}
      />
      <WebsitePlans />
      <WebsiteConnectionScene />
      <WebsiteIncludes />
      <WebsiteProcess />
      <WebsiteFaq />
      <SoftCTA titleId="web-cta-title" title={WEB_CTA.title} body={WEB_CTA.body} primary={WEB_CTA.cta} />
    </>
  );
}
