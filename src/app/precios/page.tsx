import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Container, PrimaryLink, Card } from "@/components/ui";
import site from "@/lib/content";

export const metadata: Metadata = {
  title: "Precios | Atacama Labs",
  description: "Modelos de contratación según el alcance de tu proyecto.",
};

export default function Precios() {
  return (
    <div className="public-site flex flex-col flex-1 bg-background">
      <SiteHeader />
      <main id="contenido" tabIndex={-1} className="flex-1 py-16 md:py-20">
        <Container>
          <h1 className="max-w-[32ch] text-4xl font-semibold text-ink md:text-5xl">
            {site.pricing.title}
          </h1>
          <p className="mt-4 max-w-[60ch] text-lg leading-8 text-muted">
            {site.pricing.body}
          </p>

          <div className="mt-8">
            <PrimaryLink href="/agentes#planes">
              Ver planes de agentes
            </PrimaryLink>
            <p className="mt-6 text-muted">
              Para sistemas, integraciones y proyectos a medida, acordamos la
              inversión según el alcance.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {site.pricing.options.map((option) => (
              <Card key={option}>
                <p className="text-base leading-7 text-ink">{option}</p>
              </Card>
            ))}
          </div>

          <div className="mt-12">
            <PrimaryLink href="/contacto">{site.pricing.cta}</PrimaryLink>
          </div>
        </Container>
      </main>
      <SiteFooter />
    </div>
  );
}
