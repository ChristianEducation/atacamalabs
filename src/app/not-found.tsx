import type { Metadata } from "next";
import { ButtonLink } from "@/components/marketing/ui/Button";
import { diagnosticHref } from "@/lib/marketing/cta-context";
import SiteLayout from "./(site)/layout";

/** No se indexa (PAGINAS_AUXILIARES_SPEC_V1 §9). */
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function NotFound() {
  return (
    <SiteLayout>
      <section className="mk-hero mk-hero--inner" aria-labelledby="page-title">
        <div className="mk-container mk-diag-hero__copy">
          <p className="mk-eyebrow">ERROR 404</p>
          <h1 id="page-title" className="mk-h1">
            No encontramos esa página.
          </h1>
          <p className="mk-lead">
            Puede que el enlace haya cambiado. Puedes volver al inicio o contarnos qué quieres mejorar.
          </p>
          <div className="mk-hero__actions">
            <ButtonLink href="/" arrow>
              Volver al inicio
            </ButtonLink>
            <ButtonLink
              href={diagnosticHref({ source_page: "404", source_section: "error", source_cta: "agendar-diagnostico" })}
              variant="secondary"
            >
              Agendar diagnóstico
            </ButtonLink>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
