import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Reveal } from "../motion/Reveal";
import { ButtonLink } from "../ui/Button";
import { AgentCtaLink } from "../shell/AgentCtaLink";
import { IndustryDemo } from "./IndustryDemo";
import { INDUSTRY_LIST, OTHER_INDUSTRY, type IndustryExperience } from "@/content/marketing/industries";
import { diagnosticHref } from "@/lib/marketing/cta-context";

/** Fondos que alternan para que el recorrido largo no se sienta plano. */
const THEMES = ["mk-t-paper", "mk-t-sand"] as const;

/** Una sección de rubro (§8): identificación → lo que pasa hoy → agente trabajando → capacidades → un CTA. */
function IndustrySection({ industry, index }: { industry: IndustryExperience; index: number }) {
  const total = INDUSTRY_LIST.length;
  const titleId = `${industry.slug}-title`;
  return (
    <section
      id={industry.slug}
      className={cn("mk-section mk-rb-sec", THEMES[index % THEMES.length])}
      aria-labelledby={titleId}
    >
      <div className="mk-container mk-rb-grid">
        <Reveal className="mk-rb-copy">
          <p className="mk-rb-eyebrow">
            <span>
              {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
            </span>
            {industry.name}
          </p>
          <h2 id={titleId} className="mk-rb-title">
            {industry.headline}
          </h2>
          <p className="mk-rb-lead">{industry.lead}</p>
          <p className="mk-rb-context">{industry.context}</p>

          <h3 className="mk-rb-sub">Lo que pasa hoy</h3>
          <ul className="mk-rb-pains">
            {industry.pains.map((pain) => (
              <li key={pain}>{pain}</li>
            ))}
          </ul>

          <h3 className="mk-rb-sub">Puede</h3>
          <ul className="mk-rb-caps">
            {industry.capabilities.map((capability) => (
              <li key={capability}>
                <Check size={14} strokeWidth={2.4} aria-hidden />
                {capability}
              </li>
            ))}
          </ul>

          <ButtonLink
            href={diagnosticHref({
              source_page: "rubros",
              source_section: industry.slug,
              source_cta: "diagnostico-rubro",
              service: "agentes",
              industry: industry.slug,
            })}
            arrow
          >
            Quiero algo así
          </ButtonLink>
        </Reveal>

        <Reveal className="mk-rb-stage" delay={120}>
          <IndustryDemo industry={industry} />
        </Reveal>
      </div>
    </section>
  );
}

/** Visual liviana del hero: el recorrido común de todos los rubros (§6.2). Estática. */
export function RubrosHeroVisual() {
  const steps = [
    ["Persona", "Escribe por WhatsApp, correo o la web"],
    ["Agente", "Entiende, consulta y decide el paso"],
    ["Herramientas", "Calendar, CRM, catálogo, sistema"],
    ["Resultado", "Acción registrada y equipo informado"],
  ] as const;
  return (
    <ol className="mk-rb-hero" aria-label="Recorrido de un agente">
      {steps.map(([title, body], index) => (
        <li key={title}>
          <span className="mk-rb-hero__n">{String(index + 1).padStart(2, "0")}</span>
          <strong>{title}</strong>
          <span>{body}</span>
        </li>
      ))}
    </ol>
  );
}

export function IndustrySections() {
  return (
    <>
      {INDUSTRY_LIST.map((industry, index) => (
        <IndustrySection key={industry.slug} industry={industry} index={index} />
      ))}
    </>
  );
}

/** «Otro rubro» (§19): cierra la página; no lleva otro CTA comercial encima del footer. */
export function OtherIndustry() {
  return (
    <section
      id={OTHER_INDUSTRY.slug}
      className="mk-section mk-t-mist mk-rb-other"
      aria-labelledby="other-industry-title"
    >
      <div className="mk-container">
        <Reveal className="mk-rb-other__box">
          <h2 id="other-industry-title" className="mk-rb-title">
            {OTHER_INDUSTRY.headline}
          </h2>
          <p className="mk-rb-lead">{OTHER_INDUSTRY.body}</p>
          <div className="mk-rb-other__actions">
            <ButtonLink
              href={diagnosticHref({
                source_page: "rubros",
                source_section: "otro-rubro",
                source_cta: "diagnostico",
                service: "agentes",
                interest: "unsure",
              })}
              arrow
            >
              {OTHER_INDUSTRY.cta}
            </ButtonLink>
            <AgentCtaLink
              variant="secondary"
              context={{
                source_page: "rubros",
                source_section: "otro-rubro",
                source_cta: "probar-a-nayra",
                service: "agentes",
              }}
            >
              Probar a Nayra
            </AgentCtaLink>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
