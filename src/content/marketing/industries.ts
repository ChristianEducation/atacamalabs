/**
 * Registros K-EDU … K-B2B — spec/pages/06-RUBROS.md. Contenido exacto; las siete rutas
 * consumen este registro tipado (sin JSX duplicado por rubro). Datos ficticios:
 * IDs DEMO, sin nombres de instituciones, personas, cifras de desempeño ni logotipos.
 */

export type IndustrySlug =
  | "educacion"
  | "salud"
  | "inmobiliarias"
  | "gimnasios"
  | "retail-ecommerce"
  | "servicios-profesionales"
  | "servicios-b2b";

export interface IndustryRow {
  id: string;
  col2: string;
  status: string;
  resolved: boolean;
}

export interface Industry {
  slug: IndustrySlug;
  name: string;
  /** Etiqueta corta del nav/selector. */
  navLabel: string;
  keywords: readonly string[];
  seoTitle: string;
  h1: string;
  lead: string;
  pains: readonly [string, string, string];
  /** Guion exacto: 4 mensajes (persona / agente / persona / agente). */
  script: readonly [
    { from: "person" | "agent"; text: string },
    { from: "person" | "agent"; text: string },
    { from: "person" | "agent"; text: string },
    { from: "person" | "agent"; text: string },
  ];
  receipt: { steps: string; id: string; area: string; status: string; note: string };
  agent: { title: string; body: string };
  automation: { title: string; body: string };
  custom: { title: string; body: string };
  workflow: readonly [string, string, string, string, string];
  panel: {
    heading: string;
    name: string;
    columns: readonly [string, string, string];
    rows: readonly [IndustryRow, IndustryRow, IndustryRow];
  };
  factualNote?: string;
  faqs: readonly { question: string; answer: string }[];
  closing: string;
  /** Link secundario contextual de K6 (solo Retail/Ecommerce). */
  k6Extra?: { label: string; href: string };
}

const COMMON_FAQ = {
  question: "¿Por dónde conviene empezar?",
  answer: "Por un proceso concreto, con información disponible y un resultado que podamos revisar contigo.",
} as const;

export const INDUSTRY_COMMON_FAQ = COMMON_FAQ;

export const INDUSTRY_LIST: readonly Industry[] = [
  {
    slug: "educacion",
    name: "Educación",
    navLabel: "Educación",
    keywords: ["colegio", "academia", "instituto", "admisión", "educación"],
    seoTitle: "Agentes y sistemas para educación — Atacama Labs",
    h1: "Más claridad para familias. Más orden para tu equipo.",
    lead: "Conecta consultas, coordinación y procesos internos con agentes y sistemas pensados para una operación educativa.",
    pains: [
      "Las consultas se repiten en distintos canales.",
      "Los documentos y responsables quedan repartidos.",
      "Coordinar una solicitud exige varios mensajes.",
    ],
    script: [
      { from: "person", text: "¿Cómo consulto los requisitos de admisión?" },
      { from: "agent", text: "Puedo mostrarte la información disponible y registrar una consulta para el equipo." },
      { from: "person", text: "Quiero que revisen mi consulta." },
      { from: "agent", text: "La solicitud EDU-DEMO-101 quedó en revisión. El equipo tiene el contexto para continuar." },
    ],
    receipt: {
      steps: "Consultar requisitos → registrar solicitud → responsable Admisión",
      id: "EDU-DEMO-101",
      area: "Admisión",
      status: "Revisión del equipo",
      note: "No hay una entrevista confirmada.",
    },
    agent: {
      title: "Consultas con contexto.",
      body: "Responde sobre procesos publicados y deriva cuando se requiere una persona.",
    },
    automation: {
      title: "Solicitudes que llegan al responsable.",
      body: "Organiza recepción, documentación y avisos según el proceso acordado.",
    },
    custom: {
      title: "Un panel para coordinar la operación.",
      body: "Reúne solicitudes, pendientes y seguimiento sin depender de mensajes sueltos.",
    },
    workflow: [
      "Consulta",
      "Información disponible",
      "Solicitud",
      "Equipo de admisión",
      "Revisión registrada",
    ],
    panel: {
      heading: "Una vista para coordinar solicitudes.",
      name: "Coordinación educativa",
      columns: ["Solicitud", "Área", "Estado"],
      rows: [
        { id: "EDU-DEMO-101", col2: "Admisión", status: "Por revisar", resolved: false },
        { id: "EDU-DEMO-102", col2: "Documentación", status: "En seguimiento", resolved: false },
        { id: "EDU-DEMO-103", col2: "Información general", status: "Resuelta", resolved: true },
      ],
    },
    factualNote: "Nuestra experiencia incluye plataformas y procesos operativos vinculados al ámbito educativo.",
    faqs: [
      {
        question: "¿Puede responder consultas de familias?",
        answer:
          "Puede trabajar con información y reglas acordadas, y derivar los casos que requieran atención del equipo.",
      },
      {
        question: "¿También sirve para procesos internos?",
        answer:
          "Sí, podemos evaluar solicitudes, documentos y coordinación. El tratamiento de datos y los permisos se definen antes de conectar información real.",
      },
    ],
    closing: "la operación de tu institución",
  },
  {
    slug: "salud",
    name: "Salud",
    navLabel: "Clínicas/Salud",
    keywords: ["clínica", "consulta", "centro médico", "recepción", "salud"],
    seoTitle: "Agentes y automatización para clínicas — Atacama Labs",
    h1: "Una recepción más clara, desde la primera consulta.",
    lead: "Organiza consultas administrativas, disponibilidad y coordinación para que tu equipo pueda continuar cada atención con contexto.",
    pains: [
      "Las consultas administrativas interrumpen a recepción.",
      "Revisar disponibilidad exige varios intercambios.",
      "Una solicitud cambia de canal y pierde contexto.",
    ],
    script: [
      { from: "person", text: "¿Puedo consultar una hora disponible?" },
      { from: "agent", text: "En este ejemplo hay disponibilidad el miércoles 23 a las 16:30. ¿Quieres solicitarla?" },
      { from: "person", text: "Sí, quiero solicitar ese horario." },
      { from: "agent", text: "Registré SAL-DEMO-101 para confirmación de recepción. Aún no es una reserva confirmada." },
    ],
    receipt: {
      steps: "Consultar disponibilidad → registrar preferencia → derivar a Recepción",
      id: "SAL-DEMO-101",
      area: "Recepción",
      status: "Confirmación pendiente",
      note: "Sin información clínica.",
    },
    agent: {
      title: "Recepción administrativa.",
      body: "Orienta sobre horarios, ubicación y procesos publicados.",
    },
    automation: {
      title: "Coordinación con seguimiento.",
      body: "Ordena solicitudes y recordatorios según agenda y permisos disponibles.",
    },
    custom: {
      title: "Un panel para recepción.",
      body: "Reúne pendientes, responsables y estado de las solicitudes.",
    },
    workflow: ["Consulta", "Disponibilidad", "Preferencia", "Recepción", "Confirmación pendiente"],
    panel: {
      heading: "Cada solicitud, con su próximo paso.",
      name: "Coordinación de recepción",
      columns: ["Solicitud", "Gestión", "Estado"],
      rows: [
        { id: "SAL-DEMO-101", col2: "Hora solicitada", status: "Por confirmar", resolved: false },
        { id: "SAL-DEMO-102", col2: "Cambio de horario", status: "En revisión", resolved: false },
        { id: "SAL-DEMO-103", col2: "Consulta administrativa", status: "Resuelta", resolved: true },
      ],
    },
    faqs: [
      {
        question: "¿El agente entrega indicaciones médicas?",
        answer:
          "Esta propuesta se enfoca en recepción y coordinación administrativa. No realiza diagnósticos ni sustituye decisiones de profesionales de salud.",
      },
      {
        question: "¿Se conecta con nuestra agenda?",
        answer:
          "Se revisa la plataforma disponible, sus permisos y qué acciones permite antes de confirmar la integración.",
      },
    ],
    closing: "la coordinación de tu centro",
  },
  {
    slug: "inmobiliarias",
    name: "Inmobiliarias",
    navLabel: "Inmobiliarias",
    keywords: ["propiedades", "corredor", "inmobiliaria", "visitas", "arriendo"],
    seoTitle: "Agentes y procesos para inmobiliarias — Atacama Labs",
    h1: "De una consulta por una propiedad al siguiente paso.",
    lead: "Conecta información del catálogo, coordinación de visitas y seguimiento para que cada oportunidad llegue con contexto.",
    pains: [
      "Se repiten consultas sobre propiedades y disponibilidad.",
      "Coordinar visitas dispersa mensajes entre personas.",
      "Las oportunidades quedan sin un próximo paso visible.",
    ],
    script: [
      { from: "person", text: "¿Puedo consultar la propiedad DEMO-204?" },
      { from: "agent", text: "Puedo revisar su ficha de ejemplo y registrar tu interés en una visita." },
      { from: "person", text: "Me interesa una visita por la tarde." },
      {
        from: "agent",
        text: "Registré INM-DEMO-101 con esa preferencia para que el equipo confirme disponibilidad.",
      },
    ],
    receipt: {
      steps: "Consultar ficha → registrar preferencia → asignar a Equipo comercial",
      id: "INM-DEMO-101",
      area: "Equipo comercial",
      status: "Visita por coordinar",
      note: "La propiedad es de ejemplo; no se muestra una propiedad real como cliente.",
    },
    agent: {
      title: "Consultas sobre el catálogo.",
      body: "Ayuda a encontrar información disponible y recopila el motivo de interés.",
    },
    automation: {
      title: "Visitas y seguimiento ordenados.",
      body: "Registra solicitudes y prepara el siguiente paso del equipo.",
    },
    custom: {
      title: "Una vista de propiedades y oportunidades.",
      body: "Relaciona fichas, solicitudes y responsables en un panel.",
    },
    workflow: ["Consulta", "Ficha", "Interés", "Equipo comercial", "Seguimiento registrado"],
    panel: {
      heading: "Propiedades y solicitudes en contexto.",
      name: "Coordinación comercial",
      columns: ["Solicitud", "Propiedad", "Estado"],
      rows: [
        { id: "INM-DEMO-101", col2: "DEMO-204", status: "Visita por coordinar", resolved: false },
        { id: "INM-DEMO-102", col2: "DEMO-205", status: "En seguimiento", resolved: false },
        { id: "INM-DEMO-103", col2: "DEMO-206", status: "Resuelta", resolved: true },
      ],
    },
    faqs: [
      {
        question: "¿Puede mostrar disponibilidad actualizada?",
        answer:
          "Depende de la fuente del catálogo y su conexión. Definimos cómo se consulta y qué ocurre cuando falta información.",
      },
      {
        question: "¿Agenda una visita sin revisar al equipo?",
        answer:
          "Se configura según el proceso. Puede registrar una preferencia o confirmar solo cuando exista una agenda autorizada para hacerlo.",
      },
    ],
    closing: "tu proceso comercial inmobiliario",
  },
  {
    slug: "gimnasios",
    name: "Gimnasios",
    navLabel: "Gimnasios",
    keywords: ["gimnasio", "fitness", "clases", "centro deportivo", "socios"],
    seoTitle: "Agentes y sistemas para gimnasios — Atacama Labs",
    h1: "Menos mensajes sueltos. Más claridad para tus socios.",
    lead: "Ordena consultas sobre planes, clases y reservas, y conecta el seguimiento con la operación de tu gimnasio.",
    pains: [
      "Las mismas preguntas sobre planes vuelven cada día.",
      "Coordinar cupos requiere revisar varias conversaciones.",
      "El seguimiento de una consulta pierde continuidad.",
    ],
    script: [
      { from: "person", text: "¿Hay una clase de prueba esta semana?" },
      {
        from: "agent",
        text: "En el ejemplo aparece una opción el jueves 24 a las 11:00. ¿Quieres que registre tu interés?",
      },
      { from: "person", text: "Sí, me interesa." },
      { from: "agent", text: "GYM-DEMO-101 quedó para revisión del equipo. La asistencia se confirma contigo." },
    ],
    receipt: {
      steps: "Consultar clases → registrar interés → derivar a Recepción",
      id: "GYM-DEMO-101",
      area: "Recepción",
      status: "Por confirmar",
      note: "No recomienda ejercicio ni afirma un cupo real.",
    },
    agent: {
      title: "Información y primeras consultas.",
      body: "Explica planes y actividades con el contenido aprobado por tu equipo.",
    },
    automation: {
      title: "Reservas y continuidad.",
      body: "Conecta solicitudes, confirmaciones y seguimiento de acuerdo con los canales autorizados.",
    },
    custom: {
      title: "Un panel de coordinación.",
      body: "Ordena consultas, cupos y tareas del equipo con estados claros.",
    },
    workflow: ["Consulta", "Clase disponible", "Interés", "Recepción", "Confirmación pendiente"],
    panel: {
      heading: "Una operación visible para recepción.",
      name: "Consultas y actividades",
      columns: ["Solicitud", "Motivo", "Estado"],
      rows: [
        { id: "GYM-DEMO-101", col2: "Clase de prueba", status: "Por confirmar", resolved: false },
        { id: "GYM-DEMO-102", col2: "Consulta de plan", status: "En seguimiento", resolved: false },
        { id: "GYM-DEMO-103", col2: "Horarios", status: "Resuelta", resolved: true },
      ],
    },
    faqs: [
      {
        question: "¿Puede reservar clases?",
        answer:
          "Se evalúa la agenda y el control de cupos. La acción se habilita solo con una conexión que permita confirmar disponibilidad.",
      },
      {
        question: "¿Puede apoyar el seguimiento de interesados?",
        answer:
          "Sí, diseñando el proceso, las reglas y los mensajes adecuados para los canales que utilice tu empresa.",
      },
    ],
    closing: "la atención y coordinación de tu gimnasio",
  },
  {
    slug: "retail-ecommerce",
    name: "Retail y ecommerce",
    navLabel: "Retail/Ecommerce",
    keywords: ["tienda", "ecommerce", "comercio", "pedidos", "retail"],
    seoTitle: "Agentes y operaciones para ecommerce — Atacama Labs",
    h1: "Del “¿dónde está mi pedido?” a una respuesta con contexto.",
    lead: "Conecta consultas, información de pedidos y postventa con agentes y procesos que acompañen la operación de tu tienda.",
    pains: [
      "El equipo busca el mismo pedido en varias herramientas.",
      "Las preguntas de compra interrumpen otras tareas.",
      "La postventa depende de recordar cada conversación.",
    ],
    script: [
      { from: "person", text: "Quiero consultar el pedido PED-DEMO-1042." },
      { from: "agent", text: "El pedido de ejemplo figura en preparación. ¿Necesitas que el equipo revise algo más?" },
      { from: "person", text: "Quiero confirmar la información de entrega." },
      {
        from: "agent",
        text: "Registré RET-DEMO-101 para revisión de postventa; el pedido conserva su estado actual.",
      },
    ],
    receipt: {
      steps: "Consultar pedido → registrar solicitud → asignar a Postventa",
      id: "RET-DEMO-101",
      area: "Postventa",
      status: "Por revisar",
      note: "No actualiza una dirección real desde la demo.",
    },
    agent: {
      title: "Atención con información del pedido.",
      body: "Responde con las fuentes y permisos definidos para la tienda.",
    },
    automation: {
      title: "Pedidos y postventa conectados.",
      body: "Traslada solicitudes al equipo y registra los siguientes pasos.",
    },
    custom: {
      title: "Un panel para la operación.",
      body: "Reúne pedidos, incidencias y responsables en una vista de trabajo.",
    },
    workflow: ["Consulta", "Pedido", "Solicitud", "Postventa", "Revisión registrada"],
    panel: {
      heading: "Atención y pedido en la misma conversación.",
      name: "Operación de tienda",
      columns: ["Solicitud", "Pedido", "Estado"],
      rows: [
        { id: "RET-DEMO-101", col2: "PED-DEMO-1042", status: "Por revisar", resolved: false },
        { id: "RET-DEMO-102", col2: "PED-DEMO-1043", status: "En seguimiento", resolved: false },
        { id: "RET-DEMO-103", col2: "PED-DEMO-1044", status: "Resuelta", resolved: true },
      ],
    },
    faqs: [
      {
        question: "¿Se conecta con la tienda que ya tenemos?",
        answer:
          "Revisamos su plataforma, las APIs disponibles y las acciones necesarias antes de confirmar el alcance.",
      },
      {
        question: "¿Puede gestionar devoluciones por sí solo?",
        answer:
          "Puede recopilar y ordenar la solicitud. Las decisiones y acciones autorizadas se delimitan con las políticas de tu empresa.",
      },
    ],
    closing: "la operación de tu tienda",
    k6Extra: { label: "¿También necesitas la web?", href: "/paginas-web" },
  },
  {
    slug: "servicios-profesionales",
    name: "Abogados y servicios profesionales",
    navLabel: "Abogados/Servicios profesionales",
    keywords: ["abogados", "estudio jurídico", "consultora", "servicios", "asesoría", "profesionales"],
    seoTitle: "Automatización para servicios profesionales — Atacama Labs",
    h1: "Tu estudio, con cada consulta y pendiente en contexto.",
    lead: "Agentes y sistemas para estudios de abogados y servicios profesionales: recepción, documentos, citas y seguimiento administrativo.",
    pains: [
      "Las consultas llegan mientras el equipo está atendiendo.",
      "Documentos y citas se reparten entre distintos canales.",
      "Cuesta ver el próximo paso de una gestión o un honorario pendiente.",
    ],
    script: [
      { from: "person", text: "Quiero consultar por un servicio para mi empresa." },
      {
        from: "agent",
        text: "Puedo registrar el tipo de necesidad y pasarlo al equipo. ¿Buscas una revisión inicial?",
      },
      { from: "person", text: "Sí, una revisión inicial." },
      { from: "agent", text: "PRO-DEMO-101 quedó asignada a Coordinación para continuar la consulta." },
    ],
    receipt: {
      steps: "Identificar necesidad → registrar solicitud → asignar responsable",
      id: "PRO-DEMO-101",
      area: "Coordinación",
      status: "Por revisar",
      note: "Sin diagnóstico legal, financiero ni técnico.",
    },
    agent: {
      title: "Recepción de consultas.",
      body: "Ordena el motivo y la información inicial antes de derivar.",
    },
    automation: {
      title: "Documentos y próximos pasos.",
      body: "Conecta solicitudes, avisos y revisión de pendientes.",
    },
    custom: {
      title: "Un portal para coordinar.",
      body: "Permite consultar estados y organizar el trabajo interno según el proceso.",
    },
    workflow: ["Consulta", "Necesidad", "Registro", "Coordinación", "Revisión registrada"],
    panel: {
      heading: "Solicitudes y responsables a la vista.",
      name: "Coordinación de servicios",
      columns: ["Solicitud", "Tipo", "Estado"],
      rows: [
        { id: "PRO-DEMO-101", col2: "Revisión inicial", status: "Por revisar", resolved: false },
        { id: "PRO-DEMO-102", col2: "Documentación", status: "En seguimiento", resolved: false },
        { id: "PRO-DEMO-103", col2: "Información general", status: "Resuelta", resolved: true },
      ],
    },
    faqs: [
      {
        question: "¿El agente reemplaza una evaluación profesional?",
        answer:
          "No. La propuesta organiza consultas e información; la evaluación y las decisiones permanecen con el equipo autorizado.",
      },
      {
        question: "¿Podemos incluir un portal para clientes?",
        answer:
          "Sí, se puede evaluar como desarrollo a medida con usuarios, permisos y funciones definidos en el alcance.",
      },
    ],
    closing: "la coordinación de tus servicios",
  },
  {
    slug: "servicios-b2b",
    name: "Servicios B2B",
    navLabel: "Servicios B2B",
    keywords: ["proveedor", "B2B", "servicios industriales", "mantenimiento", "cotización"],
    seoTitle: "Agentes y sistemas para empresas B2B — Atacama Labs",
    h1: "De una solicitud comercial a una operación coordinada.",
    lead: "Conecta consultas, cotizaciones y coordinación interna para que cada solicitud avance con información y responsable.",
    pains: [
      "Una cotización empieza con información incompleta.",
      "Comercial y operaciones intercambian el mismo dato varias veces.",
      "No siempre está claro cuál es el próximo paso.",
    ],
    script: [
      { from: "person", text: "Necesito cotizar un servicio de mantenimiento." },
      { from: "agent", text: "Puedo registrar la solicitud para el equipo. ¿Es una revisión inicial de alcance?" },
      { from: "person", text: "Sí, necesitamos definir el alcance." },
      { from: "agent", text: "B2B-DEMO-101 quedó en revisión comercial con ese contexto. No se ha emitido una cotización." },
    ],
    receipt: {
      steps: "Clasificar solicitud → registrar alcance inicial → asignar a Comercial",
      id: "B2B-DEMO-101",
      area: "Comercial",
      status: "Revisión comercial",
      note: "Sin precio ni disponibilidad inventados.",
    },
    agent: {
      title: "Recepción comercial con contexto.",
      body: "Recopila la necesidad y prepara la conversación con el equipo.",
    },
    automation: {
      title: "Traspasos que dejan registro.",
      body: "Conecta información entre comercial, coordinación y operación.",
    },
    custom: {
      title: "Un panel para avanzar solicitudes.",
      body: "Relaciona oportunidades, responsables y tareas según tu proceso.",
    },
    workflow: ["Consulta", "Necesidad", "Solicitud", "Comercial", "Revisión registrada"],
    panel: {
      heading: "Comercial y operación en un mismo recorrido.",
      name: "Coordinación B2B",
      columns: ["Solicitud", "Servicio", "Estado"],
      rows: [
        { id: "B2B-DEMO-101", col2: "Mantenimiento", status: "Por revisar", resolved: false },
        { id: "B2B-DEMO-102", col2: "Coordinación operativa", status: "En seguimiento", resolved: false },
        { id: "B2B-DEMO-103", col2: "Información comercial", status: "Resuelta", resolved: true },
      ],
    },
    faqs: [
      {
        question: "¿Puede emitir una cotización por sí solo?",
        answer:
          "Solo si existe información y una regla autorizada para hacerlo. El punto de partida puede ser preparar la solicitud para revisión comercial.",
      },
      {
        question: "¿Puede conectarse con nuestro ERP?",
        answer:
          "Evaluamos la API, los permisos y los intercambios necesarios. La compatibilidad se confirma para el sistema concreto.",
      },
    ],
    closing: "tu operación comercial y de servicios",
  },
];

export function getIndustry(slug: string): Industry | undefined {
  return INDUSTRY_LIST.find((i) => i.slug === slug);
}

/** K9: detalle de nodos derivado del guion y del recibo, sin texto generado al vuelo. */
export function industryNodes(industry: Industry) {
  const [m1, m2, m3] = industry.script;
  const { receipt } = industry;
  const w = industry.workflow;
  return [
    { title: w[0], input: m1.text, result: "Consulta identificada" },
    { title: w[1], input: "Consulta identificada", result: m2.text },
    { title: w[2], input: m3.text, result: `Solicitud ${receipt.id}` },
    { title: w[3], input: `${receipt.id} + contexto`, result: `Asignada a ${receipt.area}` },
    { title: w[4], input: `Asignación a ${receipt.area}`, result: `Estado: ${receipt.status}` },
  ] as const;
}

/** Cinco rubros de G6 (/agentes): Educación / Salud / Gimnasios / Inmobiliarias / Retail y ecommerce. */
export const AGENT_CONTEXT_SLUGS: readonly IndustrySlug[] = [
  "educacion",
  "salud",
  "gimnasios",
  "inmobiliarias",
  "retail-ecommerce",
];

/** Normaliza acentos/mayúsculas para el buscador local del hub (J3). */
export function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export function searchIndustries(query: string): readonly Industry[] {
  const q = normalizeSearch(query);
  if (!q) return INDUSTRY_LIST;
  return INDUSTRY_LIST.filter((industry) =>
    [industry.name, industry.navLabel, industry.slug, ...industry.keywords].some((field) =>
      normalizeSearch(field).includes(q),
    ),
  );
}
