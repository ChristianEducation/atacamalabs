import type { ReactNode } from "react";
import { AlertCircle, Check, Clock3, Loader2, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

/** E2 Badge neutro (rubros, «Demo interactiva», «Próximamente»). */
export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "blue" | "warning";
  className?: string;
}) {
  return <span className={cn("mk-badge", `mk-badge--${tone}`, className)}>{children}</span>;
}

export type StatusKey = "pendiente" | "procesando" | "completado" | "revision" | "error";

const MAP: Record<StatusKey, { label: string; Icon: typeof Clock3 }> = {
  pendiente: { label: "Pendiente", Icon: Clock3 },
  procesando: { label: "Procesando", Icon: Loader2 },
  completado: { label: "Completado", Icon: Check },
  revision: { label: "Revisión humana", Icon: UserRound },
  error: { label: "Error", Icon: AlertCircle },
};

/** E2 StatusChip: cada estado con icono + texto explícito, nunca solo color. */
export function StatusChip({
  status,
  label,
  className,
}: {
  status: StatusKey;
  /** Etiqueta específica del escenario (p. ej. «Por revisar», «Nueva»). */
  label?: string;
  className?: string;
}) {
  const { label: defaultLabel, Icon } = MAP[status];
  return (
    <span className={cn("mk-chip", `mk-chip--${status}`, className)}>
      <Icon size={12} aria-hidden strokeWidth={2.2} className={status === "procesando" ? "mk-spin" : undefined} />
      {label ?? defaultLabel}
    </span>
  );
}
