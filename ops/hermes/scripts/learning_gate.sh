#!/bin/bash
# Compuerta previa del job «Aprendizaje» semanal (Atacama OS v3 · Fase 8): su salida se inyecta en el prompt del agente.
exec /opt/hermes/.venv/bin/python /opt/data/atacama-ops/atacama_ops_cli.py gate learning
