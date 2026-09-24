import type { CSSProperties } from "react";
import { ArrowRight, Settings2, ShieldCheck, Unplug } from "lucide-react";
import { Reveal } from "../motion/Reveal";
import { SectionHeading } from "../ui/Blocks";
import { SnapCarousel } from "../ui/SnapCarousel";
import { AgentBust } from "../pixel/AgentBust";
import { PlatformPortal, PortalChrome } from "./PlatformPortal";
import { PlatformInbox } from "./PlatformInbox";
import {
  CONTROL_CLOSING,
  CONTROL_HEADING,
  CONTROL_PILLARS,
  CREDIT,
  FLOWS,
  FLOW_HEADING,
  HERO_STATS,
  INTEGRATION_COUNT,
  INTEGRATION_PROTOCOLS,
  OMNI_HEADING,
  OMNI_NOTE,
  PLATFORM_AGENTS,
  PLATFORM_COMPANY,
  PORTAL_HEADING,
  PORTAL_NOTE,
  type PlatformAgentId,
} from "@/content/marketing/platform";

const usd = (value: number) => `US$${value.toFixed(2).replace(".", ",")}`;

/* ---------- Hero: vista compacta del portal ---------- */

const HERO_AGENTS: readonly PlatformAgentId[] = ["nayra", "kusi", "illa"];

/**
 * Visual del hero (spec §2): el portal de «Empresa Norte» en pequeño. Tres
 * agentes activos, cuatro indicadores y el consumo del mes. Entra escalonado y
 * queda quieto salvo el pulso de «Activo».
 */
export function PlatformHeroPortal() {
  const percent = (CREDIT.used / CREDIT.included) * 100;
  return (
    <div className="mk-ph">
      <div className="mk-ph__grid" aria-hidden />
      <div className="mk-ph__card">
        <PortalChrome>
          <div className="mk-ph__body">
            <ul className="mk-ph__agents" aria-label={`Agentes de ${PLATFORM_COMPANY}`}>
              {HERO_AGENTS.map((id, index) => (
                <li key={id} style={{ ["--i" as string]: index } as CSSProperties}>
                  <AgentBust agent={id} size={46} className="mk-ph__bust" />
                  <span className="mk-ph__name">
                    <strong>{PLATFORM_AGENTS[id].name}</strong>
                    <small>{PLATFORM_AGENTS[id].role}</small>
                  </span>
                  <span className="mk-pv-live">
                    <i aria-hidden />
                    Activo
                  </span>
                </li>
              ))}
            </ul>
            <dl className="mk-ph__stats">
              {HERO_STATS.map((stat, index) => (
                <div key={stat.label} style={{ ["--i" as string]: index + 3 } as CSSProperties}>
                  <dd>{stat.value}</dd>
                  <dt>{stat.label}</dt>
                </div>
              ))}
              <div
                className="mk-ph__credit"
                style={
                  {
                    ["--i" as string]: 6,
                    ["--fill" as string]: `${percent}%`,
                  } as CSSProperties
                }
              >
                <dd>
                  {usd(CREDIT.used)} <span>de {usd(CREDIT.included)}</span>
                </dd>
                <dt>consumo del mes</dt>
                <span className="mk-ph__bar" aria-hidden>
                  <i />
                </span>
              </div>
            </dl>
          </div>
        </PortalChrome>
      </div>
    </div>
  );
}

/* ---------- Demo principal ---------- */

export function PlatformDemo() {
  return (
    <section id="portal" className="mk-section mk-t-paper mk-pf-section" aria-labelledby="platform-demo-title">
      <div className="mk-container">
        <SectionHeading id="platform-demo-title" center title={PORTAL_HEADING.title} lead={PORTAL_HEADING.lead} />
        <Reveal className="mk-pf-wrap">
          <PlatformPortal />
        </Reveal>
        <p className="mk-pf-note">{PORTAL_NOTE}</p>
      </div>
    </section>
  );
}

/* ---------- Omnicanal ---------- */

export function PlatformOmni() {
  return (
    <section id="bandeja" className="mk-section mk-t-mist mk-pf-section" aria-labelledby="platform-omni-title">
      <div className="mk-container">
        <SectionHeading id="platform-omni-title" center title={OMNI_HEADING.title} lead={OMNI_HEADING.lead} />
        <Reveal className="mk-pf-wrap mk-pf-wrap--wide">
          <PortalChrome large>
            <PlatformInbox large />
          </PortalChrome>
        </Reveal>
        <p className="mk-pf-note">{OMNI_NOTE}</p>
      </div>
    </section>
  );
}

/* ---------- Control del cliente ---------- */

const PILLAR_ICON = {
  configura: Settings2,
  conecta: Unplug,
  supervisa: ShieldCheck,
} as const;

export function PlatformControl() {
  return (
    <section className="mk-section mk-t-sand mk-pf-section" aria-labelledby="platform-control-title">
      <div className="mk-container">
        <SectionHeading id="platform-control-title" center title={CONTROL_HEADING.title} lead={CONTROL_HEADING.lead} />
        <SnapCarousel className="mk-pl" label="Pilares de control">
          {CONTROL_PILLARS.map((pillar, index) => {
            const Icon = PILLAR_ICON[pillar.id];
            return (
              <Reveal key={pillar.id} as="article" delay={index * 90} className="mk-pl__card">
                <span className="mk-pl__ic">
                  <Icon size={22} strokeWidth={1.8} aria-hidden />
                </span>
                <h3>{pillar.title}</h3>
                <p>{pillar.body}</p>
              </Reveal>
            );
          })}
        </SnapCarousel>
        <p className="mk-pl__closing">{CONTROL_CLOSING}</p>
      </div>
    </section>
  );
}

/* ---------- Integraciones + trabajo real ---------- */

export function PlatformFlow() {
  return (
    <section className="mk-section mk-t-paper mk-pf-section" aria-labelledby="platform-flow-title">
      <div className="mk-container">
        <SectionHeading id="platform-flow-title" center title={FLOW_HEADING.title} lead={FLOW_HEADING.lead} />
        <div className="mk-pw">
          {FLOWS.map((flow, flowIndex) => (
            <Reveal key={flow.id} as="article" delay={flowIndex * 120} className="mk-pw__flow">
              <div className="mk-pw__agent">
                <AgentBust agent={flow.agent} size={56} />
                <span>
                  <strong>{flow.title}</strong>
                  <small>{PLATFORM_AGENTS[flow.agent].name}</small>
                </span>
              </div>
              <ol className="mk-pw__steps">
                {flow.steps.map((step, index) => (
                  <li key={step} style={{ ["--i" as string]: index } as CSSProperties}>
                    <span className="mk-pw__step">
                      <b>{index + 1}</b>
                      {step}
                    </span>
                    {index < flow.steps.length - 1 ? (
                      <ArrowRight className="mk-pw__arrow" size={16} aria-hidden />
                    ) : null}
                  </li>
                ))}
              </ol>
            </Reveal>
          ))}
        </div>
        <div className="mk-pw__foot">
          <p className="mk-pw__count">{INTEGRATION_COUNT}</p>
          <p className="mk-pw__proto">{INTEGRATION_PROTOCOLS}</p>
        </div>
      </div>
    </section>
  );
}
