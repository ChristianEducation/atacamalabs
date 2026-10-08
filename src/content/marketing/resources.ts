/**
 * Recursos de Atacama Labs (/recursos) — Resource & Conversation Engine v1 (Ola A, 8-oct-2026).
 *
 * Un recurso es una pieza práctica y corta que extiende una publicación: contenido útil → recurso útil → conversación.
 * La biblioteca que consulta Hermes vive en Supabase (`content_resources`); este archivo es el contenido de las páginas.
 * El slug debe coincidir con `content_resources.slug` (https://atacamalabs.cl/recursos/<slug>).
 * Tono: sobrio, concreto, sin cifras inventadas ni promesas.
 */

export interface ResourceCriterion {
  title: string;
  question: string;
  good: string;
}

export interface ResourceSection {
  id: string;
  title: string;
  paragraphs?: readonly string[];
  items?: readonly string[];
  criteria?: readonly ResourceCriterion[];
}

export interface Resource {
  slug: string;
  type: "Checklist" | "Guía" | "Plantilla";
  title: string;
  seoTitle: string;
  description: string;
  intro: string;
  readingTime: string;
  sections: readonly ResourceSection[];
  cta: { heading: string; text: string; button: string };
  updated: string;
}

export const RESOURCES: readonly Resource[] = [
  {
    slug: "que-proceso-automatizar-primero",
    type: "Checklist",
    title: "Qué proceso de tu empresa automatizar primero",
    seoTitle: "Qué proceso de tu empresa automatizar primero | Atacama Labs",
    description:
      "Checklist de cinco criterios para elegir el primer proceso a automatizar en una pyme: frecuencia, reglas claras, herramientas, riesgo de error y forma de medirlo.",
    intro:
      "Casi todas las empresas tienen diez procesos que podrían automatizarse y ninguna razón clara para partir por uno. Este checklist sirve para elegir el primero con cinco criterios simples. Toma unos diez minutos y se hace con lápiz y papel.",
    readingTime: "10 minutos",
    updated: "8 de octubre de 2026",
    sections: [
      {
        id: "como-usarlo",
        title: "Cómo usarlo",
        paragraphs: [
          "Escribe en una lista los procesos que hoy te quitan tiempo: responder las mismas consultas, agendar horas, enviar cotizaciones, cobrar, pasar datos de un sistema a otro.",
          "Para cada uno responde los cinco criterios de abajo. Si la respuesta es sí, suma 2 puntos; si es «a veces», 1; si es no, 0.",
        ],
      },
      {
        id: "criterios",
        title: "Los cinco criterios",
        criteria: [
          {
            title: "1. Se repite",
            question: "¿Lo hacen varias veces por semana, siempre de forma parecida?",
            good: "Lo que se repite es lo que más tiempo devuelve al automatizarlo. Lo que ocurre una vez al mes casi nunca justifica partir por ahí.",
          },
          {
            title: "2. Tiene reglas claras",
            question: "¿Una persona nueva podría hacerlo con una instrucción escrita de una página?",
            good: "Si hoy solo lo resuelve una persona «porque sabe», primero hay que ordenarlo. Un agente o una automatización necesitan reglas que se puedan explicar.",
          },
          {
            title: "3. Usa pocas herramientas",
            question: "¿Pasa por dos o tres sistemas conocidos (WhatsApp, correo, planilla, CRM) y no por diez?",
            good: "Mientras menos piezas, más fácil conectarlo y más fácil encontrar qué falló cuando algo no sale como esperabas.",
          },
          {
            title: "4. Un error se corrige fácil",
            question: "¿Se puede revisar el resultado antes de que llegue al cliente, o corregirlo rápido si sale mal?",
            good: "Conviene partir donde una persona pueda supervisar al inicio. Los procesos donde un error es caro o irreversible se dejan para después.",
          },
          {
            title: "5. Se puede medir",
            question: "¿Puedes saber si mejoró? Por ejemplo, tiempo de respuesta, consultas sin contestar o horas semanales.",
            good: "Si no puedes medir el antes, no sabrás si funcionó. Anota hoy cómo está, aunque sea una estimación honesta.",
          },
        ],
      },
      {
        id: "resultado",
        title: "Cómo leer el resultado",
        items: [
          "8 a 10 puntos: buen primer proceso. Empieza por este.",
          "5 a 7 puntos: tiene potencial, pero conviene ordenarlo antes (reglas, responsables, herramientas).",
          "4 puntos o menos: no partas por aquí; elige otro de la lista.",
        ],
        paragraphs: ["Si dos procesos empatan, elige el que tenga el error más fácil de corregir. Se aprende más y se arriesga menos."],
      },
      {
        id: "ejemplos",
        title: "Ejemplos de buenos y malos primeros procesos",
        paragraphs: ["Suelen funcionar bien como primer paso:"],
        items: [
          "Responder consultas frecuentes por WhatsApp (precios, horarios, ubicación, requisitos).",
          "Agendar y confirmar horas o reuniones.",
          "Dar seguimiento a cotizaciones que quedaron sin respuesta.",
          "Recordar pagos pendientes con un mensaje claro.",
        ],
      },
      {
        id: "evitar",
        title: "Suelen ser mala idea como primer paso",
        items: [
          "Decisiones que dependen de mucho criterio o de excepciones constantes.",
          "Procesos que nadie ha documentado y que cambian cada semana.",
          "Cualquier cosa donde un error llegue directo al cliente sin revisión.",
        ],
      },
      {
        id: "despues",
        title: "Qué hacer con tu elección",
        paragraphs: [
          "Define en una frase qué significa que el proceso quedó bien hecho. Mantén una persona revisando al inicio y suelta el control de a poco, cuando veas que funciona.",
          "Si quieres revisar tu lista con un caso real, cuéntanos el proceso que elegiste y vemos juntos si conviene automatizarlo, cómo y con qué herramientas.",
        ],
      },
    ],
    cta: {
      heading: "¿Quieres revisarlo con tu caso real?",
      text: "Cuéntanos qué proceso elegiste y qué herramientas usas hoy. Lo revisamos contigo y te decimos con honestidad si conviene automatizarlo.",
      button: "Contar mi caso",
    },
  },
];

export const RESOURCE_SLUGS = RESOURCES.map((r) => r.slug);

export function getResource(slug: string): Resource | undefined {
  return RESOURCES.find((r) => r.slug === slug);
}
