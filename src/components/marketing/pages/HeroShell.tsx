import type { ReactNode } from "react";
import { ButtonLink } from "../ui/Button";
import { cn } from "@/lib/utils";

export interface HeroAction {
  label: string;
  href: string;
  variant?: "primary" | "secondary" | "tertiary" | "white";
}

/**
 * HeroShell — V3.3 §7/§9–§16. Hero común a las 7 páginas: eyebrow, H1 grande
 * en dos golpes (la segunda línea o palabra en azul vía `.mk-hero__accent`,
 * que el caller aplica en `title`), lead, línea de confianza opcional, CTAs,
 * un slot de visual siempre presente (atmósfera/misión/showcase/flujo/browser/
 * ghost cards según la página) y fondo Hero Gradient (heredado de `.mk-hero`).
 * `size` fija la escala (§6): xl Home, lPlus Agentes, l el resto, m Precios.
 */
export function HeroShell({
  id = "page-title",
  size,
  eyebrow,
  title,
  lead,
  trust,
  actions,
  visual,
  className,
}: {
  id?: string;
  size: "xl" | "lPlus" | "l" | "m";
  eyebrow: string;
  title: ReactNode;
  lead: ReactNode;
  trust?: ReactNode;
  actions?: readonly HeroAction[];
  visual: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mk-hero", `mk-hero--${size}`, className)} aria-labelledby={id}>
      <div className="mk-container mk-hero__grid">
        <div className="mk-hero__copy">
          <p className="mk-eyebrow">{eyebrow}</p>
          <h1 id={id} className="mk-hero__h1">
            {title}
          </h1>
          <p className="mk-lead mk-hero__lead">{lead}</p>
          {trust ? <p className="mk-small mk-muted mk-hero__trust">{trust}</p> : null}
          {actions && actions.length > 0 ? (
            <div className="mk-hero__actions">
              {actions.map((action, index) => (
                <ButtonLink
                  key={action.href + action.label}
                  href={action.href}
                  variant={action.variant ?? (index === 0 ? "primary" : "secondary")}
                  arrow={index === 0}
                >
                  {action.label}
                </ButtonLink>
              ))}
            </div>
          ) : null}
        </div>
        <div className="mk-hero__product">{visual}</div>
      </div>
    </section>
  );
}
