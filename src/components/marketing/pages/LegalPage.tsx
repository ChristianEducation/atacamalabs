import Link from "next/link";
import { LEGAL_CONTACT, LEGAL_UPDATED, type LegalBlock, type LegalDoc } from "@/content/marketing/legal";

function Block({ block }: { block: LegalBlock }) {
  switch (block.type) {
    case "p":
      return <p>{block.text}</p>;
    case "lead":
      return <p className="mk-lg-lead">{block.text}</p>;
    case "list":
      return (
        <ul>
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    case "contact":
      return (
        <p>
          Contacto:{" "}
          <a href={`mailto:${LEGAL_CONTACT}`} className="mk-link">
            {LEGAL_CONTACT}
          </a>
        </p>
      );
    case "link":
      return (
        <p>
          {block.before}
          <Link href={block.href} className="mk-link">
            {block.label}
          </Link>
          {block.after}
        </p>
      );
  }
}

/**
 * Página legal (Privacidad, Términos): ancho de lectura, sin CTAs ni motion.
 * PAGINAS_AUXILIARES_SPEC_V1 §0.
 */
export function LegalPage({ doc }: { doc: LegalDoc }) {
  return (
    <section className="mk-section mk-t-paper mk-lg" aria-labelledby="page-title">
      <div className="mk-container">
        <article className="mk-lg-doc">
          <header className="mk-lg-head">
            <p className="mk-eyebrow">{doc.eyebrow}</p>
            <h1 id="page-title" className="mk-lg-title">
              {doc.h1}
            </h1>
            <p className="mk-lg-intro">{doc.intro}</p>
          </header>

          <nav className="mk-lg-toc" aria-label="En esta página">
            <p className="mk-lg-toc__label">En esta página</p>
            <ol>
              {doc.sections.map((section) => (
                <li key={section.id}>
                  <a href={`#${section.id}`}>{section.title}</a>
                </li>
              ))}
            </ol>
          </nav>

          {doc.sections.map((section, index) => (
            <section key={section.id} id={section.id} className="mk-lg-sec" aria-labelledby={`${section.id}-t`}>
              <h2 id={`${section.id}-t`}>
                <span aria-hidden>{index + 1}.</span> {section.title}
              </h2>
              {section.blocks.map((block, i) => (
                <Block key={i} block={block} />
              ))}
            </section>
          ))}

          <p className="mk-lg-updated">Última actualización: {LEGAL_UPDATED}</p>
        </article>
      </div>
    </section>
  );
}
