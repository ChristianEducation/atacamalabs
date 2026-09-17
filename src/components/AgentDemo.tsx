"use client";
import { useEffect, useRef, useState } from "react";
import { PrimaryLink } from "@/components/ui";
import { validDemoUrl } from "@/lib/demo-config";
import type { DemoSettings } from "@/lib/agents-offer";

export type DemoConfig = DemoSettings;
export function AgentDemo({
  config,
  preview = false,
}: {
  config: DemoConfig;
  preview?: boolean;
}) {
  const [state, setState] = useState<"closed" | "loading" | "open" | "error">(
    "closed",
  );
  const buttonRef = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const configured =
    config.mode === "iframe" &&
    validDemoUrl(config.iframeUrl, config.allowedOrigins) &&
    config.brandVerified &&
    config.dataNoticeReady &&
    Boolean(config.dataNotice) &&
    config.testEnvironmentVerified;
  const enabled =
    configured &&
    (config.status === "READY" ||
      (preview && config.status === "CONFIGURED_NOT_VERIFIED"));
  function stopTimer() {
    if (timer.current) clearTimeout(timer.current);
  }
  function start() {
    stopTimer();
    setState("loading");
    timer.current = setTimeout(() => setState("error"), 15000);
  }
  function close() {
    stopTimer();
    setState("closed");
    buttonRef.current?.focus();
  }
  if (!enabled)
    return (
      <div className="demo-panel">
        <h3>Solicita una demostración para tu proceso.</h3>
        <p>
          Conversemos sobre lo que necesitas resolver y cómo podría trabajar un
          agente con tu equipo.
        </p>
        <PrimaryLink href="/contacto">Conversemos →</PrimaryLink>
      </div>
    );
  return (
    <div
      className="demo-panel"
      onKeyDown={(e) => {
        if (e.key === "Escape") close();
      }}
    >
      {config.status !== "READY" && (
        <p className="demo-status">
          Demo en verificación · Preview de revisión
        </p>
      )}
      <p>{config.dataNotice}</p>
      <div className="demo-toolbar">
        <button
          ref={buttonRef}
          type="button"
          onClick={start}
          disabled={state === "loading" || state === "open"}
        >
          {state === "error" ? "Reintentar" : "Probar un agente"}
        </button>
        {state !== "closed" && (
          <button onClick={close} type="button">
            Cerrar demo ×
          </button>
        )}
      </div>
      {state === "loading" && <p role="status">Cargando agente…</p>}
      {(state === "loading" || state === "open") && (
        <iframe
          src={config.iframeUrl!}
          title="Agente demo de Atacama Labs"
          onLoad={() => {
            stopTimer();
            setState("open");
          }}
          onError={() => {
            stopTimer();
            setState("error");
          }}
          referrerPolicy="strict-origin-when-cross-origin"
        />
      )}
      {state === "error" && (
        <div role="alert">
          <p>La demostración no está disponible en este momento.</p>
          <PrimaryLink href="/contacto">Conversemos</PrimaryLink>
        </div>
      )}
    </div>
  );
}
