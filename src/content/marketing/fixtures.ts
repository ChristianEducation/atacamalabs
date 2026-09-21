/**
 * Fixtures y guiones de las demos — spec implementation/04-DEMO-FIXTURES.md (R4).
 * Determinista: sin Math.random, sin Date.now. Todo dato es ficticio; IDs con DEMO;
 * dominios `.example`. Ninguna demo acredita producción ni ejecuta acciones reales.
 */

export const DEMO_CLOCK = {
  iso: "2026-09-21T09:30:00-03:00",
  label: "Hora de ejemplo · Chile",
  timezone: "America/Santiago",
} as const;

export const DEMO_LEGEND = "Datos ficticios. No realiza acciones en sistemas reales.";
export const DEMO_BADGE = "Demo interactiva";
export const CONSOLE_LEGEND = "Simulación · datos ficticios";

export type Speaker = "person" | "agent";

export interface ScriptMessage {
  from: Speaker;
  text: string;
}

export interface ChatScript {
  id: string;
  title: string;
  messages: readonly ScriptMessage[];
  /** Etiqueta del ToolCall (E8), sin jerga técnica pública. */
  tool: { verb: string; detail: string };
  receipt: { id: string; area: string; status: string; note?: string };
}

/** R4.2 — mensajes exactos, en orden. */
export const SCRIPTS = {
  home: {
    id: "S-HOME",
    title: "Coordinación de solicitudes",
    messages: [
      { from: "person", text: "Queremos ordenar las solicitudes que llegan a nuestra empresa." },
      { from: "agent", text: "Puedo registrar el contexto para que el equipo revise el proceso contigo." },
      {
        from: "agent",
        text: "La solicitud DEMO-SOL-1042 quedó lista para revisión. No se ha reservado una reunión.",
      },
    ],
    tool: { verb: "Registrar solicitud", detail: "Empresa Demo Norte" },
    receipt: { id: "DEMO-SOL-1042", area: "Coordinación", status: "Por revisar" },
  },
  ventas: {
    id: "S-VENTAS",
    title: "Seguimiento de consultas",
    messages: [
      { from: "person", text: "Buscamos una forma de dar seguimiento a las consultas de clientes." },
      { from: "agent", text: "¿El problema principal es saber quién debe continuar cada consulta?" },
      { from: "person", text: "Sí, necesitamos ordenar ese seguimiento." },
      {
        from: "agent",
        text: "Registré la oportunidad OPP-DEMO-1042 con ese contexto para el equipo comercial.",
      },
    ],
    tool: { verb: "Registrar oportunidad", detail: "Empresa Demo Norte" },
    receipt: { id: "OPP-DEMO-1042", area: "Seguimiento comercial", status: "Nueva" },
  },
  atencion: {
    id: "S-ATENCION",
    title: "Estado de una solicitud",
    messages: [
      { from: "person", text: "¿En qué estado está mi solicitud DEMO-SOL-1042?" },
      { from: "agent", text: "La solicitud de ejemplo aparece en revisión del equipo." },
      { from: "person", text: "Necesito agregar una aclaración." },
      { from: "agent", text: "Dejé una nota para que el equipo continúe con el contexto completo." },
    ],
    tool: { verb: "Consultar estado", detail: "DEMO-SOL-1042" },
    receipt: { id: "DEMO-SOL-1042", area: "Revisión del equipo", status: "Nota agregada" },
  },
  cobro: {
    id: "S-COBRO",
    title: "Factura pendiente",
    messages: [
      {
        from: "agent",
        text: "En este ejemplo, la factura FAC-DEMO-1042 está pendiente. ¿Quieres revisar su información?",
      },
      { from: "person", text: "Sí, muéstrame el detalle." },
      {
        from: "agent",
        text: "El registro indica CLP $180.000 y vencimiento el 22 de septiembre de 2026.",
      },
      {
        from: "agent",
        text: "El seguimiento quedó registrado como recordatorio de ejemplo. No se envió ningún mensaje real.",
      },
    ],
    tool: { verb: "Consultar estado de factura", detail: "FAC-DEMO-1042" },
    receipt: { id: "FAC-DEMO-1042", area: "Cobranza", status: "Recordatorio de ejemplo" },
  },
  agenda: {
    id: "S-AGENDA",
    title: "Coordinación de una reunión",
    messages: [
      { from: "person", text: "Quiero coordinar una reunión de ejemplo." },
      {
        from: "agent",
        text: "Hay dos horarios en esta demo: miércoles 23 a las 16:30 o jueves 24 a las 11:00.",
      },
      { from: "person", text: "El miércoles a las 16:30." },
      {
        from: "agent",
        text: "Reserva de ejemplo confirmada: miércoles 23 de septiembre, 16:30, hora de Chile.",
      },
    ],
    tool: { verb: "Consultar disponibilidad", detail: "Semana de ejemplo" },
    receipt: { id: "RES-DEMO-1042", area: "Agenda", status: "Reserva de ejemplo" },
  },
  reactivacion: {
    id: "S-REACTIVACION",
    title: "Consulta que quedó abierta",
    messages: [
      {
        from: "agent",
        text: "Hola. En este ejemplo retomo una consulta que quedó abierta por un canal autorizado. ¿Quieres continuar?",
      },
      { from: "person", text: "Sí, me gustaría revisar el siguiente paso." },
      { from: "agent", text: "Dejo el contexto para que el equipo pueda retomarlo contigo." },
      { from: "agent", text: "La oportunidad OPP-DEMO-1043 quedó con una tarea de seguimiento." },
    ],
    tool: { verb: "Registrar seguimiento", detail: "OPP-DEMO-1043" },
    receipt: { id: "OPP-DEMO-1043", area: "Seguimiento", status: "Seguimiento pendiente" },
  },
  seguimiento: {
    id: "S-SEGUIMIENTO",
    title: "Propuesta pendiente",
    messages: [
      { from: "person", text: "¿Podemos revisar el estado de la propuesta de ejemplo?" },
      { from: "agent", text: "La propuesta PROP-DEMO-1042 está pendiente de revisión del equipo." },
      { from: "person", text: "Déjales una tarea para continuar." },
      { from: "agent", text: "Registré TASK-DEMO-1042 con la propuesta y su contexto." },
    ],
    tool: { verb: "Registrar tarea", detail: "PROP-DEMO-1042" },
    receipt: { id: "TASK-DEMO-1042", area: "Equipo comercial", status: "Pendiente" },
  },
} as const satisfies Record<string, ChatScript>;

export type ScriptKey = keyof typeof SCRIPTS;

/** R4.1 — timeline de chat estándar (ms). Tres mensajes omiten el tercero intermedio. */
export const CHAT_TIMELINE = {
  typingStart: 600,
  second: 1500,
  third: 2600,
  toolPending: 3000,
  toolProcessing: 3300,
  receipt: 4200,
  final: 4600,
  complete: 5200,
} as const;

/** Instante en que aparece el mensaje `index` de un guion con `count` mensajes. */
export function messageAt(index: number, count: number): number {
  if (index === 0) return 0;
  if (index === count - 1) return CHAT_TIMELINE.final;
  if (index === 1) return CHAT_TIMELINE.second;
  return CHAT_TIMELINE.third;
}

/** El indicador «escribiendo» solo antecede a mensajes del agente (segundo mensaje). */
export function typingWindow(script: ChatScript): { from: number; to: number } | null {
  const second = script.messages[1];
  if (!second || second.from !== "agent") return null;
  return { from: CHAT_TIMELINE.typingStart, to: CHAT_TIMELINE.second };
}

/* ------------------------------ CRM / tareas ------------------------------ */

export interface CrmRow {
  id: string;
  company: string;
  contact: string;
  stage: string;
  owner: string;
  lastAction: string;
}

export const CRM_ROW_NEW: CrmRow = {
  id: "OPP-DEMO-1042",
  company: "Empresa Demo Norte",
  contact: "Seguimiento comercial",
  stage: "Nueva",
  owner: "Equipo comercial",
  lastAction: "Contexto registrado por el agente",
};

export const CRM_ROWS_BASE: readonly CrmRow[] = [
  {
    id: "OPP-DEMO-1040",
    company: "Estudio Desierto Demo",
    contact: "Consulta de propuesta",
    stage: "En conversación",
    owner: "Equipo comercial",
    lastAction: "Propuesta enviada al equipo",
  },
  {
    id: "OPP-DEMO-1041",
    company: "Tienda Bahía Demo",
    contact: "Solicitud de información",
    stage: "Sin próxima acción",
    owner: "Equipo comercial",
    lastAction: "Consulta recibida",
  },
];

/* --------------------------------- Agenda --------------------------------- */

export const CALENDAR_WEEK = {
  label: "Semana de ejemplo",
  range: "21–25 septiembre 2026",
  timezone: "America/Santiago",
  days: [
    { id: "mon", short: "Lun", date: "21", full: "lunes 21" },
    { id: "tue", short: "Mar", date: "22", full: "martes 22" },
    { id: "wed", short: "Mié", date: "23", full: "miércoles 23" },
    { id: "thu", short: "Jue", date: "24", full: "jueves 24" },
    { id: "fri", short: "Vie", date: "25", full: "viernes 25" },
  ],
} as const;

export interface Slot {
  id: string;
  day: "mon" | "tue" | "wed" | "thu" | "fri";
  time: string;
}

/** Slots de 45 minutos ficticios. Los ejemplos del guion: mié 16:30 y jue 11:00. */
export const CALENDAR_SLOTS: readonly Slot[] = [
  { id: "SLOT-DEMO-21-1000", day: "mon", time: "10:00" },
  { id: "SLOT-DEMO-22-1500", day: "tue", time: "15:00" },
  { id: "SLOT-DEMO-23-1630", day: "wed", time: "16:30" },
  { id: "SLOT-DEMO-24-1100", day: "thu", time: "11:00" },
  { id: "SLOT-DEMO-25-0930", day: "fri", time: "09:30" },
];

/* --------------------------------- Factura -------------------------------- */

export const INVOICE = {
  id: "FAC-DEMO-1042",
  customer: "Empresa Demo Norte",
  amountCLP: 180000,
  due: "22/09/2026",
  dueLong: "22 de septiembre de 2026",
} as const;

/** C-DEMO (R4.7): cartera de tres facturas, fecha del ejemplo 21-09-2026. */
export interface PortfolioInvoice {
  id: string;
  customer: string;
  amountCLP: number;
  due: string;
  status: "pending" | "overdue" | "paid";
}

export const PORTFOLIO: readonly PortfolioInvoice[] = [
  { id: "INV-DEMO-1042", customer: "Empresa Demo Norte", amountCLP: 180000, due: "22-09-2026", status: "pending" },
  { id: "INV-DEMO-1043", customer: "Estudio Desierto Demo", amountCLP: 120000, due: "20-09-2026", status: "overdue" },
  { id: "INV-DEMO-1044", customer: "Tienda Bahía Demo", amountCLP: 90000, due: "18-09-2026", status: "paid" },
];

/* ----------------------------- Feed de operaciones ------------------------- */

export interface FeedEvent {
  time: string;
  category: string;
  message: string;
  status: "Completo" | "En revisión" | "Pendiente";
}

/** R4.6 — ocho eventos fijos, cada 3200 ms. */
export const FEED_EVENTS: readonly FeedEvent[] = [
  { time: "09:30:00", category: "Atención", message: "Consulta DEMO-SOL-1042 registrada", status: "Completo" },
  { time: "09:30:04", category: "Comercial", message: "Oportunidad OPP-DEMO-1042 preparada", status: "Completo" },
  { time: "09:30:08", category: "Agenda", message: "Horario de ejemplo seleccionado", status: "En revisión" },
  { time: "09:30:12", category: "Documentos", message: "DOC-DEMO-301 recibido para revisión", status: "Pendiente" },
  { time: "09:30:16", category: "Coordinación", message: "Responsable asignado a SOL-DEMO-302", status: "Completo" },
  { time: "09:30:20", category: "Seguimiento", message: "Tarea TASK-DEMO-1042 preparada", status: "Pendiente" },
  { time: "09:30:24", category: "Información", message: "Registro de pedido consultado", status: "Completo" },
  { time: "09:30:28", category: "Derivación", message: "Contexto entregado a Equipo Demo", status: "En revisión" },
];
export const FEED_INTERVAL_MS = 3200;

/* ------------------------- Builder / dashboards (R4.4) --------------------- */

export type BuilderScenarioId = "pedidos" | "documentos" | "solicitudes";

export interface DemoRecord {
  id: string;
  label: string;
  area: string;
  statusLabel: string;
  resolved: boolean;
}

export interface BuilderScenario {
  id: BuilderScenarioId;
  chip: string;
  need: string;
  phases: readonly [string, string, string, string];
  final: string;
  dashboardTitle: string;
  columns: readonly [string, string, string];
  records: readonly DemoRecord[];
  /** Etiquetas para las 5 fases del workflow. */
  nodes: readonly [
    { title: string; input: string; result: string },
    { title: string; input: string; result: string },
    { title: string; input: string; result: string },
    { title: string; input: string; result: string },
    { title: string; input: string; result: string },
  ];
}

export const BUILDER_SCENARIOS: readonly BuilderScenario[] = [
  {
    id: "pedidos",
    chip: "Pedidos",
    need: "Quiero ordenar los pedidos que llegan por distintos canales.",
    phases: [
      "Entradas: solicitud y detalle",
      "Conexiones: canal y registro",
      "Reglas: validar información",
      "Interfaz: pedidos y responsables",
    ],
    final: "Sistema de ejemplo listo",
    dashboardTitle: "Pedidos",
    columns: ["Pedido", "Estado", "Responsable"],
    records: [
      { id: "PED-DEMO-1042", label: "Pedido", area: "Equipo demo", statusLabel: "Por revisar", resolved: false },
      { id: "PED-DEMO-1043", label: "Pedido", area: "Equipo demo", statusLabel: "En preparación", resolved: false },
      { id: "PED-DEMO-1044", label: "Pedido", area: "Equipo demo", statusLabel: "Resuelto", resolved: true },
    ],
    nodes: [
      { title: "Necesidad", input: "Pedidos que llegan por varios canales", result: "Alcance definido" },
      { title: "Entradas", input: "Solicitud y detalle del pedido", result: "Pedido recibido" },
      { title: "Conexiones", input: "Canal y registro", result: "Datos en un solo lugar" },
      { title: "Reglas", input: "Validar información", result: "Falta información → Revisión humana" },
      { title: "Interfaz", input: "Pedidos y responsables", result: "Panel de pedidos" },
    ],
  },
  {
    id: "documentos",
    chip: "Documentos",
    need: "Quiero saber qué documentos llegaron y cuáles necesitan revisión.",
    phases: [
      "Entradas: documento recibido",
      "Conexiones: carpeta y registro",
      "Reglas: comprobar campos",
      "Interfaz: pendientes de revisión",
    ],
    final: "Sistema de ejemplo listo",
    dashboardTitle: "Documentos",
    columns: ["Documento", "Tipo", "Estado"],
    records: [
      { id: "DOC-DEMO-301", label: "Solicitud", area: "Equipo demo", statusLabel: "Por revisar", resolved: false },
      { id: "DOC-DEMO-302", label: "Antecedentes", area: "Equipo demo", statusLabel: "En seguimiento", resolved: false },
      { id: "DOC-DEMO-303", label: "Comprobante", area: "Equipo demo", statusLabel: "Resuelto", resolved: true },
    ],
    nodes: [
      { title: "Necesidad", input: "Saber qué documentos llegaron", result: "Alcance definido" },
      { title: "Entradas", input: "Documento recibido", result: "Documento registrado" },
      { title: "Conexiones", input: "Carpeta y registro", result: "Documento y datos enlazados" },
      { title: "Reglas", input: "Comprobar campos", result: "Faltan campos → Revisión humana" },
      { title: "Interfaz", input: "Pendientes de revisión", result: "Lista de pendientes" },
    ],
  },
  {
    id: "solicitudes",
    chip: "Solicitudes",
    need: "Quiero que cada solicitud tenga un responsable y un próximo paso.",
    phases: [
      "Entradas: consulta",
      "Conexiones: bandeja y registro",
      "Reglas: asignar responsable",
      "Interfaz: tablero de solicitudes",
    ],
    final: "Sistema de ejemplo listo",
    dashboardTitle: "Solicitudes",
    columns: ["Solicitud", "Tipo", "Estado"],
    records: [
      { id: "SOL-DEMO-301", label: "Consulta", area: "Equipo demo", statusLabel: "Por revisar", resolved: false },
      { id: "SOL-DEMO-302", label: "Coordinación", area: "Equipo demo", statusLabel: "En seguimiento", resolved: false },
      { id: "SOL-DEMO-303", label: "Información", area: "Equipo demo", statusLabel: "Resuelta", resolved: true },
    ],
    nodes: [
      { title: "Necesidad", input: "Cada solicitud con responsable", result: "Alcance definido" },
      { title: "Entradas", input: "Consulta recibida", result: "Solicitud creada" },
      { title: "Conexiones", input: "Bandeja y registro", result: "Solicitud en el registro" },
      { title: "Reglas", input: "Asignar responsable", result: "Sin responsable → Revisión humana" },
      { title: "Interfaz", input: "Tablero de solicitudes", result: "Tablero con próximos pasos" },
    ],
  },
];

/* --------------------------- Sitios y ecommerce (R4.5) --------------------- */

export interface Product {
  id: string;
  name: string;
  priceCLP: number;
}

export const WEB_PRODUCTS: readonly Product[] = [
  { id: "KIT-DEMO-01", name: "Kit de escritorio", priceCLP: 29990 },
  { id: "CUA-DEMO-02", name: "Cuaderno de trabajo", priceCLP: 8990 },
];

/* --------------------------- FIN-DEMO (R4.8, Y3) --------------------------- */

export type FinStatus = "informativo" | "coincidencia-encontrada" | "requiere-revision" | "confirmacion-requerida";

export interface FinScene {
  id: "ventas-mes" | "factura-pendiente" | "previred" | "resumen-diario";
  label: string;
  question: string;
  sources: readonly string[];
  steps: readonly string[];
  result: string;
  status: FinStatus;
  action?: string;
}

export const FIN_COMPANY = "Demo Norte SpA";

export const FIN_SCENES: readonly FinScene[] = [
  {
    id: "ventas-mes",
    label: "Ventas del mes",
    question: "¿Cuánto vendimos este mes?",
    sources: ["Documentos tributarios (simulado)"],
    steps: ["Consulta documentos del mes", "Suma por tipo de documento"],
    result: "Ventas de septiembre 2026 (simulado): CLP $4.820.000 en 18 documentos.",
    status: "informativo",
  },
  {
    id: "factura-pendiente",
    label: "Factura pendiente",
    question: "¿Qué facturas siguen pendientes?",
    sources: ["Facturas (simulado)", "Movimientos bancarios (simulado)"],
    steps: ["Consulta facturas abiertas", "Cruza con movimientos del banco"],
    result: "FAC-DEMO-1042 por CLP $180.000: hay un movimiento con monto similar. Requiere revisión antes de marcarla como pagada.",
    status: "requiere-revision",
    action: "Preparar recordatorio",
  },
  {
    id: "previred",
    label: "Previred",
    question: "¿Cómo va el estado de Previred este mes?",
    sources: ["Estado de cotizaciones (simulado)"],
    steps: ["Consulta el estado ficticio", "Detecta una diferencia por revisar"],
    result: "Estado ficticio: 1 diferencia por revisar. Se prepara una alerta para la persona responsable.",
    status: "confirmacion-requerida",
    action: "Preparar alerta",
  },
  {
    id: "resumen-diario",
    label: "Resumen diario",
    question: "Dame el resumen del día.",
    sources: ["Facturas (simulado)", "Banco (simulado)", "CRM (simulado)"],
    steps: ["Reúne varias fuentes", "Ordena pendientes por área"],
    result: "3 facturas abiertas, 1 coincidencia encontrada y 2 tareas asignadas al equipo.",
    status: "coincidencia-encontrada",
  },
];

export const FIN_STATUS_LABEL: Record<FinStatus, string> = {
  informativo: "Informativo",
  "coincidencia-encontrada": "Coincidencia encontrada",
  "requiere-revision": "Requiere revisión",
  "confirmacion-requerida": "Confirmación requerida",
};

/* ------------------------------- Plataforma -------------------------------- */

export interface PlatformContact {
  id: string;
  initials: string;
  name: string;
  company: string;
  channel: "Web" | "WhatsApp";
  status: "Abierta" | "En seguimiento" | "Cerrada";
  excerpt: string;
  messages: readonly ScriptMessage[];
  nextAction: string | null;
}

export const PLATFORM_CONTACTS: readonly PlatformContact[] = [
  {
    id: "P-DEMO-01",
    initials: "AL",
    name: "Alex",
    company: "Empresa Norte Demo",
    channel: "Web",
    status: "Abierta",
    excerpt: "Quiero conocer las opciones para mi empresa.",
    messages: [
      { from: "person", text: "Quiero conocer las opciones para mi empresa." },
      { from: "agent", text: "Podemos coordinar una conversación sobre tu proceso." },
    ],
    nextAction: "Revisar solicitud",
  },
  {
    id: "P-DEMO-02",
    initials: "DA",
    name: "Dani",
    company: "Estudio Desierto Demo",
    channel: "WhatsApp",
    status: "En seguimiento",
    excerpt: "¿Podemos cambiar la hora?",
    messages: [
      { from: "person", text: "¿Podemos cambiar la hora?" },
      { from: "agent", text: "En este ejemplo hay una alternativa disponible." },
    ],
    nextAction: "Confirmar cambio",
  },
  {
    id: "P-DEMO-03",
    initials: "SB",
    name: "Sam",
    company: "Tienda Bahía Demo",
    channel: "Web",
    status: "Cerrada",
    excerpt: "Gracias, recibí la información.",
    messages: [
      { from: "person", text: "Gracias, recibí la información." },
      { from: "agent", text: "Quedó registrado el cierre del ejemplo." },
    ],
    nextAction: null,
  },
];
