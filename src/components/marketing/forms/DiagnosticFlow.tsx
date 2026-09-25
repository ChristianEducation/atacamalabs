"use client";

import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { AlertCircle, ArrowLeft, CalendarCheck } from "lucide-react";
import { Button } from "../ui/Button";
import { track, type CtaEventProps } from "@/lib/analytics";
import type { Service } from "@/lib/marketing/cta-context";
import {
  AGENT_GOAL_OPTIONS,
  ANSWER_MAX,
  PLAN_LABEL,
  SERVICE_OPTIONS,
  WEB_GOAL_OPTIONS,
  WEB_TYPE_OPTIONS,
  headingFor,
  newRequestId,
  submitDiagnostic,
  type DiagnosticContext,
  type DiagnosticValues,
  type SubmitOutcome,
} from "@/lib/marketing/lead-adapter";

type Step = "service" | "context" | "data" | "agenda";
type Errors = Partial<Record<"answer" | "name" | "company" | "email" | "phone", string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PLACEHOLDER_A_MEDIDA = "Cuéntanos brevemente cómo funciona hoy y qué te gustaría mejorar.";

const FAILURES: Record<Exclude<SubmitOutcome["kind"], "created" | "replay" | "validation">, string> = {
  conflict: "Ya recibimos una solicitud parecida. Revisa tus datos e inténtalo nuevamente.",
  rate_limited: "Enviaste varias solicitudes seguidas. Espera unos minutos e inténtalo nuevamente.",
  unavailable: "No pudimos guardar tus datos. Inténtalo nuevamente.",
  network: "No pudimos guardar tus datos. Inténtalo nuevamente.",
};

/**
 * Pantalla de conversión de /diagnostico (spec final §19–§32). Un contenedor
 * central, una pregunta por pantalla, a lo más tres pasos y seis respuestas:
 * servicio (solo si el CTA no lo trajo) → una pregunta de contexto → datos.
 * El lead se guarda ANTES de mostrar la agenda; si guardar falla no hay
 * calendario, y si el calendario falla el lead ya está guardado. Nunca se
 * muestra «Reunión agendada» sin una reserva confirmada de verdad.
 */
export function DiagnosticFlow({ initial, agendaUrl }: { initial: DiagnosticContext; agendaUrl: string | null }) {
  const uid = useId();
  const [values, setValues] = useState<DiagnosticValues>({
    service: initial.service,
    interest: initial.interest,
    plan: initial.plan,
    webGoal: "",
    answer: "",
    name: "",
    company: "",
    email: "",
    phone: "",
  });
  const [step, setStep] = useState<Step>(initial.service ? "context" : "service");
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const stepRef = useRef<HTMLDivElement>(null);
  const honeypot = useRef<HTMLInputElement>(null);
  const inFlight = useRef(false);
  const pending = useRef<{ id: string; sig: string } | null>(null);
  const moved = useRef(false);

  const serviceKnown = Boolean(initial.service);
  const totalSteps = serviceKnown ? 2 : 3;
  const stepNumber = step === "service" ? 1 : step === "context" ? (serviceKnown ? 1 : 2) : totalSteps;

  const eventProps = useMemo<CtaEventProps>(
    () => ({
      source_page: initial.source_page,
      source_section: initial.source_section || undefined,
      source_cta: initial.source_cta || undefined,
      service: values.service || undefined,
      interest: values.interest || undefined,
      plan: values.plan || undefined,
      campaign: initial.campaign || undefined,
    }),
    [initial, values.service, values.interest, values.plan],
  );

  useEffect(() => {
    track({ name: "diagnostic_started", props: eventProps });
    // Solo al abrir la pantalla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Al cambiar de paso, el foco va al bloque nuevo (accesible y sin saltos de scroll).
  useEffect(() => {
    if (!moved.current) return;
    stepRef.current?.focus({ preventScroll: true });
  }, [step]);

  function go(next: Step) {
    moved.current = true;
    setFailure(null);
    setStep(next);
    if (next === "agenda") track({ name: "calendar_viewed", props: eventProps });
  }

  function patch(partial: Partial<DiagnosticValues>) {
    setValues((prev) => ({ ...prev, ...partial }));
  }

  /* ---- Paso: servicio ---- */
  function chooseService(service: Service) {
    patch({ service, interest: "", plan: "", webGoal: "", answer: "" });
    track({ name: "diagnostic_service_selected", props: { ...eventProps, service } });
    track({ name: "diagnostic_step_completed", props: { ...eventProps, service, step: 1 } });
    go("context");
  }

  /* ---- Paso: contexto ---- */
  function completeContext(partial: Partial<DiagnosticValues>) {
    patch(partial);
    track({ name: "diagnostic_step_completed", props: { ...eventProps, step: serviceKnown ? 1 : 2 } });
    go("data");
  }

  function submitContext(event: FormEvent) {
    event.preventDefault();
    const text = values.answer.trim();
    const required = values.service === "a-medida" || values.service === "general" || values.service === "";
    if (required && text.length < 10) {
      setErrors({ answer: "Cuéntanos un poco más para llegar preparados." });
      return;
    }
    setErrors({});
    completeContext({});
  }

  /* ---- Paso: datos y guardado ---- */
  function validateData(): Errors {
    const next: Errors = {};
    if (values.name.trim().length < 2) next.name = "Indica tu nombre.";
    if (values.company.trim().length < 2) next.company = "Indica el nombre de tu empresa.";
    if (!EMAIL_RE.test(values.email.trim())) next.email = "Revisa el formato del correo.";
    if (values.phone.replace(/[^\d]/g, "").length < 8) next.phone = "Indica un WhatsApp o teléfono válido.";
    return next;
  }

  async function submitData(event: FormEvent) {
    event.preventDefault();
    if (inFlight.current) return;
    const found = validateData();
    setErrors(found);
    if (Object.keys(found).length > 0) {
      const firstField = Object.keys(found)[0];
      document.getElementById(`${uid}-${firstField}`)?.focus();
      return;
    }

    const sig = JSON.stringify(values);
    if (!pending.current || pending.current.sig !== sig) pending.current = { id: newRequestId(), sig };

    inFlight.current = true;
    setSubmitting(true);
    setFailure(null);
    const outcome = await submitDiagnostic(values, initial, pending.current.id, honeypot.current?.value ?? "");
    inFlight.current = false;
    setSubmitting(false);

    if (outcome.kind === "created" || outcome.kind === "replay") {
      track({ name: "diagnostic_submitted", props: eventProps });
      go("agenda");
      return;
    }
    if (outcome.kind === "validation") {
      const mapped: Errors = {};
      if (outcome.errors.name) mapped.name = "Revisa tu nombre.";
      if (outcome.errors.company) mapped.company = "Revisa el nombre de tu empresa.";
      if (outcome.errors.email) mapped.email = "Revisa tu correo.";
      if (outcome.errors.phone) mapped.phone = "Revisa tu teléfono.";
      setErrors(mapped);
      setFailure(
        outcome.errors.message
          ? "Cuéntanos un poco más en el paso anterior."
          : "Revisa los datos e inténtalo nuevamente.",
      );
      return;
    }
    setFailure(FAILURES[outcome.kind]);
  }

  const heading = headingFor(values.service, values.plan);
  const planLabel = values.plan ? PLAN_LABEL[values.plan] : null;

  const back =
    step === "context" && !serviceKnown ? (
      <button type="button" className="mk-dg-back" onClick={() => go("service")}>
        <ArrowLeft size={16} aria-hidden /> Atrás
      </button>
    ) : step === "data" ? (
      <button type="button" className="mk-dg-back" onClick={() => go("context")}>
        <ArrowLeft size={16} aria-hidden /> Atrás
      </button>
    ) : null;

  return (
    <div className="mk-dg-wrap">
      {step === "agenda" ? (
        <header className="mk-dg-head" aria-live="polite">
          <p className="mk-eyebrow">DIAGNÓSTICO</p>
          <h1 id="page-title" className="mk-dg-title" ref={headingRef}>
            Listo, {values.name.trim().split(/\s+/)[0]}.
          </h1>
          <p className="mk-dg-lead">
            {agendaUrl
              ? "Ya tenemos el contexto. Elige cuándo conversamos."
              : "Ya tenemos tu solicitud y el contexto de tu caso."}
          </p>
        </header>
      ) : (
        <header className="mk-dg-head">
          <p className="mk-eyebrow">DIAGNÓSTICO</p>
          <h1 id="page-title" className="mk-dg-title" ref={headingRef}>
            {heading}
          </h1>
          <p className="mk-dg-lead">
            Te tomará menos de un minuto. Con unas pocas respuestas podremos llegar a la conversación entendiendo tu
            caso.
          </p>
        </header>
      )}

      <div className="mk-dg-card">
        {step !== "agenda" ? (
          <div className="mk-dg-progress">
            <p>
              Paso {stepNumber} de {totalSteps}
              {planLabel ? <span className="mk-dg-progress__plan"> · {planLabel}</span> : null}
            </p>
            <div className="mk-dg-progress__bar" aria-hidden>
              {Array.from({ length: totalSteps }, (_, index) => (
                <i key={index} className={index < stepNumber ? "is-done" : undefined} />
              ))}
            </div>
          </div>
        ) : null}

        <div className="mk-dg-step" key={step} ref={stepRef} tabIndex={-1}>
          {step === "service" ? (
            <fieldset className="mk-dg-fieldset">
              <legend className="mk-dg-q">¿Qué quieres mejorar?</legend>
              <div className="mk-dg-choices">
                {SERVICE_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className="mk-dg-choice"
                    aria-pressed={values.service === option.id}
                    onClick={() => chooseService(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </fieldset>
          ) : null}

          {step === "context" ? (
            <>
              {back}
              {values.service === "agentes" && !initial.interest ? (
                <fieldset className="mk-dg-fieldset">
                  <legend className="mk-dg-q">¿Qué quieres que haga tu agente?</legend>
                  <div className="mk-dg-choices mk-dg-choices--2">
                    {AGENT_GOAL_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        className="mk-dg-choice"
                        aria-pressed={values.interest === option.id}
                        onClick={() => completeContext({ interest: option.id })}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </fieldset>
              ) : null}

              {values.service === "web" ? (
                <fieldset className="mk-dg-fieldset">
                  <legend className="mk-dg-q">
                    {initial.plan ? "¿Qué quieres conseguir principalmente?" : "¿Qué necesitas?"}
                  </legend>
                  <div className={initial.plan ? "mk-dg-choices mk-dg-choices--2" : "mk-dg-choices"}>
                    {(initial.plan ? WEB_GOAL_OPTIONS : WEB_TYPE_OPTIONS).map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        className="mk-dg-choice"
                        aria-pressed={initial.plan ? values.webGoal === option.id : values.plan === option.id}
                        onClick={() =>
                          completeContext(
                            initial.plan ? { webGoal: option.id } : { plan: option.id === "unsure" ? "" : option.id },
                          )
                        }
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </fieldset>
              ) : null}

              {values.service === "agentes" && initial.interest ? (
                <form className="mk-dg-form" onSubmit={submitContext} noValidate>
                  <div className="mk-dg-field">
                    <label htmlFor={`${uid}-answer`} className="mk-dg-q">
                      Cuéntanos brevemente qué quieres delegar.
                    </label>
                    <textarea
                      id={`${uid}-answer`}
                      className="mk-dg-textarea"
                      rows={4}
                      maxLength={ANSWER_MAX}
                      value={values.answer}
                      onChange={(event) => patch({ answer: event.target.value })}
                    />
                  </div>
                  <Button type="submit" arrow block>
                    Continuar
                  </Button>
                </form>
              ) : null}

              {values.service === "a-medida" || values.service === "general" || values.service === "" ? (
                <form className="mk-dg-form" onSubmit={submitContext} noValidate>
                  <div className="mk-dg-field">
                    <label htmlFor={`${uid}-answer`} className="mk-dg-q">
                      {values.service === "a-medida"
                        ? "¿Qué proceso quieres mejorar o automatizar?"
                        : "Cuéntanos brevemente qué te gustaría mejorar."}
                    </label>
                    <textarea
                      id={`${uid}-answer`}
                      className="mk-dg-textarea"
                      rows={5}
                      maxLength={ANSWER_MAX}
                      placeholder={values.service === "a-medida" ? PLACEHOLDER_A_MEDIDA : undefined}
                      value={values.answer}
                      onChange={(event) => patch({ answer: event.target.value })}
                      aria-invalid={Boolean(errors.answer) || undefined}
                      aria-describedby={errors.answer ? `${uid}-answer-error` : undefined}
                    />
                    {errors.answer ? (
                      <p id={`${uid}-answer-error`} className="mk-dg-error" role="alert">
                        <AlertCircle size={14} aria-hidden /> {errors.answer}
                      </p>
                    ) : null}
                  </div>
                  <Button type="submit" arrow block>
                    Continuar
                  </Button>
                </form>
              ) : null}
            </>
          ) : null}

          {step === "data" ? (
            <>
              {back}
              <form className="mk-dg-form" onSubmit={submitData} noValidate>
                <p className="mk-dg-q">¿Cómo te contactamos?</p>

                {failure ? (
                  <p className="mk-dg-alert" role="alert">
                    <AlertCircle size={16} aria-hidden /> {failure}
                  </p>
                ) : null}

                <div className="mk-dg-pair">
                  <Field id={`${uid}-name`} label="Nombre" error={errors.name}>
                    <input
                      id={`${uid}-name`}
                      className="mk-dg-input"
                      type="text"
                      autoComplete="name"
                      value={values.name}
                      onChange={(event) => patch({ name: event.target.value })}
                      aria-invalid={Boolean(errors.name) || undefined}
                      aria-describedby={errors.name ? `${uid}-name-error` : undefined}
                    />
                  </Field>
                  <Field id={`${uid}-company`} label="Empresa" error={errors.company}>
                    <input
                      id={`${uid}-company`}
                      className="mk-dg-input"
                      type="text"
                      autoComplete="organization"
                      value={values.company}
                      onChange={(event) => patch({ company: event.target.value })}
                      aria-invalid={Boolean(errors.company) || undefined}
                      aria-describedby={errors.company ? `${uid}-company-error` : undefined}
                    />
                  </Field>
                </div>
                <div className="mk-dg-pair">
                  <Field id={`${uid}-email`} label="Email" error={errors.email}>
                    <input
                      id={`${uid}-email`}
                      className="mk-dg-input"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      value={values.email}
                      onChange={(event) => patch({ email: event.target.value })}
                      aria-invalid={Boolean(errors.email) || undefined}
                      aria-describedby={errors.email ? `${uid}-email-error` : undefined}
                    />
                  </Field>
                  <Field id={`${uid}-phone`} label="WhatsApp" error={errors.phone}>
                    <input
                      id={`${uid}-phone`}
                      className="mk-dg-input"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      value={values.phone}
                      onChange={(event) => patch({ phone: event.target.value })}
                      aria-invalid={Boolean(errors.phone) || undefined}
                      aria-describedby={errors.phone ? `${uid}-phone-error` : undefined}
                    />
                  </Field>
                </div>

                <div className="mk-dg-honeypot" aria-hidden="true">
                  <label>
                    Sitio web
                    <input ref={honeypot} type="text" name="website" tabIndex={-1} autoComplete="off" />
                  </label>
                </div>

                <Button type="submit" arrow block loading={submitting} loadingLabel="Guardando…">
                  Continuar y elegir horario
                </Button>
                <p className="mk-dg-privacy">
                  Usaremos tus datos para responder tu solicitud y coordinar la conversación.
                </p>
              </form>
            </>
          ) : null}

          {step === "agenda" ? (
            <div className="mk-dg-agenda">
              {agendaUrl ? (
                <p className="mk-dg-meeting">
                  <CalendarCheck size={18} aria-hidden />
                  <span>
                    <strong>Reunión de activación</strong> · revisamos tu necesidad, validamos el alcance y resolvemos
                    tus dudas.
                  </span>
                </p>
              ) : null}
              {agendaUrl ? (
                <iframe
                  title="Agenda de la reunión de activación"
                  src={agendaSrc(agendaUrl, values)}
                  className="mk-dg-frame"
                />
              ) : (
                <div className="mk-dg-fallback" role="status">
                  <h2>Recibimos tus datos.</h2>
                  <p>
                    No pudimos cargar la agenda en este momento. Ya tenemos tu solicitud y te contactaremos para
                    coordinar la reunión.
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/**
 * Agenda de GHL con los datos que la persona ya dejó (nombre, email, WhatsApp):
 * el contacto de la reserva es el mismo del lead y no hay que escribirlos otra vez.
 */
function agendaSrc(base: string, values: { name: string; email: string; phone: string }): string {
  try {
    const url = new URL(base);
    const [first, ...rest] = values.name.trim().split(/\s+/);
    if (first) url.searchParams.set("first_name", first);
    if (rest.length) url.searchParams.set("last_name", rest.join(" "));
    if (values.email.trim()) url.searchParams.set("email", values.email.trim());
    if (values.phone.trim()) url.searchParams.set("phone", values.phone.trim());
    return url.toString();
  } catch {
    return base;
  }
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div className="mk-dg-field">
      <label htmlFor={id}>{label}</label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mk-dg-error" role="alert">
          <AlertCircle size={14} aria-hidden /> {error}
        </p>
      ) : null}
    </div>
  );
}
