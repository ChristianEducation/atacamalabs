"use client";

import { useReducedMotion } from "../motion/reduced-motion";

/**
 * Fallback del visual atmosférico del Home (V3.3 §8) mientras no exista el
 * video final: topografía abstracta, nodos discretos y una señal que viaja
 * lentamente. Decorativa, no un dashboard ni un chat. SVG/CSS puro; sin
 * señal cuando `prefers-reduced-motion`. Usar siempre a través de
 * `HomeAtmosphere`, que decide entre video real y este fallback.
 */
export function Atmosphere() {
  const reduced = useReducedMotion();
  return (
    <svg className="mk-atmosphere" viewBox="0 0 720 620" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <path className="mk-atmosphere__line" d="M0 480 C 160 400, 240 440, 340 360 S 560 260, 720 300" />
      <path className="mk-atmosphere__line" d="M-20 560 C 150 510, 290 560, 420 490 S 620 420, 740 450" />
      <path className="mk-atmosphere__line" d="M60 260 C 180 210, 260 230, 360 170 S 560 100, 700 130" />
      <path
        id="mk-atm-path"
        className="mk-atmosphere__line"
        d="M140 400 C 260 340, 340 370, 460 300 S 640 220, 700 235"
      />

      <circle className="mk-atmosphere__node" cx="140" cy="400" r="4" />
      <circle className="mk-atmosphere__node mk-atmosphere__node--accent" cx="460" cy="300" r="5" />
      <circle className="mk-atmosphere__node" cx="700" cy="235" r="4" />
      <circle className="mk-atmosphere__node" cx="360" cy="170" r="3" />
      <circle className="mk-atmosphere__node" cx="600" cy="120" r="3" />

      {!reduced ? (
        <circle r="3.5" className="mk-atmosphere__signal">
          <animateMotion dur="7s" begin="0.6s" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="linear">
            <mpath href="#mk-atm-path" />
          </animateMotion>
          <animate
            attributeName="opacity"
            values="0;1;1;0"
            keyTimes="0;0.06;0.9;1"
            dur="7s"
            begin="0.6s"
            repeatCount="indefinite"
          />
        </circle>
      ) : null}
    </svg>
  );
}
