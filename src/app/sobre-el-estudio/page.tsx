import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Container, PrimaryLink } from "@/components/ui";
import site from "@/lib/content";

export const metadata: Metadata = {
  title: "Nosotros | Atacama Labs",
  description: site.about.title,
};

export default function SobreElEstudio() {
  return (
    <div className="flex flex-col flex-1 bg-background">
      <SiteHeader />
      <main className="flex-1 py-16 md:py-20">
        <Container className="max-w-[70ch]">
          <p className="text-sm font-medium uppercase tracking-[0.16em] text-copper">
            {site.brand.origin}
          </p>
          <h1 className="mt-3 text-4xl font-semibold text-ink md:text-5xl">
            {site.about.title}
          </h1>
          <p className="mt-6 text-lg leading-8 text-muted">{site.about.body}</p>
          <p className="mt-6 text-lg leading-8 text-ink">{site.about.founderText}</p>

          <div className="mt-12">
            <PrimaryLink href="/contacto">Conversemos sobre tu proceso</PrimaryLink>
          </div>
        </Container>
      </main>
      <SiteFooter />
    </div>
  );
}
