import type { Metadata } from "next";
import Link from "next/link";
import { Plug, ShieldCheck, Wrench } from "lucide-react";
import { ButtonLink } from "@/components/marketing/ui/Button";
import { CTABlock, SectionHeading } from "@/components/marketing/ui/Blocks";
import { FeatureGrid } from "@/components/marketing/pages/Common";
import { Atmosphere } from "@/components/marketing/pages/Atmosphere";
import { AgentPanel } from "@/components/marketing/pages/AgentPanel";
import { Mission } from "@/components/marketing/demos/Mission";
import { Reveal } from "@/components/marketing/motion/Reveal";
import { HOME_MISSION } from "@/content/marketing/missions";

export const metadata: Metadata = {
  title: "Atacama Labs — Agentes que trabajan en tu empresa",
  description:
    "Atiende, vende, cobra, consulta información y ejecuta tareas conectado a las herramientas que ya usas.",
  alternates: { canonical: "/" },
};

const DELEGATE = [
  { title: "Vender y agendar", body: "Responde, califica, coordina y mantiene cada oportunidad avanzando." },
  { title: "Cobrar y hacer seguimiento", body: "Revisa estados, contacta y registra cada gestión." },
  {
    title: "Consultar y administrar",
    body: "Busca información, cruza datos y deja tareas resueltas bajo tus reglas.",
  },
  {
    title: "Conectar y automatizar",
    body: "Une herramientas y mueve información sin volver a hacer el trabajo a mano.",
  },
] as const;

const CONNECTED = [
  { icon: <Plug size={20} />, title: "Se conecta", body: "Trabaja con CRM, calendarios, mensajería, bases de datos y otros sistemas compatibles." },
  { icon: <ShieldCheck size={20} />, title: "Tú controlas", body: "Defines permisos, reglas y cuándo una acción necesita aprobación humana." },
  { icon: <Wrench size={20} />, title: "Lo ponemos a trabajar", body: "Configuramos el agente alrededor del proceso que quieres delegar." },
] as const;

/**
 * Home (spec V3.0 §7, H1–H7). Deja de ser catálogo: una idea por sección,
 * una sola microanimación (H3) y el agente real de Atacama como demostración
 * principal (H5, con fallback honesto mientras no exista el embed de Lety).
 * Mientras el agente no esté listo, el CTA principal es «Ver agentes» (§7 H1/H7).
 */
export default function Home() {
  return (
    <>
      <section className="mk-hero" aria-labelledby="hero-title">
        <div className="mk-container mk-hero__grid">
          <div className="mk-hero__copy">
            <p className="mk-eyebrow">AGENTES PARA TU EMPRESA</p>
            <h1 id="hero-title" className="mk-display mk-hero__title">
              Pon un agente a trabajar en tu empresa.
            </h1>
            <p className="mk-lead mk-hero__lead">
              Atiende, vende, cobra, consulta información y ejecuta tareas conectado a las herramientas que ya usas.
            </p>
            <div className="mk-hero__actions">
              <ButtonLink href="/agentes" arrow>
                Ver agentes
              </ButtonLink>
              <ButtonLink href="/diagnostico" variant="secondary">
                Agendar diagnóstico
              </ButtonLink>
            </div>
            <p className="mk-small mk-muted mk-hero__note">
              Tú defines las reglas, los permisos y cuándo entra una persona.
            </p>
          </div>
          <div className="mk-hero__product" aria-hidden="true">
            <Atmosphere />
          </div>
        </div>
      </section>

      <section className="mk-section--md" aria-labelledby="pain-title">
        <div className="mk-container">
          <SectionHeading
            id="pain-title"
            title="Responder es solo el comienzo."
            lead="Un agente puede entender una solicitud, buscar la información necesaria y dejar el siguiente paso hecho."
          />
          <ul className="mk-ideas">
            <Reveal as="li">Atiende sin dejar conversaciones esperando.</Reveal>
            <Reveal as="li" delay={70}>
              Trabaja con la información de tus sistemas.
            </Reveal>
            <Reveal as="li" delay={140}>
              Deja a tu equipo las decisiones que sí necesitan criterio.
            </Reveal>
          </ul>
        </div>
      </section>

      <section className="mk-section--md mk-paper" aria-labelledby="how-title">
        <div className="mk-container">
          <SectionHeading id="how-title" title="Le das una tarea. El agente va, trabaja y vuelve con el resultado." />
          <Mission scene={HOME_MISSION} instance="home" />
        </div>
      </section>

      <section className="mk-section--md" aria-labelledby="delegate-title">
        <div className="mk-container">
          <SectionHeading id="delegate-title" title="Empieza por el trabajo que más tiempo te quita." />
          <ul className="mk-delegate">
            {DELEGATE.map((d, i) => (
              <Reveal as="li" key={d.title} delay={Math.min(i * 70, 210)}>
                <h3 className="mk-h5">{d.title}</h3>
                <p>{d.body}</p>
              </Reveal>
            ))}
          </ul>
          <p className="mk-ag-cta">
            <Link href="/agentes" className="mk-link">
              Ver todo lo que puede hacer un agente
            </Link>
          </p>
        </div>
      </section>

      <section id="agente" className="mk-section mk-paper" aria-labelledby="agent-title">
        <div className="mk-container">
          <SectionHeading
            id="agent-title"
            center
            title="Habla con nuestro agente"
            lead="Cuéntale qué quieres mejorar en tu empresa."
          />
          <AgentPanel />
        </div>
      </section>

      <section className="mk-section--md" aria-labelledby="connected-title">
        <div className="mk-container">
          <SectionHeading id="connected-title" title="Se conecta, tú controlas, lo ponemos a trabajar." />
          <FeatureGrid items={CONNECTED} />
        </div>
      </section>

      <CTABlock
        title="¿Qué trabajo quieres sacar de tu equipo esta semana?"
        body="Cuéntanos cómo lo hacen hoy y te mostramos por dónde empezar."
        cta={{ label: "Ver agentes", href: "/agentes" }}
        secondary={{ label: "Agendar diagnóstico", href: "/diagnostico" }}
      />
    </>
  );
}
