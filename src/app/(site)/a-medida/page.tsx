import type { Metadata } from "next";
import { HeroShell } from "@/components/marketing/pages/HeroShell";
import { CustomHeroBuilder } from "@/components/marketing/pages/CustomHeroBuilder";
import { CustomProcess } from "@/components/marketing/pages/CustomProcess";
import { CustomStack } from "@/components/marketing/pages/CustomStack";
import { CustomCases } from "@/components/marketing/pages/CustomCases";
import { CustomSteps } from "@/components/marketing/pages/CustomSteps";
import { SoftCTA } from "@/components/marketing/pages/HomeCTA";
import { CUSTOM_META } from "@/content/marketing/custom";
import { CUSTOM_CTA, CUSTOM_HERO } from "@/content/marketing/custom-page";

export const metadata: Metadata = {
  title: "A Medida — Atacama Labs",
  description: CUSTOM_META,
  alternates: { canonical: "/a-medida" },
};

/**
 * /a-medida — ATACAMA_LABS_A_MEDIDA_SPEC_V1 §3. Orden: Hero (builder) →
 * Muéstranos cómo trabajas hoy (una pieza en 4 momentos) → Integraciones (lo que ya tienes → Atacama → lo que construimos) → Casos →
 * Implementación → CTA. Sin pricing ni selector de agentes.
 */
export default function CustomPage() {
  return (
    <>
      <HeroShell
        size="l"
        className="mk-hero--custom"
        eyebrow={CUSTOM_HERO.eyebrow}
        title={
          <>
            Tu proceso primero.
            <br />
            <span className="mk-hero__accent">El software después.</span>
          </>
        }
        lead={CUSTOM_HERO.lead}
        trust={CUSTOM_HERO.trust}
        actions={[
          { label: CUSTOM_CTA.hero.label, href: CUSTOM_CTA.hero.href },
          { label: "Ver cómo trabajamos", href: "#como-trabajas", variant: "secondary" },
        ]}
        visual={<CustomHeroBuilder />}
      />
      <CustomProcess />
      <CustomStack />
      <CustomCases />
      <CustomSteps />
      <SoftCTA
        wide
        titleId="custom-cta-title"
        title={
          <>
            {CUSTOM_CTA.titleA}
            <br />
            <span className="mk-hero__accent">{CUSTOM_CTA.titleB}</span>
          </>
        }
        body={CUSTOM_CTA.body}
        primary={CUSTOM_CTA.primary}
      />
    </>
  );
}
