# Estrategia de carruseles ilustrados (aprendida con «¿Agendar una hora en 8 mensajes? Bastan 3 toques.»)

> Qué es este documento: **la estrategia que funcionó**, no una plantilla para repetir idéntico. Cada carrusel debe tener su propia
> composición según su historia. Lo que se repite es el *método* y la *lista de cosas que ya sabemos que salen mal*, para que cada vez
> hagan falta menos vueltas. Meta explícita de Christian: **bajar las iteraciones carrusel a carrusel** (este llevó mucho ida y vuelta;
> el próximo debería salir mejor a la primera, y el siguiente mejor aún).

Pieza de referencia: carrusel de 5 láminas 4:5 de @atacama.labs, publicado en revisión en GHL para el martes 13-oct-2026 15:00 (Chile).
Material guardado en `social/exports/content/carrusel-flows-v3/` (láminas finales, artes sin componer y `receta/` con los prompts y
scripts que se usaron). Costo real: unos **44 créditos de Higgsfield con todas las iteraciones**; una producción limpia son 6–7
imágenes ≈ 17–20 créditos.

## 1. Proceso que funcionó (en este orden)

1. **Analizar una referencia buena (Vambe) para entender POR QUÉ funciona**, no para copiarla: gancho con novedad, problema concreto,
   mecanismo, beneficio del producto, cierre de marca; ritmo claro/oscuro; chat con datos reales. Se copia la *estructura de ideas*,
   nunca su texto, su mascota ni sus afirmaciones.
2. **Ángulo propio apoyado en un hecho verificado en la fuente primaria.** Aquí: desde el 1-oct-2026 Meta cobra los mensajes de
   servicio dentro de la ventana de 24 h (1.000 gratis al mes por número; los del cliente no se cobran). Un formulario dentro del chat
   (WhatsApp Flows) reemplaza varias respuestas de la empresa. La frase «el agente sabe cuándo usarlo» se descartó (a Christian no le
   gustó); lo que valió fue conectar el formulario con el cobro.
   - **Trampa que costó tiempo:** las herramientas de texto (WebFetch/WebSearch) devolvieron una copia VIEJA de la página de Meta
     («los mensajes de servicio son gratis»), mientras ~10 blogs decían lo contrario. Solo la página abierta en el **navegador real**
     (actualizada 30-sep-2026) lo confirmó. Regla: si una fuente oficial contradice a todo el resto, abrirla en el navegador antes de
     decidir; y anotar «verificación manual» en la fuente.
   - El Intake solo acepta fuentes verificadas que existan en `content_sources` (clave `hermes_research:<url>`); una fuente que alguien
     escribe a mano en la pieza no cuenta. Si la verificó una persona/agente fuera del radar, se inserta la fila con evidencia y nota.
3. **Contar UNA historia continua, con el mismo caso concreto en todas las láminas** (clínica dental ficticia «Clínica Dental Sonrisa»,
   «Limpieza dental», martes 20, 10:30). Correlación entre láminas: 1 gancho → 2 costo → 3 solución en pasos que se siguen entre sí →
   4 qué hace Atacama → 5 cierre de marca. Colores con significado fijo: **verde = mensajes de la empresa, blanco = cliente** (igual
   en todas las láminas, no cambiar de punto de vista entre una y otra).
4. **Realismo del producto real**, no render de juguete: pantallas con aspecto de WhatsApp (sin su logo, negocio ficticio, horas, checks,
   hoja de formulario que sube desde abajo), manos reales. Christian lo pidió explícitamente («no una conversación que no es»).
5. **Reparto de trabajo modelo / sistema** (la clave del método):
   - **El modelo (GPT Image 2.5, `--quality high --resolution 2k`) dibuja todo lo visual**: foto de mano con celular, pantallas con los
     textos exactos en español, la llamita. Cada imagen: el objeto sobre **fondo liso y uniforme** (#E8EDF6) para poder recortarlo.
   - **El sistema pone la posición, el titular, el texto de apoyo, el logo oficial, el contador y el cierre**, y la **cuadrícula de marca
     visible en toda la lámina** (como en los videos). Así el texto de marca nunca tiene erratas y el logo nunca se reconstruye.
   - Recorte del fondo **en local** (`receta/recorte-fondo.py`: relleno desde los bordes, umbral de color, borde suavizado). El removedor
     de fondo de Higgsfield se colgó sin crear trabajo; no depender de él. Ver §3 por los dos defectos típicos del recorte.
6. **Mostrar primero UNA lámina de prueba (la más difícil)** antes de producir las demás. Aquí fue la 2 (8 burbujas con textos exactos);
   al pasar la prueba, el resto salió en una sola tanda. Esto es lo que más iteraciones ahorra.
7. **Revisar cada texto AMPLIADO** antes de mostrar (no solo en miniatura): lo que el modelo escribe dentro de las pantallas se compara
   con la lista de textos pedidos. Meta futura: automatizarlo con OCR (`image_text_detection` de Higgsfield o OCR local).

## 2. Identidad visual que hay que respetar (sale de los videos, no de las historias)

- Fondo claro `#EEF3FE→#E3ECFC` con **cuadrícula azul visible**: líneas de 120 px (`rgba(15,92,237,.12)`) + líneas finas de 40 px
  (`.055`), y un halo azul suave detrás del objeto principal.
- Contador `NN / 05` en azul, abajo a la derecha. Logo horizontal oficial (`public/brand/logo-horizontal.svg`), nunca reconstruido.
- **Recuadros de esquina («[ ]») solo en el cierre y alrededor del bloque central** (logo + tagline + URL), como el cierre de los
  videos. En las demás láminas NO van (Christian los quitó).
- Cierre = el de los videos: «Agentes que *trabajan.*» con «trabajan.» en azul `#0F5CED` y subrayado, logo y `ATACAMALABS.CL`.
- Titulares DM Sans 700 con palabra clave en azul; texto de apoyo **grande** (≥ 34 px) y no más de 3 líneas; los pasos de la lámina 4
  van como lista numerada de una línea cada uno.
- Paleta: `#0F5CED`, `#1A3C8E`, `#58A6FF`, `#F3F6FD`; `#0B1E3F` solo para texto.

## 3. Lo que costó iteraciones y cómo evitarlo la próxima vez (checklist de «primera vez bien»)

| Pasó | Causa | Evitar |
|---|---|---|
| «Se perdió el fondo cuadriculado» | Reutilicé el molde de las historias (degradado liso) y la cuadrícula solo existía dentro de la ilustración, difuminada | Cuadrícula de marca **siempre** en toda la lámina, desde la primera versión |
| «Escribes en piedra el último diseño» | Apliqué el mismo molde (titular arriba, pastilla, panel) a las 5 láminas | Cada lámina con la composición que pide su rol; el molde es un punto de partida, no una regla |
| «La conversación no parece real» | Yo mismo prohibí al modelo parecerse a WhatsApp y salió un render brillante de juguete | Pedir pantallas con el aspecto real (sin logo) y fotos reales de mano |
| Lámina 3 sin correlación | Tres celulares independientes | Los celulares cuentan la misma conversación: 1 mensaje + botón del formulario → 2 formulario → 3 el mismo chat con la respuesta del formulario y la confirmación |
| Verdes/blancos al revés | El punto de vista del cliente en las láminas 1–3 y el de la empresa en la 2 | Definir antes de generar: verde = empresa, blanco = cliente, en todas |
| Llamita «muy básica» y «sin sentido» | Usé una referencia mía de cuatro patas con bufanda; la oficial es **bípeda, regordeta, con manitos**, y estaba parada sin hacer nada | Referencias SIEMPRE `brand/content/mascot/poses.png` y `emociones.png`; que haga algo con sentido (usar/mirar el celular); sin bufanda; protagonista sin recuadros que compitan |
| Cierre oscuro | No miré el cierre de los videos | Mirar el cierre real de los videos y copiarlo |
| Texto de abajo chico | Tamaño de lectura de escritorio | ≥ 34 px y una línea por paso |
| Panel tapaba los últimos mensajes | Posicioné sin medir | Calcular dónde termina el contenido de la imagen antes de poner el panel |
| Mancha de sombra bajo los pies / rectángulo de fondo en el borde | El umbral del recorte deja halos y el borde de la imagen del modelo queda visible | Umbral más alto solo en la franja de los pies, máscara de borde (degradé) en los costados de la imagen, cerrar agujeritos en el pelo |
| Rechazo del Intake por fuente | La fuente no estaba en `content_sources` | Registrar la fuente verificada (clave `hermes_research:<url>`) antes de enviar |

## 4. Límites conocidos (decirlos, no esconderlos)

- **Lámina de tres celulares:** cada celular mide ~370 px de ancho, el texto de la conversación queda pequeño en un feed. Se entiende por
  los números y el celular central, pero es el punto más débil. Alternativas a probar: dos celulares grandes, o un solo celular con tres
  estados recortados.
- Las pantallas imitan WhatsApp sin su logo y con un negocio ficticio (práctica habitual en contenido educativo, pero conviene tenerlo presente).
- El «ilimitado» del plan de Higgsfield no aplica al CLI: cada imagen cuesta créditos (GPT Image 2.5 alta ≈ 2,75).

## 5. Próximos pasos para llevarlo al motor (no hecho aún)

1. Convertir `receta/componer-laminas.mjs` + `recorte-fondo.py` en un módulo del repo (junto a `scripts/content/visual-hybrid.mjs`) con
   composiciones por rol de lámina (gancho, dato, secuencia, producto, cierre), y que el worker de la VPS lo use.
2. Biblioteca de prompts aprobados (esta carpeta `receta/prompts/` es el primer lote).
3. QA automático de textos (OCR contra la lista de textos pedidos) y de recorte (detectar halos/manchas) antes de mostrar nada a Christian.
4. Plantilla de «lámina de prueba»: el job elige la lámina más difícil, la produce primero y espera visto bueno antes de generar el resto.
