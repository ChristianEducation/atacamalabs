#!/bin/bash
# Compuerta previa del job «Instagram Semanal» (Frente C): su salida se inyecta en el prompt del agente.
exec /opt/hermes/.venv/bin/python /opt/data/atacama-ops/atacama_ops_cli.py gate igweek
