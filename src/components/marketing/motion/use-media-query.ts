"use client";

import { useSyncExternalStore } from "react";

/** Escucha una media query también cuando cambia durante la visita (rotar el celular, redimensionar). */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (callback) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", callback);
      return () => list.removeEventListener("change", callback);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
