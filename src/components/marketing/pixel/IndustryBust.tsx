import { characterRects, Pixels, type Outfit } from "./sprites";
import type { IndustrySlug } from "@/content/marketing/industries";

/**
 * El mismo agente pixel de /agentes con un solo accesorio según el rubro: mismo
 * personaje, misma paleta, sin trajes completos. Empieza como prototipo con
 * Alimentación (gorro y delantal); los demás rubros se suman aquí, uno por línea,
 * si el resultado convence. Un rubro sin entrada simplemente no muestra busto.
 */
const OUTFITS: Partial<Record<IndustrySlug, Outfit>> = {
  "alimentacion-casinos": { shirt: "#0f5ced", shade: "#0a44b0", gear: "chef" },
};

export function hasIndustryBust(slug: IndustrySlug): boolean {
  return slug in OUTFITS;
}

/** Solo de la cintura hacia arriba: las piernas empiezan en y = −8. */
function bustRects(outfit: Outfit) {
  return characterRects("stand", 0, outfit).filter(([, y]) => y < -8);
}

export function IndustryBust({
  industry,
  size = 44,
  className,
}: {
  industry: IndustrySlug;
  size?: number;
  className?: string;
}) {
  const outfit = OUTFITS[industry];
  if (!outfit) return null;
  return (
    <svg
      className={className}
      width={(size * 12) / 22}
      height={size}
      viewBox="-2 -30 12 22"
      preserveAspectRatio="xMidYMax meet"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <Pixels rects={bustRects(outfit)} />
    </svg>
  );
}
