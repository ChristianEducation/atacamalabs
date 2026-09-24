"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Check, Globe, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionHeading } from "../ui/Blocks";
import { Reveal } from "../motion/Reveal";
import { useReducedMotion } from "../motion/reduced-motion";
import { WEB_CONNECT, WEB_CONNECT_STEPS, WEB_CONNECT_TOOLS } from "@/content/marketing/web-page";

const CYCLE_MS = 5600;
const ROW = 64;
const HEIGHT = ROW * WEB_CONNECT_TOOLS.length;
const LINE_W = 130;

const d = (seconds: number): CSSProperties => ({ ["--d" as string]: seconds });

/** Curva desde el centro de «Tu web» hacia la fila de cada herramienta. */
function pathTo(index: number) {
  const y = ROW / 2 + ROW * index;
  const mid = HEIGHT / 2;
  return `M0 ${mid} C ${LINE_W * 0.45} ${mid}, ${LINE_W * 0.55} ${y}, ${LINE_W} ${y}`;
}

/** Contenido de la mini web según el caso: formulario, tienda o consulta. */
function MiniPage({ id }: { id: string }) {
  if (id === "shop") {
    return (
      <div className="mk-mp">
        <p className="mk-mp__title">Tienda</p>
        <div className="mk-mp__prod">
          <i />
          <span>
            <b>Camisa de lino</b>
            <small>$24.990</small>
          </span>
        </div>
        <span className="mk-cs__btn mk-a2" style={d(0.65)}>
          Comprar ahora
        </span>
      </div>
    );
  }
  if (id === "ask") {
    return (
      <div className="mk-mp">
        <p className="mk-mp__title">¿En qué te ayudamos?</p>
        <span className="mk-mp__field mk-a2 mk-a2--rise" style={d(0.2)}>
          ¿Tienen horas el jueves?
        </span>
        <span className="mk-cs__btn mk-a2" style={d(0.65)}>
          Preguntar
        </span>
      </div>
    );
  }
  return (
    <div className="mk-mp">
      <p className="mk-mp__title">Contáctanos</p>
      <span className="mk-mp__field mk-a2 mk-a2--rise" style={d(0.15)}>
        <small>Nombre</small>María Soto
      </span>
      <span className="mk-mp__field mk-a2 mk-a2--rise" style={d(0.35)}>
        <small>Correo</small>maria@correo.cl
      </span>
      <span className="mk-cs__btn mk-a2" style={d(0.65)}>
        Enviar consulta
      </span>
    </div>
  );
}

/**
 * «Puede ser el comienzo del proceso» — SPEC_WEB §6. Una sola escena: lo que
 * hace el visitante en la web (formulario, compra o consulta) sale de «Tu web»
 * y activa herramientas conectadas, que responden con un resultado concreto.
 * El disparador rota cada ~5,6 s. Distinta del esquema «hub» de la referencia:
 * aquí hay causa → efecto de izquierda a derecha. Se pausa fuera de pantalla;
 * con reduced-motion queda el primer caso completo y estático.
 */
export function WebsiteConnectionScene() {
  const reduced = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [step, setStep] = useState(0);
  const [tick, setTick] = useState(0);
  const [live, setLive] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (reduced) return;
    const node = rootRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting);
        if (entry.isIntersecting) {
          setLive((was) => {
            if (!was) setTick((t) => t + 1);
            return true;
          });
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [reduced]);

  useEffect(() => {
    if (reduced || !live || !visible) return;
    const id = window.setInterval(() => {
      setStep((s) => (s + 1) % WEB_CONNECT_STEPS.length);
      setTick((t) => t + 1);
    }, CYCLE_MS);
    return () => window.clearInterval(id);
  }, [reduced, live, visible]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !live) return;
    if (visible) svg.unpauseAnimations();
    else svg.pauseAnimations();
  }, [visible, live, tick]);

  const current = WEB_CONNECT_STEPS[step];
  const animate = live && !reduced;
  const activeIds = WEB_CONNECT_TOOLS.filter((t) => current.results[t.id]).map((t) => t.id);

  return (
    <section id="conexiones" className="mk-section--md mk-t-mist mk-conn" aria-labelledby="web-connect-title">
      <div className="mk-container">
        <SectionHeading
          id="web-connect-title"
          center
          eyebrow={WEB_CONNECT.eyebrow}
          title={WEB_CONNECT.title}
          lead={WEB_CONNECT.lead}
        />

        <Reveal className="mk-rv-ia" delay={100}>
          <div
            ref={rootRef}
            className="mk-cs"
            data-static={animate ? undefined : "true"}
            data-paused={animate && !visible ? "true" : undefined}
          >
            <div className="mk-cs__stage" key={`${step}-${tick}`}>
              <div className="mk-cs__web">
                <div className="mk-cs__win">
                  <div className="mk-cs__chrome">
                    <span className="mk-cs__dots">
                      <i />
                      <i />
                      <i />
                    </span>
                    <span className="mk-cs__url">
                      <Lock size={9} />
                      tuempresa.cl{current.path}
                    </span>
                  </div>
                  <div className="mk-cs__page">
                    <MiniPage id={current.key} />
                  </div>
                </div>
                <p className="mk-cs__label">
                  <Globe size={13} aria-hidden /> {WEB_CONNECT.source}
                </p>
                <p className="mk-cs__trigger mk-a2 mk-a2--pop" style={d(0.95)}>
                  <i /> {current.trigger}
                </p>
              </div>

              <svg
                ref={svgRef}
                className="mk-cs__lines"
                viewBox={`0 0 ${LINE_W} ${HEIGHT}`}
                width={LINE_W}
                height={HEIGHT}
                fill="none"
                aria-hidden="true"
              >
                {WEB_CONNECT_TOOLS.map((tool, i) => {
                  const active = activeIds.indexOf(tool.id);
                  const on = active >= 0;
                  const begin = 1.4 + Math.max(active, 0) * 0.25;
                  const path = pathTo(i);
                  return (
                    <g key={tool.id} className={cn("mk-cs__wire", on && "is-on")}>
                      <path d={path} pathLength={on ? 1 : undefined} className="mk-cs__path" style={{ ["--b" as string]: begin }} />
                      {on && animate ? (
                        <circle r={3.2} className="mk-cs__signal">
                          <animateMotion path={path} dur="0.9s" begin={`${begin}s`} fill="freeze" />
                          <animate
                            attributeName="opacity"
                            values="0;1;1;0"
                            keyTimes="0;0.1;0.85;1"
                            dur="0.9s"
                            begin={`${begin}s`}
                            fill="freeze"
                          />
                        </circle>
                      ) : null}
                    </g>
                  );
                })}
              </svg>

              <ul className="mk-cs__tools">
                {WEB_CONNECT_TOOLS.map((tool) => {
                  const active = activeIds.indexOf(tool.id);
                  const result = current.results[tool.id];
                  const at = 2.35 + Math.max(active, 0) * 0.25;
                  return (
                    <li key={tool.id} className={cn("mk-cs__row", result && "is-on")} style={d(at)}>
                      <span className="mk-cs__tile">
                        <span
                          className="mk-cs__glyph"
                          style={{ ["--glyph" as string]: `url(${tool.logo})` }}
                          aria-hidden
                        />
                      </span>
                      <span className="mk-cs__role">{tool.role}</span>
                      {result ? (
                        <span className="mk-cs__result mk-a2 mk-a2--pop" style={d(at)}>
                          <Check size={13} strokeWidth={2.6} aria-hidden /> {result}
                        </span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>

            <ol className="mk-cs__steps" aria-hidden="true">
              {WEB_CONNECT_STEPS.map((s, i) => (
                <li key={s.key} className={cn(i === step && "is-current")}>
                  {s.trigger.split(" ")[0]}
                </li>
              ))}
            </ol>
          </div>
          <p className="mk-cs__note">{WEB_CONNECT.note}</p>
        </Reveal>
      </div>
    </section>
  );
}
