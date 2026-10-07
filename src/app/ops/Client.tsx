"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { login, type LoginState } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, null);
  return (
    <form action={action} className="ops-login">
      <label htmlFor="ops-pw">Contraseña</label>
      <input id="ops-pw" name="password" type="password" autoComplete="current-password" required autoFocus />
      {state?.error ? <p role="alert" className="ops-login-err">{state.error}</p> : null}
      <button type="submit" disabled={pending}>{pending ? "Verificando…" : "Entrar"}</button>
    </form>
  );
}

function ago(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `hace ${s} s`;
  const m = Math.round(s / 60);
  return m < 60 ? `hace ${m} min` : `hace ${Math.round(m / 60)} h`;
}

/** Refresca los datos al volver a la pestaña y cada 45 s mientras está visible. */
export function Freshness({ fetchedAt, stale }: { fetchedAt: number; stale: boolean }) {
  const router = useRouter();
  const [now, setNow] = useState(fetchedAt);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const t1 = setInterval(tick, 5000);
    const t2 = setInterval(() => { if (document.visibilityState === "visible") router.refresh(); }, 45_000);
    const vis = () => { if (document.visibilityState === "visible") router.refresh(); };
    document.addEventListener("visibilitychange", vis);
    return () => { clearInterval(t1); clearInterval(t2); document.removeEventListener("visibilitychange", vis); };
  }, [router]);
  return (
    <span className={stale ? "ops-fresh ops-fresh-stale" : "ops-fresh"} aria-live="polite">
      {stale ? "Sin conexión con n8n · datos de " : "Actualizado "}
      {ago(now - fetchedAt)}
    </span>
  );
}
