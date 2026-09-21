"use client";

import { useId, useState } from "react";
import { ArrowRight, Check, Circle, Loader2, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, ButtonLink } from "../ui/Button";
import { StatusChip } from "../ui/Badge";
import { DemoFrame } from "./DemoFrame";
import { KpiList } from "./records";
import { controlsOf } from "./ScenarioDemos";
import { useDemoClock } from "../motion/useDemoClock";
import {
  BUILDER_SCENARIOS,
  type BuilderScenario,
  type BuilderScenarioId,
  type DemoRecord,
} from "@/content/marketing/fixtures";

/* ----------------------------- E14 Workflow ------------------------------- */

export type NodeState = "pending" | "active" | "done" | "review";

const NODE_ICON = {
  pending: Circle,
  active: Loader2,
  done: Check,
  review: UserRound,
} as const;

const NODE_LABEL: Record<NodeState, string> = {
  pending: "Pendiente",
  active: "En curso",
  done: "Listo",
  review: "Revisión humana",
};

/**
 * E14 WorkflowNode / Connector / ProcessFlow. Los pasos viven en un <ol>
 * (mantiene el sentido sin SVG); los conectores son CSS/SVG decorativos
 * aria-hidden. Cada nodo es un botón de ancho completo que abre su detalle
 * (Entrada / Resultado) debajo, sin cambiar el orden ni los datos.
 */
export function WorkflowFlow({
  nodes,
  states,
  selected,
  onSelect,
}: {
  nodes: BuilderScenario["nodes"];
  states: readonly NodeState[];
  selected: number | null;
  onSelect: (index: number | null) => void;
}) {
  const uid = useId();
  return (
    <div className="mk-flow">
      <ol className="mk-flow__list">
        {nodes.map((node, index) => {
          const state = states[index] ?? "pending";
          const Icon = NODE_ICON[state];
          const isOpen = selected === index;
          return (
            <li key={node.title} className={cn("mk-flow__item", `is-${state}`)}>
              <button
                type="button"
                className="mk-node"
                aria-expanded={isOpen}
                aria-controls={`${uid}-detail-${index}`}
                onClick={() => onSelect(isOpen ? null : index)}
              >
                <span className="mk-node__icon" aria-hidden>
                  <Icon size={16} className={state === "active" ? "mk-spin" : undefined} />
                </span>
                <span className="mk-node__title">{node.title}</span>
                <span className="mk-node__state">{NODE_LABEL[state]}</span>
              </button>
              {index < nodes.length - 1 ? (
                <svg className="mk-flow__connector" viewBox="0 0 24 24" aria-hidden focusable="false">
                  <line x1="0" y1="12" x2="24" y2="12" />
                </svg>
              ) : null}
            </li>
          );
        })}
      </ol>
      {selected !== null ? (
        <div id={`${uid}-detail-${selected}`} className="mk-flow__detail" role="region" aria-label={`Detalle: ${nodes[selected].title}`}>
          <div>
            <p className="mk-eyebrow">Entrada</p>
            <p>{nodes[selected].input}</p>
          </div>
          <ArrowRight size={18} aria-hidden className="mk-flow__arrow" />
          <div>
            <p className="mk-eyebrow">Resultado</p>
            <p>{nodes[selected].result}</p>
          </div>
        </div>
      ) : null}
      <p className="mk-sr-only">
        Proceso: {nodes.map((n) => n.title).join(" → ")}.
      </p>
    </div>
  );
}

/* ---------------------------- E15 DashboardDemo --------------------------- */

type Filter = "todas" | "pendientes" | "resueltas";

/**
 * Panel de ejemplo con store local por instancia (R4.4): resolver una fila
 * actualiza solo su flag y su label, recalcula KPIs y no elimina la fila.
 * Restablecer vuelve a 3 / 2 / 1.
 */
export function DashboardDemo({
  scenario,
  compact,
  visibleCount = 3,
}: {
  scenario: BuilderScenario;
  compact?: boolean;
  visibleCount?: number;
}) {
  const uid = useId();
  const [records, setRecords] = useState<readonly DemoRecord[]>(scenario.records);
  const [filter, setFilter] = useState<Filter>("todas");
  const [openId, setOpenId] = useState<string | null>(null);

  const pending = records.filter((r) => !r.resolved).length;
  const resolved = records.length - pending;
  const rows = records
    .filter((r) => (filter === "pendientes" ? !r.resolved : filter === "resueltas" ? r.resolved : true))
    .slice(0, visibleCount);
  const open = records.find((r) => r.id === openId) ?? null;

  function resolve(id: string) {
    setRecords((prev) =>
      prev.map((r) => (r.id === id ? { ...r, resolved: true, statusLabel: scenario.id === "solicitudes" ? "Resuelta" : "Resuelto" } : r)),
    );
  }

  return (
    <div className={cn("mk-dash", compact && "is-compact")}>
      <div className="mk-dash__head">
        <h3 className="mk-h5">{scenario.dashboardTitle}</h3>
        <div role="group" aria-label="Filtrar por estado" className="mk-dash__filters">
          {(
            [
              ["todas", "Todas"],
              ["pendientes", "Pendientes"],
              ["resueltas", "Resueltas"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className="mk-pill"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <KpiList
        items={[
          { label: "Recibidas", value: records.length },
          { label: "Pendientes", value: pending },
          { label: "Resueltas", value: resolved },
        ]}
      />
      {rows.length === 0 ? (
        <p className="mk-dash__empty" role="status">
          No hay elementos en este estado.
        </p>
      ) : (
        <table className="mk-table mk-dash__table">
          <caption className="mk-sr-only">{scenario.dashboardTitle} de ejemplo</caption>
          <thead>
            <tr>
              {scenario.columns.map((c) => (
                <th key={c} scope="col">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className={cn(openId === row.id && "is-selected")}>
                <th scope="row" data-label={scenario.columns[0]}>
                  <button
                    type="button"
                    className="mk-crm__pick"
                    aria-expanded={openId === row.id}
                    aria-controls={`${uid}-detail`}
                    onClick={() => setOpenId(openId === row.id ? null : row.id)}
                  >
                    <span className="mk-mono">{row.id}</span>
                  </button>
                </th>
                <td data-label={scenario.columns[1]}>{row.label}</td>
                <td data-label={scenario.columns[2]}>
                  <StatusChip status={row.resolved ? "completado" : "pendiente"} label={row.statusLabel} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {open ? (
        <div id={`${uid}-detail`} className="mk-dash__detail" role="region" aria-label={`Detalle ${open.id}`}>
          <p>
            <strong className="mk-mono">{open.id}</strong> · {open.label} · {open.area}
          </p>
          <div className="mk-dash__detail-actions">
            <Button size="sm" disabled={open.resolved} onClick={() => resolve(open.id)}>
              {open.resolved ? "Ya resuelta" : "Simular resolución"}
            </Button>
            <Button size="sm" variant="tertiary" onClick={() => setOpenId(null)}>
              Cerrar
            </Button>
          </div>
        </div>
      ) : null}
      <div className="mk-dash__foot">
        <button
          type="button"
          className="mk-link-btn"
          onClick={() => {
            setRecords(scenario.records);
            setFilter("todas");
            setOpenId(null);
          }}
        >
          Restablecer
        </button>
      </div>
    </div>
  );
}

/* ------------------------- E24 NeedToSystemBuilder ------------------------ */

function nodeStates(t: number, phase: number): NodeState[] {
  const states: NodeState[] = ["done"];
  for (let i = 0; i < 4; i += 1) {
    if (t < i * phase) states.push("pending");
    else if (t < (i + 1) * phase) states.push("active");
    else states.push("done");
  }
  return states;
}

function BuilderRun({
  scenario,
  phaseMs,
  instance,
  compact,
  ctaHref,
  showCta,
}: {
  scenario: BuilderScenario;
  phaseMs: number;
  instance: string;
  compact?: boolean;
  ctaHref: string;
  showCta: boolean;
}) {
  const [attach, clock] = useDemoClock<HTMLDivElement>({ id: `builder-${instance}-${scenario.id}`, duration: phaseMs * 5, autoplay: true });
  const { t } = clock;
  const [selected, setSelected] = useState<number | null>(null);
  const states = nodeStates(t, phaseMs);
  const phaseIndex = Math.min(4, Math.floor(t / phaseMs));
  const showPanel = t >= phaseMs * 3;
  const ready = t >= phaseMs * 5 || clock.state === "complete";
  const phaseText = ready ? scenario.final : t <= 0 ? "Necesidad seleccionada" : scenario.phases[Math.min(3, phaseIndex)];

  return (
    <div ref={attach}>
      <DemoFrame title="De la necesidad al sistema" controls={controlsOf(clock)} product className={compact ? "mk-frame--compact" : undefined}>
        <div className="mk-builder__run">
          <blockquote className="mk-builder__quote">
            <span className="mk-eyebrow">Necesidad</span>
            <p>{scenario.need}</p>
          </blockquote>
          <p className="mk-builder__phase" role="status" aria-live="off">
            {ready ? <Check size={16} aria-hidden /> : <Loader2 size={16} aria-hidden className="mk-spin" />}
            {phaseText}
          </p>
          <WorkflowFlow
            nodes={scenario.nodes}
            states={states}
            selected={selected}
            onSelect={(index) => {
              setSelected(index);
              if (index !== null) clock.pause();
            }}
          />
          {showPanel ? (
            <div className="mk-builder__panel is-new">
              <DashboardDemo scenario={scenario} compact visibleCount={3} />
            </div>
          ) : null}
          {ready ? (
            <div className="mk-builder__ready">
              <StatusChip status="completado" label={scenario.final} />
              {showCta ? (
                <ButtonLink href={ctaHref} variant="secondary" size="sm" arrow>
                  Cuéntanos tu proceso
                </ButtonLink>
              ) : null}
            </div>
          ) : null}
        </div>
      </DemoFrame>
    </div>
  );
}

/**
 * E24 — escenarios cerrados (Pedidos / Documentos / Solicitudes): nunca un
 * textarea libre que finja comprensión. Cinco fases a `phaseMs` (1200 en H1,
 * 720 en el estado A Medida de Home). El resultado es una maqueta de ejemplo,
 * no una promesa de generación automática de software.
 */
export function BuilderDemo({
  phaseMs = 1200,
  compact,
  showCta = true,
}: {
  phaseMs?: number;
  compact?: boolean;
  showCta?: boolean;
}) {
  const uid = useId();
  const [scenarioId, setScenarioId] = useState<BuilderScenarioId>("pedidos");
  const [run, setRun] = useState(0);
  const scenario = BUILDER_SCENARIOS.find((s) => s.id === scenarioId) ?? BUILDER_SCENARIOS[0];

  return (
    <div className="mk-builder">
      <div className="mk-builder__chips" role="radiogroup" aria-label="Elige una necesidad de ejemplo">
        {BUILDER_SCENARIOS.map((s) => (
          <button
            key={s.id}
            type="button"
            role="radio"
            aria-checked={s.id === scenarioId}
            className="mk-choice"
            onClick={() => {
              setScenarioId(s.id);
              setRun((n) => n + 1);
            }}
          >
            {s.chip}
          </button>
        ))}
        <Button size="sm" variant="secondary" onClick={() => setRun((n) => n + 1)}>
          Construir ejemplo
        </Button>
      </div>
      <BuilderRun
        key={`${scenarioId}-${run}`}
        scenario={scenario}
        phaseMs={phaseMs}
        instance={uid}
        compact={compact}
        ctaHref="/diagnostico?necesidad=a-medida"
        showCta={showCta}
      />
    </div>
  );
}
