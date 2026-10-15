import subprocess, shutil, wave, numpy as np, json
SR = 48000; FF = shutil.which('ffmpeg')
TEMPO = 1.08; MAXGAP = 0.16
out = {}
for i in range(1, 8):
    src = 'img/L%d-marisol.mp3' % i
    subprocess.run([FF, '-v', 'error', '-y', '-i', src, '-ac', '1', '-ar', str(SR), '-af', 'atempo=%s' % TEMPO, 'img/l%d.wav' % i])
    w = wave.open('img/l%d.wav' % i); x = np.frombuffer(w.readframes(w.getnframes()), '<i2').astype(float) / 32768
    hop = int(SR * 0.01); n = len(x) // hop
    rms = np.array([np.sqrt(np.mean(x[k * hop:(k + 1) * hop] ** 2)) for k in range(n)])
    th = max(0.01, rms.max() * 0.05); act = rms > th
    segs = []; k = 0
    while k < n:
        if act[k]:
            j = k; gap = 0
            while j < n and (act[j] or gap < 10): gap = 0 if act[j] else gap + 1; j += 1
            segs.append((k, j - gap)); k = j
        else: k += 1
    pad = 4
    pieces = []
    for a, b in segs:
        a0 = max(0, a - pad) * hop; b0 = min(n, b + pad) * hop
        seg = x[a0:b0].copy(); f = int(SR * 0.012); seg[:f] *= np.linspace(0, 1, f); seg[-f:] *= np.linspace(1, 0, f); pieces.append(seg)
    gaps = [(segs[m + 1][0] - segs[m][1]) * 0.01 for m in range(len(segs) - 1)]
    res = []; offs = []; cur = 0.0
    for m, p in enumerate(pieces):
        offs.append(round(cur, 2)); cur += len(p) / SR
        res.append(p)
        if m < len(pieces) - 1:
            g = min(MAXGAP, gaps[m]); res.append(np.zeros(int(SR * g))); cur += g
    y = np.concatenate(res)
    wf = wave.open('img/c%d.wav' % i, 'wb'); wf.setnchannels(1); wf.setsampwidth(2); wf.setframerate(SR); wf.writeframes((np.clip(y, -1, 1) * 32767).astype('<i2').tobytes()); wf.close()
    out[i] = {'dur': round(len(y) / SR, 2), 'segs': len(segs), 'offs': offs}
    print(i, out[i])
json.dump(out, open('img/clips.json', 'w'))
