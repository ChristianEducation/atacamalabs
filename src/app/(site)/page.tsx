import type { Metadata } from "next";
import Link from "next/link";
import { Plug, ShieldCheck, Wrench } from "lucide-react";
import { HeroShell } from "@/components/marketing/pages/HeroShell";
import { CTABlock, SectionHeading } from "@/components/marketing/ui/Blocks";
import { FeatureGrid } from "@/components/marketing/pages/Common";
import { HomeAtmosphere } from "@/components/marketing/pages/HomeAtmosphere";
import { AgentPanel } from "@/components/marketing/pages/AgentPanel";
import { Mission } from "@/components/marketing/demos/Mission";
import { Reveal } from "@/components/marketing/motion/Reveal";
import { HOME_MISSION } from "@/content/marketing/missions";
import { agentCta } from "@/lib/marketing/public-config";

export const metadata: Metadata = {
  title: "Atacama Labs — Agentes que trabajan en tu empresa",
  description:
    "Agentes que atienden, venden, cobran, consultan información y ejecutan tareas conectados a las herramientas que ya usas.",
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
 * Home — V3.3 §8–§9/§25. Ritmo Hero Gradient → Deep Tech → Blue Mist → Paper
 * → Deep Tech → Sand → Blue (CTA). Una sola misión narrativa (H3), sin loop;
 * el Home vende la idea, /agentes demuestra el producto. Nada de mega
 * selector ni catálogo (§25).
 */
export default function Home() {
  const cta = agentCta();
  return (
    <>
      <HeroShell
        size="xl"
        eyebrow="AGENTES PARA TU EMPRESA"
        title={
          <>
            Tu empresa, inteligente.
            <br />
            <span className="mk-hero__accent">Desde mañana.</span>
          </>
        }
        lead="Agentes que atienden, venden, cobran, consultan información y ejecutan tareas conectados a las herramientas que ya usas."
        trust="Tú defines las reglas, los permisos y cuándo entra una persona."
        actions={[
          { label: "Ver agentes", href: "/agentes" },
          { label: "Agendar diagnóstico", href: "/diagnostico", variant: "secondary" },
        ]}
        visual={<HomeAtmosphere />}
      />

      <section className="mk-section--md mk-t-deep" aria-labelledby="pain-title">
        <div className="mk-container mk-close">
          <Reveal>
            <p id="pain-title" className="mk-statement" style={{ marginInline: "auto" }}>
              Responder es solo el comienzo.
            </p>
            <p className="mk-lead" style={{ marginTop: 20, marginInline: "auto" }}>
              La parte difícil es lo que ocurre después: buscar información, coordinar, registrar, hacer seguimiento
              y ejecutar.
            </p>
            <p className="mk-h4" style={{ marginTop: 28 }}>
              Ahí empieza el <span className="mk-hero__accent">trabajo del agente</span>.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="mk-section--md mk-t-mist" aria-labelledby="how-title">
        <div className="mk-container">
          <SectionHeading id="how-title" title="Le das una tarea. Vuelve con el trabajo hecho." />
          <Mission scene={HOME_MISSION} instance="home" />
        </div>
      </section>

      <section className="mk-section--md mk-t-paper" aria-labelledby="delegate-title">
        <div className="mk-container">
          <SectionHeading id="delegate-title" title="Empieza por lo que más tiempo te quita." />
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

      <section id="agente" className="mk-section mk-t-deep" aria-labelledby="agent-title">
        <div className="mk-container">
          <SectionHeading
            id="agent-title"
            center
            title="Ahora pregúntaselo a uno."
            lead="Cuéntale qué quieres mejorar en tu empresa."
          />
          <AgentPanel />
        </div>
      </section>

      <section className="mk-section--md mk-t-sand" aria-labelledby="connected-title">
        <div className="mk-container">
          <SectionHeading id="connected-title" title="Se conecta. Trabaja. Tú mantienes el control." />
          <FeatureGrid items={CONNECTED} />
        </div>
      </section>

      <CTABlock
        title="¿Qué le delegarías mañana?"
        body="Cuéntanos cómo lo hacen hoy y te mostramos por dónde empezar."
        cta={cta}
        secondary={cta.label === "Agendar diagnóstico" ? undefined : { label: "Agendar diagnóstico", href: "/diagnostico" }}
      />
    </>
  );
}
