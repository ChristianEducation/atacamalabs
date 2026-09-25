import type { Metadata } from "next";
import {
  AboutCapabilities,
  AboutNorth,
  AboutOrigin,
  AboutPrinciples,
  AboutSeal,
} from "@/components/marketing/pages/AboutSections";
import { CTABlock } from "@/components/marketing/ui/Blocks";
import { ABOUT_CTA, ABOUT_META } from "@/content/marketing/about";

export const metadata: Metadata = {
  title: { absolute: ABOUT_META.title },
  description: ABOUT_META.description,
  alternates: { canonical: ABOUT_META.canonical },
};

/**
 * /conocenos (CONOCENOS_SPEC_V1, reordenada por Christian): la página de marca.
 * Abre con «Construido desde el norte» (azul claro, fotografía del norte y la
 * evidencia genérica) → origen (Paper) → cómo trabajamos, tres principios
 * editoriales (Sand) → capacidades (Paper) → sello de marca con el lema y el
 * logo (Paper) → cierre. Motion solo el Reveal estándar del sitio: sin demos,
 * chats, cifras ni clientes.
 */
export default function AboutPage() {
  return (
    <>
      <AboutNorth />
      <AboutOrigin />
      <AboutPrinciples />
      <AboutCapabilities />
      <AboutSeal />
      <CTABlock title={ABOUT_CTA.title} body={ABOUT_CTA.body} cta={ABOUT_CTA.primary} />
    </>
  );
}
