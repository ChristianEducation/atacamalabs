"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { SectionHeading } from "../ui/Blocks";
import { Character, PAL, Pixels, type Rect } from "../pixel/sprites";
import { ToolIcon, type ToolIconId } from "../pixel/tool-icons";
import { useReducedMotion } from "../motion/reduced-motion";
import {
  AGENT_TOOL_GROUPS,
  AGENTS_TOOLS_HEADING,
  AGENTS_TOOLS_NOTE,
  type AgentToolGroup,
} from "@/content/marketing/agents";

type Phase = "static" | "armed" | "play";

/** Cada cuánto pasa el agente a la siguiente herramienta durante la primera reproducción. */
const STEP_MS = 1600;

/** Color del punto que se enciende en el monitor según la herramienta en uso. */
const SCREEN_COLOR: Record<string, string> = {
  calendar: PAL.shirt,
  chat: PAL.green,
  crm: PAL.shirtShade,
  data: PAL.shirt,
  docs: PAL.amber,
  api: PAL.amber,
};

const r = (x: number, y: number, w: number, h: number, fill: string): Rect => [x, y, w, h, fill];

/** Puesto de trabajo: suelo, silla, escritorio y monitor (el trabajador va encima). */
const DESK: Rect[] = [
  r(0, 38, 56, 2, PAL.floor),
  r(0, 38, 56, 1, PAL.floorLine),
  r(3, 22, 1, 9, PAL.steelDark),
  r(3, 30, 5, 1, PAL.steelDark),
  r(5, 31, 1, 7, PAL.steelDark),
  r(2, 37, 7, 1, PAL.steelDark),
  r(18, 26, 30, 2, PAL.wood),
  r(19, 28, 2, 10, PAL.woodDark),
  r(45, 28, 2, 10, PAL.woodDark),
  r(20, 25, 7, 1, "#5b6479"),
  r(31, 23, 2, 3, PAL.rackLine),
  r(28, 25, 8, 1, PAL.rackLine),
  r(25, 10, 14, 13, PAL.ink),
  r(26, 11, 12, 11, "#f4f8ff"),
];

function Workstation({ active, beat }: { active: AgentToolGroup | null; beat: number }) {
  const color = active ? SCREEN_COLOR[active.id] : PAL.steelDark;
  return (
    <svg className="mk-at__scene" viewBox="0 0 56 40" aria-hidden="true">
      <Pixels rects={DESK} />
      <Pixels rects={[r(27, 13, 3, 3, color), r(31, 13, 5, 1, PAL.steelDark), r(31, 15, 4, 1, PAL.steelDark), r(27, 18, 9, 1, PAL.steelDark), r(27, 20, 6, 1, PAL.steelDark)]} />
      <g transform="translate(8 38)">
        <Character pose="sit" frame={active ? beat : 0} />
      </g>
    </svg>
  );
}

function Logos({ group }: { group: AgentToolGroup }) {
  return (
    <span className="mk-at__logos">
      {group.logos.map((logo) => (
        <span
          key={logo.name}
          className="mk-at__logo"
          style={{ ["--glyph" as string]: `url(${logo.src})` } as CSSProperties}
          title={logo.name}
          role="img"
          aria-label={logo.name}
        />
      ))}
    </span>
  );
}

/**
 * «Se conecta con lo que tu empresa ya usa» (AGENTES_SPEC_V1 §6). El agente
 * sentado en su escritorio y, alrededor, las herramientas como objetos de su
 * oficina. Entrada escalonada de las herramientas (referencia «Conecta todo tu
 * stack»); al entrar en pantalla el agente pasa por cada una una vez, y luego
 * se puede probar cualquiera al pasar el cursor o tocarla. Los logos son
 * ejemplos; la forma de conexión (directa, API, MCP o a medida) depende de la
 * herramienta y el proyecto.
 */
export function AgentTools() {
  const reduced = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("static");
  const [active, setActive] = useState(-1);
  const [beat, setBeat] = useState(0);
  const touched = useRef(false);
  const releaseTimer = useRef<number | null>(null);

  useEffect(() => {
    if (reduced) return;
    const node = rootRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const frame = requestAnimationFrame(() => setPhase((p) => (p === "static" ? "armed" : p)));
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setPhase("play");
          observer.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(node);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [reduced]);

  /* Primera reproducción: el agente pasa por cada herramienta, una vez. */
  useEffect(() => {
    if (phase !== "play") return;
    let index = 0;
    const timers: number[] = [];
    const next = () => {
      if (touched.current) return;
      if (index >= AGENT_TOOL_GROUPS.length) {
        setActive(-1);
        return;
      }
      setActive(index);
      index += 1;
      timers.push(window.setTimeout(next, STEP_MS));
    };
    timers.push(window.setTimeout(next, 1400));
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [phase]);

  /* El agente escribe mientras trabaja con una herramienta. */
  useEffect(() => {
    if (active < 0) return;
    const interval = window.setInterval(() => setBeat((b) => 1 - b), 320);
    return () => window.clearInterval(interval);
  }, [active]);

  useEffect(
    () => () => {
      if (releaseTimer.current) window.clearTimeout(releaseTimer.current);
    },
    [],
  );

  const activate = useCallback((index: number, hold?: boolean) => {
    touched.current = true;
    if (releaseTimer.current) window.clearTimeout(releaseTimer.current);
    setActive(index);
    if (hold) releaseTimer.current = window.setTimeout(() => setActive(-1), 3200);
  }, []);
  const release = useCallback(() => setActive(-1), []);

  const current = active >= 0 ? AGENT_TOOL_GROUPS[active] : null;

  return (
    <section id="herramientas" className="mk-section mk-t-mist mk-at-section" aria-labelledby="agents-tools-title">
      <div className="mk-container">
        <SectionHeading
          id="agents-tools-title"
          center
          title={AGENTS_TOOLS_HEADING.title}
          lead={AGENTS_TOOLS_HEADING.lead}
        />

        <div ref={rootRef} className="mk-at" data-phase={phase}>
          <svg className="mk-at__wires" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {AGENT_TOOL_GROUPS.map((group, i) => {
              const left = i < 3;
              const y = [17, 50, 83][i % 3];
              const d = left ? `M50 55 C 40 55, 36 ${y}, 24 ${y}` : `M50 55 C 60 55, 64 ${y}, 76 ${y}`;
              return <path key={group.id} d={d} className={cn("mk-at__wire", active === i && "is-on")} />;
            })}
          </svg>

          <div className="mk-at__center">
            <p className={cn("mk-at__bubble", current && "is-on")} aria-hidden="true">
              {current ? current.action : " "}
            </p>
            <Workstation active={current} beat={beat} />
            <p className="mk-at__who" aria-hidden="true">
              <i /> Agente en su puesto
            </p>
          </div>

          <ul className="mk-at__tools" role="list">
            {AGENT_TOOL_GROUPS.map((group, i) => (
              <li key={group.id} style={{ ["--i" as string]: i } as CSSProperties}>
                <button
                  type="button"
                  className={cn("mk-at__tile", active === i && "is-active")}
                  aria-pressed={active === i}
                  onMouseEnter={() => activate(i)}
                  onMouseLeave={release}
                  onFocus={() => activate(i)}
                  onBlur={release}
                  onClick={() => activate(i, true)}
                >
                  <ToolIcon id={group.id as ToolIconId} />
                  <span className="mk-at__txt">
                    <strong>{group.name}</strong>
                    <small>{group.action}</small>
                    {group.note ? <em>{group.note}</em> : null}
                    <Logos group={group} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <p className="mk-at__note">{AGENTS_TOOLS_NOTE}</p>
      </div>
    </section>
  );
}
