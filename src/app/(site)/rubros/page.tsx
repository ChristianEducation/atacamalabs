import type { Metadata } from "next";
import { ActionReceipt } from "@/components/marketing/demos/chat";
import { IndustryDirectory } from "@/components/marketing/pages/IndustrySearch";
import { ButtonLink } from "@/components/marketing/ui/Button";
import { CTABlock } from "@/components/marketing/ui/Blocks";
import { Reveal } from "@/components/marketing/motion/Reveal";

export const metadata: Metadata = {
  title: "Rubros — Atacama Labs",
  description:
    "Explora agentes, automatizaciones y software para educación, salud, comercio y empresas de servicios. Soluciones adaptadas a cada operación.",
  alternates: { canonical: "/rubros" },
};

const RECEIPTS = [
  { title: "Consultar", receipt: { id: "DEMO-R01", area: "Información", status: "Consultada" } },
  { title: "Coordinar", receipt: { id: "DEMO-R02", area: "Equipo", status: "Asignada" } },
  { title: "Registrar", receipt: { id: "DEMO-R03", area: "Registro", status: "Guardada" } },
];

export default function IndustriesHubPage() {
  return (
    <>
      <section className="mk-hero mk-hero--inner" aria-labelledby="page-title">
        <div className="mk-container mk-ind-hero">
          <div className="mk-hero__copy">
            <p className="mk-eyebrow">INDUSTRIAS</p>
            <h1 id="page-title" className="mk-h1 mk-hero__h1 mk-ind-hero__h1">
              Distintos rubros. Procesos que podemos mejorar.
            </h1>
            <p className="mk-lead mk-hero__lead">
              Atención, coordinación y trabajo interno: combinamos agentes, automatizaciones y soluciones a medida según
              tu contexto.
            </p>
            <div className="mk-hero__actions">
              <ButtonLink href="#sectores" arrow>
                Encontrar mi rubro
              </ButtonLink>
            </div>
          </div>
          <div className="mk-ind-hero__receipts">
            {RECEIPTS.map((r, i) => (
              <Reveal key={r.title} delay={i * 70}>
                <ActionReceipt receipt={r.receipt} title={r.title} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <IndustryDirectory />

      <CTABlock
        title="¿Tu rubro no está aquí?"
        body="Cuéntanos cómo trabaja tu empresa. Empezamos por el proceso, no por una categoría."
        cta={{ label: "Revisar mi proceso", href: "/diagnostico" }}
      />
    </>
  );
}
