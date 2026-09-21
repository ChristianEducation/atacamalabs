import Link from "next/link";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "./Badge";
import { Reveal } from "../motion/Reveal";
import {
  PRICE_PENDING_COPY,
  renderPrice,
  type Plan,
} from "@/content/marketing/pricing";

/**
 * E20 PricingCard — orden exacto: nombre → descripción → precio → periodicidad →
 * setup separado → inclusiones (4–6 filas) → términos → CTA al pie.
 * Null nunca es 0/gratis. Sin precio tachado, sin urgencia, sin cifras animadas.
 * El CTA expresa intención de plan (diagnóstico), no checkout.
 */
export function PricingCard<Id extends string>({
  plan,
  delay = 0,
  featuresLimit = 4,
}: {
  plan: Plan<Id>;
  delay?: number;
  featuresLimit?: number;
}) {
  const price = renderPrice(plan.price);
  const ctaLabel =
    price.cta === "request"
      ? plan.cta.label.replace("Consultar", "Solicitar")
      : price.cta === "alternatives"
        ? "Consultar alternativas"
        : plan.cta.label;
  const headingId = `plan-${plan.family}-${plan.id}`;
  const setupText =
    plan.price.setupStatus === "included"
      ? "Configuración inicial incluida."
      : plan.price.setupStatus === "separate" && plan.price.setupAmountCLP !== null
        ? `Configuración inicial aparte: CLP $${new Intl.NumberFormat("es-CL").format(plan.price.setupAmountCLP)}.`
        : plan.price.setupStatus === "not_applicable"
          ? null
          : "Configuración inicial: a definir en propuesta.";

  return (
    <Reveal
      as="article"
      delay={delay}
      className={cn("mk-plan", plan.highlighted && "is-highlighted")}
      style={undefined}
    >
      <div aria-labelledby={headingId} role="group" className="mk-plan__inner">
        <div className="mk-plan__top">
          <h3 id={headingId} className="mk-plan__name">
            {plan.name}
          </h3>
          {plan.badge ? <Badge tone="blue">{plan.badge}</Badge> : null}
        </div>
        <p className="mk-plan__desc">{plan.description}</p>
        <p className="mk-plan__price mk-tabular" aria-label={price.accessibleLabel}>
          {price.headline}
        </p>
        <p className="mk-plan__period">{price.sub}</p>
        {setupText ? <p className="mk-plan__setup">{setupText}</p> : null}
        <hr className="mk-plan__sep" />
        <ul className="mk-plan__features">
          {plan.features.slice(0, featuresLimit).map((feature) => (
            <li key={feature.label}>
              <Check size={16} aria-hidden strokeWidth={2} />
              <span>
                <strong>{feature.label}:</strong> {feature.confirmed && feature.value ? feature.value : PRICE_PENDING_COPY.value}
              </span>
            </li>
          ))}
        </ul>
        <p className="mk-plan__terms">
          {plan.family === "agentes"
            ? "Un mismo agente puede combinar acciones si el alcance, los permisos y las integraciones lo permiten."
            : PRICE_PENDING_COPY.webDelivery + "."}
        </p>
        <Link href={plan.cta.href} className={cn("mk-btn", plan.highlighted ? "mk-btn--primary" : "mk-btn--secondary", "mk-btn--block")}>
          {ctaLabel}
        </Link>
      </div>
    </Reveal>
  );
}

export function PricingGrid<Id extends string>({ plans, featuresLimit }: { plans: readonly Plan<Id>[]; featuresLimit?: number }) {
  return (
    <div className="mk-pricing-grid">
      {plans.map((plan, index) => (
        <PricingCard key={plan.id} plan={plan} delay={index * 70} featuresLimit={featuresLimit} />
      ))}
    </div>
  );
}
