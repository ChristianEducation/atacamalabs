import type { Metadata } from "next";
import { Check } from "lucide-react";
import { ContextContact, FeatureGrid, PageHero } from "@/components/marketing/pages/Common";
import { FinanceDemo } from "@/components/marketing/demos/FinanceDemo";
import { FlowPlayer } from "@/components/marketing/demos/FlowPlayer";
import { IntegrationMarquee } from "@/components/marketing/ui/IntegrationMarquee";
import { FAQ, RelatedServices, SectionHeading } from "@/components/marketing/ui/Blocks";
import { marqueeEntries } from "@/content/marketing/integrations";
import { FINANCE } from "@/content/marketing/services";
import type { BuilderScenario } from "@/content/marketing/fixtures";

export const metadata: Metadata = {
  title: "Agente Administrativo/Financiero — Atacama Labs",
  description: FINANCE.meta,
  alternates: { canonical: "/administrativo-financiero" },
};

export default function FinancePage() {
  const marquee = marqueeEntries();
  return (
    <>
      <PageHero
        eyebrow="AGENTE ADMINISTRATIVO / FINANCIERO"
        title="Pregunta por tu operación. Tu agente busca el dato y hace el trabajo."
        lead="Conecta información administrativa y financiera con tus procesos para consultar, cruzar, alertar y actualizar."
        actions={[
          { label: "Ver ejemplos", href: "#funciones" },
          { label: "Revisar mi operación", href: "#conversar", variant: "secondary" },
        ]}
        split="6-6"
      >
        <FinanceDemo selector={false} initial="factura-pendiente" />
      </PageHero>

      <section className="mk-section--md" aria-labelledby="can-title">
        <div className="mk-container">
          <SectionHeading id="can-title" title="Qué puede hacer." />
          <ul className="mk-checks mk-fin-caps">
            {FINANCE.capabilities.map((c) => (
              <li key={c}>
                <Check size={16} aria-hidden /> <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="funciones" className="mk-section mk-paper" aria-labelledby="demo-title">
        <div className="mk-container">
          <SectionHeading
            id="demo-title"
            title="Cuatro escenas de ejemplo."
            lead="Datos ficticios. Las acciones sensibles pasan por Preparar, Confirmación humana y Ejecutar."
          />
          <FinanceDemo />
        </div>
      </section>

      <section className="mk-section--md" aria-labelledby="hub-title">
        <div className="mk-container">
          <SectionHeading id="hub-title" title="Conectado a tu información." lead={FINANCE.hubNote} />
          <ul className="mk-pills-list">
            {FINANCE.hub.map((h) => (
              <li key={h} className="mk-badge mk-badge--neutral">
                {h}
              </li>
            ))}
          </ul>
        </div>
        <IntegrationMarquee items={marquee.items} preview={marquee.preview} />
      </section>

      <section className="mk-section--md mk-paper" aria-labelledby="flow-title">
        <div className="mk-container">
          <SectionHeading
            id="flow-title"
            title="De consulta a acción."
            lead="Un pendiente detectado puede pasar al flujo de Cobranza y quedar registrado: los empaquetados pueden trabajar juntos."
          />
          <FlowPlayer
            title="De consulta a acción"
            nodes={FINANCE.flow as unknown as BuilderScenario["nodes"]}
            instance="fin-y5"
          />
        </div>
      </section>

      <section className="mk-section--md" aria-labelledby="ctl-title">
        <div className="mk-container">
          <SectionHeading id="ctl-title" title="Control y seguridad." />
          <FeatureGrid
            items={FINANCE.principles.map((p) => ({ icon: <Check size={20} />, title: p.title, body: p.body }))}
          />
        </div>
      </section>

      <ContextContact
        lead="Cuéntanos qué información necesitas consultar y qué debería pasar después."
        initial={{ need: "agentes", capability: "administrativo-financiero" }}
      />

      <section className="mk-section--md" aria-labelledby="faq-title">
        <div className="mk-container mk-ag-split mk-ag-split--4-8">
          <SectionHeading id="faq-title" title="Antes de empezar." />
          <FAQ items={FINANCE.faq} />
        </div>
      </section>

      <RelatedServices ids={["cobranza", "agentes", "a-medida"]} />
    </>
  );
}
