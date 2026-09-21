"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ButtonLink } from "../ui/Button";
import { WebDemo, type WebFormat } from "../demos/WebDemo";
import { Reveal } from "../motion/Reveal";
import { WEB_FLOW, WEB_FORMAT_COPY } from "@/content/marketing/web";

/** I1 + I2 — hero web con selector de formato integrado (sin segundo hero). */
export function WebHero() {
  const [format, setFormat] = useState<WebFormat>("ecommerce");
  const copy = WEB_FORMAT_COPY[format];
  return (
    <section className="mk-hero mk-hero--inner" aria-labelledby="page-title">
      <div className="mk-container mk-hero__grid mk-split-5-7">
        <div className="mk-hero__copy">
          <p className="mk-eyebrow">PÁGINAS WEB</p>
          <h1 id="page-title" className="mk-h1 mk-hero__h1">
            Una web que explica, conecta y permite avanzar.
          </h1>
          <p className="mk-lead mk-hero__lead">
            Landing pages, sitios corporativos y ecommerce con una experiencia clara para tus clientes y una base
            preparada para tu operación.
          </p>
          <div className="mk-hero__actions">
            <ButtonLink href="/diagnostico?necesidad=web" arrow>
              Cotizar mi web
            </ButtonLink>
            <ButtonLink href="#planes" variant="secondary">
              Ver planes
            </ButtonLink>
          </div>

          <div className="mk-web-format" aria-live="polite">
            <h2 className="mk-h6">El formato depende de lo que necesitas lograr.</h2>
            <p className="mk-web-format__headline">{copy.headline}</p>
            <p className="mk-small">{copy.audience}</p>
            <dl className="mk-web-format__dl">
              <div>
                <dt>Alcance orientativo</dt>
                <dd>{copy.scope}</dd>
              </div>
              <div>
                <dt>Plazo</dt>
                <dd>{copy.timing}</dd>
              </div>
            </dl>
            <p className="mk-small mk-muted">{copy.demo}</p>
            <p className="mk-small mk-muted">Estos textos describen el formato; el alcance contractual lo define la propuesta.</p>
            <ButtonLink href={`/diagnostico?necesidad=web&plan=${format}`} variant="secondary" arrow>
              {`Cotizar ${copy.label}`}
            </ButtonLink>
          </div>
        </div>
        <div className="mk-hero__product">
          <WebDemo initial="ecommerce" onFormatChange={setFormat} />
        </div>
      </div>
    </section>
  );
}

/** I7 — flujo conceptual Web → Consulta → Equipo; el nodo final abre un detalle de ejemplo. */
export function WebConnected() {
  const [open, setOpen] = useState<string | null>(null);
  const detail = WEB_FLOW.find((n) => n.id === open);
  return (
    <section className="mk-section--md mk-cta-wrap" aria-labelledby="web-conn-title">
      <div className="mk-container">
        <Reveal className="mk-cta mk-web-conn">
          <div className="mk-cta__copy">
            <h2 id="web-conn-title" className="mk-h2 mk-cta__title">
              Tu web puede ser el comienzo del proceso.
            </h2>
            <p className="mk-cta__body">
              Una consulta puede llegar a un agente, una agenda o tu sistema de trabajo. Diseñamos esa continuidad
              cuando tu operación la necesita.
            </p>
            <div className="mk-cta__actions mk-web-conn__actions">
              <ButtonLink href="/diagnostico?necesidad=web" variant="white" arrow>
                Cotizar mi web
              </ButtonLink>
              <Link href="/agentes" className="mk-cta__link">
                Ver agentes
              </Link>
              <Link href="/a-medida" className="mk-cta__link">
                Explorar A Medida
              </Link>
            </div>
          </div>
          <div className="mk-web-conn__flow">
            <ol className="mk-web-conn__nodes">
              {WEB_FLOW.map((n, i) => (
                <li key={n.id}>
                  <button
                    type="button"
                    className={cn("mk-web-conn__node", open === n.id && "is-open")}
                    aria-expanded={open === n.id}
                    onClick={() => setOpen(open === n.id ? null : n.id)}
                  >
                    {n.label}
                  </button>
                  {i < WEB_FLOW.length - 1 ? <ArrowRight size={16} aria-hidden /> : null}
                </li>
              ))}
            </ol>
            <p className="mk-web-conn__detail" role="status">
              {detail ? detail.detail : "Ejemplo conceptual: no representa una integración confirmada."}
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
