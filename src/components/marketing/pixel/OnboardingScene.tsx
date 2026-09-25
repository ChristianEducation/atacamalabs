import { memo } from "react";
import { AGENTS_MOMENTS } from "@/content/marketing/agents";
import { Character, PAL, Pixels, glyphRects, type Rect } from "./sprites";
import {
  backOut,
  checkOn,
  foldersLit,
  ledsOn,
  momentAt,
  monitorProgress,
  rulesDone,
  signOn,
  stationAt,
  stationDone,
  toolProgress,
  workerAt,
} from "./onboarding-timeline";

/** Lienzo de la escena en píxeles de arte; el suelo está en y = 52. */
const WIDTH = 160;
const HEIGHT = 60;
const GROUND = 52;
/** En pantallas angostas la cámara muestra solo esta franja y sigue al trabajador. */
const NARROW_WIDTH = 72;

const r = (x: number, y: number, w: number, h: number, fill: string): Rect => [x, y, w, h, fill];

/* ---------- Decorado fijo ---------- */

const MOUNTAIN: Rect[] = [
  ...Array.from({ length: 7 }, (_, i) => r(15 - i, 7 + i, 2 * i + 2, 1, PAL.shirt)),
  ...Array.from({ length: 4 }, (_, i) => r(7 - i, 10 + i, 2 * i + 2, 1, PAL.shirtShade)),
];

const FLOOR_DASHES: Rect[] = Array.from({ length: 40 }, (_, i) => r(2 + i * 4, 56, 2, 1, PAL.floorLine));

const BACKDROP: Rect[] = [
  r(0, 0, WIDTH, GROUND, PAL.wall),
  r(0, 49, WIDTH, 3, PAL.baseboard),
  r(0, GROUND, WIDTH, 8, PAL.floor),
  r(0, GROUND, WIDTH, 1, PAL.floorLine),
  ...FLOOR_DASHES,
  ...MOUNTAIN,
  // estación 1 · estantería
  r(28, 22, 20, 30, PAL.steel),
  r(29, 23, 18, 28, PAL.steelLight),
  r(29, 31, 18, 1, PAL.steelDark),
  r(29, 41, 18, 1, PAL.steelDark),
  r(29, 51, 18, 1, PAL.steelDark),
  r(31, 42, 4, 7, PAL.steel),
  r(36, 42, 4, 7, PAL.steel),
  r(41, 42, 4, 7, PAL.steel),
  // estación 2 · pizarra
  r(62, 18, 24, 22, PAL.steelDark),
  r(63, 19, 22, 20, PAL.white),
  r(72, 40, 2, 2, PAL.steelDark),
  r(76, 40, 2, 2, PAL.steelDark),
  // estación 3 · rack de herramientas
  r(104, 20, 18, 32, PAL.rack),
  r(105, 21, 16, 3, PAL.rackDark),
  ...[
    [105, 23],
    [114, 23],
    [105, 32],
    [114, 32],
  ].map(([x, y]) => r(x, y, 9, 9, PAL.rackDark)),
  r(106, 44, 14, 1, PAL.rackLine),
  r(106, 47, 14, 1, PAL.rackLine),
  // estación 4 · puesto de trabajo
  r(126, 36, 1, 9, PAL.steelDark),
  r(126, 44, 5, 1, PAL.steelDark),
  r(128, 45, 1, 7, PAL.steelDark),
  r(125, 51, 6, 1, PAL.steelDark),
  r(137, 40, 21, 2, PAL.wood),
  r(138, 42, 2, 10, PAL.woodDark),
  r(155, 42, 2, 10, PAL.woodDark),
  r(147, 37, 2, 3, PAL.rackLine),
  r(144, 36, 8, 1, PAL.rackLine),
  r(142, 25, 14, 11, PAL.ink),
  r(143, 26, 12, 9, "#f4f8ff"),
  r(139, 39, 7, 1, "#5b6479"),
];

const Backdrop = memo(function Backdrop() {
  return <Pixels rects={BACKDROP} />;
});

/* ---------- Elementos que cambian con el tiempo ---------- */

const FOLDERS = [
  [31, 24],
  [36, 24],
  [41, 24],
  [31, 34],
  [36, 34],
  [41, 34],
] as const;

const TILES = [
  { x: 106, y: 24, art: "cal" },
  { x: 115, y: 24, art: "chat" },
  { x: 106, y: 33, art: "db" },
  { x: 115, y: 33, art: "api" },
] as const;

const RULES = [
  { y: 22, glyph: "check", fill: PAL.green },
  { y: 28, glyph: "cross", fill: PAL.red },
  { y: 34, glyph: "bang", fill: PAL.amber },
] as const;

function tileArt(art: (typeof TILES)[number]["art"], x: number, y: number): Rect[] {
  switch (art) {
    case "cal":
      return [
        r(x, y, 7, 7, PAL.white),
        r(x, y, 7, 2, PAL.shirt),
        r(x + 1, y + 3, 2, 1, PAL.steelDark),
        r(x + 4, y + 3, 2, 1, PAL.steelDark),
        r(x + 1, y + 5, 2, 1, PAL.steelDark),
        r(x + 4, y + 5, 2, 1, PAL.shirt),
      ];
    case "chat":
      return [
        r(x, y, 7, 5, PAL.green),
        r(x + 1, y + 5, 2, 1, PAL.green),
        r(x + 1, y + 1, 5, 1, PAL.white),
        r(x + 1, y + 3, 3, 1, PAL.white),
      ];
    case "db":
      return [
        r(x + 1, y, 5, 2, PAL.shirt),
        r(x, y + 2, 7, 1, PAL.shirtShade),
        r(x + 1, y + 3, 5, 1, PAL.shirt),
        r(x, y + 4, 7, 1, PAL.shirtShade),
        r(x + 1, y + 5, 5, 2, PAL.shirt),
      ];
    default:
      return [
        r(x + 2, y, 3, 2, PAL.amber),
        r(x, y + 2, 7, 3, PAL.amber),
        r(x + 1, y + 3, 5, 1, "#b8801f"),
        r(x + 2, y + 5, 3, 2, PAL.amber),
      ];
  }
}

function Tile({ index, p }: { index: number; p: number }) {
  if (p <= 0) return null;
  const tile = TILES[index];
  const cx = tile.x + 3.5;
  const cy = tile.y + 3.5;
  const scale = backOut(p);
  return (
    <g transform={`translate(${cx} ${cy}) scale(${scale.toFixed(3)}) translate(${-cx} ${-cy})`}>
      <Pixels rects={tileArt(tile.art, tile.x, tile.y)} />
    </g>
  );
}

const STATION_X = [38, 74, 113, 147] as const;

function StationMark({ index, state }: { index: number; state: "idle" | "active" | "done" }) {
  return (
    <g className={`mk-ao__mark mk-ao__mark--${state}`}>
      <circle cx={STATION_X[index]} cy={57} r={2.9} />
      <text x={STATION_X[index]} y={58.1} textAnchor="middle">
        {index + 1}
      </text>
    </g>
  );
}

/** Ancho aproximado de una letra del globo (fuente monoespaciada de 3 unidades). */
const CHAR_W = 1.85;
const BUBBLE_H = 6.6;
/** Altura de la cabeza del trabajador: el globo flota justo encima. */
const HEAD_Y = GROUND - 24;

/**
 * Globo con el nombre del momento en una palabra. Flota sobre la cabeza del
 * trabajador y lo sigue; en pantallas angostas se mantiene dentro de la cámara.
 */
function MomentBubble({
  label,
  final,
  anchor,
  min,
  max,
}: {
  label: string;
  final: boolean;
  anchor: number;
  min: number;
  max: number;
}) {
  const width = label.length * CHAR_W + 6;
  const x = Math.min(max - width, Math.max(min, anchor - width / 2));
  const y = HEAD_Y - BUBBLE_H - 3.2;
  const tail = Math.min(x + width - 3, Math.max(x + 3, anchor));
  return (
    <g className={`mk-ao__bubble${final ? " is-final" : ""}`} key={label}>
      <rect x={x} y={y} width={width} height={BUBBLE_H} rx={3} />
      <polygon
        points={`${tail - 1.6},${y + BUBBLE_H - 0.2} ${tail + 1.6},${y + BUBBLE_H - 0.2} ${tail},${y + BUBBLE_H + 2.4}`}
      />
      <text x={x + width / 2} y={y + BUBBLE_H / 2 + 1.05} textAnchor="middle">
        {label}
      </text>
    </g>
  );
}

/**
 * La oficina donde el agente hace su inducción. Solo pinta: recibe el instante
 * `t` del guion y deriva de él la posición del trabajador y el estado de cada
 * estación. En pantallas angostas la cámara sigue al trabajador.
 */
export function OnboardingScene({ t, beat, narrow }: { t: number; beat: number; narrow: boolean }) {
  const worker = workerAt(t, beat);
  const station = stationAt(t);
  const running = signOn(t);
  const camera = narrow ? Math.min(WIDTH - NARROW_WIDTH, Math.max(0, worker.x + 4 - NARROW_WIDTH / 2)) : 0;
  const viewWidth = narrow ? NARROW_WIDTH : WIDTH;

  return (
    <svg
      className="mk-ao__svg"
      viewBox={`${camera} 0 ${viewWidth} ${HEIGHT}`}
      role="img"
      aria-label="Un trabajador recorre las cuatro etapas de su inducción y termina sentado en su puesto, en operación."
    >
      <Backdrop />

      <text className="mk-ao__sign" x={25} y={11.6}>
        TU EMPRESA
      </text>

      <rect
        x={0}
        y={56}
        width={running ? WIDTH : Math.min(WIDTH, Math.max(1, worker.x + 4))}
        height={1}
        fill={PAL.shirt}
      />
      {STATION_X.map((_, i) => {
        const done = i === 3 ? running : stationDone(t, i);
        const state = done ? "done" : station === i ? "active" : "idle";
        return <StationMark key={i} index={i} state={state} />;
      })}

      {FOLDERS.map(([x, y], i) => {
        const lit = i < foldersLit(t);
        return (
          <g key={i}>
            <rect x={x} y={y} width={4} height={7} fill={lit ? (i % 3 === 1 ? "#3d7bf0" : PAL.shirt) : PAL.steel} />
            <rect x={x} y={y} width={4} height={1} fill={lit ? PAL.shirtShade : PAL.steelDark} />
          </g>
        );
      })}

      {RULES.map((rule, i) => {
        const done = i < rulesDone(t);
        return (
          <g key={i}>
            <rect x={71} y={rule.y + 1} width={12} height={2} fill={done ? "#8fa0c4" : "#d5ddec"} />
            <rect x={71} y={rule.y + 4} width={8} height={1} fill="#e5eaf4" />
            {done ? <Pixels rects={glyphRects(rule.glyph, 65, rule.y, rule.fill)} /> : null}
          </g>
        );
      })}

      {[0, 1, 2].map((i) => (
        <rect key={i} x={107 + i * 4} y={22} width={2} height={1} fill={i < ledsOn(t) ? PAL.green : PAL.rackLine} />
      ))}
      {TILES.map((_, i) => (
        <Tile key={i} index={i} p={toolProgress(t, i)} />
      ))}

      {[8, 6, 9].map((full, i) => (
        <rect key={i} x={145} y={28 + i * 2.5} width={full * monitorProgress(t, i)} height={1.4} fill={PAL.steelDark} />
      ))}
      {checkOn(t) ? <Pixels rects={glyphRects("check", 150, 29, PAL.green)} /> : null}

      <g transform={`translate(${worker.x} ${GROUND})`}>
        <Character pose={worker.pose} frame={worker.frame} />
      </g>

      <MomentBubble
        label={AGENTS_MOMENTS[momentAt(t)]}
        final={momentAt(t) === AGENTS_MOMENTS.length - 1}
        anchor={worker.x + 4}
        min={camera + 1}
        max={camera + viewWidth - 1}
      />
    </svg>
  );
}
