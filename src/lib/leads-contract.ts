/**
 * Contrato cliente de POST /api/leads — contracts/INTERFACES.md.
 * El endpoint real lo construye 002-operationalize-commercial-system.
 * Esta función ya apunta a /api/leads: hoy responde 404 (no existe aún)
 * y eso se mapea honestamente a retryable_error, sin fingir éxito.
 */

export type LeadFormValues = {
  name: string;
  company: string;
  email: string;
  phone: string;
  solution: string; // slug de content/site.json o "unsure"
  message: string;
};

export type FieldErrors = Partial<Record<keyof LeadFormValues, string>>;

export type LeadUiState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "received"; receiptId: string }
  | { status: "validation_error"; errors: FieldErrors }
  | { status: "retryable_error"; message: string; retryAfter?: number };

export function validateLead(values: LeadFormValues): FieldErrors {
  const errors: FieldErrors = {};

  const name = values.name.trim();
  if (name.length < 2 || name.length > 80) {
    errors.name = "Ingresa tu nombre (2 a 80 caracteres).";
  }

  if (values.company.trim().length > 120) {
    errors.company = "Máximo 120 caracteres.";
  }

  const email = values.email.trim();
  const phone = values.phone.trim();
  const emailValid = email.length > 0 && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const phoneDigits = phone.replace(/[^\d+]/g, "");
  const phoneValid = phone.length > 0 && phone.length <= 30 && phoneDigits.length >= 8;

  if (!emailValid && !phoneValid) {
    const msg = "Ingresa un correo válido o un teléfono de contacto.";
    errors.email = email.length > 0 ? "Correo no válido." : msg;
    errors.phone = phone.length > 0 ? "Teléfono no válido." : msg;
  }

  const message = values.message.trim();
  if (message.length < 20 || message.length > 1200) {
    errors.message = "Cuéntanos un poco más (20 a 1200 caracteres).";
  }

  return errors;
}

export async function submitLead(
  values: LeadFormValues,
  requestId: string,
  honeypot?: string,
): Promise<LeadUiState> {
  let response: Response;
  try {
    response = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId,
        name: values.name.trim(),
        company: values.company.trim() || undefined,
        email: values.email.trim() || undefined,
        phone: values.phone.trim() || undefined,
        message: values.message.trim(),
        solution: values.solution || "unsure",
        source: "web",
        website: honeypot || undefined,
      }),
    });
  } catch {
    return {
      status: "retryable_error",
      message:
        "No pudimos registrar tu consulta. Tus datos siguen en el formulario; inténtalo nuevamente o utiliza el correo de contacto.",
    };
  }

  if (response.status === 201 || response.status === 200) {
    const body = await response.json().catch(() => ({}));
    return { status: "received", receiptId: body.receiptId ?? requestId };
  }

  if (response.status === 422) {
    const body = await response.json().catch(() => ({ errors: {} }));
    return { status: "validation_error", errors: body.errors ?? {} };
  }

  if (response.status === 429) {
    const retryAfter = Number(response.headers.get("Retry-After") ?? 0) || undefined;
    return {
      status: "retryable_error",
      message: "Demasiados intentos por ahora. Inténtalo de nuevo en unos minutos.",
      retryAfter,
    };
  }

  // 404 (endpoint aún no existe, esperado hasta 002), 503, 409 y cualquier
  // otra respuesta no contemplada: fallo recuperable, sin falsa confirmación.
  return {
    status: "retryable_error",
    message:
      "No pudimos registrar tu consulta. Tus datos siguen en el formulario; inténtalo nuevamente o utiliza el correo de contacto.",
  };
}
