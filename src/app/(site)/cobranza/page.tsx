import type { Metadata } from "next";
import { ButtonLink } from "@/components/marketing/ui/Button";
import { ContextContact } from "@/components/marketing/pages/Common";
import { CollectionsCards, CollectionsFlow } from "@/components/marketing/pages/ServiceSections";
import { CollectionsDemo } from "@/components/marketing/demos/ScenarioDemos";
import { IntegrationMarquee } from "@/components/marketing/ui/IntegrationMarquee";
import { CTABlock, FAQ, RelatedServices, SectionHeading } from "@/components/marketing/ui/Blocks";
import { marqueeEntries } from "@/content/marketing/integrations";
import { COLLECTIONS } from "@/content/marketing/services";

export const metadata: Metadata = {
  title: "Agente de Cobranza — Atacama Labs",
  description: COLLECTIONS.meta,
  alternates: { canonical: "/cobranza" },
};

export default function CollectionsPage() {
  const marquee = marqueeEntries();
  return (
    <>
      <section className="mk-hero mk-hero--inner mk-col-hero" aria-labelledby="page-title">
        <div className="mk-container">
          <div className="mk-col-hero__row">
            <div>
              <p className="mk-eyebrow">COBRANZA</p>
              <h1 id="page-title" className="mk-h1">
                Cada gestión de cobro, con contexto.
              </h1>
            </div>
            <div className="mk-col-hero__side">
              <p className="mk-lead">Organiza recordatorios y próximos pasos sin perder el estado de cada cuenta.</p>
              <div className="mk-hero__actions">
                <ButtonLink href="#flujo" arrow>
                  Ver el flujo
                </ButtonLink>
                <ButtonLink href="#conversar" variant="secondary">
                  Revisar mi cobranza
                </ButtonLink>
              </div>
            </div>
          </div>
          <div className="mk-col-hero__show">
            <CollectionsDemo instance="cobranza-hero" />
          </div>
        </div>
      </section>

      <section className="mk-section--md" aria-labelledby="conn-title">
        <div className="mk-container">
          <SectionHeading
            id="conn-title"
            title="El seguimiento necesita información."
            lead="Revisamos cómo consultar estados y registrar cada gestión en tus herramientas."
          />
          <p className="mk-ag-cta">
            <ButtonLink href="#conversar" variant="secondary">
              Revisar conexiones
            </ButtonLink>
          </p>
        </div>
        <IntegrationMarquee items={marquee.items} preview={marquee.preview} />
      </section>

      <section id="funciones" className="mk-section mk-paper" aria-labelledby="fn-title">
        <div className="mk-container">
          <SectionHeading id="fn-title" title="Recordar, revisar y dar seguimiento." />
          <CollectionsCards />
          <p className="mk-ag-cta">
            <ButtonLink href="#conversar" variant="secondary">
              Revisar mis reglas
            </ButtonLink>
          </p>
        </div>
      </section>

      <section id="flujo" className="mk-section--md" aria-labelledby="flow-title">
        <div className="mk-container">
          <SectionHeading
            id="flow-title"
            title="Del estado de cuenta al próximo paso."
            lead="Puede consultar fuentes conectadas, preparar la gestión, registrar respuestas y actualizar otros sistemas; no se limita al envío de recordatorios."
          />
          <CollectionsFlow />
          <p className="mk-ag-cta">
            <ButtonLink href="#conversar" variant="secondary">
              Quiero revisar este flujo
            </ButtonLink>
          </p>
        </div>
      </section>

      <ContextContact
        title="Revisemos tu proceso de cobranza."
        lead="Cuéntanos cómo consultas estados y qué sucede después de cada gestión."
        initial={{ need: "agentes", capability: "cobranza" }}
      />

      <CTABlock
        title="Un seguimiento que tu equipo puede revisar."
        body="Definamos las reglas antes de automatizar la gestión."
        cta={{ label: "Agendar diagnóstico", href: "#conversar" }}
        secondary={{ label: "Ver planes de agentes", href: "/precios#agentes" }}
      />

      <section className="mk-section--md" aria-labelledby="faq-title">
        <div className="mk-container mk-ag-split mk-ag-split--4-8">
          <SectionHeading id="faq-title" title="El alcance se define con tus reglas." />
          <FAQ items={COLLECTIONS.faq} />
        </div>
      </section>

      <RelatedServices ids={["agentes", "administrativo-financiero", "a-medida"]} />
    </>
  );
}
