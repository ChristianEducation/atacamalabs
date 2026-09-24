"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { OnboardingScene } from "../pixel/OnboardingScene";
import { END, signOn, stationAt } from "../pixel/onboarding-timeline";
import { StageDemo, type StagePhase } from "./AgentStageDemos";
import { useMediaQuery } from "../motion/use-media-query";
import { useReducedMotion } from "../motion/reduced-motion";
import { AGENTS_STAGES } from "@/content/marketing/agents";

type Status = "static" | "armed" | "playing" | "ended";

/** En celular la escena se recorta y la cámara sigue al trabajador (mismo corte que el CSS de la sección). */
const NARROW_QUERY = "(max-width: 719px)";

/**
 * Escena pixel de la inducción con su reloj propio y, a su derecha, la tarjeta
 * de la etapa en curso. Arranca sola al entrar en pantalla, corre una vez y se
 * pausa al salir. Cuando el trabajador llega a una estación entra la tarjeta de
 * esa etapa con su mini animación. Al terminar aparece, discreto en la esquina
 * de la escena, un botón para repetirla. Con movimiento reducido (o sin JS) se
 * muestra la escena final y la última tarjeta, sin animación que repetir.
 */
export function AgentOnboardingStage() {
  const reduced = useReducedMotion();
  const narrow = useMediaQuery(NARROW_QUERY);
  const rootRef = useRef<HTMLDivElement>(null);
  const tRef = useRef(END);
  const stationRef = useRef(stationAt(END));
  const [t, setT] = useState(END);
  const [status, setStatus] = useState<Status>("static");
  const [visible, setVisible] = useState(false);
  const [beat, setBeat] = useState(0);
  const [finished, setFinished] = useState(false);
  const [live, setLive] = useState(false);
  const [reached, setReached] = useState(-1);
  const [run, setRun] = useState(0);

  /** Fija el instante y recuerda hasta qué estación llegó el trabajador. */
  const commit = useCallback((next: number) => {
    tRef.current = next;
    setT(next);
    const station = stationAt(next);
    if (station !== stationRef.current) {
      stationRef.current = station;
      setReached((previous) => Math.max(previous, station));
    }
  }, []);

  /* Con JS y movimiento normal: la escena queda a la espera de entrar en pantalla. */
  useEffect(() => {
    if (reduced) return;
    const frame = requestAnimationFrame(() => {
      setStatus((s) => (s === "static" ? "armed" : s));
      setLive(true);
      commit(0);
    });
    return () => cancelAnimationFrame(frame);
  }, [reduced, commit]);

  useEffect(() => {
    const node = rootRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting);
        if (entry.isIntersecting) setStatus((s) => (s === "armed" ? "playing" : s));
      },
      { threshold: 0.35 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  /* Reloj: avanza mientras se reproduce y la escena está a la vista. */
  useEffect(() => {
    if (status !== "playing" || !visible) return;
    let frame = 0;
    let last = performance.now();
    const step = (now: number) => {
      const next = tRef.current + Math.min(now - last, 100);
      last = now;
      if (next >= END) {
        commit(END);
        setFinished(true);
        setStatus("ended");
        return;
      }
      commit(next);
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [status, visible, commit]);

  /* Ya terminada, el trabajador sigue escribiendo con un gesto suave mientras se ve. */
  useEffect(() => {
    if (status !== "ended" || !visible || reduced) return;
    const interval = window.setInterval(() => setBeat((b) => 1 - b), 350);
    return () => window.clearInterval(interval);
  }, [status, visible, reduced]);

  const replay = useCallback(() => {
    setFinished(false);
    setReached(-1);
    setRun((n) => n + 1);
    commit(0);
    setStatus("playing");
  }, [commit]);

  const station = stationAt(t);
  /** Tarjeta a la vista: la de la estación en curso (la primera mientras el trabajador llega). */
  const card = Math.max(0, station);
  const stage = AGENTS_STAGES[card];
  const phase: StagePhase = !live ? "static" : reached >= card ? "play" : "armed";

  return (
    <div ref={rootRef} className="mk-ao" data-status={status}>
      <div className="mk-ao__main">
        <div className="mk-ao__stage">
          <button
            type="button"
            className={cn("mk-ao__repeat", finished && "is-on")}
            onClick={replay}
            tabIndex={finished ? 0 : -1}
            aria-hidden={!finished}
            aria-label="Repetir la animación"
          >
            <RotateCcw size={13} strokeWidth={2.2} aria-hidden />
            <span>Repetir</span>
          </button>
          <OnboardingScene t={t} beat={beat} narrow={narrow} />
        </div>
      </div>

      <aside className="mk-ao__side" aria-label="Etapa de la inducción">
        <ol className="mk-ao__steps">
          {AGENTS_STAGES.map((item, i) => {
            const done = i === AGENTS_STAGES.length - 1 ? signOn(t) : station > i;
            return (
              <li key={item.number}>
                <span
                  className={cn("mk-ao__step", i === card && "is-current", done && "is-done")}
                  aria-current={i === card ? "step" : undefined}
                >
                  <span className="mk-sr-only">{`Etapa ${item.number}: ${item.title}`}</span>
                  <span aria-hidden>{i + 1}</span>
                </span>
              </li>
            );
          })}
        </ol>
        <article key={`${card}-${run}`} className="mk-ao-card">
          <p className="mk-ao-card__num">{stage.number}</p>
          <h3 className="mk-ao-card__title">{stage.title}</h3>
          <p className="mk-ao-card__body">{stage.body}</p>
          <StageDemo index={card} phase={phase} />
        </article>
      </aside>
    </div>
  );
}
