"use client";

import { useEffect, useState } from "react";
import { CONSENT_STORAGE_KEY, grantAnalyticsConsent } from "@/lib/marketing/gtm";

/**
 * Banner de consentimiento — PRODUCTION_READINESS_SPEC_V1 §21.3. Mínimo, no
 * bloqueante (no modal), con «Aceptar analítica» / «Solo necesarias» y link a
 * Privacidad. La elección se guarda en `localStorage`: no vuelve a preguntar.
 */
export function ConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => {
      try {
        if (!localStorage.getItem(CONSENT_STORAGE_KEY)) setVisible(true);
      } catch {
        // localStorage no disponible: no insistimos con el banner.
      }
    }, 0);
    return () => clearTimeout(id);
  }, []);

  function choose(value: "granted" | "denied") {
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, value);
    } catch {
      /* sin persistencia: la sesión seguirá preguntando, no rompe nada. */
    }
    if (value === "granted") grantAnalyticsConsent();
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="mk-consent" role="region" aria-label="Preferencias de analítica">
      <p className="mk-consent__text">
        Usamos analítica para entender qué funciona en el sitio y mejorarlo. Puedes aceptar o continuar solo con lo
        necesario.
      </p>
      <div className="mk-consent__actions">
        <a href="/privacidad" className="mk-consent__link">
          Privacidad
        </a>
        <button type="button" className="mk-consent__btn mk-consent__btn--ghost" onClick={() => choose("denied")}>
          Solo necesarias
        </button>
        <button type="button" className="mk-consent__btn mk-consent__btn--primary" onClick={() => choose("granted")}>
          Aceptar analítica
        </button>
      </div>
    </div>
  );
}
