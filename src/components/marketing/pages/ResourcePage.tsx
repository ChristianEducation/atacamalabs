import Link from "next/link";
import { DiagnosticLink } from "@/components/marketing/shell/DiagnosticLink";
import type { Resource } from "@/content/marketing/resources";

/**
 * Página de un recurso (/recursos/[slug]): ancho de lectura, sin demos ni motion.
 * El único CTA es el cierre, hacia el diagnóstico (conserva la página de origen).
 */
export function ResourcePage({ resource }: { resource: Resource }) {
  return (
    <section className="mk-section mk-t-paper mk-lg" aria-labelledby="page-title">
      <div className="mk-container">
        <article className="mk-lg-doc">
          <header className="mk-lg-head">
            <p className="mk-eyebrow">
              {resource.type.toUpperCase()} · {resource.readingTime}
            </p>
            <h1 id="page-title" className="mk-lg-title">
              {resource.title}
            </h1>
            <p className="mk-lg-intro">{resource.intro}</p>
          </header>

          {resource.sections.map((section) => (
            <section key={section.id} id={section.id} className="mk-lg-sec" aria-labelledby={`${section.id}-t`}>
              <h2 id={`${section.id}-t`}>{section.title}</h2>
              {section.paragraphs?.map((p) => (
                <p key={p}>{p}</p>
              ))}
              {section.criteria && (
                <ol className="mk-rs-criteria">
                  {section.criteria.map((c) => (
                    <li key={c.title} className="mk-rs-criterion">
                      <h3>{c.title}</h3>
                      <p className="mk-rs-question">{c.question}</p>
                      <p>{c.good}</p>
                    </li>
                  ))}
                </ol>
              )}
              {section.items && (
                <ul>
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          <aside className="mk-rs-cta" aria-labelledby="rs-cta-title">
            <h2 id="rs-cta-title">{resource.cta.heading}</h2>
            <p>{resource.cta.text}</p>
            <DiagnosticLink section="recurso-cierre" cta="contar-mi-caso" className="mk-btn mk-btn--primary">
              {resource.cta.button}
            </DiagnosticLink>
          </aside>

          <p className="mk-lg-updated">
            Última actualización: {resource.updated}. <Link href="/recursos" className="mk-link">Ver todos los recursos</Link>
          </p>
        </article>
      </div>
    </section>
  );
}
