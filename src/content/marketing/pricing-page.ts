/**
 * Copy de /precios — ATACAMA_LABS_PRECIOS_SPEC_V2_FINAL. Los valores y planes
 * viven en `pricing.ts`; aquí van los textos de la página, las tablas
 * comparativas, el cobro de agentes y las preguntas frecuentes.
 */

import { ADDITIONAL_AGENT_MONTHLY, clp } from "./pricing";

export const PRICING_META = {
  title: "Precios de agentes de IA y páginas web | Atacama Labs",
  description:
    "Planes de agentes de IA (Esencial, Operación y Escala) y formatos de páginas web con precios en CLP. Implementación, mensualidad y consumo explicados con claridad.",
  canonical: "https://atacamalabs.cl/precios",
} as const;

/* ---------- Hero ---------- */

export const PRICING_HERO = {
  eyebrow: "PRECIOS",
  lead: "Agentes, plataforma, automatizaciones e integraciones para empezar con lo que necesitas hoy y escalar cuando tu empresa lo requiera.",
  trust:
    "Todos los planes se activan con una implementación guiada de pago único. El consumo adicional de IA, WhatsApp y servicios externos se cobra según uso.",
  links: [
    { label: "Ver planes de Agentes", href: "#agentes" },
    { label: "Ver planes de Páginas Web", href: "#web" },
  ],
} as const;

/** «La boleta» del hero: cómo se compone un plan, una línea por concepto. */
export const RECEIPT = {
  title: "Cómo se compone tu plan",
  tabs: { agentes: "Agentes", web: "Páginas Web" },
  agentes: {
    lines: [
      {
        id: "implementacion",
        title: "Implementación",
        tag: "Una vez",
        body: "Diseñamos el proceso, configuramos y dejamos tu agente operativo.",
      },
      {
        id: "mensual",
        title: "Plan mensual",
        tag: "Cada mes",
        body: "Agentes, plataforma, soporte y ajustes dentro del alcance.",
      },
      {
        id: "consumo",
        title: "Consumo",
        tag: "Según uso",
        body: "Crédito de IA incluido. WhatsApp y servicios externos se cobran aparte.",
      },
    ],
    foot: "Sin permanencia mínima después de la implementación",
  },
  web: {
    lines: [
      {
        id: "desarrollo",
        title: "Desarrollo",
        tag: "Una vez",
        body: "Diseñamos, construimos y publicamos tu sitio.",
      },
      {
        id: "hosting",
        title: "Hosting y mantenimiento",
        tag: "Cada mes",
        body: "Hosting, SSL, respaldos, monitoreo, soporte y solicitudes menores.",
      },
      {
        id: "extras",
        title: "Extras",
        tag: "Se cotizan",
        body: "Páginas adicionales, integraciones especiales y lo que salga del alcance.",
      },
    ],
    foot: "Dominio .cl por 1 año incluido, sujeto a disponibilidad",
  },
} as const;

/* ---------- Planes de Agentes ---------- */

export const AGENT_PLANS_HEADING = {
  eyebrow: "AGENTES",
  title: "Planes de Agentes.",
  lead: "Implementación una vez, plan mensual y consumo según uso. La diferencia entre planes es la cantidad de agentes y la capacidad, no las integraciones estándar.",
} as const;

/** Nota de consumo bajo los planes del Home (CLARITY_PATCH §4). */
export const HOME_CONSUMPTION_NOTE = {
  text: "Crédito de IA incluido en cada plan. Consumo adicional de IA, WhatsApp y servicios externos se cobran aparte según uso.",
  link: { label: "Ver cómo funciona el consumo →", href: "/precios#consumo" },
} as const;

/** Bloque «¿Necesitas sumar otro agente?» de /precios (CLARITY_PATCH §7). El precio sale de `additionalAgentPrice()`. */
export const ADDITIONAL_AGENT_BLOCK = {
  title: "¿Necesitas sumar otro agente?",
  label: "Agente adicional",
  per: "por agente",
  body: "Puedes sumar agentes a tu operación sin comenzar desde cero. El crédito de IA corresponde al plan contratado y el consumo adicional se cobra según uso. Si el nuevo agente requiere un proceso o implementación diferente, cotizamos esa configuración antes de activarlo.",
  cta: "Quiero sumar un agente",
} as const;

export const DETAILS_LABEL = "Ver todo lo incluido";
export const AGENT_PLANS_CUSTOM =
  "¿Necesitas más capacidad o una configuración especial? Diseñamos una solución a medida para tu operación.";
export const AGENT_PLANS_CUSTOM_LINK = { label: "Ver A Medida", href: "/a-medida" } as const;

/* ---------- Tablas comparativas ---------- */

export type Cell = string | boolean;
export interface CompareRow {
  label: string;
  values: readonly [Cell, Cell, Cell];
  /** Filas de precio: se resaltan al pie de la tabla. */
  price?: boolean;
}

export const AGENT_COMPARE = {
  title: "Compara los planes de Agentes.",
  caption: "Comparación de planes de agentes",
  columns: ["Esencial", "Operación", "Escala"],
  ids: ["esencial", "operacion", "escala"],
  rows: [
    { label: "Agentes incluidos", values: ["1", "Hasta 3", "Hasta 5"] },
    { label: "Crédito mensual de IA", values: ["US$5", "US$15", "US$30"] },
    { label: "Bandeja omnicanal", values: [true, true, true] },
    { label: "Plataforma de gestión", values: [true, true, true] },
    { label: "Seguimientos y automatizaciones", values: [true, true, true] },
    { label: "+400 integraciones estándar", values: [true, true, true] },
    { label: "API / HTTP / MCP", values: [true, true, true] },
    { label: "Handoff humano", values: [true, true, true] },
    { label: "Integraciones especiales", values: ["Cotizable", "Según alcance", "Según alcance"] },
    { label: "Integraciones financieras Chile: SII, Previred y bancos", values: [false, true, true] },
    { label: "Soporte", values: ["Estándar", "Prioritario", "Prioritario"] },
    { label: "Implementación", values: ["$297.000", "$497.000", "Desde $697.000"], price: true },
    { label: "Mensual regular", values: ["$199.000", "$349.000", "Desde $499.000"], price: true },
    { label: "Mensual octubre", values: ["$149.000", "$279.000", "$399.000"], price: true },
  ],
  note: "Todos los valores + IVA.",
} as const satisfies {
  title: string;
  caption: string;
  columns: readonly string[];
  ids: readonly string[];
  rows: readonly CompareRow[];
  note: string;
};

export const WEB_COMPARE = {
  title: "Compara los formatos de Páginas Web.",
  caption: "Comparación de formatos de páginas web",
  columns: ["Landing", "Web Profesional", "Ecommerce"],
  ids: ["landing", "profesional", "ecommerce"],
  rows: [
    { label: "Diseño personalizado", values: [true, true, true] },
    { label: "Responsive", values: [true, true, true] },
    { label: "Dominio .cl 1 año", values: [true, true, true] },
    { label: "SSL", values: [true, true, true] },
    { label: "Hosting Atacama", values: [true, true, true] },
    { label: "SEO técnico base", values: [true, true, true] },
    { label: "Analítica", values: [true, true, true] },
    { label: "Formularios / CTA", values: [true, true, true] },
    { label: "Varias páginas", values: [false, "Hasta 5", true] },
    { label: "Integraciones estándar", values: ["Básicas", true, true] },
    { label: "Catálogo / productos", values: [false, false, true] },
    { label: "Carrito / checkout", values: [false, false, true] },
    { label: "Pasarela de pago", values: [false, false, "1 compatible"] },
    { label: "Portal de administración", values: [false, false, true] },
    { label: "Carga inicial de productos", values: [false, false, "Hasta 30"] },
    { label: "Solicitudes menores / mes", values: ["1", "2", "3"] },
    { label: "Desarrollo", values: ["Desde $390.000", "Desde $690.000", "Desde $990.000"], price: true },
    { label: "Hosting + mantenimiento", values: ["$29.900 / mes", "$49.900 / mes", "$89.900 / mes"], price: true },
  ],
  note: "Todos los valores + IVA.",
} as const satisfies {
  title: string;
  caption: string;
  columns: readonly string[];
  ids: readonly string[];
  rows: readonly CompareRow[];
  note: string;
};

/* ---------- Cómo funciona el cobro ---------- */

export const BILLING_HEADING = {
  eyebrow: "EL COBRO",
  title: "Cómo funciona el cobro de los agentes.",
  lead: "Tres conceptos, separados y claros: lo que se paga una vez, lo que se paga cada mes y lo que depende del uso.",
} as const;

export const BILLING_STEPS = [
  {
    id: "implementacion",
    tag: "Una vez",
    title: "Implementación",
    body: "Diseñamos el proceso, configuramos, cargamos conocimiento, conectamos herramientas, definimos permisos, probamos y dejamos la solución operativa.",
    note: "Se factura aparte del plan recurrente.",
  },
  {
    id: "operacion",
    tag: "Cada mes",
    title: "Operación",
    body: "Mantiene activos los agentes, la plataforma, el soporte, los ajustes y la operación normal dentro del alcance contratado.",
    note: "Sin permanencia mínima después de la implementación.",
  },
  {
    id: "consumo",
    tag: "Según uso",
    title: "Consumo",
    body: "Cada plan incluye un crédito mensual de IA. Cuando se agota, el consumo adicional de IA se cobra según uso.",
    note: "WhatsApp y servicios externos se cobran aparte.",
  },
] as const;

export const CREDIT_BLOCK = {
  title: "Crédito de IA incluido cada mes",
  lead: "Para la mayoría de los agentes, el crédito incluido permite comenzar a operar antes de generar consumo adicional.",
  rows: [
    { plan: "Esencial", value: "US$5" },
    { plan: "Operación", value: "US$15" },
    { plan: "Escala", value: "US$30" },
  ],
  whatsapp:
    "WhatsApp se cobra según consumo real y por separado. No tiene bolsa incluida dentro de los planes. Los servicios externos de terceros también se cobran aparte cuando corresponda.",
} as const;

export const USAGE_BLOCK = {
  title: "Referencia orientativa de consumo mensual de IA",
  head: ["Nivel de uso de un agente", "Consumo IA mensual"],
  rows: [
    ["Poco uso / pocas conversaciones", "US$2–5"],
    ["Uso normal diario", "US$5–15"],
    ["Agente activo con herramientas y bastante conversación", "US$15–30"],
    ["Alto volumen / procesos intensivos / modelos más costosos", "US$30–100+"],
  ],
  note: "Valores orientativos. El consumo real depende del modelo utilizado, cantidad y extensión de conversaciones, contexto y trabajo que ejecute el agente.",
} as const;

/**
 * Franja de modelos de IA. Solo proveedores disponibles en la plataforma de
 * agentes (OpenAI, Anthropic y Google Gemini figuran como integraciones de
 * modelo). Sin versiones, precios ni comparaciones: la oferta no depende de un modelo.
 */
export const AI_MODELS = {
  title: "Trabajamos con los principales modelos de IA",
  body: "Seleccionamos el modelo más adecuado según la tarea, el nivel de razonamiento necesario y el costo de operación.",
  providers: [
    { id: "openai", name: "OpenAI", logo: "/visual/ai-models/openai.svg" },
    { id: "anthropic", name: "Anthropic", logo: "/visual/ai-models/anthropic.svg" },
    { id: "gemini", name: "Google Gemini", logo: "/visual/ai-models/googlegemini.svg" },
  ],
  more: "+ otros modelos disponibles",
} as const;

/* ---------- Páginas Web ---------- */

export const WEB_PLANS_HEADING = {
  eyebrow: "PÁGINAS WEB",
  title: "Formatos de Páginas Web.",
  lead: "Desarrollo una vez y hosting con mantenimiento cada mes. Todos incluyen dominio .cl por 1 año, sujeto a disponibilidad; la renovación posterior se cobra según la tarifa vigente del dominio.",
} as const;

export const WEB_EXTRAS = {
  title: "Se cotizan aparte",
  items: [
    "Páginas adicionales",
    "Carga o migración masiva",
    "Más de 30 productos iniciales",
    "Integraciones especiales",
    "ERP / sistemas propietarios",
    "Funcionalidades nuevas",
    "Producción fotográfica o de contenido",
    "Licencias externas",
    "Servicios externos de pago",
    "Dominios premium u otras extensiones",
    "Cambios que excedan el mantenimiento mensual",
  ],
} as const;

/* ---------- FAQ ---------- */

export type FaqGroupId = "agentes" | "web";

export const FAQ_HEADING = {
  eyebrow: "PREGUNTAS FRECUENTES",
  title: "Lo que suelen preguntarnos.",
  tabs: { agentes: "Agentes", web: "Páginas Web" },
} as const;

export const FAQ_ITEMS: Record<FaqGroupId, readonly { question: string; answer: string }[]> = {
  agentes: [
    {
      question: "¿La implementación se paga una sola vez?",
      answer:
        "Sí. Es un cobro inicial separado y cubre diseño del proceso, configuración, conocimiento, conexiones, permisos, pruebas y puesta en marcha.",
    },
    {
      question: "¿Después solo pago la mensualidad?",
      answer: "Pagas el plan mensual y, cuando corresponda, el consumo variable de IA, WhatsApp o servicios externos.",
    },
    {
      question: "¿El consumo está incluido?",
      answer:
        "Cada plan incluye un crédito mensual de IA: US$5 en Esencial, US$15 en Operación y US$30 en Escala. Si se supera, el consumo adicional de IA se cobra según uso.",
    },
    {
      question: "¿Qué modelo de IA usa mi agente?",
      answer:
        "Trabajamos con distintos modelos de IA y seleccionamos el más adecuado según la tarea, el nivel de razonamiento necesario y el costo de operación. Durante la implementación configuramos la combinación más conveniente para cada agente. El consumo se descuenta del crédito mensual incluido y, si se supera, se cobra según uso.",
    },
    {
      question: "¿Cuánto suele consumir un agente en IA?",
      answer:
        "Como referencia orientativa, un agente con poco uso puede consumir US$2–5 al mes; con uso diario normal, US$5–15; con actividad alta y herramientas, US$15–30; y las operaciones intensivas pueden superar US$30–100 al mes. El valor real depende del modelo, el volumen, la extensión de las conversaciones y el trabajo ejecutado.",
    },
    {
      question: "¿WhatsApp está incluido en el plan?",
      answer:
        "No. WhatsApp se cobra aparte según consumo real. El plan mensual cubre la plataforma, los agentes y el servicio contratado; el uso del canal se factura según la actividad generada.",
    },
    {
      question: "¿Las integraciones están restringidas por plan?",
      answer:
        "Las integraciones estándar (+400 disponibles) están disponibles desde Esencial. Operación y Escala agregan integraciones especiales y contemplan integraciones financieras Chile: SII, Previred y bancos.",
    },
    {
      question: "¿Puedo usar Gmail, Calendar, Sheets, CRM o WhatsApp con Esencial?",
      answer: "Sí, cuando formen parte del proceso y permitan una integración segura.",
    },
    {
      question: "¿Puedo cambiar de plan?",
      answer: "Sí. El cambio puede aplicarse al siguiente ciclo de facturación.",
    },
    {
      question: "¿El precio de octubre se mantiene?",
      answer:
        "Sí. Si contratas hasta el 31/10/2026, mantienes la mensualidad promocional mientras continúes de forma ininterrumpida en el mismo plan. Si cancelas o cambias de plan, se aplicarán las condiciones vigentes en ese momento.",
    },
    {
      question: "¿Cuánto cuesta un agente adicional?",
      answer: `Puedes sumar un agente adicional por ${clp(ADDITIONAL_AGENT_MONTHLY)} + IVA al mes. El crédito mensual de IA corresponde al plan contratado y no aumenta automáticamente al agregar agentes. Si el nuevo agente necesita una implementación, integración o proceso diferente, esa configuración se cotiza previamente.`,
    },
    {
      question: "¿Me conviene agregar agentes o cambiar de plan?",
      answer:
        "Depende de la cantidad de agentes y del alcance de la operación. Si necesitas varios agentes, normalmente un plan superior resulta más conveniente. Te recomendamos la configuración adecuada antes de contratar.",
    },
    {
      question: "¿Qué pasa si necesito más de 5 agentes?",
      answer: "Se diseña una configuración superior y se cotiza según tu operación.",
    },
    {
      question: "¿Hay permanencia?",
      answer: "No hay permanencia mínima después de la implementación. La suscripción funciona por ciclos mensuales.",
    },
    {
      question: "¿Una integración especial tiene costo extra?",
      answer:
        "Puede tenerlo. Si requiere desarrollo especial, un sistema propietario o un servicio externo, te lo informamos y cotizamos antes.",
    },
  ],
  web: [
    {
      question: "¿El dominio está incluido?",
      answer: "Sí. Incluimos un dominio .cl por 1 año, sujeto a disponibilidad.",
    },
    { question: "¿A nombre de quién queda el dominio?", answer: "Del cliente." },
    {
      question: "¿Qué pasa después del primer año?",
      answer: "La renovación se cobra según la tarifa vigente del dominio.",
    },
    {
      question: "¿El hosting está incluido?",
      answer: "Forma parte del servicio mensual de hosting y mantenimiento.",
    },
    {
      question: "¿Qué incluye el mantenimiento?",
      answer:
        "Hosting, SSL, respaldos, monitoreo, actualizaciones técnicas, soporte y solicitudes menores según el plan.",
    },
    {
      question: "¿Qué es una solicitud menor?",
      answer:
        "Un cambio de textos, imágenes, enlaces o una configuración simple que no requiera una nueva sección, función, integración o flujo.",
    },
    { question: "¿Cuántas páginas incluye Web Profesional?", answer: "Hasta 5 páginas base." },
    { question: "¿Ecommerce incluye panel de administración?", answer: "Sí." },
    { question: "¿Cuántos productos cargan inicialmente?", answer: "Hasta 30 productos." },
    {
      question: "¿Incluye pasarela de pago?",
      answer: "Sí. Una pasarela compatible dentro del alcance base. Las comisiones del proveedor son externas.",
    },
    {
      question: "¿Incluye SEO?",
      answer: "Sí, SEO técnico base. No se promete una posición específica en Google.",
    },
    {
      question: "¿Pueden conectar la web con agentes o automatizaciones?",
      answer:
        "Sí. CRM, agendas, agentes, pagos, bases de datos, APIs y automatizaciones pueden formar parte del alcance.",
    },
  ],
};

/* ---------- CTA final ---------- */

export const PRICING_CTA = {
  title: "¿Qué necesitas poner a trabajar?",
  body: "Cuéntanos si buscas un agente, una web o una operación más conectada. Te ayudamos a definir el punto de partida.",
  primary: {
    label: "Hablar con Atacama",
    href: "/diagnostico?source=precios&section=final-cta&cta=hablar-con-atacama",
  },
} as const;
