import { Suspense } from "react";
import { hasSession, opsConfigured } from "@/lib/ops/auth";
import { LoginForm } from "./Client";
import { PanelSkeleton, PanelView } from "./PanelView";

/**
 * Siempre dinámico: es una vista viva y privada; la página y la sesión nunca se prerenderizan ni se cachean.
 * (Lo único que se guarda, en memoria del servidor y con refresco por detrás, es la LECTURA de n8n: ver src/lib/ops/swr.ts.)
 */
export const dynamic = "force-dynamic";

export default async function OpsPage({ searchParams }: { searchParams: Promise<{ view?: string | string[]; filter?: string | string[]; tab?: string | string[] }> }) {
  if (!(await hasSession())) {
    return (
      <main className="ops-wrap ops-wrap-narrow ops-login-page">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo-horizontal.svg" alt="Atacama Labs" className="ops-logo" width={168} height={34} />
        <p className="ops-eyebrow">Atacama OS</p>
        <h1>Ingresa tu PIN</h1>
        {opsConfigured() ? <LoginForm /> : <p className="ops-empty">El acceso aún no está configurado (se requiere un PIN de 6 dígitos).</p>}
      </main>
    );
  }
  const sp = await searchParams;
  return (
    <Suspense fallback={<PanelSkeleton />}>
      <PanelView sp={sp} />
    </Suspense>
  );
}
