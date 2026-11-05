import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Breadcrumb } from "./Breadcrumb";
import { PageHero } from "./Common";
import { SectionHeading, FAQ } from "../ui/Blocks";
import { AgentControl } from "./AgentControl";
import { SoftCTA } from "./HomeCTA";
import { INDUSTRY_LIST } from "@/content/marketing/industries";
import type { IndustrySlug } from "@/content/marketing/industries";
import { diagnosticHref, interestForRole, type Interest } from "@/lib/marketing/cta-context";

export interface AgentLandingContent {
  slug: string;
  tab: string;
  h1: string;
  intro: string;
  /** Features del rol o capabilities del canal — mismo listado que ya usa /agentes. */
  bullets: readonly string[];
  relatedIndustries: readonly IndustrySlug[];
  faq: readonly { question: string; answer: string }[];
}

/** Convierte el slug de la landing (rol o "whatsapp") al `Interest` del contrato de CTA. */
function ctaInterest(slug: string): Interest | undefined {
  const interest = interestForRole(slug);
  return interest === "unsure" ? undefined : interest;
}

/**
 * Landing SEO de un agente (/agentes/[slug]) — SEO_GROWTH_SPEC_V1 §14–§15.
 * Reutiliza `AgentControl` (límites/derivación) tal cual vive en /agentes: es
 * el mismo contenido genérico de control, no algo nuevo por rol.
 */
export function AgentLanding({ content }: { content: AgentLandingContent }) {
  const related = content.relatedIndustries
    .map((slug) => INDUSTRY_LIST.find((industry) => industry.slug === slug))
    .filter((industry): industry is NonNullable<typeof industry> => Boolean(industry));
  const interest = ctaInterest(content.slug);

  return (
    <>
      <div className="mk-container">
        <Breadcrumb
          items={[
            { label: "Atacama Labs", href: "/" },
            { label: "Agentes", href: "/agentes" },
            { label: content.tab },
          ]}
        />
      </div>

      <PageHero
        eyebrow="AGENTES"
        title={content.h1}
        lead={content.intro}
        center
        actions={[
          {
            label: "Quiero este agente",
            href: diagnosticHref({
              source_page: `agentes-${content.slug}`,
              source_section: "hero",
              source_cta: "quiero-este-agente",
              service: "agentes",
              ...(interest ? { interest } : {}),
            }),
          },
        ]}
      />

      <section className="mk-section mk-t-paper" aria-labelledby="al-que-hace-title">
        <div className="mk-container mk-il-faq">
          <SectionHeading id="al-que-hace-title" center title="Qué puede hacer" />
          <ul className="mk-rb-caps mk-al-caps">
            {content.bullets.map((bullet) => (
              <li key={bullet}>
                <Check size={14} strokeWidth={2.4} aria-hidden />
                {bullet}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <AgentControl />

      <section className="mk-section mk-t-paper" aria-labelledby="al-faq-title">
        <div className="mk-container mk-il-faq">
          <SectionHeading id="al-faq-title" center eyebrow="PREGUNTAS FRECUENTES" title="Antes de decidir" />
          <FAQ items={content.faq} />
        </div>
      </section>

      {related.length > 0 ? (
        <section className="mk-section--sm mk-t-mist mk-related" aria-labelledby="al-related-title">
          <div className="mk-container">
            <h2 id="al-related-title" className="mk-h4">
              Rubros relacionados.
            </h2>
            <ul className="mk-related__grid">
              {related.map((industry) => (
                <li key={industry.slug}>
                  <Link href={`/rubros/${industry.slug}`} className="mk-related__link">
                    <span className="mk-related__label">{industry.seo.h1}</span>
                    <span className="mk-related__blurb">{industry.lead}</span>
                    <ArrowRight size={18} aria-hidden className="mk-related__arrow" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <SoftCTA
        titleId="al-cta-title"
        title="¿Le delegamos este trabajo a un agente?"
        body="Cuéntanos cómo funciona hoy este proceso en tu empresa y diseñamos el agente alrededor de tus herramientas."
        primary={{
          label: "Hablar con Nayra",
          href: "/diagnostico",
          agent: {
            source_page: `agentes-${content.slug}`,
            source_section: "final-cta",
            source_cta: "hablar-con-nayra",
            service: "agentes",
            ...(interest ? { interest } : {}),
          },
        }}
        secondary={{ label: "Ver todos los agentes", href: "/agentes" }}
      />
    </>
  );
}
