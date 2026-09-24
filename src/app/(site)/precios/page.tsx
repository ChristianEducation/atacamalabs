import type { Metadata } from "next";
import { HeroShell } from "@/components/marketing/pages/HeroShell";
import { SoftCTA } from "@/components/marketing/pages/HomeCTA";
import { PricingReceipt } from "@/components/marketing/pages/PricingReceipt";
import { PricingFaq } from "@/components/marketing/pages/PricingFaq";
import { AgentPlansSection, BillingSection, WebPlansSection } from "@/components/marketing/pages/PricingSections";
import { SectionHeading } from "@/components/marketing/ui/Blocks";
import {
  FAQ_HEADING,
  PRICING_CTA,
  PRICING_FINAL_NAYRA,
  PRICING_HERO,
  PRICING_META,
} from "@/content/marketing/pricing-page";

export const metadata: Metadata = {
  title: { absolute: PRICING_META.title },
  description: PRICING_META.description,
  alternates: { canonical: PRICING_META.canonical },
  openGraph: {
    title: PRICING_META.title,
    description: PRICING_META.description,
    url: PRICING_META.canonical,
    type: "website",
  },
};

/**
 * /precios (PRECIOS_SPEC_V2_FINAL): hero con «la boleta» que explica cómo se
 * compone un plan → planes de Agentes (Paper) con su tabla → cómo funciona el
 * cobro (Sand) → formatos de Páginas Web (Blue Mist) con su tabla → FAQ (Paper)
 * → cierre suave. Los planes de agentes abren a Nayra con el plan como contexto;
 * ninguno lleva directo a un checkout.
 */
export default function PricingPage() {
  return (
    <>
      <HeroShell
        size="m"
        eyebrow={PRICING_HERO.eyebrow}
        title={
          <>
            Elige el plan que mejor se adapte a tu <span className="mk-hero__accent">operación</span>.
          </>
        }
        lead={PRICING_HERO.lead}
        trust={PRICING_HERO.trust}
        actions={PRICING_HERO.links.map((link) => ({ ...link, variant: "tertiary" as const }))}
        visual={<PricingReceipt />}
        className="mk-hero--pricing"
      />

      <AgentPlansSection />
      <BillingSection />
      <WebPlansSection />

      <section id="faq" className="mk-section mk-t-paper mk-pp-section" aria-labelledby="pricing-faq-title">
        <div className="mk-container">
          <SectionHeading id="pricing-faq-title" center eyebrow={FAQ_HEADING.eyebrow} title={FAQ_HEADING.title} />
          <PricingFaq />
        </div>
      </section>

      <SoftCTA
        titleId="pricing-cta-title"
        title={PRICING_CTA.title}
        body={PRICING_CTA.body}
        primary={PRICING_CTA.primary}
        secondary={{ label: PRICING_CTA.secondary.label, href: "/diagnostico", agent: PRICING_FINAL_NAYRA }}
      />
    </>
  );
}
