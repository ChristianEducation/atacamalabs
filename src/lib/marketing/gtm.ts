/**
 * Google Tag Manager — PRODUCTION_READINESS_SPEC_V1 §18.1. El ID vive en
 * `NEXT_PUBLIC_GTM_ID` (nunca hardcodeado). No cargar en development, Vercel
 * preview ni tests E2E: usamos `NEXT_PUBLIC_VERCEL_ENV` (expuesto por Vercel
 * al cliente) porque `NODE_ENV` ya vale "production" en los builds de preview.
 */
export function gtmId(): string | null {
  const id = process.env.NEXT_PUBLIC_GTM_ID;
  return id && id.trim() ? id.trim() : null;
}

export const analyticsEnabled =
  Boolean(gtmId()) &&
  process.env.NODE_ENV === "production" &&
  process.env.NEXT_PUBLIC_VERCEL_ENV !== "preview" &&
  process.env.NEXT_PUBLIC_VERCEL_ENV !== "development";

export const CONSENT_STORAGE_KEY = "al_consent";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/** §21.2 — actualiza Consent Mode cuando la persona acepta analítica. */
export function grantAnalyticsConsent(): void {
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || ((...args: unknown[]) => window.dataLayer!.push(args));
  window.gtag("consent", "update", { analytics_storage: "granted" });
}
