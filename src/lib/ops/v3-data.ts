import "server-only";
import type { DnsCheck, IdeasView, MailView, TallerView } from "./types";
import { swr } from "./swr";

/**
 * Atacama OS v3 — lecturas propias de las vistas nuevas (n8n «25 Atacama Ops», solo lectura, clave de ingesta que el navegador nunca ve).
 * Mismo patrón que data.ts: memoria con «stale-while-revalidate» y descarte tras cada acción (invalidateV3).
 */
function config() {
  const base = process.env.N8N_BASE_URL?.replace(/\/$/, "");
  const key = process.env.ATACAMA_INGEST_KEY;
  return base && key ? { base, key } : null;
}

async function read<T>(action: string, pick: (j: Record<string, unknown>) => T | null): Promise<{ value: T; at: number }> {
  const cfg = config();
  if (!cfg) throw new Error("not_configured");
  const res = await fetch(`${cfg.base}/webhook/atacama-ops`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Atacama-Key": cfg.key },
    body: JSON.stringify({ action }),
    cache: "no-store",
    signal: AbortSignal.timeout(28_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as Record<string, unknown>;
  const v = json.ok === true ? pick(json) : null;
  if (!v) throw new Error("bad_response");
  return { value: v, at: Date.now() };
}

const ideasCache = swr<IdeasView>(() => read("ideas_list", (j) => {
  const v = j.ideas as IdeasView | undefined;
  return v && Array.isArray(v.weeks) ? v : null;
}), { freshMs: 20_000, maxStaleMs: 10 * 60_000 });

const tallerCache = swr<TallerView>(() => read("taller_list", (j) => {
  const v = j.taller as TallerView | undefined;
  return v && Array.isArray(v.pieces) ? v : null;
}), { freshMs: 20_000, maxStaleMs: 10 * 60_000 });

const mailCache = swr<MailView>(() => read("mail_view", (j) => {
  const v = j.mail as MailView | undefined;
  return v && v.hoy && Array.isArray(v.cola) ? v : null;
}), { freshMs: 20_000, maxStaleMs: 10 * 60_000 });

/**
 * SPF / DKIM / DMARC del dominio de envío (spec §7-9). Consulta pública por DNS sobre HTTPS (sin claves), una vez al día como mucho.
 * DKIM se busca en el selector de Google Workspace («google»), que es el que usa el envío por Gmail.
 */
const DOMAIN = "atacamalabs.cl";
async function txt(name: string): Promise<string[]> {
  const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(name)}&type=TXT`, { cache: "no-store", signal: AbortSignal.timeout(8_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const j = (await res.json()) as { Answer?: { data?: string }[] };
  return (j.Answer ?? []).map((a) => String(a.data ?? "").replace(/"\s*"/g, "").replace(/^"|"$/g, ""));
}
const dnsCache = swr<DnsCheck>(async () => {
  const [root, dmarc, dkim] = await Promise.all([txt(DOMAIN), txt("_dmarc." + DOMAIN), txt("google._domainkey." + DOMAIN)]);
  const spfRec = root.find((t) => /^v=spf1/i.test(t)) ?? null;
  const dmarcRec = dmarc.find((t) => /^v=DMARC1/i.test(t)) ?? null;
  const dkimRec = dkim.find((t) => /v=DKIM1|p=/i.test(t)) ?? null;
  const detail = [
    spfRec ? `SPF: ${spfRec.slice(0, 120)}${/_spf\.google\.com/.test(spfRec) ? "" : " (no incluye a Google)"}` : "SPF: no encontrado",
    dkimRec ? "DKIM (selector google): publicado" : "DKIM (selector google): no encontrado",
    dmarcRec ? `DMARC: ${dmarcRec.slice(0, 120)}` : "DMARC: no encontrado",
  ];
  return { value: { domain: DOMAIN, checked_at: new Date().toISOString(), spf: spfRec ? /_spf\.google\.com/.test(spfRec) : false, dkim: Boolean(dkimRec), dmarc: Boolean(dmarcRec), detail }, at: Date.now() };
}, { freshMs: 24 * 3600_000, maxStaleMs: 7 * 24 * 3600_000 });

export type V3Result<T> = { ok: true; value: T } | { ok: false; reason: "not_configured" | "unreachable" };

export async function getIdeas(): Promise<V3Result<IdeasView>> {
  if (!config()) return { ok: false, reason: "not_configured" };
  try { return { ok: true, value: (await ideasCache.get()).value }; } catch { return { ok: false, reason: "unreachable" }; }
}

export async function getTaller(): Promise<V3Result<TallerView>> {
  if (!config()) return { ok: false, reason: "not_configured" };
  try { return { ok: true, value: (await tallerCache.get()).value }; } catch { return { ok: false, reason: "unreachable" }; }
}

export async function getMail(): Promise<V3Result<MailView>> {
  if (!config()) return { ok: false, reason: "not_configured" };
  try { return { ok: true, value: (await mailCache.get()).value }; } catch { return { ok: false, reason: "unreachable" }; }
}

export async function getDns(): Promise<DnsCheck | null> {
  try { return (await dnsCache.get()).value; } catch { return null; }
}

/** Tras cualquier acción de /ops: lo siguiente que se lea es el estado real. */
export function invalidateV3(): void {
  ideasCache.drop();
  tallerCache.drop();
  mailCache.drop();
}
