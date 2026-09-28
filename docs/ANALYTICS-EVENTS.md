# Eventos de analítica

PRODUCTION_READINESS_SPEC_V1 §23. Fuente de verdad de qué evento hace qué,
para no duplicar conversiones ni adivinar desde el código.

Todos los eventos pasan por `track()` en [`src/lib/analytics.ts`](../src/lib/analytics.ts),
que filtra claves con forma de PII (`email`, `phone`, `message`, `name`, `query`,
`querystring`) antes de reenviar nada. **PII permitida: siempre NO.**

Destino `GA4 (GTM)` = se reenvía a `window.dataLayer` (etiqueta `GA4 - Config`
en el contenedor `GTM-TK2JXVKX`, solo cuando `NEXT_PUBLIC_GTM_ID` está
configurado y no es development/preview). Destino `legacy` = se sigue
registrando (compatibilidad, `console.debug` en desarrollo) pero no se
reenvía, para no duplicar el funnel canónico.

## Funnel canónico (§19)

```
cta_clicked
  ↓
nayra_opened          [cuando corresponda]
  ↓
diagnostic_started
  ↓
diagnostic_service_selected
  ↓
diagnostic_step_completed
  ↓
diagnostic_submitted   ← Key Event de GA4
  ↓
calendar_viewed
  ↓
meeting_scheduled      [FUENTE AUTORITATIVA: backend/GHL — nunca el frontend]
```

## Tabla

| Evento                         | Disparador                                              | Propiedades                                               | Destino    | Key event |
| ------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------- | ---------- | --------- |
| `cta_clicked`                   | Cualquier CTA que abre Nayra o `/diagnostico`             | `source_page, source_section, source_cta, service, interest, plan, campaign, destination` | GA4 (GTM)  | No        |
| `nayra_opened`                  | El widget de Nayra abre de verdad (no el fallback)         | igual a `cta_clicked` (sin `destination`)                   | GA4 (GTM)  | No        |
| `diagnostic_started`            | Se monta `/diagnostico` con contexto resuelto              | `source_page, source_section, source_cta, service, interest, plan, campaign` | GA4 (GTM)  | No        |
| `diagnostic_service_selected`   | Se elige el servicio en el paso 1                          | igual + `service`                                            | GA4 (GTM)  | No        |
| `diagnostic_step_completed`     | Se completa cada paso del formulario                        | igual + `step`                                               | GA4 (GTM)  | No        |
| `diagnostic_submitted`          | POST `/api/leads` responde `201`/`200` (éxito real)         | igual a `diagnostic_started`                                  | GA4 (GTM)  | **Sí**    |
| `calendar_viewed`               | Se muestra la agenda embebida tras guardar el lead           | igual a `diagnostic_started`                                  | GA4 (GTM)  | No        |
| `meeting_scheduled`             | *(no se dispara desde el frontend)*                          | —                                                              | Backend/GHL (Booking Sync → Supabase) | No, es de negocio |
| `plan_interest`                 | Clic en un plan de Agentes o Web (precios)                  | `family, planId, priceState`                                  | GA4 (GTM)  | No        |
| `industry_open`                 | Se abre un rubro en el selector de `/rubros`                 | `industryId, originSection`                                   | GA4 (GTM)  | No        |
| `lead_form_view` (legacy)       | Formulario de contacto anterior a `/diagnostico`             | `solution?`                                                    | legacy     | No        |
| `lead_submit_success` (legacy)  | Envío exitoso, formulario anterior                            | `requestId`                                                     | legacy     | No        |
| `lead_submit_error` (legacy)    | Error de envío, formulario anterior                           | `requestId, reason`                                             | legacy     | No        |
| `lead_submit_result` (legacy)   | Resultado normalizado, formulario anterior                    | `result`                                                         | legacy     | No        |
| `booking_click` / `booking_open` (legacy) | Flujo de agenda anterior a la agenda embebida           | según evento                                                     | legacy     | No        |
| `contact_channel_click` (legacy)| Clic en correo/WhatsApp de contacto directo                   | `channel`                                                        | legacy     | No        |
| `case_view` (legacy)            | Vista de un caso (página anterior de proyectos)                 | `caseSlug`                                                       | legacy     | No        |
| `marketing_cta_click` (legacy)  | CTA genérico previo al sistema de CTA/Diagnóstico actual        | `routeId, sectionId, ctaId, destinationId`                        | legacy     | No        |
| `demo_scenario_select` / `demo_complete` (legacy) | Demos previas al rediseño por pantallas             | según evento                                                     | legacy     | No        |
| `diagnostic_step` (legacy)      | Paso de un diagnóstico previo al actual                          | `stepNumber, needId?, industryId?`                                | legacy     | No        |

## Consentimiento (§21)

Antes de que la persona decida, Consent Mode arranca en `denied` para
`analytics_storage`, `ad_storage`, `ad_user_data` y `ad_personalization`
(`src/components/marketing/analytics/Analytics.tsx`). Solo `analytics_storage`
puede pasar a `granted`, y solo cuando la persona acepta el banner
(`src/components/marketing/analytics/ConsentBanner.tsx`); los cuatro estados
publicitarios se mantienen `denied` en V1 (no hay tags de Meta/LinkedIn ni Ads).
La elección se guarda en `localStorage` (`al_consent`).

## Atribución de primera sesión (§22)

`src/lib/marketing/attribution.ts` captura, en la primera llegada de la
sesión, `utm_source/medium/campaign/content/term`, `landing_path` y
`referrer_host` (nunca la querystring ni el referrer completos) y los guarda
en `sessionStorage` (`al_attribution`). Al enviar `/api/diagnostico`, esos
campos viajan dentro de `diagnostic_data` (whitelist en
`src/app/api/leads/route.ts`) y quedan en Supabase junto al lead.
