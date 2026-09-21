"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Blocks, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "../motion/reduced-motion";

export interface MarqueeItem {
  id: string;
  name: string;
  logo?: string;
  note?: string;
  placeholder?: boolean;
}

/**
 * E17 IntegrationMarquee — una sola fila. ≥6 marcas: loop continuo (24 px/s
 * desktop, 18 px/s móvil; duración calculada por longitud, no fija);
 * 1–5: lista centrada estática; 0: texto alternativo sin logos. Duplicados
 * aria-hidden y sin foco. Botón visible Pausar/Reanudar; hover/foco pausan
 * temporalmente sin anular la pausa manual. Reduce y JS-off: lista estática.
 */
export function IntegrationMarquee({
  items,
  preview,
  title = "Conectados a las herramientas de tu empresa",
}: {
  items: readonly MarqueeItem[];
  preview: boolean;
  title?: string;
}) {
  const reduced = useReducedMotion();
  const [manualPause, setManualPause] = useState(false);
  const [hoverPause, setHoverPause] = useState(false);
  const trackRef = useRef<HTMLUListElement | null>(null);
  const [duration, setDuration] = useState<number | null>(null);

  const loop = items.length >= 6 && !reduced;

  useEffect(() => {
    const node = trackRef.current;
    if (!node || !loop) return;
    const measure = () => {
      const groupWidth = node.scrollWidth / 2;
      const speed = window.innerWidth < 768 ? 18 : 24;
      setDuration(Math.max(12, groupWidth / speed));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [loop, items.length]);

  const paused = manualPause || hoverPause;

  if (items.length === 0) {
    return (
      <section className="mk-marquee" aria-labelledby="marquee-title">
        <div className="mk-container mk-marquee__head">
          <h2 id="marquee-title" className="mk-marquee__title">
            Conectamos tus herramientas según el proceso
          </h2>
        </div>
      </section>
    );
  }

  const list = (
    <>
      {items.map((item) => (
        <li key={item.id} className="mk-logo" title={item.note}>
          {item.logo ? (
            // eslint-disable-next-line @next/next/no-img-element -- SVG oficial autorizado, decorativo junto al nombre textual
            <img src={item.logo} alt="" width={96} height={24} />
          ) : (
            <Blocks size={18} aria-hidden strokeWidth={1.8} />
          )}
          <span className="mk-logo__name">{item.name}</span>
          {item.placeholder ? <span className="mk-logo__tag">por confirmar</span> : null}
        </li>
      ))}
    </>
  );

  return (
    <section className="mk-marquee" aria-labelledby="marquee-title">
      <div className="mk-container">
        <div className="mk-marquee__head">
          <h2 id="marquee-title" className="mk-marquee__title">
            {title}
          </h2>
          {loop ? (
            <button
              type="button"
              className="mk-ctl mk-marquee__ctl"
              onClick={() => setManualPause((p) => !p)}
              aria-pressed={manualPause}
            >
              {manualPause ? <Play size={16} aria-hidden /> : <Pause size={16} aria-hidden />}
              <span>{manualPause ? "Reanudar" : "Pausar movimiento"}</span>
            </button>
          ) : null}
        </div>
        {preview ? (
          <p className="mk-small mk-marquee__preview">
            Vista previa: aún no hay integraciones verificadas para publicar; estos espacios son genéricos.
          </p>
        ) : null}
        <div
          className={cn("mk-marquee__viewport", !loop && "is-static")}
          onMouseEnter={() => setHoverPause(true)}
          onMouseLeave={() => setHoverPause(false)}
          onFocusCapture={() => setHoverPause(true)}
          onBlurCapture={() => setHoverPause(false)}
        >
          <ul
            ref={trackRef}
            className={cn("mk-marquee__track", loop && "is-loop")}
            data-paused={paused || undefined}
            style={loop && duration ? { animationDuration: `${duration}s` } : undefined}
          >
            {list}
            {loop
              ? items.map((item) => (
                  <li key={`dup-${item.id}`} className="mk-logo" aria-hidden>
                    {item.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element -- duplicado visual del loop
                      <img src={item.logo} alt="" width={96} height={24} />
                    ) : (
                      <Blocks size={18} aria-hidden strokeWidth={1.8} />
                    )}
                    <span className="mk-logo__name">{item.name}</span>
                    {item.placeholder ? <span className="mk-logo__tag">por confirmar</span> : null}
                  </li>
                ))
              : null}
          </ul>
        </div>
        <p className="mk-marquee__more">
          <Link href="/diagnostico?necesidad=integraciones" className="mk-link">
            ¿Usas otra herramienta? Lo revisamos contigo
          </Link>
        </p>
      </div>
    </section>
  );
}
