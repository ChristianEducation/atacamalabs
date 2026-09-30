import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IndustryLanding } from "@/components/marketing/pages/IndustryLanding";
import { INDUSTRY_SLUGS, getIndustry } from "@/content/marketing/industries";
import { pageMetadata } from "@/lib/seo-metadata";
import { breadcrumbJsonLd } from "@/lib/seo-schema";

/**
 * /rubros/[slug] — SEO_GROWTH_SPEC_V1 §8. Landing indexable de un rubro; el
 * selector visual en /rubros no cambia, esto es la URL propia que le faltaba
 * a cada industria para poder posicionar por su cuenta.
 */
export function generateStaticParams() {
  return INDUSTRY_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const industry = getIndustry(slug);
  if (!industry) return {};
  return pageMetadata({
    title: industry.seo.title,
    description: industry.seo.description,
    path: `/rubros/${industry.slug}`,
  });
}

export default async function RubroPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const industry = getIndustry(slug);
  if (!industry) notFound();

  const breadcrumb = breadcrumbJsonLd([
    { name: "Atacama Labs", path: "/" },
    { name: "Rubros", path: "/rubros" },
    { name: industry.name, path: `/rubros/${industry.slug}` },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <IndustryLanding industry={industry} />
    </>
  );
}
