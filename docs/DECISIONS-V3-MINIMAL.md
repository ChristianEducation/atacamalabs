# Decisiones — ATACAMA_LABS_FINAL_MINIMAL_WEB_SPEC_V3_0_1 (2026-09-22)

Autoriza: Christian. El V3.0.1 manda sobre sitemap, navegación, densidad, demos y estructura de
páginas; V2.2.1 sigue mandando sobre identidad, componentes base, accesibilidad, responsive,
contratos de datos y formularios (jerarquía §1 del spec).

## Arquitectura

| Cambio | Detalle |
| --- | --- |
| Topbar | Plataforma · Agentes · Servicios (A Medida, Páginas Web) · Precios · Conócenos. Rubros y los tres empaquetados salen del nav. |
| `/comercial`, `/cobranza`, `/administrativo-financiero` | Ya no son páginas. Viven como opciones del selector A3 en `/agentes` (`#comercial`, `#cobranza`, `#administrativo-financiero`). Redirect 308 preservado. |
| `/rubros` y `/rubros/*` | Redirigen a `/agentes` (308). El contenido (`content/marketing/industries.ts`, `IndustryDemos.tsx`, `IndustrySearch.tsx`) **no se borró**: queda dormido para una posible reactivación como landing de campaña. |
| `/nosotros` → `/conocenos` | Ruta renombrada; `/nosotros` redirige (308). |
| Home | De 7 secciones-catálogo a H1–H7 minimalistas: una idea por sección, una sola animación (H3). |
| `/agentes` | Pasa a ser la página principal de producto (A1–A8). |
| `/plataforma`, `/a-medida`, `/paginas-web`, `/precios` | Reescritas con la estructura y el copy exactos del V3.0.1 (no solo recorte de lo existente). |

## Sistema de misiones (spec §5)

- Componente nuevo `Mission.tsx` (persona → agente → herramienta → resultado): una sola
  reproducción, sin loop, sin controles de texto (Pausar/Repetir/Mostrar resultado);
  replay solo como icono con `aria-label`. `prefers-reduced-motion` ya resuelve el estado
  final de inmediato (lo hace `useDemoClock`, sin cambios).
- `IntegrationFlow` (`/a-medida`, M3): evento → sistema A → lógica → sistema B → resultado.
- Reutiliza el motor existente (`useDemoClock` + `coordinator.ts`, sin tocar su lógica) para
  que reduced-motion, pausa por pestaña oculta y «una sola narrativa activa» sigan funcionando.
- **Limitación de verificación:** el panel de pruebas automatizado de esta sesión no dispara
  `IntersectionObserver` (confirmado con un observer vacío, sin relación con el código), así que
  no pude ver la animación completarse en vivo dentro del pane. Repasé la lógica a mano y until
  el bug real que sí encontré (ver abajo) quedó corregido; falta una verificación visual tuya en
  un navegador real.

## Bug encontrado y corregido

- `AgentSelector` (A3): al hacer clic en una pestaña y luego llegar por un `hash` distinto
  (por ejemplo, desde el redirect de `/administrativo-financiero`), el clic previo pisaba el
  hash nuevo. Corregido con el mismo patrón `{forHash, id}` que ya usaba la versión anterior del
  selector. Verificado con clics y con cambios de hash simulando el redirect.

## Limpieza de etiquetas prohibidas (spec §18)

- `DemoFrame` mostraba «Demo interactiva» y «Datos ficticios…» de forma fija, y sus botones
  decían «Reproducir»/«Repetir»/«Pausar»/«Mostrar resultado». Se agregaron las props opcionales
  `hideBadge`/`hideLegend` (por defecto `false`, sin romper nada dormido) y `PlatformWorkbench`
  ya no pasa `controls` a su `DemoFrame`: en `/plataforma` la vista es interactiva (clic en
  pestañas/contactos) pero sin controles de demo escenificada, tal como pide P2.
- Verificado por fetch: ninguna de las 8 rutas nuevas contiene las cadenas prohibidas
  (`Demo interactiva`, `Agente de ejemplo`, `Reproducir`, `Repetir`, `Pausar`, `Mostrar resultado`,
  `Ver cómo registra`, `Datos ficticios`, `No eliges un agente limitado`).
- «Alcance y valor por confirmar» sí sigue apareciendo en las cards de precios: es el copy de
  precio pendiente de V2.2.1 (R2), no el «por confirmar» de integraciones que el V3.0 prohíbe;
  la jerarquía del spec deja ese contrato bajo V2.2.1.

## Agente real (spec §6) — sin credenciales todavía

- `lib/marketing/public-config.ts#agentWidgetReady()` devuelve `false` y `agentCta()` centraliza
  el fallback aprobado (`Agendar diagnóstico` → `/diagnostico`). Es el único lugar a cambiar
  cuando exista el embed de Lety.
- Home H5 usa `AgentPanel`: no simula un chat ni fabrica un widget, explica el estado y ofrece
  el fallback. Se retira automáticamente cuando `agentWidgetReady()` pase a `true`.
- CTAs que el spec redacta como «Habla con nuestro agente» sin un fallback explícito propio
  (A1 secundario, A8, P5) usan `agentCta()`. Los que sí traen un fallback propio en el spec
  (H1: «Ver agentes»; H7: mismo patrón para evitar duplicar el CTA secundario) se dejaron
  literalmente como el spec los define.

## Precios (spec §14)

- CTA de agentes: `Consultar {Plan}` → `Empezar con {Plan}`. CTA de web: `Consultar {Plan}` →
  `Cotizar {Plan}`. El destino sigue siendo `/diagnostico?...&plan=...` (nuestro «onboarding
  corto» actual); no existe todavía un flujo de pago independiente.
- `/precios`: solo Hero + Agentes + Web + A Medida (cotización), sin comparador ni FAQ — el
  V3.0.1 no los incluye en la estructura de esta página.

## Pendiente para Christian

1. Confirmar visualmente las misiones (Home H3, `/agentes` A1/A3, `/a-medida` M3) en un
   navegador real — el pane de pruebas no pudo verificarlas en movimiento.
2. Credenciales/snippet del agente de Lety cuando estén listas.
3. Decidir si el contenido dormido de Rubros se reactiva como landings de campaña o se retira
   definitivamente más adelante.
