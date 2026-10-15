s = open('../vid/n11/audio.py', encoding='utf-8').read()
h = s[:s.index('# ---------- ambiente ----------')]
h = h.replace("TM = json.load(open('timing.json'))", "TM = json.load(open('timing.json'))").replace("DUR = 26.0", "DUR = 14.1")
body = r'''
# Sonidos muy discretos, siempre bajo la voz (la voz original no se toca)
put(swoosh(0.42, True, 5500, 700), TM['trans0'] - 0.02, db(-23), 0)                       # transición: barrido limpio hacia el cierre
put(chime(1568, 1.1, .38), TM['e0'] + 0.45, db(-21), 0)                                   # marca: tono de confirmación discreto
put(thud(62, .9, .22), TM['e0'] + 0.12, db(-24), 0)                                       # apoyo grave muy suave al aparecer el logo
peak = max(np.abs(L).max(), np.abs(R).max()); k = db(-16.0) / peak
out = np.stack([L * k, R * k], axis=1)
pcm = (np.clip(out, -1, 1) * 32767).astype('<i2')
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('ok', sys.argv[1])
'''
open('fx_reel.py', 'w', encoding='utf-8').write(h + body)
print('ok')
