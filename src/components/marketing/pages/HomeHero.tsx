import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ButtonLink } from "../ui/Button";
import { agentCta } from "@/lib/marketing/public-config";

/**
 * Hero del Home — ATACAMA_LABS_HOME_SPEC_V1 §4. Video ambiental a pantalla
 * completa del hero (loop sin corte, MP4 + WebM + poster), copy a la izquierda
 * protegido por gradiente claro y CTA flotante «Prueba al agente». Sin texto
 * rotatorio, demos ni capas de animación sobre el video.
 */
export function HomeHero() {
  const agent = agentCta();
  return (
    <div className="mk-home-hero-wrap">
      <section className="mk-home-hero" aria-labelledby="hero-title">
        <video
          className="mk-home-hero__video"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
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

        <Link href={agent.href} className="mk-home-hero__try">
          <span>Prueba al agente</span>
          <span className="mk-home-hero__try-icon" aria-hidden>
            <ArrowRight size={16} strokeWidth={2.2} />
          </span>
        </Link>
      </section>
    </div>
  );
}
