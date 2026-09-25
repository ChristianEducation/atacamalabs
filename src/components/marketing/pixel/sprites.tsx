/**
 * Lenguaje pixel de Atacama: el trabajador que representa al agente y los
 * iconos de su oficina. Todo se dibuja como rectángulos sobre una grilla de
 * píxeles de arte (1 unidad = 1 píxel), sin imágenes: es liviano y se ve nítido
 * a cualquier tamaño. Silueta neutra, sin rasgos, en azul Atacama con la
 * montaña en la credencial.
 */

/** [x, y, ancho, alto, color] en píxeles de arte. */
export type Rect = readonly [x: number, y: number, w: number, h: number, fill: string];

export const PAL = {
  head: "#ebddc6",
  headShade: "#d6c4a3",
  hair: "#1b2540",
  shirt: "#0f5ced",
  shirtShade: "#0a44b0",
  pants: "#22304f",
  pantsFar: "#161f36",
  shoe: "#0b1020",
  white: "#ffffff",
  amber: "#f5b942",
  green: "#17a673",
  red: "#e5484d",
  wall: "#f7f3ea",
  baseboard: "#eae3d2",
  floor: "#e8dfcc",
  floorLine: "#d3c7ae",
  steel: "#c9d2e3",
  steelDark: "#9aa9c7",
  steelLight: "#eef2fa",
  ink: "#121a2b",
  rack: "#26324f",
  rackDark: "#1b2540",
  rackLine: "#3a4a73",
  wood: "#cdba95",
  woodDark: "#b7a37c",
} as const;

export type Pose = "stand" | "walk" | "read" | "point" | "hold" | "sit";

/** Uniforme del trabajador: color de la camisa y el accesorio que lo distingue. */
export interface Outfit {
  shirt: string;
  shade: string;
  gear: "base" | "tie" | "visor" | "glasses" | "headset" | "hard" | "chef" | "none";
}

/** Uniforme de la inducción: azul Atacama con la montaña en la credencial. */
export const BASE_OUTFIT: Outfit = { shirt: PAL.shirt, shade: PAL.shirtShade, gear: "base" };

function gearOnHead(dy: number, outfit: Outfit): Rect[] {
  switch (outfit.gear) {
    case "visor":
      return [
        [0, -24 + dy, 8, 2, outfit.shade],
        [7, -23 + dy, 2, 1, outfit.shade],
      ];
    case "hard":
      return [
        [0, -25 + dy, 8, 2, PAL.amber],
        [1, -26 + dy, 6, 1, PAL.amber],
        [3, -27 + dy, 2, 1, PAL.amber],
      ];
    case "headset":
      return [
        [1, -25 + dy, 6, 1, PAL.ink],
        [0, -22 + dy, 2, 3, PAL.ink],
        [6, -19 + dy, 3, 1, PAL.ink],
      ];
    case "glasses":
      return [[4, -21 + dy, 4, 1, PAL.ink]];
    case "chef":
      // Gorro de cocina: banda, copa y un sombreado suave en la base de la copa.
      return [
        [1, -25 + dy, 6, 1, PAL.white],
        [0, -28 + dy, 8, 3, PAL.white],
        [0, -26 + dy, 8, 1, "#dfe4ee"],
        // Contorno fino para que el gorro blanco se lea sobre fondos claros.
        [1, -29 + dy, 6, 1, PAL.steelDark],
        [0, -28 + dy, 1, 1, PAL.steelDark],
        [7, -28 + dy, 1, 1, PAL.steelDark],
        [-1, -27 + dy, 1, 2, PAL.steelDark],
        [8, -27 + dy, 1, 2, PAL.steelDark],
        [0, -25 + dy, 1, 1, PAL.steelDark],
        [7, -25 + dy, 1, 1, PAL.steelDark],
      ];
    default:
      return [];
  }
}

const upper = (dy: number, outfit: Outfit): Rect[] => [
  [1, -24 + dy, 6, 6, PAL.head],
  [1, -24 + dy, 6, 2, PAL.hair],
  [1, -22 + dy, 2, 3, PAL.hair],
  [3, -18 + dy, 3, 1, PAL.headShade],
  ...gearOnHead(dy, outfit),
  [1, -17 + dy, 6, 9, outfit.shirt],
  [1, -17 + dy, 2, 9, outfit.shade],
  ...(outfit.gear === "tie"
    ? ([[6, -17 + dy, 1, 6, PAL.amber]] as Rect[])
    : outfit.gear === "chef"
      ? // Delantal: pechera blanca con tirantes al cuello.
        ([
          [2, -14 + dy, 5, 6, PAL.white],
          [2, -17 + dy, 1, 3, PAL.white],
          [6, -17 + dy, 1, 3, PAL.white],
          [3, -12 + dy, 3, 1, "#dfe4ee"],
        ] as Rect[])
      : ([
          // credencial con la montaña
          [5, -15 + dy, 2, 2, PAL.white],
          [5, -14 + dy, 1, 1, PAL.shirt],
        ] as Rect[])),
  ...(outfit.gear === "glasses" ? ([[3, -17 + dy, 4, 1, PAL.white]] as Rect[]) : []),
];

const WALK_LEGS = [
  [0, 5],
  [2, 3],
  [5, 0],
  [3, 2],
] as const;

function legs(pose: Pose, frame: number, dy: number): Rect[] {
  if (pose === "sit") {
    return [
      [1, -8, 6, 2, PAL.pants],
      [6, -6, 2, 5, PAL.pants],
      [6, -1, 3, 1, PAL.shoe],
    ];
  }
  const [far, near] = pose === "walk" ? WALK_LEGS[frame % 4] : ([2, 4] as const);
  const top = -8 + dy;
  const height = 8 - dy;
  return [
    [far, top, 2, height, PAL.pantsFar],
    [far, -1, 3, 1, PAL.shoe],
    [near, top, 2, height, PAL.pants],
    [near, -1, 3, 1, PAL.shoe],
  ];
}

function arm(pose: Pose, frame: number, dy: number, outfit: Outfit): Rect[] {
  const sleeve = outfit.shade;
  switch (pose) {
    case "walk": {
      const x = [4, 3, 2, 3][frame % 4];
      return [
        [x, -16 + dy, 2, 6, sleeve],
        [x, -10 + dy, 2, 1, PAL.head],
      ];
    }
    case "read": {
      const page1 = frame % 2 ? -15 : -16;
      const page2 = frame % 2 ? -13 : -14;
      return [
        [4, -15, 3, 2, sleeve],
        [6, -14, 2, 1, PAL.head],
        [7, -17, 6, 6, PAL.steelDark],
        [8, -16, 4, 4, "#f4f7fc"],
        [7, -17, 1, 6, PAL.shirt],
        [9, page1, 2, 1, PAL.steelDark],
        [9, page2, 2, 1, PAL.steelDark],
      ];
    }
    case "point":
      return [
        [4, -15, 6, 2, sleeve],
        [10, -15, 1, 2, PAL.head],
        [11, frame % 2 ? -14 : -15, 2, 1, PAL.ink],
      ];
    case "hold":
      return [
        [4, -14, 6, 2, sleeve],
        [10, -14, 2, 2, PAL.head],
        [12, -14, 2, 2, PAL.amber],
      ];
    case "sit":
      return [
        [4, -15, 6, 2, sleeve],
        [10, frame % 2 ? -14 : -13, 1, 1, PAL.head],
      ];
    default:
      return [
        [3, -16, 2, 6, sleeve],
        [3, -10, 2, 1, PAL.head],
      ];
  }
}

/** Rectángulos del trabajador con los pies en (0, 0), mirando a la derecha. */
export function characterRects(pose: Pose, frame = 0, outfit: Outfit = BASE_OUTFIT): Rect[] {
  const dy = pose === "walk" && frame % 2 === 1 ? -1 : 0;
  return [...legs(pose, frame, dy), ...upper(dy, outfit), ...arm(pose, frame, dy, outfit)];
}

/** Pinta una lista de rectángulos como `<rect>` nítidos. */
export function Pixels({ rects, className }: { rects: readonly Rect[]; className?: string }) {
  return (
    <g className={className}>
      {rects.map(([x, y, w, h, fill], index) => (
        <rect key={index} x={x} y={y} width={w} height={h} fill={fill} />
      ))}
    </g>
  );
}

export function Character({ pose, frame = 0, outfit }: { pose: Pose; frame?: number; outfit?: Outfit }) {
  return <Pixels rects={characterRects(pose, frame, outfit)} />;
}

/** Iconos de 4–5 píxeles que usa la pizarra de funciones. */
export const GLYPHS = {
  check: [
    [0, 2],
    [1, 3],
    [2, 2],
    [3, 1],
    [4, 0],
  ],
  cross: [
    [0, 0],
    [1, 1],
    [2, 2],
    [3, 3],
    [3, 0],
    [2, 1],
    [1, 2],
    [0, 3],
  ],
  bang: [
    [2, 0],
    [2, 1],
    [2, 2],
    [2, 4],
  ],
} as const satisfies Record<string, readonly (readonly [number, number])[]>;

export function glyphRects(name: keyof typeof GLYPHS, ox: number, oy: number, fill: string): Rect[] {
  return GLYPHS[name].map(([x, y]) => [ox + x, oy + y, 1, 1, fill] as const);
}
