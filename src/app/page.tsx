import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { HeroRelief } from "@/components/HeroRelief";
import { Container, Eyebrow, PrimaryLink, SecondaryLink, Card } from "@/components/ui";
import site from "@/lib/content";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 bg-background">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <Container className="grid items-center gap-10 py-12 md:grid-cols-2 md:py-20">
          <div>
            <Eyebrow>{site.hero.eyebrow}</Eyebrow>
            <h1 className="mt-4 text-[clamp(2.375rem,6vw,4.75rem)] font-semibold leading-[1.05] text-ink">
              {site.hero.title}
            </h1>
            <p className="mt-6 max-w-[42ch] text-lg leading-8 text-muted">
              {site.hero.body}
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <PrimaryLink href={site.hero.primaryCta.href}>
                {site.hero.primaryCta.label}
              </PrimaryLink>
              <SecondaryLink href={site.hero.secondaryCta.href}>
                {site.hero.secondaryCta.label}
              </SecondaryLink>
            </div>
          </div>
          <div>
            <HeroRelief />
          </div>
        </Container>

        {/* Problemas que resolvemos — tomado literal de solutions[].problem */}
        <section className="bg-surface-warm py-16 md:py-20">
          <Container>
            <h2 className="max-w-[28ch] text-3xl font-semibold text-ink md:text-4xl">
              Problemas que resolvemos
            </h2>
            <div className="mt-10 grid gap-6 sm:grid-cols-2">
              {site.solutions.map((s) => (
                <Card key={s.slug} className="bg-surface">
                  <p className="text-base leading-7 text-ink">{s.problem}</p>
                </Card>
              ))}
            </div>
          </Container>
        </section>

        {/* Cuatro soluciones */}
        <section className="py-16 md:py-20">
          <Container>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="text-3xl font-semibold text-ink md:text-4xl">
                Cuatro formas de ayudar a tu empresa
              </h2>
              <Link href="/soluciones" className="text-sm font-medium text-action hover:text-action-hover">
                Ver todas las soluciones →
              </Link>
            </div>
            <div className="mt-10 grid gap-6 md:grid-cols-2">
              {site.solutions.map((s) => (
                <Link key={s.slug} href={`/soluciones/${s.slug}`}>
                  <Card className="h-full transition-colors hover:border-border-control">
                    <h3 className="text-xl font-semibold text-ink">{s.title}</h3>
                    <p className="mt-3 text-base leading-7 text-muted">{s.summary}</p>
                  </Card>
                </Link>
              ))}
            </div>
          </Container>
        </section>

        {/* Cuatro casos */}
        <section className="bg-surface-warm py-16 md:py-20">
          <Container>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="text-3xl font-semibold text-ink md:text-4xl">
                Proyectos reales
              </h2>
              <Link href="/proyectos" className="text-sm font-medium text-action hover:text-action-hover">
                Ver todos los casos →
              </Link>
            </div>
            <div className="mt-10 grid gap-6 sm:grid-cols-2">
              {site.cases.map((c) => (
                <Link key={c.slug} href={`/proyectos/${c.slug}`}>
                  <Card className="h-full bg-surface transition-colors hover:border-border-control">
                    <p className="text-sm font-medium uppercase tracking-wide text-copper">
                      {c.sector}
                    </p>
                    <h3 className="mt-2 text-xl font-semibold text-ink">{c.title}</h3>
                    <p className="mt-3 text-base leading-7 text-muted">{c.situation}</p>
                  </Card>
                </Link>
              ))}
            </div>
          </Container>
        </section>

        {/* Proceso */}
        <section className="py-16 md:py-20">
          <Container>
            <h2 className="text-3xl font-semibold text-ink md:text-4xl">
              Cómo trabajamos
            </h2>
            <ol className="mt-10 grid gap-6 md:grid-cols-4">
              {site.process.map((step, i) => (
                <li key={step.title}>
                  <span className="text-sm font-semibold text-copper">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-2 text-lg font-semibold text-ink">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{step.body}</p>
                </li>
              ))}
            </ol>
          </Container>
        </section>

        {/* Responsable / forma de trabajo */}
        <section className="bg-surface-warm py-16 md:py-20">
          <Container className="grid gap-10 md:grid-cols-2 md:items-center">
            <div>
              <h2 className="text-3xl font-semibold text-ink md:text-4xl">
                {site.about.title}
              </h2>
              <p className="mt-4 text-base leading-7 text-muted">{site.about.body}</p>
            </div>
            <div>
              <p className="text-base leading-7 text-ink">{site.about.founderText}</p>
              <div className="mt-6">
                <SecondaryLink href="/sobre-el-estudio">Sobre el estudio</SecondaryLink>
              </div>
            </div>
          </Container>
        </section>

        {/* FAQ */}
        <section className="py-16 md:py-20">
          <Container>
            <h2 className="text-3xl font-semibold text-ink md:text-4xl">
              Preguntas frecuentes
            </h2>
            <dl className="mt-10 grid gap-8 md:grid-cols-2">
              {site.faq.map((item) => (
                <div key={item.q}>
                  <dt className="text-lg font-semibold text-ink">{item.q}</dt>
                  <dd className="mt-2 text-base leading-7 text-muted">{item.a}</dd>
                </div>
              ))}
            </dl>
          </Container>
        </section>

        {/* CTA final */}
        <section className="bg-ink py-16 md:py-20">
          <Container className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
            <h2 className="max-w-[24ch] text-3xl font-semibold text-background md:text-4xl">
              {site.hero.primaryCta.label}
            </h2>
            <PrimaryLink href="/contacto">{site.contact.submitLabel}</PrimaryLink>
          </Container>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
