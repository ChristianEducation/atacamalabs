/**
 * Registro de integraciones — spec/implementation/03-INTEGRATIONS-ASSETS.md (R3).
 * Seed inicial VACÍO: ninguna integración está verificada comercialmente
 * (FV-U03). Solo `verified=true` con label de alcance aprobado aparece en
 * público; los logos de terceros solo con permiso de marca. No inferir
 * compatibilidad por logos de competidores ni por material conceptual, y no
 * publicar cifras de conexiones (DEC-11).
 *
 * Emisso: integración candidata pendiente (DEC-23 / R3.4 / FV-U09). Se registra
 * `pending` sin logo, sin claim de partnership y sin disponibilidad contractual.
 */

export type IntegrationCategory =
  | "crm"
  | "calendar"
  | "commerce"
  | "messaging"
  | "documents"
  | "finance"
  | "tax"
  | "hr"
  | "database"
  | "erp"
  | "other";

export interface IntegrationRecord {
  id: string;
  name: string;
  category: IntegrationCategory;
  verified: boolean;
  availabilityNote: string;
  approvedPublicLabel: string;
  logoMonoPath?: string;
  logoColorPath?: string;
  brandUseAllowed: boolean;
  /** Referencia interna, no necesariamente una URL pública. */
  evidenceReference: string;
  checkedAt: string;
}

export const INTEGRATIONS: readonly IntegrationRecord[] = [];

/** Candidatas pendientes: no se renderizan en ninguna superficie pública. */
export const PENDING_INTEGRATIONS: readonly { id: string; note: string }[] = [
  {
    id: "emisso",
    note: "Integración candidata para infraestructura chilena (SII, bancos, Previred). Pendiente de reunión, POC y validación (FV-U09).",
  },
];

export function verifiedIntegrations(): IntegrationRecord[] {
  return INTEGRATIONS.filter((i) => i.verified && i.brandUseAllowed && i.approvedPublicLabel);
}

/**
 * Preview = todavía no hay dominio canónico ni entorno de producción:
 * el marquee puede mostrar placeholders neutros rotulados como pendientes.
 * En público con cero integraciones muestra el texto alternativo (E17).
 */
export function isPreviewEnvironment(): boolean {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.VERCEL_ENV === "preview" ||
    !process.env.NEXT_PUBLIC_SITE_URL
  );
}

export const CATEGORY_LABEL: Record<IntegrationCategory, string> = {
  crm: "CRM",
  calendar: "Calendario",
  commerce: "Comercio",
  messaging: "Mensajería",
  documents: "Documentos",
  finance: "Finanzas",
  tax: "Tributario",
  hr: "Personas",
  database: "Base de datos",
  erp: "ERP",
  other: "Otras herramientas",
};

/** Slots genéricos de preview (E17: «seis placeholders neutros rotulados como pendientes»). */
export const PREVIEW_PLACEHOLDERS: readonly string[] = [
  "CRM",
  "Calendario",
  "Mensajería",
  "Base de datos",
  "Documentos",
  "ERP",
];

export interface MarqueeEntry {
  id: string;
  name: string;
  logo?: string;
  note?: string;
  placeholder?: boolean;
}

/**
 * Datos del marquee (E17): solo integraciones verificadas con marca permitida.
 * Sin ninguna, en preview se muestran seis placeholders neutros rotulados como
 * pendientes; en público, ninguno (la UI muestra el texto alternativo).
 */
export function marqueeEntries(): { items: MarqueeEntry[]; preview: boolean } {
  const verified = verifiedIntegrations();
  if (verified.length > 0) {
    return {
      preview: false,
      items: verified.map((i) => ({
        id: i.id,
        name: i.approvedPublicLabel,
        logo: i.logoMonoPath,
        note: i.availabilityNote,
      })),
    };
  }
  if (isPreviewEnvironment()) {
    return {
      preview: true,
      items: PREVIEW_PLACEHOLDERS.map((name) => ({
        id: `placeholder-${name}`,
        name,
        placeholder: true,
        note: "Integración por confirmar",
      })),
    };
  }
  return { preview: false, items: [] };
}
