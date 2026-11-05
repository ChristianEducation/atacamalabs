import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "De lo que ocurre en terreno a una acción real | Atacama Labs",
  description:
    "Agentes de IA que escuchan, organizan información y ejecutan tareas conectadas a tus herramientas. Prueba la demostración enviando un audio por WhatsApp.",
  // Página de evento: no debe indexarse ni competir con el sitio comercial.
  robots: { index: false, follow: false },
  alternates: { canonical: "/aster" },
  openGraph: {
    type: "website",
    title: "De lo que ocurre en terreno a una acción real",
    description: "Pruébalo tú mismo: envía un audio y recibe un informe.",
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
