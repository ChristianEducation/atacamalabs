"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { ButtonLink } from "../ui/Button";
import { SectionHeading } from "../ui/Blocks";
import { AgentDemo } from "../demos/AgentDemos";
import { useReducedMotion } from "../motion/reduced-motion";
import { AGENT_ROLES, AGENTS_FEATURES_LABEL, AGENTS_SELECTOR_HEADING } from "@/content/marketing/agents";

const SWAP_MS = 300;
const indexOfRole = (id: string) => AGENT_ROLES.findIndex((role) => role.id === id);

/**
 * Selector de puestos de /agentes (AGENTES_SPEC_V1 §4). Funciona igual que el
 * del Home: franja delgada de pestañas con línea activa que crece desde el
 * centro; al cambiar,
 * el panel sale, hay una breve pausa y entra el nuevo, reproduciendo su demo una
 * vez. Solo el panel activo existe en el DOM y su demo no arranca hasta que el
 * selector entra en pantalla (se pausa al salir). Las anclas `#comercial`,
 * `#cobranza`… abren el puesto correspondiente, para los enlaces del Home.
 */
export function AgentSelector() {
  const reduced = useReducedMotion();
  const [target, setTarget] = useState(0);
  const [shown, setShown] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [swaps, setSwaps] = useState(0);
  const [phase, setPhase] = useState<"static" | "armed" | "play">("static");
  const [visible, setVisible] = useState(true);
  const showRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number | null>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (reduced) return;
    const node = showRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const frame = requestAnimationFrame(() => setPhase((p) => (p === "static" ? "armed" : p)));
    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting);
        if (entry.isIntersecting) setPhase("play");
      },
      { threshold: 0.35 },
    );
    observer.observe(node);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [reduced]);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  const select = useCallback(
    (index: number, options?: { instant?: boolean }) => {
      if (index === target) return;
      setTarget(index);
      tabRefs.current[index]?.scrollIntoView({ inline: "center", block: "nearest", behavior: reduced ? "auto" : "smooth" });
      window.history.replaceState(null, "", `#${AGENT_ROLES[index].id}`);
      if (timer.current) window.clearTimeout(timer.current);
      if (reduced || options?.instant) {
        setShown(index);
        setSwaps((n) => n + 1);
        return;
      }
      setLeaving(true);
      timer.current = window.setTimeout(() => {
        setShown(index);
        setLeaving(false);
        setSwaps((n) => n + 1);
      }, SWAP_MS);
    },
    [target, reduced],
  );

  /* Enlaces del Home (/agentes#cobranza): abre ese puesto y baja al selector. */
  const selectRef = useRef(select);
  useEffect(() => {
    selectRef.current = select;
  }, [select]);

  useEffect(() => {
    const open = () => {
      const index = indexOfRole(window.location.hash.slice(1));
      if (index < 0) return;
      selectRef.current(index, { instant: true });
      document.getElementById("selector")?.scrollIntoView({ block: "start" });
    };
    const frame = requestAnimationFrame(open);
    window.addEventListener("hashchange", open);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", open);
    };
  }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const last = AGENT_ROLES.length - 1;
    let next = target;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = target === last ? 0 : target + 1;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = target === 0 ? last : target - 1;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = last;
    else return;
    event.preventDefault();
    select(next);
    tabRefs.current[next]?.focus();
  };

  const role = AGENT_ROLES[shown];
  const run = phase === "static" ? undefined : phase === "play" && visible ? "running" : "paused";

  return (
    <section id="selector" className="mk-section mk-t-mist mk-sel" aria-labelledby="agents-selector-title">
      <div className="mk-container">
        <SectionHeading
          id="agents-selector-title"
          center
          title={AGENTS_SELECTOR_HEADING.title}
          lead={AGENTS_SELECTOR_HEADING.lead}
        />

        <div className="mk-sel-bar">
          <div className="mk-sel-tabs" role="tablist" aria-label={AGENTS_SELECTOR_HEADING.title} onKeyDown={onKeyDown}>
            {AGENT_ROLES.map((r, i) => {
              const selected = i === target;
              return (
                <button
                  key={r.id}
                  ref={(node) => {
                    tabRefs.current[i] = node;
                  }}
                  type="button"
                  role="tab"
                  id={`agent-tab-${r.id}`}
                  aria-selected={selected}
                  aria-controls="agent-panel"
                  tabIndex={selected ? 0 : -1}
                  className="mk-sel-tab"
                  onClick={() => select(i)}
                >
                  {r.tab}
                </button>
              );
            })}
          </div>
        </div>

        <div
          ref={showRef}
          id="agent-panel"
          role="tabpanel"
          aria-labelledby={`agent-tab-${role.id}`}
          className={cn("mk-sel-show mk-ag-show", swaps > 0 && "is-entering")}
          data-leaving={leaving || undefined}
          data-static={phase === "static" || undefined}
          data-run={run}
        >
          <div className="mk-sel-copy" key={`copy-${role.id}-${swaps}`}>
            <p className="mk-sel-num">
              {String(shown + 1).padStart(2, "0")} / {String(AGENT_ROLES.length).padStart(2, "0")}
            </p>
            <h3 className="mk-sel-title">{role.title}</h3>
            <p className="mk-sel-desc">{role.desc}</p>
            <p className="mk-ag-features-label">{AGENTS_FEATURES_LABEL}</p>
            <ul className="mk-sel-features">
              {role.features.map((feature) => (
                <li key={feature}>
                  <span className="mk-sel-features__ic">
                    <Check size={14} strokeWidth={2.4} aria-hidden />
                  </span>
                  {feature}
                </li>
              ))}
            </ul>
            <div>
              <ButtonLink href={role.cta.href} arrow>
                {role.cta.label}
              </ButtonLink>
            </div>
          </div>
          <div className="mk-sel-visual" key={`visual-${role.id}-${swaps}`}>
            <AgentDemo id={role.id} />
          </div>
        </div>
      </div>
    </section>
  );
}
