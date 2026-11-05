"use client";

import { useId, useState } from "react";
import { Database, FilePenLine, Search, Tags } from "lucide-react";
import { Button } from "../ui/Button";
import { StatusChip, type StatusKey } from "../ui/Badge";
import { DemoFrame, type FrameControls } from "./DemoFrame";
import { ActionReceipt, ChatThread, HumanReviewNote, ToolCall, toolPhase } from "./chat";
import { CalendarTimelineView, CrmTable, InvoiceCard, TaskCard } from "./records";
import { useDemoClock, type DemoClock } from "../motion/useDemoClock";
import {
  CRM_ROWS_BASE,
  CRM_ROW_NEW,
  CHAT_TIMELINE,
  SCRIPTS,
} from "@/content/marketing/fixtures";

export function controlsOf(clock: DemoClock): FrameControls {
  return {
    state: clock.state,
    onPlay: clock.play,
    onPause: clock.pause,
    onReplay: clock.replay,
    onShowResult: clock.showResult,
  };
}

/** Fase de una acción individual con instantes propios (pendiente → procesando → completado). */
export function phaseAt(t: number, start: number, processing: number, done: number): StatusKey | "hidden" {
  if (t < start) return "hidden";
  if (t < processing) return "pendiente";
  if (t < done) return "procesando";
  return "completado";
}

/* ------------------------------ F1 — Hero demo ---------------------------- */

/** Cuerpo del AppFrame del hero: conversación arriba y recibo de acción debajo (S-HOME). */
export function HeroDemoBody({ t }: { t: number }) {
  const script = SCRIPTS.home;
  const phase = toolPhase(t);
  const receiptVisible = t >= CHAT_TIMELINE.receipt;
  return (
    <div className="mk-hero-demo">
      <ChatThread script={script} t={t} />
      <div className="mk-hero-demo__action">
        {phase !== "hidden" ? (
          <ToolCall
            verb={script.tool.verb}
            detail={script.tool.detail}
            status={phase}
            icon={<Database size={16} />}
          />
        ) : (
          <p className="mk-hero-demo__idle">El agente consulta y registra dentro del proceso.</p>
        )}
        {receiptVisible ? (
          <ActionReceipt receipt={script.receipt} className="is-new">
            <HumanReviewNote>Solicitud para revisión; no se ha reservado una reunión.</HumanReviewNote>
          </ActionReceipt>
        ) : null}
      </div>
    </div>
  );
}

/* ---------------------- F3 · Agentes Inteligentes -------------------------- */

const AGENTS_TIMES = [0, 1500, 2600, 5800] as const;
const AGENT_TAGS = ["Vender", "Agendar", "Consultar", "Actualizar", "Reportar"] as const;

export function AgentsDemo({ autoplay = true, instance }: { autoplay?: boolean; instance?: string }) {
  const uid = useId();
  const [attach, clock] = useDemoClock<HTMLDivElement>({ id: `agents-${instance ?? uid}`, duration: 6800, autoplay });
  const { t } = clock;
  const script = SCRIPTS.atencion;
  const tool1 = phaseAt(t, 3000, 3300, 3900);
  const tool2 = phaseAt(t, 3900, 4200, 4800);
  const tool3 = phaseAt(t, 4800, 5100, 5700);
  return (
    <div ref={attach}>
      <DemoFrame title="Agentes Inteligentes" controls={controlsOf(clock)} className="mk-frame--split" product>
        <div className="mk-split">
          <ChatThread script={script} t={t} times={AGENTS_TIMES} />
          <div className="mk-stack">
            <p className="mk-stack__title">Acciones encadenadas del mismo agente</p>
            {tool1 !== "hidden" ? (
              <ToolCall verb="Consultar estado" detail="DEMO-SOL-1042" status={tool1} icon={<Search size={16} />} />
            ) : null}
            {tool2 !== "hidden" ? (
              <ToolCall verb="Agregar nota" detail="Aclaración del cliente" status={tool2} icon={<FilePenLine size={16} />} />
            ) : null}
            {tool3 !== "hidden" ? (
              <ToolCall verb="Actualizar registro" detail="Revisión del equipo" status={tool3} icon={<Database size={16} />} />
            ) : null}
            {t >= 5800 ? (
              <ActionReceipt receipt={script.receipt} className="is-new" title="Registro actualizado" />
            ) : null}
            <ul className="mk-tags" aria-label="Acciones que un mismo agente puede combinar">
              {AGENT_TAGS.map((tag) => (
                <li key={tag} className="mk-tag">
                  <Tags size={12} aria-hidden />
                  {tag}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </DemoFrame>
    </div>
  );
}

/* --------------------------- F3 · Agente Comercial ------------------------- */

const COMMERCIAL_TIMES = [0, 1500, 2600, 4600] as const;

export function CommercialDemo({ autoplay = true, instance }: { autoplay?: boolean; instance?: string }) {
  const uid = useId();
  const [attach, clock] = useDemoClock<HTMLDivElement>({ id: `commercial-${instance ?? uid}`, duration: 9600, autoplay });
  const { t } = clock;
  const script = SCRIPTS.ventas;
  const tool = toolPhase(t);
  const rows = t >= CHAT_TIMELINE.receipt ? [CRM_ROW_NEW, ...CRM_ROWS_BASE] : [];
  const calStage: 0 | 1 | 2 | 3 | null = t < 5200 ? null : t < 6000 ? 0 : t < 6800 ? 1 : t < 7500 ? 2 : 3;
  const taskVisible = t >= 8200;
  return (
    <div ref={attach}>
      <DemoFrame title="Agente Comercial" controls={controlsOf(clock)} className="mk-frame--split" product>
        <div className="mk-split">
          <ChatThread script={script} t={t} times={COMMERCIAL_TIMES} />
          <div className="mk-stack">
            {tool !== "hidden" ? (
              <ToolCall verb={script.tool.verb} detail={script.tool.detail} status={tool} icon={<Database size={16} />} />
            ) : null}
            {t >= CHAT_TIMELINE.receipt ? (
              <p className="mk-stack__flag">
                <StatusChip status="completado" label="Lead calificado" />
              </p>
            ) : null}
            {rows.length > 0 ? <CrmTable rows={rows} highlightId={CRM_ROW_NEW.id} /> : null}
            {calStage !== null ? <CalendarTimelineView stage={calStage} compact /> : null}
            {taskVisible ? (
              <TaskCard id="TASK-DEMO-1042" title="Seguimiento programado: revisar propuesta" owner="Equipo comercial" done={false} />
            ) : null}
          </div>
        </div>
      </DemoFrame>
    </div>
  );
}

/* --------------------------- F3 · Agente de Cobranza ----------------------- */

export function CollectionsDemo({ autoplay = true, instance }: { autoplay?: boolean; instance?: string }) {
  const uid = useId();
  const [attach, clock] = useDemoClock<HTMLDivElement>({ id: `collections-${instance ?? uid}`, duration: 5200, autoplay });
  const { t } = clock;
  const script = SCRIPTS.cobro;
  const [paid, setPaid] = useState(false);
  const invoiceVisible = t >= CHAT_TIMELINE.toolPending;
  const managed = t >= CHAT_TIMELINE.receipt;
  const collectionTool = toolPhase(t);
  return (
    <div ref={attach}>
      <DemoFrame title="Agente de Cobranza" controls={controlsOf(clock)} className="mk-frame--split" product>
        <div className="mk-split">
          <ChatThread script={script} t={t} />
          <div className="mk-stack">
            {collectionTool !== "hidden" ? (
              <ToolCall
                verb={script.tool.verb}
                detail={script.tool.detail}
                status={collectionTool}
                icon={<Search size={16} />}
              />
            ) : null}
            {invoiceVisible ? (
              <InvoiceCard
                status={paid ? "paid" : "pending"}
                lastManagement={paid ? "Pago confirmado (ejemplo)" : managed ? "Recordatorio simulado" : null}
              >
                {managed ? (
                  <div className="mk-invoice__actions">
                    <Button size="sm" variant="secondary" disabled={paid} onClick={() => setPaid(true)}>
                      Simular pago confirmado
                    </Button>
                    <Button size="sm" variant="tertiary" onClick={() => setPaid(false)}>
                      Restablecer
                    </Button>
                  </div>
                ) : null}
              </InvoiceCard>
            ) : null}
            {managed ? (
              <HumanReviewNote>Sin envíos ni links de pago reales: el seguimiento queda solo como ejemplo.</HumanReviewNote>
            ) : null}
          </div>
        </div>
      </DemoFrame>
    </div>
  );
}

