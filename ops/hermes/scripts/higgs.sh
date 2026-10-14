#!/bin/bash
# Atacama OS · única puerta de Hermes a Higgsfield (Frente B): consultas libres y «generate create» con tope semanal (150), por llamada (40) y reserva de saldo.
# Uso: /opt/data/scripts/higgs.sh status | generate create <modelo> … --purpose "para qué" | model list/get | generate cost …
export HOME=/opt/data
export ATACAMA_STATE_DIR=/opt/data/state
export HIGGSFIELD_BIN=/opt/data/motion-studio/node_modules/.bin/higgsfield
exec /usr/local/bin/node /opt/data/atacama-media/scripts/media/higgs-guard.mjs "$@"
