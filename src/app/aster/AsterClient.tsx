"use client";

import { useEffect, useRef, useState } from "react";

type VideoProps = {
  video: string | null;
  poster: string;
  captions: string | null;
  captionsLang: string;
};

/**
 * Video hero. Si no hay MP4 (o falla la carga) muestra la tarjeta de respaldo:
 * nunca bloquea el acceso al CTA de WhatsApp.
 */
export function AsterVideo({ video, poster, captions, captionsLang }: VideoProps) {
  const [failed, setFailed] = useState(false);
  const showVideo = Boolean(video) && !failed;

  return (
    <div className="ast-video" data-has-video={showVideo ? "yes" : "no"}>
      {showVideo ? (
        <video
          className="ast-video-el"
          src={video ?? undefined}
          poster={poster}
          controls
          playsInline
          muted
          loop
          autoPlay
          preload="metadata"
          onError={() => setFailed(true)}
          aria-label="Video de Atacama Labs: de lo que ocurre en terreno a una acción real"
        >
          {captions ? (
            <track
              kind="captions"
              src={captions}
              srcLang={captionsLang}
              label="Español"
              default
            />
          ) : null}
        </video>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="ast-video-el"
          src={poster}
          alt="Ilustración 3D de una mina a rajo abierto con camiones, correas transportadoras y marcadores digitales azules"
          width={900}
          height={1613}
        />
      )}
      {!showVideo ? (
        <div className="ast-video-fallback">
          <p>
            <strong>De la voz al informe</strong>
            Cuentas lo que viste, el agente lo ordena y lo recibes en tu correo.
          </p>
        </div>
      ) : null}
    </div>
  );
}

/** Barra fija inferior en móvil: aparece cuando el CTA principal sale de pantalla. */
export function StickyCta({ href, label }: { href: string | null; label: string }) {
  const [show, setShow] = useState(false);
  const anchor = useRef<HTMLElement | null>(null);

  useEffect(() => {
    anchor.current = document.getElementById("ast-cta-main");
    const el = anchor.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setShow(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => setShow(!entry.isIntersecting),
      { threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  if (!href) return null;
  return (
    <div className="ast-sticky" data-show={show ? "yes" : "no"} aria-hidden={!show}>
      <a
        className="ast-btn"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        tabIndex={show ? 0 : -1}
      >
        <WhatsAppIcon />
        {label}
      </a>
    </div>
  );
}

export function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="currentColor">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91A9.84 9.84 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.24-8.23a8.2 8.2 0 0 1 8.23 8.24c0 4.54-3.7 8.23-8.23 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.13-.17.25-.64.81-.78.97-.14.17-.29.19-.54.06a6.7 6.7 0 0 1-3.34-2.92c-.25-.43.25-.4.72-1.34.08-.17.04-.31-.02-.44-.06-.12-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.23.9 2.43 1.02 2.6.12.17 1.76 2.69 4.27 3.77.6.26 1.06.41 1.43.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.2-.58.2-1.08.14-1.18-.06-.1-.23-.17-.48-.29Z" />
    </svg>
  );
}
