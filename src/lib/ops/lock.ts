import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase-server";

/**
 * Bloqueo por intentos fallidos del PIN de /ops.
 * - Por visitante (huella de IP): 5 fallos en 15 min → bloqueo de 5 min; 10 fallos → 30 min.
 * - Global (todas las IP): 30 fallos en 1 h → bloqueo de 15 min (frena ataques repartidos).
 * El estado vive en Supabase (tabla ops_alerts, claves `_lock:*`, solo servidor) para que valga entre instancias de Vercel;
 * si Supabase falla se usa memoria local (mejor que nada). No guarda IP en claro ni el PIN intentado.
 */
type Row = { fails: number[]; until: number };
const mem = new Map<string, Row>();
const MIN = 60_000;

async function load(key: string): Promise<Row> {
  try {
    const { data, error } = await getSupabaseServerClient().from("ops_alerts").select("meta").eq("alert_key", key).maybeSingle();
    if (!error) {
      const m = (data?.meta ?? null) as Partial<Row> | null;
      return m && Array.isArray(m.fails) ? { fails: m.fails.filter((n) => typeof n === "number"), until: Number(m.until) || 0 } : { fails: [], until: 0 };
    }
  } catch {
    /* cae a memoria */
  }
  return mem.get(key) ?? { fails: [], until: 0 };
}

async function save(key: string, row: Row): Promise<void> {
  mem.set(key, row);
  try {
    const now = new Date().toISOString();
    await getSupabaseServerClient().from("ops_alerts").upsert(
      { alert_key: key, severity: "info", title: "bloqueo de login /ops", detail: "", event: true, status: "resolved", last_seen_at: now, notify_count: 1, meta: row },
      { onConflict: "alert_key" },
    );
  } catch {
    /* solo memoria */
  }
}

export type LockState = { locked: boolean; retryMin: number };

export async function checkLock(visitor: string): Promise<LockState> {
  const now = Date.now();
  const [v, g] = await Promise.all([load(`_lock:ip:${visitor}`), load("_lock:global")]);
  const until = Math.max(v.until, g.until);
  return until > now ? { locked: true, retryMin: Math.max(1, Math.ceil((until - now) / MIN)) } : { locked: false, retryMin: 0 };
}

export async function recordFail(visitor: string): Promise<LockState> {
  const now = Date.now();
  const kv = `_lock:ip:${visitor}`;
  const [v, g] = await Promise.all([load(kv), load("_lock:global")]);
  const vf = [...v.fails.filter((t) => now - t < 15 * MIN), now];
  const gf = [...g.fails.filter((t) => now - t < 60 * MIN), now];
  const vUntil = vf.length >= 10 ? now + 30 * MIN : vf.length >= 5 ? now + 5 * MIN : v.until;
  const gUntil = gf.length >= 30 ? now + 15 * MIN : g.until;
  await Promise.all([save(kv, { fails: vf, until: vUntil }), save("_lock:global", { fails: gf, until: gUntil })]);
  const until = Math.max(vUntil, gUntil);
  return until > now ? { locked: true, retryMin: Math.max(1, Math.ceil((until - now) / MIN)) } : { locked: false, retryMin: 0 };
}

export async function recordSuccess(visitor: string): Promise<void> {
  await save(`_lock:ip:${visitor}`, { fails: [], until: 0 });
}
