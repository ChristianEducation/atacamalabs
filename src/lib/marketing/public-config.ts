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

/** Agenda real (M3): solo con URL https validada; si no existe, no se muestra calendario alguno. */
export function bookingUrl(): string | null {
  const settings: Record<string, string | null> = site.publicSettings;
  const url = settings.bookingUrl;
  if (!url) return null;
  try {
    return new URL(url).protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

/**
 * Agente real de Atacama, operado en Lety (V3.0 §6). Sin snippet/credenciales
 * todavía: `agentWidgetReady()` queda en false y el CTA usa el fallback
 * aprobado por el spec §3.1 («Agendar diagnóstico» → /diagnostico). Nunca se
 * simula un chat ni se fabrica un widget — cuando exista el embed real, esta
 * función pasa a true y `agentCta()` cambia a «Habla con nuestro agente»
 * apuntando al panel/modal real, sin tocar los lugares que la consumen.
 */
export function agentWidgetReady(): boolean {
  return false;
}

export function agentCta(): { label: string; href: string } {
  if (agentWidgetReady()) return { label: "Habla con nuestro agente", href: "/diagnostico" };
  return { label: "Agendar diagnóstico", href: "/diagnostico" };
}
