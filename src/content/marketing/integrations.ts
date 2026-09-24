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

export interface HomeTool {
  id: string;
  name: string;
  logo: string;
}

/**
 * Selección visual de la franja del Home (HOME_SPEC_V1 §5.3). Herramientas
 * conectables desde nuestra arquitectura; la lista pública final se valida
 * antes del deploy. Logos monocromos Simple Icons (CC0) en /visual/integrations.
 */
export const HOME_TOOLS: readonly HomeTool[] = [
  { id: "whatsapp", name: "WhatsApp", logo: "/visual/integrations/whatsapp.svg" },
  { id: "googlecalendar", name: "Google Calendar", logo: "/visual/integrations/googlecalendar.svg" },
  { id: "hubspot", name: "HubSpot", logo: "/visual/integrations/hubspot.svg" },
  { id: "gmail", name: "Gmail", logo: "/visual/integrations/gmail.svg" },
  { id: "slack", name: "Slack", logo: "/visual/integrations/slack.svg" },
  { id: "googlesheets", name: "Google Sheets", logo: "/visual/integrations/googlesheets.svg" },
  { id: "salesforce", name: "Salesforce", logo: "/visual/integrations/salesforce.svg" },
  { id: "microsoftoutlook", name: "Outlook", logo: "/visual/integrations/microsoftoutlook.svg" },
  { id: "notion", name: "Notion", logo: "/visual/integrations/notion.svg" },
  { id: "googledrive", name: "Google Drive", logo: "/visual/integrations/googledrive.svg" },
  { id: "calendly", name: "Calendly", logo: "/visual/integrations/calendly.svg" },
  { id: "microsoftteams", name: "Microsoft Teams", logo: "/visual/integrations/microsoftteams.svg" },
  { id: "instagram", name: "Instagram", logo: "/visual/integrations/instagram.svg" },
  { id: "zoom", name: "Zoom", logo: "/visual/integrations/zoom.svg" },
  { id: "stripe", name: "Stripe", logo: "/visual/integrations/stripe.svg" },
  { id: "googlemeet", name: "Google Meet", logo: "/visual/integrations/googlemeet.svg" },
  { id: "shopify", name: "Shopify", logo: "/visual/integrations/shopify.svg" },
  { id: "telegram", name: "Telegram", logo: "/visual/integrations/telegram.svg" },
  { id: "zapier", name: "Zapier", logo: "/visual/integrations/zapier.svg" },
  { id: "airtable", name: "Airtable", logo: "/visual/integrations/airtable.svg" },
  { id: "woocommerce", name: "WooCommerce", logo: "/visual/integrations/woocommerce.svg" },
  { id: "messenger", name: "Messenger", logo: "/visual/integrations/messenger.svg" },
  { id: "n8n", name: "n8n", logo: "/visual/integrations/n8n.svg" },
  { id: "trello", name: "Trello", logo: "/visual/integrations/trello.svg" },
  { id: "mercadopago", name: "Mercado Pago", logo: "/visual/integrations/mercadopago.svg" },
  { id: "asana", name: "Asana", logo: "/visual/integrations/asana.svg" },
  { id: "zoho", name: "Zoho", logo: "/visual/integrations/zoho.svg" },
  { id: "jira", name: "Jira", logo: "/visual/integrations/jira.svg" },
  { id: "wordpress", name: "WordPress", logo: "/visual/integrations/wordpress.svg" },
  { id: "mailchimp", name: "Mailchimp", logo: "/visual/integrations/mailchimp.svg" },
  { id: "supabase", name: "Supabase", logo: "/visual/integrations/supabase.svg" },
  { id: "postgresql", name: "PostgreSQL", logo: "/visual/integrations/postgresql.svg" },
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
