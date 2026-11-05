import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/pages/LegalPage";
import { PRIVACY } from "@/content/marketing/legal";
import { pageMetadata } from "@/lib/seo-metadata";

export const metadata: Metadata = pageMetadata({
  title: PRIVACY.title,
  description: PRIVACY.description,
  path: "/privacidad",
});

/** /privacidad (PAGINAS_AUXILIARES_SPEC_V1 §1). Indexable, no prioritaria. */
export default function PrivacyPage() {
  return <LegalPage doc={PRIVACY} />;
}
