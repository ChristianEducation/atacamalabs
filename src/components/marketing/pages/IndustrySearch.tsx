"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button, ButtonLink } from "../ui/Button";
import { INDUSTRY_LIST, searchIndustries, type Industry } from "@/content/marketing/industries";

const TAGS = ["Agentes", "Automatizaciones", "A Medida"] as const;

function IndustryCard({ industry }: { industry: Industry }) {
  const pain = industry.pains[0];
  const clipped = pain.length > 95 ? `${pain.slice(0, 92).trimEnd()}…` : pain;
  return (
    <li>
      <Link href={`/rubros/${industry.slug}`} className="mk-ind-card">
        <h3 className="mk-h5">{industry.name}</h3>
        <p className="mk-ind-card__pain">{clipped}</p>
        <ul className="mk-ind-card__tags" aria-label="Familias de solución">
          {TAGS.map((t) => (
            <li key={t} className="mk-badge mk-badge--neutral">
              {t}
            </li>
          ))}
        </ul>
        <div className="mk-ind-card__extract" aria-hidden>
          {industry.panel.rows.slice(0, 2).map((r) => (
            <span key={r.id}>
              <b className="mk-mono">{r.id}</b> {r.status}
            </span>
          ))}
        </div>
        <span className="mk-ind-card__cta">
          Ver soluciones <ArrowRight size={16} aria-hidden />
        </span>
      </Link>
    </li>
  );
}

/** J2 + J3 — Educación destacada (búsqueda vacía) y directorio con búsqueda local sin red. */
export function IndustryDirectory() {
  const uid = useId();
  const [query, setQuery] = useState("");
  const [announce, setAnnounce] = useState("");
  const searching = query.trim().length > 0;
  const results = searching ? searchIndustries(query) : INDUSTRY_LIST.filter((i) => i.slug !== "educacion");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setAnnounce(
        query.trim() ? (results.length ? `${results.length} rubros encontrados` : "No encontramos ese rubro") : "",
      );
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query, results.length]);

  const edu = INDUSTRY_LIST.find((i) => i.slug === "educacion") as Industry;

  return (
    <>
      {!searching ? (
        <section className="mk-section--sm" aria-labelledby="edu-title">
          <div className="mk-container">
            <div className="mk-ind-feature">
              <div className="mk-ag-copy">
                <p className="mk-eyebrow">INDUSTRIA DESTACADA</p>
                <h2 id="edu-title" className="mk-h2">
                  Educación, más allá de responder consultas.
                </h2>
                <p>Atención a familias, coordinación y procesos internos en un mismo recorrido.</p>
                <div>
                  <ButtonLink href="/rubros/educacion" arrow>
                    Explorar Educación
                  </ButtonLink>
                </div>
              </div>
              <div className="mk-ind-feature__panel" aria-label="Panel de solicitudes de ejemplo">
                <ul>
                  {edu.panel.rows.map((r) => (
                    <li key={r.id}>
                      <span className="mk-mono">{r.id}</span>
                      <span>{r.col2}</span>
                      <span className="mk-badge mk-badge--neutral">{r.status}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section id="sectores" className="mk-section--md" aria-labelledby={`${uid}-title`}>
        <div className="mk-container">
          <h2 id={`${uid}-title`} className="mk-h2">
            Encuentra tu contexto.
          </h2>
          <div className="mk-field mk-ind-search">
            <label htmlFor={`${uid}-q`}>Buscar rubro</label>
            <input
              id={`${uid}-q`}
              type="search"
              className="mk-input"
              placeholder="Por ejemplo, educación o salud"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
            />
          </div>
          <p className="mk-sr-only" role="status" aria-live="polite">
            {announce}
          </p>
          {results.length > 0 ? (
            <ul className="mk-ind-grid">
              {results.map((i) => (
                <IndustryCard key={i.slug} industry={i} />
              ))}
            </ul>
          ) : (
            <div className="mk-ind-empty">
              <p>No encontramos ese rubro. Podemos revisar tu proceso igualmente.</p>
              <div className="mk-hero__actions">
                <Button variant="secondary" onClick={() => setQuery("")}>
                  Limpiar búsqueda
                </Button>
                <Link href="/diagnostico" className="mk-link">
                  Ir al diagnóstico
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
