# Refinamiento editorial de Home · 2026-09-17

Rama `codex/home-editorial-refinement`, sobre `556d2ed`. Segunda pasada solicitada por el usuario mediante el texto adjunto y la primera referencia. Se conserva la Home construida, identidad, tipografías, paleta, fotografía principal, oferta, precios y contratos.

## Resultado y comparación visual

- Hero más abierto: ancho de lectura controlado, paisaje protagonista y credenciales existentes integradas al pie de su texto.
- Franja discreta de WhatsApp, Google Calendar, Google Sheets, Calendly y HubSpot. Estas cinco marcas ya están en `agents-offer.json`; no se agregaron capacidades comerciales. La franja identifica herramientas, no acredita una conexión probada ni una asociación con sus marcas.
- «Lo que hacemos»: mayor jerarquía del encabezado, más espacio interno, contornos topográficos finos, relieve fotográfico y diferentes recortes/intensidades. Agentes conserva su CTA principal y los otros portales sus accesos. Se mantienen los cuatro portales existentes; el apartado del adjunto sobre tres bloques se interpreta como una indicación de equilibrio visual, sin eliminar contenido.
- Proceso antes del caso, acercando el ritmo a la primera referencia. Cuatro etapas corporativas existentes, iconos nativos y más separación; en móvil, lectura vertical.
- Caso: separación de texto y figura, una composición con capas y símbolos de selección/pago/administración/cocina. Es el flujo real del caso publicado, claramente rotulado como esquema. No se inventó el dashboard de la referencia.
- Cierre con mayor presencia y aire, usando la fotografía existente.

Se inspeccionaron las capturas de página y de sección, cotejando jerarquía, espacios, proporciones, paisaje y contraste con ambas referencias. Se corrigieron un desbordamiento topográfico móvil, el contraste de la leyenda y la proporción de dos instancias del logo. La primera referencia orienta la composición; se conserva el contenido comercial revisado de 006 y la estructura de cuatro portales existente. No se afirma una reproducción exacta ni se sustituye la revisión visual del usuario por pruebas automáticas.

## Assets y autenticidad

Nuevo asset `public/visual/home/desert-relief-editorial.webp`: 1400 × 933, 80.732 bytes. Generación con herramienta integrada `image_gen`; original 1536 × 1024, reducido sin ampliación. Paisaje ilustrativo inspirado en el norte de Chile; no se presenta como fotografía documental de un lugar o cliente. Prompt completo y hashes: [asset-provenance.json](asset-provenance.json).

SVG de las cinco marcas: snapshots del repositorio Simple Icons, sin redibujar ni generar logos; presentación monocroma mediante CSS. URLs y hashes en el registro, licencia de distribución CC0 conservada en `public/visual/integrations/LICENSE.md`. El logo de Atacama permanece intacto. Iconos de proceso y contornos topográficos son SVG nativos.

Las capturas A10/A17 auténticas siguen pendientes en [USER-ACTIONS](../../docs/USER-ACTIONS.md). Los esquemas permanecen rotulados como tales. No se conectaron integraciones externas ni se generaron supuestas capturas reales.

## Comprobaciones finales

- `npm run build`: PASS, 47 páginas generadas; TypeScript sin errores.
- `npm run lint`: PASS, sin warnings.
- QA existente sobre producción local: 17 rutas × 1920/1440/1366/768/390/320 = 102 combinaciones PASS. Un H1, fuente editorial, sin desbordamiento; teclado/menú/Escape/redimensionado, alias, planes, preselección, demo pendiente y regresión Studio.
- Inspección adicional de Home a 1024 px; imágenes cargadas y sin desbordamiento en seis tamaños. Capturas finales de secciones a 1440/390 px, sin indicadores de desarrollo.
- Lighthouse móvil simulado: tres ejecuciones sobre la compilación final; mediana rendimiento **90**, accesibilidad **100**, CLS **0**, LCP **3,685 s**. Cumple los umbrales de puntuación; **no cumple LCP ≤ 2,5 s**. Datos de laboratorio, no medición de usuarios reales.
- `git diff` de API, helpers/servicios, contenido comercial y dependencias: vacío. Cero envíos reales de leads. No publicación, push ni cambios de backend.

Capturas principales: [escritorio](home-1440-after.png), [móvil](home-390-after.png), [soluciones](home-solutions-1440.png), [caso](home-featured-1440.png). Resultados: [QA](qa-results.json), [Lighthouse](lighthouse-results.json), [auditoría HTML](lighthouse-home.html). El before de la pasada anterior permanece en `../visual-006/`.

## Preview

Preview de producción local en **http://127.0.0.1:3000/**. Para reiniciarlo, desde PowerShell:

```powershell
Set-Location 'C:\Users\alain\ATACAMA-LABS-SPEC-DRIVEN-v1.0\atacama-labs-app'
npm run build
node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3000
```

QA reproducible, conservando las evidencias de la primera implementación:

```powershell
$env:PREVIEW_URL = 'http://127.0.0.1:3000'
$env:EVIDENCE_DIR = 'evidence/home-refinement'
$env:CAPTURE_HOME_ONLY = '1'
node scripts/qa-006.mjs
$env:QA_ROUTES = '/'
node scripts/lighthouse-006.mjs
```

Lighthouse usa el runtime temporal ya instalado en `.tmp/lighthouse`; las instrucciones del QA no agregan dependencias al producto.

## Pendientes reales

Se mantienen V006-U01–U07: widget, portal, capturas auténticas, condiciones comerciales y verificación del catálogo. No se alteraron estos gates ni se reanudaron los cambios operativos 003/004/005. Continúan pendientes la revisión visual del usuario y la optimización del LCP de laboratorio. No hay inputs nuevos exigidos para usar este preview.
