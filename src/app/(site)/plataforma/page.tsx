import type { Metadata } from "next";
import { HeroShell } from "@/components/marketing/pages/HeroShell";
import { SoftCTA } from "@/components/marketing/pages/HomeCTA";
import {
  PlatformControl,
  PlatformDemo,
  PlatformFlow,
  PlatformHeroPortal,
  PlatformOmni,
} from "@/components/marketing/pages/PlatformSections";
import { PLATFORM_CTA, PLATFORM_FINAL_CTA, PLATFORM_HERO, PLATFORM_HERO_CTA } from "@/content/marketing/platform";
import { pageMetadata } from "@/lib/seo-metadata";

export const metadata: Metadata = pageMetadata({
  title: "Plataforma para gestionar agentes de IA | Atacama Labs",
  description:
    "Revisa conversaciones, contactos, acciones y próximos pasos de tus agentes desde una plataforma conectada a la operación de tu empresa.",
  path: "/plataforma",
});

/**
 * /plataforma (PLATAFORMA_SPEC_V1): dónde el cliente ve y controla lo que
 * hacen sus agentes. Hero con el portal en pequeño → demo principal de seis
 * vistas (Paper) → bandeja omnicanal (Blue Mist) → control del cliente (Sand)
 * → integraciones y trabajo real (Paper) → cierre suave. Los dos CTA abren a
 * Nayra con contexto (CTA_SYSTEM_SPEC §2).
 */
export default function PlatformPage() {
  return (
    <>
      <HeroShell
        size="l"
        eyebrow={PLATFORM_HERO.eyebrow}
        title={
          <>
            Tus agentes trabajan.
            <br />
            Tú mantienes el <span className="mk-hero__accent">control</span>.
          </>
        }
        lead={PLATFORM_HERO.lead}
        actions={[{ label: PLATFORM_HERO.cta, href: "/diagnostico", agent: PLATFORM_HERO_CTA }]}
        visual={<PlatformHeroPortal />}
        className="mk-hero--platform"
      />
      <PlatformDemo />
      <PlatformOmni />
      <PlatformControl />
      <PlatformFlow />
      <SoftCTA
        titleId="platform-cta-title"
        title={PLATFORM_CTA.title}
        body={PLATFORM_CTA.body}
        primary={{ label: PLATFORM_CTA.label, href: "/diagnostico", agent: PLATFORM_FINAL_CTA }}
      />
    </>
  );
}
