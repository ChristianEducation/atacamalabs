import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Container, Eyebrow, PrimaryLink, Card } from "@/components/ui";
import site, { getCase, publicCase } from "@/lib/content";

export function generateStaticParams() {
  return site.cases.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const c = getCase(slug);
  if (!c) return {};
  return {
    title: `${c.title} | Atacama Labs`,
    description: c.situation,
  };
}

export default async function CaseDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const raw = getCase(slug);
  if (!raw) notFound();
  const c = publicCase(raw);

  return (
    <div className="flex flex-col flex-1 bg-background">
      <SiteHeader />
      <main className="flex-1 py-16 md:py-20">
        <Container>
          <Eyebrow>{c.sector}</Eyebrow>
          <h1 className="mt-3 max-w-[32ch] text-4xl font-semibold text-ink md:text-5xl">
            {c.title}
          </h1>

          <div className="mt-10 grid gap-10 md:grid-cols-[1.4fr_1fr]">
            <div className="space-y-10">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-copper">
                  Situación
                </h2>
                <p className="mt-2 text-lg leading-8 text-ink">{c.situation}</p>
              </div>

              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-copper">
                  Solución
                </h2>
                <p className="mt-2 text-lg leading-8 text-ink">{c.solution}</p>
                <ul className="mt-4 space-y-2">
                  {c.features.map((f) => (
                    <li key={f} className="flex gap-3 text-base leading-7 text-ink">
                      <span aria-hidden className="text-copper">—</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-copper">
                  Esquema del flujo
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Diagrama editorial del proceso, no una captura del producto.
                </p>
                <ol className="mt-4 grid gap-3 sm:grid-cols-4">
                  {c.diagramSteps.map((step, i) => (
                    <li
                      key={step}
                      className="rounded-lg border border-border bg-surface p-4"
                    >
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
                  Rol
                </h2>
                <p className="mt-2 text-base leading-7 text-ink">{c.role}</p>
              </div>

              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-copper">
                  Evidencia
                </h2>
                <p className="mt-2 text-base leading-7 text-muted">{c.evidenceLabel}</p>
              </div>
            </div>

            <aside>
              <Card>
                <p className="text-base leading-7 text-ink">
                  ¿Tu empresa tiene un proceso parecido?
                </p>
                <div className="mt-4">
                  <PrimaryLink href="/contacto">Conversemos</PrimaryLink>
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
