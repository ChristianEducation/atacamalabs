/** Copy de /agentes (spec pages/02-AGENTS.md, G1–G12). Datos, no JSX. */

import type { CapabilityId } from "@/components/marketing/demos/CapabilityDemos";

export const AGENTS_META_DESCRIPTION =
  "Agentes que se conectan a las herramientas de tu empresa para conversar, consultar información y ejecutar procesos reales.";

export const AGENTS_LINKS = [
  { label: "Demo", href: "#demo" },
  { label: "Capacidades", href: "#capacidades" },
  { label: "Integraciones", href: "#integraciones" },
  { label: "Planes", href: "#planes" },
  { label: "Preguntas", href: "#preguntas" },
] as const;

export const PACKAGING = [
  { name: "Agente Comercial", body: "entrada para ventas, calificación, agendamiento y seguimiento.", href: "/comercial" },
  { name: "Agente de Cobranza", body: "entrada para estados, recordatorios, pagos/conciliación y continuidad.", href: "/cobranza" },
  {
    name: "Agente Administrativo/Financiero",
    body: "entrada para consultas, cruces, alertas y tareas administrativas conectadas.",
    href: "/administrativo-financiero",
  },
  { name: "Agente Inteligente", body: "entrada abierta cuando el proceso no encaja en un paquete.", href: "/diagnostico?necesidad=agentes" },
] as const;

export const CAPABILITIES: readonly {
  id: CapabilityId;
  tab: string;
  title: string;
  body: string;
  action: string;
  cta: { label: string; href: string };
}[] = [
  {
    id: "atencion",
    tab: "Atención",
    title: "Respuestas útiles, con tu información.",
    body: "Resuelve consultas frecuentes y entrega a una persona lo que necesita criterio o autorización.",
    action: "Consulta de estado + derivación con historial",
    cta: { label: "Conversar sobre atención", href: "/diagnostico?necesidad=agentes" },
  },
  {
    id: "ventas",
    tab: "Ventas",
    title: "Cada consulta con un siguiente paso.",
    body: "Identifica lo que busca el cliente, reúne contexto y registra una oportunidad para tu equipo.",
    action: "Calificación + CRMRow",
    cta: { label: "Ver Agente Comercial", href: "/comercial" },
  },
  {
    id: "cobranza",
    tab: "Cobranza",
    title: "Recordatorios con contexto.",
    body: "Consulta estados y coordina seguimientos según las reglas de tu empresa.",
    action: "Factura + recordatorio, sin transacción real",
    cta: { label: "Ver Agente de Cobranza", href: "/cobranza" },
  },
  {
    id: "agendamiento",
    tab: "Agendamiento",
    title: "Coordinar una hora puede ser simple.",
    body: "Consulta disponibilidad, confirma una reserva y facilita cambios cuando corresponde.",
    action: "CalendarDemo y confirmación local",
    cta: { label: "Ver Agente Comercial", href: "/comercial#agendamiento" },
  },
  {
    id: "reactivacion",
    tab: "Reactivación",
    title: "Retoma conversaciones que quedaron abiertas.",
    body: "Programa contactos pertinentes con personas que autorizaron ese canal y deriva las respuestas interesadas.",
    action: "Contacto demo reactivado + tarea humana",
    cta: { label: "Conversar sobre reactivación", href: "/diagnostico?necesidad=agentes" },
  },
  {
    id: "seguimiento",
    tab: "Seguimiento",
    title: "Que la siguiente acción no se pierda.",
    body: "Registra compromisos, actualiza el estado y recuerda el paso acordado.",
    action: "Oportunidad + tarea programada",
    cta: { label: "Ver Agente Comercial", href: "/comercial" },
  },
];

export const ACTIONS = [
  { title: "Consultar información", body: "Buscar el dato en las fuentes disponibles para el proceso." },
  { title: "Revisar disponibilidad", body: "Comprobar opciones antes de proponer una coordinación." },
  { title: "Crear registros", body: "Dejar una solicitud u oportunidad con su contexto." },
  { title: "Actualizar estados", body: "Reflejar lo ocurrido en el registro correspondiente." },
  { title: "Preparar documentos", body: "Reunir información para una revisión posterior." },
  { title: "Programar seguimientos", body: "Registrar cuándo corresponde retomar una gestión." },
  { title: "Enviar confirmaciones", body: "Comunicar el resultado mediante el canal autorizado." },
  { title: "Derivar con contexto", body: "Entregar a una persona la información necesaria para continuar." },
  { title: "Registrar resultados", body: "Dejar trazabilidad del paso realizado." },
] as const;

/** G4 — cadena Mensaje → Entiende → Consulta → Actúa → Registra (S-AGENDA). */
export const AGENDA_NODES = [
  { title: "Mensaje", input: "«Quiero coordinar una reunión de ejemplo.»", result: "Solicitud recibida" },
  { title: "Entiende", input: "Solicitud recibida", result: "Necesidad: coordinar una reunión" },
  { title: "Consulta", input: "Semana de ejemplo", result: "Dos horarios: miércoles 23 a las 16:30 o jueves 24 a las 11:00" },
  { title: "Actúa", input: "«El miércoles a las 16:30.»", result: "Reserva de ejemplo confirmada: miércoles 23 de septiembre, 16:30" },
  { title: "Registra", input: "RES-DEMO-1042 + contexto", result: "Agenda · Reserva de ejemplo" },
] as const;

export const AGENDA_ALTERNATIVE = {
  nodeIndex: 3,
  label: "Explorar Revisión humana",
  input: "«El miércoles a las 16:30.» — la regla pide confirmación de una persona",
  result: "Derivado a Equipo Demo con el contexto; la reserva queda por revisar",
} as const;

export const HUB_CATEGORIES = [
  { id: "crm", label: "CRM", body: "Contactos, oportunidades y su historial." },
  { id: "calendario", label: "Calendario", body: "Disponibilidad y reservas." },
  { id: "mensajeria", label: "Mensajería", body: "Los canales donde conversan tus clientes." },
  { id: "datos", label: "Datos", body: "Planillas y bases de datos con la información del proceso." },
  { id: "erp", label: "ERP", body: "Sistemas de gestión con registros operativos." },
  { id: "finanzas", label: "Finanzas", body: "Facturación, cobros y conciliación." },
] as const;

export const CONTROL_ROWS = [
  { title: "Información", body: "Qué fuentes puede consultar y qué puede responder." },
  { title: "Acciones", body: "Qué registros crea o actualiza, y qué requiere confirmación." },
  { title: "Derivación", body: "Cuándo entrega a una persona y con qué contexto." },
] as const;

export const CONTROL_TICKETS = [
  {
    id: "DEMO-203",
    title: "Cambio fuera de reglas",
    status: "Revisión humana",
    resolved: false,
    history: ["Consulta recibida", "Regla no aplicable", "Derivación con contexto"],
  },
  {
    id: "DEMO-204",
    title: "Consulta de información",
    status: "Resuelta",
    resolved: true,
    history: ["Consulta recibida", "Información consultada", "Respuesta entregada"],
  },
] as const;

export const SETUP_STEPS = [
  { title: "Entendemos el proceso", body: "Identificamos entradas, resultado esperado y cuándo debe intervenir una persona." },
  { title: "Configuramos información y reglas", body: "Preparamos fuentes, respuestas y límites de acción para el proceso definido." },
  { title: "Conectamos herramientas", body: "Verificamos las conexiones necesarias y sus permisos." },
  { title: "Probamos con tu equipo", body: "Recorremos ejemplos y excepciones antes de habilitar el uso acordado." },
  { title: "Ajustamos el lanzamiento", body: "Revisamos el resultado y dejamos claro cómo continuará la operación." },
] as const;

export const AGENTS_FAQ = [
  {
    question: "¿Necesito cambiar mi número de WhatsApp?",
    answer:
      "Revisamos tu configuración actual y la modalidad de conexión antes de definir una migración. No necesitas tomar esa decisión para pedir un diagnóstico.",
  },
  {
    question: "¿Puede conectarse a mi CRM?",
    answer:
      "Evaluamos si existe un conector disponible o una API adecuada y qué acciones permite tu cuenta. La integración concreta se confirma en el alcance.",
  },
  {
    question: "¿Qué pasa si no sabe responder?",
    answer:
      "Se definen respuestas de respaldo y condiciones de derivación para que el equipo reciba el contexto necesario.",
  },
  {
    question: "¿Puedo intervenir en una conversación?",
    answer:
      "Diseñamos el proceso para incluir intervención humana. La forma de hacerlo se comprueba con la plataforma y los canales que utilice tu empresa.",
  },
  {
    question: "¿Cuánto demora implementarlo?",
    answer:
      "Las configuraciones estándar pueden implementarse en 24–48 horas cuando están disponibles los accesos y no requieren desarrollo especial. Integraciones o lógica personalizada se estiman según alcance.",
  },
  {
    question: "¿Qué sistemas puede utilizar?",
    answer:
      "Los que podamos integrar de forma segura mediante conector, MCP, API o webhook y para los que existan permisos adecuados. Si requiere desarrollo adicional, se define dentro del alcance.",
  },
  {
    question: "¿Cómo se cobra?",
    answer:
      "La tabla distingue implementación, servicio recurrente y posibles adicionales. La propuesta confirma moneda, impuestos, límites y condiciones antes de contratar.",
  },
  {
    question: "¿Tiene límites de uso?",
    answer:
      "Sí. El plan define cantidad de agentes, consumo, soporte y condiciones. El tipo de agente no bloquea por sí mismo una integración disponible.",
  },
] as const;
