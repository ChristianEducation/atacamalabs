import type { ReactNode } from "react";
import { ButtonLink } from "../ui/Button";
import { Reveal } from "../motion/Reveal";
import { cn } from "@/lib/utils";

/** Enlace/CTA descrito en la spec: etiqueta + destino. */
export interface Action {
  label: string;
  href: string;
  variant?: "primary" | "secondary" | "tertiary";
}

/**
 * Hero interno común: eyebrow + H1 (una sola vez por página) + lead + acciones,
 * con el producto en la segunda columna. `split` define el reparto (5/7, 6/6…).
 */
export function PageHero({
  eyebrow,
  title,
  lead,
  actions,
  note,
  children,
  split = "5-7",
  center,
  id,
  links,
}: {
  eyebrow: string;
  title: ReactNode;
  lead: ReactNode;
  actions?: readonly Action[];
  note?: ReactNode;
  children?: ReactNode;
  split?: "5-7" | "6-6" | "4-8";
  center?: boolean;
  id?: string;
  links?: readonly { label: string; href: string }[];
}) {
  return (
    <section id={id} className="mk-hero mk-hero--inner" aria-labelledby="page-title">
      <div className={cn("mk-container mk-hero__grid", `mk-split-${split}`, center && "mk-hero--center")}>
        <div className="mk-hero__copy">
          <p className="mk-eyebrow">{eyebrow}</p>
          <h1 id="page-title" className="mk-h1 mk-hero__h1">
            {title}
          </h1>
          <p className="mk-lead mk-hero__lead">{lead}</p>
          {actions && actions.length > 0 ? (
            <div className="mk-hero__actions mk-actions-stack">
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
          {note ? <p className="mk-small mk-muted mk-hero__note">{note}</p> : null}
        </div>
        {children ? <div className="mk-hero__product">{children}</div> : null}
      </div>
      {links && links.length > 0 ? (
        <nav className="mk-container mk-hero__links" aria-label="En esta página">
          {links.map((link) => (
            <a key={link.href} href={link.href} className="mk-link">
              {link.label}
            </a>
          ))}
        </nav>
      ) : null}
    </section>
  );
}

/** ProcessSteps — lista ordenada numerada, sin cards elevadas ni botones falsos. */
export function ProcessSteps({
  steps,
  columns = 5,
}: {
  steps: readonly { title: string; body: string }[];
  columns?: 4 | 5;
}) {
  return (
    <ol className={cn("mk-steps", columns === 4 ? "mk-steps--4" : "mk-steps--5")}>
      {steps.map((step, index) => (
        <Reveal as="li" key={step.title} delay={index * 70} className="mk-steps__item">
          <span className="mk-steps__num" aria-hidden>
            {String(index + 1).padStart(2, "0")}
          </span>
          <h3 className="mk-h5">{step.title}</h3>
          <p className="mk-steps__body">{step.body}</p>
        </Reveal>
      ))}
    </ol>
  );
}

/** FeatureRow: bloques abiertos con icono + título + frase (sin cards elevadas). */
export function FeatureGrid({
  items,
  columns = 3,
}: {
  items: readonly { icon: ReactNode; title: string; body: string }[];
  columns?: 2 | 3;
}) {
  return (
    <ul className={cn("mk-features", columns === 2 ? "mk-features--2" : "mk-features--3")}>
      {items.map((item, index) => (
        <Reveal as="li" key={item.title} delay={Math.min(index * 70, 280)} className="mk-features__item">
          <span className="mk-features__icon" aria-hidden>
            {item.icon}
          </span>
          <div>
            <h3 className="mk-h6">{item.title}</h3>
            <p className="mk-features__body">{item.body}</p>
          </div>
        </Reveal>
      ))}
    </ul>
  );
}

/** Nota común de implementación 24–48 h (solo configuraciones estándar; DEC-24). */
export function StandardImplementationNote() {
  return (
    <div className="mk-note-block">
      <p className="mk-h4">Configuraciones estándar pueden quedar operativas en 24–48 h.</p>
      <p className="mk-muted">Cuando requiere integraciones o desarrollo especial, definimos el plazo según alcance.</p>
    </div>
  );
}
