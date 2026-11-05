#!/bin/bash
# Atacama OS · crea un proyecto de video nuevo desde una plantilla validada cambiando SOLO el texto (Frente C).
#   motion_new.sh paneles-partidos <slug> <params.json>   |   motion_new.sh rafaga-de-camara <slug> <params.json>
# Después: /opt/data/scripts/motion_render.sh /opt/data/motion-studio/projects/<slug> <slug>
exec /usr/local/bin/node /opt/data/atacama-media/scripts/motion/motion-new.mjs "$@"
