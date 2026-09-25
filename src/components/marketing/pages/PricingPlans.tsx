import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "../ui/Badge";
import { ButtonLink } from "../ui/Button";
import { Reveal } from "../motion/Reveal";
import { SnapCarousel } from "../ui/SnapCarousel";
import { AgentCtaLink } from "../shell/AgentCtaLink";
import {
  OCTOBER_BENEFIT,
  agentPlanContext,
  agentPrice,
  webPlanHref,
  webPrice,
  type AgentPlan,
  type WebPlan,
} from "@/content/marketing/pricing";
import { DETAILS_LABEL } from "@/content/marketing/pricing-page";

type Plan = AgentPlan | WebPlan;

function PlanDetails({ plan }: { plan: Plan }) {
  return (
    <details className="mk-pp-more">
      <summary>
        <span>{DETAILS_LABEL}</span>
        <ChevronDown size={16} aria-hidden />
      </summary>
      <div className="mk-pp-more__body">
        {plan.detailsIntro ? <p className="mk-pp-more__intro">{plan.detailsIntro}</p> : null}
        <ul>
          {plan.details.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        {plan.extra ? (
          <>
            <p className="mk-pp-more__intro">{plan.extra.title}</p>
            <ul>
              {plan.extra.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
    </details>
  );
}

/**
 * Tarjeta de plan (PRECIOS_SPEC §4). Cuatro cosas siempre a la vista en estado
 * cerrado: nombre, descripción, precio y CTA. Las filas se alinean entre
 * tarjetas con subgrid; «Ver todo lo incluido» abre solo la tarjeta que se toca.
 */
function PlanCard({ plan, index }: { plan: Plan; index: number }) {
  const agent = plan.family === "agentes" ? plan : null;
  const price = agent ? agentPrice(agent) : null;
  const web = plan.family === "web" ? webPrice(plan) : null;
  const headingId = `plan-${plan.family}-${plan.id}`;

  return (
    <Reveal as="article" delay={index * 80} className={cn("mk-pp-card", plan.featured && "is-featured")}>
      <header className="mk-pp-card__head">
        <h3 id={headingId} className="mk-pp-card__name">
          {plan.name}
        </h3>
        {plan.badge ? <Badge tone="blue">{plan.badge}</Badge> : null}
      </header>
      <p className="mk-pp-card__desc">{plan.description}</p>

      <div className="mk-pp-card__price" role="group" aria-label={(price ?? web)?.label}>
        {price && agent ? (
          <>
            <p className="mk-pp-card__amount">
              <strong>{price.amount}</strong>
              <span>{price.unit}</span>
            </p>
            <p className="mk-pp-card__regular">
              <s>{price.regular}</s>
              <em>{OCTOBER_BENEFIT.label}</em>
            </p>
            <p className="mk-pp-card__setup">{price.setup}</p>
          </>
        ) : null}
        {web ? (
          <>
            <p className="mk-pp-card__amount">
              <strong>{web.amount}</strong>
              <span>{web.unit}</span>
            </p>
            <p className="mk-pp-card__setup">{web.hosting}</p>
          </>
        ) : null}
      </div>

      <div className="mk-pp-card__features">
        <p className="mk-pp-card__label">{plan.sectionLabel}</p>
        <ul>
          {plan.summary.map((item) => (
            <li key={item}>
              <Check size={16} strokeWidth={2.2} aria-hidden />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mk-pp-card__cta">
        {agent ? (
          <AgentCtaLink
            context={agentPlanContext(agent, "precios", "agentes")}
            variant={agent.featured ? "primary" : "secondary"}
            className="mk-btn--block"
          >
            {agent.cta}
          </AgentCtaLink>
        ) : (
          <ButtonLink
            href={webPlanHref(plan as WebPlan, "precios", "web")}
            variant={plan.featured ? "primary" : "secondary"}
            block
          >
            {plan.cta}
          </ButtonLink>
        )}
      </div>

      <PlanDetails plan={plan} />
    </Reveal>
  );
}

/** Las tres tarjetas de una familia: grilla en escritorio, carrusel con snap en pantallas angostas. */
export function PlanCards({ plans, label }: { plans: readonly Plan[]; label: string }) {
  return (
    <SnapCarousel
      className="mk-pp-grid"
      label={label}
      start={Math.max(
        0,
        plans.findIndex((plan) => plan.featured),
      )}
    >
      {plans.map((plan, index) => (
        <PlanCard key={plan.id} plan={plan} index={index} />
      ))}
    </SnapCarousel>
  );
}
