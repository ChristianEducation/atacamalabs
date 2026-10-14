#!/bin/bash
# Atacama OS · taller de motion en la VPS — valida, renderiza e iguala el volumen de un proyecto HyperFrames.
#   motion_render.sh <carpeta-del-proyecto> [nombre-de-salida]
# 1) hyperframes check (lint/runtime/layout/motion/contraste) — si falla, NO renderiza y sale con error.
# 2) hyperframes render 1080×1920 · 30 fps · calidad alta.   3) loudnorm a −15 LUFS / TP −1,5 (dos pasadas, video sin recomprimir).
# 4) copia ligera (crf 21) para revisar por mensajería.   Salidas en <proyecto>/renders/. Nunca sube, programa ni publica nada.
set -u
proj="${1:-}"; name="${2:-$(basename "${1:-video}")}"
[ -n "$proj" ] && [ -f "$proj/index.html" ] || { echo "uso: motion_render.sh <carpeta-del-proyecto con index.html> [nombre]"; exit 2; }
case "$(cd "$proj" && pwd)" in /opt/data/motion-studio/projects/*) ;; *) echo "ABORTA: el proyecto debe estar en /opt/data/motion-studio/projects/"; exit 2;; esac
HF=/opt/data/motion-studio/node_modules/.bin/hyperframes
export PLAYWRIGHT_BROWSERS_PATH=/opt/data/.cache/ms-playwright
cd "$proj" || exit 1
mkdir -p renders
echo "== check"; "$HF" check 2>&1 | tail -22 | sed 's/\x1b\[[0-9;]*m//g'
"$HF" check >/dev/null 2>&1 || { echo "ABORTA: hyperframes check falló; corrige antes de renderizar."; exit 3; }
echo "== render"; "$HF" render --fps 30 --quality high -o "renders/$name.mp4" 2>&1 | grep -E "Render complete|rendered in|Error|error" | sed 's/\x1b\[[0-9;]*m//g' | tail -4
[ -s "renders/$name.mp4" ] || { echo "ABORTA: no se generó renders/$name.mp4"; exit 4; }
if ffprobe -v error -select_streams a -show_entries stream=codec_type -of csv=p=0 "renders/$name.mp4" | grep -q audio; then
  m=$(ffmpeg -hide_banner -nostats -i "renders/$name.mp4" -af loudnorm=I=-15:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
  g() { echo "$m" | grep "\"$1\"" | sed -E 's/.*: *"([^"]+)".*/\1/'; }
  ffmpeg -hide_banner -loglevel error -y -i "renders/$name.mp4" -c:v copy -af "loudnorm=I=-15:TP=-1.5:LRA=11:measured_I=$(g input_i):measured_TP=$(g input_tp):measured_LRA=$(g input_lra):measured_thresh=$(g input_thresh):offset=$(g target_offset):linear=true" -c:a aac -b:a 192k "renders/$name-normalizado.mp4" || { echo "ABORTA: falló la normalización de volumen"; exit 5; }
else
  cp "renders/$name.mp4" "renders/$name-normalizado.mp4"
fi
ffmpeg -hide_banner -loglevel error -y -i "renders/$name-normalizado.mp4" -c:v libx264 -crf 21 -preset medium -pix_fmt yuv420p -c:a copy "renders/$name-ligero.mp4"
echo "== resultado"
for f in "renders/$name-normalizado.mp4" "renders/$name-ligero.mp4"; do
  d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f"); s=$(du -h "$f" | cut -f1)
  l=$(ffmpeg -hide_banner -nostats -i "$f" -af ebur128 -f null - 2>&1 | grep -E "^\s+I:" | tail -1 | awk '{print $2" LUFS"}')
  echo "$f · ${d%.*}.${d#*.} s · $s · ${l:-sin audio}" | sed -E 's/\.([0-9]{2})[0-9]*/.\1/'
done
