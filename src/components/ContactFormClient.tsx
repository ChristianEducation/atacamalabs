"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import {
  submitLead,
  validateLead,
  type LeadFormValues,
  type LeadUiState,
} from "@/lib/leads-contract";
import { track } from "@/lib/analytics";

const EMPTY: LeadFormValues = {
  name: "",
  company: "",
  email: "",
  phone: "",
  solution: "unsure",
  message: "",
};

type ContactContent = {
  contact: { success: string; notice: string; submitLabel: string };
  publicSettings: { contactEmail: string | null };
  solutions: { slug: string; title: string }[];
};
export function ContactFormClient({
  initialSolution,
  initialMessage,
  content: site,
}: {
  initialSolution?: string;
  initialMessage?: string;
  content: ContactContent;
}) {
  const [values, setValues] = useState<LeadFormValues>({
    ...EMPTY,
    solution: initialSolution ?? "unsure",
    message: initialMessage ?? "",
  });
  const [state, setState] = useState<LeadUiState>({ status: "idle" });
  const [honeypot, setHoneypot] = useState("");
  // Lazy initializer: forma segura de generar un valor impuro una sola vez
  // en el montaje (react-hooks/purity), a diferencia de useRef(expr()).
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const errorSummaryId = useId();
  const errorSummaryRef = useRef<HTMLDivElement>(null);

  const submitting = state.status === "submitting";
  const fieldErrors = state.status === "validation_error" ? state.errors : {};

  useEffect(() => {
    if (
      state.status === "validation_error" ||
      state.status === "retryable_error"
    ) {
      errorSummaryRef.current?.focus();
    }
  }, [state.status]);

  useEffect(() => {
    track({ name: "lead_form_view", props: { solution: initialSolution } });
    // Se dispara una sola vez al montar el formulario real (no en la vista previa).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function update<K extends keyof LeadFormValues>(
    key: K,
    value: LeadFormValues[K],
  ) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return; // bloquea doble clic sin borrar datos

    const errors = validateLead(values);
    if (Object.keys(errors).length > 0) {
      setState({ status: "validation_error", errors });
      return;
    }

    setState({ status: "submitting" });
    const result = await submitLead(values, requestId, honeypot);
    setState(result);

    if (result.status === "received") {
      track({ name: "lead_submit_success", props: { requestId } });
      setRequestId(crypto.randomUUID());
    } else if (result.status === "retryable_error") {
      track({
        name: "lead_submit_error",
        props: { requestId, reason: "retryable" },
      });
    }
    // en error, se conserva el mismo requestId para reintentar el mismo intento
  }

  if (state.status === "received") {
    return (
      <div className="rounded-xl border border-border bg-surface p-8">
        <h2 className="text-xl font-semibold text-ink">Consulta recibida</h2>
        <p className="mt-3 text-base leading-7 text-muted">
          {site.contact.success}
        </p>
        <div className="mt-6">
          <Link
            href="/agenda"
            onClick={() =>
              track({
                name: "booking_click",
                props: { source: "contact_success" },
              })
            }
            className="inline-flex h-11 items-center justify-center rounded-lg bg-action px-6 text-sm font-medium text-white hover:bg-action-hover transition-colors"
          >
            Agendar una conversación
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {/* Honeypot anti-spam: invisible para personas, los bots que llenan
          todo lo detectan. No usar display:none (algunos lectores de
          formularios de bots lo ignoran) — se oculta visualmente y del
          árbol de accesibilidad en su lugar. */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "-9999px",
          width: 1,
          height: 1,
          overflow: "hidden",
        }}
      >
        <label htmlFor="website">No completar este campo</label>
        <input
          id="website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>
      {state.status === "retryable_error" && (
        <div
          ref={errorSummaryRef}
          tabIndex={-1}
          role="alert"
          className="rounded-lg border border-copper/50 bg-surface-warm p-4 text-sm text-ink focus:outline-none"
        >
          <p>{state.message}</p>
          {site.publicSettings.contactEmail && (
            <p className="mt-2">
              También puedes escribirnos a{" "}
              <a
                className="underline"
                href={`mailto:${site.publicSettings.contactEmail}`}
                onClick={() =>
                  track({
                    name: "contact_channel_click",
                    props: { channel: "email" },
                  })
                }
              >
                {site.publicSettings.contactEmail}
              </a>
              .
            </p>
          )}
        </div>
      )}

      {state.status === "validation_error" && (
        <div
          id={errorSummaryId}
          ref={errorSummaryRef}
          tabIndex={-1}
          role="alert"
          className="rounded-lg border border-copper/50 bg-surface-warm p-4 text-sm text-ink focus:outline-none"
        >
          Revisa los campos marcados abajo.
        </div>
      )}

      <Field label="Nombre" htmlFor="name" error={fieldErrors.name} required>
        <input
          id="name"
          name="name"
          type="text"
          required
          autoComplete="name"
          value={values.name}
          onChange={(e) => update("name", e.target.value)}
          aria-invalid={Boolean(fieldErrors.name)}
          className={inputClass(Boolean(fieldErrors.name))}
        />
      </Field>

      <Field label="Empresa" htmlFor="company" error={fieldErrors.company}>
        <input
          id="company"
          name="company"
          type="text"
          autoComplete="organization"
          value={values.company}
          onChange={(e) => update("company", e.target.value)}
          className={inputClass(Boolean(fieldErrors.company))}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Correo" htmlFor="email" error={fieldErrors.email}>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={(e) => update("email", e.target.value)}
            aria-invalid={Boolean(fieldErrors.email)}
            className={inputClass(Boolean(fieldErrors.email))}
          />
        </Field>
        <Field label="Teléfono" htmlFor="phone" error={fieldErrors.phone}>
          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            value={values.phone}
            onChange={(e) => update("phone", e.target.value)}
            aria-invalid={Boolean(fieldErrors.phone)}
            className={inputClass(Boolean(fieldErrors.phone))}
          />
        </Field>
      </div>
      <p className="-mt-3 text-xs text-muted">
        Indica al menos correo o teléfono.
      </p>

      <Field label="Tipo de solución (opcional)" htmlFor="solution">
        <select
          id="solution"
          name="solution"
          value={values.solution}
          onChange={(e) => update("solution", e.target.value)}
          className={inputClass(false)}
        >
          <option value="unsure">Aún no lo sé</option>
          {site.solutions.map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.title}
            </option>
          ))}
        </select>
      </Field>

      <Field
        label="Mensaje"
        htmlFor="message"
        error={fieldErrors.message}
        required
      >
        <textarea
          id="message"
          name="message"
          required
          rows={5}
          value={values.message}
          onChange={(e) => update("message", e.target.value)}
          aria-invalid={Boolean(fieldErrors.message)}
          className={inputClass(Boolean(fieldErrors.message))}
        />
      </Field>

      <p className="text-xs leading-5 text-muted">{site.contact.notice}</p>

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex h-11 items-center justify-center rounded-lg bg-action px-6 text-sm font-medium text-white transition-colors hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Enviando…" : site.contact.submitLabel}
      </button>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  error,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink">
        {label}
        {required && <span aria-hidden> *</span>}
      </label>
      <div className="mt-1.5">{children}</div>
      {error && (
        <p className="mt-1.5 text-sm text-copper" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function inputClass(hasError: boolean) {
  return [
    "w-full rounded-lg border bg-surface px-3.5 py-2.5 text-base text-ink",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-focus",
    hasError ? "border-copper" : "border-border-control",
  ].join(" ");
}
