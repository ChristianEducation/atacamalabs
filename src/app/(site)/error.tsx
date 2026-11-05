"use client";

import { Button, ButtonLink } from "@/components/marketing/ui/Button";

export default function ErrorBoundary({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="mk-hero mk-hero--inner" aria-labelledby="page-title">
      <div className="mk-container mk-diag-hero__copy">
        <p className="mk-eyebrow">ALGO SALIÓ MAL</p>
        <h1 id="page-title" className="mk-h1">
          No pudimos cargar esta página.
        </h1>
        <p className="mk-lead">Puedes intentarlo nuevamente o volver al inicio.</p>
        <div className="mk-hero__actions">
          <Button onClick={reset}>Reintentar</Button>
          <ButtonLink href="/" variant="secondary">
            Volver al inicio
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
