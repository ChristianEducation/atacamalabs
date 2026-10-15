---
name: atacama-motion
description: "Producir videos motion (Reels/historias 9:16) y piezas animadas de Atacama Labs con el gusto y las reglas de marca de Christian, usando HyperFrames en el taller de la VPS. Úsala para: crear un video motion nuevo, elegir el lenguaje de motion de la semana, adaptar una plantilla (paneles partidos, ráfaga de cámara, mini-interfaces), revisar calidad (check, contraste, volumen) y entregar el MP4 para revisión. Siempre junto con las skills técnicas de la categoría motion (hyperframes, hyperframes-core, hyperframes-animation…)."
---

# Atacama Motion — cómo hace motion Atacama Labs

Christian es fundador no técnico: ve el resultado en el celular y aprueba en GHL. Tú produces el video **completo y verificado**; nunca publicas, programas ni apruebas nada. Si no estás seguro de una decisión de marca, deja la pieza como **propuesta** y avisa.

## 1. Dónde está todo (VPS, contenedor de Hermes)
| Qué | Ruta |
|---|---|
| Skills técnicas oficiales de HyperFrames | `/opt/data/skills/motion/` (`hyperframes`, `hyperframes-core`, `-animation`, `-creative`, `-keyframes`, `-cli`, `-audio`, `-registry`, `general-video`, `motion-doctrine`) — léelas antes de escribir HTML de una composición |
| CLI de HyperFrames (v0.8.150) | `/opt/data/motion-studio/node_modules/.bin/hyperframes` (Chrome de render ya descargado) |
| Plantillas validadas | `/opt/data/motion-studio/templates/{paneles-partidos, rafaga-de-camara, mini-interfaces}` |
| Proyectos de trabajo | `/opt/data/motion-studio/projects/<slug>/` (copia una plantilla aquí; nunca edites la plantilla) |
| Validar + renderizar + igualar volumen | `/opt/data/scripts/motion_render.sh <proyecto> [nombre]` |
| Media Worker (carruseles/imágenes) | `/opt/data/atacama-media/` — lo corre un job automático; no lo toques |

Límites del servidor: 2 CPU, sin GPU. Un video de 8 s tarda ≈ 50 s en renderizar (≈ 80 s con validación y volumen): **un render a la vez**. No uses `--workers` altos.

## 2. Reglas de marca (no negociables)
- **Colores** (solo estos): azul profundo `#1A3C8E`, azul de marca `#0F5CED`, cielo `#58A6FF`, niebla `#F3F6FD`, blanco; tinta `#0B1E3F` **solo para texto**. **Nada de negro. Nada de texturas ni imágenes generadas por IA de fondo.**
- **Cuadrícula Atacama de 120 px** en todos los paneles y en el cierre (960 = 8 × 120: alinea entre panel superior e inferior).
- **Tipografía:** DM Sans (`assets/fonts/DMSans-latin-wght.woff2`). Los títulos largos nunca se tocan con `letter-spacing` animado (el lint lo rechaza).
- **Logos:** solo los SVG oficiales de `assets/` (`logo-light.svg` sobre fondos claros, `logo-dark.svg` sobre azul profundo, **nunca sobre el azul de marca**). No reconstruirlos, no recolorearlos. Para logos repetidos usa fondo CSS, no el mismo `<img>` dos veces (el check lo marca).
- **Cierre fijo:** logo + «Agentes que trabajan.» (con «trabajan.» en azul y subrayado) + `ATACAMALABS.CL`.
- **Texto:** frases cortas, preguntas o provocación, sin muletillas («siempre», «realmente»…), mayúscula inicial en la mitad de arriba. Cada línea aparece subiendo desde una máscara (`overflow:hidden`). Las letras de un panel pueden usar el color del panel opuesto **solo si el contraste ≥ 3:1** (verifica; real|brand da 1,8:1 → no).
- **Llamita:** solo cuando aporta y siempre a partir de `brand/content/mascot/poses.png` (hoja oficial); jamás redibujada. Los videos de la serie actual usan isotipo.
- **Claims:** nada de cifras, clientes ni resultados inventados. Si una cifra viene de una fuente, cítala en el pie de la publicación.

## 3. Movimiento y ritmo
- Vertical **1080×1920, 30 fps**, 8–10 s típicos (≤ 22 s). Una sola timeline GSAP **pausada** en `window.__timelines["main"]`; nada de `Math.random`, `Date.now` ni red en tiempo de render.
- **Transiciones intercaladas**: una hacia arriba, la siguiente hacia el lado, nunca dos iguales seguidas. Costura/hairline con sombra suave entre paneles. Cierre con «puertas que se abren» y golpe grave.
- **Audio:** lo genera Higgsfield y **empieza en t = 0**; las imágenes siguen su pulso (hay que dar a Higgsfield el mapa de tiempos de la pieza). **Sin efectos añadidos encima** (nada de campanitas ni «sonidos de aeropuerto»), sin capas superpuestas ni música plana. Volumen final **−15 LUFS** (`motion_render.sh` lo hace). Si no hay audio disponible o no hay créditos: **entrega sin audio propio y márcalo para revisión**; no improvises.
- **Variedad:** no repitas el mismo lenguaje de motion en dos piezas seguidas. Mira primero qué se hizo (`ls -t /opt/data/motion-studio/projects`) y elige otro.

## 4. Catálogo de lenguajes validados (plantillas)
1. **`paneles-partidos`** — «¿Quién contesta?»: la frase se parte en la costura (y = 960) entre un panel superior y uno inferior; fondos niebla/real/brand alternados, letras con color del panel opuesto, transiciones arriba/lado intercaladas, cierre de puertas + logo. Ideal para **provocación/dolor** (3 frases, 8,3 s).
2. **`rafaga-de-camara`** — «Mismo agente, otro uniforme»: ráfaga de obturador por **rubros** (cada foto cambia visual y color), hoja de contactos que se acelera en miniaturas, cierre en el isotipo. Ideal para **versatilidad por rubro** (6 rubros; el 6.º es ALIMENTACIÓN).
3. **`mini-interfaces`** — «Un agente, un puesto»: mini-tarjetas de interfaz (recepción, cotización, agenda, seguimiento) construidas con un generador (`generador/.build_puestos_v3.py` + `vig-block.html`); cada puesto dura un poco más para leerse. Ideal para **explicar qué hace el agente** (9,4 s).
4. **Propuestas por construir con Claude Code** (no entran al catálogo hasta que Christian las apruebe): tipografía cinética, antes/después, datos/mapa. Si propones un lenguaje nuevo, descríbelo en un párrafo y deja el borrador marcado «PROPUESTA».

## 5. Proceso (siempre en este orden)
1. **Brief:** tema, rubro, 1 mensaje, 3 frases como máximo, CTA. Si falta algo, decide con criterio y anótalo en el brief; no te quedes esperando salvo marca/legal.
2. **Elegir lenguaje** (sección 4, con la regla de variedad) y **copiar la plantilla**: `cp -r /opt/data/motion-studio/templates/<lenguaje> /opt/data/motion-studio/projects/<fecha>-<slug>`.
3. **Adaptar** `index.html` (textos, colores por panel, duraciones). Mantén `data-width="1080" data-height="1920" data-fps="30"` y `data-duration` igual a la duración real. Los elementos tapados por otros pueden marcarse `data-layout-allow-overflow` / `data-layout-allow-occlusion`; si una capa queda cubierta, ocúltala con `tl.set(sel,{autoAlpha:0})` en vez de dejarla debajo.
4. **Audio:** pide a Higgsfield el pulso de la pieza (instrucciones de la skill del job); guarda el mp3 en `assets/` y declara `<audio src="assets/…" data-start="0" …>`.
5. **Validar y renderizar:** `/opt/data/scripts/motion_render.sh /opt/data/motion-studio/projects/<proyecto> <nombre>`. Debe terminar con `Check passed` (lint, runtime, layout, motion y contraste AA **sin errores**), `-15.0 LUFS` y duración correcta. Si el check falla, corrige y repite; no entregues un render con errores.
6. **Mirar de verdad:** `hyperframes snapshot` en 4–5 instantes (inicio, cada transición, cierre) y confirma que nada se corta, que el texto se lee y que el cierre es el oficial.
7. **Entregar:** el MP4 `-normalizado.mp4` (o el que corresponda) queda en `renders/` y se sube **solo como pieza en revisión** por el flujo de contenido (Content Intake → GHL Planner `in_review`). Pie de publicación sobrio, ≤ 3 hashtags, sin atacar a competidores.
8. **Registrar:** una línea en `/opt/data/motion-studio/BITACORA.md` (fecha, slug, lenguaje, duración, créditos de Higgsfield usados, resultado del check).

## 6. Errores ya aprendidos (no los repitas)
- Un tween de `letterSpacing` rompe el lint → anima opacidad/posición, no el espaciado.
- Capas apiladas se marcan como texto ocluido → ocúltalas cuando quedan debajo.
- Audio que empieza tarde se siente «video primero»: audio y video comienzan juntos en 0.
- «Efectos» tipo campanita/ding o pitidos suenan a aeropuerto; las capas encimadas ensucian el audio.
- Texturas de seda/grano IA de fondo fueron rechazadas: colores planos de marca + cuadrícula.
- Primera escena débil: usa los mismos colores/jerarquía que la segunda (fondos claros con letras en el color opuesto).
- Una frase con «siempre» en medio se siente larga: recórtala.
- `hyperframes check` avisa de versiones nuevas del proyecto; **no actualices** el pin de un proyecto sin avisar.

## 7. Qué NO haces
No publicas, no programas, no apruebas, no tocas LinkedIn ni Meta, no gastas créditos de Higgsfield por encima del tope semanal, no modificas las plantillas ni los archivos de `/opt/data/atacama-media/`, y no contactas a terceros.

## 8. Motion v2 (spec §6.6, 15-oct)
- **Perfiles de movimiento** (seco · estándar · pesado · juguetón) con suma de resortes: `brand/content/motion/perfiles-movimiento.md`.
- **Reglas de sonido** (efectos bajo la música, tiempo fuerte, loudness medido, sin prometer beat sin `hyperframes beats`): `brand/content/motion/reglas-sonido.md`.
- **Puerta de calidad** antes de mostrar un video: hoja de contacto 2 fps, teléfono 360 px, tira de 12 frames, loop ×2, determinismo; nota ≥ 8 (`scripts/motion/quality-gate.mjs` en el PC).
- **Un video, tres formatos** (9:16 · 1:1 · 16:9) con reencuadre: `scripts/motion/multiformat.mjs` y el contrato `atacamaSeek(t)`.
- Plantillas: guía de estilo desde referencias (solo gramática; Christian la aprueba), «lista de estados», brief de director (> 30 s) y pedido en una frase. Todas en la Biblioteca.
