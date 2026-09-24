import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowRight, Check, Lock } from "lucide-react";
import { SERVICES_MENU, type ServiceId } from "@/content/marketing/nav";

const i = (index: number): CSSProperties => ({ ["--i" as string]: index });

/** Miniatura de A Medida: un proceso que se diseña y termina operando. Reproduce al pasar el mouse. */
function MiniCustom() {
  return (
    <div className="mk-svm mk-svm--custom" aria-hidden="true">
      <span className="mk-svm__pill">
        <i />
        En diseño
      </span>
      <div className="mk-svm__flow">
        <b style={i(0)} />
        <u style={i(0)} />
        <b style={i(1)} />
        <u style={i(1)} />
        <b className="is-done" style={i(2)}>
          <Check size={10} strokeWidth={3} />
        </b>
      </div>
      <div className="mk-svm__rows">
        <i />
        <i />
      </div>
    </div>
  );
}

/** Miniatura de Páginas Web: un mini browser que pasa de plano a web terminada. */
function MiniWeb() {
  return (
    <div className="mk-svm mk-svm--web" aria-hidden="true">
      <div className="mk-svm__chrome">
        <span>
          <i />
          <i />
          <i />
        </span>
        <em>
          <Lock size={7} />
          tuempresa.cl
        </em>
      </div>
      <div className="mk-svm__page">
        <b className="mk-svm__brand" style={i(0)} />
        <div className="mk-svm__hero">
          <div className="mk-svm__copy">
            <b className="mk-svm__h" style={i(1)} />
            <b className="mk-svm__h mk-svm__h--s" style={i(2)} />
            <b className="mk-svm__btn" style={i(3)} />
          </div>
          <b className="mk-svm__img" style={i(2)} />
        </div>
      </div>
    </div>
  );
}

const MINIS: Record<ServiceId, () => React.JSX.Element> = {
  "a-medida": MiniCustom,
  web: MiniWeb,
  agentes: MiniCustom,
  plataforma: MiniCustom,
};

/**
 * Panel del dropdown «Servicios»: dos tarjetas con miniatura que se anima al
 * pasar el mouse, un resaltado que se desliza entre ellas (solo CSS, con
 * `:has`) y un cierre comercial hacia la demo gratuita.
 */
export function ServicesPanel({ activePath, onNavigate }: { activePath: string; onNavigate: () => void }) {
  return (
    <div className="mk-sv">
      <div className="mk-sv__wrap">
        <span className="mk-sv__hl" aria-hidden />
        <ul className="mk-sv__grid">
          {SERVICES_MENU.map((service, index) => {
            const Mini = MINIS[service.id];
            return (
              <li key={service.id} style={i(index)}>
                <Link
                  href={service.href}
                  className="mk-sv__card"
                  aria-current={activePath === service.href ? "page" : undefined}
                  onClick={onNavigate}
                >
                  <Mini />
                  <span className="mk-sv__title">
                    {service.label}
                    <ArrowRight size={15} strokeWidth={2} aria-hidden />
                  </span>
                  <span className="mk-sv__blurb">{service.blurb}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="mk-sv__foot">
        <span>¿No sabes cuál necesitas?</span>
        <Link href="/diagnostico" onClick={onNavigate}>
          Agenda una demo gratuita
          <ArrowRight size={14} strokeWidth={2.2} aria-hidden />
        </Link>
      </div>
    </div>
  );
}
