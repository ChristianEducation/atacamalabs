import re
p = 'audio/build_audio.py'
s = open(p, encoding='utf8').read()

new_tap = '''def tap(freq=700, dur=0.09):
    """Clic seco de madera/teclado (antes era un pitido senoidal): ruido corto + cuerpo breve que cambia de tono según 'freq'."""
    n = int(0.06 * SR); t = np.arange(n) / SR
    body = np.sin(2 * np.pi * (700 + freq * 0.75) * t) * env(n, 0.007) * 0.55
    noise = np.diff(rng.standard_normal(n + 1)) * env(n, 0.0035) * 0.55
    return body + noise
'''
new_pop = '''def pop(f0=520, f1=260, dur=0.16):
    """«Tok» de madera suave para el cambio de puesto (antes era un «bloop» de barrido)."""
    n = int(0.22 * SR); t = np.arange(n) / SR
    x = np.sin(2 * np.pi * 330 * t) * env(n, 0.035) + 0.45 * np.sin(2 * np.pi * 330 * 2.76 * t) * env(n, 0.014)
    x += np.diff(rng.standard_normal(n + 1)) * env(n, 0.003) * 0.35
    return x * 0.8
'''
new_chime = '''def chime(freq=440, dur=1.2):
    """Antes campana (sonaba a aeropuerto). Ahora nota de marimba una octava más grave y más corta."""
    return pluck(freq / 2, min(dur, 0.9))
'''
s = re.sub(r'def tap\(.*?\n\n\n', new_tap + '\n\n', s, count=1, flags=re.S)
s = re.sub(r'def pop\(.*?\n\n\n', new_pop + '\n\n', s, count=1, flags=re.S)
# chime queda definida antes que pluck: la mudamos después de pluck
s = re.sub(r'def chime\(.*?\n\n\n', '', s, count=1, flags=re.S)
s = s.replace('def hat(dur=0.05):', new_chime + '\n\ndef hat(dur=0.05):', 1)
open(p, 'w', encoding='utf8').write(s)
print('ok')
