"use client";

/**
 * Vista previa de los estados del contrato POST /api/leads
 * (contracts/INTERFACES.md) para revisión visual mientras 002 no existe.
 * NO es el formulario real ni envía nada — solo renderiza cada estado
 * con datos de ejemplo. Se activa con ?preview=estados en /contacto y
 * nunca aparece en la ruta normal.
 */
export function ContactStatesPreview() {
  const states: { label: string; node: React.ReactNode }[] = [
    {
      label: "idle",
      node: <p className="text-sm text-muted">Formulario vacío, sin envíos.</p>,
    },
    {
      label: "submitting",
      node: (
        <button
          disabled
          className="inline-flex h-11 items-center justify-center rounded-lg bg-action px-6 text-sm font-medium text-white opacity-60"
        >
          Enviando…
        </button>
      ),
    },
    {
      label: "validation_error",
      node: (
        <div role="alert" className="rounded-lg border border-copper/50 bg-surface-warm p-4 text-sm text-ink">
          Revisa los campos marcados abajo.
          <p className="mt-2 text-copper">Ingresa un correo válido o un teléfono de contacto.</p>
        </div>
      ),
    },
    {
      label: "retryable_error (503/429/409/sin backend)",
      node: (
        <div role="alert" className="rounded-lg border border-copper/50 bg-surface-warm p-4 text-sm text-ink">
          No pudimos registrar tu consulta. Tus datos siguen en el formulario;
          inténtalo nuevamente o utiliza el correo de contacto.
        </div>
      ),
    },
    {
      label: "received",
      node: (
        <div className="rounded-xl border border-border bg-surface p-6">
          <h3 className="text-lg font-semibold text-ink">Consulta recibida</h3>
          <p className="mt-2 text-sm text-muted">
            Recibimos tu consulta. Revisaremos el contexto y te contactaremos
            por el canal que indicaste.
          </p>
        </div>
      ),
    },
  ];

  return (
    <div className="rounded-xl border-2 border-dashed border-copper/60 bg-surface-warm p-6">
      <p className="text-sm font-semibold uppercase tracking-wide text-copper">
        Vista previa de estados — solo revisión, no es el formulario real
      </p>
      <p className="mt-1 text-sm text-muted">
        Estados definidos en contracts/INTERFACES.md. La conexión real al
        backend se construye en 002-operationalize-commercial-system.
      </p>
      <div className="mt-6 space-y-6">
        {states.map((s) => (
          <div key={s.label}>
            <p className="text-xs font-mono uppercase text-muted">{s.label}</p>
            <div className="mt-2">{s.node}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
