/**
 * Copy de /agentes — ATACAMA_LABS_AGENTES_SPEC_V1. La página cuenta una sola
 * idea: incorporar a una persona que trabaja dentro de la empresa. Elegir el
 * cargo, cómo se le hace la inducción, qué herramientas usa y hasta dónde
 * llega. Los destinos de los CTA dependen de /diagnostico (parámetros
 * `necesidad` y `capacidad`) y de /precios.
 */

export const AGENTS_META_DESCRIPTION =
  "Agentes que conversan, consultan información y ejecutan procesos conectados a las herramientas de tu empresa.";

/* ---------- Hero ---------- */

export const AGENTS_HERO = {
  eyebrow: "AGENTES INTELIGENTES",
  lead: "Agentes que conversan, consultan información y ejecutan procesos conectados a las herramientas de tu empresa.",
  primary: { label: "Explorar agentes", href: "#selector-agentes" },
  secondary: { label: "Probar a Nayra", href: "/diagnostico" },
} as const;

/* ---------- Selector de puestos ---------- */

export type AgentRoleId =
  "comercial" | "cobranza" | "administrativo-financiero" | "atencion" | "agendamiento" | "procesos";

export interface AgentRole {
  id: AgentRoleId;
  /** Nombre corto del cargo en la pestaña. */
  tab: string;
  title: string;
  desc: string;
  features: readonly string[];
  cta: { label: string };
}

export const AGENTS_SELECTOR_HEADING = {
  title: "¿Qué trabajo quieres delegar primero?",
  lead: "Elige un rol y mira cómo podría trabajar dentro de tu empresa. Después lo adaptamos a tus procesos, herramientas y reglas.",
} as const;

export const AGENTS_FEATURES_LABEL = "Funciones";

export const AGENT_ROLES: readonly AgentRole[] = [
  {
    id: "comercial",
    tab: "Comercial",
    title: "Agente Comercial",
    desc: "Responde, califica, vende y mantiene cada oportunidad en movimiento.",
    features: [
      "Responde consultas y detecta intención",
      "Califica oportunidades",
      "Agenda y actualiza el proceso comercial",
    ],
    cta: { label: "Quiero este agente" },
  },
  {
    id: "cobranza",
    tab: "Cobranza",
    title: "Agente de Cobranza",
    desc: "Hace seguimiento, recuerda, registra respuestas y mantiene cada cuenta en movimiento.",
    features: ["Seguimiento de cuentas", "Recordatorios y respuestas", "Actualización de estados y próximas acciones"],
    cta: { label: "Quiero este agente" },
  },
  {
    id: "administrativo-financiero",
    tab: "Finanzas",
    title: "Agente Administrativo / Financiero",
    desc: "Consulta información, cruza datos y ejecuta tareas administrativas bajo tus reglas.",
    features: ["Consulta sistemas y documentos", "Cruza información", "Genera o registra acciones administrativas"],
    cta: { label: "Quiero este agente" },
  },
  {
    id: "atencion",
    tab: "Atención",
    title: "Agente de Atención",
    desc: "Atiende solicitudes, busca contexto y deriva a una persona cuando corresponde.",
    features: [
      "Responde con conocimiento de la empresa",
      "Consulta contexto antes de actuar",
      "Deriva con la conversación completa cuando necesita intervención humana",
    ],
    cta: { label: "Quiero este agente" },
  },
  {
    id: "agendamiento",
    tab: "Agendamiento",
    title: "Agente de Agendamiento",
    desc: "Revisa disponibilidad, propone horarios y deja la cita registrada.",
    features: ["Consulta disponibilidad", "Propone y reprograma horarios", "Registra citas y próximos pasos"],
    cta: { label: "Quiero este agente" },
  },
  {
    id: "procesos",
    tab: "Procesos",
    title: "Agente de Procesos",
    desc: "Coordina tareas entre sistemas cuando tu flujo no cabe en una plantilla.",
    features: ["Recibe una entrada", "Trabaja con varias herramientas", "Registra o ejecuta el resultado"],
    cta: { label: "Quiero este agente" },
  },
];

/* ---------- Inducción ---------- */

export const AGENTS_ONBOARDING_HEADING = {
  title: "Así ponemos a trabajar tu agente.",
  lead: "Entendemos tu empresa, definimos su trabajo, conectamos tus herramientas y lo probamos antes de ponerlo en operación.",
} as const;

/** Nombre de cada momento en una sola palabra: es el texto del globo sobre el trabajador. */
export const AGENTS_MOMENTS = ["Llegada", "Inducción", "Límites", "Herramientas", "Prueba", "Operación"] as const;

export const AGENTS_STAGES = [
  {
    number: "01",
    title: "Entendemos tu empresa",
    body: "Nos das el contexto que necesita para entender cómo funciona tu empresa.",
  },
  {
    number: "02",
    title: "Definimos su trabajo",
    body: "Definimos qué puede hacer, qué no puede hacer y cuándo debe intervenir una persona.",
  },
  {
    number: "03",
    title: "Conectamos tus herramientas",
    body: "Lo conectamos con las herramientas que necesita para hacer el trabajo.",
  },
  {
    number: "04",
    title: "Probamos y lo ponemos a trabajar",
    body: "Probamos escenarios reales, ajustamos el comportamiento y lo dejamos listo para operar.",
  },
] as const;

/** Mini animaciones de cada tarjeta (ejemplos ilustrativos; no describen un cliente real). */
export const AGENTS_STAGE_SCENES = {
  context: {
    label: "Contexto de tu empresa",
    text: "Vendemos por WhatsApp y correo. Atendemos de lunes a sábado. Nos preguntan precios y plazos.",
    tag: "Contexto cargado · servicios · preguntas frecuentes · reglas",
  },
  work: {
    label: "Su trabajo, por escrito",
    items: [
      { badge: "OBJ", name: "Objetivo", meta: "Atender y agendar" },
      { badge: "TAR", name: "Tareas", meta: "Responder y registrar" },
      { badge: "LÍM", name: "Límites", meta: "Solo lo definido" },
    ],
    done: { name: "Pide ayuda a una persona", meta: "cuando corresponde" },
  },
  tools: {
    pills: ["WhatsApp", "Calendar", "CRM", "Sheets", "API"],
    done: "Herramientas conectadas",
  },
  live: {
    label: "Puesta en marcha",
    rows: ["Respuestas validadas", "Acciones validadas", "Permisos revisados", "Monitoreo inicial"],
    done: "Listo para operar",
  },
} as const;

/* ---------- Herramientas ---------- */

export const AGENTS_TOOLS_HEADING = {
  title: "Se conecta con lo que tu empresa ya usa.",
  lead: "Calendarios, CRM, mensajería, bases de datos, documentos, APIs y otras herramientas pueden formar parte del trabajo del agente.",
} as const;

export interface AgentToolGroup {
  id: string;
  name: string;
  /** Lo que el agente hace con estas herramientas, en voz activa. */
  action: string;
  logos: readonly { name: string; src: string }[];
  /** Herramienta sin logos concretos: describe cómo se conecta. */
  note?: string;
}

const logo = (name: string, id: string) => ({ name, src: `/visual/integrations/${id}.svg` });

export const AGENT_TOOL_GROUPS: readonly AgentToolGroup[] = [
  {
    id: "calendar",
    name: "Calendarios",
    action: "Revisa disponibilidad y crea la cita",
    logos: [
      logo("Google Calendar", "googlecalendar"),
      logo("Calendly", "calendly"),
      logo("Outlook", "microsoftoutlook"),
    ],
  },
  {
    id: "chat",
    name: "Mensajería",
    action: "Conversa y responde a tus clientes",
    logos: [logo("WhatsApp", "whatsapp"), logo("Gmail", "gmail"), logo("Slack", "slack")],
  },
  {
    id: "crm",
    name: "CRM",
    action: "Registra y actualiza cada oportunidad",
    logos: [logo("HubSpot", "hubspot"), logo("Salesforce", "salesforce"), logo("Zoho", "zoho")],
  },
  {
    id: "data",
    name: "Datos y hojas",
    action: "Consulta y guarda información",
    logos: [logo("Google Sheets", "googlesheets"), logo("Airtable", "airtable"), logo("Supabase", "supabase")],
  },
  {
    id: "docs",
    name: "Documentos",
    action: "Lee y ordena los documentos",
    logos: [logo("Google Drive", "googledrive"), logo("Notion", "notion")],
  },
  {
    id: "api",
    name: "APIs y MCP",
    action: "Trabaja con tus sistemas propios",
    logos: [logo("n8n", "n8n"), logo("Zapier", "zapier")],
    note: "Cualquier sistema con API, webhook o MCP",
  },
];

export const AGENTS_TOOLS_NOTE =
  "Conexión directa, vía API o MCP, o integración a medida, según la herramienta y el alcance del proyecto.";

/* ---------- Control ---------- */

export const AGENTS_CONTROL = {
  title: "Tú defines hasta dónde puede llegar.",
  body: "Cada agente trabaja con reglas, permisos y límites definidos. Cuando una acción necesita revisión, puede detenerse, pedir aprobación o derivar a una persona con el contexto completo.",
  states: [
    {
      id: "run",
      label: "Ejecuta",
      hint: "Acción permitida",
      example: "Agendar una reunión en tu calendario",
      result: "Hecho",
    },
    {
      id: "ask",
      label: "Pide aprobación",
      hint: "Acción sensible",
      example: "Emitir una nota de crédito",
      result: "Esperando tu aprobación",
    },
    {
      id: "handoff",
      label: "Deriva",
      hint: "Necesita a una persona",
      example: "Reclamo que requiere criterio humano",
      result: "Derivado con la conversación completa",
    },
  ],
} as const;

/* ---------- CTA final ---------- */

export const AGENTS_CTA = {
  title: "¿Qué trabajo le delegarías primero?",
  body: "Cuéntanos qué proceso quieres mejorar y diseñamos el agente alrededor de tu empresa.",
  primary: { label: "Hablar con Nayra", href: "/diagnostico" },
  secondary: { label: "Ver precios", href: "/precios#agentes" },
} as const;
