import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Container, Card } from "@/components/ui";
import site from "@/lib/content";

export const metadata: Metadata = {
  title: "Soluciones | Atacama Labs",
  description:
    "Cuatro formas de resolver problemas comerciales y operativos con software, sistemas y automatización.",
};

export default function SolucionesIndex() {
  return (
    <div className="flex flex-col flex-1 bg-background">
      <SiteHeader />
      <main className="flex-1 py-16 md:py-20">
        <Container>
          <h1 className="max-w-[32ch] text-4xl font-semibold text-ink md:text-5xl">
            Soluciones
          </h1>
          <p className="mt-4 max-w-[60ch] text-lg leading-8 text-muted">
            {site.brand.descriptor} Cada solución parte de un problema real y
            termina en un resultado concreto para tu operación.
          </p>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {site.solutions.map((s) => (
              <Link key={s.slug} href={`/soluciones/${s.slug}`}>
                <Card className="h-full transition-colors hover:border-border-control">
                  <h2 className="text-xl font-semibold text-ink">{s.title}</h2>
                  <p className="mt-3 text-base leading-7 text-muted">{s.summary}</p>
                  <p className="mt-4 text-sm font-medium text-action">
                    Ver detalle →
                  </p>
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
