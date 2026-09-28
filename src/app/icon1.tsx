import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";

/**
 * PNG 48×48 junto a `icon.svg` — PRODUCTION_READINESS_SPEC_V1 §8 (GAP SEO-04).
 * Google Search recomienda un favicon cuadrado y estable de 48×48 o más además
 * del SVG; Next expone ambos como `<link rel="icon">` (numerados: icon.svg +
 * icon1). Mismo isotipo, sin rediseñar geometría de marca.
 */
export const size = { width: 48, height: 48 };
export const contentType = "image/png";

const svg = () =>
  `data:image/svg+xml;base64,${readFileSync(join(process.cwd(), "public/brand/app-icon-claro.svg")).toString("base64")}`;

export default function Icon() {
  return new ImageResponse(
    // eslint-disable-next-line @next/next/no-img-element
    <img src={svg()} width={48} height={48} alt="" />,
    { ...size },
  );
}
