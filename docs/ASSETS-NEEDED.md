# Assets necesarios — dirección visual Halo

Generado 2026-09-17, Fase 1. Ver mapa completo en `atacama-labs-spec/execution/HALO-FASE0-MAP.md`. Ningún asset final se inventa por código — los pendientes usan un placeholder local estable en la ruta exacta que espera el componente, listo para reemplazo sin tocar código.

## Listos (ya en el repo)

| Archivo | Ruta | Página/sección | Origen |
| --- | --- | --- | --- |
| Logo horizontal (claro/oscuro), mark, stacked | `public/brand/*.svg` | Global · header/footer | Brand kit existente |
| Manrope + Inter (woff2/ttf) | `public/fonts/{manrope,inter}.*` | Global · tipografía | Brand kit existente |
| Foto hero (desktop/mobile) | `public/visual/home/hero-atacama-{wide,mobile}.webp` | Home · Hero (poster mientras no exista el video) | 006, reutilizado como placeholder |
| WhatsApp | `public/visual/integrations/whatsapp.svg` | Home · Marquee integraciones | Simple Icons (CC0), preexistente |
| Google Calendar | `public/visual/integrations/googlecalendar.svg` | Home · Marquee integraciones | Simple Icons (CC0), preexistente |
| Google Sheets | `public/visual/integrations/googlesheets.svg` | Home · Marquee integraciones | Simple Icons (CC0), preexistente |
| HubSpot | `public/visual/integrations/hubspot.svg` | Home · Marquee integraciones | Simple Icons (CC0), preexistente |
| Calendly | `public/visual/integrations/calendly.svg` | Home · Marquee integraciones | Simple Icons (CC0), preexistente |
| Gmail | `public/visual/integrations/gmail.svg` | Home · Marquee integraciones | Simple Icons (CC0), agregado Fase 1 |
| Slack | `public/visual/integrations/slack.svg` | Home · Marquee integraciones | Simple Icons (CC0), agregado Fase 1 |
| Notion | `public/visual/integrations/notion.svg` | Home · Marquee integraciones | Simple Icons (CC0), agregado Fase 1 |
| Salesforce | `public/visual/integrations/salesforce.svg` | Home · Marquee integraciones | Simple Icons (CC0), agregado Fase 1 |
| Instagram | `public/visual/integrations/instagram.svg` | Home · Marquee integraciones | Simple Icons (CC0), agregado Fase 1 |

Atribución de los íconos de integración en `public/visual/integrations/LICENSE.md` (CC0 1.0, Simple Icons).

## Pendientes — assets finales por generar/proveer

| Archivo | Ruta destino | Página/sección | Proporción | Resolución sugerida | Descripción | Estado |
| --- | --- | --- | --- | --- | --- | --- |
| `hero-hyperlapse-desktop.mp4` | `public/visual/home/hero-hyperlapse-desktop.mp4` | Home · Hero | 16:9, panel `rounded-2xl` con margen de página | 1920×1080, H.264, ≤10 Mbps | Hyperlapse real de Atacama Labs/desierto/ciudad | ⏳ Pendiente — hoy el `<video>` referencia esta ruta, falla a cargar (404 esperado) y el navegador muestra `poster` (foto real existente) |
| `hero-hyperlapse-mobile.mp4` | `public/visual/home/hero-hyperlapse-mobile.mp4` | Home · Hero (mobile) | 9:16 o 4:5 | 1080×1920, archivo liviano | Recorte/versión mobile del mismo hyperlapse | ⏳ Pendiente, mismo comportamiento de fallback |
| `meet-agentes.webp` | `public/visual/home/meet-agentes.webp` | Home · Bloque "Meet Atacama Labs" (Fase 2), card grande | ~4:3 apaisado | 1600×1200 | Foto que ilustre "Agentes" | ⏳ Pendiente (no bloquea Fase 1) |
| `use-modes.mp4` | `public/visual/home/use-modes.mp4` | Home · "Use modes" (Fase 2) | vertical, panel alto | 1080×1350 aprox. | Video autoplay/loop de un proceso real (ej. atención por WhatsApp) | ⏳ Pendiente (no bloquea Fase 1) |

## Notas de implementación (Fase 1)

- El `<video>` del hero (`src/components/halo/HeroVideo.tsx`) respeta `prefers-reduced-motion`: antes de confirmar la preferencia real del navegador se muestra solo `poster`; si el usuario prefiere movimiento reducido, nunca se intenta cargar ni reproducir el video.
- Con los `.mp4` todavía inexistentes, la carga falla limpio (404) y el navegador retiene `poster` — comportamiento esperado, no es un bug. Verificado en consola: exactamente 2 404 por cada carga de Home (`hero-hyperlapse-desktop.mp4`, `hero-hyperlapse-mobile.mp4`), ninguno en el resto del sitio.
- Cuando lleguen los `.mp4` finales, van directo a esas rutas — cero cambios de código.
