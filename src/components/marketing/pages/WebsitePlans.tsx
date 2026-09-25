import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { ButtonLink } from "../ui/Button";
import { SectionHeading } from "../ui/Blocks";
import { Reveal } from "../motion/Reveal";
import { SnapCarousel } from "../ui/SnapCarousel";
import { WEB_PLANS, webPlanHref, webPrice } from "@/content/marketing/pricing";
import { WEB_FORMATS, WEB_FORMATS_HEADING } from "@/content/marketing/web-page";

/**
 * Tres formatos — SPEC_WEB §5. Reúne qué construimos + cuánto cuesta en un
 * solo lugar; Web Profesional destacada. Los importes vienen del catálogo
 * compartido con /precios: nunca se escriben cifras aquí. Reveal al scroll con la
 * curva de la referencia (0,8 s, 20 px, una vez).
 */
export function WebsitePlans() {
  return (
    <section id="formatos" className="mk-section mk-t-sand" aria-labelledby="web-formats-title">
      <div className="mk-container">
        <SectionHeading
          id="web-formats-title"
          center
          eyebrow={WEB_FORMATS_HEADING.eyebrow}
          title={WEB_FORMATS_HEADING.title}
          lead={WEB_FORMATS_HEADING.lead}
        />

        <SnapCarousel
          className="mk-web-plans"
          label="Formatos de web"
          start={WEB_FORMATS.findIndex((format) => format.featured)}
        >
          {WEB_FORMATS.map((format, index) => {
            const source = WEB_PLANS[format.catalog];
            const price = webPrice(source);
            return (
              <Reveal
                as="article"
                key={format.name}
                delay={index * 100}
                className={cn("mk-rv-ia mk-web-plan", format.featured && "is-featured")}
              >
                <h3 className="mk-web-plan__name">{format.name}</h3>
                <p className="mk-web-plan__msg">{format.message}</p>
                {format.forWho ? <p className="mk-web-plan__for">{format.forWho}</p> : null}
                <p className="mk-web-plan__price" aria-label={price.label}>
                  {price.amount}
                  <small>{price.unit}</small>
                </p>
                <p className="mk-web-plan__sub">{price.hosting}</p>
                <p className="mk-web-plan__label">Incluye como base</p>
                <ul className="mk-web-plan__list">
                  {format.includes.map((item) => (
                    <li key={item}>
                      <Check size={16} strokeWidth={2.2} aria-hidden />
                      {item}
                    </li>
                  ))}
                </ul>
                <ButtonLink
                  href={webPlanHref(source, "paginas-web", "formatos")}
                  variant={format.featured ? "primary" : "secondary"}
                  block
                >
                  {format.cta}
                </ButtonLink>
              </Reveal>
            );
          })}
        </SnapCarousel>
      </div>
    </section>
  );
}
