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
  {
    slug: "agente-vs-automatizacion-vs-chatbot",
    type: "Guía",
    title: "Agente, automatización o chatbot: cuál necesita tu proceso",
    seoTitle: "Agente, automatización o chatbot: cuál necesita tu proceso | Atacama Labs",
    description:
      "Guía corta para decidir si un proceso de tu empresa necesita una automatización, un chatbot con respuestas fijas o un agente que razona con contexto, con tres preguntas y ejemplos.",
    intro:
      "Se usan como si fueran lo mismo, pero resuelven problemas distintos. Elegir mal significa pagar de más por algo que no hacía falta o quedarse corto en algo que sí necesitaba criterio. Esta guía te ayuda a distinguirlos con tres preguntas simples.",
    readingTime: "8 minutos",
    updated: "12 de octubre de 2026",
    sections: [
      {
        id: "diferencias",
        title: "Qué hace cada uno",
        items: [
          "Automatización: ejecuta pasos fijos cuando ocurre un evento. Si llega un formulario, crea el contacto y avisa. No interpreta: hace siempre lo mismo.",
          "Chatbot de respuestas fijas: responde preguntas que ya conoces con textos que tú escribiste. Funciona mientras el cliente pregunte lo esperado.",
          "Agente: entiende lo que escribe la persona, consulta información de tu empresa, decide el siguiente paso dentro de reglas que tú defines y pasa a una persona cuando corresponde.",
        ],
      },
      {
        id: "preguntas",
        title: "Tres preguntas para decidir",
        criteria: [
          {
            title: "1. ¿El camino siempre es el mismo?",
            question: "¿Dado un evento, los pasos siguientes son siempre idénticos?",
            good: "Si es así, probablemente basta una automatización. Si el camino depende de lo que dijo el cliente, necesitas algo que interprete.",
          },
          {
            title: "2. ¿Las preguntas son previsibles?",
            question: "¿La mayoría de lo que te escriben cabe en una lista corta de preguntas?",
            good: "Con una lista corta y estable, un chatbot de respuestas fijas puede alcanzar. Si cada conversación se desvía, el chatbot se rompe y frustra.",
          },
          {
            title: "3. ¿Hace falta contexto y criterio?",
            question: "¿Para responder bien hay que mirar historial, disponibilidad, precios o reglas de la empresa?",
            good: "Ahí un agente aporta: combina la conversación con datos de tus sistemas y sabe cuándo parar y pasar el caso a una persona.",
          },
        ],
      },
      {
        id: "ejemplos",
        title: "Ejemplos por tipo de proceso",
        items: [
          "Avisar a tu equipo cuando entra una venta: automatización.",
          "Responder horarios y ubicación fuera de horario: chatbot o agente simple.",
          "Agendar una hora según disponibilidad, confirmar y recordar: agente conectado a tu agenda.",
          "Dar seguimiento a una cotización que quedó sin respuesta: agente, con aviso a una persona si hay interés.",
        ],
      },
      {
        id: "limites",
        title: "Límites que conviene tener claros",
        paragraphs: [
          "Ninguna de las tres opciones reemplaza una decisión que requiere criterio humano o que tiene consecuencias difíciles de revertir. Un buen diseño define desde el inicio qué hace la herramienta, qué hace una persona y cómo se pasa el caso de una a otra.",
          "También puedes combinarlas: una automatización para mover datos, un agente para conversar y una persona para decidir lo delicado.",
        ],
      },
    ],
    cta: {
      heading: "¿No sabes cuál necesita tu proceso?",
      text: "Cuéntanos qué proceso tienes en mente y qué herramientas usas hoy. Te decimos con honestidad si conviene una automatización, un chatbot o un agente.",
      button: "Contar mi caso",
    },
  },
  {
    slug: "canvas-mapear-un-proceso",
    type: "Plantilla",
    title: "Canvas para mapear un proceso antes de automatizarlo",
    seoTitle: "Canvas para mapear un proceso antes de automatizarlo | Atacama Labs",
    description:
      "Plantilla de una página para describir un proceso paso a paso: quién lo hace, con qué herramienta, qué puede fallar y cómo sabrás que mejoró.",
    intro:
      "Automatizar un proceso que nadie ha descrito solo lo hace fallar más rápido. Este canvas te obliga a escribirlo en una página: es la mejor preparación para cualquier automatización, con o sin nosotros.",
    readingTime: "15 minutos",
    updated: "12 de octubre de 2026",
    sections: [
      {
        id: "como-usarlo",
        title: "Cómo usarlo",
        paragraphs: [
          "Elige un proceso y responde cada bloque con frases cortas, en el orden de abajo. Si no sabes responder un bloque, esa es la primera señal: el proceso todavía depende de la memoria de alguien.",
        ],
      },
      {
        id: "bloques",
        title: "Los siete bloques",
        criteria: [
          {
            title: "1. Disparador",
            question: "¿Qué hace que el proceso parta? Un mensaje, un pago, una fecha, una solicitud.",
            good: "Un buen disparador se puede nombrar en una frase y se detecta siempre igual.",
          },
          {
            title: "2. Pasos",
            question: "¿Qué ocurre después, paso por paso, hasta terminar?",
            good: "Entre cinco y diez pasos. Si pasan de diez, probablemente son dos procesos.",
          },
          {
            title: "3. Responsable",
            question: "¿Quién hace cada paso hoy?",
            good: "Una persona por paso. Si «lo hace cualquiera», nadie lo asume cuando falla.",
          },
          {
            title: "4. Herramientas y datos",
            question: "¿En qué sistemas vive cada dato (WhatsApp, planilla, CRM, correo)?",
            good: "Anota de dónde sale y a dónde debe llegar cada dato; ahí se encuentran los errores.",
          },
          {
            title: "5. Excepciones",
            question: "¿Qué casos se salen del camino normal y quién los resuelve?",
            good: "Las excepciones definen cuándo el sistema debe parar y avisar a una persona.",
          },
          {
            title: "6. Riesgo",
            question: "¿Qué pasa si un paso sale mal y llega al cliente?",
            good: "Si el error es caro o irreversible, parte con revisión humana antes de enviar.",
          },
          {
            title: "7. Medida",
            question: "¿Cómo sabrás que mejoró: tiempo de respuesta, consultas sin contestar, horas por semana?",
            good: "Anota hoy cómo está. Sin un antes, no hay forma de saber si funcionó.",
          },
        ],
      },
      {
        id: "siguiente",
        title: "Qué hacer con el canvas completo",
        paragraphs: [
          "Léelo con quien ejecuta el proceso día a día y corrige lo que no calce con la realidad. Con el canvas listo, decidir qué automatizar, con qué herramienta y dónde dejar a una persona se vuelve una conversación concreta.",
        ],
      },
    ],
    cta: {
      heading: "¿Quieres revisar tu canvas con alguien?",
      text: "Si ya lo completaste, envíanoslo y te decimos qué partes se pueden automatizar, cuáles conviene ordenar antes y dónde debe seguir una persona.",
      button: "Revisar mi proceso",
    },
  },
  {
    slug: "checklist-antes-de-automatizar",
    type: "Checklist",
    title: "Checklist: ¿está listo tu proceso para automatizarse?",
    seoTitle: "Checklist: ¿está listo tu proceso para automatizarse? | Atacama Labs",
    description:
      "Checklist de seis verificaciones antes de automatizar: repetición, reglas escritas, datos, juicio humano, herramientas y forma de medir el resultado.",
    intro:
      "Antes de contratar herramientas o proveedores, revisa si el proceso está en condiciones de automatizarse. Este checklist toma diez minutos y evita las tres causas más comunes de proyectos que no funcionan: reglas que nadie escribió, datos desordenados y nadie a cargo.",
    readingTime: "10 minutos",
    updated: "12 de octubre de 2026",
    sections: [
      {
        id: "como-usarlo",
        title: "Cómo usarlo",
        paragraphs: ["Marca cada punto con sí, a veces o no. Los «no» no significan que no puedas automatizar: indican qué ordenar primero."],
      },
      {
        id: "verificaciones",
        title: "Las seis verificaciones",
        criteria: [
          {
            title: "1. Se repite",
            question: "¿Ocurre varias veces por semana de forma parecida?",
            good: "Lo repetitivo es lo que más tiempo devuelve.",
          },
          {
            title: "2. Las reglas están escritas",
            question: "¿Existe una instrucción de una página que una persona nueva pueda seguir?",
            good: "Si las reglas solo están en la cabeza de alguien, primero hay que escribirlas.",
          },
          {
            title: "3. Los datos están accesibles",
            question: "¿La información que se necesita está en un sistema y se mantiene al día?",
            good: "Un agente responde tan bien como los datos que puede consultar.",
          },
          {
            title: "4. Se sabe cuándo interviene una persona",
            question: "¿Están definidos los casos que siempre decide una persona?",
            good: "Definir el traspaso desde el inicio evita errores y desconfianza.",
          },
          {
            title: "5. Hay un responsable",
            question: "¿Alguien en el equipo se hará cargo de revisar y ajustar el sistema?",
            good: "Sin responsable, el sistema se desactualiza y deja de usarse.",
          },
          {
            title: "6. Se puede medir",
            question: "¿Sabes cómo está hoy y cómo sabrás que mejoró?",
            good: "Un solo indicador simple es suficiente para partir.",
          },
        ],
      },
      {
        id: "resultado",
        title: "Cómo leer el resultado",
        items: [
          "Cinco o seis «sí»: el proceso está listo para partir.",
          "Tres o cuatro «sí»: ordena los puntos pendientes y vuelve a revisar en una semana.",
          "Dos o menos: no partas por aquí; elige un proceso más simple o primero descríbelo con el canvas.",
        ],
      },
    ],
    cta: {
      heading: "¿Quieres un diagnóstico de tu proceso?",
      text: "Cuéntanos tu caso y revisamos contigo qué está listo, qué falta ordenar y cómo sería una primera versión.",
      button: "Pedir un diagnóstico",
    },
  },
  {
    slug: "arquitectura-minima-de-un-agente",
    type: "Guía",
    title: "Arquitectura mínima de un agente empresarial",
    seoTitle: "Arquitectura mínima de un agente empresarial | Atacama Labs",
    description:
      "Las cinco piezas que necesita un agente de IA para trabajar de verdad en una empresa: canal, modelo, reglas, datos y traspaso a una persona, explicadas sin tecnicismos.",
    intro:
      "Un agente útil no es solo un modelo de lenguaje conectado a un chat. Para trabajar de verdad necesita cinco piezas que se pueden entender sin ser técnico. Esta guía las describe en lenguaje simple para que sepas qué preguntar.",
    readingTime: "8 minutos",
    updated: "12 de octubre de 2026",
    sections: [
      {
        id: "piezas",
        title: "Las cinco piezas",
        criteria: [
          {
            title: "1. Canal",
            question: "¿Por dónde conversa? WhatsApp, Instagram, correo o el sitio web.",
            good: "El agente debe estar donde ya te escriben tus clientes, no donde sea más cómodo para la tecnología.",
          },
          {
            title: "2. Modelo",
            question: "¿Qué entiende y redacta? El modelo de lenguaje que interpreta los mensajes.",
            good: "Es la parte más visible, pero por sí sola no hace el trabajo: sin las otras cuatro piezas solo conversa.",
          },
          {
            title: "3. Reglas",
            question: "¿Qué puede y qué no puede hacer, y con qué tono?",
            good: "Las reglas las defines tú: precios que puede informar, horarios, límites y casos prohibidos.",
          },
          {
            title: "4. Datos y herramientas",
            question: "¿De dónde saca la información y qué acciones puede ejecutar?",
            good: "Agenda, CRM, inventario, planillas. Cada conexión debe tener permisos acotados a lo necesario.",
          },
          {
            title: "5. Traspaso a una persona",
            question: "¿Cuándo y cómo avisa a alguien del equipo?",
            good: "Un buen agente sabe parar. El traspaso incluye el resumen de la conversación para que nadie parta de cero.",
          },
        ],
      },
      {
        id: "extras",
        title: "Lo que lo hace confiable",
        items: [
          "Registro de cada conversación y de cada acción, para poder revisarlas.",
          "Pruebas con casos reales antes de abrirlo a clientes.",
          "Alguien responsable de revisar y ajustar las reglas con el tiempo.",
        ],
      },
    ],
    cta: {
      heading: "¿Quieres ver cómo se vería en tu empresa?",
      text: "Te mostramos cómo se armarían estas cinco piezas con tus herramientas y tu proceso real.",
      button: "Ver un ejemplo aplicado",
    },
  },
  {
    slug: "calculadora-trabajo-manual",
    type: "Plantilla",
    title: "Calculadora de trabajo manual: cuánto te cuesta repetir tareas",
    seoTitle: "Calculadora de trabajo manual: cuánto te cuesta repetir tareas | Atacama Labs",
    description:
      "Plantilla para estimar cuántas horas al mes dedica tu equipo a tareas repetitivas y cuánto cuestan, con una fórmula simple y una tabla para completar con tus propios números.",
    intro:
      "Antes de decidir si vale la pena automatizar algo, conviene saber cuánto cuesta hoy hacerlo a mano. Esta plantilla usa una fórmula simple y tus propios números: no promete resultados ni usa promedios de otros.",
    readingTime: "10 minutos",
    updated: "12 de octubre de 2026",
    sections: [
      {
        id: "formula",
        title: "La fórmula",
        paragraphs: [
          "Para cada tarea repetitiva: veces por semana × minutos por vez ÷ 60 × 4,3 semanas = horas al mes. Luego multiplica por el valor de la hora de quien la hace (sueldo mensual dividido por las horas trabajadas al mes).",
          "Suma todas las tareas. El total no es un ahorro garantizado: es el tamaño del problema que hoy resuelves con tiempo de personas.",
        ],
      },
      {
        id: "tabla",
        title: "Tabla para completar",
        criteria: [
          {
            title: "Tarea 1",
            question: "¿Qué tarea es y quién la hace? Por ejemplo: responder consultas de precios por WhatsApp.",
            good: "Anota veces por semana, minutos por vez y valor de la hora de esa persona.",
          },
          {
            title: "Tarea 2",
            question: "¿Qué otra tarea se repite? Por ejemplo: enviar y reenviar cotizaciones.",
            good: "Mismos tres datos. Si dudas del tiempo, mide una semana completa.",
          },
          {
            title: "Tarea 3",
            question: "¿Y una tercera? Por ejemplo: agendar y confirmar horas.",
            good: "Con tres tareas ya tienes una primera imagen realista.",
          },
        ],
      },
      {
        id: "leer",
        title: "Cómo leer el resultado",
        items: [
          "Mira primero qué tarea concentra más horas: ahí está la primera oportunidad.",
          "Compara con el costo de automatizar solo esa tarea, no todas a la vez.",
          "Considera el tiempo de supervisión: una automatización bien hecha no es cero trabajo, es menos trabajo y de mejor calidad.",
        ],
      },
    ],
    cta: {
      heading: "¿Quieres revisar tus números con nosotros?",
      text: "Cuéntanos tus tareas y los tiempos que estimaste. Te ayudamos a ver cuáles tienen sentido automatizar primero.",
      button: "Revisar mis números",
    },
  },
];

export const RESOURCE_SLUGS = RESOURCES.map((r) => r.slug);

export function getResource(slug: string): Resource | undefined {
  return RESOURCES.find((r) => r.slug === slug);
}
