import type { ReactNode } from "react";
import { Header } from "@/components/marketing/shell/Header";
import { Footer } from "@/components/marketing/shell/Footer";
import { clientPortalUrl } from "@/lib/marketing/public-config";

/** Shell compartido de todas las rutas comerciales (N1/N2). Skip link, un único <main>. */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <a href="#contenido" className="mk-skip">
        Saltar al contenido
      </a>
      <Header portalUrl={clientPortalUrl()} />
      <div id="mk-page">
        <main id="contenido" tabIndex={-1}>
          {children}
        </main>
        <Footer />
      </div>
    </>
  );
}
