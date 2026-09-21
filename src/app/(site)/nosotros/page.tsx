import type { Metadata } from "next";
import Link from "next/link";
import { Cable, MapPin, School } from "lucide-react";
import { PageHero, ProcessSteps } from "@/components/marketing/pages/Common";
import { ActivityTicker } from "@/components/marketing/pages/AboutSections";
import { CTABlock, SectionHeading } from "@/components/marketing/ui/Blocks";
import { Reveal } from "@/components/marketing/motion/Reveal";
import { CUSTOM_PROCESS } from "@/content/marketing/custom";
import { BRAND } from "@/content/marketing/nav";

export const metadata: Metadata = {
  title: "Conócenos — Atacama Labs",
  description:
    "Atacama Labs diseña agentes, automatizaciones y software para procesos reales. Desde Antofagasta, trabajamos con empresas que quieren ordenar su operación.",
  alternates: { canonical: "/nosotros" },
};

const PRINCIPLES = [
  { title: "El proceso primero.", body: "Entendemos el trabajo antes de elegir herramientas." },
  { title: "Alcance claro.", body: "Definimos qué resolverá la primera versión y cómo se revisará." },
  { title: "Sistemas conectados.", body: "Conservamos lo que funciona y evaluamos cómo integrar el resto." },
  {
    title: "Control para el equipo.",
    body: "Diseñamos información, acciones y derivaciones que puedan comprenderse y revisarse.",
  },
] as const;

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="ATACAMA LABS"
        title="Tecnología que entiende el trabajo detrás del negocio."
        lead="Somos un estudio de tecnología enfocado en agentes, automatización y software a medida. Partimos del proceso para construir herramientas que tengan sentido en la operación."
        actions={[{ label: "Conversemos", href: "/diagnostico" }]}
        note={BRAND.origin}
        split="6-6"
      >
        <ActivityTicker />
      </PageHero>

      <section className="mk-section--md" aria-labelledby="prin-title">
        <div className="mk-container">
          <SectionHeading id="prin-title" title="Cómo decidimos qué construir." />
          <ol className="mk-about-bento">
            {PRINCIPLES.map((p, i) => (
              <Reveal as="li" key={p.title} delay={i * 70} className={`mk-about-bento__item mk-about-bento__item--${i + 1}`}>
                <span className="mk-steps__num" aria-hidden>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mk-h5">{p.title}</h3>
                <p>{p.body}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <section className="mk-section--md mk-paper" aria-labelledby="exp-title">
        <div className="mk-container">
          <SectionHeading id="exp-title" title="Nos interesan los procesos que realmente se usan." />
          <ul className="mk-about-facts">
            <li>
              <School size={20} aria-hidden /> Experiencia aplicada a educación
            </li>
            <li>
              <MapPin size={20} aria-hidden /> Desde Antofagasta
            </li>
            <li>
              <Cable size={20} aria-hidden /> Agentes y sistemas conectados
            </li>
          </ul>
          <p className="mk-lead mk-about-lead">
            Nuestra experiencia incluye plataformas y procesos operativos vinculados a educación. Ese enfoque práctico
            guía cómo abordamos atención, coordinación e información en otras empresas.
          </p>
          <p className="mk-ag-cta">
            <Link href="/rubros/educacion" className="mk-link">
              Explorar Educación
            </Link>
          </p>
        </div>
      </section>

      <section id="como-trabajamos" className="mk-section--md" aria-labelledby="how-title">
        <div className="mk-container">
          <div className="mk-about-how">
            <div className="mk-ag-copy">
              <h2 id="how-title" className="mk-h2">
                Tecnología y criterio para tu operación.
              </h2>
              <p className="mk-lead">
                Combinamos diseño, desarrollo e integración para que la solución responda a un proceso real.
              </p>
            </div>
            <div className="mk-about-how__cards">
              <div className="mk-plat-card">
                <h3 className="mk-h5">Diseño y desarrollo</h3>
                <p className="mk-muted">Definimos el flujo y la interfaz, y construimos por partes que puedas revisar.</p>
              </div>
              <div className="mk-plat-card">
                <h3 className="mk-h5">Integración y operación</h3>
                <p className="mk-muted">Conectamos los sistemas acordados y dejamos claro cómo operar la solución.</p>
              </div>
            </div>
          </div>
          <div className="mk-about-method">
            <ProcessSteps steps={CUSTOM_PROCESS} />
          </div>
          <p className="mk-ag-cta">
            <Link href="/diagnostico" className="mk-link">
              Iniciar diagnóstico
            </Link>
          </p>
        </div>
      </section>

      <CTABlock
        title="Hablemos de cómo trabaja tu empresa."
        body="Un proceso concreto es un buen lugar para empezar."
        cta={{ label: "Agendar diagnóstico", href: "/diagnostico" }}
      />
    </>
  );
}
