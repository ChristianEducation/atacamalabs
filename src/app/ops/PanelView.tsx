import Link from "next/link";
import { getPanel } from "@/lib/ops/data";
import { getOverview } from "@/lib/ops/actions-client";
import type { Overview, Panel, PieceRow, Prospect, Status } from "@/lib/ops/types";
import { Freshness } from "./Client";
import { ApprovalsCenter, ContentApprovalCard, EmailLibrary, LinkedinReadyCard, LinkedinSentRow, type ApprovalFilter } from "./Approvals";
import { GHL_PLANNER_URL, Preview } from "./Parts";
import { Shell } from "./Shell";
import { parseView, type ViewId } from "./views";

const STATUS_LABEL: Record<Status, string> = { ok: "Todo OK", atencion: "Atención", fallo: "Fallo" };
const BAND_LABEL: Record<string, string> = { alta: "Prioridad alta", valida: "Válida", pendiente: "Pendiente" };

function Pill({ status, children }: { status: Status; children: React.ReactNode }) {
  return <span className={`ops-pill ops-pill-${status}`}>{children}</span>;
}

function Stat({ n, label, tone, href }: { n: number | string; label: string; tone?: "hi"; href?: string }) {
  const inner = (<><strong>{n}</strong><span>{label}</span></>);
  const cls = tone === "hi" ? "ops-stat ops-stat-hi" : "ops-stat";
  return href ? <Link href={href} scroll={false} className={`${cls} ops-stat-link`}>{inner}</Link> : <div className={cls}>{inner}</div>;
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

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="ops-empty">{children}</p>;
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

/** Piezas ya programadas o publicadas (solo lectura). Las que esperan decisión usan ContentApprovalCard. */
function PieceItem({ p, kind }: { p: PieceRow; kind: "scheduled" | "published" }) {
  const when = p.at_label ? (kind === "published" ? `publicada ${p.at_label}` : `sale ${p.at_label}`) : null;
  const pv = kind === "published" ? null : p.preview ?? null;
  const fmt = pv?.format ?? p.format;
  return (
    <li>
      <details className="ops-row">
        <summary>
          <span className="ops-row-main">
            <span className="ops-row-title">{p.title}</span>
            <span className="ops-row-sub">{[p.channel, fmt, when].filter(Boolean).join(" · ")}</span>
          </span>
          {p.score != null ? <span className="ops-score ops-score-neutral" title="Score del Content Engine">{p.score}</span> : null}
        </summary>
        {pv ? <Preview pv={pv} foot={<p className="ops-foot">Programada{pv.proposed_label ? ` para ${pv.proposed_label}` : ""}. <a href={GHL_PLANNER_URL} target="_blank" rel="noreferrer noopener">Abrir Social Planner</a></p>} /> : null}
        <dl className="ops-detail">
          {!pv && p.hook ? (<><dt>Gancho</dt><dd>{p.hook}</dd></>) : null}
          {!pv && (p.format || p.category) ? (<><dt>Pieza</dt><dd>{[p.category, p.format].filter(Boolean).join(" · ")}</dd></>) : null}
          {kind === "published" ? (<><dt>Métricas</dt><dd>{p.metrics && p.metrics.length ? p.metrics.map(metricText).join(" — ") : "Aún sin snapshots (24 h, 72 h y 7 d)."}</dd></>) : null}
        </dl>
      </details>
    </li>
  );
}

function Head({ title, sub, fetchedAt, stale }: { title: string; sub?: string; fetchedAt: number; stale: boolean }) {
  return (
    <div className="ops-top">
      <div>
        <p className="ops-eyebrow">Atacama OS</p>
        <h1>{title}</h1>
        {sub ? <p className="ops-sub">{sub}</p> : null}
      </div>
      <div className="ops-top-r"><Freshness fetchedAt={fetchedAt} stale={stale} /></div>
    </div>
  );
}

function OverviewError({ reason }: { reason: string }) {
  const msg = reason === "not_configured" ? "Falta configurar OPS_APPROVAL_KEY en el servidor: las aprobaciones desde /ops todavía no están activas." : reason === "unreachable" ? "No pude conectar con el sistema de aprobaciones (n8n no responde). Reintenta en un minuto." : "El sistema de aprobaciones respondió algo inesperado. Reintenta en un minuto.";
  return <p className="ops-alert-line">{msg}</p>;
}

/* ------------------------------------------------------------------- Inicio */
function Inicio({ panel, fetchedAt, stale }: { panel: Panel; fetchedAt: number; stale: boolean }) {
  const ap = panel.approvals ?? { emails: 0, linkedin: 0, content: 0 };
  const out = panel.outreach;
  const wk = panel.content.weekly;
  const pr = panel.prospecting;
  const sys = panel.system;
  const replies = panel.attention.find((g) => g.key === "replies")?.count ?? 0;
  const total = ap.emails + ap.linkedin + ap.content;
  return (
    <>
      <Head title="Inicio" sub="¿Qué necesita Christian ahora?" fetchedAt={fetchedAt} stale={stale} />

      <Section id="ops-dec" title="Necesita tu decisión" aside={<Link className="ops-note ops-a" href="/ops?view=aprobaciones" scroll={false}>{total ? `Ver las ${total} →` : "Al día"}</Link>}>
        <div className="ops-stats ops-stats-3">
          <Stat n={ap.content} label="publicaciones" tone={ap.content ? "hi" : undefined} href="/ops?view=aprobaciones&filter=contenido" />
          <Stat n={ap.emails} label="correos" tone={ap.emails ? "hi" : undefined} href="/ops?view=aprobaciones&filter=correos" />
          <Stat n={ap.linkedin} label="LinkedIn" tone={ap.linkedin ? "hi" : undefined} href="/ops?view=aprobaciones&filter=linkedin" />
        </div>
        {total === 0 ? <Empty>Nada espera tu decisión ahora.</Empty> : <p className="ops-foot">Cada uno se abre, se edita si hace falta y se aprueba o rechaza aquí mismo.</p>}
      </Section>

      <Section id="ops-pipe" title="Pipeline" aside={<Link className="ops-note ops-a" href="/ops?view=prospeccion" scroll={false}>Prospección →</Link>}>
        <div className="ops-stats">
          <Stat n={pr.backlog} label="investigados" />
          <Stat n={pr.backlog_alta} label="prioridad alta" tone="hi" />
          <Stat n={ap.emails} label="con borrador listo" />
          <Stat n={replies} label="respuestas por atender" tone={replies ? "hi" : undefined} />
        </div>
      </Section>

      <Section id="ops-out" title="Outreach de hoy" aside={<Link className="ops-note ops-a" href="/ops?view=outreach" scroll={false}>Outreach →</Link>}>
        <div className="ops-stats ops-stats-3">
          <Stat n={out ? `${out.email.sent_today}/${out.email.cap}` : "—"} label={out ? `correos hoy${out.email.mode === "live" ? "" : ` · ${out.email.mode === "off" ? "apagado" : out.email.mode}`}` : "correos hoy"} href="/ops?view=outreach&tab=email" />
          <Stat n={out ? `${out.linkedin.imported_today}/${out.linkedin.cap}` : "—"} label={out ? `LinkedIn hoy${out.linkedin.mode === "live" ? "" : ` · ${out.linkedin.mode === "off" ? "apagado" : out.linkedin.mode}`}` : "LinkedIn hoy"} href="/ops?view=outreach&tab=linkedin" />
          <Stat n={out ? out.email.approved_waiting : 0} label="aprobados esperando salir" />
        </div>
      </Section>

      <Section id="ops-cont" title="Contenido" aside={<Link className="ops-note ops-a" href="/ops?view=contenido" scroll={false}>Contenido →</Link>}>
        {wk ? (
          <>
            <div className="ops-stats">
              <Stat n={`${wk.done}/${wk.target}`} label="esta semana" tone={wk.state === "falta" ? undefined : "hi"} />
              <Stat n={wk.scheduled} label="programadas" />
              <Stat n={wk.in_review} label="en revisión" />
              <Stat n={`${wk.runway_days} d`} label="de runway" />
            </div>
            <p className="ops-foot"><strong>{wk.state_label}</strong></p>
          </>
        ) : <Empty>Ritmo semanal aún no disponible.</Empty>}
      </Section>

      <Section id="ops-sis" title="Sistema" aside={<Link className="ops-note ops-a" href="/ops?view=sistema" scroll={false}>Sistema →</Link>}>
        <p className="ops-sys-line"><Pill status={sys.overall}>{STATUS_LABEL[sys.overall]}</Pill>{sys.overall === "ok" ? " Todos los componentes responden." : " Hay componentes que requieren revisión."}</p>
      </Section>

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
    </>
  );
}

/* ------------------------------------------------------------- Aprobaciones */
async function Aprobaciones({ panel, fetchedAt, stale, filter }: { panel: Panel; fetchedAt: number; stale: boolean; filter: ApprovalFilter }) {
  const ov = await getOverview();
  return (
    <>
      <Head title="Aprobaciones" sub="Correos, LinkedIn y publicaciones que esperan tu decisión" fetchedAt={fetchedAt} stale={stale} />
      {!ov.ok ? <OverviewError reason={ov.reason} /> : null}
      <section className="ops-card" aria-label="Centro de aprobaciones">
        <ApprovalsCenter overview={ov.ok ? ov.overview : null} review={panel.content.in_review} initialFilter={filter} now={Date.parse(panel.generated_at) || fetchedAt} />
        <p className="ops-foot">Tu sesión privada de /ops más el clic en «Aprobar» es la aprobación humana válida. Nada se envía ni se publica desde aquí: aprobar activa el flujo real (envío en su ventana, campaña de Waalaxy, programación en GHL). Los códigos de Hermes siguen funcionando.</p>
      </section>
    </>
  );
}

/* --------------------------------------------------------------- Prospección */
function Prospeccion({ panel, fetchedAt, stale }: { panel: Panel; fetchedAt: number; stale: boolean }) {
  const pr = panel.prospecting;
  const shown = pr.latest.slice(0, 6);
  const rest = pr.latest.slice(6);
  return (
    <>
      <Head title="Prospección" sub="Lo que el Radar investigó (nada se contacta solo)" fetchedAt={fetchedAt} stale={stale} />
      <Section id="ops-pro" title="Prospección" aside={<span className="ops-note">{pr.last_run ? `Última corrida ${pr.last_run.label}` : "Sin corridas aún"}</span>}>
        <div className="ops-stats">
          <Stat n={pr.backlog} label="en Investigado" />
          <Stat n={pr.new_since_run} label="nuevos de la última corrida" />
          <Stat n={pr.backlog_alta} label="prioridad alta" tone="hi" />
          <Stat n={pr.contacted} label="contactados" />
        </div>
        {shown.length ? <ul className="ops-list">{shown.map((p) => <ProspectRow key={p.company} p={p} />)}</ul> : <Empty>No hay prospectos en Investigado.</Empty>}
        {rest.length ? (
          <details className="ops-more-box">
            <summary>Ver {rest.length} más</summary>
            <ul className="ops-list">{rest.map((p) => <ProspectRow key={p.company} p={p} />)}</ul>
          </details>
        ) : null}
        <p className="ops-foot">Todo queda en Investigado para tu decisión: el sistema no contacta a nadie por su cuenta.{pr.overdue_review_tasks ? ` Hay ${pr.overdue_review_tasks} tareas «Revisar prospecto» vencidas.` : ""}</p>
      </Section>
    </>
  );
}

/* ------------------------------------------------------------------ Outreach */
async function Outreach({ panel, fetchedAt, stale, tab }: { panel: Panel; fetchedAt: number; stale: boolean; tab: "email" | "linkedin" }) {
  const ov = await getOverview();
  const out = panel.outreach;
  const o: Overview | null = ov.ok ? ov.overview : null;
  const li = panel.linkedin;
  return (
    <>
      <Head title="Outreach" sub="Correo y LinkedIn: lo enviado, lo pendiente y los borradores" fetchedAt={fetchedAt} stale={stale} />
      <nav className="ops-tabs" aria-label="Canal">
        <Link href="/ops?view=outreach&tab=email" scroll={false} className={tab === "email" ? "ops-tab ops-tab-on" : "ops-tab"} aria-current={tab === "email" ? "page" : undefined}>Correo</Link>
        <Link href="/ops?view=outreach&tab=linkedin" scroll={false} className={tab === "linkedin" ? "ops-tab ops-tab-on" : "ops-tab"} aria-current={tab === "linkedin" ? "page" : undefined}>LinkedIn</Link>
      </nav>
      {!ov.ok ? <OverviewError reason={ov.reason} /> : null}

      {tab === "email" ? (
        <Section id="ops-mail" title="Correo" aside={<span className="ops-note">Gmail · {out?.email.mode === "live" ? "en vivo" : out?.email.mode === "off" ? "apagado" : out?.email.mode ?? "—"} · ventana {o?.email.window ?? "09:00–17:30"}</span>}>
          <div className="ops-stats">
            <Stat n={out ? `${out.email.sent_today}/${out.email.cap}` : "—"} label="enviados hoy" tone="hi" />
            <Stat n={out?.email.drafts ?? 0} label="borradores" />
            <Stat n={out?.email.approved_waiting ?? 0} label="aprobados esperando" />
            <Stat n={o ? o.email.cards.filter((c) => c.status === "sent").length : 0} label="enviados (histórico reciente)" />
          </div>
          {o ? <EmailLibrary cards={o.email.cards} /> : null}
          <p className="ops-foot">Aprobar no envía desde aquí: deja el correo listo y el sender sale en su ventana (lun–vie), con el tope diario y las protecciones de siempre.</p>
        </Section>
      ) : (
        <>
          <Section id="ops-lires" title="LinkedIn · resumen" aside={<span className="ops-note">Waalaxy ejecuta · modo {li.mode === "off" ? "apagado" : li.mode}</span>}>
            <div className="ops-stats ops-stats-6">
              <Stat n={out ? `${out.linkedin.imported_today}/${out.linkedin.cap}` : "—"} label="enviados hoy" tone="hi" />
              <Stat n={li.counts.pendiente + (o?.linkedin.ready.length ?? li.ready)} label="pendientes de aprobar" />
              <Stat n={li.counts.en_campana + li.counts.conexion + li.counts.mensaje + li.counts.followup + li.counts.en_lista} label="en campaña" />
              <Stat n={li.counts.respondio} label="respondieron" tone={li.counts.respondio ? "hi" : undefined} />
              <Stat n={li.counts.error} label="errores" />
              <Stat n={li.counts.rechazo} label="rechazaron" />
            </div>
          </Section>
          <Section id="ops-liready" title="Listos para aprobar" aside={<span className="ops-note">persona + cargo + perfil verificable</span>}>
            {o && o.linkedin.ready.length ? <div className="ops-ap-list">{o.linkedin.ready.map((p) => <LinkedinReadyCard key={p.candidate_id} p={p} />)}</div> : <Empty>Nadie listo ahora. Para usar LinkedIn hace falta una persona con nombre, cargo y perfil personal verificable.</Empty>}
          </Section>
          <Section id="ops-lisent" title="Enviados a Waalaxy" aside={<span className="ops-note">Último estado conocido por Atacama OS</span>}>
            {o && o.linkedin.sent.length ? <ul className="ops-list">{o.linkedin.sent.map((s) => <LinkedinSentRow key={s.candidate_id} s={s} />)}</ul> : <Empty>Atacama OS todavía no ha enviado ningún prospecto a Waalaxy.</Empty>}
            <p className="ops-foot">{li.note}</p>
          </Section>
        </>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ Contenido */
function Contenido({ panel, fetchedAt, stale }: { panel: Panel; fetchedAt: number; stale: boolean }) {
  const ct = panel.content;
  const wk = ct.weekly;
  return (
    <>
      <Head title="Contenido" sub="Ritmo editorial, aprobaciones y radares" fetchedAt={fetchedAt} stale={stale} />
      {wk ? (
        <Section id="ops-rhythm" title={`Contenido esta semana: ${wk.done} / ${wk.target}`} aside={<span className={`ops-pill ops-pill-${wk.state === "falta" ? "fallo" : wk.state === "ritmo" ? "atencion" : "ok"}`}>{wk.state === "exceso" ? "Más de lo normal" : wk.state_label}</span>}>
          <div className="ops-stats">
            <Stat n={wk.published} label="publicadas" />
            <Stat n={wk.scheduled} label="programadas" />
            <Stat n={wk.in_review} label="en revisión" tone={wk.in_review ? "hi" : undefined} />
            <Stat n={`${wk.runway_days} d`} label={`runway (ideal ${wk.runway_min}–${wk.runway_max})`} tone={wk.runway_ok ? undefined : "hi"} />
          </div>
          <p className="ops-foot"><strong>{wk.state_label}.</strong> Objetivo {wk.target}/semana (mínimo sano {wk.min}, máximo normal {wk.max}), máx. 1 publicación por cuenta y día. Semana del {wk.week_start} al {wk.week_end} (hora de Chile). Los radares siguen recolectando aunque la semana esté cubierta; no se fabrican piezas solo por llenar la cola.</p>
        </Section>
      ) : null}

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
        {ct.in_review.length ? (<><h3>Por aprobar</h3><div className="ops-ap-list">{ct.in_review.map((p) => <ContentApprovalCard key={p.id} p={p} defaultOpen />)}</div></>) : null}
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
    </>
  );
}

/* -------------------------------------------------------------------- Sistema */
function Sistema({ panel, fetchedAt, stale }: { panel: Panel; fetchedAt: number; stale: boolean }) {
  const sys = panel.system;
  const bad = sys.components.filter((c) => c.status !== "ok");
  return (
    <>
      <Head title="Sistema" sub="Salud de las automatizaciones y de Hermes" fetchedAt={fetchedAt} stale={stale} />
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
        {panel.missing.length ? <p className="ops-foot">No pude leer: {panel.missing.join(", ")}. Esa parte está incompleta.</p> : null}
      </Section>
    </>
  );
}

/** Marco + vista elegida. `sp` = parámetros de la URL (?view=…&filter=…&tab=…). */
export async function PanelView({ sp }: { sp: { view?: string | string[]; filter?: string | string[]; tab?: string | string[] } }) {
  const view: ViewId = parseView(sp.view);
  const r = await getPanel();
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  if (!r.ok) {
    const msg = r.reason === "not_configured"
      ? "Falta configurar la conexión con Atacama OS en el servidor (N8N_BASE_URL y ATACAMA_INGEST_KEY)."
      : r.reason === "unreachable"
        ? "No pude conectar con Atacama OS (n8n no responde). Reintenta en un minuto."
        : "Atacama OS respondió algo inesperado. Reintenta en un minuto.";
    return (<Shell view={view} badges={{}}><Section id="ops-err" title="Sin datos"><Empty>{msg}</Empty></Section></Shell>);
  }
  const { panel, fetchedAt, stale } = r;
  const ap = panel.approvals;
  const badges = { aprobaciones: ap ? ap.emails + ap.linkedin + ap.content : 0, contenido: panel.content.weekly && panel.content.weekly.state === "falta" ? 1 : 0 };
  const filter = (["todas", "correos", "linkedin", "contenido"].includes(one(sp.filter) ?? "") ? one(sp.filter) : "todas") as ApprovalFilter;
  const tab = one(sp.tab) === "linkedin" ? "linkedin" : "email";
  return (
    <Shell view={view} badges={badges}>
      {view === "inicio" ? <Inicio panel={panel} fetchedAt={fetchedAt} stale={stale} />
        : view === "aprobaciones" ? <Aprobaciones panel={panel} fetchedAt={fetchedAt} stale={stale} filter={filter} />
        : view === "prospeccion" ? <Prospeccion panel={panel} fetchedAt={fetchedAt} stale={stale} />
        : view === "outreach" ? <Outreach panel={panel} fetchedAt={fetchedAt} stale={stale} tab={tab} />
        : view === "contenido" ? <Contenido panel={panel} fetchedAt={fetchedAt} stale={stale} />
        : <Sistema panel={panel} fetchedAt={fetchedAt} stale={stale} />}
    </Shell>
  );
}

export function PanelSkeleton() {
  return (
    <div className="ops-app" aria-busy="true" aria-label="Cargando">
      <header className="ops-bar"><span className="ops-brand"><strong>Atacama OS</strong><span className="ops-on">ON</span></span></header>
      <main className="ops-main">
        <div className="ops-top"><div><p className="ops-eyebrow">Atacama OS</p><h1>Cargando…</h1></div></div>
        {[0, 1, 2].map((i) => (<div key={i} className="ops-card ops-skel"><div /><div /><div /></div>))}
      </main>
    </div>
  );
}
