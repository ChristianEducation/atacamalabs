"use client";

import { useId, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Database } from "lucide-react";
import { ButtonLink } from "../ui/Button";
import { CapabilitySelector, selectorTabId } from "../ui/CapabilitySelector";
import { Reveal } from "../motion/Reveal";
import { DemoFrame } from "../demos/DemoFrame";
import { ActionReceipt, ChatThread, HumanReviewNote, ToolCall, toolPhase } from "../demos/chat";
import { controlsOf } from "../demos/ScenarioDemos";
import { CapabilityDemo } from "../demos/CapabilityDemos";
import { FlowPlayer } from "../demos/FlowPlayer";
import { industryScript } from "../demos/IndustryDemos";
import { useDemoClock } from "../motion/useDemoClock";
import { StatusChip } from "../ui/Badge";
import { CHAT_TIMELINE, SCRIPTS, type BuilderScenario } from "@/content/marketing/fixtures";
import {
  AGENDA_ALTERNATIVE,
  AGENDA_NODES,
  CAPABILITIES,
  CONTROL_ROWS,
  CONTROL_TICKETS,
  HUB_CATEGORIES,
} from "@/content/marketing/agents";
import { AGENT_CONTEXT_SLUGS, getIndustry } from "@/content/marketing/industries";
import { track } from "@/lib/analytics";

/* ------------------------------ G1 · Hero demo ---------------------------- */

export function AgentHeroDemo() {
  const [attach, clock] = useDemoClock<HTMLDivElement>({ id: "agents-hero", duration: CHAT_TIMELINE.complete + 600, cycles: 1, autoplay: true });
  const { t } = clock;
  const phase = toolPhase(t);
  return (
    <div ref={attach}>
      <DemoFrame title="Agente en un proceso comercial" controls={controlsOf(clock)} product className="mk-frame--ag-hero">
        <div className="mk-ag-hero-body">
          <ChatThread script={SCRIPTS.ventas} t={t} times={[0, 1500, 2600, 4600]} />
          <div className="mk-stack">
            {phase !== "hidden" ? (
              <ToolCall verb="Calificar y registrar" detail="Empresa Demo Norte" status={phase} icon={<Database size={16} />} />
            ) : (
              <p className="mk-hero-demo__idle">El agente consulta y registra dentro del proceso.</p>
            )}
            {t >= CHAT_TIMELINE.receipt ? (
              <ActionReceipt receipt={{ id: "OPP-DEMO-1042", area: "Comercial", status: "Por revisar" }} className="is-new">
                <HumanReviewNote>Oportunidad para el equipo comercial; no se registra precio ni venta.</HumanReviewNote>
              </ActionReceipt>
            ) : null}
          </div>
        </div>
      </DemoFrame>
    </div>
  );
}

/* --------------------------- G2 · Capability explorer --------------------- */

const subscribeHash = (cb: () => void) => {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
};
const getHash = () => window.location.hash;
const getServerHash = () => "";

export function CapabilityExplorer() {
  const uid = useId();
  const hash = useSyncExternalStore(subscribeHash, getHash, getServerHash);
  const [picked, setPicked] = useState<{ forHash: string; id: string } | null>(null);
  const fromHash = CAPABILITIES.find((c) => `#${c.id}` === hash)?.id;
  const value = picked && picked.forHash === hash ? picked.id : (fromHash ?? "atencion");
  const cap = CAPABILITIES.find((c) => c.id === value) ?? CAPABILITIES[0];
  const panelId = `${uid}-panel`;
  const tabId = selectorTabId(uid, cap.id);

  return (
    <div className="mk-ag-explorer">
      <CapabilitySelector
        tabs={CAPABILITIES.map((c) => ({ id: c.id, label: c.tab }))}
        value={value}
        onChange={(id) => {
          setPicked({ forHash: hash, id });
          track({ name: "demo_scenario_select", props: { routeId: "agentes", demoId: "capacidades", scenarioId: id } });
        }}
        panelId={panelId}
        idPrefix={uid}
        ariaLabel="Capacidades del agente"
        selectLabel="Qué trabajo quieres delegar"
      />
      <div id={panelId} role="tabpanel" aria-labelledby={tabId} tabIndex={-1} className="mk-ag-explorer__panel">
        <div className="mk-ag-explorer__copy">
          <h3 className="mk-h3">{cap.title}</h3>
          <p className="mk-body">{cap.body}</p>
          <p className="mk-small mk-muted">
            <strong>Acción demostrada:</strong> {cap.action}
          </p>
          <ButtonLink href={cap.cta.href} variant="secondary" arrow>
            {cap.cta.label}
          </ButtonLink>
        </div>
        <div className="mk-ag-explorer__demo">
          <CapabilityDemo key={cap.id} id={cap.id} />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- G4 · Flow -------------------------------- */

export function AgentFlow() {
  return (
    <FlowPlayer
      title="Cómo actúa un agente"
      nodes={AGENDA_NODES as unknown as BuilderScenario["nodes"]}
      alternative={AGENDA_ALTERNATIVE}
      instance="agentes-g4"
    />
  );
}

/* ---------------------------- G5 · Connections hub ------------------------ */

export function ConnectionsHub() {
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<string>(HUB_CATEGORIES[0].id);
  const visible = [0, 1, 2, 3].map((i) => HUB_CATEGORIES[(offset + i) % HUB_CATEGORIES.length]);
  const active = HUB_CATEGORIES.find((c) => c.id === selected) ?? HUB_CATEGORIES[0];
  return (
    <div className="mk-ag-hub">
      <div className="mk-ag-hub__agent" aria-hidden>
        <span className="mk-frame__logo">AL</span>
        <span>Agente</span>
      </div>
      <ul className="mk-ag-hub__nodes" aria-label="Categorías de conexión de ejemplo">
        {visible.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              className="mk-ag-hub__node"
              aria-pressed={selected === c.id}
              onClick={() => setSelected(c.id)}
            >
              {c.label}
            </button>
          </li>
        ))}
      </ul>
      <div className="mk-ag-hub__detail" aria-live="polite">
        <p className="mk-h6">{active.label}</p>
        <p className="mk-small">{active.body}</p>
        <p className="mk-small mk-muted">Conexión de ejemplo: una categoría no acredita una marca ni una integración concreta.</p>
      </div>
      <button
        type="button"
        className="mk-pill"
        onClick={() => setOffset((v) => (v + 1) % HUB_CATEGORIES.length)}
      >
        Ver otras categorías
      </button>
    </div>
  );
}

/* --------------------------- G6 · Context sectors ------------------------- */

export function ContextSectors() {
  const uid = useId();
  const [slug, setSlug] = useState<string>(AGENT_CONTEXT_SLUGS[0]);
  const industry = getIndustry(slug) ?? getIndustry(AGENT_CONTEXT_SLUGS[0])!;
  const base = industryScript(industry);
  const script = { ...base, messages: [base.messages[0], base.messages[base.messages.length - 1]] } as unknown as typeof base;
  const panelId = `${uid}-panel`;
  return (
    <div className="mk-ag-explorer">
      <CapabilitySelector
        tabs={AGENT_CONTEXT_SLUGS.map((s) => ({ id: s, label: getIndustry(s)?.navLabel ?? s }))}
        value={slug}
        onChange={(id) => {
          setSlug(id);
          track({ name: "industry_open", props: { industryId: id, originSection: "agentes-g6" } });
        }}
        panelId={panelId}
        idPrefix={uid}
        ariaLabel="Rubros"
        selectLabel="Rubro"
      />
      <div id={panelId} role="tabpanel" aria-labelledby={selectorTabId(uid, slug)} tabIndex={-1} className="mk-ag-explorer__panel mk-ag-explorer__panel--sector">
        <div className="mk-ag-explorer__copy">
          <h3 className="mk-h3">{industry.name}</h3>
          <p className="mk-body">{industry.agent.body}</p>
          <ButtonLink href={`/rubros/${industry.slug}`} variant="secondary" arrow>
            {`Ver soluciones para ${industry.navLabel}`}
          </ButtonLink>
        </div>
        <div className="mk-ag-explorer__demo">
          <DemoFrame title={`Agente · ${industry.name}`} label={`Ejemplo de conversación: ${industry.name}`}>
            <div className="mk-stack">
              <ChatThread script={script} t={9999} times={[0, 0]} />
              <ActionReceipt receipt={industry.receipt} title="Recibo de acción" />
            </div>
          </DemoFrame>
        </div>
      </div>
    </div>
  );
}

/* --------------------------- G7 · Control inbox --------------------------- */

export function ControlInbox() {
  const [id, setId] = useState<string>(CONTROL_TICKETS[0].id);
  const ticket = CONTROL_TICKETS.find((t) => t.id === id) ?? CONTROL_TICKETS[0];
  return (
    <div className="mk-ag-control">
      <ol className="mk-ag-control__rows">
        {CONTROL_ROWS.map((row, i) => (
          <Reveal as="li" key={row.title} delay={i * 70} className="mk-ag-control__row">
            <h3 className="mk-h5">{row.title}</h3>
            <p>{row.body}</p>
          </Reveal>
        ))}
      </ol>
      <DemoFrame title="Bandeja de revisión" label="Bandeja de revisión de ejemplo">
        <div className="mk-ag-inbox">
          <ul className="mk-ag-inbox__list" aria-label="Solicitudes de ejemplo">
            {CONTROL_TICKETS.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  className="mk-ag-inbox__item"
                  aria-pressed={t.id === id}
                  onClick={() => setId(t.id)}
                >
                  <span className="mk-mono">{t.id}</span>
                  <span>{t.title}</span>
                  <StatusChip status={t.resolved ? "completado" : "revision"} label={t.status} />
                </button>
              </li>
            ))}
          </ul>
          <div className="mk-ag-inbox__detail" key={ticket.id}>
            <p className="mk-h6">
              <span className="mk-mono">{ticket.id}</span> · {ticket.title}
            </p>
            <p className="mk-small mk-muted">Responsable: Equipo Demo</p>
            <ol className="mk-history">
              {ticket.history.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ol>
          </div>
        </div>
      </DemoFrame>
    </div>
  );
}

/* ------------------------- Utilidad: fila de CTA -------------------------- */

export function SectionCta({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <p className="mk-ag-cta">
      <Link href={href} className="mk-link">
        {children}
      </Link>
    </p>
  );
}
