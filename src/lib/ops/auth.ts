import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Acceso privado a /ops: una contraseña (OPS_PANEL_PASSWORD) y una cookie firmada con HMAC (httpOnly, 14 días).
 * Sin OPS_PANEL_PASSWORD el panel queda cerrado (falla cerrado), nunca abierto.
 */
export const OPS_COOKIE = "atacama_ops";
const MAX_AGE_S = 14 * 24 * 3600;

function secret(): string | null {
  const pw = process.env.OPS_PANEL_PASSWORD;
  if (!pw || pw.length < 8) return null;
  return process.env.OPS_PANEL_SECRET || `ops-panel:${pw}`;
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

export function passwordMatches(input: string): boolean {
  const pw = process.env.OPS_PANEL_PASSWORD;
  if (!pw || pw.length < 8) return false;
  // Se compara el HMAC de ambos para que el tiempo no dependa del largo ni del contenido.
  return safeEqual(sign(input, "cmp"), sign(pw, "cmp"));
}

export function makeSession(): { value: string; maxAge: number } {
  const key = secret();
  if (!key) throw new Error("OPS_PANEL_PASSWORD no configurada");
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
