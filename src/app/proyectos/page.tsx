import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Container, Card } from "@/components/ui";
import site from "@/lib/content";

export const metadata: Metadata = {
  title: "Casos | Atacama Labs",
  description: "Proyectos implementados: situación, solución y funcionamiento.",
};

export default function ProyectosIndex() {
  return (
    <div className="flex flex-col flex-1 bg-background">
      <SiteHeader />
      <main className="flex-1 py-16 md:py-20">
        <Container>
          <h1 className="max-w-[32ch] text-4xl font-semibold text-ink md:text-5xl">
            Casos
          </h1>
          <p className="mt-4 max-w-[60ch] text-lg leading-8 text-muted">
            Proyectos reales, descritos de forma anónima mientras no exista
            autorización de identidad del cliente.
          </p>

          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {site.cases.map((c) => (
              <Link key={c.slug} href={`/proyectos/${c.slug}`}>
                <Card className="h-full transition-colors hover:border-border-control">
                  <p className="text-sm font-medium uppercase tracking-wide text-copper">
                    {c.sector}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-ink">{c.title}</h2>
                  <p className="mt-3 text-base leading-7 text-muted">{c.situation}</p>
                  <p className="mt-4 text-sm font-medium text-action">Ver caso →</p>
                </Card>
              </Link>
            ))}
          </div>
        </Container>
      </main>
      <SiteFooter />
    </div>
  );
}
