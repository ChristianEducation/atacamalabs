import type { Metadata } from "next";
import Link from "next/link";
import { RESOURCES } from "@/content/marketing/resources";
import { pageMetadata } from "@/lib/seo-metadata";

export const metadata: Metadata = pageMetadata({
  title: "Recursos para automatizar tu empresa | Atacama Labs",
  description: "Checklists y guías cortas de Atacama Labs para decidir qué automatizar, cómo partir y qué evitar. Prácticas y sin humo.",
  path: "/recursos",
});

/** /recursos — índice sobrio de recursos prácticos (Resource & Conversation Engine v1). */
export default function RecursosPage() {
  return (
    <section className="mk-section mk-t-paper mk-lg" aria-labelledby="page-title">
      <div className="mk-container">
        <div className="mk-lg-doc">
          <header className="mk-lg-head">
            <p className="mk-eyebrow">RECURSOS</p>
            <h1 id="page-title" className="mk-lg-title">
              Recursos para automatizar con criterio
            </h1>
            <p className="mk-lg-intro">Material corto y práctico que usamos con empresas reales. Sin registro para leerlo.</p>
          </header>
          <ul className="mk-rs-list">
            {RESOURCES.map((r) => (
              <li key={r.slug} className="mk-rs-item">
                <p className="mk-rs-type">
                  {r.type} · {r.readingTime}
                </p>
                <h2>
                  <Link href={`/recursos/${r.slug}`} className="mk-link">
                    {r.title}
                  </Link>
                </h2>
                <p>{r.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
