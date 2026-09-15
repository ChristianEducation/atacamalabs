/**
 * Copy verbatim de atacama-labs-spec/content/SOCIAL-CONTENT.md y
 * VIDEO-60S.md — no reabrir estrategia, solo maquetar. Fuente editable
 * de las seis piezas (001/3.2, REQ-WEB-010).
 */

export type SocialPanel = {
  kind: "cover" | "problem" | "flow" | "cta" | "question";
  kicker?: string;
  title: string;
  body?: string;
};

export type SocialPiece = {
  id: "C01" | "C02" | "C03" | "C04" | "C05" | "C06";
  slug: string;
  title: string;
  format: "carousel" | "video";
  panels: SocialPanel[];
  linkedin: string;
  instagram: string;
  alt: string;
};

export const SOCIAL_PIECES: SocialPiece[] = [
  {
    id: "C01",
    slug: "presentacion",
    title: "Presentación",
    format: "carousel",
    panels: [
      { kind: "cover", title: "Soluciones que mueven tu negocio." },
      { kind: "problem", title: "Consultas sin seguimiento" },
      { kind: "problem", title: "Tareas repetitivas e información dispersa" },
      {
        kind: "cta",
        title: "Software, sistemas y automatización para empresas.",
        body: "Conversemos.",
      },
    ],
    linkedin:
      "Una consulta que queda sin seguimiento. La misma información copiada en varias planillas. Un registro que solo se encuentra preguntándole a alguien.\n\nEn Atacama Labs trabajamos sobre ese tipo de problemas: entendemos el proceso, definimos una solución y la implementamos con software, integraciones y automatización.\n\nComenzamos desde Antofagasta, con foco en la operación real de cada empresa. En nuestro sitio puedes conocer cómo trabajamos y revisar algunos desarrollos.\n\n¿Qué proceso de tu empresa necesita más orden hoy?",
    instagram:
      "Cuando la operación depende de copiar, recordar y volver a preguntar, hay un proceso que vale la pena revisar. En Atacama Labs desarrollamos software, sistemas e integraciones para mejorar ese trabajo. Desde Antofagasta. Conoce las soluciones en el enlace del perfil.",
    alt: "Presentación de Atacama Labs con tres problemas: seguimiento de consultas, tareas repetitivas e información dispersa.",
  },
  {
    id: "C02",
    slug: "pedidos-de-almuerzos",
    title: "Pedidos de almuerzos",
    format: "carousel",
    panels: [
      { kind: "problem", title: "Un pedido no termina cuando alguien elige el menú." },
      { kind: "flow", title: "Selección semanal", body: "y pago" },
      { kind: "flow", title: "Administración", body: "y cocina" },
      { kind: "cta", title: "Un flujo integrado", body: "Revisa el caso." },
    ],
    linkedin:
      "Un pedido de almuerzo no termina cuando alguien elige el menú. También debe quedar registrado el pago y la información que necesita cocina.\n\nEn un sistema de alimentación escolar conectamos la selección semanal, el pago online y las vistas de administración y cocina. El flujo incorpora totales, exportaciones y reglas horarias.\n\nEl caso muestra por qué conviene diseñar desde el proceso completo: lo que selecciona una persona debe convertirse en información útil para quienes operan. Puedes revisar el flujo en nuestros casos.",
    instagram:
      "De la selección semanal a la cocina: un mismo flujo para pedidos, pagos y administración. Este caso de alimentación escolar muestra cómo un sistema puede conectar etapas que necesitan trabajar juntas. Revisa el recorrido en nuestra web.",
    alt: "Esquema del sistema de pedidos de almuerzos: selección semanal, pago, administración y preparación.",
  },
  {
    id: "C03",
    slug: "registro-ipad",
    title: "Registro desde iPad",
    format: "carousel",
    panels: [
      { kind: "problem", title: "Registrar una entrega y encontrar su respaldo después." },
      { kind: "flow", title: "Registro y firma", body: "en pantalla, dos pasos" },
      { kind: "cta", title: "Consulta administrativa", body: "disponible siempre" },
    ],
    linkedin:
      "Registrar una entrega y después encontrar su respaldo son partes del mismo problema.\n\nEn este desarrollo, la recepción se registra desde una tablet mediante un flujo de dos pasos, con firma en pantalla y consulta administrativa.\n\nLa decisión de diseño fue mantener simple el momento de uso y dejar la información disponible para revisión. No todos los sistemas necesitan muchas pantallas: necesitan representar bien la tarea.",
    instagram:
      "Registrar. Firmar. Consultar. Un flujo desde tablet para digitalizar la recepción de entregas. Diseño simple para el momento de uso y registros disponibles para administración. Mira el caso en la web.",
    alt: "Diagrama de recepción de una entrega y firma en tablet, seguido por una vista administrativa.",
  },
  {
    id: "C04",
    slug: "antes-de-automatizar",
    title: "Antes de automatizar",
    format: "carousel",
    panels: [
      { kind: "question", title: "Antes de automatizar, responde esto" },
      { kind: "question", title: "¿Qué entra?", body: "¿Quién responde?" },
      { kind: "question", title: "¿Dónde se registra?", body: "¿Cuándo avanza?" },
      { kind: "cta", title: "¿Cómo detectas errores?", body: "Así comenzamos el diagnóstico." },
    ],
    linkedin:
      "Antes de automatizar un proceso conviene responder cuatro preguntas:\n\n¿Qué información entra? ¿Quién es responsable del siguiente paso? ¿Dónde queda registrado el estado? ¿Cómo sabemos que algo falló?\n\nSi esas respuestas no están claras, conectar herramientas puede aumentar la confusión. Un primer paso útil es dibujar el recorrido actual, marcar las tareas repetidas y decidir qué necesita validación humana.\n\nAsí comenzamos el diagnóstico de una solución.",
    instagram:
      "Automatizar empieza por entender el recorrido. Entrada, responsable, estado y errores: cuatro preguntas para revisar antes de sumar otra herramienta. Guarda esta guía para conversar con tu equipo.",
    alt: "Cuatro preguntas para revisar un proceso antes de automatizarlo.",
  },
  {
    id: "C05",
    slug: "recorrido-60s",
    title: "Demostración de 60 segundos",
    format: "video",
    // Guion/storyboard completo en atacama-labs-spec/content/VIDEO-60S.md;
    // la grabación final se hace en implementación (no se afirma entregada
    // en este paquete). Este panel es solo la miniatura de la pieza.
    panels: [{ kind: "cta", title: "Del registro a la operación", body: "Recorrido del proceso" }],
    linkedin:
      "Una solución se entiende mejor siguiendo una tarea de principio a fin. En este recorrido mostramos cómo una acción del usuario se convierte en información consultable para la operación.\n\nEl objetivo es que cada etapa tenga una entrada, un resultado y un responsable claros. Si en tu empresa ese recorrido depende de registros separados, podemos revisar dónde conviene conectarlos.",
    instagram:
      "Del registro al control de la operación, en un minuto. Mira el recorrido y piensa dónde se corta hoy la información en tu empresa. Casos y contacto en el perfil.",
    alt: "Recorrido del proceso: registro, firma, consulta administrativa y automatización con Atacama Labs.",
  },
  {
    id: "C06",
    slug: "seguimiento-comercial",
    title: "Seguimiento comercial",
    format: "carousel",
    panels: [
      { kind: "problem", title: "Responder es el primer paso." },
      { kind: "flow", title: "Consulta, responsable", body: "y próxima acción" },
      { kind: "cta", title: "Conversación, reunión", body: "y decisión" },
    ],
    linkedin:
      "Responder una consulta es el primer paso. Después hay que saber quién continuará la conversación, qué se acordó y cuándo corresponde retomarla.\n\nUn seguimiento útil mantiene ese contexto y se detiene cuando la persona responde o pide no continuar. La automatización puede ayudar a ordenar el proceso; el criterio comercial sigue siendo necesario.\n\nEn Atacama Labs trabajamos con registro, integración y seguimiento para que el equipo pueda ver qué necesita atención.",
    instagram:
      "¿Quién retoma la conversación y cuándo? Si la respuesta depende de recordar un chat, el seguimiento necesita un proceso más claro. Registro, responsable y próximo paso: una base simple para comenzar.",
    alt: "Flujo comercial desde consulta y próxima acción hasta conversación, reunión y decisión.",
  },
];

export function getPiece(slug: string) {
  return SOCIAL_PIECES.find((p) => p.slug === slug);
}
