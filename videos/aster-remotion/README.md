# Video ASTER (Remotion) — «De lo que ocurre en terreno a una acción real»

Código fuente de la composición (los archivos llevan sufijo `.txt` para que el `tsc` del sitio no los compile; al copiarlos al proyecto Remotion, quita el `.txt`) (45 s, 1080×1920, 30 fps; versión 2 «comercial» del 5-nov). Vive en el proyecto Remotion de Atacama Labs
(`video-studio/atacama-video`, Remotion 4.0.484) y se registra en su `src/Root.tsx`:

```tsx
import { AsterDemo, AsterWide, ASTER_DURATION, ASTER_FPS } from './aster/AsterDemo';
<Composition id="AsterTall" component={AsterDemo} durationInFrames={ASTER_DURATION} fps={ASTER_FPS} width={1080} height={1920} />
<Composition id="AsterWide" component={AsterWide} durationInFrames={ASTER_DURATION} fps={ASTER_FPS} width={1920} height={1080} />
```

## Recursos que necesita (en `public/` del proyecto Remotion; no se versionan aquí por peso)
- `aster/plates/p1_territorio.mp4, p2_mantenimiento.mp4, p3_logistica.mp4, p4_operador.mp4, p5_control.mp4` (Higgsfield; prompts en `docs/aster-demo/video/ENTREGA-FINAL.md`)
- `aster/pdf-bp204.png` (página 1 del PDF real `docs/aster-demo/ejemplos-pdf-link/revision-lety-bp204.pdf`, 150 dpi)
- `aster/brand/*` (logos oficiales de `public/brand/`, WhatsApp y Google Drive)
- `fonts/Newsreader-latin-wght(.italic).woff2` y `fonts/DMSans-latin-wght.woff2` (las mismas fuentes de atacamalabs.cl)

## Renderizar
```bash
npx remotion render src/index.ts AsterTall out/aster-9x16-master.mp4 --codec=h264 --crf=18 --pixel-format=yuv420p
npx remotion render src/index.ts AsterWide out/aster-16x9-master.mp4 --codec=h264 --crf=20 --pixel-format=yuv420p
# versión web (landing)
ffmpeg -i out/aster-9x16-master.mp4 -vf scale=720:1280:flags=lanczos -c:v libx264 -crf 24 -preset slow -pix_fmt yuv420p -movflags +faststart -an aster-demo.mp4
```
Render determinista, sin audio (la pieza se entiende sin sonido).
