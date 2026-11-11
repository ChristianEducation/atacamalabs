# Atacama Labs — Playbook de Correos Outbound

**Versión:** 2.0 — 3 de noviembre de 2026 (reemplaza a la v1.0 del 13-oct-2026)
**Objetivo:** Mantener una calidad alta y consistente en los correos outbound de Atacama Labs sin convertirlos en una plantilla rígida.

> **Estándar único.** La estructura, el tono, la cordialidad, las tres viñetas y el cierre los define la **Guía V2** (`ATACAMA-LABS-ESTILO-CORREOS.md`, v2.1), aprobada por Christian el 3-nov-2026. Este Playbook es su complemento operativo (investigación, hechos vs inferencias, empresas con tecnología, partners, asuntos, seguimientos) y **no puede contradecirla**. Si algo difiere, manda la Guía V2.
>
> **Qué cambió respecto de la v1.0:** (1) el primer correo ya **no** busca solo una respuesta con «un solo problema»: presenta **tres aplicaciones concretas** «beneficio: solución» para el rubro; (2) el cierre **sí invita cordialmente a una breve conversación o reunión**; (3) largo orientativo **130–190 palabras**; (4) saludo «Estimado/a …:» con «Junto con saludar, espero que se encuentre muy bien.»; (5) firma corporativa nueva con foto. Se mantienen: la investigación es invisible, no afirmar problemas sin evidencia, no prometer cifras ni capacidades no validadas, el agente trabaja dentro del proceso (no es un chatbot).

---

## 1. Principio central

> **La investigación debe ser invisible. Personaliza el problema, no la evidencia de que investigaste.**

La investigación del prospecto sirve para entender su operación, elegir las tres aplicaciones más relevantes y escribir con el vocabulario de su rubro. No debe usarse para demostrar cuánto investigamos a la empresa.

El correo debe sentirse como una observación profesional y natural, no como:

- “revisé toda tu web”;
- “vi que tienen dos sucursales, tres WhatsApp y 14 servicios”;
- “sé exactamente cómo funciona su operación”.

La persona debe pensar:

> “Esto podría pasar perfectamente en una empresa como la nuestra.”

No:

> “¿Por qué esta persona sabe todo esto sobre nosotros?”

---

## 2. Qué debe lograr el primer correo

El primer correo **no tiene que vender todo Atacama Labs**. Su objetivo es que el prospecto entienda **qué podemos resolver y qué beneficio obtendría**, y abrir una conversación breve.

Debe conseguir que piense alguna de estas cosas:

- “Sí, eso nos pasa.”
- “Ese proceso efectivamente es manual.”
- “Tenemos otro problema parecido.”
- “Podría tener sentido hablar.”

El correo **invita** a una breve conversación o reunión, sin presionar. No promete demos, propuestas, precios ni integraciones que no estén validados.

---

## 3. Voz de Atacama Labs

Los correos deben sonar:

- profesionales;
- humanos y cercanos;
- directos y concretos;
- seguros, pero no arrogantes;
- sin presión comercial;
- tecnológicos sin hablar innecesariamente de tecnología.

Atacama Labs no vende “IA porque sí”. Identifica trabajo repetitivo u operativo y construye agentes que pueden asumirlo, coordinarlo o dejarlo preparado para una persona.

### Evitar

- lenguaje grandilocuente;
- “revolucionar”;
- “transformar su empresa”;
- “potenciar su negocio con IA”;
- “asistente inteligente 24/7” como frase genérica;
- promesas de ahorro no comprobadas;
- afirmar que algo es manual sin evidencia suficiente;
- sonar como una agencia de chatbots.

---

## 4. El saludo y la cordialidad

El correo comienza siempre de forma profesional, con la cordialidad de la guía.

### Si existe un nombre confiable

- `Estimado Ignacio:`
- `Estimada María José:`
- `Estimado/a Roberto:` (cuando no se conoce con certeza el género)

### Si no existe una persona confiable

- `Estimado equipo de SETECMA:`
- `Estimado equipo de Labclin:`

### Cordialidad (obligatoria)

`Junto con saludar, espero que se encuentre muy bien.` (con «equipo»: «se encuentren») o `Esperando que se encuentre bien, …`

### Evitar

- `Hola,` / `Hola equipo,`;
- nombres deducidos con baja confianza;
- «Estimado contacto» o nombres de casillas genéricas.

---

## 5. Estructura estándar (Guía V2)

1. Asunto específico.
2. Saludo + cordialidad.
3. Presentación breve de Atacama Labs (1–2 frases): agentes de inteligencia artificial, automatización, software e integración de sistemas.
4. **«En el sector [rubro], por ejemplo, podemos ayudar a:»** + **tres viñetas** `Beneficio o dolor que se resuelve: solución concreta`.
5. Enfoque: «Primero entendemos cómo trabaja cada empresa y después elegimos la tecnología.»
6. Cierre cordial: invitación a una breve conversación o reunión, sin presión + «Quedo atento a sus comentarios.».
7. «Saludos cordiales,» y firma: **las agrega el sistema**; el texto guardado termina en el punto 6.

### Las tres viñetas

- Soluciones **concretas de Atacama Labs**, conectadas con **dolores del prospecto** y su **consecuencia comercial o económica** (sin cifras inventadas).
- No enumerar tecnologías ni presentar únicamente problemas.
- Elegir las tres más relevantes para esa empresa, su rubro y el cargo de quien recibe; una sobre atención/entrada de trabajo, otra sobre seguimiento/operación y otra sobre sistemas/integración suele ser una buena cobertura, pero no es obligatoria.
- Ejemplo (corredora de seguros): «Evitar oportunidades de venta perdidas: atendiendo y dando seguimiento a potenciales clientes.» · «Reducir cotizaciones sin respuesta: automatizando el seguimiento comercial.» · «Disminuir tareas administrativas: conectando WhatsApp, correo y CRM.»
- Los kits por rubro (corredoras de propiedades y de seguros, salud, hoteles, restaurantes, casinos escolares y corporativos, genérico) viven en la Guía V2 §4 y en `scripts/outreach/email-v2-core.mjs` (plantilla de respaldo del sistema).

### El agente trabaja dentro del proceso

Mantener siempre la idea: el agente **trabaja dentro del proceso** (reúne información, completa datos, clasifica, consulta sistemas, registra, hace seguimiento o deja el caso listo para una persona). No solo conversa.

### Flexibilidad

No es una plantilla palabra por palabra: se personalizan el asunto, el rubro, las viñetas y, si corresponde, el cierre. La presentación y el enfoque son estables.

---

## 6. Investigación: cómo usarla

La investigación puede incluir: servicios; canales de contacto; formulario; WhatsApp; proceso comercial; ubicación; tipos de clientes; productos; operaciones; software visible; cargos; casos de uso; información pública del sitio o LinkedIn.

Pero el correo debe utilizar únicamente la cantidad de contexto necesaria para elegir las viñetas y formular una hipótesis razonable.

### Correcto

Investigación interna:

> Arriendan maquinaria para minería, reciben requerimientos por WhatsApp y correo, despachan en la Región de Antofagasta.

Correo (viñeta):

> Evitar cotizaciones que se enfrían: reuniendo equipo, ubicación y plazo antes de cotizar y haciendo seguimiento a cada solicitud.

### Incorrecto

> Vi que en su web coordinan entregas por dos números de WhatsApp, usan el correo contacto@empresa.cl y despachan específicamente a Calama, Mejillones y Antofagasta.

Aunque sea verdadero, se siente excesivamente investigado.

---

## 7. No confundir evidencia con hipótesis

El generador debe distinguir entre:

### Hecho comprobado

Puede usarse como contexto si aporta.

### Inferencia razonable

Debe escribirse como posibilidad, nunca como hecho.

### Hipótesis débil

No debe afirmarse.

**MAL**

> Su equipo pierde mucho tiempo contestando las mismas consultas.

**MEJOR**

> En el sector [rubro], por ejemplo, podemos ayudar a reducir las consultas repetidas…

---

## 8. Empresas que ya tienen tecnología

Si el prospecto ya tiene plataforma propia, software, CRM, automatizaciones, IA, sistema de reservas o portal de clientes, no asumir que todo es manual. Buscar la capa que puede seguir existiendo alrededor del sistema: intake antes de ingresar al software, coordinación entre sistemas, seguimiento, recopilación documental, información faltante, tareas entre cliente y plataforma. El tono debe ser de complementariedad.

---

## 9. Partners o empresas similares a Atacama Labs

No enviarles el mismo correo que a un cliente final. El ángulo puede ser integración, complementariedad, white-label, implementación, capa adicional o alianza. No intentar convencer a una empresa de automatización de que “debería automatizarse”.

---

## 10. Asuntos

El asunto debe parecer un correo real, específico del rubro, la empresa o el proceso (4–9 palabras aproximadamente).

**Mayúscula inicial (decisión de Christian, 22-oct-2026):** el asunto empieza con mayúscula y el resto va en minúsculas naturales, como una frase (no Title Case). El sistema lo corrige solo al guardar un correo inicial; los seguimientos y respuestas conservan el asunto original para no romper el hilo.

Ejemplos:

- `Una idea para mejorar los procesos de [Empresa]`
- `Seguimiento de cotizaciones y renovaciones en [Corredora]`
- `Atención y seguimiento de consultas en [Hotel]`
- `Postulaciones de arriendo en [Corredora]`
- `Coordinación de pedidos y pagos en [Casino]`
- `Automatización de consultas y agendamiento en [Centro]`

Evitar: `Potencia tu empresa con IA`, `Automatización con Inteligencia Artificial`, `Tenemos una solución para ustedes`, emojis, MAYÚSCULAS y asuntos publicitarios o con promesas.

---

## 11. Largo

Objetivo orientativo: **130–190 palabras** (guía V2), priorizando claridad y naturalidad. Puede ser más corto si hay contacto previo. No agregar contenido únicamente para alcanzar una cantidad de palabras: cada párrafo y cada viñeta debe cumplir una función.

---

## 12. Expresiones que normalmente deben evitarse

Evitar como fórmula de apertura: `Vi que...`, `Veo que...`, `Revisando su sitio...`, `Estuve mirando...`, `En su web dicen...`, `Noté que...`, `Me fijé que...`.

También evitar repetir: `Imagino que...`, `Ahí suele aparecer el trabajo repetitivo...`.

Estas expresiones no están prohibidas lingüísticamente, pero no deben convertirse en la estructura estándar.

---

## 13. Compromisos que el primer correo NO debe hacer

El primer correo **sí** invita a una breve conversación o reunión (es el cierre estándar). Lo que **no** debe hacer es prometer algo que Atacama Labs no tiene preparado o validado:

- una demo o prueba gratuita;
- una propuesta, cotización, presupuesto o auditoría concreta;
- precios, descuentos o plazos;
- cifras o porcentajes de ahorro o resultados;
- integraciones nativas o automatizaciones ya listas;
- un video, un flujo preparado o un ejemplo que no exista.

Solo usar algo así si el recurso existe de verdad y existe una razón comercial para ofrecerlo (el sistema lo permite con `allow_offer`).

---

## 14. Flexibilidad obligatoria

El generador NO debe tratar este documento como una plantilla palabra por palabra. La estructura es estable, pero debe variar naturalmente: las viñetas (según rubro, empresa y contexto), el asunto y, si corresponde, el cierre. Dos correos consecutivos no deberían parecer copias donde solo cambia el nombre de la empresa: **las viñetas son lo que los diferencia**.

> **Consistencia de criterio, diversidad de redacción.**

---

## 15. Checklist antes de guardar un correo

### Saludo y cordialidad
- [ ] Usa `Estimado/a [nombre]:` con nombre confiable, o `Estimado equipo de [Empresa]:`.
- [ ] Incluye «Junto con saludar, espero que se encuentre muy bien.» (o equivalente).

### Personalización
- [ ] El asunto y las viñetas son específicos para esa empresa y rubro.
- [ ] No revela innecesariamente la investigación realizada.

### Viñetas
- [ ] Hay **exactamente tres**, con el formato «beneficio o dolor que se resuelve: solución concreta».
- [ ] Conectan dolor y consecuencia comercial o económica, sin cifras ni tecnologías enumeradas.
- [ ] No presentan una inferencia como un hecho ni atribuyen problemas sin evidencia.

### Atacama Labs
- [ ] Explica un trabajo que un agente podría ejecutar y no lo presenta como un simple chatbot.
- [ ] No promete capacidades que no están disponibles.

### Cierre
- [ ] Invita cordialmente a una breve conversación o reunión, sin presión.
- [ ] No promete demo, propuesta, precios ni recursos inexistentes.
- [ ] No incluye despedida ni firma (las agrega el sistema).

### Calidad
- [ ] Suena escrito por una persona y no parece una plantilla.
- [ ] No utiliza lenguaje de marketing genérico.
- [ ] Tiene aproximadamente 130–190 palabras.
- [ ] Sus viñetas no son demasiado parecidas a las de los últimos correos.

---

## 16. Bloque de instrucciones para el generador

### SYSTEM RULE — ATACAMA LABS OUTBOUND EMAIL (V2)

Redacta un correo outbound profesional, cercano y breve en nombre de Christian, fundador de Atacama Labs, siguiendo la Guía V2 (`ATACAMA-LABS-ESTILO-CORREOS.md`).

Tu objetivo es que el prospecto entienda qué puede resolver Atacama Labs en su rubro y qué beneficio obtendría, y abrir una conversación breve. Usa toda la investigación disponible para comprender el negocio y elegir las tres aplicaciones más relevantes, pero no demuestres explícitamente cuánto investigaste: la investigación es invisible.

#### Saludo

`Estimado/a [primer nombre]:` si hay un nombre confiable; si no, `Estimado equipo de [empresa]:`. Nunca «Hola». Luego: «Junto con saludar, espero que se encuentre muy bien.»

#### Contenido

1. Presenta brevemente Atacama Labs: agentes de inteligencia artificial, automatización, software e integración de sistemas que se conectan con las herramientas de la empresa. Nunca «chatbots».
2. «En el sector [rubro], por ejemplo, podemos ayudar a:» + **exactamente tres viñetas** (cada una empieza con «- ») con el formato «Beneficio o dolor que se resuelve: solución concreta de Atacama Labs», personalizadas según empresa, rubro y contexto investigado. No enumeres tecnologías ni presentes solo problemas; no uses cifras.
3. «Primero entendemos cómo trabaja cada empresa y después elegimos la tecnología.»
4. Cierre cordial: invitación a una breve conversación o reunión, sin presión; luego «Quedo atento a sus comentarios.».

No afirmes que el prospecto tiene un problema específico sin evidencia; no prometas cifras, propuestas, demos, precios ni integraciones no validadas. No escribas despedida ni firma: el sistema agrega «Saludos cordiales,» y la firma corporativa.

#### Estilo

- Profesional, cercano, directo, sin exageraciones ni presión.
- 130–190 palabras.
- Asunto específico del rubro, la empresa o el proceso.
- No uses de forma repetitiva: “Vi que…”, “Veo que…”, “Revisando su sitio…”, “Estuve mirando…”, “Imagino que…”, “Ahí suele aparecer el trabajo repetitivo…”.

Antes de entregar, comprueba el checklist de la sección 15. Si alguna respuesta genera dudas, reescribe.

---

## 17. Follow-ups outbound (revisión 22-oct-2026: secuencia de 4 correos)

Los seguimientos no deben prometer demos, ejemplos, videos, propuestas, precios ni reuniones que no estén realmente preparados. Siguen siendo borradores: nunca se envían sin la aprobación de Christian. **Esta sección no cambia con la Guía V2** (los seguimientos son breves, hilan sobre el correo inicial y no repiten la presentación); el sistema les agrega «Saludos cordiales,» y la misma firma.

**Secuencia (días hábiles desde el primer envío, mismo hilo con el asunto original y «Re:»):**

| Correo | Día | Qué es | Largo |
|---|---|---|---|
| 1 | 0 | Primer correo (Guía V2) | 130–190 palabras |
| 2 (seguimiento 1) | 4 | **El dolor del rubro**: contexto concreto de cómo se rompe el proceso y qué hace el agente, sin vender más de la cuenta | 100–170 |
| 3 (seguimiento 2) | 9 | **Valor práctico**: algo útil aunque no cambien nada (checklist, cuenta simple, patrón del rubro) y una pregunta fácil | 100–170 |
| 4 (seguimiento 3) | 18 | **Cierre del hilo**: sin presión, puerta abierta, pide indicar con quién conviene hablar si no corresponde | 40–70 |

Reglas de los seguimientos 1 y 2:

- Cada toque trae algo nuevo. Prohibido el «solo para saber si viste mi correo» / «retomo por si quedó abajo» como contenido único.
- El dolor se plantea como patrón del rubro («suele ocurrir…», «en los casinos donde…»), nunca como algo observado o afirmado de esa empresa.
- Una sola pregunta, conversacional y de baja presión. Las cuentas de ejemplo usan números ilustrativos («por ejemplo»), nunca porcentajes ni resultados prometidos.
- El «por ejemplo» que ilustra una cuenta NO es ofrecer un ejemplo; ofrecer «te mando un ejemplo / una demo / una propuesta» sigue prohibido en los seguimientos.
- El correo 4 no vuelve a presentar la solución ni hace preguntas.
- Las plantillas por rubro (corredoras, clínicas/salud, casinos de colegios, casinos de empresas y genérico) viven en `scripts/outreach/followup-templates.mjs` y el humano las edita antes de aprobar.

### Foco comercial de 2 semanas (23-oct a 6-nov-2026)

Solo tres rubros y solo la Región de Antofagasta: corredoras de propiedades (postulaciones y su evaluación contra requisitos), clínicas/consultas dentales, veterinarias y profesionales de la salud independientes (agenda, seguimiento y confirmación para bajar el no-show) y casinos/servicios de alimentación (colegios que aún publican datos de transferencia; empresas de alimentación para minería, retail o corporativo). Meta: 15 prospectos nuevos por día hábil (5 por rubro). El primer correo usa el kit de tres viñetas de ese rubro (Guía V2 §4), sin «vi que» y sin precios.

### Nota de implementación

- La despedida («Saludos cordiales,») y la firma corporativa (logo, foto circular, Christian Wevar · Fundador, atacamalabs.cl, contacto@atacamalabs.cl) las agrega el sistema al enviar; las imágenes van incrustadas en el correo. La firma para Gmail manual vive en `brand/outreach/firma/Firma_Gmail_Christian.html`.
- Los asuntos de los correos iniciales llevan mayúscula inicial; los seguimientos conservan el asunto original para no romper el hilo.
- El linter (`scripts/outreach/coldmail-core.mjs`), las plantillas de respaldo (`scripts/outreach/email-v2-core.mjs`), los prompts de Hermes y los workflows n8n 18, 19 y 21 implementan este estándar. En los borradores automáticos de Hermes (`auto=true`) incumplir el saludo, la cordialidad o las tres viñetas **bloquea** el guardado; en los guardados manuales de Christian solo resta puntos.

---

## 18. Principio final

El mejor correo de Atacama Labs no es el que demuestra que sabemos mucho sobre la empresa.

Es el que hace que el destinatario piense:

> **“Sí, ese trabajo existe acá, y esto es lo que podrían resolver por mí.”**

Y responda.
