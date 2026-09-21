import type { Metadata } from "next";
import { HomeHero } from "@/components/marketing/pages/HomeHero";
import { ServiceSelector } from "@/components/marketing/pages/ServiceSelector";
import { HomePricing, IndustriesBlock, PlatformBlock } from "@/components/marketing/pages/HomeBlocks";
import { IntegrationMarquee } from "@/components/marketing/ui/IntegrationMarquee";
import { CTABlock } from "@/components/marketing/ui/Blocks";
import { marqueeEntries } from "@/content/marketing/integrations";
import { COMMON_CTA } from "@/content/marketing/nav";

export const metadata: Metadata = {
  title: "Atacama Labs — Agentes que trabajan en tu empresa",
  description:
    "Agentes que realmente trabajan en tu empresa: conversan, consultan información, actualizan sistemas y ejecutan procesos conectados a tus herramientas.",
  alternates: { canonical: "/" },
};

/** P01 — orden obligatorio: F1 → F2 → F3 → F10 → F7 → F11 → F9 (siete bloques comerciales). */
export default function Home() {
  const marquee = marqueeEntries();
  return (
    <>
      <HomeHero />
      <IntegrationMarquee items={marquee.items} preview={marquee.preview} />
      <ServiceSelector />
      <PlatformBlock />
      <IndustriesBlock />
      <HomePricing />
      <CTABlock
        title={COMMON_CTA.title}
        body={COMMON_CTA.body}
        note="Agentes, automatizaciones, software y web: elegimos el alcance según tu proceso."
        cta={{ label: "Agendar diagnóstico", href: "/diagnostico" }}
      />
    </>
  );
}
