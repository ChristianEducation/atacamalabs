"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { login, type LoginState } from "./actions";

export function LoginForm() {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(true);
  const [shake, setShake] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastSent = useRef("");

  // PIN incorrecto o bloqueo: se limpia, se vuelve a enfocar y las casillas «tiemblan» un instante.
  const attempt = async (prev: LoginState, form: FormData): Promise<LoginState> => {
    const r = await login(prev, form);
    if (r?.error) {
      lastSent.current = "";
      setValue("");
      setShake((n) => n + 1);
      inputRef.current?.focus();
    }
    return r;
  };
  const [state, action, pending] = useActionState<LoginState, FormData>(attempt, null);

  // Al completar los 6 dígitos se intenta entrar solo (un mismo PIN no se envía dos veces).
  useEffect(() => {
    if (value.length === 6 && !pending && lastSent.current !== value) {
      lastSent.current = value;
      formRef.current?.requestSubmit();
    }
  }, [value, pending]);

  return (
    <form ref={formRef} action={action} className="ops-pin-form" onClick={() => inputRef.current?.focus()}>
      <label htmlFor="ops-pin" className="ops-sr">PIN de 6 dígitos</label>
      <div className={state?.error ? "ops-pin ops-pin-err" : "ops-pin"} key={shake} aria-hidden="true">
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i} className={i === value.length && focused && !pending ? "ops-pin-cell ops-pin-cell-on" : "ops-pin-cell"}>
            {i < value.length ? <i /> : null}
          </span>
        ))}
      </div>
      <input
        ref={inputRef}
        id="ops-pin"
        name="pin"
        type="password"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="go"
        maxLength={6}
        autoFocus
        required
        value={value}
        onChange={(e) => setValue(e.target.value.replace(/\D/g, "").slice(0, 6))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="ops-pin-input"
        data-1p-ignore="true"
        data-lpignore="true"
        data-form-type="other"
      />
      <p className="ops-pin-msg" role="status" aria-live="polite">
        {pending ? "Verificando…" : state?.error ?? "\u00a0"}
      </p>
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
