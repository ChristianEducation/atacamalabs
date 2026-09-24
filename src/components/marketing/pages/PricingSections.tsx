import type { CSSProperties } from "react";
import { CalendarClock, Gauge, Rocket, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { Reveal } from "../motion/Reveal";
import { SectionHeading } from "../ui/Blocks";
import { SnapCarousel } from "../ui/SnapCarousel";
import { PlanCards } from "./PricingPlans";
import { PricingCompare } from "./PricingCompare";
import { OCTOBER_BENEFIT, AGENT_PLANS, WEB_PLANS } from "@/content/marketing/pricing";
import {
  AGENT_COMPARE,
  AGENT_PLANS_CUSTOM,
  AGENT_PLANS_CUSTOM_LINK,
  AGENT_PLANS_HEADING,
  BILLING_HEADING,
  BILLING_STEPS,
  AI_MODELS,
  CREDIT_BLOCK,
  USAGE_BLOCK,
  WEB_COMPARE,
  WEB_EXTRAS,
  WEB_PLANS_HEADING,
} from "@/content/marketing/pricing-page";

/* ---------- Planes de Agentes + tabla ---------- */

export function AgentPlansSection() {
  return (
    <section id="agentes" className="mk-section mk-t-paper mk-pp-section" aria-labelledby="agent-plans-title">
      <div className="mk-container">
        <SectionHeading
          id="agent-plans-title"
          center
          eyebrow={AGENT_PLANS_HEADING.eyebrow}
          title={AGENT_PLANS_HEADING.title}
          lead={AGENT_PLANS_HEADING.lead}
        />
        <PlanCards plans={AGENT_PLANS} label="Planes de agentes" />
        <p className="mk-pp-benefit">{OCTOBER_BENEFIT.note}</p>
        <p className="mk-pp-custom">
          {AGENT_PLANS_CUSTOM}{" "}
          <Link href={AGENT_PLANS_CUSTOM_LINK.href} className="mk-link">
            {AGENT_PLANS_CUSTOM_LINK.label}
          </Link>
        </p>
        <Reveal>
          <PricingCompare data={AGENT_COMPARE} />
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- Cómo funciona el cobro ---------- */

const STEP_ICON: Record<string, LucideIcon> = {
  implementacion: Rocket,
  operacion: CalendarClock,
  consumo: Gauge,
};

export function BillingSection() {
  return (
    <section id="cobro" className="mk-section mk-t-sand mk-pp-section" aria-labelledby="billing-title">
      <div className="mk-container">
        <SectionHeading
          id="billing-title"
          center
          eyebrow={BILLING_HEADING.eyebrow}
          title={BILLING_HEADING.title}
          lead={BILLING_HEADING.lead}
        />

        <SnapCarousel className="mk-pp-steps" label="Conceptos del cobro">
          {BILLING_STEPS.map((step, index) => {
            const Icon = STEP_ICON[step.id];
            return (
              <Reveal key={step.id} as="article" delay={index * 90} className="mk-pp-step">
                <span className="mk-pp-step__ic">
                  <Icon size={22} strokeWidth={1.8} aria-hidden />
                </span>
                <p className="mk-pp-step__tag">{step.tag}</p>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
                <p className="mk-pp-step__note">{step.note}</p>
              </Reveal>
            );
          })}
        </SnapCarousel>

        <div className="mk-pp-usage">
          <Reveal as="section" className="mk-pp-credit" aria-label={CREDIT_BLOCK.title}>
            <h3>{CREDIT_BLOCK.title}</h3>
            <p className="mk-pp-credit__lead">{CREDIT_BLOCK.lead}</p>
            <ul>
              {CREDIT_BLOCK.rows.map((row) => (
                <li key={row.plan}>
                  <span>{row.plan}</span>
                  <strong>{row.value}</strong>
                </li>
              ))}
            </ul>
            <p>{CREDIT_BLOCK.whatsapp}</p>
          </Reveal>

          <Reveal as="section" delay={90} className="mk-pp-ref" aria-label={USAGE_BLOCK.title}>
            <h3>{USAGE_BLOCK.title}</h3>
            <table>
              <thead>
                <tr>
                  {USAGE_BLOCK.head.map((label) => (
                    <th key={label} scope="col">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {USAGE_BLOCK.rows.map(([level, value]) => (
                  <tr key={level}>
                    <th scope="row">{level}</th>
                    <td>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p>
              <strong>Valores orientativos.</strong> {USAGE_BLOCK.note.replace("Valores orientativos. ", "")}
            </p>
          </Reveal>
        </div>

        <Reveal className="mk-pp-models">
          <h3>{AI_MODELS.title}</h3>
          <p>{AI_MODELS.body}</p>
          <ul aria-label="Proveedores de modelos de IA">
            {AI_MODELS.providers.map((provider) => (
              <li key={provider.id}>
                {provider.logo ? (
                  <span
                    className="mk-pp-models__glyph"
                    style={{ ["--glyph" as string]: `url(${provider.logo})` } as CSSProperties}
                    aria-hidden
                  />
                ) : null}
                {provider.name}
              </li>
            ))}
            <li className="mk-pp-models__more">{AI_MODELS.more}</li>
          </ul>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- Planes de Páginas Web + tabla ---------- */

export function WebPlansSection() {
  return (
    <section id="web" className="mk-section mk-t-mist mk-pp-section" aria-labelledby="web-plans-title">
      <div className="mk-container">
        <SectionHeading
          id="web-plans-title"
          center
          eyebrow={WEB_PLANS_HEADING.eyebrow}
          title={WEB_PLANS_HEADING.title}
          lead={WEB_PLANS_HEADING.lead}
        />
        <PlanCards plans={WEB_PLANS} label="Formatos de páginas web" />
        <Reveal>
          <PricingCompare data={WEB_COMPARE} />
        </Reveal>
        <Reveal className="mk-pp-extras">
          <h3>{WEB_EXTRAS.title}</h3>
          <ul>
            {WEB_EXTRAS.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
