"use client";

import { useState } from "react";
import { useRunner } from "./Approvals";

/**
 * Radar estratégico · únicos controles humanos (spec RADAR §6.2 y §11): «Guardar para evaluar», «Trabajar», «Descartar» y «Confirmar registro».
 * Ninguno contacta, inscribe, envía, aplica ni crea nada en GHL: solo anotan una decisión interna (auditada) o confirman un servicio propio.
 * Sin fetch directo: todo pasa por la acción de servidor opsAct (sesión PIN + clave exclusiva de /ops).
 */
type OppStatus = "new" | "shortlisted" | "working" | "dismissed" | "expired";

export function DecideButtons({ id, status }: { id: string; status: OppStatus }) {
  const { pending, run } = useRunner();
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState("");
  const decide = (decision: "shortlist" | "work" | "dismiss", why?: string) => run({ action: "strategic_decide", opportunity_id: id, decision, expected_status: status, ...(why ? { reason: why.trim().slice(0, 200) } : {}) });
  if (status === "dismissed" || status === "expired") return <p className="ops-foot" data-testid="strategic-final">{status === "dismissed" ? "Descartada: en esta versión no se reabre." : "Vencida: en esta versión no se reabre."}</p>;
  if (confirming) {
    return (
      <div className="ops-strategic-act" data-testid="strategic-dismiss-confirm">
        <label className="ops-sr" htmlFor={`why-${id}`}>Motivo (opcional)</label>
        <input id={`why-${id}`} className="ops-input" maxLength={200} placeholder="Motivo (opcional)" value={reason} onChange={(e) => setReason(e.target.value)} />
        <button type="button" className="ops-btn ops-btn-danger" disabled={pending} onClick={() => decide("dismiss", reason)}>{pending ? "Guardando…" : "Sí, descartar"}</button>
        <button type="button" className="ops-btn" disabled={pending} onClick={() => setConfirming(false)}>Cancelar</button>
        <p className="ops-foot">Descartar es definitivo en esta versión: no se vuelve a avisar ni se reabre.</p>
      </div>
    );
  }
  return (
    <>
      <div className="ops-strategic-act">
        {status === "new" ? <button type="button" className="ops-btn ops-btn-primary" disabled={pending} onClick={() => decide("shortlist")}>{pending ? "Guardando…" : "Guardar para evaluar"}</button> : null}
        {status === "new" || status === "shortlisted" ? <button type="button" className="ops-btn" disabled={pending} onClick={() => decide("work")}>Trabajar</button> : null}
        <button type="button" className="ops-btn" disabled={pending} onClick={() => setConfirming(true)}>Descartar</button>
      </div>
      <p className="ops-foot">«Trabajar» solo anota una prioridad interna: no envía mensajes, no crea nada en GHL y no inscribe a nadie.</p>
    </>
  );
}

export function ConfirmTargetForm({ id, repo }: { id: string; repo: string | null }) {
  const { pending, run } = useRunner();
  const [f, setF] = useState({ repo: repo ?? "", dep: "", health: "", provider: "", reason: "" });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((s) => ({ ...s, [k]: e.target.value }));
  const ready = f.repo.trim().length > 3 && f.dep.trim().startsWith("https://") && f.health.trim().startsWith("https://") && f.reason.trim().length >= 8;
  return (
    <details className="ops-more-box" data-testid="strategic-confirm">
      <summary>Confirmar registro</summary>
      <form className="ops-form" onSubmit={(e) => { e.preventDefault(); if (!ready) return; run({ action: "strategic_target_confirm", target_id: id, repo_full_name: f.repo.trim(), deployment_url: f.dep.trim(), health_url: f.health.trim(), ...(f.provider.trim() ? { provider: f.provider.trim() } : {}), reason: f.reason.trim() }); }}>
        <label className="ops-strategic-field">Repositorio (dueño/nombre)<input className="ops-input" name="repo" value={f.repo} onChange={set("repo")} placeholder="ChristianEducation/LibreriaCrecer" autoComplete="off" /></label>
        <label className="ops-strategic-field">Sitio en producción (https)<input className="ops-input" name="dep" value={f.dep} onChange={set("dep")} placeholder="https://…" inputMode="url" autoComplete="off" /></label>
        <label className="ops-strategic-field">Dirección de salud (https)<input className="ops-input" name="health" value={f.health} onChange={set("health")} placeholder="https://…/health" inputMode="url" autoComplete="off" /></label>
        <label className="ops-strategic-field">Proveedor (opcional)<input className="ops-input" name="provider" value={f.provider} onChange={set("provider")} placeholder="Vercel" autoComplete="off" /></label>
        <label className="ops-strategic-field">Por qué es este servicio<input className="ops-input" name="reason" value={f.reason} onChange={set("reason")} maxLength={200} placeholder="Es el sitio que está en producción" autoComplete="off" /></label>
        <button type="submit" className="ops-btn ops-btn-primary" disabled={pending || !ready}>{pending ? "Guardando…" : "Confirmar registro"}</button>
        <p className="ops-foot">Esto solo guarda los datos. El monitoreo sigue apagado: antes se prueba la dirección real y tú autorizas encenderlo. No se crea ni se conecta nada.</p>
      </form>
    </details>
  );
}
