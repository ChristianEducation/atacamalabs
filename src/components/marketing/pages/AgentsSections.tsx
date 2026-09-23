"use client";

import { useState, useSyncExternalStore } from "react";
import { ButtonLink } from "../ui/Button";
import { CapabilitySelector, selectorTabId } from "../ui/CapabilitySelector";
import { Mission } from "../demos/Mission";
import { AGENT_MISSIONS, type MissionId } from "@/content/marketing/missions";

const PANEL_ID = "agent-selector-panel";
const ID_PREFIX = "agent-selector";

const subscribeHash = (cb: () => void) => {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
};
const getHash = () => window.location.hash.replace("#", "");
const getServerHash = () => "";

/**
 * A3 — selector principal de /agentes (spec V3.0 §8). Seis formas de empezar;
 * elegir una cambia copy, hasta tres capacidades, una misión animada y el CTA.
 * Sin autoplay entre opciones. Los redirects de las páginas antiguas
 * (`/comercial`, `/cobranza`, `/administrativo-financiero`, `/agendamiento`)
 * apuntan aquí por hash, por eso el valor inicial también lee `window.location.hash`.
 */
export function AgentSelector() {
  const hash = useSyncExternalStore(subscribeHash, getHash, getServerHash);
  const [picked, setPicked] = useState<{ forHash: string; id: MissionId } | null>(null);
  const fromHash = AGENT_MISSIONS.find((m) => m.id === hash)?.id;
  const active = picked && picked.forHash === hash ? picked.id : (fromHash ?? "comercial");
  const option = AGENT_MISSIONS.find((m) => m.id === active) ?? AGENT_MISSIONS[0];

  return (
    <div>
      <CapabilitySelector
        tabs={AGENT_MISSIONS.map((m) => ({ id: m.id, label: m.label }))}
        value={active}
        onChange={(id) => setPicked({ forHash: hash, id: id as MissionId })}
        panelId={PANEL_ID}
        idPrefix={ID_PREFIX}
        ariaLabel="Qué quieres que haga tu agente"
        selectLabel="Qué quieres que haga tu agente"
      />
      <div
        id={PANEL_ID}
        role="tabpanel"
        aria-labelledby={selectorTabId(ID_PREFIX, active)}
        className="mk-agent-selector__panel"
      >
        <div className="mk-agent-selector__copy">
          <p className="mk-lead">{option.copy}</p>
          {option.capacities ? (
            <ul className="mk-agent-selector__caps">
              {option.capacities.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          ) : null}
          <div>
            <ButtonLink href={option.cta.href} variant="secondary" arrow>
              {option.cta.label}
            </ButtonLink>
          </div>
        </div>
        <Mission key={option.id} scene={option.scene} instance={`agentes-${option.id}`} />
      </div>
    </div>
  );
}
