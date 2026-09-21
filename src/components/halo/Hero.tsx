import { PillButton } from "./primitives";
import { HeroVideo } from "./HeroVideo";

/**
 * Puerto de components/templates/usd-halo/hero.tsx — mismo layout (card
 * `rounded-2xl` con margen de página, no full-bleed puro; overlays de
 * legibilidad arriba/abajo; headline+CTA arriba-izquierda). El marquee de
 * marcas que Halo pone al fondo del hero se retira de aquí — va en su
 * propia sección (ver IntegrationsMarquee), tal como pidió Christian.
 * El fondo cambia de imagen fija a video (futuro hyperlapse), ver HeroVideo.
 */
export function HeroSection({
  eyebrow,
  title,
  body,
  primaryCta,
  secondaryCta,
}: {
  eyebrow: string;
  title: string;
  body: string;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
}) {
  return (
    <section className="flex flex-1 items-end px-4 pb-4 pt-20 sm:px-6 sm:pb-6">
      <div
        className="relative mx-auto w-full max-w-[88rem] overflow-hidden rounded-2xl"
        style={{ height: "calc(100dvh - 96px)", minHeight: "560px" }}
      >
        <HeroVideo
          poster="/visual/home/hero-atacama-wide.webp"
          posterMobile="/visual/home/hero-atacama-mobile.webp"
          desktopSrc="/visual/home/hero-hyperlapse-desktop.mp4"
          mobileSrc="/visual/home/hero-hyperlapse-mobile.mp4"
          className="absolute inset-0 h-full w-full object-cover"
        />

        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-background/75 via-background/25 to-background/10"
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-background/80 via-background/30 to-transparent"
        />

        <div className="relative z-10 flex h-full flex-col items-start justify-start p-8 pt-32 sm:p-12 sm:pt-36">
          <p
            className="mb-4 text-sm font-medium uppercase tracking-[0.16em] text-copper"
            style={{ fontFamily: "var(--font-studio), Arial, sans-serif" }}
          >
            {eyebrow}
          </p>

          <h1
            className="mb-4 max-w-xl text-4xl font-medium leading-[1.05] text-ink sm:text-5xl md:text-6xl"
            style={{ letterSpacing: "-0.04em" }}
          >
            {title}
          </h1>

          <p
            className="mb-8 max-w-md text-base leading-relaxed text-ink/70 md:text-lg"
            style={{ fontFamily: "var(--font-inter), Arial, sans-serif" }}
          >
            {body}
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <PillButton href={primaryCta.href} large>
              {primaryCta.label}
            </PillButton>
            <a
              href={secondaryCta.href}
              className="text-base font-medium text-ink underline decoration-ink/30 underline-offset-4 transition-colors hover:text-action"
            >
              {secondaryCta.label}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
