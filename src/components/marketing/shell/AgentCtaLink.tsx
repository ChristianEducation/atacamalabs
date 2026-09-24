"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { diagnosticFallback, trackAgentCta, type AgentCtaContext } from "@/lib/marketing/agent-cta";
import { openAgent } from "./AgentTryButton";

/**
 * CTA que abre a Nayra con el contexto de dónde se pulsó (CTA_SYSTEM_SPEC §2).
 * Con el widget listo abre el chat sin navegar; si aún no cargó, sigue el
 * enlace de respaldo a /diagnostico con los mismos parámetros. `className`
 * permite usarlo como botón (`mk-btn …`) o como enlace de texto.
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
  return (
    <Link
      href={diagnosticFallback(context)}
      className={variant === "link" ? className : cn("mk-btn", `mk-btn--${variant}`, className)}
      data-cta={context.source_cta}
      onClick={(event) => {
        const opened = openAgent();
        trackAgentCta(context, opened);
        if (opened) event.preventDefault();
      }}
    >
      {children}
      {arrow ? <ArrowRight size={18} aria-hidden strokeWidth={1.9} /> : null}
    </Link>
  );
}
