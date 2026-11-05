# Audio sintetizado (sin música con derechos). Lee timing.json para ir alineado con el video.
import json, sys, wave
import numpy as np
TM = json.load(open('timing.json'))
SR = 48000; DUR = 26.0; N = int(DUR * SR)
L = np.zeros(N); R = np.zeros(N)
rng = np.random.default_rng(5)
db = lambda x: 10 ** (x / 20)

def put(sig, t, gain=1.0, pan=0.0):
    i = int(t * SR)
    if i >= N or i < 0: return
    j = min(N, i + len(sig)); s = sig[:j - i] * gain
    L[i:j] += s * np.cos((pan + 1) * np.pi / 4); R[i:j] += s * np.sin((pan + 1) * np.pi / 4)

def tt(d): return np.arange(int(d * SR)) / SR
def lp(x, fc):
    tau = 1 / (2 * np.pi * fc); k = np.exp(-tt(min(8 * tau, 0.2)) / tau); k /= k.sum()
    n = len(x) + len(k); F = 1 << (n - 1).bit_length()
    return np.fft.irfft(np.fft.rfft(x, F) * np.fft.rfft(k, F), F)[:len(x)]
def hp(x, fc): return x - lp(x, fc)
def bp(x, a, b): return lp(hp(x, a), b)
def noise(d): return rng.standard_normal(int(d * SR))
def env_ad(d, a, dec):
    t = tt(d); return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / dec)
def tone(f, d, a=0.004, dec=0.2, parts=((1, 1.0),), f_end=None):
    t = tt(d)
    if f_end: ph = 2 * np.pi * np.cumsum(np.linspace(f, f_end, len(t))) / SR
    else: ph = 2 * np.pi * f * t
    s = sum(am * np.sin(ph * p) for p, am in parts); return s * env_ad(d, a, dec)
def bell(f, d=1.2, dec=0.45):
    return tone(f, d, 0.002, dec, ((1, 1.0), (2.76, .45), (5.4, .2), (8.9, .08)))
def click(d=0.03, hpf=2000, f=1500):
    return (hp(noise(d), hpf) * env_ad(d, .0005, .006)) * 0.7 + tone(f, d, .0005, .01) * 0.4
def thud(f=90, d=0.35, dec=0.09):
    return tone(f, d, .002, dec, f_end=f * .6) + 0.5 * lp(noise(d), 500) * env_ad(d, .001, .03)
def pop(f0=600, f1=950, d=0.09):
    return tone(f0, d, .002, .035, f_end=f1) * 0.9
def swoosh(d, up=True, hi=4500, lo=600):
    n = noise(d); t = tt(d); u = t / d
    a = lp(n, lo * 3) * (1 - u if up else u); b = bp(n, lo, hi) * (u if up else 1 - u)
    env = np.sin(np.pi * np.clip(u, 0, 1)) ** 1.5
    return (a + b) * env
def chime(f, d=0.9, dec=0.28):
    return tone(f, d, .002, dec, ((1, 1.0), (2.0, .25), (3.0, .1)))
def pad(freqs, d, a=0.8, r=0.8):
    t = tt(d); env = np.minimum(1, t / a) * np.minimum(1, (d - t) / r)
    s = 0
    for f in freqs:
        for det in (-0.9, 0.0, 0.9):
            s = s + np.sin(2 * np.pi * (f + det * f / 440 * 1.5) * t + det) + 0.25 * np.sin(4 * np.pi * f * t)
    return s * env / (len(freqs) * 3)

# ---------- ambiente ----------
room = lp(np.cumsum(noise(DUR)) , 300); room = hp(room, 40); room /= np.abs(room).max()
amb_env = np.ones(N); tn = np.arange(N) / SR
amb_env *= np.clip(tn / 1.0, 0, 1) * (1 - np.clip((tn - 17.0) / 1.5, 0, 1) * .8)
put(room * amb_env[:len(room)], 0, db(-34), 0)

# ---------- gancho ----------
for k, t in enumerate([0.35, 0.85, 1.35]): put(click(), t, db(-22), 0)
put(swoosh(0.45, True), 0.3, db(-26), 0)
t0 = TM['hookNotif']
put(chime(988, 0.8, .22), t0, db(-17), 0.1); put(chime(1319, 1.1, .3), t0 + 0.13, db(-17), 0.1)
vib = np.sin(2 * np.pi * 150 * tt(0.4)) * (0.5 + 0.5 * np.sin(2 * np.pi * 36 * tt(0.4))) * np.hanning(int(0.4 * SR))
put(vib, t0 + 0.45, db(-24), 0)
put(swoosh(0.3, True), TM['hookText'] - 0.05, db(-30), 0)
put(thud(70, .5, .14), TM['hookText'] + 0.3, db(-12), 0); put(click(), TM['hookText'] + 0.3, db(-18), 0)

# ---------- corte en dos ----------
s0 = TM['splitStart']
put(thud(60, .7, .2), s0, db(-10), 0); put(swoosh(0.7, True, 7000, 900), s0 - 0.05, db(-20), 0)
put(chime(1568, 1.2, .45), s0 + 0.35, db(-26), 0.2)

# ---------- teléfono ----------
put(swoosh(0.42, False, 3000, 300), 3.3, db(-28), -0.4)
put(thud(105, .3, .08), 3.72, db(-13), -0.4); put(bell(2100, .5, .15), 3.74, db(-26), -0.4)
for r in TM['rings']:
    n = int(TM['ringDur'] * 16); d = TM['ringDur']
    seg = np.zeros(int((d + .3) * SR))
    for i in range(n):
        f = 1180 if i % 2 == 0 else 1480
        b = bell(f, .1, .035)
        a = int(i / 16 * SR); seg[a:a + len(b)] += b[:len(seg) - a]
    e = np.minimum(1, tt(d + .3) / .02) * np.minimum(1, np.maximum(0, (d + .15 - tt(d + .3)) / .1))
    put(seg * e, r, db(-17), -0.35)
# ---------- chat (lado agente) ----------
UP = 0.35
put(pop(540, 760), TM['cust'], db(-22), UP)
for t in (4.4, 4.58, 4.76): put(click(.02, 3000, 1000), t, db(-30), UP)
put(pop(700, 1120), TM['agent'], db(-19), UP)
put(swoosh(0.4, True, 3500, 500), TM['sheet'] - 0.05, db(-27), UP)
for i, (tp, f) in enumerate([(TM['tap1'], 1046), (TM['tap2'], 1319), (TM['tap3'], 1568)]):
    put(click(.03, 1500, 900), tp, db(-17), UP); put(thud(180, .12, .03), tp, db(-22), UP)
    put(chime(f, .6, .2), tp + 0.04, db(-23), UP)
put(swoosh(0.4, False, 3500, 500), TM['tap3'] + 0.25, db(-28), UP)
d0 = TM['done']
put(pop(700, 1100), d0, db(-19), UP)
for f in (1046, 1319, 1568, 2093): put(chime(f, 1.3, .5), d0 + 0.02, db(-26), UP)
# ---------- la mañana ----------
m0 = TM['morning'] - 0.2
put(pad([220, 277, 330, 440], 3.0, 1.0, 1.4), m0, db(-26), 0)
put(swoosh(0.7, True, 6000, 700), m0, db(-26), 0)
brng = np.random.default_rng(3)
for i in range(9):
    t = 12.2 + i * 0.5 + brng.random() * .3; f0 = 3200 + brng.random() * 1800
    for j in range(2 + int(brng.random() * 2)):
        put(tone(f0, .07, .004, .03, f_end=f0 * (1.2 + brng.random() * .3)), t + j * 0.09, db(-36), 0.5 * (brng.random() * 2 - 1))
k = 0
while True:
    t = k * np.pi / 9.5; k += 1
    if t < TM['walk0']: continue
    if t > TM['walk1']: break
    vn = (1 - (t - TM['walk0']) / (TM['walk1'] - TM['walk0'])) ** 2
    put(thud(95, .18, .05), t, db(-22 + 6 * vn), -0.45); put(click(.015, 600, 500), t, db(-30), -0.45)
for i, t in enumerate(TM['cards']):
    put(pop(650, 980), t, db(-21), UP); put(tone(1800 + 120 * i, .12, .001, .04), t + 0.3, db(-26), UP)
tn0 = TM['note']
put(hp(noise(.08), 1500) * env_ad(.08, .002, .02), tn0, db(-20), -0.4); put(thud(120, .25, .07), tn0, db(-18), -0.4)
put(tone(330, 1.0, .01, .4, ((1, 1), (2, .2))), tn0 + 0.2, db(-26), -0.2); put(tone(262, 1.4, .01, .6, ((1, 1), (2, .2))), tn0 + 0.5, db(-26), -0.2)
def typeburst(t0, n, cps, amp, pan):
    for i in range(n):
        put(click(.02, 2500 + 800 * rng.random(), 1100 + 400 * rng.random()), t0 + i / cps, db(amp) * (0.6 + .4 * rng.random()), pan)
typeburst(TM['rings'][0] + 0.1, 6, 14, -30, -0.4); typeburst(TM['rings'][2] - 0.3, 15, 18, -30, -0.4); typeburst(TM['rings'][3] + 0.15, 24, 20, -30, -0.4)
typeburst(TM['note'] + 0.3, 26, 24, -26, -0.4); typeburst(TM['lost'], 21, 20, -28, -0.4)
# ---------- empalme al cierre ----------
w0 = TM['wipe']
rs = tone(180, 1.4, .8, 5, f_end=1100) * np.linspace(0, 1, int(1.4 * SR)) ** 2
put(rs, w0 - 1.4, db(-27), 0); put(swoosh(1.2, True, 7000, 800), w0 - 1.2, db(-24), 0)
put(thud(55, .9, .22), w0 + 0.1, db(-9), 0); put(swoosh(0.5, False, 6000, 900), w0, db(-20), 0)
# ---------- hub ----------
h0 = TM['hub0']
for tp in (0.75, 0.95, 1.15): put(pop(500, 760), h0 + tp, db(-22), 0)
put(tone(220, .6, .01, .22, ((1, 1), (2, .3))), h0 + 1.1, db(-22), 0)
for i in range(6):
    put(tone(700 + 95 * i, .25, .002, .08, ((1, 1), (2, .2))), h0 + 2.0 + i * 0.25 + 0.5, db(-24), (-1 + i * .4) * .6)
put(tone(160, 1.0, .5, 3, f_end=900) * np.linspace(0, 1, int(1.0 * SR)) ** 2, h0 + 3.3, db(-27), 0); put(swoosh(0.8, True, 6000, 800), h0 + 3.4, db(-26), 0)
lg = h0 + 4.5
put(bell(880, 2.6, .9), lg, db(-13), 0); put(bell(1320, 2.0, .6), lg + 0.02, db(-22), 0); put(thud(52, 1.2, .35), lg, db(-13), 0)
put(click(.03, 2000, 2000), h0 + 5.1, db(-20), 0); put(tone(1760, .3, .002, .1), h0 + 5.1, db(-27), 0)
put(pop(560, 780), TM['tag2'], db(-24), 0); put(click(.03, 1500, 1200), h0 + 5.3, db(-24), 0)

# ---------- música de fondo (pad + arpegio suave) ----------
chords = [(2.0, 8.0, [110, 164.8, 220, 261.6]), (8.0, 12.2, [87.3, 130.8, 174.6, 220]), (12.0, 17.2, [130.8, 196, 329.6, 587.3]), (17.2, 22.0, [130.8, 196, 261.6, 329.6, 493.9]), (21.6, 26.0, [130.8, 196, 261.6, 329.6, 493.9, 659.3])]
for a, b, fr in chords: put(pad(fr, b - a + 0.8, 1.2, 1.2), a - 0.2, db(-27), 0)
pent = [261.6, 293.7, 329.6, 392, 440, 523.3, 587.3, 659.3]
t = 17.5; i = 0
while t < 25.2:
    f = pent[[0, 2, 4, 3, 5, 4, 2, 1][i % 8]]
    put(tone(f * (2 if i % 8 in (4, 5) else 1), .5, .003, .18, ((1, 1), (2, .2))), t, db(-30 + 3 * min(1, (t - 17.5) / 3)), (-0.3 if i % 2 else 0.3))
    t += 0.25; i += 1
t = 3.0; i = 0
while t < 11.8:  # arpegio muy suave del lado del agente
    f = [220, 330, 262, 392][i % 4]
    put(tone(f, .6, .004, .25), t, db(-36), 0.3); t += 0.5; i += 1

# ---------- master ----------
fade = np.clip((DUR - tn) / 1.2, 0, 1)
L *= fade; R *= fade
peak = max(np.abs(L).max(), np.abs(R).max()); k = db(-2.0) / peak
out = np.stack([L * k, R * k], axis=1)
pcm = (np.clip(out, -1, 1) * 32767).astype('<i2')
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('ok', sys.argv[1], 'pico previo', round(float(peak), 2))
