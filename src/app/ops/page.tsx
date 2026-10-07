import { Suspense } from "react";
import { hasSession, opsConfigured } from "@/lib/ops/auth";
import { LoginForm } from "./Client";
import { PanelSkeleton, PanelView } from "./PanelView";

/** Siempre dinámico: es una vista viva y privada; nada de esto se prerenderiza ni se cachea. */
export const dynamic = "force-dynamic";

export default async function OpsPage() {
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
  return (
    <main className="ops-wrap">
      <Suspense fallback={<PanelSkeleton />}>
        <PanelView />
      </Suspense>
    </main>
  );
}
