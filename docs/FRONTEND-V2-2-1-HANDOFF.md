# Frontend V2.2.1 — handoff (T24)

Branch: `feat/frontend-v2-2-1` (local, sin push). Fuente única: `ATACAMA_LABS_FRONTEND_SPEC_V2_2_1.zip`.

## Entregado

Rutas (todas 200, un `<h1>` por página, sin overflow horizontal a 320/390/768/1024/1200/1440):
`/`, `/agentes`, `/comercial`, `/cobranza`, `/administrativo-financiero`, `/a-medida`, `/paginas-web`,
`/plataforma`, `/rubros`, `/rubros/{educacion,salud,inmobiliarias,gimnasios,retail-ecommerce,servicios-profesionales,servicios-b2b}`,
`/nosotros`, `/precios`, `/diagnostico`, 404 y error boundary.

- Home: F1 (rotor + demo de agente) y F3 con exactamente seis servicios, cada uno con copy, CTA y microdemo propios.
- Todo el producto visual es código (React/HTML/CSS/SVG); no hay screenshots ni imágenes de interfaces.
- Motion: coordinador único de demos, funciones puras del tiempo, pausa/repetir/resultado, `prefers-reduced-motion`.
- Contacto: `POST /api/leads` sin cambios de contrato. Rubro, plan y capacidad viajan como prefijo legible del mensaje
  (`src/lib/marketing/lead-adapter.ts`). Idempotencia, honeypot y rate limit preservados.
- Redirecciones 308 (B3) en `next.config.ts`; `sitemap.ts` lista solo rutas implementadas; OG e íconos generados en código.
- Legacy eliminado (páginas, componentes, `globals.css`); se conservan API, contratos, `content/*.json`, studio.

## Verificación

`npx tsc --noEmit`, `npm run lint` (0 errores) y `npm run build` limpios. No existe suite de tests en el repo.
Formulario probado con `fetch` interceptado (sin leads reales): preselección por query, un solo request ante doble click,
cuerpo conforme al contrato.

## Pendientes de gate (no bloquean el preview)

| ID | Tema | Estado actual en el frontend |
| --- | --- | --- |
| FV-U01/U02 | Precios | Todos `null` → «Consultar»; referencia interna ecommerce no se serializa |
| FV-U03 | Integraciones verificadas | Marquee con etiquetas neutras en preview; texto alternativo en público |
| — | Emisso | Candidata pendiente de validación; sin logo ni «partner» |
| — | Privacidad | `/privacidad` no existe (`PRIVACY_APPROVED=false`); el formulario no enlaza |
| — | Dominio canónico | Sin `canonicalOrigin` el sitio sale `noindex` |
| FV-U07 | Acceso clientes | Solo con URL https validada en `agents-offer.json` |
| — | Agenda real | `bookingUrl` null → estado «no configurada» en `/diagnostico#agenda` |
| R3.2 | Capacidades de plataforma (Lety) | `pending`; caption ilustrativa visible |

## Limitaciones conocidas

- La imagen OG usa la tipografía por defecto de `next/og` (los WOFF2 de Newsreader no son compatibles con satori).
- El H1 de `/rubros` corrige la errata del spec «Distintas rubros» → «Distintos rubros».
- Los textos de microUI sin guion en el spec (etapas de recordatorio, chat de excepción en `/cobranza`, categorías del hub de
  `/agentes`) usan redacción neutra mínima; revisar contra la línea editorial.
- QA de reduced-motion y teclado revisada por código; falta una pasada manual con lector de pantalla.

## Siguiente tarea

Pasada visual manual a 1440/390 con Christian, cierre de gates FV-U*, y luego decidir push/preview.

## Actualización: identidad visual y auditoría de aceptación (S2)

**Identidad** (`Identidad visual AtacamaLabs.zip`, fuente de verdad de marca): logos oficiales en `public/brand/`
(header, footer, favicon, apple-icon y OG los usan). Colores alineados: azul `#0F5CED`, tinta `#121A2B`, fondo oscuro `#041228`
(sustituyen `#0767F2`, `#121212`, `#111923` del spec). El zip **no incluye tipografía**: se mantiene Newsreader + DM Sans del spec.
El README de marca dice «sin tagline oficial»; el footer conserva la línea del spec N2 (a decidir).

**Medido**
- AC-43 enlaces: 442 enlaces internos/anclas revisados, todos válidos (se corrigieron los anclas `#software/#flujos` de A Medida).
- AC-33 overflow: sin scroll horizontal a 320/390/768/1024/1200/1440 (1920 pendiente).
- AC-32 targets: nav y controles ≥44 px; skip link presente; un `<h1>` por página.
- AC-35 sin JS: H1, CTA y precios llegan en el HTML.
- Q1 fuentes: DM Sans + Newsreader roman + cursiva ≈ 159 KiB (objetivo ≤180). JS: Home ≈ 213 KiB gz totales, de los cuales ≈ 195 KiB
  son framework (`/precios` sin islas) → propio ≈ 20–30 KiB (objetivo ≤80).
- AC-46 Home = 7 bloques (F1, F2, F3, F10, F7, F11, F9). AC-05/AC-52/AC-37 verificados por código y rutas.

**Pendiente de evidencia (no medido aún)**
Lighthouse móvil (3 corridas), 1920 px, zoom 200/400 %, reduced-motion en vivo (AC-31), teclado de menú/dropdowns (AC-06),
timers fuera de viewport (AC-29/30), pruebas 409/429/503 del formulario con red interceptada (AC-25), pasada con lector de pantalla,
comparación lado a lado con referencias (AC-45) y gates COMMERCIAL_READY (precios, integraciones, privacidad, dominio, agenda).
