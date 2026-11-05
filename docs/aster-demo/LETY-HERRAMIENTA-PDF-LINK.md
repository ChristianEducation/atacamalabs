# Herramienta de Lety · `generar_documento_pdf` (plantilla corporativa → API2PDF → enlace)

Workflow n8n **«Atacama Labs - 32 ASTER PDF Link»** · id `ODS0bNrLZNFE9Oyi` · **INACTIVO** hasta completar las conexiones y las pruebas reales.
No toca el workflow 31, Nayra ni producción. Sin Gmail y sin guardar el PDF en Drive (fuera de alcance por ahora).

## Estado por componente (5-nov-2026, 00:40)

| Componente | Estado |
|---|---|
| Validación + generación segura de los 4 bloques (título, categoría, metadatos, secciones) | **IMPLEMENTADO / PROBADO** (10 pruebas automáticas + ejecución real en n8n) |
| Lectura de la plantilla desde Google Drive (credencial «Google Drive account») | **PROBADO** con Drive real |
| PDF con API2PDF (credencial «Atacama Labs - API2PDF») y `pdf_url` real | **PROBADO** con API2PDF real: BP-204 y parte de turno, 1 hoja A4 cada uno, ~4 s |
| Diseño corporativo (logo, franja azul, pendientes, bloque «TECNOLOGÍA PARA EL TRABAJO REAL», pie) | **PROBADO** en los PDF reales: `ejemplos-pdf-link/api2pdf-real-*.pdf` |
| Escapado/XSS, reintento por `request_id`, errores honestos | **PROBADO** (el texto `<script>` queda literal en el PDF real; el reintento devuelve el mismo enlace) |
| Webhook protegido (`X-Atacama-Key`) | **PROBADO**: sin llave y con llave incorrecta → HTTP 403 |
| Workflow real `ODS0bNrLZNFE9Oyi` | Credenciales asignadas; **INACTIVO** (la prueba se hizo en una copia desechable ya borrada) |
| Lety → herramienta → WhatsApp | **NO PROBADO** (sin acceso al panel de Lety) |

## Configuración en Lety

- **Nombre:** `generar_documento_pdf`
- **Método:** `POST`
- **URL:** `https://n8n.srv1650725.hstgr.cloud/webhook/atacama-aster-pdf-link` (solo responde cuando el workflow está **activo**)
- **Cabeceras:** `Content-Type: application/json` y `X-Atacama-Key: <la llave de la demo>` (está en `.env.aster.local`, variable `ASTER_DEMO_KEY`; no pegarla en chats ni documentos)
- **Timeout:** 40 s o más (Drive + API2PDF tardan unos segundos)
- **Descripción para el agente:** «Genera un documento PDF corporativo de Atacama Labs a partir de los datos recogidos y devuelve un enlace. Úsala solo cuando la persona ya confirmó el resumen. Envía datos, nunca HTML.»

### Entrada (esquema completo: `ejemplos-pdf-link/schema-entrada.json`)

```json
{
  "request_id": "id-estable-de-la-conversacion",
  "title": "Informe técnico de terreno",
  "category": "REPORTE TÉCNICO / DEMOSTRACIÓN",
  "metadata": [
    { "label": "Equipo", "value": "Bomba BP-204" },
    { "label": "Fecha del hecho", "value": "No informada" },
    { "label": "Ubicación", "value": "No informada" },
    { "label": "Responsable", "value": "No informado" }
  ],
  "sections": [
    { "heading": "Actividad realizada", "text": "Texto. Puede usar **negrita**." },
    { "heading": "Novedades", "items": ["viñeta 1", "viñeta 2"] },
    { "heading": "Estado y pendientes", "pending": { "title": "Revisión pendiente", "text": "Detalle." } }
  ]
}
```

Reglas: `title` y `sections` obligatorios; cada sección necesita `heading` y al menos uno de `text` / `items` / `pending`. Máx. 12 metadatos y 14 secciones (para **una hoja**: 4 o 5 secciones breves y hasta 6 metadatos). La fecha de **emisión** la pone el sistema en la franja azul («· Emitido 05-11-2026 00:22», hora de Chile); la fecha del **hecho** solo va si la persona la dijo, si no «No informada».

### Salida

```json
{ "request_id": "…", "status": "completed", "pdf_url": "https://…", "file_name": "atacama-informe-tecnico-de-terreno-20261105-1030.pdf", "error_code": null, "error": null, "message": "Documento generado. El enlace permanece disponible por tiempo limitado." }
```

| `status` | Qué hacer en Lety |
|---|---|
| `completed` | Enviar `pdf_url` por WhatsApp. El enlace de API2PDF dura **~24 h** por defecto: decirlo. Con `duplicate:true` es el mismo documento de un reintento. |
| `failed` | **No** inventar enlace. `error_code`: `VALIDATION_ERROR` (faltan datos: corregir y reintentar), `PAYLOAD_TOO_LARGE`, `EMPTY_BODY`, `TEMPLATE_UNAVAILABLE` (Drive), `TEMPLATE_INVALID` (la plantilla perdió un marcador), `PDF_SERVICE_ERROR` (API2PDF). Decir que no se pudo generar y ofrecer reintentar. |

Los fallos también responden HTTP 200 con `status:"failed"`; sin clave o con clave errónea n8n responde HTTP 403 (probado).

## Esquema que hoy usa Lety (soportado)
Lety envía `document_title`, `document_category`, `metadata_html` y `sections_html` (HTML ya armado) más `request_id`. El workflow los acepta: `document_title`→`title`, `document_category`→`category`, y el HTML se **convierte a datos** (`<h2>` = encabezado de sección, `<p>`/`<li>` = párrafo/viñeta, `<strong>` = negrita, `<p><strong>Etiqueta:</strong> valor</p>` = metadato; una sección llamada «Pendientes» sale como recuadro azul). **El HTML recibido no se inserta nunca**: se reduce a texto y se redibuja con el diseño de la plantilla; scripts, estilos, enlaces y atributos se descartan. Ejemplo exacto en `ejemplos-pdf-link/lety-payload-bp204.json` (PDF resultante: `revision-lety-bp204.pdf`, 1 hoja, logo oficial).

## Si Lety responde «Falta title»
El workflow acepta el JSON oficial y, además, lo envuelto en `input`/`data`/`payload`/`arguments`/`parameters`, el JSON enviado como texto (`text/plain`) y nombres en español (`titulo`, `categoria`, `metadatos`, `secciones`; en cada sección `titulo`/`texto`/`puntos`/`pendiente`). Si aun así falla, la respuesta incluye **qué recibió** (tipo de contenido, tipo de cuerpo y nombres de campos, nunca valores): `Falta title … Recibí content-type …, cuerpo tipo …, campos: …`. Con eso se corrige el nombre del parámetro en la herramienta de Lety.

## Seguridad
- **Logo oficial obligatorio:** el nodo Merge rechaza (`TEMPLATE_INVALID`) cualquier plantilla que no traiga `img.brand-logo` con la imagen Base64 incrustada: si alguien cambia el archivo de Drive por una versión sin logo, el workflow falla en vez de entregar un PDF sin identidad. Verificado: la plantilla de Drive (66.641 bytes) es idéntica a `ATACAMA-DEMO-PLANTILLA-DINAMICA.html` y los PDF llevan el logo como imagen (1300×122 px).
- Lety entrega **datos**; el HTML lo construye el workflow. Todo texto se escapa (`& < > " ' { }`, controles) y las llaves se neutralizan, de modo que nadie puede inyectar `{{SECTIONS_HTML}}` ni scripts. Única marca admitida: `**negrita**`, convertida a `<strong>` después de escapar.
- El enlace de API2PDF es público para quien lo tenga (sin guardar en Drive): tratarlo como «solo quien lo recibe por WhatsApp». No usar datos reales de invitados.
- Se inserta un bloque CSS fijo (`ASTER_HTML_LAYOUT_FIX`) para que el pie y «TECNOLOGÍA PARA EL TRABAJO REAL» fluyan al final en vez de quedar en una hoja casi vacía. Si se corrige la plantilla en Drive, se puede quitar.

## Pasos para cerrar
1. ~~Credenciales Drive y API2PDF~~ (hecho y probado).
2. **Activar** el workflow `ODS0bNrLZNFE9Oyi` (la URL de producción solo responde activo).
3. Configurar la herramienta en Lety (arriba) y probar desde WhatsApp.

Plan de recuperación: si API2PDF o Drive caen, `api2pdf-real-bp-204.pdf` y `api2pdf-real-parte-turno.pdf` (generados de verdad el 5-nov) sirven de respaldo, rotulados como grabación/muestra y no como ejecución en vivo.
