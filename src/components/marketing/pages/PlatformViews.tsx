"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { Check, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { AgentBust } from "../pixel/AgentBust";
import { useReducedMotion } from "../motion/reduced-motion";
import { HOME_TOOLS } from "@/content/marketing/integrations";
import {
  AGENT_ACTIONS,
  AGENT_ROWS,
  AUTOMATIONS,
  CONSUMPTION_BY_AGENT,
  CONSUMPTION_WEEK,
  CONTACTS,
  CREDIT,
  INTEGRATION_COUNT,
  INTEGRATION_EXAMPLES_NOTE,
  INTEGRATION_GROUPS,
  INTEGRATION_PROTOCOLS,
  PLATFORM_AGENTS,
} from "@/content/marketing/platform";

const step = (i: number) => ({ ["--i" as string]: i }) as CSSProperties;

/** Formato chileno de dólares: coma decimal. */
const usd = (value: number) => `US$${value.toFixed(2).replace(".", ",")}`;

/* ---------- Agentes ---------- */

export function AgentsView() {
  return (
    <div className="mk-pv-agents">
      <div className="mk-pv-agents__head" aria-hidden>
        <span>Agente</span>
        <span>Función</span>
        <span>Estado</span>
        <span>Actividad del día</span>
        <span />
      </div>
      <ul>
        {AGENT_ROWS.map((row, index) => {
          const agent = PLATFORM_AGENTS[row.agent];
          return (
            <li key={row.agent} className="mk-pv-agents__row" style={step(index)}>
              <span className="mk-pv-agents__who">
                <AgentBust agent={row.agent} size={44} className="mk-pv-agents__bust" />
                <strong>{agent.name}</strong>
              </span>
              <span className="mk-pv-agents__role">{agent.role}</span>
              <span className="mk-pv-live">
                <i aria-hidden />
                {row.state}
              </span>
              <span className="mk-pv-agents__act">
                <strong>{row.activity}</strong>
                <small>Última: {row.last.toLowerCase()}</small>
              </span>
              <span className="mk-pv-agents__btns">
                {AGENT_ACTIONS.map((label) => (
                  <button key={label} type="button" className="mk-pv-mini">
                    {label}
                  </button>
                ))}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ---------- Contactos ---------- */

export function ContactsView() {
  const [selected, setSelected] = useState(0);
  const contact = CONTACTS[selected];
  const agent = PLATFORM_AGENTS[contact.agent];
  return (
    <div className="mk-pv-contacts">
      <ul className="mk-pv-contacts__list" aria-label="Contactos">
        {CONTACTS.map((item, index) => (
          <li key={item.id} style={step(index)}>
            <button
              type="button"
              aria-current={index === selected ? "true" : undefined}
              onClick={() => setSelected(index)}
            >
              <span className="mk-pi__avatar" aria-hidden>
                {item.name[0]}
              </span>
              <span>
                <strong>{item.name}</strong>
                <small>
                  {item.company} · {item.channel}
                </small>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <article className="mk-pv-contacts__card" key={contact.id}>
        <header>
          <span className="mk-pi__avatar mk-pi__avatar--lg" aria-hidden>
            {contact.name[0]}
          </span>
          <div>
            <h3>{contact.name}</h3>
            <p>
              {contact.company} · {contact.phone}
            </p>
          </div>
          <span className="mk-pv-contacts__tags">
            {contact.tags.map((tag) => (
              <em key={tag}>{tag}</em>
            ))}
          </span>
        </header>
        <div className="mk-pv-contacts__cols">
          <div>
            <h4>Historial</h4>
            <ol>
              {contact.history.map((event, index) => (
                <li key={event} style={step(index)}>
                  {event}
                </li>
              ))}
            </ol>
          </div>
          <dl>
            <div>
              <dt>Canal de origen</dt>
              <dd>{contact.channel}</dd>
            </div>
            <div>
              <dt>Última interacción</dt>
              <dd>{contact.last}</dd>
            </div>
            <div>
              <dt>Agente relacionado</dt>
              <dd className="mk-pi__agent-dd">
                <AgentBust agent={contact.agent} size={18} />
                {agent.name}
              </dd>
            </div>
            <div>
              <dt>Nota</dt>
              <dd>{contact.note}</dd>
            </div>
          </dl>
        </div>
        <p className="mk-pv-contacts__next">
          <span>Próxima acción</span>
          {contact.next}
        </p>
      </article>
    </div>
  );
}

/* ---------- Automatizaciones ---------- */

export function AutomationsView() {
  return (
    <ul className="mk-pv-auto">
      {AUTOMATIONS.map((automation, index) => (
        <li key={automation.name} className="mk-pv-auto__row" style={step(index)}>
          <span className="mk-pv-auto__name">
            <AgentBust agent={automation.agent} size={36} />
            <span>
              <strong>{automation.name}</strong>
              <small>{PLATFORM_AGENTS[automation.agent].name}</small>
            </span>
          </span>
          <span className="mk-pv-auto__cell">
            <small>Frecuencia</small>
            {automation.cadence}
          </span>
          <span className="mk-pv-auto__cell">
            <small>Última ejecución</small>
            {automation.last}
          </span>
          <span className="mk-pv-auto__cell">
            <small>Próximo evento</small>
            {automation.next}
          </span>
          <span className="mk-pv-auto__state" aria-label="Estado: ejecutada">
            <span className="mk-pv-pill is-pending" aria-hidden>
              <Clock size={12} strokeWidth={2.4} /> Pendiente
            </span>
            <span className="mk-pv-pill is-done">
              <Check size={12} strokeWidth={3} aria-hidden /> Ejecutada
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/* ---------- Integraciones ---------- */

const TOOL_BY_ID = new Map<string, (typeof HOME_TOOLS)[number]>(HOME_TOOLS.map((tool) => [tool.id, tool]));

export function IntegrationsView() {
  return (
    <div className="mk-pv-int">
      <div className="mk-pv-int__top">
        <p className="mk-pv-int__count">{INTEGRATION_COUNT}</p>
        <p className="mk-pv-int__proto">{INTEGRATION_PROTOCOLS}</p>
      </div>
      <ul className="mk-pv-int__grid">
        {INTEGRATION_GROUPS.map((group, index) => (
          <li key={group.label} style={step(index)}>
            <h3>{group.label}</h3>
            <span className="mk-pv-int__logos">
              {group.tools.map((id) => {
                const tool = TOOL_BY_ID.get(id);
                if (!tool) return null;
                return (
                  <span
                    key={id}
                    className="mk-pv-int__logo"
                    style={
                      {
                        ["--glyph" as string]: `url(${tool.logo})`,
                      } as CSSProperties
                    }
                    role="img"
                    aria-label={tool.name}
                    title={tool.name}
                  />
                );
              })}
            </span>
          </li>
        ))}
        <li className="mk-pv-int__more" style={step(INTEGRATION_GROUPS.length)}>
          <h3>APIs</h3>
          <span>Y sistemas propios</span>
        </li>
      </ul>
      <p className="mk-pv-int__note">{INTEGRATION_EXAMPLES_NOTE}</p>
    </div>
  );
}

/* ---------- Consumo ---------- */

/** Cuenta de 0 al valor final con una curva suave; con movimiento reducido muestra el valor final. */
function useCountUp(target: number, duration = 1300) {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(target);
  useEffect(() => {
    if (reduced) return;
    let frame = 0;
    let start = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      const k = Math.min(1, (now - start) / duration);
      setValue(target * (1 - Math.pow(1 - k, 3)));
      if (k < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame((now) => {
      setValue(0);
      tick(now);
    });
    return () => cancelAnimationFrame(frame);
  }, [target, duration, reduced]);
  return value;
}

export function ConsumptionView() {
  const used = useCountUp(CREDIT.used);
  const available = CREDIT.included - used;
  const percent = (CREDIT.used / CREDIT.included) * 100;
  return (
    <div className="mk-pv-con">
      <section className="mk-pv-con__credit" aria-label="Crédito IA">
        <p className="mk-pv-con__label">Crédito IA</p>
        <p className="mk-pv-con__included">
          {usd(CREDIT.included)} <span>incluido</span>
        </p>
        <div className="mk-pv-con__bar" style={{ ["--fill" as string]: `${percent}%` } as CSSProperties} aria-hidden>
          <i />
        </div>
        <dl className="mk-pv-con__nums">
          <div>
            <dt>Utilizado</dt>
            <dd>{usd(used)}</dd>
          </div>
          <div>
            <dt>Disponible</dt>
            <dd className="is-available">{usd(available)}</dd>
          </div>
        </dl>
      </section>

      <section className="mk-pv-con__by" aria-label="Consumo por agente">
        <p className="mk-pv-con__label">Qué generó el consumo</p>
        <ul>
          {CONSUMPTION_BY_AGENT.map((row, index) => (
            <li key={row.agent} style={step(index)}>
              <AgentBust agent={row.agent} size={26} />
              <span className="mk-pv-con__by-name">{PLATFORM_AGENTS[row.agent].name}</span>
              <span
                className="mk-pv-con__by-bar"
                style={
                  {
                    ["--w" as string]: `${(row.amount / CREDIT.used) * 100}%`,
                  } as CSSProperties
                }
              >
                <i />
              </span>
              <span className="mk-pv-con__by-val">{usd(row.amount)}</span>
            </li>
          ))}
        </ul>
        <p className="mk-pv-con__ext">Servicios externos: se muestran cuando forman parte de tu implementación.</p>
      </section>

      <section className="mk-pv-con__week" aria-label="Actividad de la semana">
        <p className="mk-pv-con__label">Actividad de la semana</p>
        <div className="mk-pv-con__cols" aria-hidden>
          {CONSUMPTION_WEEK.map((day, index) => (
            <span
              key={day.day}
              style={
                {
                  ...step(index),
                  ["--h" as string]: `${day.value}%`,
                } as CSSProperties
              }
              className={cn(day.value === 100 && "is-peak")}
            >
              <i />
              <b>{day.day}</b>
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
