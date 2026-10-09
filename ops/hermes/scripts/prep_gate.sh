#!/bin/bash
# Compuerta previa del job contact-prep: su salida se inyecta en el prompt del agente (mode=skip → el agente termina sin gastar).
exec /opt/hermes/.venv/bin/python /opt/data/atacama-ops/atacama_ops_cli.py gate prep
