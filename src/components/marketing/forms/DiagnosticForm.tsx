"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { AlertCircle, Check } from "lucide-react";
import { Button, ButtonLink } from "../ui/Button";
import { track } from "@/lib/analytics";
import {
  INDUSTRY_OPTIONS,
  MESSAGE_MIN,
  NEED_OPTIONS,
  PLAN_LABEL,
  newRequestId,
  processMax,
  submitDiagnostic,
  type DiagnosticContext,
  type DiagnosticValues,
  type SubmitOutcome,
} from "@/lib/marketing/lead-adapter";

type Step = 1 | 2;
type Errors = Partial<Record<keyof DiagnosticValues, string>>;
type Status =
  | { kind: "editing" }
  | { kind: "submitting" }
  | { kind: "success"; replay: boolean }
  | { kind: "error"; message: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateStep1(values: DiagnosticValues): Errors {
  const errors: Errors = {};
  if (!values.need) errors.need = "Selecciona una opción.";
  const length = values.process.trim().length;
  if (length === 0) errors.process = "Cuéntanos brevemente qué necesitas mejorar.";
  else if (length < MESSAGE_MIN) errors.process = `Cuéntanos un poco más (mínimo ${MESSAGE_MIN} caracteres).`;
  return errors;
}

function validateStep2(values: DiagnosticValues): Errors {
  const errors: Errors = {};
  const name = values.name.trim();
  if (name.length < 2) errors.name = "Indica tu nombre.";
  if (values.company.trim().length === 0) errors.company = "Indica el nombre de tu empresa u organización.";
  if (!EMAIL_RE.test(values.email.trim())) errors.email = "Revisa el formato del correo.";
  return errors;
}

/**
 * M2 DiagnosticForm — dos pasos («Tu proceso» / «Cómo contactarte»), estados M2.3.
 * Solo modelo de UI: el adaptador serializa al contrato real de /api/leads.
 * Validación en blur y al intentar avanzar/enviar (no por letra), resumen de
 * errores enlazado, foco al resumen tras error y al título del paso tras cambiar
 * de paso. Valores en memoria: sin localStorage, sin PII en query, consola ni eventos.
 */
export function DiagnosticForm({
  initial,
  layout = "page",
  agendaAvailable = false,
}: {
  initial: DiagnosticContext;
  layout?: "page" | "inline";
  agendaAvailable?: boolean;
}) {
  const uid = useId();
  const [step, setStep] = useState<Step>(1);
  const [values, setValues] = useState<DiagnosticValues>({
    need: initial.need,
    industry: initial.industry,
    plan: initial.plan,
    capability: initial.capability,
    process: "",
    name: "",
    company: "",
    email: "",
    phone: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof DiagnosticValues, boolean>>>({});
  const [status, setStatus] = useState<Status>({ kind: "editing" });
  const [showSummary, setShowSummary] = useState(false);
  const stepTitleRef = useRef<HTMLHeadingElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const honeypot = useRef<HTMLInputElement>(null);
  const inFlight = useRef(false);
  const pending = useRef<{ id: string; sig: string } | null>(null);
  const focusStep = useRef(false);
  const focusSummary = useRef(false);

  const idFor = (field: keyof DiagnosticValues) => `${uid}-${field}`;
  const max = processMax(values);

  useEffect(() => {
    if (focusStep.current) {
      focusStep.current = false;
      stepTitleRef.current?.focus();
    }
    if (focusSummary.current) {
      focusSummary.current = false;
      summaryRef.current?.focus();
    }
  });

  function set<K extends keyof DiagnosticValues>(field: K, value: DiagnosticValues[K]) {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (touched[field]) {
      // Re-valida solo el campo ya tocado, sin mostrar errores nuevos por letra.
      setErrors((prev) => {
        const next = { ...prev };
        const merged = { ...values, [field]: value };
        const all = { ...validateStep1(merged), ...validateStep2(merged) };
        if (all[field]) next[field] = all[field];
        else delete next[field];
        return next;
      });
    }
  }

  function blur(field: keyof DiagnosticValues) {
    setTouched((t) => ({ ...t, [field]: true }));
    const all = { ...validateStep1(values), ...validateStep2(values) };
    setErrors((prev) => {
      const next = { ...prev };
      if (all[field]) next[field] = all[field];
      else delete next[field];
      return next;
    });
  }

  function goNext() {
    const found = validateStep1(values);
    setTouched((t) => ({ ...t, need: true, process: true }));
    if (Object.keys(found).length > 0) {
      setErrors(found);
      setShowSummary(true);
      focusSummary.current = true;
      return;
    }
    setErrors({});
    setShowSummary(false);
    track({
      name: "diagnostic_step",
      props: {
        stepNumber: 2,
        needId: values.need || undefined,
        industryId: values.industry || undefined,
      },
    });
    focusStep.current = true;
    setStep(2);
  }

  async function send() {
    if (inFlight.current) return;
    const found = { ...validateStep1(values), ...validateStep2(values) };
    setTouched({ need: true, process: true, name: true, company: true, email: true });
    if (Object.keys(found).length > 0) {
      setErrors(found);
      setShowSummary(true);
      focusSummary.current = true;
      if (Object.keys(validateStep1(values)).length > 0) setStep(1);
      return;
    }
    setErrors({});
    setShowSummary(false);

    const sig = JSON.stringify([values.need, values.industry, values.plan, values.capability, values.process, values.name, values.company, values.email, values.phone]);
    if (!pending.current || pending.current.sig !== sig) {
      pending.current = { id: newRequestId(), sig };
    }
    inFlight.current = true;
    setStatus({ kind: "submitting" });
    const outcome = await submitDiagnostic(values, pending.current.id, honeypot.current?.value ?? "");
    inFlight.current = false;
    handleOutcome(outcome);
  }

  function handleOutcome(outcome: SubmitOutcome) {
    switch (outcome.kind) {
      case "created":
      case "replay":
        track({ name: "lead_submit_result", props: { result: "success" } });
        setStatus({ kind: "success", replay: outcome.kind === "replay" });
        return;
      case "validation": {
        track({ name: "lead_submit_result", props: { result: "validation" } });
        const mapped: Errors = {};
        const fields = outcome.errors;
        if (fields.name) mapped.name = "Indica tu nombre.";
        if (fields.company) mapped.company = "Indica el nombre de tu empresa u organización.";
        if (fields.email || fields.phone) mapped.email = "Revisa el formato del correo.";
        if (fields.message) mapped.process = "Cuéntanos un poco más sobre el proceso que quieres mejorar.";
        setErrors(mapped);
        setShowSummary(Object.keys(mapped).length > 0);
        focusSummary.current = true;
        setStatus({ kind: "error", message: "Revisa la información e inténtalo nuevamente." });
        return;
      }
      case "conflict":
        track({ name: "lead_submit_result", props: { result: "conflict" } });
        // Cambió el payload: la próxima operación debe usar una clave nueva.
        pending.current = null;
        focusSummary.current = true;
        setStatus({
          kind: "error",
          message: "La solicitud cambió mientras se enviaba. Revisa los datos y vuelve a intentarlo.",
        });
        return;
      case "rate_limited":
        track({ name: "lead_submit_result", props: { result: "rate_limit" } });
        focusSummary.current = true;
        setStatus({
          kind: "error",
          message: "Has realizado varios intentos. Espera un momento antes de volver a enviar.",
        });
        return;
      case "unavailable":
        track({ name: "lead_submit_result", props: { result: "unavailable" } });
        focusSummary.current = true;
        setStatus({
          kind: "error",
          message: "No pudimos registrar tu solicitud ahora. Tus datos siguen aquí para que puedas reintentar.",
        });
        return;
      default:
        track({ name: "lead_submit_result", props: { result: "unknown" } });
        focusSummary.current = true;
        setStatus({
          kind: "error",
          message: "No pudimos confirmar la recepción. Reintenta para verificar el envío.",
        });
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (step === 1) goNext();
    else void send();
  }

  const submitting = status.kind === "submitting";

  if (status.kind === "success") {
    return (
      <div className="mk-form mk-form--done" role="status">
        <span className="mk-form__done-icon" aria-hidden>
          <Check size={24} />
        </span>
        <h3 className="mk-h3">Recibimos tu solicitud.</h3>
        <p className="mk-body">Gracias. Tu consulta quedó registrada para que podamos revisarla.</p>
        <div className="mk-form__actions">
          {agendaAvailable ? (
            <ButtonLink href="#agenda" variant="secondary">
              Ver disponibilidad
            </ButtonLink>
          ) : null}
          <ButtonLink href="/" variant="tertiary">
            Volver al inicio
          </ButtonLink>
        </div>
      </div>
    );
  }

  const errorEntries = (Object.entries(errors) as [keyof DiagnosticValues, string][]).filter(([, m]) => Boolean(m));
  const planLabel = values.plan ? PLAN_LABEL[values.plan] : null;

  return (
    <div className={layout === "page" ? "mk-form-layout" : "mk-form-inline"}>
      <form className="mk-form" onSubmit={onSubmit} noValidate aria-busy={submitting || undefined}>
        <ol className="mk-stepper" aria-label="Pasos del formulario">
          <li aria-current={step === 1 ? "step" : undefined} className={step === 1 ? "is-current" : "is-done"}>
            1 · Tu proceso
          </li>
          <li aria-current={step === 2 ? "step" : undefined} className={step === 2 ? "is-current" : undefined}>
            2 · Cómo contactarte
          </li>
        </ol>

        <h3 ref={stepTitleRef} tabIndex={-1} className="mk-h4 mk-form__steptitle">
          {step === 1 ? "Tu proceso" : "Cómo contactarte"}
        </h3>

        {(showSummary && errorEntries.length > 0) || status.kind === "error" ? (
          <div
            ref={summaryRef}
            tabIndex={-1}
            role="alert"
            className="mk-form__summary"
            aria-label="Errores del formulario"
          >
            <p className="mk-form__summary-title">
              <AlertCircle size={16} aria-hidden />{" "}
              {status.kind === "error" ? status.message : "Revisa estos campos:"}
            </p>
            {errorEntries.length > 0 ? (
              <ul>
                {errorEntries.map(([field, message]) => (
                  <li key={field}>
                    <a
                      href={`#${idFor(field)}`}
                      onClick={(e) => {
                        e.preventDefault();
                        if (["need", "industry", "process"].includes(field)) setStep(1);
                        else setStep(2);
                        window.setTimeout(() => document.getElementById(idFor(field))?.focus(), 0);
                      }}
                    >
                      {message}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        <div className="mk-form__fields" hidden={step !== 1}>
          <div className="mk-field">
            <label htmlFor={idFor("need")}>¿Qué quieres mejorar?</label>
            <select
              id={idFor("need")}
              className="mk-select"
              value={values.need}
              onChange={(e) => set("need", e.target.value as DiagnosticValues["need"])}
              onBlur={() => blur("need")}
              aria-invalid={Boolean(errors.need) || undefined}
              aria-describedby={errors.need ? `${idFor("need")}-error` : undefined}
              required
            >
              <option value="">Selecciona una opción</option>
              {NEED_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.need ? (
              <p id={`${idFor("need")}-error`} className="mk-field__error">
                <AlertCircle size={14} aria-hidden /> {errors.need}
              </p>
            ) : null}
          </div>

          <div className="mk-field">
            <label htmlFor={idFor("industry")}>¿En qué rubro trabaja tu empresa?</label>
            <select
              id={idFor("industry")}
              className="mk-select"
              value={values.industry}
              onChange={(e) => set("industry", e.target.value as DiagnosticValues["industry"])}
            >
              <option value="">Opcional</option>
              {INDUSTRY_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {planLabel ? (
            <p className="mk-form__plan">
              Plan de interés: <strong>{planLabel}</strong>{" "}
              <button type="button" className="mk-link-btn" onClick={() => set("plan", "")}>
                Cambiar
              </button>
            </p>
          ) : null}

          <div className="mk-field">
            <label htmlFor={idFor("process")}>Cuéntanos qué ocurre hoy</label>
            <textarea
              id={idFor("process")}
              className="mk-textarea"
              value={values.process}
              maxLength={max}
              onChange={(e) => set("process", e.target.value)}
              onBlur={() => blur("process")}
              aria-invalid={Boolean(errors.process) || undefined}
              aria-describedby={`${idFor("process")}-help${errors.process ? ` ${idFor("process")}-error` : ""}`}
              required
            />
            <p id={`${idFor("process")}-help`} className="mk-field__help">
              Por ejemplo: recibimos solicitudes por distintos canales y cuesta darles seguimiento.
              {values.process.length > max * 0.85 ? ` ${values.process.length}/${max}` : ""}
            </p>
            {errors.process ? (
              <p id={`${idFor("process")}-error`} className="mk-field__error">
                <AlertCircle size={14} aria-hidden /> {errors.process}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mk-form__fields" hidden={step !== 2}>
          <div className="mk-form__pair">
            <div className="mk-field">
              <label htmlFor={idFor("name")}>Tu nombre</label>
              <input
                id={idFor("name")}
                className="mk-input"
                type="text"
                autoComplete="name"
                value={values.name}
                onChange={(e) => set("name", e.target.value)}
                onBlur={() => blur("name")}
                aria-invalid={Boolean(errors.name) || undefined}
                aria-describedby={errors.name ? `${idFor("name")}-error` : undefined}
                required
              />
              {errors.name ? (
                <p id={`${idFor("name")}-error`} className="mk-field__error">
                  <AlertCircle size={14} aria-hidden /> {errors.name}
                </p>
              ) : null}
            </div>
            <div className="mk-field">
              <label htmlFor={idFor("company")}>Empresa u organización</label>
              <input
                id={idFor("company")}
                className="mk-input"
                type="text"
                autoComplete="organization"
                value={values.company}
                onChange={(e) => set("company", e.target.value)}
                onBlur={() => blur("company")}
                aria-invalid={Boolean(errors.company) || undefined}
                aria-describedby={errors.company ? `${idFor("company")}-error` : undefined}
                required
              />
              {errors.company ? (
                <p id={`${idFor("company")}-error`} className="mk-field__error">
                  <AlertCircle size={14} aria-hidden /> {errors.company}
                </p>
              ) : null}
            </div>
          </div>

          <div className="mk-field">
            <label htmlFor={idFor("email")}>Correo de contacto</label>
            <input
              id={idFor("email")}
              className="mk-input"
              type="email"
              autoComplete="email"
              value={values.email}
              onChange={(e) => set("email", e.target.value)}
              onBlur={() => blur("email")}
              aria-invalid={Boolean(errors.email) || undefined}
              aria-describedby={errors.email ? `${idFor("email")}-error` : undefined}
              required
            />
            {errors.email ? (
              <p id={`${idFor("email")}-error`} className="mk-field__error">
                <AlertCircle size={14} aria-hidden /> {errors.email}
              </p>
            ) : null}
          </div>

          <div className="mk-field">
            <label htmlFor={idFor("phone")}>Teléfono de contacto (opcional)</label>
            <input
              id={idFor("phone")}
              className="mk-input"
              type="tel"
              autoComplete="tel"
              value={values.phone}
              onChange={(e) => set("phone", e.target.value)}
              aria-describedby={`${idFor("phone")}-help`}
            />
            <p id={`${idFor("phone")}-help`} className="mk-field__help">
              Incluye el código de país si corresponde.
            </p>
          </div>

          <p className="mk-small mk-muted">Usaremos estos datos para responder a tu solicitud.</p>
        </div>

        <div className="mk-hp" aria-hidden="true">
          <label>
            No completar este campo
            <input ref={honeypot} type="text" name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>

        <div className="mk-form__actions">
          {step === 2 ? (
            <Button
              variant="tertiary"
              onClick={() => {
                focusStep.current = true;
                setStep(1);
              }}
              disabled={submitting}
            >
              Atrás
            </Button>
          ) : null}
          {step === 1 ? (
            <Button type="submit" arrow>
              Continuar
            </Button>
          ) : (
            <Button type="submit" loading={submitting} loadingLabel="Enviando…">
              Enviar solicitud
            </Button>
          )}
        </div>
      </form>

      {layout === "page" ? <DiagnosticAside values={values} /> : null}
    </div>
  );
}

function DiagnosticAside({ values }: { values: DiagnosticValues }) {
  const need = NEED_OPTIONS.find((n) => n.id === values.need)?.label;
  const industry = INDUSTRY_OPTIONS.find((i) => i.id === values.industry && i.id)?.label;
  const plan = values.plan ? PLAN_LABEL[values.plan] : null;
  const rows = [
    ["Necesidad", need],
    ["Rubro", industry],
    ["Plan de interés", plan],
  ].filter((row): row is [string, string] => Boolean(row[1]));
  return (
    <aside className="mk-aside" aria-label="Qué viene después">
      <h3 className="mk-h4">Qué viene después</h3>
      <p className="mk-muted">
        Revisaremos tu contexto para definir el siguiente paso. Si hay una agenda disponible, también podrás elegir un
        horario.
      </p>
      {rows.length > 0 ? (
        <dl className="mk-aside__summary">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </aside>
  );
}

