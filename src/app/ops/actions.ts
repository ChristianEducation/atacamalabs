"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { OPS_COOKIE, hasSession, makeSession, opsConfigured, pinMatches, visitorKey } from "@/lib/ops/auth";
import { runAction } from "@/lib/ops/actions-client";
import { invalidatePanel } from "@/lib/ops/data";
import type { OpsActionInput, OpsActionState } from "@/lib/ops/types";
import { checkLock, recordFail, recordSuccess } from "@/lib/ops/lock";

export type LoginState = { error: string; locked?: boolean } | null;

export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  // Pausa fija: frena la fuerza bruta sin necesitar nada más.
  await new Promise((r) => setTimeout(r, 600));
  if (!opsConfigured()) return { error: "El acceso aún no está configurado." };
  const pin = String(form.get("pin") ?? "").replace(/\D/g, "");
  if (pin.length !== 6) return { error: "Ingresa los 6 dígitos." };

  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "desconocida";
  const visitor = visitorKey(ip);

  const lock = await checkLock(visitor);
  if (lock.locked) return { error: `Demasiados intentos. Espera ${lock.retryMin} min.`, locked: true };

  if (!pinMatches(pin)) {
    const after = await recordFail(visitor);
    return after.locked ? { error: `Demasiados intentos. Espera ${after.retryMin} min.`, locked: true } : { error: "PIN incorrecto." };
  }

  await recordSuccess(visitor);
  const s = makeSession();
  (await cookies()).set(OPS_COOKIE, s.value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax", // lax: el enlace que llega desde Telegram es navegación entre sitios y debe conservar la sesión
    path: "/ops",
    maxAge: s.maxAge,
  });
  redirect("/ops");
}

export async function logout(): Promise<void> {
  (await cookies()).delete({ name: OPS_COOKIE, path: "/ops" });
  redirect("/ops");
}

/** Tope de seguridad: un celular no hace más de ~40 acciones por minuto (frena bucles y toques accidentales repetidos). */
const recent: number[] = [];

/**
 * Aprobar / editar / rechazar desde /ops. Cada llamada exige la sesión privada (cookie firmada); la sesión + el clic explícito son la
 * aprobación humana válida (no se pide un segundo código). El servidor de Next.js habla con n8n «29 Ops Actions» con una clave exclusiva
 * que el navegador nunca ve; allí se reutilizan las rutas reales (Outreach Engine, LinkedIn Engine, GHL Social Planner) y se audita.
 * Los server actions de Next.js además verifican que el origen sea el mismo sitio.
 */
export async function opsAct(input: OpsActionInput): Promise<OpsActionState> {
  if (!(await hasSession())) return { ok: false, message: "Tu sesión venció. Vuelve a ingresar el PIN." };
  const now = Date.now();
  while (recent.length && now - recent[0] > 60_000) recent.shift();
  if (recent.length >= 40) return { ok: false, message: "Demasiadas acciones seguidas. Espera un minuto." };
  recent.push(now);
  const r = await runAction(input);
  invalidatePanel();
  revalidatePath("/ops");
  return r;
}
