import { characterRects, Pixels, type Outfit } from "./sprites";
import type { IndustrySlug } from "@/content/marketing/industries";

/**
 * El mismo agente pixel de /agentes con un solo accesorio según el rubro: mismo
 * personaje, misma paleta, sin trajes completos. Un rubro sin entrada simplemente
 * no muestra busto.
 */
const BLUE = { shirt: "#0f5ced", shade: "#0a44b0" } as const;
const OUTFITS: Partial<Record<IndustrySlug, Outfit>> = {
  salud: { ...BLUE, gear: "headset" },
  inmobiliarias: { ...BLUE, gear: "keys" },
  educacion: { ...BLUE, gear: "cap" },
  "retail-ecommerce": { ...BLUE, gear: "tag" },
  "alimentacion-casinos": { ...BLUE, gear: "chef" },
  gimnasios: { ...BLUE, gear: "band" },
  "servicios-profesionales": { ...BLUE, gear: "tie" },
  "b2b-industria": { ...BLUE, gear: "hard" },
  "contabilidad-finanzas": { ...BLUE, gear: "glasses" },
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
