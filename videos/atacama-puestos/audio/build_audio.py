"""Sonido de «Un agente, muchos puestos» v4 — diseño sonoro por capas (22 s).
Técnicas: cada golpe = transitorio + cuerpo + subgrave; variación aleatoria fija (nada se repite igual); reverb corta con pre-retardo
y graves SIEMPRE secos (el sub no pasa por la reverb); reverb larga solo en impactos y cierre; swells invertidos antes de los hitos;
risers + impacto en las cortinas; cama musical que se «agacha» (sidechain) bajo los efectos; saturación suave y filtro de subsónicos al final.
Salidas: ../assets/audio.wav (efectos + cama) y ../assets/audio-sfx.wav (solo efectos).
Uso: python build_audio.py  (Python 3 + numpy + ffmpeg)."""
import subprocess, os
import numpy as np

SR = 48000
DUR = 22.0
N = int(SR * DUR)
rng = np.random.default_rng(23)  # semilla fija: render idéntico siempre
HERE = os.path.dirname(os.path.abspath(__file__))


# ───────── utilidades ─────────
def env(n, tau):
    return np.exp(-np.arange(n) / (tau * SR))


def bp(x, lo, hi):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X[(f < lo) | (f > hi)] = 0
    return np.fft.irfft(X, len(x))


def noise(n):
    return rng.standard_normal(n)


def lp_var(x, a):
    a = np.broadcast_to(np.asarray(a, dtype=float), x.shape)
    y = np.zeros_like(x)
    for i in range(1, len(x)):
        y[i] = y[i - 1] + a[i] * (x[i] - y[i - 1])
    return y


def make_ir(rt60, pre=0.012, hp=170, lo=7500):
    n = int((rt60 + pre) * SR); t = np.arange(n) / SR
    out = np.zeros((2, n))
    for ch in range(2):
        x = noise(n) * np.exp(-6.9 * np.clip(t - pre, 0, None) / rt60) * (1 - np.exp(-np.clip(t - pre, 0, None) / 0.006))
        x[t < pre] = 0
        out[ch] = bp(x, hp, lo)
    return out / np.sqrt((out ** 2).sum() / 2 + 1e-12)


def conv(x, ir):
    n = len(x) + ir.shape[1]
    k = 1 << (n - 1).bit_length()
    X = np.fft.rfft(x, k)
    return np.vstack([np.fft.irfft(X * np.fft.rfft(ir[c], k), k)[:len(x)] for c in range(2)])


class Mix:
    def __init__(self):
        self.dry = np.zeros((2, N)); self.rs = np.zeros(N); self.rl = np.zeros(N)

    def add(self, x, t, g=1.0, pan=0.0, rs=0.0, rl=0.0, dry=1.0):
        i = int(round(t * SR))
        if i < 0 or i >= N:
            return
        x = np.asarray(x, float)
        L = min(len(x), N - i)
        x = x[:L] * g
        self.dry[0, i:i + L] += x * np.sqrt((1 - pan) / 2) * dry
        self.dry[1, i:i + L] += x * np.sqrt((1 + pan) / 2) * dry
        if rs: self.rs[i:i + L] += x * rs
        if rl: self.rl[i:i + L] += x * rl

    def render(self, ir_s, ir_l):
        return self.dry + conv(self.rs, ir_s) + conv(self.rl, ir_l)


IR_S = make_ir(0.38, pre=0.010, hp=180, lo=9000)   # ambiente corto
IR_L = make_ir(1.7, pre=0.022, hp=220, lo=6500)    # cola larga (impactos y cierre)


# ───────── sonidos (cada uno es una pila de capas) ─────────
def sine(f, n, tau):
    t = np.arange(n) / SR
    return np.sin(2 * np.pi * f * t) * env(n, tau)


def click(v=1.0, body=1500):
    """Clic táctil: transitorio brillante + cuerpo con caída de tono + golpe grave. Cada uno sale distinto."""
    n = int(0.09 * SR); t = np.arange(n) / SR
    fb = body * rng.uniform(.88, 1.18)
    trans = bp(noise(n), 2800, 10000) * env(n, 0.0016) * 1.7
    bod = np.sin(2 * np.pi * np.cumsum(fb * (1 + 0.45 * np.exp(-t / 0.005))) / SR) * env(n, 0.011) * 0.75
    thump = np.sin(2 * np.pi * np.cumsum(115 * (1 + 0.5 * np.exp(-t / 0.012)) * rng.uniform(.9, 1.1)) / SR) * env(n, 0.026) * 0.55
    return (trans + bod + thump) * 0.6 * v * rng.uniform(.78, 1.0)


def thump(f1=52, f0=105, dur=0.5, sat=1.6, tau=0.16):
    n = int(dur * SR); t = np.arange(n) / SR
    ph = 2 * np.pi * np.cumsum(f1 + (f0 - f1) * np.exp(-t / 0.04)) / SR
    return np.tanh(sat * np.sin(ph)) * env(n, tau) * 0.85


def tok(f=300):
    n = int(0.26 * SR); t = np.arange(n) / SR
    f *= rng.uniform(.95, 1.06)
    return (np.sin(2 * np.pi * f * t) * env(n, 0.04) + 0.5 * np.sin(2 * np.pi * f * 2.76 * t) * env(n, 0.015)
            + bp(noise(n), 1500, 6000) * env(n, 0.003) * 0.5) * 0.7


def pluck(f, dur=1.2):
    n = int(dur * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * t) * env(n, 0.34) + 0.33 * np.sin(2 * np.pi * f * 3.99 * t) * env(n, 0.05)
            + 0.12 * np.sin(2 * np.pi * f * 9.2 * t) * env(n, 0.015)) * np.minimum(1, t / 0.003) * 0.6


def swipe(dur=0.32, up=True):
    """Barrido de aire que cambia de color (grave→agudo o al revés) con ataque redondeado."""
    n = int(dur * SR); t = np.arange(n) / SR; u = t / dur
    a = np.sin(np.pi * np.clip(u, 0, 1)) ** 1.6
    x = noise(n)
    lo_, hi_ = bp(x, 250, 1800), bp(x, 2600, 9500)
    mixu = u if up else 1 - u
    return (lo_ * (1 - mixu) * 0.9 + hi_ * mixu * 1.2) * a * 1.6


def riser(dur=0.9):
    n = int(dur * SR); t = np.arange(n) / SR; u = t / dur
    x = lp_var(noise(n), 0.015 + 0.55 * u ** 2)
    tone = np.sin(2 * np.pi * np.cumsum(180 * (1 + 2.2 * u ** 1.6)) / SR) * 0.18
    return (x * 3.0 + tone) * (u ** 2.2) * 0.9


def boom(dur=1.6):
    n = int(dur * SR)
    s = thump(34, 95, dur, 2.0, 0.55)
    air = bp(noise(n), 90, 2500) * env(n, 0.09) * 0.7
    return s + air


def rev_swell(src, ir, length):
    """Reverb invertida: la cola nace antes del golpe y se lo lleva puesto (truco clásico de tráilers y UI premium)."""
    w = conv(np.pad(src, (0, int(length * SR))), ir)[0][:int(length * SR)]
    w = w[::-1]
    u = np.linspace(0, 1, len(w))
    return w * u ** 1.5 / (np.abs(w).max() + 1e-9)


def zip_(dur=0.2):
    n = int(dur * SR); t = np.arange(n) / SR
    return bp(noise(n), 3000, 11000) * (t / dur) ** 1.6 * env(n, 0.08) * 2.4


def shimmer(dur=1.4):
    n = int(dur * SR); t = np.arange(n) / SR
    x = sum(np.sin(2 * np.pi * f * t + rng.uniform(0, 6.28)) for f in (2217.0, 2793.0, 3322.0, 4186.0)) / 4
    return x * env(n, 0.35) * np.minimum(1, t / 0.01) * 0.5


def pad(freqs, dur, fade=1.2):
    n = int(dur * SR); t = np.arange(n) / SR
    a = np.minimum(1, t / fade) * np.clip((dur - t) / fade, 0, 1)
    out = np.zeros((2, n))
    for f in freqs:
        for ch, d in ((0, .2), (1, -.2)):
            ph = rng.uniform(0, 6.28)
            out[ch] += (np.sin(2 * np.pi * (f + d) * t + ph) + .24 * np.sin(2 * np.pi * (f + d) * 2 * t) + .08 * np.sin(2 * np.pi * (f + d) * 3 * t)) / len(freqs)
    lfo = 1 + 0.12 * np.sin(2 * np.pi * 0.13 * t + rng.uniform(0, 6))
    return out * a * lfo



def key(v=1.0):
    """Tecla de teclado: clic de plástico + golpe sordo de la tecla al fondo. Siempre ligeramente distinta."""
    n = int(0.07 * SR); t = np.arange(n) / SR
    trans = bp(noise(n), 1800, 7500) * env(n, 0.0022) * 1.5
    bod = np.sin(2 * np.pi * np.cumsum(rng.uniform(170, 230) * (1 + 0.4 * np.exp(-t / 0.01))) / SR) * env(n, 0.018) * 0.9
    return (trans + bod) * 0.55 * v * rng.uniform(.7, 1.0)


def typing(count=5, gap=0.07):
    """Ráfaga de tecleo con ritmo humano (pausas irregulares) como un solo arreglo."""
    total = int((count * gap * 1.6 + 0.12) * SR)
    out = np.zeros(total)
    t = 0.0
    for _ in range(count):
        k = key()
        i = int(t * SR)
        out[i:i + len(k)] += k[:max(0, total - i)] if i + len(k) > total else k
        t += gap * rng.uniform(.7, 1.6)
    return out


def popsnd(f=640, v=1.0):
    """Pop suave tipo burbuja: seno que cae de tono + chasquido mínimo."""
    n = int(0.12 * SR); t = np.arange(n) / SR
    f *= rng.uniform(.92, 1.1)
    x = np.sin(2 * np.pi * np.cumsum(f * (1.0 + 0.9 * np.exp(-t / 0.012)) * 0.6) / SR) * env(n, 0.03)
    x += bp(noise(n), 2500, 8000) * env(n, 0.0015) * 0.4
    return x * 0.7 * v


def bell(f=440.0, dur=2.2):
    """UNA campana cálida y corta (sello final): parciales de campana con caída distinta, ataque de 2 ms."""
    n = int(dur * SR); t = np.arange(n) / SR
    parts = [(1.0, 1.0, 0.95), (2.0, 0.42, 0.55), (2.76, 0.36, 0.38), (4.07, 0.16, 0.2), (5.4, 0.08, 0.1)]
    x = sum(a * np.sin(2 * np.pi * f * m * t) * env(n, tau) for m, a, tau in parts)
    return x * np.minimum(1, t / 0.002) * 0.42


def mouse(v=1.0):
    """Clic de mouse en dos tiempos (baja y sube), seco y real."""
    n = int(0.16 * SR)
    out = np.zeros(n)
    for dt, g in ((0.0, 1.0), (0.085, 0.55)):
        m = int(0.03 * SR); t = np.arange(m) / SR
        c = bp(noise(m), 1800, 9000) * env(m, 0.0016) * 1.6 + np.sin(2 * np.pi * 2100 * t) * env(m, 0.004) * 0.35
        i = int(dt * SR)
        out[i:i + m] += c * g
    return out * 0.6 * v


def dwhoosh(dur=0.95, up=True):
    """Whoosh profundo: ruido grave con barrido lento, cola larga."""
    n = int(dur * SR); u = np.arange(n) / n
    a = np.sin(np.pi * u ** (0.8 if up else 1.25)) ** 2
    x = lp_var(noise(n), 0.006 + 0.07 * np.sin(np.pi * u) ** 1.2)
    return x * a * 7.0


def ambient(t0, t1, kind):
    """Ambiente continuo: aire de sala (parte clara) o zumbido grave con textura (parte oscura)."""
    n = int((t1 - t0) * SR); t = np.arange(n) / SR
    if kind == "air":
        x = bp(noise(n), 120, 1400) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.11 * t + 1.0))
        x = x / (np.abs(x).max() + 1e-9) * 0.5
    else:
        x = (np.sin(2 * np.pi * 55.0 * t) * 0.8 + np.sin(2 * np.pi * 82.4 * t + 1) * 0.35 + bp(noise(n), 150, 900) * 0.5)
        x = x * (0.75 + 0.25 * np.sin(2 * np.pi * 0.17 * t))
        x = x / (np.abs(x).max() + 1e-9) * 0.55
    a = np.minimum(1, t / 1.0) * np.clip(((t1 - t0) - t) / 0.8, 0, 1)
    return np.vstack([x * a, np.roll(x, 311) * a])


A2, E3, A3, CS4, E4, FS4, A4, CS5, E5 = 110.0, 164.81, 220.0, 277.18, 329.63, 369.99, 440.0, 554.37, 659.26

# ───────── EFECTOS v6: UN protagonista por golpe visual, aire entre sonidos ─────────
# Regla: nada suena dentro de 0,25 s de otro sonido principal; los golpes grandes se quedan solos con su cola.
S = Mix()
# S1 · gancho
S.add(key(1.0), 0.22, .5, pan=-.1, rs=.1)                  # «Un agente»
S.add(key(0.9), 0.82, .5, pan=.1, rs=.1)                   # «no empieza»
S.add(boom(2.4), 1.4, .95, rl=.16)                         # «IA.» → deep impact, solo, con su cola
S.add(riser(1.2), 2.6, .5, rs=.05)                         # escena siguiente: riser
S.add(thump(48, 100, .5), 3.8, .6); S.add(popsnd(500), 3.8, .4, rs=.15)   # «trabajo.»
S.add(dwhoosh(.95, True), 4.2, .42, rs=.06)                # barra → tarjeta

# S2 · puestos: cambio = pop; un tecleo corto; una confirmación al final de cada puesto
P0, RD, K = 5.0, 1.8, 1.5
tics = [[0.15, 0.85], [0.2, 0.85], [0.1, 0.85], [0.1, 0.6]]
for i in range(4):
    t = P0 + i * RD
    S.add(popsnd(420 + 40 * i, 1.2), t, .62, rs=.2)                                 # cambio de puesto
    S.add(typing(4, .06), t + tics[i][0] * K, .42, pan=(-.2, .2, -.1, .1)[i], rs=.1) # escribe
    S.add(popsnd(760, .9), t + tics[i][1] * K, .36, pan=(.3, -.3, .2, -.2)[i], rs=.12)  # confirma
# cortina oscura: riser que desemboca en el impacto (sin whoosh encima)
S.add(riser(.95), 10.95, .5, rs=.05)
S.add(boom(2.0), 11.9, .9, rl=.15)

# S3 · Entiende → Consulta → Ejecuta → Supervisa: una nota por paso, nada más
for t, f in [(13.0, A3), (13.6, CS4), (14.2, E4), (14.8, A4)]:
    S.add(pluck(f, 1.2), t, .5, rs=.18)
    S.add(pluck(f / 2, .9), t, .2)

# S4 · no es un chatbot
S.add(typing(5, .055), 17.2, .5, rs=.1)
S.add(zip_(.22), 18.05, .3)                                 # se tacha «chatbot.»
S.add(thump(46, 98, .7), 18.4, .62); S.add(pluck(E4, 1.2), 18.4, .28, rs=.2)   # «Es un puesto de trabajo.»
S.add(dwhoosh(.9, False), 19.0, .45, rs=.05)                # sale la oscuridad

# S5 · marca: silencio → logo → UNA campana → click en atacamalabs.cl
S.add(thump(40, 80, 1.0, 1.4, .3), 19.9, .45)
S.add(bell(440.0, 2.4), 20.35, .85, rl=.12, rs=.08)         # bell ding en «Agentes que trabajan.»
S.add(mouse(1.0), 20.95, .8, rs=.08)                        # click de mouse en atacamalabs.cl

sfx_out = S.render(IR_S, IR_L)

# ───────── MÚSICA (cama sobria con movimiento y sidechain) ─────────
M = np.zeros((2, N))


def put(x, t, g):
    i = int(t * SR); L = min(x.shape[1], N - i)
    M[:, i:i + L] += x[:, :L] * g


put(pad([A2, E3, A3], 5.6, 1.6), 0.0, .9)
put(pad([A2, E3, A3, CS4, E4], 4.1), 5.0, 1.0)
put(pad([92.5, 138.59, 185.0, 220.0, CS4], 3.9), 8.6, 1.0)
put(pad([73.42, 146.83, 185.0, 220.0, CS4], 5.2), 12.0, 1.05)
put(pad([61.74, 123.47, 146.83, 185.0, 246.94], 3.0), 17.0, 1.0)
put(pad([55.0, A2, E3, A3, 246.94, CS4, E4], 2.4, .9), 19.6, 1.1)
M /= np.abs(M).max() + 1e-9
AMB = np.zeros((2, N))
for a0, a1, kd, g in [(0.0, 11.9, 'air', .5), (11.9, 19.5, 'dark', .8), (19.9, 22.0, 'air', .3)]:
    x = ambient(a0, a1, kd) * g
    i = int(a0 * SR); AMB[:, i:i + x.shape[1]] += x[:, :N - i]
AMB /= np.abs(AMB).max() + 1e-9
# sidechain: la cama baja hasta ~5 dB cuando suenan los efectos
e = np.abs(sfx_out).max(axis=0)
k = np.exp(-np.arange(int(0.35 * SR)) / (0.09 * SR)); k /= k.sum()
e = np.convolve(e, k)[:N]; e = e / (np.percentile(e, 99.5) + 1e-9)
duck = 1 - 0.6 * np.clip(e, 0, 1)
# silencio breve de la cama justo antes del logo (para que el cierre golpee)
t_ = np.arange(N) / SR
duck *= 1 - 0.9 * np.exp(-((t_ - 19.7) / 0.17) ** 2)
M = M * duck


def finish(arr, name, lufs):
    m = arr.copy()
    m = np.tanh(1.15 * m) / np.tanh(1.15)               # saturación suave: pega las capas
    m /= max(1e-9, np.abs(m).max()) / 0.85
    pcm = (np.clip(m.T, -1, 1) * 32767).astype("<i2").tobytes()
    out = os.path.join(HERE, "..", "assets", name)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "s16le", "-ar", str(SR), "-ac", "2", "-i", "-",
                    "-af", f"highpass=f=28,loudnorm=I={lufs}:TP=-1.8:LRA=9", "-ar", str(SR), out], input=pcm, check=True)
    return out


sfx_n = sfx_out / (np.abs(sfx_out).max() + 1e-9)
finish(sfx_n, "audio-sfx.wav", -17)
mix = sfx_n * 0.9 + M * 10 ** (-15 / 20) + AMB * 10 ** (-30 / 20)
print("listo:", finish(mix, "audio.wav", -16))
