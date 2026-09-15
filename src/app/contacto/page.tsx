import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Container } from "@/components/ui";
import { ContactForm } from "@/components/ContactForm";
import { ContactStatesPreview } from "@/components/ContactStatesPreview";
import site, { getSolution } from "@/lib/content";

export const metadata: Metadata = {
  title: "Contacto | Atacama Labs",
  description: site.contact.title,
};

export default async function Contacto({
  searchParams,
}: {
  searchParams: Promise<{ solucion?: string; preview?: string }>;
}) {
  const params = await searchParams;
  const solution = params.solucion ? getSolution(params.solucion) : undefined;

  return (
    <div className="flex flex-col flex-1 bg-background">
      <SiteHeader />
      <main className="flex-1 py-16 md:py-20">
        <Container className="max-w-[70ch]">
          <h1 className="text-4xl font-semibold text-ink md:text-5xl">
            {site.contact.title}
          </h1>
          <p className="mt-4 text-lg leading-8 text-muted">{site.contact.body}</p>
          {solution && (
            <p className="mt-3 text-sm text-copper">
              Sobre: {solution.title}
            </p>
          )}

          <div className="mt-10">
            <ContactForm initialSolution={solution?.slug} />
          </div>

          {params.preview === "estados" && (
            <div className="mt-16">
              <ContactStatesPreview />
            </div>
          )}
        </Container>
      </main>
      <SiteFooter />
    </div>
  );
}
