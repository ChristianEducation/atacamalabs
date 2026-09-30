import type { IndustrySlug } from "./industries";
import { AGENT_ROLES, type AgentPageSlug } from "./agents";

/**
 * Canales de agente que no son un cargo (SEO_GROWTH_SPEC_V1 §13): WhatsApp es
 * un canal, no un puesto, así que vive en un registro propio en vez de forzarse
 * dentro de `AgentRole`. Fuente única para /agentes/whatsapp.
 */
export interface AgentChannel {
  slug: "whatsapp";
  tab: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  /** Lo que distingue a un agente de un chatbot de respuestas (§14). */
  capabilities: readonly string[];
  relatedIndustries: readonly IndustrySlug[];
  faq: readonly { question: string; answer: string }[];
}

export const WHATSAPP_CHANNEL: AgentChannel = {
  slug: "whatsapp",
  tab: "WhatsApp",
  title: "Agentes de IA para WhatsApp en Chile | Atacama Labs",
  description:
    "Agentes de IA que no solo responden por WhatsApp: consultan información, ejecutan acciones, registran y agendan, conectados a tus herramientas.",
  h1: "Agentes de IA para WhatsApp que hacen el trabajo",
  intro:
    "Un chatbot responde con un guion fijo. Un agente conectado a WhatsApp puede consultar información real de tu empresa, ejecutar una acción, registrar lo que conversó y derivar a una persona cuando corresponde — todo dentro del mismo canal que tus clientes ya usan.",
  capabilities: [
    "Responder con información real de tu empresa, no un guion fijo",
    "Consultar sistemas y datos conectados antes de responder",
    "Ejecutar acciones: agendar, registrar un pedido, actualizar un estado",
    "Dejar todo registrado en tu CRM, planilla o base de datos",
    "Agendar y confirmar citas contra tu calendario real",
    "Derivar a una persona con la conversación completa cuando corresponde",
  ],
  relatedIndustries: ["salud", "inmobiliarias", "retail-ecommerce", "alimentacion-casinos", "gimnasios"],
  faq: [
    {
      question: "¿Es lo mismo que un chatbot de WhatsApp Business?",
      answer:
        "No. Un chatbot típico sigue un árbol de respuestas fijas. Un agente entiende la conversación, consulta información real y puede ejecutar acciones conectadas a tus sistemas, no solo responder.",
    },
    {
      question: "¿Necesito WhatsApp Business API?",
      answer:
        "Sí, el agente se conecta a través de la API oficial de WhatsApp Business, no a un número personal. La habilitación de esa cuenta se revisa como parte de la implementación.",
    },
    {
      question: "¿Puede escribir primero, sin que el cliente escriba antes?",
      answer:
        "Depende de las ventanas y reglas que define Meta para mensajes fuera de conversación, y de si tu cuenta tiene plantillas aprobadas para ese uso. Se evalúa según tu caso.",
    },
  ],
};

export function getAgentChannel(slug: string): AgentChannel | undefined {
  return slug === WHATSAPP_CHANNEL.slug ? WHATSAPP_CHANNEL : undefined;
}

/** Metadata liviana de una landing /agentes/[slug], sea cargo o canal — para enlaces "Agentes relacionados". */
export interface AgentPageMeta {
  slug: AgentPageSlug;
  tab: string;
  h1: string;
  blurb: string;
}

export const AGENT_PAGES: readonly AgentPageMeta[] = [
  ...AGENT_ROLES.map((role) => ({ slug: role.id, tab: role.tab, h1: role.seo.h1, blurb: role.desc })),
  { slug: WHATSAPP_CHANNEL.slug, tab: WHATSAPP_CHANNEL.tab, h1: WHATSAPP_CHANNEL.h1, blurb: WHATSAPP_CHANNEL.description },
];

export function getAgentPageMeta(slug: string): AgentPageMeta | undefined {
  return AGENT_PAGES.find((page) => page.slug === slug);
}
