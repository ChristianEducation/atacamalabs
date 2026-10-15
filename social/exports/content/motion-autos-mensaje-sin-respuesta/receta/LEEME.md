# «El mensaje que nadie contestó» (autos) — receta

Video final: `../autos-mensaje-sin-respuesta-v7-final-24s-con-voz-marisol.mp4` (9:16, 24,5 s, voz Marisol + música).

- `page.template.html` + `render.mjs`: animación determinista (HTML -> PNG con Playwright -> ffmpeg). `node render.mjs <salida> all 6`.
- `assets/`: marco de celular (GPT Image 2.5, recortado), brillo de vidrio y 3 fotos de Corolla generadas.
- `audio-y-generacion/`: prompts de imagen, scripts de voz (ElevenLabs v4 vía Higgsfield) y mezcla (`clips.py`, `mix.py`), las 7 líneas de voz y la música. Los scripts esperan una carpeta `img/` de trabajo con esos archivos.
- Guion de voz: ver `audio-y-generacion/voz_lines.py` (LINES). Gasto Higgsfield de este video: 20 créditos.
- `page-v3.template.html` / `render-v3.mjs`: versión previa de la estructura (con escena del reloj/feriado).
