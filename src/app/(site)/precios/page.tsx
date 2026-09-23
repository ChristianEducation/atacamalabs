import type { Metadata } from "next";
import { HeroShell } from "@/components/marketing/pages/HeroShell";
import { PricingGhost } from "@/components/marketing/pages/PricingGhost";
import { PricingGrid } from "@/components/marketing/ui/Pricing";
import { ButtonLink } from "@/components/marketing/ui/Button";
import { CTABlock, FAQ, SectionHeading } from "@/components/marketing/ui/Blocks";
import { AGENT_PLANS, WEB_PLANS } from "@/content/marketing/pricing";

export const metadata: Metadata = {
  title: "Precios — Atacama Labs",
  description:
    "Compara planes de agentes y formatos web. Si tu caso necesita algo distinto, lo definimos contigo.",
  alternates: { canonical: "/precios" },
};

const FAQS = [
  {
    question: "¿Qué incluye cada plan?",
    answer: "Las inclusiones confirmadas aparecen en su ficha. Lo pendiente se define en propuesta.",
  },
  {
    question: "¿Hay configuración inicial?",
    answer: "Se informa junto a la tarifa cuando aplique; no se presume incluida.",
  },
  {
    question: "¿Cómo se define Comercial, Cobranza o Administrativo/Financiero?",
    answer:
      "Son configuraciones iniciales del mismo producto de agentes. Revisamos cantidad, uso, integraciones y alcance para proponer el plan correspondiente.",
  },
  {
    question: "¿Y una solución a medida?",
    answer: "La cotizamos según proceso, integraciones e interfaz necesaria.",
  },
  {
    question: "¿La web tiene costos recurrentes?",
    answer: "Infraestructura, servicios externos y acompañamiento se detallan en las condiciones aprobadas.",
  },
  {
    question: "¿Puedo ampliar el alcance?",
    answer: "Lo revisamos contigo y dejamos por escrito el cambio.",
  },
] as const;

/**
 * /precios (V3.0.1 §13 + V3.3 §15): funcional, sin espectáculo, pero con el
 * mismo ritmo de color del resto del sitio. Hero Gradient → Agentes (Paper)
 * → Web (Blue Mist) → A Medida (Deep Tech) → FAQ (Sand) → CTA. Solo dos
 * familias con precio público; A Medida se cotiza. Sin números en el hero.
 */
export default function PricingPage() {
  return (
    <>
      <HeroShell
        size="m"
        eyebrow="PRECIOS"
        title={
          <>
            Empieza con lo que necesitas <span className="mk-hero__accent">hoy</span>.
          </>
        }
        lead="Compara planes de agentes y formatos web. Si tu caso necesita algo distinto, lo definimos contigo."
        visual={<PricingGhost />}
      />

      <section id="agentes" className="mk-section mk-t-paper" aria-labelledby="agents-title">
        <div className="mk-container">
          <SectionHeading id="agents-title" title="Agentes." />
          <PricingGrid plans={AGENT_PLANS} featuresLimit={6} />
        </div>
      </section>

      <section id="web" className="mk-section mk-t-mist" aria-labelledby="web-title">
        <div className="mk-container">
          <SectionHeading id="web-title" title="Páginas Web." />
          <PricingGrid plans={WEB_PLANS} featuresLimit={6} />
        </div>
      </section>

      <section className="mk-section--md mk-t-deep" aria-labelledby="medida-title">
        <div className="mk-container mk-close">
          <SectionHeading
            id="medida-title"
            center
            title="A Medida."
            lead="El alcance depende del proceso, las integraciones y la interfaz necesaria."
          />
          <p style={{ marginTop: 24, textAlign: "center" }}>
            <ButtonLink href="/diagnostico?necesidad=a-medida" arrow>
              Cotizar proyecto
            </ButtonLink>
          </p>
        </div>
      </section>

      <section className="mk-section--md mk-t-sand" aria-labelledby="faq-title">
        <div className="mk-container mk-close">
          <SectionHeading id="faq-title" title="Lo que conviene aclarar antes de empezar." />
          <FAQ items={FAQS} />
        </div>
      </section>

      <CTABlock
        title="¿No sabes por dónde empezar?"
        body="Cuéntanos tu proceso y revisamos una primera solución."
        cta={{ label: "Agendar diagnóstico", href: "/diagnostico" }}
      />
    </>
  );
}
