"use client";

import { useReducedMotion } from "../motion/reduced-motion";

/**
 * H1 del Home (spec V3.0 §7): pieza atmosférica suave — topografía abstracta,
 * nodos discretos y una señal que ocasionalmente viaja. Decorativa, no un
 * dashboard ni un chat. SVG/CSS puro; sin señal cuando `prefers-reduced-motion`.
 */
export function Atmosphere() {
  const reduced = useReducedMotion();
  return (
    <svg className="mk-atmosphere" viewBox="0 0 640 500" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <path className="mk-atmosphere__line" d="M10 400 C 150 330, 210 370, 300 300 S 500 210, 630 240" />
      <path className="mk-atmosphere__line" d="M-10 460 C 130 420, 250 470, 370 410 S 550 350, 650 375" />
      <path
        id="mk-atm-path"
        className="mk-atmosphere__line"
        d="M110 320 C 220 270, 300 300, 410 240 S 560 190, 610 205"
      />

      <circle className="mk-atmosphere__node" cx="110" cy="320" r="4" />
      <circle className="mk-atmosphere__node mk-atmosphere__node--accent" cx="410" cy="240" r="5" />
      <circle className="mk-atmosphere__node" cx="610" cy="205" r="4" />
      <circle className="mk-atmosphere__node" cx="300" cy="300" r="3" />

      {!reduced ? (
        <circle r="3.5" className="mk-atmosphere__signal">
          <animateMotion dur="6s" begin="0.6s" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="linear">
            <mpath href="#mk-atm-path" />
          </animateMotion>
          <animate
            attributeName="opacity"
            values="0;1;1;0"
            keyTimes="0;0.06;0.9;1"
            dur="6s"
            begin="0.6s"
            repeatCount="indefinite"
          />
        </circle>
      ) : null}
    </svg>
  );
}
