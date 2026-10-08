"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { opsAct } from "./actions";
import { useToast } from "./Shell";
import { GHL_PLANNER_URL, Preview, fmtCl } from "./Parts";
import type { EmailCard, LinkedinReady, LinkedinSent, OpsActionInput, OpsActionState, Overview, PieceRow } from "@/lib/ops/types";

const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().replace(/-/g, "") : `r${Date.now()}${Math.random().toString(36).slice(2, 10)}`);

/** Ejecuta una acción de /ops: un solo toque a la vez (doble toque ignorado), aviso con el resultado REAL del sistema y refresco de datos. */
export function useRunner() {
  const router = useRouter();
  const toast = useToast();
  const [pending, setPending] = useState(false);
  const lock = useRef(false);
  const run = useCallback(async (input: Omit<OpsActionInput, "request_id">): Promise<OpsActionState | null> => {
    if (lock.current) return null;
    lock.current = true;
    setPending(true);
    try {
      const r = await opsAct({ ...input, request_id: newId() });
      toast(r.ok, r.message);
      router.refresh();
      return r;
    } catch {
      const msg = "No se pudo completar. No se hizo nada; revisa e inténtalo de nuevo.";
      toast(false, msg);
      return { ok: false, message: msg };
    } finally {
      lock.current = false;
      setPending(false);
    }
  }, [router, toast]);
  return { pending, run };
}

const STATUS: Record<string, string> = { draft: "Borrador", approved: "Aprobado · esperando envío", sending: "Enviándose", sent: "Enviado", failed: "Error", cancelled: "Rechazado / cancelado", dry_run: "Simulado", received: "Recibido" };

const LEVEL_BAND: Record<string, string> = { bueno: "alta", aceptable: "valida", bajo: "pendiente" };

/** Calidad del correo (Cold Email v2): score, por qué, evidencia usada y la versión anterior si fue regenerado. */
function QualityBlock({ card }: { card: EmailCard }) {
  const q = card.cold;
  const prev = card.previous;
  if (!q && !prev) return null;
  return (
    <div className="ops-quality">
      {q ? (
        <details>
          <summary className="ops-q-sum">
            <span>Calidad del correo</span>
            <span className={`ops-score ops-score-${LEVEL_BAND[q.level ?? ""] ?? "neutral"}`} title="Score Cold Email v2 (0–100)">{q.score}</span>
            <span className="ops-foot ops-q-level">{q.level ?? ""}</span>
          </summary>
          <dl className="ops-detail">
            {q.angle ? (<><dt>Ángulo</dt><dd>{q.angle}</dd></>) : null}
            {q.evidence.length ? (<><dt>Evidencia usada</dt><dd>{q.evidence.join(" · ")}</dd></>) : null}
            {q.insight ? (<><dt>Insight</dt><dd>{q.insight}</dd></>) : null}
            {q.friction ? (<><dt>Fricción probable</dt><dd>{q.friction}</dd></>) : null}
            {q.cta_reason ? (<><dt>Por qué este cierre</dt><dd>{q.cta_reason}</dd></>) : null}
            {q.similarity && q.similarity.max > 0 ? (<><dt>Parecido con otros</dt><dd>{Math.round(q.similarity.max * 100)}%{q.similarity.with ? ` (${q.similarity.with})` : ""}</dd></>) : null}
            {q.warnings.length ? (<><dt>Avisos</dt><dd><ul className="ops-q-list">{q.warnings.map((w, i) => (<li key={i}>{w}</li>))}</ul></dd></>) : (<><dt>Avisos</dt><dd>Sin avisos.</dd></>)}
            {q.rewards.length ? (<><dt>A favor</dt><dd><ul className="ops-q-list">{q.rewards.map((w, i) => (<li key={i}>{w}</li>))}</ul></dd></>) : null}
          </dl>
        </details>
      ) : null}
      {prev ? (
        <details>
          <summary className="ops-q-sum"><span>Versión anterior</span>{prev.score != null ? <span className="ops-score ops-score-pendiente" title="Score de la versión anterior">{prev.score}</span> : null}<span className="ops-foot ops-q-level">{prev.reason ?? ""}{prev.at ? ` · ${fmtCl(prev.at)}` : ""}</span></summary>
          <h4 className="ops-h4">Asunto (anterior)</h4>
          <p className="ops-copy ops-copy-s">{prev.subject}</p>
          <h4 className="ops-h4">Texto (anterior)</h4>
          <p className="ops-copy">{prev.body}</p>
        </details>
      ) : null}
    </div>
  );
}

function ScoreChip({ score, band }: { score: number | null; band?: string | null }) {
  if (score == null) return null;
  return <span className={`ops-score ops-score-${band ?? "neutral"}`} title="Score del prospecto">{score}</span>;
}

/* ------------------------------------------------------------------ correo */
export function EmailCardView({ card, selectable, selected, onToggle, defaultOpen }: { card: EmailCard; selectable?: boolean; selected?: boolean; onToggle?: (id: string) => void; defaultOpen?: boolean }) {
  const { pending, run } = useRunner();
  const [editing, setEditing] = useState(false);
  const [subject, setSubject] = useState(card.subject ?? "");
  const [body, setBody] = useState(card.body ?? "");
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const dirty = subject.trim() !== (card.subject ?? "").trim() || body.trim() !== (card.body ?? "").trim();
  const hash = card.hash ?? "";
  const locked = !card.editable;

  const save = async () => {
    const r = await run({ action: "email_save", message_id: card.id, expected_hash: hash, subject, body });
    if (r?.ok) setEditing(false);
  };
  const lines = (card.body ?? "").length;

  return (
    <article className="ops-ap" data-status={card.status} data-kind="email">
      <details open={defaultOpen}>
        <summary className="ops-ap-sum">
          {selectable && card.can_approve ? (
            <input type="checkbox" className="ops-check" aria-label={`Seleccionar correo de ${card.company}`} checked={Boolean(selected)} onClick={(e) => e.stopPropagation()} onChange={() => onToggle?.(card.id)} />
          ) : null}
          <span className="ops-row-main">
            <span className="ops-row-head"><span className="ops-tag">Correo</span><span className="ops-row-title">{card.company}</span></span>
            <span className="ops-row-sub ops-ellipsis">{[card.subject, STATUS[card.status] ?? card.status].filter(Boolean).join(" · ")}</span>
          </span>
          <ScoreChip score={card.score} band={card.band} />
        </summary>
        <div className="ops-ap-body">
          <dl className="ops-detail">
            <dt>Para</dt><dd>{[card.contact_name, card.contact_role].filter(Boolean).join(", ") || "Contacto de la empresa"} · <span className="ops-mono">{card.to ?? "—"}</span></dd>
            <dt>Estado</dt>
            <dd>
              {STATUS[card.status] ?? card.status}
              {card.status === "approved" && card.scheduled_for ? ` · sale desde ${fmtCl(card.scheduled_for)}` : ""}
              {card.status === "sent" ? ` · ${fmtCl(card.sent_at)}` : ""}
              {card.approved_by ? ` · aprobado por ${card.approved_by}` : ""}
            </dd>
            {card.reason ? (<><dt>Ángulo</dt><dd>{card.reason}</dd></>) : null}
            {card.evidence ? (<><dt>Hecho observado</dt><dd>«{card.evidence}»</dd></>) : null}
            {card.error ? (<><dt>Error</dt><dd className="ops-err">{card.error}</dd></>) : null}
            {card.rejected_reason ? (<><dt>Motivo del rechazo</dt><dd>{card.rejected_reason}</dd></>) : null}
            {card.suppressed ? (<><dt>Aviso</dt><dd className="ops-err">Este correo está en la lista de supresión: no se enviará.</dd></>) : null}
          </dl>

          {editing ? (
            <div className="ops-edit">
              <label className="ops-lab" htmlFor={`s-${card.id}`}>Asunto</label>
              <input id={`s-${card.id}`} className="ops-input" value={subject} maxLength={200} onChange={(e) => setSubject(e.target.value)} />
              <label className="ops-lab" htmlFor={`b-${card.id}`}>Cuerpo</label>
              <textarea id={`b-${card.id}`} className="ops-textarea" rows={Math.min(18, Math.max(8, Math.ceil(lines / 60) + 4))} value={body} maxLength={8000} onChange={(e) => setBody(e.target.value)} />
              <p className="ops-foot">El destinatario no se puede editar desde aquí. Guardar NO envía nada.</p>
              <div className="ops-btns">
                <button type="button" className="ops-btn ops-btn-primary" disabled={pending || !dirty || subject.trim().length < 3 || body.trim().length < 20} onClick={save}>{pending ? "Guardando…" : "Guardar cambios"}</button>
                <button type="button" className="ops-btn" disabled={pending} onClick={() => { setEditing(false); setSubject(card.subject ?? ""); setBody(card.body ?? ""); }}>Cancelar</button>
              </div>
            </div>
          ) : (
            <>
              <h4 className="ops-h4">Asunto</h4>
              <p className="ops-copy ops-copy-s">{card.subject}</p>
              <h4 className="ops-h4">Texto del correo</h4>
              <p className="ops-copy">{card.body}</p>
            </>
          )}

          {!editing ? <QualityBlock card={card} /> : null}

          {!editing ? (
            <div className="ops-btns">
              {card.can_approve ? <button type="button" className="ops-btn ops-btn-primary" disabled={pending || card.suppressed} onClick={() => run({ action: "email_approve", message_id: card.id, expected_hash: hash })}>{pending ? "Aprobando…" : "Aprobar envío"}</button> : null}
              {card.editable ? <button type="button" className="ops-btn" disabled={pending} onClick={() => setEditing(true)}>Editar</button> : null}
              {card.can_reopen ? <button type="button" className="ops-btn" disabled={pending} onClick={() => run({ action: "email_reopen", message_id: card.id })}>Volver a borrador</button> : null}
              {card.can_reject && !rejecting ? <button type="button" className="ops-btn ops-btn-danger" disabled={pending} onClick={() => setRejecting(true)}>Rechazar</button> : null}
              {locked && !card.can_reopen && !card.can_reject ? <span className="ops-foot">{card.status === "sending" || card.status === "sent" ? "Bloqueado: ya se está enviando o se envió." : "Sin acciones en este estado."}</span> : null}
            </div>
          ) : null}
          {rejecting ? (
            <div className="ops-reject">
              <label className="ops-lab" htmlFor={`r-${card.id}`}>Motivo (opcional)</label>
              <input id={`r-${card.id}`} className="ops-input" value={reason} maxLength={200} placeholder="Ej.: muy genérico" onChange={(e) => setReason(e.target.value)} />
              <div className="ops-btns">
                <button type="button" className="ops-btn ops-btn-danger" disabled={pending} onClick={async () => { const r = await run({ action: "email_reject", message_id: card.id, reason }); if (r?.ok) setRejecting(false); }}>Confirmar rechazo</button>
                <button type="button" className="ops-btn" disabled={pending} onClick={() => setRejecting(false)}>Cancelar</button>
              </div>
            </div>
          ) : null}
        </div>
      </details>
    </article>
  );
}

/* ---------------------------------------------------------------- LinkedIn */
export function LinkedinReadyCard({ p }: { p: LinkedinReady }) {
  const { pending, run } = useRunner();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  return (
    <article className="ops-ap" data-kind="linkedin">
      <details>
        <summary className="ops-ap-sum">
          <span className="ops-row-main">
            <span className="ops-row-head"><span className="ops-tag ops-tag-li">LinkedIn</span><span className="ops-row-title">{p.person ?? p.company}</span></span>
            <span className="ops-row-sub ops-ellipsis">{[p.role, p.company].filter(Boolean).join(" · ")}</span>
          </span>
          <ScoreChip score={p.score} band={p.band} />
        </summary>
        <div className="ops-ap-body">
          <dl className="ops-detail">
            <dt>Persona</dt><dd>{p.person} — {p.role}</dd>
            <dt>Empresa</dt><dd>{p.company}</dd>
            <dt>Perfil</dt><dd>{p.url ? <a className="ops-a" href={p.url} target="_blank" rel="noreferrer noopener">{p.url}</a> : "—"}</dd>
            {p.source ? (<><dt>De dónde salió el perfil</dt><dd><a className="ops-a" href={p.source} target="_blank" rel="noreferrer noopener">{p.source}</a></dd></>) : null}
            {p.angle ? (<><dt>Ángulo</dt><dd>{p.angle}</dd></>) : null}
            {p.fact ? (<><dt>Hecho observado</dt><dd>«{p.fact}»</dd></>) : null}
            {p.reason ? (<><dt>Por qué LinkedIn</dt><dd>{p.reason}</dd></>) : null}
            <dt>Destino</dt><dd>Lista «Atacama OS — Producción» · campaña «Atacama OS — LinkedIn Producción»</dd>
          </dl>
          <p className="ops-foot">Al aprobar entra a la lista y a la campaña y Waalaxy ejecuta la secuencia. Respeta el tope diario y la regla de no contactar por correo y LinkedIn a la vez.</p>
          <div className="ops-btns">
            <button type="button" className="ops-btn ops-btn-primary" disabled={pending} onClick={() => run({ action: "linkedin_approve", candidate_id: p.candidate_id })}>{pending ? "Aprobando…" : "Aprobar LinkedIn"}</button>
            {!rejecting ? <button type="button" className="ops-btn ops-btn-danger" disabled={pending} onClick={() => setRejecting(true)}>Rechazar</button> : null}
          </div>
          {rejecting ? (
            <div className="ops-reject">
              <label className="ops-lab" htmlFor={`lr-${p.candidate_id}`}>Motivo (opcional)</label>
              <input id={`lr-${p.candidate_id}`} className="ops-input" value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} />
              <div className="ops-btns">
                <button type="button" className="ops-btn ops-btn-danger" disabled={pending} onClick={async () => { const r = await run({ action: "linkedin_reject", candidate_id: p.candidate_id, reason }); if (r?.ok) setRejecting(false); }}>Confirmar rechazo</button>
                <button type="button" className="ops-btn" disabled={pending} onClick={() => setRejecting(false)}>Cancelar</button>
              </div>
            </div>
          ) : null}
        </div>
      </details>
    </article>
  );
}

export function LinkedinSentRow({ s }: { s: LinkedinSent }) {
  return (
    <li className="ops-ap ops-ap-flat" data-kind="linkedin-sent">
      <details>
        <summary className="ops-ap-sum">
          <span className="ops-row-main">
            <span className="ops-row-head"><span className="ops-row-title">{s.person ?? s.company}</span></span>
            <span className="ops-row-sub ops-ellipsis">{[s.role, s.company, s.state_label].filter(Boolean).join(" · ")}</span>
          </span>
          <ScoreChip score={s.score} />
        </summary>
        <dl className="ops-detail">
          <dt>Aprobado</dt><dd>{fmtCl(s.approved_at)}{s.approved_by ? ` · ${s.approved_by}` : ""}</dd>
          <dt>Enviado a Waalaxy</dt><dd>{s.imported_at ? fmtCl(s.imported_at) : "No quedó importado"}{s.import_code ? ` · alta: ${s.import_code}` : ""}</dd>
          <dt>Lista / campaña</dt><dd><span className="ops-mono">{s.list_id ?? "—"}</span> / <span className="ops-mono">{s.campaign_id ?? "—"}</span>{s.campaign_code ? ` · ${s.campaign_code}` : ""}</dd>
          {s.angle ? (<><dt>Ángulo</dt><dd>{s.angle}</dd></>) : null}
          <dt>Último estado conocido por Atacama OS</dt><dd>{s.state_label}{s.last_event_at ? ` · ${fmtCl(s.last_event_at)}` : ""}</dd>
        </dl>
      </details>
    </li>
  );
}

/* --------------------------------------------------------------- contenido */
export function ContentApprovalCard({ p, defaultOpen }: { p: PieceRow; defaultOpen?: boolean }) {
  const { pending, run } = useRunner();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const pv = p.preview ?? null;
  const carousel = (pv?.media.length ?? 0) > 1;
  const when = pv?.proposed_label ?? p.at_label;
  return (
    <article className="ops-ap" data-kind="content">
      <details open={defaultOpen}>
        <summary className="ops-ap-sum">
          <span className="ops-row-main">
            <span className="ops-row-head"><span className="ops-tag ops-tag-ct">Publicación</span><span className="ops-row-title">{p.title}</span></span>
            <span className="ops-row-sub ops-ellipsis">{[p.channel, pv?.format ?? p.format, when ? `propuesta ${when}` : null].filter(Boolean).join(" · ")}</span>
          </span>
          {p.score != null ? <span className="ops-score ops-score-neutral" title="Score del Content Engine">{p.score}</span> : null}
        </summary>
        <div className="ops-ap-body">
          {pv ? <Preview pv={pv} /> : <p className="ops-empty">Sin vista previa disponible: ábrela en Social Planner.</p>}
          {pv?.resource ? <p className="ops-foot">Recurso asociado: <a className="ops-a" href={pv.resource.url} target="_blank" rel="noreferrer noopener">{pv.resource.name}</a>. El enlace del post lleva atribución (UTM de canal, recurso y pieza).</p> : null}
          <p className="ops-foot">{when ? `Si apruebas, queda programada para ${when} (hora de Chile). ` : ""}Nada se publica sin tu aprobación.</p>
          {carousel ? <p className="ops-alert-line">Es un carrusel de {pv?.media.length} imágenes: GHL lo reduce a 1 imagen si se aprueba por API. Apruébalo en GHL para no perderlas.</p> : null}
          <div className="ops-btns">
            {carousel
              ? <a className="ops-btn ops-btn-primary" href={GHL_PLANNER_URL} target="_blank" rel="noreferrer noopener">Aprobar en GHL</a>
              : <button type="button" className="ops-btn ops-btn-primary" disabled={pending} onClick={() => run({ action: "content_approve", piece_id: p.id })}>{pending ? "Aprobando…" : "Aprobar y programar"}</button>}
            {!rejecting ? <button type="button" className="ops-btn ops-btn-danger" disabled={pending} onClick={() => setRejecting(true)}>Rechazar</button> : null}
          </div>
          {rejecting ? (
            <div className="ops-reject">
              <label className="ops-lab" htmlFor={`cr-${p.id}`}>Motivo (opcional)</label>
              <input id={`cr-${p.id}`} className="ops-input" value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} />
              <div className="ops-btns">
                <button type="button" className="ops-btn ops-btn-danger" disabled={pending} onClick={async () => { const r = await run({ action: "content_reject", piece_id: p.id, reason }); if (r?.ok) setRejecting(false); }}>Confirmar rechazo</button>
                <button type="button" className="ops-btn" disabled={pending} onClick={() => setRejecting(false)}>Cancelar</button>
              </div>
            </div>
          ) : null}
        </div>
      </details>
    </article>
  );
}

/* ------------------------------------------------------- centro de aprobaciones */
type Item = { key: string; kind: "email" | "linkedin" | "content"; urgency: number; age: number; score: number; node: React.ReactNode };
const FILTERS = [["todas", "Todas"], ["correos", "Correos"], ["linkedin", "LinkedIn"], ["contenido", "Contenido"]] as const;
export type ApprovalFilter = (typeof FILTERS)[number][0];
const PAGE = 6;

/**
 * Todo lo que espera una decisión, en un solo lugar. Orden: 1) urgencia (publicación que sale en <24 h/<48 h primero), 2) antigüedad (lo más viejo primero),
 * 3) score. Sin scroll infinito: de a 6 con «Ver más».
 */
export function ApprovalsCenter({ overview, review, initialFilter, now }: { overview: Overview | null; review: PieceRow[]; initialFilter: ApprovalFilter; now: number }) {
  const [filter, setFilter] = useState<ApprovalFilter>(initialFilter);
  const [shown, setShown] = useState(PAGE);
  const [sel, setSel] = useState<string[]>([]);
  const [confirm, setConfirm] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const { pending, run } = useRunner();

  const drafts = useMemo(() => (overview?.email.cards ?? []).filter((c) => c.status === "draft"), [overview]);
  const cap = overview?.email.cap ?? 5;
  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    drafts.forEach((c) => out.push({ key: `e-${c.id}`, kind: "email", urgency: 1, age: Date.parse(c.created_at) || 0, score: c.score ?? 0, node: <EmailCardView key={`${c.id}-${c.hash}`} card={c} selectable selected={sel.includes(c.id)} onToggle={(id) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= cap ? s : [...s, id]))} /> }));
    (overview?.linkedin.ready ?? []).forEach((p) => out.push({ key: `l-${p.candidate_id}`, kind: "linkedin", urgency: 1, age: 0, score: p.score ?? 0, node: <LinkedinReadyCard key={p.candidate_id} p={p} /> }));
    review.forEach((p) => {
      const t = Date.parse(p.preview?.proposed_at ?? p.at ?? "");
      const hrs = Number.isFinite(t) ? (t - now) / 3600000 : 99;
      out.push({ key: `c-${p.id}`, kind: "content", urgency: hrs < 24 ? 3 : hrs < 48 ? 2 : 1, age: Number.isFinite(t) ? t : 0, score: p.score ?? 0, node: <ContentApprovalCard key={p.id} p={p} /> });
    });
    return out.sort((a, b) => b.urgency - a.urgency || a.age - b.age || b.score - a.score);
  }, [drafts, overview, review, sel, cap, now]);

  const want = filter === "todas" ? null : filter === "correos" ? "email" : filter === "linkedin" ? "linkedin" : "content";
  const list = items.filter((i) => !want || i.kind === want);
  const counts = { todas: items.length, correos: items.filter((i) => i.kind === "email").length, linkedin: items.filter((i) => i.kind === "linkedin").length, contenido: items.filter((i) => i.kind === "content").length };
  const selDrafts = sel.filter((id) => drafts.some((d) => d.id === id));

  const bulk = async () => {
    setConfirm(false);
    let ok = 0;
    for (let i = 0; i < selDrafts.length; i++) {
      const c = drafts.find((d) => d.id === selDrafts[i]);
      if (!c) continue;
      setProgress(`Aprobando ${i + 1} de ${selDrafts.length}…`);
      const r = await run({ action: "email_approve", message_id: c.id, expected_hash: c.hash ?? "" });
      if (r === null) { await new Promise((res) => setTimeout(res, 500)); i--; continue; }   // otra acción en curso: se espera y se reintenta el mismo
      if (r.ok) ok++;
    }
    setProgress(null);
    setSel([]);
    return ok;
  };

  return (
    <div className="ops-approvals">
      <div className="ops-chips" role="tablist" aria-label="Filtrar aprobaciones">
        {FILTERS.map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={filter === id} className={filter === id ? "ops-chip ops-chip-on" : "ops-chip"} onClick={() => { setFilter(id); setShown(PAGE); }}>
            {label}{counts[id] ? <span className="ops-chip-n">{counts[id]}</span> : null}
          </button>
        ))}
      </div>

      {selDrafts.length ? (
        <div className="ops-bulk" role="region" aria-label="Aprobación de varios correos">
          {!confirm ? (
            <>
              <span>{selDrafts.length} {selDrafts.length === 1 ? "correo seleccionado" : "correos seleccionados"} (máx. {cap})</span>
              <button type="button" className="ops-btn ops-btn-primary" disabled={pending} onClick={() => setConfirm(true)}>Aprobar {selDrafts.length}</button>
              <button type="button" className="ops-btn" disabled={pending} onClick={() => setSel([])}>Limpiar</button>
            </>
          ) : (
            <>
              <strong>Vas a aprobar {selDrafts.length} {selDrafts.length === 1 ? "correo" : "correos"}.</strong>
              <span>Salen en la ventana de envío (lun–vie 09:00–17:30), con el tope de {cap} al día. Se aprueba la versión que ves ahora.</span>
              <button type="button" className="ops-btn ops-btn-primary" disabled={pending} onClick={bulk}>{pending ? progress ?? "Aprobando…" : `Sí, aprobar ${selDrafts.length}`}</button>
              <button type="button" className="ops-btn" disabled={pending} onClick={() => setConfirm(false)}>Volver</button>
            </>
          )}
          {progress && !confirm ? <span role="status">{progress}</span> : null}
        </div>
      ) : null}

      {list.length === 0 ? <p className="ops-empty">Nada espera tu decisión en esta categoría.</p> : (
        <div className="ops-ap-list">
          {list.slice(0, shown).map((i) => i.node)}
          {list.length > shown ? <button type="button" className="ops-btn ops-more-btn" onClick={() => setShown((n) => n + PAGE)}>Ver más ({list.length - shown})</button> : null}
        </div>
      )}
    </div>
  );
}

/* --------------------------------------------------- biblioteca de borradores */
const STATE_FILTERS = [["todos", "Todos"], ["draft", "Borrador"], ["approved", "Aprobados"], ["sending", "Enviando"], ["sent", "Enviados"], ["cancelled", "Rechazados"], ["failed", "Error"]] as const;

export function EmailLibrary({ cards }: { cards: EmailCard[] }) {
  const [state, setState] = useState<(typeof STATE_FILTERS)[number][0]>("todos");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"reciente" | "prioridad">("reciente");
  const [shown, setShown] = useState(8);
  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    const l = cards.filter((c) => (state === "todos" || c.status === state) && (!n || [c.company, c.contact_name, c.to, c.subject].some((x) => String(x ?? "").toLowerCase().includes(n))));
    return l.sort((a, b) => (sort === "prioridad" ? (b.score ?? 0) - (a.score ?? 0) : (Date.parse(b.created_at) || 0) - (Date.parse(a.created_at) || 0)));
  }, [cards, state, q, sort]);
  const count = (s: string) => (s === "todos" ? cards.length : cards.filter((c) => c.status === s).length);
  return (
    <div className="ops-lib">
      <div className="ops-chips" role="tablist" aria-label="Estado del correo">
        {STATE_FILTERS.map(([id, label]) => (count(id) || id === "todos" ? (
          <button key={id} type="button" role="tab" aria-selected={state === id} className={state === id ? "ops-chip ops-chip-on" : "ops-chip"} onClick={() => { setState(id); setShown(8); }}>{label}<span className="ops-chip-n">{count(id)}</span></button>
        ) : null))}
      </div>
      <div className="ops-lib-tools">
        <label className="ops-sr" htmlFor="ops-q">Buscar correo</label>
        <input id="ops-q" className="ops-input" type="search" placeholder="Buscar por empresa, contacto o correo" value={q} onChange={(e) => { setQ(e.target.value); setShown(8); }} />
        <label className="ops-sr" htmlFor="ops-sort">Orden</label>
        <select id="ops-sort" className="ops-input ops-select" value={sort} onChange={(e) => setSort(e.target.value as "reciente" | "prioridad")}>
          <option value="reciente">Más reciente</option>
          <option value="prioridad">Mayor prioridad</option>
        </select>
      </div>
      {list.length === 0 ? <p className="ops-empty">No hay correos con ese filtro.</p> : (
        <div className="ops-ap-list">
          {list.slice(0, shown).map((c) => <EmailCardView key={`${c.id}-${c.hash}-${c.status}`} card={c} />)}
          {list.length > shown ? <button type="button" className="ops-btn ops-more-btn" onClick={() => setShown((n) => n + 8)}>Ver más ({list.length - shown})</button> : null}
        </div>
      )}
    </div>
  );
}
