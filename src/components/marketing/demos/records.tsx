"use client";

import { useEffect, useReducer, useState, type ReactNode } from "react";
import { CalendarDays, Check, FileText, ListTodo } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/Button";
import { StatusChip, type StatusKey } from "../ui/Badge";
import {
  CALENDAR_SLOTS,
  CALENDAR_WEEK,
  INVOICE,
  type CrmRow,
  type Slot,
} from "@/content/marketing/fixtures";

const clp = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 });
export const formatCLP = (amount: number) => `CLP $${clp.format(amount)}`;

/* ------------------------------ E9 CRMRow / tabla ------------------------- */

/** Tabla semántica de oportunidades: 4 columnas en desktop, cards en móvil (CSS). */
export function CrmTable({
  rows,
  selectedId,
  onSelect,
  highlightId,
  caption = "Oportunidades de ejemplo",
}: {
  rows: readonly CrmRow[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  highlightId?: string | null;
  caption?: string;
}) {
  return (
    <table className="mk-table mk-crm">
      <caption className="mk-sr-only">{caption}</caption>
      <thead>
        <tr>
          <th scope="col">Empresa / contacto</th>
          <th scope="col">Etapa</th>
          <th scope="col">Responsable</th>
          <th scope="col">Última acción</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const selected = selectedId === row.id;
          return (
            <tr
              key={row.id}
              className={cn(
                "mk-crm__row",
                selected && "is-selected",
                highlightId === row.id && "is-new",
              )}
            >
              <th scope="row" data-label="Empresa / contacto">
                {onSelect ? (
                  <button
                    type="button"
                    className="mk-crm__pick"
                    aria-pressed={selected}
                    onClick={() => onSelect(row.id)}
                  >
                    <span className="mk-crm__company">{row.company}</span>
                    <span className="mk-crm__sub">{row.contact}</span>
                    <span className="mk-mono mk-crm__id">{row.id}</span>
                  </button>
                ) : (
                  <>
                    <span className="mk-crm__company">{row.company}</span>
                    <span className="mk-crm__sub">{row.contact}</span>
                    <span className="mk-mono mk-crm__id">{row.id}</span>
                  </>
                )}
              </th>
              <td data-label="Etapa">
                <StatusChip
                  status={row.stage === "Sin próxima acción" ? "pendiente" : "completado"}
                  label={row.stage}
                />
              </td>
              <td data-label="Responsable">{row.owner}</td>
              <td data-label="Última acción">{row.lastAction}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/* ------------------------------ Tarea (TaskCard) -------------------------- */

export function TaskCard({
  id,
  title,
  owner,
  done,
  onToggle,
}: {
  id: string;
  title: string;
  owner: string;
  done: boolean;
  onToggle?: () => void;
}) {
  return (
    <div className={cn("mk-task", done && "is-done")}>
      <span className="mk-task__icon" aria-hidden>
        <ListTodo size={20} />
      </span>
      <div className="mk-task__text">
        <p className="mk-task__title">{title}</p>
        <p className="mk-task__meta">
          <span className="mk-mono">{id}</span> · {owner}
        </p>
      </div>
      <StatusChip status={done ? "completado" : "pendiente"} label={done ? "Completada" : "Pendiente"} />
      {onToggle ? (
        <button type="button" className="mk-link-btn" onClick={onToggle}>
          {done ? "Restablecer ejemplo" : "Simular tarea completada"}
        </button>
      ) : null}
    </div>
  );
}

/* ---------------------------- E13 KPI / ProgressCard ---------------------- */

export function KpiList({
  items,
  className,
}: {
  items: readonly { label: string; value: number; hint?: string }[];
  className?: string;
}) {
  return (
    <dl className={cn("mk-kpis", className)}>
      {items.map((item) => (
        <div key={item.label} className="mk-kpi">
          <dd className="mk-kpi__value mk-tabular">{item.value}</dd>
          <dt className="mk-kpi__label">{item.label}</dt>
          {item.hint ? <p className="mk-kpi__hint">{item.hint}</p> : null}
        </div>
      ))}
    </dl>
  );
}

/* ------------------------------- E11 InvoiceCard -------------------------- */

export type InvoiceStatus = "pending" | "paid";

export function InvoiceCard({
  status,
  processing,
  lastManagement,
  className,
  children,
}: {
  status: InvoiceStatus;
  processing?: boolean;
  lastManagement: string | null;
  className?: string;
  children?: ReactNode;
}) {
  const chip: StatusKey = status === "paid" ? "completado" : processing ? "procesando" : "pendiente";
  return (
    <div className={cn("mk-invoice", className)}>
      <div className="mk-invoice__head">
        <span className="mk-invoice__icon" aria-hidden>
          <FileText size={24} />
        </span>
        <div>
          <p className="mk-invoice__id mk-mono">{INVOICE.id}</p>
          <p className="mk-invoice__customer">{INVOICE.customer}</p>
        </div>
        <StatusChip status={chip} label={status === "paid" ? "Pagada" : processing ? "Procesando" : "Pendiente"} />
      </div>
      <p className="mk-invoice__amount mk-tabular" aria-label={`Monto ${formatCLP(INVOICE.amountCLP)}`}>
        {formatCLP(INVOICE.amountCLP)}
      </p>
      <p className="mk-invoice__due">
        Vence el {INVOICE.due}
        {status === "paid" ? " · Pago registrado en el ejemplo" : ""}
      </p>
      <p className="mk-invoice__last" aria-live="polite">
        {lastManagement ? (
          <>
            <Check size={14} aria-hidden /> Última gestión: {lastManagement}
          </>
        ) : (
          "Sin gestiones registradas."
        )}
      </p>
      {children}
    </div>
  );
}

/** Estado local de la factura de ejemplo (R4.3): recordatorio → pago → restablecer. */
export function InvoiceInteractive({ compact }: { compact?: boolean }) {
  const [status, setStatus] = useState<InvoiceStatus>("pending");
  const [last, setLast] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!processing) return;
    const timer = window.setTimeout(() => {
      setProcessing(false);
      setLast("Recordatorio simulado");
    }, 700);
    return () => window.clearTimeout(timer);
  }, [processing]);

  return (
    <InvoiceCard status={status} processing={processing} lastManagement={last} className={compact ? "is-compact" : undefined}>
      <div className="mk-invoice__actions">
        <Button
          size="sm"
          variant="secondary"
          disabled={processing || status === "paid"}
          onClick={() => setProcessing(true)}
        >
          Simular recordatorio
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={processing || status === "paid"}
          onClick={() => {
            setStatus("paid");
            setLast("Pago confirmado (ejemplo)");
          }}
        >
          Simular pago confirmado
        </Button>
        <Button
          size="sm"
          variant="tertiary"
          onClick={() => {
            setStatus("pending");
            setLast(null);
            setProcessing(false);
          }}
        >
          Restablecer
        </Button>
      </div>
    </InvoiceCard>
  );
}

/* --------------------------------- E10 Calendar --------------------------- */

interface CalState {
  phase: "browsing" | "selected" | "confirming" | "booked" | "no-slots";
  selected: string | null;
  booked: string | null;
  unavailable: string[];
  notice: string | null;
  day: (typeof CALENDAR_WEEK.days)[number]["id"];
}

type CalAction =
  | { type: "select"; slot: string }
  | { type: "confirm" }
  | { type: "confirmed" }
  | { type: "reprogram" }
  | { type: "conflict" }
  | { type: "no-slots" }
  | { type: "reset" }
  | { type: "day"; day: CalState["day"] };

const CAL_INITIAL: CalState = {
  phase: "browsing",
  selected: null,
  booked: null,
  unavailable: [],
  notice: null,
  day: "wed",
};

function calReducer(state: CalState, action: CalAction): CalState {
  switch (action.type) {
    case "day":
      return { ...state, day: action.day };
    case "select":
      return { ...state, phase: "selected", selected: action.slot, notice: null };
    case "confirm":
      return state.selected ? { ...state, phase: "confirming" } : state;
    case "confirmed":
      // Reprogramar libera la reserva anterior solo al confirmar la nueva.
      return { ...state, phase: "booked", booked: state.selected, selected: null, notice: null };
    case "reprogram":
      return { ...state, phase: "browsing", selected: null, notice: null };
    case "conflict":
      return state.selected
        ? {
            ...state,
            phase: "browsing",
            unavailable: [...state.unavailable, state.selected],
            selected: null,
            notice: "Ese horario ya no está disponible en el ejemplo. Elige otro.",
          }
        : state;
    case "no-slots":
      return { ...CAL_INITIAL, phase: "no-slots", day: state.day };
    case "reset":
      return CAL_INITIAL;
  }
}

function slotLabel(slot: Slot) {
  const day = CALENDAR_WEEK.days.find((d) => d.id === slot.day);
  return `${day?.full ?? ""} a las ${slot.time}`;
}

/**
 * Calendario de ejemplo interactivo (E10 + R4.3). Semana fija 21–25 septiembre
 * 2026, America/Santiago. Nunca imita disponibilidad real ni la agenda comercial.
 */
export function CalendarInteractive({ className, compact }: { className?: string; compact?: boolean }) {
  const [state, dispatch] = useReducer(calReducer, CAL_INITIAL);
  const slots = state.phase === "no-slots" ? [] : CALENDAR_SLOTS;

  useEffect(() => {
    if (state.phase !== "confirming") return;
    const timer = window.setTimeout(() => dispatch({ type: "confirmed" }), 700);
    return () => window.clearTimeout(timer);
  }, [state.phase]);

  const bookedSlot = CALENDAR_SLOTS.find((s) => s.id === state.booked);
  const selectedSlot = CALENDAR_SLOTS.find((s) => s.id === state.selected);

  return (
    <div className={cn("mk-cal", compact && "is-compact", className)}>
      <div className="mk-cal__head">
        <span className="mk-cal__icon" aria-hidden>
          <CalendarDays size={20} />
        </span>
        <div>
          <p className="mk-cal__title">{CALENDAR_WEEK.label}</p>
          <p className="mk-cal__sub">
            {CALENDAR_WEEK.range} · {CALENDAR_WEEK.timezone}
          </p>
        </div>
        {bookedSlot ? (
          <Button size="sm" variant="secondary" onClick={() => dispatch({ type: "reprogram" })}>
            Reprogramar ejemplo
          </Button>
        ) : null}
      </div>

      <div className="mk-cal__days" role="group" aria-label="Elegir día">
        {CALENDAR_WEEK.days.map((day) => (
          <button
            key={day.id}
            type="button"
            className="mk-cal__day"
            aria-pressed={state.day === day.id}
            onClick={() => dispatch({ type: "day", day: day.id })}
          >
            <span>{day.short}</span>
            <strong>{day.date}</strong>
          </button>
        ))}
      </div>

      {slots.length === 0 ? (
        <p className="mk-cal__empty" role="status">
          No hay horarios disponibles en este ejemplo.{" "}
          <button type="button" className="mk-link-btn" onClick={() => dispatch({ type: "reset" })}>
            Restablecer
          </button>
        </p>
      ) : (
        <div className="mk-cal__grid">
          {CALENDAR_WEEK.days.map((day) => {
            const daySlots = slots.filter((slot) => slot.day === day.id);
            return (
              <div key={day.id} className="mk-cal__col" data-active={state.day === day.id || undefined}>
                <p className="mk-cal__colhead">
                  {day.short} {day.date}
                </p>
                {daySlots.length === 0 ? (
                  <p className="mk-cal__none">Sin horarios en este ejemplo</p>
                ) : (
                  daySlots.map((slot) => {
                    const isBooked = state.booked === slot.id;
                    const isSelected = state.selected === slot.id;
                    const isUnavailable = state.unavailable.includes(slot.id);
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        className={cn(
                          "mk-slot",
                          isSelected && "is-selected",
                          isBooked && "is-booked",
                          isUnavailable && "is-unavailable",
                        )}
                        aria-pressed={isSelected}
                        disabled={isUnavailable || isBooked || state.phase === "confirming"}
                        onClick={() => dispatch({ type: "select", slot: slot.id })}
                      >
                        <span className="mk-tabular">{slot.time}</span>
                        <span className="mk-slot__status">
                          {isBooked ? (
                            <>
                              <Check size={14} aria-hidden /> Reservado
                            </>
                          ) : isUnavailable ? (
                            "No disponible"
                          ) : isSelected ? (
                            <>
                              <Check size={14} aria-hidden /> Elegido
                            </>
                          ) : (
                            "Disponible"
                          )}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mk-cal__foot" aria-live="polite">
        {state.notice ? <p className="mk-note mk-note--warn">{state.notice}</p> : null}
        {state.phase === "selected" && selectedSlot ? (
          <div className="mk-cal__confirm">
            <p>Horario elegido: {slotLabel(selectedSlot)}.</p>
            <Button size="sm" onClick={() => dispatch({ type: "confirm" })}>
              Confirmar ejemplo
            </Button>
          </div>
        ) : null}
        {state.phase === "confirming" ? <p className="mk-cal__loading">Confirmando el ejemplo…</p> : null}
        {state.phase === "booked" && bookedSlot ? (
          <p className="mk-note mk-note--ok">
            <Check size={16} aria-hidden /> Reserva de ejemplo creada · {slotLabel(bookedSlot)} · <span className="mk-mono">RES-DEMO-1042</span>
          </p>
        ) : null}
      </div>

      <details className="mk-demo-tools">
        <summary>Probar otro resultado</summary>
        <div className="mk-demo-tools__row">
          <Button size="sm" variant="secondary" disabled={!state.selected} onClick={() => dispatch({ type: "conflict" })}>
            Simular conflicto
          </Button>
          <Button size="sm" variant="secondary" onClick={() => dispatch({ type: "no-slots" })}>
            Simular sin horarios
          </Button>
          <Button size="sm" variant="tertiary" onClick={() => dispatch({ type: "reset" })}>
            Restablecer
          </Button>
        </div>
      </details>
    </div>
  );
}

/** Vista de calendario controlada por línea de tiempo (demos de agente): no interactiva. */
export function CalendarTimelineView({
  stage,
  compact,
}: {
  /** 0: solo horarios · 1: horario elegido · 2: reservando · 3: reservado. */
  stage: 0 | 1 | 2 | 3;
  compact?: boolean;
}) {
  const wed = CALENDAR_SLOTS.find((s) => s.id === "SLOT-DEMO-23-1630");
  const thu = CALENDAR_SLOTS.find((s) => s.id === "SLOT-DEMO-24-1100");
  const rows = [wed, thu].filter(Boolean) as Slot[];
  return (
    <div className={cn("mk-cal mk-cal--view", compact && "is-compact")}>
      <div className="mk-cal__head">
        <span className="mk-cal__icon" aria-hidden>
          <CalendarDays size={20} />
        </span>
        <div>
          <p className="mk-cal__title">{CALENDAR_WEEK.label}</p>
          <p className="mk-cal__sub">
            {CALENDAR_WEEK.range} · {CALENDAR_WEEK.timezone}
          </p>
        </div>
      </div>
      <ul className="mk-cal__list">
        {rows.map((slot) => {
          const isWed = slot.id === "SLOT-DEMO-23-1630";
          const booked = isWed && stage === 3;
          const selected = isWed && (stage === 1 || stage === 2);
          return (
            <li
              key={slot.id}
              className={cn("mk-slot", selected && "is-selected", booked && "is-booked")}
            >
              <span className="mk-tabular">{slotLabel(slot)}</span>
              <span className="mk-slot__status">
                {booked ? (
                  <>
                    <Check size={14} aria-hidden /> Reservado
                  </>
                ) : selected ? (
                  stage === 2 ? "Confirmando…" : "Elegido"
                ) : (
                  "Disponible"
                )}
              </span>
            </li>
          );
        })}
      </ul>
      {stage === 3 ? (
        <p className="mk-note mk-note--ok">
          <Check size={16} aria-hidden /> Reserva de ejemplo creada · <span className="mk-mono">RES-DEMO-1042</span>
        </p>
      ) : null}
    </div>
  );
}
