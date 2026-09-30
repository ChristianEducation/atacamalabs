import type { IndustrySlug } from "./industries";

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

/** Todas las páginas indexables bajo /agentes/[slug] (SEO_GROWTH_SPEC_V1 §12–§15): los 6 cargos + WhatsApp. */
export type AgentPageSlug = AgentRoleId | "whatsapp";

/** Contenido propio de la landing /agentes/[slug] de cada cargo — SEO_GROWTH_SPEC_V1 §13–§14. */
export interface AgentRoleSeo {
  title: string;
  description: string;
  h1: string;
  intro: string;
  relatedIndustries: readonly IndustrySlug[];
  faq: readonly { question: string; answer: string }[];
}

export interface AgentRole {
  id: AgentRoleId;
  /** Nombre corto del cargo en la pestaña. */
  tab: string;
  title: string;
  desc: string;
  features: readonly string[];
  cta: { label: string };
  seo: AgentRoleSeo;
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
    seo: {
      title: "Agente de IA para ventas y comercial | Atacama Labs",
      description:
        "Un agente que responde consultas, califica interesados y hace seguimiento comercial por WhatsApp u otros canales, conectado a tu CRM y tu calendario.",
      h1: "Agente de IA para ventas y equipos comerciales",
      intro:
        "Cuando una consulta comercial llega fuera de horario o mientras el equipo está ocupado, el agente puede responder, entender qué necesita esa persona y dejar la oportunidad calificada y registrada para que alguien continúe, en vez de perderla.",
      relatedIndustries: ["inmobiliarias", "retail-ecommerce", "b2b-industria", "servicios-profesionales"],
      faq: [
        {
          question: "¿Reemplaza a mi equipo comercial?",
          answer:
            "No. Responde, califica y agenda para que tu equipo llegue a cada conversación con contexto, en vez de partir desde cero. El cierre y las decisiones comerciales siguen siendo de tu equipo.",
        },
        {
          question: "¿Con qué CRM se conecta?",
          answer:
            "Depende de la herramienta que ya uses: HubSpot, Salesforce, Zoho u otro con API, webhook o MCP. La conexión concreta se define según tu operación.",
        },
        {
          question: "¿Puede agendar una reunión directamente?",
          answer:
            "Sí, si está conectado a tu calendario. Revisa disponibilidad y deja la reunión registrada como parte del mismo flujo comercial.",
        },
      ],
    },
  },
  {
    id: "cobranza",
    tab: "Cobranza",
    title: "Agente de Cobranza",
    desc: "Hace seguimiento, recuerda, registra respuestas y mantiene cada cuenta en movimiento.",
    features: ["Seguimiento de cuentas", "Recordatorios y respuestas", "Actualización de estados y próximas acciones"],
    cta: { label: "Quiero este agente" },
    seo: {
      title: "Agente de IA para cobranza y seguimiento | Atacama Labs",
      description:
        "Un agente que recuerda, hace seguimiento y registra respuestas de cobranza sin depender de que alguien se acuerde de escribir cada cuenta atrasada.",
      h1: "Agente de IA para cobranza",
      intro:
        "El seguimiento de cobranza suele perderse entre otras prioridades del día. El agente recuerda vencimientos, hace seguimiento de cuentas pendientes y registra cada respuesta, dejando el estado y el próximo paso claros para tu equipo.",
      relatedIndustries: ["contabilidad-finanzas", "gimnasios", "b2b-industria"],
      faq: [
        {
          question: "¿Puede aplicar descuentos o negociar montos?",
          answer:
            "Solo si defines esa regla explícitamente. Por defecto hace seguimiento y registra; cualquier acción sensible como modificar un monto queda sujeta a aprobación o se deriva a tu equipo.",
        },
        {
          question: "¿Con qué sistemas se conecta para saber qué está atrasado?",
          answer:
            "Con el sistema donde ya llevas esa información — planillas, CRM o el software contable que uses —, según la integración disponible y configurada para tu empresa.",
        },
        {
          question: "¿Qué pasa si la persona no responde?",
          answer: "Sigue el calendario de seguimiento que definas y deja registrado cada intento para que tu equipo tenga trazabilidad completa.",
        },
      ],
    },
  },
  {
    id: "administrativo-financiero",
    tab: "Finanzas",
    title: "Agente Administrativo / Financiero",
    desc: "Consulta información, cruza datos y ejecuta tareas administrativas bajo tus reglas.",
    features: ["Consulta sistemas y documentos", "Cruza información", "Genera o registra acciones administrativas"],
    cta: { label: "Quiero este agente" },
    seo: {
      title: "Agente de IA administrativo y financiero | Atacama Labs",
      description:
        "Un agente que consulta documentos y sistemas, cruza información y ejecuta tareas administrativas bajo las reglas y permisos que definas.",
      h1: "Agente de IA administrativo y financiero",
      intro:
        "Muchas tareas administrativas son repetitivas pero requieren revisar más de un sistema o documento. El agente puede consultar esa información, cruzarla y dejar la acción preparada o registrada, siempre dentro de los límites que definas.",
      relatedIndustries: ["contabilidad-finanzas", "b2b-industria"],
      faq: [
        {
          question: "¿Puede emitir documentos o hacer pagos por sí solo?",
          answer:
            "Solo acciones que definas como permitidas. Cualquier acción sensible —como emitir un documento o ejecutar un pago— puede quedar sujeta a aprobación antes de concretarse.",
        },
        {
          question: "¿Necesito tener todo digitalizado?",
          answer:
            "Necesita acceso a la información que va a consultar, ya sea por API, planilla conectada o el sistema que uses. Se evalúa según cómo trabaja hoy tu empresa.",
        },
        {
          question: "¿Reemplaza a mi área administrativa?",
          answer:
            "No. Se enfoca en el trabajo repetitivo de consultar, cruzar y dejar preparada la información, para que tu equipo revise y decida lo que requiere criterio.",
        },
      ],
    },
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
    seo: {
      title: "Agente de IA para atención al cliente | Atacama Labs",
      description:
        "Un agente que atiende solicitudes con el conocimiento real de tu empresa y deriva a una persona, con el contexto completo, cuando la situación lo necesita.",
      h1: "Agente de IA para atención al cliente",
      intro:
        "Responder con el contexto correcto es lo que distingue a un agente de un bot genérico. Este agente consulta la información de tu empresa antes de responder y, cuando una solicitud necesita criterio humano, deriva con toda la conversación, no solo un resumen.",
      relatedIndustries: ["salud", "educacion", "retail-ecommerce", "alimentacion-casinos"],
      faq: [
        {
          question: "¿Cómo sabe qué información dar?",
          answer:
            "Consulta el contexto y los documentos que le entregas sobre tu empresa — servicios, políticas, preguntas frecuentes— en vez de responder con información genérica.",
        },
        {
          question: "¿Cuándo deriva a una persona?",
          answer:
            "Cuando la solicitud necesita criterio humano, una decisión sensible o simplemente lo defines así. Deriva con la conversación completa para que la persona no tenga que empezar de nuevo.",
        },
        {
          question: "¿Funciona en varios canales a la vez?",
          answer: "Puede atender por WhatsApp u otros canales de mensajería, según los que uses hoy en tu empresa.",
        },
      ],
    },
  },
  {
    id: "agendamiento",
    tab: "Agendamiento",
    title: "Agente de Agendamiento",
    desc: "Revisa disponibilidad, propone horarios y deja la cita registrada.",
    features: ["Consulta disponibilidad", "Propone y reprograma horarios", "Registra citas y próximos pasos"],
    cta: { label: "Quiero este agente" },
    seo: {
      title: "Agente de IA para agendamiento | Atacama Labs",
      description:
        "Un agente que revisa disponibilidad, propone horarios, confirma y reprograma citas por WhatsApp, conectado a tu calendario.",
      h1: "Agente de IA para agendamiento",
      intro:
        "Coordinar una hora suele tomar varios mensajes de ida y vuelta. El agente revisa la disponibilidad real de tu calendario, propone horarios, confirma la cita y avisa cuando corresponde reprogramar o recordar.",
      relatedIndustries: ["salud", "inmobiliarias", "gimnasios", "educacion"],
      faq: [
        {
          question: "¿Con qué calendarios funciona?",
          answer: "Google Calendar, Calendly, Outlook u otro que ya uses, conectado directamente o vía API.",
        },
        {
          question: "¿Puede enviar recordatorios y reconfirmar la cita?",
          answer: "Sí. Puede recordar antes de la hora agendada y reconfirmar, reduciendo las horas sin confirmar que suelen terminar en no shows.",
        },
        {
          question: "¿Qué pasa si dos personas piden el mismo horario?",
          answer: "Consulta la disponibilidad real antes de proponer una hora, así que no ofrece horarios que ya están tomados en tu calendario.",
        },
      ],
    },
  },
  {
    id: "procesos",
    tab: "Procesos",
    title: "Agente de Procesos",
    desc: "Coordina tareas entre sistemas cuando tu flujo no cabe en una plantilla.",
    features: ["Recibe una entrada", "Trabaja con varias herramientas", "Registra o ejecuta el resultado"],
    cta: { label: "Quiero este agente" },
    seo: {
      title: "Agentes de IA para automatizar procesos | Atacama Labs",
      description:
        "Un agente que coordina tareas entre varias herramientas y sistemas cuando tu proceso no encaja en una plantilla estándar.",
      h1: "Agentes de IA para automatizar procesos",
      intro:
        "No todo proceso cabe en un flujo predefinido. Este agente recibe una entrada, trabaja con las herramientas que corresponda —CRM, planillas, APIs propias— y registra o ejecuta el resultado según las reglas de tu operación.",
      relatedIndustries: ["alimentacion-casinos", "b2b-industria", "contabilidad-finanzas"],
      faq: [
        {
          question: "¿Qué tipo de proceso puede automatizar?",
          answer:
            "Procesos que hoy dependen de pasar información manualmente entre sistemas: recibir un pedido y registrarlo, cruzar datos de dos herramientas, preparar un reporte, entre otros. Se define según tu operación.",
        },
        {
          question: "¿Necesita que mis sistemas tengan API?",
          answer:
            "Es lo más directo, pero también puede trabajar con hojas de cálculo, webhooks o integraciones a medida cuando la herramienta no tiene una API estándar.",
        },
        {
          question: "¿Qué pasa si el proceso falla a mitad de camino?",
          answer: "Se define un comportamiento claro para esos casos: puede detenerse, avisar o derivar a una persona, según cómo lo configures.",
        },
      ],
    },
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
