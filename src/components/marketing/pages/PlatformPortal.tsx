"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Bot, CreditCard, Inbox, Plug, Timer, Users, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlatformInbox } from "./PlatformInbox";
import { AgentsView, AutomationsView, ConsumptionView, ContactsView, IntegrationsView } from "./PlatformViews";
import { PLATFORM_COMPANY, PORTAL_CAPTIONS, PORTAL_TABS, type PortalTabId } from "@/content/marketing/platform";

const ICONS: Record<PortalTabId, LucideIcon> = {
  agentes: Bot,
  bandeja: Inbox,
  contactos: Users,
  automatizaciones: Timer,
  integraciones: Plug,
  consumo: CreditCard,
};

const VIEWS: Record<PortalTabId, ReactNode> = {
  agentes: <AgentsView />,
  bandeja: <PlatformInbox />,
  contactos: <ContactsView />,
  automatizaciones: <AutomationsView />,
  integraciones: <IntegrationsView />,
  consumo: <ConsumptionView />,
};

/** Marco del portal: barra superior con la empresa y un pulso de «en vivo». */
export function PortalChrome({ children, large }: { children: ReactNode; large?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);

  // Las animaciones de entrada corren una sola vez, cuando el marco llega a la pantalla.
  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setSeen(true);
        observer.disconnect();
      },
      { threshold: 0.25 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={cn("mk-pf", large && "mk-pf--lg")} data-seen={seen ? "true" : undefined}>
      <div className="mk-pf__bar">
        <span className="mk-pf__brand">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
            <path d="M2 19 9.5 6l4 6.6L16 9l6 10z" fill="currentColor" />
          </svg>
          Plataforma Atacama Labs
        </span>
        <span className="mk-pf__company">{PLATFORM_COMPANY}</span>
        <span className="mk-pf__live">
          <i aria-hidden /> En operación
        </span>
      </div>
      {children}
    </div>
  );
}

/**
 * Demo principal de /plataforma (PLATAFORMA_SPEC_V1 §3): un solo portal con seis
 * vistas. En escritorio, barra lateral + contenido; en pantallas angostas las
 * pestañas pasan a píldoras horizontales y cada vista se reorganiza en columna.
 * Cambiar de pestaña nunca navega: solo cambia la vista dentro del mismo marco.
 */
export function PlatformPortal() {
  const [active, setActive] = useState<PortalTabId>("agentes");
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const move = (event: KeyboardEvent, index: number) => {
    const keys: Record<string, number> = {
      ArrowRight: 1,
      ArrowDown: 1,
      ArrowLeft: -1,
      ArrowUp: -1,
    };
    let next = index;
    if (event.key in keys) next = (index + keys[event.key] + PORTAL_TABS.length) % PORTAL_TABS.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = PORTAL_TABS.length - 1;
    else return;
    event.preventDefault();
    setActive(PORTAL_TABS[next].id);
    tabRefs.current[PORTAL_TABS[next].id]?.focus();
  };

  return (
    <PortalChrome>
      <div className="mk-pf__body">
        <div className="mk-pf__nav" role="tablist" aria-label="Vistas de la plataforma" aria-orientation="vertical">
          {PORTAL_TABS.map((tab, index) => {
            const Icon = ICONS[tab.id];
            return (
              <button
                key={tab.id}
                ref={(node) => {
                  tabRefs.current[tab.id] = node;
                }}
                type="button"
                role="tab"
                id={`portal-tab-${tab.id}`}
                aria-selected={active === tab.id}
                aria-controls="portal-panel"
                tabIndex={active === tab.id ? 0 : -1}
                className="mk-pf__tab"
                onClick={(event) => {
                  setActive(tab.id);
                  event.currentTarget.scrollIntoView({
                    inline: "center",
                    block: "nearest",
                    behavior: "smooth",
                  });
                }}
                onKeyDown={(event) => move(event, index)}
              >
                <Icon size={17} strokeWidth={1.9} aria-hidden />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
        <div className="mk-pf__view" id="portal-panel" role="tabpanel" aria-labelledby={`portal-tab-${active}`}>
          <div className="mk-pf__panel" key={active}>
            {VIEWS[active]}
          </div>
          <p className="mk-pf__caption" key={`${active}-caption`}>
            {PORTAL_CAPTIONS[active]}
          </p>
        </div>
      </div>
    </PortalChrome>
  );
}
