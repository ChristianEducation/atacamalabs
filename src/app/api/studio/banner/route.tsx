import { ImageResponse } from "next/og";
import site from "@/lib/content";

export const runtime = "nodejs";

/** Banner de portada LinkedIn (empresa/personal), 1128×191 — 001/3.1. */
export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 64px",
          background: "#4E2E1E",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ display: "flex", fontWeight: 700, fontSize: 40, color: "#FAF6F0" }}>
            {site.brand.name}
          </span>
          <span style={{ display: "flex", marginTop: 6, fontSize: 20, color: "#D9C4B1" }}>
            {site.brand.descriptor}
          </span>
        </div>
        <svg width="150" height="100" viewBox="0 0 240 160">
          <g fill="none" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round">
            <path stroke="#83523A" d="M20 118 C52 105 66 74 92 76 C118 78 126 46 153 48 C180 50 186 78 220 92" />
            <path stroke="#9E6448" d="M26 130 C58 116 70 88 95 90 C121 92 132 60 158 62 C184 64 191 88 214 101" />
            <path stroke="#B87656" d="M38 141 C69 126 79 102 101 104 C125 106 139 76 162 78 C185 80 194 99 205 108" />
            <path stroke="#D9C4B1" d="M45 103 C68 94 78 62 103 64 C127 66 134 34 160 36 C186 38 194 66 224 79" />
            <path stroke="#FAF6F0" d="M53 87 C74 81 84 50 109 52 C132 54 140 24 165 26 C190 28 200 52 226 64" />
          </g>
        </svg>
      </div>
    ),
    { width: 1128, height: 191 },
  );
}
