"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "../motion/reduced-motion";
import { track } from "@/lib/analytics";
import { INDUSTRY_LIST, OTHER_INDUSTRY } from "@/content/marketing/industries";
import { IndustryPanel } from "./IndustrySections";
import { IndustryBust } from "../pixel/IndustryBust";

const SWAP_MS = 160;

/**
 * Selector + un rubro a la vez (Rubros, decisión de Christian): arranca con Salud
 * abierto y cada clic muestra solo ese rubro; así nadie recorre nueve secciones
 * casi iguales. Todos los paneles están en el HTML (texto legible por buscadores
 * y por quien llega con un enlace); solo el activo se ve. `/rubros#gimnasios`
 * abre Gimnasios. Al elegir, la demo vuelve a correr desde el inicio, una vez.
 */
export function IndustryExplorer() {
  const reduced = useReducedMotion();
  const [target, setTarget] = useState(0);
  const [shown, setShown] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [swaps, setSwaps] = useState(0);
  const timer = useRef<number | null>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const anchorRef = useRef<HTMLDivElement>(null);

  const scrollToPanel = () => {
    const node = anchorRef.current;
    if (!node) return;
    const top = node.getBoundingClientRect().top + window.scrollY - 112;
    window.scrollTo({ top: Math.max(0, top), behavior: reduced ? "auto" : "smooth" });
  };

  /* Enlaces con ancla (/rubros#salud, «Ver X en acción» de /agentes): abren ese rubro. */
  useEffect(() => {
    const apply = (scroll: boolean) => {
      const index = INDUSTRY_LIST.findIndex((item) => item.slug === window.location.hash.slice(1));
      if (index < 0) return;
      setTarget(index);
      setShown(index);
      setSwaps((n) => n + 1);
      if (scroll) window.setTimeout(scrollToPanel, 60);
    };
    const first = window.setTimeout(() => apply(true), 0);
    const onHash = () => apply(true);
    window.addEventListener("hashchange", onHash);
    return () => {
      window.clearTimeout(first);
      window.removeEventListener("hashchange", onHash);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  const select = (index: number, focus = false) => {
    if (index === target) return;
    setTarget(index);
    const slug = INDUSTRY_LIST[index].slug;
    track({ name: "industry_open", props: { industryId: slug, originSection: "rubros-selector" } });
    window.history.replaceState(null, "", `#${slug}`);
    if (focus) tabRefs.current[index]?.focus();
    if (timer.current) window.clearTimeout(timer.current);
    if (reduced) {
      setShown(index);
      setSwaps((n) => n + 1);
      return;
    }
    setLeaving(true);
    timer.current = window.setTimeout(() => {
      setShown(index);
      setSwaps((n) => n + 1);
      setLeaving(false);
    }, SWAP_MS);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const last = INDUSTRY_LIST.length - 1;
    let next = target;
    if (event.key === "ArrowRight") next = target === last ? 0 : target + 1;
    else if (event.key === "ArrowLeft") next = target === 0 ? last : target - 1;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = last;
    else return;
    event.preventDefault();
    select(next, true);
  };

  return (
    <>
      <div className="mk-rb-nav">
        <div className="mk-container">
          <nav aria-label="Rubros">
            <div className="mk-sel-tabs mk-rb-nav__tabs">
              <div role="tablist" aria-label="Rubros" className="mk-rb-nav__list" onKeyDown={onKeyDown}>
                {INDUSTRY_LIST.map((item, index) => (
                  <button
                    key={item.slug}
                    ref={(node) => {
                      tabRefs.current[index] = node;
                    }}
                    type="button"
                    role="tab"
                    id={`tab-${item.slug}`}
                    aria-selected={index === target}
                    aria-controls={item.slug}
                    tabIndex={index === target ? 0 : -1}
                    className="mk-sel-tab"
                    onClick={() => select(index)}
                  >
                    <IndustryBust industry={item.slug} size={36} className="mk-rb-nav__bust" />
                    {item.shortLabel}
                  </button>
                ))}
              </div>
              <a href={`#${OTHER_INDUSTRY.slug}`} className="mk-sel-tab">
                {OTHER_INDUSTRY.shortLabel}
              </a>
            </div>
          </nav>
        </div>
      </div>

      <div
        ref={anchorRef}
        className={cn("mk-rb-stagewrap", swaps > 0 && "is-entering")}
        data-leaving={leaving || undefined}
      >
        {INDUSTRY_LIST.map((industry, index) => (
          <IndustryPanel
            key={industry.slug}
            industry={industry}
            index={index}
            hidden={index !== shown}
            replayKey={index === shown ? swaps : 0}
          />
        ))}
      </div>
    </>
  );
}
