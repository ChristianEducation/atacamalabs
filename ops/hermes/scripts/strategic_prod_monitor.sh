#!/bin/bash
# Job «Radar · Producción» (--no-agent, SIN IA, costo 0): chequea los servicios confirmados con 1 GET cada uno y registra el resultado en Atacama OS.
# Por defecto NO imprime nada (stdout vacío = Hermes no manda nada a Telegram). Con la bandera apagada, la pausa general o sin servicios confirmados es un no-op.
# Uso: strategic_prod_monitor.sh [--dry-run | --probe https://...]   (--dry-run no registra; --probe prueba UNA dirección a mano y no usa n8n)
exec /opt/hermes/.venv/bin/python /opt/data/scripts/strategic_prod_monitor.py "$@"
