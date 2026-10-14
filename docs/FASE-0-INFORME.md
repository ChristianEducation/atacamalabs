# Fase 0 — Informe de verificaciones (14-oct-2026)

Spec: `SPEC-ATACAMA-OS-V3-TALLER-Y-CORREO.md` §13 Fase 0. Todo lo de abajo fue **solo lectura**, salvo una prueba de visión de Hermes con una imagen temporal (borrada). Nada se creó en GHL, Supabase ni n8n.

| # | Verificación | Resultado |
|---|---|---|
| 1 | Carrusel creado ya programado/aprobado en GHL (decide A/B/C) | **Pendiente: requiere crear un post TEST en GHL (pedir «sí»).** Dato real ya visto: el carrusel de Flows salió publicado en Instagram el mar 13-oct 16:31 Chile con **5 imágenes** (post `6ace86ba54bf3b1e02f09771`, padre `6ace82964a324b05a9732580`, creado desde el compositor de GHL a las 16:12 Chile); el post `6ace80297ad751f690ee25e2` quedó borrado/rechazado ese mismo día. O sea: aprobar desde la interfaz de GHL conserva las 5; por API sigue sin probar. |
| 2 | LinkedIn vía GHL | Cuentas activas: página «Atacama Labs» y perfil «Christian Wevar» (conexiones vencen 11-dic-2026; Instagram 12-dic-2026). Historial real: página = solo texto (5 publicados); perfil = texto (3) y texto + 1 imagen (1). **PDF/documento-carrusel nunca probado** (`postAsPdf` siempre falso) → requiere post TEST. Límite de LinkedIn: 3.000 caracteres (regla de la plataforma, no probado en GHL). |
| 3 | Filtro del calendario de GHL por cuenta | No verificado (es de la interfaz; informativo). Christian puede mirarlo en 10 s. |
| 4 | Supabase Storage para el bucket `taller` | Plan **Pro** (org «CasinoPaski»): 100 GB incluidos, archivos hasta 500 GB (límite global configurable). Hoy **no hay ningún bucket** en el proyecto; base de datos 29 MB. Sin problema de espacio. |
| 5 | Huella `hash16` (para S2) | `scripts/outreach/outreach-core.mjs:16-22`: doble FNV-1a de 16 hex sobre `correo_en_minúsculas ␁ asunto.trim() ␁ cuerpo.trim()`. Misma función copiada dentro de los workflows 21/22/23/24. El Sender (`:380`) **cancela** si no coincide (es lo que S3 cambia). Chequeo en vivo hoy: los 2 aprobados pendientes coinciden (28 enviados en las últimas 72 h, 1 respuesta recibida). |
| 6 | Formato de aviso de Telegram | Texto plano generado en n8n 25 (`alertsText`, `scripts/ops/ops-core.mjs:455`): «ATACAMA OS · N alertas» + viñetas «• CRÍTICO/IMPORTANTE/AVISO · título — detalle (sigue sin resolverse)» + enlace al panel si existe `ATACAMA_PANEL_URL`. Lo envía `atacama-alerts` (Hermes, cada 15 min, sin IA): si no hay texto, silencio. Sirve tal cual para los avisos nuevos. |
| 7 | Capacidad de la VPS | 2 CPU · 7,9 GB RAM, **4,1 GB disponibles**, sin swap · disco 36 GB libres · ffmpeg 7.1.5 · Node 26.5 · Chromium de Playwright (1243) · HyperFrames 0.8.150 · Pillow 12.3 en el Python de Hermes (no en el del sistema) · **faltan:** numpy, rembg (recorte de fondo) y tesseract (OCR). Concurrencia: 1 render a la vez (ya hay candado en el Media Worker). |
| 8 | ¿Hermes ve imágenes? | **Sí.** Modelo `gpt-5.6-luna` (openai-codex), toolset «vision» activo. Prueba real: leyó exacto «LLAMITA 4728 VERDE — fondo verde oscuro». No hace falta una llamada de visión aparte; además puede servir de OCR de respaldo. |
| 9 | Higgsfield en la VPS (sin generar) | Sesión OK. Saldo **1.052,74 créditos**; Atacama OS gastó 0/200 esta semana; máx. 40 por llamada, reserva 300. Ojo: el 13-oct había 1.493 → se usaron ~440 créditos fuera de la VPS (no sé en qué). |
| — | Reglas por red (§6.1) | `content_config` coincide con el spec: IG feed 5/sem a las 15:00, historias 3/día 10:00/14:00/18:00, LinkedIn 5 (4–6), máx. 1 por cuenta/día, `ig_engine_enabled=false`. |

## Prueba A (autorizada por Christian, 14-oct)
- 3 imágenes grises «TEST» subidas a la biblioteca de medios de GHL (fileId `6acf7ee85570abd132d882c4`, `6acf7ee93cd85e1fe33c2ab5`, `6acf7ee95570abd132d882e4`; siguen ahí).
- POST a Instagram con `status: scheduled` + `approvalStatus: approved`, fecha 5-dic-2026 12:00 Chile → GHL lo aceptó **directo como programado y aprobado, sin pasar por «en revisión»**; la respuesta traía **3 imágenes**.
- Lectura inmediata del mismo post (antes de tocarlo): **1 imagen**. Lo mismo pasa con el carrusel real de Flows: su registro «padre» muestra 1 imagen, pero en Instagram salieron las 5 (GHL crea un registro «hijo» por red recién al publicar). **Conclusión: la API no permite saber cuántas imágenes saldrán; no se puede decidir A/B/C solo con la API.**
- Rechazado al tiro: estado final `failed` + aprobación `rejected` (post `6acf7ef8865e22086bd6e5e6`), no se publicará.
- Siguiente paso posible (sin tocar nada): que Christian abra ese post TEST en GHL (5-dic) y mire cuántas imágenes muestra la vista previa.

## Decisión del puente (Christian, 14-oct)
Semana 19–24 con el flujo actual; ciclo nuevo desde el lunes 19 (programa la semana 26–31); Ideas con ficha operativas el lunes 19. Anotado en el spec §4 y §15-1.

## Decisiones que salen de aquí
- Crítica visual de carruseles (§6.5): usar a Hermes directamente.
- Fase 3 tendrá que instalar (en el contenedor) recorte de fondo y OCR, o usar la visión de Hermes como OCR.
- Bucket `taller` en Supabase Storage: viable, se crea en la Fase 1.
- A/B/C de «Programar» (§6.3): **se decide con la prueba TEST del punto 1**.

## Otros hallazgos (para Christian)
- Dos posts de la página de LinkedIn (jue 16 y vie 17, 10:00 Chile) están **en revisión** en GHL esperando su aprobación.
- Historias de hoy (14-oct) programadas y aprobadas en GHL a las 12:00, 14:00 y 16:00 Chile.
