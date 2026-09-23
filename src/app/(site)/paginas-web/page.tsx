import type { Metadata } from "next";
import { ProcessSteps } from "@/components/marketing/pages/Common";
import { HeroShell } from "@/components/marketing/pages/HeroShell";
import { WebBrowserAbstract } from "@/components/marketing/pages/WebBrowserAbstract";
import { PricingGrid } from "@/components/marketing/ui/Pricing";
import { CTABlock, SectionHeading } from "@/components/marketing/ui/Blocks";
import { WEB_META, WEB_STEPS } from "@/content/marketing/web";
import { WEB_PLANS } from "@/content/marketing/pricing";

export const metadata: Metadata = {
  title: "Páginas Web — Atacama Labs",
  description: WEB_META,
  alternates: { canonical: "/paginas-web" },
};

/**
 * /paginas-web (V3.0.1 §11 + V3.3 §14, W1–W6). Hero Gradient → Formatos
 * (Paper) → Proceso (Blue Mist) → Conexiones (Sand) → CTA (Deep Tech). Puede
 * tener personalidad propia, pero sin heredar la metáfora de misiones de
 * /agentes. Sin galería de casos y sin precio inventado.
 */
export default function WebsitesPage() {
  return (
    <>
      <HeroShell
        size="m"
        eyebrow="PÁGINAS WEB"
        title={
          <>
            Una web que <span className="mk-hero__accent">trabaja</span>.
          </>
        }
        lead="Diseñamos landing pages, sitios corporativos y ecommerce claros, rápidos y pensados para llevar al visitante al siguiente paso."
        actions={[{ label: "Cotizar mi web", href: "/diagnostico?necesidad=web" }]}
        visual={<WebBrowserAbstract />}
      />

      <section id="formatos" className="mk-section mk-t-paper" aria-labelledby="w2-title">
        <div className="mk-container">
          <SectionHeading id="w2-title" title="Tres formatos." />
          <PricingGrid plans={WEB_PLANS} featuresLimit={4} />
        </div>
      </section>

      <section className="mk-section--md mk-t-mist" aria-labelledby="w4-title">
        <div className="mk-container">
          <SectionHeading id="w4-title" title="Del contenido a una web publicada." />
          <ProcessSteps steps={WEB_STEPS} columns={5} />
        </div>
      </section>

      <section className="mk-section--md mk-t-sand" aria-labelledby="w5-title">
        <div className="mk-container mk-close">
          <SectionHeading
            id="w5-title"
            center
            title="Puede ser el comienzo del proceso."
            lead="Tu web puede iniciar un proceso: enviar un lead a un agente, una agenda, un CRM u otro sistema."
          />
        </div>
      </section>

      <CTABlock
        title="Cotiza tu web."
        body="Cuéntanos el objetivo y el contenido disponible; revisamos alcance y plazo contigo."
        cta={{ label: "Cotizar mi web", href: "/diagnostico?necesidad=web" }}
      />
    </>
  );
}
