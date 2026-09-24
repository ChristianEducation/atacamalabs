import type { Pose } from "./sprites";

/**
 * Guion de la inducción, en milisegundos. El trabajador entra, pasa por cuatro
 * estaciones (empresa, funciones, herramientas, prueba) y termina sentado en su
 * puesto. Todo lo que se ve en cada instante sale de `t`, así que la escena se
 * puede reproducir, pausar y arrastrar sin estado adicional.
 */

export const END = 16500;

interface Segment {
  from: number;
  to: number;
  pose: Pose;
  x0: number;
  x1: number;
}

const SEGMENTS: readonly Segment[] = [
  { from: 0, to: 1200, pose: "walk", x0: -12, x1: 14 },
  { from: 1200, to: 4200, pose: "read", x0: 14, x1: 14 },
  { from: 4200, to: 5400, pose: "walk", x0: 14, x1: 50 },
  { from: 5400, to: 8400, pose: "point", x0: 50, x1: 50 },
  { from: 8400, to: 9600, pose: "walk", x0: 50, x1: 90 },
  { from: 9600, to: 12600, pose: "hold", x0: 90, x1: 90 },
  { from: 12600, to: 14000, pose: "walk", x0: 90, x1: 128 },
  { from: 14000, to: 14250, pose: "stand", x0: 128, x1: 128 },
  { from: 14250, to: Infinity, pose: "sit", x0: 128, x1: 128 },
];

/** Posición y pose del trabajador; `beat` alterna el gesto (escribir, leer) cuando el reloj ya no avanza. */
export function workerAt(t: number, beat: number): { x: number; pose: Pose; frame: number } {
  const segment = SEGMENTS.find((s) => t >= s.from && t < s.to) ?? SEGMENTS[SEGMENTS.length - 1];
  if (segment.pose === "walk") {
    const k = (t - segment.from) / (segment.to - segment.from);
    const x = segment.x0 + (segment.x1 - segment.x0) * k;
    return { x: Math.round(x), pose: "walk", frame: ((Math.floor(x / 2.5) % 4) + 4) % 4 };
  }
  const frame = t >= END ? beat : Math.floor(t / 350) % 2;
  return { x: segment.x0, pose: segment.pose, frame };
}

/** Inicio de cada estación (tarjetas 01–04) y fin de la última que se completa. */
export const STATION_START = [1200, 5400, 9600, 14000] as const;
const STATION_END = [4200, 8400, 12600, Infinity] as const;

/** Estación en curso (0–3) o −1 antes de llegar a la primera. Se queda en 3 al terminar. */
export function stationAt(t: number): number {
  let index = -1;
  STATION_START.forEach((start, i) => {
    if (t >= start) index = i;
  });
  return index;
}

export const stationDone = (t: number, index: number) => t >= STATION_END[index];

/** Momentos que nombra la etiqueta de arriba: uno por estación más el primer día y la operación. */
export const MOMENT_START = [0, 1200, 5400, 9600, 12600, 15000] as const;

export function momentAt(t: number): number {
  let index = 0;
  MOMENT_START.forEach((start, i) => {
    if (t >= start) index = i;
  });
  return index;
}

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

/** Carpetas iluminadas de la estantería (estación 01). */
export const foldersLit = (t: number) => clamp(Math.floor((t - 1500) / 450) + 1, 0, 6);
/** Reglas marcadas en la pizarra (estación 02). */
export const rulesDone = (t: number) => clamp(Math.floor((t - 5800) / 800) + 1, 0, 3);
/** Progreso 0–1 de la herramienta `i` al conectarse (estación 03). */
export const toolProgress = (t: number, i: number) => clamp((t - (10000 + i * 550)) / 350);
export const ledsOn = (t: number) => clamp(Math.floor((t - 10000) / 400) + 1, 0, 3);
/** Progreso 0–1 de la línea `i` del monitor (estación 04). */
export const monitorProgress = (t: number, i: number) => clamp((t - 14500 - i * 500) / 450);
export const checkOn = (t: number) => t >= 15300;
export const signOn = (t: number) => t >= 15000;

/** Rebote suave con el que aparecen las herramientas. */
export const backOut = (p: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
};
