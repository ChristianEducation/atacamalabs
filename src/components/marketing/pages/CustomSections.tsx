"use client";

import { useId, useState, useSyncExternalStore } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ButtonLink } from "../ui/Button";
import { StatusChip } from "../ui/Badge";
import { DashboardDemo } from "../demos/BuilderDemo";
import { FlowPlayer } from "../demos/FlowPlayer";
import { ProcessSteps } from "./Common";
import { BUILDER_SCENARIOS, type BuilderScenarioId } from "@/content/marketing/fixtures";
import { CUSTOM_GROUPS, CUSTOM_MODULES, CUSTOM_PROCESS } from "@/content/marketing/custom";

const subscribeHash = (cb: () => void) => {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
};
const getHash = () => window.location.hash;
const getServerHash = () => "";

type ModuleId = (typeof CUSTOM_MODULES)[number]["id"];

/* ---------------------------- Previews de las cards ------------------------ */

function CardPreview({ index, scenarioId }: { index: number; scenarioId: BuilderScenarioId }) {
  const scenario = BUILDER_SCENARIOS.find((s) => s.id === scenarioId) ?? BUILDER_SCENARIOS[0];
  if (index === 0) {
    return (
      <div className="mk-cu-prev">
        <p className="mk-cu-prev__prompt">«{scenario.need}»</p>
        <ol className="mk-cu-prev__dots" aria-hidden>
          {scenario.nodes.map((n) => (
            <li key={n.title} />
          ))}
        </ol>
      </div>
    );
  }
  if (index === 1) {
    return (
      <ul className="mk-cu-prev mk-cu-prev__docs">
        {scenario.records.map((r) => (
          <li key={r.id}>
            <span className="mk-mono">{r.id}</span>
            <span className="mk-small mk-muted">{r.label}</span>
          </li>
        ))}
      </ul>
    );
  }
  if (index === 2) {
    return (
      <ul className="mk-cu-prev mk-cu-prev__chips">
        {scenario.phases.slice(0, 3).map((p) => (
          <li key={p} className="mk-badge mk-badge--neutral">
            {p.split(":")[1]?.trim() ?? p}
          </li>
        ))}
      </ul>
    );
  }
  return (
    <div className="mk-cu-prev mk-cu-prev__panel">
      <p className="mk-h6">{scenario.dashboardTitle}</p>
      <StatusChip status="completado" label={scenario.final} />
    </div>
  );
}

/* ------------------------------ Grupos H3 ---------------------------------- */

function GroupPreview({ index }: { index: number }) {
  if (index === 0) {
    return (
      <div className="mk-cu-gp" aria-hidden>
        <span>Documento recibido</span>
        <ArrowRight size={14} />
        <span>Campos revisados</span>
        <ArrowRight size={14} />
        <span>Tarea creada</span>
      </div>
    );
  }
  if (index === 1) {
    return (
      <div className="mk-cu-gp mk-cu-gp--col" aria-hidden>
        <span className="mk-badge mk-badge--neutral">Estado: Todas</span>
        {["SOL-DEMO-301", "SOL-DEMO-302", "SOL-DEMO-303"].map((id) => (
          <span key={id} className="mk-mono">
            {id}
          </span>
        ))}
      </div>
    );
  }
  if (index === 2) {
    return (
      <div className="mk-cu-gp mk-cu-gp--col" aria-hidden>
        <span>Solicitud enviada desde el portal</span>
        <span className="mk-badge mk-badge--success">Comprobante de recepción</span>
      </div>
    );
  }
  return (
    <div className="mk-cu-gp" aria-hidden>
      <span className="mk-cu-gp__menu">
        <b>Módulos</b>
        <i>Pedidos</i>
        <i>Clientes</i>
      </span>
      <span className="mk-cu-gp__list">PED-DEMO-1042</span>
      <span className="mk-cu-gp__detail">Detalle relacionado</span>
    </div>
  );
}

/* --------------------------- Módulos consultables -------------------------- */

/**
 * H2 + H3–H6 integrados: cuatro cards numeradas (necesidad → información →
 * conexiones → panel). Elegir una muestra su módulo debajo, dentro del mismo
 * bloque. El hash (#flujos, #software, #proceso, #interfaz) abre el módulo.
 */
export function CustomModules() {
  const uid = useId();
  const hash = useSyncExternalStore(subscribeHash, getHash, getServerHash);
  const [picked, setPicked] = useState<{ forHash: string; id: ModuleId } | null>(null);
  const [scenarioId, setScenarioId] = useState<BuilderScenarioId>("pedidos");
  const fromHash = CUSTOM_MODULES.find((m) => `#${m.anchor}` === hash)?.id;
  const active: ModuleId = picked && picked.forHash === hash ? picked.id : (fromHash ?? "flujos");
  const scenario = BUILDER_SCENARIOS.find((s) => s.id === scenarioId) ?? BUILDER_SCENARIOS[0];
  const solicitudes = BUILDER_SCENARIOS.find((s) => s.id === "solicitudes") ?? BUILDER_SCENARIOS[0];
  const panelId = `${uid}-module`;

  return (
    <div className="mk-cu">
      <div className="mk-builder__chips" role="radiogroup" aria-label="Elige un escenario de ejemplo">
        {BUILDER_SCENARIOS.map((s) => (
          <button
            key={s.id}
            type="button"
            role="radio"
            aria-checked={s.id === scenarioId}
            className="mk-choice"
            onClick={() => setScenarioId(s.id)}
          >
            {s.chip}
          </button>
        ))}
      </div>

      <ol className="mk-cu-cards">
        {CUSTOM_MODULES.map((m, i) => (
          <li key={m.id} id={m.anchor}>
            <button
              type="button"
              className={cn("mk-cu-card", active === m.id && "is-active")}
              aria-pressed={active === m.id}
              aria-controls={panelId}
              onClick={() => setPicked({ forHash: hash, id: m.id })}
            >
              <CardPreview index={i} scenarioId={scenarioId} />
              <span className="mk-cu-card__num" aria-hidden>
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="mk-h5">{m.title}</span>
              <span className="mk-small mk-muted">{m.body}</span>
            </button>
          </li>
        ))}
      </ol>

      <div id={panelId} className="mk-cu-module" aria-live="polite">
        {active === "flujos" ? (
          <div>
            <h3 className="mk-h3">Cada paso sabe qué viene después.</h3>
            <FlowPlayer
              key={scenarioId}
              title={`Flujo · ${scenario.chip}`}
              nodes={scenario.nodes}
              instance={`custom-${scenarioId}`}
              alternative={{
                nodeIndex: 3,
                label: "Revisión necesaria",
                input: scenario.nodes[3].input,
                result: "Una persona revisa antes de continuar",
              }}
            />
            <p className="mk-ag-cta">
              <ButtonLink href="/diagnostico?necesidad=a-medida" variant="secondary" arrow>
                Revisar mi flujo
              </ButtonLink>
            </p>
          </div>
        ) : null}

        {active === "software" ? (
          <div>
            <h3 className="mk-h3">Construimos lo que el proceso necesita.</h3>
            <ol className="mk-cu-groups">
              {CUSTOM_GROUPS.map((g, i) => (
                <li key={g.title}>
                  <span className="mk-steps__num" aria-hidden>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h4 className="mk-h5">{g.title}</h4>
                  <p>{g.body}</p>
                  <GroupPreview index={i} />
                </li>
              ))}
            </ol>
            <p className="mk-ag-cta">
              <ButtonLink href="/diagnostico?necesidad=a-medida" variant="secondary" arrow>
                Conversemos
              </ButtonLink>
            </p>
          </div>
        ) : null}

        {active === "proceso" ? (
          <div>
            <h3 className="mk-h3">De entender el proceso a ponerlo en marcha.</h3>
            <ProcessSteps steps={CUSTOM_PROCESS} />
            <p className="mk-ag-cta">
              <ButtonLink href="/diagnostico?necesidad=a-medida" variant="secondary" arrow>
                Iniciar diagnóstico
              </ButtonLink>
            </p>
          </div>
        ) : null}

        {active === "interfaz" ? (
          <div className="mk-cu-panel">
            <div className="mk-ag-copy">
              <h3 className="mk-h3">El equipo ve lo que necesita hacer.</h3>
              <p>
                Un panel puede reunir solicitudes, responsables y próximos pasos. La interfaz se diseña con el proceso.
              </p>
              <div>
                <ButtonLink href="/diagnostico?necesidad=a-medida" variant="secondary" arrow>
                  Diseñar mi panel
                </ButtonLink>
              </div>
            </div>
            <DashboardDemo scenario={solicitudes} receivedLabel="Recibidas" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
