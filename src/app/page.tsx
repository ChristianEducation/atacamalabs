import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { HeroSection } from "@/components/halo/Hero";
import { IntegrationsMarquee } from "@/components/halo/IntegrationsMarquee";
import { MeetAtacamaLabsSection } from "@/components/halo/MeetAtacamaLabs";
import { UseModesSection } from "@/components/halo/UseModes";
import site from "@/lib/content";
import { agentsOffer } from "@/lib/agents-offer";

/**
 * Home — migración visual Halo (docs/HALO-FASE0-MAP.md).
 * Fase 1: Navbar + Hero + Marquee de integraciones.
 * Fase 2: Meet Atacama Labs (bento, ex-"info.tsx") + Use modes (panel único,
 * ex-"use-cases.tsx"). Pricing, Soluciones a medida y el CTA/footer
 * fusionado quedan para las Fases 3-4 — no se recrean acá versiones a medio
 * camino. Sin `.public-site` ni `home-refinement.css`: esta página usa
 * Manrope como fuente base (igual que Halo), no el serif Newsreader de 006.
 * El footer que se ve por ahora es el actual (sin rediseñar) — pasa a la
 * gramática Halo recién en la Fase 4.
 */
export default function Home() {
  return (
    <div
      className="flex flex-col flex-1 bg-background"
      style={{ fontFamily: "var(--font-studio), Arial, sans-serif" }}
    >
      <div className="relative flex h-dvh flex-col overflow-hidden">
        <SiteHeader overlay />
        <HeroSection
          eyebrow={site.hero.eyebrow}
          title={site.hero.title}
          body={site.hero.body}
          primaryCta={site.hero.primaryCta}
          secondaryCta={site.hero.secondaryCta}
        />
      </div>
      <IntegrationsMarquee label={agentsOffer.integrations.title} />
      <MeetAtacamaLabsSection
        title="Conoce Atacama Labs."
        ctaLabel="Conocer el estudio"
        ctaHref="/sobre-el-estudio"
        body={site.about.body}
        portals={site.portals}
      />
      <UseModesSection
        eyebrow="Atacama Labs en la práctica"
        title="Modos de uso"
        body="Ejemplos de procesos; el alcance se configura para tu empresa."
        caseTitle="Ventas"
        caseBody="Acompaña cada oportunidad hasta su próximo paso."
        caseCtaLabel="Ver agentes"
        caseCtaHref="/agentes#procesos"
      />
      <SiteFooter />
    </div>
  );
}
