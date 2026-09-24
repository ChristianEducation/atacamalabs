import type { Metadata } from "next";
import { HeroShell } from "@/components/marketing/pages/HeroShell";
import { AgentHeroOffice } from "@/components/marketing/pages/AgentHeroOffice";
import { AgentSelector } from "@/components/marketing/pages/AgentSelector";
import { AgentOnboarding } from "@/components/marketing/pages/AgentOnboarding";
import { AgentTools } from "@/components/marketing/pages/AgentTools";
import { AgentControl } from "@/components/marketing/pages/AgentControl";
import { SoftCTA } from "@/components/marketing/pages/HomeCTA";
import { AGENTS_CTA, AGENTS_HERO, AGENTS_META_DESCRIPTION } from "@/content/marketing/agents";

export const metadata: Metadata = {
  title: "Agentes — Atacama Labs",
  description: AGENTS_META_DESCRIPTION,
  alternates: { canonical: "/agentes" },
};

/**
 * /agentes — ATACAMA_LABS_AGENTES_SPEC_V1. Una sola idea: incorporar a alguien
 * que trabaja dentro de la empresa. Hero (la oficina donde el agente cambia de uniforme según el puesto; la pregunta que sigue es su remate), selector de
 * puestos, su inducción, las herramientas que usa, hasta dónde puede llegar y
 * cierre. Los enlaces del Home (`/agentes#cobranza`…) abren el puesto elegido.
 */
export default function AgentsPage() {
  return (
    <>
      <HeroShell
        size="lPlus"
        eyebrow={AGENTS_HERO.eyebrow}
        className="mk-hero--agents"
        title={
          <>
            <span className="mk-hero__line">No solo responde.</span>
            <span className="mk-hero__line mk-hero__accent">Hace el trabajo.</span>
          </>
        }
        lead={AGENTS_HERO.lead}
        actions={[AGENTS_HERO.primary, { ...AGENTS_HERO.secondary, variant: "secondary" }]}
        visual={<AgentHeroOffice />}
      />
      <AgentSelector />
      <AgentOnboarding />
      <AgentTools />
      <AgentControl />
      <SoftCTA
        titleId="agents-cta-title"
        title={AGENTS_CTA.title}
        body={AGENTS_CTA.body}
        primary={AGENTS_CTA.primary}
        secondary={AGENTS_CTA.secondary}
      />
    </>
  );
}
