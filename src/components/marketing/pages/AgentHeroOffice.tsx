"use client";

import { useEffect, useRef, useState } from "react";
import { HeroOfficeScene } from "../pixel/HeroOfficeScene";
import { useReducedMotion } from "../motion/reduced-motion";

/** Instante que se muestra sin JS o con movimiento reducido: Comercial ya sentado en su puesto. */
const STATIC_T = 3400;
/** El dibujo se refresca a ~30 cuadros por segundo: sobra para un pixel art. */
const FRAME_MS = 33;

/**
 * Visual del hero de /agentes (AGENTES_SPEC_V1 §3.2, con la oficina en pixel
 * art en lugar del chat): el mismo trabajador de la inducción va al perchero,
 * se cambia de uniforme y vuelve a su escritorio con la herramienta de cada
 * puesto. Ciclo suave y continuo que se pausa al salir de pantalla; con
 * movimiento reducido queda quieto en el primer puesto.
 */
export function AgentHeroOffice() {
  const reduced = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const tRef = useRef(0);
  const [t, setT] = useState(STATIC_T);
  const [live, setLive] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (reduced) return;
    const frame = requestAnimationFrame(() => {
      tRef.current = 0;
      setT(0);
      setLive(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [reduced]);

  useEffect(() => {
    const node = rootRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.2 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!live || !visible) return;
    let frame = 0;
    let last = performance.now();
    let lastPaint = last;
    const step = (now: number) => {
      tRef.current += Math.min(now - last, 100);
      last = now;
      if (now - lastPaint >= FRAME_MS) {
        lastPaint = now;
        setT(tRef.current);
      }
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [live, visible]);

  return (
    <div className="mk-ho" ref={rootRef}>
      <div className="mk-ho__grid" />
      <div className="mk-ho__glow" />
      <div className="mk-ho__panel">
        <HeroOfficeScene t={t} />
      </div>
    </div>
  );
}
