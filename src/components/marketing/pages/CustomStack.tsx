"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { Cable, Code2, Database, LayoutDashboard, Mail, Server, Users, Webhook, Workflow, Zap, type LucideIcon } from "lucide-react";
import { Reveal } from "../motion/Reveal";
import { useReducedMotion } from "../motion/reduced-motion";
import { CUSTOM_STACK } from "@/content/marketing/custom-page";

/** Escritorio: cables horizontales entre columnas. */
const H = 360;
const W = 110;
const LEFT_ROW = H / CUSTOM_STACK.have.length;
const RIGHT_ROW = H / CUSTOM_STACK.build.length;
const MID = H / 2;
/** Móvil: la misma idea en vertical (embudo), sobre un lienzo de 400 × 64 que escala con el ancho. */
const VW = 400;
const VH = 64;

const HAVE_ICONS: Record<string, LucideIcon> = { mail: Mail, crm: Users, db: Database, erp: Server };
const BUILD_ICONS: Record<string, LucideIcon> = { panel: LayoutDashboard, portal: Users, auto: Zap };
const ALSO_ICONS: Record<string, LucideIcon> = {
  ERP: Server,
  API: Code2,
  Webhooks: Webhook,
  MCP: Cable,
  Correo: Mail,
  "Sistema propio": Workflow,
};

const fanIn = (i: number) => {
  const y = LEFT_ROW * i + LEFT_ROW / 2;
  return `M0 ${y} C ${W / 2} ${y}, ${W / 2} ${MID}, ${W} ${MID}`;
};
const fanOut = (j: number) => {
  const y = RIGHT_ROW * j + RIGHT_ROW / 2;
  return `M0 ${MID} C ${W / 2} ${MID}, ${W / 2} ${y}, ${W} ${y}`;
};

const columnX = (index: number, count: number) => (VW / count) * (index + 0.5);
const funnelIn = (i: number) => {
  const x = columnX(i, CUSTOM_STACK.have.length);
  return `M${x} 0 C ${x} ${VH / 2}, ${VW / 2} ${VH / 2}, ${VW / 2} ${VH}`;
};
const funnelOut = (j: number) => {
  const x = columnX(j, CUSTOM_STACK.build.length);
  return `M${VW / 2} 0 C ${VW / 2} ${VH / 2}, ${x} ${VH / 2}, ${x} ${VH}`;
};

function Wires({
  paths,
  offset,
  id,
  vertical = false,
}: {
  paths: string[];
  offset: number;
  id: string;
  vertical?: boolean;
}) {
  return (
    <svg
      className={vertical ? "mk-cst__wires mk-cst__wires--v" : "mk-cst__wires mk-cst__wires--h"}
      viewBox={vertical ? `0 0 ${VW} ${VH}` : `0 0 ${W} ${H}`}
      {...(vertical ? {} : { width: W, height: H })}
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <filter id={id} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="2.4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {paths.map((d, i) => (
        <g key={d}>
          <path d={d} className="mk-cst__wire" />
          <circle r={3.2} className="mk-cst__signal" filter={`url(#${id})`}>
            <animateMotion path={d} dur="2.4s" begin={`${(offset + i * 0.4).toFixed(1)}s`} repeatCount="indefinite" />
            <animate
              attributeName="opacity"
              values="0;1;1;0"
              keyTimes="0;0.12;0.85;1"
              dur="2.4s"
              begin={`${(offset + i * 0.4).toFixed(1)}s`}
              repeatCount="indefinite"
            />
          </circle>
        </g>
      ))}
    </svg>
  );
}

/**
 * «No reemplazamos todo. Conectamos lo que ya tienes.» — SPEC_A_MEDIDA §6.
 * Lo que la empresa ya tiene (izquierda) fluye hacia Atacama Labs, con la
 * montaña de la marca al centro, y sale como lo que construimos (derecha):
 * panel, portal o automatización. Señales que viajan en bucle suave, pausadas
 * fuera de pantalla; con reduced-motion queda el dibujo estático.
 */
export function CustomStack() {
  const reduced = useReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || reduced || typeof IntersectionObserver === "undefined") return;
    const svgs = wrap.querySelectorAll("svg");
    const observer = new IntersectionObserver(
      ([entry]) => {
        svgs.forEach((svg) => (entry.isIntersecting ? svg.unpauseAnimations() : svg.pauseAnimations()));
      },
      { threshold: 0.1 },
    );
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [reduced]);

  return (
    <section id="integraciones" className="mk-section mk-t-sand" aria-labelledby="custom-stack-title">
      <div className="mk-container">
        <Reveal className="mk-rv-ia mk-heading-block mk-heading-block--center">
          <p className="mk-eyebrow">{CUSTOM_STACK.eyebrow}</p>
          <h2 id="custom-stack-title" className="mk-h2">
            {CUSTOM_STACK.titleA}
            <br />
            <span className="mk-hero__accent">{CUSTOM_STACK.titleB}</span>
          </h2>
          <p className="mk-lead">{CUSTOM_STACK.lead}</p>
        </Reveal>

        <Reveal className="mk-rv-ia" delay={100}>
          <div className="mk-cst" ref={wrapRef}>
            <div className="mk-cst__col mk-cst__col--have">
              <p className="mk-cst__side">{CUSTOM_STACK.leftLabel}</p>
              <ul className="mk-cst__list">
                {CUSTOM_STACK.have.map((tool) => {
                  const Icon = HAVE_ICONS[tool.id];
                  return (
                    <li key={tool.id}>
                      <span className="mk-cst__tile">
                        {tool.logo ? (
                          <span className="mk-cst__glyph" style={{ ["--glyph" as string]: `url(${tool.logo})` }} aria-hidden />
                        ) : Icon ? (
                          <Icon size={20} strokeWidth={1.6} aria-hidden />
                        ) : null}
                      </span>
                      <span className="mk-cst__name">{tool.name}</span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="mk-cst__link mk-cst__link--in">
              <Wires paths={CUSTOM_STACK.have.map((_, i) => fanIn(i))} offset={0} id="mk-cst-glow-a" />
              <Wires paths={CUSTOM_STACK.have.map((_, i) => funnelIn(i))} offset={0} id="mk-cst-glow-av" vertical />
            </div>

            <div className="mk-cst__hub">
              <span className="mk-cst__mark">
                <Image src="/brand/isotipo-azul.svg" alt="" width={130} height={64} unoptimized />
              </span>
              <span className="mk-cst__hub-label">{CUSTOM_STACK.hub}</span>
            </div>

            <div className="mk-cst__link mk-cst__link--out">
              <Wires paths={CUSTOM_STACK.build.map((_, j) => fanOut(j))} offset={1.1} id="mk-cst-glow-b" />
              <Wires paths={CUSTOM_STACK.build.map((_, j) => funnelOut(j))} offset={1.1} id="mk-cst-glow-bv" vertical />
            </div>

            <div className="mk-cst__col mk-cst__col--build">
              <p className="mk-cst__side">{CUSTOM_STACK.rightLabel}</p>
              <ul className="mk-cst__builds">
                {CUSTOM_STACK.build.map((item) => {
                  const Icon = BUILD_ICONS[item.id];
                  return (
                    <li key={item.id}>
                      <span className="mk-cst__b-ic">
                        <Icon size={20} strokeWidth={1.7} aria-hidden />
                      </span>
                      <span>
                        <strong>{item.name}</strong>
                        <small>{item.body}</small>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </Reveal>

        <Reveal className="mk-rv-ia" delay={200}>
          <ul className="mk-cst__also" aria-label="También conectamos">
            {CUSTOM_STACK.also.map((item) => {
              const Icon = ALSO_ICONS[item];
              return (
                <li key={item}>
                  <Icon size={14} strokeWidth={1.9} aria-hidden />
                  {item}
                </li>
              );
            })}
          </ul>
          <p className="mk-cst__note">{CUSTOM_STACK.note}</p>
        </Reveal>
      </div>
    </section>
  );
}
