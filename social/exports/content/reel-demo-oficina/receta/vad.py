import wave, numpy as np
w = wave.open('src.wav'); a = np.frombuffer(w.readframes(w.getnframes()), '<i2').astype(float) / 32768; sr = 16000
win = int(sr * 0.02); n = len(a) // win
db = 20 * np.log10(np.sqrt((a[:n * win].reshape(n, win) ** 2).mean(axis=1)) + 1e-9)
for thr, gap in [(-42, 0.22), (-38, 0.15)]:
    voiced = db > thr; segs = []; i = 0
    while i < n:
        if voiced[i]:
            last = i; k = i; g = 0
            while k < n:
                if voiced[k]: last = k; g = 0
                else:
                    g += 1
                    if g * 0.02 >= gap: break
                k += 1
            segs.append((round(i * 0.02, 2), round((last + 1) * 0.02, 2))); i = k
        else: i += 1
    print('umbral', thr, 'pausa>=', gap, '->', len(segs), 'segmentos'); print(segs)
