# Material social — preparado, sin publicar

Estado: **contenido y exports listos para revisión; ninguna publicación realizada.** Nada de esta carpeta crea ni modifica cuentas — eso queda pendiente de que Christian entregue accesos (U08, `atacama-labs-spec/docs/USER-ACTIONS.md`).

001-launch-public-presence, tareas 3.1/3.2 (REQ-WEB-009/REQ-WEB-010).

## Qué hay aquí

- [`bios.md`](bios.md) — bios/descripciones para LinkedIn empresa, LinkedIn personal (Christian), Instagram, GitHub Org y GBP condicional.
- [`github-profile-README.md`](github-profile-README.md) — listo para copiar a `.github/profile/README.md` cuando exista la organización.
- `exports/` — PNG 1080×1350 de las seis piezas (C01–C06), generados de forma determinista vía `/api/studio/social-panel` (Next `ImageResponse`, no screenshot).
- `exports/banners/` — banner LinkedIn 1128×191.
- Avatar: reutiliza [`../public/brand/social-avatar-1024.png`](../public/brand/social-avatar-1024.png) (ya exportado en 001/2.1).
- Copy completo (LinkedIn + Instagram + alt) por pieza y fuente editable: [`../src/lib/social-content.ts`](../src/lib/social-content.ts) — mismo texto que `atacama-labs-spec/content/SOCIAL-CONTENT.md`, transcrito sin cambios.
- Plantilla visual reutilizada (una sola, per SOCIAL-CONTENT.md — "no crear seis identidades"): [`../src/components/studio/SocialCard.tsx`](../src/components/studio/SocialCard.tsx).
- Preview interactivo en dev: `/studio/social/<slug>/<panel>` (noindex, excluido de sitemap/robots — no es contenido público).

## Piezas

| ID | Pieza | Paneles | Export |
| --- | --- | --- | --- |
| C01 | Presentación | 4 | `exports/presentacion/panel-1.png` … `panel-4.png` |
| C02 | Pedidos de almuerzos | 4 | `exports/pedidos-de-almuerzos/panel-1.png` … `panel-4.png` |
| C03 | Registro desde iPad | 3 | `exports/registro-ipad/panel-1.png` … `panel-3.png` |
| C04 | Antes de automatizar | 4 | `exports/antes-de-automatizar/panel-1.png` … `panel-4.png` |
| C05 | Demostración de 60s (video) | miniatura | `exports/recorrido-60s/miniatura.png`; guion completo en `atacama-labs-spec/content/VIDEO-60S.md` — **grabación final no incluida en este paquete**, se hace en implementación |
| C06 | Seguimiento comercial | 3 | `exports/seguimiento-comercial/panel-1.png` … `panel-3.png` |

## Pendiente antes de publicar cualquier pieza

- Revisión factual final de Christian sobre el copy (ya redactado, sin investigación estratégica adicional pendiente).
- URLs reales (web, dominio) — hoy son placeholders `<<< pendiente >>>` en `bios.md`/README de GitHub.
- Accesos a las cuentas (U08) para crear/editar perfiles — no se crea nada sin eso.
- Aprobación explícita por pieza antes de publicar (`execution/CONTENT-STATUS.md` en el paquete de specs es la fuente de estado).
