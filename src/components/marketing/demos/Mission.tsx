"use client";

import { CalendarDays, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { ActionReceipt, Bubble } from "./chat";
import { CrmTable } from "./records";
import { StatusChip } from "../ui/Badge";
import { useDemoClock } from "../motion/useDemoClock";
import type { MissionScene } from "@/content/marketing/missions";

const T_MSG = 0;
const T_REPLY = 600;
const T_RESULT = 1400;
const DURATION = 2000;

function MissionResultCard({ scene }: { scene: MissionScene }) {
  const { result } = scene;
  if (result.kind === "crm") {
    return <CrmTable rows={[result.row]} highlightId={result.row.id} caption={`Ejemplo: ${result.row.company}`} />;
  }
  if (result.kind === "calendar") {
    return (
      <div className="mk-mission-card">
        <span className="mk-mission-card__icon" aria-hidden>
          <CalendarDays size={20} />
        </span>
        <div className="mk-mission-card__body">
          <p className="mk-mission-card__title">{result.title}</p>
          <p className="mk-mission-card__meta">
            {result.day} {result.date} · {result.time}
          </p>
        </div>
        <StatusChip status="completado" label="Confirmada" />
      </div>
    );
  }
  return (
    <ActionReceipt receipt={{ id: result.id, area: result.area, status: result.status }} className="is-new" />
  );
}

/**
 * V3.3 §11/§19 — misión real: burbuja de la persona, respuesta breve del
 * agente y el resultado como pieza de producto (CRM, calendario o recibo),
 * no un diagrama de nodos. Gramática de motion inspirada en IAutomatiza
 * (bubbles escalonadas, panel enter opacity+y+scale), datos propios. Una
 * sola reproducción al entrar en viewport, sin loop, sin controles de texto;
 * el replay es solo un icono con `aria-label`. `prefers-reduced-motion`
 * resuelve el estado final de inmediato vía `useDemoClock`.
 */
export function Mission({ scene, instance }: { scene: MissionScene; instance: string }) {
  const [attach, clock] = useDemoClock<HTMLDivElement>({
    id: `mission-${instance}`,
    duration: DURATION,
    autoplay: true,
  });
  const { t, state } = clock;
  const done = state === "complete";

  const msgIn = t >= T_MSG;
  const replyIn = t >= T_REPLY;
  const resultIn = t >= T_RESULT || done;

  return (
    <div className="mk-mission" ref={attach}>
      <div className="mk-mission__chat">
        <div className={cn("mk-mission__bubble", msgIn && "is-in")}>
          <Bubble message={{ from: "person", text: scene.message }} />
        </div>
        <div className={cn("mk-mission__bubble", replyIn && "is-in")}>
          <Bubble message={{ from: "agent", text: scene.reply }} />
        </div>
      </div>
      <div className={cn("mk-mission__result", resultIn && "is-in")}>
        {resultIn ? <MissionResultCard scene={scene} /> : null}
      </div>
      {done ? (
        <button type="button" className="mk-mission__replay" aria-label="Repetir la animación" onClick={clock.replay}>
          <RotateCcw size={15} aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
