import { ImageResponse } from "next/og";
import site from "@/lib/content";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#FAF6F0",
        }}
      >
        <svg width="120" height="80" viewBox="0 0 240 160">
          <g fill="none" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round">
            <path stroke="#83523A" d="M20 118 C52 105 66 74 92 76 C118 78 126 46 153 48 C180 50 186 78 220 92" />
            <path stroke="#9E6448" d="M26 130 C58 116 70 88 95 90 C121 92 132 60 158 62 C184 64 191 88 214 101" />
            <path stroke="#B87656" d="M38 141 C69 126 79 102 101 104 C125 106 139 76 162 78 C185 80 194 99 205 108" />
            <path stroke="#69402C" d="M45 103 C68 94 78 62 103 64 C127 66 134 34 160 36 C186 38 194 66 224 79" />
            <path stroke="#4E2E1E" d="M53 87 C74 81 84 50 109 52 C132 54 140 24 165 26 C190 28 200 52 226 64" />
          </g>
        </svg>
        <div
          style={{
            marginTop: 40,
            fontSize: 56,
            fontWeight: 700,
            color: "#4E2E1E",
            display: "flex",
          }}
        >
          {site.brand.name}
        </div>
        <div
          style={{
            marginTop: 16,
            fontSize: 28,
            color: "#71584B",
            display: "flex",
            maxWidth: 900,
          }}
        >
          {site.brand.descriptor}
        </div>
      </div>
    ),
    { ...size },
  );
}
