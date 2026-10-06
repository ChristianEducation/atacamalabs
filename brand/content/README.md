# brand/content — fuente editorial y referencias visuales de Atacama Labs

Esta carpeta manda sobre **cómo suenan y se ven las publicaciones** (Instagram, LinkedIn y demás). El Content Engine
(renderer, motor de validación, prompts de Hermes y plantillas) debe **leer de aquí** y de `public/brand/`; nunca inventar identidad.

## Qué es la fuente oficial de qué

| Qué | Dónde | Regla |
|---|---|---|
| **Guía editorial y visual** | [`ATACAMA-LABS-GUIA-PUBLICACIONES.md`](ATACAMA-LABS-GUIA-PUBLICACIONES.md) (v1.0, 2-oct-2026) | Es **la fuente editorial oficial**. No es una plantilla rígida: define el criterio (sobrio, claro, tecnológico y humano). Archivo original, sin alterar. |
| **Logos e isotipos** | [`public/brand/`](../../public/brand/) | Fuente oficial **para código y renderer**. No se duplican en otra carpeta. |
| **Llamita (mascota)** | [`mascot/poses.png`](mascot/poses.png) y [`mascot/emociones.png`](mascot/emociones.png) | Las dos hojas oficiales (9 poses + 9 emociones). Archivos originales, sin alterar. |

## Logos oficiales (`public/brand/`)

Siempre se usa el **archivo real**. Prohibido: reconstruir el logo con texto, redibujar el isotipo, cambiar proporciones o colores,
generar un logo nuevo. Área de respeto = alto del isotipo; mínimo horizontal 120 px de ancho (ver `public/brand/README.md`).

| Necesidad | Fondo claro (blanco, crema, azul pálido) | Fondo oscuro (#041228) |
|---|---|---|
| Logo horizontal (principal en publicaciones; pequeño, arriba o al pie) | `logo-horizontal.svg` | `logo-horizontal-fondo-oscuro.svg` (blanco + isotipo #2E74F5) |
| Horizontal monocromo | `logo-horizontal-negro.svg` | `logo-horizontal-blanco.svg` |
| Logo vertical | `logo-vertical.svg` / `logo-vertical-negro.svg` | `logo-vertical-fondo-oscuro.svg` / `logo-vertical-blanco.svg` |
| Isotipo solo (bajo 120 px, marcas de agua) | `isotipo-azul.svg` · `isotipo-tinta.svg` · `isotipo-negro.svg` | `isotipo-blanco.svg` |
| Solo wordmark | `wordmark.svg` / `wordmark-negro.svg` | `wordmark-blanco.svg` |
| Iconos | `favicon.svg`, `app-icon-claro.svg`, `app-icon-oscuro.svg`, `social-avatar-1024.png`, `og-share.png`, glifos `glifo-a/b/s.svg` | — |

## Identidad (resumen; la guía manda)

Azul Atacama `#0F5CED` · azul oscuro `#041228` · blanco · neutros muy claros (crema `#FBF8F2`, azul pálido `#F2F6FE`).
Tipografía **sans serif limpia y fina** (DM Sans 300/400; negrita solo en palabras clave). Fondos claros con mucho aire,
**una idea fuerte por slide**, tarjetas suaves solo cuando ordenan, poco 3D, sin neón, sin estética crypto, sin robots genéricos,
sin circuitos ni hologramas. El fondo oscuro es una variante ocasional, no la base.
> Nota: el sitio web usa Newsreader para titulares; **las publicaciones siguen la guía** (sans serif).

## La llamita

Opcional, **nunca obligatoria**: portada o cierre cuando aporta personalidad (dudas, explicaciones simples, contenido amigable);
no en slides densos, comparaciones, cifras, precios ni contenido corporativo serio; no en todas las slides. Respeta las dos hojas:
no se redibuja ni se regenera con IA; el renderer **recorta la pose** de la hoja oficial (`scripts/content/render.mjs`, `MASCOT_CROPS`):
- `poses`: neutral, pregunta, celebra, senala, celular, brazos_arriba, laptop, conectada, tablet
- `emociones`: neutral, pregunta, alegria, sorpresa, duda, salto, timida, orgullo, duerme
- Se usa en el JSON de la pieza (`slide.mascot = { sheet, pose }`) y el motor la valida (solo portada/cierre, máx. 2, sobre fondo claro).

## Cómo se usa (flujo)

Hermes (`content-radar`) o trabajo real → `content_sources` (Supabase) → scoring (≥ 70) → pieza JSON → n8n `12 Content Intake`
→ GHL Social Planner **`in_review`** → Christian aprueba. Nada se publica ni se programa solo. Calidad por encima de frecuencia: sin
hecho verificable no se inventa una noticia; se usa evergreen o no se publica. Detalle: `docs/ATACAMA-OS-IMPLEMENTATION.md` (Bloques H e I).

## Aviso sobre piezas antiguas

Los exportables de `social/exports/` (C01–C06) usan la **paleta anterior (marrón `#4E2E1E` / crema) y el isotipo antiguo de 5 curvas**.
No son la identidad actual y no deben publicarse ni usarse de base visual sin rehacerlos.

## Cadencia editorial objetivo (acordada el 6-oct-2026)

| Día | Publicar |
|---|---|
| **A** | LinkedIn personal (Christian Wevar) + Instagram Atacama Labs |
| **B** | LinkedIn Atacama Labs |
| **C** | Descanso |

Se repite A → B → C. **No se fuerza publicación:** si no existe contenido con score ≥ 70 para el canal del día, ese día no se publica. Toda pieza pasa por revisión y aprobación humana en GHL Social Planner (detalle: `docs/ATACAMA-OS-IMPLEMENTATION.md`, Bloque J).
