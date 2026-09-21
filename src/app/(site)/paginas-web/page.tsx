import type { Metadata } from "next";
import Link from "next/link";
import { Code2, Globe2, LineChart, Mail, Plug, Smartphone } from "lucide-react";
import { FeatureGrid, ProcessSteps } from "@/components/marketing/pages/Common";
import { WebConnected, WebHero } from "@/components/marketing/pages/WebSections";
import { PricingGrid } from "@/components/marketing/ui/Pricing";
import { FAQ, SectionHeading } from "@/components/marketing/ui/Blocks";
import { Reveal } from "@/components/marketing/motion/Reveal";
import { WEB_PLANS } from "@/content/marketing/pricing";
import { WEB_BLOCKS, WEB_FAQ, WEB_META, WEB_STEPS } from "@/content/marketing/web";

export const metadata: Metadata = {
  title: "Páginas Web — Atacama Labs",
  description: WEB_META,
  alternates: { canonical: "/paginas-web" },
};

const ICONS = [Smartphone, Code2, Mail, LineChart, Globe2, Plug];

export default function WebsitesPage() {
  return (
    <>
      <WebHero />

      <section className="mk-section--md" aria-labelledby="blocks-title">
        <div className="mk-container">
          <SectionHeading id="blocks-title" title="Diseño cuidado. Funcionamiento claro." />
          <FeatureGrid
            columns={2}
            items={WEB_BLOCKS.map((b, i) => {
              const Icon = ICONS[i];
              return { icon: <Icon size={20} />, title: `${String(i + 1).padStart(2, "0")} · ${b.title}`, body: b.body };
            })}
          />
          <p className="mk-ag-cta">
            <Link href="#planes" className="mk-link">
              Comparar planes
            </Link>
          </p>
        </div>
      </section>

      <section id="planes" className="mk-section mk-paper" aria-labelledby="plans-title">
        <div className="mk-container">
          <SectionHeading
            id="plans-title"
            title="Elige el punto de partida de tu web."
            lead="Revisa el formato y conversemos sobre contenido, funciones e integraciones."
          />
          <PricingGrid plans={WEB_PLANS} featuresLimit={6} />
        </div>
      </section>

      <section className="mk-section--md" aria-labelledby="steps-title">
        <div className="mk-container">
          <SectionHeading id="steps-title" title="Del contenido a una web publicada." />
          <ProcessSteps steps={WEB_STEPS} columns={4} />
          <p className="mk-ag-cta">
            <Link href="/diagnostico?necesidad=web" className="mk-link">
              Planificar mi web
            </Link>
          </p>
        </div>
      </section>

      <section className="mk-section--md mk-paper" aria-labelledby="faq-title">
        <div className="mk-container mk-ag-split mk-ag-split--4-8">
          <Reveal className="mk-ag-copy">
            <h2 id="faq-title" className="mk-h2">
              Lo que conviene aclarar antes.
            </h2>
            <p>
              <Link href="/diagnostico?necesidad=web" className="mk-link">
                Consultar mi caso
              </Link>
            </p>
          </Reveal>
          <FAQ items={WEB_FAQ} />
        </div>
      </section>

      <WebConnected />
    </>
  );
}
