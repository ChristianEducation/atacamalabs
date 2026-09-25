"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { AgentCtaContext } from "@/lib/marketing/agent-cta";
import { AgentCtaLink } from "./AgentCtaLink";
import { widgetParts } from "./nayra";

/**
 * Botón «Prueba a Nayra» del hero del Home. Es un `AgentCtaLink` (abre el chat,
 * registra el contexto y, si el widget no responde, cae a /diagnostico) que
 * además oculta la burbuja flotante mientras el hero está a la vista: sería
 * redundante y taparía este mismo botón.
 */
export function AgentTryButton({
  context,
  className,
  children,
}: {
  context: AgentCtaContext;
  className?: string;
  children: ReactNode;
}) {
  // En celular el botón espera unos segundos para dejar ver el video; un scroll lo adelanta.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const onScroll = () => {
      if (window.scrollY > 24) setReady(true);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
    <AgentCtaLink context={context} variant="link" className={cn(className, ready && "is-ready")}>
      {children}
    </AgentCtaLink>
  );
}
