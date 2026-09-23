import type { Metadata } from "next";
import { ShieldCheck, UserRound, History } from "lucide-react";
import { FeatureGrid, ProcessSteps, StandardImplementationNote } from "@/components/marketing/pages/Common";
import { HeroShell } from "@/components/marketing/pages/HeroShell";
import { AgentNetwork } from "@/components/marketing/pages/AgentNetwork";
import { AgentSelector } from "@/components/marketing/pages/AgentsSections";
import { CTABlock, SectionHeading } from "@/components/marketing/ui/Blocks";
import { agentCta } from "@/lib/marketing/public-config";
import { AGENTS_CATEGORIES, AGENTS_CONTROL, AGENTS_META_DESCRIPTION, AGENTS_STEPS, AGENTS_VERBS } from "@/content/marketing/agents";

export const metadata: Metadata = {
  title: "Agentes — Atacama Labs",
  description: AGENTS_META_DESCRIPTION,
  alternates: { canonical: "/agentes" },
};

const CONTROL_ICONS = [ShieldCheck, UserRound, History];

/**
 * /agentes — página principal de producto (V3.0.1 §8 + V3.3 §10–11, A1–A8).
 * Comercial, Cobranza, Administrativo/Financiero, Atención y Agendamiento
 * viven dentro del selector A3, que es el showcase más rico de la página
 * (Deep Tech, con un panel claro flotando encima para el contraste que
 * pide el spec).
 */
export default function AgentsPage() {
  const cta = agentCta();
  return (
    <>
      <HeroShell
        size="lPlus"
        eyebrow="AGENTES INTELIGENTES"
        title={
          <>
            No solo responde.
            <br />
            Hace el <span className="mk-hero__accent">trabajo</span>.
          </>
        }
        lead="Conversa con tus clientes, consulta tus sistemas, actualiza información y ejecuta el siguiente paso. Tú decides hasta dónde llega."
        actions={[
          { label: "Verlo en acción", href: "#selector" },
          { label: cta.label, href: cta.href, variant: "secondary" },
        ]}
        visual={<AgentNetwork />}
      />

      <section className="mk-section--md mk-t-paper" aria-labelledby="a2-title">
        <div className="mk-container">
          <SectionHeading
            id="a2-title"
            title="Un agente conectado a tu empresa."
            lead="Puede conversar, consultar herramientas y ejecutar acciones dentro del mismo flujo. Empieza con una tarea y suma otras cuando las necesites."
          />
        </div>
      </section>

      <section id="selector" className="mk-section mk-t-deep" aria-labelledby="selector-title">
        <div className="mk-container">
          <SectionHeading
            id="selector-title"
            title="¿Qué quieres que haga tu agente?"
            lead="Elige una forma de empezar y mira cómo trabaja."
          />
          <AgentSelector />
        </div>
      </section>

      <section className="mk-section--md mk-t-sand" aria-labelledby="a4-title">
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

      <section className="mk-section--md mk-t-mist" aria-labelledby="a5-title">
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

      <section className="mk-section--md mk-t-paper" aria-labelledby="a6-title">
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

      <section className="mk-section--md mk-t-sand" aria-labelledby="a7-title">
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
