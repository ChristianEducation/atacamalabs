import type { Metadata } from "next";
import { ContextContact, PageHero } from "@/components/marketing/pages/Common";
import { PlatformWorkbench } from "@/components/marketing/demos/PlatformWorkbench";
import { Bubble } from "@/components/marketing/demos/chat";
import { StatusChip } from "@/components/marketing/ui/Badge";
import { IntegrationMarquee } from "@/components/marketing/ui/IntegrationMarquee";
import { CTABlock, RelatedServices, SectionHeading } from "@/components/marketing/ui/Blocks";
import { Reveal } from "@/components/marketing/motion/Reveal";
import { ButtonLink } from "@/components/marketing/ui/Button";
import { marqueeEntries } from "@/content/marketing/integrations";
import { PLATFORM_CONTACTS } from "@/content/marketing/fixtures";
import { clientPortalUrl } from "@/lib/marketing/public-config";

export const metadata: Metadata = {
  title: "Plataforma — Atacama Labs",
  description:
    "Conoce el centro de operación de tus agentes: conversaciones, contactos y próximos pasos, configurados para tu empresa.",
  alternates: { canonical: "/plataforma" },
};

const [c1, c2] = PLATFORM_CONTACTS;
const ACTIVITY = [
  "Conversación P-DEMO-01 recibida por Web",
  "Cambio de hora solicitado por P-DEMO-02 (WhatsApp)",
  "Cierre registrado para P-DEMO-03",
];
const NEXT_STEPS = PLATFORM_CONTACTS.filter((c) => c.nextAction).map((c) => ({ id: c.id, action: c.nextAction as string }));

export default function PlatformPage() {
  const marquee = marqueeEntries();
  const portal = clientPortalUrl();
  return (
    <>
      <PageHero
        id="centro-operacion"
        eyebrow="TU CENTRO DE OPERACIÓN"
        title="Tus agentes trabajan. Tu equipo tiene el contexto."
        lead="Un lugar para acompañar las conversaciones y los próximos pasos de tu operación."
        actions={[
          { label: "Solicitar una demo", href: "#conversar" },
          { label: "Ver cómo se organiza", href: "#funciones", variant: "secondary" },
        ]}
        split="4-8"
        note={
          portal ? (
            <a href={portal} className="mk-link" rel="noopener noreferrer">
              Acceso clientes
            </a>
          ) : null
        }
      >
        <PlatformWorkbench />
        <p className="mk-small mk-muted mk-plat-caption">
          Representación ilustrativa. Las vistas y funciones se configuran según tu solución.
        </p>
      </PageHero>

      <section id="funciones" className="mk-section mk-paper" aria-labelledby="fn-title">
        <div className="mk-container">
          <SectionHeading id="fn-title" title="Del mensaje al siguiente paso." />
          <div className="mk-plat-cards">
            <Reveal className="mk-plat-card">
              <div className="mk-plat-card__copy">
                <h3 className="mk-h5">Conversaciones con contexto</h3>
                <p>Reúne el hilo de cada consulta</p>
              </div>
              <div className="mk-plat-card__ui mk-plat-bubbles">
                {c1.messages.map((m, i) => (
                  <Bubble key={i} message={m} />
                ))}
              </div>
            </Reveal>
            <Reveal className="mk-plat-card" delay={70}>
              <div className="mk-plat-card__copy">
                <h3 className="mk-h5">Contactos y próximos pasos</h3>
                <p>Reconoce el estado y la próxima acción</p>
              </div>
              <div className="mk-plat-card__ui">
                <div className="mk-plat-ficha">
                  <span className="mk-plat-ficha__avatar" aria-hidden>
                    {c2.initials}
                  </span>
                  <div>
                    <p className="mk-h6">{c2.name}</p>
                    <p className="mk-small mk-muted">
                      {c2.company} · {c2.channel}
                    </p>
                  </div>
                  <StatusChip status="revision" label={c2.status} />
                </div>
                <p className="mk-small">
                  <strong>Próxima acción:</strong> {c2.nextAction}
                </p>
              </div>
            </Reveal>
            <Reveal className="mk-plat-card" delay={140}>
              <div className="mk-plat-card__copy">
                <h3 className="mk-h5">Una operación que puedes revisar</h3>
                <p>Revisa actividad y métricas de la solución configurada</p>
              </div>
              <div className="mk-plat-card__ui">
                <dl className="mk-plat-metrics">
                  <div>
                    <dt>Abiertas</dt>
                    <dd>1</dd>
                  </div>
                  <div>
                    <dt>En seguimiento</dt>
                    <dd>1</dd>
                  </div>
                  <div>
                    <dt>Cerradas</dt>
                    <dd>1</dd>
                  </div>
                </dl>
                <ul className="mk-plat-list">
                  {ACTIVITY.slice(0, 2).map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
          <p className="mk-ag-cta">
            <ButtonLink href="#conversar" variant="secondary" arrow>
              Ver una demo de tu operación
            </ButtonLink>
          </p>
        </div>
      </section>

      <section className="mk-section--md" aria-labelledby="conn-title">
        <div className="mk-container">
          <SectionHeading
            id="conn-title"
            center
            title="Conectada al trabajo que ya haces."
            lead="Revisamos los canales y herramientas que tu proceso necesita."
          />
          <p className="mk-ag-cta mk-center">
            <ButtonLink href="#conversar" variant="secondary">
              Revisar mis conexiones
            </ButtonLink>
          </p>
        </div>
        <IntegrationMarquee items={marquee.items} preview={marquee.preview} />
      </section>

      <section className="mk-section--md mk-paper" aria-labelledby="vis-title">
        <div className="mk-container">
          <SectionHeading id="vis-title" title="Saber qué pasó. Entender qué sigue." />
          <div className="mk-plat-bento">
            <Reveal className="mk-plat-bento__big">
              <h3 className="mk-h5">Historial a mano</h3>
              <ol className="mk-plat-list">
                {ACTIVITY.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ol>
            </Reveal>
            <Reveal delay={70}>
              <h3 className="mk-h5">Responsables claros</h3>
              <ul className="mk-plat-list">
                {PLATFORM_CONTACTS.map((c) => (
                  <li key={c.id}>
                    <span className="mk-mono">{c.id}</span> · Equipo Demo
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={140}>
              <h3 className="mk-h5">Próximas acciones visibles</h3>
              <ul className="mk-plat-list">
                {NEXT_STEPS.map((n) => (
                  <li key={n.id}>
                    <span className="mk-mono">{n.id}</span> · {n.action}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
      </section>

      <ContextContact
        title="Miremos cómo opera tu equipo."
        lead="Revisamos las conversaciones, estados y próximos pasos que necesitas reunir."
        initial={{ need: "agentes" }}
      />

      <CTABlock
        title="Agentes con contexto. Un equipo con visibilidad."
        body="Conoce cómo puede verse tu operación."
        cta={{ label: "Solicitar demo", href: "#conversar" }}
      />

      <RelatedServices
        ids={["agentes", "comercial", "cobranza", "administrativo-financiero"]}
        limit={4}
      />
    </>
  );
}
