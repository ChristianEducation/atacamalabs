"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { setGlobalPause } from "../motion/coordinator";
import {
  BRAND,
  INDUSTRIES,
  NAV_TOP,
  SERVICES,
  SERVICE_ROUTES,
} from "@/content/marketing/nav";

type Panel = "services" | "industries" | null;

/**
 * N1 Header global. Desktop ≥1200: sticky 80px, wordmark | nav | CTA, dos
 * dropdowns (Servicios 560px, Rubros 640px) que se abren por clic/Enter/Espacio,
 * nunca por hover. <1200: barra de 64px + diálogo modal con trap de foco, fondo
 * inert, scroll bloqueado. Sin JS: la navegación queda en <noscript>.
 */
export function Header({ portalUrl }: { portalUrl: string | null }) {
  const pathname = usePathname() ?? "/";
  const [panel, setPanel] = useState<Panel>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [scrolled, setScrolled] = useState(false);
  const servicesBtn = useRef<HTMLButtonElement>(null);
  const industriesBtn = useRef<HTMLButtonElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  const routeActive = (href: string) => (href === "/" ? pathname === "/" : pathname === href);
  const servicesActive = SERVICE_ROUTES.includes(pathname);
  const industriesActive = pathname.startsWith("/rubros");

  const closeMobile = useCallback((restoreFocus: boolean) => {
    setMobileOpen(false);
    if (restoreFocus) toggleRef.current?.focus();
  }, []);

  // Estado top/scrolled sin cambiar la caja.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Cerrar dropdowns con clic fuera / Escape.
  useEffect(() => {
    if (!panel) return;
    const onPointer = (event: MouseEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) setPanel(null);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        const btn = panel === "services" ? servicesBtn.current : industriesBtn.current;
        setPanel(null);
        btn?.focus();
      }
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [panel]);

  // Menú móvil: bloqueo de scroll, inert del contenido, pausa de demos, trap de foco.
  useEffect(() => {
    if (!mobileOpen) return;
    const page = document.getElementById("mk-page");
    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    page?.setAttribute("inert", "");
    setGlobalPause("menu", true);
    const focusTimer = window.setTimeout(() => closeRef.current?.focus(), 0);

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMobile(true);
        return;
      }
      if (event.key !== "Tab") return;
      const focusables = dialogRef.current?.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
      if (!focusables || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    const onResize = () => {
      if (window.innerWidth >= 1200) closeMobile(false);
    };
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      document.documentElement.style.overflow = prevOverflow;
      page?.removeAttribute("inert");
      setGlobalPause("menu", false);
    };
  }, [mobileOpen, closeMobile]);

  const navLink = (href: string, label: string) => (
    <Link
      href={href}
      className="mk-nav__link"
      aria-current={routeActive(href) ? "page" : undefined}
      onClick={() => setPanel(null)}
    >
      {label}
    </Link>
  );

  return (
    <header ref={headerRef} className={cn("mk-header", scrolled && "is-scrolled")}>
      <div className="mk-container mk-header__inner">
        <Link href="/" className="mk-wordmark" aria-label="Atacama Labs — inicio">
          {BRAND.wordmark}
        </Link>

        <nav className="mk-nav" aria-label="Principal">
          {navLink(NAV_TOP.platform.href, NAV_TOP.platform.label)}
          {navLink(NAV_TOP.agents.href, NAV_TOP.agents.label)}

          <div className="mk-nav__group">
            <button
              ref={servicesBtn}
              type="button"
              className={cn("mk-nav__link mk-nav__button", servicesActive && "is-group-active")}
              aria-expanded={panel === "services"}
              aria-controls="mk-services-panel"
              onClick={() => setPanel((p) => (p === "services" ? null : "services"))}
            >
              {NAV_TOP.services.label}
              <ChevronDown size={16} aria-hidden />
            </button>
            {panel === "services" ? (
              <div id="mk-services-panel" className="mk-dropdown mk-dropdown--services">
                <ul className="mk-dropdown__grid">
                  {SERVICES.map((service) => (
                    <li key={service.id}>
                      <Link
                        href={service.href}
                        className="mk-dropdown__link"
                        aria-current={routeActive(service.href) ? "page" : undefined}
                        onClick={() => setPanel(null)}
                      >
                        <span className="mk-dropdown__title">{service.label}</span>
                        <span className="mk-dropdown__blurb">{service.blurb}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <div className="mk-nav__group mk-nav__split">
            <Link
              href={NAV_TOP.industries.href}
              className={cn("mk-nav__link", industriesActive && "is-group-active")}
              aria-current={pathname === "/rubros" ? "page" : undefined}
              onClick={() => setPanel(null)}
            >
              {NAV_TOP.industries.label}
            </Link>
            <button
              ref={industriesBtn}
              type="button"
              className="mk-nav__chev"
              aria-expanded={panel === "industries"}
              aria-controls="mk-industries-panel"
              aria-label="Abrir lista de rubros"
              onClick={() => setPanel((p) => (p === "industries" ? null : "industries"))}
            >
              <ChevronDown size={16} aria-hidden />
            </button>
            {panel === "industries" ? (
              <div id="mk-industries-panel" className="mk-dropdown mk-dropdown--industries">
                <ul className="mk-dropdown__cols">
                  {INDUSTRIES.map((industry) => (
                    <li key={industry.id}>
                      <Link
                        href={industry.href}
                        className="mk-dropdown__plain"
                        aria-current={pathname === industry.href ? "page" : undefined}
                        onClick={() => setPanel(null)}
                      >
                        {industry.label}
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link href="/rubros" className="mk-dropdown__all" onClick={() => setPanel(null)}>
                  Ver todos los rubros
                </Link>
              </div>
            ) : null}
          </div>

          {navLink(NAV_TOP.about.href, NAV_TOP.about.label)}
          {navLink(NAV_TOP.pricing.href, NAV_TOP.pricing.label)}
        </nav>

        <div className="mk-header__actions">
          <Link href={NAV_TOP.cta.href} className="mk-btn mk-btn--primary mk-btn--sm mk-header__cta">
            {NAV_TOP.cta.label}
          </Link>
          <button
            ref={toggleRef}
            type="button"
            className="mk-menu-btn"
            aria-expanded={mobileOpen}
            aria-controls="mk-mobile-menu"
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={22} aria-hidden />
            <span className="mk-sr-only">Abrir menú</span>
          </button>
        </div>
      </div>

      <noscript>
        <nav className="mk-nojs" aria-label="Principal (sin JavaScript)">
          <Link href="/plataforma">Plataforma</Link>
          <Link href="/agentes">Agentes</Link>
          {SERVICES.filter((s) => s.id !== "agentes").map((s) => (
            <Link key={s.id} href={s.href}>
              {s.label}
            </Link>
          ))}
          <Link href="/rubros">Rubros</Link>
          <Link href="/nosotros">Conócenos</Link>
          <Link href="/precios">Precios</Link>
          <Link href="/diagnostico">Agendar diagnóstico</Link>
        </nav>
      </noscript>

      {mobileOpen ? (
        <div
          id="mk-mobile-menu"
          ref={dialogRef}
          className="mk-mobile"
          role="dialog"
          aria-modal="true"
          aria-label="Menú principal"
        >
          <div className="mk-mobile__bar">
            <button ref={closeRef} type="button" className="mk-menu-btn" onClick={() => closeMobile(true)}>
              <X size={22} aria-hidden />
              <span className="mk-sr-only">Cerrar menú</span>
            </button>
          </div>
          <nav aria-label="Menú móvil" className="mk-mobile__nav">
            <Link href="/plataforma" onClick={() => closeMobile(false)} aria-current={routeActive("/plataforma") ? "page" : undefined}>
              Plataforma
            </Link>
            <Link href="/agentes" onClick={() => closeMobile(false)} aria-current={routeActive("/agentes") ? "page" : undefined}>
              Agentes
            </Link>

            <div className="mk-mobile__group">
              <button
                type="button"
                aria-expanded={Boolean(expanded.services)}
                aria-controls="mk-m-services"
                onClick={() => setExpanded((e) => ({ ...e, services: !e.services }))}
              >
                Servicios <ChevronDown size={20} aria-hidden />
              </button>
              {expanded.services ? (
                <ul id="mk-m-services" className="mk-mobile__sub">
                  {SERVICES.map((s) => (
                    <li key={s.id}>
                      <Link href={s.href} onClick={() => closeMobile(false)} aria-current={routeActive(s.href) ? "page" : undefined}>
                        {s.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <div className="mk-mobile__group">
              <button
                type="button"
                aria-expanded={Boolean(expanded.industries)}
                aria-controls="mk-m-industries"
                onClick={() => setExpanded((e) => ({ ...e, industries: !e.industries }))}
              >
                Rubros <ChevronDown size={20} aria-hidden />
              </button>
              {expanded.industries ? (
                <ul id="mk-m-industries" className="mk-mobile__sub">
                  <li>
                    <Link href="/rubros" onClick={() => closeMobile(false)}>
                      Ver todos los rubros
                    </Link>
                  </li>
                  {INDUSTRIES.map((i) => (
                    <li key={i.id}>
                      <Link href={i.href} onClick={() => closeMobile(false)} aria-current={pathname === i.href ? "page" : undefined}>
                        {i.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <Link href="/nosotros" onClick={() => closeMobile(false)} aria-current={routeActive("/nosotros") ? "page" : undefined}>
              Conócenos
            </Link>
            <Link href="/precios" onClick={() => closeMobile(false)} aria-current={routeActive("/precios") ? "page" : undefined}>
              Precios
            </Link>
          </nav>
          <div className="mk-mobile__cta">
            <Link href="/diagnostico" className="mk-btn mk-btn--primary mk-btn--block" onClick={() => closeMobile(false)}>
              {NAV_TOP.cta.label}
            </Link>
            {portalUrl ? (
              <a href={portalUrl} className="mk-mobile__portal">
                Acceso clientes
              </a>
            ) : null}
          </div>
        </div>
      ) : null}
    </header>
  );
}
