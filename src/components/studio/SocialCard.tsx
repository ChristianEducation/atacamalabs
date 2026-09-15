import site from "@/lib/content";
import type { SocialPanel } from "@/lib/social-content";

/**
 * Plantilla única reutilizada por las seis piezas (portada y caso), per
 * docs/SOCIAL-CONTENT.md: "Diseñar una plantilla de portada y una de caso;
 * reaprovechar, no crear seis identidades." 1080×1350 — DESIGN-SYSTEM.md
 * §Adaptaciones. Zona segura central, símbolo pequeño, título legible.
 */
export function SocialCard({
  panel,
  index,
  total,
}: {
  panel: SocialPanel;
  index: number;
  total: number;
}) {
  const isCta = panel.kind === "cta";

  return (
    <div
      style={{
        width: 1080,
        height: 1350,
        background: isCta ? "#4E2E1E" : "#FAF6F0",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 96,
        boxSizing: "border-box",
        fontFamily: "var(--font-body)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <svg width="48" height="32" viewBox="0 0 240 160">
          <g fill="none" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round">
            <path stroke="#83523A" d="M20 118 C52 105 66 74 92 76 C118 78 126 46 153 48 C180 50 186 78 220 92" />
            <path stroke="#9E6448" d="M26 130 C58 116 70 88 95 90 C121 92 132 60 158 62 C184 64 191 88 214 101" />
            <path stroke="#B87656" d="M38 141 C69 126 79 102 101 104 C125 106 139 76 162 78 C185 80 194 99 205 108" />
            <path stroke="#69402C" d="M45 103 C68 94 78 62 103 64 C127 66 134 34 160 36 C186 38 194 66 224 79" />
            <path stroke={isCta ? "#FAF6F0" : "#4E2E1E"} d="M53 87 C74 81 84 50 109 52 C132 54 140 24 165 26 C190 28 200 52 226 64" />
          </g>
        </svg>
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 28,
            letterSpacing: "0.04em",
            color: isCta ? "#FAF6F0" : "#4E2E1E",
          }}
        >
          ATACAMA LABS
        </span>
      </div>

      <div style={{ maxWidth: 840 }}>
        {panel.kicker && (
          <p
            style={{
              fontSize: 28,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#B87656",
              marginBottom: 24,
            }}
          >
            {panel.kicker}
          </p>
        )}
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 76,
            lineHeight: 1.08,
            color: isCta ? "#FAF6F0" : "#4E2E1E",
            margin: 0,
          }}
        >
          {panel.title}
        </h1>
        {panel.body && (
          <p
            style={{
              marginTop: 32,
              fontSize: 40,
              lineHeight: 1.3,
              color: isCta ? "#D9C4B1" : "#71584B",
            }}
          >
            {panel.body}
          </p>
        )}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 24,
          color: isCta ? "#D9C4B1" : "#9A7E6B",
        }}
      >
        <span>{site.brand.descriptor}</span>
        <span>
          {index + 1}/{total}
        </span>
      </div>
    </div>
  );
}
