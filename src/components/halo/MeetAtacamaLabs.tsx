import Link from "next/link";
import { PillButton } from "./primitives";

/**
 * Puerto de components/templates/usd-halo/info.tsx ("Meet USD Halo") —
 * misma composición: título+CTA a la izquierda / párrafo grande a la
 * derecha, luego un bento de 3 (Halo trae 4: 1 card grande con foto
 * `col-span-2` + 2 cards oscuras). Aquí son 3 líneas de negocio reales
 * (`site.json.portals`, ya sin el portal de casos) en vez de 4 — Agentes
 * como card grande/protagonista, Sistemas y Automatización como cards
 * oscuras. No es la grilla de 4 portales de 006 (sin iconografía/topografía
 * decorativa, sin numeración "01/02/03").
 */
export function MeetAtacamaLabsSection({
  title,
  ctaLabel,
  ctaHref,
  body,
  portals,
}: {
  title: string;
  ctaLabel: string;
  ctaHref: string;
  body: string;
  portals: { title: string; summary: string; href: string; cta: string }[];
}) {
  const [featured, ...rest] = portals;

  return (
    <section className="bg-background px-4 py-20 sm:px-6 md:py-28">
      <div className="mx-auto max-w-[88rem]">
        <div className="mb-16 grid grid-cols-1 items-start gap-10 md:grid-cols-2 md:gap-12">
          <div>
            <h2
              className="mb-8 text-4xl font-medium leading-tight text-ink md:text-5xl"
              style={{ letterSpacing: "-0.03em" }}
            >
              {title}
            </h2>
            <PillButton href={ctaHref}>{ctaLabel}</PillButton>
          </div>
          <p
            className="text-2xl leading-relaxed text-ink/70 md:text-3xl"
            style={{ fontFamily: "var(--font-inter), Arial, sans-serif" }}
          >
            {body}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {featured && (
            <Link
              href={featured.href}
              className="group relative flex min-h-80 flex-col justify-between overflow-hidden rounded-2xl p-7 lg:col-span-2"
              style={{
                backgroundImage:
                  "url(/visual/home/desert-relief-editorial.webp)",
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-background/25 transition-colors duration-200 group-hover:bg-background/15"
              />
              <h3
                className="relative z-10 text-2xl font-medium leading-snug text-ink"
                style={{ letterSpacing: "-0.02em" }}
              >
                {featured.title}
              </h3>
              <p className="relative z-10 max-w-xs text-base text-ink/70">
                {featured.summary}
              </p>
            </Link>
          )}

          {rest.map((portal) => (
            <Link
              key={portal.href}
              href={portal.href}
              className="flex min-h-80 flex-col justify-between rounded-2xl bg-ink p-7 transition-colors duration-200 hover:bg-action-hover"
            >
              <h3
                className="text-2xl font-medium leading-snug text-background"
                style={{ letterSpacing: "-0.02em" }}
              >
                {portal.title}
              </h3>
              <p className="text-base text-background/60">
                {portal.summary}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
