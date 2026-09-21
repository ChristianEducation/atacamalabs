"use client";

import { useId, useState } from "react";
import { Building2, Check, FileSearch, ShieldCheck } from "lucide-react";
import { Button } from "../ui/Button";
import { StatusChip, type StatusKey } from "../ui/Badge";
import { CapabilitySelector, selectorTabId } from "../ui/CapabilitySelector";
import { DemoFrame } from "./DemoFrame";
import { controlsOf, phaseAt } from "./ScenarioDemos";
import { useDemoClock } from "../motion/useDemoClock";
import {
  FIN_COMPANY,
  FIN_SCENES,
  FIN_STATUS_LABEL,
  type FinScene,
  type FinStatus,
} from "@/content/marketing/fixtures";

const STATUS_TO_CHIP: Record<FinStatus, StatusKey> = {
  informativo: "completado",
  "coincidencia-encontrada": "completado",
  "requiere-revision": "revision",
  "confirmacion-requerida": "revision",
};

type ActionStep = "prepared" | "confirmed";

/** Una escena de FIN-DEMO: pregunta → fuentes → cruce → resultado → confirmación humana (R4.8). */
function FinanceScene({ scene, instance, autoplay }: { scene: FinScene; instance: string; autoplay: boolean }) {
  const [attach, clock] = useDemoClock<HTMLDivElement>({ id: `fin-${instance}-${scene.id}`, duration: 5200, autoplay });
  const { t } = clock;
  const [step, setStep] = useState<ActionStep>("prepared");
  const questionVisible = t >= 0;
  const sourcePhases = scene.sources.map((_, i) => phaseAt(t, 900 + i * 700, 1300 + i * 700, 1900 + i * 700));
  const stepsVisible = scene.steps.map((_, i) => t >= 2600 + i * 600);
  const resultVisible = t >= 3900;
  const actionVisible = resultVisible && Boolean(scene.action) && t >= 4500;
  const chip = STATUS_TO_CHIP[scene.status];
  const executed = step === "confirmed";

  return (
    <div ref={attach}>
      <DemoFrame
        title={`Administrativo/Financiero · ${FIN_COMPANY}`}
        controls={controlsOf(clock)}
        console
        product
        label={`Escena ${scene.label}`}
      >
        <div className="mk-fin">
          {questionVisible ? <p className="mk-bubble mk-bubble--person mk-fin__q">{scene.question}</p> : null}

          <div className="mk-fin__block">
            <p className="mk-stack__title">Fuentes consultadas (simuladas)</p>
            <ul className="mk-fin__sources">
              {scene.sources.map((source, i) =>
                sourcePhases[i] === "hidden" ? null : (
                  <li key={source} className="mk-tool">
                    <span className="mk-tool__icon" aria-hidden>
                      {i === 0 ? <FileSearch size={16} /> : <Building2 size={16} />}
                    </span>
                    <div className="mk-tool__text">
                      <p className="mk-tool__verb">{source}</p>
                    </div>
                    <StatusChip status={sourcePhases[i] as StatusKey} />
                  </li>
                ),
              )}
            </ul>
            <ol className="mk-fin__steps">
              {scene.steps.map((label, i) =>
                stepsVisible[i] ? (
                  <li key={label}>
                    <Check size={14} aria-hidden /> {label}
                  </li>
                ) : null,
              )}
            </ol>
          </div>

          {resultVisible ? (
            <div className="mk-fin__result is-new">
              <p className="mk-fin__result-text">{scene.result}</p>
              <StatusChip status={chip} label={FIN_STATUS_LABEL[scene.status]} />
            </div>
          ) : null}

          {actionVisible ? (
            <div className="mk-fin__action">
              <ol className="mk-fin__stepper" aria-label="Acción sensible: preparar, confirmar, ejecutar">
                <li className="is-done">Preparar</li>
                <li className={executed ? "is-done" : "is-current"}>Confirmación humana</li>
                <li className={executed ? "is-done" : undefined}>Ejecutar</li>
              </ol>
              {executed ? (
                <p className="mk-note mk-note--ok" role="status">
                  <Check size={16} aria-hidden /> {scene.action}: ejecutada en el ejemplo, sin tocar sistemas reales.
                </p>
              ) : (
                <div className="mk-fin__confirm">
                  <p className="mk-small">La acción quedó preparada y espera la confirmación de una persona.</p>
                  <Button size="sm" onClick={() => setStep("confirmed")}>
                    Confirmar (simulado)
                  </Button>
                </div>
              )}
            </div>
          ) : null}
          <p className="mk-fin__sources-note">
            <ShieldCheck size={14} aria-hidden /> SII / Bancos / Previred según integración, permisos y alcance.
          </p>
        </div>
      </DemoFrame>
    </div>
  );
}

/**
 * Y3 / F3: selector de escenas + demo. En Home (F3) se monta una sola escena
 * sin selector; en la página propia se ofrecen las cuatro. Toda escritura
 * termina en `confirmacion-requerida` antes de «ejecutar».
 */
export function FinanceDemo({
  initial = "factura-pendiente",
  selector = true,
  autoplay = true,
}: {
  initial?: FinScene["id"];
  selector?: boolean;
  autoplay?: boolean;
}) {
  const uid = useId();
  const [sceneId, setSceneId] = useState<FinScene["id"]>(initial);
  const scene = FIN_SCENES.find((s) => s.id === sceneId) ?? FIN_SCENES[0];
  const panelId = `${uid}-panel`;
  return (
    <div className="mk-fin-wrap">
      {selector ? (
        <CapabilitySelector
          tabs={FIN_SCENES.map((s) => ({ id: s.id, label: s.label }))}
          value={sceneId}
          onChange={(id) => setSceneId(id as FinScene["id"])}
          panelId={panelId}
          idPrefix={`${uid}-fin`}
          selectLabel="Elige una escena"
          ariaLabel="Escenas del agente administrativo y financiero"
        />
      ) : null}
      <div
        id={panelId}
        role={selector ? "tabpanel" : undefined}
        aria-labelledby={selector ? selectorTabId(`${uid}-fin`, sceneId) : undefined}
      >
        <FinanceScene key={sceneId} scene={scene} instance={uid} autoplay={autoplay} />
      </div>
    </div>
  );
}
