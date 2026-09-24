import type { ReactNode } from "react";
import {
  Bot,
  CalendarDays,
  Check,
  Database,
  FileText,
  Inbox,
  ListChecks,
  Mail,
  Server,
  UserCheck,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentRoleId } from "@/content/marketing/agents";
import { A, ChatTop, Receipt, Tool } from "./HomeDemos";

/*
 * Demos del selector de /agentes (AGENTES_SPEC_V1 §4). Misma gramática de
 * motion que las del Home —entradas escalonadas por CSS, una sola reproducción,
 * el estado base es el final— pero cada puesto cuenta un día de trabajo más
 * completo: conversación, herramienta, acción y resultado. El chat se presenta
 * como «Tu empresa»: es el agente que el visitante incorporaría.
 */

/** Indicador de «escribiendo…» de la referencia: aparece, late y da paso a la respuesta. */
function Typing({ d }: { d: number }) {
  return (
    <span className="mk-bub mk-bub--bot mk-typing" style={{ ["--d" as string]: d }} aria-hidden>
      <i />
      <i />
      <i />
    </span>
  );
}

/* ---------- 1 · Comercial: conversación → calificación → Calendar → recibo ---------- */
function Commercial() {
  return (
    <div className="mk-dm">
      <div className="mk-dm-win">
        <ChatTop name="Tu empresa" />
        <div className="mk-dm-body">
          <A d={0.3} className="mk-bub mk-bub--user">
            Hola, quiero cotizar un servicio de mantención para 3 oficinas.
          </A>
          <A d={0.95} className="mk-bub mk-bub--bot">
            Con gusto. ¿Cuántas personas trabajan en cada oficina y cada cuánto necesitan el servicio?
          </A>
          <A d={1.9} className="mk-bub mk-bub--user">
            Unas 40 por sede. Necesitamos visitas quincenales.
          </A>
          <A d={2.75} className="mk-bub mk-bub--bot">
            Perfecto, un ejecutivo puede verlo esta semana. ¿Te sirve el jueves a las 11:00?
          </A>
          <A d={3.6} className="mk-bub mk-bub--user">
            Sí, jueves 11:00.
          </A>
        </div>
      </div>
      <Tool d={4.2} tool="Google Calendar" icon={<CalendarDays size={14} aria-hidden />} busy="Creando evento…" done="Evento creado" />
      <div className="mk-dm-result">
        <Receipt d={6.0} title="Reunión agendada · jueves 11:00" />
        <A d={6.5} className="mk-chip">
          <Database size={13} aria-hidden /> Oportunidad calificada
        </A>
        <A d={6.7} className="mk-chip">
          <Check size={13} aria-hidden /> CRM actualizado
        </A>
      </div>
    </div>
  );
}

/* ---------- 2 · Cobranza: cuentas una a una, estado y progreso ---------- */
const ACCOUNTS = [
  { name: "Comercial Norte SpA", meta: "Factura 2210 · vencida hace 9 días", amount: "$1.240.000", from: "Vencida", to: "Seguimiento programado", fill: 72 },
  { name: "Servicios Aconcagua", meta: "Factura 2233 · vence en 2 días", amount: "$386.000", from: "Por vencer", to: "Recordatorio enviado", fill: 38 },
  { name: "Taller Los Andes", meta: "Factura 2198 · vencida hace 21 días", amount: "$914.500", from: "Sin respuesta", to: "Pago informado", fill: 88 },
  { name: "Ferretería Costa", meta: "Factura 2187 · vencida hace 14 días", amount: "$530.000", from: "Vencida", to: "Pendiente", fill: 54 },
] as const;

function Collections() {
  return (
    <div className="mk-dm">
      <A d={0.1} className="mk-dm-head">
        <Bot size={15} aria-hidden /> Agente de cobranza <span>· revisando 4 cuentas</span>
      </A>
      {ACCOUNTS.map((a, i) => (
        <A key={a.name} d={0.4 + i * 0.45} k="slide" className="mk-acct">
          <div className="mk-acct__row">
            <span>
              <strong>{a.name}</strong>
              <small>{a.meta}</small>
            </span>
            <span className="mk-acct__amount">{a.amount}</span>
            <span className="mk-swap mk-acct__status">
              <A as="span" d={2.7 + i * 0.4} k="out" className="mk-status mk-status--late">
                {a.from}
              </A>
              <A as="span" d={2.7 + i * 0.4} k="in" className="mk-status mk-status--ok">
                {a.to}
              </A>
            </span>
          </div>
          <div className="mk-bar">
            <i className="mk-bar__fill" style={{ ["--fill" as string]: `${a.fill}%`, ["--d" as string]: 1.9 + i * 0.4 }} />
          </div>
        </A>
      ))}
      <div className="mk-dm-result">
        <Receipt d={5.0} title="Gestión registrada" sub="4 cuentas con su próxima acción" />
      </div>
    </div>
  );
}

/* ---------- 3 · Administrativo / Financiero: consulta → cruce → resumen → acción sujeta a aprobación ---------- */
const MATCHES = [
  { id: "OC-7712 · FAC-3391", amount: "$1.180.000", state: "Coincide", ok: true },
  { id: "OC-7719 · FAC-3402", amount: "$640.000", state: "Coincide", ok: true },
  { id: "OC-7724 · FAC-3415", amount: "$455.000", state: "Difiere $18.000", ok: false },
] as const;

function Finance() {
  return (
    <div className="mk-dm">
      <div className="mk-dm-win">
        <ChatTop name="Tu empresa" />
        <div className="mk-dm-body">
          <A d={0.3} className="mk-bub mk-bub--user">
            Cruza las órdenes de compra de este mes con las facturas recibidas.
          </A>
        </div>
      </div>
      <Tool d={1.0} tool="ERP · órdenes de compra" icon={<Server size={14} aria-hidden />} busy="Consultando…" done="Órdenes recibidas" />
      <Tool d={1.9} tool="Documentos · facturas" icon={<FileText size={14} aria-hidden />} busy="Leyendo…" done="Facturas leídas" />
      <div className="mk-rows">
        {MATCHES.map((m, i) => (
          <A key={m.id} d={3.6 + i * 0.5} k="slide" className="mk-rows__r">
            <span className="mk-rows__id">{m.id}</span>
            <span className="mk-rows__amt">{m.amount}</span>
            <span className={cn("mk-status", m.ok ? "mk-status--ok" : "mk-status--late")}>{m.state}</span>
          </A>
        ))}
        <A d={5.3} className="mk-rows__foot">
          <Check size={14} strokeWidth={2.6} aria-hidden /> 3 documentos cruzados · 1 con diferencia
        </A>
      </div>
      <div className="mk-dm-result">
        <A d={5.9} className="mk-chip mk-chip--warn">
          <UserCheck size={13} aria-hidden /> Ajuste propuesto · espera tu aprobación
        </A>
      </div>
    </div>
  );
}

/* ---------- 4 · Atención: pide el dato → registra → deriva con la conversación completa ---------- */
function Support() {
  return (
    <div className="mk-dm">
      <div className="mk-dm-win">
        <ChatTop name="Tu empresa" />
        <div className="mk-dm-body">
          <A d={0.3} className="mk-bub mk-bub--user">
            Necesito cambiar el titular de mi cuenta.
          </A>
          <Typing d={0.9} />
          <A d={2.05} className="mk-bub mk-bub--bot">
            Puedo iniciarlo. Necesito el nombre completo y el correo del nuevo titular.
          </A>
          <A d={3.0} className="mk-bub mk-bub--user">
            Camila Rojas, camila@empresa.cl.
          </A>
        </div>
      </div>
      <Tool d={3.7} tool="Sistema de solicitudes" icon={<Inbox size={14} aria-hidden />} busy="Registrando solicitud…" done="Solicitud creada" />
      <div className="mk-dm-result">
        <Receipt d={5.5} title="Solicitud registrada · Cambio de titular" />
        <A d={6.0} className="mk-chip mk-chip--warn">
          <UserCheck size={13} aria-hidden /> Requiere aprobación del equipo
        </A>
      </div>
      <A d={6.5} k="pop" className="mk-handoff">
        <span className="mk-handoff__ic">
          <Users size={16} aria-hidden />
        </span>
        <span>
          <strong>Derivada a Soporte</strong>
          <small>Con la conversación completa adjunta</small>
        </span>
      </A>
    </div>
  );
}

/* ---------- 5 · Agendamiento: reprogramar sobre un calendario estable ---------- */
const CAL_DAYS: readonly { n: number; dim?: boolean; free?: boolean; today?: boolean; picked?: boolean; was?: boolean }[] = [
  { n: 21 }, { n: 22 }, { n: 23, today: true }, { n: 24 }, { n: 25, was: true }, { n: 26, dim: true }, { n: 27, dim: true },
  { n: 28, free: true, picked: true }, { n: 29, free: true }, { n: 30 }, { n: 1 }, { n: 2 }, { n: 3, dim: true }, { n: 4, dim: true },
];
const SLOTS = ["10:30", "12:00", "16:45"] as const;

function Scheduling() {
  return (
    <div className="mk-dm">
      <div className="mk-dm-win">
        <ChatTop name="Tu empresa" />
        <div className="mk-dm-body">
          <A d={0.3} className="mk-bub mk-bub--user">
            Necesito cambiar mi hora del viernes.
          </A>
          <A d={0.95} className="mk-bub mk-bub--bot">
            Claro. Tengo lugar el lunes 28. ¿Qué horario te acomoda?
          </A>
        </div>
      </div>
      <div className="mk-sched">
        <A d={1.6} k="fade" className="mk-cal">
          <div className="mk-cal__head">
            <span>Septiembre 2026</span>
            <CalendarDays size={15} aria-hidden />
          </div>
          <div className="mk-cal__grid">
            {["L", "M", "M", "J", "V", "S", "D"].map((w, i) => (
              <span key={`${w}-${i}`} className="mk-cal__w">
                {w}
              </span>
            ))}
            {CAL_DAYS.map((c) => (
              <span
                key={c.n + (c.dim ? "d" : "")}
                className={cn(
                  "mk-cal__d",
                  c.dim && "is-dim",
                  c.free && "is-free",
                  c.today && "is-today",
                  c.picked && "is-picked",
                  c.was && "is-was",
                )}
              >
                {c.n}
              </span>
            ))}
          </div>
        </A>
        <div className="mk-slots">
          <A d={2.2} className="mk-slots__title">
            Lunes 28 · disponible
          </A>
          {SLOTS.map((s, i) => (
            <A key={s} d={2.4 + i * 0.25} className={cn("mk-slot", s === "12:00" && "is-picked")}>
              {s}
            </A>
          ))}
        </div>
      </div>
      <A d={4.2} k="pop" className="mk-event">
        <span className="mk-event__day">
          <b>LUN</b>12:00
        </span>
        <span>
          <strong>Cita reprogramada</strong>
          <small>Antes: viernes 25 · 15:00</small>
        </span>
      </A>
      <div className="mk-dm-result">
        <Receipt d={4.9} title="Lunes · 12:00 · Confirmado" />
        <A d={5.4} className="mk-chip">
          <Check size={13} aria-hidden /> Recordatorio programado
        </A>
      </div>
    </div>
  );
}

/* ---------- 6 · Procesos: solicitud → agente → tres herramientas → resultado ---------- */
function Processes() {
  return (
    <div className="mk-dm">
      <div className="mk-flow">
        <A d={0.3} className="mk-fnode">
          <Inbox size={18} aria-hidden />
          <span>Nueva solicitud</span>
        </A>
        <A as="span" d={0.55} k="grow" className="mk-wire mk-wire--f">
          <i />
        </A>
        <A d={1.1} className="mk-fnode mk-fnode--agent">
          <Bot size={18} aria-hidden />
          <span>Agente</span>
        </A>
        <A as="span" d={1.35} k="grow" className="mk-wire mk-wire--f">
          <i />
        </A>
        <div className="mk-fpair">
          <A d={1.9} className="mk-fnode">
            <Users size={18} aria-hidden />
            <span>CRM</span>
          </A>
          <A d={2.1} className="mk-fnode">
            <Mail size={18} aria-hidden />
            <span>Correo</span>
          </A>
          <A d={2.3} className="mk-fnode">
            <Database size={18} aria-hidden />
            <span>Base de datos</span>
          </A>
        </div>
        <A as="span" d={2.75} k="grow" className="mk-wire mk-wire--f">
          <i />
        </A>
        <A d={3.5} className="mk-fnode mk-fnode--done">
          <ListChecks size={18} aria-hidden />
          <span>Caso creado</span>
        </A>
      </div>
      <div className="mk-dm-result">
        <Receipt d={4.4} title="Caso registrado · responsable asignado" />
        <A d={4.9} className="mk-chip">
          <Check size={13} aria-hidden /> CRM actualizado
        </A>
        <A d={5.1} className="mk-chip">
          <Mail size={13} aria-hidden /> Correo enviado
        </A>
        <A d={5.3} className="mk-chip">
          <Database size={13} aria-hidden /> Registro guardado
        </A>
      </div>
    </div>
  );
}

const SCENES: Record<AgentRoleId, () => ReactNode> = {
  comercial: Commercial,
  cobranza: Collections,
  "administrativo-financiero": Finance,
  atencion: Support,
  agendamiento: Scheduling,
  procesos: Processes,
};

export function AgentDemo({ id }: { id: AgentRoleId }) {
  const Scene = SCENES[id];
  return <Scene />;
}
