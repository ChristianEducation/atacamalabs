import { SectionHeading } from "../ui/Blocks";
import { Reveal } from "../motion/Reveal";
import { CUSTOM_STEPS, CUSTOM_STEPS_HEADING } from "@/content/marketing/custom-page";

/** Implementación breve — SPEC_A_MEDIDA §8: cinco pasos, horizontal en desktop y vertical en mobile, con reveal al scroll. */
export function CustomSteps() {
  return (
    <section className="mk-section mk-t-sand" aria-labelledby="custom-steps-title">
      <div className="mk-container">
        <SectionHeading
          id="custom-steps-title"
          center
          eyebrow={CUSTOM_STEPS_HEADING.eyebrow}
          title={CUSTOM_STEPS_HEADING.title}
        />
        <ol className="mk-cu-steps">
          {CUSTOM_STEPS.map((step, i) => (
            <Reveal as="li" key={step.title} delay={i * 100} className="mk-rv-ia mk-cu-steps__item">
              <div className="mk-cu-steps__head">
                <span className="mk-cu-steps__num">{String(i + 1).padStart(2, "0")}</span>
                {i < CUSTOM_STEPS.length - 1 ? <span className="mk-cu-steps__line" aria-hidden /> : null}
              </div>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
