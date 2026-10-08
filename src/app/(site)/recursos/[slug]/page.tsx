import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ResourcePage } from "@/components/marketing/pages/ResourcePage";
import { RESOURCE_SLUGS, getResource } from "@/content/marketing/resources";
import { pageMetadata } from "@/lib/seo-metadata";
import { breadcrumbJsonLd } from "@/lib/seo-schema";

/** /recursos/[slug] — Resource & Conversation Engine v1. Indexable; el slug coincide con content_resources.slug. */
export function generateStaticParams() {
  return RESOURCE_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const resource = getResource(slug);
  if (!resource) return {};
  return pageMetadata({ title: resource.seoTitle, description: resource.description, path: `/recursos/${resource.slug}` });
}

export default async function RecursoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const resource = getResource(slug);
  if (!resource) notFound();

  const breadcrumb = breadcrumbJsonLd([
    { name: "Atacama Labs", path: "/" },
    { name: "Recursos", path: "/recursos" },
    { name: resource.title, path: `/recursos/${resource.slug}` },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <ResourcePage resource={resource} />
    </>
  );
}
