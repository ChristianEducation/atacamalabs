import type { Metadata } from "next";
import Link from "next/link";
import { ContextContact, PageHero } from "@/components/marketing/pages/Common";
import { CustomModules } from "@/components/marketing/pages/CustomSections";
import { BuilderDemo } from "@/components/marketing/demos/BuilderDemo";
import { CTABlock, FAQ, RelatedServices, SectionHeading } from "@/components/marketing/ui/Blocks";
import { CUSTOM_FAQ, CUSTOM_META } from "@/content/marketing/custom";

export const metadata: Metadata = {
  title: "Automatizaciones a Medida — Atacama Labs",
  description: CUSTOM_META,
  alternates: { canonical: "/a-medida" },
};

export default function CustomPage() {
  return (
    <>
      <PageHero
        eyebrow="A MEDIDA"
        title="Cuéntanos el proceso. Diseñamos el sistema."
        lead="Conectamos herramientas, automatizamos tareas y construimos las interfaces que tu equipo necesita para trabajar."
        actions={[
          { label: "Conversemos sobre tu proceso", href: "/diagnostico?necesidad=a-medida" },
          { label: "Ver una solución", href: "#idea-a-sistema", variant: "secondary" },
        ]}
        center
      >
        <BuilderDemo />
      </PageHero>

      <section id="idea-a-sistema" className="mk-section mk-paper" aria-labelledby="sys-title">
        <div className="mk-container">
          <SectionHeading
            id="sys-title"
            title="De la necesidad al sistema."
            lead="Elige un escenario y consulta cada etapa: flujo, tipos de solución, proceso e interfaz de trabajo."
          />
          <CustomModules />
          <p className="mk-ag-cta">
            <Link className="mk-link" href="/diagnostico?necesidad=a-medida">
              Diseñar algo así para mi empresa
            </Link>
          </p>
        </div>
      </section>

      <ContextContact
        lead="Cuéntanos qué proceso necesitas conectar."
        initial={{ need: "a-medida" }}
      />

      <CTABlock
        title="Si hoy lo resuelves entre planillas y mensajes, conversemos."
        body="Revisamos el proceso contigo y definimos una primera versión útil."
        cta={{ label: "Conversemos sobre tu proceso", href: "/diagnostico?necesidad=a-medida" }}
      />

      <section className="mk-section--md" aria-labelledby="faq-title">
        <div className="mk-container mk-ag-split mk-ag-split--4-8">
          <div className="mk-ag-copy">
            <SectionHeading id="faq-title" title="Antes de construir." />
            <p>
              <Link className="mk-link" href="/diagnostico?necesidad=a-medida">
                Conversar sobre mi caso
              </Link>
            </p>
          </div>
          <FAQ items={CUSTOM_FAQ} />
        </div>
      </section>

      <RelatedServices ids={["agentes", "web"]} extra={[{ label: "Plataforma", blurb: "El centro de operación donde tu equipo ve y revisa lo que hace el agente.", href: "/plataforma" }]} />
    </>
  );
}
