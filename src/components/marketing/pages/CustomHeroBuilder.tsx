import type { CSSProperties } from "react";
import { ArrowRight, Database, Mail, Workflow } from "lucide-react";
import { CUSTOM_HERO } from "@/content/marketing/custom-page";

const d = (seconds: number): CSSProperties => ({ ["--d" as string]: seconds });

/**
 * Visual del hero de /a-medida — composición del builder central de la
 * referencia (card protagonista con zoom-in, elementos flotantes, estado vivo,
 * cursor parpadeante, botón visual) con contenido e identidad Atacama. Lo propio:
 * el requerimiento se convierte en una solución que termina en una interfaz (un
 * panel), no solo en pasos automáticos. Decorativo (aria-hidden); una pasada.
 */
export function CustomHeroBuilder() {
  const b = CUSTOM_HERO.builder;
  return (
    <div className="mk-cb" aria-hidden="true">
      <div className="mk-cb__grid" />
      <span className="mk-cb__float mk-cb__float--a">
        <Mail size={22} strokeWidth={1.6} />
      </span>
      <span className="mk-cb__float mk-cb__float--b">
        <Database size={22} strokeWidth={1.6} />
      </span>
      <span className="mk-cb__star">
        <Workflow size={22} strokeWidth={1.8} />
      </span>
      <div className="mk-cb__glow" />

      <div className="mk-cb__card">
        <div className="mk-cb__head">
          <span className="mk-cb__title">
            <span className="mk-cb__ic">
              <Workflow size={16} strokeWidth={1.8} />
            </span>
            {b.title}
          </span>
          <span className="mk-cb__status">
            <span className="mk-cb__ping">
              <i />
              <b />
            </span>
            {b.status}
          </span>
        </div>

        <p className="mk-cb__label">{b.label}</p>
        <div className="mk-cb__prompt">
          <p>
            {b.prompt}
            <span className="mk-cursor" />
          </p>
        </div>

        <p className="mk-cb__label mk-cb-a mk-cb-a--fade" style={d(1.3)}>
          {b.flowLabel}
        </p>
        <div className="mk-cb__flow">
          {b.flow.map((step, i) => (
            <span key={step} className="mk-cb__chip mk-cb-a mk-cb-a--pop" style={d(1.5 + i * 0.25)}>
              {step}
              {i < b.flow.length - 1 ? <ArrowRight size={11} strokeWidth={2.2} /> : null}
            </span>
          ))}
        </div>

        <div className="mk-cb__panel mk-cb-a mk-cb-a--rise" style={d(2.7)}>
          <div className="mk-cb__panel-head">
            <b>{b.panel.title}</b>
            <span>
              <i />
              <i />
              <i />
            </span>
          </div>
          {b.panel.rows.map((row, i) => (
            <div key={row.id} className="mk-cb__row mk-cb-a mk-cb-a--rise" style={d(3.0 + i * 0.3)}>
              <span className="mk-cb__row-id">{row.id}</span>
              <span className="mk-cb__row-meta">{row.meta}</span>
              <span className={row.ok ? "mk-cb__badge is-ok" : "mk-cb__badge"}>{row.state}</span>
            </div>
          ))}
        </div>

        <span className="mk-cb__btn">
          <span className="mk-cb__btn-fill" />
          <span className="mk-cb__btn-text">{b.button}</span>
        </span>
      </div>
    </div>
  );
}
