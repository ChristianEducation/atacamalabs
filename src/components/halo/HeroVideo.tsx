"use client";

import { useSyncExternalStore } from "react";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(callback: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function getSnapshot() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

// Servidor/primer paint: sin forma de saber la preferencia real todavía,
// así que se asume movimiento reducido (el default más seguro) — se ve el
// poster hasta que la hidratación confirme la preferencia real.
function getServerSnapshot() {
  return true;
}

/**
 * Video de fondo del hero (futuro hyperlapse) con soporte real de
 * prefers-reduced-motion vía useSyncExternalStore (lee window.matchMedia
 * directamente, sin setState en efecto): hasta confirmar la preferencia
 * real del navegador se muestra solo el poster estático — nunca hay un
 * primer frame de video de más, y quien prefiere movimiento reducido nunca
 * lo ve. Si `desktopSrc`/`mobileSrc` todavía no existen en disco (assets
 * pendientes, ver docs/HALO-FASE0-MAP.md §E), el <video> simplemente falla
 * a cargar y el navegador sigue mostrando `poster` — degradación limpia,
 * sin cambiar código cuando el asset final llegue.
 */
export function HeroVideo({
  poster,
  posterMobile,
  desktopSrc,
  mobileSrc,
  className,
}: {
  poster: string;
  posterMobile?: string;
  desktopSrc: string;
  mobileSrc?: string;
  className?: string;
}) {
  const prefersReducedMotion = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  if (prefersReducedMotion) {
    return (
      <picture>
        {posterMobile && (
          <source media="(max-width: 767px)" srcSet={posterMobile} />
        )}
        <img
          src={poster}
          alt=""
          className={className}
          fetchPriority="high"
        />
      </picture>
    );
  }

  return (
    <video
      className={className}
      poster={poster}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
    >
      {mobileSrc && <source src={mobileSrc} media="(max-width: 767px)" type="video/mp4" />}
      <source src={desktopSrc} type="video/mp4" />
    </video>
  );
}
