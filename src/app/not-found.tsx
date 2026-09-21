import { ButtonLink } from "@/components/marketing/ui/Button";
import SiteLayout from "./(site)/layout";

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
            Puede que el enlace haya cambiado. Vuelve al inicio o cuéntanos qué
            proceso buscas mejorar.
          </p>
          <div className="mk-hero__actions">
            <ButtonLink href="/" arrow>
              Volver al inicio
            </ButtonLink>
            <ButtonLink href="/diagnostico" variant="secondary">
              Agendar diagnóstico
            </ButtonLink>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
