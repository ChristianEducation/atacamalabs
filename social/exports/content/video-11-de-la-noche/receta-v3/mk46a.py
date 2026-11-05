s = open('audio45.py', encoding='utf-8').read()
s = s.replace("open('timing45.json')", "open('timing46.json')").replace("DUR = 25.5", "DUR = 26.0")
R = [
    ("typeburst(TM['rings'][0] + 0.1, 6, 14, -30, -0.4); typeburst(TM['rings'][2] - 0.3, 15, 18, -30, -0.4); typeburst(TM['rings'][3], 24, 20, -30, -0.4)",
     "typeburst(TM['capT'][0], 6, 14, -30, -0.4); typeburst(TM['capT'][1], 15, 18, -30, -0.4); typeburst(TM['capT'][2], 24, 20, -30, -0.4)"),
]
for a, b in R:
    assert a in s, a[:50]
    s = s.replace(a, b)
# cama: solo pads muy bajos, sin arpegio
i = s.index("pent = [261.6")
j = s.index("L += BED") if "L += BED" in s else s.index("import os\nif not os.environ.get('NO_BED')")
s = s[:i] + s[j:]
s = s.replace("bput(pad(fr, b - a + 0.8, 1.2, 1.2), a - 0.2, db(-25))", "bput(pad(fr, b - a + 0.8, 1.2, 1.2), a - 0.2, db(-31))")
# click del mouse sobre la URL + voz + ducking antes del master
voz = '''
# ---------- click en la URL ----------
tc = TM['click']
put(click(.025, 3500, 1900), tc, db(-13), 0); put(thud(260, .08, .02), tc, db(-20), 0)
put(click(.02, 3000, 1500), tc + 0.11, db(-22), 0)
put(chime(1760, .9, .3), tc + 0.06, db(-24), 0)
put(swoosh(0.5, True, 5000, 600), TM['cursorIn'] - 0.05, db(-30), 0)

# ---------- voz en off ----------
import os
voice = os.environ.get('VOICE', 'marisol')
x = wave.open('mus/voz-%s.wav' % voice); VO_SRC = np.frombuffer(x.readframes(x.getnframes()), '<i2').astype(float) / 32768
SEGS = json.load(open('mus/segs-%s.json' % voice))  # {"S1": [ini, fin, t_video], ...}
VO = np.zeros(N)
for name, (a, b, tv) in SEGS.items():
    sl = VO_SRC[int(max(0, a - 0.04) * SR):int((b + 0.08) * SR)].copy()
    f = int(0.008 * SR); sl[:f] *= np.linspace(0, 1, f); sl[-f:] *= np.linspace(1, 0, f)
    i = int((tv - 0.04) * SR); VO[i:i + len(sl)] += sl[:N - i]
VO *= db(-3) / np.abs(VO).max()
env = lp(np.abs(VO), 7); env = np.clip(env / env.max() * 3.0, 0, 1)
duck = 1 - 0.55 * env
L *= duck; R *= duck
'''
m = s.index("# ---------- master ----------")
s = s[:m] + voz + "\n" + s[m:]
# sumar la voz al final, antes de normalizar el pico del resto
s = s.replace("fade = np.clip((DUR - tn) / 1.2, 0, 1)\nL *= fade; R *= fade\npeak = max(np.abs(L).max(), np.abs(R).max()); k = db(-2.0) / peak\nout = np.stack([L * k, R * k], axis=1)",
              "fade = np.clip((DUR - tn) / 1.2, 0, 1)\npeak0 = max(np.abs(L).max(), np.abs(R).max()); L *= db(-12) / peak0; R *= db(-12) / peak0\nL = (L + VO) * fade; R = (R + VO) * fade\npeak = max(np.abs(L).max(), np.abs(R).max()); k = db(-2.0) / peak\nout = np.stack([L * k, R * k], axis=1)")
assert "L = (L + VO) * fade" in s
open('audio46.py', 'w', encoding='utf-8').write(s)

# tiempos de las frases en el video (Marisol: segmentos detectados en la fuente)
import json
segs = {
    'S1': [0.04, 1.52, 0.60], 'S2': [1.86, 3.06, 3.00], 'S3': [3.54, 3.96, 4.45], 'S4': [4.28, 7.70, 6.55],
    'S5a': [8.24, 8.94, 10.05], 'S5b': [9.26, 10.60, 11.00], 'S6': [10.88, 11.56, 13.20], 'S7': [12.06, 13.24, 14.80],
    'S8': [13.66, 15.32, 16.30], 'S9': [15.64, 18.22, 18.70],
}
json.dump(segs, open('mus/segs-marisol.json', 'w'))
print('ok')
