"use client";

/**
 * Atribución de primera sesión — PRODUCTION_READINESS_SPEC_V1 §22. Captura
 * utm_source/medium/campaign/content/term, landing_path y referrer_host en la
 * primera llegada, y los conserva en `sessionStorage` mientras la persona
 * navega antes de enviar el diagnóstico. Nunca la querystring completa ni el
 * referrer completo: solo estos campos, saneados.
 */

const STORAGE_KEY = "al_attribution";
const UTM_MAX = 120;

export interface Attribution {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  landing_path?: string;
  referrer_host?: string;
}

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;
/** Caracteres razonables para UTM: letras, números, espacios y `-_./`. */
const SAFE_TEXT = /^[a-zA-Z0-9\-_./ ]+$/;

function cleanUtm(value: string | null): string | undefined {
  if (!value) return undefined;
  const v = value.trim().slice(0, UTM_MAX);
  return v && SAFE_TEXT.test(v) ? v : undefined;
}

function cleanPath(pathname: string): string | undefined {
  // Ruta interna limpia: sin querystring ni hash, acotada.
  const v = pathname.split("?")[0].split("#")[0].slice(0, 200);
  return v && /^\/[a-zA-Z0-9\-_/]*$/.test(v) ? v : undefined;
}

function cleanReferrerHost(referrer: string): string | undefined {
  if (!referrer) return undefined;
  try {
    const host = new URL(referrer).hostname;
    return host && host !== window.location.hostname ? host.slice(0, 120) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Llamar una vez por sesión (montaje del layout raíz). Si ya existe atribución
 * guardada en `sessionStorage`, no la sobrescribe: se conserva la primera
 * llegada de la sesión, no la última página vista.
 */
export function captureAttribution(): void {
  try {
    if (sessionStorage.getItem(STORAGE_KEY)) return;

    const params = new URLSearchParams(window.location.search);
    const attribution: Attribution = {};
    for (const key of UTM_KEYS) {
      const value = cleanUtm(params.get(key));
      if (value) attribution[key] = value;
    }
    const path = cleanPath(window.location.pathname);
    if (path) attribution.landing_path = path;
    const referrerHost = cleanReferrerHost(document.referrer);
    if (referrerHost) attribution.referrer_host = referrerHost;

    if (Object.keys(attribution).length > 0) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(attribution));
    }
  } catch {
    // sessionStorage no disponible (modo privado, etc.): sin atribución, no rompe nada.
  }
}

/** Lee la atribución de primera sesión ya guardada, si existe. */
export function getAttribution(): Attribution {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Attribution) : {};
  } catch {
    return {};
  }
}
