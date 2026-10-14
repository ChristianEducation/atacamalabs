"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRunner } from "./Approvals";
import { GHL_PLANNER_URL, fmtCl } from "./Parts";
import type { TallerPiece, TallerVersion, TallerView } from "@/lib/ops/types";

/**
 * Redes → Taller (spec §6.2–§6.3): la mesa de revisión e iteración. Las piezas las produce la VPS (o, si son video/motion, Christian y Claude en el PC);
 * aquí se revisan, se piden cambios y se programan. «Programar» es la aprobación de Christian: crea el post en GHL con la fecha elegida.
 */

const FMT: Record<string, string> = { texto: "Texto", imagen: "Imagen", carrusel: "Carrusel", demo: "Demo", reel: "Reel", historia: "Historia" };
const TONE: Record<string, string> = { para_revisar: "atencion", lista: "ok", programada_pendiente_de_clic: "atencion", cambios_pedidos: "atencion", necesita_ayuda: "fallo", en_pc_con_claude: "atencion", en_produccion: "ok", en_cola: "ok", programada: "ok", publicada: "ok", descartada: "fallo" };
const NETS = [{ id: "", label: "Todas" }, { id: "instagram", label: "Instagram" }, { id: "linkedin_page", label: "LinkedIn · página" }, { id: "linkedin_profile", label: "LinkedIn · personal" }];

/** «YYYY-MM-DDTHH:mm» en hora de Chile ↔ ISO UTC (para el selector de fecha). */
function toChileInput(iso: string | null): string {
  if (!iso) return "";
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(iso));
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? "00";
  return `${g("year")}-${g("month")}-${g("day")}T${g("hour")}:${g("minute")}`;
}
function fromChileInput(local: string): string | null {
  const m = local.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!m) return null;
  const guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  // Ajusta por la diferencia real de Chile ese día (cambia con el horario de verano).
  const shown = toChileInput(new Date(guess).toISOString());
  const sm = shown.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!sm) return null;
  const diff = Date.UTC(+sm[1], +sm[2] - 1, +sm[3], +sm[4], +sm[5]) - guess;
  return new Date(guess - diff).toISOString();
}

function Viewer({ v, piece }: { v: TallerVersion; piece: TallerPiece }) {
  if (!v.assets.length) return <p className="ops-foot">Esta versión es solo texto.</p>;
  if (v.assets.some((a) => a.video)) {
    const a = v.assets.find((x) => x.video);
    return a?.url ? <video className="ops-tl-video" src={a.url} controls playsInline preload="metadata" aria-label={`Video v${v.version_no}`} /> : <p className="ops-foot">No pude firmar el enlace del video (recarga).</p>;
  }
  return (
    <ul className={piece.format === "carrusel" ? "ops-tl-slides" : "ops-tl-slides ops-tl-one"} aria-label={`Láminas de la versión ${v.version_no}`}>
      {v.assets.map((a, i) => (
        <li key={i}>
          {a.url ? (
            <a href={a.url} target="_blank" rel="noreferrer noopener" aria-label={`Abrir lámina ${i + 1} en grande`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.url} alt={`Lámina ${i + 1}${a.label ? ": " + a.label : ""}`} loading="lazy" />
            </a>
          ) : <span className="ops-tl-miss">sin enlace</span>}
          <span className="ops-tl-n">{i + 1}</span>
        </li>
      ))}
    </ul>
  );
}

function Schedule({ p }: { p: TallerPiece }) {
  const { pending, run } = useRunner();
  const [when, setWhen] = useState(toChileInput(p.proposed_slot));
  const [done, setDone] = useState<null | { ghl: boolean; msg: string }>(null);
  const cur = p.versions[p.versions.length - 1];
  const n = cur ? cur.assets.length : 0;
  const go = async () => {
    const iso = fromChileInput(when);
    if (!iso) return;
    const r = await run({ action: "taller_schedule", piece_id: p.id, schedule_at: iso });
    if (r?.ok) setDone({ ghl: Boolean(r.needsGhl), msg: r.message });
  };
  if (done) return (<div className="ops-reject" data-testid="schedule-done"><p className="ops-foot"><strong>{done.msg}</strong></p>{done.ghl ? <p className="ops-foot"><a href={GHL_PLANNER_URL} target="_blank" rel="noreferrer noopener">Abrir GHL para el último clic →</a></p> : null}</div>);
  return (
    <div className="ops-reject" data-testid="schedule-confirm">
      <p className="ops-foot"><strong>Vas a programar:</strong> «{p.title}» · {FMT[p.format] ?? p.format}{n ? ` · ${n} ${p.format === "reel" ? "video" : n === 1 ? "imagen" : "láminas"}` : ""}</p>
      <p className="ops-foot"><strong>Cuenta:</strong> {p.channel_label}</p>
      <label className="ops-foot" htmlFor={`when-${p.id}`}><strong>Fecha y hora (Chile):</strong></label>
      <input id={`when-${p.id}`} className="ops-input" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
      {p.proposed_slot ? <p className="ops-foot">Propuesta: el primer hueco libre de su semana ({fmtCl(p.proposed_slot)}).</p> : null}
      {p.format === "carrusel" ? <p className="ops-foot">Los carruseles quedan <strong>en revisión</strong> en GHL: ábrelo, comprueba que estén las {n} láminas y dale el último clic de aprobar. El Taller lo marca «programada» cuando GHL lo confirme.</p> : <p className="ops-foot">Tu clic es la aprobación: queda programada en GHL a esa hora.</p>}
      <div className="ops-btns"><button type="button" className="ops-btn ops-btn-primary" disabled={pending || !fromChileInput(when)} onClick={go}>{pending ? "Programando…" : "Sí, programar"}</button></div>
    </div>
  );
}

function Detail({ p }: { p: TallerPiece }) {
  const { pending, run } = useRunner();
  const last = p.versions[p.versions.length - 1] ?? null;
  const [sel, setSel] = useState(last ? last.version_no : 0);
  const [cmp, setCmp] = useState<number | null>(null);
  const [mode, setMode] = useState<null | "schedule" | "discard" | "duplicate">(null);
  const [fb, setFb] = useState("");
  const [scope, setScope] = useState("global");
  const [cap, setCap] = useState(last?.caption ?? "");
  const [reason, setReason] = useState("");
  const [net, setNet] = useState("");
  const v = p.versions.find((x) => x.version_no === sel) ?? last;
  const vc = cmp ? p.versions.find((x) => x.version_no === cmp) ?? null : null;
  const canReview = p.status === "para_revisar" || p.status === "lista";
  const canFeedback = ["para_revisar", "lista", "cambios_pedidos"].includes(p.status);
  const slides = v ? v.assets.length : 0;
  const act = async (input: Parameters<typeof run>[0]) => { const r = await run(input); if (r?.ok) { setFb(""); setMode(null); } return r; };
  return (
    <section className="ops-card" aria-labelledby="ops-tl-d" data-testid="taller-detail" data-status={p.status}>
      <p className="ops-foot"><Link href="/ops?view=taller" scroll={false}>← Volver al Taller</Link></p>
      <header className="ops-card-h"><h2 id="ops-tl-d">{p.title}</h2><span className={`ops-pill ops-pill-${TONE[p.status] ?? "atencion"}`}>{p.status_label}</span></header>
      <p className="ops-foot">{[p.channel_label, FMT[p.format] ?? p.format, p.lane === "pc" ? "carril PC con Claude" : "carril VPS", p.needs_by ? `cierre ${fmtCl(p.needs_by)}` : null, p.credits ? `${p.credits} créditos` : null].filter(Boolean).join(" · ")}</p>
      {p.overdue ? <p className="ops-alert-line">Pasó su viernes de cierre: decide si se alarga o pasa a la semana siguiente.</p> : null}
      {p.status === "en_pc_con_claude" ? <p className="ops-foot">Esta pieza (video/motion) se trabaja en el PC con Claude: aparece en «taller-pendientes» de la próxima sesión.</p> : null}
      {p.status === "programada_pendiente_de_clic" ? <p className="ops-foot"><strong>Falta tu último clic en GHL.</strong> <a href={GHL_PLANNER_URL} target="_blank" rel="noreferrer noopener">Abrir el Planner</a>{p.scheduled_at ? ` · fecha ${fmtCl(p.scheduled_at)}` : ""}</p> : null}
      {p.status === "programada" && p.scheduled_at ? <p className="ops-foot">Programada para {fmtCl(p.scheduled_at)}. Cambios de hora finos: en GHL.</p> : null}

      {p.versions.length ? (
        <>
          <div className="ops-chips" role="group" aria-label="Versiones">
            {p.versions.map((x) => <button key={x.version_no} type="button" className={x.version_no === sel ? "ops-chip ops-chip-on" : "ops-chip"} onClick={() => setSel(x.version_no)}>v{x.version_no}</button>)}
            {p.versions.length > 1 ? <button type="button" className={cmp ? "ops-chip ops-chip-on" : "ops-chip"} onClick={() => setCmp(cmp ? null : p.versions.find((x) => x.version_no !== sel)?.version_no ?? null)}>{cmp ? "Quitar comparación" : "Comparar"}</button> : null}
          </div>
          {v ? (
            <div className={vc ? "ops-tl-cmp" : undefined}>
              <div><p className="ops-foot">v{v.version_no} · {v.created_by} · {fmtCl(v.created_at)}{v.cost_credits ? ` · ${v.cost_credits} créditos` : ""}</p><Viewer v={v} piece={p} /></div>
              {vc ? <div><p className="ops-foot">v{vc.version_no} · {vc.created_by} · {fmtCl(vc.created_at)}</p><Viewer v={vc} piece={p} /></div> : null}
            </div>
          ) : null}
          {v?.qa ? <details className="ops-more-box"><summary>Control de calidad{v.qa.score != null ? ` · nota ${v.qa.score}` : ""}</summary>{v.qa.problems.length ? <ul className="ops-src">{v.qa.problems.map((x, i) => <li key={i}>{x}</li>)}</ul> : <p className="ops-foot">Sin problemas anotados.</p>}</details> : null}
        </>
      ) : <p className="ops-empty">Todavía no hay versión: {p.lane === "pc" ? "se hace en la próxima sesión en el PC con Claude." : "la producción la entrega y te avisa."}</p>}

      {p.idea ? (
        <details className="ops-more-box"><summary>La idea detrás</summary>
          <dl className="ops-detail">
            {p.idea.hook ? (<><dt>Gancho</dt><dd>«{p.idea.hook}»</dd></>) : null}
            {p.idea.why ? (<><dt>Por qué</dt><dd>{p.idea.why}</dd></>) : null}
            {p.keyword ? (<><dt>Palabra clave</dt><dd>{p.keyword}{p.resource_id ? " (lleva recurso)" : ""}</dd></>) : null}
          </dl>
          {p.idea.evidence.length ? <ul className="ops-src">{p.idea.evidence.map((e) => <li key={e.type + e.id}>{e.url ? <a href={e.url} target="_blank" rel="noreferrer noopener">{e.note || e.url}</a> : e.note || e.type}</li>)}</ul> : null}
        </details>
      ) : null}

      {last && p.format !== "historia" && canFeedback ? (
        <div className="ops-form">
          <label className="ops-foot" htmlFor={`cap-${p.id}`}><strong>Texto de la publicación</strong>{p.keyword ? ` (debe incluir «${p.keyword}»)` : ""}</label>
          <textarea id={`cap-${p.id}`} className="ops-textarea" rows={5} maxLength={3000} value={cap} onChange={(e) => setCap(e.target.value)} />
          <div className="ops-btns"><button type="button" className="ops-btn" disabled={pending || cap === (last.caption ?? "")} onClick={() => act({ action: "taller_caption", piece_id: p.id, caption: cap })}>{pending ? "Guardando…" : "Guardar texto"}</button></div>
        </div>
      ) : null}

      {p.feedback.length ? (
        <><h3>Cambios pedidos</h3><ul className="ops-list ops-signals" data-testid="feedback">{p.feedback.map((f) => <li key={f.id}><span className="ops-row-title">{f.status === "done" ? "✓ " : ""}{f.scope === "global" ? "General" : f.scope.replace("lamina", "Lámina")}</span><span className="ops-row-sub">{f.text}{f.status === "done" ? " · resuelto" : " · pendiente"}</span></li>)}</ul></>
      ) : null}

      {canFeedback ? (
        <div className="ops-form">
          <div className="ops-form-row">
            <select className="ops-select" aria-label="Sobre qué" value={scope} onChange={(e) => setScope(e.target.value)}>
              <option value="global">Toda la pieza</option>
              {Array.from({ length: slides > 1 ? slides : 0 }, (_, i) => <option key={i} value={`lamina ${i + 1}`}>Lámina {i + 1}</option>)}
            </select>
          </div>
          <textarea className="ops-textarea" rows={3} maxLength={2000} placeholder="Qué cambiar: «la portada más cerca», «el título más corto»…" aria-label="Qué cambiar" value={fb} onChange={(e) => setFb(e.target.value)} />
          <div className="ops-btns"><button type="button" className="ops-btn" disabled={pending || fb.trim().length < 3} onClick={() => act({ action: "taller_feedback", piece_id: p.id, text: fb, scope })}>{pending ? "Enviando…" : "Pedir cambio"}</button></div>
        </div>
      ) : null}

      {mode === "schedule" ? <Schedule p={p} /> : mode === "discard" ? (
        <div className="ops-reject">
          <input className="ops-input" type="text" maxLength={300} placeholder="Motivo (opcional)" aria-label="Motivo del descarte" value={reason} onChange={(e) => setReason(e.target.value)} />
          <p className="ops-foot">{p.ghl_post_id ? "Ya está en GHL: se retira con un rechazo (reversible desde GHL) y queda descartada." : "Queda descartada y la razón se guarda para aprender."}</p>
          <div className="ops-btns"><button type="button" className="ops-btn ops-btn-danger" disabled={pending} onClick={() => act({ action: "taller_discard", piece_id: p.id, reason: reason || undefined })}>{pending ? "Descartando…" : "Sí, descartar"}</button><button type="button" className="ops-btn" onClick={() => setMode(null)}>Cancelar</button></div>
        </div>
      ) : mode === "duplicate" ? (
        <div className="ops-reject">
          <select className="ops-select" aria-label="Otra red" value={net} onChange={(e) => setNet(e.target.value)}><option value="">Elige la red…</option>{NETS.filter((x) => x.id && x.id !== p.channel).map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select>
          <p className="ops-foot">Crea una idea hija (no copia el texto): Hermes completa su ficha con la voz de esa red.</p>
          <div className="ops-btns"><button type="button" className="ops-btn ops-btn-primary" disabled={pending || !net} onClick={() => act({ action: "taller_duplicate", piece_id: p.id, channel: net })}>{pending ? "Creando…" : "Duplicar"}</button><button type="button" className="ops-btn" onClick={() => setMode(null)}>Cancelar</button></div>
        </div>
      ) : (
        <div className="ops-btns">
          {p.status === "para_revisar" ? <button type="button" className="ops-btn" disabled={pending} onClick={() => act({ action: "taller_approve", piece_id: p.id })}>Aprobar</button> : null}
          {canReview && last ? <button type="button" className="ops-btn ops-btn-primary" disabled={pending} onClick={() => setMode("schedule")}>Programar…</button> : null}
          {p.status !== "publicada" && p.status !== "descartada" ? <button type="button" className="ops-btn" disabled={pending} onClick={() => setMode("discard")}>Descartar</button> : null}
          <button type="button" className="ops-btn" disabled={pending} onClick={() => setMode("duplicate")}>Duplicar a otra red</button>
        </div>
      )}
    </section>
  );
}

export function TallerBoard({ data, selected }: { data: TallerView; selected: string | null }) {
  const [net, setNet] = useState("");
  const piece = selected ? data.pieces.find((p) => p.id === selected) ?? null : null;
  const list = useMemo(() => data.pieces.filter((p) => !net || p.channel === net), [data.pieces, net]);
  if (selected) return piece ? <Detail p={piece} /> : <section className="ops-card"><p className="ops-empty">Esa pieza ya no está en el Taller. <Link href="/ops?view=taller" scroll={false}>Volver</Link></p></section>;
  const groups: { status: string; label: string; rows: TallerPiece[] }[] = [];
  list.forEach((p) => { let g = groups.find((x) => x.status === p.status); if (!g) { g = { status: p.status, label: p.status_label, rows: [] }; groups.push(g); } g.rows.push(p); });
  return (
    <section className="ops-card" aria-label="Taller" data-testid="taller-board">
      <div className="ops-chips" role="group" aria-label="Red">{NETS.map((x) => <button key={x.id} type="button" className={net === x.id ? "ops-chip ops-chip-on" : "ops-chip"} onClick={() => setNet(x.id)}>{x.label}</button>)}</div>
      {!list.length ? <p className="ops-empty">El Taller está vacío. Cuando apruebes una idea, su pieza aparece aquí: la VPS la produce y te avisa cuando hay una versión para revisar.</p> : null}
      {groups.map((g) => (
        <div key={g.status} className="ops-tl-group">
          <h3>{g.label} · {g.rows.length}</h3>
          <ul className="ops-tl-cards">
            {g.rows.map((p) => (
              <li key={p.id} data-testid={`pieza-${p.id}`} data-status={p.status}>
                <Link href={`/ops?view=taller&pieza=${p.id}`} scroll={false} className="ops-tl-card">
                  {p.thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.thumb} alt="" loading="lazy" />
                  ) : <span className="ops-tl-ph" aria-hidden="true">{(FMT[p.format] ?? p.format).slice(0, 1)}</span>}
                  <span className="ops-row-main">
                    <span className="ops-row-title">{p.title}</span>
                    <span className="ops-row-sub">{[p.channel_label, FMT[p.format] ?? p.format, p.current_version ? `v${p.current_version}` : "sin versión", p.lane === "pc" ? "PC" : "VPS"].join(" · ")}</span>
                    <span className="ops-row-sub">{p.needs_by ? `cierre ${fmtCl(p.needs_by)}` : ""}{p.overdue ? " · atrasada" : ""}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
