#!/bin/bash
# Compuerta previa de los jobs con IA del Radar estratégico (products | partners | events): su salida se inyecta en el prompt del agente.
# Uso: strategic_gate.sh products|partners|events [--force]
#   Sin --force solo deja correr dentro del horario del job en HORA DE CHILE (el cron se dispara en los dos horarios UTC posibles; el otro se descarta).
#   --force sirve para una corrida supervisada fuera de horario: la compuerta de Atacama OS (bandera, pausa, cuota) igual manda.
# Cualquier duda (n8n caído, respuesta rara, categoría desconocida) = mode=skip. No imprime claves.
exec /opt/hermes/.venv/bin/python /opt/data/atacama-ops/strategic_lib.py gate "$@"
