/**
 * Valor comercial del Home — MASTER_PLAN_CONVERSION §5. Va entre el selector y
 * los precios y responde, sin encabezados de pregunta, qué recibe la empresa,
 * qué cambia en su trabajo y por qué confiar. Las tres tarjetas llevan una
 * ilustración pequeña (HomeValue.tsx): un puesto con su panel de gestión, un
 * flujo mensaje → registro → agenda → acción y la secuencia de puesta en marcha.
 * Sin cifras, plazos ni resultados prometidos.
 */

export const HOME_VALUE_HEADING = {
  eyebrow: "TECNOLOGÍA PARA EL TRABAJO REAL",
  title: "Tu empresa sigue trabajando. Ahora con menos tareas pendientes.",
  lead: "Un agente que se adapta a tu operación, conectado a tus herramientas y acompañado por nuestro equipo.",
} as const;

export type HomeValueArt = "puesto" | "flujo" | "puesta-en-marcha";

export const HOME_VALUE_CARDS: readonly {
  id: HomeValueArt;
  number: string;
  title: string;
  body: string;
}[] = [
  {
    id: "puesto",
    number: "01",
    title: "Preparado para tu negocio",
    body: "Con tu información, tus reglas, tus herramientas y una plataforma para gestionar su trabajo.",
  },
  {
    id: "flujo",
    number: "02",
    title: "Trabajo que avanza",
    body: "Atiende, registra, coordina y ejecuta tareas sin depender de una intervención en cada paso.",
  },
  {
    id: "puesta-en-marcha",
    number: "03",
    title: "Con control y acompañamiento",
    body: "Entendemos tus procesos, conectamos los sistemas y probamos la solución contigo.",
  },
];

/** Ilustración 02: el recorrido de una conversación. Los íconos son los de la oficina de /agentes. */
export const HOME_VALUE_FLOW = [
  { icon: "chat", label: "Mensaje" },
  { icon: "crm", label: "Registro" },
  { icon: "calendar", label: "Agenda" },
  { icon: "api", label: "Acción" },
] as const;

/** Ilustración 03: validación, conexión y puesta en marcha. */
export const HOME_VALUE_STEPS = [
  { label: "Validación", note: "con tu equipo" },
  { label: "Conexión", note: "a tus sistemas" },
  { label: "Puesta en marcha", note: "acompañada" },
] as const;
