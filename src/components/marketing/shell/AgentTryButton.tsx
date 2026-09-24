"use client";

import Link from "next/link";
import { useEffect, type ReactNode } from "react";

const HOST = "[data-lety-widget]";

function widgetParts() {
  const root = document.querySelector(HOST)?.shadowRoot;
  return {
    bubble: root?.querySelector<HTMLElement>(".lety-bubble") ?? null,
    panel: root?.querySelector<HTMLElement>(".lety-panel") ?? null,
  };
}

/**
 * Abre el chat real del agente (widget de Lety) sin agregar una segunda
 * burbuja: el widget expone `mount/unmount` y su launcher vive en un shadow
 * DOM, así que se activa el mismo botón que usa un visitante. Devuelve false si
 * el widget aún no cargó (el llamador cae al enlace de respaldo).
 */
export function openAgent(): boolean {
  const { bubble, panel } = widgetParts();
  if (!bubble || !panel) return false;
  if (!panel.classList.contains("open")) bubble.click();
  return true;
}

/**
 * Botón «Prueba al agente» del hero. Abre el chat si el widget está listo; si
 * no, navega al respaldo (`href`). Mientras el hero está a la vista oculta la
 * burbuja flotante (sería redundante y taparía este mismo botón).
 */
export function AgentTryButton({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  useEffect(() => {
    const hero = document.querySelector(".mk-home-hero");
    if (!hero) return;
    let heroVisible = true;
    const apply = () => {
      const { bubble, panel } = widgetParts();
      if (!bubble) return;
      const hide = heroVisible && !panel?.classList.contains("open");
      bubble.style.transition = "opacity 300ms ease";
      bubble.style.opacity = hide ? "0" : "";
      bubble.style.pointerEvents = hide ? "none" : "";
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        heroVisible = entry.intersectionRatio > 0.35;
        apply();
      },
      { threshold: [0, 0.35, 0.6] },
    );
    observer.observe(hero);
    const timer = window.setInterval(apply, 600);
    return () => {
      window.clearInterval(timer);
      observer.disconnect();
      const { bubble } = widgetParts();
      if (bubble) {
        bubble.style.opacity = "";
        bubble.style.pointerEvents = "";
      }
    };
  }, []);

  return (
    <Link
      href={href}
      className={className}
      onClick={(event) => {
        if (openAgent()) event.preventDefault();
      }}
    >
      {children}
    </Link>
  );
}
