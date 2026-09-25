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
