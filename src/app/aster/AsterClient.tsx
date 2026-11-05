"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

/** Loop ambiental del hero: sin sonido, no compite con el titular. Respeta «reducir movimiento» (muestra solo el póster). */
function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => true, // servidor: sin video hasta hidratar (el póster ya está pintado)
  );
}

export function AmbientVideo({ src, poster, label }: { src: string | null; poster: string; label: string }) {
  const still = usePrefersReducedMotion();
  const [failed, setFailed] = useState(false);

  const showVideo = Boolean(src) && !still && !failed;
  return (
    <div className="ast-loop" role="img" aria-label={label}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="ast-loop__poster" src={poster} alt="" width={1080} height={1935} fetchPriority="high" />
      {showVideo ? (
        <video
          className="ast-loop__video"
          src={src ?? undefined}
          poster={poster}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
          tabIndex={-1}
          onError={() => setFailed(true)}
        />
      ) : null}
    </div>
  );
}

/** Video principal: opcional, no bloquea la navegación; si no carga, queda el póster. */
export function DemoVideo({ src, poster }: { src: string | null; poster: string }) {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLVideoElement | null>(null);
  if (!src || failed) {
    return (
      <div className="ast-player">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={poster} alt="Persona de operaciones dictando un audio en una planta industrial" width={900} height={1612} loading="lazy" />
      </div>
    );
  }
  return (
    <div className="ast-player">
      <video
        ref={ref}
        src={src}
        poster={poster}
        controls
        playsInline
        preload="none"
        onError={() => setFailed(true)}
        aria-label="Video de 43 segundos: de un audio en terreno a un documento entregado por WhatsApp"
      />
    </div>
  );
}

/** Barra fija inferior en móvil: aparece cuando el CTA principal sale de pantalla. */
export function StickyCta({ href, label }: { href: string | null; label: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = document.getElementById("ast-cta-main");
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setShow(!entry.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  if (!href) return null;
  return (
    <div className="ast-sticky" data-show={show ? "yes" : "no"} aria-hidden={!show}>
      <a className="mk-btn mk-btn--primary mk-btn--block" href={href} target="_blank" rel="noopener noreferrer" tabIndex={show ? 0 : -1}>
        <WhatsAppIcon />
        {label}
      </a>
    </div>
  );
}

export function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="currentColor">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91A9.84 9.84 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.24-8.23a8.2 8.2 0 0 1 8.23 8.24c0 4.54-3.7 8.23-8.23 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.13-.17.25-.64.81-.78.97-.14.17-.29.19-.54.06a6.7 6.7 0 0 1-3.34-2.92c-.25-.43.25-.4.72-1.34.08-.17.04-.31-.02-.44-.06-.12-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.23.9 2.43 1.02 2.6.12.17 1.76 2.69 4.27 3.77.6.26 1.06.41 1.43.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.2-.58.2-1.08.14-1.18-.06-.1-.23-.17-.48-.29Z" />
    </svg>
  );
}
