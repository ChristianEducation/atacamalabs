"use client";

import { useId, useState } from "react";
import {
  Activity,
  BarChart3,
  CalendarDays,
  ChevronLeft,
  Inbox,
  MessageSquare,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/Button";
import { StatusChip, type StatusKey } from "../ui/Badge";
import { CapabilitySelector } from "../ui/CapabilitySelector";
import { DemoFrame } from "./DemoFrame";
import { Bubble, ActionReceipt } from "./chat";
import { KpiList } from "./records";
import { controlsOf } from "./ScenarioDemos";
import { useDemoClock } from "../motion/useDemoClock";
import { PLATFORM_CONTACTS, type PlatformContact } from "@/content/marketing/fixtures";

type View = "conversaciones" | "contactos" | "agenda" | "actividad" | "metricas";

const VIEWS: readonly { id: View; label: string; Icon: typeof Inbox }[] = [
  { id: "conversaciones", label: "Conversaciones", Icon: MessageSquare },
  { id: "contactos", label: "Contactos", Icon: Users },
  { id: "agenda", label: "Agenda", Icon: CalendarDays },
  { id: "actividad", label: "Actividad", Icon: Activity },
  { id: "metricas", label: "Métricas", Icon: BarChart3 },
];

const STATUS_CHIP: Record<PlatformContact["status"], StatusKey> = {
  Abierta: "pendiente",
  "En seguimiento": "revision",
  Cerrada: "completado",
};

interface PState {
  statuses: Record<string, PlatformContact["status"]>;
  extraEvents: string[];
}

const BASE_ACTIVITY = [
  "Conversación P-DEMO-01 recibida por Web",
  "Cambio de hora solicitado por P-DEMO-02 (WhatsApp)",
  "Cierre registrado para P-DEMO-03",
];

/**
 * E31 PlatformWorkbench — maqueta ilustrativa del centro de operación:
 * rail + bandeja + conversación + contexto (≥1200), barra de vistas (<1024),
 * ninguna llamada remota ni login. `compact` = bloque F10 de Home (lista de
 * conversaciones + detalle seleccionado, sin sidebar completa). Fixture P-DEMO.
 */
export function PlatformWorkbench({ compact }: { compact?: boolean }) {
  const uid = useId();
  const [view, setView] = useState<View>("conversaciones");
  const [selectedId, setSelectedId] = useState<string>(PLATFORM_CONTACTS[0].id);
  const [mobileDetail, setMobileDetail] = useState(false);
  const [interacted, setInteracted] = useState(false);
  const [state, setState] = useState<PState>({
    statuses: Object.fromEntries(PLATFORM_CONTACTS.map((c) => [c.id, c.status])),
    extraEvents: [],
  });
  const [attach, clock] = useDemoClock<HTMLDivElement>({ id: `platform-${uid}`, duration: 3000, autoplay: !compact });
  const t = interacted || compact ? 3000 : clock.t;

  const selected = PLATFORM_CONTACTS.find((c) => c.id === selectedId) ?? PLATFORM_CONTACTS[0];
  const status = state.statuses[selected.id];
  const values = Object.values(state.statuses);
  const open = values.filter((s) => s !== "Cerrada").length;
  const closed = values.filter((s) => s === "Cerrada").length;
  const resolvable = selected.id === "P-DEMO-01" && status !== "Cerrada";

  function pick(id: string) {
    setInteracted(true);
    setSelectedId(id);
    setMobileDetail(true);
  }
  function resolve() {
    setInteracted(true);
    setState((prev) => ({
      statuses: { ...prev.statuses, "P-DEMO-01": "Cerrada" },
      extraEvents: [...prev.extraEvents, "Ejemplo resuelto: P-DEMO-01 pasó a Cerrada"],
    }));
  }
  function reset() {
    setState({ statuses: Object.fromEntries(PLATFORM_CONTACTS.map((c) => [c.id, c.status])), extraEvents: [] });
  }

  const list = (
    <ul className="mk-inbox" aria-label="Conversaciones de ejemplo">
      {PLATFORM_CONTACTS.slice(0, compact ? 3 : 3).map((c) => (
        <li key={c.id}>
          <button
            type="button"
            className={cn("mk-inbox__item", c.id === selected.id && "is-selected")}
            aria-current={c.id === selected.id ? "true" : undefined}
            onClick={() => pick(c.id)}
          >
            <span className="mk-avatar" aria-hidden>
              {c.initials}
            </span>
            <span className="mk-inbox__text">
              <span className="mk-inbox__name">
                {c.name} · {c.company}
              </span>
              <span className="mk-inbox__excerpt">{c.excerpt}</span>
              <span className="mk-inbox__meta">
                {c.channel} (ejemplo) · <StatusChip status={STATUS_CHIP[state.statuses[c.id]]} label={state.statuses[c.id]} />
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );

  const conversation = (
    <div className="mk-conv">
      {!compact ? (
        <button type="button" className="mk-conv__back" onClick={() => setMobileDetail(false)}>
          <ChevronLeft size={16} aria-hidden /> Volver a conversaciones
        </button>
      ) : null}
      <div className="mk-conv__head">
        <p className="mk-conv__title">
          {selected.name} · {selected.company}
        </p>
        <StatusChip status={STATUS_CHIP[status]} label={status} />
      </div>
      <div className="mk-conv__body">
        {selected.messages.map((m, i) => (t >= i * 1200 ? <Bubble key={i} message={m} /> : null))}
        {t >= 2200 ? (
          <ActionReceipt
            title="Registro de la conversación"
            receipt={{ id: selected.id, area: selected.nextAction ?? "Sin acción pendiente", status }}
            className="is-new"
          />
        ) : null}
      </div>
      {!compact ? (
        <div className="mk-conv__actions">
          <Button size="sm" variant="secondary" disabled={!resolvable} onClick={resolve}>
            Resolver ejemplo
          </Button>
          <Button size="sm" variant="tertiary" onClick={reset}>
            Restablecer
          </Button>
        </div>
      ) : null}
    </div>
  );

  const context = (
    <aside className="mk-ctx" aria-label="Contexto del contacto">
      <p className="mk-eyebrow">Contexto</p>
      <p className="mk-ctx__name">{selected.company}</p>
      <p className="mk-small">Contacto {selected.id} · sin teléfono ni correo</p>
      <p className="mk-ctx__next">
        <strong>Siguiente acción:</strong> {selected.nextAction ?? "Ninguna"}
      </p>
      {selected.id === "P-DEMO-02" ? <p className="mk-small">Cita: 24-09-2026 11:00 · America/Santiago</p> : null}
    </aside>
  );

  const other = (
    <div className="mk-view">
      {view === "contactos" ? (
        <table className="mk-table">
          <caption className="mk-sr-only">Contactos de ejemplo</caption>
          <thead>
            <tr>
              <th scope="col">Contacto</th>
              <th scope="col">Empresa</th>
              <th scope="col">Estado</th>
            </tr>
          </thead>
          <tbody>
            {PLATFORM_CONTACTS.map((c) => (
              <tr key={c.id} className={c.id === selected.id ? "is-selected" : undefined}>
                <th scope="row" data-label="Contacto">
                  <button type="button" className="mk-crm__pick" aria-pressed={c.id === selected.id} onClick={() => pick(c.id)}>
                    {c.name} <span className="mk-mono">{c.id}</span>
                  </button>
                </th>
                <td data-label="Empresa">{c.company}</td>
                <td data-label="Estado">
                  <StatusChip status={STATUS_CHIP[state.statuses[c.id]]} label={state.statuses[c.id]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      {view === "agenda" ? (
        <div className="mk-agenda-one">
          <CalendarDays size={20} aria-hidden />
          <div>
            <p className="mk-h6">Cambio de hora · Dani, Estudio Desierto Demo</p>
            <p className="mk-small">Jueves 24-09-2026 · 11:00 · America/Santiago (ejemplo)</p>
          </div>
        </div>
      ) : null}
      {view === "actividad" ? (
        <ul className="mk-activity">
          {[...BASE_ACTIVITY, ...state.extraEvents].map((event) => (
            <li key={event}>{event}</li>
          ))}
        </ul>
      ) : null}
      {view === "metricas" ? (
        <KpiList
          items={[
            { label: "Conversaciones", value: PLATFORM_CONTACTS.length },
            { label: "Abiertas", value: open },
            { label: "Cerradas", value: closed },
            { label: "Citas", value: 1 },
          ]}
        />
      ) : null}
    </div>
  );

  if (compact) {
    return (
      <DemoFrame title="Centro de operación · Ejemplo ilustrativo" console className="mk-frame--platform is-compact" label="Centro de operación (vista breve)">
        <div className="mk-platform is-compact">
          {list}
          {conversation}
        </div>
      </DemoFrame>
    );
  }

  return (
    <div ref={attach}>
      <DemoFrame
        title="Centro de operación · Ejemplo ilustrativo"
        console
        product
        controls={controlsOf(clock)}
        className="mk-frame--platform"
        label="Centro de operación de ejemplo"
      >
        <div className="mk-platform" data-detail={mobileDetail || undefined}>
          <nav className="mk-platform__rail" aria-label="Vistas del centro de operación">
            {VIEWS.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                className="mk-rail__btn"
                aria-pressed={view === id}
                title={label}
                onClick={() => setView(id)}
              >
                <Icon size={20} aria-hidden />
                <span className="mk-sr-only">{label}</span>
              </button>
            ))}
          </nav>
          <div className="mk-platform__views">
            <CapabilitySelector
              tabs={VIEWS.map((v) => ({ id: v.id, label: v.label }))}
              value={view}
              onChange={(id) => setView(id as View)}
              panelId={`${uid}-view`}
              idPrefix={`${uid}-views`}
              selectLabel="Vista"
              ariaLabel="Vistas de la plataforma de ejemplo"
            />
          </div>
          <div className="mk-platform__main" id={`${uid}-view`}>
            {view === "conversaciones" ? (
              <>
                <div className="mk-platform__list">{list}</div>
                <div className="mk-platform__conv">{conversation}</div>
                <div className="mk-platform__ctx">{context}</div>
              </>
            ) : (
              <div className="mk-platform__other">{other}</div>
            )}
          </div>
        </div>
      </DemoFrame>
    </div>
  );
}
