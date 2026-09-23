/**
 * Misiones — ATACAMA_LABS_FINAL_MINIMAL_WEB_SPEC_V3_0_1 §5 y §8 (A3).
 * Cada opción del selector de /agentes: copy, hasta tres capacidades, una
 * misión animada (Mission.tsx) y un CTA contextual. Sin autoplay entre
 * opciones — el visitante elige.
 */

import type { MissionScene } from "@/components/marketing/demos/Mission";

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
      message: "“Mañana después de las 5 me sirve.”",
      tool: "Calendar",
      result: "Reunión agendada · 17:30",
    },
    cta: { label: "Hablar sobre ventas", href: "/diagnostico?necesidad=agentes&capacidad=comercial" },
  },
  {
    id: "cobranza",
    label: "Cobranza",
    copy: "Sigue cada cuenta, envía recordatorios y mantiene el estado actualizado.",
    capacities: ["Consulta estados de pago", "Envía recordatorios", "Registra cada gestión"],
    scene: {
      message: "“La factura 1842 la pagué ayer.”",
      tool: "Facturación",
      result: "Seguimiento actualizado",
    },
    cta: { label: "Hablar sobre cobranza", href: "/diagnostico?necesidad=agentes&capacidad=cobranza" },
  },
  {
    id: "administrativo-financiero",
    label: "Administrativo / Financiero",
    copy: "Consulta información, cruza datos y ejecuta tareas administrativas bajo tus reglas.",
    capacities: ["Consulta información interna", "Cruza datos entre sistemas", "Ejecuta tareas bajo tus reglas"],
    scene: {
      message: "“¿Qué facturas siguen pendientes?”",
      tool: "Sistema conectado",
      result: "3 facturas encontradas",
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
      message: "“¿Tienen horario los sábados?”",
      tool: "Base de conocimiento",
      result: "Consulta resuelta",
    },
    cta: { label: "Hablar sobre atención", href: "/diagnostico?necesidad=agentes&capacidad=atencion" },
  },
  {
    id: "agendamiento",
    label: "Agendamiento",
    copy: "Revisa disponibilidad, propone horarios y deja la cita registrada.",
    capacities: ["Revisa disponibilidad real", "Propone horarios", "Confirma y registra la cita"],
    scene: {
      message: "“¿Tienen hora esta semana?”",
      tool: "Calendar",
      result: "Cita registrada",
    },
    cta: { label: "Hablar sobre agendamiento", href: "/diagnostico?necesidad=agentes&capacidad=agendamiento" },
  },
  {
    id: "otro",
    label: "Otro proceso",
    copy: "Si el trabajo ocurre entre mensajes, sistemas y tareas repetitivas, podemos revisar cómo delegarlo.",
    scene: {
      message: "“Recibimos esto todos los días.”",
      tool: "Tus sistemas",
      result: "Proceso delegado",
    },
    cta: { label: "Cuéntanos el proceso", href: "/diagnostico?necesidad=agentes" },
  },
];

/** H3 del Home: mensaje → agente → Calendar → reunión creada. */
export const HOME_MISSION: MissionScene = {
  message: "“¿Tienen hora para el jueves?”",
  tool: "Calendar",
  result: "Reunión creada",
};
