# ASTER 2026 · Decisión de componentes (Lety vs n8n)

Estado al 4-nov-2026, noche. Rama `feat/aster-demo-documents-2026` (desde `main`, sin tocar el sitio, Nayra, GHL ni workflows existentes).

## Decisión: Ruta B mínima — Lety recoge y decide; UNA herramienta externa produce, guarda y envía

| Función | Dónde | Por qué |
|---|---|---|
| WhatsApp, audio, comprensión, elección del tipo de documento, 1–3 preguntas, resumen y confirmación | **Lety** | Es el centro de la experiencia; nada de eso se traslada a n8n. |
| Validación, folio, idempotencia, PDF A4 con logo, subida a Drive, correo con adjunto | **1 workflow n8n** (`Atacama Labs - 31 ASTER Demo Documents`) | Ver evidencia abajo. |
| Enviar correo | **solo n8n** | Un único responsable de envío. Lety NO debe tener Gmail activo para este flujo (doble envío). |

### Por qué no la Ruta A (todo nativo en Lety)
No se pudo inspeccionar el panel de Lety desde este entorno (sin acceso), así que **no está demostrado** que Lety pueda (a) crear un PDF de calidad, (b) guardarlo en Drive y (c) adjuntarlo en un correo. La Ruta A solo se elige con esas tres pruebas hechas. La Ruta B no depende de eso: a Lety le basta con **una herramienta HTTP/webhook** que reciba JSON y devuelva JSON. Si Lety demuestra tener las tres capacidades, se puede cambiar, pero a menos de 24 h del evento no conviene.

### Evidencia del entorno (inspección real, sin imprimir secretos)
- n8n `n8n.srv1650725.hstgr.cloud` accesible con la clave local; 51 workflows, ninguno de ASTER. Credenciales existentes reutilizables: `gmailOAuth2 «Atacama Labs - Gmail (envío)»` (la usa el outreach comercial). **No existe credencial de Google Drive.**
- El nodo Code de n8n **bloquea `require('zlib')` y `require('crypto')`** (probado con un workflow desechable). Por eso el PDF se escribe a mano (Helvetica estándar + logo ya comprimido): cero dependencias, cero servidores nuevos, sin Chromium. Sí están disponibles `Buffer`, `prepareBinaryData` y los datos estáticos del workflow (idempotencia).
- No se usó Supabase ni GHL.

## Estado por componente

| Componente | Estado |
|---|---|
| Motor de documentos (PDF A4, 8 tipos de documento) | **IMPLEMENTADO/PROBADO** — 12 pruebas automáticas + ejecución en el n8n real (copia desechable, 0,8 s) |
| Contrato `generar_documento_demo` (validación, consentimiento, idempotencia, errores honestos) | **IMPLEMENTADO/PROBADO** (igual que arriba) |
| Workflow real instalado en n8n (`Tyqiy6JTYfRY7omb`) | **IMPLEMENTADO/SIN INTEGRAR** — inactivo; faltan credenciales Drive y Gmail y el ID de carpeta |
| Guardado en Drive | **BLOQUEADO** — falta credencial OAuth de Google Drive en n8n |
| Envío Gmail con adjunto | **BLOQUEADO** — falta decidir el buzón emisor y asignar la credencial |
| Herramienta en Lety / WhatsApp con audio / KB | **BLOQUEADO** — panel de Lety, solo la persona con acceso |
| Prueba de punta a punta (audio → PDF → Drive → correo) | **NO REALIZADA** |

Ver `LETY-HERRAMIENTA.md` (qué configurar) y `PRUEBAS.md` (evidencia y checklist).

## Limitaciones conocidas del PDF
- Helvetica estándar (no Lato de la plantilla de muestra): mismo diseño, tipografía distinta. Emojis y símbolos fuera de cp1252 se omiten o pasan a «?»; tildes, ñ, ¿¡, comillas y rayas están verificadas.
- Idempotencia en datos estáticos del workflow: dos llamadas **simultáneas** (milisegundos) con el mismo `request_id` podrían duplicar; un reintento posterior no.
- Sin `request_id`, la herramienta deriva uno del correo + tipo + relato y lo respeta 10 minutos (luego un ensayo repetido genera un documento nuevo).

## Plan de recuperación (si algo externo falla el 5-nov)
1. **Gmail falla**: la respuesta trae `status: failed`, `email_status: failed`; el PDF queda en Drive si Drive funciona. Lety debe decir que no pudo enviarlo; enviar a mano el PDF desde Drive.
2. **Drive falla**: `status: partial` — el correo sale igual; el PDF llega adjunto.
3. **n8n caído / webhook sin respuesta**: Lety no confirma nada. Mostrar el video grabado de una ejecución real + `06-PLANTILLA-INFORME-EJEMPLO.pdf` rotulado como muestra.
4. **WhatsApp falla**: webchat de Lety (si está configurado y probado).
