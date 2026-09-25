import { memo } from "react";
import { AGENT_ROLES } from "@/content/marketing/agents";
import { backOut } from "./onboarding-timeline";
import { CHANGE_AT, RACK_X, TOOL_AT, officeAt } from "./office-timeline";
import { BASE_OUTFIT, Character, PAL, Pixels, type Outfit, type Rect } from "./sprites";

/** Lienzo del hero en píxeles de arte (el suelo está en y = 70). */
const GROUND = 70;
const VIEW = "0 6 120 68";

const r = (x: number, y: number, w: number, h: number, fill: string): Rect => [x, y, w, h, fill];

type Prop = "case" | "calc" | "papers" | "headset" | "calendar" | "gear";
interface Look {
  outfit: Outfit;
  prop: Prop;
}

/** Uniforme y herramienta de cada puesto, en el mismo orden que las pestañas del selector. */
const LOOKS: readonly Look[] = [
  { outfit: { shirt: "#0f5ced", shade: "#0a44b0", gear: "tie" }, prop: "case" },
  { outfit: { shirt: "#17a673", shade: "#0f7a55", gear: "visor" }, prop: "calc" },
  { outfit: { shirt: "#2b3a63", shade: "#1a2645", gear: "glasses" }, prop: "papers" },
  { outfit: { shirt: "#2fa8d8", shade: "#1f7fa8", gear: "headset" }, prop: "headset" },
  { outfit: { shirt: "#f5b942", shade: "#c78a1c", gear: "none" }, prop: "calendar" },
  { outfit: { shirt: "#8a94ad", shade: "#5f6a85", gear: "hard" }, prop: "gear" },
];

const grid = (cols: number, rows: number, fn: (c: number, row: number) => Rect) =>
  Array.from({ length: rows }, (_, row) => Array.from({ length: cols }, (_, c) => fn(c, row))).flat();

function propArt(prop: Prop): Rect[] {
  switch (prop) {
    case "case":
      return [r(106, 52, 9, 6, "#b5652b"), r(109, 50, 3, 2, "#7a4318"), r(110, 54, 1, 1, PAL.amber)];
    case "calc":
      return [
        r(107, 49, 7, 9, PAL.rack),
        r(108, 50, 5, 2, "#9fe0c0"),
        ...grid(3, 3, (c, row) => r(108 + c * 2, 53 + row * 2, 1, 1, PAL.steel)),
      ];
    case "papers":
      return [
        r(106, 54, 9, 4, PAL.white),
        r(106, 52, 9, 2, "#e5eaf4"),
        r(107, 50, 7, 2, PAL.white),
        r(113, 49, 1, 4, PAL.amber),
      ];
    case "headset":
      return [
        r(108, 50, 5, 1, PAL.ink),
        r(107, 51, 1, 4, PAL.ink),
        r(113, 51, 1, 4, PAL.ink),
        r(106, 54, 2, 3, PAL.ink),
        r(113, 54, 2, 3, PAL.ink),
      ];
    case "calendar":
      return [
        r(107, 50, 8, 8, PAL.white),
        r(107, 50, 8, 2, PAL.shirt),
        ...grid(3, 2, (c, row) => r(108 + c * 2, 53 + row * 2, 1, 1, PAL.steelDark)),
        r(112, 55, 1, 1, PAL.shirt),
      ];
    default:
      return [r(109, 50, 4, 8, "#8a94ad"), r(107, 52, 8, 4, "#8a94ad"), r(109, 52, 4, 4, PAL.steel)];
  }
}

function screenArt(prop: Prop): Rect[] {
  switch (prop) {
    case "case":
      return [
        r(92, 44, 6, 4, PAL.green),
        r(93, 45, 4, 1, PAL.white),
        r(93, 47, 2, 1, PAL.white),
        r(96, 49, 6, 3, "#dfe9ff"),
      ];
    case "calc":
      return [0, 1, 2].flatMap((i) => [r(92, 44 + i * 3, 9, 1, PAL.steelDark), r(101, 44 + i * 3, 1, 1, PAL.amber)]);
    case "papers":
      return [
        r(92, 50, 2, 3, PAL.shirt),
        r(95, 47, 2, 6, PAL.shirt),
        r(98, 45, 2, 8, PAL.shirt),
        r(101, 48, 1, 5, PAL.shirt),
      ];
    case "headset":
      return [r(92, 44, 6, 3, "#dfe9ff"), r(96, 48, 6, 3, PAL.green), r(93, 52, 3, 1, PAL.steelDark)];
    case "calendar":
      return grid(3, 3, (c, row) => r(92 + c * 3, 44 + row * 3, 2, 2, row === 1 && c === 2 ? PAL.shirt : PAL.steel));
    default:
      return [
        r(92, 45, 3, 3, PAL.shirt),
        r(98, 45, 3, 3, PAL.shirt),
        r(95, 50, 3, 3, PAL.green),
        r(93, 48, 1, 2, PAL.steelDark),
        r(99, 48, 1, 2, PAL.steelDark),
      ];
  }
}

const uniformX = (index: number) => 9 + index * 6.2;

function uniformArt(index: number): Rect[] {
  const { outfit } = LOOKS[index];
  const x = uniformX(index);
  return [
    r(x + 2, 28, 1, 2, PAL.steelDark),
    r(x, 30, 5, 7, outfit.shirt),
    r(x - 1, 30, 1, 3, outfit.shade),
    r(x + 5, 30, 1, 3, outfit.shade),
    r(x, 30, 1, 7, outfit.shade),
    outfit.gear === "tie" ? r(x + 3, 31, 1, 4, PAL.amber) : r(x + 2, 30, 1, 1, PAL.white),
  ];
}

const BACKDROP: Rect[] = [
  r(0, 0, 120, 70, PAL.wall),
  r(0, 67, 120, 3, PAL.baseboard),
  r(0, 70, 120, 14, PAL.floor),
  r(0, 70, 120, 1, PAL.floorLine),
  // ventana
  r(56, 10, 24, 18, PAL.steelDark),
  r(57, 11, 22, 16, "#dbe8ff"),
  r(67, 11, 1, 16, PAL.steelDark),
  r(57, 18, 22, 1, PAL.steelDark),
  // montaña
  ...Array.from({ length: 6 }, (_, i) => r(99 - i, 12 + i, 2 * i + 2, 1, PAL.shirt)),
  // cartel y riel de uniformes
  r(4, 18, 42, 7, PAL.white),
  r(4, 18, 42, 1, PAL.steelDark),
  r(4, 24, 42, 1, PAL.steelDark),
  r(4, 18, 1, 7, PAL.steelDark),
  r(45, 18, 1, 7, PAL.steelDark),
  r(5, 28, 40, 1, PAL.steelDark),
  r(5, 29, 1, 9, PAL.steelDark),
  r(44, 29, 1, 9, PAL.steelDark),
  // silla y escritorio
  r(68, 44, 1, 9, PAL.steelDark),
  r(68, 52, 5, 1, PAL.steelDark),
  r(70, 53, 1, 17, PAL.steelDark),
  r(67, 69, 6, 1, PAL.steelDark),
  r(78, 58, 38, 2, PAL.wood),
  r(80, 60, 2, 10, PAL.woodDark),
  r(112, 60, 2, 10, PAL.woodDark),
  r(80, 57, 7, 1, "#5b6479"),
  r(96, 55, 2, 3, PAL.rackLine),
  r(93, 57, 8, 1, PAL.rackLine),
  r(90, 42, 14, 13, PAL.ink),
  r(91, 43, 12, 11, "#f4f8ff"),
];

const Backdrop = memo(function Backdrop() {
  return <Pixels rects={BACKDROP} />;
});

/** Destello y partículas del cambio de uniforme. */
function ChangeBurst({ p }: { p: number }) {
  if (p < CHANGE_AT - 50 || p >= 1700) return null;
  const k = (p - (CHANGE_AT - 50)) / 350;
  const radius = 3 + Math.min(1, k) * 9;
  const fade = 1 - Math.min(1, k);
  const flash = k < 0.35 ? (k / 0.35) * 0.65 : Math.max(0, 0.65 * (1 - (k - 0.35) / 0.65));
  const dots: [number, number][] = [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
    [0, -1.4],
    [0, 1.4],
    [-1.4, 0],
    [1.4, 0],
  ];
  return (
    <g>
      {dots.map(([dx, dy], i) => (
        <rect
          key={i}
          x={RACK_X + 3.5 + dx * radius}
          y={GROUND - 13 + dy * radius * 0.9}
          width={1.4}
          height={1.4}
          fill={i % 2 ? PAL.white : "#9fbcf5"}
          opacity={fade}
        />
      ))}
      <rect x={RACK_X - 2} y={GROUND - 26} width={12} height={26} fill={PAL.white} opacity={flash} />
    </g>
  );
}

/**
 * La oficina del hero de /agentes. Solo pinta: recibe el instante `t` del guion
 * y deriva la posición del trabajador, su uniforme, lo que cuelga en el perchero
 * y la herramienta sobre el escritorio. El globo dice el puesto en una palabra.
 */
export function HeroOfficeScene({ t }: { t: number }) {
  const roles = AGENT_ROLES.length;
  const s = officeAt(t, roles);
  const outfit = s.worn < 0 ? BASE_OUTFIT : LOOKS[s.worn].outfit;
  const deskRole = s.p >= TOOL_AT ? s.role : s.cycle === 0 ? -1 : s.prev;
  const propScale = s.p >= TOOL_AT && s.p < TOOL_AT + 350 ? backOut(Math.min(1, (s.p - TOOL_AT) / 350)) : 1;
  const label = s.p >= CHANGE_AT ? AGENT_ROLES[s.role].tab : s.cycle > 0 ? AGENT_ROLES[s.prev].tab : null;

  const width = label ? label.length * 1.85 + 6 : 0;
  const anchor = s.x + 4;
  const bx = Math.min(118 - width, Math.max(2, anchor - width / 2));
  const by = GROUND - 24 - 6.6 - 3.2;
  const tail = Math.min(bx + width - 3, Math.max(bx + 3, anchor));

  return (
    <svg
      className="mk-ao__svg"
      viewBox={VIEW}
      role="img"
      aria-label="El agente toma distintos puestos: comercial, cobranza, finanzas, atención, agendamiento y procesos."
    >
      <Backdrop />
      <text className="mk-ao__sign" x={25} y={23.4} textAnchor="middle">
        PUESTOS
      </text>

      {LOOKS.map((_, i) =>
        i === s.worn ? (
          <rect key={i} x={uniformX(i) + 2} y={28} width={1} height={2} fill={PAL.steelDark} />
        ) : (
          <Pixels key={i} rects={uniformArt(i)} />
        ),
      )}

      {deskRole >= 0 ? <Pixels rects={screenArt(LOOKS[deskRole].prop)} /> : null}
      {deskRole >= 0 ? (
        <g transform={`translate(110 58) scale(${propScale.toFixed(3)}) translate(-110 -58)`}>
          <Pixels rects={propArt(LOOKS[deskRole].prop)} />
        </g>
      ) : null}

      <ChangeBurst p={s.p} />

      <g transform={s.face < 0 ? `translate(${s.x + 8} ${GROUND}) scale(-1 1)` : `translate(${s.x} ${GROUND})`}>
        <Character pose={s.pose} frame={s.frame} outfit={outfit} />
      </g>

      {label ? (
        <g className="mk-ao__bubble" key={label} opacity={s.p >= CHANGE_AT && s.p < 1700 ? 0.5 : 1}>
          <rect x={bx} y={by} width={width} height={6.6} rx={3} />
          <polygon points={`${tail - 1.6},${by + 6.4} ${tail + 1.6},${by + 6.4} ${tail},${by + 9}`} />
          <text x={bx + width / 2} y={by + 4.15} textAnchor="middle">
            {label}
          </text>
        </g>
      ) : null}
    </svg>
  );
}
