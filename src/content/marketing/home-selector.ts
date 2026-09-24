/**
 * Selector principal del Home — ATACAMA_LABS_HOME_SPEC_V1 §6. Seis puntos de
 * partida, cada uno con su copy, tres capacidades, CTA y una demo propia
 * (`HomeDemos`). Son puntos de entrada comerciales, no capacidades excluyentes.
 */

export type HomeSelectorId = "comercial" | "cobranza" | "administrativo" | "atencion" | "agendamiento" | "a-medida";

export interface HomeSelectorItem {
  id: HomeSelectorId;
  tab: string;
  title: string;
  desc: string;
  features: readonly string[];
  cta: { label: string; href: string };
}

export const HOME_SELECTOR_HEADING = {
  title: "¿Qué quieres que haga tu agente?",
  lead: "Elige una tarea y mira cómo trabaja.",
} as const;

export const HOME_SELECTOR: readonly HomeSelectorItem[] = [
  {
    id: "comercial",
    tab: "Comercial",
    title: "Agente Comercial",
    desc: "Conversa con quien pregunta, agenda la reunión en tu calendario y deja la oportunidad actualizada.",
    features: ["Responde consultas y disponibilidad", "Agenda directo en tu calendario", "Actualiza la oportunidad en tu CRM"],
    cta: { label: "Ver Agente Comercial", href: "/agentes#comercial" },
  },
  {
    id: "cobranza",
    tab: "Cobranza",
    title: "Agente de Cobranza",
    desc: "Sigue cada cuenta pendiente, contacta a tiempo y deja registrada cada gestión.",
    features: ["Revisa el estado de cada cuenta", "Envía recordatorios por WhatsApp o correo", "Registra cada gestión realizada"],
    cta: { label: "Ver Agente de Cobranza", href: "/agentes#cobranza" },
  },
  {
    id: "administrativo",
    tab: "Administrativo / Financiero",
    title: "Agente Administrativo y Financiero",
    desc: "Consulta tus sistemas y te devuelve la información ordenada, lista para decidir.",
    features: ["Consulta facturación y bases de datos", "Cruza y resume la información", "Responde bajo tus reglas y permisos"],
    cta: { label: "Ver Agente Administrativo", href: "/agentes#administrativo-financiero" },
  },
  {
    id: "atencion",
    tab: "Atención",
    title: "Agente de Atención",
    desc: "Atiende con la información de tu empresa, registra lo necesario y pasa a una persona cuando hace falta.",
    features: ["Pide el dato que falta", "Registra la solicitud en tu sistema", "Deriva al equipo cuando corresponde"],
    cta: { label: "Ver Agente de Atención", href: "/agentes#atencion" },
  },
  {
    id: "agendamiento",
    tab: "Agendamiento",
    title: "Agente de Agendamiento",
    desc: "Revisa la disponibilidad real, propone horarios y confirma la cita.",
    features: ["Lee la disponibilidad de tu calendario", "Propone horarios disponibles", "Confirma y deja el evento creado"],
    cta: { label: "Ver Agente de Agendamiento", href: "/agentes#agendamiento" },
  },
  {
    id: "a-medida",
    tab: "A Medida",
    title: "Soluciones a Medida",
    desc: "Conectamos tus sistemas y armamos el flujo alrededor de cómo trabaja tu empresa.",
    features: ["Integra las herramientas que ya usas", "Automatiza el proceso completo", "Se diseña contigo, a tu medida"],
    cta: { label: "Ver A Medida", href: "/a-medida" },
  },
];
