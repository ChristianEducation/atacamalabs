# ASTER 2026 · Herramienta `generar_documento_demo` en Lety

Valores NO secretos. La llave está en el archivo local `.env.aster.local` (carpeta `atacama-labs-app`, ignorado por git) bajo `ASTER_DEMO_KEY`; la URL, bajo `ASTER_DEMO_URL`. Pégalas en Lety, no en chats ni documentos.

## Qué buscar en el panel de Lety (en este orden)
1. **Herramientas / Acciones personalizadas** → «Webhook», «HTTP request», «API», «Custom action» o MCP. Necesitamos poder definir: método **POST**, URL, **una cabecera personalizada**, un cuerpo JSON con campos que rellena el agente y leer la respuesta JSON.
2. Si solo ofrece **MCP**: dímelo y expongo la misma función como servidor MCP (otra pieza; no la construyo hasta saberlo).
3. Si el panel solo ofrece Google Docs/Drive/Gmail nativos y ningún webhook: dímelo; es el caso que obliga a decidir de nuevo (Ruta C).

## Configuración de la herramienta
| Campo | Valor |
|---|---|
| Nombre | `generar_documento_demo` |
| Método | `POST` |
| URL | valor de `ASTER_DEMO_URL` (`https://n8n.srv1650725.hstgr.cloud/webhook/atacama-aster-demo-document`) |
| Cabecera | `X-Atacama-Key: <ASTER_DEMO_KEY>` · `Content-Type: application/json` |
| Tiempo de espera | ≥ 30 s (la respuesta normal tarda 2–6 s con Drive y Gmail) |
| Descripción para el agente | «Genera el borrador PDF del documento, lo guarda en Drive y lo envía por correo adjunto. Úsala SOLO después de que la persona confirmó el resumen y autorizó el correo. No la llames dos veces para la misma solicitud.» |

### Cuerpo (JSON) — campos que rellena el agente
Requeridos: `document_type`, `email`, `consent_to_email` (booleano `true`) y al menos uno de `raw_narrative` / `verified_facts` / `summary`.
```json
{
  "request_id": "id estable de esta solicitud (si Lety lo tiene; si no, omitir)",
  "document_type": "informe_tecnico | observacion_preventiva | parte_turno | solicitud_trabajo | informe_general | informe_avance | novedades_logisticas | acta_reunion",
  "company_name": "opcional",
  "person_name": "opcional",
  "email": "correo confirmado por la persona",
  "consent_to_email": true,
  "activity_location": "opcional",
  "asset_id": "opcional",
  "reported_at": "opcional: fecha del HECHO tal como la dijo la persona",
  "summary": "opcional: 1–3 frases redactadas por el agente",
  "raw_narrative": "transcripción/relato tal cual",
  "verified_facts": ["hecho explícito"],
  "observations": ["observación narrada"],
  "actions_taken": ["acción que dijo haber hecho"],
  "pending_actions": [{"description": "texto", "owner": null, "due_date": null}],
  "evidence": ["solo adjuntos realmente recibidos"],
  "notes": "opcional"
}
```
Diferencias con `05-CONTRATO-HERRAMIENTA.json`: se agregan `summary` (opcional), tres tipos extra (`informe_avance`, `novedades_logisticas`, `acta_reunion`, que cubren los documentos F/G/H de la base de conocimiento) y `evidence` (que el prompt maestro ya menciona).

### Respuesta (siempre JSON, HTTP 200 salvo llave incorrecta → 403)
| `status` | Significado | Qué debe decir Lety |
|---|---|---|
| `completed` | PDF generado, `drive_status: saved`, `email_status: sent` | «Listo. Preparé el borrador [tipo], folio [document_id], y lo envié a [correo].» |
| `partial` | correo enviado, Drive falló | confirmar el envío; no decir que quedó respaldado |
| `failed` | validación o correo fallido (`error_code` / `email_status: failed`) | explicar el motivo (`message`); si es `INVALID_EMAIL` o `CONSENT_REQUIRED`, pedir el dato y volver a intentar |

Campos: `request_id`, `status`, `document_id` (folio `DEMO-AAAAMMDD-NNNN`), `file_name`, `email_status` (`sent|failed|not_sent`), `drive_status` (`saved|failed|not_saved`), `drive_url_internal`, `message`, `error_code`, `duplicate` (true si era un reintento). **`drive_url_internal` es privado: Lety no debe compartirlo con la persona** (el PDF llega adjunto).

Códigos de error: `EMPTY_BODY`, `PAYLOAD_TOO_LARGE`, `VALIDATION_ERROR`, `CONSENT_REQUIRED`, `INVALID_EMAIL`.

## Ajustes al agente (para quien configura Lety)
- Dejar **solo esta herramienta** para generar y enviar. **No** conectar Gmail de Lety a este agente (un único envío).
- El prompt maestro ya dice que no confirme sin `status=completed`/`email_status=sent`; la tabla de arriba lo concreta.
- Si Lety puede pasar un identificador de mensaje/conversación, mapearlo a `request_id`; si no, omitirlo (hay respaldo automático de 10 min).

## Conexiones manuales indispensables (en este orden)
1. **n8n → credencial Google Drive** (OAuth2) — abrir n8n → Credentials → New → «Google Drive OAuth2 API», iniciar sesión con la cuenta autorizada (¿Data Manager Labs?). *Solo tú puedes hacerlo.*
2. En Drive crear la carpeta privada `ATACAMA_DEMO_ASTER_2026` y copiar su ID (la parte final de la URL de la carpeta).
3. **Decidir el buzón emisor.** Única credencial de Gmail existente: «Atacama Labs - Gmail (envío)» (la del outreach comercial). Usarla significa que los correos de la demo salen de ese buzón; el riesgo es mezclar la demo con la reputación del correo comercial. Alternativa: otra cuenta con credencial propia.
4. Abrir el workflow `Atacama Labs - 31 ASTER Demo Documents` (id `Tyqiy6JTYfRY7omb`): asignar credencial al nodo **Drive Upload** y al nodo **Gmail Send**, pegar el ID de carpeta en el nodo **Build** (constante `driveFolderId`), y **activar**. (Si me das el ID de carpeta y confirmas credenciales, lo hago yo por API.)
5. Probar: `node scripts/aster/smoke.mjs <tu-correo>` (envía 1 correo real) y revisar Drive + bandeja.
6. Configurar la herramienta en Lety con la tabla de arriba y probar con un audio real de WhatsApp.
