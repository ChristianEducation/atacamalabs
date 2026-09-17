import { PrimaryLink, SecondaryLink } from "@/components/ui";
import { money, type AgentPricing } from "@/lib/agents-offer";

export function AgentPlans({
  pricing,
  commonAvailability,
}: {
  pricing: AgentPricing;
  commonAvailability: string;
}) {
  const promo = pricing.promoEnabled && Boolean(pricing.promoTerms);
  return (
    <>
      {pricing.priceMode === "reference" && (
        <p className="section-lead">{pricing.referenceLabel}</p>
      )}
      <div className="pricing-grid">
        {pricing.plans.map((plan) => {
          const setup =
            promo && plan.promoSetupPrice !== null
              ? plan.promoSetupPrice
              : plan.setupPrice;
          const from = promo ? plan.promoSetupFrom : plan.setupFrom;
          return (
            <article
              key={plan.id}
              className={`plan-card ${plan.featured ? "featured" : ""}`}
            >
              {plan.featured && (
                <span className="plan-badge">
                  {"featuredLabel" in plan ? plan.featuredLabel : "Destacado"}
                </span>
              )}
              <h3>{plan.name}</h3>
              <p className="plan-description">{plan.description}</p>
              <p className="agent-quantity">
                {plan.agentLimit === 1
                  ? "1 agente"
                  : `Hasta ${plan.agentLimit} agentes`}
              </p>
              <p className="plan-price">
                {money(plan.monthlyPrice, pricing.locale, pricing.currency)}
                <span className="price-period">CLP / mes</span>
              </p>
              <p className="plan-setup">
                Implementación: {from && setup !== null ? "desde " : ""}
                {money(setup, pricing.locale, pricing.currency)}
                <br />
                <span className="text-muted">Pago único</span>
              </p>
              {promo && plan.promoLabel && (
                <p className="mt-3 text-sm text-action">{plan.promoLabel}</p>
              )}
              <ul>
                {plan.features.map((feature) => (
                  <li key={feature}>✓ {feature}</li>
                ))}
                <li>{commonAvailability}</li>
                {plan.supportLevel && <li>{plan.supportLevel}</li>}
              </ul>
              <div className="plan-action">
                {plan.featured ? (
                  <PrimaryLink href={plan.cta.href}>
                    {plan.cta.label}
                  </PrimaryLink>
                ) : (
                  <SecondaryLink href={plan.cta.href}>
                    {plan.cta.label}
                  </SecondaryLink>
                )}
              </div>
            </article>
          );
        })}
      </div>
      <div className="pricing-notes">
        <div>
          <p>
            {pricing.agentAdditionalPrice === null
              ? pricing.agentAdditionalLabel
              : `Agente adicional: ${money(pricing.agentAdditionalPrice, pricing.locale, pricing.currency)}${pricing.agentAdditionalPeriod ? ` / ${pricing.agentAdditionalPeriod}` : ""}`}
          </p>
          <p className="mt-3">
            Cada agente se configura para una función o proceso principal.
          </p>
        </div>
        <div>
          <p>{pricing.usageNote}</p>
          <p className="mt-3">
            El alcance del acompañamiento y soporte se acuerda en la propuesta.
          </p>
          {pricing.taxTreatment && <p>{pricing.taxTreatment}</p>}
          {promo && pricing.promoTerms && <p>{pricing.promoTerms}</p>}
        </div>
      </div>
    </>
  );
}
