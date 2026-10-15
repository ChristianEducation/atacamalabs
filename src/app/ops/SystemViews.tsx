import Link from "next/link";
import type { HistoryData, IdeasView, LibraryIndex, Panel, WeekData } from "@/lib/ops/types";
import type { V3Result } from "@/lib/ops/v3-data";
import { Empty, Head, Pill, Section, Stat } from "./Blocks";
import { fmtCl } from "./Parts";
import { CopyLink, RitualEditor } from "./SystemClient";
import LIBRARY from "@/lib/ops/library-index.json";

/**
 * Atacama OS v3 · Fase 7 (spec §8.4–8.7): Historial · Alertas · Costos (Sistema), Biblioteca (Redes) y «Mi semana» (Hoy).
 * Todo de solo lectura salvo el ritual de la semana (acción auditada week_ritual_set).
 */
const SEC: Record<string, string> = { correo: "Correo", prospeccion: "Prospección", redes: "Redes", sistema: "Sistema" };
const SEV: Record<string, string> = { critical: "Crítica", high: "Importante", info: "Aviso" };
const dayLabel = (d: string) => new Date(d + "T12:00:00Z").toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

function Unavailable({ what }: { what: string }) {
  return <Section id="ops-na" title="Sin datos"><Empty>No pude leer {what} (n8n no responde o aún no tiene esta vista). Reintenta en un minuto.</Empty></Section>;
}

function FilterLinks({ name, values, cur, base, label }: { name: string; values: string[]; cur: string | null; base: Record<string, string | null>; label: (v: string) => string }) {
  const href = (v: string | null) => {
    const q = new URLSearchParams({ view: "historial" });
    for (const [k, val] of Object.entries({ ...base, [name]: v })) if (val) q.set(k, val);
    return "/ops?" + q.toString();
  };
  return (
    <nav className="ops-chips" aria-label={`Filtrar por ${name}`}>
      <Link href={href(null)} scroll={false} className={!cur ? "ops-chip ops-chip-on" : "ops-chip"}>Todos</Link>
      {values.map((v) => <Link key={v} href={href(v)} scroll={false} className={cur === v ? "ops-chip ops-chip-on" : "ops-chip"}>{label(v)}</Link>)}
    </nav>
  );
}

export async function HistoryView({ hP, fetchedAt, stale, actor, sec, dia }: { hP: Promise<V3Result<HistoryData>>; fetchedAt: number; stale: boolean; actor: string | null; sec: string | null; dia: string | null }) {
  const r = await hP;
  if (!r.ok) return (<><Head title="Historial" sub="Qué hizo cada uno, en español" fetchedAt={fetchedAt} stale={stale} /><Unavailable what="el historial" /></>);
  const h = r.value.history;
  const lines = h.lines.filter((l) => (!actor || l.actor === actor) && (!sec || l.section === sec) && (!dia || l.day === dia));
  const byDay = new Map<string, typeof lines>();
  for (const l of lines) byDay.set(l.day, [...(byDay.get(l.day) ?? []), l]);
  const base = { actor, sec, dia };
  return (
    <>
      <Head title="Historial" sub={`Qué hizo cada uno (Christian, Hermes, el motor) · últimos ${h.retention_days} días`} fetchedAt={Date.parse(h.generated_at) || fetchedAt} stale={stale} />
      <Section id="ops-hist-f" title="Filtros">
        <FilterLinks name="actor" values={h.actors} cur={actor} base={base} label={(v) => v} />
        <FilterLinks name="sec" values={h.sections} cur={sec} base={base} label={(v) => SEC[v] ?? v} />
        <FilterLinks name="dia" values={h.days.slice(0, 14)} cur={dia} base={base} label={(v) => new Date(v + "T12:00:00Z").toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })} />
      </Section>
      {lines.length ? [...byDay.entries()].map(([day, ls]) => (
        <Section key={day} id={`ops-h-${day}`} title={dayLabel(day)}>
          <ul className="ops-list ops-signals" data-testid="history-lines">
            {ls.map((l, i) => (
              <li key={i}>
                <span className="ops-row-title">{l.href ? <Link href={l.href}>{l.text}</Link> : l.text}</span>
                {l.who.length ? <span className="ops-row-sub">{l.who.join(" · ")}{l.count > l.who.length ? " …" : ""}</span> : null}
              </li>
            ))}
          </ul>
        </Section>
      )) : <Section id="ops-h-empty" title="Sin movimientos"><Empty>No hay movimientos con estos filtros.</Empty></Section>}
      <p className="ops-foot">Lo que el motor hizo antes del 14-oct sin dejar registro (por ejemplo la cancelación del 13-oct, ya restaurada) no aparece completo: desde ahora quedan las alertas de huella y la marca «devuelto por el motor».</p>
    </>
  );
}

export async function AlertsView({ hP, fetchedAt, stale }: { hP: Promise<V3Result<HistoryData>>; fetchedAt: number; stale: boolean }) {
  const r = await hP;
  const al = r.ok ? r.value.alerts_open : null;
  return (
    <>
      <Head title="Alertas" sub="Lo que el sistema vigila cada 15 minutos" fetchedAt={fetchedAt} stale={stale} />
      {!al ? <Unavailable what="las alertas" /> : (
        <Section id="ops-al" title={`Abiertas (${al.length})`} aside={al.some((a) => a.severity === "critical") ? <Pill status="fallo">Hay críticas</Pill> : <Pill status="ok">Sin críticas</Pill>}>
          {al.length ? (
            <ul className="ops-list ops-signals" data-testid="alerts-open">
              {al.map((a) => (
                <li key={a.key}>
                  <span className="ops-row-title"><span className={`ops-pill ops-pill-${a.severity === "critical" ? "fallo" : a.severity === "high" ? "atencion" : "ok"}`}>{SEV[a.severity] ?? a.severity}</span> {a.title}</span>
                  <span className="ops-row-sub">{a.detail}{a.detail ? " · " : ""}desde {fmtCl(a.since)}{a.panel_only ? " · solo panel" : ""}</span>
                </li>
              ))}
            </ul>
          ) : <Empty>No hay alertas abiertas.</Empty>}
          <p className="ops-foot">Las críticas llegan a Telegram al momento; las importantes también se avisan por Telegram; los avisos informativos solo se ven aquí. Se cierran solas cuando el problema se resuelve.</p>
        </Section>
      )}
    </>
  );
}

export async function CostsView({ wP, fetchedAt, stale }: { wP: Promise<V3Result<WeekData>>; fetchedAt: number; stale: boolean }) {
  const r = await wP;
  const c = r.ok ? r.value.costs : null;
  return (
    <>
      <Head title="Costos" sub="Créditos de Higgsfield y gasto por pieza" fetchedAt={fetchedAt} stale={stale} />
      {!c ? <Unavailable what="los costos" /> : (
        <>
          <Section id="ops-cost-h" title="Higgsfield" aside={c.higgs?.at ? <span className="ops-note">leído {fmtCl(c.higgs.at)}</span> : undefined}>
            {c.higgs ? (
              <div className="ops-stats">
                <Stat n={c.higgs.balance ?? "—"} label="saldo de la cuenta" />
                <Stat n={`${c.higgs.spent_week} / ${c.higgs.cap}`} label="gastado por Atacama OS esta semana" tone={c.higgs.spent_week > 150 ? "hi" : undefined} />
                <Stat n={c.higgs.reserve} label="reserva que no se toca" />
              </div>
            ) : <Empty>Aún sin lectura: Hermes la informa en su próximo reporte (cada 15 min, como mucho una consulta por hora).</Empty>}
            <p className="ops-foot">{c.note}</p>
          </Section>
          <Section id="ops-cost-p" title={`Por pieza (${c.total_pieces} créditos en total)`}>
            {c.pieces.length ? <ul className="ops-list ops-signals">{c.pieces.map((p) => <li key={p.id}><span className="ops-row-title"><Link href={`/ops?view=taller&pieza=${p.id}`}>{p.topic}</Link></span><span className="ops-row-sub">{p.credits} créditos · {p.status ?? "—"}</span></li>)}</ul> : <Empty>Ninguna pieza ha gastado créditos todavía.</Empty>}
          </Section>
        </>
      )}
    </>
  );
}

export async function LibraryView({ panel, idP, fetchedAt, stale }: { panel: Panel; idP: Promise<V3Result<IdeasView>>; fetchedAt: number; stale: boolean }) {
  const lib = LIBRARY as LibraryIndex;
  const ir = await idP;
  const ideas = ir.ok ? ir.value.weeks.flatMap((w) => w.channels.flatMap((c) => [...c.ideas, ...c.folded])) : [];
  const approved = ideas.filter((i) => i.status === "approved" && i.hook);
  const discarded = ideas.filter((i) => i.status === "discarded" && i.hook);
  const res = panel.content.resources?.rows ?? [];
  return (
    <>
      <Head title="Biblioteca" sub="Kit de marca, recetas, recursos y hooks: una sola fuente" fetchedAt={fetchedAt} stale={stale} />
      <Section id="ops-lib-brand" title="Kit de marca">
        <p className="ops-foot">Tipografía: <strong>{lib.font}</strong></p>
        <div className="ops-palette">{lib.palette.map((p) => <span key={p.hex} className="ops-swatch"><i style={{ background: p.hex }} aria-hidden />{p.name} <span className="ops-mono">{p.hex}</span></span>)}</div>
        <div className="ops-logos" data-testid="library-logos">
          {lib.brand.filter((b) => b.kind !== "otro").map((b) => (
            <a key={b.url} href={b.url} target="_blank" rel="noreferrer noopener" className="ops-logo-tile" title={b.name}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.url} alt={b.name} loading="lazy" />
              <span>{b.name}</span>
            </a>
          ))}
        </div>
        <p className="ops-foot">Poses de la llamita: {lib.mascot.map((m) => m.name).join(" · ") || "—"} (en <span className="ops-mono">brand/content/mascot/</span>).</p>
      </Section>
      <Section id="ops-lib-rec" title={`Recetas (${lib.recipes.length})`}>
        {lib.recipes.length ? lib.recipes.map((r) => (
          <details key={r.slug} className="ops-more-box">
            <summary>{r.title} · {r.prompts.length} prompts aprobados</summary>
            <pre className="ops-diff">{r.receta}</pre>
            {r.prompts.map((p) => <details key={p.name} className="ops-more-box"><summary>{p.name}</summary><pre className="ops-diff">{p.text}</pre></details>)}
          </details>
        )) : <Empty>Aún no hay recetas versionadas.</Empty>}
      </Section>
      <Section id="ops-lib-res" title={`Recursos (${res.length})`}>
        {res.length ? (
          <ul className="ops-list ops-signals">
            {res.map((r) => <li key={r.slug} className="ops-mrow"><span className="ops-row-main"><span className="ops-row-title">{r.name}</span><span className="ops-row-sub">{r.type} · {r.cta_mode} · usado en {r.uses} {r.uses === 1 ? "pieza" : "piezas"}</span></span><CopyLink url={r.url} /></li>)}
          </ul>
        ) : <Empty>Sin recursos activos.</Empty>}
      </Section>
      <Section id="ops-lib-hooks" title="Hooks">
        <h4 className="ops-h4">Aprobados ({approved.length})</h4>
        {approved.length ? <ul className="ops-list ops-signals">{approved.slice(0, 30).map((i) => <li key={i.id}><span className="ops-row-title">{i.hook}</span><span className="ops-row-sub">{i.channel_label} · {i.title}</span></li>)}</ul> : <Empty>Aún sin hooks aprobados en las semanas visibles.</Empty>}
        <h4 className="ops-h4">Descartados ({discarded.length})</h4>
        {discarded.length ? <ul className="ops-list ops-signals">{discarded.slice(0, 30).map((i) => <li key={i.id}><span className="ops-row-title">{i.hook}</span><span className="ops-row-sub">{i.decision_reason ?? "sin razón"}</span></li>)}</ul> : <Empty>Sin descartados.</Empty>}
      </Section>
      <Section id="ops-lib-pub" title="Publicadas y resultados">
        {panel.content.published.length ? <ul className="ops-list ops-signals">{panel.content.published.slice(0, 20).map((p) => <li key={p.id}><span className="ops-row-title">{p.title}</span><span className="ops-row-sub">{p.channel} · {p.at_label ?? ""}{p.metrics?.length ? " · " + p.metrics.map((m) => `${m.window}: ${m.likes ?? 0} me gusta, ${m.comments ?? 0} comentarios`).join(" · ") : " · sin métricas aún"}</span></li>)}</ul> : <Empty>Aún no hay publicaciones.</Empty>}
      </Section>
    </>
  );
}

const LIGHT: Record<string, string> = { verde: "ok", amarillo: "atencion", rojo: "fallo", sin_datos: "ok" };

export async function WeekCard({ wP }: { wP: Promise<V3Result<WeekData>> }) {
  const r = await wP;
  if (!r.ok) return <Section id="mi-semana" title="Mi semana"><Empty>«Mi semana» aún no está disponible (n8n no responde).</Empty></Section>;
  const w = r.value.week;
  const pct = w.progress.total ? Math.round((w.progress.done / w.progress.total) * 100) : 0;
  return (
    <Section id="mi-semana" title="Mi semana" aside={<span className="ops-note">{w.progress.done} de {w.progress.total} · semana del {w.week}</span>}>
      <div className="ops-progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Avance de la semana"><i style={{ width: pct + "%" }} /></div>
      {w.meetings_today.length ? <p className="ops-foot"><strong>Reuniones de hoy:</strong> {w.meetings_today.map((m) => new Date(m.at).toLocaleTimeString("es-CL", { timeZone: "America/Santiago", hour: "2-digit", minute: "2-digit", hour12: false }) + " · " + m.who).join(" — ")}</p> : null}
      <ol className="ops-week" data-testid="week-days">
        {w.days.map((d) => (
          <li key={d.key} className={d.today ? "ops-week-today" : undefined}>
            <strong>{d.label}</strong>
            {d.tasks.length ? (
              <ul>
                {d.tasks.map((t) => (
                  <li key={t.id} className={t.done ? "ops-task-done" : undefined}>
                    <span aria-hidden>{t.done ? "✓" : "○"}</span> {t.href ? <Link href={t.href}>{t.label}</Link> : t.label}
                    {t.id === "cierre" && t.light ? <> <span className={`ops-pill ops-pill-${LIGHT[t.light] ?? "ok"}`}>{t.light === "sin_datos" ? "sin datos" : t.light}</span></> : null}
                    <span className="ops-row-sub"> {t.detail}</span>
                  </li>
                ))}
              </ul>
            ) : <span className="ops-row-sub">Sin ritual este día.</span>}
          </li>
        ))}
      </ol>
      <details className="ops-more-box"><summary>Mover el ritual de un día</summary><RitualEditor ritual={w.ritual} /></details>
    </Section>
  );
}
