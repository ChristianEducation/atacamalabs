#!/bin/bash
# Compuerta previa del job «Historias del día» (reglas de historias v1.1): su salida se inyecta en el prompt del agente.
exec /opt/hermes/.venv/bin/python /opt/data/atacama-ops/atacama_ops_cli.py gate storyday
