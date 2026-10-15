import subprocess, sys, numpy as np, json, shutil
who = sys.argv[1]
subprocess.run([shutil.which('ffmpeg'), '-v', 'error', '-y', '-i', 'img/voz-%s.mp3' % who, '-ac', '1', '-ar', '16000', 'img/voz-%s.wav' % who])
import wave
w = wave.open('img/voz-%s.wav' % who); x = np.frombuffer(w.readframes(w.getnframes()), '<i2').astype(float) / 32768; sr = w.getframerate()
hop = int(sr * 0.01); n = len(x) // hop
rms = np.array([np.sqrt(np.mean(x[i * hop:(i + 1) * hop] ** 2)) for i in range(n)])
th = max(0.012, rms.max() * 0.06)
act = rms > th
segs = []; i = 0
while i < n:
    if act[i]:
        j = i
        gap = 0
        while j < n and (act[j] or gap < 28):  # une huecos de hasta 0.28 s
            gap = 0 if act[j] else gap + 1; j += 1
        segs.append([round(i * 0.01, 2), round((j - gap) * 0.01, 2)]); i = j
    else: i += 1
print(who, 'dur', round(n * 0.01, 2), 'segmentos', len(segs)); print(segs)
json.dump(segs, open('img/segs-%s.json' % who, 'w'))
