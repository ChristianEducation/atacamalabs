import type { Metadata } from "next";
import { PageHero } from "@/components/marketing/pages/Common";
import { PricingGrid } from "@/components/marketing/ui/Pricing";
import { ButtonLink } from "@/components/marketing/ui/Button";
import { SectionHeading } from "@/components/marketing/ui/Blocks";
import { AGENT_PLANS, WEB_PLANS } from "@/content/marketing/pricing";

export const metadata: Metadata = {
  title: "Precios — Atacama Labs",
  description:
    "Compara planes de agentes y formatos web. Si tu caso necesita algo distinto, lo definimos contigo.",
  alternates: { canonical: "/precios" },
};

/**
 * /precios (spec V3.0 §13): funcional, limpia, sin espectáculo. Solo dos
 * familias con precio público (Agentes, Páginas Web); A Medida se cotiza.
 * Sin comparador ni FAQ — no están en la estructura V3.0.
 */
export default function PricingPage() {
  return (
    <>
      <PageHero
        eyebrow="PRECIOS"
        title="Empieza con lo que necesitas hoy."
        lead="Compara planes de agentes y formatos web. Si tu caso necesita algo distinto, lo definimos contigo."
        center
      />

      <section id="agentes" className="mk-section mk-paper" aria-labelledby="agents-title">
        <div className="mk-container">
          <SectionHeading id="agents-title" title="Agentes." />
          <PricingGrid plans={AGENT_PLANS} featuresLimit={6} />
        </div>
      </section>

      <section id="web" className="mk-section" aria-labelledby="web-title">
        <div className="mk-container">
          <SectionHeading id="web-title" title="Páginas Web." />
          <PricingGrid plans={WEB_PLANS} featuresLimit={6} />
        </div>
      </section>

      <section className="mk-section--md mk-paper" aria-labelledby="medida-title">
        <div className="mk-container mk-close">
          <SectionHeading
            id="medida-title"
            center
            title="A Medida."
            lead="El alcance depende del proceso, las integraciones y la interfaz necesaria."
          />
          <p style={{ marginTop: 24 }}>
            <ButtonLink href="/diagnostico?necesidad=a-medida" arrow>
              Cotizar proyecto
            </ButtonLink>
          </p>
        </div>
      </section>
    </>
  );
}
