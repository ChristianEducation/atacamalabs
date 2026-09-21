import type { Metadata } from "next";
import { DiagnosticForm } from "@/components/marketing/forms/DiagnosticForm";
import { AgendaPanel } from "@/components/marketing/forms/AgendaPanel";
import { ButtonLink } from "@/components/marketing/ui/Button";
import { parseDiagnosticQuery } from "@/lib/marketing/lead-adapter";
import { bookingUrl } from "@/lib/marketing/public-config";

export const metadata: Metadata = {
  title: "Diagnóstico — Atacama Labs",
  description:
    "Cuéntanos qué proceso quieres mejorar. Revisamos tu necesidad y definimos contigo el siguiente paso para agentes, automatización o una nueva web.",
  alternates: { canonical: "/diagnostico" },
};

export default async function DiagnosisPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const initial = parseDiagnosticQuery(await searchParams);
  const agenda = bookingUrl();

  return (
    <>
      <section className="mk-hero mk-hero--inner mk-diag-hero" aria-labelledby="page-title">
        <div className="mk-container">
          <div className="mk-diag-hero__copy">
            <p className="mk-eyebrow">EMPECEMOS POR TU PROCESO</p>
            <h1 id="page-title" className="mk-h1">
              Cuéntanos qué quieres mejorar.
            </h1>
            <p className="mk-lead">
              No necesitas llegar con una solución definida. Cuéntanos qué ocurre hoy y qué te gustaría que funcionara
              mejor.
            </p>
            <ul className="mk-diag-hero__labels">
              <li className="mk-badge mk-badge--neutral">Tu contexto</li>
              <li className="mk-badge mk-badge--neutral">El proceso</li>
              <li className="mk-badge mk-badge--neutral">Un siguiente paso claro</li>
            </ul>
            <div className="mk-diag-hero__cta">
              <ButtonLink href="#formulario" arrow>
                Comenzar
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>

      <section id="formulario" className="mk-section--md" aria-labelledby="form-title">
        <div className="mk-container mk-diag-container">
          <h2 id="form-title" className="mk-h2 mk-diag-title">
            Empecemos por lo que necesitas.
          </h2>
          <DiagnosticForm key={JSON.stringify(initial)} initial={initial} layout="page" agendaAvailable={agenda !== null} />
        </div>
      </section>

      <section id="agenda" className="mk-section--md mk-paper" aria-labelledby="agenda-title">
        <div className="mk-container mk-diag-container">
          <div className="mk-diag-agenda">
            <div className="mk-ag-copy">
              <h2 id="agenda-title" className="mk-h2">
                ¿Prefieres elegir un horario?
              </h2>
              <p className="mk-lead">Consulta la disponibilidad para conversar sobre tu proceso.</p>
            </div>
            <AgendaPanel url={agenda} />
          </div>
        </div>
      </section>
    </>
  );
}
