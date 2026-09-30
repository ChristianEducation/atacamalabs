import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AgentLanding, type AgentLandingContent } from "@/components/marketing/pages/AgentLanding";
import { AGENT_ROLES, type AgentPageSlug } from "@/content/marketing/agents";
import { getAgentChannel } from "@/content/marketing/agent-channels";
import { pageMetadata } from "@/lib/seo-metadata";
import { breadcrumbJsonLd } from "@/lib/seo-schema";

/**
 * /agentes/[slug] — SEO_GROWTH_SPEC_V1 §15. Resuelve tanto los 6 cargos de
 * `AGENT_ROLES` como el canal WhatsApp (registro aparte, §13) bajo una misma
 * URL limpia. El selector de /agentes no cambia: esta es la landing propia
 * que le faltaba a cada trabajo de alta intención.
 */
const ROLE_SLUGS: readonly AgentPageSlug[] = AGENT_ROLES.map((role) => role.id);

function resolveContent(slug: string): { meta: Metadata; content: AgentLandingContent } | undefined {
  const role = AGENT_ROLES.find((r) => r.id === slug);
  if (role) {
    return {
      meta: pageMetadata({ title: role.seo.title, description: role.seo.description, path: `/agentes/${role.id}` }),
      content: {
        slug: role.id,
        tab: role.tab,
        h1: role.seo.h1,
        intro: role.seo.intro,
        bullets: role.features,
        relatedIndustries: role.seo.relatedIndustries,
        faq: role.seo.faq,
      },
    };
  }
  const channel = getAgentChannel(slug);
  if (channel) {
    return {
      meta: pageMetadata({ title: channel.title, description: channel.description, path: `/agentes/${channel.slug}` }),
      content: {
        slug: channel.slug,
        tab: channel.tab,
        h1: channel.h1,
        intro: channel.intro,
        bullets: channel.capabilities,
        relatedIndustries: channel.relatedIndustries,
        faq: channel.faq,
      },
    };
  }
  return undefined;
}

export function generateStaticParams() {
  return [...ROLE_SLUGS, "whatsapp" satisfies AgentPageSlug].map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return resolveContent(slug)?.meta ?? {};
}

export default async function AgentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const resolved = resolveContent(slug);
  if (!resolved) notFound();

  const breadcrumb = breadcrumbJsonLd([
    { name: "Atacama Labs", path: "/" },
    { name: "Agentes", path: "/agentes" },
    { name: resolved.content.tab, path: `/agentes/${resolved.content.slug}` },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <AgentLanding content={resolved.content} />
    </>
  );
}
