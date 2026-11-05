"use client";

import { useState } from "react";
import { useRunner } from "./Approvals";
import { GHL_PLANNER_URL, fmtCl } from "./Parts";
import type { PauseState, PieceRow } from "@/lib/ops/types";

const STOPS = ["envío de correos", "seguimientos", "radar de prospectos", "preparación de contactos", "producción de piezas", "generación de imágenes y videos"];
const CHIPS = ["Viaje", "Revisión", "Algo falló"];

/**
 * Pausa general (spec §8.8). Pausar pide confirmación (con motivo opcional); reanudar es un toque. No retiene lo ya programado en GHL:
 * por eso se listan las publicaciones programadas, con enlace al Planner, para que Christian decida.
 */
export function PauseCard({ pause, scheduled }: { pause: PauseState; scheduled: PieceRow[] }) {
  const { pending, run } = useRunner();
  const [confirm, setConfirm] = useState(false);
  const [reason, setReason] = useState("");
  const upcoming = scheduled.slice(0, 6);
  const set = async (paused: boolean) => {
    const r = await run({ action: "pause_set", paused, reason: paused ? reason.trim().slice(0, 200) || undefined : undefined });
    if (r?.ok) { setConfirm(false); setReason(""); }
  };
  const ghlList = upcoming.length ? (
    <>
      <p className="ops-foot">La pausa <strong>no</strong> retiene lo ya programado en GHL. {scheduled.length === 1 ? "Hay 1 publicación programada:" : `Hay ${scheduled.length} publicaciones programadas:`}</p>
      <ul className="ops-list ops-signals">{upcoming.map((p) => <li key={p.id}><span className="ops-row-title">{p.title}</span><span className="ops-row-sub">{[p.channel, p.at_label].filter(Boolean).join(" · ")}</span></li>)}</ul>
      <p className="ops-foot"><a href={GHL_PLANNER_URL} target="_blank" rel="noreferrer noopener">Abrir el Planner de GHL</a> si quieres moverlas o retirarlas.</p>
    </>
  ) : <p className="ops-foot">La pausa <strong>no</strong> retiene lo ya programado en GHL; ahora no hay publicaciones programadas que vayan a salir.</p>;

  if (pause.paused) {
    return (
      <section className="ops-card ops-paused" aria-labelledby="ops-pause" data-testid="pause-card" data-paused="true">
        <header className="ops-card-h"><h2 id="ops-pause">Pausa general</h2><span className="ops-pill ops-pill-fallo">EN PAUSA</span></header>
        <p className="ops-empty"><strong>El sistema está en pausa</strong>{pause.since ? ` desde ${fmtCl(pause.since)}` : ""}{pause.reason ? ` · motivo: ${pause.reason}` : ""}.</p>
        <p className="ops-foot">Quedó detenido: {STOPS.join(", ")}. Lo que ya estaba aprobado no sale hasta que reanudes.</p>
        {ghlList}
        <div className="ops-btns"><button type="button" className="ops-btn ops-btn-primary" disabled={pending} onClick={() => set(false)}>{pending ? "Reanudando…" : "Reanudar todo"}</button></div>
      </section>
    );
  }
  return (
    <section className="ops-card" aria-labelledby="ops-pause" data-testid="pause-card" data-paused="false">
      <header className="ops-card-h"><h2 id="ops-pause">Pausa general</h2><span className="ops-pill ops-pill-ok">Funcionando</span></header>
      {confirm ? (
        <div className="ops-reject">
          <p className="ops-foot"><strong>¿Pausar todo el sistema?</strong> Se detienen: {STOPS.join(", ")}. Puedes reanudar con un toque.</p>
          <div className="ops-chips" role="group" aria-label="Motivo (opcional)">
            {CHIPS.map((c) => <button key={c} type="button" className={reason === c ? "ops-chip ops-chip-on" : "ops-chip"} onClick={() => setReason(reason === c ? "" : c)}>{c}</button>)}
          </div>
          <input className="ops-input" type="text" maxLength={200} placeholder="Motivo (opcional)" aria-label="Motivo de la pausa (opcional)" value={reason} onChange={(e) => setReason(e.target.value)} />
          {ghlList}
          <div className="ops-btns">
            <button type="button" className="ops-btn ops-btn-danger" disabled={pending} onClick={() => set(true)}>{pending ? "Pausando…" : "Sí, pausar todo"}</button>
            <button type="button" className="ops-btn" disabled={pending} onClick={() => setConfirm(false)}>Cancelar</button>
          </div>
        </div>
      ) : (
        <>
          <p className="ops-foot">Todo funciona. Si necesitas frenar el sistema (un viaje, un problema, una revisión), la pausa detiene de una vez el envío de correos, los seguimientos, el radar, la preparación de contactos y la producción.</p>
          <div className="ops-btns"><button type="button" className="ops-btn" onClick={() => setConfirm(true)}>Pausar todo…</button></div>
        </>
      )}
    </section>
  );
}
