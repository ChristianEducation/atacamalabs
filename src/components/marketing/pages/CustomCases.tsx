"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import {
  BarChart3,
  Bell,
  BookOpen,
  Calculator,
  CalendarDays,
  Check,
  ClipboardCheck,
  Database,
  FileInput,
  FileText,
  LayoutDashboard,
  Link2,
  ListChecks,
  MessageCircle,
  ScanText,
  ShieldCheck,
  Target,
  UserCheck,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionHeading } from "../ui/Blocks";
import { useReducedMotion } from "../motion/reduced-motion";
import { CUSTOM_CASES, CUSTOM_CASES_HEADING, type CaseStepIcon } from "@/content/marketing/custom-page";

const ICONS: Record<CaseStepIcon, LucideIcon> = {
  message: MessageCircle,
  book: BookOpen,
  calc: Calculator,
  link: Link2,
  shield: ShieldCheck,
  clipboard: ClipboardCheck,
  form: FileInput,
  user: UserCheck,
  tasks: ListChecks,
  bell: Bell,
  file: FileText,
  scan: ScanText,
  db: Database,
  chart: BarChart3,
  lead: UserPlus,
  target: Target,
  users: Users,
  calendar: CalendarDays,
  layout: LayoutDashboard,
};

const SWAP_MS = 300;
const NODE_START = 300;
const NODE_STEP = 450;

const t = (ms: number): CSSProperties => ({ ["--t" as string]: ms });

/**
 * «Un proceso, de punta a punta» — SPEC_A_MEDIDA §7. Tabs simples; al elegir un
 * caso el flujo se arma paso a paso (cada nodo entra con el «pop» con resorte
 * de la escena 03 de la referencia; el conector crece entre nodos) y al final
 * aparece el resultado. El panel sale/entra como en el selector del Home. Se
 * reproduce al entrar en pantalla; con reduced-motion se muestra completo.
 */
export function CustomCases() {
  const reduced = useReducedMotion();
  const [target, setTarget] = useState(0);
  const [shown, setShown] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [swaps, setSwaps] = useState(0);
  const [phase, setPhase] = useState<"static" | "armed" | "play">("static");
  const panelRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number | null>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (reduced) return;
    const node = panelRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const frame = requestAnimationFrame(() => setPhase((p) => (p === "static" ? "armed" : p)));
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setPhase("play");
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
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
    (index: number) => {
      if (index === target) return;
      setTarget(index);
      tabRefs.current[index]?.scrollIntoView({ inline: "center", block: "nearest", behavior: reduced ? "auto" : "smooth" });
      if (timer.current) window.clearTimeout(timer.current);
      if (reduced) {
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

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const last = CUSTOM_CASES.length - 1;
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

  const item = CUSTOM_CASES[shown];
  const resultAt = NODE_START + item.steps.length * NODE_STEP + 100;

  return (
    <section id="casos" className="mk-section mk-t-paper" aria-labelledby="custom-cases-title">
      <div className="mk-container">
        <SectionHeading
          id="custom-cases-title"
          center
          eyebrow={CUSTOM_CASES_HEADING.eyebrow}
          title={CUSTOM_CASES_HEADING.title}
          lead={CUSTOM_CASES_HEADING.lead}
        />

        <div className="mk-sel-bar mk-sel-bar--static">
          <div className="mk-sel-tabs" role="tablist" aria-label={CUSTOM_CASES_HEADING.title} onKeyDown={onKeyDown}>
            {CUSTOM_CASES.map((c, i) => (
              <button
                key={c.id}
                ref={(node) => {
                  tabRefs.current[i] = node;
                }}
                type="button"
                role="tab"
                id={`case-tab-${c.id}`}
                aria-selected={i === target}
                aria-controls="case-panel"
                tabIndex={i === target ? 0 : -1}
                className="mk-sel-tab"
                onClick={() => select(i)}
              >
                {c.tab}
              </button>
            ))}
          </div>
        </div>

        <div
          ref={panelRef}
          id="case-panel"
          role="tabpanel"
          aria-labelledby={`case-tab-${item.id}`}
          className={cn("mk-cf", swaps > 0 && "is-entering")}
          data-leaving={leaving || undefined}
          data-phase={phase}
        >
          <div className="mk-cf__body" key={`${item.id}-${swaps}`}>
            <p className="mk-cf__intro">{item.intro}</p>
            <ol className="mk-cf__flow">
              {item.steps.map((step, i) => {
                const Icon = ICONS[step.icon];
                const at = NODE_START + i * NODE_STEP;
                return (
                  <li key={step.label} className="mk-cf__step">
                    <span className="mk-cf__node mk-cf-it mk-cf-it--pop" style={t(at)}>
                      <span className="mk-cf__tile">
                        <Icon size={20} strokeWidth={1.6} aria-hidden />
                      </span>
                      <span className="mk-cf__label">{step.label}</span>
                    </span>
                    {i < item.steps.length - 1 ? (
                      <span className="mk-cf__line mk-cf-it mk-cf-it--grow" style={t(at + 260)} aria-hidden />
                    ) : null}
                  </li>
                );
              })}
            </ol>
            <p className="mk-cf__result mk-cf-it mk-cf-it--pop" style={t(resultAt)}>
              <span className="mk-cf__result-ic">
                <Check size={15} strokeWidth={2.8} aria-hidden />
              </span>
              {item.result}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
