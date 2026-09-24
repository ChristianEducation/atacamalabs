import { SectionHeading } from "../ui/Blocks";
import { AgentOnboardingStage } from "./AgentOnboardingStage";
import { AGENTS_ONBOARDING_HEADING } from "@/content/marketing/agents";

/**
 * «Así ponemos a trabajar tu agente» (AGENTES_SPEC_V1 §5). La inducción se
 * cuenta como la de una persona nueva, todo en una sola sección a la vista sin
 * scroll: título, escena pixel con su barra y, a la derecha, la tarjeta de la
 * etapa en curso con su mini animación.
 */
export function AgentOnboarding() {
  return (
    <section id="implementacion" className="mk-section mk-t-sand mk-ao-section" aria-labelledby="agents-onboarding-title">
      <div className="mk-container">
        <SectionHeading
          id="agents-onboarding-title"
          center
          title={AGENTS_ONBOARDING_HEADING.title}
          lead={AGENTS_ONBOARDING_HEADING.lead}
        />
        <AgentOnboardingStage />
      </div>
    </section>
  );
}
