"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { diagnosticHref, sourceFromPath } from "@/lib/marketing/cta-context";
import { setGlobalPause } from "../motion/coordinator";
import { MINIS, ServicesPanel } from "./ServicesPanel";
import { NAV_TOP, SERVICES_MENU } from "@/content/marketing/nav";

const step = (index: number): CSSProperties => ({ ["--i" as string]: index });

/**
 * Header global (spec V3.0 §3.1). Desktop ≥1200: sticky, wordmark | nav | CTA,
 * un único dropdown «Servicios» (A Medida, Páginas Web) que se abre por
 * clic/Enter/Espacio, nunca por hover. <1200: barra + diálogo modal con trap
 * de foco, fondo inert, scroll bloqueado. Sin JS: la navegación va en <noscript>.
 */
export function Header({ portalUrl }: { portalUrl: string | null }) {
  const pathname = usePathname() ?? "/";
  // El CTA del header conserva la página de origen (spec final §7.1).
  const cta = {
    label: "Agendar diagnóstico",
    href: diagnosticHref({
      source_page: sourceFromPath(pathname),
      source_section: "header",
      source_cta: "agendar-diagnostico",
      service: "general",
    }),
  };
  const [servicesOpen, setServicesOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [servicesExpandedMobile, setServicesExpandedMobile] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const servicesBtn = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<number | null>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  const routeActive = (href: string) => (href === "/" ? pathname === "/" : pathname === href);
  const servicesActive = SERVICES_MENU.some((s) => pathname === s.href);

  const cancelClose = useCallback(() => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = null;
  }, []);

  /** Con mouse: al salir del botón y del panel, el menú se guarda solo (con una pequeña tolerancia). */
  const scheduleClose = useCallback(() => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setServicesOpen(false), 220);
  }, []);

  useEffect(() => cancelClose, [cancelClose]);

  const closeMobile = useCallback((restoreFocus: boolean) => {
    setMobileOpen(false);
    if (restoreFocus) toggleRef.current?.focus();
  }, []);

  const openMobile = () => {
    // Si ya estás dentro de un servicio, el submenú abre mostrando dónde estás.
    setServicesExpandedMobile(servicesActive);
    setMobileOpen(true);
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!servicesOpen) return;
    const onPointer = (event: MouseEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) setServicesOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setServicesOpen(false);
        servicesBtn.current?.focus();
      }
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [servicesOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const page = document.getElementById("mk-page");
    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    page?.setAttribute("inert", "");
    setGlobalPause("menu", true);

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMobile(true);
        return;
      }
      if (event.key !== "Tab") return;
      // El botón del header sigue visible sobre el panel: forma parte del ciclo de foco.
      const inside = dialogRef.current?.querySelectorAll<HTMLElement>(
        "a[href]:not([inert] *), button:not([disabled]):not([inert] *)",
      );
      if (!inside || inside.length === 0 || !toggleRef.current) return;
      const first = toggleRef.current;
      const last = inside[inside.length - 1];
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
      onClick={() => setServicesOpen(false)}
    >
      {label}
    </Link>
  );

  return (
    <header ref={headerRef} className={cn("mk-header", scrolled && "is-scrolled", mobileOpen && "is-menu-open")}>
      <div className="mk-container mk-header__inner">
        <Link href="/" className="mk-wordmark" aria-label="Atacama Labs — inicio">
          <Image src="/brand/logo-horizontal.svg" alt="Atacama Labs" width={1768} height={169} priority unoptimized />
        </Link>

        <nav className="mk-nav" aria-label="Principal">
          {navLink(NAV_TOP.platform.href, NAV_TOP.platform.label)}
          {navLink(NAV_TOP.agents.href, NAV_TOP.agents.label)}

          <div
            className="mk-nav__group"
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setServicesOpen(false);
            }}
          >
            <button
              ref={servicesBtn}
              type="button"
              className={cn("mk-nav__link mk-nav__button", servicesActive && "is-group-active")}
              aria-expanded={servicesOpen}
              aria-controls="mk-services-panel"
              onClick={() => setServicesOpen((v) => !v)}
            >
              {NAV_TOP.services.label}
              <ChevronDown size={16} aria-hidden />
            </button>
            {servicesOpen ? (
              <div id="mk-services-panel" className="mk-dropdown mk-dropdown--services">
                <ServicesPanel activePath={pathname} onNavigate={() => setServicesOpen(false)} />
              </div>
            ) : null}
          </div>

          {navLink(NAV_TOP.pricing.href, NAV_TOP.pricing.label)}
          {navLink(NAV_TOP.about.href, NAV_TOP.about.label)}
        </nav>

        <div className="mk-header__actions">
          <Link href={cta.href} className="mk-btn mk-btn--primary mk-btn--sm mk-header__cta">
            {cta.label}
          </Link>
          <button
            ref={toggleRef}
            type="button"
            className={cn("mk-menu-btn", mobileOpen && "is-open")}
            aria-expanded={mobileOpen}
            aria-controls="mk-mobile-menu"
            onClick={() => (mobileOpen ? closeMobile(false) : openMobile())}
          >
            <span className="mk-menu-btn__bars" aria-hidden>
              <i />
              <i />
            </span>
            <span className="mk-sr-only">{mobileOpen ? "Cerrar menú" : "Abrir menú"}</span>
          </button>
        </div>
      </div>

      <noscript>
        <nav className="mk-nojs" aria-label="Principal (sin JavaScript)">
          <Link href="/plataforma">Plataforma</Link>
          <Link href="/agentes">Agentes</Link>
          {SERVICES_MENU.map((s) => (
            <Link key={s.id} href={s.href}>
              {s.label}
            </Link>
          ))}
          <Link href="/precios">Precios</Link>
          <Link href="/conocenos">Conócenos</Link>
          <Link href="/diagnostico?source=noscript&section=header&cta=agendar-diagnostico">Agendar diagnóstico</Link>
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
          <nav aria-label="Menú móvil" className="mk-mobile__nav">
            <Link
              href="/plataforma"
              style={step(0)}
              onClick={() => closeMobile(false)}
              aria-current={routeActive("/plataforma") ? "page" : undefined}
            >
              Plataforma
              <ArrowRight size={18} aria-hidden />
            </Link>
            <Link
              href="/agentes"
              style={step(1)}
              onClick={() => closeMobile(false)}
              aria-current={routeActive("/agentes") ? "page" : undefined}
            >
              Agentes
              <ArrowRight size={18} aria-hidden />
            </Link>

            <div className={cn("mk-mobile__group", servicesExpandedMobile && "is-open")} style={step(2)}>
              <button
                type="button"
                aria-expanded={servicesExpandedMobile}
                aria-controls="mk-m-services"
                className={servicesActive ? "is-group-active" : undefined}
                onClick={() => setServicesExpandedMobile((v) => !v)}
              >
                Servicios <ChevronDown size={20} aria-hidden />
              </button>
              <div id="mk-m-services" className="mk-mobile__sub" inert={!servicesExpandedMobile}>
                <ul>
                  {SERVICES_MENU.map((s, index) => {
                    const Mini = MINIS[s.id];
                    return (
                      <li key={s.id} style={step(index)}>
                        <Link
                          href={s.href}
                          className="mk-mobile__card"
                          onClick={() => closeMobile(false)}
                          aria-current={routeActive(s.href) ? "page" : undefined}
                        >
                          <Mini />
                          <span className="mk-mobile__card-title">
                            {s.label}
                            <ArrowRight size={16} aria-hidden />
                          </span>
                          <span className="mk-mobile__blurb">{s.blurb}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>

            <Link
              href="/precios"
              style={step(3)}
              onClick={() => closeMobile(false)}
              aria-current={routeActive("/precios") ? "page" : undefined}
            >
              Precios
              <ArrowRight size={18} aria-hidden />
            </Link>
            <Link
              href="/conocenos"
              style={step(4)}
              onClick={() => closeMobile(false)}
              aria-current={routeActive("/conocenos") ? "page" : undefined}
            >
              Conócenos
              <ArrowRight size={18} aria-hidden />
            </Link>
          </nav>
          <div className="mk-mobile__cta" style={step(5)}>
            <Link href={cta.href} className="mk-btn mk-btn--primary mk-btn--block" onClick={() => closeMobile(false)}>
              {cta.label}
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
