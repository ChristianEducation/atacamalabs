/**
 * Copy de /conocenos — ATACAMA_LABS_CONOCENOS_SPEC_V1. La página construye
 * marca: origen, forma de pensar, capacidades y evidencia genérica. No hay
 * cifras, clientes, años, equipo ni logos: solo afirmaciones sostenibles.
 */

export const ABOUT_META = {
  title: "Conócenos — Atacama Labs",
  description:
    "Atacama Labs construye agentes, automatizaciones, integraciones y software alrededor de procesos reales. Desde Antofagasta, Chile.",
  canonical: "/conocenos",
} as const;

export const ABOUT_ORIGIN = {
  eyebrow: "NUESTRO ORIGEN",
  title: "Antes de hablar de agentes, ya construíamos sistemas que se usaban todos los días.",
  paragraphs: [
    "Atacama Labs nace de resolver problemas operativos reales: procesos que antes dependían de papel, planillas, mensajes o tareas repetitivas y que hoy funcionan como sistemas digitales utilizados todos los días.",
    "Esa experiencia define cómo construimos hoy. No partimos preguntando qué tecnología está de moda. Partimos mirando qué trabajo tiene que ocurrir, qué información necesita y qué herramientas ya forman parte de la operación.",
  ],
  experience: {
    label: "Experiencia real en",
    items: [
      "Plataformas operativas",
      "De papel a digital",
      "Pagos",
      "Pedidos",
      "Ecommerce",
      "Registros",
      "Integraciones",
      "Automatizaciones",
    ],
  },
} as const;

export const ABOUT_PRINCIPLES = {
  eyebrow: "CÓMO TRABAJAMOS",
  title: "Primero entendemos el trabajo. Después elegimos la tecnología.",
  items: [
    {
      number: "01",
      title: "Primero el trabajo. Después la tecnología.",
      body: "Entendemos qué ocurre hoy antes de decidir si la solución necesita un agente, una automatización, una integración o software propio.",
    },
    {
      number: "02",
      title: "Conectar antes que reemplazar.",
      body: "Si una herramienta ya funciona, preferimos integrarla antes que obligar a la empresa a empezar de cero.",
    },
    {
      number: "03",
      title: "Automatizar sin perder el control.",
      body: "Definimos qué puede ejecutar el sistema, cuándo necesita aprobación y cuándo debe intervenir una persona.",
    },
  ],
} as const;

export const ABOUT_CAPABILITIES = {
  eyebrow: "CAPACIDADES",
  title: "Construimos alrededor del proceso.",
  lead: "La solución puede ser un agente, una integración, un sistema propio o una web. Lo importante es que encaje con el trabajo que tiene que ocurrir.",
  items: [
    {
      id: "agentes",
      title: "Agentes",
      body: "Trabajan dentro de procesos y utilizan las herramientas de la empresa para responder, consultar, actualizar y ejecutar acciones.",
      link: { label: "Ver agentes", href: "/agentes" },
    },
    {
      id: "integraciones",
      title: "Integraciones y automatizaciones",
      body: "Conectamos sistemas, datos, APIs y tareas para que la información avance sin depender de trabajo manual innecesario.",
      link: { label: "Ver A Medida", href: "/a-medida" },
    },
    {
      id: "sistemas",
      title: "Sistemas a medida",
      body: "Cuando el proceso necesita algo propio, diseñamos software alrededor de la operación real.",
      link: { label: "Ver A Medida", href: "/a-medida" },
    },
    {
      id: "web",
      title: "Páginas Web",
      body: "Construimos productos web claros y profesionales que también pueden conectarse con el resto de la operación.",
      link: { label: "Ver Páginas Web", href: "/paginas-web" },
    },
  ],
} as const;

/** «Construido desde el norte»: abre la página, con la evidencia genérica dentro de la misma sección. */
export const ABOUT_NORTH = {
  eyebrow: "ATACAMA LABS",
  title: "Construido desde el norte.",
  /** Coordenadas de Antofagasta, como detalle de precisión en la apertura. */
  coords: "23°39′ S · 70°24′ O",
  body: "Atacama Labs nace en Antofagasta, una ciudad donde tecnología, industria y operación conviven todos los días. Esa realidad también define cómo construimos: soluciones prácticas, precisas y hechas para funcionar fuera de una presentación.",
  evidenceTitle: "Construimos antes de prometer.",
  evidence: [
    {
      title: "Software en producción",
      body: "Sistemas que operan sobre procesos reales y deben funcionar todos los días.",
    },
    {
      title: "Integraciones reales",
      body: "Pagos, datos, APIs, ecommerce y automatizaciones trabajando juntas.",
    },
    {
      title: "De proceso manual a sistema",
      body: "Experiencia convirtiendo papel, planillas y coordinación manual en productos digitales.",
    },
  ],
} as const;

/** Sello de marca antes del cierre: el lema con el logo. */
export const ABOUT_SEAL = {
  title: "Tecnología para el trabajo real.",
  accent: "real",
  lead: "Construimos agentes, automatizaciones y software alrededor de procesos que las empresas usan todos los días.",
  place: "Desde Antofagasta, Chile.",
} as const;

export const ABOUT_CTA = {
  title: "Hablemos de cómo trabaja tu empresa.",
  body: "Un trabajo repetitivo o un proceso que hoy se traba entre herramientas es un buen lugar para empezar.",
  primary: {
    label: "Agendar diagnóstico",
    href: "/diagnostico?source=conocenos&section=final-cta&cta=agendar-diagnostico",
  },
} as const;
