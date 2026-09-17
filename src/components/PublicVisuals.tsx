import Image from "next/image";
import { Container, Eyebrow, PrimaryLink } from "@/components/ui";

export function AgentVisual() {
  return (
    <div className="agent-visual">
      <div className="example-phone">
        <div className="phone-brand">
          <Image
            src="/brand/logo-horizontal.svg"
            alt="Atacama Labs"
            width={128}
            height={25}
          />
          <p className="example-label">Ejemplo de flujo</p>
        </div>
        <p className="chat-bubble">¿Qué proceso necesitas mejorar?</p>
        <p className="chat-bubble customer">
          Quiero ordenar las consultas y el seguimiento.
        </p>
        <div className="chat-action">
          <span aria-hidden>↗</span> Consulta → Registro → Próximo paso
        </div>
      </div>
    </div>
  );
}
export function ConnectionsVisual() {
  return (
    <div
      className="connections-visual"
      role="img"
      aria-label="Esquema conceptual: Atacama conecta CRM, agenda, sistemas y datos"
    >
      <svg viewBox="0 0 320 230" aria-hidden="true">
        <g fill="none" stroke="var(--color-border-control)" strokeWidth="1">
          <path d="M70 45H125Q160 45 160 90M250 45H195Q160 45 160 90M70 185H125Q160 185 160 140M250 185H195Q160 185 160 140" />
        </g>
      </svg>
      <span className="node node-crm">CRM</span>
      <span className="node node-agenda">Agenda</span>
      <span className="node node-systems">Sistemas</span>
      <span className="node node-data">Datos</span>
      <span className="node node-brand">
        <Image src="/brand/logo-mark.svg" alt="" width={62} height={27} />
      </span>
    </div>
  );
}
export function AutomationVisual() {
  return (
    <div className="automation-visual">
      <div className="window-bar">
        <i />
        <i />
        <i />
        <span>Ejemplo de flujo</span>
      </div>
      <div className="window-content">
        <strong>Proceso conectado</strong>
        {["Entrada recibida", "Tarea validada", "Seguimiento registrado"].map(
          (label, i) => (
            <div key={label} className="operation-row">
              <span>0{i + 1}</span>
              <p>{label}</p>
              <span aria-hidden>✓</span>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
export function CaseVisual({
  steps = [
    "Selección semanal",
    "Pago",
    "Administración",
    "Preparación en cocina",
  ],
}: {
  steps?: string[];
}) {
  return (
    <figure className="case-visual">
      <div className="case-paper">
        <p className="case-kicker">PROCESO IMPLEMENTADO</p>
        <ol>
          {steps.map((step, i) => (
            <li key={step}>
              <span>0{i + 1}</span>
              <p>{step}</p>
              {i < steps.length - 1 && <b aria-hidden>↓</b>}
            </li>
          ))}
        </ol>
      </div>
      <figcaption>
        Esquema del flujo implementado; no es una captura del producto.
      </figcaption>
    </figure>
  );
}
export function PortalMotif({ motif }: { motif: string }) {
  return motif === "agents" ? (
    <AgentVisual />
  ) : motif === "connections" ? (
    <ConnectionsVisual />
  ) : motif === "automation" ? (
    <AutomationVisual />
  ) : (
    <CaseVisual />
  );
}
export function LandscapeCta({
  title = "Hablemos de tu proceso",
  body = "Cuéntanos cómo trabaja tu empresa y qué te gustaría mejorar.",
}: {
  title?: string;
  body?: string;
}) {
  return (
    <section className="landscape-cta">
      <Container className="cta-grid">
        <div>
          <Eyebrow>El siguiente paso</Eyebrow>
          <h2>{title}</h2>
        </div>
        <div>
          <p>{body}</p>
          <PrimaryLink href="/contacto">
            Conversemos{" "}
            <span aria-hidden className="ml-3">
              →
            </span>
          </PrimaryLink>
        </div>
      </Container>
    </section>
  );
}
