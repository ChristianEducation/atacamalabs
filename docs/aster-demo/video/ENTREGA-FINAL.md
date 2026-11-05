# ENTREGA FINAL · Landing `/aster` y video «De lo que ocurre en terreno a una acción real»
5-nov-2026 · rama `feat/aster-demo-documents-2026` (commits locales; sin push a `main`, sin publicar).

## 1. Qué quedó (estado honesto)
| Entregable | Estado |
|---|---|
| Landing `/aster` rediseñada con el sistema de atacamalabs.cl (tokens, Newsreader + DM Sans, botones `mk-btn`) | **Terminado y verificado** en navegador a 375/390/768/1440 px (ver §6) |
| Video principal 9:16, 43,5 s, sin audio, MP4 reproducible | **Terminado y verificado** (fotogramas del máster revisados; ver §5) |
| Versión web del video (720×1280, 3,6 MB) integrada en la landing | **Terminado y verificado** |
| Loop ambiental 8,5 s (644 KB) + pósters, integrados en el hero | **Terminado y verificado** (primer y último fotograma coinciden: diferencia media 3,6/255) |
| Versión 16:9 | **Implementado**: la pieza vertical centrada sobre su propio fondo desenfocado; no es un montaje horizontal nativo |
| `next build --webpack` del sitio completo | **Terminado y verificado**: compila y `/aster` queda prerenderizada como estática (con Turbopack el enlace de `node_modules` de este worktree falla; no afecta a la rama principal) |
| Prueba del botón en un teléfono real (que abra el chat del agente correcto) | **Pendiente de ti** (no puedo abrir WhatsApp desde aquí) |
| Música / audio | **No incluido**: no hay una fuente con derechos comerciales verificados. La pieza se entiende sin sonido |

## 2. Rutas de los entregables
- **Landing:** `src/app/aster/{page.tsx,AsterClient.tsx,aster.css}`, `src/content/aster.json`, `public/aster/**`.
- **Videos (máster, fuera de git por peso):** `C:\Users\alain\ATACAMA-LABS-SPEC-DRIVEN-v1.0\video-studio\atacama-video\out\aster\` y copia en `D:\ATACAMA-ASTER-ENTREGABLES\`:
  `aster-9x16-master.mp4` (21 MB, 1080×1920), `aster-16x9-master.mp4` (1920×1080), `aster-demo-9x16-web.mp4`, `aster-hero-loop.mp4`, `poster-hero.jpg`, `poster-video.jpg`.
- **Código del video:** `videos/aster-remotion/` (composición Remotion + README para re-renderizar).
- **Capturas:** `docs/aster-demo/video/capturas/aster-{375,390,768,1440}.jpg` y hojas `sheet-*.jpg`.

## 3. Inventario de herramientas (comprobadas, no supuestas)
| Herramienta | Qué produce | Estado | Uso en esta producción | Costo |
|---|---|---|---|---|
| Higgsfield CLI 1.1.26 + MCP (`balance` 305,55 → 243,05) | Imágenes y video con IA | **Operativa** | Fotogramas clave + 5 planos animados | Créditos (ver §4) |
| `nano_banana_pro` | Imagen 9:16 fotográfica | Operativa (2 cr) | 5 fotogramas clave | 2 cr c/u |
| `kling3_0` (modo pro, sin sonido, 9:16) | Imagen→video 5–8 s | Operativa (8 s = 14 cr; 6 s = 10,5; 5 s = 8,75) | Animación de los 5 planos | ver §4 |
| Remotion 4.0.484 (`video-studio/atacama-video`) | Motion graphics y montaje programático | **Operativa** (render de 1305 fotogramas en ~1m50) | Textos, onda de audio, tarjeta del agente, PDF real, diagrama, cierre | Gratis (licencia ≤3 empleados) |
| FFmpeg 8.1.2 | Transcodificación, bucle, fotogramas | **Operativa** | Versión web, loop, pósters, extracción de fotogramas | Gratis |
| Playwright + Chrome | Capturas y comprobaciones de la landing | **Operativa** | Capturas 375/390/768/1440, consola, desborde | Gratis |
| Blender 5.2.3 (video-lab) | CGI | Disponible, **no usado** | Descartado: la dirección pide fotografía, no 3D | — |
| Skill `video-shotcraft` | Metodología de promos | Leída | Se aplicaron sus principios (tokens del sitio, sostener los textos, render determinista, revisión) | — |
| Skills HyperFrames / Remotion / motion-graphics | Alternativas de producción | Listadas, **no necesarias** | Se prefirió una combinación pequeña (Higgsfield + Remotion + FFmpeg) | — |
| Música con IA / bancos de audio | Banda sonora | **No usada** | Sin licencia comercial verificable | — |

## 4. Higgsfield: generaciones y créditos (límite autorizado: 100)
Saldo inicial 305,55 · saldo final **243,05** (verificado con `balance`) · **consumido 62,5 · reservado sin usar 37,5**. No hubo intentos fallidos.

| # | Operación | Créditos |
|---|---|---|
| 1–5 | `nano_banana_pro` 9:16 — fotogramas clave p1 territorio, p2 mantenimiento, p3 logística, p4 operador, p5 control | 5 × 2 = **10** |
| 6 | `kling3_0` pro 8 s — p1 «deriva lenta sobre las colinas hacia la planta» | 14 |
| 7 | `kling3_0` pro 6 s — p2 «cámara en mano acercándose al técnico» | 10,5 |
| 8 | `kling3_0` pro 5 s — p3 «travelling lateral de camiones» | 8,75 |
| 9 | `kling3_0` pro 6 s — p4 «acercamiento lento al operador hablando al teléfono» | 10,5 |
| 10 | `kling3_0` pro 5 s — p5 «dolly hacia los operadores en sala de control» | 8,75 |
| | **Total** | **62,5** |

Estilo común de los prompts: «photorealistic documentary cinematography, 35mm lens, natural light, muted realistic color grading, no text, no logos, no brand marks, generic unmarked equipment». Sin marcas, sin texto legible, sin instalación identificable. (Las pruebas 3D de antes —32 créditos— fueron una exploración previa fuera de esta producción y se descartaron.)

## 5. Video: cómo se hizo y revisión
**Estructura (43,5 s):** territorio (6,3 s) → operaciones: inspecciones / mantenimiento / operaciones / control (≈10 s) → un audio de terreno con onda y transcripción, datos resaltados (6 s) → «Entiende. Organiza. Ejecuta.» con la tarjeta del agente (7 s) → «Un audio. Un documento. Una acción real.» con el **PDF real** y su entrega por WhatsApp (6 s) → «Conectado a tus sistemas»: **hoy en la demostración** (WhatsApp, Drive) frente a **posible en tu empresa** (líneas discontinuas: ERP, CRM, Mantenimiento, Correo y agenda, Inventario) (5 s) → logo oficial y «Tecnología para el trabajo real» (4,3 s).
**Reglas cumplidas:** textos compuestos por código (nada de texto generado por IA); logos oficiales idénticos a `public/brand/`; PDF real del workflow; ninguna marca ajena; integraciones hipotéticas rotuladas «posible».

**Registro de revisiones**
| Ciclo | Hallazgos | Corrección |
|---|---|---|
| 1 (borrador a media resolución) | Rótulos pequeños casi ilegibles sobre el cielo claro · el recuadro de WhatsApp tapaba el pie del PDF · tarjeta del agente cargada hacia arriba · los datos no se «organizaban» sobre el audio | Rótulos blancos con sombra y degradado superior más firme · PDF más pequeño y recuadro más abajo · tarjeta centrada y plano de fondo visible · palabras clave (BP204, ruido, extraño, supervisor) se resaltan en azul sobre la transcripción |
| 2 | La etiqueta «Agente Atacama Labs» chocaba con «Posible en tu empresa» y las líneas | Etiqueta con fondo propio y reubicada; verificado en fotograma 38,8 s |
| 3 (máster a resolución completa) | Sin defectos críticos nuevos | — |

**Evaluación crítica (revisión mía, sin auditoría externa):**
| Criterio | Nota | Evidencia / defecto |
|---|---|---|
| Coherencia con la marca | 9 | Mismas fuentes, azules y logos que atacamalabs.cl |
| Claridad de la demostración | 9 | Se entiende sin sonido; hoy/posible bien separados |
| Calidad cinematográfica | 8,5 | Planos con movimiento creíble; falta música y diseño sonoro |
| Credibilidad industrial | 8,5 | Equipos y EPP verosímiles; rostros y manos con leve aspecto de IA en p4 |
| Fotografía y composición | 8,5–9 | Luz natural coherente entre planos |
| Legibilidad móvil | 9 | Titulares ≥70 px, rótulos ≥24 px a 1080 de ancho |
| Transiciones y montaje | 8,5 | Fundidos de 8 fotogramas, ritmo parejo; la apertura (primer segundo) es contemplativa |
| Versión 16:9 | 7 | Es una versión «columna vertical» sobre fondo desenfocado, no un montaje horizontal |
No alcanza 9 en todo: lo que falta para 9+ es banda sonora con licencia, planos reales autorizados y una versión horizontal nativa.

## 6. Landing: pruebas y revisión
Capturas reales en 375, 390, 768 y 1440 px (Chrome, con desplazamiento para cargar imágenes diferidas):
| Ancho | Desborde horizontal | Imágenes rotas | Errores de consola | Solicitudes fallidas | CTA | Loop |
|---|---|---|---|---|---|---|
| 375 / 390 / 768 / 1440 | 0 px en los cuatro | ninguna | ninguno | ninguna | `https://wa.me/56936108103` (sin `?text=`) | se reproduce |
Fuentes cargadas: Newsreader y DM Sans (las del sitio). `eslint` y `tsc` sin errores en `src/app/aster`.
Revisión: (1) la primera captura mostraba el PDF en blanco → era carga diferida; con desplazamiento carga bien; (2) en escritorio la columna «Hoy, en esta demostración» quedaba corta frente a la de «Posible» → se agregó la nota «Esto ocurre de verdad cuando envías tu audio».
**No medido:** Lighthouse, axe y pruebas con lector de pantalla.

**Estructura:** Hero (CTA + loop) · Video 43 s · Cómo funciona (3 pasos) · Nuestro documento corporativo real (PDF de ejemplo descargable) · Posibilidades de integración (hoy vs posible) · CTA final. Funciona sin video (muestra el póster) y respeta «reducir movimiento». No usa Nayra ni el widget de Lety (la ruta está fuera del shell del sitio).
Se agregó la línea «Escenas recreadas con herramientas de IA; no corresponden a una instalación específica.» bajo el video (honestidad sobre el origen de las imágenes).

## 7. Pendientes que requieren tu decisión
1. **Probar el botón en un teléfono:** que `wa.me/56936108103` abra el agente correcto (el número lo diste tú; no puedo verificar que sea el de Lety).
2. **Publicar:** no se hizo push a `main` ni deploy. Para el QR hace falta una URL HTTPS publicada y probada en iPhone y Android.
3. **Música:** ¿buscamos una pista con licencia comercial verificable o se queda sin sonido?
4. **Material real:** si quieres planos reales de Antofagasta, hay que pedir autorización escrita (Codelco prohíbe uso comercial; ver `SELECCION-VISUAL.md`).
5. **Leyenda de origen IA:** la dejé bajo el video; dime si prefieres otra redacción o quitarla.
