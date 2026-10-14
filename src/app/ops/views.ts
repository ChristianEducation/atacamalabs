/** Secciones de /ops. Módulo sin "use client": lo usan el servidor (elegir la vista desde la URL) y el menú (cliente). */

/** Navegación anterior (sigue disponible con content_config.ops_nav_v2 = false). */
export const VIEWS = [
  { id: "inicio", label: "Inicio" },
  { id: "aprobaciones", label: "Aprobaciones" },
  { id: "control", label: "Control" },
  { id: "prospeccion", label: "Prospección" },
  { id: "outreach", label: "Outreach" },
  { id: "contenido", label: "Contenido" },
  { id: "sistema", label: "Sistema" },
] as const;

/**
 * Atacama OS v3 (spec §5): 5 secciones. Cada sección agrupa vistas (pestañas). Las URLs viejas (?view=aprobaciones, ?view=outreach&tab=linkedin…)
 * siguen funcionando: cada vista vieja vive ahora dentro de su sección, así que ningún enlace queda roto.
 */
export const SECTIONS = [
  { id: "hoy", label: "Hoy", views: [{ id: "hoy", label: "Hoy" }] },
  { id: "redes", label: "Redes", views: [{ id: "ideas", label: "Ideas" }, { id: "contenido", label: "Publicaciones" }] },
  { id: "correo", label: "Prospección y correo", views: [{ id: "aprobaciones", label: "Aprobaciones" }, { id: "control", label: "Contacto preparado" }, { id: "prospeccion", label: "Radar" }, { id: "outreach", label: "Envíos" }] },
  { id: "resultados", label: "Resultados", views: [{ id: "resultados", label: "Resultados" }] },
  { id: "sistema", label: "Sistema", views: [{ id: "sistema", label: "Salud" }, { id: "controles", label: "Controles" }] },
] as const;

export type ViewId = (typeof VIEWS)[number]["id"] | "hoy" | "ideas" | "resultados" | "controles";
export type SectionId = (typeof SECTIONS)[number]["id"];

const ALL: readonly string[] = [...VIEWS.map((v) => v.id), ...SECTIONS.flatMap((s) => s.views.map((v) => v.id))];

/** Vista pedida en la URL; sin vista (o desconocida) → null y el panel decide la portada según la navegación activa. */
export function parseView(v: string | string[] | undefined): ViewId | null {
  const s = Array.isArray(v) ? v[0] : v;
  return s && ALL.includes(s) ? (s as ViewId) : null;
}

/** Sección (v2) a la que pertenece una vista. «inicio» (vieja) vive en «Hoy». */
export function sectionOf(view: ViewId): (typeof SECTIONS)[number] {
  const id = view === "inicio" ? "hoy" : view;
  return SECTIONS.find((s) => s.views.some((v) => v.id === id)) ?? SECTIONS[0];
}

/** Título de la vista en la navegación v2 (el h1 de cada vista se mantiene). */
export function viewLabel(view: ViewId): string {
  for (const s of SECTIONS) for (const v of s.views) if (v.id === view) return v.label;
  return VIEWS.find((v) => v.id === view)?.label ?? "";
}
