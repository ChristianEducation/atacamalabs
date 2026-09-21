"use client";

/**
 * AnimationCoordinator (spec/04-MOTION.md D2): una sola demo narrativa activa
 * por viewport — la de mayor área visible entre las que superan 35% de
 * intersección. Pausa global al ocultarse la pestaña o abrir menú/dialog.
 * Store externo mínimo: sin provider, sin timers propios.
 */

type Entry = { area: number; qualifies: boolean };

interface Snapshot {
  activeId: string | null;
  paused: boolean;
}

const entries = new Map<string, Entry>();
const pauseReasons = new Set<string>();
const listeners = new Set<() => void>();
let hidden = false;
let snapshot: Snapshot = { activeId: null, paused: false };
let listening = false;

function compute(): Snapshot {
  let best: string | null = null;
  let bestArea = 0;
  for (const [id, entry] of entries) {
    if (entry.qualifies && entry.area > bestArea) {
      best = id;
      bestArea = entry.area;
    }
  }
  return { activeId: best, paused: hidden || pauseReasons.size > 0 };
}

function emit() {
  const next = compute();
  if (next.activeId === snapshot.activeId && next.paused === snapshot.paused) return;
  snapshot = next;
  listeners.forEach((cb) => cb());
}

function onVisibility() {
  hidden = document.hidden;
  emit();
}

export function subscribeCoordinator(cb: () => void) {
  listeners.add(cb);
  if (!listening && typeof document !== "undefined") {
    listening = true;
    hidden = document.hidden;
    document.addEventListener("visibilitychange", onVisibility);
    snapshot = compute();
  }
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0 && listening) {
      listening = false;
      document.removeEventListener("visibilitychange", onVisibility);
    }
  };
}

export function getCoordinatorSnapshot(): Snapshot {
  return snapshot;
}

const SERVER: Snapshot = { activeId: null, paused: false };
export function getCoordinatorServerSnapshot(): Snapshot {
  return SERVER;
}

export function reportVisibility(id: string, area: number, qualifies: boolean) {
  entries.set(id, { area, qualifies });
  emit();
}

export function unregisterDemo(id: string) {
  entries.delete(id);
  emit();
}

/** Menú móvil, dialog, etc.: pausan las demos mientras estén abiertos. */
export function setGlobalPause(reason: string, on: boolean) {
  if (on) pauseReasons.add(reason);
  else pauseReasons.delete(reason);
  emit();
}
