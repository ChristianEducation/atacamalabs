/** Copy de /a-medida — ATACAMA_LABS_FINAL_MINIMAL_WEB_SPEC_V3_0_1 §10 (M1–M6). */

export const CUSTOM_META =
  "Conectamos herramientas, automatizamos tareas y construimos alrededor de cómo trabaja tu empresa.";

/** M4 — máximo cuatro categorías, sin preview por categoría. */
export const CUSTOM_GROUPS = [
  {
    title: "Automatizaciones e integraciones",
    body: "Haz que la información pase al siguiente paso sin volver a copiarla.",
  },
  {
    title: "Dashboards y backoffice",
    body: "Reúne pendientes, responsables y estados en una vista útil para tu equipo.",
  },
  {
    title: "Apps y portales",
    body: "Dale a cada persona una forma clara de consultar, solicitar o actualizar información.",
  },
  {
    title: "Sistemas internos",
    body: "Ordena una operación completa cuando las herramientas aisladas ya no alcanzan.",
  },
] as const;

/** M5 — proceso de cinco etapas. */
export const CUSTOM_PROCESS = [
  { title: "Entendemos", body: "Revisamos cómo trabaja tu equipo hoy." },
  { title: "Diseñamos", body: "Definimos el flujo y la interfaz necesarios." },
  { title: "Construimos", body: "Desarrollamos por partes que puedas revisar." },
  { title: "Probamos", body: "Verificamos que funcione con tu equipo." },
  { title: "Implementamos", body: "Queda operando dentro de tu proceso." },
] as const;
