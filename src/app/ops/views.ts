/** Secciones de /ops. Módulo sin "use client": lo usan el servidor (elegir la vista desde la URL) y el menú (cliente). */
export const VIEWS = [
  { id: "inicio", label: "Inicio" },
  { id: "aprobaciones", label: "Aprobaciones" },
  { id: "control", label: "Control" },
  { id: "prospeccion", label: "Prospección" },
  { id: "outreach", label: "Outreach" },
  { id: "contenido", label: "Contenido" },
  { id: "sistema", label: "Sistema" },
] as const;

export type ViewId = (typeof VIEWS)[number]["id"];

export function parseView(v: string | string[] | undefined): ViewId {
  const s = Array.isArray(v) ? v[0] : v;
  return (VIEWS.find((x) => x.id === s)?.id ?? "inicio") as ViewId;
}
