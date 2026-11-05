import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Breadcrumb } from "./Breadcrumb";
import { PageHero } from "./Common";
import { SectionHeading, FAQ } from "../ui/Blocks";
import { ButtonLink } from "../ui/Button";
import { IndustryDemo } from "./IndustryDemo";
import { SoftCTA } from "./HomeCTA";
import { AGENT_PAGES } from "@/content/marketing/agent-channels";
import type { IndustryExperience } from "@/content/marketing/industries";
import { diagnosticHref } from "@/lib/marketing/cta-context";

/**
 * Landing SEO de un rubro (/rubros/[slug]) — SEO_GROWTH_SPEC_V1 §9. Reutiliza
 * el mismo contenido de `industries.ts` que ya usa /rubros (pains, capabilities,
 * flow, IndustryDemo, y por rubro `connections` y `oversight`): nada se inventa ni se
 * duplica a mano acá. El CTA principal es siempre «Agenda un diagnóstico» hacia
 * /diagnostico con el rubro; Nayra queda como acceso secundario. El H1 de la
 * página es el de `industry.seo`; `industry.headline` queda como bajada dentro
 * del cuerpo, igual que en el hub.
 */
export function IndustryLanding({ industry }: { industry: IndustryExperience }) {
  const { seo } = industry;
  /** CTA principal único de la página: /diagnostico con el rubro, el origen y la sección de este botón. */
  const diagnosticFor = (section: string) =>
    diagnosticHref({
      source_page: `rubros-${industry.slug}`,
      source_section: section,
      source_cta: "diagnostico-rubro",
      service: "agentes",
      industry: industry.slug,
    });
  const related = seo.relatedAgentIds
    .map((id) => AGENT_PAGES.find((page) => page.slug === id))
    .filter((page): page is NonNullable<typeof page> => Boolean(page));

  return (
    <>
      <div className="mk-container">
        <Breadcrumb
          items={[
            { label: "Atacama Labs", href: "/" },
            { label: "Rubros", href: "/rubros" },
            { label: industry.name },
          ]}
        />
      </div>

      <PageHero
        eyebrow="RUBROS"
        title={seo.h1}
        lead={seo.intro}
        center
        actions={[{ label: "Agenda un diagnóstico", href: diagnosticFor("hero") }]}
      />

      <section className="mk-section mk-t-paper mk-rb-sec" aria-labelledby="il-situacion-title">
        <div className="mk-container mk-rb-grid">
          <div className="mk-rb-copy">
            <p className="mk-rb-eyebrow">{industry.name}</p>
            <h2 id="il-situacion-title" className="mk-rb-title">
              {industry.headline}
            </h2>
            <p className="mk-rb-lead">{industry.lead}</p>
            <p className="mk-rb-context">{industry.context}</p>

            <h2 className="mk-rb-sub">Lo que pasa hoy</h2>
            <ul className="mk-rb-pains">
              {industry.pains.map((pain) => (
                <li key={pain}>{pain}</li>
              ))}
            </ul>

            <h2 className="mk-rb-sub">Qué puede hacer el agente</h2>
            <ul className="mk-rb-caps">
              {industry.capabilities.map((capability) => (
                <li key={capability}>
                  <Check size={14} strokeWidth={2.4} aria-hidden />
                  {capability}
                </li>
              ))}
            </ul>

            <h2 className="mk-rb-sub">Cómo se conecta</h2>
            <p className="mk-rb-connect">{industry.connections}</p>

            <ButtonLink href={diagnosticFor("situacion")} arrow>
              Agenda un diagnóstico
            </ButtonLink>
          </div>

          <div className="mk-rb-stage">
            <IndustryDemo industry={industry} />
          </div>
        </div>
      </section>

      <section className="mk-section--sm mk-t-mist" aria-labelledby="il-limites-title">
        <div className="mk-container mk-il-limits">
          <SectionHeading
            id="il-limites-title"
            center
            title="Qué necesita revisión humana"
            lead={industry.oversight.lead}
          />
          <ul className="mk-il-limits__list">
            {industry.oversight.items.map((item) => (
              <li key={item}>
                <Check size={14} strokeWidth={2.4} aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mk-section mk-t-paper" aria-labelledby="il-faq-title">
        <div className="mk-container mk-il-faq">
          <SectionHeading id="il-faq-title" center eyebrow="PREGUNTAS FRECUENTES" title="Antes de decidir" />
          <FAQ items={seo.faq} />
        </div>
      </section>

      {related.length > 0 ? (
        <section className="mk-section--sm mk-t-mist mk-related" aria-labelledby="il-related-title">
          <div className="mk-container">
            <h2 id="il-related-title" className="mk-h4">
              Agentes relacionados.
            </h2>
            <ul className="mk-related__grid">
              {related.map((page) => (
                <li key={page.slug}>
                  <Link href={`/agentes/${page.slug}`} className="mk-related__link">
                    <span className="mk-related__label">{page.h1}</span>
                    <span className="mk-related__blurb">{page.blurb}</span>
                    <ArrowRight size={18} aria-hidden className="mk-related__arrow" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <SoftCTA
        titleId="il-cta-title"
        title="¿Quieres ver esto trabajando en tu operación?"
        body="En el diagnóstico revisamos cómo trabajan hoy en tu empresa y cómo se vería un agente conectado a tus herramientas."
        primary={{ label: "Agenda un diagnóstico", href: diagnosticFor("final-cta") }}
        secondary={{
          label: "Prueba a Nayra",
          href: "/diagnostico",
          agent: {
            source_page: `rubros-${industry.slug}`,
            source_section: "final-cta",
            source_cta: "hablar-con-nayra",
            service: "agentes",
            industry: industry.slug,
          },
        }}
      />
    </>
  );
}
