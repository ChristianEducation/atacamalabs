"use client";

import type { ReactNode } from "react";
import { Pause, Play, RotateCcw, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DemoState } from "../motion/useDemoClock";
import { CONSOLE_LEGEND, DEMO_BADGE, DEMO_LEGEND } from "@/content/marketing/fixtures";

export interface FrameControls {
  state: DemoState;
  onPlay: () => void;
  onPause: () => void;
  onReplay: () => void;
  onShowResult: () => void;
}

/**
 * E5 AppFrame — cabecera 48 (logo AL, escenario, badge demo), cuerpo, footer
 * de controles 44 con leyenda visible. Contrato E0: toda demo lleva la
 * insignia «Demo interactiva» y «Datos ficticios. No realiza acciones en
 * sistemas reales.»; la consola añade «Simulación».
 */
export function DemoFrame({
  title,
  children,
  controls,
  dark,
  product,
  console: isConsole,
  className,
  bodyClassName,
  pauseLabel = "Pausar",
  resultLabel = "Mostrar resultado",
  headerExtra,
  footerExtra,
  label,
}: {
  title: string;
  children: ReactNode;
  controls?: FrameControls;
  dark?: boolean;
  /** Solo la demo protagonista lleva shadow.product. */
  product?: boolean;
  console?: boolean;
  className?: string;
  bodyClassName?: string;
  pauseLabel?: string;
  resultLabel?: string;
  headerExtra?: ReactNode;
  footerExtra?: ReactNode;
  /** Nombre accesible de la región (por defecto, el título). */
  label?: string;
}) {
  const playing = controls?.state === "playing";
  const complete = controls?.state === "complete";
  return (
    <section
      className={cn("mk-frame", dark && "mk-frame--dark mk-dark", product && "mk-frame--product", className)}
      aria-label={label ?? title}
    >
      <header className="mk-frame__head">
        <span className="mk-frame__logo" aria-hidden>
          AL
        </span>
        <span className="mk-frame__title">{title}</span>
        {headerExtra}
        <span className="mk-badge mk-badge--blue mk-frame__badge">{DEMO_BADGE}</span>
      </header>
      <div className={cn("mk-frame__body", bodyClassName)}>{children}</div>
      <footer className="mk-frame__foot">
        <p className="mk-small mk-frame__legend">
          {isConsole ? `${CONSOLE_LEGEND}. ` : ""}
          {DEMO_LEGEND}
        </p>
        <div className="mk-frame__controls">
          {controls ? (
            <>
              {!complete ? (
                <button
                  type="button"
                  className="mk-ctl"
                  onClick={playing ? controls.onPause : controls.onPlay}
                >
                  {playing ? <Pause size={16} aria-hidden /> : <Play size={16} aria-hidden />}
                  <span>{playing ? pauseLabel : "Reproducir"}</span>
                </button>
              ) : null}
              <button type="button" className="mk-ctl" onClick={controls.onReplay}>
                <RotateCcw size={16} aria-hidden />
                <span>Repetir</span>
              </button>
              {!complete ? (
                <button type="button" className="mk-ctl" onClick={controls.onShowResult}>
                  <SkipForward size={16} aria-hidden />
                  <span>{resultLabel}</span>
                </button>
              ) : null}
            </>
          ) : null}
          {footerExtra}
        </div>
      </footer>
    </section>
  );
}
