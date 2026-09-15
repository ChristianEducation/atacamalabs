/**
 * Composición vectorial propia de relieve (crestas topográficas por capas),
 * placeholder de hero mientras se cierra la fotografía final —
 * docs/DESIGN-SYSTEM.md §Home y hero.
 */
export function HeroRelief() {
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
