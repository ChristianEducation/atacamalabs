import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "tertiary" | "white";

interface Common {
  variant?: Variant;
  size?: "md" | "sm";
  block?: boolean;
  arrow?: boolean;
  className?: string;
  children: ReactNode;
}

function classes({ variant = "primary", size = "md", block, className }: Common) {
  return cn(
    "mk-btn",
    `mk-btn--${variant}`,
    size === "sm" && "mk-btn--sm",
    block && "mk-btn--block",
    className,
  );
}

/** E1 — enlace de navegación con apariencia de botón (<a>). */
export function ButtonLink({
  href,
  arrow,
  children,
  ...rest
}: Common & { href: string; onClick?: () => void; "aria-label"?: string; "data-cta"?: string }) {
  const { variant, size, block, className, ...anchor } = rest;
  return (
    <Link href={href} className={classes({ variant, size, block, className, children })} {...anchor}>
      {children}
      {arrow ? <ArrowRight size={18} aria-hidden strokeWidth={1.9} /> : null}
    </Link>
  );
}

/** E1 — acción (<button>). */
export function Button({
  arrow,
  loading,
  loadingLabel = "Enviando…",
  children,
  disabled,
  ...rest
}: Common &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> & {
    loading?: boolean;
    loadingLabel?: string;
  }) {
  const { variant, size, block, className, ...button } = rest;
  return (
    <button
      {...button}
      type={button.type ?? "button"}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={classes({ variant, size, block, className, children })}
    >
      {loading ? (
        <>
          <span className="mk-spinner" aria-hidden />
          <span>{loadingLabel}</span>
        </>
      ) : (
        <>
          {children}
          {arrow ? <ArrowRight size={18} aria-hidden strokeWidth={1.9} /> : null}
        </>
      )}
    </button>
  );
}
