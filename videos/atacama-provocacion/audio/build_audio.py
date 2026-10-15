"""Sonido de «¿Quién contesta?» premium (9 s), mismos sonidos suaves del primer video.
Genera DOS pistas sincronizadas a los golpes visuales (pulso de 0,6 s = 100 BPM):
  ../assets/audio.wav       efectos suaves + cama musical sobria (la que usa el render)
  ../assets/audio-sfx.wav   solo efectos suaves (como el primer render)
Uso: python build_audio.py  (Python 3 + numpy + ffmpeg)."""
import subprocess, os
import numpy as np

SR = 48000
DUR = 9.0
N = int(SR * DUR)
rng = np.random.default_rng(11)  # semilla fija: render idéntico siempre
HERE = os.path.dirname(os.path.abspath(__file__))


class Bus:
    def __init__(self):
        self.m = np.zeros((2, N))

    def add(self, x, t, gain=1.0, pan=0.0):
        i = int(round(t * SR))
        if i >= N or i < 0:
            return
        x = np.asarray(x, dtype=float)
        if x.ndim == 1:
            x = np.vstack([x * np.sqrt((1 - pan) / 2), x * np.sqrt((1 + pan) / 2)])
        L = min(x.shape[1], N - i)
        self.m[:, i:i + L] += x[:, :L] * gain


sfx, mus = Bus(), Bus()


def env(n, tau):
    return np.exp(-np.arange(n) / (tau * SR))


def lp(x, a):  # filtro pasa bajos de un polo (a puede ser escalar o un arreglo)
    a = np.broadcast_to(np.asarray(a, dtype=float), x.shape)
    y = np.zeros_like(x)
    for i in range(1, len(x)):
        y[i] = y[i - 1] + a[i] * (x[i] - y[i - 1])
    return y


def tap(freq=700, dur=0.09):
    n = int(dur * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * freq * t) * env(n, 0.018) * 0.7 + rng.standard_normal(n) * env(n, 0.004) * 0.06


def pop(f0=520, f1=260, dur=0.16):
    n = int(dur * SR); t = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-t / 0.03)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.05) * 0.8


def thock(dur=0.35):
    n = int(dur * SR); t = np.arange(n) / SR
    f = 62 + 70 * np.exp(-t / 0.05)
    return np.tanh(1.3 * np.sin(2 * np.pi * np.cumsum(f) / SR)) * env(n, 0.11) * 0.9


def whoosh(dur=0.55, bright=0.35):
    n = int(dur * SR); t = np.arange(n) / SR
    x = rng.standard_normal(n)
    y = lp(x, 0.05 + bright * np.sin(np.pi * t / dur) ** 2 * 0.6)
    a = np.sin(np.pi * np.clip(t / dur, 0, 1) ** 0.8) ** 2
    return y * a * 1.8


def chime(freq=440, dur=1.2):
    n = int(dur * SR); t = np.arange(n) / SR
    x = np.sin(2 * np.pi * freq * t) + 0.32 * np.sin(2 * np.pi * freq * 2.01 * t) + 0.1 * np.sin(2 * np.pi * freq * 3.02 * t)
    return x * env(n, 0.34) * 0.5 * np.minimum(1, t / 0.004)


def zip_(dur=0.18):
    n = int(dur * SR); t = np.arange(n) / SR
    x = np.diff(rng.standard_normal(n + 1))
    return x * (t / dur) ** 1.5 * env(n, 0.07) * 1.1


def pluck(freq, dur=1.1):
    """Nota seca tipo marimba: fundamental cálida + armónico corto."""
    n = int(dur * SR); t = np.arange(n) / SR
    x = np.sin(2 * np.pi * freq * t) * env(n, 0.28) + 0.35 * np.sin(2 * np.pi * freq * 3.99 * t) * env(n, 0.045)
    return x * np.minimum(1, t / 0.003) * 0.6


def hat(dur=0.05):
    n = int(dur * SR)
    x = np.diff(rng.standard_normal(n + 1))
    return x * env(n, 0.012) * 0.5


def pad(freqs, start, dur, gain, fade=1.2):
    """Cama: senos con armónicos suaves, ligeramente desafinados entre L y R (ancho estéreo) y con entrada/salida lentas."""
    n = int(dur * SR); t = np.arange(n) / SR
    a = np.minimum(1, t / fade) * np.clip((dur - t) / fade, 0, 1)
    out = np.zeros((2, n))
    for f in freqs:
        for ch, det in ((0, 0.18), (1, -0.18)):
            ff = f + det
            out[ch] += (np.sin(2 * np.pi * ff * t) + 0.22 * np.sin(2 * np.pi * ff * 2 * t) + 0.07 * np.sin(2 * np.pi * ff * 3 * t)) / len(freqs)
    mus.add(out * a, start, gain)


A2, E3, A3, CS4, E4, A4, CS5, E5, FS5, A5 = 110.0, 164.81, 220.0, 277.18, 329.63, 440.0, 554.37, 659.26, 739.99, 880.0

# ───────── EFECTOS: un sonido suave por golpe visual ─────────
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
