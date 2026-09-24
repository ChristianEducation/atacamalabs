import { BarChart3, Gauge, Palette, Plug, Plus, Search, Smartphone, type LucideIcon } from "lucide-react";
import { SectionHeading } from "../ui/Blocks";
import { Reveal } from "../motion/Reveal";
import {
  WEB_FAQ,
  WEB_FAQ_HEADING,
  WEB_INCLUDES,
  WEB_INCLUDES_HEADING,
  WEB_PROCESS,
  WEB_PROCESS_HEADING,
} from "@/content/marketing/web-page";

const INCLUDE_ICONS: Record<(typeof WEB_INCLUDES)[number]["key"], LucideIcon> = {
  design: Palette,
  responsive: Smartphone,
  seo: Search,
  performance: Gauge,
  analytics: BarChart3,
  integrations: Plug,
};

/** Qué incluye una web Atacama — SPEC_WEB §7: lista editorial de dos columnas, sin grilla de cards. */
export function WebsiteIncludes() {
  return (
    <section className="mk-section mk-t-paper" aria-labelledby="web-includes-title">
      <div className="mk-container">
        <SectionHeading
          id="web-includes-title"
          center
          eyebrow={WEB_INCLUDES_HEADING.eyebrow}
          title={WEB_INCLUDES_HEADING.title}
        />
        <ul className="mk-web-includes">
          {WEB_INCLUDES.map((item, i) => {
            const Icon = INCLUDE_ICONS[item.key];
            return (
              <Reveal as="li" key={item.key} delay={(i % 2) * 100} className="mk-rv-ia mk-web-includes__item">
                <span className="mk-web-includes__ic">
                  <Icon size={19} strokeWidth={1.8} aria-hidden />
                </span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </div>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/** Proceso de cuatro pasos — SPEC_WEB §8: círculo numerado + línea que conecta pasos en desktop. */
export function WebsiteProcess() {
  return (
    <section className="mk-section mk-t-sand" aria-labelledby="web-process-title">
      <div className="mk-container">
        <SectionHeading
          id="web-process-title"
          center
          eyebrow={WEB_PROCESS_HEADING.eyebrow}
          title={WEB_PROCESS_HEADING.title}
        />
        <ol className="mk-web-process">
          {WEB_PROCESS.map((step, i) => (
            <Reveal as="li" key={step.title} delay={i * 100} className="mk-rv-ia mk-web-process__step">
              <div className="mk-web-process__head">
                <span className="mk-web-process__num">{String(i + 1).padStart(2, "0")}</span>
                {i < WEB_PROCESS.length - 1 ? <span className="mk-web-process__line" aria-hidden /> : null}
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

/** FAQ — SPEC_WEB §10: `<details>` accesible, hover discreto e icono que rota al abrir. */
export function WebsiteFaq() {
  return (
    <section className="mk-section mk-t-paper" aria-labelledby="web-faq-title">
      <div className="mk-container mk-web-faq-wrap">
        <SectionHeading id="web-faq-title" center eyebrow={WEB_FAQ_HEADING.eyebrow} title={WEB_FAQ_HEADING.title} />
        <div className="mk-web-faq">
          {WEB_FAQ.map((item) => (
            <details key={item.question} className="mk-web-faq__item">
              <summary>
                <span>{item.question}</span>
                <Plus size={20} aria-hidden className="mk-web-faq__icon" />
              </summary>
              <div className="mk-web-faq__body">{item.answer}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
