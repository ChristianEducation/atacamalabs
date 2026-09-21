"use client";

import { useId, useState } from "react";
import { DemoFrame } from "./DemoFrame";
import { WorkflowFlow, type NodeState } from "./BuilderDemo";
import { controlsOf } from "./ScenarioDemos";
import { useDemoClock } from "../motion/useDemoClock";
import type { BuilderScenario } from "@/content/marketing/fixtures";

/** M06: nodo 360 ms + conector 180 ms por paso. */
const STEP_MS = 540;

export type FlowNodes = BuilderScenario["nodes"];

/**
 * Flujo de negocio reproducible (E14/K5/G4). Estado inicial y final: todos los
 * nodos completos y seleccionables (útil sin JS y con reduced-motion). Reproducir
 * recorre los cinco nodos una vez; seleccionar un nodo pausa la secuencia y
 * muestra Entrada / Resultado sin modificar el resultado histórico.
 * `alternative` permite explorar «Revisión humana» en un nodo (G4, paso Actúa).
 */
export function FlowPlayer({
  title,
  nodes,
  alternative,
  instance,
}: {
  title: string;
  nodes: FlowNodes;
  alternative?: { nodeIndex: number; label: string; input: string; result: string };
  instance?: string;
}) {
  const uid = useId();
  const [attach, clock] = useDemoClock<HTMLDivElement>({
    id: `flow-${instance ?? uid}`,
    duration: STEP_MS * nodes.length,
    autoplay: false,
  });
  const [selected, setSelected] = useState<number | null>(null);
  const [useAlt, setUseAlt] = useState(false);

  const idle = clock.state === "idle" || clock.state === "complete";
  const shownNodes = (
    alternative && useAlt
      ? nodes.map((node, i) =>
          i === alternative.nodeIndex ? { ...node, input: alternative.input, result: alternative.result } : node,
        )
      : nodes
  ) as unknown as FlowNodes;

  const states: NodeState[] = shownNodes.map((_, i) => {
    if (idle) {
      return alternative && useAlt && i === alternative.nodeIndex ? "review" : "done";
    }
    const start = i * STEP_MS;
    if (clock.t < start) return "pending";
    if (clock.t < start + STEP_MS) return "active";
    return alternative && useAlt && i === alternative.nodeIndex ? "review" : "done";
  });

  return (
    <div ref={attach}>
      <DemoFrame title={title} controls={controlsOf(clock)} resultLabel="Mostrar resultado">
        <WorkflowFlow
          nodes={shownNodes}
          states={states}
          selected={selected}
          onSelect={(index) => {
            setSelected(index);
            if (index !== null) clock.pause();
          }}
        />
        {alternative ? (
          <div className="mk-demo-tools__row">
            <button
              type="button"
              className="mk-pill"
              aria-pressed={useAlt}
              onClick={() => {
                setUseAlt((v) => !v);
                setSelected(alternative.nodeIndex);
              }}
            >
              {alternative.label}
            </button>
          </div>
        ) : null}
      </DemoFrame>
    </div>
  );
}
