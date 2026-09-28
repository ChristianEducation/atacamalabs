"use client";

import { useEffect, useRef } from "react";
import { ArrowRight } from "lucide-react";
import { ButtonLink } from "../ui/Button";
import { AgentTryButton } from "../shell/AgentTryButton";
import { useReducedMotion } from "../motion/reduced-motion";

/**
 * Hero del Home — ATACAMA_LABS_HOME_SPEC_V1 §4. Video ambiental a pantalla
 * completa del hero (loop sin corte, MP4 + WebM + poster), copy a la izquierda
 * protegido por gradiente claro y CTA flotante «Prueba al agente». Sin texto
 * rotatorio, demos ni capas de animación sobre el video.
 *
 * El video arranca desde JS después del primer paint (sin `autoplay` ni
 * `preload="auto"`): con esos atributos, Lighthouse mide el LCP como el
 * tiempo hasta tener bytes de video suficientes para pintar un frame, no el
 * póster — bajo throttling móvil eso son ~4s de «Render Delay» (88% del LCP
 * total en la auditoría, muy por debajo del objetivo). El póster sigue
 * siendo el primer pintado, visualmente idéntico; el video se acopla apenas
 * el navegador puede, sin bloquear el LCP. No se reproduce si la persona
 * pide reduced motion (ya oculto por CSS).
 */
export function HomeHero() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    videoRef.current?.play().catch(() => {
      /* autoplay bloqueado por el navegador: el póster se queda, sin ruido en consola. */
    });
  }, [reduced]);

  return (
    <div className="mk-home-hero-wrap">
      <section className="mk-home-hero" aria-labelledby="hero-title">
        <video
          ref={videoRef}
          className="mk-home-hero__video"
          muted
          loop
          playsInline
          preload="none"
          poster="/video/hero-poster.jpg"
          aria-hidden="true"
          tabIndex={-1}
        >
          <source src="/video/hero.webm" type="video/webm" />
          <source src="/video/hero.mp4" type="video/mp4" />
        </video>

        <div className="mk-home-hero__inner">
          <div className="mk-home-hero__copy">
            <p className="mk-eyebrow">Atacama Labs</p>
            <h1 id="hero-title" className="mk-home-hero__title">
              <span>Tu empresa, inteligente.</span>
              <span className="mk-home-hero__accent">Desde mañana.</span>
            </h1>
            <p className="mk-home-hero__lead">
              Agentes inteligentes que se conectan a tus herramientas, ejecutan procesos y trabajan junto a tu equipo.
            </p>
            <div className="mk-home-hero__actions">
              <ButtonLink href="/agentes" arrow>
                Conoce nuestros agentes
              </ButtonLink>
              <ButtonLink href="#que-hara-tu-agente" variant="secondary">
                Ver cómo funciona
              </ButtonLink>
            </div>
          </div>
        </div>

        <AgentTryButton
          context={{ source_page: "home", source_section: "hero", source_cta: "prueba-a-nayra", service: "agentes" }}
          className="mk-home-hero__try"
        >
          <span>Prueba a Nayra</span>
          <span className="mk-home-hero__try-icon" aria-hidden>
            <ArrowRight size={16} strokeWidth={2.2} />
          </span>
        </AgentTryButton>
      </section>
    </div>
  );
}
