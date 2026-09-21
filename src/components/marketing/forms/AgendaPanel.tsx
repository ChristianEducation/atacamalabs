"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, ButtonLink } from "../ui/Button";

type State = "ready" | "loading" | "loaded" | "error";

/**
 * M3 RealSchedulerAdapter — nunca simula horarios. Sin URL validada muestra el
 * estado «no configurada»; con URL, el recurso del proveedor se carga solo tras
 * la acción del usuario y no se declara una reserva confirmada por abrir el enlace.
 */
export function AgendaPanel({ url }: { url: string | null }) {
  const [state, setState] = useState<State>("ready");

  return (
    <div className="mk-agenda">
      {url === null ? (
        <p className="mk-body">
          Puedes enviarnos tu solicitud y coordinaremos el siguiente paso.{" "}
          <Link href="#formulario" className="mk-link">
            Ir al formulario
          </Link>
        </p>
      ) : (
        <>
          {state === "ready" || state === "error" ? (
            <div className="mk-agenda__actions">
              {state === "error" ? <p role="alert">No pudimos cargar la agenda.</p> : null}
              <Button onClick={() => setState("loading")}>{state === "error" ? "Reintentar" : "Ver disponibilidad"}</Button>
              <ButtonLink href={url} variant="secondary">
                Abrir agenda
              </ButtonLink>
            </div>
          ) : (
            <div className="mk-agenda__slot" aria-busy={state === "loading"}>
              {state === "loading" ? <p role="status">Cargando disponibilidad…</p> : null}
              <iframe
                title="Agenda para conversar sobre tu proceso"
                src={url}
                className="mk-agenda__frame"
                onLoad={() => setState("loaded")}
                onError={() => setState("error")}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
