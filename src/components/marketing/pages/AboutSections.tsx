"use client";

import { DemoFrame } from "../demos/DemoFrame";
import { controlsOf } from "../demos/ScenarioDemos";
import { StatusChip } from "../ui/Badge";
import { useDemoClock } from "../motion/useDemoClock";
import { FEED_EVENTS, FEED_INTERVAL_MS } from "@/content/marketing/fixtures";

const STATUS = { Completo: "completado", "En revisión": "revision", Pendiente: "pendiente" } as const;

/** L1 — ticker de actividad de ejemplo (M09): un evento cada 3200 ms, máximo 8, cinco visibles. */
export function ActivityTicker() {
  const total = FEED_EVENTS.length;
  const [attach, clock] = useDemoClock<HTMLDivElement>({
    id: "about-ticker",
    duration: FEED_INTERVAL_MS * total,
    autoplay: true,
  });
  const count = clock.state === "complete" ? total : Math.min(total, Math.floor(clock.t / FEED_INTERVAL_MS) + 1);
  const visible = FEED_EVENTS.slice(0, count).slice(-5);
  return (
    <div ref={attach}>
      <DemoFrame title="ATACAMA LABS · Operación de ejemplo" controls={controlsOf(clock)} dark console product>
        <ol className="mk-ticker" aria-label="Eventos de ejemplo">
          {visible.map((e) => (
            <li key={e.time} className="mk-ticker__item">
              <span className="mk-mono mk-ticker__time">{e.time}</span>
              <span className="mk-ticker__cat">{e.category}</span>
              <span className="mk-ticker__msg">{e.message}</span>
              <StatusChip status={STATUS[e.status]} label={e.status} />
            </li>
          ))}
        </ol>
      </DemoFrame>
    </div>
  );
}
