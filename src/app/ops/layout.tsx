import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./ops.css";

/** Panel privado: nunca indexable ni cacheable. (Además lleva X-Robots-Tag en next.config y Disallow en robots.) */
export const metadata: Metadata = {
  title: "Atacama OS",
  robots: { index: false, follow: false, nocache: true, noarchive: true, nosnippet: true },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#f6f1e8" };

export default function OpsLayout({ children }: { children: ReactNode }) {
  return <div className="ops">{children}</div>;
}
