"""Audio PROVISIONAL del boceto «Un agente, cada rubro» (8,4 s): obturador múltiple, subida de tensión y golpe grave.
Sirve para ver y oír la idea; el audio final se genera en Higgsfield con los mismos tiempos (ver tiempos en index.html).
Uso: python build_audio.py → ../assets/audio.wav"""
import subprocess, os
import numpy as np

SR = 48000
DUR = 8.4
N = int(SR * DUR)
rng = np.random.default_rng(5)
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


def shutter(v=1.0):
    """Obturador de cámara réflex: golpe del espejo + cierre de cortina (dos clics) con cuerpo grave."""
    n = int(0.2 * SR); t = np.arange(n) / SR
    out = np.zeros(n)
    # espejo: clic seco y golpe sordo
    c1 = bp(rng.standard_normal(n), 900, 6500) * env(n, 0.0035) * 1.6 + np.sin(2 * np.pi * 150 * t) * env(n, 0.014) * 0.9
    out += c1 * rng.uniform(.9, 1.1)
    # cortina: segundo clic, más agudo y suave
    d = int(0.058 * SR)
    m = n - d
    c2 = bp(rng.standard_normal(m), 1500, 9000) * env(m, 0.0045) * 1.0 + np.sin(2 * np.pi * 95 * t[:m]) * env(m, 0.01) * 0.45
    out[d:] += c2
    return out * v * 0.55


def riser(dur=1.2):
    n = int(dur * SR); t = np.arange(n) / SR; u = t / dur
    x = bp(rng.standard_normal(n), 400, 7000) * (0.15 + u ** 2.4)
    tone = np.sin(2 * np.pi * np.cumsum(160 * (1 + 3.0 * u ** 1.7)) / SR) * 0.25
    return (x * 1.4 + tone) * (u ** 1.8) * 0.9


def boom(dur=2.0):
    n = int(dur * SR); t = np.arange(n) / SR
    ph = 2 * np.pi * np.cumsum(36 + 60 * np.exp(-t / 0.05)) / SR
    sub = np.tanh(1.8 * np.sin(ph)) * env(n, 0.5)
    body = bp(rng.standard_normal(n), 80, 2600) * env(n, 0.12) * 0.7
    air = bp(rng.standard_normal(n), 2500, 10000) * env(n, 0.35) * 0.35
    return sub + body + air


def pad(freqs, t0, dur, g, fade=1.0):
    n = int(dur * SR); t = np.arange(n) / SR
    a = np.minimum(1, t / fade) * np.clip((dur - t) / fade, 0, 1)
    for ch, d in ((0, .2), (1, -.2)):
        x = sum(np.sin(2 * np.pi * (f + d) * t) + .22 * np.sin(2 * np.pi * (f + d) * 2 * t) for f in freqs) / len(freqs)
        mix[ch, int(t0 * SR):int(t0 * SR) + n] += x * a * g


# cama suave: se abre en el logo
pad([55, 110, 164.8], 0.0, 5.9, 0.07, fade=1.5)
pad([55, 110, 164.8, 220, 277.2, 329.6], 5.75, 2.65, 0.11, fade=0.7)
# intro: el visor se arma
add(bp(rng.standard_normal(int(0.5 * SR)), 300, 6000) * np.sin(np.pi * np.linspace(0, 1, int(0.5 * SR))) ** 2 * 0.5, 0.0, 0.3)
# ráfaga de 6 fotos
for i in range(6):
    add(shutter(1.0 if i else 1.1), 1.2 + i * 0.42, 1.0, pan=(-0.25, 0.25)[i % 2])
# hoja de contacto: un último disparo y las fotos que caen
add(shutter(1.1), 3.95, 1.0)
# ráfaga que acelera al revelar los rubros (mismos tiempos que las fotos de la hoja)
for i, tt in enumerate([4.08, 4.22, 4.34, 4.44, 4.53, 4.61]):
    add(shutter(0.9), tt, 1.0, pan=-0.45 + 0.18 * i)
# subida de tensión y golpe
add(riser(1.25), 4.5, 0.55)
add(boom(2.4), 5.75, 0.95)
# cierre: enfoque
add(shutter(0.7), 6.9, 0.8)
add(shutter(0.5), 7.0, 0.5, pan=0.3)

m = mix / (np.abs(mix).max() or 1) * 0.85
pcm = (np.clip(m.T, -1, 1) * 32767).astype("<i2").tobytes()
out = os.path.join(HERE, "..", "assets", "audio.wav")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "s16le", "-ar", str(SR), "-ac", "2", "-i", "-",
                "-af", "highpass=f=28,loudnorm=I=-15:TP=-1.5:LRA=9", "-ar", str(SR), out], input=pcm, check=True)
print("listo:", out)
