import { characterRects, Pixels, type Outfit } from "./sprites";
import type { PlatformAgentId } from "@/content/marketing/platform";

/** Mismos uniformes que la oficina de /agentes: Comercial con corbata, Cobranza con visera, Administración con lentes. */
const OUTFITS: Record<PlatformAgentId, Outfit> = {
  nayra: { shirt: "#0f5ced", shade: "#0a44b0", gear: "tie" },
  kusi: { shirt: "#17a673", shade: "#0f7a55", gear: "visor" },
  illa: { shirt: "#2b3a63", shade: "#1a2645", gear: "glasses" },
};

/** Solo de la cintura hacia arriba: las piernas empiezan en y = −8. */
const BUST = (agent: PlatformAgentId) => characterRects("stand", 0, OUTFITS[agent]).filter(([, y]) => y < -8);

/**
 * Busto pixel del agente para las listas de la plataforma. Es el mismo trabajador
 * de /agentes recortado al pecho: da identidad sin repetir una escena completa.
 */
export function AgentBust({
  agent,
  size = 32,
  className,
}: {
  agent: PlatformAgentId;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="-2.5 -25.5 13 13"
      preserveAspectRatio="xMidYMax meet"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <Pixels rects={BUST(agent)} />
    </svg>
  );
}
