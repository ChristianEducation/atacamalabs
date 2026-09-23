import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Atacama Labs — Agentes que trabajan en tu empresa";

const asset = (name: string) =>
  `data:image/svg+xml;base64,${readFileSync(join(process.cwd(), "public/brand", name)).toString("base64")}`;

/** OG: fondo arena, logo oficial, título y tres nodos azules. Todo en código. */
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
        color: "#121A2B",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={asset("logo-horizontal.svg")} width={420} height={40} alt="" />
      <div style={{ display: "flex", fontSize: 72, lineHeight: 1.08, maxWidth: 980, fontWeight: 600 }}>
        Pon un agente a trabajar en tu empresa.
      </div>
      <div style={{ display: "flex", alignItems: "center" }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ display: "flex", alignItems: "center" }}>
            <div style={{ width: 28, height: 28, borderRadius: 14, background: "#0F5CED", display: "flex" }} />
            {i < 2 ? <div style={{ width: 96, height: 3, background: "#0F5CED", display: "flex" }} /> : null}
          </div>
        ))}
      </div>
    </div>,
    { ...size },
  );
}
