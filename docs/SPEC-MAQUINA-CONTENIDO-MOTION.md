# SPEC — Máquina de contenido y motion de Atacama OS (trabajo único y autónomo)

> Estado: **BORRADOR para confirmación de Christian (12-oct-2026).** No se ejecuta nada hasta su «confirmado».
> Reúne y reemplaza el orden de trabajo de `PLAN-MAQUINA-MOTION-ATACAMA-OS.md` (que queda como contexto) y las decisiones de contenido de Instagram acordadas el 12-oct.

## 1. Objetivo
Que Atacama OS produzca **cada semana, sin que Christian tenga que pedirlo**, el material de Instagram al ritmo acordado — videos motion, carruseles, imágenes e historias de alto nivel — dejándolo en el Planner de GHL **en revisión** para que él apruebe, edite o descarte. Todo corre en la VPS (Hermes + n8n + Supabase); ni Claude ni el PC de Christian son parte del ciclo semanal.

## 2. Decisiones ya tomadas (no reabrir)
- **Ritmo Instagram:** 3 historias/día (10:00, 14:00, 18:00, toda la semana, hora de Chile) + 5 publicaciones de feed/semana (2 Reels, 2 carruseles, 1 imagen). Subir a diario solo si las métricas propias lo respaldan tras 4 semanas.
- **LinkedIn (personal y empresa): sin cambios**, siguen como hoy.
- **Aprobación:** nada se publica sin aprobación de Christian en GHL (estado `in_review`), como hoy. **Las ideas NO requieren aprobación previa:** Atacama OS elige ideas y produce las piezas solo; si Christian trae una idea, se hace como orden explícita.
- **Un carrusel educativo por semana con recurso:** la última lámina invita a comentar una palabra clave; un agente (que Christian programa) responde por **mensaje directo** con el enlace al recurso. El respaldo es el enlace de la biografía.
- **Lenguaje visual:** reglas de `PLAN-MAQUINA-MOTION-ATACAMA-OS.md §3` y `brand/content/ATACAMA-LABS-GUIA-PUBLICACIONES.md` (colores de marca + cuadrícula, sin negro ni texturas de IA de fondo, texto corto, transiciones intercaladas, audio desde t=0, −15 LUFS, logos oficiales, llamita solo cuando aporta). **Variedad obligatoria:** no repetir el mismo lenguaje de motion en dos piezas seguidas.
- **Higgsfield:** cuenta de pago con login (sin clave API); tope semanal de créditos con alerta.
- **Claude no se muda a la VPS por ahora.**

## 3. Fuera de alcance
Publicar sin aprobación · cambiar LinkedIn · conectar Meta (se hace después, a pedido) · escanear anuncios de forma automatizada (va contra los términos de Meta) · mover recursos a base de datos si Christian no lo aprueba (ver F).

## 4. Frentes de trabajo (en este orden)
**A. Taller de motion en la VPS.** Chromium + fuentes + ffmpeg + Node dentro del contenedor de Hermes; skills oficiales de HyperFrames y skill propia `atacama-motion` (gusto de Christian) en `/opt/data/skills/`; el mismo taller sirve de **Media Worker** para las publicaciones en cola.
*Aceptación:* render del video «¿Quién contesta?» dentro de la VPS, comparado con el publicado (misma duración, texto legible, `hyperframes check` limpio); las 2 publicaciones detenidas en cola quedan renderizadas.

**B. Higgsfield en la VPS.** Login único por código; verificar que la sesión se renueve sola; tope semanal (propuesto 150 créditos) con alerta y corte; si no se renueva sola, queda documentado el procedimiento manual y las piezas con Higgsfield siguen haciéndose desde el PC.
*Aceptación:* `account status` y una generación de prueba (≤3 créditos) desde la VPS; el tope bloquea de verdad (prueba en seco).

**C. Motor semanal de Instagram.**
1. Campo `motion_brief` (lenguaje, frases, paleta, tiempos) y `format` ampliado (`reel`, `carrusel`, `imagen`, `historia`) en las ideas.
2. Biblioteca de **plantillas parametrizadas**: paneles partidos (¿Quién contesta?), mini-interfaces (puestos), ráfaga de cámara (verticales) y los chats de historia (`brand/content/historias/`); más 2 lenguajes nuevos (tipografía cinética y antes/después) construidos con Claude Code.
3. Job semanal de Hermes (lunes): elige 5 ideas del banco, deriva de cada una sus versiones (feed + 3–4 historias), produce, **revisa automáticamente** (check técnico, contraste, repetición, claims verificados) y sube al Planner en `in_review` en las horas acordadas; historias con `type: story`.
4. El gobernador de cola se amplía: hasta 3 historias/día y 1 pieza de feed/día en Instagram; LinkedIn intacto.
5. Audio: se pide a Higgsfield con el mapa de tiempos de la plantilla; si falla o no hay créditos, la pieza sale sin audio propio y se marca para revisión (nunca se improvisa con efectos).
*Aceptación:* una semana completa simulada (5 piezas de feed + 21 historias) aparece en el Planner con fechas/horas correctas, ninguna repetida, cada una con su aprobación pendiente; los fallos aparecen en `/ops` y como alerta.

**D. Recurso semanal y mensaje directo.** Carrusel educativo semanal + recurso en `/recursos/<slug>` con enlace UTM; palabra clave y texto del mensaje directo entregados a Christian para su agente; la última lámina y el pie lo explican.
*Aceptación:* recurso publicado y enlazado; el agente de Christian puede copiar palabra clave y texto sin tocar código.

**E. Investigación de competencia (datos públicos).** Cuentas aprobadas: Vambe, IAutomatiza, FutureFlow, Oversai, Fundé Dálmata, Eclectica (cuando se confirme su dominio). Recolección semanal en n8n → `content_competitors` / `content_intel_reports`; síntesis de Hermes → banco de ideas (`origin=competitor_intel`) con huecos detectados (límites, costos, traspaso humano, casos, «qué no automatizar»). Instagram por *Business Discovery* y métricas propias quedan para cuando Christian conecte Meta.
*Aceptación:* un informe semanal en `/ops → Contenido` y al menos 10 ideas nuevas al banco con su fuente.

**F. Visibilidad y orden.** Vista de calendario semanal en `/ops`, resumen del lunes por Telegram (qué se produjo, qué falta, créditos usados), documentación (`OPERATIONS.md`, `HERMES-OPERATOR.md`, este spec), memoria del asistente y pruebas automáticas. *Opcional (requiere OK):* mover los recursos del código a Supabase para que añadir uno no exija desplegar el sitio.

**G. Pendiente creativo inmediato (puede ir en paralelo).** Ajustes pedidos a las 5 historias: franja azul de los chats más baja (opciones 20 % o 25 %), banner horizontal → publicación 4:5, llamita y embudo que Christian refinará; prueba de una historia en GHL.

## 5. Reglas de trabajo autónomo
- Orden A → B → C → D → E → F; G en paralelo. Cada frente termina con pruebas, informe corto y memoria actualizada.
- Respaldo antes de tocar cualquier cosa existente (workflows de n8n, `config.yaml` de Hermes, tablas).
- Cambios en la VPS: solo los listados en A, B y F; cualquier otro, se pregunta.
- **Se detiene y pregunta** si: se va a gastar más del tope de créditos; hace falta un `git push`/despliegue a producción (cada uno requiere su «sí»; se agrupan por frente); algo en producción falla y no se puede revertir; surge una decisión de marca no cubierta aquí.
- Nunca: publicar o programar sin aprobación, contactar a terceros, borrar datos sin respaldo, tocar tablas de EnBandeja LEGACY.

## 6. Autorizaciones que se piden al confirmar
1. Instalar Chromium, ffmpeg, Node y las skills en el contenedor de Hermes (reinicio breve del agente).
2. Iniciar sesión de Higgsfield en la VPS (Christian entrega el código cuando se pida) y fijar el tope semanal.
3. Crear/modificar workflows de n8n, jobs de Hermes y tablas/columnas en Supabase del proyecto Atacama (con respaldo).
4. Crear posts **en revisión** en el Planner (nunca aprobados).
*No incluye:* push/despliegue a producción, conexión con Meta ni cambios en LinkedIn.

## 7. Definición de terminado
El lunes siguiente a la puesta en marcha, el Planner contiene la semana de Instagram completa al ritmo acordado, creada sin intervención de Claude ni del PC de Christian, con su resumen en Telegram; Christian solo revisa y aprueba.
