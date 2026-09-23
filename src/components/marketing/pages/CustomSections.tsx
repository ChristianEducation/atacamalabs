"use client";

import { Fragment } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDemoClock } from "../motion/useDemoClock";

const NODES = ["Evento", "Sistema A", "Lógica", "Sistema B"] as const;
const STEP = 650;
const START = 300;
const RESULT_AT = START + (NODES.length - 1) * STEP + STEP;
const DURATION = RESULT_AT + 500;

/**
 * M3 — la única animación de /a-medida (spec V3.0 §10): evento → sistema A →
 * lógica/agente → sistema B → resultado. Explica integración, no un dashboard.
 * Una sola reproducción, sin loop, sin controles textuales.
 */
export function IntegrationFlow({ instance, result }: { instance: string; result: string }) {
  const [attach, clock] = useDemoClock<HTMLDivElement>({ id: `flow-${instance}`, duration: DURATION, autoplay: true });
  const { t, state } = clock;
  const resultIn = t >= RESULT_AT || state === "complete";

  return (
    <div className="mk-mission" ref={attach}>
      <div className="mk-mission__row">
        <div className="mk-mission__flow">
          {NODES.map((node, i) => {
            const activeAt = START + i * STEP;
            const active = t >= activeAt;
            const lineActive = t >= activeAt - STEP / 2;
            return (
              <Fragment key={node}>
                {i > 0 ? <span className={cn("mk-mission__line", lineActive && "is-out")} aria-hidden /> : null}
                <span className={cn("mk-mission__node", active && "is-active")}>
                  <span className="mk-mission__dot" aria-hidden />
                  {node}
                </span>
              </Fragment>
            );
          })}
        </div>
        <p className={cn("mk-mission__result", resultIn && "is-in")} role="status">
          {resultIn ? (
            <>
              <Check size={14} aria-hidden strokeWidth={2.4} />
              {result}
            </>
          ) : null}
        </p>
      </div>
    </div>
  );
}
