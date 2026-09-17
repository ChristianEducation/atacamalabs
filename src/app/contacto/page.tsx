import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Container } from "@/components/ui";
import { ContactForm } from "@/components/ContactForm";
import { ContactStatesPreview } from "@/components/ContactStatesPreview";
import { getAgentPlan } from "@/lib/agents-offer";
import site, { getSolution } from "@/lib/content";

export const metadata: Metadata = {
  title: "Contacto | Atacama Labs",
  description: site.contact.title,
};

export default async function Contacto({
  searchParams,
}: {
  searchParams: Promise<{
    solucion?: string;
    preview?: string;
    servicio?: string;
    plan?: string;
  }>;
}) {
  const params = await searchParams;
  const plan =
    params.servicio === "agentes" ? getAgentPlan(params.plan) : undefined;
  const solution = params.solucion ? getSolution(params.solucion) : undefined;

  return (
    <div className="public-site flex flex-col flex-1 bg-background">
      <SiteHeader />
      <main id="contenido" tabIndex={-1} className="flex-1 py-16 md:py-20">
        <Container className="max-w-[70ch]">
          <h1 className="text-4xl font-semibold text-ink md:text-5xl">
            {site.contact.title}
          </h1>
          <p className="mt-4 text-lg leading-8 text-muted">
            {site.contact.body}
          </p>
          {solution && (
            <p className="mt-3 text-sm text-action">Sobre: {solution.title}</p>
          )}

          <div className="mt-10">
            {plan && (
              <p className="mb-6 text-action">
                Consulta sobre agentes · Plan {plan.name}
              </p>
            )}
            <ContactForm
              initialSolution={solution?.slug}
              initialMessage={
                plan
                  ? `Me interesa el plan ${plan.name} de agentes. Quisiera conversar sobre el proceso de mi empresa.`
                  : undefined
              }
            />
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
