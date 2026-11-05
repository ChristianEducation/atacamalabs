#!/bin/bash
# Atacama OS v3 · Fase 3 — produce UNA versión de una pieza del Taller (lo llama la herramienta MCP taller_produce de Hermes).
# Imprime una sola línea JSON. Nunca programa ni publica. Higgsfield solo con TALLER_HIGGS=1 (bloqueado por defecto).
set -a; . /opt/data/.env; set +a
export PLAYWRIGHT_BROWSERS_PATH=/opt/data/.cache/ms-playwright
export ATACAMA_CHROMIUM_ARGS="--no-sandbox"
export ATACAMA_STATE_DIR=/opt/data/state
export TALLER_WORK_DIR=/opt/data/state/taller
export TALLER_PYTHON=/opt/hermes/.venv/bin/python
cd /opt/data/atacama-media || exit 1
exec timeout 1500 /usr/local/bin/node scripts/media/taller-producer.mjs "$@"
