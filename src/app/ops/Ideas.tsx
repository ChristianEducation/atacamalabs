"use client";

import { useState } from "react";
import { useRunner } from "./Approvals";
import { fmtCl } from "./Parts";
import type { IdeaCard, IdeasView, IdeasWeek } from "@/lib/ops/types";

/** Redes → Ideas (spec §6.1): la propuesta de la semana siguiente, por red, con ficha de 12 campos. Aprobar no produce ni publica nada por sí solo. */

const OBJ: Record<string, string> = { alcance: "Alcance", autoridad: "Autoridad", conversaciones: "Conversaciones", leads: "Leads", recurso: "Descarga de un recurso", servicio: "Mostrar un servicio", educar: "Educar" };
const MET: Record<string, string> = { reach: "Alcance y envíos", watch_time: "Tiempo de visualización", saves: "Guardados", profile_visits: "Visitas al perfil", intent_comments: "Comentarios con intención", dms: "Mensajes directos", leads: "Leads" };
const FMT: Record<string, string> = { texto: "Texto", imagen: "Imagen", carrusel: "Carrusel", demo: "Demo", reel: "Reel", historia: "Historia" };
const ST: Record<string, { label: string; tone: string }> = { proposed: { label: "Por decidir", tone: "atencion" }, changed: { label: "Hermes la reescribe", tone: "atencion" }, approved: { label: "Aprobada", tone: "ok" },
  in_production: { label: "En producción", tone: "ok" }, scheduled: { label: "Programada", tone: "ok" }, published: { label: "Publicada", tone: "ok" } };
const DL: Record<string, string> = { alcanza: "ok", justo: "atencion", no_alcanza: "fallo" };
const CHIPS = ["Muy genérica", "Ya lo dijimos", "No es nuestro público", "No me convence el gancho", "Muy cara de producir"];

function weekLabel(w: string): string {
  const d = new Date(w + "T12:00:00Z");
  const f = new Date(d.getTime() + 4 * 86400000);
  const m = (x: Date) => x.toLocaleDateString("es-CL", { day: "numeric", month: "short", timeZone: "UTC" });
  return `${m(d)} – ${m(f)}`;
}
function nextMondays(from: string, n: number): string[] {
  const out: string[] = [];
  const d = new Date(from + "T12:00:00Z");
  for (let i = 0; i < n; i++) { out.push(new Date(d.getTime() + i * 7 * 86400000).toISOString().slice(0, 10)); }
  return out;
}

function Ficha({ i }: { i: IdeaCard }) {
  const f = i.ficha;
  const rows: [string, React.ReactNode][] = [
    ["Objetivo", i.objective ? OBJ[i.objective] ?? i.objective : null],
    ["Público / insight", f.audience_insight],
    ["Gancho", i.hook],
    ["Idea central", f.core_message],
    ["Formato", FMT[i.format] ?? i.format],
    ["Estructura / escenas", f.structure.length ? <ol className="ops-ficha-ol">{f.structure.map((s, k) => <li key={k}>{[s.title, s.text].filter(Boolean).join(": ")}</li>)}</ol> : null],
    ["CTA", f.cta || "No corresponde"],
    ["Cómo se produce", [f.production.how, f.production.tools && f.production.tools.length ? `(${f.production.tools.join(", ")})` : null, f.production.material ? `· material: ${f.production.material}` : null, i.lane === "pc" ? "· carril: PC con Claude" : "· carril: VPS"].filter(Boolean).join(" ")],
    ["Recurso asociado", f.resource_id ? `Sí${f.keyword ? ` · palabra clave «${f.keyword}»` : ""}` : "No corresponde"],
    ["Costo / esfuerzo", [i.effort ? i.effort[0].toUpperCase() + i.effort.slice(1) : null, f.cost_note].filter(Boolean).join(" · ")],
    ["Riesgos", f.risks],
    ["Métrica principal", i.primary_metric ? MET[i.primary_metric] ?? i.primary_metric : null],
  ];
  return (
    <div className="ops-ficha">
      <dl className="ops-detail">{rows.map(([k, v], n) => (<div key={k} className="ops-ficha-row"><dt>{n + 1}. {k}</dt><dd>{v || <span className="ops-ficha-miss">falta</span>}</dd></div>))}</dl>
      {f.why ? (<><h4>Por qué ahora (respaldo)</h4><p className="ops-why">{f.why}</p></>) : null}
      {f.competitor_ref ? <p className="ops-foot">Patrón de referencia: {f.competitor_ref} (inspiración, nunca copia).</p> : null}
      {f.evidence.length ? (<><h4>Fuentes</h4><ul className="ops-src">{f.evidence.map((e) => <li key={e.type + e.id}>{e.url ? <a href={e.url} target="_blank" rel="noreferrer noopener">{e.note || e.url}</a> : <span>{e.note || e.type}</span>}</li>)}</ul></>) : null}
    </div>
  );
}

function IdeaItem({ i, weeks }: { i: IdeaCard; weeks: string[] }) {
  const { pending, run } = useRunner();
  const [mode, setMode] = useState<null | "change" | "discard" | "move">(null);
  const [text, setText] = useState("");
  const [chips, setChips] = useState<string[]>([]);
  const [week, setWeek] = useState(i.week_start);
  const st = ST[i.status] ?? { label: i.status, tone: "atencion" };
  const act = async (decision: "approve" | "change" | "discard" | "move") => {
    const r = await run({ action: "idea_decide", idea_id: i.id, decision, text: decision === "change" ? text : undefined, reason: decision === "discard" ? text || undefined : undefined, chips: decision === "discard" ? chips : undefined, week_start: decision === "move" ? week : undefined });
    if (r?.ok) { setMode(null); setText(""); setChips([]); }
  };
  const open = i.status === "proposed" || i.status === "changed" || i.status === "approved";
  return (
    <article className="ops-ap ops-idea" data-kind="idea" data-status={i.status} data-testid={`idea-${i.id}`}>
      <div className="ops-ap-sum ops-idea-h">
        <span className="ops-row-main">
          <span className="ops-row-head"><span className="ops-row-title">{i.title}</span></span>
          <span className="ops-row-sub">{[i.channel_label, FMT[i.format] ?? i.format, i.effort ? `esfuerzo ${i.effort}` : null, i.primary_metric ? `mide: ${MET[i.primary_metric] ?? i.primary_metric}` : null, i.origin === "christian" ? "tu idea" : null].filter(Boolean).join(" · ")}</span>
        </span>
        <span className="ops-idea-pills">
          <span className={`ops-pill ops-pill-${st.tone}`}>{st.label}</span>
          {i.deadline ? <span className={`ops-pill ops-pill-${DL[i.deadline.state]}`} title={`Quedan ${i.deadline.left} días hábiles hasta el viernes ${i.deadline.closing}; necesita ${i.deadline.need}`}>{i.deadline.label}</span> : null}
        </span>
      </div>
      <div className="ops-ap-body">
        {i.objective ? <p className="ops-idea-line"><strong>Objetivo:</strong> {OBJ[i.objective] ?? i.objective}</p> : null}
        {i.hook ? <p className="ops-idea-line"><strong>Gancho:</strong> «{i.hook}»</p> : null}
        {i.status === "changed" && i.change_request ? <p className="ops-foot">Pediste: «{i.change_request}». Hermes la reescribe y vuelve a mostrártela.</p> : null}
        {i.origin === "christian" && !i.ficha_complete ? <p className="ops-foot">Hermes completará la ficha de tu idea y te la mostrará para que la ajustes.</p> : null}
        <details className="ops-more-box"><summary>Ver ficha completa{i.score != null ? ` · puntaje ${i.score}` : ""}</summary><Ficha i={i} /></details>
        {open ? (
          mode === "change" ? (
            <div className="ops-reject">
              <textarea className="ops-textarea" rows={3} maxLength={1000} placeholder="Qué cambiar: «otro ángulo», «hazla más corta», «para dueños de clínicas»…" aria-label="Qué cambiar" value={text} onChange={(e) => setText(e.target.value)} />
              <div className="ops-btns"><button type="button" className="ops-btn ops-btn-primary" disabled={pending || text.trim().length < 5} onClick={() => act("change")}>{pending ? "Enviando…" : "Pedir el cambio"}</button><button type="button" className="ops-btn" disabled={pending} onClick={() => setMode(null)}>Cancelar</button></div>
            </div>
          ) : mode === "discard" ? (
            <div className="ops-reject">
              <div className="ops-chips" role="group" aria-label="Motivo">{CHIPS.map((c) => <button key={c} type="button" className={chips.includes(c) ? "ops-chip ops-chip-on" : "ops-chip"} onClick={() => setChips(chips.includes(c) ? chips.filter((x) => x !== c) : [...chips, c])}>{c}</button>)}</div>
              <input className="ops-input" type="text" maxLength={300} placeholder="Motivo (opcional)" aria-label="Motivo del descarte" value={text} onChange={(e) => setText(e.target.value)} />
              <div className="ops-btns"><button type="button" className="ops-btn ops-btn-danger" disabled={pending} onClick={() => act("discard")}>{pending ? "Descartando…" : "Sí, descartar"}</button><button type="button" className="ops-btn" disabled={pending} onClick={() => setMode(null)}>Cancelar</button></div>
            </div>
          ) : mode === "move" ? (
            <div className="ops-reject">
              <select className="ops-select" aria-label="Semana" value={week} onChange={(e) => setWeek(e.target.value)}>{weeks.map((w) => <option key={w} value={w}>Semana del {weekLabel(w)}</option>)}</select>
              <div className="ops-btns"><button type="button" className="ops-btn ops-btn-primary" disabled={pending || week === i.week_start} onClick={() => act("move")}>{pending ? "Moviendo…" : "Mover"}</button><button type="button" className="ops-btn" disabled={pending} onClick={() => setMode(null)}>Cancelar</button></div>
            </div>
          ) : (
            <div className="ops-btns">
              {i.status === "proposed" ? <button type="button" className="ops-btn ops-btn-primary" disabled={pending} onClick={() => act("approve")}>{pending ? "Aprobando…" : "Aprobar"}</button> : null}
              {i.status !== "approved" ? <button type="button" className="ops-btn" disabled={pending} onClick={() => { setText(""); setMode("change"); }}>Cambiar</button> : null}
              <button type="button" className="ops-btn" disabled={pending} onClick={() => { setText(""); setMode("discard"); }}>Descartar</button>
              <button type="button" className="ops-btn" disabled={pending} onClick={() => setMode("move")}>Mover de semana</button>
            </div>
          )
        ) : null}
      </div>
    </article>
  );
}

function MyIdea({ next, weeks }: { next: string; weeks: string[] }) {
  const { pending, run } = useRunner();
  const [title, setTitle] = useState("");
  const [channel, setChannel] = useState("instagram");
  const [format, setFormat] = useState("carrusel");
  const [text, setText] = useState("");
  const [week, setWeek] = useState(next);
  const send = async () => {
    const r = await run({ action: "idea_mine", title, channel, format, text: text || undefined, week_start: week });
    if (r?.ok) { setTitle(""); setText(""); }
  };
  return (
    <section className="ops-card" aria-labelledby="ops-mine">
      <header className="ops-card-h"><h2 id="ops-mine">Mi idea</h2></header>
      <p className="ops-foot">Tu idea nace aprobada. Hermes completa su ficha (público, estructura, cómo se produce, métrica…) y te la muestra para que la ajustes.</p>
      <div className="ops-form">
        <input className="ops-input" type="text" maxLength={200} placeholder="Tu idea en una frase" aria-label="Tu idea en una frase" value={title} onChange={(e) => setTitle(e.target.value)} />
        <div className="ops-form-row">
          <select className="ops-select" aria-label="Red" value={channel} onChange={(e) => { setChannel(e.target.value); if (e.target.value !== "instagram" && ["carrusel", "historia", "reel"].includes(format)) setFormat("texto"); }}>
            <option value="instagram">Instagram</option><option value="linkedin_page">LinkedIn · página</option><option value="linkedin_profile">LinkedIn · personal</option>
          </select>
          <select className="ops-select" aria-label="Formato" value={format} onChange={(e) => setFormat(e.target.value)}>
            {(channel === "instagram" ? ["carrusel", "reel", "imagen", "historia"] : ["texto", "imagen", "carrusel"]).map((f) => <option key={f} value={f}>{FMT[f]}</option>)}
          </select>
          <select className="ops-select" aria-label="Semana" value={week} onChange={(e) => setWeek(e.target.value)}>{weeks.map((w) => <option key={w} value={w}>Semana del {weekLabel(w)}</option>)}</select>
        </div>
        <textarea className="ops-textarea" rows={2} maxLength={400} placeholder="Detalle o gancho (opcional)" aria-label="Detalle (opcional)" value={text} onChange={(e) => setText(e.target.value)} />
        <div className="ops-btns"><button type="button" className="ops-btn ops-btn-primary" disabled={pending || title.trim().length < 5} onClick={send}>{pending ? "Guardando…" : "Guardar mi idea"}</button></div>
      </div>
    </section>
  );
}

function Week({ w, weeks }: { w: IdeasWeek; weeks: string[] }) {
  const total = w.channels.reduce((a, c) => a + c.ideas.length + c.folded.length, 0);
  return (
    <section className="ops-card" aria-labelledby={`ops-w-${w.week_start}`}>
      <header className="ops-card-h">
        <h2 id={`ops-w-${w.week_start}`}>Semana del {weekLabel(w.week_start)}{w.is_next ? " · próxima" : ""}</h2>
        <span className="ops-note">{w.counts.proposed} por decidir · {w.counts.approved} aprobadas</span>
      </header>
      {w.batch_at ? <p className="ops-foot">Propuesta de Hermes del {fmtCl(w.batch_at)}.</p> : null}
      {total === 0 ? <p className="ops-empty">Sin ideas vivas para esta semana.</p> : null}
      {w.channels.map((c) => (c.ideas.length || c.folded.length ? (
        <div key={c.channel} className="ops-idea-ch">
          <h3>{c.label}</h3>
          <div className="ops-ap-list">{c.ideas.map((i) => <IdeaItem key={i.id} i={i} weeks={weeks} />)}</div>
          {c.folded.length ? (<details className="ops-more-box"><summary>Ver {c.folded.length} {c.folded.length === 1 ? "idea más débil" : "ideas más débiles"}</summary><div className="ops-ap-list">{c.folded.map((i) => <IdeaItem key={i.id} i={i} weeks={weeks} />)}</div></details>) : null}
        </div>
      ) : null))}
      {w.discarded_weak ? (
        <details className="ops-more-box" data-testid="weak">
          <summary>{w.discarded_weak} {w.discarded_weak === 1 ? "idea descartada" : "ideas descartadas"} por débiles</summary>
          <ul className="ops-list ops-signals">{w.weak.map((x, k) => <li key={k}><span className="ops-row-title">{x.title}</span><span className="ops-row-sub">{x.reasons.join(" · ")}</span></li>)}</ul>
        </details>
      ) : null}
    </section>
  );
}

export function IdeasBoard({ data }: { data: IdeasView }) {
  const weeks = nextMondays(data.next_week, 4);
  return (
    <>
      {data.weeks.length ? data.weeks.map((w) => <Week key={w.week_start} w={w} weeks={weeks} />) : (
        <section className="ops-card"><p className="ops-empty">Todavía no hay propuesta. Hermes la entrega los lunes a las 07:30 con su ficha completa; aquí podrás aprobar, pedir cambios o descartar cada idea.</p></section>
      )}
      <MyIdea next={data.next_week} weeks={weeks} />
    </>
  );
}
