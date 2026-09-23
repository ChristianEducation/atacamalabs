import type { Metadata } from "next";
import { PageHero, ProcessSteps } from "@/components/marketing/pages/Common";
import { CTABlock, SectionHeading } from "@/components/marketing/ui/Blocks";
import { Reveal } from "@/components/marketing/motion/Reveal";
import { CUSTOM_PROCESS } from "@/content/marketing/custom";

export const metadata: Metadata = {
  title: "Conócenos — Atacama Labs",
  description:
    "Construimos agentes, automatizaciones y software alrededor de procesos que las empresas usan todos los días.",
  alternates: { canonical: "/conocenos" },
};

const WHAT_WE_DO = [
  { title: "Agentes", body: "Conversan, consultan y ejecutan dentro de tus herramientas." },
  { title: "Integraciones", body: "Conectan tus sistemas para que la información fluya." },
  { title: "Software a medida", body: "Herramientas construidas alrededor de tu proceso." },
  { title: "Web", body: "Sitios claros, rápidos y conectables." },
] as const;

/**
 * /conocenos (spec V3.0 §12, N1–N5). La página más de marca: aquí sí se
 * permite recuperar la sensación Atacama · norte · desierto · precisión, sin
 * clichés turísticos y sin demos de producto.
 */
export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="ATACAMA LABS"
        title="Tecnología para el trabajo real."
        lead="Construimos agentes, automatizaciones y software alrededor de procesos que las empresas usan todos los días."
        actions={[{ label: "Hablemos", href: "/diagnostico" }]}
        note="Desde Antofagasta, para empresas que quieren trabajar mejor con tecnología."
        center
      />

      <section className="mk-section--md mk-paper" aria-labelledby="n2-title">
        <div className="mk-container mk-close">
          <SectionHeading id="n2-title" center title="Primero entendemos el trabajo. Después elegimos la tecnología." />
        </div>
      </section>

      <section className="mk-section--md" aria-labelledby="n3-title">
        <div className="mk-container">
          <SectionHeading id="n3-title" title="Qué hacemos." />
          <ul className="mk-ideas">
            {WHAT_WE_DO.map((item, i) => (
              <Reveal as="li" key={item.title} delay={Math.min(i * 70, 210)}>
                <strong style={{ display: "block", fontSize: 16, marginBottom: 4 }}>{item.title}</strong>
                <span style={{ fontFamily: "var(--font-sans)", fontSize: 15, color: "var(--muted)" }}>{item.body}</span>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      <section className="mk-section--md mk-paper" aria-labelledby="n4-title">
        <div className="mk-container">
          <SectionHeading id="n4-title" title="Cómo trabajamos." />
          <ProcessSteps steps={CUSTOM_PROCESS} />
        </div>
      </section>

      <CTABlock
        title="Hablemos de cómo trabaja tu empresa."
        body="Cuéntanos qué proceso quieres mejorar."
        cta={{ label: "Agendar diagnóstico", href: "/diagnostico" }}
      />
    </>
  );
}
