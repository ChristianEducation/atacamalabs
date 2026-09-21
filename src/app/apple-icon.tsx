import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const svg = () =>
  `data:image/svg+xml;base64,${readFileSync(join(process.cwd(), "public/brand/app-icon-claro.svg")).toString("base64")}`;

export default function AppleIcon() {
  return new ImageResponse(
    // eslint-disable-next-line @next/next/no-img-element
    <img src={svg()} width={180} height={180} alt="" />,
    { ...size },
  );
}
