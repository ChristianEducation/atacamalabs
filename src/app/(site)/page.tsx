import type { Metadata } from "next";
import { HomeHero } from "@/components/marketing/pages/HomeHero";
import { HomeIntegrations } from "@/components/marketing/pages/HomeIntegrations";
import { HomeSelector } from "@/components/marketing/pages/HomeSelector";
import { HomePricing } from "@/components/marketing/pages/HomePricing";
import { HomeCTA } from "@/components/marketing/pages/HomeCTA";

export const metadata: Metadata = {
  title: "Atacama Labs — Agentes que trabajan en tu empresa",
  description:
    "Agentes inteligentes que se conectan a tus herramientas, ejecutan procesos y trabajan junto a tu equipo.",
  alternates: { canonical: "/" },
};

/**
 * Home — ATACAMA_LABS_HOME_SPEC_V1 §2. Orden: Hero → Integraciones →
 * Selector + demos → Precios → CTA final. No se agregan bloques fuera de este
 * orden.
 */
export default function Home() {
  return (
    <>
      <HomeHero />
      <HomeIntegrations />
      <HomeSelector />
      <HomePricing />
      <HomeCTA />
    </>
  );
}
