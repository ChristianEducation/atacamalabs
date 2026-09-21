import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Puerto de components/templates/usd-halo/primitives.tsx (hirael.com/r/usd-halo.json,
 * MIT) — ver docs/HALO-FASE0-MAP.md. Mecánica 1:1; copy/color adaptados a Atacama.
 */

interface PillButtonProps {
  href: string;
  children: React.ReactNode;
  large?: boolean;
  variant?: "dark" | "light";
  className?: string;
}

/** Píldora con círculo de flecha final — botón primario de todo el sistema Halo. */
export function PillButton({
  href,
  children,
  large = false,
  variant = "dark",
  className,
}: PillButtonProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-3 rounded-full py-2 ps-8 pe-2 font-medium transition-colors duration-200",
        large ? "text-base md:text-lg" : "text-base",
        variant === "dark"
          ? "bg-ink text-background hover:bg-action-hover"
          : "bg-background text-ink hover:bg-background/90",
        className,
      )}
    >
      <span>{children}</span>
      <span
        className={cn(
          "rounded-full p-2",
          variant === "dark" ? "bg-background" : "bg-ink",
        )}
      >
        <ArrowRight
          className={cn(
            "h-5 w-5 rtl:rotate-180",
            variant === "dark" ? "text-ink" : "text-background",
          )}
        />
      </span>
    </Link>
  );
}

/** Variante de PillButton en <a>/<button> plano, para casos sin ruta interna (ancla, submit). */
export function PillAction({
  href,
  onClick,
  type = "button",
  children,
  large = false,
  variant = "dark",
  className,
}: {
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  children: React.ReactNode;
  large?: boolean;
  variant?: "dark" | "light";
  className?: string;
}) {
  const classes = cn(
    "inline-flex items-center gap-3 rounded-full py-2 ps-8 pe-2 font-medium transition-colors duration-200",
    large ? "text-base md:text-lg" : "text-base",
    variant === "dark"
      ? "bg-ink text-background hover:bg-action-hover"
      : "bg-background text-ink hover:bg-background/90",
    className,
  );
  const arrow = (
    <span
      className={cn(
        "rounded-full p-2",
        variant === "dark" ? "bg-background" : "bg-ink",
      )}
    >
      <ArrowRight
        className={cn(
          "h-5 w-5 rtl:rotate-180",
          variant === "dark" ? "text-ink" : "text-background",
        )}
      />
    </span>
  );
  if (href) {
    return (
      <a href={href} className={classes}>
        <span>{children}</span>
        {arrow}
      </a>
    );
  }
  return (
    <button type={type} onClick={onClick} className={classes}>
      <span>{children}</span>
      {arrow}
    </button>
  );
}

export interface MarqueeItem {
  name: string;
  iconSrc?: string;
}

interface MarqueeProps {
  items: MarqueeItem[];
  keyframesName: string;
  durationSeconds: number;
  itemClassName?: string;
}

/**
 * Marquee horizontal infinito — misma mecánica que Halo (lista duplicada x2,
 * translateX 0 -> -50%, loop perfecto). Extendido para aceptar un ícono SVG
 * real por ítem en vez de solo texto estilizado.
 */
export function Marquee({
  items,
  keyframesName,
  durationSeconds,
  itemClassName,
}: MarqueeProps) {
  return (
    <>
      <style>{`
        @keyframes ${keyframesName} {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .${keyframesName}-track {
          display: flex;
          width: max-content;
          animation: ${keyframesName} ${durationSeconds}s linear infinite;
        }
        [dir="rtl"] .${keyframesName}-track {
          animation-direction: reverse;
        }
        @media (prefers-reduced-motion: reduce) {
          .${keyframesName}-track {
            animation: none;
          }
        }
      `}</style>
      <div className={`${keyframesName}-track`}>
        {[...items, ...items].map((item, index) => (
          <div
            key={`${item.name}-${index}`}
            className={cn(
              "mx-8 flex shrink-0 items-center gap-2.5 whitespace-nowrap",
              itemClassName,
            )}
          >
            {item.iconSrc ? (
              // eslint-disable-next-line @next/next/no-img-element -- ícono decorativo en loop duplicado, next/image no aporta aquí
              <img
                src={item.iconSrc}
                alt=""
                aria-hidden
                className="h-6 w-6 opacity-70 grayscale"
              />
            ) : null}
            <span className="text-sm font-medium text-ink/70">
              {item.name}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}
