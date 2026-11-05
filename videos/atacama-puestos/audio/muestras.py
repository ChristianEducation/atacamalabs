"""Muestras de paletas de sonido para comparar a oído (≈10 s cada una, mismas 5 situaciones del video):
  1) cambio de puesto + microclics   2) cuatro pasos (Entiende/Consulta/Ejecuta/Supervisa)   3) cortina oscura   4) cierre.
Uso: python muestras.py  → escribe muestras/NN-nombre.mp3"""
import subprocess, os
import numpy as np

SR = 48000
DUR = 10.5
N = int(SR * DUR)
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "muestras")
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(7)


def env(n, tau):
    return np.exp(-np.arange(n) / (tau * SR))


def bp(x, lo, hi):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X[(f < lo) | (f > hi)] = 0
    return np.fft.irfft(X, len(x))


def noise(n):
    return rng.standard_normal(n)


class Bus:
    def __init__(self):
        self.m = np.zeros((2, N))

    def add(self, x, t, g=1.0, pan=0.0):
        i = int(round(t * SR))
        x = np.asarray(x, float)
        if x.ndim == 1:
            x = np.vstack([x * np.sqrt((1 - pan) / 2), x * np.sqrt((1 + pan) / 2)])
        L = min(x.shape[1], N - i)
        if L > 0:
            self.m[:, i:i + L] += x[:, :L] * g


# ── piezas básicas ──
def sine(f, n, tau):
    t = np.arange(n) / SR
    return np.sin(2 * np.pi * f * t) * env(n, tau)


def wood_tok(f=330, n=int(0.22 * SR)):
    t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * t) * env(n, 0.035) + 0.45 * np.sin(2 * np.pi * f * 2.76 * t) * env(n, 0.014)
            + np.diff(noise(n + 1)) * env(n, 0.003) * 0.35) * 0.8


def marimba(f, dur=1.0):
    n = int(dur * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * t) * env(n, 0.28) + 0.35 * np.sin(2 * np.pi * f * 3.99 * t) * env(n, 0.045)) * np.minimum(1, t / 0.003) * 0.6


def clack(bright=1.0, n=int(0.08 * SR)):  # tecla mecánica
    top = bp(noise(n), 1800, 7000 * bright) * env(n, 0.006)
    body = sine(150, n, 0.018) * 0.8
    return (top * 2.2 + body) * 0.6


def mouse_click(n=int(0.05 * SR)):
    return (bp(noise(n), 2500, 9000) * env(n, 0.002) * 2.5 + sine(1400, n, 0.004) * 0.3) * 0.5


def thunk(n=int(0.3 * SR), f=95):  # barra espaciadora / enter
    t = np.arange(n) / SR
    return (np.sin(2 * np.pi * (f + 60 * np.exp(-t / 0.03)) * t) * env(n, 0.07) * 0.9 + bp(noise(n), 300, 1500) * env(n, 0.012) * 0.4)


def paper(dur=0.35, lo=2500, hi=9000):
    n = int(dur * SR); t = np.arange(n) / SR
    a = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.5
    return bp(noise(n), lo, hi) * a * 1.4


def drop(f0=500, f1=1200, dur=0.2):  # gota de agua
    n = int(dur * SR); t = np.arange(n) / SR
    f = f0 * (f1 / f0) ** np.clip(t / 0.07, 0, 1)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.05) * np.minimum(1, t / 0.002) * 0.6


def synth_pluck(f, dur=0.5, k=9):  # pulso sintético grave (armónicos que se apagan rápido)
    n = int(dur * SR); t = np.arange(n) / SR
    x = sum(np.sin(2 * np.pi * f * h * t) / h * np.exp(-t * (6 + 14 * h)) for h in range(1, k + 1))
    return x * 0.9 * np.minimum(1, t / 0.002)


def sub(f=50, dur=0.9, g=1.0):
    n = int(dur * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * (f + 40 * np.exp(-t / 0.06)) * t) * env(n, 0.3) * g


def air(dur=0.9, lo=300, hi=5000):
    n = int(dur * SR); t = np.arange(n) / SR
    a = np.sin(np.pi * np.clip(t / dur, 0, 1) ** 0.8) ** 2
    return bp(noise(n), lo, hi) * a * 1.6


def riser(dur=1.2, lo=500, hi=7000):
    n = int(dur * SR); t = np.arange(n) / SR
    a = (t / dur) ** 2.2
    return bp(noise(n), lo, hi) * a * 1.4


def pad(bus, freqs, t0, dur, g, fade=1.2):
    n = int(dur * SR); t = np.arange(n) / SR
    a = np.minimum(1, t / fade) * np.clip((dur - t) / fade, 0, 1)
    out = np.zeros((2, n))
    for f in freqs:
        for ch, d in ((0, .18), (1, -.18)):
            out[ch] += (np.sin(2 * np.pi * (f + d) * t) + .22 * np.sin(2 * np.pi * (f + d) * 2 * t)) / len(freqs)
    bus.add(out * a, t0, g)


A2, E3, A3, CS4, E4, FS4, A4, CS5, E5 = 110, 164.81, 220, 277.18, 329.63, 369.99, 440, 554.37, 659.26


# ── paletas: cada una resuelve las mismas situaciones ──
CUES_PUESTO = [0.3, 1.5, 2.7]            # tres cambios de puesto
MICRO = [0.45, 0.75, 1.0]                # microtics tras cada cambio (relativo)
PASOS = [4.3, 4.9, 5.5, 6.1]             # Entiende / Consulta / Ejecuta / Supervisa
CORTINA = 3.95 + 0.0                     # (la cortina va justo antes de los pasos)
CIERRE = 7.6


def p_madera(b):
    for i, t in enumerate(CUES_PUESTO):
        b.add(wood_tok(330), t, .8)
        for m in MICRO:
            b.add(wood_tok(900, int(.06 * SR)) * .5, t + m, .25)
        b.add(marimba([A4 / 2, CS5 / 2, E5 / 2][i], .8), t + .05, .3)
    b.add(air(.8), 3.6, .35); b.add(sub(60, .7), 3.95, .6)
    for t, f in zip(PASOS, [A3, CS4, E4, A4]):
        b.add(marimba(f, 1.0), t, .5)
        b.add(wood_tok(900, int(.06 * SR)) * .5, t + .15, .2)
    b.add(air(.8), 6.8, .35)
    b.add(marimba(A4, 1.6), CIERRE, .45); b.add(marimba(E4, 1.6), CIERRE + .1, .3)
    pad(b, [A2, E3, A3, CS4], CIERRE - .3, 2.8, .10)


def p_oficina(b):  # teclado y papel
    for i, t in enumerate(CUES_PUESTO):
        b.add(paper(.28, 2000, 7000), t - .05, .35)
        b.add(thunk(), t, .6)
        for k, m in enumerate(MICRO):
            for j in range(3):
                b.add(clack(rng.uniform(.7, 1.1)), t + m + j * .07, .35)
    b.add(paper(.7, 600, 5000), 3.5, .4); b.add(thunk(int(.5 * SR), 70), 3.95, .6)
    for t in PASOS:
        b.add(clack(1.0), t, .5); b.add(mouse_click(), t + .18, .4)
    b.add(paper(.6, 1200, 6000), 6.8, .35)
    b.add(thunk(int(.6 * SR), 80), CIERRE, .6); b.add(mouse_click(), CIERRE + .25, .5)
    pad(b, [A2, E3, A3], CIERRE - .3, 2.8, .07)


def p_minimal(b):  # clics finos y un bajo; nada de notas
    for t in CUES_PUESTO:
        b.add(mouse_click(), t, .6)
        for m in MICRO:
            b.add(mouse_click() * .5, t + m, .3)
    b.add(sub(55, .8), 3.95, .7)
    for t in PASOS:
        b.add(mouse_click(), t, .55); b.add(sub(70, .35, .5), t, .35)
    b.add(sub(45, 1.4), CIERRE, .8)


def p_sintetico(b):  # pulsos graves de sintetizador sobrio
    for i, t in enumerate(CUES_PUESTO):
        b.add(synth_pluck([A2 * 2, CS4 / 1, E4][i], .45), t, .5)
        for m in MICRO:
            b.add(synth_pluck(A4 * 2, .12, 4), t + m, .12)
    b.add(riser(.9, 300, 4000), 3.0, .4); b.add(sub(50, .9), 3.95, .75)
    for t, f in zip(PASOS, [A3, CS4, E4, A4]):
        b.add(synth_pluck(f, .55), t, .5)
        b.add(synth_pluck(f * 2, .15, 5), t + .12, .12)
    b.add(riser(.8, 500, 6000), 6.0, .35)
    pad(b, [A2, E3, A3, CS4, E4], CIERRE - .3, 2.8, .14)
    b.add(synth_pluck(A3, 1.4), CIERRE, .55)


def p_agua(b):  # gotas y aire, tranquilo
    for i, t in enumerate(CUES_PUESTO):
        b.add(drop(450 + i * 120, 1100 + i * 150), t, .7)
        for m in MICRO:
            b.add(drop(900, 1700, .1), t + m, .22)
    b.add(air(1.1, 200, 3500), 3.3, .35); b.add(sub(55, .9), 3.95, .55)
    for t, f in zip(PASOS, [600, 700, 830, 990]):
        b.add(drop(f * .6, f, .3), t, .6)
    b.add(air(.9, 300, 4000), 6.7, .3)
    pad(b, [A2, E3, A3, CS4], CIERRE - .3, 2.8, .10)
    b.add(drop(500, 1250, .6), CIERRE, .5)


def p_cine(b):  # cinematográfico sobrio: subgraves, subidas y cuerdas graves
    for i, t in enumerate(CUES_PUESTO):
        b.add(sub(48 + i * 4, .9), t, .7)
        b.add(air(.5, 400, 3000), t - .1, .18)
        for m in MICRO[:2]:
            b.add(mouse_click() * .4, t + m, .2)
    b.add(riser(1.4, 200, 6000), 2.6, .5); b.add(sub(42, 1.6), 3.95, .9)
    for t, f in zip(PASOS, [A2, CS4 / 2, E3, A3]):
        b.add(sub(f / 2, .6, .7), t, .6)
        pad(b, [f, f * 1.5], t, .9, .10, fade=.2)
    b.add(riser(1.0, 400, 7000), 6.5, .4)
    pad(b, [A2, E3, A3, CS4, E4, A4], CIERRE - .2, 2.9, .22, fade=.5)
    b.add(sub(36, 2.0), CIERRE, .9)


def p_artesanal(b):  # lápiz, madera, tela: cálido y humano
    for i, t in enumerate(CUES_PUESTO):
        b.add(paper(.3, 1200, 5000), t - .05, .4)
        b.add(wood_tok(280 + 30 * i), t, .8)
        for m in MICRO:
            b.add(wood_tok(1100, int(.05 * SR)) * .6, t + m, .3, pan=rng.uniform(-.3, .3))
    b.add(paper(.9, 400, 3500), 3.4, .5); b.add(wood_tok(180, int(.4 * SR)), 3.95, .9)
    for t in PASOS:
        b.add(wood_tok(520), t, .6); b.add(paper(.18, 3000, 8000), t + .1, .3)
    b.add(paper(.6, 600, 5000), 6.7, .4)
    b.add(wood_tok(240, int(.5 * SR)), CIERRE, .8)
    b.add(marimba(A3, 1.6), CIERRE + .1, .35)
    pad(b, [A2, E3, A3], CIERRE - .3, 2.8, .07)


PALETAS = [
    ("01-madera-y-marimba", p_madera), ("02-teclado-y-papel", p_oficina), ("03-minimalista", p_minimal),
    ("04-sintetico-sobrio", p_sintetico), ("05-gotas-y-aire", p_agua), ("06-cinematografico", p_cine), ("07-artesanal", p_artesanal),
]
for name, fn in PALETAS:
    b = Bus()
    fn(b)
    m = b.m / max(1e-9, np.abs(b.m).max()) * 0.8
    pcm = (np.clip(m.T, -1, 1) * 32767).astype("<i2").tobytes()
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "s16le", "-ar", str(SR), "-ac", "2", "-i", "-",
                    "-af", "loudnorm=I=-18:TP=-2:LRA=7", "-ar", "44100", "-b:a", "160k", os.path.join(OUT, name + ".mp3")], input=pcm, check=True)
    print("listo", name)
