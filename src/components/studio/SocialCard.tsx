/* eslint-disable @next/next/no-img-element */
import type { SocialPanel } from "@/lib/social-content";

/**
 * Vista previa interna de un panel 1080×1350 con la identidad VIGENTE (6-oct-2026):
 * azul Atacama #0F5CED, azul oscuro #041228, tinta #121A2B, gris claro #F0F2F4, Newsreader (fina) + DM Sans,
 * y el logo OFICIAL de public/brand/ (nunca reconstruido). El renderer de producción del Content Engine es
 * scripts/content/render.mjs (mismos tokens); esta plantilla solo sirve para revisar paneles en /studio.
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
  const fg = isCta ? "#FFFFFF" : "#121A2B";
  const muted = isCta ? "rgba(255,255,255,.82)" : "rgba(18,26,43,.78)";

  return (
    <div
      style={{
        width: 1080,
        height: 1350,
        background: isCta ? "#041228" : "#FFFFFF",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "96px 96px 88px",
        boxSizing: "border-box",
        fontFamily: "var(--font-dm-sans), sans-serif",
        color: fg,
      }}
    >
      <div>
        {panel.kicker && (
          <p
            style={{
              fontSize: 26,
              fontWeight: 500,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: isCta ? "#2E74F5" : "#0F5CED",
              margin: 0,
            }}
          >
            {panel.kicker}
          </p>
        )}
      </div>

      <div style={{ maxWidth: 860 }}>
        <div style={{ width: 72, height: 3, background: isCta ? "#2E74F5" : "#0F5CED", marginBottom: 40 }} />
        <h1
          style={{
            fontFamily: "var(--font-newsreader), serif",
            fontWeight: 300,
            fontSize: 88,
            lineHeight: 1.06,
            letterSpacing: "-0.012em",
            margin: 0,
          }}
        >
          {panel.title}
        </h1>
        {panel.body && (
          <p style={{ marginTop: 36, fontSize: 36, lineHeight: 1.45, fontWeight: 300, color: muted }}>{panel.body}</p>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <img
          src={isCta ? "/brand/logo-horizontal-fondo-oscuro.svg" : "/brand/logo-horizontal.svg"}
          alt="Atacama Labs"
          width={250}
          style={{ display: "block", height: "auto" }}
        />
        <span style={{ fontSize: 24, letterSpacing: "0.08em", opacity: 0.55 }}>
          {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </span>
      </div>
    </div>
  );
}
