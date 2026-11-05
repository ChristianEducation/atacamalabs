import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Acceso privado a /ops: un PIN numérico de 6 dígitos (OPS_PANEL_PASSWORD) y una cookie firmada con HMAC
 * (httpOnly, 14 días). Sin un PIN válido configurado el panel queda CERRADO (falla cerrado), nunca abierto.
 * El PIN nunca viaja al navegador ni se escribe en logs; la cookie se firma con un secreto de servidor de alta entropía
 * (no con el PIN, que solo tiene 1 millón de combinaciones) y cambiar el PIN invalida las sesiones.
 */
export const OPS_COOKIE = "atacama_ops";
export const PIN_LENGTH = 6;
const MAX_AGE_S = 14 * 24 * 3600;

function pin(): string | null {
  const p = (process.env.OPS_PANEL_PASSWORD ?? "").trim();
  return /^\d{6}$/.test(p) ? p : null;
}

function secret(): string | null {
  const p = pin();
  const base = process.env.OPS_PANEL_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.ATACAMA_INGEST_KEY;
  if (!p || !base) return null;
  return createHash("sha256").update(`ops-panel|${base}|${p}`).digest("hex");
}

function sign(payload: string, key: string): string {
  return createHmac("sha256", key).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function opsConfigured(): boolean {
  return secret() !== null;
}

export function pinMatches(input: string): boolean {
  const p = pin();
  if (!p || !/^\d{6}$/.test(input)) return false;
  // Se comparan los HMAC de ambos: tiempo constante y sin exponer el PIN.
  return safeEqual(sign(input, "cmp"), sign(p, "cmp"));
}

export function makeSession(): { value: string; maxAge: number } {
  const key = secret();
  if (!key) throw new Error("PIN de /ops no configurado");
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_S;
  return { value: `${exp}.${sign(String(exp), key)}`, maxAge: MAX_AGE_S };
}

export async function hasSession(): Promise<boolean> {
  const key = secret();
  if (!key) return false;
  const raw = (await cookies()).get(OPS_COOKIE)?.value;
  if (!raw) return false;
  const [exp, sig] = raw.split(".");
  if (!exp || !sig || !/^\d+$/.test(exp)) return false;
  if (Number(exp) < Math.floor(Date.now() / 1000)) return false;
  return safeEqual(sig, sign(exp, key));
}

/** Huella no reversible del visitante (para el bloqueo por intentos); nunca se guarda la IP en claro. */
export function visitorKey(ip: string): string {
  const key = secret() ?? "none";
  return createHash("sha256").update(`ip|${key}|${ip}`).digest("hex").slice(0, 20);
}
