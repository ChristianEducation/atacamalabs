/**
 * Copy y datos ilustrativos de /plataforma — ATACAMA_LABS_PLATAFORMA_SPEC_V1.
 * La página responde una sola pregunta: dónde veo y controlo todo lo que hacen
 * mis agentes. Los datos del portal (Empresa Norte) son un ejemplo, no cifras
 * de un cliente real.
 */

import type { AgentCtaContext } from "@/lib/marketing/agent-cta";

export const PLATFORM_META = {
  title: "Plataforma de agentes de IA para empresas | Atacama Labs",
  description:
    "Administra agentes, conversaciones, automatizaciones e integraciones desde una sola plataforma. Centraliza WhatsApp, Instagram, Facebook y web con Atacama Labs.",
  canonical: "https://atacamalabs.cl/plataforma",
} as const;

/** Contexto de los dos CTA de la página (CTA_SYSTEM_SPEC §2). */
export const PLATFORM_HERO_CTA: AgentCtaContext = {
  source_page: "plataforma",
  source_section: "hero",
  source_cta: "quiero-ver-como-funcionaria",
  service: "agentes",
};
export const PLATFORM_FINAL_CTA: AgentCtaContext = {
  source_page: "plataforma",
  source_section: "final-cta",
  source_cta: "quiero-verlo-en-mi-empresa",
  service: "agentes",
};

export const PLATFORM_HERO = {
  eyebrow: "PLATAFORMA",
  lead: "Administra tus agentes, sus conversaciones, herramientas y automatizaciones desde un solo lugar.",
  cta: "Quiero ver cómo funcionaría",
} as const;

/* ---------- Agentes del portal ---------- */

export type PlatformAgentId = "nayra" | "kusi" | "illa";

export const PLATFORM_AGENTS: Record<PlatformAgentId, { name: string; role: string }> = {
  nayra: { name: "Nayra", role: "Comercial" },
  kusi: { name: "Kusi", role: "Cobranza" },
  illa: { name: "Illa", role: "Administración" },
};

export const PLATFORM_COMPANY = "Empresa Norte";

/** Indicadores del hero (spec §2). */
export const HERO_STATS = [
  { value: "3", label: "agentes activos" },
  { value: "12", label: "conversaciones hoy" },
  { value: "4", label: "automatizaciones ejecutadas" },
] as const;

export const CREDIT = { included: 15, used: 6.4 } as const;

/* ---------- Demo principal ---------- */

export const PORTAL_HEADING = {
  title: "Todo lo que necesita tu operación, en un mismo lugar.",
  lead: "Supervisa a tus agentes, revisa conversaciones, conecta herramientas y mantén visible lo que está ocurriendo.",
} as const;

export type PortalTabId = "agentes" | "bandeja" | "contactos" | "automatizaciones" | "integraciones" | "consumo";

export const PORTAL_TABS: readonly { id: PortalTabId; label: string }[] = [
  { id: "agentes", label: "Agentes" },
  { id: "bandeja", label: "Bandeja" },
  { id: "contactos", label: "Contactos" },
  { id: "automatizaciones", label: "Automatizaciones" },
  { id: "integraciones", label: "Integraciones" },
  { id: "consumo", label: "Consumo" },
];

export const PORTAL_NOTE = "Representación ilustrativa. Las vistas y funciones se configuran según tu solución.";

/** Lo que dice cada vista al pie (spec §4–§9). */
export const PORTAL_CAPTIONS: Record<PortalTabId, string> = {
  agentes: "Tus agentes, como parte de tu equipo.",
  bandeja: "El agente y el equipo humano trabajan sobre la misma conversación.",
  contactos: "Cada conversación deja contexto para la siguiente acción.",
  automatizaciones: "Procesos que siguen funcionando aunque nadie esté escribiendo.",
  integraciones: "Conecta tus agentes con las herramientas donde ocurre el trabajo.",
  consumo: "Sabes cuánto estás usando y qué está generando ese consumo.",
};

export const AGENT_ROWS = [
  {
    agent: "nayra",
    state: "Activo",
    activity: "14 conversaciones",
    last: "Hace 2 min",
  },
  {
    agent: "kusi",
    state: "Activo",
    activity: "8 seguimientos",
    last: "Hace 11 min",
  },
  { agent: "illa", state: "Activo", activity: "5 tareas", last: "Hace 26 min" },
] as const satisfies readonly {
  agent: PlatformAgentId;
  state: string;
  activity: string;
  last: string;
}[];

export const AGENT_ACTIONS = ["Ver agente", "Ver actividad", "Configuración"] as const;

/* ---------- Bandeja ---------- */

export type Channel = "WhatsApp" | "Instagram" | "Facebook" | "Web";
export const CHANNELS: readonly Channel[] = ["WhatsApp", "Instagram", "Facebook", "Web"];

export type ChatSide = "customer" | "agent" | "team";
export interface ChatMessage {
  side: ChatSide;
  text: string;
}

export interface Conversation {
  id: string;
  /** Nombre visible; las iniciales del avatar salen de aquí. */
  name: string;
  company: string;
  channel: Channel;
  agent: PlatformAgentId;
  preview: string;
  time: string;
  messages: readonly ChatMessage[];
  /** Respuesta del equipo al tomar la conversación. */
  teamReply: string;
  context: {
    interest: string;
    label: string;
    next: string;
  };
}

export const CONVERSATIONS: readonly Conversation[] = [
  {
    id: "camila",
    name: "Camila",
    company: "Clínica Norte",
    channel: "Instagram",
    agent: "nayra",
    preview: "¿Tienen hora para mañana?",
    time: "Ahora",
    messages: [
      { side: "customer", text: "¿Tienen hora para mañana?" },
      { side: "agent", text: "Sí. Déjame revisar disponibilidad." },
      { side: "agent", text: "Tengo 10:30 y 16:00. ¿Cuál te acomoda?" },
    ],
    teamReply: "Hola Camila, soy del equipo. Te dejo agendada a las 10:30.",
    context: {
      interest: "Hora médica",
      label: "Prospecto nuevo",
      next: "Confirmar hora de mañana",
    },
  },
  {
    id: "ferreteria",
    name: "Ferretería Andes",
    company: "Cliente con saldo",
    channel: "WhatsApp",
    agent: "kusi",
    preview: "Ya hice la transferencia.",
    time: "9:12",
    messages: [
      {
        side: "agent",
        text: "Hola, te recordamos la factura 1042 por vencer el viernes.",
      },
      { side: "customer", text: "Ya hice la transferencia." },
      { side: "agent", text: "Gracias. Reviso el pago y te confirmo." },
    ],
    teamReply: "Hola, soy del equipo. Confirmamos el pago de la factura 1042.",
    context: {
      interest: "Pago de factura",
      label: "Cobranza en curso",
      next: "Verificar transferencia",
    },
  },
  {
    id: "marta",
    name: "Marta Salas",
    company: "Consulta general",
    channel: "Facebook",
    agent: "nayra",
    preview: "¿Hacen envíos a regiones?",
    time: "8:47",
    messages: [
      { side: "customer", text: "¿Hacen envíos a regiones?" },
      {
        side: "agent",
        text: "Sí, despachamos a todo el país. ¿A qué ciudad sería?",
      },
    ],
    teamReply: "Hola Marta, soy del equipo. Te cotizo el envío ahora mismo.",
    context: {
      interest: "Envíos",
      label: "Consulta",
      next: "Cotizar despacho",
    },
  },
  {
    id: "web",
    name: "Visitante web",
    company: "Sitio de la empresa",
    channel: "Web",
    agent: "illa",
    preview: "Necesito una boleta de mi compra.",
    time: "8:20",
    messages: [
      { side: "customer", text: "Necesito una boleta de mi compra." },
      { side: "agent", text: "Claro. ¿Me indicas el número de pedido?" },
    ],
    teamReply: "Hola, soy del equipo. Ya te envío la boleta por correo.",
    context: {
      interest: "Documento tributario",
      label: "Administrativo",
      next: "Enviar boleta",
    },
  },
];

export const INBOX_ACTIONS = ["Tomar conversación", "Devolver al agente", "Marcar resuelta", "Ver contacto"] as const;

/* ---------- Contactos ---------- */

export interface Contact {
  id: string;
  name: string;
  company: string;
  channel: Channel;
  agent: PlatformAgentId;
  tags: readonly string[];
  phone: string;
  last: string;
  next: string;
  history: readonly string[];
  note: string;
}

export const CONTACTS: readonly Contact[] = [
  {
    id: "camila",
    name: "Camila",
    company: "Clínica Norte",
    channel: "Instagram",
    agent: "nayra",
    tags: ["Prospecto", "Hora médica"],
    phone: "+56 9 •••• 4821",
    last: "Hoy · pidió hora para mañana",
    next: "Confirmar hora de mañana",
    history: ["Escribió por Instagram", "Nayra revisó disponibilidad", "Se ofrecieron dos horarios"],
    note: "Prefiere horarios de mañana.",
  },
  {
    id: "ferreteria",
    name: "Ferretería Andes",
    company: "Cliente",
    channel: "WhatsApp",
    agent: "kusi",
    tags: ["Cobranza", "Factura 1042"],
    phone: "+56 9 •••• 7305",
    last: "Hoy · informó una transferencia",
    next: "Verificar el pago",
    history: ["Kusi envió recordatorio", "El cliente respondió", "Pago informado"],
    note: "Paga por transferencia, casi siempre los jueves.",
  },
  {
    id: "marta",
    name: "Marta Salas",
    company: "Particular",
    channel: "Facebook",
    agent: "nayra",
    tags: ["Consulta", "Envíos"],
    phone: "+56 9 •••• 1160",
    last: "Hoy · preguntó por envíos",
    next: "Cotizar despacho",
    history: ["Escribió desde Facebook", "Nayra respondió sobre cobertura"],
    note: "Consultó por envíos a regiones.",
  },
];

/* ---------- Automatizaciones ---------- */

export interface Automation {
  name: string;
  agent: PlatformAgentId;
  cadence: string;
  last: string;
  next: string;
}

export const AUTOMATIONS: readonly Automation[] = [
  {
    name: "Seguimiento de prospectos",
    agent: "nayra",
    cadence: "Cada mañana",
    last: "Hoy · 09:00",
    next: "Mañana · 09:00",
  },
  {
    name: "Recordatorio de pagos",
    agent: "kusi",
    cadence: "Días hábiles",
    last: "Hoy · 10:00",
    next: "Mañana · 10:00",
  },
  {
    name: "Resumen comercial",
    agent: "nayra",
    cadence: "Viernes 17:00",
    last: "Vie pasado · 17:00",
    next: "Viernes · 17:00",
  },
  {
    name: "Revisión de agenda",
    agent: "illa",
    cadence: "Cada mañana",
    last: "Hoy · 08:30",
    next: "Mañana · 08:30",
  },
];

/* ---------- Integraciones ---------- */

export const INTEGRATION_COUNT = "+400 integraciones estándar disponibles";
export const INTEGRATION_PROTOCOLS = "API · HTTP · MCP · sistemas propios";
export const INTEGRATION_EXAMPLES_NOTE = "Algunos ejemplos. Las herramientas se definen según tu implementación.";

/** Categorías con ejemplos conocidos (ids de HOME_TOOLS); no es una lista cerrada. */
export const INTEGRATION_GROUPS: readonly {
  label: string;
  tools: readonly string[];
}[] = [
  { label: "Correo", tools: ["gmail", "microsoftoutlook"] },
  { label: "Calendarios", tools: ["googlecalendar", "calendly"] },
  { label: "CRM", tools: ["hubspot", "salesforce", "zoho"] },
  { label: "Hojas de cálculo", tools: ["googlesheets", "airtable"] },
  { label: "Mensajería", tools: ["whatsapp", "slack", "microsoftteams"] },
  { label: "Productividad", tools: ["notion", "trello", "asana"] },
  { label: "Ecommerce", tools: ["shopify", "woocommerce"] },
  { label: "Bases de datos", tools: ["supabase", "postgresql"] },
];

/* ---------- Consumo ---------- */

export const CONSUMPTION_BY_AGENT = [
  { agent: "nayra", amount: 3.1 },
  { agent: "kusi", amount: 1.9 },
  { agent: "illa", amount: 1.4 },
] as const satisfies readonly { agent: PlatformAgentId; amount: number }[];

/** Actividad de la semana (alturas relativas, lunes a domingo). */
export const CONSUMPTION_WEEK = [
  { day: "L", value: 46 },
  { day: "M", value: 62 },
  { day: "X", value: 54 },
  { day: "J", value: 78 },
  { day: "V", value: 100 },
  { day: "S", value: 28 },
  { day: "D", value: 18 },
] as const;

/* ---------- Omnicanal ---------- */

export const OMNI_HEADING = {
  title: "Todas tus conversaciones. Una sola bandeja.",
  lead: "Centraliza WhatsApp, Instagram, Facebook y web. Tus agentes pueden atender automáticamente y tu equipo puede entrar, revisar el contexto y continuar la conversación cuando lo necesite.",
} as const;

export const OMNI_NOTE =
  "Los canales se centralizan cuando forman parte de la implementación. Representación ilustrativa.";

/* ---------- Control ---------- */

export const CONTROL_HEADING = {
  title: "Tu operación sigue siendo tuya.",
  lead: "Nosotros implementamos y acompañamos. Tú mantienes acceso y control sobre tus agentes y su operación.",
} as const;

export const CONTROL_PILLARS = [
  {
    id: "configura",
    title: "Configura",
    body: "Ajusta conocimiento, información e instrucciones dentro del alcance de tu solución.",
  },
  {
    id: "conecta",
    title: "Conecta",
    body: "Autoriza las herramientas y canales que tus agentes necesitan para trabajar.",
  },
  {
    id: "supervisa",
    title: "Supervisa",
    body: "Revisa conversaciones, actividad, automatizaciones y consumo desde tu cuenta.",
  },
] as const;

export const CONTROL_CLOSING = "Una sola plataforma para configurar, conectar y supervisar el trabajo de tus agentes.";

/* ---------- Integraciones + trabajo real ---------- */

export const FLOW_HEADING = {
  title: "Conectada a las herramientas donde ocurre el trabajo.",
  lead: "Tus agentes no viven aislados dentro de la plataforma. Consultan información y ejecutan acciones en los sistemas que tu operación necesita.",
} as const;

export const FLOWS = [
  {
    id: "cobranza",
    agent: "kusi",
    title: "Agente de cobranza",
    steps: ["Consulta información", "Identifica deuda", "Envía seguimiento", "Registra resultado"],
  },
  {
    id: "comercial",
    agent: "nayra",
    title: "Agente comercial",
    steps: ["Recibe consulta", "Revisa disponibilidad", "Agenda", "Actualiza CRM"],
  },
] as const satisfies readonly {
  id: string;
  agent: PlatformAgentId;
  title: string;
  steps: readonly string[];
}[];

/* ---------- CTA final ---------- */

export const PLATFORM_CTA = {
  title: "Tus agentes trabajan. Tú sabes qué está pasando.",
  body: "Cuéntanos cómo funciona hoy tu operación y te mostramos cómo podría verse dentro de Atacama.",
  label: "Quiero verlo en mi empresa",
} as const;
