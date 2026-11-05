import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Atacama Labs — Agentes que conectan, automatizan y ejecutan";

/** OG: imagen fija diseñada por Christian (public/brand/og-share.png, 1200×630). */
export default function Image() {
  const asset = `data:image/png;base64,${readFileSync(join(process.cwd(), "public/brand/og-share.png")).toString("base64")}`;
  return new ImageResponse(
    // eslint-disable-next-line @next/next/no-img-element
    <img src={asset} width={size.width} height={size.height} alt="" />,
    { ...size },
  );
}
