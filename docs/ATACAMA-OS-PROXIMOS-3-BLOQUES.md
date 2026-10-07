# Atacama Labs — Continuidad Operativa / Próximos 3 Bloques

Fecha de referencia: 6 de octubre de 2026

## Estado actual

Atacama OS ya tiene:

- Prospect Gateway / Universal Intake operativo.
- Hermes como operador conversacional de Atacama OS.
- Acceso móvil mediante el mismo Telegram de Hermes.
- Hermes opera mediante herramientas controladas en n8n.
- GHL sigue siendo el CRM y centro operativo.
- Supabase guarda candidatos, auditoría y datos auxiliares.
- Claude Code sigue siendo el entorno de ingeniería/configuración.
- Prospect Radar sigue pausado.
- No se han importado todavía los 43 prospectos reales del HTML.
- No se han enviado correos reales todavía.

Arquitectura práctica actual:

Christian (Telegram / PC)
→ Hermes o Claude Code
→ n8n / Hermes Operator / Prospect Gateway
→ GHL + Supabase
→ Gmail y otros servicios a medida que se habiliten.

---

# Próximos bloques — SOLO 3

## BLOQUE 1 — Activación comercial

Objetivo: empezar a usar Atacama OS comercialmente de verdad.

Incluye:

### Gmail + aprobación + respuestas

- Preparar y editar drafts.
- Aprobar explícitamente antes de enviar.
- Enviar por Gmail sin duplicados.
- Registrar envío en GHL.
- Detectar respuestas.
- Mover oportunidad a `Respondió`.
- Hermes puede mostrar, resumir y preparar respuesta.
- No auto-responder sin aprobación.

### Prospección v2 de Hermes

- Mejorar búsqueda diaria.
- Investigación intermedia: ni superficial ni excesivamente profunda.
- Buscar señales razonables, no “dolor demostrado”.
- Priorizar procesos observables:
  - WhatsApp,
  - formularios,
  - agenda,
  - cotizaciones,
  - múltiples servicios/sedes,
  - intake manual aparente.
- Todo debe entrar por Prospect Gateway.
- Hermes no es la única fuente: listas externas, otras IAs, HTML, CSV, JSON, búsquedas verticales y entradas manuales también deben poder entrar.
- Activar Prospect Radar solo cuando la calidad esté validada.

### Primer lote real de prospectos

- Revisar los 43 prospectos del HTML que hoy califican para GHL.
- Importar los que realmente queramos contactar.
- Dejarlos en `Investigado`.
- Revisar drafts.
- Hacer primeros contactos controlados.

### Follow-up comercial

ESTÁ DENTRO DE ESTE BLOQUE.

Debe definir:

- qué pasa si no contestan;
- primera tarea de seguimiento;
- segunda tarea de seguimiento;
- evitar tareas duplicadas;
- parar automáticamente el seguimiento si responden;
- detener contacto si se descarta, rebota o pide no ser contactado;
- más adelante permitir secuencias sencillas, sin spam.

Principio:
si enviamos y no responde → seguimiento humano / tarea;
si responde → detener follow-up pendiente;
si se descarta → no volver a contactar.

### Resultado esperado del Bloque 1

Atacama OS ya se usa comercialmente:

prospecto
→ Investigado
→ draft
→ aprobación
→ envío
→ Contactado
→ respuesta
→ Respondió
→ seguimiento / siguiente acción.

NO esperar a los bloques 2 y 3 para empezar a usarlo.

---

## BLOQUE 2 — Operación diaria automática

Objetivo: que Atacama OS trabaje todos los días aunque Christian no esté frente al PC.

Incluye:

### Atacama Daily mediante Hermes / Telegram

Cada mañana Hermes debe poder resumir:

- respuestas nuevas;
- prospectos nuevos;
- oportunidades que requieren acción;
- seguimientos vencidos;
- tareas pendientes;
- fallos de automatización;
- contenido pendiente/publicado;
- cualquier punto que requiera decisión de Christian.

No crear otro bot: reutilizar el mismo Telegram de Hermes.

### Reactivación controlada de radares

- Reactivar Prospect Radar cuando la versión v2 esté validada.
- Reactivar Content Radar cuando corresponda.
- Mantener aprobación humana para publicación.

### Contenido y aprendizaje

- Revisar métricas reales de publicaciones.
- Aprender qué temas, formatos y cuentas funcionan mejor.
- Hermes puede usar esos aprendizajes para sugerir mejor contenido.
- No convertir esto en un bloque aparte.

### Resultado esperado del Bloque 2

Hermes actúa como operador diario:
avisa, resume, prioriza y deja listo lo que Christian debe decidir.

---

## BLOQUE 3 — Cierre y blindaje final

Objetivo: estabilizar Atacama OS después de haberlo usado con datos reales.

Incluye:

- revisar workflows activos/inactivos;
- limpiar TEST por ID exacto;
- revisar tareas huérfanas;
- dedupe;
- backups;
- RLS y seguridad;
- secretos;
- logs;
- auditoría;
- costos;
- documentación;
- errores/reintentos;
- revisar que EnBandeja legacy siga intacto;
- prueba completa end-to-end.

Prueba final:

prospecto
→ contacto
→ respuesta
→ diagnóstico
→ propuesta
→ Won
→ onboarding / Servicio / Proyecto.

### Resultado esperado del Bloque 3

Atacama OS queda estable, documentado y seguro para operación continua.

---

# Orden definitivo

1. ACTIVACIÓN COMERCIAL → empezar a usarlo.
2. OPERACIÓN DIARIA AUTOMÁTICA.
3. CIERRE Y BLINDAJE FINAL.

No agregar más “bloques grandes” salvo que aparezca una necesidad realmente nueva.

---

# Nota sobre Lety

La decisión GHL actual vs GHL de Lety queda separada y no bloquea estos tres bloques.

Pendiente cuando se pueda hablar con Lety:

- diferencias de precio/entitlements;
- WhatsApp;
- APIs/private integrations;
- custom objects;
- workflows;
- migración/snapshot;
- billing/addons.

Mientras tanto, Atacama OS se termina y se usa sobre el GHL actual.

---

# Regla de continuidad

Atacama OS debe servir a Christian, no obligarlo a trabajar según una sola automatización.

Christian puede:

- encontrar empresas por su cuenta;
- pedir búsquedas verticales a otras IAs;
- entregar HTML/CSV/JSON/listas;
- ordenar FORCE_IMPORT;
- registrar manualmente que escribió por Instagram/WhatsApp;
- decidir contactar una empresa aunque el score sea menor.

Hermes es operador y una fuente de prospección, no la única fuente.

Prospect Gateway es la puerta universal hacia el sistema.
