import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Bot, Workflow, LayoutDashboard } from "lucide-react";
import { PageHero } from "@/components/marketing/pages/Common";
import {
  IndustryAgentDemo,
  IndustryDashboard,
  IndustryFlow,
  IndustryHeroPanel,
} from "@/components/marketing/demos/IndustryDemos";
import { CTABlock, FAQ, SectionHeading } from "@/components/marketing/ui/Blocks";
import { Reveal } from "@/components/marketing/motion/Reveal";
import { ButtonLink } from "@/components/marketing/ui/Button";
import { INDUSTRY_COMMON_FAQ, INDUSTRY_LIST, getIndustry } from "@/content/marketing/industries";

export function generateStaticParams() {
  return INDUSTRY_LIST.map((i) => ({ slug: i.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const industry = getIndustry(slug);
  if (!industry) return {};
  const description = industry.lead.length > 160 ? `${industry.lead.slice(0, 157).trimEnd()}…` : industry.lead;
  return {
    title: industry.seoTitle,
    description,
    alternates: { canonical: `/rubros/${industry.slug}` },
  };
}

export default async function IndustryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const industry = getIndustry(slug);
  if (!industry) notFound();
  const q = `industria=${industry.slug}`;
  const blocks = [
    { icon: Bot, ...industry.agent, href: "/agentes", label: "Ver agentes" },
    { icon: Workflow, ...industry.automation, href: "/a-medida#flujos", label: "Ver automatizaciones" },
    { icon: LayoutDashboard, ...industry.custom, href: "/a-medida#software", label: "Ver soluciones a medida" },
  ];

  return (
    <>
      <PageHero
        eyebrow={`SOLUCIONES PARA ${industry.name.toUpperCase()}`}
        title={industry.h1}
        lead={industry.lead}
        actions={[
          { label: "Revisar mi proceso", href: `/diagnostico?${q}` },
          { label: "Ver ejemplo", href: "#agente-en-accion", variant: "secondary" },
        ]}
      >
        <IndustryHeroPanel industry={industry} />
      </PageHero>

      <section className="mk-section--md mk-paper" aria-labelledby="pains-title">
        <div className="mk-container">
          <div className="mk-ind-pains">
            <SectionHeading id="pains-title" center title="Cuando la información llega por todas partes." />
            <ol className="mk-ind-pains__list">
              {industry.pains.map((pain, i) => (
                <Reveal as="li" key={pain} delay={i * 70}>
                  <span className="mk-steps__num" aria-hidden>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <p>{pain}</p>
                </Reveal>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="mk-section--md mk-paper mk-ind-connect" aria-labelledby="connect-title">
        <div className="mk-container">
          <SectionHeading id="connect-title" center title="Atención, automatización y una operación conectada." />
          <ul className="mk-ind-blocks">
            {blocks.map((b, i) => (
              <Reveal as="li" key={b.title} delay={i * 70}>
                <span className="mk-features__icon" aria-hidden>
                  <b.icon size={22} />
                </span>
                <h3 className="mk-h5">{b.title}</h3>
                <p>{b.body}</p>
                <Link href={b.href} className="mk-link">
                  {b.label}
                </Link>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      <section className="mk-section--md" aria-labelledby="agent-title">
        <div className="mk-container">
          <SectionHeading
            id="agent-title"
            title="Una conversación que deja el siguiente paso claro."
            lead="El agente obtiene contexto, consulta lo necesario y deja un registro útil para tu equipo."
          />
          <IndustryAgentDemo industry={industry} />
          <p className="mk-ag-cta">
            <Link href="/agentes" className="mk-link">
              Ver capacidades de agentes
            </Link>
          </p>
        </div>
      </section>

      <section className="mk-section--md mk-paper" aria-labelledby="flow-title">
        <div className="mk-container">
          <SectionHeading id="flow-title" title="Así puede recorrer tu operación." />
          <IndustryFlow industry={industry} />
          <p className="mk-ag-cta">
            <ButtonLink href={`/diagnostico?${q}`} variant="secondary" arrow>
              Diseñar mi flujo
            </ButtonLink>
          </p>

          <div className="mk-ind-dash">
            <div className="mk-ag-copy">
              <h2 className="mk-h2">{industry.panel.heading}</h2>
              <p>Un ejemplo de cómo podrías ordenar esta parte de tu operación.</p>
              {industry.factualNote ? <p className="mk-small mk-muted">{industry.factualNote}</p> : null}
              <div>
                <ButtonLink href={`/diagnostico?necesidad=a-medida&${q}`} variant="secondary" arrow>
                  Explorar una solución a medida
                </ButtonLink>
              </div>
              {industry.k6Extra ? (
                <p>
                  <Link href={industry.k6Extra.href} className="mk-link">
                    {industry.k6Extra.label}
                  </Link>
                </p>
              ) : null}
            </div>
            <IndustryDashboard industry={industry} />
          </div>
        </div>
      </section>

      <section className="mk-section--md" aria-labelledby="faq-title">
        <div className="mk-container mk-ind-faq">
          <SectionHeading id="faq-title" title="Preguntas sobre tu operación." />
          <FAQ items={[...industry.faqs, INDUSTRY_COMMON_FAQ]} />
          <p className="mk-ag-cta">
            <Link href={`/diagnostico?${q}`} className="mk-link">
              Consultar otro punto
            </Link>
          </p>
        </div>
      </section>

      <CTABlock
        title={`Conversemos sobre ${industry.closing}.`}
        body="Revisamos el proceso contigo y definimos el siguiente paso."
        cta={{ label: "Agendar diagnóstico", href: `/diagnostico?${q}` }}
      />
    </>
  );
}
