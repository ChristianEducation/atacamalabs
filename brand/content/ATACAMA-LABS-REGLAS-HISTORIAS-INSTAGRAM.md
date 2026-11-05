# Atacama Labs — Reglas para Historias de Instagram

**Versión:** 1.1  
**Fecha:** 2026-10-12  
**Estado:** FUENTE DE VERDAD de Atacama OS para historias de Instagram (escrita por Christian). Reemplaza la cuota fija anterior de «3 historias al día en 10:00 / 14:00 / 18:00».  
**Objetivo:** definir cómo el sistema editorial de Atacama Labs debe decidir cuándo proponer historias originales, cuándo repostear publicaciones del feed y cuándo no publicar historias. El sistema puede generar y programar propuestas automáticamente en el Social Planner. La decisión final de publicarlas, modificarlas o descartarlas la toma Christian desde el Social Planner.

**Cambios v1.1 (12-oct-2026):**
- Los **stickers** (encuesta, pregunta, enlace, cuenta regresiva, etc.) NO se programan desde Atacama OS: ver §0.1.
- El **REPOST_FEED** no se programa: queda como **nota en Atacama OS** («Repostear tal publicación»): ver §0.2.
- Nueva §0.3: **método visual obligatorio** para historias, imágenes y carruseles con ilustración.

---

## 0. Reglas operativas de Atacama OS (v1.1)

### 0.1 Stickers e interacción nativa
La API del Social Planner no permite agregar stickers. Por eso:
- Toda historia programada por Atacama OS debe **funcionar sin sticker** (la pregunta o la invitación van escritas en la imagen).
- Si un sticker mejora la historia (encuesta, pregunta, enlace), la propuesta agrega una **NOTA MANUAL**: «Agregar en Instagram: encuesta "¿…?" con opciones "…" / "…"». Christian lo pone a mano en Instagram al revisarla.
- Donde este documento dice «encuesta» o «sticker», entiéndase: texto en la imagen + nota manual opcional.

### 0.2 REPOST_FEED
- Atacama OS **no crea ni programa** el repost. Lo registra como **nota en Atacama OS** con el formato: «Repostear [publicación] — hora sugerida HH:MM — frase opcional: "…"».
- La nota aparece en la propuesta del día (Telegram y /ops). Christian lo hace en Instagram.
- El repost **sigue contando como una historia** del día para la cantidad (§5).

### 0.3 Método visual obligatorio (historias, imágenes y carruseles con ilustración)
Toda pieza visual de Instagram que lleve ilustración se produce así, sin excepción:
1. **Ilustración** generada con **GPT Image 2.5** (Higgsfield): la escena (teléfono con chat, tarjetas, personaje, objetos) con el texto corto que va DENTRO de la escena escrito exacto en el prompt. Sin logos ni titulares dentro de la ilustración; espacio libre arriba y abajo para el texto.
2. **Composición de marca** encima, hecha por el sistema (nunca por el modelo): titular en DM Sans negrita con una palabra clave en azul `#0F5CED`, pastilla azul cuando aporta, panel claro inferior, **logo oficial** y URL, isotipo oficial como decoración translúcida cuando corresponde.
3. **Revisión** antes de proponerla: texto del chat exacto, sin errores de anatomía (la llamita con 4 patas, orejas y expresión correctas), sin choque entre el titular y la ilustración. Lo que no pasa se regenera o se descarta.
- **Llamita:** se pide con la expresión y la situación exactas que cuenta la historia, usando como referencia las llamitas aprobadas; nunca se fuerza su presencia.
- **Carruseles:** solo las láminas que necesitan ilustración usan este método; las láminas de texto usan el diseño de marca.
- **Videos:** Higgsfield no se usa para video dentro de Atacama OS; los videos los hace Christian.
- **Costo:** GPT Image 2.5 en calidad alta ≈ 2,75 créditos por imagen; tope semanal de Atacama OS: **200 créditos**.

---

## 1. Principio general

Las historias de Atacama Labs no se publican para cumplir una cuota.

El sistema debe priorizar:

1. utilidad,
2. claridad,
3. continuidad de marca,
4. conversación,
5. distribución del contenido existente.

La regla principal es:

> **Proponer entre 0 y 3 historias por día según lo que realmente haya que contar.**

Tres historias es un máximo habitual, no una obligación.

Si una sola historia cumple el objetivo del día, se publica una sola.

Si no existe una historia suficientemente buena, el sistema puede recomendar **no publicar historias ese día**.

---

## 2. Tipos de historias que el sistema debe reconocer

Cada historia propuesta debe pertenecer explícitamente a uno de estos tipos.

### A. REPOST_FEED

Repost de una publicación, carrusel o reel que ya existe en el feed.

Se usa cuando:
- hay una publicación nueva ese día;
- la publicación sigue siendo relevante;
- conviene darle una segunda oportunidad de distribución;
- puede abrir conversación desde Stories.

Regla:
- el repost **cuenta como una historia**;
- no es necesario crear tres historias nuevas si ya existe una publicación útil para compartir;
- preferentemente agregar una frase breve de contexto, una pregunta o un sticker;
- si la publicación ya se entiende perfectamente por sí sola, también puede repostearse sin agregar demasiado.

Ejemplos de contexto:
- “Esto cambia bastante cómo usamos WhatsApp en empresas.”
- “La parte interesante no es el formulario. Es lo que ocurre después.”
- “¿Esto hoy lo hacen manualmente en tu empresa?”

---

### B. SUPPORT_STORY

Historia creada para acompañar una publicación del feed sin repetirla.

Puede:
- agregar una observación;
- mostrar un ejemplo;
- hacer una encuesta;
- hacer una pregunta;
- mostrar una demo;
- explicar una consecuencia práctica;
- llevar a una conversación.

Ejemplo:

Publicación:
“WhatsApp Flows”

Historias:
1. Repost de la publicación.
2. “La gracia no es solo el formulario. Es que el agente sepa cuándo usarlo.”
3. Encuesta: “¿Hoy piden datos por WhatsApp mensaje a mensaje?”

---

### C. ORIGINAL_STORY

Historia independiente del feed.

Se propone cuando existe algo concreto que vale la pena comunicar, por ejemplo:

- problema operativo real;
- capacidad concreta de un agente;
- mini demo;
- integración;
- caso de uso;
- pregunta;
- encuesta;
- detrás de cámaras;
- avance de producto;
- aprendizaje construyendo Atacama;
- ejemplo de proceso manual;
- caso comercial;
- resultado;
- evento;
- novedad relevante.

No crear una ORIGINAL_STORY simplemente para completar una cuota diaria.

---

### D. NO_STORY

El sistema puede recomendar explícitamente:

> “Hoy no publicaría una historia adicional.”

Esto es válido cuando:
- no hay nada nuevo que aporte;
- ya hubo suficiente contenido;
- la nueva historia repetiría demasiado lo anterior;
- se estaría publicando solo por cumplir;
- una publicación del feed ya cumple suficientemente el objetivo.

---

## 3. Regla de decisión diaria

Antes de proponer historias, el sistema debe revisar:

1. ¿Hay una publicación/reel nuevo programado o publicado hoy?
2. ¿Hay una campaña, producto o tema que necesite apoyo?
3. ¿Hay una demo, avance o caso real que valga la pena mostrar?
4. ¿Qué historias se publicaron durante las últimas 24–48 horas?
5. ¿Se está repitiendo demasiado el mismo tema?
6. ¿Existe una oportunidad clara de generar conversación?

Luego debe decidir:

### Si hay una publicación nueva

Prioridad por defecto:

**1 REPOST_FEED + 0–2 SUPPORT_STORY**

No generar automáticamente tres historias originales adicionales.

Ejemplo:

- Historia 1: repost de publicación.
- Historia 2: observación que no aparece en el post.
- Historia 3: encuesta/pregunta/CTA.

También es válido:

- solo el repost;
- repost + una historia;
- repost + dos historias.

---

### Si NO hay publicación nueva

El sistema puede proponer:

**0–3 ORIGINAL_STORY**

Preferencia habitual:

- 1 historia si existe una sola idea fuerte;
- 2 historias si se complementan;
- 3 historias solo cuando cada una aporta algo distinto o forman una secuencia útil.

---

## 4. Regla sobre continuidad

No se debe forzar que todas las historias formen una serie infinita.

Cada historia debe poder entenderse sola.

Sin embargo, cuando existe una relación natural con la historia anterior o con el contenido del día, debe aprovecharse.

Principio:

> **Continuidad suave, nunca continuidad obligatoria.**

Ejemplo correcto:

- Martes: leads → calificación → seguimiento.
- Miércoles: conversación → acción → agenda.
- Jueves: sistemas → integraciones → trabajo manual.

Pero si aparece una idea mejor y no tiene relación directa, se puede usar igualmente.

La calidad de la idea tiene prioridad sobre mantener un hilo artificial.

---

## 5. Cantidad recomendada

No existe una cuota fija de tres historias diarias.

Guía:

- **0 historias:** válido.
- **1 historia:** completamente normal.
- **2 historias:** frecuencia muy útil.
- **3 historias:** máximo habitual.
- **Más de 3:** solo cuando exista una razón concreta: evento, lanzamiento, cobertura, campaña, demo larga o situación especial.

Referencia semanal orientativa:

> **8–15 historias por semana**, sin obligación de alcanzar una cifra exacta.

---

## 6. Distribución durante el día

Si existen varias historias:

- no es necesario publicarlas todas juntas;
- pueden separarse aproximadamente 2–4 horas;
- el sistema puede recomendar horarios;
- no existe obligación de mantener un intervalo exacto.

Las Stories duran 24 horas, por lo que el sistema debe considerar qué historias seguirán activas cuando se publique la siguiente.

---

## 7. Mezcla de contenido

Evitar que todas las historias sean anuncios.

Cuando existan 2–3 historias en un día, intentar mezclar funciones.

Ejemplos:

### Combinación A
1. idea comercial;
2. demo;
3. encuesta.

### Combinación B
1. repost;
2. comentario adicional;
3. pregunta.

### Combinación C
1. detrás de cámaras;
2. capacidad de producto.

### Combinación D
1. caso de uso;
2. integración;
3. CTA.

No convertir cada historia en “agenda una demo”.

---

## 8. CTA

No todas las historias necesitan CTA.

Cuando exista CTA debe ser concreto:

- responder una palabra;
- responder la historia;
- votar una encuesta;
- hacer una pregunta;
- ver la publicación;
- visitar un recurso;
- pedir un ejemplo;
- solicitar un análisis.

Preferencia:

> **máximo un CTA comercial fuerte por conjunto de historias**, salvo campañas específicas.

---

## 9. Criterios visuales

Aplicar siempre la línea visual de Atacama Labs:

- azul Atacama `#0F5CED`;
- azul oscuro `#041228`;
- blanco y neutros claros;
- logo oficial;
- tipografía limpia;
- composición con aire;
- una idea principal por historia;
- diseño profesional, claro y humano;
- evitar estética genérica de IA;
- evitar neones, robots, circuitos y saturación visual.

La llamita puede utilizarse cuando aporte personalidad, pero no debe aparecer por obligación.

### Regla de logos

Siempre usar archivos oficiales de Atacama Labs.

Nunca:
- reconstruir el logo;
- reemplazarlo por una montaña similar;
- generar una aproximación mediante IA;
- cambiar arbitrariamente sus colores o proporciones.

---

## 10. Formato de propuesta que debe entregar el sistema

El sistema NO debe publicar automáticamente.

Debe presentar primero una propuesta para aprobación humana.

Formato requerido:

### PROPUESTA DE STORIES — [fecha]

**Contexto del día**
- Publicación del feed: [sí/no + cuál]
- Historias recientes relevantes: [resumen]
- Tema sugerido: [tema]

### Historia 1
- **Tipo:** REPOST_FEED / SUPPORT_STORY / ORIGINAL_STORY
- **Objetivo:** ...
- **Copy:** ...
- **Visual:** ...
- **Interacción/CTA:** ...
- **Hora sugerida:** ...
- **Por qué:** ...

### Historia 2
[igual formato]

### Historia 3
[igual formato]

### Decisión editorial
Explicar brevemente por qué recomienda:
- 0,
- 1,
- 2,
- o 3 historias.

El sistema debe poder decir:

> “Hoy recomiendo solo una historia.”

O:

> “Hoy no agregaría más historias porque el repost cumple el objetivo.”

---

## 11. Flujo de aprobación

Estados:

1. `PROPOSED`
2. `SCHEDULED`
3. `REVIEWED`
4. `PUBLISHED`

Estados alternativos:
- `EDITED`
- `RESCHEDULED`
- `CANCELLED`

Regla crítica:

> **El sistema puede programar automáticamente en el Social Planner. La publicación final queda bajo revisión de Christian en el Social Planner.**

El sistema puede sugerir, redactar, diseñar, recomendar horarios y dejar las historias programadas en el Social Planner. Christian revisa allí y decide si mantener, modificar, reprogramar o eliminar cada historia antes de su publicación.

---

## 12. Lógica resumida para automatización

```text
REVISAR CALENDARIO DE CONTENIDO
        ↓
¿HAY PUBLICACIÓN NUEVA HOY?
        ↓
   SÍ               NO
   ↓                 ↓
considerar         buscar idea
REPOST_FEED        ORIGINAL
   ↓                 ↓
¿APORTA ALGO MÁS?  ¿HAY VALOR REAL?
   ↓                 ↓
0–2 SUPPORT        0–3 STORIES
        ↓
REVISAR REPETICIÓN / SATURACIÓN
        ↓
GENERAR PROPUESTA
        ↓
PROGRAMAR EN SOCIAL PLANNER
        ↓
REVISIÓN HUMANA
        ↓
MANTENER / EDITAR / REPROGRAMAR / ELIMINAR
```

---

## 13. Regla final

> **Feed = contenido principal y durable.**  
> **Stories = distribución, conversación, demostración y contexto.**

Stories no necesita convertirse en un segundo feed.

Atacama Labs debe publicar historias cuando exista algo útil que:
- mostrar,
- explicar,
- preguntar,
- demostrar,
- amplificar,
- o conversar.

Nunca simplemente para llenar espacio.
