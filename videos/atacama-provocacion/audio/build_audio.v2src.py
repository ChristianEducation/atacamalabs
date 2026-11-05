"""Sonido de «Un agente, muchos puestos» v2 (22 s).
Genera DOS pistas sincronizadas a los golpes visuales (pulso de 0,6 s = 100 BPM):
  ../assets/audio.wav       efectos suaves + cama musical sobria (la que usa el render)
  ../assets/audio-sfx.wav   solo efectos suaves (como el primer render)
Uso: python build_audio.py  (Python 3 + numpy + ffmpeg)."""
import subprocess, os
import numpy as np

SR = 48000
DUR = 22.0
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

# ───────── EFECTOS ─────────
# S1 · gancho (sin cambios)
for t, f in [(0.2, 700), (0.8, 620), (2.6, 700), (3.2, 620)]:
    sfx.add(tap(f), t, 0.5)
sfx.add(thock(), 1.4, 0.55); sfx.add(tap(560), 1.4, 0.35)
sfx.add(whoosh(0.5), 2.2, 0.28)
sfx.add(thock(), 3.8, 0.5); sfx.add(chime(E5, 1.0), 3.8, 0.2)
sfx.add(whoosh(0.5), 4.45, 0.3)

# S2 · puestos: 1,8 s cada uno (3 pulsos). Cambio de puesto = pop; microtics a la par de cada viñeta.
P0, RD, K = 5.0, 1.8, 1.5
tics = [[0.15, 0.45, 0.62, 0.85], [0.2, 0.38, 0.56, 0.85], [0.1, 0.3, 0.45, 0.6, 0.85], [0.1, 0.25, 0.4, 0.6]]
for i in range(4):
    sfx.add(pop(), P0 + i * RD, 0.5)
    for o in tics[i]:
        sfx.add(tap(880, 0.06), P0 + i * RD + o * K, 0.16)
sfx.add(whoosh(0.9, bright=0.5), 11.75, 0.34); sfx.add(thock(0.5), 12.1, 0.5)

# S3 · cómo trabaja (+2,8 s respecto al primer render)
for t, f in [(13.0, A4), (13.6, CS5), (14.2, E5), (14.8, A5)]:
    sfx.add(chime(f, 1.3), t, 0.36)
    sfx.add(tap(900, 0.06), t + 0.18, 0.14)
sfx.add(whoosh(0.45), 15.6, 0.18)

# S4 · no es un chatbot
sfx.add(tap(520), 17.3, 0.5); sfx.add(tap(470), 17.5, 0.5)
sfx.add(zip_(), 18.05, 0.36)
sfx.add(thock(), 18.4, 0.5); sfx.add(chime(E5, 1.0), 18.4, 0.22)
sfx.add(thock(), 18.7, 0.5); sfx.add(chime(A5, 1.1), 18.7, 0.24)
sfx.add(whoosh(0.7, bright=0.5), 19.25, 0.34)

# S5 · marca
sfx.add(chime(A5, 1.6), 19.95, 0.34); sfx.add(chime(E5, 1.6), 20.05, 0.22)
sfx.add(tap(760), 20.35, 0.4); sfx.add(tap(700), 20.6, 0.3)
sfx.add(chime(CS5 * 2, 1.2), 21.0, 0.2)

# ───────── MÚSICA (sobria, sin melodía invasiva) ─────────
# armonía: A (hueco) → A → F#m → Dmaj7 → Bm → A add9 (resolución en el cierre)
pad([A2, E3, A3], 0.0, 5.6, 0.9, fade=1.6)
pad([A2, E3, A3, CS4, E4], 5.0, 4.1, 1.0)
pad([92.5, 138.59, 185.0, 220.0, CS4], 8.6, 3.9, 1.0)
pad([73.42, 146.83, 185.0, 220.0, CS4], 12.0, 5.2, 1.05)
pad([61.74, 123.47, 146.83, 185.0, 246.94], 17.0, 3.0, 1.0)
pad([55.0, A2, E3, A3, 246.94, CS4, E4], 19.6, 2.4, 1.1, fade=0.9)
# pulso suave durante los puestos: bombo tenue en cada pulso (acento al cambiar de puesto) y chasquido en el contratiempo
for k in range(12):
    t = P0 + k * 0.6
    mus.add(thock(0.3), t, 0.30 if k % 3 == 0 else 0.15)
    mus.add(hat(), t + 0.3, 0.10)
# una nota por puesto: la frase sube y cierra (A–C#–E–F#), una por puesto
for i, f in enumerate([A4, CS5, E5, FS5]):
    mus.add(pluck(f, 1.5), P0 + i * RD + 0.04, 0.34, pan=(-0.25, 0.25, -0.15, 0.15)[i])
    mus.add(pluck(f / 2, 1.5), P0 + i * RD + 0.9, 0.18)
# bajo que respira en la parte oscura
for t, f in [(13.0, 73.42), (14.2, 73.42), (15.4, 73.42), (17.0, 61.74), (18.2, 61.74), (19.9, 55.0)]:
    mus.add(np.sin(2 * np.pi * f * np.arange(SR) / SR) * env(SR, 0.35), t, 0.45)


def finish(bus, name, lufs, gain_db=0.0):
    m = bus.m.copy()
    m /= max(1e-9, np.abs(m).max()) / 0.8
    pcm = (np.clip(m.T, -1, 1) * 32767).astype("<i2").tobytes()
    out = os.path.join(HERE, "..", "assets", name)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "s16le", "-ar", str(SR), "-ac", "2", "-i", "-",
                    "-af", f"loudnorm=I={lufs}:TP=-2:LRA=7", "-ar", str(SR), out], input=pcm, check=True)
    return out


# solo efectos (como el primer render)
finish(sfx, "audio-sfx.wav", -19)
# efectos + música: la cama va ~3 dB bajo el nivel medio de los efectos para que sostenga sin tapar
mix = Bus()
mix.m = sfx.m / (np.abs(sfx.m).max() or 1) * 0.8 + mus.m / (np.abs(mus.m).max() or 1) * 0.8 * 10 ** (-26 / 20) * 3.2
print("listo:", finish(mix, "audio.wav", -16))
