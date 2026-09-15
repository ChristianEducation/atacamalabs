import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { getPiece } from "@/lib/social-content";
import site from "@/lib/content";

export const runtime = "nodejs";

/**
 * Generador determinista de los paneles sociales (001/3.2) — evita la
 * fragilidad de capturar screenshots del navegador a tamaño exacto.
 * Uso: /api/studio/social-panel?slug=<piece>&panel=<index>
 * Solo herramienta de producción; no es contenido del sitio publico.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug") ?? "";
  const panelIndex = Number(searchParams.get("panel") ?? "0");

  const piece = getPiece(slug);
  const panel = piece?.panels[panelIndex];
  if (!piece || !panel) {
    return new Response("not found", { status: 404 });
  }

  const isCta = panel.kind === "cta";
  const bg = isCta ? "#4E2E1E" : "#FAF6F0";
  const ink = isCta ? "#FAF6F0" : "#4E2E1E";
  const muted = isCta ? "#D9C4B1" : "#71584B";
  const footerColor = isCta ? "#D9C4B1" : "#9A7E6B";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 96,
          background: bg,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <svg width="48" height="32" viewBox="0 0 240 160">
            <g fill="none" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round">
              <path stroke="#83523A" d="M20 118 C52 105 66 74 92 76 C118 78 126 46 153 48 C180 50 186 78 220 92" />
              <path stroke="#9E6448" d="M26 130 C58 116 70 88 95 90 C121 92 132 60 158 62 C184 64 191 88 214 101" />
              <path stroke="#B87656" d="M38 141 C69 126 79 102 101 104 C125 106 139 76 162 78 C185 80 194 99 205 108" />
              <path stroke="#69402C" d="M45 103 C68 94 78 62 103 64 C127 66 134 34 160 36 C186 38 194 66 224 79" />
              <path stroke={ink} d="M53 87 C74 81 84 50 109 52 C132 54 140 24 165 26 C190 28 200 52 226 64" />
            </g>
          </svg>
          <span style={{ display: "flex", fontWeight: 700, fontSize: 28, letterSpacing: "0.04em", color: ink }}>
            ATACAMA LABS
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", maxWidth: 840 }}>
          <div style={{ display: "flex", fontWeight: 700, fontSize: 76, lineHeight: 1.08, color: ink }}>
            {panel.title}
          </div>
          {panel.body && (
            <div style={{ display: "flex", marginTop: 32, fontSize: 40, lineHeight: 1.3, color: muted }}>
              {panel.body}
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 24, color: footerColor }}>
          <span style={{ display: "flex" }}>{site.brand.descriptor}</span>
          <span style={{ display: "flex" }}>
            {panelIndex + 1}/{piece.panels.length}
          </span>
        </div>
      </div>
    ),
    { width: 1080, height: 1350 },
  );
}
