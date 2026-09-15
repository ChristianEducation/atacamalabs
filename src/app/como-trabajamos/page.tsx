import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Container, PrimaryLink } from "@/components/ui";
import site from "@/lib/content";

export const metadata: Metadata = {
  title: "Cómo trabajamos | Atacama Labs",
  description: "Las cuatro etapas de un proyecto con Atacama Labs.",
};

export default function ComoTrabajamos() {
  return (
    <div className="flex flex-col flex-1 bg-background">
      <SiteHeader />
      <main className="flex-1 py-16 md:py-20">
        <Container>
          <h1 className="max-w-[32ch] text-4xl font-semibold text-ink md:text-5xl">
            Cómo trabajamos
          </h1>
          <p className="mt-4 max-w-[60ch] text-lg leading-8 text-muted">
            Cuatro etapas, de principio a operación continua.
          </p>

          <ol className="mt-12 space-y-10">
            {site.process.map((step, i) => (
              <li key={step.title} className="flex gap-6">
                <span className="text-2xl font-semibold text-copper">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h2 className="text-xl font-semibold text-ink">{step.title}</h2>
                  <p className="mt-2 max-w-[60ch] text-base leading-7 text-muted">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-16">
            <PrimaryLink href="/contacto">Conversemos sobre tu proceso</PrimaryLink>
          </div>
        </Container>
      </main>
      <SiteFooter />
    </div>
  );
}
