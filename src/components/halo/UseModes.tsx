import { ArrowRight } from "lucide-react";
import { HeroVideo } from "./HeroVideo";

/**
 * Puerto de components/templates/usd-halo/use-cases.tsx ("Use modes") —
 * 2 columnas: intro a la izquierda, panel de video grande a la derecha con
 * UN solo caso superpuesto (nunca tabs/dots/carrusel — así viene Halo, y es
 * la decisión explícita de Christian de mantenerlo así por ahora). Los
 * demás modos de uso (atender, agendar, seguimiento) se desarrollan en
 * /agentes, no acá.
 */
export function UseModesSection({
  eyebrow,
  title,
  body,
  caseTitle,
  caseBody,
  caseCtaLabel,
  caseCtaHref,
}: {
  eyebrow: string;
  title: string;
  body: string;
  caseTitle: string;
  caseBody: string;
  caseCtaLabel: string;
  caseCtaHref: string;
}) {
  return (
    <section className="bg-background px-4 py-20 sm:px-6 md:py-28">
      <div className="mx-auto grid max-w-[88rem] grid-cols-1 items-start gap-8 md:grid-cols-2">
        <div className="md:pe-12 md:pt-2">
          <p className="mb-2 text-sm text-ink/60">{eyebrow}</p>
          <h2
            className="mb-6 text-5xl font-medium leading-none text-ink md:text-6xl"
            style={{ letterSpacing: "-0.04em" }}
          >
            {title}
          </h2>
          <p
            className="max-w-sm text-base leading-relaxed text-ink/60"
            style={{ fontFamily: "var(--font-inter), Arial, sans-serif" }}
          >
            {body}
          </p>
        </div>

        <div className="relative min-h-[560px] overflow-hidden rounded-3xl md:min-h-[720px]">
          <HeroVideo
            poster="/visual/home/hero-atacama-wide.webp"
            desktopSrc="/visual/home/use-modes.mp4"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/15 to-transparent"
          />
          <div className="relative z-10 p-8 md:p-12">
            <h3
              className="mb-5 text-4xl font-medium leading-tight text-ink md:text-5xl"
              style={{ letterSpacing: "-0.03em" }}
            >
              {caseTitle}
            </h3>
            <p className="mb-8 max-w-md text-base text-ink/70">{caseBody}</p>
            <a
              href={caseCtaHref}
              className="group inline-flex items-center gap-3 text-base font-medium text-ink"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-background/80 backdrop-blur transition-colors duration-200 group-hover:bg-background">
                <ArrowRight className="h-4 w-4 text-ink rtl:rotate-180" />
              </span>
              {caseCtaLabel}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
