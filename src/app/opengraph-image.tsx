import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import site from "@/lib/content";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
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
      {/* ImageResponse renders this into a PNG; no browser image request. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        width={120}
        height={52}
        alt=""
        src={`data:image/svg+xml;base64,${readFileSync(join(process.cwd(), "public/brand/logo-mark.svg")).toString("base64")}`}
      />
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
        {site.hero.supportingLine}
      </div>
    </div>,
    { ...size },
  );
}
