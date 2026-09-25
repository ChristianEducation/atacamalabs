"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionHeading } from "../ui/Blocks";
import { useReducedMotion } from "../motion/reduced-motion";
import { track } from "@/lib/analytics";
import { INDUSTRY_LIST } from "@/content/marketing/industries";

const SWAP_MS = 180;

/**
 * «Un agente. Distintas industrias.» en /agentes (RUBROS_Y_FOOTER_SPEC_V1 §4):
 * responde una sola pregunta —¿esto funciona en una empresa como la mía?— con un
 * selector de rubros y UNA escena que cambia (nombre, frase, flujo, tres
 * capacidades y enlace a /rubros#rubro). Empieza en Salud; no rota solo.
 * Cambio: fade corto y ascenso ≤10 px; los nodos del flujo entran de izquierda a
 * derecha. Con reducir movimiento, el cambio es inmediato.
 */
export function IndustryShowcase() {
  const reduced = useReducedMotion();
  const [target, setTarget] = useState(0);
  const [shown, setShown] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [swaps, setSwaps] = useState(0);
  const timer = useRef<number | null>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  const select = (index: number, focus = false) => {
    if (index === target) return;
    setTarget(index);
    track({
      name: "industry_open",
      props: { industryId: INDUSTRY_LIST[index].slug, originSection: "agents-industry-showcase" },
    });
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

  const industry = INDUSTRY_LIST[shown];

  return (
    <section id="rubros" className="mk-section mk-t-paper mk-rbs" aria-labelledby="agents-industries-title">
      <div className="mk-container">
        <SectionHeading
          id="agents-industries-title"
          center
          eyebrow="RUBROS"
          title="Un agente. Distintas industrias."
          lead="El trabajo cambia según tu negocio. Mira cómo adaptamos agentes, herramientas y procesos a distintas operaciones."
        />

        <div className="mk-rbs__bar">
          <div className="mk-sel-tabs" role="tablist" aria-label="Rubros" onKeyDown={onKeyDown}>
            {INDUSTRY_LIST.map((item, index) => (
              <button
                key={item.slug}
                ref={(node) => {
                  tabRefs.current[index] = node;
                }}
                type="button"
                role="tab"
                id={`rbs-tab-${item.slug}`}
                aria-selected={index === target}
                aria-controls="rbs-panel"
                tabIndex={index === target ? 0 : -1}
                className="mk-sel-tab"
                onClick={() => select(index)}
              >
                {item.shortLabel}
              </button>
            ))}
          </div>
        </div>

        <div
          id="rbs-panel"
          role="tabpanel"
          aria-labelledby={`rbs-tab-${INDUSTRY_LIST[target].slug}`}
          className={cn("mk-rbs__scene", swaps > 0 && "is-entering")}
          data-leaving={leaving || undefined}
        >
          <div className="mk-rbs__copy" key={`copy-${industry.slug}-${swaps}`}>
            <p className="mk-rbs__name">{industry.name}</p>
            <h3 className="mk-rbs__headline">{industry.headline}</h3>
            <ul className="mk-rbs__caps">
              {industry.capabilities.slice(0, 3).map((capability) => (
                <li key={capability}>
                  <Check size={14} strokeWidth={2.4} aria-hidden />
                  {capability}
                </li>
              ))}
            </ul>
            <Link href={`/rubros#${industry.slug}`} className="mk-rbs__link">
              Ver {industry.name} en acción
              <ArrowRight size={15} strokeWidth={2.2} aria-hidden />
            </Link>
          </div>

          <ol className="mk-rbs__flow" key={`flow-${industry.slug}-${swaps}`} aria-label="Cómo trabaja el agente">
            {industry.flow.map((node, index) => (
              <li key={node} style={{ ["--n" as string]: index } as React.CSSProperties}>
                {node}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
