import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Container, Eyebrow, PrimaryLink, Card } from "@/components/ui";
import site, { getSolution, getCase } from "@/lib/content";

/**
 * Casos relacionados por solución — WEB-CONTENT.md:
 * "atención/seguimiento con proceso comercial descriptivo; automatización
 * con pedidos/registro; sistemas con los cuatro casos; integraciones con
 * pedidos/pagos/ecommerce." atención-y-seguimiento no tiene caso publicado
 * que calce (es proceso comercial, no un caso implementado) — se omite.
 */
const RELATED_CASES: Record<string, string[]> = {
  "atencion-y-seguimiento": [],
  "automatizacion-de-procesos": [
    "pedidos-de-almuerzos",
    "pedidos-por-turno",
    "registro-de-entregas",
  ],
  "sistemas-a-medida": [
    "pedidos-de-almuerzos",
    "pedidos-por-turno",
    "registro-de-entregas",
    "tienda-online",
  ],
  integraciones: ["tienda-online", "pedidos-de-almuerzos"],
};

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

  const related = (RELATED_CASES[solution.slug] ?? [])
    .map((slug) => getCase(slug))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  return (
    <div className="flex flex-col flex-1 bg-background">
      <SiteHeader />
      <main className="flex-1 py-16 md:py-20">
        <Container>
          <Eyebrow>Solución</Eyebrow>
          <h1 className="mt-3 max-w-[28ch] text-4xl font-semibold text-ink md:text-5xl">
            {solution.title}
          </h1>

          <div className="mt-10 grid gap-10 md:grid-cols-[1.4fr_1fr]">
            <div className="space-y-10">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-copper">
                  Problema
                </h2>
                <p className="mt-2 text-lg leading-8 text-ink">{solution.problem}</p>
              </div>

              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-copper">
                  Alcance
                </h2>
                <ul className="mt-3 space-y-2">
                  {solution.scope.map((item) => (
                    <li key={item} className="flex gap-3 text-base leading-7 text-ink">
                      <span aria-hidden className="text-copper">—</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-copper">
                  Flujo
                </h2>
                <ol className="mt-3 grid gap-3 sm:grid-cols-4">
                  {solution.flow.map((step, i) => (
                    <li key={step} className="rounded-lg border border-border bg-surface p-4">
                      <span className="text-xs font-semibold text-copper">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <p className="mt-1 text-sm font-medium text-ink">{step}</p>
                    </li>
                  ))}
                </ol>
              </div>

              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-copper">
                  Resultado esperado
                </h2>
                <p className="mt-2 text-lg leading-8 text-ink">{solution.outcome}</p>
              </div>

              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-copper">
                  Límites
                </h2>
                <p className="mt-2 text-base leading-7 text-muted">{solution.boundary}</p>
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

              {related.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-copper">
                    Caso relacionado
                  </h2>
                  <div className="mt-3 space-y-3">
                    {related.map((c) => (
                      <Link key={c.slug} href={`/proyectos/${c.slug}`}>
                        <Card className="transition-colors hover:border-border-control">
                          <p className="text-sm font-medium text-ink">{c.title}</p>
                          <p className="mt-1 text-sm text-muted">{c.sector}</p>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </aside>
          </div>
        </Container>
      </main>
      <SiteFooter />
    </div>
  );
}
