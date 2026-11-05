import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Agentes de IA para minería e industria | Atacama Labs",
  description:
    "Agentes de IA que convierten reportes y observaciones en seguimiento, información conectada y alertas. Menos trabajo administrativo, más tiempo para operar.",
  // Página de evento: no debe indexarse ni competir con el sitio comercial.
  robots: { index: false, follow: false },
  alternates: { canonical: "/aster" },
  openGraph: {
    type: "website",
    title: "Lo que ocurre en terreno no debería quedarse en un informe",
    description: "Agentes de IA que dan seguimiento, conectan sistemas y detectan pendientes. Menos administración, más tiempo para operar.",
    images: [{ url: "/aster/poster.jpg" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#041228",
  colorScheme: "dark",
};

export default function AsterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
