#!/bin/bash
# Atacama OS · Media Worker (Frente A) — job de Hermes sin IA (--no-agent), cada ~5 min.
# Renderiza los carruseles en cola (workflow 30 «claim») con el mismo renderer del PC, sube las imágenes vía n8n y reenvía la pieza a revisión.
# stdout vacío = silencio (nada en cola); si renderiza o falla algo, imprime una línea en español que Hermes entrega por Telegram.
set -a; . /opt/data/.env; set +a
export PLAYWRIGHT_BROWSERS_PATH=/opt/data/.cache/ms-playwright
export ATACAMA_CHROMIUM_ARGS="--no-sandbox"
export ATACAMA_STATE_DIR=/opt/data/state
cd /opt/data/atacama-media || exit 1
exec /usr/local/bin/node scripts/media/vps-worker.mjs "$@"
