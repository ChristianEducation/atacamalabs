# Gmail para la prospección de Atacama OS — plan (sin implementar, sin envíos)

**Estado hoy (verificado el 5-oct-2026):** no existe ninguna credencial de Gmail en n8n, Hermes ni OpenClaw; el workflow `06 Gmail Sync` es un esqueleto que falla a propósito; la tabla `outreach` está preparada (`gmail_message_id`, `gmail_thread_id`, `sent_at`, `replied_at`, `status`, `direction`) y 05 solo crea borradores. **Nada de esto se activa sin tu autorización expresa y sin el dominio de envío.**

## 1. Estrategia de dominio (recomendación)

| Decisión | Recomendación | Por qué |
|---|---|---|
| Dónde se envía el frío | **Un dominio secundario**, no `atacamalabs.cl` | Un correo frío mal recibido daña la reputación del dominio que usa tu sitio, GHL y las confirmaciones del Diagnóstico |
| Nombre | Parecido y creíble, p. ej. `atacamalabs.co`, `hola-atacamalabs.cl` o `atacamalabs.com` (cualquiera disponible); la firma y la web siguen siendo `atacamalabs.cl` | El destinatario debe poder verificar quién eres |
| Casillas | 1 o 2 buzones de Google Workspace (p. ej. `christian@…`), con foto y firma reales | Persona real, no `info@` |
| Volumen | Semana 1-2: 5-10 al día; semanas 3-6: subir gradualmente; techo seguro 30-50 por buzón al día | Calentamiento de 4-6 semanas |
| Objetivo | **Hasta 20 correos buenos al día**, nunca una cuota: si hay 7 prospectos que pasan el gate, se envían 7 | Calidad por sobre cantidad |
| Para tus primeras 10 clínicas | Pueden salir desde tu alias oficial (volumen mínimo, escritos a mano); el dominio secundario es para pasar de unos 30-40 correos por semana | Evita bloquear el lanzamiento por infraestructura |

## 2. DNS requerido (en el dominio secundario)

1. **MX:** los de Google Workspace (`aspmx.l.google.com` y alternos).
2. **SPF:** `v=spf1 include:_spf.google.com ~all` (un solo registro SPF).
3. **DKIM:** generar la clave de 2048 bits en Workspace Admin → Gmail → Autenticar correo; publicar el TXT `google._domainkey`.
4. **DMARC:** partir con `v=DMARC1; p=none; rua=mailto:dmarc@<dominio>; adkim=s; aspf=s` y pasar a `quarantine` cuando los informes salgan limpios 2-4 semanas.
5. **Redirección web:** el dominio secundario redirige a `https://atacamalabs.cl` (un buzón sin sitio parece sospechoso).
6. **Google Postmaster Tools:** registrar el dominio para vigilar reputación (quejas < 0,1 %, rebotes < 2 %).
7. **Sin píxeles ni acortadores de enlaces** al inicio: texto simple, un solo enlace (tu sitio).

## 3. OAuth de Gmail en n8n

1. Google Cloud → proyecto nuevo "Atacama OS" → habilitar *Gmail API*.
2. Pantalla de consentimiento **Interna** (si el buzón es de Workspace, no requiere verificación de Google).
3. Credencial OAuth «Aplicación web» con redirect `https://n8n.srv1650725.hstgr.cloud/rest/oauth2-credential/callback`.
4. Scopes mínimos: `gmail.send`, `gmail.readonly` y `gmail.modify` (solo si se usan etiquetas para marcar hilos procesados).
5. En n8n: credencial `Atacama Labs - Gmail (envío)` (la crea Christian con su sesión; el token de actualización queda cifrado en n8n y nunca pasa por el chat).
6. Una credencial por buzón; el workflow nunca elige remitente libremente.

## 4. Flujo completo (cada paso con aprobación humana)

```
Prospecto aprobado (09) → GHL "Investigado" + borrador en outreach (status=draft)
        ↓  Christian revisa/edita el borrador y lo marca "approved" (Telegram o GHL)
11 Outreach Send  ──►  Gmail (buzón del dominio de envío)
        │   guarda gmail_message_id + gmail_thread_id + sent_at, status=sent
        │   mueve la oportunidad a "Contactado" y crea tarea de seguimiento (+3 días hábiles)
        ▼
06 Gmail Sync (cada 10 min) lee hilos con gmail_thread_id conocido
        ├─ respuesta humana → direction=inbound, replied_at; oportunidad a "Respondió"; cancela seguimientos; alerta
        ├─ rebote (mailer-daemon / 5xx) → contacto "invalid"; cancela seguimientos; sin reintento
        ├─ baja ("no me escriban", "unsubscribe"…) → contacto "do_not_contact"; GHL DND; cancela todo
        └─ autorrespuesta/fuera de oficina → se ignora, el seguimiento sigue
```

### 4.1 Reglas de envío (en el workflow 11, no negociables)
- Solo se envía un `outreach` con `status = approved` y `sent_at IS NULL`.
- **Idempotencia:** `effect_key = send:<outreach_id>`; si existe `gmail_message_id` no se reenvía. Si Gmail responde con error incierto, se reconcilia buscando en "Enviados" antes de reintentar (un reintento ciego duplicaría el correo).
- **Tope diario por buzón** (tabla de calentamiento): si se alcanza, el resto queda para mañana; nunca se supera.
- Ventana de envío: lunes a viernes, 09:00-17:30 hora de Chile, con espaciado aleatorio de 3-8 minutos entre correos.
- **Lista de supresión** (contactos `do_not_contact`, rebotes, dominios que pidieron no recibir): se verifica en 08 (ingesta) y otra vez en 11 (envío).
- Máximo **2 seguimientos** (día 3 y día 7) y solo si no hubo respuesta, rebote ni baja.
- El asunto y el cuerpo vienen del borrador aprobado; el sistema solo agrega la línea de baja y la firma.

### 4.2 Detección de respuestas e hilos
- Se usa `threadId` de Gmail (no el asunto). 06 consulta `users.threads.get` solo de hilos abiertos y marca lo ya procesado con una etiqueta `ATACAMA/procesado`.
- Se registra cada mensaje entrante como fila `outreach` (`direction = inbound`) con el texto (recortado) para que GHL Conversations y el Atacama Daily lo muestren.
- Clasificación determinista primero (cabeceras `Auto-Submitted`, remitente `mailer-daemon`, palabras de baja); solo los casos ambiguos pasan a un LLM, y aun así la acción final es siempre "notificar a Christian", nunca responder solo.

### 4.3 Baja (unsubscribe)
- Cada correo termina con: *"Si prefieres no recibir más mensajes de Atacama Labs, responde 'baja' o usa este enlace."*
- Enlace firmado a `https://atacamalabs.cl/baja?t=<token>` (ruta nueva, sin datos personales en la URL) que marca al contacto como `do_not_contact` en Supabase y activa DND en GHL. Cabecera `List-Unsubscribe` (y `One-Click` si se agregan volúmenes grandes).
- Una baja se respeta de forma inmediata y permanente para ese correo y su dominio de empresa.

## 5. Cumplimiento (Chile)
- Identificar siempre al remitente (nombre, empresa y datos de contacto reales) y dar una forma simple de dejar de recibir mensajes: exigencia práctica para comunicaciones comerciales no solicitadas.
- Escribir solo a correos **publicados por la propia empresa** (regla ya aplicada por el gate de 08: `contact.public = true` con su URL de origen).
- La Ley 21.719 de protección de datos personales entra en vigencia en diciembre de 2026 según fuentes del sector: validar con un abogado antes de escalar volumen.
- **Falta tu dato legal** (razón social, RUT, domicilio) para el pie de los correos y la página `/privacidad`.

## 6. Lo que se necesita de ti para activar (en este orden)
1. Elegir y comprar el dominio secundario, y crear 1 buzón de Google Workspace.
2. Publicar los DNS de la sección 2 (te los preparo como lista exacta para tu proveedor de dominio).
3. Crear la credencial OAuth de Gmail en n8n (sección 3).
4. Dar el visto bueno para construir `11 Outreach Send` y completar `06 Gmail Sync` (se prueba primero con un buzón de prueba y destinatarios propios).
5. Calentar 2-4 semanas con 5-10 envíos al día antes de subir el volumen.
