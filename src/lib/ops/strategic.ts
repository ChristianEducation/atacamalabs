import type { StrategicEvidence, StrategicHttpState, StrategicOpportunity, StrategicProdTarget, StrategicRun, StrategicSourceState, StrategicTab, StrategicView } from "./types";

/**
 * Radar estratégico · validación de la respuesta de n8n antes de renderizar (spec RADAR §6.3).
 * Nada de `as` a ciegas: cada campo se comprueba y se copia a un objeto nuevo (lo desconocido no pasa a la interfaz).
 * Si UNA fila viene mal formada se rechaza la vista completa: mostrar «menos filas» como si fuera todo sería un vacío falso.
 */
type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const oneOf = <T extends string>(v: unknown, list: readonly T[]): T | null => (typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T) : null);

const TABS = ["production", "products", "partners", "events"] as const;
const SOURCE_STATES = ["ok", "stale", "unavailable", "not_configured"] as const;
const HTTP_STATES = ["healthy", "degraded", "down", "unknown", "unverified"] as const;

export function parseTarget(v: unknown): StrategicProdTarget | null {
  if (!isObj(v)) return null;
  const id = str(v.id), name = str(v.logical_name), status = oneOf(v.status, ["candidate", "confirmed", "paused", "retired"] as const);
  const section = oneOf(v.section, ["confirmed", "pending"] as const), http: StrategicHttpState | null = oneOf(v.http_state, HTTP_STATES);
  if (!id || !name || !status || !section || !http || typeof v.monitor_enabled !== "boolean") return null;
  let last: StrategicProdTarget["last_check"] = null;
  if (isObj(v.last_check)) {
    const at = str(v.last_check.checked_at), res = str(v.last_check.result);
    if (!at || !res) return null;
    last = { checked_at: at, result: res, http_status: num(v.last_check.http_status), latency_ms: num(v.last_check.latency_ms), error_code: str(v.last_check.error_code) };
  }
  return {
    id, logical_name: name, repo_full_name: str(v.repo_full_name), repo_branch: str(v.repo_branch), deployment_url: str(v.deployment_url), health_url: str(v.health_url), provider: str(v.provider),
    status, monitor_enabled: v.monitor_enabled, verified_at: str(v.verified_at), notes: str(v.notes), last_deploy_sha: str(v.last_deploy_sha),
    section, http_state: http, health_reason: str(v.health_reason) ?? "sin_verificar", last_checked_at: str(v.last_checked_at), last_check: last,
  };
}

function parseEvidence(v: unknown): StrategicEvidence | null {
  if (!isObj(v)) return null;
  const url = str(v.source_url), title = str(v.source_title), type = oneOf(v.source_type, ["official", "repository", "documentation", "secondary"] as const), claim = str(v.claim), at = str(v.verified_at);
  if (!url || !title || !type || !claim || !at) return null;
  return { source_url: url, source_title: title, source_type: type, claim, excerpt: str(v.excerpt), source_published_at: str(v.source_published_at), verified_at: at };
}

export function parseOpportunity(v: unknown): StrategicOpportunity | null {
  if (!isObj(v)) return null;
  const id = str(v.id), kind = oneOf(v.kind, ["product", "partner", "event"] as const), title = str(v.title), url = str(v.canonical_url), summary = str(v.summary), biz = str(v.business_case), next = str(v.next_action);
  const status = oneOf(v.status, ["new", "shortlisted", "working", "dismissed", "expired"] as const), conf = oneOf(v.confidence, ["low", "medium", "high"] as const);
  if (!id || !kind || !title || !url || !summary || !biz || !next || !status || !conf) return null;
  const evRaw = Array.isArray(v.evidence) ? v.evidence : [];
  const evidence = evRaw.map(parseEvidence);
  if (evidence.some((e) => e === null)) return null;
  return {
    id, kind, title, organization: str(v.organization), canonical_url: url, summary, business_case: biz, target_customer: str(v.target_customer), next_action: next,
    status, score: num(v.score), score_parts: isObj(v.score_parts) ? v.score_parts : {}, confidence: conf,
    license_id: str(v.license_id), license_verified: v.license_verified === true, coverage_pct: num(v.coverage_pct),
    critical_blockers: Array.isArray(v.critical_blockers) ? v.critical_blockers.filter((b): b is string => typeof b === "string" && b.trim() !== "") : [],
    event_start_at: str(v.event_start_at), event_end_at: str(v.event_end_at), deadline_at: str(v.deadline_at), event_timezone: str(v.event_timezone), event_location: str(v.event_location), event_format: str(v.event_format),
    first_seen_at: str(v.first_seen_at), last_checked_at: str(v.last_checked_at), decision_at: str(v.decision_at), decision_by: str(v.decision_by), decision_reason: str(v.decision_reason),
    evidence: evidence as StrategicEvidence[], stale_days: num(v.stale_days), unverified: v.unverified === true,
  };
}

function parseRun(v: unknown): StrategicRun | null {
  if (!isObj(v)) return null;
  const id = str(v.id), kind = oneOf(v.kind, TABS), trigger = oneOf(v.trigger, ["manual", "cron", "test"] as const), status = oneOf(v.status, ["ok", "partial", "blocked", "failed"] as const), s = str(v.started_at), f = str(v.finished_at);
  if (!id || !kind || !trigger || !status || !s || !f) return null;
  return { id, kind, trigger, status, started_at: s, finished_at: f, scanned_count: num(v.scanned_count) ?? 0, accepted_count: num(v.accepted_count) ?? 0, duplicate_count: num(v.duplicate_count) ?? 0, failed_count: num(v.failed_count) ?? 0, error_code: str(v.error_code) };
}

/** Respuesta `strategic` de la acción strategic_view → vista validada, o null si algo no cuadra. */
export function parseStrategicView(j: unknown): StrategicView | null {
  if (!isObj(j)) return null;
  const tab: StrategicTab | null = oneOf(j.tab, TABS), source: StrategicSourceState | null = oneOf(j.source_state, SOURCE_STATES), at = str(j.generated_at);
  if (!tab || !source || !at || typeof j.enabled !== "boolean" || !isObj(j.summary) || !Array.isArray(j.items) || !Array.isArray(j.runs)) return null;
  const total = num(j.summary.total), pending = num(j.summary.pending), alerts = num(j.summary.alerts);
  if (total === null || pending === null || alerts === null) return null;
  const runs = j.runs.map(parseRun);
  if (runs.some((r) => r === null)) return null;
  const base = { generated_at: at, tab, enabled: j.enabled, source_state: source, summary: { total, pending, alerts, last_run_at: str(j.summary.last_run_at) }, runs: runs as StrategicRun[] };
  if (tab === "production") {
    const items = j.items.map(parseTarget);
    return items.some((x) => x === null) ? null : { ...base, items: items as StrategicProdTarget[] };
  }
  const items = j.items.map(parseOpportunity);
  return items.some((x) => x === null) ? null : { ...base, items: items as StrategicOpportunity[] };
}

export function isStrategicTab(v: unknown): v is StrategicTab { return oneOf(v, TABS) !== null; }
