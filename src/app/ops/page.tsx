import { Suspense } from "react";
import { hasSession, opsConfigured } from "@/lib/ops/auth";
import { LoginForm } from "./Client";
import { PanelSkeleton, PanelView } from "./PanelView";

/** Siempre dinámico: es una vista viva y privada; nada de esto se prerenderiza ni se cachea. */
export const dynamic = "force-dynamic";

export default async function OpsPage() {
  if (!(await hasSession())) {
    return (
      <main className="ops-wrap ops-wrap-narrow">
        <p className="ops-eyebrow">Atacama OS</p>
        <h1>Acceso privado</h1>
        {opsConfigured() ? <LoginForm /> : <p className="ops-empty">El panel no está habilitado en este entorno.</p>}
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
