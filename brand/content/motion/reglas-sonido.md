# Reglas de sonido (Motion v2)

- Los efectos van **por debajo de la música**; nada agudo ni estridente.
- Empezar en **tiempo fuerte** (el primer golpe coincide con el primer cambio visual).
- Nivel de loudness según el estándar vigente del taller (medirlo con `ffmpeg -af loudnorm=print_format=summary` y ajustar; no "a oído").
- **No prometer sincronía con el beat sin un detector de ritmo real:** usar `hyperframes beats` y anclar los cambios a esos tiempos.
- Si el audio no convence, la pieza se muestra sin sonido (antecedente del 14-oct): mejor silencio que audio sintético pobre.
- Audio de Higgsfield solo con autorización de Christian (créditos).
