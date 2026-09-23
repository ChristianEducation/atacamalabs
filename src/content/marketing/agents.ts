/** Copy de /agentes — ATACAMA_LABS_FINAL_MINIMAL_WEB_SPEC_V3_0_1 §8 (A1–A8). */

export const AGENTS_META_DESCRIPTION =
  "Conversa con tus clientes, consulta tus sistemas, actualiza información y ejecuta el siguiente paso. Tú decides hasta dónde llega.";

/** A4 — verbos grandes, sin otra demo. */
export const AGENTS_VERBS = [
  "Consultar",
  "Crear",
  "Actualizar",
  "Enviar",
  "Agendar",
  "Registrar",
  "Derivar",
  "Generar",
  "Alertar",
] as const;

/** A5 — categorías genéricas; sin logos «por confirmar» (spec §16). */
export const AGENTS_CATEGORIES = ["CRM", "Calendarios", "Mensajería", "ERP", "Bases de datos", "Sistemas internos"] as const;

/** A6 — control. */
export const AGENTS_CONTROL = [
  { title: "Permisos", body: "Defines qué puede ver, responder y ejecutar." },
  { title: "Confirmación humana", body: "Las acciones sensibles esperan tu aprobación cuando corresponde." },
  { title: "Trazabilidad", body: "Cada paso queda registrado y se puede revisar." },
] as const;

/** A7 — de diagnóstico a agente trabajando. */
export const AGENTS_STEPS = [
  { title: "Entendemos el trabajo", body: "Revisamos el proceso, la información disponible y dónde debe intervenir una persona." },
  { title: "Definimos reglas", body: "Acordamos permisos, límites y cuándo se necesita aprobación." },
  { title: "Conectamos herramientas", body: "Verificamos los accesos y las conexiones necesarias." },
  { title: "Probamos contigo", body: "Recorremos ejemplos y ajustamos antes de habilitarlo." },
  { title: "Lo ponemos a trabajar", body: "El agente queda operando dentro de tu proceso." },
] as const;
