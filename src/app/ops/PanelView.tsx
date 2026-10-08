import { getPanel } from "@/lib/ops/data";
import type { Panel, PieceRow, Prospect, Status } from "@/lib/ops/types";
import { Freshness } from "./Client";
import { logout } from "./actions";

const STATUS_LABEL: Record<Status, string> = { ok: "Todo OK", atencion: "Atención", fallo: "Fallo" };
const BAND_LABEL: Record<string, string> = { alta: "Prioridad alta", valida: "Válida", pendiente: "Pendiente" };

function Pill({ status, children }: { status: Status; children: React.ReactNode }) {
  return <span className={`ops-pill ops-pill-${status}`}>{children}</span>;
}

function Stat({ n, label, tone }: { n: number | string; label: string; tone?: "hi" }) {
  return (
    <div className={tone === "hi" ? "ops-stat ops-stat-hi" : "ops-stat"}>
      <strong>{n}</strong>
      <span>{label}</span>
    </div>
  );
}

function Section({ id, title, aside, children }: { id: string; title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="ops-card" aria-labelledby={id}>
      <header className="ops-card-h">
        <h2 id={id}>{title}</h2>
        {aside}
      </header>
      {children}
    </section>
  );
}

function ProspectRow({ p }: { p: Prospect }) {
  const meta = [p.industry, p.city].filter(Boolean).join(" · ");
  return (
    <li>
      <details className="ops-row">
        <summary>
          <span className="ops-row-main">
            <span className="ops-row-head">
              <span className="ops-row-title">{p.short}</span>
              {p.is_new ? <span className="ops-tag">nuevo</span> : null}
            </span>
            <span className="ops-row-sub ops-ellipsis">{[p.short !== p.company ? p.company : null, meta].filter(Boolean).join(" · ")}</span>
          </span>
          <span className={`ops-score ops-score-${p.band ?? "pendiente"}`} title={BAND_LABEL[p.band ?? ""] ?? ""}>{p.score ?? "–"}</span>
        </summary>
        <dl className="ops-detail">
          {p.angle ? (<><dt>Ángulo</dt><dd>{p.angle}</dd></>) : null}
          {p.quote ? (<><dt>Hecho observado</dt><dd>«{p.quote}»</dd></>) : null}
          <dt>Estado</dt>
          <dd>Investigado · {BAND_LABEL[p.band ?? ""] ?? "sin banda"} · hace {p.days === 0 ? "menos de 1 d" : `${p.days} d`}{p.domain ? ` · ${p.domain}` : ""}</dd>
        </dl>
      </details>
    </li>
  );
}

function metricText(m: NonNullable<PieceRow["metrics"]>[number]): string {
  const parts = [m.likes != null ? `${m.likes} me gusta` : null, m.comments != null ? `${m.comments} comentarios` : null, m.shares != null ? `${m.shares} compartidos` : null].filter(Boolean);
  return `${m.window}: ${parts.length ? parts.join(" · ") : "sin cifras de GHL"}${m.partial ? " (parcial)" : ""}`;
}

const GHL_PLANNER_URL = "https://app.gohighlevel.com/v2/location/pxHuOsiz2i3lM6BtC9IM/marketing/social-planner";

function slideLines(s: NonNullable<PieceRow["preview"]>["slides"][number]): string {
  return [s.body, ...s.items, ...s.compare, s.figure].filter(Boolean).join(" · ");
}

function Preview({ pv, kind }: { pv: NonNullable<PieceRow["preview"]>; kind: "review" | "scheduled" }) {
  const copy = [pv.hook, pv.body, pv.cta, pv.hashtags.join(" ")].filter(Boolean).join("\n\n");
  return (
    <div className="ops-preview">
      {pv.media.length ? (
        <ul className="ops-slides" aria-label="Slides del carrusel">
          {pv.media.map((u, i) => (
            <li key={u}>
              <a href={u} target="_blank" rel="noreferrer noopener" aria-label={`Abrir slide ${i + 1} en grande`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u} alt={`Slide ${i + 1}: ${pv.slides[i]?.title ?? ""}`} loading="lazy" width={160} height={200} />
              </a>
            </li>
          ))}
        </ul>
      ) : pv.slides.length ? (
        <ol className="ops-slide-text">
          {pv.slides.map((s, i) => (<li key={i}><strong>{s.title}</strong>{slideLines(s) ? <span> — {slideLines(s)}</span> : null}</li>))}
        </ol>
      ) : null}
      {copy ? (<><h4>Texto del post</h4><p className="ops-copy">{copy}</p></>) : null}
      {pv.rationale ? (<><h4>Por qué se eligió</h4><p className="ops-why">{pv.rationale}</p></>) : null}
      {pv.sources.length ? (<><h4>Fuentes</h4><ul className="ops-src">{pv.sources.map((s) => (<li key={s.url}><a href={s.url} target="_blank" rel="noreferrer noopener">{s.title}</a></li>))}</ul></>) : null}
      <p className="ops-foot">
        {kind === "review"
          ? `Para aprobar o rechazar: abre el post «In Review» en Social Planner${pv.proposed_label ? ` (fecha propuesta ${pv.proposed_label})` : ""}. Nada se publica sin tu aprobación. `
          : `Programada${pv.proposed_label ? ` para ${pv.proposed_label}` : ""}. `}
        <a href={GHL_PLANNER_URL} target="_blank" rel="noreferrer noopener">Abrir Social Planner</a>
      </p>
    </div>
  );
}

function PieceItem({ p, kind }: { p: PieceRow; kind: "review" | "scheduled" | "published" }) {
  const when = p.at_label ? (kind === "published" ? `publicada ${p.at_label}` : `sale ${p.at_label}`) : null;
  const pv = kind === "published" ? null : p.preview ?? null;
  const fmt = pv?.format ?? p.format;
  return (
    <li>
      <details className="ops-row" open={kind === "review"}>
        <summary>
          <span className="ops-row-main">
            <span className="ops-row-title">{p.title}</span>
            <span className="ops-row-sub">{[p.channel, fmt, when].filter(Boolean).join(" · ")}</span>
          </span>
          {p.score != null ? <span className="ops-score ops-score-neutral" title="Score del Content Engine">{p.score}</span> : null}
        </summary>
        {pv ? <Preview pv={pv} kind={kind === "review" ? "review" : "scheduled"} /> : null}
        <dl className="ops-detail">
          {!pv && p.hook ? (<><dt>Gancho</dt><dd>{p.hook}</dd></>) : null}
          {!pv && (p.format || p.category) ? (<><dt>Pieza</dt><dd>{[p.category, p.format].filter(Boolean).join(" · ")}</dd></>) : null}
          {kind === "published" ? (<><dt>Métricas</dt><dd>{p.metrics && p.metrics.length ? p.metrics.map(metricText).join(" — ") : "Aún sin snapshots (24 h, 72 h y 7 d)."}</dd></>) : null}
        </dl>
      </details>
    </li>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="ops-empty">{children}</p>;
}

function Body({ panel, fetchedAt, stale }: { panel: Panel; fetchedAt: number; stale: boolean }) {
  const pr = panel.prospecting;
  const li = panel.linkedin;
  const ct = panel.content;
  const sys = panel.system;
  const bad = sys.components.filter((c) => c.status !== "ok");
  const shown = pr.latest.slice(0, 6);
  const rest = pr.latest.slice(6);
  return (
    <>
      <div className="ops-top">
        <div>
          <p className="ops-eyebrow">Atacama OS · {panel.date_label}</p>
          <h1>Panel de operación</h1>
        </div>
        <div className="ops-top-r">
          <Freshness fetchedAt={fetchedAt} stale={stale} />
          <form action={logout}><button className="ops-link" type="submit">Salir</button></form>
        </div>
      </div>

      <Section id="ops-att" title="Necesita tu atención" aside={panel.attention_total ? <span className="ops-count">{panel.attention_total}</span> : <Pill status="ok">Al día</Pill>}>
        {panel.attention.length === 0 ? (
          <Empty>Nada requiere tu acción ahora: sin respuestas por atender, seguimientos vencidos ni contenido esperando aprobación.</Empty>
        ) : (
          <ul className="ops-att">
            {panel.attention.map((g) => (
              <li key={g.key} className={`ops-att-${g.tone}`}>
                <div className="ops-att-h"><strong>{g.title}</strong><span className="ops-count">{g.count}</span></div>
                <ul>{g.items.map((it) => <li key={it}>{it}</li>)}{g.more ? <li className="ops-more">y {g.more} más</li> : null}</ul>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section id="ops-pro" title="Prospección" aside={<span className="ops-note">{pr.last_run ? `Última corrida ${pr.last_run.label}` : "Sin corridas aún"}</span>}>
        <div className="ops-stats">
          <Stat n={pr.backlog} label="en Investigado" />
          <Stat n={pr.new_since_run} label="nuevos de la última corrida" />
          <Stat n={pr.backlog_alta} label="prioridad alta" tone="hi" />
          <Stat n={pr.contacted} label="contactados" />
        </div>
        {shown.length ? (
          <ul className="ops-list">{shown.map((p) => <ProspectRow key={p.company} p={p} />)}</ul>
        ) : (
          <Empty>No hay prospectos en Investigado.</Empty>
        )}
        {rest.length ? (
          <details className="ops-more-box">
            <summary>Ver {rest.length} más</summary>
            <ul className="ops-list">{rest.map((p) => <ProspectRow key={p.company} p={p} />)}</ul>
          </details>
        ) : null}
        <p className="ops-foot">Todo queda en Investigado para tu decisión: el sistema no contacta a nadie por su cuenta.{pr.overdue_review_tasks ? ` Hay ${pr.overdue_review_tasks} tareas «Revisar prospecto» vencidas.` : ""}</p>
      </Section>

      <Section id="ops-li" title="LinkedIn" aside={<span className="ops-note">Waalaxy ejecuta · modo {li.mode === "off" ? "apagado" : li.mode}</span>}>
        <div className="ops-stats ops-stats-6">
          <Stat n={li.counts.pendiente} label="pendiente de aprobación" tone={li.counts.pendiente ? "hi" : undefined} />
          <Stat n={li.counts.en_campana + li.counts.conexion} label="conexión" />
          <Stat n={li.counts.mensaje} label="mensaje" />
          <Stat n={li.counts.followup} label="follow-up" />
          <Stat n={li.counts.respondio} label="respondió" tone={li.counts.respondio ? "hi" : undefined} />
          <Stat n={li.counts.error} label="error" />
        </div>
        {li.rows.length ? (
          <ul className="ops-list">
            {li.rows.map((r) => (
              <li key={r.company}>
                <details className="ops-row">
                  <summary>
                    <span className="ops-row-main">
                      <span className="ops-row-head"><span className="ops-row-title">{r.short}</span></span>
                      <span className="ops-row-sub ops-ellipsis">{[r.person, r.role].filter(Boolean).join(" · ") || r.company}</span>
                    </span>
                    <span className={r.state === "error" ? "ops-pill ops-pill-fallo" : r.state === "respondio" ? "ops-pill ops-pill-ok" : "ops-pill ops-pill-atencion"}>{r.state_label ?? "—"}</span>
                  </summary>
                  <dl className="ops-detail">
                    {r.next_action ? (<><dt>Próxima acción</dt><dd>{r.next_action}</dd></>) : null}
                    {r.reply ? (<><dt>Respuesta</dt><dd>«{r.reply}»</dd></>) : null}
                    <dt>Empresa</dt><dd>{r.company}{r.score != null ? ` · score ${r.score}` : ""}</dd>
                  </dl>
                </details>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>Nadie en LinkedIn todavía. {li.ready ? `${li.ready} listo${li.ready === 1 ? "" : "s"} para recomendar.` : "Para usar el canal hace falta una persona con nombre, cargo y perfil verificable."}</Empty>
        )}
        <p className="ops-foot">{li.note}</p>
      </Section>

      <Section id="ops-con" title="Contenido" aside={<span className="ops-note">Nada se publica sin tu aprobación</span>}>
        <div className="ops-stats ops-stats-6">
          {ct.queue ? <Stat n={`${ct.queue.pending}/${ct.queue.max}`} label={ct.queue.full ? "cola llena" : "cola de revisión"} tone={ct.queue.full ? "hi" : undefined} /> : null}
          <Stat n={ct.signals_count} label="señales sin pieza" />
          <Stat n={ct.in_review.length} label="por aprobar" tone={ct.in_review.length ? "hi" : undefined} />
          <Stat n={ct.scheduled.length} label="programadas" />
          <Stat n={ct.published.length} label="publicadas" />
        </div>
        {ct.queue?.full ? <p className="ops-alert-line">La cola está llena: el sistema sigue recolectando señales pero no propone piezas hasta que apruebes o rechaces.</p> : null}
        {ct.failed.length ? <p className="ops-alert-line">Publicación con problema: {ct.failed.join(" · ")}</p> : null}
        {ct.in_review.length ? (<><h3>Por aprobar</h3><ul className="ops-list">{ct.in_review.map((p) => <PieceItem key={p.id} p={p} kind="review" />)}</ul></>) : null}
        {ct.scheduled.length ? (<><h3>Programadas</h3><ul className="ops-list">{ct.scheduled.map((p) => <PieceItem key={p.id} p={p} kind="scheduled" />)}</ul></>) : null}
        {ct.published.length ? (<><h3>Publicadas y métricas</h3><ul className="ops-list">{ct.published.map((p) => <PieceItem key={p.id} p={p} kind="published" />)}</ul></>) : null}
        {ct.signals.length ? (
          <>
            <h3>Señales nuevas</h3>
            <ul className="ops-list ops-signals">
              {ct.signals.slice(0, 5).map((s) => (
                <li key={s.title}><span className="ops-row-title">{s.title}</span><span className="ops-row-sub">{[s.type, `hace ${s.ago}`].filter(Boolean).join(" · ")}</span></li>
              ))}
            </ul>
          </>
        ) : null}
        {ct.rss || ct.intel || ct.resources || ct.founder ? (
          <>
            <h3>Entradas y recursos</h3>
            <ul className="ops-list ops-signals">
              {ct.rss ? (
                <li>
                  <span className="ops-row-title">RSS · {ct.rss.enabled ? `${ct.rss.feeds_ok}/${ct.rss.feeds_total} feeds sanos` : "apagado"}</span>
                  <span className="ops-row-sub">{[`${ct.rss.new_items} artículos nuevos`, ct.rss.last_checked_ago ? `último chequeo hace ${ct.rss.last_checked_ago}` : null, ct.rss.failing.length ? `con fallos: ${ct.rss.failing.map((f) => f.slug).join(", ")}` : null].filter(Boolean).join(" · ")}</span>
                </li>
              ) : null}
              {ct.intel ? (
                <li>
                  <span className="ops-row-title">Inteligencia orgánica · {ct.intel.report_ago ? `hace ${ct.intel.report_ago}` : "aún sin corridas"}</span>
                  <span className="ops-row-sub">{ct.intel.report_ago ? [ct.intel.competitors.length ? `referentes: ${ct.intel.competitors.join(", ")}` : null, ct.intel.gaps.length ? `huecos: ${ct.intel.gaps.slice(0, 2).join(" · ")}` : null].filter(Boolean).join(" · ") : "Se revisan fuentes públicas una vez por semana"}</span>
                </li>
              ) : null}
              {ct.resources ? (
                <li>
                  <span className="ops-row-title">Recursos activos · {ct.resources.active}</span>
                  <span className="ops-row-sub">{ct.resources.rows.length ? ct.resources.rows.map((r) => `${r.name} (${r.uses} ${r.uses === 1 ? "uso" : "usos"})`).join(" · ") : "Ninguno todavía"}</span>
                </li>
              ) : null}
              {ct.founder ? (
                <li>
                  <span className="ops-row-title">Founder Interview · {ct.founder.pending_answer ? "esperando tu respuesta" : ct.founder.answered_without_pieces ? "respondida, falta la pieza" : "al día"}</span>
                  <span className="ops-row-sub">{ct.founder.last ? `Última: ${ct.founder.last.question} · hace ${ct.founder.last.ago}` : "Pídele a Hermes «entrevístame» cuando tengas una historia real"}</span>
                </li>
              ) : null}
            </ul>
          </>
        ) : null}
        {!ct.in_review.length && !ct.scheduled.length && !ct.published.length && !ct.signals.length ? <Empty>Sin movimiento de contenido.</Empty> : null}
      </Section>

      <Section id="ops-sys" title="Sistema" aside={<Pill status={sys.overall}>{STATUS_LABEL[sys.overall]}</Pill>}>
        {bad.length ? (
          <ul className="ops-sys-bad">
            {bad.map((c) => (<li key={c.name}><Pill status={c.status}>{c.status === "fallo" ? "Fallo" : "Atención"}</Pill> <strong>{c.name}</strong> <span>{c.reason}</span></li>))}
          </ul>
        ) : null}
        <ul className="ops-sys">
          {sys.components.filter((c) => c.status === "ok").map((c) => (<li key={c.name}><i className="ops-dot ops-dot-ok" aria-hidden />{c.name}</li>))}
        </ul>
        <p className="ops-foot">
          Envío real de correos: <strong>{sys.outreach_mode === "off" ? "apagado" : sys.outreach_mode}</strong> · {sys.approved_pending} aprobados esperando · {sys.drafts} borradores
          {!sys.hermes_known ? " · estado de Hermes aún no informado" : ""}
        </p>
        {sys.errors24h.length ? (
          <details className="ops-more-box">
            <summary>{sys.errors24h.reduce((a, e) => a + e.count, 0)} ejecuciones fallidas en 24 h</summary>
            <p className="ops-foot">{sys.errors24h.map((e) => `${e.name} (${e.count})`).join(" · ")}</p>
          </details>
        ) : null}
      </Section>
    </>
  );
}

export async function PanelView() {
  const r = await getPanel();
  if (!r.ok) {
    const msg = r.reason === "not_configured"
      ? "Falta configurar la conexión con Atacama OS en el servidor (N8N_BASE_URL y ATACAMA_INGEST_KEY)."
      : r.reason === "unreachable"
        ? "No pude conectar con Atacama OS (n8n no responde). Reintenta en un minuto."
        : "Atacama OS respondió algo inesperado. Reintenta en un minuto.";
    return (<Section id="ops-err" title="Sin datos"><Empty>{msg}</Empty></Section>);
  }
  return <Body panel={r.panel} fetchedAt={r.fetchedAt} stale={r.stale} />;
}

export function PanelSkeleton() {
  return (
    <div aria-busy="true" aria-label="Cargando">
      <div className="ops-top"><div><p className="ops-eyebrow">Atacama OS</p><h1>Panel de operación</h1></div></div>
      {[0, 1, 2].map((i) => (<div key={i} className="ops-card ops-skel"><div /><div /><div /></div>))}
    </div>
  );
}
