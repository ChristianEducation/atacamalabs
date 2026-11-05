"use client";

import { useState, type CSSProperties } from "react";
import { ArrowLeft, Check, ChevronDown, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { AgentBust } from "../pixel/AgentBust";
import {
  CHANNELS,
  CONVERSATIONS,
  INBOX_ACTIONS,
  PLATFORM_AGENTS,
  type Channel,
  type Conversation,
} from "@/content/marketing/platform";

/** Logos de los canales (Simple Icons, monocromos) que se tiñen con el color del canal. */
const CHANNEL_LOGO: Partial<Record<Channel, string>> = {
  WhatsApp: "/visual/integrations/whatsapp.svg",
  Instagram: "/visual/integrations/instagram.svg",
  Facebook: "/visual/integrations/messenger.svg",
};

type Mode = "agent" | "human" | "resolved";

const initials = (name: string) =>
  name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

function ChannelGlyph({ channel, size, stroke }: { channel: Channel; size: number; stroke: number }) {
  const logo = CHANNEL_LOGO[channel];
  if (!logo) return <Globe size={size} strokeWidth={stroke} aria-hidden />;
  return (
    <span
      className="mk-pi-logo"
      style={
        {
          width: size,
          height: size,
          ["--glyph" as string]: `url(${logo})`,
        } as CSSProperties
      }
      aria-hidden
    />
  );
}

function ChannelTag({ channel }: { channel: Channel }) {
  return (
    <span className={cn("mk-pi-ch", `mk-pi-ch--${channel.toLowerCase()}`)} title={channel}>
      <ChannelGlyph channel={channel} size={12} stroke={2.2} />
      <span className="mk-pi-ch__name">{channel}</span>
    </span>
  );
}

function Status({ mode, agentName }: { mode: Mode; agentName: string }) {
  if (mode === "human") {
    return (
      <span className="mk-pi-status is-human" key="human">
        <i aria-hidden /> Atención humana
      </span>
    );
  }
  if (mode === "resolved") {
    return (
      <span className="mk-pi-status is-done" key="done">
        <Check size={12} strokeWidth={3} aria-hidden /> Resuelta
      </span>
    );
  }
  return (
    <span className="mk-pi-status is-agent" key="agent">
      <i aria-hidden /> Agente atendiendo · {agentName}
    </span>
  );
}

/**
 * Bandeja de la plataforma: la vista central del portal. Lista de
 * conversaciones de distintos canales, hilo con los mensajes entrando, estado
 * de quién atiende y contexto del contacto. Al «Tomar conversación» el estado
 * pasa de «Agente atendiendo» a «Atención humana» y el equipo responde sobre el
 * mismo hilo. La misma vista se reutiliza ampliada en la sección omnicanal
 * (`large`), con las cuatro acciones visibles.
 */
export function PlatformInbox({ large }: { large?: boolean }) {
  const [selectedId, setSelectedId] = useState(CONVERSATIONS[0].id);
  const [channel, setChannel] = useState<Channel | "all">("all");
  const [modes, setModes] = useState<Record<string, Mode>>({});
  const [screen, setScreen] = useState<"list" | "thread">("thread");
  const [context, setContext] = useState(false);

  const selected = CONVERSATIONS.find((c) => c.id === selectedId) ?? CONVERSATIONS[0];
  const mode: Mode = modes[selected.id] ?? "agent";
  const agent = PLATFORM_AGENTS[selected.agent];
  const list = channel === "all" ? CONVERSATIONS : CONVERSATIONS.filter((c) => c.channel === channel);

  const setMode = (next: Mode) => setModes((prev) => ({ ...prev, [selected.id]: next }));
  const choose = (conversation: Conversation) => {
    setSelectedId(conversation.id);
    setScreen("thread");
    setContext(false);
  };

  const actionState: Record<(typeof INBOX_ACTIONS)[number], { on?: boolean; disabled?: boolean; run: () => void }> = {
    "Tomar conversación": {
      on: mode === "human",
      disabled: mode === "human",
      run: () => setMode("human"),
    },
    "Devolver al agente": {
      disabled: mode === "agent",
      run: () => setMode("agent"),
    },
    "Marcar resuelta": {
      on: mode === "resolved",
      disabled: mode === "resolved",
      run: () => setMode("resolved"),
    },
    "Ver contacto": { on: context, run: () => setContext((open) => !open) },
  };

  return (
    <div className="mk-pi-box">
      <div
        className={cn("mk-pi", large && "mk-pi--lg")}
        data-screen={screen}
        data-context={context ? "open" : "closed"}
      >
        <aside className="mk-pi__list" aria-label="Conversaciones">
          <div className="mk-pi__filters" role="group" aria-label="Filtrar por canal">
            <button
              type="button"
              className="mk-pi__chip"
              aria-pressed={channel === "all"}
              onClick={() => setChannel("all")}
            >
              Todas
            </button>
            {CHANNELS.map((name) => (
              <button
                key={name}
                type="button"
                className="mk-pi__chip"
                aria-pressed={channel === name}
                aria-label={name}
                onClick={() => setChannel(name)}
              >
                <ChannelGlyph channel={name} size={13} stroke={2.1} />
                <span className="mk-pi__chip-label">{name}</span>
              </button>
            ))}
          </div>
          <ul className="mk-pi__rows">
            {list.map((conversation, index) => {
              const rowMode = modes[conversation.id] ?? "agent";
              return (
                <li key={conversation.id} style={{ ["--i" as string]: index }}>
                  <button
                    type="button"
                    className="mk-pi__row"
                    aria-current={conversation.id === selected.id ? "true" : undefined}
                    onClick={() => choose(conversation)}
                  >
                    <span className="mk-pi__avatar" aria-hidden>
                      {initials(conversation.name)}
                      <b className={cn("mk-pi__avatar-ch", `mk-pi-ch--${conversation.channel.toLowerCase()}`)}>
                        <ChannelGlyph channel={conversation.channel} size={9} stroke={2.6} />
                      </b>
                    </span>
                    <span className="mk-pi__meta">
                      <span className="mk-pi__top">
                        <strong>{conversation.name}</strong>
                        <time>{conversation.time}</time>
                      </span>
                      <span className="mk-pi__preview">{conversation.preview}</span>
                      <span className="mk-pi__who">
                        <AgentBust agent={conversation.agent} size={16} />
                        {PLATFORM_AGENTS[conversation.agent].name}
                        <em className={cn(rowMode === "human" && "is-human")}>
                          {rowMode === "human" ? "Humano" : rowMode === "resolved" ? "Resuelta" : "Agente"}
                        </em>
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
            {list.length === 0 ? <li className="mk-pi__empty">Sin conversaciones en este canal.</li> : null}
          </ul>
        </aside>

        <section className="mk-pi__thread" aria-label={`Conversación con ${selected.name}`}>
          <header className="mk-pi__head">
            <button type="button" className="mk-pi__back" onClick={() => setScreen("list")}>
              <ArrowLeft size={16} aria-hidden /> Bandeja
            </button>
            <div className="mk-pi__who-head">
              <strong>
                {selected.name} <span>— {selected.company}</span>
              </strong>
              <ChannelTag channel={selected.channel} />
            </div>
            <Status mode={mode} agentName={agent.name} />
          </header>

          <div className="mk-pi__msgs" key={selected.id}>
            {selected.messages.map((message, index) => (
              <p key={index} className={cn("mk-pi__msg", `is-${message.side}`)} style={{ ["--i" as string]: index }}>
                {message.side === "agent" ? <small>{agent.name} · agente</small> : null}
                {message.text}
              </p>
            ))}
            {mode === "human" ? (
              <p className="mk-pi__msg is-team" key="team">
                <small>Equipo · persona</small>
                {selected.teamReply}
              </p>
            ) : null}
            {mode === "agent" ? (
              <p className="mk-pi__typing" aria-hidden style={{ ["--i" as string]: selected.messages.length }}>
                <i />
                <i />
                <i />
              </p>
            ) : null}
          </div>

          <div className="mk-pi__foot">
            <div className={cn("mk-pi__composer", mode === "human" && "is-live")} aria-hidden>
              {mode === "human"
                ? "Escribe una respuesta como equipo…"
                : "El agente responde. Toma la conversación para escribir."}
            </div>
            <div className="mk-pi__actions">
              {INBOX_ACTIONS.map((label) => {
                const state = actionState[label];
                const primary = label === "Tomar conversación";
                return (
                  <button
                    key={label}
                    type="button"
                    className={cn("mk-pi__act", primary && "is-primary", primary && mode === "agent" && "is-invite")}
                    aria-pressed={label === "Ver contacto" ? state.on : undefined}
                    disabled={state.disabled}
                    onClick={state.run}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <aside className="mk-pi__ctx" aria-label="Contexto del contacto">
          <button
            type="button"
            className="mk-pi__ctx-toggle"
            aria-expanded={context}
            onClick={() => setContext((open) => !open)}
          >
            Contexto del contacto <ChevronDown size={16} aria-hidden />
          </button>
          <div className="mk-pi__ctx-body" key={selected.id}>
            <div className="mk-pi__ctx-id">
              <span className="mk-pi__avatar mk-pi__avatar--lg" aria-hidden>
                {initials(selected.name)}
              </span>
              <span>
                <strong>{selected.name}</strong>
                <small>{selected.company}</small>
              </span>
            </div>
            <dl>
              <div>
                <dt>Canal</dt>
                <dd>{selected.channel}</dd>
              </div>
              <div>
                <dt>Interés</dt>
                <dd>{selected.context.interest}</dd>
              </div>
              <div>
                <dt>Etiqueta</dt>
                <dd>{selected.context.label}</dd>
              </div>
              <div>
                <dt>Agente</dt>
                <dd className="mk-pi__agent-dd">
                  <AgentBust agent={selected.agent} size={18} />
                  {agent.name} · {agent.role}
                </dd>
              </div>
              <div className="is-next">
                <dt>Próxima acción</dt>
                <dd>{selected.context.next}</dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}
