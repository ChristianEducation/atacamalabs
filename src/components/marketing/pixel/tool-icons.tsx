import { PAL, Pixels, type Rect } from "./sprites";

/**
 * Objetos de la oficina del agente: cada herramienta es algo que un empleado
 * tiene a mano. Iconos de 16 × 16 píxeles de arte, en la misma paleta que el
 * trabajador.
 */

const r = (x: number, y: number, w: number, h: number, fill: string): Rect => [x, y, w, h, fill];

export type ToolIconId = "calendar" | "chat" | "crm" | "data" | "docs" | "api";

const ART: Record<ToolIconId, Rect[]> = {
  // calendario de pared
  calendar: [
    r(2, 3, 12, 12, PAL.white),
    r(2, 3, 12, 3, PAL.shirt),
    r(4, 1, 1, 3, PAL.ink),
    r(11, 1, 1, 3, PAL.ink),
    r(4, 8, 2, 2, PAL.steelDark),
    r(7, 8, 2, 2, PAL.steelDark),
    r(10, 8, 2, 2, PAL.steelDark),
    r(4, 11, 2, 2, PAL.steelDark),
    r(7, 11, 2, 2, PAL.steelDark),
    r(10, 11, 2, 2, PAL.shirt),
  ],
  // teléfono con globo de conversación
  chat: [r(1, 2, 14, 9, PAL.green), r(3, 11, 3, 2, PAL.green), r(4, 5, 8, 1, PAL.white), r(4, 7, 5, 1, PAL.white)],
  // archivador del CRM
  crm: [
    r(3, 1, 10, 14, PAL.steel),
    r(4, 2, 8, 4, PAL.steelLight),
    r(4, 7, 8, 3, PAL.steelLight),
    r(4, 11, 8, 3, PAL.steelLight),
    r(7, 3, 2, 1, PAL.steelDark),
    r(7, 8, 2, 1, PAL.steelDark),
    r(7, 12, 2, 1, PAL.steelDark),
  ],
  // pila de discos de la base de datos
  data: [
    r(4, 1, 8, 3, PAL.shirt),
    r(3, 4, 10, 1, PAL.shirtShade),
    r(4, 5, 8, 3, PAL.shirt),
    r(3, 8, 10, 1, PAL.shirtShade),
    r(4, 9, 8, 3, PAL.shirt),
    r(3, 12, 10, 1, PAL.shirtShade),
    r(5, 2, 3, 1, "#7fa8f7"),
    r(5, 6, 3, 1, "#7fa8f7"),
    r(5, 10, 3, 1, "#7fa8f7"),
  ],
  // carpeta con documento
  docs: [
    r(4, 2, 8, 9, PAL.white),
    r(5, 4, 6, 1, PAL.steelDark),
    r(5, 6, 6, 1, PAL.steelDark),
    r(2, 5, 5, 2, PAL.amber),
    r(2, 7, 12, 7, PAL.amber),
    r(2, 7, 12, 1, "#e0a12d"),
  ],
  // enchufe para APIs y MCP
  api: [
    r(6, 1, 1, 3, PAL.ink),
    r(9, 1, 1, 3, PAL.ink),
    r(4, 4, 8, 6, PAL.amber),
    r(4, 9, 8, 1, "#e0a12d"),
    r(7, 10, 2, 3, PAL.rackLine),
    r(5, 13, 6, 2, PAL.rackLine),
  ],
};

export function ToolIcon({ id }: { id: ToolIconId }) {
  return (
    <svg className="mk-at__icon" viewBox="0 0 16 16" aria-hidden="true">
      <Pixels rects={ART[id]} />
    </svg>
  );
}
