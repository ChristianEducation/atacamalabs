# Audio sintetizado (sin música con derechos). Lee timing.json para ir alineado con el video.
import json, sys, wave
import numpy as np
TM = json.load(open('timing.json'))
SR = 48000; DUR = 21.5; N = int(DUR * SR)
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


OLDK = [0.0, 0.1, 2.12, 2.13, 2.2, 3.3, 3.31, 3.55, 4.13, 4.14, 4.9, 4.91, 5.15, 6.4, 6.41, 6.75, 7.95, 7.96, 8.25]; NEWK = [0.0, 0.1, 2.8876, 3.8876, 3.9842, 5.3702, 6.3702, 6.6726, 7.6151, 8.6151, 9.8501, 10.8501, 11.2401, 13.2714, 14.2714, 14.8239, 16.9035, 17.9035, 18.406]
def W(t):
    if t >= OLDK[-1]: return NEWK[-1] + (t - OLDK[-1])
    for k in range(len(OLDK) - 1):
        if t < OLDK[k + 1]: return NEWK[k] + (t - OLDK[k]) * (NEWK[k + 1] - NEWK[k]) / (OLDK[k + 1] - OLDK[k])
_put0 = put
def put(sig, t, gain=1.0, pan=0.0): return _put0(sig, W(t), gain, pan)
BED = np.zeros(N)
def bput(sig, t, g):
    i = int(W(t) * SR); j = min(N, i + len(sig)); BED[i:j] += sig[:j - i] * g
chords = [(0.0, TM['s3'], [110, 164.8, 220, 261.6]), (TM['s3'], TM['s5'], [87.3, 130.8, 174.6, 220, 349.2]), (TM['s5'], TM['s6'], [130.8, 196, 261.6, 329.6]), (TM['s6'], 11.35, [130.8, 196, 261.6, 329.6, 493.9])]
for a, b, fr in chords: bput(pad(fr, W(b) - W(a) + 0.8, 0.5, 0.9), a, db(-29))
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

def bass(f, d, dec):
    t = tt(d); return (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(4 * np.pi * f * t) + 0.3 * np.sin(6 * np.pi * f * t) + 0.12 * np.sin(8 * np.pi * f * t)) * np.minimum(1, t / 0.012) * np.exp(-t / dec)
def reverb(x, tail=2.2):
    ir = rng.standard_normal(int(tail * SR)) * np.exp(-tt(tail) / 0.55); ir = lp(ir, 2200); ir /= np.sqrt((ir ** 2).sum())
    n = len(x) + len(ir); F = 1 << (n - 1).bit_length()
    return np.fft.irfft(np.fft.rfft(x, F) * np.fft.rfft(ir, F), F)[:n]
e = TM['s6']
put(swoosh(1.0, True, 3500, 300), e - 0.7, db(-27), 0)
h1 = bass(49, 1.4, .35); put(h1, e + 0.1, db(-11), 0); put(thud(80, .25, .05), e + 0.1, db(-17), 0)
h2 = bass(65.4, 2.8, .9); h2 = h2 + 0.9 * reverb(h2, 2.2)[:len(h2)]; h2 /= np.abs(h2).max()
put(h2, e + 0.45, db(-8), 0); put(thud(90, .3, .06), e + 0.45, db(-15), 0)
put(bell(880, 2.2, .7), e + 0.45, db(-28), 0)

put(pop(560, 780), TM['s6'] + 0.4, db(-23), 0); put(click(.03, 1500, 1200), TM['s6'] + 1.0, db(-26), 0); put(pop(600, 850), TM['s6'] + 1.2, db(-26), 0)

fade = np.clip((DUR - tn) / 0.8, 0, 1) if False else np.clip((DUR - np.arange(N) / SR) / 0.6, 0, 1)
peak = max(np.abs(L).max(), np.abs(R).max()); k = db(-2.0) / peak
out = np.stack([L * fade * k, R * fade * k], axis=1)
pcm = (np.clip(out, -1, 1) * 32767).astype('<i2')
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('ok', sys.argv[1], 'pico previo', round(float(peak), 2))
