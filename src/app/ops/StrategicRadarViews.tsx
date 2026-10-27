import type { StrategicEvidence, StrategicHttpState, StrategicOpportunity, StrategicProdTarget, StrategicTab, StrategicView } from "@/lib/ops/types";
import type { V3Result } from "@/lib/ops/v3-data";
import { Empty, Head, Section, Stat } from "./Blocks";
import { fmtCl } from "./Parts";
import { ConfirmTargetForm, DecideButtons } from "./StrategicRadarClient";

/**
 * Radar estratégico (spec RADAR §2): Producción · Productos · Alianzas · Eventos.
 * Reglas de la casa: sin tarjetas con datos inventados, sin contadores si la lectura falló, nada «verde» sin un chequeo comprobado y vigente,
 * y ningún botón de contactar / inscribirse / enviar / aplicar: solo «Guardar para evaluar», «Trabajar», «Descartar» y «Confirmar registro».
 */
const TITLE: Record<StrategicTab, string> = { production: "Producción", products: "Productos", partners: "Alianzas", events: "Eventos" };
const MSG_DOWN = "No pude consultar el Radar. No significa que no existan oportunidades.";
const MSG_EMPTY = "Todavía no hay datos verificados para esta sección.";

const HTTP_LABEL: Record<StrategicHttpState, string> = { healthy: "Responde (HTTP)", degraded: "Degradado · por confirmar", down: "Caído · 2 fallas seguidas", unknown: "Sin datos recientes", unverified: "Sin verificar" };
const STATUS_LABEL: Record<StrategicOpportunity["status"], string> = { new: "Nuevo", shortlisted: "Guardado para evaluar", working: "En trabajo (interno)", dismissed: "Descartado", expired: "Vencido" };
const SRC_LABEL: Record<StrategicEvidence["source_type"], string> = { official: "Fuente oficial", repository: "Repositorio", documentation: "Documentación", secondary: "Fuente secundaria" };
const CONF_LABEL: Record<StrategicOpportunity["confidence"], string> = { high: "alta", medium: "media", low: "baja" };
const PART_LABEL: Record<string, string> = { license: "Licencia", functionality: "Funcionalidad", integrations: "Integraciones", security: "Seguridad y mantenimiento", deploy: "Despliegue", sales_fit: "Encaje comercial", fit: "Ajuste a Atacama", mutual_benefit: "Beneficio bilateral", eligibility: "Elegibilidad Chile/LATAM", access: "Acceso / contacto", terms: "Condiciones", audience: "Audiencia B2B", connections: "Conexiones", relevance: "Relevancia", logistics: "Logística y costo", verification: "Plazo y organización" };

const safeHref = (u: string | null) => (u && /^https:\/\//i.test(u) ? u : null);
function Ext({ href, children }: { href: string | null; children: React.ReactNode }) {
  const h = safeHref(href);
  return h ? <a href={h} target="_blank" rel="noreferrer noopener">{children}</a> : <>{children}</>;
}
function ago(iso: string | null, now: number): string | null {
  const t = iso ? Date.parse(iso) : NaN;
  if (!Number.isFinite(t)) return null;
  const m = Math.max(0, Math.round((now - t) / 60000));
  return m < 60 ? `hace ${m} min` : m < 2880 ? `hace ${Math.round(m / 60)} h` : `hace ${Math.round(m / 1440)} días`;
}
const dateOnly = (iso: string) => new Date(iso).toLocaleDateString("es-CL", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric" });

function Badge({ state }: { state: StrategicHttpState }) {
  return <span className={`ops-strategic-badge ops-strategic-badge-${state}`}>{HTTP_LABEL[state]}</span>;
}

/* ------------------------------------------------------------------ Producción */
function TargetRow({ t, now }: { t: StrategicProdTarget; now: number }) {
  const pending = t.section === "pending";
  const lc = t.last_check;
  const evType = lc ? "Chequeo HTTP autorizado (no prueba base de datos ni pagos)" : t.repo_full_name ? "Solo código en GitHub: no prueba que esté desplegado" : "Sin evidencia";
  return (
    <li>
      <details className="ops-row" data-testid="strategic-target">
        <summary>
          <span className="ops-row-main">
            <span className="ops-row-head"><span className="ops-row-title">{t.logical_name}</span>{pending ? <span className="ops-tag">Pendiente de confirmar</span> : !t.monitor_enabled ? <span className="ops-tag">Pendiente de primer chequeo</span> : null}</span>
            <span className="ops-row-sub ops-ellipsis">{t.repo_full_name ? `Código: ${t.repo_full_name}` : "Repositorio por definir"}{lc ? ` · ${ago(lc.checked_at, now)}` : ""}</span>
          </span>
          <Badge state={t.http_state} />
        </summary>
        <dl className="ops-detail">
          <dt>Repositorio (código)</dt><dd>{t.repo_full_name ?? "Por definir"}{t.repo_branch ? ` · rama ${t.repo_branch}` : ""}</dd>
          <dt>Destino desplegado</dt><dd>{t.deployment_url ? <Ext href={t.deployment_url}>{t.deployment_url}</Ext> : "Sin confirmar"}</dd>
          <dt>Proveedor</dt><dd>{t.provider ?? "Sin integración"}</dd>
          <dt>Health endpoint</dt><dd>{t.health_url ? <Ext href={t.health_url}>{t.health_url}</Ext> : "Sin aprobar"}</dd>
          <dt>Último SHA verificado (código)</dt><dd>{t.last_deploy_sha ?? "Sin verificar"}</dd>
          <dt>Última comprobación</dt>
          <dd>{lc ? `${fmtCl(lc.checked_at)} · ${lc.result}${lc.http_status != null ? ` · HTTP ${lc.http_status}` : ""}${lc.latency_ms != null ? ` · ${lc.latency_ms} ms` : ""}${lc.error_code ? ` · ${lc.error_code}` : ""}` : t.last_checked_at ? `${fmtCl(t.last_checked_at)} (sin datos recientes)` : "Ninguna: no se chequea hasta que lo confirmes y actives el monitoreo"}</dd>
          <dt>Tipo de evidencia</dt><dd>{evType}</dd>
          {t.monitor_enabled ? <><dt>Monitoreo</dt><dd>Activo</dd></> : null}
          {t.notes ? <><dt>Notas</dt><dd>{t.notes}</dd></> : null}
        </dl>
        {t.status === "candidate" ? <ConfirmTargetForm id={t.id} repo={t.repo_full_name} /> : !t.monitor_enabled ? <p className="ops-foot">Confirmado. El monitoreo está apagado hasta que se pruebe la dirección real y lo autorices.</p> : null}
      </details>
    </li>
  );
}

function ProductionBody({ v }: { v: StrategicView }) {
  const now = Date.parse(v.generated_at), items = v.items as StrategicProdTarget[];
  const conf = items.filter((t) => t.section === "confirmed"), pend = items.filter((t) => t.section === "pending");
  return (
    <>
      <Section id="ops-sr-conf" title="Confirmados para monitoreo" aside={<span className="ops-note">{conf.length}</span>}>
        {conf.length ? <ul className="ops-list">{conf.map((t) => <TargetRow key={t.id} t={t} now={now} />)}</ul> : <Empty>Ningún servicio confirmado todavía. Un servicio solo se monitorea después de que confirmes su repositorio, su URL real y su health endpoint.</Empty>}
      </Section>
      <Section id="ops-sr-pend" title="Por verificar" aside={<span className="ops-note">{pend.length}</span>}>
        {pend.length ? <ul className="ops-list">{pend.map((t) => <TargetRow key={t.id} t={t} now={now} />)}</ul> : <Empty>{MSG_EMPTY}</Empty>}
        <p className="ops-foot">Inventario por revisar, no evidencia de producción: GitHub muestra que el código existe, no cuál versión está desplegada. «Responde» significa solo que el endpoint contestó por HTTP.</p>
      </Section>
    </>
  );
}

/* ----------------------------------------------------------- Productos · Alianzas · Eventos */
function Parts({ o }: { o: StrategicOpportunity }) {
  const entries = Object.entries(o.score_parts).filter(([k, val]) => PART_LABEL[k] && typeof val === "number");
  return entries.length ? <ul className="ops-strategic-parts">{entries.map(([k, val]) => <li key={k}><span>{PART_LABEL[k]}</span><strong>{String(val)}</strong></li>)}</ul> : <>Sin desglose</>;
}

function EvidenceList({ ev }: { ev: StrategicEvidence[] }) {
  if (!ev.length) return <p className="ops-strategic-warn">Sin evidencia registrada: no debería mostrarse como oportunidad.</p>;
  return (
    <ul className="ops-strategic-ev">
      {ev.map((e, i) => (
        <li key={i}>
          <span className="ops-row-title"><Ext href={e.source_url}>{e.source_title}</Ext> <span className="ops-tag">{SRC_LABEL[e.source_type]}</span></span>
          <span className="ops-row-sub">{e.claim}{e.excerpt ? ` — «${e.excerpt}»` : ""} · verificado {fmtCl(e.verified_at)}</span>
        </li>
      ))}
    </ul>
  );
}

function OppDetail({ o }: { o: StrategicOpportunity }) {
  const provisional = o.score_parts.coverage_provisional === true;
  const dateOnlyEv = o.score_parts.date_precision === "date_only";
  const fmtEv = (iso: string | null) => (iso ? (dateOnlyEv ? dateOnly(iso) : `${fmtCl(iso)}${o.event_timezone ? ` (${o.event_timezone})` : ""}`) : null);
  return (
    <>
    <dl className="ops-detail">
      {o.organization ? <><dt>{o.kind === "event" ? "Organizador" : o.kind === "partner" ? "Organización" : "Autor"}</dt><dd>{o.organization}</dd></> : null}
      <dt>{o.kind === "product" ? "Repositorio" : o.kind === "partner" ? "Programa (fuente oficial)" : "Enlace oficial"}</dt><dd><Ext href={o.canonical_url}>{o.canonical_url}</Ext></dd>
      <dt>Qué es</dt><dd>{o.summary}</dd>
      <dt>{o.kind === "product" ? "Problema comercial" : "Beneficio para Atacama"}</dt><dd>{o.business_case}</dd>
      {o.target_customer ? <><dt>{o.kind === "product" ? "Comprador objetivo" : "Audiencia"}</dt><dd>{o.target_customer}</dd></> : null}
      {o.kind === "product" ? (
        <>
          <dt>Licencia</dt><dd>{o.license_verified && o.license_id ? `${o.license_id} (verificada)` : "Sin verificar: no es candidato a vender"}</dd>
          <dt>Cobertura de funciones</dt><dd>{o.coverage_pct != null ? `${o.coverage_pct}% · ${provisional ? "provisional (hay requisitos sin verificar)" : "auditada"}` : "Sin auditar"}</dd>
          <dt>Bloqueos críticos</dt><dd>{o.critical_blockers.length ? o.critical_blockers.join(" · ") : "Ninguno registrado"}</dd>
        </>
      ) : null}
      {o.kind === "event" ? (
        <>
          <dt>Fecha</dt><dd>{fmtEv(o.event_start_at) ?? "Sin fecha oficial verificada: no se considera próximo"}{o.event_end_at ? ` → ${fmtEv(o.event_end_at)}` : ""}</dd>
          <dt>Lugar y formato</dt><dd>{[o.event_location, o.event_format].filter(Boolean).join(" · ") || "Sin confirmar"}</dd>
        </>
      ) : null}
      {o.kind !== "product" ? <><dt>Plazo</dt><dd>{o.deadline_at ? fmtCl(o.deadline_at) : "Sin plazo confirmado"}</dd></> : null}
      <dt>Puntaje</dt><dd>{o.score != null ? `${o.score}/100 · confianza ${CONF_LABEL[o.confidence]}` : `Sin puntaje · confianza ${CONF_LABEL[o.confidence]}`}</dd>
      <dt>Desglose</dt><dd><Parts o={o} /></dd>
      <dt>Evidencia</dt><dd><EvidenceList ev={o.evidence} /></dd>
      <dt>Próximo paso</dt><dd>{o.next_action}</dd>
      {o.decision_at ? <><dt>Decisión</dt><dd>{STATUS_LABEL[o.status]} · {o.decision_by ?? "—"} · {fmtCl(o.decision_at)}{o.decision_reason ? ` · ${o.decision_reason}` : ""}</dd></> : null}
      </dl>
      <DecideButtons id={o.id} status={o.status} />
    </>
  );
}

function OppRow({ o }: { o: StrategicOpportunity }) {
  const tone = o.score != null && o.score >= 75 && o.confidence !== "low" ? "alta" : "neutral";
  const sub = [o.organization, STATUS_LABEL[o.status], o.stale_days != null ? `Última verificación hace ${o.stale_days} días` : null, o.confidence === "low" ? "Requiere confirmar" : null].filter(Boolean).join(" · ");
  return (
    <li>
      <details className="ops-row" data-testid="strategic-opp">
        <summary>
          <span className="ops-row-main">
            <span className="ops-row-head"><span className="ops-row-title">{o.title}</span>{o.unverified ? <span className="ops-tag">Pendiente de verificar</span> : null}</span>
            <span className="ops-row-sub ops-ellipsis">{sub}</span>
          </span>
          <span className={`ops-score ops-score-${tone}`} title="Puntaje calculado solo con la evidencia disponible">{o.score ?? "–"}</span>
        </summary>
        <OppDetail o={o} />
      </details>
    </li>
  );
}

const SECTION_TITLE: Record<Exclude<StrategicTab, "production">, string> = { products: "Repos externos para empaquetar", partners: "Programas y alianzas", events: "Eventos y networking" };

function OpportunityBody({ v }: { v: StrategicView }) {
  const items = v.items as StrategicOpportunity[];
  const tab = v.tab as Exclude<StrategicTab, "production">;
  return (
    <Section id="ops-sr-opps" title={SECTION_TITLE[tab]} aside={<span className="ops-note">{items.length ? `Top ${items.length}` : ""}</span>}>
      {items.length ? <ul className="ops-list">{items.map((o) => <OppRow key={o.id} o={o} />)}</ul> : <Empty>{MSG_EMPTY}</Empty>}
      <p className="ops-foot">Solo oportunidades con evidencia. Lo que no se pudo verificar aparece como «Pendiente de verificar» o no aparece. Nada aquí contacta, inscribe ni envía: tú decides cada paso.</p>
    </Section>
  );
}

/* ---------------------------------------------------------------------- Vista */
export async function StrategicRadarView({ tab, sP, fetchedAt, stale }: { tab: StrategicTab; sP: Promise<V3Result<StrategicView>>; fetchedAt: number; stale: boolean }) {
  const r = await sP;
  const head = <Head title="Radar estratégico" sub="Producción, nuevos productos, alianzas y eventos. Solo oportunidades con evidencia." fetchedAt={fetchedAt} stale={stale} />;
  if (!r.ok) return (<>{head}<Section id="ops-sr-na" title={TITLE[tab]}><Empty>{r.reason === "not_configured" ? "Falta configurar la conexión con Atacama OS en el servidor." : MSG_DOWN}</Empty></Section></>);
  const v = r.value;
  if (v.source_state === "unavailable") return (<>{head}<Section id="ops-sr-na" title={TITLE[tab]}><Empty>{MSG_DOWN}</Empty><p className="ops-foot">La base del Radar no respondió o todavía no está creada. Ventas, correo, redes y el Daily siguen funcionando.</p></Section></>);
  const now = Date.parse(v.generated_at);
  const items = v.items;
  const lastCheck = tab === "production" ? (items as StrategicProdTarget[]).map((t) => t.last_checked_at).filter((x): x is string => !!x).sort().pop() ?? null : v.summary.last_run_at;
  const off = tab === "production" ? "Monitoreo automático apagado; inventario por verificar." : "Investigación no activada. Se muestra solo el historial que ya exista.";
  return (
    <>
      {head}
      {v.source_state === "not_configured" ? <p className="ops-strategic-note" role="status">El Radar aún no tiene su configuración en la base de datos: todo permanece apagado.</p> : null}
      {v.source_state === "stale" ? <p className="ops-strategic-note" role="status">No pude actualizar el Radar; esto es la última lectura guardada y puede estar atrasada.</p> : null}
      {!v.enabled ? <p className="ops-strategic-note" role="status" data-testid="strategic-off">{off}</p> : null}
      <Section id="ops-sr-sum" title={TITLE[tab]}>
        <div className="ops-stats ops-stats-3">
          <Stat n={v.summary.total} label={tab === "production" ? "servicios en inventario" : "registrados"} />
          <Stat n={v.summary.pending} label={tab === "production" ? "por verificar" : "por decidir"} />
          {tab === "production" ? <Stat n={(items as StrategicProdTarget[]).some((t) => t.http_state !== "unverified") ? v.summary.alerts : "—"} label="caídos" tone={v.summary.alerts ? "hi" : undefined} /> : <Stat n={lastCheck ? (ago(lastCheck, now) ?? "—") : "—"} label={lastCheck ? "última corrida" : "sin corridas aún"} />}
        </div>
        {tab === "production" ? <p className="ops-foot">{lastCheck ? `Última comprobación ${ago(lastCheck, now)}.` : "Aún no hay ninguna comprobación."}</p> : null}
      </Section>
      {tab === "production" ? <ProductionBody v={v} /> : <OpportunityBody v={v} />}
      {v.runs.length ? (
        <details className="ops-more-box">
          <summary>Últimas corridas ({v.runs.length})</summary>
          <ul className="ops-list ops-signals">{v.runs.map((x) => <li key={x.id}><span className="ops-row-title">{fmtCl(x.finished_at)} · {x.status}</span><span className="ops-row-sub">{x.trigger} · revisados {x.scanned_count} · aceptados {x.accepted_count} · repetidos {x.duplicate_count} · fallidos {x.failed_count}{x.error_code ? ` · ${x.error_code}` : ""}</span></li>)}</ul>
        </details>
      ) : null}
    </>
  );
}
