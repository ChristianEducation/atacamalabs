import { Character, PAL, Pixels, glyphRects, type Rect } from "./sprites";

/**
 * Ilustraciones pequeñas de la sección de valor del Home. Mismo lenguaje pixel
 * que la oficina de /agentes (misma paleta, el mismo trabajador sentado), sin
 * imágenes: rectángulos sobre una grilla de píxeles de arte.
 */

const r = (x: number, y: number, w: number, h: number, fill: string): Rect => [x, y, w, h, fill];

/** Puesto de trabajo: suelo, silla, escritorio y monitor (como en AgentTools). */
const DESK: Rect[] = [
  r(0, 38, 56, 2, PAL.floor),
  r(0, 38, 56, 1, PAL.floorLine),
  r(3, 22, 1, 9, PAL.steelDark),
  r(3, 30, 5, 1, PAL.steelDark),
  r(5, 31, 1, 7, PAL.steelDark),
  r(2, 37, 7, 1, PAL.steelDark),
  r(18, 26, 30, 2, PAL.wood),
  r(19, 28, 2, 10, PAL.woodDark),
  r(45, 28, 2, 10, PAL.woodDark),
  r(20, 25, 7, 1, "#5b6479"),
  r(31, 23, 2, 3, PAL.rackLine),
  r(28, 25, 8, 1, PAL.rackLine),
  r(25, 10, 14, 13, PAL.ink),
  r(26, 11, 12, 11, "#f4f8ff"),
  r(27, 13, 3, 3, PAL.shirt),
  r(31, 13, 5, 1, PAL.steelDark),
  r(31, 15, 4, 1, PAL.steelDark),
  r(27, 18, 9, 1, PAL.steelDark),
  r(27, 20, 6, 1, PAL.steelDark),
];

/** Conexión punteada del monitor al panel de gestión. */
const WIRE: Rect[] = [
  r(41, 16, 2, 1, PAL.shirt),
  r(45, 16, 2, 1, PAL.shirt),
  r(49, 16, 2, 1, PAL.shirt),
  r(53, 16, 2, 1, PAL.shirt),
  r(57, 16, 2, 1, PAL.shirt),
  r(60, 15, 1, 3, PAL.shirt),
  r(61, 16, 1, 1, PAL.shirt),
];

/** Panel de gestión: ventana con tres tareas y su estado. */
function panelRects(): Rect[] {
  const rows: [number, string][] = [
    [15, PAL.green],
    [21, PAL.shirt],
    [27, PAL.amber],
  ];
  return [
    r(64, 6, 44, 28, PAL.steelDark),
    r(65, 7, 42, 26, PAL.white),
    r(65, 7, 42, 5, PAL.steelLight),
    r(67, 9, 1, 1, PAL.red),
    r(69, 9, 1, 1, PAL.amber),
    r(71, 9, 1, 1, PAL.green),
    ...rows.flatMap(([y, color]): Rect[] => [
      r(67, y, 3, 3, color),
      r(72, y, 20, 1, PAL.steelDark),
      r(72, y + 2, 12, 1, PAL.steel),
      r(97, y, 8, 3, PAL.steelLight),
    ]),
  ];
}

/** 01 · El agente en su puesto, conectado a su panel de gestión. */
export function ValueWorkstation() {
  return (
    <svg className="mk-hv-scene" viewBox="0 0 112 40" aria-hidden="true">
      <Pixels rects={DESK} />
      <g transform="translate(8 38)">
        <Character pose="sit" frame={0} />
      </g>
      <Pixels rects={WIRE} />
      <Pixels rects={panelRects()} />
    </svg>
  );
}

/** 03 · Marca de paso completado (casilla verde con check de 5 píxeles). */
export function ValueTick() {
  return (
    <svg className="mk-hv-tick" viewBox="0 0 7 7" aria-hidden="true">
      <rect width="7" height="7" fill={PAL.green} />
      <Pixels rects={glyphRects("check", 1, 2, PAL.white)} />
    </svg>
  );
}
