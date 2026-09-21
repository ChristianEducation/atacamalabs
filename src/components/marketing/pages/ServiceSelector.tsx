"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { ButtonLink } from "../ui/Button";
import { CapabilitySelector, selectorTabId } from "../ui/CapabilitySelector";
import { Reveal } from "../motion/Reveal";
import { useReducedMotion } from "../motion/reduced-motion";
import { AgentsDemo, CollectionsDemo, CommercialDemo } from "../demos/ScenarioDemos";
import {
  HOME_SERVICES,
  HOME_SERVICES_HEADING,
  serviceFromHash,
  type HomeServiceId,
} from "@/content/marketing/home";

const Loading = () => (
  <div className="mk-demo-loading" role="status">
    Cargando el ejemplo…
  </div>
);

const FinanceDemo = dynamic(() => import("../demos/FinanceDemo").then((m) => m.FinanceDemo), { loading: Loading });
const BuilderDemo = dynamic(() => import("../demos/BuilderDemo").then((m) => m.BuilderDemo), { loading: Loading });
const WebDemo = dynamic(() => import("../demos/WebDemo").then((m) => m.WebDemo), { loading: Loading });

const ID_PREFIX = "home-services";
const PANEL_ID = "home-services-panel";

function Microdemo({ id, autoplay }: { id: HomeServiceId; autoplay: boolean }) {
  switch (id) {
    case "agentes":
      return <AgentsDemo instance="home" autoplay={autoplay} />;
    case "comercial":
      return <CommercialDemo instance="home" autoplay={autoplay} />;
    case "cobranza":
      return <CollectionsDemo instance="home" autoplay={autoplay} />;
    case "admin-finance":
      return <FinanceDemo selector={false} initial="factura-pendiente" autoplay={autoplay} />;
    case "custom":
      return <BuilderDemo phaseMs={720} compact showCta={false} />;
    case "websites":
      return <WebDemo initial="ecommerce" compact />;
  }
}

/**
 * F3 — selector principal de SEIS servicios. Cambiar de servicio cambia copy +
 * beneficios + CTA + microinterfaz completa (M03: 120 ms de salida + 220 ms de
 * entrada, última selección gana, timers cancelados). Sin autoplay entre
 * servicios; el servicio elegido por el visitante se ejecuta una vez.
 */
export function ServiceSelector() {
  const reduced = useReducedMotion();
  const [value, setValue] = useState<HomeServiceId>("agentes");
  const [shown, setShown] = useState<HomeServiceId>("agentes");
  const [fading, setFading] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const apply = () => {
      const id = serviceFromHash(window.location.hash);
      setValue(id);
      setShown(id);
    };
    const frame = requestAnimationFrame(() => {
      if (window.location.hash.startsWith("#servicio-")) apply();
    });
    window.addEventListener("hashchange", apply);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", apply);
      window.clearTimeout(timer.current);
    };
  }, []);

  function select(id: string) {
    const next = id as HomeServiceId;
    if (next === value) return;
    setValue(next);
    window.clearTimeout(timer.current);
    if (reduced) {
      setFading(false);
      setShown(next);
      return;
    }
    setFading(true);
    timer.current = window.setTimeout(() => {
      setShown(next);
      setFading(false);
    }, 120);
  }

  const service = HOME_SERVICES.find((s) => s.id === shown) ?? HOME_SERVICES[0];

  return (
    <section id="capacidades" className="mk-section mk-paper mk-services" aria-labelledby="services-title">
      <div className="mk-container">
        <Reveal className="mk-services__head">
          <p className="mk-eyebrow">{HOME_SERVICES_HEADING.eyebrow}</p>
          <h2 id="services-title" className="mk-h2">
            {HOME_SERVICES_HEADING.title}
          </h2>
          <p className="mk-services__rector">{HOME_SERVICES_HEADING.rector}</p>
          <p className="mk-lead">{HOME_SERVICES_HEADING.support}</p>
        </Reveal>

        <CapabilitySelector
          tabs={HOME_SERVICES.map((s) => ({ id: s.id, label: s.tab }))}
          value={value}
          onChange={select}
          panelId={PANEL_ID}
          idPrefix={ID_PREFIX}
          ariaLabel="Servicios de Atacama Labs"
        />

        <div
          id={PANEL_ID}
          role="tabpanel"
          aria-labelledby={selectorTabId(ID_PREFIX, shown)}
          className="mk-services__panel"
          data-fading={fading || undefined}
        >
          <div key={shown} className="mk-services__content">
            <div className="mk-services__copy">
              <h3 className="mk-h3">{service.tab}</h3>
              <p className="mk-services__message">{service.message}</p>
              <p className="mk-muted">{service.detail}</p>
              <ul className="mk-checks">
                {service.benefits.map((benefit) => (
                  <li key={benefit}>
                    <Check size={18} aria-hidden strokeWidth={2.2} />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
              <ButtonLink href={service.cta.href} arrow>
                {service.cta.label}
              </ButtonLink>
            </div>
            <div className="mk-services__demo">
              <Microdemo id={service.id} autoplay />
            </div>
          </div>
        </div>

        <p className="mk-services__note">{HOME_SERVICES_HEADING.note}</p>
      </div>
    </section>
  );
}
