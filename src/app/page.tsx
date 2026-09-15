import Image from "next/image";

const nav = [
  "Soluciones",
  "Casos",
  "Cómo trabajamos",
  "Nosotros",
];

export default function Home() {
  return (
    <div className="flex flex-col flex-1 bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-[var(--container-max)] items-center justify-between gap-6 px-5 py-4 sm:px-8">
          <Image
            src="/brand/logo-horizontal.svg"
            alt="Atacama Labs"
            width={168}
            height={42}
            priority
          />
          <nav className="hidden items-center gap-8 text-sm font-medium text-ink md:flex">
            {nav.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </nav>
          <span className="hidden rounded-full bg-action px-5 py-2.5 text-sm font-medium text-white sm:inline-block">
            Conversemos
          </span>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto grid max-w-[var(--container-max)] items-center gap-10 px-5 py-12 sm:px-8 md:grid-cols-2 md:py-20">
          <div className="order-2 md:order-1">
            <p className="text-sm font-medium uppercase tracking-[0.16em] text-copper">
              Desde Antofagasta
            </p>
            <h1 className="mt-4 text-[clamp(2.375rem,6vw,4.75rem)] font-semibold leading-[1.05] text-ink">
              Soluciones que{" "}
              <span className="text-copper">mueven tu negocio.</span>
            </h1>
            <p className="mt-6 max-w-[38ch] text-lg leading-8 text-muted">
              Ayudamos a empresas a mejorar sus procesos comerciales y
              operativos con software, integraciones y automatización a
              medida.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <span className="inline-flex h-11 items-center justify-center rounded-lg bg-action px-6 text-sm font-medium text-white">
                Conversemos sobre tu proceso
              </span>
              <span className="inline-flex h-11 items-center justify-center rounded-lg border border-border-control px-6 text-sm font-medium text-ink">
                Ver casos
              </span>
            </div>
          </div>

          <div className="order-1 md:order-2">
            <HeroRelief />
          </div>
        </section>
      </main>
    </div>
  );
}

/**
 * Composición vectorial propia de relieve (crestas topográficas por capas),
 * placeholder de hero mientras se cierra la fotografía final —
 * docs/DESIGN-SYSTEM.md §Home y hero.
 */
function HeroRelief() {
  return (
    <svg
      viewBox="0 0 640 480"
      role="img"
      aria-label="Relieve de cerros del desierto de Atacama, ilustración"
      className="w-full rounded-2xl"
    >
      <rect width="640" height="480" fill="#EDE3D6" />
      <path
        d="M0 320 C90 260 160 300 230 260 C300 220 340 150 420 170 C480 185 520 240 640 210 L640 480 L0 480 Z"
        fill="#D9C4B1"
      />
      <path
        d="M0 360 C110 320 180 360 260 330 C340 300 380 240 460 250 C530 259 560 300 640 280 L640 480 L0 480 Z"
        fill="#B87656"
        opacity="0.55"
      />
      <path
        d="M0 400 C120 380 210 410 300 390 C390 370 420 330 500 335 C560 339 590 360 640 350 L640 480 L0 480 Z"
        fill="#9A5F3B"
        opacity="0.45"
      />
      <g fill="none" stroke="#4E2E1E" strokeWidth="2.5" strokeLinecap="round" opacity="0.6">
        <path d="M40 300 C120 250 180 280 240 250 C310 215 350 160 420 178" />
        <path d="M60 316 C136 268 194 296 252 268 C320 234 358 182 424 198" />
      </g>
    </svg>
  );
}
