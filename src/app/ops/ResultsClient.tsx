"use client";

import { useRunner } from "./Approvals";

/** Resultados → Aprendizaje: aprobar o rechazar una propuesta (auditado; aprobar no aplica nada por sí solo). */
export function DecideProposal({ id }: { id: string }) {
  const { pending, run } = useRunner();
  return (
    <div className="ops-btns">
      <button type="button" className="ops-btn ops-btn-primary" disabled={pending} onClick={() => run({ action: "learning_decide", proposal_id: id, decision: "approve" })}>{pending ? "Guardando…" : "Aprobar"}</button>
      <button type="button" className="ops-btn" disabled={pending} onClick={() => run({ action: "learning_decide", proposal_id: id, decision: "reject" })}>Rechazar</button>
    </div>
  );
}
