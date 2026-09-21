import type { Metadata } from "next";
import Link from "next/link";
import { Blocks, CalendarCheck, ClipboardList, Database, FileText, Bell, Send, UserRoundCheck, CheckCheck } from "lucide-react";
import { PageHero, ProcessSteps, FeatureGrid } from "@/components/marketing/pages/Common";
import {
  AgentFlow,
  AgentHeroDemo,
  CapabilityExplorer,
  ConnectionsHub,
  ContextSectors,
  ControlInbox,
} from "@/components/marketing/pages/AgentsSections";
import { PricingGrid } from "@/components/marketing/ui/Pricing";
import { IntegrationMarquee } from "@/components/marketing/ui/IntegrationMarquee";
import { Badge } from "@/components/marketing/ui/Badge";
import { ButtonLink } from "@/components/marketing/ui/Button";
import { CTABlock, FAQ, SectionHeading } from "@/components/marketing/ui/Blocks";
import { Reveal } from "@/components/marketing/motion/Reveal";
import { AGENT_PLANS, PRICE_PENDING_COPY } from "@/content/marketing/pricing";
import { marqueeEntries } from "@/content/marketing/integrations";
import {
  ACTIONS,
  AGENTS_FAQ,
  AGENTS_LINKS,
  AGENTS_META_DESCRIPTION,
  PACKAGING,
  SETUP_STEPS,
} from "@/content/marketing/agents";

export const metadata: Metadata = {
  title: "Agentes — Atacama Labs",
  description: AGENTS_META_DESCRIPTION,
  alternates: { canonical: "/agentes" },
};

const ACTION_ICONS = [Database, CalendarCheck, ClipboardList, CheckCheck, FileText, Bell, Send, UserRoundCheck, Blocks];

export default function AgentsPage() {
  const marquee = marqueeEntries();
  return (
    <>
      <PageHero
        eyebrow="Agentes"
        title="Un agente que realmente trabaja en tu empresa."
        lead="Conversa, consulta información y ejecuta acciones en tus herramientas. Comercial, Cobranza o Finanzas son solo puntos de partida: tú defines qué procesos combina y cuándo interviene tu equipo."
        actions={[
          { label: "Ver demo interactiva", href: "#demo" },
          { label: "Ver planes", href: "#planes" },
        ]}
        note="Disponibles 24/7 según los canales y procesos configurados."
        links={AGENTS_LINKS}
      >
        <div id="demo">
          <AgentHeroDemo />
        </div>
      </PageHero>

      <section className="mk-section--md" aria-labelledby="packaging-title">
        <div className="mk-container">
          <SectionHeading
            id="packaging-title"
            title="Empaquetamos para entender, configuramos para operar."
            lead="Estos arquetipos no son límites técnicos. El mismo agente puede vender, consultar CRM, revisar información financiera, generar documentos o actualizar sistemas cuando el alcance lo permita. Las capacidades dependen de integraciones, permisos, reglas y plan/consumo, no del nombre comercial elegido al contratar."
          />
          <ul className="mk-ag-packaging">
            {PACKAGING.map((p) => (
              <li key={p.name}>
                <Link href={p.href} className="mk-link">
                  <strong>{p.name}:</strong>
                </Link>{" "}
                {p.body}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="capacidades" className="mk-section mk-paper" aria-labelledby="cap-title">
        <div className="mk-container">
          <SectionHeading
            id="cap-title"
            title="Elige qué trabajo quieres delegar."
            lead="Son ejemplos, no límites. El mismo agente puede combinar varias capacidades y acciones."
          />
          <CapabilityExplorer />
          <div className="mk-ag-subblock">
            <SectionHeading
              id="actions-title"
              title="Conversa. Consulta. Ejecuta."
              lead="Un mismo agente puede realizar varias acciones dentro de un proceso principal."
            />
            <FeatureGrid
              items={ACTIONS.map((a, i) => {
                const Icon = ACTION_ICONS[i];
                return { icon: <Icon size={20} />, title: a.title, body: a.body };
              })}
            />
            <p className="mk-ag-cta">
              <Link href="#demo" className="mk-link">
                Explorar un ejemplo
              </Link>
            </p>
          </div>
        </div>
      </section>

      <section className="mk-section--md mk-paper" aria-labelledby="flow-title">
        <div className="mk-container">
          <SectionHeading id="flow-title" title="Del primer mensaje al siguiente paso." />
          <AgentFlow />
          <p className="mk-ag-cta">
            <Link href="#planes" className="mk-link">
              Ver planes
            </Link>
          </p>
        </div>
      </section>

      <section id="integraciones" className="mk-section--md" aria-labelledby="conn-title">
        <div className="mk-container mk-ag-split mk-ag-split--5-7">
          <Reveal className="mk-ag-copy">
            <h2 id="conn-title" className="mk-h2">
              El agente trabaja con tu operación.
            </h2>
            <p className="mk-lead">
              Conectamos la información y las acciones necesarias mediante conectores, MCP, APIs o webhooks. Revisamos
              compatibilidad, permisos y alcance antes de habilitar cada acción.
            </p>
            <div>
              <ButtonLink href="/diagnostico?necesidad=integraciones" variant="secondary" arrow>
                Revisar mi integración
              </ButtonLink>
            </div>
          </Reveal>
          <ConnectionsHub />
        </div>
        <div className="mk-ag-marquee">
          <IntegrationMarquee items={marquee.items} preview={marquee.preview} />
        </div>
      </section>

      <section className="mk-section--md mk-paper" aria-labelledby="ctx-title">
        <div className="mk-container">
          <SectionHeading
            id="ctx-title"
            title="El mismo principio. Distintas operaciones."
            lead="Mira cómo cambia la conversación según el trabajo de cada equipo."
          />
          <ContextSectors />
        </div>
      </section>

      <section className="mk-section--md" aria-labelledby="control-title">
        <div className="mk-container">
          <SectionHeading
            id="control-title"
            title="Tu equipo conserva el control."
            lead="Define qué puede responder, qué acciones ejecuta y cuándo debe derivar. Cada paso debe dejar contexto útil."
          />
          <ControlInbox />
          <p className="mk-ag-cta">
            <ButtonLink href="/plataforma" variant="secondary" arrow>
              Conocer la plataforma
            </ButtonLink>{" "}
            <Link href="#planes" className="mk-link">
              Ver planes
            </Link>
          </p>
        </div>
      </section>

      <section id="planes" className="mk-section mk-paper" aria-labelledby="plans-title">
        <div className="mk-container">
          <SectionHeading
            id="plans-title"
            title="Empieza con un agente. Amplía cuando lo necesites."
            lead="Los planes cambian por cantidad de agentes, volumen, acompañamiento y complejidad; no porque uno pueda usar integraciones y otro no."
          />
          <PricingGrid plans={AGENT_PLANS} featuresLimit={6} />
          <div className="mk-ag-plans-extra">
            <p>{PRICE_PENDING_COPY.extraAgent}</p>
            <p>La propuesta confirma moneda, impuestos, límites y condiciones antes de contratar.</p>
          </div>
        </div>
      </section>

      <section id="preguntas" className="mk-section--md mk-paper" aria-labelledby="faq-title">
        <div className="mk-container">
          <SectionHeading id="setup-title" title="Lo ponemos a trabajar contigo." />
          <ProcessSteps steps={SETUP_STEPS} />
          <p className="mk-ag-cta">
            <ButtonLink href="/diagnostico?necesidad=agentes" variant="secondary" arrow>
              Definir mi proceso
            </ButtonLink>
          </p>
        </div>
        <div className="mk-container mk-ag-split mk-ag-split--4-8 mk-ag-subblock">
          <Reveal className="mk-ag-copy">
            <h2 id="faq-title" className="mk-h2">
              Antes de empezar.
            </h2>
            <p>
              <Link href="/diagnostico?necesidad=agentes" className="mk-link">
                ¿Tu caso es distinto?
              </Link>
            </p>
          </Reveal>
          <FAQ items={AGENTS_FAQ} />
        </div>
      </section>

      <section id="voz" className="mk-section--sm" aria-labelledby="voz-title">
        <div className="mk-container mk-ag-voice">
          <div className="mk-ag-voice__copy">
            <Badge>Próximamente</Badge>
            <h2 id="voz-title" className="mk-h3">
              Agente de Voz
            </h2>
            <p>Estamos preparando esta modalidad. Su disponibilidad y alcance se confirmarán más adelante.</p>
            <Link href="/agentes#capacidades" className="mk-link">
              Explorar agentes disponibles
            </Link>
          </div>
          <div className="mk-ag-voice__wave" aria-hidden>
            {Array.from({ length: 24 }, (_, i) => (
              <span key={i} style={{ height: `${20 + ((i * 37) % 60)}%` }} />
            ))}
          </div>
        </div>
      </section>

      <CTABlock
        title="El primer agente empieza por un proceso concreto."
        body="Cuéntanos cuál te gustaría resolver."
        cta={{ label: "Solicitar una demo", href: "/diagnostico?necesidad=agentes" }}
      />
    </>
  );
}
