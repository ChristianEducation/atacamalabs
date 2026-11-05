import { Fragment, type CSSProperties, type ReactNode } from "react";
import { SectionHeading } from "../ui/Blocks";
import { Reveal } from "../motion/Reveal";
import { ToolIcon } from "../pixel/tool-icons";
import { ValueTick, ValueWorkstation } from "../pixel/value-scenes";
import {
  HOME_VALUE_CARDS,
  HOME_VALUE_FLOW,
  HOME_VALUE_HEADING,
  HOME_VALUE_STEPS,
  type HomeValueArt,
} from "@/content/marketing/home-value";

/** 02 · Mensaje → registro → agenda → acción: se enciende un paso a la vez (solo con movimiento permitido). */
function FlowArt() {
  return (
    <div className="mk-hv-flow" aria-hidden="true">
      {HOME_VALUE_FLOW.map((step, index) => (
        <Fragment key={step.icon}>
          {index > 0 ? <i className="mk-hv-flow__link" /> : null}
          <div className="mk-hv-flow__node" style={{ ["--i" as string]: index } as CSSProperties}>
            <ToolIcon id={step.icon} />
            <span>{step.label}</span>
          </div>
        </Fragment>
      ))}
    </div>
  );
}

/** 03 · Validación y conexión listas; la puesta en marcha en curso, acompañada. */
function StepsArt() {
  const last = HOME_VALUE_STEPS.length - 1;
  return (
    <ul className="mk-hv-steps" role="list" aria-hidden="true">
      {HOME_VALUE_STEPS.map((step, index) => (
        <li key={step.label}>
          {index === last ? (
            <i className="mk-hv-live">
              <b />
            </i>
          ) : (
            <ValueTick />
          )}
          <span>{step.label}</span>
          <em>{step.note}</em>
        </li>
      ))}
    </ul>
  );
}

const ART: Record<HomeValueArt, ReactNode> = {
  puesto: <ValueWorkstation />,
  flujo: <FlowArt />,
  "puesta-en-marcha": <StepsArt />,
};

/**
 * Valor comercial del Home (MASTER_PLAN_CONVERSION §5): entre el selector y los
 * precios. Tres tarjetas con el lenguaje de la sección de herramientas de
 * /agentes (tarjeta clara, borde suave, pixel art, acentos azules) y una
 * ilustración pequeña cada una. Las ilustraciones son decorativas: el texto de
 * la tarjeta dice lo mismo.
 */
export function HomeValue() {
  return (
    <section className="mk-section mk-t-paper mk-hv" aria-labelledby="home-value-title">
      <div className="mk-container">
        <SectionHeading
          id="home-value-title"
          center
          eyebrow={HOME_VALUE_HEADING.eyebrow}
          title={HOME_VALUE_HEADING.title}
          lead={HOME_VALUE_HEADING.lead}
        />

        <ul className="mk-hv__cards" role="list">
          {HOME_VALUE_CARDS.map((card, index) => (
            <li key={card.id}>
              <Reveal as="article" delay={index * 70} className="mk-hv-card">
                <div className="mk-hv-card__art">{ART[card.id]}</div>
                <p className="mk-hv-card__num" aria-hidden="true">
                  {card.number}
                </p>
                <h3 className="mk-hv-card__title">{card.title}</h3>
                <p className="mk-hv-card__body">{card.body}</p>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
