/**
 * Misiones — V3.0.1 §5/§8 (A3) + V3.3 §11 (gramática de motion, referencia
 * IAutomatiza). Cada misión es un intercambio corto y real: burbuja de la
 * persona, respuesta breve del agente y el resultado como una pieza de
 * producto de verdad (fila de CRM, card de calendario o recibo de acción),
 * no un diagrama abstracto. Una sola reproducción, sin loop.
 */

import type { CrmRow } from "@/content/marketing/fixtures";

export type MissionResult =
  | { kind: "crm"; row: CrmRow }
  | { kind: "calendar"; day: string; date: string; time: string; title: string }
  | { kind: "receipt"; id: string; area: string; status: string };

export interface MissionScene {
  message: string;
  reply: string;
  result: MissionResult;
}

export type MissionId = "comercial" | "cobranza" | "administrativo-financiero" | "atencion" | "agendamiento" | "otro";

export interface MissionOption {
  id: MissionId;
  label: string;
  copy: string;
  capacities?: readonly string[];
  scene: MissionScene;
  cta: { label: string; href: string };
}

export const AGENT_MISSIONS: readonly MissionOption[] = [
  {
    id: "comercial",
    label: "Comercial",
    copy: "Responde, califica, agenda y mantiene cada oportunidad en movimiento.",
    capacities: ["Responde consultas de venta", "Califica y agenda visitas", "Actualiza el estado en tu CRM"],
    scene: {
      message: "Mañana después de las 5 me sirve.",
      reply: "Perfecto, quedó agendado y registrado.",
      result: {
        kind: "crm",
        row: {
          id: "OPP-DEMO-241",
          company: "Estudio Desierto",
          contact: "Consulta comercial",
          stage: "Reunión agendada",
          owner: "Equipo comercial",
          lastAction: "Agendó reunión para mañana 17:00",
        },
      },
    },
    cta: { label: "Hablar sobre ventas", href: "/diagnostico?necesidad=agentes&capacidad=comercial" },
  },
  {
    id: "cobranza",
    label: "Cobranza",
    copy: "Sigue cada cuenta, envía recordatorios y mantiene el estado actualizado.",
    capacities: ["Consulta estados de pago", "Envía recordatorios", "Registra cada gestión"],
    scene: {
      message: "La última factura ya la pagué.",
      reply: "Reviso el estado y dejo la gestión registrada.",
      result: { kind: "receipt", id: "COB-DEMO-118", area: "Cobranza", status: "Gestión registrada" },
    },
    cta: { label: "Hablar sobre cobranza", href: "/diagnostico?necesidad=agentes&capacidad=cobranza" },
  },
  {
    id: "administrativo-financiero",
    label: "Administrativo / Financiero",
    copy: "Consulta información, cruza datos y ejecuta tareas administrativas bajo tus reglas.",
    capacities: ["Consulta información interna", "Cruza datos entre sistemas", "Ejecuta tareas bajo tus reglas"],
    scene: {
      message: "¿Qué facturas siguen pendientes?",
      reply: "Encontré 3 pendientes y dejé el resumen listo.",
      result: { kind: "receipt", id: "ADM-DEMO-076", area: "Administración", status: "Resumen generado" },
    },
    cta: {
      label: "Hablar sobre administración",
      href: "/diagnostico?necesidad=agentes&capacidad=administrativo-financiero",
    },
  },
  {
    id: "atencion",
    label: "Atención",
    copy: "Responde con la información de tu empresa y deriva cuando hace falta una persona.",
    capacities: ["Responde con tu información", "Deriva cuando hace falta criterio", "Deja el contexto registrado"],
    scene: {
      message: "¿Tienen horario los sábados?",
      reply: "Sí, de 9 a 14 horas. ¿Te ayudo con algo más?",
      result: { kind: "receipt", id: "ATN-DEMO-304", area: "Atención", status: "Consulta resuelta" },
    },
    cta: { label: "Hablar sobre atención", href: "/diagnostico?necesidad=agentes&capacidad=atencion" },
  },
  {
    id: "agendamiento",
    label: "Agendamiento",
    copy: "Revisa disponibilidad, propone horarios y deja la cita registrada.",
    capacities: ["Revisa disponibilidad real", "Propone horarios", "Confirma y registra la cita"],
    scene: {
      message: "¿Tienen hora esta semana?",
      reply: "Sí, quedó agendada para el jueves.",
      result: { kind: "calendar", day: "Jueves", date: "25 sep", time: "11:00", title: "Cita registrada" },
    },
    cta: { label: "Hablar sobre agendamiento", href: "/diagnostico?necesidad=agentes&capacidad=agendamiento" },
  },
  {
    id: "otro",
    label: "Otro proceso",
    copy: "Si el trabajo ocurre entre mensajes, sistemas y tareas repetitivas, podemos revisar cómo delegarlo.",
    scene: {
      message: "Recibimos esto todos los días.",
      reply: "Puedo encargarme y dejar el registro listo.",
      result: { kind: "receipt", id: "PRO-DEMO-052", area: "Proceso", status: "Delegado" },
    },
    cta: { label: "Cuéntanos el proceso", href: "/diagnostico?necesidad=agentes" },
  },
];

/** H3 del Home: persona → agente → Calendar → reunión creada (spec V3.3 §9). */
export const HOME_MISSION: MissionScene = {
  message: "¿Tienen hora para el jueves?",
  reply: "Quedó agendada para el jueves.",
  result: { kind: "calendar", day: "Jueves", date: "25 sep", time: "11:00", title: "Reunión creada" },
};
