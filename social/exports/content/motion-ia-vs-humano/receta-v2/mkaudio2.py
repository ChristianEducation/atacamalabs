s = open('audio_ads.py', encoding='utf-8').read()
s = s.replace('DUR = 11.0', 'DUR = 15.6')
warp = '''OLDK = [0, 0.1, 2.2, 3.55, 5.15, 6.75, 8.25]; NEWK = [0, 0.1, 3.0, 4.7, 7.3, 9.9, 12.5]
def W(t):
    if t >= OLDK[-1]: return NEWK[-1] + (t - OLDK[-1])
    for k in range(len(OLDK) - 1):
        if t < OLDK[k + 1]: return NEWK[k] + (t - OLDK[k]) * (NEWK[k + 1] - NEWK[k]) / (OLDK[k + 1] - OLDK[k])
_put0 = put
def put(sig, t, gain=1.0, pan=0.0): return _put0(sig, W(t), gain, pan)
'''
s = s.replace('\nBED = np.zeros(N)', '\n' + warp + 'BED = np.zeros(N)', 1)
s = s.replace("i = int(t * SR); j = min(N, i + len(sig)); BED[i:j] += sig[:j - i] * g", "i = int(W(t) * SR); j = min(N, i + len(sig)); BED[i:j] += sig[:j - i] * g")
s = s.replace("bput(pad(fr, b - a + 0.8, 0.5, 0.9), a, db(-29))", "bput(pad(fr, W(b) - W(a) + 0.8, 0.5, 0.9), a, db(-29))")
s = s.replace("(TM['s6'], DUR, [130.8, 196, 261.6, 329.6, 493.9])", "(TM['s6'], 11.35, [130.8, 196, 261.6, 329.6, 493.9])")
# ticks de cronómetro: respetar el mapeo
s = s.replace("put(click(.012, 3000, 2200), t, db(-33), 0.3); t += 0.07", "put(click(.012, 3000, 2200), t, db(-33), 0.3); t += 0.07")
# quitar cursor y click
lines = [l for l in s.split('\n') if "cursorIn" not in l and "tc = TM['click']" not in l and "put(click(.025, 3500, 1900), tc" not in l]
s = '\n'.join(lines)
# ajustar eventos del cierre a la animación nueva (logo e0+0.1, slogan e0+0.4, subrayado e0+1.0, URL e0+1.2); en tiempo "viejo" el cierre es 8.25 + x
s = s.replace("put(pop(560, 780), TM['s6'] + 0.4, db(-23), 0); put(click(.03, 1500, 1200), TM['s6'] + 0.85, db(-24), 0); put(pop(600, 850), TM['s6'] + 0.95, db(-24), 0)",
              "put(pop(560, 780), TM['s6'] + 0.4, db(-23), 0); put(click(.03, 1500, 1200), TM['s6'] + 1.0, db(-24), 0); put(pop(600, 850), TM['s6'] + 1.2, db(-24), 0)")
open('audio_ads2.py', 'w', encoding='utf-8').write(s)
print('ok')
