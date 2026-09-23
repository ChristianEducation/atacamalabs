import type { Metadata } from "next";
import { ProcessSteps } from "@/components/marketing/pages/Common";
import { HeroShell } from "@/components/marketing/pages/HeroShell";
import { Atmosphere } from "@/components/marketing/pages/Atmosphere";
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
 * /conocenos (V3.0.1 §12 + V3.3 §16, N1–N5). La página más de marca: aquí sí
 * se permite recuperar la sensación Atacama · norte · desierto · precisión,
 * sin clichés turísticos y sin demos de producto. Hero Gradient (Atmosphere
 * quieta, sin protagonismo de producto) → Filosofía (Deep Tech) → Qué
 * hacemos (Paper) → Cómo trabajamos (Blue Mist) → CTA.
 */
export default function AboutPage() {
  return (
    <>
      <HeroShell
        size="m"
        eyebrow="ATACAMA LABS"
        title={
          <>
            Tecnología para el trabajo <span className="mk-hero__accent">real</span>.
          </>
        }
        lead="Construimos agentes, automatizaciones y software alrededor de procesos que las empresas usan todos los días."
        trust="Desde Antofagasta, para empresas que quieren trabajar mejor con tecnología."
        actions={[{ label: "Hablemos", href: "/diagnostico" }]}
        visual={<Atmosphere />}
      />

      <section className="mk-section--md mk-t-deep" aria-labelledby="n2-title">
        <div className="mk-container mk-close">
          <SectionHeading id="n2-title" center title="Primero entendemos el trabajo. Después elegimos la tecnología." />
        </div>
      </section>

      <section className="mk-section--md mk-t-paper" aria-labelledby="n3-title">
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

      <section className="mk-section--md mk-t-mist" aria-labelledby="n4-title">
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
