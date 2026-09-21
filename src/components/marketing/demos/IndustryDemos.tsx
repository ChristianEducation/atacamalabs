"use client";

import { useId } from "react";
import { Database } from "lucide-react";
import { StatusChip } from "../ui/Badge";
import { DemoFrame } from "./DemoFrame";
import { ActionReceipt, ChatThread, HumanReviewNote, ToolCall, toolPhase } from "./chat";
import { DashboardDemo } from "./BuilderDemo";
import { FlowPlayer } from "./FlowPlayer";
import { KpiList } from "./records";
import { controlsOf } from "./ScenarioDemos";
import { useDemoClock } from "../motion/useDemoClock";
import { CHAT_TIMELINE, type BuilderScenario, type ChatScript } from "@/content/marketing/fixtures";
import { industryNodes, type Industry } from "@/content/marketing/industries";

export function industryScript(industry: Industry): ChatScript {
  return {
    id: `S-${industry.slug.toUpperCase()}`,
    title: industry.panel.name,
    messages: industry.script,
    tool: { verb: industry.receipt.steps.split("→")[0].trim(), detail: industry.receipt.id },
    receipt: { id: industry.receipt.id, area: industry.receipt.area, status: industry.receipt.status },
  };
}

/** Panel del sector como escenario de dashboard (tres filas: dos pendientes, una resuelta). */
export function industryScenario(industry: Industry): BuilderScenario {
  return {
    id: "solicitudes",
    chip: industry.name,
    need: industry.pains[0],
    phases: ["", "", "", ""],
    final: "Sistema de ejemplo listo",
    dashboardTitle: industry.panel.name,
    columns: industry.panel.columns,
    records: industry.panel.rows.map((row) => ({
      id: row.id,
      label: row.col2,
      area: "Equipo demo",
      statusLabel: row.status,
      resolved: row.resolved,
    })),
    nodes: [
      { title: "", input: "", result: "" },
      { title: "", input: "", result: "" },
      { title: "", input: "", result: "" },
      { title: "", input: "", result: "" },
      { title: "", input: "", result: "" },
    ],
  };
}

/** K1 — vista previa estática del panel sectorial (sin controles que parezcan operativos). */
export function IndustryHeroPanel({ industry }: { industry: Industry }) {
  return (
    <DemoFrame title={industry.panel.name} className="mk-frame--industry" product label={`Panel de ejemplo: ${industry.panel.name}`}>
      <div className="mk-industry-panel">
        <KpiList
          items={[
            { label: "Solicitudes", value: 3 },
            { label: "Pendientes", value: 2 },
            { label: "Resueltas", value: 1 },
          ]}
        />
        <table className="mk-table mk-dash__table">
          <caption className="mk-sr-only">{industry.panel.name}: tres solicitudes de ejemplo</caption>
          <thead>
            <tr>
              {industry.panel.columns.map((c) => (
                <th key={c} scope="col">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {industry.panel.rows.map((row) => (
              <tr key={row.id}>
                <th scope="row" data-label={industry.panel.columns[0]}>
                  <span className="mk-mono">{row.id}</span>
                </th>
                <td data-label={industry.panel.columns[1]}>{row.col2}</td>
                <td data-label={industry.panel.columns[2]}>
                  <StatusChip status={row.resolved ? "completado" : "pendiente"} label={row.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DemoFrame>
  );
}

/** K3 — Agente en acción: chat de cuatro mensajes + tool call + recibo en un AppFrame común. */
export function IndustryAgentDemo({ industry }: { industry: Industry }) {
  const uid = useId();
  const [attach, clock] = useDemoClock<HTMLDivElement>({ id: `industry-${uid}`, duration: CHAT_TIMELINE.complete, autoplay: true });
  const script = industryScript(industry);
  const phase = toolPhase(clock.t);
  return (
    <div ref={attach} id="agente-en-accion">
      <DemoFrame title={`Agente · ${industry.name}`} controls={controlsOf(clock)} product className="mk-frame--industry-chat">
        <div className="mk-split mk-split--chat-receipt">
          <ChatThread script={script} t={clock.t} />
          <div className="mk-stack">
            {phase !== "hidden" ? (
              <ToolCall verb={script.tool.verb} detail={script.tool.detail} status={phase} icon={<Database size={16} />} />
            ) : null}
            {clock.t >= CHAT_TIMELINE.receipt ? (
              <ActionReceipt receipt={script.receipt} className="is-new" title="Recibo de acción">
                <p className="mk-small mk-muted">{industry.receipt.steps}</p>
                <HumanReviewNote>{industry.receipt.note}</HumanReviewNote>
              </ActionReceipt>
            ) : null}
          </div>
        </div>
      </DemoFrame>
    </div>
  );
}

/** K5 — flujo del sector (cinco nodos derivados del guion, K9). */
export function IndustryFlow({ industry }: { industry: Industry }) {
  return (
    <FlowPlayer
      title={`Flujo · ${industry.name}`}
      nodes={industryNodes(industry) as unknown as BuilderScenario["nodes"]}
      instance={industry.slug}
    />
  );
}

/** K6 — dashboard local: abrir fila, simular resolución (KPI 3/2/1 → 3/1/2), restablecer. */
export function IndustryDashboard({ industry }: { industry: Industry }) {
  return (
    <DemoFrame title={industry.panel.name} product className="mk-frame--dash" label={`Panel: ${industry.panel.name}`}>
      <DashboardDemo scenario={industryScenario(industry)} receivedLabel="Solicitudes" />
    </DemoFrame>
  );
}
