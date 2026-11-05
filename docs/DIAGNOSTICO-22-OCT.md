# Diagnóstico de salud de Atacama OS — 22-oct-2026

Revisión de solo lectura de n8n (51 workflows), Hermes (VPS), Supabase y el panel de /ops, más la suite de pruebas.

## 1. Qué estaba fallando (y por qué)

| # | Síntoma en /ops | Causa real | Estado |
|---|---|---|---|
| 1 | **Content Engine en «fallo»** (rojo permanente) y alerta «Publicación con problema» | La pieza de LinkedIn «n8n permite recargar créditos…» (`b4fea680…`) ya estaba **descartada** (`status=discarded`, 20-oct), pero conserva `ghl_status=failed`. `summarizeContent` y `evaluateAlerts` contaban `ghl_status=failed` sin mirar si la pieza ya estaba descartada, así que nunca se apagaba. | **Corregido en código** (`publishFailed()` en `scripts/ops/ops-core.mjs`, commit `cbec88d`, prueba nueva). Verificado contra las 51 piezas reales: antes 1 falla fantasma, ahora 0. **Falta desplegar el workflow 25** (ver §3). |
| 2 | **Content Radar «terminó en error»** | Los jobs Prospect Radar y Content Radar tenían fijado `model=google/gemini-3.7-flash` / `provider=openrouter`. La clave de OpenRouter se quedó sin crédito (HTTP 402, «can only afford 3869 tokens»): fallaron 16-oct (×3 Radar), 19-oct (×3 Radar + Content Radar). Desde el 20-oct los dos jobs ya no tienen modelo fijado y usan el modelo principal (`gpt-5.6-luna` por Codex): los Radar del 20 y 21 salieron bien. Content Radar es semanal (lunes 12:00 UTC) y **no ha vuelto a correr**: su «error» en el panel es el del 19-oct y se limpia solo con la corrida del lunes 26-oct. | Causa ya resuelta; **sin verificar en vivo** (disparar el job fue bloqueado por permisos). |
| 3 | `Lead Sync v2.2` con 1 error en 24 h | `ECONNABORTED` hacia Supabase en el nodo «Claim Sync Jobs» (2 veces en 2 días, de cientos de corridas cada 2 min). Corte de red momentáneo, se recupera solo. | Benigno; ver mejora de reintentos en §2. |

Lo demás está sano: los 22 workflows activos con ejecuciones corren `success` al minuto; Gmail Sender/Sync, Followup Planner, LinkedIn Engine, Media Worker y los jobs de Hermes responden; VPS con 35 GB libres (64 % de uso), 4,6 GB de RAM disponibles; las 57 suites de pruebas (1602 pruebas) pasan.

## 2. Plan para que no vuelva a fallar (de más a menos importante)

1. **Un solo proveedor de IA sin plan B real.** El modelo principal es Codex (login de ChatGPT) y los respaldos son dos modelos de OpenRouter cuya clave está en 0 crédito (`hermes auth list`: «exhausted (402)»). Si Codex se desloguea o llega a su límite, **todos** los jobs con IA caen a la vez. Acción: cargar un monto pequeño en OpenRouter (US$10 alcanzan para muchos meses de respaldo) y ponerle tope mensual a la clave. *Esto es de Christian (pago); yo no puedo hacerlo.*
2. **No volver a fijar modelo por job.** Dejar `model/provider` vacío en los jobs para que todos hereden el principal con su cadena de respaldo. Los dos Radar fallaron justamente por tener OpenRouter fijado (el respaldo no aplicaba: «Fallback skip: resolves to the same backend»).
3. **Regla de salud que avise del proveedor, no solo del job.** Agregar en `health-rules.mjs` una señal «Proveedor de IA» que lea `hermes auth list` (vía el script `atacama_alerts.sh`, que ya corre cada 15 min sin modelo) y marque atención si el respaldo está `exhausted` o si Codex no figura `logged in`. Así el aviso llega antes del primer job fallido.
4. **Reintentos en n8n.** Solo 11 de ~200 nodos HTTP tienen `retryOnFail`. Poner `retryOnFail:true, maxTries:3, waitBetweenTries:2000` en los nodos de **lectura / idempotentes** (Supabase GET/RPC de consulta, GHL GET) desde los `n8n/build/*.mjs` — **no** en envíos (Gmail, publicar). Eso absorbe los cortes tipo `ECONNABORTED` sin dejar «error».
5. **Piezas descartadas deben cerrar el estado de GHL.** Cuando el sistema descarta una pieza (`taller-core`, `ops-actions-core`), además de `status=discarded` debería normalizar `ghl_status` a `deleted`/`discarded`. Con el arreglo de hoy ya no molesta, pero deja los datos coherentes.
6. **Alerta de «reintento de job»**: si un job de Hermes termina en error por 402/auth, reintentarlo una vez tras 15 min (el `catch_up` actual solo cubre ejecuciones perdidas, no fallidas).

## 3. Pendiente de despliegue (bloqueado por el clasificador de permisos)

Intenté regenerar y comparar el workflow 25 (`node n8n/build/ops.mjs` y luego `n8n-deploy.mjs … OxLcj12RP0qLVLVc`) y disparar el job (`hermes cron run a46bd3138a0b`): el clasificador bloqueó ambas cosas como acciones de producción. No las rodeé. Para aplicar el arreglo del punto 1:

```bash
node n8n/build/ops.mjs
node scripts/ops/n8n-deploy.mjs n8n/atacama-labs-25-atacama-ops.json OxLcj12RP0qLVLVc          # compara (no cambia nada)
node scripts/ops/n8n-deploy.mjs n8n/atacama-labs-25-atacama-ops.json OxLcj12RP0qLVLVc --apply  # respalda, despliega y verifica
node scripts/ops/n8n-read.mjs ops '{"action":"panel"}'                                          # el Content Engine debe quedar sin «fallo»
```

Para verificar Content Radar sin esperar al lunes: `hermes cron run a46bd3138a0b` en la VPS.

## 4. Cosas que NO son fallas del sistema pero conviene mirar

- **Respuesta de «Miss Propiedades» sin atender hace 7 días** (panel: «Respuesta por atender»). Es un prospecto real que respondió.
- 32 seguimientos en borrador y 41 tareas «Seguimiento 1» vencidas esperando revisión humana en /ops.
