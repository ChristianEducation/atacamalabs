#!/bin/bash
# Atacama OS alerts — job de Hermes sin IA (--no-agent). stdout vacío = silencio.
exec /opt/hermes/.venv/bin/python /opt/data/atacama-ops/atacama_ops_cli.py alerts "$@"
