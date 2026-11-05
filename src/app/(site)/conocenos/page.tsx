import type { Metadata } from "next";
import {
  AboutCapabilities,
  AboutNorth,
  AboutOrigin,
  AboutPrinciples,
  AboutSeal,
} from "@/components/marketing/pages/AboutSections";
import { CTABlock } from "@/components/marketing/ui/Blocks";
import { ABOUT_CTA } from "@/content/marketing/about";
import { pageMetadata } from "@/lib/seo-metadata";

export const metadata: Metadata = pageMetadata({
  title: "Atacama Labs | Agentes, automatización y software",
  description:
    "Conoce Atacama Labs: construimos agentes de IA, automatizaciones, integraciones y software conectados a la forma real de trabajar de cada empresa.",
  path: "/conocenos",
});

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
