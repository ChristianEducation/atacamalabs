"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { ButtonLink } from "../ui/Button";
import { SectionHeading } from "../ui/Blocks";
import { HomeDemo } from "../demos/HomeDemos";
import { useReducedMotion } from "../motion/reduced-motion";
import {
  HOME_SELECTOR,
  HOME_SELECTOR_HEADING,
} from "@/content/marketing/home-selector";

const SWAP_MS = 300;

/**
 * Selector principal del Home — HOME_SPEC_V1 §6. Tabs con active line que
 * crece desde el centro; al cambiar: el panel sale, breve pausa y el nuevo
 * entra (opacity + translate + scale) reproduciendo su misión una vez. Solo
 * el panel activo existe en el DOM (los inactivos no animan). La demo no
 * arranca hasta que el selector entra en pantalla y se pausa al salir.
 */
export function HomeSelector() {
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
    const frame = requestAnimationFrame(() =>
      setPhase((p) => (p === "static" ? "armed" : p)),
    );
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
    (index: number) => {
      if (index === target) return;
      setTarget(index);
      tabRefs.current[index]?.scrollIntoView({
        inline: "center",
        block: "nearest",
        behavior: reduced ? "auto" : "smooth",
      });
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
    const last = HOME_SELECTOR.length - 1;
    let next = target;
    if (event.key === "ArrowRight" || event.key === "ArrowDown")
      next = target === last ? 0 : target + 1;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp")
      next = target === 0 ? last : target - 1;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = last;
    else return;
    event.preventDefault();
    select(next);
    tabRefs.current[next]?.focus();
  };

  const item = HOME_SELECTOR[shown];
  const run =
    phase === "static"
      ? undefined
      : phase === "play" && visible
        ? "running"
        : "paused";

  return (
    <section
      id="que-hara-tu-agente"
      className="mk-section mk-t-mist mk-sel"
      aria-labelledby="sel-title"
    >
      <div className="mk-container">
        <SectionHeading
          id="sel-title"
          center
          title={HOME_SELECTOR_HEADING.title}
          lead={HOME_SELECTOR_HEADING.lead}
        />

        <div className="mk-sel-bar">
          <div
            className="mk-sel-tabs"
            role="tablist"
            aria-label={HOME_SELECTOR_HEADING.title}
            onKeyDown={onKeyDown}
          >
            {HOME_SELECTOR.map((s, i) => {
              const selected = i === target;
              return (
                <button
                  key={s.id}
                  ref={(node) => {
                    tabRefs.current[i] = node;
                  }}
                  type="button"
                  role="tab"
                  id={`sel-tab-${s.id}`}
                  aria-selected={selected}
                  aria-controls="sel-panel"
                  tabIndex={selected ? 0 : -1}
                  className="mk-sel-tab"
                  onClick={() => select(i)}
                >
                  {s.tab}
                </button>
              );
            })}
          </div>
        </div>

        <div
          ref={showRef}
          id="sel-panel"
          role="tabpanel"
          aria-labelledby={`sel-tab-${item.id}`}
          className={cn("mk-sel-show", swaps > 0 && "is-entering")}
          data-leaving={leaving || undefined}
          data-static={phase === "static" || undefined}
          data-run={run}
        >
          <div className="mk-sel-copy" key={`copy-${item.id}-${swaps}`}>
            <p className="mk-sel-num">
              {String(shown + 1).padStart(2, "0")} /{" "}
              {String(HOME_SELECTOR.length).padStart(2, "0")}
            </p>
            <h3 className="mk-sel-title">{item.title}</h3>
            <p className="mk-sel-desc">{item.desc}</p>
            <ul className="mk-sel-features">
              {item.features.map((f) => (
                <li key={f}>
                  <span className="mk-sel-features__ic">
                    <Check size={14} strokeWidth={2.4} aria-hidden />
                  </span>
                  {f}
                </li>
              ))}
            </ul>
            <div>
              <ButtonLink href={item.cta.href} arrow>
                {item.cta.label}
              </ButtonLink>
            </div>
          </div>
          <div className="mk-sel-visual" key={`visual-${item.id}-${swaps}`}>
            <HomeDemo id={item.id} />
          </div>
        </div>
      </div>
    </section>
  );
}
