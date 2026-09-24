"use client";

import { useState, type CSSProperties } from "react";
import { Check, Gauge, LayoutTemplate, Plus, Repeat, Rocket, Server, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { RECEIPT } from "@/content/marketing/pricing-page";

type Tab = "agentes" | "web";

const ICONS: Record<string, LucideIcon> = {
  implementacion: Rocket,
  mensual: Repeat,
  consumo: Gauge,
  desarrollo: LayoutTemplate,
  hosting: Server,
  extras: Plus,
};

/**
 * Visual del hero de /precios: «la boleta». Explica cómo se compone un plan en
 * tres líneas (una vez, cada mes, según uso) sin repetir cifras de las
 * tarjetas. Un selector cambia entre Agentes y Páginas Web; las líneas entran
 * escalonadas al abrir y al cambiar.
 */
export function PricingReceipt() {
  const [tab, setTab] = useState<Tab>("agentes");
  const data = RECEIPT[tab];

  return (
    <div className="mk-pp-rc">
      <div className="mk-pp-rc__grid" aria-hidden />
      <div className="mk-pp-rc__card">
        <div className="mk-pp-rc__head">
          <p className="mk-pp-rc__title">{RECEIPT.title}</p>
          <div className="mk-pp-rc__tabs" role="tablist" aria-label="Tipo de servicio">
            {(["agentes", "web"] as const).map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                className="mk-pp-rc__tab"
                onClick={() => setTab(id)}
              >
                {RECEIPT.tabs[id]}
              </button>
            ))}
          </div>
        </div>

        <ol className="mk-pp-rc__lines" key={tab}>
          {data.lines.map((line, index) => {
            const Icon = ICONS[line.id];
            return (
              <li key={line.id} style={{ ["--i" as string]: index } as CSSProperties}>
                <span className={cn("mk-pp-rc__ic", `is-${index}`)}>
                  <Icon size={20} strokeWidth={1.8} aria-hidden />
                </span>
                <span className="mk-pp-rc__txt">
                  <strong>{line.title}</strong>
                  <small>{line.body}</small>
                </span>
                <em className="mk-pp-rc__tag">{line.tag}</em>
              </li>
            );
          })}
        </ol>

        <p className="mk-pp-rc__foot" key={`${tab}-foot`}>
          <Check size={16} strokeWidth={2.6} aria-hidden />
          {data.foot}
        </p>
      </div>
    </div>
  );
}
