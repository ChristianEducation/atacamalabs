import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SocialCard } from "@/components/studio/SocialCard";
import { SOCIAL_PIECES, getPiece } from "@/lib/social-content";

/**
 * Herramienta de producción interna (001/3.2): renderiza cada panel de
 * las seis piezas a tamaño real (1080×1350) para capturarlo como export.
 * No es contenido del sitio público — noindex, fuera de sitemap/robots.
 */
export const metadata: Metadata = { robots: { index: false, follow: false } };

export function generateStaticParams() {
  return SOCIAL_PIECES.filter((p) => p.panels.length > 0).flatMap((p) =>
    p.panels.map((_, i) => ({ slug: p.slug, panel: String(i) })),
  );
}

export default async function StudioPanel({
  params,
}: {
  params: Promise<{ slug: string; panel: string }>;
}) {
  const { slug, panel } = await params;
  const piece = getPiece(slug);
  if (!piece) notFound();
  const index = Number(panel);
  const item = piece.panels[index];
  if (!item) notFound();

  return <SocialCard panel={item} index={index} total={piece.panels.length} />;
}
