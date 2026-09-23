"use client";

import { Check, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDemoClock } from "../motion/useDemoClock";

export interface MissionScene {
  /** Mensaje de la persona, ya con comillas si corresponde. */
  message: string;
  /** Sistema/herramienta que el agente consulta o actualiza. */
  tool: string;
  /** Resultado final, breve. */
  result: string;
}

const T_MESSAGE = 0;
const T_AGENT = 500;
const T_OUT = 1000;
const T_TOOL = 1850;
const T_BACK = 2450;
const T_RESULT = 2950;
const DURATION = 3400;

/**
 * V3.0 §5 — una misión, no una demo: persona → agente → herramienta → acción →
 * resultado. Una sola reproducción al entrar en viewport o cambiar de escena,
 * sin loop, sin «Pausar»/«Repetir» textual; el replay es solo un icono
 * discreto y accesible. `useDemoClock` ya resuelve `prefers-reduced-motion`
 * mostrando el estado final de inmediato.
 */
export function Mission({ scene, instance }: { scene: MissionScene; instance: string }) {
  const [attach, clock] = useDemoClock<HTMLDivElement>({
    id: `mission-${instance}`,
    duration: DURATION,
    autoplay: true,
  });
  const { t, state } = clock;
  const done = state === "complete";

  const messageIn = t >= T_MESSAGE;
  const agentOn = t >= T_AGENT;
  const lineOut = t >= T_OUT;
  const toolOn = t >= T_TOOL;
  const lineBack = t >= T_BACK;
  const resultIn = t >= T_RESULT || done;

  return (
    <div className="mk-mission" ref={attach}>
      <div className="mk-mission__row">
        <p className={cn("mk-mission__msg", messageIn && "is-in")}>{scene.message}</p>
        <div className="mk-mission__flow">
          <span className={cn("mk-mission__node", agentOn && "is-active")}>
            <span className="mk-mission__dot" aria-hidden />
            Agente
          </span>
          <span className={cn("mk-mission__line", lineOut && "is-out", lineBack && "is-back")} aria-hidden />
          <span className={cn("mk-mission__node", toolOn && "is-active")}>
            <span className="mk-mission__dot" aria-hidden />
            {scene.tool}
          </span>
        </div>
        <p className={cn("mk-mission__result", resultIn && "is-in")} role="status">
          {resultIn ? (
            <>
              <Check size={14} aria-hidden strokeWidth={2.4} />
              {scene.result}
            </>
          ) : null}
        </p>
      </div>
      {done ? (
        <button type="button" className="mk-mission__replay" aria-label="Repetir la animación" onClick={clock.replay}>
          <RotateCcw size={15} aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
