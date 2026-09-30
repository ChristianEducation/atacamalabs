import type { AgentPageSlug } from "./agents";

/**
 * Rubros — ATACAMA_LABS_RUBROS_Y_FOOTER_SPEC_V1 §10–§21. FUENTE ÚNICA: /rubros,
 * la franja de /agentes, los CTA y el contexto del diagnóstico consumen este
 * registro; el copy no se duplica en componentes.
 * Datos ficticios: IDs DEMO, sin nombres de clientes, cifras de desempeño ni logotipos.
 */

export type IndustrySlug =
  | "salud"
  | "inmobiliarias"
  | "educacion"
  | "retail-ecommerce"
  | "alimentacion-casinos"
  | "gimnasios"
  | "servicios-profesionales"
  | "b2b-industria"
  | "contabilidad-finanzas";

export interface IndustryMessage {
  from: "person" | "agent";
  text: string;
}

export interface IndustryReceipt {
  /** «Cita registrada», «Pedido registrado»… */
  title: string;
  chips: readonly string[];
  /** ID ficticio (`PED-DEMO-1042`). */
  id?: string;
}

/**
 * Pieza lateral de la demo que se va completando mientras el agente trabaja
 * (ticket de un pedido, ficha de una solicitud, estado de un documento). Cada
 * fila aparece cuando llega el mensaje `at` (0 = primero).
 */
export interface IndustryAside {
  kind: "ticket" | "ficha" | "estado";
  title: string;
  rows: readonly { label?: string; value: string; at: number; muted?: boolean }[];
  /** Estado mientras trabaja → estado final. */
  wait: string;
  done: string;
}

/** El agente toma la iniciativa: una señal del sistema abre la conversación. */
export interface IndustryTrigger {
  label: string;
  detail: string;
}

/** Contenido propio de la landing /rubros/[slug] de cada industria — SEO_GROWTH_SPEC_V1 §6–§7. */
export interface IndustrySeo {
  title: string;
  description: string;
  h1: string;
  intro: string;
  /** Editorial/interno: intención de búsqueda cubierta. Nunca se vuelca a un `<meta keywords>`. */
  searchContext: readonly string[];
  relatedAgentIds: readonly AgentPageSlug[];
  faq: readonly { question: string; answer: string }[];
}

export interface IndustryExperience {
  slug: IndustrySlug;
  name: string;
  /** Etiqueta corta del selector. */
  shortLabel: string;
  /** Quiénes entran en el rubro. */
  context: string;
  headline: string;
  lead: string;
  pains: readonly [string, string, string];
  script: readonly IndustryMessage[];
  trigger?: IndustryTrigger;
  aside?: IndustryAside;
  receipt: IndustryReceipt;
  flow: readonly string[];
  capabilities: readonly string[];
  featured?: boolean;
  seo: IndustrySeo;
}

export const INDUSTRY_LIST: readonly IndustryExperience[] = [
  {
    slug: "salud",
    name: "Salud",
    shortLabel: "Salud",
    context: "Clínicas, centros médicos, dentales y centros de atención.",
    headline: "Una recepción que sigue trabajando aunque tu equipo esté ocupado.",
    lead: "Consultas administrativas, disponibilidad, confirmaciones y seguimiento pueden avanzar sin saturar recepción.",
    pains: [
      "Las mismas consultas interrumpen al equipo durante todo el día.",
      "Coordinar una hora puede requerir varios mensajes.",
      "Confirmar y reprogramar depende de mensajes sueltos, y las horas sin confirmar terminan en no shows.",
    ],
    script: [
      { from: "person", text: "Hola, ¿tienen hora mañana en la tarde?" },
      { from: "agent", text: "Puedo revisar la agenda disponible. Hay opciones a las 16:30 y 18:00. ¿Cuál prefieres?" },
      { from: "person", text: "16:30." },
      { from: "agent", text: "Perfecto. La cita quedó registrada y enviaré la confirmación." },
    ],
    receipt: { title: "Cita registrada", chips: ["Agenda", "Seguimiento activo"] },
    flow: ["WhatsApp", "Agente", "Calendar", "CRM", "Recordatorio"],
    capabilities: [
      "Consultas administrativas",
      "Agendamiento y reprogramación",
      "Confirmaciones, recordatorios y reconfirmación",
      "Derivación con contexto",
    ],
    seo: {
      title: "Agentes de IA para clínicas y centros de salud | Atacama Labs",
      description:
        "Agentes de IA que agendan, confirman y reprograman horas para clínicas y centros de salud, conectados a tu calendario y tu equipo de recepción.",
      h1: "Agentes de IA para clínicas y centros de salud",
      intro:
        "Recepción atiende las mismas consultas administrativas todo el día: disponibilidad, confirmaciones, reprogramaciones. El agente puede tomar ese trabajo repetitivo por WhatsApp, dejando la agenda al día y derivando a una persona cuando el caso lo requiere.",
      searchContext: [
        "agentes ia clínicas",
        "agentes ia centros de salud",
        "whatsapp para clínicas dentales",
        "agendamiento médico automatizado",
        "recordatorios de citas médicas",
      ],
      relatedAgentIds: ["agendamiento", "atencion", "whatsapp"],
      faq: [
        {
          question: "¿Puede dar diagnósticos o recomendaciones médicas?",
          answer:
            "No. El agente trabaja en lo administrativo — agenda, confirma, responde preguntas generales — y deriva a tu equipo clínico cualquier consulta que requiera criterio médico.",
        },
        {
          question: "¿Reduce los no shows?",
          answer:
            "Puede ayudar recordando y reconfirmando citas antes de la hora agendada, que es donde suelen perderse la mayoría de las horas sin aviso.",
        },
        {
          question: "¿Se conecta con el sistema de agenda que ya uso?",
          answer:
            "Se evalúa según tu sistema: calendarios estándar como Google Calendar u Outlook se conectan directo; otros softwares clínicos según la integración disponible.",
        },
      ],
    },
  },
  {
    slug: "inmobiliarias",
    name: "Inmobiliarias",
    shortLabel: "Inmobiliarias",
    context: "Corredoras, inmobiliarias y gestión de propiedades.",
    headline: "De una consulta por una propiedad a una visita agendada.",
    lead: "El agente puede consultar información disponible, entender el interés y preparar el siguiente paso comercial.",
    pains: [
      "Las mismas preguntas sobre propiedades se repiten.",
      "Los interesados llegan con información incompleta.",
      "Coordinar visitas y seguimiento consume conversaciones manuales.",
    ],
    script: [
      { from: "person", text: "Busco un departamento de dos dormitorios para arriendo." },
      { from: "agent", text: "Perfecto. ¿En qué sector buscas y qué rango quieres considerar?" },
      { from: "person", text: "Sector norte." },
      {
        from: "agent",
        text: "Registré tu búsqueda. Puedo revisar las opciones disponibles y ayudarte a coordinar una visita.",
      },
    ],
    receipt: { title: "Interés registrado", chips: ["CRM", "Próximo paso creado"] },
    flow: ["WhatsApp", "Agente", "Catálogo", "CRM", "Agenda"],
    capabilities: ["Consultar fichas disponibles", "Calificar interesados", "Coordinar visitas", "Hacer seguimiento"],
    seo: {
      title: "Agentes de IA para inmobiliarias | Atacama Labs",
      description:
        "Agentes de IA que responden consultas por propiedades, califican interesados y coordinan visitas, conectados a tu CRM inmobiliario.",
      h1: "Agentes de IA para inmobiliarias",
      intro:
        "Las mismas preguntas sobre una propiedad se repiten con cada interesado, y muchos llegan con información incompleta. El agente puede responder, entender el interés real y dejar la visita coordinada y el interesado registrado en tu CRM.",
      searchContext: [
        "agentes ia inmobiliarias",
        "whatsapp para inmobiliarias",
        "calificación de interesados propiedades",
        "agendar visitas a propiedades",
      ],
      relatedAgentIds: ["comercial", "agendamiento", "whatsapp"],
      faq: [
        {
          question: "¿Puede mostrar fotos y precios de las propiedades?",
          answer:
            "Sí, si está conectado a tu catálogo o sistema de fichas. Consulta la información disponible y la comparte dentro de la conversación.",
        },
        {
          question: "¿Filtra a los interesados antes de pasarlos a un corredor?",
          answer:
            "Puede calificar según los criterios que definas — sector, presupuesto, tipo de propiedad — antes de coordinar la visita o el contacto con tu equipo.",
        },
        {
          question: "¿Se conecta con el CRM que ya usamos?",
          answer: "Según la herramienta y su API: CRMs estándar como HubSpot, Salesforce o Zoho, u otros con integración disponible.",
        },
      ],
    },
  },
  {
    slug: "educacion",
    name: "Educación",
    shortLabel: "Educación",
    context: "Colegios, institutos, academias y capacitación.",
    headline: "Más claridad para las familias. Más orden para tu equipo.",
    lead: "Consultas, admisión, reuniones y procesos administrativos pueden avanzar con información y responsables claros.",
    pains: [
      "Familias preguntan lo mismo en distintos canales.",
      "Documentos y solicitudes terminan repartidos.",
      "Coordinar una gestión requiere varios mensajes.",
    ],
    script: [
      { from: "person", text: "¿Qué documentos necesito para iniciar una matrícula?" },
      {
        from: "agent",
        text: "Puedo mostrarte los requisitos publicados y registrar una consulta si necesitas que el equipo revise tu caso.",
      },
      { from: "person", text: "Quiero que revisen mi situación." },
      { from: "agent", text: "Listo. Dejé la solicitud registrada para el equipo de admisión." },
    ],
    receipt: { title: "Solicitud registrada", chips: ["Admisión", "Revisión pendiente"] },
    flow: ["WhatsApp", "Agente", "Información", "Solicitud", "Equipo"],
    capabilities: [
      "Admisión y matrículas",
      "Consultas frecuentes",
      "Agendamiento de reuniones",
      "Recordatorios y procesos administrativos",
    ],
    seo: {
      title: "Agentes de IA para colegios y educación | Atacama Labs",
      description:
        "Agentes de IA que responden consultas de familias, ordenan procesos de admisión y matrícula, y coordinan reuniones para colegios e instituciones educativas.",
      h1: "Agentes de IA para colegios y educación",
      intro:
        "Las familias preguntan lo mismo por distintos canales, y los documentos de admisión terminan repartidos entre correos y mensajes. El agente puede responder con información clara, registrar la solicitud y dejarla lista para que el equipo de admisión la revise.",
      searchContext: [
        "agentes ia colegios",
        "agentes ia educación",
        "whatsapp para colegios",
        "automatizar admisión y matrículas",
      ],
      relatedAgentIds: ["agendamiento", "atencion", "whatsapp"],
      faq: [
        {
          question: "¿Puede responder preguntas sobre aranceles y procesos de admisión?",
          answer:
            "Sí, con la información que le entregues sobre tu colegio o institución: requisitos, fechas, aranceles y otros datos publicados.",
        },
        {
          question: "¿Coordina reuniones con apoderados?",
          answer: "Sí, si está conectado a tu calendario, revisa disponibilidad y deja la reunión agendada.",
        },
        {
          question: "¿Sirve para colegios pequeños o solo para instituciones grandes?",
          answer: "Se adapta al volumen y los procesos de tu institución, desde un colegio con un equipo pequeño hasta uno con varias sedes.",
        },
      ],
    },
  },
  {
    slug: "retail-ecommerce",
    name: "Retail & Ecommerce",
    shortLabel: "Retail",
    context: "Tiendas, ecommerce y comercio.",
    headline: "De una pregunta de producto al pedido y la postventa.",
    lead: "Conecta catálogo, pedidos, pagos y seguimiento para que cada conversación pueda avanzar sin empezar de cero.",
    pains: [
      "El equipo responde repetidamente stock, precios y despacho.",
      "Para revisar un pedido hay que saltar entre herramientas.",
      "La postventa pierde contexto entre canales.",
    ],
    script: [
      { from: "person", text: "¿Tienen disponible este producto?" },
      {
        from: "agent",
        text: "Puedo revisar el catálogo conectado. Figura disponible. ¿Quieres que prepare el pedido?",
      },
      { from: "person", text: "Sí." },
      { from: "agent", text: "Perfecto. Dejé el pedido preparado para continuar con el pago." },
    ],
    receipt: { title: "Pedido preparado", chips: ["Catálogo consultado", "Siguiente paso creado"] },
    flow: ["WhatsApp", "Agente", "Catálogo", "Pedido", "Pago / Tracking"],
    capabilities: [
      "Consultar catálogo",
      "Tomar pedidos",
      "Enviar enlace de pago si existe integración",
      "Consultar estado y postventa",
    ],
    seo: {
      title: "Agentes de IA para retail y ecommerce | Atacama Labs",
      description:
        "Agentes de IA que consultan catálogo, toman pedidos y hacen seguimiento de postventa por WhatsApp, conectados a tu ecommerce.",
      h1: "Agentes de IA para retail y ecommerce",
      intro:
        "Stock, precios y despacho son las preguntas que más se repiten en retail. El agente puede consultar tu catálogo conectado, tomar el pedido y seguir la postventa sin que el cliente tenga que saltar entre canales.",
      searchContext: [
        "agentes ia retail",
        "agentes ia ecommerce",
        "whatsapp para tiendas online",
        "automatizar pedidos por whatsapp",
      ],
      relatedAgentIds: ["comercial", "whatsapp", "atencion"],
      faq: [
        {
          question: "¿Consulta stock en tiempo real?",
          answer: "Sí, si está conectado a tu catálogo o sistema de inventario. Responde con la disponibilidad que tenga registrada tu tienda.",
        },
        {
          question: "¿Puede cobrar directamente por WhatsApp?",
          answer: "Puede enviar el enlace de pago cuando exista una integración de pagos disponible; el cobro en sí ocurre en tu plataforma de pago.",
        },
        {
          question: "¿Funciona con el ecommerce que ya tengo?",
          answer: "Se evalúa según tu plataforma (Shopify, WooCommerce u otra) y qué tan abierta está su API o sus integraciones.",
        },
      ],
    },
  },
  {
    slug: "alimentacion-casinos",
    name: "Alimentación & Casinos",
    shortLabel: "Alimentación",
    context:
      "Casinos escolares y corporativos, concesionarias, catering, restaurantes y negocios con pedidos recurrentes.",
    headline: "De un WhatsApp a un pedido registrado.",
    lead: "El agente recibe el pedido, consulta las opciones disponibles, aplica las reglas del negocio y deja todo registrado.",
    pains: [
      "Los pedidos llegan en mensajes con formatos distintos.",
      "Precios, menús, cantidades y horarios se revisan manualmente.",
      "Administración o cocina debe volver a ordenar la información.",
    ],
    script: [
      { from: "person", text: "Quiero 3 almuerzos para mañana." },
      { from: "agent", text: "Claro. Para mañana están disponibles el menú A y el menú B. ¿Cuáles necesitas?" },
      { from: "person", text: "2 A y 1 B." },
      {
        from: "agent",
        text: "Perfecto. Dejé 2 menú A y 1 menú B registrados para mañana. Puedo continuar con el pago o confirmación según tu proceso.",
      },
    ],
    aside: {
      kind: "ticket",
      title: "PED-DEMO-1042",
      rows: [
        { value: "2 × Menú A", at: 2 },
        { value: "1 × Menú B", at: 2 },
        { value: "Para mañana", at: 2, muted: true },
      ],
      wait: "Recibiendo…",
      done: "Registrado",
    },
    receipt: { title: "Pedido registrado", id: "PED-DEMO-1042", chips: ["Mañana"] },
    flow: ["WhatsApp", "Agente", "Menú / Catálogo", "Pedido", "Pago / Registro"],
    capabilities: [
      "Consultar menú y disponibilidad",
      "Aplicar reglas de día, horario o turno",
      "Calcular y confirmar el pedido",
      "Enviar o verificar pago si la integración existe",
      "Registrar en Sheets, Supabase o el sistema conectado",
    ],
    featured: true,
    seo: {
      title: "Agentes de IA para restaurantes y alimentación | Atacama Labs",
      description:
        "Agentes de IA que reciben pedidos por WhatsApp, aplican las reglas de menú y horario de tu negocio, y dejan todo registrado en tu sistema.",
      h1: "Agentes de IA para restaurantes y negocios de alimentación",
      intro:
        "Casinos escolares, casinos corporativos, catering y restaurantes reciben pedidos en formatos distintos todo el día. El agente recibe el pedido por WhatsApp, aplica las reglas de menú, cantidad y horario que definas, y lo deja registrado para cocina o administración.",
      searchContext: [
        "agentes ia restaurantes",
        "agentes ia casinos escolares",
        "whatsapp para pedidos de comida",
        "automatizar pedidos catering",
      ],
      relatedAgentIds: ["whatsapp", "procesos", "atencion"],
      faq: [
        {
          question: "¿Puede aplicar reglas distintas según el día o el turno?",
          answer:
            "Sí, si defines esas reglas: menú del día, horarios de corte, cantidades máximas por turno. El agente las aplica antes de confirmar el pedido.",
        },
        {
          question: "¿Dónde queda registrado el pedido?",
          answer: "En el sistema que conectes: una planilla, Supabase o el software que ya use tu cocina o administración.",
        },
        {
          question: "¿Sirve para casinos escolares con pedidos recurrentes?",
          answer: "Sí, es uno de los casos donde más orden aporta: pedidos que se repiten día a día con variaciones puntuales.",
        },
      ],
    },
  },
  {
    slug: "gimnasios",
    name: "Gimnasios",
    shortLabel: "Gimnasios",
    context: "Gimnasios, centros deportivos y estudios.",
    headline: "De un socio que se aleja a una clase reservada.",
    lead: "El agente hace el seguimiento que hoy nadie alcanza a hacer: reactiva a quien dejó de venir, recuerda clases y pagos, e invita a volver.",
    pains: [
      "Socios que dejan de venir y nadie los contacta a tiempo.",
      "Los pagos atrasados dependen de que alguien se acuerde de escribir.",
      "Interesados y ex-socios quedan sin seguimiento.",
    ],
    trigger: { label: "Señal", detail: "Socio sin asistir hace 14 días · CRM" },
    script: [
      {
        from: "agent",
        text: "Hola Camila, hace un par de semanas que no te vemos. ¿Te reservo una clase esta semana?",
      },
      { from: "person", text: "Sí, el jueves en la tarde." },
      { from: "agent", text: "Listo. Te dejé la clase del jueves a las 19:00 reservada y te lo recuerdo ese día." },
    ],
    receipt: { title: "Clase reservada", chips: ["Socio reactivado", "Recordatorio programado"] },
    flow: ["CRM", "Agente", "WhatsApp", "Calendar", "Seguimiento"],
    capabilities: [
      "Reactivar a quienes dejaron de venir",
      "Recordar clases y mensualidades pendientes",
      "Invitar a volver o renovar",
      "Responder planes y horarios",
      "Registrar todo en el CRM",
    ],
    seo: {
      title: "Agentes de IA para gimnasios y centros deportivos | Atacama Labs",
      description:
        "Agentes de IA que reactivan socios inactivos, recuerdan mensualidades y reservan clases para gimnasios y centros deportivos.",
      h1: "Agentes de IA para gimnasios y centros deportivos",
      intro:
        "El seguimiento que hoy nadie alcanza a hacer —socios que dejaron de venir, mensualidades atrasadas, interesados sin respuesta— es justo el trabajo que puede tomar el agente, avisando y dejando todo registrado en tu CRM.",
      searchContext: [
        "agentes ia gimnasios",
        "whatsapp para gimnasios",
        "reactivación de socios automatizada",
        "recordatorio de mensualidades gimnasio",
      ],
      relatedAgentIds: ["cobranza", "agendamiento", "whatsapp"],
      faq: [
        {
          question: "¿Puede escribir primero a un socio que dejó de venir?",
          answer:
            "Sí, si está conectado a una señal de tu CRM (por ejemplo, sin asistir hace 14 días) puede iniciar la conversación e invitar a reservar una clase.",
        },
        {
          question: "¿Cobra la mensualidad directamente?",
          answer: "Recuerda el pago pendiente; el cobro en sí depende de la integración de pago que tengas conectada.",
        },
        {
          question: "¿Reserva clases según el cupo disponible?",
          answer: "Sí, si está conectado a tu sistema de reservas o calendario, para no ofrecer un cupo que ya está lleno.",
        },
      ],
    },
  },
  {
    slug: "servicios-profesionales",
    name: "Servicios Profesionales",
    shortLabel: "Profesionales",
    context: "Abogados, consultoras, asesorías y firmas profesionales.",
    headline: "Cada consulta llega con contexto y un próximo paso.",
    lead: "El agente puede recibir la necesidad, recopilar información inicial y dejar la conversación preparada para el equipo.",
    pains: [
      "Las consultas llegan cuando el equipo está atendiendo.",
      "La información inicial viene incompleta.",
      "Documentos, reuniones y seguimiento quedan en canales distintos.",
    ],
    script: [
      { from: "person", text: "Necesito asesoría para mi empresa." },
      { from: "agent", text: "Claro. ¿Qué tipo de servicio necesitas y qué te gustaría revisar primero?" },
      { from: "person", text: "Una revisión inicial." },
      { from: "agent", text: "Perfecto. Registré tu consulta y puedo ayudarte a coordinar una reunión con el equipo." },
    ],
    aside: {
      kind: "ficha",
      title: "Consulta",
      rows: [
        { label: "Necesidad", value: "Asesoría para la empresa", at: 0 },
        { label: "Tipo", value: "Revisión inicial", at: 2 },
        { label: "Próximo paso", value: "Reunión con el equipo", at: 3 },
      ],
      wait: "Recopilando…",
      done: "Lista para el equipo",
    },
    receipt: { title: "Consulta registrada", chips: ["Coordinación", "Próximo paso pendiente"] },
    flow: ["WhatsApp / Web", "Agente", "Calificación", "Calendar", "CRM"],
    capabilities: [
      "Recibir y clasificar consultas",
      "Recopilar antecedentes",
      "Coordinar reuniones",
      "Registrar y hacer seguimiento",
    ],
    seo: {
      title: "Agentes de IA para servicios profesionales | Atacama Labs",
      description:
        "Agentes de IA que reciben consultas, recopilan antecedentes iniciales y coordinan reuniones para abogados, consultoras y asesorías.",
      h1: "Agentes de IA para servicios profesionales",
      intro:
        "Las consultas suelen llegar cuando el equipo está atendiendo, y la información inicial viene incompleta. El agente puede recibir la necesidad, recopilar antecedentes y dejar la conversación lista para que el equipo continúe con contexto.",
      searchContext: [
        "agentes ia servicios profesionales",
        "agentes ia abogados",
        "agentes ia consultoras",
        "whatsapp para asesorías",
      ],
      relatedAgentIds: ["comercial", "agendamiento", "whatsapp"],
      faq: [
        {
          question: "¿Puede dar asesoría o una opinión profesional?",
          answer:
            "No. Recibe la consulta, recopila antecedentes y coordina el siguiente paso; la asesoría misma la entrega tu equipo profesional.",
        },
        {
          question: "¿Sirve para un estudio pequeño con pocos clientes?",
          answer: "Sí, se adapta al volumen de consultas que recibas, desde un estudio pequeño hasta una firma con varios equipos.",
        },
        {
          question: "¿Qué antecedentes recopila antes de derivar?",
          answer: "Los que definas como necesarios para tu proceso: tipo de necesidad, urgencia, contexto inicial del caso.",
        },
      ],
    },
  },
  {
    slug: "b2b-industria",
    name: "B2B & Industria",
    shortLabel: "B2B & Industria",
    context: "Proveedores, minería, servicios industriales, mantenimiento y empresas técnicas.",
    headline: "De una solicitud comercial a una oportunidad lista para avanzar.",
    lead: "El agente recopila alcance, contexto y datos iniciales antes de entregar la oportunidad al equipo correcto.",
    pains: [
      "Las solicitudes llegan con información incompleta.",
      "Comercial y operaciones preguntan varias veces lo mismo.",
      "No siempre queda claro quién continúa ni cuál es el próximo paso.",
    ],
    script: [
      { from: "person", text: "Necesitamos cotizar un servicio de mantenimiento." },
      { from: "agent", text: "Claro. ¿Es mantenimiento preventivo o correctivo y en qué instalación se realizaría?" },
      { from: "person", text: "Preventivo." },
      { from: "agent", text: "Perfecto. Dejé la solicitud registrada para revisión comercial con ese contexto." },
    ],
    aside: {
      kind: "ficha",
      title: "Solicitud de cotización",
      rows: [
        { label: "Servicio", value: "Mantenimiento", at: 0 },
        { label: "Tipo", value: "Preventivo", at: 2 },
        { label: "Instalación", value: "Por confirmar", at: 2, muted: true },
        { label: "Estado", value: "Revisión comercial", at: 3 },
      ],
      wait: "Recopilando…",
      done: "Lista para comercial",
    },
    receipt: { title: "Solicitud registrada", chips: ["Comercial", "Revisión requerida"] },
    flow: ["WhatsApp / Email", "Agente", "Alcance", "CRM", "Equipo"],
    capabilities: [
      "Recibir solicitudes de cotización",
      "Recopilar alcance",
      "Coordinar reuniones o visitas",
      "Traspasar contexto a comercial y operaciones",
    ],
    seo: {
      title: "Agentes de IA para empresas B2B e industria | Atacama Labs",
      description:
        "Agentes de IA que recopilan alcance y contexto de solicitudes comerciales y técnicas para proveedores, minería y servicios industriales, antes de pasarlas al equipo correcto.",
      h1: "Agentes de IA para empresas B2B e industria",
      intro:
        "Las solicitudes B2B llegan con información incompleta y comercial y operaciones terminan preguntando lo mismo varias veces. El agente recopila el alcance inicial y deja la oportunidad lista, con contexto, para el equipo que corresponda.",
      searchContext: [
        "agentes ia b2b",
        "agentes ia industria",
        "agentes ia minería",
        "automatizar cotizaciones industriales",
      ],
      relatedAgentIds: ["comercial", "cobranza", "whatsapp"],
      faq: [
        {
          question: "¿Puede cotizar un servicio directamente?",
          answer:
            "No genera el precio final; recopila el alcance y los datos necesarios para que tu equipo comercial prepare la cotización con esa información ya reunida.",
        },
        {
          question: "¿Sirve para procesos con varias etapas de aprobación?",
          answer: "Sí, puede traspasar el contexto completo entre comercial y operaciones para que nadie tenga que preguntar de nuevo.",
        },
        {
          question: "¿Funciona por WhatsApp o solo por correo?",
          answer: "Según el canal que uses con tus proveedores o clientes — WhatsApp, correo, o ambos.",
        },
      ],
    },
  },
  {
    slug: "contabilidad-finanzas",
    name: "Contabilidad & Finanzas",
    shortLabel: "Contabilidad",
    context: "Estudios contables, áreas administrativas y equipos financieros.",
    headline: "Menos consultas repetidas. Más procesos administrativos conectados.",
    lead: "Documentos, estados, cobros y acciones administrativas pueden conectarse bajo permisos y reglas definidas.",
    pains: [
      "Clientes preguntan repetidamente por documentos y estados.",
      "Cobros y antecedentes requieren seguimiento manual.",
      "La información vive repartida entre correo, sistemas y planillas.",
    ],
    script: [
      { from: "person", text: "¿Está lista mi factura de este mes?" },
      { from: "agent", text: "Puedo consultar el sistema conectado y revisar su estado." },
      {
        from: "agent",
        text: "En este ejemplo figura emitida. Puedo mostrarte la información disponible o derivar la gestión al equipo.",
      },
    ],
    aside: {
      kind: "estado",
      title: "Estado de documentos",
      rows: [
        { label: "Consulta", value: "Factura del mes", at: 0 },
        { label: "Sistema", value: "Conectado y consultado", at: 1 },
        { label: "Estado", value: "Emitida", at: 2 },
      ],
      wait: "Consultando…",
      done: "Sin acción sensible",
    },
    receipt: { title: "Documento consultado", chips: ["Estado disponible", "Sin acción sensible"] },
    flow: ["WhatsApp / Email", "Agente", "Documentos / Datos", "Sistema", "Aprobación"],
    capabilities: [
      "Consultar estados y documentos",
      "Cobranza y recordatorios",
      "Preparar o ejecutar acciones autorizadas",
      "Trabajar con SII, bancos o Previred cuando la integración concreta esté disponible y configurada",
    ],
    seo: {
      title: "Agentes de IA para contabilidad y finanzas | Atacama Labs",
      description:
        "Agentes de IA que consultan documentos y estados, hacen seguimiento de cobranza y preparan acciones administrativas para estudios contables y áreas financieras.",
      h1: "Agentes de IA para contabilidad y finanzas",
      intro:
        "Clientes preguntan repetidamente por documentos y estados, y la información vive repartida entre correo, sistemas y planillas. El agente puede consultar el sistema conectado, responder o derivar, y hacer seguimiento de cobros bajo las reglas que definas.",
      searchContext: [
        "agentes ia contabilidad",
        "agentes ia finanzas",
        "automatizar cobranza contable",
        "whatsapp para estudios contables",
      ],
      relatedAgentIds: ["cobranza", "administrativo-financiero", "whatsapp"],
      faq: [
        {
          question: "¿Puede emitir facturas o hacer declaraciones al SII?",
          answer:
            "Solo si existe una integración concreta y configurada para eso; por defecto consulta y muestra información disponible. Acciones sensibles como emitir un documento quedan sujetas a tus reglas.",
        },
        {
          question: "¿Con qué sistemas contables se conecta?",
          answer: "Depende de la integración disponible: bancos, Previred o el software contable que uses, cuando exista una conexión configurada.",
        },
        {
          question: "¿Puede hacer seguimiento de cobranza a clientes?",
          answer: "Sí, recuerda y hace seguimiento de cuentas pendientes, dejando el estado registrado para tu equipo.",
        },
      ],
    },
  },
];

/** Bloque final de /rubros (§19): no es un rubro, tiene su propio ancla. */
export const OTHER_INDUSTRY = {
  slug: "otro-rubro",
  shortLabel: "Otro rubro",
  headline: "¿Tu industria no aparece aquí?",
  body: "No partimos de una plantilla. Partimos del proceso que quieres mejorar y de las herramientas que ya usa tu empresa.",
  cta: "Cuéntanos cómo trabajan",
} as const;

export const INDUSTRY_SLUGS: readonly IndustrySlug[] = INDUSTRY_LIST.map((industry) => industry.slug);

export function isIndustrySlug(value: string): value is IndustrySlug {
  return (INDUSTRY_SLUGS as readonly string[]).includes(value);
}

export function getIndustry(slug: string): IndustryExperience | undefined {
  return INDUSTRY_LIST.find((industry) => industry.slug === slug);
}

/** Slugs antiguos que aún pueden venir en enlaces o en `?industria=` (spec §20, §22). */
const INDUSTRY_ALIAS: Record<string, IndustrySlug> = {
  "fitness-bienestar": "gimnasios",
  fitness: "gimnasios",
  "servicios-b2b": "b2b-industria",
  alimentacion: "alimentacion-casinos",
  retail: "retail-ecommerce",
  contabilidad: "contabilidad-finanzas",
};

/** Normaliza un valor de URL a un slug del registro; lo que no calza se descarta (nunca texto libre). */
export function resolveIndustry(value: string | undefined): IndustrySlug | "" {
  if (!value) return "";
  const v = value.trim().toLowerCase();
  if (isIndustrySlug(v)) return v;
  return INDUSTRY_ALIAS[v] ?? "";
}
