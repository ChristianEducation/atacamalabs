import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/pages/LegalPage";
import { PRIVACY } from "@/content/marketing/legal";

export const metadata: Metadata = {
  title: { absolute: PRIVACY.title },
  description: PRIVACY.description,
  alternates: { canonical: PRIVACY.canonical },
};

/** /privacidad (PAGINAS_AUXILIARES_SPEC_V1 §1). Indexable, no prioritaria. */
export default function PrivacyPage() {
  return <LegalPage doc={PRIVACY} />;
}
