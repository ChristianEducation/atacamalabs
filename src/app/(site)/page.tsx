import type { Metadata } from "next";
import { HomeHero } from "@/components/marketing/pages/HomeHero";
import { HomeIntegrations } from "@/components/marketing/pages/HomeIntegrations";
import { HomeSelector } from "@/components/marketing/pages/HomeSelector";
import { HomeValue } from "@/components/marketing/pages/HomeValue";
import { HomePricing } from "@/components/marketing/pages/HomePricing";
import { HomeCTA } from "@/components/marketing/pages/HomeCTA";
import { pageMetadata } from "@/lib/seo-metadata";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo-schema";

export const metadata: Metadata = pageMetadata({
  title: "Agentes de IA y automatización para empresas | Atacama Labs",
  description:
    "Implementamos agentes de IA, automatizaciones e integraciones que conversan, consultan información y ejecutan procesos conectados a las herramientas de tu empresa.",
  path: "/",
});

/**
 * Home — ATACAMA_LABS_HOME_SPEC_V1 §2. Orden: Hero → Integraciones →
 * Selector + demos → Valor comercial → Precios → CTA final. El valor comercial
 * (MASTER_PLAN_CONVERSION §5) es el único bloque agregado a ese orden.
 */
export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd()) }} />
      <HomeHero />
      <HomeIntegrations />
      <HomeSelector />
      <HomeValue />
      <HomePricing />
      <HomeCTA />
    </>
  );
}
