import type { Metadata } from "next";
import { DiagnosticFlow } from "@/components/marketing/forms/DiagnosticFlow";
import { parseDiagnosticQuery } from "@/lib/marketing/lead-adapter";
import { bookingUrl } from "@/lib/marketing/public-config";

export const metadata: Metadata = {
  title: { absolute: "Diagnóstico | Atacama Labs" },
  description: "Cuéntanos qué quieres mejorar en tu empresa y agenda una conversación con Atacama Labs.",
  alternates: { canonical: "https://atacamalabs.cl/diagnostico" },
};

/**
 * /diagnostico (CTA + DIAGNÓSTICO · SPEC FINAL V1 §19–§32): pantalla de
 * conversión, no una landing. Un contenedor central con el formulario corto que
 * se adapta al CTA de origen; al guardar, el mismo flujo pasa a la agenda.
 */
export default async function DiagnosisPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const initial = parseDiagnosticQuery(await searchParams);
  return (
    <section className="mk-dg mk-t-paper" aria-labelledby="page-title">
      <div className="mk-container">
        <DiagnosticFlow key={JSON.stringify(initial)} initial={initial} agendaUrl={bookingUrl()} />
      </div>
    </section>
  );
}
