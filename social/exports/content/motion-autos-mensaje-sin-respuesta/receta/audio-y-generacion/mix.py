import subprocess, shutil, wave, numpy as np, json, sys
SR = 48000; FF = shutil.which('ffmpeg')
DUR = 24.5; B = 4.6
STARTS = [0.25, 3.12, 4.75, 8.35, 15.1, 18.5, 21.2]
def rd(path, ch=1):
    w = wave.open(path); x = np.frombuffer(w.readframes(w.getnframes()), '<i2').astype(float) / 32768
    return x.reshape(-1, w.getnchannels()).T if w.getnchannels() > 1 else x
N = int(DUR * SR)
voice = np.zeros(N)
for i, st in enumerate(STARTS, 1):
    c = rd('img/c%d.wav' % i); a = int(st * SR); voice[a:a + len(c)] += c[:max(0, N - a)]
    print('L%d %.2f-%.2f' % (i, st, st + len(c) / SR))
voice *= 0.9 / max(0.01, np.abs(voice).max())
# música: alinear el golpe al corte a oscuro->claro (B) y estirar al largo del video
subprocess.run([FF, '-v', 'error', '-y', '-i', 'img/musica.m4a', '-ac', '2', '-ar', str(SR), 'img/mus_raw.wav'])
m = rd('img/mus_raw.wav'); L = m.shape[1] / SR
mono = m.mean(axis=0); hop = int(SR * 0.05); env = np.array([np.sqrt(np.mean(mono[k * hop:(k + 1) * hop] ** 2)) for k in range(len(mono) // hop)])
sm = np.convolve(env, np.ones(3) / 3, mode='same'); d = np.diff(sm); lo, hi = int(3.0 / 0.05), int(8.0 / 0.05)
imp = (np.argmax(d[lo:hi]) + lo + 1) * 0.05
p = max(0.0, (B * L - imp * DUR) / (DUR - B))
dd = 0.0 if p > 0 else max(0.0, (imp - B * L / DUR) / (1 - B / DUR))
r = (L - dd + p) / DUR
print('duración música %.2f, golpe en %.2f, relleno inicial %.2f, recorte %.2f, factor %.4f' % (L, imp, p, dd, r))
af = ('adelay=%d|%d,' % (int(p * 1000), int(p * 1000)) if p > 0 else '') + 'atempo=%.4f' % r
subprocess.run([FF, '-v', 'error', '-y', '-ss', str(dd), '-i', 'img/musica.m4a', '-af', af, '-ac', '2', '-ar', str(SR), 'img/mus_fit.wav'])
m = rd('img/mus_fit.wav')
if m.shape[1] < N: m = np.pad(m, ((0, 0), (0, N - m.shape[1])))
m = m[:, :N]
# fundido de entrada y salida
fi, fo = int(SR * 0.4), int(SR * 1.6)
m[:, :fi] *= np.linspace(0, 1, fi); m[:, -fo:] *= np.linspace(1, 0, fo)
# ducking bajo la voz
h = int(SR * 0.02); ve = np.array([np.sqrt(np.mean(voice[k * h:(k + 1) * h] ** 2)) for k in range(N // h)])
act = (ve > 0.02).astype(float)
k = np.ones(int(0.12 / 0.02)) / int(0.12 / 0.02); act = np.convolve(act, k, mode='same')
rel = np.zeros_like(act); cur = 0.0
for i, a in enumerate(act):
    cur = a if a > cur else cur + (a - cur) * 0.12
    rel[i] = cur
duck = np.interp(np.arange(N) / SR, np.arange(len(rel)) * 0.02, 1 - 0.58 * rel)
mus = m * duck * 0.62
mix = np.vstack([voice * 1.0 + mus[0], voice * 1.0 + mus[1]])
mix = mix / max(1.0, np.abs(mix).max() / 0.95)
wf = wave.open('img/mix.wav', 'wb'); wf.setnchannels(2); wf.setsampwidth(2); wf.setframerate(SR)
wf.writeframes((np.clip(mix.T, -1, 1) * 32767).astype('<i2').tobytes()); wf.close()
print('mix.wav listo')
