"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "../motion/reduced-motion";
import { IndustryBust, hasIndustryBust } from "../pixel/IndustryBust";
import type { IndustryExperience } from "@/content/marketing/industries";

type Phase = "static" | "armed" | "play";

/**
 * «Así trabaja tu agente» (RUBROS_Y_FOOTER_SPEC_V1 §8.C, §9, §23): conversación →
 * herramientas → acción registrada. Todo el texto está en el HTML; el estado base
 * es el FINAL. Solo si hay JS y no se pidió reducir movimiento, al entrar en
 * pantalla se reproduce UNA vez (mensajes, herramientas que se encienden, recibo)
 * y se queda quieto. Sin bucle, sin controles de repetición.
 */
export function IndustryDemo({ industry }: { industry: IndustryExperience }) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("static");

  useEffect(() => {
    if (reduced) return;
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const frame = requestAnimationFrame(() => setPhase((p) => (p === "static" ? "armed" : p)));
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setPhase("play");
          observer.disconnect();
        }
      },
      { threshold: 0.45 },
    );
    observer.observe(node);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [reduced]);

  const { receipt, aside, trigger } = industry;
  /* La señal del sistema (si hay) va primero: los mensajes se corren un turno. */
  const offset = trigger ? 1 : 0;
  const beats = industry.script.length + offset;

  return (
    <div
      ref={ref}
      className="mk-rb-demo"
      data-phase={phase}
      style={{ ["--msgs" as string]: beats } as React.CSSProperties}
    >
      <div className="mk-rb-demo__head">
        {hasIndustryBust(industry.slug) ? (
          <span className="mk-rb-demo__avatar">
            <IndustryBust industry={industry.slug} size={64} />
          </span>
        ) : null}
        <div>
          <p className="mk-rb-demo__label">Así trabaja tu agente</p>
          {hasIndustryBust(industry.slug) ? <p className="mk-rb-demo__role">Agente de {industry.shortLabel}</p> : null}
        </div>
      </div>

      <div className={cn("mk-rb-demo__body", aside && "has-aside")}>
        <div className="mk-rb-chatcol">
          {trigger ? (
            <div className="mk-rb-trigger" style={{ ["--i" as string]: 0 } as React.CSSProperties}>
              <span className="mk-rb-trigger__label">{trigger.label}</span>
              <p>{trigger.detail}</p>
            </div>
          ) : null}
          <ol className="mk-rb-chat" aria-label="Ejemplo de conversación">
            {industry.script.map((message, index) => (
              <li
                key={index}
                className={cn("mk-rb-msg", message.from === "agent" ? "is-agent" : "is-person")}
                style={{ ["--i" as string]: index + offset } as React.CSSProperties}
              >
                <span className="mk-rb-msg__who">{message.from === "agent" ? "Agente" : "Persona"}</span>
                <p>{message.text}</p>
              </li>
            ))}
          </ol>
        </div>

        {aside ? (
          <div className={cn("mk-rb-aside", `is-${aside.kind}`)} aria-label={aside.title}>
            <p className="mk-rb-aside__title">{aside.title}</p>
            <ul>
              {aside.rows.map((row) => (
                <li
                  key={row.value}
                  className={row.muted ? "is-muted" : undefined}
                  style={{ ["--at" as string]: row.at + offset } as React.CSSProperties}
                >
                  {row.label ? <span>{row.label}</span> : null}
                  {row.value}
                </li>
              ))}
            </ul>
            <p className="mk-rb-aside__status">
              <span className="mk-rb-aside__wait">{aside.wait}</span>
              <span className="mk-rb-aside__done">
                <Check size={13} strokeWidth={2.6} aria-hidden /> {aside.done}
              </span>
            </p>
          </div>
        ) : null}
      </div>

      <ol className="mk-rb-flow" aria-label="Herramientas que usa el agente">
        {industry.flow.map((node, index) => (
          <li key={node} style={{ ["--n" as string]: index } as React.CSSProperties}>
            {node}
          </li>
        ))}
      </ol>

      <div className="mk-rb-receipt">
        <p className="mk-rb-receipt__label">Acción registrada</p>
        <p className="mk-rb-receipt__title">
          <span className="mk-rb-receipt__ic" aria-hidden>
            <Check size={13} strokeWidth={2.6} />
          </span>
          {receipt.title}
          {receipt.id && !aside ? <span className="mk-rb-receipt__id">{receipt.id}</span> : null}
        </p>
        <ul>
          {receipt.chips.map((chip) => (
            <li key={chip}>{chip}</li>
          ))}
        </ul>
      </div>

      <p className="mk-rb-demo__note">
        Ejemplo ilustrativo con datos ficticios. Las acciones dependen de las herramientas conectadas.
      </p>
    </div>
  );
}
