"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  getCoordinatorServerSnapshot,
  getCoordinatorSnapshot,
  reportVisibility,
  subscribeCoordinator,
  unregisterDemo,
} from "./coordinator";
import { useReducedMotion } from "./reduced-motion";

export type DemoState = "idle" | "playing" | "paused" | "complete";

interface Options {
  /** Identificador único de la instancia (una demo activa por viewport). */
  id: string;
  /** Duración de un ciclo en ms. */
  duration: number;
  /** Ciclos automáticos antes de quedar en estado final. Por defecto 1. */
  cycles?: number;
  /** Arranca solo al ser la demo activa (visible ≥35%). Sin autoplay espera `Reproducir`. */
  autoplay?: boolean;
}

export interface DemoClock {
  state: DemoState;
  /** Tiempo dentro del ciclo actual (ms). En estado final = duration. */
  t: number;
  cycle: number;
  isActive: boolean;
  reduced: boolean;
  play: () => void;
  pause: () => void;
  replay: () => void;
  showResult: () => void;
}

type Mode = "auto" | "playing" | "paused" | "idle";

const STEP = 33;

/**
 * Reloj determinista (spec D2 / R4.1): mantiene tiempo transcurrido, no una
 * lista de timeouts. Toda demo es una función pura de `t`, de modo que
 * pausar, repetir, saltar al resultado y reduced-motion son triviales y no
 * dejan timers colgados: el único recurso es un rAF que se cancela al
 * desmontar o pausar. Salir del viewport, ocultar la pestaña o abrir el
 * menú pausan sin perder el tiempo acumulado.
 */
export function useDemoClock<T extends HTMLElement = HTMLDivElement>({
  id,
  duration,
  cycles = 1,
  autoplay = true,
}: Options): [(node: T | null) => void, DemoClock] {
  const [node, setNode] = useState<T | null>(null);
  const acc = useRef(0);
  const reduced = useReducedMotion();
  const coordinator = useSyncExternalStore(
    subscribeCoordinator,
    getCoordinatorSnapshot,
    getCoordinatorServerSnapshot,
  );
  const isActive = coordinator.activeId === id;

  const total = duration * cycles;
  const [elapsed, setElapsed] = useState(0);
  const [mode, setMode] = useState<Mode>(autoplay ? "auto" : "idle");

  useEffect(() => {
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const rect = entry.intersectionRect;
        const area = rect.width * rect.height;
        const viewportArea = window.innerWidth * window.innerHeight;
        const qualifies =
          entry.intersectionRatio >= 0.35 || (viewportArea > 0 && area / viewportArea >= 0.35);
        reportVisibility(id, area, qualifies);
      },
      { threshold: [0, 0.1, 0.2, 0.35, 0.5, 0.75, 1] },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      unregisterDemo(id);
    };
  }, [id, node]);

  const running =
    !reduced &&
    !coordinator.paused &&
    isActive &&
    (mode === "auto" || mode === "playing") &&
    elapsed < total;

  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(now - last, 100);
      last = now;
      const next = Math.min(acc.current + dt, total);
      acc.current = next;
      setElapsed((prev) =>
        next >= total || Math.floor(next / STEP) !== Math.floor(prev / STEP) ? next : prev,
      );
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [running, total]);

  const finished = reduced || elapsed >= total;

  const play = useCallback(() => {
    if (acc.current >= total) {
      acc.current = 0;
      setElapsed(0);
    }
    setMode("playing");
  }, [total]);
  const pause = useCallback(() => setMode("paused"), []);
  const replay = useCallback(() => {
    acc.current = 0;
    setElapsed(0);
    setMode("playing");
  }, []);
  const showResult = useCallback(() => {
    acc.current = total;
    setElapsed(total);
    setMode("paused");
  }, [total]);

  let state: DemoState;
  if (finished) state = "complete";
  else if (mode === "paused") state = "paused";
  else if (running) state = "playing";
  else state = elapsed > 0 ? "paused" : "idle";

  const effective = finished ? total : elapsed;
  const cycle = finished ? cycles - 1 : Math.min(cycles - 1, Math.floor(effective / duration));
  const t = finished ? duration : effective - cycle * duration;

  /* [attach, clock]: el ref de callback va aparte para que el resto del reloj no se trate como un ref. */
  return [setNode, { state, t, cycle, isActive, reduced, play, pause, replay, showResult }];
}
