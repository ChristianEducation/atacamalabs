import { Marquee, type MarqueeItem } from "./primitives";

/**
 * Puerto de components/templates/usd-halo/backed-by.tsx — misma estructura
 * (label a la izquierda + marquee ancho completo a la derecha), aplicado a
 * integraciones reales en vez de "backed by". 5 íconos reales pre-existentes
 * (public/visual/integrations/), 5 sumados en Fase 1 desde Simple Icons
 * (CC0, mismo origen que los 5 anteriores) — ver docs/HALO-FASE0-MAP.md §E.
 */
const INTEGRATIONS: MarqueeItem[] = [
  { name: "WhatsApp", iconSrc: "/visual/integrations/whatsapp.svg" },
  { name: "Google Calendar", iconSrc: "/visual/integrations/googlecalendar.svg" },
  { name: "Google Sheets", iconSrc: "/visual/integrations/googlesheets.svg" },
  { name: "Gmail", iconSrc: "/visual/integrations/gmail.svg" },
  { name: "Slack", iconSrc: "/visual/integrations/slack.svg" },
  { name: "Notion", iconSrc: "/visual/integrations/notion.svg" },
  { name: "HubSpot", iconSrc: "/visual/integrations/hubspot.svg" },
  { name: "Salesforce", iconSrc: "/visual/integrations/salesforce.svg" },
  { name: "Calendly", iconSrc: "/visual/integrations/calendly.svg" },
  { name: "Instagram", iconSrc: "/visual/integrations/instagram.svg" },
];

export function IntegrationsMarquee({ label }: { label: string }) {
  return (
    <section className="bg-background px-4 py-10 sm:px-6">
      <div className="mx-auto grid max-w-[88rem] grid-cols-1 items-center gap-6 md:grid-cols-4">
        <p className="max-w-[26ch] text-base leading-relaxed text-ink/70">
          {label}
        </p>
        <div className="overflow-hidden md:col-span-3">
          <Marquee
            items={INTEGRATIONS}
            keyframesName="integrations-marquee"
            durationSeconds={32}
          />
        </div>
      </div>
    </section>
  );
}
