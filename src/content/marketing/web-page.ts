/**
 * Copy de /paginas-web — ATACAMA_LABS_PAGINAS_WEB_SPEC_V1. Sin precios ni
 * plazos inventados: los importes salen del catálogo (`WEB_PLANS`, hoy
 * «Consultar») y los plazos se confirman por proyecto.
 */

export const WEB_HERO_NOTE = {
  title: "Diseño responsive + preparado para convertir",
  body: "Cada pantalla se diseña para verse bien, cargar rápido y llevar al usuario hacia una acción clara.",
} as const;

export const WEB_FORMATS_HEADING = {
  eyebrow: "TRES FORMATOS",
  title: "Elige el punto de partida.",
  lead: "El alcance cambia según lo que tu empresa necesita: una campaña, una presencia completa o una tienda online.",
} as const;

export interface WebFormat {
  /** Índice en `WEB_PLANS` (id del catálogo intacto para el formulario). */
  catalog: 0 | 1 | 2;
  name: string;
  message: string;
  forWho?: string;
  includes: readonly string[];
  cta: string;
  featured: boolean;
}

export const WEB_FORMATS: readonly WebFormat[] = [
  {
    catalog: 0,
    name: "Landing",
    message: "Una oferta. Una acción principal.",
    forWho: "Campañas, captación de leads, lanzamiento de un servicio o validación de una oferta.",
    includes: [
      "Una página",
      "Diseño responsive",
      "Formulario / CTA",
      "SEO técnico base",
      "Analítica esencial",
      "Publicación",
    ],
    cta: "Cotizar Landing",
    featured: false,
  },
  {
    catalog: 1,
    name: "Web Profesional",
    message: "Para empresas que necesitan explicar bien lo que hacen y convertir visitas en oportunidades.",
    includes: [
      "Arquitectura de varias páginas",
      "Diseño personalizado",
      "Formularios / contacto",
      "SEO técnico",
      "Analítica",
      "Integraciones definidas en el alcance",
      "Publicación",
    ],
    cta: "Cotizar Web Profesional",
    featured: true,
  },
  {
    catalog: 2,
    name: "Ecommerce",
    message: "Catálogo, compra y operación conectados.",
    includes: [
      "Catálogo",
      "Fichas de producto",
      "Carrito",
      "Checkout",
      "Pasarela de pago compatible",
      "Configuración operativa acordada",
      "Analítica",
      "Publicación",
    ],
    cta: "Cotizar Ecommerce",
    featured: false,
  },
];

export const WEB_CONNECT = {
  eyebrow: "MÁS QUE UNA PÁGINA",
  title: "Puede ser el comienzo del proceso.",
  lead: "Un formulario, una compra o una consulta puede continuar hacia un agente, una agenda, un CRM, un pago o cualquier sistema que tu operación necesite.",
  note: "Ejemplo ilustrativo. El alcance de cada integración se define por proyecto.",
  source: "Tu web",
} as const;

export type ConnectToolId = "crm" | "agenda" | "agent" | "pay";

/** Herramientas de la escena (filas fijas); logos monocromos CC0 de /visual/integrations. */
export const WEB_CONNECT_TOOLS: readonly { id: ConnectToolId; role: string; logo: string }[] = [
  { id: "crm", role: "CRM", logo: "/visual/integrations/hubspot.svg" },
  { id: "agenda", role: "Agenda", logo: "/visual/integrations/googlecalendar.svg" },
  { id: "agent", role: "Agente", logo: "/visual/integrations/whatsapp.svg" },
  { id: "pay", role: "Pagos", logo: "/visual/integrations/mercadopago.svg" },
];

/** Una sola escena que rota el disparador: cada uno activa herramientas distintas y estas responden con un resultado. */
export const WEB_CONNECT_STEPS: readonly {
  key: string;
  path: string;
  trigger: string;
  results: Partial<Record<ConnectToolId, string>>;
}[] = [
  {
    key: "form",
    path: "/contacto",
    trigger: "Formulario enviado",
    results: { crm: "Contacto creado", agenda: "Reunión agendada" },
  },
  {
    key: "shop",
    path: "/tienda",
    trigger: "Compra realizada",
    results: { pay: "Pago procesado", crm: "Pedido registrado" },
  },
  {
    key: "ask",
    path: "/ayuda",
    trigger: "Consulta recibida",
    results: { agent: "Consulta respondida", agenda: "Visita agendada" },
  },
];

export const WEB_INCLUDES_HEADING = {
  eyebrow: "QUÉ INCLUYE",
  title: "Bien diseñada por fuera. Bien construida por dentro.",
} as const;

export const WEB_INCLUDES = [
  {
    key: "design",
    title: "Diseño personalizado",
    body: "La estructura y el visual se diseñan para la marca y el objetivo del proyecto, no desde una plantilla genérica.",
  },
  {
    key: "responsive",
    title: "Responsive",
    body: "La experiencia queda resuelta para mobile, tablet y desktop.",
  },
  {
    key: "seo",
    title: "SEO técnico base",
    body: "Metadata, estructura semántica, indexación y configuración técnica correspondiente al alcance.",
  },
  {
    key: "performance",
    title: "Rendimiento",
    body: "Optimización de imágenes, carga y assets, con buenas prácticas de frontend.",
  },
  {
    key: "analytics",
    title: "Analítica",
    body: "Medición según el alcance: analytics, eventos o conversiones cuando corresponda.",
  },
  {
    key: "integrations",
    title: "Integraciones",
    body: "Formularios, pagos, CRM, agentes, automatizaciones, bases de datos o APIs cuando forman parte del proyecto.",
  },
] as const;

export const WEB_PROCESS_HEADING = {
  eyebrow: "PROCESO",
  title: "De la idea a una web publicada.",
} as const;

export const WEB_PROCESS = [
  {
    title: "Objetivo",
    body: "Entendemos qué debe lograr la página, qué contenido existe y qué acción queremos que realice el visitante.",
  },
  {
    title: "Diseño",
    body: "Definimos arquitectura, navegación y apariencia. Iteramos las pantallas clave antes de construir.",
  },
  {
    title: "Desarrollo",
    body: "Construimos la web, configuramos formularios, analítica e integraciones incluidas en el alcance y probamos los recorridos.",
  },
  {
    title: "Publicación",
    body: "Revisamos responsive, enlaces y funciones; conectamos dominio y dejamos la web operativa.",
  },
] as const;

export const WEB_FAQ_HEADING = {
  eyebrow: "PREGUNTAS FRECUENTES",
  title: "Lo que conviene saber antes de empezar.",
} as const;

export const WEB_FAQ = [
  {
    question: "¿Cuánto demora una página web?",
    answer: "Depende del alcance, contenido e integraciones. El plazo se confirma antes de comenzar el proyecto.",
  },
  {
    question: "¿Incluye dominio y hosting?",
    answer:
      "Se define en la propuesta según el proyecto. Si ya tienes dominio o infraestructura, podemos trabajar con ellos cuando sea compatible.",
  },
  {
    question: "¿Podré actualizar el contenido después?",
    answer: "Depende de la solución elegida. Podemos entregar áreas administrables cuando el proyecto lo requiera.",
  },
  {
    question: "¿Pueden conectar la web con otras herramientas?",
    answer:
      "Sí. Formularios, CRM, agendas, pagos, agentes, bases de datos, APIs y automatizaciones pueden formar parte del alcance cuando la herramienta permita una integración segura.",
  },
  {
    question: "¿Hacen ecommerce?",
    answer:
      "Sí. Podemos desarrollar tiendas online y definir catálogo, checkout, pago, despacho e integraciones según las necesidades del proyecto.",
  },
] as const;

export const WEB_CTA = {
  title: "Construyamos una web que haga su trabajo.",
  body: "Cuéntanos qué necesitas vender, mostrar o conectar. Revisamos el alcance contigo y te proponemos el camino.",
  cta: {
    label: "Cotizar mi web",
    href: "/diagnostico?servicio=web&source=paginas-web&section=final-cta&cta=cotizar-mi-web",
  },
} as const;
