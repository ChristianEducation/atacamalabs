import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Atacama Labs — Agentes que trabajan en tu empresa";

/** OG: fondo arena, wordmark, título y tres nodos azules conectados. Todo en código. */
export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "72px 80px",
        background: "#F6F1E8",
        color: "#121212",
      }}
    >
      <div style={{ display: "flex", fontSize: 26, fontWeight: 700, letterSpacing: 4, color: "#0767F2" }}>
        ATACAMA LABS
      </div>
      <div style={{ display: "flex", fontSize: 72, lineHeight: 1.08, maxWidth: 980, fontWeight: 600 }}>
        Agentes que realmente trabajan en tu empresa.
      </div>
      <div style={{ display: "flex", alignItems: "center" }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ display: "flex", alignItems: "center" }}>
            <div style={{ width: 28, height: 28, borderRadius: 14, background: "#0767F2", display: "flex" }} />
            {i < 2 ? <div style={{ width: 96, height: 3, background: "#0767F2", display: "flex" }} /> : null}
          </div>
        ))}
      </div>
    </div>,
    { ...size },
  );
}
