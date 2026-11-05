# Audio sintetizado (sin música con derechos). Lee timing.json para ir alineado con el video.
import json, sys, wave
import numpy as np
TM = json.load(open('timing.json'))
SR = 48000; DUR = 14.6; N = int(DUR * SR)
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


# Sonidos muy discretos, siempre bajo la voz (la voz original no se toca)
put(swoosh(0.30, True, 6500, 900), TM['wipe0'] - 0.06, db(-24), 0)                        # entrada: barrido suave al abrir la oficina
put(swoosh(0.42, True, 5500, 700), TM['trans0'] - 0.02, db(-23), 0)                       # transición: barrido limpio hacia el cierre
put(chime(1568, 1.1, .38), TM['e0'] + 0.45, db(-21), 0)                                   # marca: tono de confirmación discreto
put(thud(62, .9, .22), TM['e0'] + 0.12, db(-24), 0)                                       # apoyo grave muy suave al aparecer el logo
peak = max(np.abs(L).max(), np.abs(R).max()); k = db(-16.0) / peak
out = np.stack([L * k, R * k], axis=1)
pcm = (np.clip(out, -1, 1) * 32767).astype('<i2')
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('ok', sys.argv[1])
