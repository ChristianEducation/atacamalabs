import type { Metadata } from "next";
import { ShieldCheck, UserRound, History } from "lucide-react";
import { FeatureGrid, PageHero, ProcessSteps, StandardImplementationNote } from "@/components/marketing/pages/Common";
import { AgentSelector } from "@/components/marketing/pages/AgentsSections";
import { Mission } from "@/components/marketing/demos/Mission";
import { CTABlock, SectionHeading } from "@/components/marketing/ui/Blocks";
import { agentCta } from "@/lib/marketing/public-config";
import { AGENTS_CATEGORIES, AGENTS_CONTROL, AGENTS_META_DESCRIPTION, AGENTS_STEPS, AGENTS_VERBS } from "@/content/marketing/agents";
import { AGENT_MISSIONS } from "@/content/marketing/missions";

export const metadata: Metadata = {
  title: "Agentes — Atacama Labs",
  description: AGENTS_META_DESCRIPTION,
  alternates: { canonical: "/agentes" },
};

const CONTROL_ICONS = [ShieldCheck, UserRound, History];

/**
 * /agentes — página principal de producto (spec V3.0 §8, A1–A8). Comercial,
 * Cobranza, Administrativo/Financiero, Atención y Agendamiento ya no son
 * páginas propias: viven aquí, dentro del selector A3.
 */
export default function AgentsPage() {
  const cta = agentCta();
  const hero = AGENT_MISSIONS[0];
  return (
    <>
      <PageHero
        eyebrow="AGENTES INTELIGENTES"
        title="No solo responde. Hace el trabajo."
        lead="Conversa con tus clientes, consulta tus sistemas, actualiza información y ejecuta el siguiente paso. Tú decides hasta dónde llega."
        actions={[
          { label: "Verlo en acción", href: "#selector" },
          { label: cta.label, href: cta.href, variant: "secondary" },
        ]}
      >
        <Mission scene={hero.scene} instance="agentes-hero" />
      </PageHero>

      <section className="mk-section--md" aria-labelledby="a2-title">
        <div className="mk-container">
          <SectionHeading
            id="a2-title"
            title="Un agente conectado a tu empresa."
            lead="Puede conversar, consultar herramientas y ejecutar acciones dentro del mismo flujo. Empieza con una tarea y suma otras cuando las necesites."
          />
        </div>
      </section>

      <section id="selector" className="mk-section mk-paper" aria-labelledby="selector-title">
        <div className="mk-container">
          <SectionHeading
            id="selector-title"
            title="¿Qué quieres que haga tu agente?"
            lead="Elige una forma de empezar y mira cómo trabaja."
          />
          <AgentSelector />
        </div>
      </section>

      <section className="mk-section--md" aria-labelledby="a4-title">
        <div className="mk-container">
          <SectionHeading
            id="a4-title"
            title="Habla con personas. Trabaja con sistemas."
            lead="Lo importante no es el canal. Es que la conversación pueda terminar en una acción."
          />
          <ul className="mk-verbs">
            {AGENTS_VERBS.map((v) => (
              <li key={v}>{v}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mk-section--md mk-paper" aria-labelledby="a5-title">
        <div className="mk-container">
          <SectionHeading id="a5-title" title="Se conecta a lo que ya usas." />
          <ul className="mk-categories">
            {AGENTS_CATEGORIES.map((c) => (
              <li key={c} className="mk-badge mk-badge--neutral">
                {c}
              </li>
            ))}
          </ul>
          <p className="mk-small mk-muted" style={{ marginTop: 16 }}>
            Mediante conector, MCP, API o webhook, según lo que tu proceso necesite.
          </p>
        </div>
      </section>

      <section className="mk-section--md" aria-labelledby="a6-title">
        <div className="mk-container">
          <SectionHeading id="a6-title" title="Tú decides hasta dónde llega." />
          <FeatureGrid
            items={AGENTS_CONTROL.map((c, i) => {
              const Icon = CONTROL_ICONS[i];
              return { icon: <Icon size={20} />, title: c.title, body: c.body };
            })}
          />
        </div>
      </section>

      <section className="mk-section--md mk-paper" aria-labelledby="a7-title">
        <div className="mk-container">
          <SectionHeading id="a7-title" title="De diagnóstico a agente trabajando." />
          <ProcessSteps steps={AGENTS_STEPS} />
          <StandardImplementationNote />
        </div>
      </section>

      <CTABlock
        title="¿Qué sería lo primero que le delegarías?"
        body="Cuéntanos el proceso y revisamos por dónde empezar."
        cta={cta}
      />
    </>
  );
}
