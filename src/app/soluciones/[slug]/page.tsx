import { PortalMotif } from "@/components/PublicVisuals";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Container, Eyebrow, PrimaryLink, Card } from "@/components/ui";
import site, { getSolution } from "@/lib/content";

export function generateStaticParams() {
  return site.solutions.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const solution = getSolution(slug);
  if (!solution) return {};
  return {
    title: `${solution.title} | Atacama Labs`,
    description: solution.summary,
  };
}

export default async function SolutionDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const solution = getSolution(slug);
  if (!solution) notFound();

  return (
    <div className="public-site flex flex-col flex-1 bg-background">
      <SiteHeader />
      <main id="contenido" tabIndex={-1} className="flex-1 py-16 md:py-20">
        <Container>
          <div className="internal-hero">
            <div>
              <Eyebrow>Solución</Eyebrow>
              <h1 className="mt-3 max-w-[28ch] text-4xl font-semibold text-ink md:text-5xl">
                {solution.title}
              </h1>
              <p className="section-lead">{solution.summary}</p>
            </div>
            <PortalMotif
              motif={
                solution.slug === "atencion-y-seguimiento"
                  ? "agents"
                  : solution.slug === "automatizacion-de-procesos"
                    ? "automation"
                    : "connections"
              }
            />
          </div>

          <div className="mt-10 grid gap-10 md:grid-cols-[1.4fr_1fr]">
            <div className="space-y-10">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-action">
                  Problema
                </h2>
                <p className="mt-2 text-lg leading-8 text-ink">
                  {solution.problem}
                </p>
              </div>

              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-action">
                  Alcance
                </h2>
                <ul className="mt-3 space-y-2">
                  {solution.scope.map((item) => (
                    <li
                      key={item}
                      className="flex gap-3 text-base leading-7 text-ink"
                    >
                      <span aria-hidden className="text-action">
                        —
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-action">
                  Flujo
                </h2>
                <ol className="mt-3 grid gap-3 sm:grid-cols-4">
                  {solution.flow.map((step, i) => (
                    <li
                      key={step}
                      className="rounded-lg border border-border bg-surface p-4"
                    >
                      <span className="text-xs font-semibold text-action">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <p className="mt-1 text-sm font-medium text-ink">
                        {step}
                      </p>
                    </li>
                  ))}
                </ol>
              </div>

              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-action">
                  Resultado esperado
                </h2>
                <p className="mt-2 text-lg leading-8 text-ink">
                  {solution.outcome}
                </p>
              </div>

              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-action">
                  Límites
                </h2>
                <p className="mt-2 text-base leading-7 text-muted">
                  {solution.boundary}
                </p>
              </div>
            </div>

            <aside className="space-y-6">
              <Card>
                <p className="text-base leading-7 text-ink">
                  ¿Este es tu problema? Conversemos sobre tu proceso.
                </p>
                <div className="mt-4">
                  <PrimaryLink href={`/contacto?solucion=${solution.slug}`}>
                    Conversemos
                  </PrimaryLink>
                </div>
              </Card>
            </aside>
          </div>
        </Container>
      </main>
      <SiteFooter />
    </div>
  );
}
