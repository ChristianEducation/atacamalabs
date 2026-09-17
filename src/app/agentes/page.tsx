import type { Metadata } from "next";
import Image from "next/image";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import {
  Container,
  Eyebrow,
  PrimaryLink,
  SecondaryLink,
} from "@/components/ui";
import { AgentVisual, LandscapeCta } from "@/components/PublicVisuals";
import { AgentPlans } from "@/components/AgentPlans";
import { AgentDemo } from "@/components/AgentDemo";
import { agentsOffer as offer, demoIsReady } from "@/lib/agents-offer";

export const metadata: Metadata = {
  title: "Agentes para tu empresa | Atacama Labs",
  description:
    "Agentes para atender, vender, agendar y ejecutar tareas conectadas con tus herramientas. Implementación por proceso, planes y soluciones a medida.",
  alternates: { canonical: "/agentes" },
};
export default function Agentes() {
  const ready = demoIsReady(offer.demo);
  const hero = offer.landing.hero;
  const primary = ready ? hero.readyPrimaryCta : hero.pendingPrimaryCta;
  const secondary = ready ? hero.readySecondaryCta : hero.pendingSecondaryCta;
  return (
    <div className="public-site flex flex-col flex-1 bg-background">
      <SiteHeader />
      <main id="contenido" tabIndex={-1}>
        <section className="section">
          <Container className="internal-hero">
            <div>
              <Eyebrow>Agentes de Atacama Labs</Eyebrow>
              <h1 className="mt-4">{hero.title}</h1>
              <p className="section-lead">{hero.body}</p>
              <p className="mt-5 text-sm text-muted">
                {offer.product.agentDefinition}
              </p>
              <div className="hero-buttons">
                <PrimaryLink href={primary.href}>{primary.label} →</PrimaryLink>
                <SecondaryLink href={secondary.href}>
                  {secondary.label}
                </SecondaryLink>
              </div>
            </div>
            <AgentVisual />
          </Container>
        </section>
        <section id="capacidades" className="section">
          <Container>
            <Eyebrow>Más allá de conversar</Eyebrow>
            <h2 className="mt-3">Conversan. Conectan. Hacen.</h2>
            <div className="capabilities-grid">
              {offer.landing.capabilities.map((c, i) => (
                <article key={c.name} className="capability">
                  <span>0{i + 1}</span>
                  <div>
                    <h3>{c.name}</h3>
                    <p>{c.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </Container>
        </section>
        <section id="procesos" className="section">
          <Container>
            <Eyebrow>Un agente, un proceso principal</Eyebrow>
            <h2 className="mt-3">Cuatro formas de empezar.</h2>
            <p className="section-lead">
              Ejemplos de procesos; el alcance se configura para tu empresa.
            </p>
            <div className="flows-grid">
              {offer.landing.processExamples.map((flow) => (
                <article key={flow.id} className="process-flow">
                  <h3>{flow.name}</h3>
                  <p className="mt-3 text-sm text-muted">
                    {
                      (
                        {
                          ventas:
                            "Acompaña cada oportunidad hasta su próximo paso.",
                          atencion:
                            "Responde con contexto y deriva cuando hace falta.",
                          agenda:
                            "Coordina disponibilidad, reserva y confirmación.",
                          seguimiento:
                            "Retoma oportunidades y entrega el contexto al equipo.",
                        } as Record<string, string>
                      )[flow.id]
                    }
                  </p>
                  <ol className="flow-steps">
                    {flow.steps.map((step, i) => (
                      <li key={step}>
                        <span>0{i + 1}</span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </article>
              ))}
            </div>
          </Container>
        </section>
        <section id="integraciones" className="section warm-section">
          <Container>
            <Eyebrow>Canales y conexiones</Eyebrow>
            <h2 className="mt-3">{offer.integrations.title}</h2>
            <div className="integration-groups">
              <div>
                <h3>Canales</h3>
                <ul className="integration-labels">
                  {offer.integrations.channels.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3>Herramientas</h3>
                <ul className="integration-labels">
                  {offer.integrations.tools.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="integration-notes">
              <div>
                <p className="font-medium">
                  {offer.integrations.connectionClaim.publicCopy}
                </p>
                <p className="mt-3">{offer.integrations.commonAvailability}</p>
              </div>
              <p>{offer.integrations.apiCopy}</p>
            </div>
          </Container>
        </section>
        <section id="como-funciona" className="section">
          <Container>
            <Eyebrow>Cómo funciona</Eyebrow>
            <h2 className="mt-3">De tu proceso al trabajo diario.</h2>
            <ol className="onboarding-list">
              {offer.landing.onboardingSteps.map((step, i) => (
                <li key={step}>
                  <span className="step-number">0{i + 1}</span>
                  <h3>{step}</h3>
                </li>
              ))}
            </ol>
            <p className="implementation-claim">
              {offer.landing.implementationClaim}
            </p>
            <p className="implementation-qualifier">
              {offer.landing.implementationQualifier}
            </p>
          </Container>
        </section>
        <section id="demo" className="section">
          <Container className="demo-grid">
            <div>
              <Eyebrow>Una demostración para tu empresa</Eyebrow>
              <h2 className="mt-3">{offer.demo.title}</h2>
              <p className="section-lead">
                Explora cómo un agente puede conocer tu empresa, identificar
                procesos y orientar el siguiente paso.
              </p>
            </div>
          <AgentDemo config={offer.demo} preview={process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview"} />
          </Container>
        </section>
        <section id="plataforma" className="section warm-section">
          <Container className="platform-grid">
            <div>
              <Eyebrow>Experiencia del cliente</Eyebrow>
              <h2 className="mt-3">{offer.platform.title}</h2>
              <p className="section-lead">{offer.platform.body}</p>
            </div>
            {offer.platform.screenshotPath ? (
              <Image
                src={offer.platform.screenshotPath}
                alt="Plataforma de Atacama Labs con agentes y conversaciones de demostración"
                width={1600}
                height={1000}
                className="rounded-2xl"
                sizes="(max-width:1023px) 100vw, 60vw"
              />
            ) : (
              <div className="platform-note">
                <p>Un espacio de trabajo para tus agentes y tu equipo.</p>
                <p>
                  En la demostración revisamos la experiencia de acceso, las
                  conversaciones y el alcance de la configuración para tu
                  empresa.
                </p>
              </div>
            )}
          </Container>
        </section>
        <section id="planes" className="section">
          <Container>
            <Eyebrow>Planes de agentes</Eyebrow>
            <h2 className="mt-3">
              Empieza con un proceso. Amplía cuando lo necesites.
            </h2>
            <AgentPlans
              pricing={offer.pricing}
              commonAvailability={offer.integrations.commonAvailability}
            />
          </Container>
        </section>
        <section id="a-medida" className="section warm-section">
          <Container className="custom-grid">
            <div>
              <Eyebrow>Soluciones a medida</Eyebrow>
              <h2 className="mt-3">{offer.landing.custom.title}</h2>
              <p className="section-lead">{offer.landing.custom.body}</p>
            </div>
            <SecondaryLink href={offer.landing.custom.cta.href}>
              {offer.landing.custom.cta.label} →
            </SecondaryLink>
          </Container>
        </section>
        <LandscapeCta title={offer.landing.finalCta.title} />
      </main>
      <SiteFooter />
    </div>
  );
}
