"use client";

import { useEffect } from "react";
import Script from "next/script";
import { analyticsEnabled, gtmId, CONSENT_STORAGE_KEY } from "@/lib/marketing/gtm";
import { captureAttribution } from "@/lib/marketing/attribution";
import { ConsentBanner } from "./ConsentBanner";

/**
 * GTM + Consent Mode + atribución — PRODUCTION_READINESS_SPEC_V1 §18, §21, §22.
 * No se monta nada (ni el banner) cuando `NEXT_PUBLIC_GTM_ID` no está
 * configurado o estamos en development/preview/tests: `analyticsEnabled` ya
 * lo resuelve. La atribución de primera sesión se captura siempre — es un
 * dato funcional propio, no depende de GTM ni de la decisión de consentimiento.
 */
export function Analytics() {
  useEffect(() => {
    captureAttribution();
  }, []);

  if (!analyticsEnabled) return null;
  const id = gtmId();
  if (!id) return null;

  return (
    <>
      {/* Consent Mode por defecto: denegado hasta que la persona decida (§21.2).
          Antes del contenedor de GTM para que sus etiquetas respeten el estado inicial.
          eslint-disable-next-line: la regla de eslint-config-next todavía solo reconoce
          pages/_document.js; Next 16 App Router documenta beforeInteractive en el root
          layout (app/layout.tsx, que es donde vive este componente) como el uso correcto. */}
      {/* eslint-disable-next-line @next/next/no-before-interactive-script-outside-document */}
      <Script id="consent-default" strategy="beforeInteractive">
        {`
window.dataLayer = window.dataLayer || [];
window.gtag = window.gtag || function(){ window.dataLayer.push(arguments); };
gtag('consent', 'default', {
  analytics_storage: 'denied',
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied'
});
try {
  if (localStorage.getItem('${CONSENT_STORAGE_KEY}') === 'granted') {
    gtag('consent', 'update', { analytics_storage: 'granted' });
  }
} catch (e) {}
`}
      </Script>
      <Script id="gtm-base" strategy="afterInteractive">
        {`
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${id}');
`}
      </Script>
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${id}`}
          height="0"
          width="0"
          style={{ display: "none", visibility: "hidden" }}
          title="Google Tag Manager"
        />
      </noscript>
      <ConsentBanner />
    </>
  );
}
