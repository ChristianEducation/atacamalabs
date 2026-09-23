import type { Metadata } from "next";
import { FeatureGrid, PageHero, ProcessSteps } from "@/components/marketing/pages/Common";
import { IntegrationFlow } from "@/components/marketing/pages/CustomSections";
import { CTABlock, SectionHeading } from "@/components/marketing/ui/Blocks";
import { Blocks, LayoutGrid, Rows3, Workflow } from "lucide-react";
import { CUSTOM_GROUPS, CUSTOM_META, CUSTOM_PROCESS } from "@/content/marketing/custom";

export const metadata: Metadata = {
  title: "A Medida — Atacama Labs",
  description: CUSTOM_META,
  alternates: { canonical: "/a-medida" },
};

const GROUP_ICONS = [Workflow, Rows3, LayoutGrid, Blocks];

/**
 * /a-medida (spec V3.0 §10, M1–M6). Página editorial, sin dashboard ni
 * builder de escenarios: una sola animación de integración y cuatro
 * categorías. El precio siempre es a medida; no se muestra un plan estándar.
 */
export default function CustomPage() {
  return (
    <>
      <PageHero
        eyebrow="A MEDIDA"
        title="Tu proceso no tiene que adaptarse al software."
        lead="Conectamos herramientas, automatizamos tareas y construimos alrededor de cómo trabaja tu empresa."
        actions={[{ label: "Revisar mi proceso", href: "/diagnostico?necesidad=a-medida" }]}
        center
      />

      <section className="mk-section--md" aria-labelledby="m2-title">
        <div className="mk-container mk-close">
          <SectionHeading
            id="m2-title"
            center
            title="Cuando el trabajo vive entre planillas, correos y sistemas separados."
            lead="Cada sistema guarda una parte del proceso y alguien tiene que unir la información a mano."
          />
        </div>
      </section>

      <section className="mk-section mk-paper" aria-labelledby="m3-title">
        <div className="mk-container">
          <SectionHeading id="m3-title" center title="Así se conecta tu proceso." />
          <IntegrationFlow instance="a-medida" result="Registro actualizado en ambos sistemas" />
        </div>
      </section>

      <section className="mk-section--md" aria-labelledby="m4-title">
        <div className="mk-container">
          <SectionHeading id="m4-title" title="Qué construimos." />
          <FeatureGrid
            columns={2}
            items={CUSTOM_GROUPS.map((g, i) => {
              const Icon = GROUP_ICONS[i];
              return { icon: <Icon size={20} />, title: g.title, body: g.body };
            })}
          />
        </div>
      </section>

      <section className="mk-section--md mk-paper" aria-labelledby="m5-title">
        <div className="mk-container">
          <SectionHeading id="m5-title" title="De la idea al sistema." />
          <ProcessSteps steps={CUSTOM_PROCESS} />
        </div>
      </section>

      <CTABlock
        title="Cuéntanos el proceso. Diseñamos el sistema."
        body="El alcance depende del proceso, las integraciones y la interfaz necesaria. Siempre a medida."
        cta={{ label: "Revisar mi proceso", href: "/diagnostico?necesidad=a-medida" }}
      />
    </>
  );
}
