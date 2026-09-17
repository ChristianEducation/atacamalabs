import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import {
  Container,
  Eyebrow,
  PrimaryLink,
  SecondaryLink,
} from "@/components/ui";
import {
  PortalMotif,
  CaseVisual,
  LandscapeCta,
} from "@/components/PublicVisuals";
import site, { publicCase } from "@/lib/content";

export default function Home() {
  const c = publicCase(site.cases[0]);
  return (
    <div className="public-site flex flex-col flex-1 bg-background">
      <SiteHeader />
      <main id="contenido" className="flex-1" tabIndex={-1}>
        <section className="home-hero">
          <picture className="hero-picture">
            <source
              media="(max-width:767px)"
              srcSet="/visual/home/hero-atacama-mobile.webp"
            />
            {/* Art-directed source avoids loading both crops. */}
            <img
              src="/visual/home/hero-atacama-wide.webp"
              alt=""
              width={2400}
              height={1350}
              fetchPriority="high"
            />
          </picture>
          <Container className="hero-content">
            <Eyebrow>{site.hero.eyebrow}</Eyebrow>
            <h1>{site.hero.title}</h1>
            <p className="hero-body">{site.hero.body}</p>
            <p className="hero-support">{site.hero.supportingLine}</p>
            <div className="hero-buttons">
              <PrimaryLink href={site.hero.primaryCta.href}>
                {site.hero.primaryCta.label}{" "}
                <span aria-hidden className="ml-3">
                  →
                </span>
              </PrimaryLink>
              <SecondaryLink href={site.hero.secondaryCta.href}>
                {site.hero.secondaryCta.label}
              </SecondaryLink>
            </div>
          </Container>
          <p className="hero-side-note">
            DESDE EL NORTE
            <br />
            PARA EMPRESAS REALES
          </p>
        </section>
        <section className="section">
          <Container>
            <Eyebrow>Tecnología con propósito</Eyebrow>
            <h2 className="mt-3">Lo que hacemos</h2>
            <p className="section-lead">
              Agentes, sistemas y automatización para empresas.
            </p>
            <div className="portal-grid">
              {site.portals.map((portal, i) => (
                <article key={portal.href} className="service-portal">
                  <div className="portal-copy">
                    <span className="portal-number">0{i + 1}</span>
                    <h3>{portal.title}</h3>
                    <p>{portal.summary}</p>
                    <Link href={portal.href} className="portal-cta">
                      {portal.cta}
                      <span aria-hidden>→</span>
                    </Link>
                  </div>
                  <div className="portal-visual">
                    <PortalMotif motif={portal.motif} />
                  </div>
                </article>
              ))}
            </div>
          </Container>
        </section>
        <div className="credibility">
          <Container className="credibility-inner">
            <p>
              <span aria-hidden>↗</span> Implementación por etapas
            </p>
            <p>
              <span aria-hidden>⌁</span> Integración con tus sistemas
            </p>
            <p>
              <span aria-hidden>△</span> Desde Antofagasta
            </p>
          </Container>
        </div>
        <section className="section">
          <Container className="featured-grid">
            <div>
              <Eyebrow>Una solución construida</Eyebrow>
              <h2 className="mt-4">{c.title}</h2>
              <p>{c.situation}</p>
              <p>{c.solution}</p>
              <Link className="text-link" href={`/proyectos/${c.slug}`}>
                Ver el caso completo →
              </Link>
            </div>
            <CaseVisual steps={c.diagramSteps} />
          </Container>
        </section>
        <section className="home-process">
          <Container className="process-grid">
            <div>
              <Eyebrow>Cómo trabajamos</Eyebrow>
              <h2 className="mt-3">
                Del proceso real a una solución concreta.
              </h2>
              <Link
                href="/como-trabajamos"
                className="text-link inline-block mt-4"
              >
                Ver cómo trabajamos →
              </Link>
            </div>
            <ol>
              {site.process.map((step, i) => (
                <li key={step.title}>
                  <span className="step-number">0{i + 1}</span>
                  <h3>
                    {
                      [
                        "Entendemos",
                        "Definimos",
                        "Implementamos",
                        "Acompañamos",
                      ][i]
                    }
                  </h3>
                  <p>
                    {
                      [
                        "Revisamos el proceso y lo que necesitas mejorar.",
                        "Acordamos alcance, entregables e inversión.",
                        "Construimos y conectamos por etapas.",
                        "Documentamos y acordamos el soporte.",
                      ][i]
                    }
                  </p>
                </li>
              ))}
            </ol>
          </Container>
        </section>
        <LandscapeCta />
      </main>
      <SiteFooter />
    </div>
  );
}
