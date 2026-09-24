import Link from "next/link";
import { ButtonLink } from "../ui/Button";
import { Reveal } from "../motion/Reveal";

interface CtaLink {
  label: string;
  href: string;
}

/**
 * Cierre de página en el tono suave del selector (HOME_SPEC_V1 §8): sección
 * amplia con aire, un CTA principal y, opcionalmente, un enlace secundario.
 * No introduce una idea nueva ni repite media del hero.
 */
export function SoftCTA({
  title,
  body,
  primary,
  secondary,
  titleId = "soft-cta-title",
}: {
  title: string;
  body: string;
  primary: CtaLink;
  secondary?: CtaLink;
  titleId?: string;
}) {
  return (
    <section className="mk-home-cta mk-t-mist" aria-labelledby={titleId}>
      <div className="mk-container">
        <Reveal className="mk-home-cta__inner">
          <h2 id={titleId} className="mk-home-cta__title">
            {title}
          </h2>
          <p className="mk-home-cta__body">{body}</p>
          <div className="mk-home-cta__actions">
            <ButtonLink href={primary.href} arrow>
              {primary.label}
            </ButtonLink>
            {secondary ? (
              <Link href={secondary.href} className="mk-home-cta__link">
                {secondary.label}
              </Link>
            ) : null}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function HomeCTA() {
  return (
    <SoftCTA
      titleId="home-cta-title"
      title="¿Qué le delegarías mañana?"
      body="Cuéntanos qué proceso quieres mejorar y te mostramos cómo podría trabajarlo un agente de Atacama Labs."
      primary={{ label: "Agendar diagnóstico", href: "/diagnostico" }}
      secondary={{ label: "Ver agentes", href: "/agentes" }}
    />
  );
}
