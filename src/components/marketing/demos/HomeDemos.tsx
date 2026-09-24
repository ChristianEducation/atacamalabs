import type { CSSProperties, ElementType, ReactNode } from "react";
import {
  Bot,
  CalendarDays,
  Check,
  Database,
  FileText,
  Inbox,
  ListChecks,
  Mail,
  Package,
  UserCheck,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { HomeSelectorId } from "@/content/marketing/home-selector";

/*
 * Demos del selector del Home (HOME_SPEC_V1 §6.5–§6.12). Gramática de motion
 * de la referencia IAutomatiza: entradas por CSS con delays escalonados
 * (bubbles, cards, filas, evento de calendario, conexión que viaja), una sola
 * reproducción. Cada elemento lleva `--d` (segundos). El estado base del CSS
 * es el estado FINAL: sin JS o con reduced-motion se ve el resultado completo.
 * Secuencia conceptual: entrada → agente → herramienta → acción → resultado.
 */

type Kind = "rise" | "slide" | "pop" | "fade" | "out" | "in" | "grow";

export function A({
  d,
  k = "rise",
  as,
  className,
  style,
  children,
}: {
  d: number;
  k?: Kind;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  const Tag = (as ?? "div") as ElementType;
  return (
    <Tag className={cn("mk-a", `mk-a--${k}`, className)} style={{ ...style, ["--d" as string]: d }}>
      {children}
    </Tag>
  );
}

export function ChatTop({ name }: { name: string }) {
  return (
    <div className="mk-dm-top">
      <span className="mk-dm-av">
        <Bot size={17} aria-hidden />
      </span>
      <span className="mk-dm-who">
        <strong>{name}</strong>
        <small>Agente · en línea</small>
      </span>
    </div>
  );
}

/** Agente → herramienta: nodos, cable que crece y punto que viaja; el estado cambia al terminar. */
export function Tool({
  d,
  tool,
  icon,
  busy,
  done,
}: {
  d: number;
  tool: string;
  icon: ReactNode;
  busy: string;
  done: string;
}) {
  return (
    <div className="mk-dm-tool">
      <A as="span" d={d} className="mk-node">
        <Bot size={14} aria-hidden /> Agente
      </A>
      <A as="span" d={d + 0.25} k="grow" className="mk-wire">
        <i />
      </A>
      <A as="span" d={d + 0.3} className="mk-node mk-node--tool">
        {icon}
        <span className="mk-node__txt">
          {tool}
          <span className="mk-swap">
            <A as="span" d={d + 1.7} k="out" className="mk-node__state">
              {busy}
            </A>
            <A as="span" d={d + 1.7} k="in" className="mk-node__state mk-node__state--ok">
              {done}
            </A>
          </span>
        </span>
      </A>
    </div>
  );
}

export function Receipt({ d, title, sub }: { d: number; title: string; sub?: string }) {
  return (
    <A d={d} k="pop" className="mk-receipt">
      <span className="mk-receipt__ic">
        <Check size={16} strokeWidth={2.6} aria-hidden />
      </span>
      <span>
        <strong>{title}</strong>
        {sub ? <small>{sub}</small> : null}
      </span>
    </A>
  );
}

/* ---------- 1 · Comercial: conversación → Calendar → evento → recibo ---------- */
function Commercial() {
  return (
    <div className="mk-dm">
      <div className="mk-dm-win">
        <ChatTop name="Atacama Labs" />
        <div className="mk-dm-body">
          <A d={0.3} className="mk-bub mk-bub--user">
            ¿Tienen disponibilidad esta semana para una reunión?
          </A>
          <A d={0.95} className="mk-bub mk-bub--bot">
            Tengo el martes a las 16:00 o el miércoles a las 17:30. ¿Cuál prefieres?
          </A>
          <A d={1.9} className="mk-bub mk-bub--user">
            El miércoles 17:30, por favor.
          </A>
        </div>
      </div>
      <Tool d={2.6} tool="Google Calendar" icon={<CalendarDays size={14} aria-hidden />} busy="Creando evento…" done="Evento creado" />
      <A d={4.4} k="pop" className="mk-event">
        <span className="mk-event__day">
          <b>MIÉ</b>17:30
        </span>
        <span>
          <strong>Reunión comercial</strong>
          <small>Calendario · 30 min</small>
        </span>
      </A>
      <div className="mk-dm-result">
        <Receipt d={5.1} title="Reunión agendada · miércoles 17:30" />
        <A d={5.6} className="mk-chip">
          <Database size={13} aria-hidden /> Oportunidad actualizada
        </A>
      </div>
    </div>
  );
}

/* ---------- 2 · Cobranza: cuentas una a una, estado y progreso ---------- */
const ACCOUNTS = [
  { name: "Constructora Andes", meta: "Factura 1042 · vencida hace 12 días", amount: "$842.000", from: "Vencida", to: "Recordatorio enviado", fill: 66 },
  { name: "Clínica del Norte", meta: "Factura 1057 · vence en 3 días", amount: "$275.000", from: "Por vencer", to: "Aviso programado", fill: 38 },
  { name: "Distribuidora Sur", meta: "Factura 1031 · vencida hace 5 días", amount: "$610.000", from: "Sin respuesta", to: "Escalada al equipo", fill: 84 },
] as const;

function Collections() {
  return (
    <div className="mk-dm">
      <A d={0.1} className="mk-dm-head">
        <Bot size={15} aria-hidden /> Agente de cobranza <span>· actualizando 3 cuentas</span>
      </A>
      {ACCOUNTS.map((a, i) => {
        const d = 0.4 + i * 0.45;
        return (
          <A key={a.name} d={d} k="slide" className="mk-acct">
            <div className="mk-acct__row">
              <span>
                <strong>{a.name}</strong>
                <small>{a.meta}</small>
              </span>
              <span className="mk-acct__amount">{a.amount}</span>
              <span className="mk-swap mk-acct__status">
                <A as="span" d={2.3 + i * 0.4} k="out" className="mk-status mk-status--late">
                  {a.from}
                </A>
                <A as="span" d={2.3 + i * 0.4} k="in" className="mk-status mk-status--ok">
                  {a.to}
                </A>
              </span>
            </div>
            <div className="mk-bar">
              <i className="mk-bar__fill" style={{ ["--fill" as string]: `${a.fill}%`, ["--d" as string]: 1.6 + i * 0.4 }} />
            </div>
          </A>
        );
      })}
      <div className="mk-dm-result">
        <Receipt d={4.3} title="Gestión registrada" sub="3 cuentas actualizadas" />
      </div>
    </div>
  );
}

/* ---------- 3 · Administrativo / Financiero: consulta → filas → resumen ---------- */
const INVOICES = [
  { id: "FAC-1821", amount: "$420.000", state: "Pendiente" },
  { id: "FAC-1834", amount: "$275.000", state: "Pendiente" },
  { id: "FAC-1840", amount: "$610.000", state: "En revisión" },
] as const;

function Finance() {
  return (
    <div className="mk-dm">
      <div className="mk-dm-win">
        <ChatTop name="Atacama Labs" />
        <div className="mk-dm-body">
          <A d={0.3} className="mk-bub mk-bub--user">
            ¿Qué facturas siguen pendientes de pago este mes?
          </A>
        </div>
      </div>
      <Tool d={1.1} tool="Sistema de facturación" icon={<FileText size={14} aria-hidden />} busy="Consultando…" done="Datos recibidos" />
      <div className="mk-rows">
        {INVOICES.map((inv, i) => (
          <A key={inv.id} d={2.9 + i * 0.5} k="slide" className="mk-rows__r">
            <span className="mk-rows__id">{inv.id}</span>
            <span className="mk-rows__amt">{inv.amount}</span>
            <span className={cn("mk-status", inv.state === "Pendiente" ? "mk-status--late" : "mk-status--info")}>{inv.state}</span>
          </A>
        ))}
        <A d={4.6} className="mk-rows__foot">
          <Check size={14} strokeWidth={2.6} aria-hidden /> 3 documentos encontrados
        </A>
      </div>
    </div>
  );
}

/* ---------- 4 · Atención: pide dato → registra → valida una persona ---------- */
function Support() {
  return (
    <div className="mk-dm">
      <div className="mk-dm-win">
        <ChatTop name="Atacama Labs" />
        <div className="mk-dm-body">
          <A d={0.3} className="mk-bub mk-bub--user">
            Necesito cambiar la dirección de mi pedido.
          </A>
          <A d={0.95} className="mk-bub mk-bub--bot">
            Claro. ¿Me indicas el número de pedido?
          </A>
          <A d={1.8} className="mk-bub mk-bub--user">
            Es el #4831.
          </A>
        </div>
      </div>
      <Tool d={2.5} tool="Sistema de pedidos" icon={<Package size={14} aria-hidden />} busy="Registrando solicitud…" done="Solicitud creada" />
      <div className="mk-dm-result">
        <Receipt d={4.3} title="Solicitud registrada · Pedido #4831" />
        <A d={4.8} className="mk-chip mk-chip--warn">
          <UserCheck size={13} aria-hidden /> Requiere validación del equipo
        </A>
      </div>
    </div>
  );
}

/* ---------- 5 · Agendamiento: calendario estable, slots, elección, evento ---------- */
const CAL_DAYS: readonly { n: number; dim?: boolean; free?: boolean; today?: boolean; picked?: boolean }[] = [
  { n: 14 }, { n: 15 }, { n: 16 }, { n: 17 }, { n: 18 }, { n: 19, dim: true }, { n: 20, dim: true },
  { n: 21 }, { n: 22 }, { n: 23, today: true }, { n: 24, free: true, picked: true }, { n: 25, free: true }, { n: 26, dim: true }, { n: 27, dim: true },
  { n: 28, free: true }, { n: 29 }, { n: 30 }, { n: 1, dim: true }, { n: 2, dim: true }, { n: 3, dim: true }, { n: 4, dim: true },
];
const SLOTS = ["16:00", "17:00", "18:15"] as const;

function Scheduling() {
  return (
    <div className="mk-dm">
      <div className="mk-dm-win">
        <ChatTop name="Atacama Labs" />
        <div className="mk-dm-body">
          <A d={0.3} className="mk-bub mk-bub--user">
            ¿Tienen horas disponibles esta semana?
          </A>
        </div>
      </div>
      <div className="mk-sched">
        <A d={0.9} k="fade" className="mk-cal">
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
                )}
              >
                {c.n}
              </span>
            ))}
          </div>
        </A>
        <div className="mk-slots">
          <A d={1.5} className="mk-slots__title">
            Jueves 24 · disponible
          </A>
          {SLOTS.map((s, i) => (
            <A key={s} d={1.7 + i * 0.25} className={cn("mk-slot", s === "18:15" && "is-picked")}>
              {s}
            </A>
          ))}
        </div>
      </div>
      <div className="mk-dm-result">
        <Receipt d={4.1} title="Jueves · 18:15 · Confirmado" />
      </div>
    </div>
  );
}

/* ---------- 6 · A Medida: solicitud → agente → CRM + correo → tarea ---------- */
function Custom() {
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
        </div>
        <A as="span" d={2.55} k="grow" className="mk-wire mk-wire--f">
          <i />
        </A>
        <A d={3.3} className="mk-fnode mk-fnode--done">
          <ListChecks size={18} aria-hidden />
          <span>Tarea creada</span>
        </A>
      </div>
      <div className="mk-dm-result">
        <Receipt d={4.2} title="Solicitud registrada · responsable asignado" />
        <A d={4.7} className="mk-chip">
          <Check size={13} aria-hidden /> CRM actualizado
        </A>
        <A d={4.9} className="mk-chip">
          <Mail size={13} aria-hidden /> Correo enviado
        </A>
      </div>
    </div>
  );
}

const SCENES: Record<HomeSelectorId, () => ReactNode> = {
  comercial: Commercial,
  cobranza: Collections,
  administrativo: Finance,
  atencion: Support,
  agendamiento: Scheduling,
  "a-medida": Custom,
};

export function HomeDemo({ id }: { id: HomeSelectorId }) {
  const Scene = SCENES[id];
  return <Scene />;
}
