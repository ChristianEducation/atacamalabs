import Link from "next/link";
import { ButtonLink } from "../ui/Button";
import { Reveal } from "../motion/Reveal";
import { PlatformWorkbench } from "../demos/PlatformWorkbench";
import { PricingGrid } from "../ui/Pricing";
import { AGENT_PLANS } from "@/content/marketing/pricing";
import { INDUSTRIES } from "@/content/marketing/nav";

/** F10 — Plataforma, bloque breve: copy 5/12 + recorte compacto de E31 7/12. */
export function PlatformBlock() {
  return (
    <section id="plataforma" className="mk-section--md mk-paper mk-platform-block" aria-labelledby="platform-title">
      <div className="mk-container mk-platform-block__grid">
        <Reveal className="mk-platform-block__copy">
          <p className="mk-eyebrow">Plataforma</p>
          <h2 id="platform-title" className="mk-h2">
            Todo el contexto, en un mismo lugar.
          </h2>
          <p className="mk-lead">
            Conversaciones, contactos y próximos pasos para acompañar el trabajo de tus agentes.
          </p>
          <div className="mk-platform-block__cta">
            <ButtonLink href="/plataforma" variant="secondary" arrow>
              Conoce la plataforma
            </ButtonLink>
          </div>
          <p className="mk-small mk-muted">
            Representación ilustrativa. Las vistas y funciones se configuran según tu solución.
          </p>
        </Reveal>
        <Reveal className="mk-platform-block__demo" delay={70}>
          <PlatformWorkbench compact />
        </Reveal>
      </div>
    </section>
  );
}

/** F7 — Encuentra tu contexto: siete enlaces/chips, Educación primero. Sin tarjetas ni demo. */
export function IndustriesBlock() {
  return (
    <section id="rubros" className="mk-section--sm mk-industries-block" aria-labelledby="industries-title">
      <div className="mk-container mk-industries-block__grid">
        <Reveal className="mk-industries-block__copy">
          <h2 id="industries-title" className="mk-h2">
            Cada rubro tiene su forma de trabajar.
          </h2>
          <p className="mk-lead">El proceso cambia. La tecnología debe adaptarse a él.</p>
        </Reveal>
        <Reveal className="mk-industries-block__links" delay={70}>
          <ul className="mk-chips">
            {INDUSTRIES.map((industry) => (
              <li key={industry.id}>
                <Link href={industry.href} className="mk-chip-link">
                  {industry.label}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mk-industries-block__more">
            <Link href="/rubros" className="mk-link">
              Ver todos los rubros
            </Link>
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/** F11 — Planes de agentes en Home (catálogo compartido R2; sin precios Web ni rankings). */
export function HomePricing() {
  return (
    <section id="planes" className="mk-section mk-paper" aria-labelledby="home-pricing-title">
      <div className="mk-container">
        <Reveal className="mk-heading-block mk-heading-block--center">
          <h2 id="home-pricing-title" className="mk-h2">
            Un punto de partida para tus agentes.
          </h2>
          <p className="mk-lead">Elige un alcance inicial y conversemos sobre tu operación.</p>
        </Reveal>
        <PricingGrid plans={AGENT_PLANS} featuresLimit={4} />
        <p className="mk-pricing-more">
          <Link href="/precios" className="mk-link">
            Ver todos los planes
          </Link>
        </p>
      </div>
    </section>
  );
}
