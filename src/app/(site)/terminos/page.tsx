import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/pages/LegalPage";
import { TERMS } from "@/content/marketing/legal";

export const metadata: Metadata = {
  title: { absolute: TERMS.title },
  description: TERMS.description,
  alternates: { canonical: TERMS.canonical },
};

/** /terminos (PAGINAS_AUXILIARES_SPEC_V1 §3). Indexable, no prioritaria. */
export default function TermsPage() {
  return <LegalPage doc={TERMS} />;
}
