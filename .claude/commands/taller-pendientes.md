---
description: Muestra la cola del Taller en el carril PC (videos y motion por hacer con Christian)
---
Corre `node scripts/taller/taller-pendientes.mjs` (solo lectura) y muestra a Christian, en español simple, las piezas del carril PC: tema, formato, red, fecha límite, gancho y el feedback abierto.

Para trabajar una pieza:
1. Haz la composición (plantillas en `brand/content/motion/`; perfiles y reglas de sonido en `brand/content/motion/perfiles-movimiento.md` y `reglas-sonido.md`).
2. Exporta con `node scripts/motion/multiformat.mjs <composicion.html> --out <carpeta>` (9:16, 1:1 y 16:9).
3. Puerta de calidad: `node scripts/motion/quality-gate.mjs prepare <video.mp4> --twin <segundo-render.mp4>`, mira las imágenes de control, escribe las notas y `grade` (nota ≥ 8).
4. Sube con `node scripts/taller/taller-add-version.mjs --piece <id> --file <video.mp4> --qa <qa.json> --caption "…"`.

Nunca programes ni publiques: eso lo hace Christian en /ops.
