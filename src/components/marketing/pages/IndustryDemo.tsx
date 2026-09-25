"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "../motion/reduced-motion";
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

  const { receipt } = industry;

  return (
    <div
      ref={ref}
      className="mk-rb-demo"
      data-phase={phase}
      style={{ ["--msgs" as string]: industry.script.length } as React.CSSProperties}
    >
      <p className="mk-rb-demo__label">Así trabaja tu agente</p>

      <div className={cn("mk-rb-demo__body", receipt.ticket && "has-ticket")}>
        <ol className="mk-rb-chat" aria-label="Ejemplo de conversación">
          {industry.script.map((message, index) => (
            <li
              key={index}
              className={cn("mk-rb-msg", message.from === "agent" ? "is-agent" : "is-person")}
              style={{ ["--i" as string]: index } as React.CSSProperties}
            >
              <span className="mk-rb-msg__who">{message.from === "agent" ? "Agente" : "Persona"}</span>
              <p>{message.text}</p>
            </li>
          ))}
        </ol>

        {receipt.ticket ? (
          <div className="mk-rb-ticket" aria-label="Pedido de ejemplo">
            <p className="mk-rb-ticket__id">{receipt.id}</p>
            <ul>
              {receipt.ticket.lines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <p className="mk-rb-ticket__when">{receipt.ticket.when}</p>
            <p className="mk-rb-ticket__status">
              <span className="mk-rb-ticket__wait">Recibiendo…</span>
              <span className="mk-rb-ticket__done">
                <Check size={13} strokeWidth={2.6} aria-hidden /> Registrado
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
          {receipt.id && !receipt.ticket ? <span className="mk-rb-receipt__id">{receipt.id}</span> : null}
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
