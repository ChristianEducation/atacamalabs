/**
 * Copy de /a-medida — ATACAMA_LABS_A_MEDIDA_SPEC_V1. Sin plazos ni precios
 * inventados; sin promesas de «sin código» ni «en minutos». Los ejemplos de
 * datos (planillas, pedidos) son ilustrativos.
 */

export const CUSTOM_HERO = {
  eyebrow: "SISTEMAS Y AUTOMATIZACIONES A MEDIDA",
  lead: "Diseñamos sistemas, integraciones y automatizaciones alrededor de cómo funciona tu empresa. Conectamos herramientas, datos y reglas para que el trabajo ocurra de principio a fin.",
  trust: "Para cuando tu proceso es más complejo que una conversación.",
  builder: {
    title: "Nuevo proceso",
    status: "En diseño",
    label: "Requerimiento",
    prompt:
      "Las solicitudes de compra llegan por correo y planillas. Necesitamos validarlas contra el presupuesto, aprobarlas según el monto y registrar todo en el ERP.",
    button: "Diseñar solución",
    flowLabel: "Solución propuesta",
    flow: ["Solicitud", "Presupuesto", "Aprobación", "Orden"],
    panel: {
      title: "Tablero de aprobaciones",
      rows: [
        { id: "OC-2041", meta: "Insumos de oficina · $180.000", state: "Aprobada", ok: true },
        { id: "OC-2042", meta: "Equipos TI · $1.450.000", state: "En aprobación", ok: false },
        { id: "OC-2043", meta: "Mantención · $320.000", state: "Aprobada", ok: true },
      ],
    },
  },
} as const;

export const CUSTOM_PROCESS_HEADING = {
  eyebrow: "DEL PROCESO A LA SOLUCIÓN",
  title: "Muéstranos cómo trabajas hoy.",
  lead: "Entendemos el proceso, identificamos los datos y reglas que necesita, conectamos tus sistemas y construimos la solución alrededor de tu operación.",
} as const;

export const CUSTOM_SCENE_TYPING = {
  number: "01",
  title: "Entendemos tu proceso",
  body: "Nos muestras cómo ocurre hoy, quién interviene, dónde se pierde tiempo y qué reglas debe respetar la solución.",
  label: "Así lo cuentas hoy",
  text: "Las solicitudes de compra llegan por correo y planillas, revisamos el presupuesto a mano, pedimos la aprobación por mail y después cargamos la orden en el ERP.",
  tag: "Flujo detectado: Solicitud → Presupuesto → Aprobación → Orden",
} as const;

export const CUSTOM_SCENE_CONTEXT = {
  number: "02",
  title: "Ordenamos datos y reglas",
  body: "Definimos qué información consulta la solución, quién puede aprobar qué y qué reglas debe cumplir.",
  label: "Datos y reglas del proceso",
  items: [
    { badge: "XLS", name: "Presupuesto por área", meta: "Planilla" },
    { badge: "REG", name: "Umbrales de aprobación", meta: "Regla" },
    { badge: "ERP", name: "Proveedores y órdenes", meta: "Sistema" },
  ],
  done: { name: "Reglas y permisos listos", meta: "3 fuentes" },
} as const;

export const CUSTOM_SCENE_CONNECT = {
  number: "03",
  title: "Conectamos tus sistemas",
  body: "Integramos las herramientas y sistemas que ya usas, y construimos conectores cuando el proceso lo necesita.",
  pills: ["Correo", "Planillas", "ERP", "API interna", "Base de datos"],
  done: "5 conexiones listas",
} as const;

export const CUSTOM_SCENE_LIVE = {
  number: "04",
  title: "Probamos y lo ponemos a trabajar",
  body: "Validamos escenarios, permisos y resultados antes de dejar el proceso funcionando en tu operación.",
  label: "Estado del proceso",
  rows: ["Solicitud validada", "Aprobación según monto", "Orden creada en el ERP", "Registro de auditoría"],
  done: "Proceso operativo",
} as const;

export const CUSTOM_STACK = {
  eyebrow: "INTEGRACIONES",
  titleA: "No reemplazamos todo.",
  titleB: "Conectamos lo que ya tienes.",
  lead: "CRM, ERP, hojas de cálculo, bases de datos, mensajería, calendarios, pagos o sistemas propios: diseñamos la conexión según los accesos y capacidades disponibles.",
  note: "Compatibilidad vía API o conector según disponibilidad; el alcance se define por proyecto.",
  leftLabel: "Lo que ya tienes",
  rightLabel: "Lo que construimos",
  hub: "Atacama Labs",
  have: [
    { id: "mail", name: "Correo", logo: null },
    { id: "googlesheets", name: "Hojas de cálculo", logo: "/visual/integrations/googlesheets.svg" },
    { id: "crm", name: "CRM", logo: null },
    { id: "db", name: "Base de datos", logo: null },
    { id: "erp", name: "ERP o sistema propio", logo: null },
  ],
  build: [
    { id: "panel", name: "Panel interno", body: "Una vista propia de tu operación." },
    { id: "portal", name: "Portal", body: "Para tus clientes o tu equipo." },
    { id: "auto", name: "Automatización", body: "El proceso, de punta a punta." },
  ],
  also: ["ERP", "API", "Webhooks", "MCP", "Correo", "Sistema propio"],
} as const;

export const CUSTOM_CASES_HEADING = {
  eyebrow: "CASOS",
  title: "Un proceso, de punta a punta.",
  lead: "No automatizamos una pantalla aislada. Podemos conectar varias acciones hasta completar el trabajo.",
} as const;

export type CaseStepIcon =
  | "message"
  | "book"
  | "calc"
  | "link"
  | "shield"
  | "clipboard"
  | "form"
  | "user"
  | "tasks"
  | "bell"
  | "file"
  | "scan"
  | "db"
  | "chart"
  | "lead"
  | "target"
  | "users"
  | "calendar"
  | "layout";

export const CUSTOM_CASES: readonly {
  id: string;
  tab: string;
  intro: string;
  steps: readonly { icon: CaseStepIcon; label: string }[];
  result: string;
}[] = [
  {
    id: "compras",
    tab: "Compras y aprobaciones",
    intro: "De la solicitud a la orden aprobada, con reglas por monto y registro de quién autorizó.",
    steps: [
      { icon: "form", label: "Solicitud" },
      { icon: "calc", label: "Presupuesto" },
      { icon: "user", label: "Aprobación" },
      { icon: "clipboard", label: "Orden" },
      { icon: "chart", label: "Reporte" },
    ],
    result: "Orden aprobada y registrada en el ERP",
  },
  {
    id: "sincronia",
    tab: "Sincronización de sistemas",
    intro: "La misma información en el ERP, la tienda y las planillas, sin copiar y pegar.",
    steps: [
      { icon: "db", label: "ERP" },
      { icon: "shield", label: "Reglas de sincronía" },
      { icon: "link", label: "Sincronización" },
      { icon: "file", label: "Tienda o planilla" },
      { icon: "bell", label: "Alertas" },
    ],
    result: "Datos iguales en todos tus sistemas",
  },
  {
    id: "panel",
    tab: "Panel o portal",
    intro: "Una vista propia donde tu equipo o tus clientes consultan y gestionan lo que antes vivía en planillas y correos.",
    steps: [
      { icon: "db", label: "Planillas y sistemas" },
      { icon: "shield", label: "Reglas y permisos" },
      { icon: "layout", label: "Panel a medida" },
      { icon: "users", label: "Equipo o clientes" },
      { icon: "tasks", label: "Gestión" },
    ],
    result: "Todo en un solo lugar, con permisos",
  },
  {
    id: "reportes",
    tab: "Reportes para gerencia",
    intro: "Los datos de varios sistemas se consolidan y llegan como reporte a quien lo necesita.",
    steps: [
      { icon: "db", label: "Fuentes" },
      { icon: "link", label: "Consolidación" },
      { icon: "calc", label: "Indicadores" },
      { icon: "chart", label: "Reporte" },
      { icon: "bell", label: "Envío" },
    ],
    result: "Reporte listo, sin armarlo a mano",
  },
  {
    id: "documentos",
    tab: "Documentos con reglas",
    intro: "Del documento recibido a los datos validados y cargados en tu sistema.",
    steps: [
      { icon: "file", label: "Documento" },
      { icon: "scan", label: "Extracción de datos" },
      { icon: "shield", label: "Validación" },
      { icon: "db", label: "Sistema" },
      { icon: "chart", label: "Reporte" },
    ],
    result: "Documento procesado y cargado",
  },
];

export const CUSTOM_STEPS_HEADING = {
  eyebrow: "IMPLEMENTACIÓN",
  title: "De tu operación a una solución funcionando.",
} as const;

export const CUSTOM_STEPS = [
  { title: "Entendemos", body: "Proceso, personas, reglas y resultado esperado." },
  { title: "Diseñamos", body: "Definimos arquitectura, automatizaciones, interfaces y permisos." },
  { title: "Integramos", body: "Conectamos sistemas, datos y herramientas." },
  { title: "Probamos", body: "Validamos escenarios reales y errores." },
  { title: "Operamos", body: "Publicamos, medimos y ajustamos." },
] as const;

export const CUSTOM_CTA = {
  titleA: "Cuéntanos qué ocurre hoy.",
  titleB: "Diseñamos cómo debería funcionar mañana.",
  body: "Nos cuentas tu proceso y te mostramos cómo lo resolveríamos. No necesitas llegar con una especificación técnica.",
  hero: { label: "Cuéntanos tu proceso", href: "/diagnostico?necesidad=a-medida" },
  primary: { label: "Agendar demo gratuita", href: "/diagnostico?necesidad=a-medida" },
} as const;
