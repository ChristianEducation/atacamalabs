/**
 * Home F3 — selector principal de seis servicios (spec V2.2.1, pages/01-HOME.md F3/F3.1).
 * Cada estado cambia copy + beneficios + CTA + microinterfaz. Son puntos de entrada
 * comerciales, no capacidades técnicamente excluyentes.
 */

export type HomeServiceId = "agentes" | "comercial" | "cobranza" | "admin-finance" | "custom" | "websites";

export interface HomeService {
  id: HomeServiceId;
  tab: string;
  message: string;
  detail: string;
  benefits: readonly string[];
  cta: { label: string; href: string };
}

export const HOME_SERVICES_HEADING = {
  eyebrow: "Servicios",
  title: "¿Por dónde quieres empezar?",
  rector: "No eliges un agente limitado. Eliges por dónde empezar.",
  support:
    "Comercial, Cobranza o Administrativo/Financiero son formas de empezar. Configuramos cada agente alrededor de tus procesos, herramientas y permisos.",
  note: "Estos son puntos de partida. Un mismo agente puede combinar acciones de distintas áreas si el proceso y las integraciones lo permiten.",
  safety: "Si el sistema se puede integrar de forma segura y tiene los permisos necesarios, el agente puede trabajar con él.",
} as const;

export const HOME_SERVICES: readonly HomeService[] = [
  {
    id: "agentes",
    tab: "Agentes Inteligentes",
    message: "Agentes que conversan, consultan información y ejecutan acciones en tus herramientas.",
    detail: "Un mismo agente puede encadenar varias tareas.",
    benefits: [
      "Conversan con tus clientes o con tu equipo.",
      "Consultan información en las herramientas conectadas.",
      "Ejecutan acciones dentro de tus procesos y registran el resultado.",
      "Tú defines reglas, permisos y cuándo interviene una persona.",
    ],
    cta: { label: "Ver Agentes Inteligentes", href: "/agentes" },
  },
  {
    id: "comercial",
    tab: "Agente Comercial",
    message: "Convierte conversaciones en oportunidades y siguientes pasos.",
    detail: "Califica, registra, agenda y hace seguimiento.",
    benefits: [
      "Califica cada conversación y reúne el contexto.",
      "Registra la oportunidad para el equipo comercial.",
      "Coordina reuniones y programa el seguimiento.",
      "Deja siempre un siguiente paso visible para el equipo.",
    ],
    cta: { label: "Ver Agente Comercial", href: "/comercial" },
  },
  {
    id: "cobranza",
    tab: "Agente de Cobranza",
    message: "Detecta pendientes, contacta con contexto y mantiene el seguimiento al día.",
    detail: "Sin pagos reales en este ejemplo: solo consulta, gestión y registro.",
    benefits: [
      "Detecta facturas pendientes en tu registro.",
      "Contacta con contexto sobre el estado de cada una.",
      "Mantiene el seguimiento al día y registra cada gestión.",
      "Deriva a una persona cuando hay que revisar una alternativa.",
    ],
    cta: { label: "Ver Cobranza", href: "/cobranza" },
  },
  {
    id: "admin-finance",
    tab: "Agente Administrativo/Financiero",
    message: "Pregunta por tu operación y obtén respuestas, alertas y tareas administrativas con contexto.",
    detail: "SII, Bancos y Previred aparecen solo como fuentes genéricas y simuladas.",
    benefits: [
      "Responde preguntas sobre tu operación con información autorizada.",
      "Cruza fuentes y sugiere coincidencias por revisar.",
      "Prepara alertas, reportes y tareas administrativas.",
      "Pide confirmación humana antes de actuar.",
    ],
    cta: { label: "Ver Administrativo/Financiero", href: "/administrativo-financiero" },
  },
  {
    id: "custom",
    tab: "Automatizaciones a Medida",
    message: "Conectamos sistemas y construimos el flujo alrededor de tu proceso.",
    detail: "De la necesidad al sistema: un ejemplo de cómo se ordena.",
    benefits: [
      "Conecta las herramientas que ya usas.",
      "Ordena procesos que hoy viven entre planillas y mensajes.",
      "Construye las interfaces que tu equipo necesita para trabajar.",
    ],
    cta: { label: "Ver A Medida", href: "/a-medida" },
  },
  {
    id: "websites",
    tab: "Páginas Web",
    message: "Diseñamos y desarrollamos experiencias web claras, rápidas y conectables.",
    detail: "Landing, corporativa o ecommerce: explora un ejemplo.",
    benefits: [
      "Landing pages, sitios corporativos y ecommerce.",
      "Diseño responsive con una estructura clara.",
      "Formularios y contacto preparados para recibir consultas.",
      "Pagos, catálogo, agenda o agentes según el alcance y las conexiones confirmadas.",
    ],
    cta: { label: "Ver Páginas Web", href: "/paginas-web" },
  },
];

/** Whitelist para inicializar el escenario desde un hash: `#servicio-comercial`. Desconocido → primero. */
export function serviceFromHash(hash: string): HomeServiceId {
  const id = hash.replace(/^#servicio-/, "");
  return HOME_SERVICES.some((s) => s.id === id) ? (id as HomeServiceId) : "agentes";
}
