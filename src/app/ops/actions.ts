"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { OPS_COOKIE, makeSession, opsConfigured, pinMatches, visitorKey } from "@/lib/ops/auth";
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
