"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function NavigationHeader({
  navigation,
  clientUrl,
}: {
  navigation: { label: string; href: string }[];
  clientUrl: string | null;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const desktopRef = useRef<HTMLElement>(null);
  function close() {
    setOpen(false);
    toggleRef.current?.focus();
  }
  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLElement>("a")?.focus();
    function keydown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    }
    function resize() {
      if (window.innerWidth >= 1100) {
        const hadFocus = panelRef.current?.contains(document.activeElement);
        setOpen(false);
        if (hadFocus)
          desktopRef.current?.querySelector<HTMLElement>("a")?.focus();
      }
    }
    window.addEventListener("resize", resize);
    document.addEventListener("keydown", keydown);
    return () => {
      window.removeEventListener("resize", resize);
      document.removeEventListener("keydown", keydown);
    };
  }, [open]);
  function current(href: string) {
    return href === "/"
      ? pathname === "/"
      : href === "/casos"
        ? pathname.startsWith("/proyectos")
        : pathname.startsWith(href);
  }
  return (
    <>
      <a href="#contenido" className="skip-link">
        Saltar al contenido
      </a>
      <header className="site-header">
        <div className="header-inner">
          <Link
            href="/"
            className="brand-link"
            aria-label="Atacama Labs · Inicio"
          >
            <Image
              src="/brand/logo-horizontal.svg"
              alt="Atacama Labs"
              width={196}
              height={39}
            />
          </Link>
          <nav ref={desktopRef} aria-label="Principal" className="desktop-nav">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={current(item.href) ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="header-actions">
            {clientUrl && (
              <a href={clientUrl} className="client-access">
                Acceso clientes
              </a>
            )}
            <Link href="/contacto" className="header-cta">
              Conversemos <span aria-hidden>→</span>
            </Link>
            <button
              ref={toggleRef}
              type="button"
              aria-expanded={open}
              aria-controls="mobile-nav"
              aria-label={open ? "Cerrar menú" : "Abrir menú"}
              onClick={() => setOpen(!open)}
              className="menu-toggle"
            >
              <span aria-hidden>{open ? "×" : "☰"}</span>
            </button>
          </div>
        </div>
        {open && (
          <div id="mobile-nav" ref={panelRef} className="mobile-nav">
            <nav aria-label="Principal móvil">
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={current(item.href) ? "page" : undefined}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <Link href="/contacto" onClick={() => setOpen(false)}>
                Contacto
              </Link>
              {clientUrl && <a href={clientUrl}>Acceso clientes</a>}
              <button type="button" onClick={close}>
                Cerrar menú ×
              </button>
            </nav>
          </div>
        )}
      </header>
    </>
  );
}
