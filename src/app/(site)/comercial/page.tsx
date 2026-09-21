import type { Metadata } from "next";
import { PageHero, ContextContact, StandardImplementationNote } from "@/components/marketing/pages/Common";
import { CommercialFlow, CommercialFunctions } from "@/components/marketing/pages/ServiceSections";
import { CommercialDemo } from "@/components/marketing/demos/ScenarioDemos";
import { IntegrationMarquee } from "@/components/marketing/ui/IntegrationMarquee";
import { FAQ, RelatedServices, SectionHeading } from "@/components/marketing/ui/Blocks";
import { marqueeEntries } from "@/content/marketing/integrations";
import { COMMERCIAL } from "@/content/marketing/services";

export const metadata: Metadata = {
  title: "Agente Comercial — Atacama Labs",
  description: COMMERCIAL.meta,
  alternates: { canonical: "/comercial" },
};

export default function CommercialPage() {
  const marquee = marqueeEntries();
  return (
    <>
      <PageHero
        eyebrow="AGENTE COMERCIAL"
        title="De una conversación al siguiente paso."
        lead="Atiende consultas, entiende intención, califica, agenda y registra lo ocurrido en tus herramientas."
        actions={[
          { label: "Ver cómo trabaja", href: "#funciones" },
          { label: "Configurar mi agente", href: "#conversar", variant: "secondary" },
        ]}
      >
        <CommercialDemo instance="comercial-hero" />
      </PageHero>

      <section id="funciones" className="mk-section mk-paper" aria-labelledby="fn-title">
        <div className="mk-container">
          <SectionHeading
            id="fn-title"
            title="Tres funciones conectadas, un mismo agente."
            lead="Atiende y califica, agenda cuando corresponde y hace seguimiento actualizando tu CRM."
          />
          <CommercialFunctions />
        </div>
      </section>

      <section className="mk-section--md" aria-labelledby="more-title">
        <div className="mk-container">
          <SectionHeading id="more-title" title={COMMERCIAL.moreTitle} lead="También puede hacer más." />
          <ul className="mk-pills-list">
            {COMMERCIAL.morePills.map((pill) => (
              <li key={pill} className="mk-badge mk-badge--neutral">
                {pill}
              </li>
            ))}
          </ul>
          <p className="mk-small mk-muted">{COMMERCIAL.moreNote}</p>
        </div>
      </section>

      <section className="mk-section--md mk-paper" aria-labelledby="flow-title">
        <div className="mk-container">
          <SectionHeading id="flow-title" title="Del mensaje al seguimiento." lead="Selecciona cada etapa para ver su entrada y su resultado." />
          <CommercialFlow />
        </div>
      </section>

      <section className="mk-section--md" aria-labelledby="int-title">
        <div className="mk-container">
          <SectionHeading
            id="int-title"
            title="Trabaja con tus herramientas."
            lead="Conectamos lo que el proceso necesita, según integración, permisos y alcance."
          />
          <ul className="mk-pills-list">
            {COMMERCIAL.integrations.map((i) => (
              <li key={i} className="mk-badge mk-badge--neutral">
                {i}
              </li>
            ))}
          </ul>
        </div>
        <IntegrationMarquee items={marquee.items} preview={marquee.preview} />
        <div className="mk-container mk-ag-subblock">
          <StandardImplementationNote />
        </div>
      </section>

      <ContextContact
        lead="Cuéntanos qué consultas llegan hoy y qué debería pasar después."
        initial={{ need: "agentes", capability: "comercial" }}
      />

      <section className="mk-section--md" aria-labelledby="faq-title">
        <div className="mk-container mk-ag-split mk-ag-split--4-8">
          <SectionHeading id="faq-title" title="Antes de empezar." />
          <FAQ items={COMMERCIAL.faq} />
        </div>
      </section>

      <RelatedServices ids={["agentes", "cobranza", "administrativo-financiero"]} />
    </>
  );
}
