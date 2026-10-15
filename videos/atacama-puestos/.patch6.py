p = 'audio/build_audio.py'
s = open(p, encoding='utf8').read()

EFFECTS = '''# ───────── EFECTOS v6: UN protagonista por golpe visual, aire entre sonidos ─────────
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
'''

a = s.index('# ───────── EFECTOS (orden pedido por Christian)')
b = s.index('sfx_out = S.render')
s = s[:a] + EFFECTS + '\n' + s[b:]
# sin pulso grave en los puestos (añadía capa donde ya hay pops)
a = s.index('# pulso grave y suave en los puestos')
b = s.index('M /= np.abs(M).max()')
s = s[:a] + s[b:]
s = s.replace('duck = 1 - 0.45 * np.clip(e, 0, 1)', 'duck = 1 - 0.6 * np.clip(e, 0, 1)')
s = s.replace('M * 10 ** (-12 / 20) + AMB * 10 ** (-27 / 20)', 'M * 10 ** (-15 / 20) + AMB * 10 ** (-30 / 20)')
open(p, 'w', encoding='utf8').write(s)
print('ok')
