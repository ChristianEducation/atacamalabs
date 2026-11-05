s = open('../audio.py', encoding='utf-8').read()
h = s[:s.index('# ---------- ambiente ----------')]
h = h.replace("open('timing.json')", "open('timing.json')").replace("DUR = 26.0", "DUR = 11.0")
body = r'''
BED = np.zeros(N)
def bput(sig, t, g):
    i = int(t * SR); j = min(N, i + len(sig)); BED[i:j] += sig[:j - i] * g
chords = [(0.0, TM['s3'], [110, 164.8, 220, 261.6]), (TM['s3'], TM['s5'], [87.3, 130.8, 174.6, 220, 349.2]), (TM['s5'], TM['s6'], [130.8, 196, 261.6, 329.6]), (TM['s6'], DUR, [130.8, 196, 261.6, 329.6, 493.9])]
for a, b, fr in chords: bput(pad(fr, b - a + 0.8, 0.5, 0.9), a, db(-29))
L += BED * np.cos(np.pi / 4); R += BED * np.sin(np.pi / 4)

# ---- escena 1: 100 llamadas, 62 se pierden ----
put(swoosh(0.5, True, 6000, 800), 0.0, db(-24), 0); put(thud(70, .5, .16), 0.1, db(-11), 0)
put(tone(200, 1.3, .9, 5, f_end=900) * np.linspace(0, 1, int(1.3 * SR)) ** 2, TM['lose0'] - 0.05, db(-30), 0)
for r in range(62):
    tl = TM['lose0'] + (TM['lose1'] - TM['lose0']) * (r / 62) ** 1.4
    put(click(.02, 2500, 900 + 9 * r), tl, db(-27), -0.3 + 0.6 * rng.random())
# ---- escena 2: con IA, menos de 3 ----
put(swoosh(0.5, True, 7000, 900), TM['s2'] - 0.05, db(-24), 0)
for r in range(3, 62):
    tr = TM['back0'] + (TM['back1'] - TM['back0']) * ((61 - r) / 58) ** 1.2
    put(click(.015, 3500, 1500 + 14 * (61 - r)), tr, db(-30), -0.3 + 0.6 * rng.random())
tb = TM['back1'] + 0.05
put(chime(1568, 1.2, .4), tb, db(-18), 0); put(chime(2093, 1.0, .3), tb + 0.08, db(-23), 0); put(thud(60, .5, .15), tb, db(-14), 0)
# ---- cambios de escena ----
for k in ('s3', 's4', 's5', 's6'): put(swoosh(0.4, True, 5000, 700), TM[k] - 0.25, db(-28), 0)
# ---- escena 3: horas ----
put(swoosh(0.45, True, 4500, 500), TM['s3'] + 0.12, db(-25), 0); put(swoosh(0.5, True, 5500, 600), TM['s3'] + 0.58, db(-25), 0)
put(chime(1568, 1.3, .45), TM['s3'] + 1.05, db(-17), 0); put(thud(70, .6, .18), TM['s3'] + 1.05, db(-15), 0)
# ---- escena 4: cronómetros ----
t = TM['s4'] + 0.15
while t < TM['s4'] + 0.95:
    put(click(.012, 3000, 2200), t, db(-33), 0.3); t += 0.07
put(pop(900, 1600), TM['s4'] + 0.3, db(-17), -0.2); put(chime(2093, 1.0, .35), TM['s4'] + 0.32, db(-19), -0.2)
put(tone(220, .5, .005, .18), TM['s4'] + 0.95, db(-22), 0.3)
# ---- escena 5: barras ----
put(tone(300, .55, .02, 5, f_end=700) * np.linspace(0, 1, int(.55 * SR)) ** .7, TM['s5'] + 0.15, db(-27), -0.2)
put(tone(400, .55, .02, 5, f_end=1000) * np.linspace(0, 1, int(.55 * SR)) ** .7, TM['s5'] + 0.25, db(-27), 0.2)
put(pop(700, 1100), TM['s5'] + 0.85, db(-17), 0); put(chime(1760, 1.0, .35), TM['s5'] + 0.87, db(-20), 0)
# ---- cierre ----
put(bell(880, 2.4, .9), TM['s6'] + 0.1, db(-14), 0); put(bell(1320, 1.8, .6), TM['s6'] + 0.12, db(-23), 0); put(thud(52, 1.0, .3), TM['s6'] + 0.1, db(-14), 0)
put(pop(560, 780), TM['s6'] + 0.4, db(-23), 0); put(click(.03, 1500, 1200), TM['s6'] + 0.85, db(-24), 0); put(pop(600, 850), TM['s6'] + 0.95, db(-24), 0)
put(swoosh(0.5, True, 5000, 600), TM['cursorIn'] - 0.05, db(-30), 0)
tc = TM['click']
put(click(.025, 3500, 1900), tc, db(-13), 0); put(thud(260, .08, .02), tc, db(-20), 0); put(click(.02, 3000, 1500), tc + 0.11, db(-22), 0); put(chime(1760, .9, .3), tc + 0.06, db(-24), 0)

fade = np.clip((DUR - tn) / 0.8, 0, 1) if False else np.clip((DUR - np.arange(N) / SR) / 0.6, 0, 1)
peak = max(np.abs(L).max(), np.abs(R).max()); k = db(-2.0) / peak
out = np.stack([L * fade * k, R * fade * k], axis=1)
pcm = (np.clip(out, -1, 1) * 32767).astype('<i2')
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('ok', sys.argv[1], 'pico previo', round(float(peak), 2))
'''
open('audio_ads.py', 'w', encoding='utf-8').write(h + body)
print('ok')
