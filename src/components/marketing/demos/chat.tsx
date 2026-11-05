import type { ReactNode } from "react";
import { FileCheck2, Search, UserRoundCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusChip, type StatusKey } from "../ui/Badge";
import {
  CHAT_TIMELINE,
  messageAt,
  typingWindow,
  type ChatScript,
  type ScriptMessage,
} from "@/content/marketing/fixtures";

/** E7 TypingBubble: tres puntos aria-hidden + texto accesible estático. */
export function TypingBubble() {
  return (
    <div className="mk-typing" role="status">
      <span className="mk-sr-only">Preparando respuesta de ejemplo</span>
      <span className="mk-typing__dots" aria-hidden>
        <i />
        <i />
        <i />
      </span>
    </div>
  );
}

/**
 * E6 AgentChat — hilo determinista: los mensajes visibles son función pura
 * del tiempo `t` (R4.1). Todo el guion queda disponible para lectores de
 * pantalla en el resumen estático; la región visual no anuncia por letra.
 */
export function ChatThread({
  script,
  t,
  className,
  max,
  times,
}: {
  script: ChatScript;
  t: number;
  className?: string;
  /** Limita los mensajes visibles (p. ej. 3 en móvil se resuelve por CSS). */
  max?: number;
  /** Instantes propios por mensaje (demos encadenadas); por defecto R4.1. */
  times?: readonly number[];
}) {
  const count = script.messages.length;
  const visible = script.messages
    .map((message, index) => ({ message, index, at: times ? times[index] ?? 0 : messageAt(index, count) }))
    .filter((entry) => t >= entry.at);
  const typing = typingWindow(script);
  const showTyping = typing !== null && t >= typing.from && t < typing.to;
  const shown = max ? visible.slice(-max) : visible;

  return (
    <div className={cn("mk-chat", className)}>
      <div className="mk-chat__head">
        <span className="mk-chat__avatar" aria-hidden>
          AG
        </span>
        <div>
          <p className="mk-chat__name">Agente de ejemplo</p>
          <p className="mk-chat__state">{script.title}</p>
        </div>
      </div>
      <div className="mk-chat__body" role="log" aria-label="Conversación de ejemplo" aria-live="off">
        {shown.map(({ message, index }) => (
          <Bubble key={index} message={message} />
        ))}
        {showTyping ? <TypingBubble /> : null}
      </div>
      <ol className="mk-sr-only">
        {script.messages.map((message, index) => (
          <li key={index}>
            {message.from === "agent" ? "Agente" : "Persona"}: {message.text}
          </li>
        ))}
      </ol>
    </div>
  );
}

export function Bubble({ message }: { message: ScriptMessage }) {
  return (
    <p className={cn("mk-bubble", message.from === "agent" ? "mk-bubble--agent" : "mk-bubble--person")}>
      {message.text}
    </p>
  );
}

type ToolPhase = "hidden" | StatusKey;

/** Fase de la acción de negocio según R4.1: pendiente → procesando → completada. */
export function toolPhase(t: number): ToolPhase {
  if (t < CHAT_TIMELINE.toolPending) return "hidden";
  if (t < CHAT_TIMELINE.toolProcessing) return "pendiente";
  if (t < CHAT_TIMELINE.receipt) return "procesando";
  return "completado";
}

/** E8 ToolCall — verbo 14/500, detalle 12, StatusChip. Sin jerga técnica pública. */
export function ToolCall({
  verb,
  detail,
  status,
  icon,
  className,
  statusLabel,
}: {
  verb: string;
  detail: string;
  status: StatusKey;
  icon?: ReactNode;
  className?: string;
  statusLabel?: string;
}) {
  return (
    <div className={cn("mk-tool", `mk-tool--${status}`, className)}>
      <span className="mk-tool__icon" aria-hidden>
        {icon ?? <Search size={16} />}
      </span>
      <div className="mk-tool__text">
        <p className="mk-tool__verb">{verb}</p>
        <p className="mk-tool__detail">{detail}</p>
      </div>
      <StatusChip status={status} label={statusLabel} />
    </div>
  );
}

/** E8 ActionReceipt — resultado de la acción con ID, área y estado. Entra con M13. */
export function ActionReceipt({
  title = "Recibo de acción",
  receipt,
  className,
  children,
}: {
  title?: string;
  receipt: ChatScript["receipt"];
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn("mk-receipt", className)}>
      <div className="mk-receipt__head">
        <span className="mk-receipt__icon" aria-hidden>
          <FileCheck2 size={18} />
        </span>
        <p className="mk-receipt__title">{title}</p>
      </div>
      <dl className="mk-receipt__grid">
        <div>
          <dt>ID</dt>
          <dd className="mk-mono">{receipt.id}</dd>
        </div>
        <div>
          <dt>Área</dt>
          <dd>{receipt.area}</dd>
        </div>
        <div>
          <dt>Estado</dt>
          <dd>
            <StatusChip status="revision" label={receipt.status} />
          </dd>
        </div>
      </dl>
      {children}
    </div>
  );
}

/** Marca de «control humano»: la acción quedó para revisión, no se ejecutó nada real. */
export function HumanReviewNote({ children }: { children: ReactNode }) {
  return (
    <p className="mk-note mk-note--review">
      <UserRoundCheck size={16} aria-hidden />
      <span>{children}</span>
    </p>
  );
}
