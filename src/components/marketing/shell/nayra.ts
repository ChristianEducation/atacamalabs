"use client";

const HOST = "[data-lety-widget]";

/** Piezas del widget de Nayra (viven en un shadow DOM del script de Lety). */
export function widgetParts() {
  const root = document.querySelector(HOST)?.shadowRoot;
  return {
    bubble: root?.querySelector<HTMLElement>(".lety-bubble") ?? null,
    panel: root?.querySelector<HTMLElement>(".lety-panel") ?? null,
  };
}

/**
 * Abre el chat real de Nayra sin agregar una segunda burbuja: el widget expone
 * `mount/unmount` y su launcher vive en un shadow DOM, así que se activa el
 * mismo botón que usa un visitante. Devuelve false si el widget aún no cargó
 * (el llamador espera o cae al enlace de respaldo).
 */
export function openAgent(): boolean {
  const { bubble, panel } = widgetParts();
  if (!bubble || !panel) return false;
  if (!panel.classList.contains("open")) bubble.click();
  return true;
}
