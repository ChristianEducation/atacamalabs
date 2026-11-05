import type { Pose } from "./sprites";

/**
 * Guion del hero: cada puesto dura `PERIOD` ms. El trabajador se levanta, va al
 * perchero, se cambia de uniforme (destello en `CHANGE_AT`), vuelve al escritorio
 * y se sienta con la herramienta de ese puesto. Todo sale de `t`, así que la
 * escena se puede dibujar en cualquier instante.
 */

export const PERIOD = 4200;
export const DESK_X = 70;
export const RACK_X = 42;
/** Instante (dentro del puesto) en que cambia el uniforme. */
export const CHANGE_AT = 1350;
/** Instante en que vuelve a sentarse y aparece la herramienta del nuevo puesto. */
export const TOOL_AT = 2550;

export interface OfficeState {
  /** Puesto en curso (0…roles−1) y ciclo absoluto. */
  role: number;
  cycle: number;
  /** Milisegundos dentro del puesto. */
  p: number;
  /** Puesto anterior (−1 antes del primero). */
  prev: number;
  /** Uniforme que lleva ahora (−1 = uniforme base). */
  worn: number;
  x: number;
  face: 1 | -1;
  pose: Pose;
  frame: number;
}

const walkFrame = (x: number) => ((Math.floor(x / 2.5) % 4) + 4) % 4;

export function officeAt(t: number, roles: number): OfficeState {
  const cycle = Math.floor(t / PERIOD);
  const role = ((cycle % roles) + roles) % roles;
  const p = t - cycle * PERIOD;
  const prev = cycle === 0 ? -1 : (role + roles - 1) % roles;
  const worn = p < CHANGE_AT ? prev : role;
  let x: number = DESK_X;
  let face: 1 | -1 = 1;
  let pose: Pose = "sit";
  let frame = Math.floor(t / 320) % 2;

  if (p < 150) {
    pose = "sit";
  } else if (p < 250) {
    pose = "stand";
    frame = 0;
  } else if (p < 1100) {
    x = DESK_X + (RACK_X - DESK_X) * ((p - 250) / 850);
    pose = "walk";
    face = -1;
    frame = walkFrame(x);
  } else if (p < 1700) {
    x = RACK_X;
    pose = "stand";
    face = -1;
    frame = 0;
  } else if (p < TOOL_AT) {
    x = RACK_X + (DESK_X - RACK_X) * ((p - 1700) / 850);
    pose = "walk";
    frame = walkFrame(x);
  } else if (p < 2700) {
    pose = "stand";
    frame = 0;
  }
  return { role, cycle, p, prev, worn, x: Math.round(x), face, pose, frame };
}
