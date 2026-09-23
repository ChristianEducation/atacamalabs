import type { Metadata } from "next";
import { FeatureGrid, PageHero } from "@/components/marketing/pages/Common";
import { PlatformWorkbench } from "@/components/marketing/demos/PlatformWorkbench";
import { CTABlock, SectionHeading } from "@/components/marketing/ui/Blocks";
import { agentCta } from "@/lib/marketing/public-config";
import { Layers, ListChecks, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Plataforma — Atacama Labs",
  description:
    "Conversaciones, contactos, tareas y próximos pasos reunidos para que tu equipo sepa qué pasó y qué sigue.",
  alternates: { canonical: "/plataforma" },
};

const BENEFITS = [
  { icon: <Layers size={20} />, title: "Todo el contexto", body: "Conversaciones, contactos y actividad en un mismo lugar." },
  { icon: <ListChecks size={20} />, title: "Trabajo visible", body: "Estados y próximos pasos claros para el equipo." },
  { icon: <ShieldCheck size={20} />, title: "Control", body: "Reglas, permisos y derivaciones cuando corresponde." },
] as const;

/** /plataforma (spec V3.0 §9, P1–P5): una sola vista de producto, sin competir con /agentes. */
export default function PlatformPage() {
  const cta = agentCta();
  return (
    <>
      <PageHero
        eyebrow="PLATAFORMA"
        title="Tus agentes trabajan. Tú mantienes el control."
        lead="Conversaciones, contactos, tareas y próximos pasos reunidos para que tu equipo sepa qué pasó y qué sigue."
        actions={[{ label: cta.label, href: cta.href }]}
        split="4-8"
      >
        <PlatformWorkbench />
        <p className="mk-small mk-muted" style={{ marginTop: 12 }}>
          Representación ilustrativa. Las vistas y funciones se configuran según tu solución.
        </p>
      </PageHero>

      <section className="mk-section--md" aria-labelledby="p3-title">
        <div className="mk-container">
          <SectionHeading id="p3-title" title="Desde aquí ves lo que están haciendo tus agentes." />
          <FeatureGrid items={BENEFITS} />
        </div>
      </section>

      <section className="mk-section--md mk-paper" aria-labelledby="p4-title">
        <div className="mk-container mk-close">
          <SectionHeading
            id="p4-title"
            center
            title="Conectada al trabajo del agente."
            lead="La plataforma acompaña el trabajo del agente y se conecta con las herramientas que el proceso necesita."
          />
        </div>
      </section>

      <CTABlock
        title="Mira cómo podría funcionar en tu empresa."
        body="Cuéntanos tu proceso y revisamos el alcance."
        cta={cta}
      />
    </>
  );
}
