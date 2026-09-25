import { Check } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge } from "../ui/Badge";
import { ButtonLink } from "../ui/Button";
import { AgentCtaLink } from "../shell/AgentCtaLink";
import { SectionHeading } from "../ui/Blocks";
import { Reveal } from "../motion/Reveal";
import { SnapCarousel } from "../ui/SnapCarousel";
import { AGENT_PLANS, OCTOBER_BENEFIT, agentPlanContext, agentPrice } from "@/content/marketing/pricing";
import { HOME_CONSUMPTION_NOTE } from "@/content/marketing/pricing-page";

/**
 * Precios del Home — HOME_SPEC_V1 §7. Tres planes resumidos (Esencial /
 * Operación / Escala), Operación destacado. Los importes salen del catálogo
 * comercial (`AGENT_PLANS`, el mismo de /precios): aquí no se escribe ninguna
 * cifra. Los puntos y descripciones son un resumen; el detalle vive en /precios.
 */
const HOME_PLANS = [
  {
    catalog: 0,
    name: "Esencial",
    description: "Para empezar con un agente y un alcance inicial definido.",
    points: ["Un proceso inicial a delegar", "Conexión a las herramientas del proceso", "Puesta en marcha acompañada"],
    cta: "Empezar con Esencial",
    featured: false,
  },
  {
    catalog: 1,
    name: "Operación",
    description: "Para ampliar agentes, volumen y acompañamiento a medida que tu operación crece.",
    points: ["Varios agentes o procesos", "Más volumen y canales", "Acompañamiento continuo"],
    cta: "Empezar con Operación",
    featured: true,
  },
  {
    catalog: 2,
    name: "Escala",
    description: "Para equipos con mayor volumen, complejidad o necesidades de soporte.",
    points: ["Operación en varias áreas", "Integraciones y acciones más complejas", "Soporte acordado según necesidad"],
    cta: "Empezar con Escala",
    featured: false,
  },
] as const;

export function HomePricing() {
  return (
    <section id="precios" className="mk-section mk-t-sand" aria-labelledby="home-pricing-title">
      <div className="mk-container">
        <SectionHeading
          id="home-pricing-title"
          center
          title="Empieza con lo que necesitas hoy."
          lead="Elige un alcance inicial y escala cuando tu operación lo necesite."
        />

        <SnapCarousel className="mk-home-plans" label="Planes" start={HOME_PLANS.findIndex((plan) => plan.featured)}>
          {HOME_PLANS.map((plan, index) => {
            const source = AGENT_PLANS[plan.catalog];
            const price = agentPrice(source);
            return (
              <Reveal
                as="article"
                key={plan.name}
                delay={index * 70}
                className={cn("mk-home-plan", plan.featured && "is-featured")}
              >
                <div className="mk-home-plan__top">
                  <h3 className="mk-home-plan__name">{plan.name}</h3>
                  {plan.featured ? <Badge tone="blue">Para tu operación</Badge> : null}
                </div>
                <p className="mk-home-plan__desc">{plan.description}</p>
                <p className="mk-home-plan__price" aria-label={price.label}>
                  {price.amount}
                  <small>{price.unit}</small>
                </p>
                <p className="mk-home-plan__sub">
                  <s>{price.regular}</s> · {OCTOBER_BENEFIT.label}
                </p>
                <p className="mk-home-plan__sub">{price.setup}</p>
                <ul className="mk-home-plan__points">
                  {plan.points.map((point) => (
                    <li key={point}>
                      <Check size={16} strokeWidth={2.2} aria-hidden />
                      {point}
                    </li>
                  ))}
                </ul>
                <AgentCtaLink
                  context={agentPlanContext(source, "home", "pricing")}
                  variant={plan.featured ? "primary" : "secondary"}
                  className="mk-btn--block"
                >
                  Quiero este plan
                </AgentCtaLink>
              </Reveal>
            );
          })}
        </SnapCarousel>

        <p className="mk-home-plans__note">
          {HOME_CONSUMPTION_NOTE.text}{" "}
          <Link href={HOME_CONSUMPTION_NOTE.link.href} className="mk-link">
            {HOME_CONSUMPTION_NOTE.link.label}
          </Link>
        </p>

        <p className="mk-pricing-more">
          <ButtonLink href="/precios#agentes" variant="tertiary" arrow>
            Ver todos los precios
          </ButtonLink>
        </p>
      </div>
    </section>
  );
}
