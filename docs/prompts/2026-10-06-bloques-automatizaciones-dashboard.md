# Prompt del 6-oct-2026 — Bloque 1 (automatizaciones GHL) + Bloque 2 (dashboard `Atacama OS — Hoy`)

> Guardado tal cual lo entregó Christian para poder retomarlo si se pierde el contexto. Si te pierdes, vuelve a leer este archivo completo.
> Modo de trabajo: autónomo mientras Christian está en clases; solo detenerse ante una acción manual inevitable en la interfaz de GHL o riesgo para datos reales. Al volver, dejarle la lista de lo que debe hacer él.

---

Retomamos Atacama OS desde el checkpoint de anoche.

Voy a estar ocupado y solo iré monitoreando, así que avanza de forma autónoma dentro de estos DOS bloques:

BLOQUE 1 — Automatizaciones operativas de GHL
BLOQUE 2 — Dashboard `Atacama OS — Hoy`

No me pidas confirmación para cada acción segura y reversible.
Solo detente si necesitas inevitablemente una acción manual mía dentro de la interfaz de GHL o si existe riesgo de afectar datos reales.

## ANTES DE COMENZAR

Lee primero:

- `docs/ATACAMA-OS-NEXT.md`
- `docs/ATACAMA-OS-IMPLEMENTATION.md`

Revisa también el estado real del repo.

Confirma:

- rama: `feat/frontend-v2-2-1`
- remoto actual contiene commit `23c2936`
- cambios locales pendientes
- `.claude/` sigue sin trackear
- no hay secretos ni `.env` trackeados

Los documentos de continuidad quedaron sin commit.

Revísalos y, si están limpios:

commit sugerido: `docs: save Atacama OS implementation checkpoint`

push: `origin/feat/frontend-v2-2-1`

NO: merge a main, PR, force push.

## BLOQUE 1 — AUTOMATIZACIONES OPERATIVAS GHL

Objetivo: cerrar las automatizaciones internas pendientes del pipeline comercial de Atacama Labs. No rediseñes arquitectura.

### 1. Auditoría corta

Verifica sin modificar inicialmente:

Pipeline `Atacama Labs — Ventas`, stages: Nuevo, Investigado, Contactado, Respondió, Diagnóstico, Propuesta, Seguimiento. Won/Lost siguen siendo estados nativos.

Verifica:

- Lead Sync operativo
- Booking Sync operativo
- workflow GHL `Atacama — Oportunidad ganada`
- n8n `Atacama Labs - 11 Won to Client`
- Won → n8n probado previamente
- `dry_run = true`

NO modifiques el webhook Won ya validado.

### 2. Tareas por etapa

Implementa las automatizaciones definidas en E4/E5 de la documentación.

- **Investigado:** al entrar una oportunidad a `Investigado`, crear tarea `Revisar prospecto`, asociada correctamente al prospecto. Evitar duplicados.
- **Respondió:** al entrar a `Respondió`, crear `Revisar respuesta y definir próximo paso`. Evitar duplicados.
- **Propuesta:** al entrar a `Propuesta`, crear `Seguimiento de propuesta`. Vencimiento: +3 días calendario. Respeta exactamente la lógica documentada para `proxima-accion`. No inventes otra lógica si ya existe en E4/E5.

### 3. Onboarding al ganar

Completa el workflow existente `Atacama — Oportunidad ganada`. El webhook actual YA FUNCIONA.

NO: reemplazarlo, cambiar URL, cambiar payload, cambiar clave, cambiar dry_run.

Agrega las 4 tareas de onboarding especificadas en E4/E5, con exactamente el nombre, responsable, vencimiento y lógica definidos en la documentación.

Resultado esperado:

```
Opportunity Won
      ↓
GHL Workflow
      ├── webhook → n8n 11
      └── 4 tareas onboarding
```

### 4. Limitación de GHL

Si estas automatizaciones no pueden crearse vía API:

- usa GUI si tienes acceso seguro;
- si necesitas inevitablemente un clic mío, prepara absolutamente todo primero.

En ese caso dime solamente: pantalla exacta, botón, trigger, filtros, acciones, valores. Haz que mi intervención sea mínima. Una vez haga ese paso, continúa automáticamente.

### 5. Test del Bloque 1

Usa exclusivamente datos TEST. Nunca uses Sushi72, Delicor, contactos reales ni oportunidades reales.

- TEST → Investigado → `Revisar prospecto`
- TEST → Respondió → `Revisar respuesta y definir próximo paso`
- TEST → Propuesta → `Seguimiento de propuesta` → vencimiento correcto
- TEST → Won → workflow GHL → webhook n8n → dry_run=true → 4 tareas onboarding → ninguna escritura Business/Servicio/Proyecto

Verifica ausencia de duplicados. Después limpia: contacto TEST, oportunidad TEST, tareas TEST, cualquier residuo.

### 6. Cierre Bloque 1

Si todo queda PASS: actualiza documentación y marca `BLOQUE AUTOMATIZACIONES GHL CERRADO`.

Si alguna acción requiere intervención manual mía: detente solo en ese punto.

SI BLOQUE 1 QUEDA PASS: CONTINÚA AUTOMÁTICAMENTE AL BLOQUE 2.

## BLOQUE 2 — DASHBOARD `ATACAMA OS — HOY`

Objetivo: construir dentro de GHL la pantalla principal de operación diaria de Atacama Labs. No quiero un dashboard decorativo.

Debe responder al comenzar el día: ¿qué necesita mi atención? ¿qué oportunidades debo mover? ¿qué tareas vencen? ¿qué reuniones tengo? ¿qué propuestas requieren seguimiento? ¿qué respuestas nuevas tengo? ¿qué está pasando en ventas?

GHL debe seguir siendo la interfaz principal de trabajo.

### 1. Audita las capacidades reales

Antes de crear nada: revisa qué widgets/dashboard capabilities permite realmente esta ubicación de GHL. No inventes widgets inexistentes.

Determina qué puede hacerse: directamente en Dashboard; mediante filtros; Smart Lists; Opportunities; Tasks; Conversations; Calendar; widgets estándar; custom widgets SOLO si ya están soportados y valen la pena.

Prioriza GHL nativo. No construyas software externo para algo que GHL ya puede resolver.

### 2. Diseño del dashboard

Nombre: `Atacama OS — Hoy`. Debe priorizar información accionable. Bloques a evaluar:

- **Ventas:** oportunidades abiertas, por etapa, nuevas, propuestas abiertas, seguimientos pendientes, Won/Lost recientes si aporta.
- **Trabajo de hoy:** tareas vencidas, para hoy, próximas, onboarding pendiente.
- **Conversaciones:** respuestas recientes, conversaciones sin atender, prospectos en Respondió.
- **Agenda:** reuniones/diagnósticos de hoy, próximas reuniones.
- **Salud comercial:** oportunidades estancadas, propuestas sin movimiento, pipeline value si los datos son fiables.

NO agregues métricas vanity solo por llenar espacio.

### 3. Principio de diseño

Debe sentirse como una bandeja de operación: `¿Qué tengo que hacer hoy?`. No como un panel de BI. Máximo valor práctico con mínimo ruido. Si hay demasiados widgets, reduce.

### 4. Relación con el resto de GHL

Navegación diaria: Dashboard → Opportunities → Tasks / Projects → Conversations → Social Planner → Calendar. Businesses y Custom Objects quedan para gestión más específica. No intentes meter todo dentro del Dashboard.

### 5. Datos reales, sin inventar

Puedes usar datos reales existentes solo para visualizar/reportar. NO: alterar oportunidades reales, mover stages reales, crear clientes falsos, crear MRR falso, modificar Sushi72 o Delicor, limpiar contactos históricos, borrar EnBandeja, cambiar scoring.

### 6. Implementación

Configura todo lo posible de forma autónoma. Si GHL requiere configuración manual no accesible por API: prepara la especificación exacta y dime únicamente los clics que debo hacer. Si una parte puede resolverse mejor con Smart Lists o vistas guardadas que con widgets: hazlo así. No fuerces un dashboard si GHL tiene una mejor superficie nativa.

### 7. Validación

Al terminar, comprueba que entrando a `Atacama OS — Hoy` yo pueda entender en menos de 30 segundos: qué tareas tengo, qué oportunidades requieren acción, qué reuniones vienen, qué respuestas debo atender, qué propuestas seguir. Si eso no se cumple, simplifica.

### 8. Documentación

Actualiza `docs/ATACAMA-OS-IMPLEMENTATION.md` y `docs/ATACAMA-OS-NEXT.md`. Documenta: qué dashboard/vistas fueron creados, widgets, filtros, Smart Lists, limitaciones reales de GHL, cualquier paso manual pendiente.

Si hubo cambios en repo: tests relevantes → revisión de secretos → commit → push a `origin/feat/frontend-v2-2-1`. NO merge a main.

## NO TOCAR TODAVÍA

Social Planner, Instagram, LinkedIn, Gmail, Telegram, Atacama Daily, scoring 60–79, nuevos agentes, productización, snapshots, producción web, EnBandeja legacy, dry_run=false.

## REPORTE FINAL

**BLOQUE 1**
1. Investigado: PASS / FAIL
2. Respondió: PASS / FAIL
3. Propuesta: PASS / FAIL
4. Onboarding Won: PASS / FAIL
5. Won → n8n sigue operativo
6. dry_run sigue true
7. limpieza TEST

**BLOQUE 2**
8. Dashboard creado: sí/no
9. nombre exacto
10. widgets/vistas creadas
11. Smart Lists/filtros creados
12. qué puedo ver al entrar cada mañana
13. limitaciones encontradas
14. intervenciones manuales que necesitas de mí

**REPO**
15. commits realizados
16. push realizado
17. estado final de la rama

**SIGUIENTE**
18. siguiente bloque recomendado

Si ambos bloques quedan completos, termina exactamente con:

`BLOQUES AUTOMATIZACIONES + DASHBOARD CERRADOS`

Después detente.
