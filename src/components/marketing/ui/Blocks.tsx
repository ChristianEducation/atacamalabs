import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { ButtonLink } from "./Button";
import { Reveal } from "../motion/Reveal";
import { SERVICES } from "@/content/marketing/nav";

/** E3 SectionHeading — eyebrow, H2 serif, lead. El nivel semántico lo decide la página. */
export function SectionHeading({
  eyebrow,
  title,
  lead,
  as: Tag = "h2",
  center,
  id,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  as?: "h1" | "h2" | "h3";
  center?: boolean;
  id?: string;
  className?: string;
}) {
  return (
    <Reveal className={cn("mk-heading-block", center && "mk-heading-block--center", className)}>
      {eyebrow ? <p className="mk-eyebrow">{eyebrow}</p> : null}
      <Tag id={id} className={Tag === "h1" ? "mk-h1" : "mk-h2"}>
        {title}
      </Tag>
      {lead ? <p className="mk-lead">{lead}</p> : null}
    </Reveal>
  );
}

/** E21 FAQAccordion — <details>/<summary> progresivo, varias abiertas permitido. */
export function FAQ({ items, id }: { items: readonly { question: string; answer: ReactNode }[]; id?: string }) {
  return (
    <div className="mk-faq" id={id}>
      {items.map((item) => (
        <details key={item.question} className="mk-faq__item">
          <summary className="mk-faq__summary">
            <span>{item.question}</span>
            <ChevronDown size={18} aria-hidden className="mk-faq__chevron" />
          </summary>
          <div className="mk-faq__body">{item.answer}</div>
        </details>
      ))}
    </div>
  );
}

/** E22 CTABlock — franja azul, texto blanco, botón blanco. */
export function CTABlock({
  title,
  body,
  cta,
  note,
  secondary,
}: {
  title: string;
  body: string;
  cta: { label: string; href: string };
  note?: string;
  secondary?: { label: string; href: string };
}) {
  return (
    <section className="mk-section--md mk-cta-wrap" aria-labelledby="cta-title">
      <div className="mk-container">
        <Reveal className="mk-cta">
          <div className="mk-cta__copy">
            <h2 id="cta-title" className="mk-h2 mk-cta__title">
              {title}
            </h2>
            <p className="mk-cta__body">{body}</p>
            {note ? <p className="mk-cta__note">{note}</p> : null}
          </div>
          <div className="mk-cta__actions">
            <ButtonLink href={cta.href} variant="white" arrow>
              {cta.label}
            </ButtonLink>
            {secondary ? (
              <Link href={secondary.href} className="mk-cta__link">
                {secondary.label}
              </Link>
            ) : null}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/** E30 RelatedServices — «Sigue explorando.» Tres enlaces, sin la propia página. */
export function RelatedServices({
  ids,
  extra,
  limit = 3,
}: {
  ids: readonly string[];
  limit?: number;
  extra?: readonly { label: string; blurb: string; href: string }[];
}) {
  const fromServices = SERVICES.filter((s) => ids.includes(s.id)).map((s) => ({
    label: s.label,
    blurb: s.blurb,
    href: s.href,
  }));
  const items = [...fromServices, ...(extra ?? [])].slice(0, limit);
  return (
    <section className="mk-section--sm mk-related" aria-labelledby="related-title">
      <div className="mk-container">
        <h2 id="related-title" className="mk-h4">
          Sigue explorando.
        </h2>
        <ul className="mk-related__grid">
          {items.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="mk-related__link">
                <span className="mk-related__label">{item.label}</span>
                <span className="mk-related__blurb">{item.blurb}</span>
                <ArrowRight size={18} aria-hidden className="mk-related__arrow" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
