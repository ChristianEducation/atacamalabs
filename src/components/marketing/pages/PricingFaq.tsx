"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { FAQ } from "../ui/Blocks";
import { FAQ_HEADING, FAQ_ITEMS, type FaqGroupId } from "@/content/marketing/pricing-page";

const GROUPS: readonly FaqGroupId[] = ["agentes", "web"];

/** FAQ de Precios: un selector de dos grupos (Agentes / Páginas Web) para no alargar la página. */
export function PricingFaq() {
  const [group, setGroup] = useState<FaqGroupId>("agentes");
  return (
    <div className="mk-pp-faq">
      <div className="mk-pp-faq__tabs" role="tablist" aria-label="Tema de las preguntas">
        {GROUPS.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`faq-tab-${id}`}
            aria-selected={group === id}
            aria-controls="faq-panel"
            className={cn("mk-pp-faq__tab")}
            onClick={() => setGroup(id)}
          >
            {FAQ_HEADING.tabs[id]}
          </button>
        ))}
      </div>
      <div id="faq-panel" role="tabpanel" aria-labelledby={`faq-tab-${group}`} className="mk-pp-faq__panel" key={group}>
        <FAQ items={FAQ_ITEMS[group]} />
      </div>
    </div>
  );
}
