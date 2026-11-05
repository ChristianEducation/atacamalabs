# Plantilla «lista de estados» (mini-interfaces)

Un solo elemento que se transforma, un cursor que dispara cada cambio y **último frame = primero** (loop sin costura). Ejemplo: formulario de WhatsApp Flows que se completa.

- Cambiar solo los textos de `STATES` y el título; tiempos y cuadrícula quedan.
- Exportar: `node scripts/motion/multiformat.mjs brand/content/motion/lista-de-estados/composition.html --out <carpeta>` (9:16, 1:1, 16:9 con reencuadre).
- Puerta de calidad: `node scripts/motion/quality-gate.mjs prepare <video> --twin <segundo render>` y `grade`.
- Validada el 15-oct-2026 con la composición de prueba: determinismo OK (framemd5 idéntico) y nota 8,0.
