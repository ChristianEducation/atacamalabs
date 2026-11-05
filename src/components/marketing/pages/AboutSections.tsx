import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "../motion/Reveal";
import { ABOUT_CAPABILITIES, ABOUT_NORTH, ABOUT_ORIGIN, ABOUT_PRINCIPLES, ABOUT_SEAL } from "@/content/marketing/about";

/* ---------- Construido desde el norte: abre la página ---------- */

export function AboutNorth() {
  return (
    <section className="mk-section mk-t-mist mk-ab-north" aria-labelledby="about-north-title">
      <span className="mk-ab-north__mark" aria-hidden />
      <span className="mk-ab-north__mark mk-ab-north__mark--b" aria-hidden />
      <span className="mk-ab-north__mark mk-ab-north__mark--c" aria-hidden />

      {/* Apertura a pantalla completa: título, párrafo y la fotografía del norte. */}
      <div className="mk-ab-north__hero">
        <div className="mk-container mk-ab-north__inner">
          <Reveal className="mk-ab-north__head">
            <p className="mk-eyebrow">{ABOUT_NORTH.eyebrow}</p>
            <h1 id="about-north-title" className="mk-ab-h2 mk-ab-h2--hero">
              {ABOUT_NORTH.title}
            </h1>
            <p className="mk-ab-north__body">{ABOUT_NORTH.body}</p>
          </Reveal>
        </div>
        <div className="mk-ab-north__photo" aria-hidden>
          <Image
            src="/visual/home/hero-atacama-wide.webp"
            alt=""
            fill
            priority
            sizes="(min-width: 1024px) 62vw, 100vw"
            className="mk-ab-north__img"
          />
        </div>
        <span className="mk-ab-north__coords" aria-hidden>
          {ABOUT_NORTH.coords}
        </span>
      </div>

      <div className="mk-container mk-ab-north__inner">
        <div className="mk-ab-ev">
          <Reveal>
            <h2 className="mk-ab-ev__title">{ABOUT_NORTH.evidenceTitle}</h2>
          </Reveal>
          <ul className="mk-ab-ev__list">
            {ABOUT_NORTH.evidence.map((item, index) => (
              <Reveal key={item.title} as="li" delay={index * 120} className="mk-ab-ev__item">
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ---------- Nuestro origen ---------- */

export function AboutOrigin() {
  return (
    <section className="mk-section mk-t-paper mk-ab-origin" aria-labelledby="about-origin-title">
      <div className="mk-container mk-ab-origin__grid">
        <Reveal className="mk-ab-origin__head">
          <p className="mk-eyebrow">{ABOUT_ORIGIN.eyebrow}</p>
          <h2 id="about-origin-title" className="mk-ab-h2">
            {ABOUT_ORIGIN.title}
          </h2>
        </Reveal>
        <div className="mk-ab-origin__body">
          {ABOUT_ORIGIN.paragraphs.map((text, index) => (
            <Reveal key={text} as="p" delay={index * 110 + 80} className="mk-ab-origin__p">
              {text}
            </Reveal>
          ))}
          <Reveal delay={260} className="mk-ab-origin__exp">
            <p>{ABOUT_ORIGIN.experience.label}</p>
            <ul>
              {ABOUT_ORIGIN.experience.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ---------- Cómo trabajamos ---------- */

export function AboutPrinciples() {
  return (
    <section className="mk-section mk-t-sand mk-ab-principles" aria-labelledby="about-principles-title">
      <div className="mk-container">
        <Reveal className="mk-ab-head">
          <p className="mk-eyebrow">{ABOUT_PRINCIPLES.eyebrow}</p>
          <h2 id="about-principles-title" className="mk-ab-h2">
            {ABOUT_PRINCIPLES.title}
          </h2>
        </Reveal>
        <ol className="mk-ab-pr">
          {ABOUT_PRINCIPLES.items.map((item, index) => (
            <Reveal key={item.number} as="li" delay={index * 120} className="mk-ab-pr__item">
              <span className="mk-ab-pr__num" aria-hidden>
                {item.number}
              </span>
              <h3 className="mk-ab-pr__title">{item.title}</h3>
              <p className="mk-ab-pr__body">{item.body}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ---------- Capacidades ---------- */

export function AboutCapabilities() {
  return (
    <section className="mk-section mk-t-paper mk-ab-cap" aria-labelledby="about-cap-title">
      <div className="mk-container">
        <Reveal className="mk-ab-head">
          <p className="mk-eyebrow">{ABOUT_CAPABILITIES.eyebrow}</p>
          <h2 id="about-cap-title" className="mk-ab-h2">
            {ABOUT_CAPABILITIES.title}
          </h2>
          <p className="mk-ab-lead">{ABOUT_CAPABILITIES.lead}</p>
        </Reveal>
        <ul className="mk-ab-cap__grid">
          {ABOUT_CAPABILITIES.items.map((item, index) => (
            <Reveal key={item.id} as="li" delay={(index % 2) * 100} className="mk-ab-cap__item">
              <h3>{item.title}</h3>
              <p>{item.body}</p>
              <Link href={item.link.href} className="mk-ab-link">
                {item.link.label}
                <ArrowRight size={16} strokeWidth={2} aria-hidden />
              </Link>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---------- Sello de marca: el lema con el logo ---------- */

/**
 * El logo de Atacama completo y nítido, con dos ecos desenfocados detrás que le
 * dan profundidad, apoyado en un horizonte. Cierra la página antes del CTA.
 */
function LogoEcho() {
  return (
    <svg
      className="mk-ab-seal__art"
      viewBox="58 0 144 92"
      preserveAspectRatio="xMidYMax meet"
      aria-hidden
      focusable="false"
    >
      <defs>
        <linearGradient id="ab-fade" gradientUnits="userSpaceOnUse" x1="58" x2="112" y1="0" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#fff" stopOpacity="1" />
        </linearGradient>
        <mask id="ab-mask" maskUnits="userSpaceOnUse" x="58" y="0" width="144" height="92">
          <rect x="58" width="144" height="92" fill="url(#ab-fade)" />
        </mask>
        <linearGradient id="ab-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#dfe9fb" stopOpacity="0.9" />
          <stop offset="1" stopColor="#dfe9fb" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="ab-halo" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <filter id="ab-blur-a" x="-20%" y="-30%" width="140%" height="160%">
          <feGaussianBlur stdDeviation="0.9" />
        </filter>
        <filter id="ab-blur-b" x="-30%" y="-40%" width="160%" height="180%">
          <feGaussianBlur stdDeviation="2.4" />
        </filter>
        <symbol id="ab-logo" viewBox="0 0 130 64">
          <path d="M42 24 L66 0 L130 64 L119 64 L66 11 L42 35 Z" />
          <path d="M0 64 L32 32 L52 52 L52 63 L32 43 L13 64 Z" />
          <path d="M53 31 L86 64 L75 64 L53 42 Z" />
        </symbol>
      </defs>
      <g mask="url(#ab-mask)">
        <ellipse cx="150" cy="56" rx="60" ry="34" fill="url(#ab-halo)" />
        <use
          href="#ab-logo"
          x="66"
          y="6"
          width="128"
          height="63"
          fill="#9dbdf8"
          opacity="0.38"
          filter="url(#ab-blur-b)"
        />
        <use
          href="#ab-logo"
          x="78"
          y="17"
          width="108"
          height="53.2"
          fill="#7ea8f6"
          opacity="0.5"
          filter="url(#ab-blur-a)"
        />
        <rect x="58" y="80" width="144" height="12" fill="url(#ab-ground)" />
        <line x1="58" x2="202" y1="80" y2="80" stroke="#0b1324" strokeOpacity="0.16" strokeWidth="0.18" />
      </g>
      <use href="#ab-logo" x="90" y="32.7" width="96" height="47.3" fill="#0f5ced" />
    </svg>
  );
}

export function AboutSeal() {
  return (
    <section className="mk-section mk-t-paper mk-ab-seal" aria-labelledby="about-seal-title">
      <div className="mk-container mk-ab-seal__grid">
        <Reveal className="mk-ab-seal__copy">
          <h2 id="about-seal-title" className="mk-ab-h2 mk-ab-h2--xl">
            Tecnología para el trabajo <span className="mk-hero__accent">{ABOUT_SEAL.accent}</span>.
          </h2>
          <p className="mk-ab-lead">{ABOUT_SEAL.lead}</p>
          <p className="mk-ab-seal__place">{ABOUT_SEAL.place}</p>
        </Reveal>
        <Reveal delay={120} className="mk-ab-seal__visual">
          <LogoEcho />
        </Reveal>
      </div>
    </section>
  );
}
