import Image from "next/image";
import { Container } from "@/components/ui";

const integrations = [
  ["WhatsApp", "whatsapp"],
  ["Google Calendar", "googlecalendar"],
  ["Google Sheets", "googlesheets"],
  ["Calendly", "calendly"],
  ["HubSpot", "hubspot"],
] as const;

export function IntegrationStrip() {
  return (
    <section
      className="home-integrations"
      aria-labelledby="home-integrations-title"
    >
      <Container className="integration-strip-inner">
        <div className="integration-strip-copy">
          <h2 id="home-integrations-title">
            Se integra con herramientas que ya usas
          </h2>
          <p>Configuración según tu proceso.</p>
        </div>
        <ul className="integration-strip-logos">
          {integrations.map(([name, slug]) => (
            <li key={slug}>
              <Image
                src={`/visual/integrations/${slug}.svg`}
                alt=""
                width={26}
                height={26}
              />
              <span>{name}</span>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

export function Topography({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`home-topography ${className}`}
      viewBox="0 0 600 360"
      fill="none"
      aria-hidden="true"
    >
      <g stroke="currentColor" strokeWidth="0.8">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <path
            key={i}
            transform={`translate(${i * 14} ${i * 17})`}
            d="M-50 150C55 225 80 40 192 90S260 300 367 228 431 10 650 90"
          />
        ))}
      </g>
    </svg>
  );
}

export function ProcessIcon({ index }: { index: number }) {
  const paths = [
    <g key="understand">
      <path d="M6 6h20v14H16l-6 6v-6H6Z" />
      <path d="M11 11h10M11 15h6" />
    </g>,
    <g key="define">
      <path d="M8 5h14l4 4v18H8Z" />
      <path d="M21 5v6h5M12 16h10M12 21h7" />
    </g>,
    <g key="build">
      <path d="m16 4 12 6-12 6-12-6Zm-12 12 12 6 12-6M4 22l12 6 12-6" />
    </g>,
    <g key="support">
      <circle cx="16" cy="16" r="11" />
      <path d="m11 16 4 4 7-8" />
    </g>,
  ];
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[index]}
    </svg>
  );
}

export function HomeConnectionsVisual() {
  return (
    <div
      className="connections-visual home-connections"
      role="img"
      aria-label="Esquema conceptual de conexión con HubSpot, Google Calendar, WhatsApp y Google Sheets"
    >
      <svg viewBox="0 0 320 230" fill="none" aria-hidden="true">
        <path
          d="M70 45H115Q160 45 160 90M250 45H205Q160 45 160 90M70 185H115Q160 185 160 140M250 185H205Q160 185 160 140"
          stroke="var(--color-border-control)"
          strokeWidth="1"
        />
      </svg>
      {[
        ["HubSpot", "hubspot", "crm"],
        ["Calendar", "googlecalendar", "agenda"],
        ["WhatsApp", "whatsapp", "systems"],
        ["Sheets", "googlesheets", "data"],
      ].map(([name, slug, position]) => (
        <span key={slug} className={`node node-${position}`}>
          <Image
            src={`/visual/integrations/${slug}.svg`}
            alt=""
            width={24}
            height={24}
          />
          <span>{name}</span>
        </span>
      ))}
      <span className="node node-brand">
        <Image src="/brand/logo-mark.svg" alt="" width={50} height={22} />
      </span>
    </div>
  );
}

export function HomeCaseShowcase({ steps }: { steps: string[] }) {
  return (
    <figure className="home-case-showcase">
      <Topography />
      <div className="home-case-sheet">
        <div className="home-case-sheet-head">
          <Image src="/brand/logo-mark.svg" alt="" width={54} height={23} />
          <span>PROCESO IMPLEMENTADO</span>
        </div>
        <ol>
          {steps.map((step, i) => (
            <li key={step}>
              <span className="case-stage-icon" aria-hidden="true">
                <svg
                  viewBox="0 0 32 32"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {i === 0 ? (
                    <>
                      <rect x="6" y="7" width="20" height="20" rx="2" />
                      <path d="M11 4v6M21 4v6M6 13h20m-15 7 3 3 7-7" />
                    </>
                  ) : i === 1 ? (
                    <>
                      <rect x="4" y="7" width="24" height="18" rx="3" />
                      <path d="M4 13h24M9 20h6" />
                    </>
                  ) : i === 2 ? (
                    <>
                      <path d="M7 5h18v23H7Z" />
                      <path d="M11 11h10M11 16h10M11 21h6" />
                    </>
                  ) : (
                    <>
                      <path d="M5 15h22v4a9 9 0 0 1-9 9h-4a9 9 0 0 1-9-9Zm-2 0h26M11 4v5M16 3v6M21 4v5" />
                    </>
                  )}
                </svg>
              </span>
              <span className="case-stage-number">0{i + 1}</span>
              <p>{step}</p>
              {i < steps.length - 1 && (
                <span className="case-stage-arrow" aria-hidden="true">
                  ↓
                </span>
              )}
            </li>
          ))}
        </ol>
        <div className="home-case-sheet-foot">
          <span aria-hidden="true">↗</span> Una operación conectada, de
          principio a fin.
        </div>
      </div>
      <figcaption>
        Esquema del flujo implementado; no es una captura del producto.
      </figcaption>
    </figure>
  );
}
