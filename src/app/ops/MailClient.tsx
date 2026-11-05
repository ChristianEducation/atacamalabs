"use client";

import { useState } from "react";
import { useRunner } from "./Approvals";
import type { MailView } from "@/lib/ops/types";

/**
 * Controles editables del correo (spec v3 §7-1, anexo §G2). Cada cambio se confirma antes de guardarse y queda auditado
 * (workflow 29 · mail_config_set). Subir el tope muestra el aviso «sube de a poco: revisa rebotes».
 */
export function MailControls({ hoy }: { hoy: MailView["hoy"] }) {
  const { pending, run } = useRunner();
  const [cap, setCap] = useState(String(hoy.cap));
  const [ws, setWs] = useState(hoy.window.start);
  const [we, setWe] = useState(hoy.window.end);
  const [f1, setF1] = useState(String(hoy.followup_days[0] ?? 3));
  const [f2, setF2] = useState(String(hoy.followup_days[1] ?? 7));
  const [sample, setSample] = useState(String(hoy.funnel_min_sample));
  const [confirm, setConfirm] = useState<null | "cap" | "window" | "followup" | "sample">(null);
  const capN = Number(cap), f1N = Number(f1), f2N = Number(f2), sN = Number(sample);
  const capOk = Number.isInteger(capN) && capN >= 1 && capN <= 50;
  const winOk = /^\d{2}:\d{2}$/.test(ws) && /^\d{2}:\d{2}$/.test(we) && ws < we;
  const fOk = Number.isInteger(f1N) && Number.isInteger(f2N) && f1N >= 1 && f2N <= 30 && f1N < f2N;
  const sOk = Number.isInteger(sN) && sN >= 5 && sN <= 200;
  const save = async () => {
    const input = confirm === "cap" ? { daily_cap: capN } : confirm === "window" ? { window_start: ws, window_end: we } : confirm === "followup" ? { followup_days: [f1N, f2N] } : { funnel_min_sample: sN };
    const r = await run({ action: "mail_config_set", ...input });
    if (r?.ok) setConfirm(null);
  };
  const ask = (k: NonNullable<typeof confirm>, text: string) => confirm === k ? (
    <div className="ops-reject" data-testid={`confirm-${k}`}>
      <p className="ops-foot"><strong>{text}</strong> El cambio queda registrado en el historial.</p>
      <div className="ops-btns">
        <button type="button" className="ops-btn ops-btn-primary" disabled={pending} onClick={save}>{pending ? "Guardando…" : "Sí, guardar"}</button>
        <button type="button" className="ops-btn" disabled={pending} onClick={() => setConfirm(null)}>Cancelar</button>
      </div>
    </div>
  ) : null;
  return (
    <div className="ops-mail-ctl" data-testid="mail-controls">
      <div className="ops-ctl-row">
        <label className="ops-lab" htmlFor="mc-cap">Tope diario (1–50)</label>
        <div className="ops-inline">
          <input id="mc-cap" className="ops-input ops-input-s" type="number" min={1} max={50} inputMode="numeric" value={cap} onChange={(e) => setCap(e.target.value)} />
          <button type="button" className="ops-btn" disabled={pending || !capOk || capN === hoy.cap} onClick={() => setConfirm("cap")}>Cambiar</button>
        </div>
        {capOk && capN > hoy.cap ? <p className="ops-foot ops-warn-txt">Sube de a poco: revisa rebotes en «Salud» antes de seguir subiendo.</p> : null}
        {ask("cap", `¿Cambiar el tope de ${hoy.cap} a ${capN} correos por día?`)}
      </div>
      <div className="ops-ctl-row">
        <label className="ops-lab" htmlFor="mc-ws">Ventana de envío (lun–vie, hora Chile)</label>
        <div className="ops-inline">
          <input id="mc-ws" className="ops-input ops-input-s" type="time" value={ws} onChange={(e) => setWs(e.target.value)} aria-label="Inicio de la ventana" />
          <span>a</span>
          <input className="ops-input ops-input-s" type="time" value={we} onChange={(e) => setWe(e.target.value)} aria-label="Fin de la ventana" />
          <button type="button" className="ops-btn" disabled={pending || !winOk || (ws === hoy.window.start && we === hoy.window.end)} onClick={() => setConfirm("window")}>Cambiar</button>
        </div>
        {ask("window", `¿Enviar solo entre ${ws} y ${we}?`)}
      </div>
      <div className="ops-ctl-row">
        <label className="ops-lab" htmlFor="mc-f1">Seguimientos (días hábiles después del primer correo)</label>
        <div className="ops-inline">
          <span>+</span><input id="mc-f1" className="ops-input ops-input-s" type="number" min={1} max={30} value={f1} onChange={(e) => setF1(e.target.value)} aria-label="Primer seguimiento" />
          <span>y +</span><input className="ops-input ops-input-s" type="number" min={1} max={30} value={f2} onChange={(e) => setF2(e.target.value)} aria-label="Segundo seguimiento" />
          <button type="button" className="ops-btn" disabled={pending || !fOk || (f1N === hoy.followup_days[0] && f2N === hoy.followup_days[1])} onClick={() => setConfirm("followup")}>Cambiar</button>
        </div>
        <p className="ops-foot">Los seguimientos quedan como borrador: nunca salen solos.</p>
        {ask("followup", `¿Preparar seguimientos a +${f1N} y +${f2N} días hábiles?`)}
      </div>
      <div className="ops-ctl-row">
        <label className="ops-lab" htmlFor="mc-s">Muestra mínima para el embudo</label>
        <div className="ops-inline">
          <input id="mc-s" className="ops-input ops-input-s" type="number" min={5} max={200} value={sample} onChange={(e) => setSample(e.target.value)} />
          <button type="button" className="ops-btn" disabled={pending || !sOk || sN === hoy.funnel_min_sample} onClick={() => setConfirm("sample")}>Cambiar</button>
        </div>
        {ask("sample", `¿Mostrar tasas por rubro y ángulo solo con ${sN} envíos o más?`)}
      </div>
    </div>
  );
}

/** Cola de envío: cancelar o volver a borrador (sin perder el texto). Reutiliza las acciones de siempre (email_reject / email_reopen). */
export function QueueActions({ id, status }: { id: string; status: string }) {
  const { pending, run } = useRunner();
  const [cancel, setCancel] = useState(false);
  if (status !== "approved") return <span className="ops-foot">Enviándose…</span>;
  return cancel ? (
    <span className="ops-btns">
      <button type="button" className="ops-btn ops-btn-danger" disabled={pending} onClick={async () => { const r = await run({ action: "email_reject", message_id: id, reason: "Cancelado desde la cola" }); if (r?.ok) setCancel(false); }}>Confirmar cancelación</button>
      <button type="button" className="ops-btn" disabled={pending} onClick={() => setCancel(false)}>No</button>
    </span>
  ) : (
    <span className="ops-btns">
      <button type="button" className="ops-btn" disabled={pending} onClick={() => run({ action: "email_reopen", message_id: id })}>Volver a borrador</button>
      <button type="button" className="ops-btn ops-btn-danger" disabled={pending} onClick={() => setCancel(true)}>Cancelar</button>
    </span>
  );
}

/** Respuestas: marcar reunión o perdido (mueve la oportunidad en GHL por el gateway). «Ganado» se marca en GHL, que crea el cliente. */
export function OutcomeButtons({ candidateId, company }: { candidateId: string; company: string }) {
  const { pending, run } = useRunner();
  const [ask, setAsk] = useState<null | "reunion" | "perdido">(null);
  if (ask) {
    return (
      <span className="ops-btns">
        <span className="ops-foot">{ask === "reunion" ? `¿Mover ${company} a Reunión (Diagnóstico) en GHL?` : `¿Marcar ${company} como perdida en GHL?`}</span>
        <button type="button" className={ask === "perdido" ? "ops-btn ops-btn-danger" : "ops-btn ops-btn-primary"} disabled={pending} onClick={async () => { const r = await run({ action: "mail_outcome", candidate_id: candidateId, outcome: ask }); if (r?.ok) setAsk(null); }}>{pending ? "Moviendo…" : "Sí"}</button>
        <button type="button" className="ops-btn" disabled={pending} onClick={() => setAsk(null)}>No</button>
      </span>
    );
  }
  return (
    <span className="ops-btns">
      <button type="button" className="ops-btn" onClick={() => setAsk("reunion")}>Reunión</button>
      <button type="button" className="ops-btn" onClick={() => setAsk("perdido")}>Perdido</button>
    </span>
  );
}
