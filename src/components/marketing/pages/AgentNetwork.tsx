"use client";

import { useReducedMotion } from "../motion/reduced-motion";

const SATELLITES = [
  { x: 560, y: 120, label: "CRM" },
  { x: 620, y: 300, label: "Calendario" },
  { x: 520, y: 460, label: "Mensajería" },
  { x: 300, y: 480, label: "Datos" },
] as const;

const CENTER = { x: 340, y: 300 };

/** Recorrido único centro → cada sistema → centro, para una sola señal en movimiento (§10). */
const SIGNAL_PATH = SATELLITES.map((s) => `M${CENTER.x} ${CENTER.y} L${s.x} ${s.y} L${CENTER.x} ${CENTER.y}`).join(
  " ",
);

/**
 * Visual del hero de /agentes (V3.3 §10): un nodo Agente central, cuatro
 * sistemas alrededor, una única señal en movimiento que los recorre uno a
 * uno, y capas de líneas técnicas. Decorativa; la misión real vive en A3.
 */
export function AgentNetwork() {
  const reduced = useReducedMotion();
  return (
    <svg className="mk-agent-network" viewBox="0 0 720 600" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      {SATELLITES.map((s) => (
        <path
          key={s.label}
          className="mk-agent-network__line"
          d={`M${CENTER.x} ${CENTER.y} L${s.x} ${s.y}`}
        />
      ))}
      <path id="mk-agn-signal-path" d={SIGNAL_PATH} fill="none" stroke="none" />
      <circle className="mk-agent-network__ring" cx={CENTER.x} cy={CENTER.y} r="64" />
      {SATELLITES.map((s) => (
        <g key={s.label}>
          <circle className="mk-agent-network__node" cx={s.x} cy={s.y} r="5" />
          <text className="mk-agent-network__label" x={s.x} y={s.y - 16} textAnchor="middle">
            {s.label}
          </text>
        </g>
      ))}
      <circle className="mk-agent-network__center" cx={CENTER.x} cy={CENTER.y} r="9" />
      <text
        className="mk-agent-network__label mk-agent-network__label--center"
        x={CENTER.x}
        y={CENTER.y + 34}
        textAnchor="middle"
      >
        Agente
      </text>

      {!reduced ? (
        <circle r="4" className="mk-agent-network__signal">
          <animateMotion dur="9s" repeatCount="indefinite" calcMode="linear">
            <mpath href="#mk-agn-signal-path" />
          </animateMotion>
        </circle>
      ) : null}
    </svg>
  );
}
