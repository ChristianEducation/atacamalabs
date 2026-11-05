"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { diagnosticHref } from "@/lib/marketing/cta-context";
import { ButtonLink } from "../ui/Button";
import { AgentTryButton } from "../shell/AgentTryButton";
import { useReducedMotion } from "../motion/reduced-motion";

/** Palabras del titular, en el orden en que rotan. La última es la variante estática. */
const WORDS = ["atienden", "agendan", "venden", "trabajan"] as const;
const SPOKEN = "atienden, agendan, venden y trabajan.";

/** Cuánto se queda cada palabra y cuánto se lee la primera antes del primer cambio. */
const DWELL_MS = 1200;
const FIRST_HOLD_MS = 900;

const DIAGNOSTIC_HREF = diagnosticHref({
  source_page: "home",
  source_section: "hero",
  source_cta: "agendar-diagnostico",
  service: "agentes",
});

/**
 * Hero del Home — ATACAMA_LABS_HOME_SPEC_V1 §4 y MASTER_PLAN_CONVERSION §4.
 * Video ambiental a pantalla completa (loop sin corte, MP4 + WebM + poster),
 * copy a la izquierda protegido por gradiente claro y CTA flotante «Prueba a
 * Nayra». El titular es «Agentes de IA que [atienden / agendan / venden /
 * trabajan].»: una sola palabra rota en un único espacio.
 *
 * Accesibilidad de la palabra rotativa: las palabras visibles van en
 * `aria-hidden` y el `h1` trae una frase solo para lectores de pantalla, así
 * se lee una vez completa y nunca se anuncian los cambios (el DOM no cambia de
 * texto; solo cambia la clase de la palabra activa). El titular es texto
 * animado y nada más: no tiene controles ni acciones. La rotación solo se
 * detiene sola con la pestaña oculta o el hero fuera de pantalla, y con
 * movimiento reducido el CSS deja fija «trabajan.» y no corre ningún
 * temporizador. Arranca poco después de que la línea 2 termina de aparecer.
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
  const sectionRef = useRef<HTMLElement>(null);
  const accentRef = useRef<HTMLSpanElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const reduced = useReducedMotion();
  const [onScreen, setOnScreen] = useState(true);
  const [tabVisible, setTabVisible] = useState(true);
  const [word, setWord] = useState({ index: 0, previous: -1 });

  useEffect(() => {
    if (reduced) return;
    videoRef.current?.play().catch(() => {
      /* autoplay bloqueado por el navegador: el póster se queda, sin ruido en consola. */
    });
  }, [reduced]);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), { threshold: 0.1 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onChange = () => setTabVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);

  const running = !reduced && onScreen && tabVisible;

  useEffect(() => {
    if (!running) return;
    // El primer cambio llega FIRST_HOLD_MS después de que la línea 2 termina de
    // aparecer (se lee de su propia animación CSS, no de un tiempo supuesto).
    // Si ya terminó (p. ej. al volver a la pestaña), ritmo fijo.
    const entrance = accentRef.current?.getAnimations()[0];
    const end = Number(entrance?.effect?.getComputedTiming().endTime ?? 0);
    const now = typeof entrance?.currentTime === "number" ? entrance.currentTime : end;
    const delay = end > now ? end - now + FIRST_HOLD_MS : DWELL_MS;
    const timer = window.setTimeout(() => {
      setWord((current) => ({ index: (current.index + 1) % WORDS.length, previous: current.index }));
    }, delay);
    return () => window.clearTimeout(timer);
  }, [running, word.index]);

  return (
    <div className="mk-home-hero-wrap">
      <section ref={sectionRef} className="mk-home-hero" aria-labelledby="hero-title">
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
            <p className="mk-eyebrow">Agentes de IA para empresas</p>
            <h1 id="hero-title" className="mk-home-hero__title">
              <span>Agentes de IA</span>
              <span ref={accentRef} className="mk-home-hero__accent">
                que <span className="mk-sr-only">{SPOKEN}</span>
                <span className="mk-home-hero__words" aria-hidden="true">
                  {WORDS.map((item, index) => (
                    <span
                      key={item}
                      className={cn(
                        "mk-home-hero__word",
                        index === word.index && "is-active",
                        index === word.previous && "is-leaving",
                      )}
                    >
                      {item}.
                    </span>
                  ))}
                </span>
              </span>
            </h1>
            <div className="mk-home-hero__support">
              <p className="mk-home-hero__247">
                <span>24/7</span> por todos tus canales
              </p>
            </div>
            <p className="mk-home-hero__lead">
              Implementamos agentes que se conectan con tus herramientas, automatizan procesos y ejecutan tareas reales
              para tu negocio.
            </p>
            <div className="mk-home-hero__actions">
              <ButtonLink href={DIAGNOSTIC_HREF} arrow>
                Agenda un diagnóstico
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
