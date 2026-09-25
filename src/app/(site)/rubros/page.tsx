import type { Metadata } from "next";
import { IndustryExplorer } from "@/components/marketing/pages/IndustryExplorer";
import { OtherIndustry } from "@/components/marketing/pages/IndustrySections";

const TITLE = "Rubros e industrias para agentes de IA — Atacama Labs";
const DESCRIPTION =
  "Mira cómo agentes conectados a procesos y herramientas pueden adaptarse a salud, inmobiliarias, educación, retail, alimentación, fitness, servicios profesionales, industria y contabilidad.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "https://atacamalabs.cl/rubros" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "https://atacamalabs.cl/rubros" },
};

/**
 * /rubros (RUBROS_Y_FOOTER_SPEC_V1 §5–§23): cómo un agente se ve trabajando dentro
 * de distintas industrias. Hero → selector pegado bajo el hero → una sección
 * compacta por rubro (situación real → agente trabajando → herramientas → acción
 * registrada) → «otro rubro». Sin CTA propio sobre el footer: el cierre es «otro rubro».
 */
export default function RubrosPage() {
  return (
    <>
      <section className="mk-hero mk-hero--rubros mk-hero--center" aria-labelledby="page-title">
        <div className="mk-container">
          <div className="mk-hero__copy">
            <p className="mk-eyebrow">RUBROS</p>
            <h1 id="page-title" className="mk-hero__h1">
              Tu agente, <span className="mk-hero__accent">puesto en práctica</span>.
            </h1>
            <p className="mk-lead mk-hero__lead">
              Mira cómo puede trabajar dentro de distintos rubros, conectado a los procesos, herramientas y reglas de
              cada operación.
            </p>
            <p className="mk-small mk-muted mk-hero__trust">
              Cada implementación se adapta a tu empresa. Estos ejemplos muestran formas concretas de poner un agente a
              trabajar.
            </p>
          </div>
        </div>
      </section>
      <div className="mk-rb">
        <IndustryExplorer />
        <OtherIndustry />
      </div>
    </>
  );
}
