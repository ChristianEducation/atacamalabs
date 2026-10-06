# brand/content — identidad de publicaciones de Atacama Labs

Esta carpeta es el lugar versionado de todo lo que define cómo se ven y suenan las publicaciones (Instagram, LinkedIn y otras redes). Los generadores de contenido (renderizador de carruseles/reels, plantillas de Social Planner, prompts de Hermes) deben **leer de aquí** y no inventar identidad.

## Qué falta incorporar (pendiente de Christian)

Estos tres materiales existen hoy en el conocimiento del proyecto de ChatGPT y **no están versionados en GitHub**. Hasta que se copien aquí, nadie debe reconstruirlos ni improvisar equivalentes:

1. **Guía oficial de publicaciones** (tono, estructura, formatos, qué decir y qué no) → `guia-de-publicaciones.md`
2. **Hoja de poses de la llamita/alpaca** (mascota oficial) → `mascota/poses/`
3. **Hoja de emociones de la llamita** → `mascota/emociones/`

> Regla de uso de la mascota: aparece **solo cuando aporta** personalidad. No es obligatoria en cada pieza ni un sello automático.

## Identidad vigente mientras tanto (tomada del repo y del sitio)

| Elemento | Valor / fuente |
|---|---|
| Azul Atacama | `#0F5CED` (`--blue` en `src/styles/section-themes.css`) |
| Azul oscuro | `#041228` |
| Tinta (texto) | `#121A2B` (`--ink`) |
| Papel (fondo claro) | `#FBF8F2` (`--paper`) |
| Logo e isotipo | `public/brand/*.svg` — **siempre leer el archivo oficial; nunca retipear paths ni letras** (el wordmark es "ATACAMA LABS" completo) |
| Tipografías | Newsreader (títulos) y DM Sans (texto), como en el sitio |

Línea visual: sobria, tecnológica, clara y humana; fondos claros (blanco/crema), mucho aire, **una idea fuerte por slide**, poco 3D, sin neón, sin estética crypto, sin robots genéricos, sin circuitos decorativos.

## Aviso sobre piezas antiguas

Los exportables de `social/exports/` (C01–C06) y la plantilla `src/components/studio/SocialCard.tsx` usan la **paleta anterior (marrón `#4E2E1E` / crema `#FAF6F0`)** y el isotipo antiguo de 5 curvas. No son la identidad actual y no deben publicarse ni usarse de base visual sin re-temear.

## Cómo se usará (cuando el Social Planner esté conectado)

Hermes investiga → n8n puntúa y selecciona → se genera la pieza con estas reglas → entra a GHL Social Planner como `in_review` → Christian aprueba → se programa. Nada se publica sin aprobación. Calidad por encima de frecuencia: sin hecho verificable no se inventa una noticia; se usa contenido evergreen.
