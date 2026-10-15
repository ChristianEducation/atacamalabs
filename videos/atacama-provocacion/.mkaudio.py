p = 'audio/build_audio.v2src.py'
s = open(p, encoding='utf8').read()
head = s[:s.index('# ───────── EFECTOS ─────────')]
head = head.replace('DUR = 22.0', 'DUR = 9.0').replace('«Un agente, muchos puestos» v2 (22 s)', '«¿Quién contesta?» premium (9 s), mismos sonidos suaves del primer video')
body = '''# ───────── EFECTOS: un sonido suave por golpe visual ─────────
# paneles que se abren desde la costura
sfx.add(whoosh(0.55), 0.0, 0.2, pan=-0.6); sfx.add(whoosh(0.55), 0.06, 0.2, pan=0.6)
sfx.add(thock(0.35), 0.3, 0.42)
sfx.add(tap(700), 0.45, 0.28); sfx.add(tap(620), 0.62, 0.24)
# barrido a la frase 2
sfx.add(whoosh(0.5), 1.85, 0.28)
sfx.add(thock(0.35), 2.0, 0.40)
sfx.add(tap(700), 2.45, 0.28); sfx.add(tap(620), 2.6, 0.24)
# barrido a «alguien | tiene que hacerlo»
sfx.add(whoosh(0.5), 4.4, 0.2, pan=0.6); sfx.add(whoosh(0.5), 4.48, 0.2, pan=-0.6)
sfx.add(thock(0.4), 4.55, 0.42)
sfx.add(tap(740), 5.0, 0.30); sfx.add(tap(520), 5.2, 0.32)
# las puertas se abren
sfx.add(whoosh(1.0, bright=0.5), 6.35, 0.34)
sfx.add(thock(0.5), 6.65, 0.5)
# logo, lema, subrayado y dirección
sfx.add(chime(A5, 1.6), 7.08, 0.30); sfx.add(chime(E5, 1.6), 7.18, 0.20)
sfx.add(zip_(), 7.5, 0.22)
sfx.add(tap(760), 7.95, 0.28)
sfx.add(tap(560), 8.25, 0.34)

# cama muy baja que sostiene el cierre
pad([A2, E3, A3, CS4], 0.0, 6.8, 0.7, fade=1.5)
pad([A2, E3, A3, CS4, E4], 6.4, 2.6, 1.0, fade=0.8)


def finish(bus, name, lufs):
    m = bus.m.copy()
    m /= max(1e-9, np.abs(m).max()) / 0.8
    pcm = (np.clip(m.T, -1, 1) * 32767).astype("<i2").tobytes()
    out = os.path.join(HERE, "..", "assets", name)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "s16le", "-ar", str(SR), "-ac", "2", "-i", "-",
                    "-af", f"loudnorm=I={lufs}:TP=-2:LRA=7", "-ar", str(SR), out], input=pcm, check=True)
    return out


finish(sfx, "audio-sfx.wav", -19)
mix = Bus()
mix.m = sfx.m / (np.abs(sfx.m).max() or 1) * 0.8 + mus.m / (np.abs(mus.m).max() or 1) * 0.8 * 10 ** (-26 / 20) * 3.2
print("listo:", finish(mix, "audio.wav", -17))
'''
open('audio/build_audio.py', 'w', encoding='utf8').write(head + body)
print('ok')
