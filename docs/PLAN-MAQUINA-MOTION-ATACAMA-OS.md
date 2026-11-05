# Plan — «Máquina de motion» dentro de Atacama OS

> Creado el 12-oct-2026. Estado: **plan aprobado en principio por Christian; los pasos 1–4 esperan su «dale» explícito para ejecutarse.** Nada de esto debe vivir en Claude ni en el PC de Christian: tiene que correr solo en la VPS (Hermes + n8n + Supabase), con aprobación humana en GHL/`/ops` antes de publicar.

## 0. Contexto y objetivo
- Christian publica 3 videos de Instagram (lun 12 / mar 13 / mié 14, 15:00 Chile). Quedaron en GHL como Reels `in_review` (ver §6).
- Objetivo: para el **jueves 15 / viernes 16 de octubre** tener una máquina repetible que produzca videos motion e imágenes potentes **con variedad** (no repetir siempre el mismo formato), alimentada por la investigación de competencia y conectada al flujo de contenido que YA existe.
- Principio: **potenciar el flujo existente, no crear uno paralelo.** Tablas y workflows actuales: `content_pieces` (idea→scored→drafted→rendered→in_review→approved→scheduled→published), `content_competitors`, `content_intel_reports`, n8n 12 *Content Intake* / 27 *Content Growth* / 28 *Content RSS*, jobs de Hermes *Content RSS*, *Content Pieces* y *Competitor Intelligence*, Governor de cola (una publicación por cuenta y día), aprobación solo en GHL/`/ops`.

## 1. Los 4 pasos
| # | Paso | Entregable | Meta |
|---|---|---|---|
| 1 | **Taller de motion en la VPS** | Chromium (Playwright) + fuentes + ffmpeg + Node dentro del contenedor de Hermes; skills de HyperFrames oficiales y una skill propia `atacama-motion` en `/opt/data/skills/<nombre>/SKILL.md`; prueba de render del video «¿Quién contesta?» **dentro de la VPS** y comparación con el publicado | jueves |
| 2 | **Higgsfield desde la VPS** | Login único por código (cuenta Plus de pago, ~1.800 créditos al 10-oct; NO hay clave API); verificar que el token se renueve solo; **tope semanal de créditos** en Atacama OS con alerta; mientras tanto lo intenso se hace con Claude Code en el PC | jueves |
| 3 | **Campo «brief de motion» + plantillas + job semanal** | Columna/JSON `motion_brief` en las ideas; biblioteca de plantillas parametrizadas (los 3 lenguajes de motion ya hechos); job semanal de Hermes que produce un borrador, lo renderiza, lo sube a GHL como `in_review` y lo muestra en `/ops → Contenido` | viernes (versión mínima) |
| 4 | **Investigación de competencia** | Cuentas aprobadas (abajo); recolección semanal en n8n → Supabase; síntesis de Hermes → banco de ideas con `origin=competitor_intel`; Instagram por *Business Discovery* **cuando Christian conecte Meta** (después); anuncios: punto de control mensual casi manual (Biblioteca de anuncios no tiene API completa fuera de Europa y automatizarla va contra sus términos) | semana siguiente |

### 1.1 Skills en Hermes — dos capas
- **Técnica:** skills oficiales de HyperFrames (composición, transiciones, check, render). Es lo que permite «salir del molde».
- **Gusto de Christian (la que más pesa):** skill propia `atacama-motion` con sus reglas visuales y de proceso (ver §3), el catálogo de lenguajes y ejemplos, criterios de calidad y lo descartado.
- Hermes parte de **plantillas validadas**; si propone un lenguaje nuevo, queda como «propuesta» para que Christian decida si se construye (con Claude Code) antes de entrar al catálogo. Revisión automática antes de llegar a él: `hyperframes check`, imágenes de control, contraste AA.

### 1.2 Decisiones pendientes de Christian
- OK para instalar Chromium/ffmpeg/skills en el contenedor de Hermes (reinicia el agente unos minutos). Es la misma decisión pendiente del **Media Worker** de las publicaciones en cola.
- Cómo conectar Higgsfield en la VPS (login por código) y valor del tope semanal de créditos.
- Conectar Meta (después). Posible alternativa: revisar primero qué estadísticas de Instagram entrega GHL (hay `hasStatisticsPermissions: true`).
- ¿Pasar a Claude al VPS? Recomendación: **todavía no**; primero estabilizar Hermes con skills + render + tope de créditos.

## 2. Investigación de competencia — cuentas aprobadas (12-oct)
- Vambe (vambe.ai) · IAutomatiza (iautomatiza.cl) · FutureFlow · Oversai · Fundé Dálmata · Eclectica (solo cuando se confirme su dominio). Treble y Botmaker: sin verificar, no incluir aún.
- Registrar por pieza: formato, gancho de los primeros 3 s, duración, CTA, frecuencia, antigüedad del anuncio, interacción pública. Nunca copiar creatividades ni texto; solo patrones.
- Palabras para la Biblioteca de anuncios (Chile): «agente de IA», «automatización WhatsApp», «chatbot WhatsApp», «atención al cliente con IA» + rubros (clínica, inmobiliaria, minería).
- Huecos de la competencia ya detectados: criterios operativos, límites y traspaso humano, costos, casos reales antes/después, «qué no automatizar».

## 3. Reglas de marca y de gusto (lo que Hermes debe respetar)
- Colores: azul profundo `#1A3C8E`, marca `#0F5CED`, cielo `#58A6FF`, niebla `#F3F6FD`, tinta `#0B1E3F` (solo texto). **Nada de negro ni texturas de IA como fondo.** Cuadrícula de 120 px en todos los paneles y en el cierre. Tipografía DM Sans. Logos solo desde los SVG oficiales (`logo-light` sobre claro, `logo-dark` sobre azul profundo, nunca sobre el azul de marca).
- Texto: frases cortas, preguntas/provocación, mayúscula inicial en la mitad de arriba, letras con el color de la mitad opuesta cuando el contraste lo permite (≥ 3:1), líneas que suben desde una máscara.
- Movimiento: transiciones **intercaladas** (arriba / lado), cierres con golpe grave y logo + «Agentes que trabajan.» + url; sin efectos de aeropuerto (campanitas, pitidos); sonido generado por Higgsfield que **empieza en t = 0** y las imágenes siguen su pulso; sin efectos añadidos encima; volumen **−15 LUFS**.
- Duración típica 8–10 s en vertical 1080×1920; el producto se muestra con mini-interfaces cuando el video explica.
- La llamita solo cuando aporte (partir siempre de `brand/content/mascot/poses.png`); la prueba de minería con Higgsfield (`nano_banana_pro`, 2 créditos) salió fiel, pero Christian dejó el video de verticales con isotipo.
- Tope de créditos de Higgsfield por tarea: avisar antes de pasarse.

## 4. Piezas y herramientas existentes (en el repo)
- `videos/atacama-puestos` (original, 22 s), `videos/atacama-provocacion` (¿Quién contesta?, v5), `videos/atacama-verticales` (ráfaga de cámara), `videos/atacama-puestos-v3` (reformulación, no publicada), generador `videos/.build_puestos_v3.py` y `videos/vig-block.html` (mini-interfaces).
- Copias listas para subir con volumen igualado: `videos/_listos-para-subir/`.
- Renderer de imágenes de contenido: `scripts/content/render.mjs` (PNG 1080×1350). Media Gateway/Worker: `scripts/media/*`.

## 5. Historias de Instagram (prueba pedida el 12-oct)
- Probar en GHL un post tipo **`story`** (cuenta `atacama.labs`) a las 15:00 Chile, en revisión como los Reels.
- Christian mostrará capturas de historias de Vambe como referencia; evaluar formato (9:16), densidad de texto, gancho y si funcionan como historia, como publicación o ambas. **No copiar** sus creatividades: se estudian patrones y se crean piezas propias con nuestro generador de imágenes o con Higgsfield.
- Límite a considerar: la API no permite stickers interactivos (enlace, encuesta, pregunta) en historias; esas se publican a mano desde el celular. Las historias por GHL sirven para recordatorios, avances y piezas visuales.

## 6. Estado de lo programado (12-oct, ~12:50)
Reels de `atacama.labs`, tipo `reel`, `in_review` con aprobación pendiente (aprobador `OjkAjHMdUjnblO7W1kBZ`), 15:00 Chile (= 18:00 UTC, horario de verano UTC-3):
- Lun 12 «¿Quién contesta?» — post `6accfd8cac1b0f7f32c48e17`
- Mar 13 «Un agente, muchos puestos» — post `6accfd90032a0cfcfd38c254`
- Mié 14 «Mismo agente, otro uniforme» (Alimentación en vez de Casinos) — post `6accfd92b99bf10fdc0fed8d`
No están registrados en `content_pieces`. Si el lunes no se aprueba antes de las 15:00, hay que reprogramar.

## 7. Riesgos y reglas
- Nada se publica sin aprobación humana en GHL/`/ops`. Un solo post por cuenta y día (Governor).
- Calidad creativa: una IA libre produce menos que una IA dirigida; por eso plantillas validadas + revisión automática + aprobación humana + Claude Code para crear lenguajes nuevos.
- Credenciales en la VPS con mínimos privilegios; tope de créditos con alerta; todo job reporta su corrida en `ops_runs`.
- Memoria relacionada del asistente: `atacama-maquina-motion-objetivo`, `atacama-motion-video-y-carruseles`, `atacama-verticales-video-boceto`, `atacama-puestos-v3-reformulado`.
