# ---------- ambiente ----------
room = lp(np.cumsum(noise(DUR)), 300); room = hp(room, 40); room /= np.abs(room).max()
tn = np.arange(N) / SR
amb_env = np.clip(tn / 1.0, 0, 1) * (1 - np.clip((tn - TM['wipe']) / 1.5, 0, 1) * .8)
put(room * amb_env[:len(room)], 0, db(-34), 0)
HS = TM['hubSpeed']
H = lambda t: TM['hub0'] + t / HS
UP = 0.35

# ---------- gancho (lento) ----------
for t in np.arange(0.7, TM['splitStart'], 0.7): put(click(), t, db(-24), 0)
put(swoosh(0.45, True), TM['hookTitle'] - 0.2, db(-26), 0)
t0 = TM['hookNotif']
put(chime(988, 0.8, .22), t0, db(-17), 0.1); put(chime(1319, 1.1, .3), t0 + 0.13, db(-17), 0.1)
vib = np.sin(2 * np.pi * 150 * tt(0.4)) * (0.5 + 0.5 * np.sin(2 * np.pi * 36 * tt(0.4))) * np.hanning(int(0.4 * SR))
put(vib, t0 + 0.45, db(-24), 0)
put(swoosh(0.3, True), TM['hookText'] - 0.05, db(-30), 0)
put(thud(70, .5, .14), TM['hookAhora'] + 0.05, db(-12), 0); put(click(), TM['hookAhora'] + 0.05, db(-18), 0)

# ---------- corte en dos ----------
s0 = TM['splitStart']
put(thud(60, .7, .2), s0, db(-10), 0); put(swoosh(0.7, True, 7000, 900), s0 - 0.05, db(-20), 0)
put(chime(1568, 1.2, .45), s0 + 0.35, db(-26), 0.2)

# ---------- teléfono ----------
put(swoosh(0.42, False, 3000, 300), TM['land'] - 0.42, db(-28), -0.4)
put(thud(105, .3, .08), TM['land'], db(-13), -0.4); put(bell(2100, .5, .15), TM['land'] + 0.02, db(-26), -0.4)
for r in TM['rings']:
    n = int(TM['ringDur'] * 16); d = TM['ringDur']
    seg = np.zeros(int((d + .3) * SR))
    for i in range(n):
        f = 1180 if i % 2 == 0 else 1480
        b = bell(f, .1, .035)
        a = int(i / 16 * SR); seg[a:a + len(b)] += b[:len(seg) - a]
    e = np.minimum(1, tt(d + .3) / .02) * np.minimum(1, np.maximum(0, (d + .15 - tt(d + .3)) / .1))
    put(seg * e, r, db(-17), -0.35)

# ---------- chat rápido (lado agente) ----------
put(pop(540, 760), TM['cust'], db(-22), UP)
for dt in (0.05, 0.17, 0.29): put(click(.02, 3000, 1000), TM['typingA'] + dt, db(-30), UP)
put(pop(700, 1120), TM['agent'], db(-19), UP)
put(swoosh(0.35, True, 3500, 500), TM['sheet'] - 0.05, db(-27), UP)
for tp, f in [(TM['tap1'], 1046), (TM['tap2'], 1319), (TM['tap3'], 1568)]:
    put(click(.03, 1500, 900), tp, db(-17), UP); put(thud(180, .12, .03), tp, db(-22), UP)
    put(chime(f, .6, .2), tp + 0.04, db(-23), UP)
put(swoosh(0.35, False, 3500, 500), TM['tap3'] + 0.2, db(-28), UP)
d0 = TM['done']
put(pop(700, 1100), d0, db(-19), UP)
for f in (1046, 1319, 1568, 2093): put(chime(f, 1.3, .5), d0 + 0.02, db(-26), UP)

# ---------- la noche pasa: reloj girando ----------
sp0, sp1 = TM['spin0'], TM['spin1']
eio = lambda t: 4 * t ** 3 if t < .5 else 1 - (-2 * t + 2) ** 3 / 2
def inv_eio(u):
    lo, hi = 0.0, 1.0
    for _ in range(30):
        mid = (lo + hi) / 2
        if eio(mid) < u: lo = mid
        else: hi = mid
    return (lo + hi) / 2
K = 70
for k in range(1, K):
    tk = sp0 + 0.2 + inv_eio(k / K) * (sp1 - (sp0 + 0.2))
    put(click(.015, 2500, 1700), tk, db(-26), 0)
put(swoosh(1.7, True, 5000, 600), sp0 - 0.05, db(-27), 0)
put(thud(80, .6, .18), sp0, db(-14), 0)
put(bell(660, 2.4, .8), sp1, db(-15), 0); put(bell(990, 2.0, .6), sp1 + 0.03, db(-23), 0); put(thud(55, 1.0, .3), sp1, db(-14), 0)
put(pad([261.6, 329.6, 392, 523.3], 4.0, 1.4, 1.4), TM['sunUp'] - 0.3, db(-24), 0)
put(swoosh(1.0, True, 7000, 800), TM['sunUp'] - 0.2, db(-27), 0)
brng = np.random.default_rng(3)
for i in range(10):
    t = sp1 + 0.1 + i * 0.35 + brng.random() * .25; f0 = 3200 + brng.random() * 1800
    for j in range(2 + int(brng.random() * 2)):
        put(tone(f0, .07, .004, .03, f_end=f0 * (1.2 + brng.random() * .3)), t + j * 0.09, db(-36), 0.5 * (brng.random() * 2 - 1))
for i, t in enumerate(TM['cards']):
    put(pop(650, 980), t, db(-21), UP); put(tone(1800 + 120 * i, .12, .001, .04), t + 0.25, db(-26), UP)
put(pop(560, 700), TM['win'], db(-24), UP)
tn0 = TM['note']
put(hp(noise(.08), 1500) * env_ad(.08, .002, .02), tn0, db(-20), -0.4); put(thud(120, .25, .07), tn0, db(-18), -0.4)
put(tone(330, 1.0, .01, .4, ((1, 1), (2, .2))), tn0 + 0.2, db(-26), -0.2); put(tone(262, 1.4, .01, .6, ((1, 1), (2, .2))), tn0 + 0.5, db(-26), -0.2)
def typeburst(t0, n, cps, amp, pan):
    for i in range(n):
        put(click(.02, 2500 + 800 * rng.random(), 1100 + 400 * rng.random()), t0 + i / cps, db(amp) * (0.6 + .4 * rng.random()), pan)
typeburst(TM['rings'][0] + 0.1, 6, 14, -30, -0.4); typeburst(TM['rings'][2] - 0.3, 15, 18, -30, -0.4); typeburst(TM['rings'][3], 24, 20, -30, -0.4)
typeburst(TM['note'] + 0.3, 26, 24, -26, -0.4)

# ---------- empalme al cierre ----------
w0 = TM['wipe']
rs = tone(180, 1.4, .8, 5, f_end=1100) * np.linspace(0, 1, int(1.4 * SR)) ** 2
put(rs, w0 - 1.4, db(-27), 0); put(swoosh(1.2, True, 7000, 800), w0 - 1.2, db(-24), 0)
put(thud(55, .9, .22), w0 + 0.1, db(-9), 0); put(swoosh(0.5, False, 6000, 900), w0, db(-20), 0)

# ---------- hub ----------
for tp in (0.75, 0.95, 1.15): put(pop(500, 760), H(tp), db(-22), 0)
put(tone(220, .6, .01, .22, ((1, 1), (2, .3))), H(1.1), db(-22), 0)
for i in range(6):
    put(tone(700 + 95 * i, .25, .002, .08, ((1, 1), (2, .2))), H(2.0 + i * 0.25 + 0.5), db(-24), (-1 + i * .4) * .6)
put(tone(160, 1.0, .5, 3, f_end=900) * np.linspace(0, 1, int(1.0 * SR)) ** 2, H(3.3), db(-27), 0); put(swoosh(0.8, True, 6000, 800), H(3.4), db(-26), 0)
lg = H(4.5)
put(bell(880, 2.6, .9), lg, db(-13), 0); put(bell(1320, 2.0, .6), lg + 0.02, db(-22), 0); put(thud(52, 1.2, .35), lg, db(-13), 0)
put(click(.03, 2000, 2000), H(5.1), db(-20), 0); put(tone(1760, .3, .002, .1), H(5.1), db(-27), 0)
put(pop(560, 780), TM['tag2'], db(-24), 0); put(click(.03, 1500, 1200), H(5.3), db(-24), 0)

# ---------- cama sintética provisoria (se reemplaza por la música real) ----------
BED = np.zeros(N)
def bput(sig, t, g):
    i = int(t * SR); j = min(N, i + len(sig)); BED[i:j] += sig[:j - i] * g
chords = [(TM['splitStart'], sp0, [110, 164.8, 220, 261.6]), (sp0, TM['wipe'], [130.8, 196, 329.6, 587.3]), (TM['wipe'], DUR - 0.5, [130.8, 196, 261.6, 329.6, 493.9])]
for a, b, fr in chords: bput(pad(fr, b - a + 0.8, 1.2, 1.2), a - 0.2, db(-25))
pent = [261.6, 293.7, 329.6, 392, 440, 523.3, 587.3, 659.3]
t = H(0.8); i = 0
while t < DUR - 1.2:
    f = pent[[0, 2, 4, 3, 5, 4, 2, 1][i % 8]]
    bput(tone(f * (2 if i % 8 in (4, 5) else 1), .5, .003, .18, ((1, 1), (2, .2))), t, db(-29)); t += 0.25; i += 1
L += BED * np.cos(np.pi / 4); R += BED * np.sin(np.pi / 4)

# ---------- master ----------
fade = np.clip((DUR - tn) / 1.2, 0, 1)
L *= fade; R *= fade
peak = max(np.abs(L).max(), np.abs(R).max()); k = db(-2.0) / peak
out = np.stack([L * k, R * k], axis=1)
pcm = (np.clip(out, -1, 1) * 32767).astype('<i2')
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('ok', sys.argv[1], 'pico previo', round(float(peak), 2))
