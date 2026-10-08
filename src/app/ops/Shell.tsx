"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { logout } from "./actions";
import { VIEWS, type ViewId } from "./views";

/* ---- avisos breves (resultado de aprobar/rechazar; sobreviven al refresco de datos) ---- */
type Toast = { id: number; ok: boolean; text: string };
const ToastCtx = createContext<(ok: boolean, text: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

function Brand() {
  return (
    <span className="ops-brand">
      <strong>Atacama OS</strong>
      <span className="ops-on" title="Atacama OS está operando">ON</span>
    </span>
  );
}

function Nav({ view, badges, onPick }: { view: ViewId; badges: Partial<Record<ViewId, number>>; onPick?: () => void }) {
  return (
    <nav className="ops-nav" aria-label="Secciones de Atacama OS">
      {VIEWS.map((v) => {
        const n = badges[v.id] ?? 0;
        const active = v.id === view;
        return (
          <Link key={v.id} href={`/ops?view=${v.id}`} scroll={false} className={active ? "ops-nav-a ops-nav-on" : "ops-nav-a"} aria-current={active ? "page" : undefined} onClick={onPick}>
            <span>{v.label}</span>
            {n > 0 ? <span className="ops-badge" aria-label={`${n} pendientes`}>{n}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}

/** Marco de /ops: barra lateral en escritorio; barra superior + menú (hamburguesa) en celular. */
export function Shell({ view, badges, children }: { view: ViewId; badges: Partial<Record<ViewId, number>>; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const burger = useRef<HTMLButtonElement>(null);
  const drawer = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => { setOpen(false); burger.current?.focus(); }, []);
  const push = useCallback((ok: boolean, text: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-3), { id, ok, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), ok ? 6000 : 12000);
  }, []);

  // Menú abierto: bloquea el scroll del fondo, mueve el foco adentro, atrapa Tab y se cierra con Escape.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); close(); return; }
      if (e.key !== "Tab" || !drawer.current) return;
      const f = Array.from(drawer.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"));
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; document.removeEventListener("keydown", onKey); };
  }, [open, close]);

  // Si la ventana pasa a escritorio con el menú abierto, se cierra (no queda el scroll bloqueado).
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 900px)");
    const h = () => { if (mq.matches) setOpen(false); };
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);

  return (
    <ToastCtx.Provider value={push}>
      <div className="ops-app">
        <aside className="ops-side" aria-label="Navegación">
          <Brand />
          <Nav view={view} badges={badges} />
          <form action={logout} className="ops-side-foot"><button className="ops-link" type="submit">Salir</button></form>
        </aside>

        <header className="ops-bar">
          <Brand />
          <button ref={burger} type="button" className="ops-burger" aria-label="Abrir menú" aria-expanded={open} aria-controls="ops-drawer" onClick={() => setOpen(true)}>
            <span aria-hidden="true" />
          </button>
        </header>

        {open ? <div className="ops-overlay" onClick={close} aria-hidden="true" /> : null}
        <div id="ops-drawer" ref={drawer} className={open ? "ops-drawer ops-drawer-open" : "ops-drawer"} role="dialog" aria-modal="true" aria-label="Menú de Atacama OS" hidden={!open}>
          <div className="ops-drawer-h">
            <Brand />
            <button ref={closeBtn} type="button" className="ops-close" aria-label="Cerrar menú" onClick={close}>×</button>
          </div>
          <Nav view={view} badges={badges} onPick={() => setOpen(false)} />
          <form action={logout} className="ops-side-foot"><button className="ops-link" type="submit">Salir</button></form>
        </div>

        <main className="ops-main" id="ops-main">{children}</main>

        <div className="ops-toasts" role="status" aria-live="polite">
          {toasts.map((t) => (<p key={t.id} className={t.ok ? "ops-toast ops-toast-ok" : "ops-toast ops-toast-err"}>{t.text}</p>))}
        </div>
      </div>
    </ToastCtx.Provider>
  );
}
