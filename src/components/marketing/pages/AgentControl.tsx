import type { ReactNode } from "react";
import { Bot, CalendarDays, Check, CheckCheck, FileText, ShieldCheck, UserRound, UserRoundCheck } from "lucide-react";
import { Reveal } from "../motion/Reveal";
import { SectionHeading } from "../ui/Blocks";
import { SnapCarousel } from "../ui/SnapCarousel";
import { AGENTS_CONTROL } from "@/content/marketing/agents";

/** Pequeña escena de cada estado, tomada de la fila «Handoff Inteligente» de la referencia: sin demo nueva. */
const VISUALS: Record<(typeof AGENTS_CONTROL.states)[number]["id"], ReactNode> = {
  run: (
    <div className="mk-ac-vis mk-ac-vis--row">
      <span className="mk-ac-vis__ic">
        <CalendarDays size={16} aria-hidden />
      </span>
      <span className="mk-ac-vis__txt">
        <strong>Reunión comercial</strong>
        <small>Jueves · 11:00</small>
      </span>
      <span className="mk-ac-vis__ok">
        <Check size={14} strokeWidth={2.8} aria-hidden />
      </span>
    </div>
  ),
  ask: (
    <div className="mk-ac-vis mk-ac-vis--stack">
      <span className="mk-ac-vis__txt">
        <strong>Nota de crédito</strong>
        <small>Lista para emitir</small>
      </span>
      <span className="mk-ac-vis__buttons">
        <i className="is-yes">Aprobar</i>
        <i>Revisar</i>
      </span>
    </div>
  ),
  handoff: (
    <div className="mk-ac-vis mk-ac-vis--flow">
      <span className="mk-ac-vis__node">
        <Bot size={16} aria-hidden />
      </span>
      <span className="mk-ac-vis__doc">
        <FileText size={13} aria-hidden /> Conversación completa
      </span>
      <span className="mk-ac-vis__node mk-ac-vis__node--person">
        <UserRound size={16} aria-hidden />
      </span>
    </div>
  ),
};

const ICONS = { run: CheckCheck, ask: ShieldCheck, handoff: UserRoundCheck } as const;

/**
 * «Tú defines hasta dónde puede llegar» (AGENTES_SPEC_V1 §7). Tres estados que
 * resumen el control: ejecuta lo permitido, pide aprobación para lo sensible y
 * deriva a una persona con el contexto completo. La referencia (Handoff
 * Inteligente) no tiene animación propia: aquí solo entrada escalonada.
 */
export function AgentControl() {
  return (
    <section id="control" className="mk-section mk-t-paper mk-ac-section" aria-labelledby="agents-control-title">
      <div className="mk-container">
        <SectionHeading id="agents-control-title" center title={AGENTS_CONTROL.title} lead={AGENTS_CONTROL.body} />

        <SnapCarousel className="mk-ac" label="Estados de control">
          {AGENTS_CONTROL.states.map((state, i) => {
            const Icon = ICONS[state.id];
            return (
              <Reveal key={state.id} as="article" delay={i * 100} className={`mk-rv-ia mk-ac-card mk-ac-card--${state.id}`}>
                <div className="mk-ac-card__head">
                  <span className="mk-ac-card__ic">
                    <Icon size={20} strokeWidth={1.8} aria-hidden />
                  </span>
                  <div>
                    <p className="mk-ac-card__hint">{state.hint}</p>
                    <h3 className="mk-ac-card__title">{state.label}</h3>
                  </div>
                </div>
                <p className="mk-ac-card__ex">
                  <span>Ejemplo</span>
                  {state.example}
                </p>
                {VISUALS[state.id]}
                <p className="mk-ac-card__result">{state.result}</p>
              </Reveal>
            );
          })}
        </SnapCarousel>
      </div>
    </section>
  );
}
