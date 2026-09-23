import type { Metadata } from "next";
import { Layers, ListChecks, ShieldCheck } from "lucide-react";
import { FeatureGrid } from "@/components/marketing/pages/Common";
import { HeroShell } from "@/components/marketing/pages/HeroShell";
import { PlatformWorkbench } from "@/components/marketing/demos/PlatformWorkbench";
import { CTABlock, SectionHeading } from "@/components/marketing/ui/Blocks";
import { agentCta } from "@/lib/marketing/public-config";

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

/**
 * /plataforma (V3.0.1 §9 + V3.3 §12): Hero Gradient → Product view (Paper,
 * grande) → Benefits (Blue Mist) → Connections (Sand) → CTA. El hero muestra
 * una vista compacta; la sección de producto es el momento grande.
 */
export default function PlatformPage() {
  const cta = agentCta();
  return (
    <>
      <HeroShell
        size="l"
        eyebrow="PLATAFORMA"
        title={
          <>
            Tus agentes trabajan.
            <br />
            Tú mantienes el <span className="mk-hero__accent">control</span>.
          </>
        }
        lead="Conversaciones, contactos, tareas y próximos pasos reunidos para que tu equipo sepa qué pasó y qué sigue."
        actions={[{ label: cta.label, href: cta.href }]}
        visual={<PlatformWorkbench compact />}
      />

      <section className="mk-section mk-t-paper" aria-labelledby="p2-title">
        <div className="mk-container">
          <SectionHeading id="p2-title" title="Desde aquí ves lo que están haciendo tus agentes." />
          <PlatformWorkbench />
          <p className="mk-small mk-muted" style={{ marginTop: 16 }}>
            Representación ilustrativa. Las vistas y funciones se configuran según tu solución.
          </p>
        </div>
      </section>

      <section className="mk-section--md mk-t-mist" aria-labelledby="p3-title">
        <div className="mk-container">
          <SectionHeading id="p3-title" title="Todo el contexto, en un mismo lugar." />
          <FeatureGrid items={BENEFITS} />
        </div>
      </section>

      <section className="mk-section--md mk-t-sand" aria-labelledby="p4-title">
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
