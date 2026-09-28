import type { Metadata } from "next";
import { DiagnosticFlow } from "@/components/marketing/forms/DiagnosticFlow";
import { parseDiagnosticQuery } from "@/lib/marketing/lead-adapter";
import { bookingUrl } from "@/lib/marketing/public-config";
import { pageMetadata } from "@/lib/seo-metadata";

/**
 * GAP SEO-06: /diagnostico es una pantalla de conversión, no una landing.
 * noindex,follow — se mantiene fuera del sitemap (ver src/app/sitemap.ts) y
 * conserva sus links internos normales.
 */
export const metadata: Metadata = pageMetadata({
  title: "Diagnóstico | Atacama Labs",
  description: "Cuéntanos qué quieres mejorar en tu empresa y agenda una conversación con Atacama Labs.",
  path: "/diagnostico",
  noindex: true,
});

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
