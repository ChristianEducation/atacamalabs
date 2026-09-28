import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/pages/LegalPage";
import { TERMS } from "@/content/marketing/legal";
import { pageMetadata } from "@/lib/seo-metadata";

export const metadata: Metadata = pageMetadata({
  title: TERMS.title,
  description: TERMS.description,
  path: "/terminos",
});

/** /terminos (PAGINAS_AUXILIARES_SPEC_V1 §3). Indexable, no prioritaria. */
export default function TermsPage() {
  return <LegalPage doc={TERMS} />;
}
