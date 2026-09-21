"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from "react";
import { useReducedMotion } from "./reduced-motion";

/**
 * M01 Reveal. El contenido comercial jamás nace con opacity:0 esperando JS
 * (spec D2): SSR y primer paint son visibles; solo los bloques que quedan
 * fuera del viewport se marcan `pending` tras hidratar y entran una vez.
 */
export function Reveal({
  as,
  delay = 0,
  className,
  children,
  style,
}: {
  as?: ElementType;
  /** ms de escalonado (M01: paso 70, máximo 280). */
  delay?: number;
  className?: string;
  children: ReactNode;
  style?: CSSProperties;
}) {
  const Tag = (as ?? "div") as ElementType;
  const ref = useRef<HTMLElement | null>(null);
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<"visible" | "pending" | "in">("visible");

  useEffect(() => {
    const node = ref.current;
    if (!node || reduced || typeof IntersectionObserver === "undefined") return;
    const rect = node.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.92) return;
    let frame = requestAnimationFrame(() => setPhase("pending"));
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          cancelAnimationFrame(frame);
          frame = requestAnimationFrame(() => setPhase("in"));
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
    );
    observer.observe(node);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [reduced]);

  return (
    <Tag
      ref={ref}
      className={["mk-reveal", className].filter(Boolean).join(" ")}
      data-reveal={phase === "visible" ? undefined : phase}
      style={{ ...style, ["--reveal-delay" as string]: `${Math.min(delay, 280)}ms` }}
    >
      {children}
    </Tag>
  );
}
