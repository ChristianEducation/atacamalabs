import site from "@/lib/content";
import { agentsOffer } from "@/lib/agents-offer";

/**
 * Configuración pública permitida (spec R5.3): valores desconocidos quedan en
 * null con fallback definido — jamás una cadena «pendiente» que termine en un href.
 */

/** «Acceso clientes» solo con URL de marca validada, https y estado READY (FV-U07). */
export function clientPortalUrl(): string | null {
  const portal = agentsOffer.navigation.clientPortal;
  if (portal.brandVerified && portal.status === "READY" && portal.url) {
    try {
      if (new URL(portal.url).protocol === "https:") return portal.url;
    } catch {
      /* configuración inválida: se omite */
    }
  }
  return null;
}

export interface SocialLink {
  label: string;
  url: string;
}

/** Redes corporativas solo con URL real (nunca perfiles personales por sustitución). */
export function socialLinks(): SocialLink[] {
  const settings: Record<string, string | null> = site.publicSettings;
  const candidates: { label: string; url: string | null }[] = [
    { label: "LinkedIn", url: settings.linkedinCompanyUrl },
    { label: "Instagram", url: settings.instagramUrl },
    { label: "GitHub", url: settings.githubUrl },
  ];
  return candidates.filter((x): x is SocialLink => Boolean(x.url));
}

/** Correo o WhatsApp solo con datos validados; si faltan, «Hablemos» → /diagnostico. */
export function directContact(): { email: string | null; whatsapp: string | null } {
  const settings: Record<string, string | null> = site.publicSettings;
  return {
    email: settings.contactEmail,
    whatsapp: settings.whatsappE164,
  };
}

/** ¿Existe contenido de privacidad aprobado? Mientras no exista, no se enlaza ni se lista. */
export const PRIVACY_APPROVED = false;
