"use client";

import { useId, useState } from "react";
import { Database, Search } from "lucide-react";
import { Button } from "../ui/Button";
import { DemoFrame } from "./DemoFrame";
import { ActionReceipt, ChatThread, HumanReviewNote, ToolCall, toolPhase } from "./chat";
import { CalendarInteractive, CrmTable, InvoiceCard, TaskCard } from "./records";
import { controlsOf } from "./ScenarioDemos";
import { useDemoClock } from "../motion/useDemoClock";
import {
  CHAT_TIMELINE,
  CRM_ROW_NEW,
  SCRIPTS,
  type ChatScript,
  type CrmRow,
} from "@/content/marketing/fixtures";

export type CapabilityId = "atencion" | "ventas" | "cobranza" | "agendamiento" | "reactivacion" | "seguimiento";

const ALT_ATENCION = "No encuentro esa información en el ejemplo. Lo derivaría al equipo.";
const ALT_VENTAS = "El equipo necesita revisar algunos detalles antes de continuar.";

function withAlt(script: ChatScript, index: number, text: string): ChatScript {
  return { ...script, messages: script.messages.map((m, i) => (i === index ? { ...m, text } : m)) as ChatScript["messages"] };
}

function TryOther({ children }: { children: React.ReactNode }) {
  return (
    <details className="mk-demo-tools">
      <summary>Probar otro resultado</summary>
      <div className="mk-demo-tools__row">{children}</div>
    </details>
  );
}

/* ------------------------------ Atención ---------------------------------- */

function AtencionDemo({ instance }: { instance: string }) {
  const [attach, clock] = useDemoClock<HTMLDivElement>({ id: `cap-atencion-${instance}`, duration: CHAT_TIMELINE.complete + 600, autoplay: true });
  const [alt, setAlt] = useState(false);
  const script = alt ? withAlt(SCRIPTS.atencion, 1, ALT_ATENCION) : SCRIPTS.atencion;
  const { t } = clock;
  const phase = toolPhase(t);
  return (
    <div ref={attach}>
      <DemoFrame title="Atención" controls={controlsOf(clock)} product>
        <div className="mk-split">
          <ChatThread script={script} t={t} />
          <div className="mk-stack">
            {phase !== "hidden" ? (
              <ToolCall verb="Consultar estado" detail="DEMO-SOL-1042" status={alt ? "revision" : phase} statusLabel={alt ? "Sin datos" : undefined} icon={<Search size={16} />} />
            ) : null}
            {t >= CHAT_TIMELINE.receipt ? (
              <>
                <ActionReceipt receipt={script.receipt} className="is-new" title={alt ? "Derivación con historial" : "Nota registrada"}>
                  <ol className="mk-history">
                    <li>Consulta recibida</li>
                    <li>{alt ? "Información no encontrada" : "Estado consultado"}</li>
                    <li>{alt ? "Derivado a Equipo Demo con contexto" : "Nota agregada para el equipo"}</li>
                  </ol>
                </ActionReceipt>
                <HumanReviewNote>El agente no inventa una respuesta: deriva a una persona con el historial.</HumanReviewNote>
              </>
            ) : null}
          </div>
        </div>
        <TryOther>
          <Button size="sm" variant="secondary" onClick={() => { setAlt((v) => !v); clock.replay(); }}>
            {alt ? "Volver al resultado normal" : "Simular dato no encontrado"}
          </Button>
        </TryOther>
      </DemoFrame>
    </div>
  );
}

/* -------------------------------- Ventas ---------------------------------- */

function VentasDemo({ instance }: { instance: string }) {
  const [attach, clock] = useDemoClock<HTMLDivElement>({ id: `cap-ventas-${instance}`, duration: CHAT_TIMELINE.complete + 600, autoplay: true });
  const [alt, setAlt] = useState(false);
  const script = alt ? withAlt(SCRIPTS.ventas, 3, ALT_VENTAS) : SCRIPTS.ventas;
  const { t } = clock;
  const phase = toolPhase(t);
  const row: CrmRow = alt ? { ...CRM_ROW_NEW, stage: "Sin próxima acción", lastAction: "Faltan detalles: revisión del equipo" } : CRM_ROW_NEW;
  return (
    <div ref={attach}>
      <DemoFrame title="Ventas" controls={controlsOf(clock)} product>
        <div className="mk-split">
          <ChatThread script={script} t={t} times={[0, 1500, 2600, 4600]} />
          <div className="mk-stack">
            {phase !== "hidden" ? (
              <ToolCall verb="Calificar y registrar" detail="Empresa Demo Norte" status={alt && phase === "completado" ? "revision" : phase} icon={<Database size={16} />} />
            ) : null}
            {t >= CHAT_TIMELINE.receipt ? <CrmTable rows={[row]} highlightId={row.id} /> : null}
            {t >= CHAT_TIMELINE.receipt ? (
              <p className="mk-small mk-muted">No se registra un precio, un puntaje ni una venta ganada.</p>
            ) : null}
          </div>
        </div>
        <TryOther>
          <Button size="sm" variant="secondary" onClick={() => { setAlt((v) => !v); clock.replay(); }}>
            {alt ? "Volver al resultado normal" : "Simular información insuficiente"}
          </Button>
        </TryOther>
      </DemoFrame>
    </div>
  );
}

/* ------------------------------- Cobranza --------------------------------- */

function CobranzaDemo({ instance }: { instance: string }) {
  const [attach, clock] = useDemoClock<HTMLDivElement>({ id: `cap-cobranza-${instance}`, duration: CHAT_TIMELINE.complete + 600, autoplay: true });
  const [paid, setPaid] = useState(false);
  const { t } = clock;
  const phase = toolPhase(t);
  return (
    <div ref={attach}>
      <DemoFrame title="Cobranza" controls={controlsOf(clock)} product>
        <div className="mk-split">
          <ChatThread script={SCRIPTS.cobro} t={t} />
          <div className="mk-stack">
            {phase !== "hidden" ? (
              <ToolCall verb="Consultar estado de factura" detail="FAC-DEMO-1042" status={phase} icon={<Search size={16} />} />
            ) : null}
            {t >= CHAT_TIMELINE.toolPending ? (
              <InvoiceCard status={paid ? "paid" : "pending"} lastManagement={paid ? "Pago confirmado (ejemplo)" : t >= CHAT_TIMELINE.receipt ? "Recordatorio simulado" : null}>
                {t >= CHAT_TIMELINE.receipt ? (
                  <div className="mk-invoice__actions">
                    <Button size="sm" variant="secondary" disabled={paid} onClick={() => setPaid(true)}>Simular pago confirmado</Button>
                    <Button size="sm" variant="tertiary" onClick={() => setPaid(false)}>Restablecer</Button>
                  </div>
                ) : null}
              </InvoiceCard>
            ) : null}
          </div>
        </div>
        <HumanReviewNote>Sin transacciones reales ni links de pago: solo gestión y registro de ejemplo.</HumanReviewNote>
      </DemoFrame>
    </div>
  );
}

/* ------------------------------ Agendamiento ------------------------------ */

function AgendamientoDemo({ instance }: { instance: string }) {
  const [attach, clock] = useDemoClock<HTMLDivElement>({ id: `cap-agenda-${instance}`, duration: CHAT_TIMELINE.complete + 600, autoplay: true });
  const { t } = clock;
  const phase = toolPhase(t);
  return (
    <div ref={attach}>
      <DemoFrame title="Agendamiento" controls={controlsOf(clock)} product>
        <div className="mk-split">
          <ChatThread script={SCRIPTS.agenda} t={t} />
          <div className="mk-stack">
            {phase !== "hidden" ? (
              <ToolCall verb="Consultar disponibilidad" detail="Semana de ejemplo" status={phase} icon={<Search size={16} />} />
            ) : null}
            <CalendarInteractive compact />
          </div>
        </div>
        <p className="mk-small mk-muted">El chat cuenta el ejemplo del miércoles; el calendario es interactivo y local (semana 21–25 de septiembre de 2026).</p>
      </DemoFrame>
    </div>
  );
}

/* ------------------------------ Reactivación ------------------------------ */

function ReactivacionDemo({ instance }: { instance: string }) {
  const [attach, clock] = useDemoClock<HTMLDivElement>({ id: `cap-react-${instance}`, duration: CHAT_TIMELINE.complete + 600, autoplay: true });
  const { t } = clock;
  const phase = toolPhase(t);
  const done = t >= CHAT_TIMELINE.receipt;
  const row: CrmRow = {
    id: "OPP-DEMO-1043",
    company: "Estudio Desierto Demo",
    contact: "Consulta que quedó abierta",
    stage: done ? "Seguimiento pendiente" : "Sin próxima acción",
    owner: "Equipo comercial",
    lastAction: done ? "Contexto entregado para retomarlo" : "Consulta abierta",
  };
  return (
    <div ref={attach}>
      <DemoFrame title="Reactivación" controls={controlsOf(clock)} product>
        <div className="mk-split">
          <ChatThread script={SCRIPTS.reactivacion} t={t} />
          <div className="mk-stack">
            {phase !== "hidden" ? (
              <ToolCall verb="Registrar seguimiento" detail="OPP-DEMO-1043" status={phase} icon={<Database size={16} />} />
            ) : null}
            <CrmTable rows={[row]} highlightId={done ? row.id : null} />
            {done ? (
              <TaskCard id="TASK-DEMO-1043" title="Retomar la conversación con una persona" owner="Equipo comercial" done={false} />
            ) : null}
            <HumanReviewNote>Solo con personas que autorizaron ese canal. No hay envíos masivos ni consentimiento simulado.</HumanReviewNote>
          </div>
        </div>
      </DemoFrame>
    </div>
  );
}

/* ------------------------------- Seguimiento ------------------------------ */

function SeguimientoDemo({ instance }: { instance: string }) {
  const [attach, clock] = useDemoClock<HTMLDivElement>({ id: `cap-seg-${instance}`, duration: CHAT_TIMELINE.complete + 600, autoplay: true });
  const [done, setDone] = useState(false);
  const { t } = clock;
  const phase = toolPhase(t);
  return (
    <div ref={attach}>
      <DemoFrame title="Seguimiento" controls={controlsOf(clock)} product>
        <div className="mk-split">
          <ChatThread script={SCRIPTS.seguimiento} t={t} />
          <div className="mk-stack">
            {phase !== "hidden" ? (
              <ToolCall verb="Registrar tarea" detail="PROP-DEMO-1042" status={phase} icon={<Database size={16} />} />
            ) : null}
            {t >= CHAT_TIMELINE.receipt ? (
              <>
                <TaskCard id="TASK-DEMO-1042" title="Revisar propuesta" owner="Equipo comercial" done={done} onToggle={() => setDone((v) => !v)} />
                <p className="mk-small mk-muted">Completar la tarea no marca la oportunidad como vendida.</p>
              </>
            ) : null}
          </div>
        </div>
      </DemoFrame>
    </div>
  );
}

/** Escenarios de G2 (Agentes): seis capacidades con controles, sin autoavance entre ellas. */
export function CapabilityDemo({ id }: { id: CapabilityId }) {
  const uid = useId();
  switch (id) {
    case "atencion":
      return <AtencionDemo instance={uid} />;
    case "ventas":
      return <VentasDemo instance={uid} />;
    case "cobranza":
      return <CobranzaDemo instance={uid} />;
    case "agendamiento":
      return <AgendamientoDemo instance={uid} />;
    case "reactivacion":
      return <ReactivacionDemo instance={uid} />;
    case "seguimiento":
      return <SeguimientoDemo instance={uid} />;
  }
}

