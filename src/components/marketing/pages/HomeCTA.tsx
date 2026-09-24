import Link from "next/link";
import { ButtonLink } from "../ui/Button";
import { Reveal } from "../motion/Reveal";

/**
 * CTA final del Home — HOME_SPEC_V1 §8. Sección amplia y con aire, en el
 * mismo tono suave del selector; cierra sin introducir una idea nueva, sin
 * demo y sin repetir el video del hero.
 */
export function HomeCTA() {
  return (
    <section className="mk-home-cta mk-t-mist" aria-labelledby="home-cta-title">
      <div className="mk-container">
        <Reveal className="mk-home-cta__inner">
          <h2 id="home-cta-title" className="mk-home-cta__title">
            ¿Qué le delegarías mañana?
          </h2>
          <p className="mk-home-cta__body">
            Cuéntanos qué proceso quieres mejorar y te mostramos cómo podría trabajarlo un agente de Atacama Labs.
          </p>
          <div className="mk-home-cta__actions">
            <ButtonLink href="/diagnostico" arrow>
              Agendar diagnóstico
            </ButtonLink>
            <Link href="/agentes" className="mk-home-cta__link">
              Ver agentes
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
