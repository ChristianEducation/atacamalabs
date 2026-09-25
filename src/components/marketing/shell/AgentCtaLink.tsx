"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { diagnosticFallback, trackAgentCta, type AgentCtaContext } from "@/lib/marketing/agent-cta";
import { openAgent } from "./nayra";

/** Cuánto se espera a que cargue el widget antes de caer al enlace de respaldo. */
const WAIT_MS = 2500;
const POLL_MS = 150;

/**
 * CTA que abre a Nayra con el contexto de dónde se pulsó (CTA_SYSTEM_SPEC §2).
 * El widget de Nayra no recibe metadatos ni mensaje inicial (su API pública es
 * solo `mount`/`unmount`), así que el contexto viaja en el evento
 * los eventos de analítica (`cta_clicked`, `nayra_opened`), sin manipular el chat. Si el widget
 * aún está cargando se espera un momento; solo si no aparece se sigue el enlace
 * de respaldo a /diagnostico con los mismos parámetros. `className` permite
 * usarlo como botón (`mk-btn …`) o como enlace de texto (`variant="link"`).
 */
export function AgentCtaLink({
  context,
  variant = "primary",
  arrow,
  className,
  children,
}: {
  context: AgentCtaContext;
  variant?: "primary" | "secondary" | "tertiary" | "white" | "link";
  arrow?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const fallback = diagnosticFallback(context);

  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    // Abrir en pestaña nueva u otra acción del navegador sigue siendo un enlace normal.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    if (openAgent()) {
      trackAgentCta(context, true);
      return;
    }
    const started = Date.now();
    const timer = window.setInterval(() => {
      if (openAgent()) {
        window.clearInterval(timer);
        trackAgentCta(context, true);
      } else if (Date.now() - started > WAIT_MS) {
        window.clearInterval(timer);
        trackAgentCta(context, false);
        router.push(fallback);
      }
    }, POLL_MS);
  };

  return (
    <Link
      href={fallback}
      className={variant === "link" ? className : cn("mk-btn", `mk-btn--${variant}`, className)}
      data-cta={context.source_cta}
      onClick={onClick}
    >
      {children}
      {arrow ? <ArrowRight size={18} aria-hidden strokeWidth={1.9} /> : null}
    </Link>
  );
}
