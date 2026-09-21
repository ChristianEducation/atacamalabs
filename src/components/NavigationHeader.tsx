"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";

/**
 * Puerto de components/templates/usd-halo/navbar.tsx — misma estructura
 * (logo | links centrados | CTA píldora), gramática Tailwind inline en vez
 * de las clases .site-header/.header-inner previas (ver docs/HALO-FASE0-MAP.md).
 * Lógica funcional preservada 1:1: menú móvil, foco al abrir, Escape cierra,
 * aria-current, "Acceso clientes" condicional.
 *
 * `overlay`: Home (Fase 1) la usa `absolute` y transparente sobre el hero,
 * tal como Halo. El resto de las rutas (todavía sin su propio hero Halo)
 * usa el modo sólido por defecto para no quedar con contenido tapado.
 */
export function NavigationHeader({
  navigation,
  clientUrl,
  overlay = false,
}: {
  navigation: { label: string; href: string }[];
  clientUrl: string | null;
  overlay?: boolean;
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
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  }

  return (
    <>
      <a href="#contenido" className="skip-link">
        Saltar al contenido
      </a>
      <header
        className={
          overlay
            ? "absolute inset-x-0 top-0 z-20 px-4 py-5 sm:px-6"
            : "relative z-20 border-b border-border/60 bg-background px-4 py-5 sm:px-6"
        }
      >
        <div className="mx-auto flex max-w-[88rem] items-center justify-between gap-6">
          <Link href="/" aria-label="Atacama Labs · Inicio" className="shrink-0">
            <Image
              src="/brand/logo-horizontal.svg"
              alt="Atacama Labs"
              width={168}
              height={34}
              priority
            />
          </Link>

          <nav
            ref={desktopRef}
            aria-label="Principal"
            className="hidden items-center gap-8 md:flex"
          >
            {navigation
              .filter((item) => item.href !== "/")
              .map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={current(item.href) ? "page" : undefined}
                  className="text-base font-medium text-ink/80 transition-colors duration-200 hover:text-ink aria-[current=page]:text-ink"
                >
                  {item.label}
                </Link>
              ))}
          </nav>

          <div className="flex items-center gap-3">
            {clientUrl && (
              <a
                href={clientUrl}
                className="hidden text-base font-medium text-ink/80 transition-colors duration-200 hover:text-ink sm:inline-block"
              >
                Acceso clientes
              </a>
            )}
            <Link
              href="/contacto"
              aria-current={pathname === "/contacto" ? "page" : undefined}
              className="hidden rounded-full bg-ink px-7 py-2.5 text-base font-medium text-background transition-colors duration-200 hover:bg-action-hover sm:inline-block"
            >
              Conversemos
            </Link>

            <button
              ref={toggleRef}
              type="button"
              aria-expanded={open}
              aria-controls="mobile-nav"
              aria-label={open ? "Cerrar menú" : "Abrir menú"}
              onClick={() => setOpen(!open)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-ink/20 text-ink md:hidden"
            >
              {open ? (
                <X className="h-5 w-5" aria-hidden />
              ) : (
                <Menu className="h-5 w-5" aria-hidden />
              )}
            </button>
          </div>
        </div>

        {open && (
          <div
            id="mobile-nav"
            ref={panelRef}
            className="mx-auto mt-4 max-w-[88rem] rounded-2xl border border-border/60 bg-background px-4 py-4 md:hidden"
          >
            <nav aria-label="Principal móvil" className="flex flex-col gap-1">
              {navigation
                .filter((item) => item.href !== "/")
                .map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={current(item.href) ? "page" : undefined}
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-2 py-3 text-base font-medium text-ink hover:bg-surface-warm"
                  >
                    {item.label}
                  </Link>
                ))}
              <Link
                href="/contacto"
                aria-current={pathname === "/contacto" ? "page" : undefined}
                onClick={() => setOpen(false)}
                className="mt-2 rounded-full bg-ink px-2 py-3 text-center text-base font-medium text-background"
              >
                Conversemos
              </Link>
              {clientUrl && (
                <a href={clientUrl} className="rounded-lg px-2 py-3 text-base font-medium text-ink hover:bg-surface-warm">
                  Acceso clientes
                </a>
              )}
              <button
                type="button"
                onClick={close}
                className="mt-2 rounded-lg px-2 py-3 text-left text-sm text-ink/60"
              >
                Cerrar menú
              </button>
            </nav>
          </div>
        )}
      </header>
    </>
  );
}
