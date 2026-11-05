#!/bin/bash
# Compuerta previa del job «Ideas de la semana» (Atacama OS v3 · Fase 4): su salida se inyecta en el prompt del agente.
exec /opt/hermes/.venv/bin/python /opt/data/atacama-ops/atacama_ops_cli.py gate ideas
