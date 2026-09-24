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
import {
  PLATFORM_CTA,
  PLATFORM_FINAL_CTA,
  PLATFORM_HERO,
  PLATFORM_HERO_CTA,
  PLATFORM_META,
} from "@/content/marketing/platform";

export const metadata: Metadata = {
  title: { absolute: PLATFORM_META.title },
  description: PLATFORM_META.description,
  alternates: { canonical: PLATFORM_META.canonical },
  openGraph: {
    title: PLATFORM_META.title,
    description: PLATFORM_META.description,
    url: PLATFORM_META.canonical,
    type: "website",
  },
};

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
