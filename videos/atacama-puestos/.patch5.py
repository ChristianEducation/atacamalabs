p = 'audio/build_audio.py'
s = open(p, encoding='utf8').read()

NEW_FUNCS = '''
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

'''

EFFECTS = '''# ───────── EFECTOS (orden pedido por Christian) ─────────
S = Mix()
# S1 · gancho: typing → deep impact en «IA.» → riser hacia «trabajo.»
S.add(typing(4, .07), 0.12, .55, pan=-.1, rs=.15)
S.add(typing(5, .065), 0.72, .55, pan=.1, rs=.15)
S.add(rev_swell(click(1.0), IR_S, .6), 0.85, .35)
S.add(typing(4, .06), 1.2, .5, rs=.15)
S.add(boom(2.2), 1.4, .95, rl=.16)                      # deep impact en «IA.»
S.add(shimmer(1.2), 1.45, .08, rl=.1)
S.add(swipe(.45, False), 2.2, .28, rs=.1)
S.add(typing(5, .065), 2.55, .5, rs=.15)
S.add(riser(1.2), 2.6, .5, rs=.05)                     # riser en la escena siguiente
S.add(thump(46, 98, .6), 3.8, .65); S.add(popsnd(520), 3.8, .5, rs=.25)     # «trabajo.»
S.add(pluck(E4, 1.0), 3.82, .22, rs=.3)
S.add(dwhoosh(.95, True), 4.1, .45, rs=.08)             # deep whoosh: la barra se abre en tarjeta

# S2 · puestos (1,8 s cada uno): pop en el cambio, typing al escribir, pops al marcar
P0, RD, K = 5.0, 1.8, 1.5
tics = [[0.15, 0.45, 0.62, 0.85], [0.2, 0.38, 0.56, 0.85], [0.1, 0.3, 0.45, 0.6, 0.85], [0.1, 0.25, 0.4, 0.6]]
for i in range(4):
    t = P0 + i * RD
    S.add(rev_swell(popsnd(500), IR_S, .4), t - .36, .35)
    S.add(swipe(.28, True), t - .1, .2, pan=(-.2, .2, -.1, .1)[i], rs=.08)
    S.add(thump(54 + 3 * i, 100, .45), t, .5)
    S.add(popsnd(420 + 40 * i, 1.2), t, .62, rs=.3)                      # pop de cambio de puesto
    for j, o in enumerate(tics[i]):
        tt = t + o * K
        if j == 0:
            S.add(typing(6, .06), tt, .5, pan=rng.uniform(-.2, .2), rs=.18)          # escribe el mensaje / dato
        else:
            S.add(popsnd(700 + 60 * j), tt, .34, pan=rng.uniform(-.35, .35), rs=.2)  # pop al marcarse
# cortina oscura: riser → deep whoosh → impacto
S.add(riser(1.0), 10.9, .5, rs=.05)
S.add(dwhoosh(1.1, True), 11.0, .55, rl=.04)
S.add(boom(2.0), 11.9, .9, rl=.15)

# S3 · Entiende → Consulta → Ejecuta → Supervisa
for t, f in [(13.0, A3), (13.6, CS4), (14.2, E4), (14.8, A4)]:
    S.add(thump(56, 100, .4), t, .36)
    S.add(popsnd(560 + (t - 13.0) * 60, 1.1), t, .48, rs=.28)
    S.add(pluck(f, 1.3), t, .42, rs=.3, rl=.04)
    S.add(pluck(f / 2, .9), t, .2)
    S.add(typing(3, .05), t + .16, .3, pan=rng.uniform(-.3, .3), rs=.15)
S.add(swipe(.55, True), 15.5, .22, rs=.12)
S.add(pluck(A3, 1.6), 15.6, .2, rs=.3)
S.add(dwhoosh(.8, True), 16.55, .3, rs=.06)

# S4 · no es un chatbot
S.add(typing(7, .055), 17.2, .55, rs=.18)
S.add(zip_(.22), 18.0, .32); S.add(click(1.1, 2400), 18.25, .5, rs=.1)
S.add(thump(46, 98, .7), 18.4, .62); S.add(pluck(E4, 1.2), 18.4, .28, rs=.3)
S.add(thump(44, 95, .8), 18.7, .7); S.add(pluck(A4, 1.2), 18.7, .3, rs=.3)
S.add(riser(.55), 18.7, .16)
S.add(dwhoosh(.9, False), 19.0, .5, rl=.05); S.add(boom(1.0), 19.35, .45)

# S5 · marca: silencio breve → swell invertido → logo → UNA campana en «Agentes que trabajan.» → click en atacamalabs.cl
S.add(rev_swell(pluck(A3, 0.4), IR_L, 1.1), 18.8, .5)
S.add(thump(40, 80, 1.0, 1.4, .3), 19.88, .5)
S.add(pluck(A4, 2.0), 19.95, .3, rs=.2, rl=.1)
S.add(bell(440.0, 2.4), 20.35, .85, rl=.14, rs=.1)        # bell ding
S.add(popsnd(560, .7), 20.62, .3, rs=.2)                 # «¿Qué puesto necesitas cubrir?»
S.add(shimmer(1.3), 20.55, .14, rl=.1)
S.add(mouse(1.0), 20.92, .8, rs=.1)                       # click de mouse en atacamalabs.cl
'''

a = s.index('# ───────── EFECTOS ─────────')
b = s.index('sfx_out = S.render')
s = s[:a] + EFFECTS + '\n' + s[b:]
# funciones nuevas antes de las notas
s = s.replace('A2, E3, A3, CS4, E4, FS4, A4, CS5, E5 =', NEW_FUNCS + '\nA2, E3, A3, CS4, E4, FS4, A4, CS5, E5 =', 1)
# silencio de la cama: centro 19.75, más profundo
s = s.replace('duck *= 1 - 0.75 * np.exp(-((t_ - 19.55) / 0.12) ** 2)', 'duck *= 1 - 0.9 * np.exp(-((t_ - 19.7) / 0.17) ** 2)')
# ambiente: aire en la parte clara, zumbido grave en la oscura; se corta antes del logo
s = s.replace("M /= np.abs(M).max() + 1e-9\n", "M /= np.abs(M).max() + 1e-9\nAMB = np.zeros((2, N))\nfor a0, a1, kd, g in [(0.0, 11.9, 'air', .5), (11.9, 19.5, 'dark', .8), (19.9, 22.0, 'air', .3)]:\n    x = ambient(a0, a1, kd) * g\n    i = int(a0 * SR); AMB[:, i:i + x.shape[1]] += x[:, :N - i]\nAMB /= np.abs(AMB).max() + 1e-9\n", 1)
s = s.replace('mix = sfx_n * 0.9 + M * 10 ** (-12 / 20)', 'mix = sfx_n * 0.9 + M * 10 ** (-12 / 20) + AMB * 10 ** (-27 / 20)')
open(p, 'w', encoding='utf8').write(s)
print('ok')
