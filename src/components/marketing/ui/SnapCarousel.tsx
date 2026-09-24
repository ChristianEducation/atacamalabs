"use client";

import { Children, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "../motion/reduced-motion";

/** Posición de scroll que deja la tarjeta `slide` centrada dentro de `track`. */
function centerOf(track: HTMLElement, slide: HTMLElement) {
  return slide.offsetLeft - (track.clientWidth - slide.offsetWidth) / 2;
}

/**
 * Grupo de tarjetas que en pantallas angostas se recorre en horizontal con
 * snap y puntos indicadores, y desde el ancho de escritorio vuelve a ser la
 * grilla que define `className`. La disposición móvil vive en `ui.css`
 * (`.mk-snap`); aquí solo se sigue qué tarjeta está al centro y se empieza en
 * `start` (p. ej. el plan destacado). En escritorio no hay nada que recorrer,
 * así que el scroll inicial no hace nada.
 */
export function SnapCarousel({
  className,
  label,
  start = 0,
  children,
}: {
  className?: string;
  /** Nombre accesible del grupo, también para los puntos («Planes», «Formatos»…). */
  label: string;
  /** Índice de la tarjeta que queda al centro al cargar. */
  start?: number;
  children: ReactNode;
}) {
  const reduced = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(start);
  const count = Children.count(children);

  useEffect(() => {
    const track = trackRef.current;
    const slide = track?.children[start] as HTMLElement | undefined;
    if (!track || !slide || track.scrollWidth <= track.clientWidth) return;
    track.scrollTo({ left: centerOf(track, slide) });
  }, [start]);

  const onScroll = () => {
    const track = trackRef.current;
    if (!track) return;
    const middle = track.scrollLeft + track.clientWidth / 2;
    let nearest = 0;
    let best = Infinity;
    Array.from(track.children).forEach((slide, index) => {
      const el = slide as HTMLElement;
      const distance = Math.abs(el.offsetLeft + el.offsetWidth / 2 - middle);
      if (distance < best) {
        best = distance;
        nearest = index;
      }
    });
    setActive(nearest);
  };

  const goTo = (index: number) => {
    const track = trackRef.current;
    const slide = track?.children[index] as HTMLElement | undefined;
    if (!track || !slide) return;
    track.scrollTo({ left: centerOf(track, slide), behavior: reduced ? "auto" : "smooth" });
  };

  return (
    <div className="mk-snap">
      <div ref={trackRef} className={cn("mk-snap__track", className)} role="group" aria-label={label} onScroll={onScroll}>
        {children}
      </div>
      <div className="mk-snap__dots" role="group" aria-label={`Selector de ${label.toLowerCase()}`}>
        {Array.from({ length: count }, (_, index) => (
          <button
            key={index}
            type="button"
            className="mk-snap__dot"
            aria-label={`${label}: ${index + 1} de ${count}`}
            aria-current={index === active ? "true" : undefined}
            onClick={() => goTo(index)}
          />
        ))}
      </div>
    </div>
  );
}
