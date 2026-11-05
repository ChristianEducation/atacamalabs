"""Audio PROVISIONAL de «Un agente, un puesto» (9,4 s). El definitivo se genera en Higgsfield con los tiempos de index.html.
Golpes: título 0 · puestos 1,3 / 2,7 / 4,1 / 5,5 · golpe grave y puertas 7,0 · logo 7,5 · url 8,65."""
import subprocess, os
import numpy as np

SR = 48000
DUR = 9.4
N = int(SR * DUR)
rng = np.random.default_rng(9)
HERE = os.path.dirname(os.path.abspath(__file__))
mix = np.zeros((2, N))


def env(n, tau):
    return np.exp(-np.arange(n) / (tau * SR))


def bp(x, lo, hi):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X[(f < lo) | (f > hi)] = 0
    return np.fft.irfft(X, len(x))


def add(x, t, g=1.0, pan=0.0):
    i = int(round(t * SR))
    if i < 0 or i >= N:
        return
    L = min(len(x), N - i)
    x = np.asarray(x, float)[:L] * g
    mix[0, i:i + L] += x * np.sqrt((1 - pan) / 2)
    mix[1, i:i + L] += x * np.sqrt((1 + pan) / 2)


def whoosh(dur=0.5, lo=300, hi=7000):
    n = int(dur * SR); u = np.linspace(0, 1, n)
    return bp(rng.standard_normal(n), lo, hi) * np.sin(np.pi * u) ** 2 * 1.2


def thud(f=70, dur=0.35):
    n = int(dur * SR); t = np.arange(n) / SR
    return np.tanh(1.4 * np.sin(2 * np.pi * np.cumsum(f + 60 * np.exp(-t / 0.04)) / SR)) * env(n, 0.1)


def tok(f=330):
    n = int(0.22 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * t) * env(n, 0.035) + 0.45 * np.sin(2 * np.pi * f * 2.76 * t) * env(n, 0.014) + bp(rng.standard_normal(n), 1500, 6000) * env(n, 0.003) * 0.4) * 0.8


def tick(f=900):
    n = int(0.06 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * t) * env(n, 0.012) * 0.6 + bp(rng.standard_normal(n), 2500, 9000) * env(n, 0.002) * 0.5)


def riser(dur=1.0):
    n = int(dur * SR); u = np.linspace(0, 1, n)
    return bp(rng.standard_normal(n), 400, 7000) * u ** 2.2 * 1.3


def boom(dur=2.2):
    n = int(dur * SR); t = np.arange(n) / SR
    sub = np.tanh(1.8 * np.sin(2 * np.pi * np.cumsum(36 + 60 * np.exp(-t / 0.05)) / SR)) * env(n, 0.5)
    return sub + bp(rng.standard_normal(n), 80, 2600) * env(n, 0.12) * 0.7 + bp(rng.standard_normal(n), 2500, 10000) * env(n, 0.3) * 0.3


def pad(freqs, t0, dur, g, fade=1.0):
    n = int(dur * SR); t = np.arange(n) / SR
    a = np.minimum(1, t / fade) * np.clip((dur - t) / fade, 0, 1)
    for ch, d in ((0, .2), (1, -.2)):
        x = sum(np.sin(2 * np.pi * (f + d) * t) + .22 * np.sin(2 * np.pi * (f + d) * 2 * t) for f in freqs) / len(freqs)
        mix[ch, int(t0 * SR):int(t0 * SR) + n] += x * a * g


pad([55, 110, 164.8], 0.0, 7.2, 0.07, fade=1.5)
pad([55, 110, 164.8, 220, 277.2, 329.6], 7.0, 2.4, 0.11, fade=0.7)
add(whoosh(0.55), 0.0, 0.3, pan=-0.5); add(whoosh(0.55), 0.06, 0.3, pan=0.5)
for t, p in [(1.3, 0), (2.7, 0.5), (4.1, 0), (5.5, -0.5)]:
    add(whoosh(0.5), t - 0.05, 0.3, pan=p); add(thud(), t + 0.05, 0.4); add(tok(), t + 0.1, 0.45, pan=p)
    for k, dt in enumerate([0.4, 0.58, 0.76, 1.02]):
        add(tick(900 + 60 * k), t + dt, 0.22, pan=-p * 0.5)
add(riser(1.1), 5.9, 0.5)
add(boom(2.4), 7.0, 0.95)
add(tick(1200), 8.65, 0.3)

m = mix / (np.abs(mix).max() or 1) * 0.85
pcm = (np.clip(m.T, -1, 1) * 32767).astype("<i2").tobytes()
out = os.path.join(HERE, "..", "assets", "audio.wav")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "s16le", "-ar", str(SR), "-ac", "2", "-i", "-",
                "-af", "highpass=f=28,loudnorm=I=-15:TP=-1.5:LRA=9", "-ar", str(SR), out], input=pcm, check=True)
print("listo:", out)
