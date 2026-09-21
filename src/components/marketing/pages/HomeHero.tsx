"use client";

import { ButtonLink } from "../ui/Button";
import { DemoFrame } from "../demos/DemoFrame";
import { HeroDemoBody, controlsOf } from "../demos/ScenarioDemos";
import { useDemoClock } from "../motion/useDemoClock";
import { CHAT_TIMELINE } from "@/content/marketing/fixtures";

/** M04: cinco verbos + «trabajan» (SSR, reduced y estado final). Hold 2800 + transición 240. */
const WORDS = ["trabajan", "venden", "cobran", "coordinan", "consultan", "actualizan"] as const;
const WORD_MS = 3040;
const CYCLE_MS = WORD_MS * WORDS.length;

/**
 * F1 — Hero: agente + acción visible. El rotor (M04) y la conversación (M05)
 * comparten un solo reloj y el botón «Pausar animación»: pausar congela ambos.
 * Máximo dos ciclos; luego estado final («trabajan» + resultado) y `Repetir`.
 * H1 accesible estable: el claim completo, sin rotación anunciada.
 */
export function HomeHero() {
  const [attach, clock] = useDemoClock<HTMLDivElement>({ id: "home-hero", duration: CYCLE_MS, cycles: 2, autoplay: true });
  const complete = clock.state === "complete";
  const wordIndex = complete ? 0 : Math.min(WORDS.length - 1, Math.floor(clock.t / WORD_MS));
  const chatT = complete ? CHAT_TIMELINE.complete : Math.min(clock.t, CHAT_TIMELINE.complete);

  return (
    <section className="mk-hero" aria-labelledby="hero-title">
      <div className="mk-container mk-hero__grid">
        <div className="mk-hero__copy">
          <p className="mk-eyebrow">Agentes para tu empresa</p>
          <h1 id="hero-title" className="mk-display mk-hero__title">
            <span className="mk-sr-only">Agentes que realmente trabajan en tu empresa.</span>
            <span aria-hidden className="mk-hero__visual-title">
              <span className="mk-hero__line">Agentes que realmente</span>
              <span className="mk-rotor">
                {WORDS.map((word, i) => (
                  <span key={word} className={i === wordIndex ? "mk-rotor__word is-active" : "mk-rotor__word"}>
                    {word}
                  </span>
                ))}
              </span>
              <span className="mk-hero__line">en tu empresa.</span>
            </span>
          </h1>
          <p className="mk-lead mk-hero__lead">
            Se conectan a las herramientas que ya utilizas, consultan información y ejecutan acciones dentro de tus
            procesos. Tú defines reglas, permisos y cuándo interviene una persona.
          </p>
          <div className="mk-hero__actions">
            <ButtonLink href="/agentes" arrow>
              Ver agentes
            </ButtonLink>
            <ButtonLink href="/diagnostico" variant="secondary">
              Agendar diagnóstico
            </ButtonLink>
          </div>
          <p className="mk-small mk-muted mk-hero__note">
            Si el sistema se puede integrar de forma segura y tiene los permisos necesarios, el agente puede trabajar con él.
          </p>
        </div>

        <div className="mk-hero__product" ref={attach}>
          <DemoFrame
            title="Agente en un proceso"
            controls={controlsOf(clock)}
            product
            pauseLabel="Pausar animación"
            resultLabel="Ver cómo registra"
            className="mk-frame--hero"
          >
            <HeroDemoBody t={chatT} />
          </DemoFrame>
        </div>
      </div>
    </section>
  );
}
