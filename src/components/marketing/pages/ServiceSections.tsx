"use client";

import { useId, useState } from "react";
import { Button } from "../ui/Button";
import { StatusChip } from "../ui/Badge";
import { DemoFrame } from "../demos/DemoFrame";
import { ChatThread, HumanReviewNote } from "../demos/chat";
import { CalendarTimelineView, CrmTable, formatCLP } from "../demos/records";
import { controlsOf } from "../demos/ScenarioDemos";
import { FlowPlayer } from "../demos/FlowPlayer";
import { useDemoClock } from "../motion/useDemoClock";
import { COLLECTIONS, COMMERCIAL } from "@/content/marketing/services";
import {
  CRM_ROW_NEW,
  PORTFOLIO,
  SCRIPTS,
  type BuilderScenario,
  type ChatScript,
  type PortfolioInvoice,
} from "@/content/marketing/fixtures";

const nodesOf = (nodes: readonly unknown[]) => nodes as unknown as BuilderScenario["nodes"];

/* ------------------------------- Comercial -------------------------------- */

/** V2 — tres bloques conectados que se activan en cadena (chat → agenda → CRM). */
export function CommercialFunctions() {
  const [attach, clock] = useDemoClock<HTMLDivElement>({ id: "commercial-functions", duration: 6400, autoplay: true });
  const { t } = clock;
  const calStage: 0 | 1 | 2 | 3 = t < 2600 ? 0 : t < 3400 ? 1 : t < 4200 ? 2 : 3;
  const chatT = Math.min(t, 4600);
  return (
    <div ref={attach}>
      <DemoFrame title="Del mensaje al registro" controls={controlsOf(clock)} product>
        <ol className="mk-cm-blocks">
          <li className={t >= 0 ? "is-on" : undefined}>
            <h3 className="mk-h5">{COMMERCIAL.blocks[0].title}</h3>
            <p className="mk-small mk-muted">{COMMERCIAL.blocks[0].body}</p>
            <ChatThread script={SCRIPTS.ventas} t={chatT} times={[0, 900, 1600, 2200]} />
          </li>
          <li className={t >= 2600 ? "is-on" : "is-off"}>
            <h3 className="mk-h5">{COMMERCIAL.blocks[1].title}</h3>
            <p className="mk-small mk-muted">{COMMERCIAL.blocks[1].body}</p>
            <CalendarTimelineView stage={calStage} compact />
          </li>
          <li className={t >= 4400 ? "is-on" : "is-off"}>
            <h3 className="mk-h5">{COMMERCIAL.blocks[2].title}</h3>
            <p className="mk-small mk-muted">{COMMERCIAL.blocks[2].body}</p>
            <CrmTable rows={[CRM_ROW_NEW]} highlightId={t >= 4400 ? CRM_ROW_NEW.id : null} />
          </li>
        </ol>
      </DemoFrame>
    </div>
  );
}

export function CommercialFlow() {
  return <FlowPlayer title="Flujo del Agente Comercial" nodes={nodesOf(COMMERCIAL.flow)} instance="comercial-v4" />;
}

/* -------------------------------- Cobranza -------------------------------- */

const REVIEW_SCRIPT: ChatScript = {
  id: "S-COBRO-EXC",
  title: "Excepción con revisión",
  messages: [
    { from: "person", text: "¿Podemos acordar otro plazo?" },
    { from: "agent", text: "Lo derivo al equipo con el historial; una persona revisa la solicitud." },
  ],
  tool: { verb: "Derivar con contexto", detail: "INV-DEMO-1043" },
  receipt: { id: "INV-DEMO-1043", area: "Cobranza", status: "Por revisar" },
} as unknown as ChatScript;

/** W3 — tres cards con microinterfaz de 240 px (etapas, barras relativas, excepción). */
export function CollectionsCards() {
  const [attach, clock] = useDemoClock<HTMLDivElement>({ id: "collections-cards", duration: 3600, autoplay: true });
  const { t } = clock;
  const total = PORTFOLIO.reduce((s, i) => s + i.amountCLP, 0);
  const max = Math.max(...PORTFOLIO.map((i) => i.amountCLP));
  return (
    <div ref={attach} className="mk-col-cards">
      <article className="mk-col-card">
        <h3 className="mk-h5">{COLLECTIONS.cards[0].title}</h3>
        <p className="mk-small mk-muted">{COLLECTIONS.cards[0].lead}</p>
        <ol className="mk-col-stages">
          {COLLECTIONS.stages.map((stage, i) => (
            <li key={stage} className={t >= 300 + i * 700 ? "is-on" : undefined}>
              <span>{stage}</span>
              <StatusChip status={t >= 300 + i * 700 ? "completado" : "pendiente"} label={t >= 300 + i * 700 ? "Mensaje definido" : "Por definir"} />
            </li>
          ))}
        </ol>
        <p className="mk-small mk-muted">Un recordatorio no marca la factura como pagada.</p>
      </article>

      <article className="mk-col-card">
        <h3 className="mk-h5">{COLLECTIONS.cards[1].title}</h3>
        <p className="mk-small mk-muted">{COLLECTIONS.cards[1].lead}</p>
        <ul className="mk-col-bars" aria-label="Importes relativos de la cartera de ejemplo">
          {PORTFOLIO.map((inv, i) => (
            <li key={inv.id}>
              <span className="mk-mono mk-small">{inv.id}</span>
              <span className="mk-col-bars__track" aria-hidden>
                <span
                  className="mk-col-bars__fill"
                  style={{ width: t >= 300 + i * 500 ? `${(inv.amountCLP / max) * 100}%` : "0%" }}
                />
              </span>
              <span className="mk-tabular mk-small">{formatCLP(inv.amountCLP)}</span>
            </li>
          ))}
        </ul>
        <p className="mk-small">
          <strong>Cartera de ejemplo:</strong> <span className="mk-tabular">{formatCLP(total)}</span> · barras
          relativas, no miden rendimiento.
        </p>
      </article>

      <article className="mk-col-card">
        <h3 className="mk-h5">{COLLECTIONS.cards[2].title}</h3>
        <p className="mk-small mk-muted">{COLLECTIONS.cards[2].lead}</p>
        <ChatThread script={REVIEW_SCRIPT} t={Math.min(t, 2600)} times={[300, 1500]} />
        {t >= 2400 ? <HumanReviewNote>Una solicitud de acuerdo no se aprueba automáticamente.</HumanReviewNote> : null}
      </article>
    </div>
  );
}

type Col = "estado" | "gestion" | null;

interface Row extends PortfolioInvoice {
  last: string | null;
  review?: boolean;
}

const INITIAL_ROWS: readonly Row[] = PORTFOLIO.map((p) => ({
  ...p,
  last: p.status === "paid" ? "Pago registrado (ejemplo)" : null,
}));

const STATUS_LABEL = { pending: "Pendiente", overdue: "Vencida", paid: "Pagada" } as const;

/** W4 — pasos numerados a la izquierda y cartera de ejemplo con acciones locales a la derecha. */
export function CollectionsFlow() {
  const uid = useId();
  const [step, setStep] = useState(0);
  const [rows, setRows] = useState<readonly Row[]>(INITIAL_ROWS);
  const [unavailable, setUnavailable] = useState(false);
  const highlight: Col = step === 0 || step === 3 ? "estado" : "gestion";

  const total = rows.reduce((s, r) => s + r.amountCLP, 0);
  const pending = rows.filter((r) => r.status !== "paid").reduce((s, r) => s + r.amountCLP, 0);
  const paid = total - pending;

  function remind() {
    setUnavailable(false);
    setRows((rs) =>
      rs.map((r) => (r.status === "paid" ? r : { ...r, last: "Recordatorio simulado" })),
    );
    setStep(1);
  }
  function pay() {
    setUnavailable(false);
    setRows((rs) =>
      rs.map((r) => (r.id === "INV-DEMO-1042" ? { ...r, status: "paid", last: "Pago confirmado (ejemplo)" } : r)),
    );
    setStep(3);
  }
  function reset() {
    setRows(INITIAL_ROWS);
    setUnavailable(false);
    setStep(0);
  }

  return (
    <div className="mk-col-flow">
      <ol className="mk-col-steps" aria-label="Pasos del flujo">
        {COLLECTIONS.steps.map((s, i) => (
          <li key={s.title}>
            <button
              type="button"
              className="mk-col-steps__btn"
              aria-current={step === i ? "step" : undefined}
              onClick={() => setStep(i)}
            >
              <span className="mk-steps__num" aria-hidden>
                {String(i + 1).padStart(2, "0")}
              </span>
              <span>
                <span className="mk-h6">{s.title}</span>
                <span className="mk-small mk-muted mk-col-steps__body">{s.body}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>

      <DemoFrame title="Cartera de ejemplo" label="Cartera de ejemplo" product>
        <div className={`mk-col-table mk-col-table--${highlight ?? "none"}`}>
          <table className="mk-table">
            <caption className="mk-sr-only">Cartera de ejemplo con tres facturas</caption>
            <thead>
              <tr>
                <th scope="col">Factura</th>
                <th scope="col" data-col="estado">Estado</th>
                <th scope="col">Importe</th>
                <th scope="col" data-col="gestion">Última gestión</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <th scope="row" data-label="Factura">
                    <span className="mk-mono">{r.id}</span>
                    <span className="mk-small mk-muted"> · {r.customer}</span>
                  </th>
                  <td data-label="Estado" data-col="estado">
                    <StatusChip
                      status={unavailable && r.status !== "paid" ? "revision" : r.status === "paid" ? "completado" : r.status === "overdue" ? "error" : "pendiente"}
                      label={unavailable && r.status !== "paid" ? "En revisión" : STATUS_LABEL[r.status]}
                    />
                  </td>
                  <td data-label="Importe" className="mk-tabular">{formatCLP(r.amountCLP)}</td>
                  <td data-label="Última gestión" data-col="gestion">{r.last ?? "Sin gestiones"}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">Cartera</th>
                <td colSpan={3} className="mk-tabular">
                  {formatCLP(total)} · Pendiente {formatCLP(pending)} · Pagado {formatCLP(paid)}
                </td>
              </tr>
            </tfoot>
          </table>
          {unavailable ? (
            <p className="mk-note mk-note--review" role="status">
              La fuente no está disponible en el ejemplo. Los datos se conservan y quedan en revisión.
            </p>
          ) : null}
          <div className="mk-invoice__actions" id={`${uid}-actions`}>
            <Button size="sm" variant="secondary" onClick={remind}>Simular recordatorio</Button>
            <Button size="sm" variant="secondary" onClick={pay} disabled={rows[0].status === "paid"}>Simular pago confirmado</Button>
            <Button size="sm" variant="secondary" onClick={() => { setUnavailable(true); setStep(0); }}>Simular servicio no disponible</Button>
            <Button size="sm" variant="tertiary" onClick={reset}>Restablecer</Button>
          </div>
          <p className="mk-small mk-muted">Sin cargos ni enlaces de pago reales. Fecha del ejemplo: 21-09-2026.</p>
        </div>
      </DemoFrame>
    </div>
  );
}
