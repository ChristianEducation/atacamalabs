import type { Metadata } from "next";
import Link from "next/link";
import { PlanComparison } from "@/components/marketing/pages/PlanComparison";
import { PricingGrid } from "@/components/marketing/ui/Pricing";
import { CTABlock, FAQ, SectionHeading } from "@/components/marketing/ui/Blocks";
import { AGENT_PLANS, WEB_PLANS } from "@/content/marketing/pricing";

export const metadata: Metadata = {
  title: "Planes y precios — Atacama Labs",
  description:
    "Compara los planes de agentes y los formatos web de Atacama Labs. Alcance, condiciones y próximos pasos para tu proyecto.",
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

export default function PricingPage() {
  return (
    <>
      <section className="mk-hero mk-hero--inner mk-price-hero" aria-labelledby="page-title">
        <div className="mk-container mk-price-hero__inner">
          <p className="mk-eyebrow">PLANES Y PRECIOS</p>
          <h1 id="page-title" className="mk-h1">
            Un alcance claro para empezar.
          </h1>
          <p className="mk-lead">Compara las opciones y conversemos sobre lo que necesita tu operación.</p>
          <div className="mk-price-hero__pills">
            <a href="#agentes" className="mk-pill mk-pill--link">
              Agentes
            </a>
            <a href="#web" className="mk-pill mk-pill--link">
              Páginas Web
            </a>
          </div>
        </div>
      </section>

      <section id="agentes" className="mk-section mk-paper" aria-labelledby="agents-title">
        <div className="mk-container">
          <SectionHeading
            id="agents-title"
            title="Agentes para tu operación."
            lead="Los planes cambian por cantidad de agentes, volumen, soporte y complejidad. Comercial, Cobranza y Finanzas son formas de empezar, no funciones bloqueadas."
          />
          <PricingGrid plans={AGENT_PLANS} featuresLimit={6} />
          <p className="mk-ag-cta">
            <Link href="#comparacion" className="mk-link">
              Ver comparación
            </Link>
          </p>
        </div>
      </section>

      <section id="comparacion" className="mk-section--md" aria-labelledby="cmp-title">
        <div className="mk-container">
          <SectionHeading id="cmp-title" title="Compara el alcance." lead="Las condiciones acordadas acompañan cada plan." />
          <PlanComparison plans={AGENT_PLANS} />
        </div>
      </section>

      <section id="web" className="mk-section mk-paper" aria-labelledby="web-title">
        <div className="mk-container">
          <SectionHeading
            id="web-title"
            title="Una web según tu objetivo."
            lead="Landing, sitio corporativo o ecommerce: distintos recorridos, un mismo cuidado."
          />
          <PricingGrid plans={WEB_PLANS} featuresLimit={6} />
          <p className="mk-ag-cta">
            <Link href="/paginas-web#tipos" className="mk-link">
              Ver formatos
            </Link>
          </p>
        </div>
      </section>

      <section className="mk-section--md" aria-labelledby="faq-title">
        <div className="mk-container mk-ind-faq">
          <SectionHeading id="faq-title" title="Lo que conviene aclarar antes de empezar." />
          <FAQ items={FAQS} />
          <p className="mk-ag-cta">
            <Link href="/diagnostico" className="mk-link">
              Consulta específica
            </Link>
          </p>
        </div>
      </section>

        <CTABlock
          title="¿No sabes por dónde empezar?"
          body="Cuéntanos tu proceso y revisamos una primera solución."
          cta={{ label: "Agendar diagnóstico", href: "/diagnostico" }}
          secondary={{ label: "Automatizaciones a Medida", href: "/a-medida" }}
        />
    </>
  );
}
