"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { OPS_COOKIE, makeSession, opsConfigured, passwordMatches } from "@/lib/ops/auth";

export type LoginState = { error: string } | null;

export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  // Pausa fija: frena la fuerza bruta sin necesitar un almacén de intentos.
  await new Promise((r) => setTimeout(r, 900));
  if (!opsConfigured()) return { error: "El panel todavía no está configurado." };
  const pw = String(form.get("password") ?? "");
  if (!passwordMatches(pw)) return { error: "Contraseña incorrecta." };
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
