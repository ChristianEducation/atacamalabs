# Diagnóstico y agenda — Bloque D (nov-2026)

Objetivo: que una persona entienda qué obtiene, cuente brevemente qué necesita, deje sus datos y agende
una «Reunión de diagnóstico» sin preguntas innecesarias. No se tocaron pasos, campos, validaciones del
backend, `/api/leads`, Supabase, n8n, GHL ni Nayra.

## 1. Preguntas: antes y ahora

Los `id` (analítica, `diagnostic_data`, lead) no cambian; solo el texto que ve la persona.

| Pantalla | Antes | Ahora |
|---|---|---|
| Título | «Cuéntanos qué quieres delegar / mejorar / sobre tu nueva web…» (según servicio) | «Conversemos sobre tu negocio.» (web: «…tu nueva web.»; plan Ecommerce: «…tu Ecommerce.») |
| Bajada | «Te tomará menos de un minuto. Con unas pocas respuestas podremos llegar a la conversación entendiendo tu caso.» | «Cuéntanos brevemente qué necesitas. En la reunión revisaremos tu caso, las posibles soluciones y los próximos pasos.» |
| Etiqueta superior | DIAGNÓSTICO | REUNIÓN DE DIAGNÓSTICO |
| Servicio (solo si el CTA no lo trajo) | «¿Qué quieres mejorar?» Agentes · Automatizar un proceso / A Medida · Página Web · No estoy seguro | «¿Con qué te gustaría que te ayudemos?» Atender, agendar o vender con un agente de IA · Automatizar un proceso de mi empresa · Crear o renovar mi página web · Todavía no estoy seguro |
| Agentes | «¿Qué quieres que haga tu agente?» Vender · Atender consultas · Agendar · Cobrar · Administración / Finanzas · Automatizar otro proceso · No estoy seguro | «¿Qué te gustaría mejorar primero?» Responder consultas y atender clientes · Captar interesados y hacer seguimiento · Gestionar citas y reservas · Recordar pagos y gestionar cobranza · Reducir tareas administrativas · Automatizar otro proceso · Todavía no estoy seguro |
| Agentes con interés ya conocido | «Cuéntanos brevemente qué quieres delegar.» | «Cuéntanos brevemente qué te gustaría resolver (opcional).» (ya era opcional; ahora lo dice) |
| Web con plan | «¿Qué quieres conseguir principalmente?» Conseguir contactos · Mostrar servicios · Vender online · Renovar una web existente · Otro | «¿Qué quieres conseguir con tu web?» Que más personas me contacten · Mostrar mis servicios o productos · Vender por internet · Renovar mi web actual · Otro objetivo o todavía no lo sé |
| Web sin plan | «¿Qué necesitas?» Landing · Web Profesional · Ecommerce · No estoy seguro | «¿Qué tipo de página necesitas?» Una página simple para presentar mi oferta (Landing) · Varias páginas para explicar mi empresa (Web Profesional) · Una tienda para vender por internet (Ecommerce) · Todavía no estoy seguro |
| A medida / general | Caja de texto obligatoria, error «Cuéntanos un poco más para llegar preparados.» | Misma caja y misma regla (≥ 10 caracteres), con apoyo «Con una frase basta. Si todavía no lo tienes claro, lo conversamos en la reunión.», ejemplo en la caja y error «Con una frase basta…» |
| Datos | «¿Cómo te contactamos?» | «¿Cómo coordinamos la reunión?»; ejemplo de formato en WhatsApp (+56 9 1234 5678) |
| Agenda | «Reunión de activación · revisamos tu necesidad, validamos el alcance y resolvemos tus dudas.» | «Reunión de diagnóstico · conversamos sobre tu caso, las posibles soluciones y los próximos pasos. Los horarios se muestran en tu zona horaria.» |

El texto del `message` que recibe el backend se conserva (por ejemplo, el objetivo web sigue viajando como
«Conseguir contactos», aunque la opción se muestre distinta).

## 2. Contexto que ya conocemos

Sin preguntas ni pasos nuevos:

- **Rubro** (`?industria=`): chip «Rubro: Salud» bajo la bajada, y el ejemplo de la caja de texto reutiliza la
  primera situación que ya describe la página de ese rubro (p. ej. Inmobiliarias: «Por ejemplo: las mismas
  preguntas sobre propiedades se repiten.»). Nada inventado: sale de `industries.ts`.
- **Plan** (`?plan=`): chip «Plan: Esencial» (agentes) o «Formato: Ecommerce» (web). Antes iba escondido en la
  línea «Paso 1 de 2 · Esencial»; ahora está en el encabezado y el progreso queda solo con el paso.
- **Servicio / interés** ya traídos por el CTA siguen saltándose la pregunta correspondiente.
- **Llegada directa**: recorrido general (servicio → texto → datos → agenda), con «Todavía no estoy seguro».

## 3. Zona horaria de la agenda

**Resultado: no hay un error de New York.** El calendario de GHL embebido en `/diagnostico`
(`https://api.leadconnectorhq.com/widget/booking/D3CUkoKxRyze3Kpt8sa9`, en `src/content/site.json`)
toma la zona del **navegador de quien lo abre** y se la envía al API de cupos
(`free-slots?...&timezone=<zona del navegador>`). Con el navegador en `America/New_York` muestra New York;
con `America/Santiago`, Santiago. El «New York» de pruebas anteriores era la zona del navegador de prueba.

Comprobado con navegador real (sin reservar nada; solo se abrió el calendario):

| Navegador | Zona enviada a GHL | Etiqueta visible | Primer cupo del 2-nov |
|---|---|---|---|
| America/Santiago | America/Santiago | GMT-03:00 America/Santiago (GMT-3) | 17:00 |
| America/New_York | America/New_York | GMT-05:00 America/New_York (EST) | 15:00 |
| Asia/Tokyo | Asia/Tokyo | — | 05:00 (3-nov) |
| Europe/Madrid | Europe/Madrid | — | — |

17:00 Santiago (-03:00) = 15:00 Nueva York (-05:00) = 20:00 UTC: es el mismo instante. Lo mismo desde
`/diagnostico` (flujo completo con el envío del lead interceptado): Santiago → `America/Santiago`; New York →
`America/New_York`. Por eso **no se cambió nada en el código ni en GHL**: el comportamiento para visitantes
internacionales ya es el correcto, y el widget deja cambiar la zona dentro del calendario.

Cambio de hora de Chile: lo resuelve el widget con la base de zonas del navegador (sin conversiones manuales
en el sitio). En 2027 Chile pasa a UTC-4 el 4-abr (03:00 UTC) y vuelve a UTC-3 el 5-sep.

**Pendiente en el panel de GHL (no tocado):** el calendario solo ofrece cupos a corto plazo (en la prueba, hasta fin de noviembre), así que
no se pudo medir abril de 2027. Según las notas de la configuración (`docs/ATACAMA-OS-IMPLEMENTATION.md` C1),
los horarios de atención del calendario están guardados en UTC a nivel de usuario; con el cambio de hora de
abril de 2027 los cupos se correrían una hora. Corrección recomendada (la hace una persona en GHL):
*Settings → My Profile → Time Zone del usuario asignado al calendario = `America/Santiago`* y, en la misma
operación, ajustar *Calendars → Reunión de activación → Availability* (restar 3 h a los horarios guardados en
UTC) verificando después con cupos reales. No modificar el calendario sin ese chequeo.

## 4. Nombre de la reunión

En el sitio ya es «Reunión de diagnóstico». El calendario embebido todavía muestra el nombre y la descripción
configurados en GHL («Reunión de activación» / «Revisamos tu necesidad, validamos el alcance…»), y esos textos
también salen en los correos de confirmación de GHL. Para unificarlo hay que editarlos en
*GHL → Calendars → Calendar Settings → nombre y descripción*. El workflow n8n **07 Booking Sync** filtra por el
`calendarId` (`D3CUkoKxRyze3Kpt8sa9`), no por el nombre, así que renombrar el calendario no lo rompe.
Descripción sugerida: «Conversamos sobre tu caso, las posibles soluciones y los próximos pasos.»

## 5. Decisiones que no se tomaron (necesitan autorización)

1. **Caja de texto obligatoria en A Medida / «No estoy seguro» (≥ 10 caracteres).** Es la única pregunta que
   frena a quien no sabe qué necesita. El backend no la exige (hay mensaje por defecto: «Quiere conversar
   sobre su caso.»). Recomendación: hacerla opcional, como ya es en Agentes. No se cambió.
2. **«¿Algo más que quieras contarnos? (opcional)»** en el paso de datos se suma a la pregunta anterior y es
   la parte más repetitiva. Recomendación: plegarla detrás de un enlace «Agregar un comentario». No se cambió.
3. **Nombre, empresa, email y WhatsApp obligatorios.** Los cuatro son requisito del backend y de Lead Sync
   (contacto en GHL, reserva con el mismo email/teléfono). Recomendación: mantenerlos; si se quiere bajar
   fricción, la empresa sería el candidato a opcional (requiere revisar Lead Sync).
4. **Móvil:** con rubro o plan, el encabezado ocupa casi una pantalla y las opciones de agentes (7) quedan
   bajo el pliegue. Si se quiere, se puede compactar el encabezado en móvil (bajada más corta) sin tocar el
   formulario.
5. **GHL:** renombrar calendario y descripción (sección 4) y revisar la zona del usuario (sección 3).
