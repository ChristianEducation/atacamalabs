"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { diagnosticHref, sourceFromPath } from "@/lib/marketing/cta-context";

/** Enlace a /diagnostico que conserva la página de origen (footer, menús). */
export function DiagnosticLink({
  section,
  cta,
  className,
  onClick,
  children,
}: {
  section: string;
  cta: string;
  className?: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const href = diagnosticHref({
    source_page: sourceFromPath(pathname),
    source_section: section,
    source_cta: cta,
    service: "general",
  });
  return (
    <Link href={href} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}
