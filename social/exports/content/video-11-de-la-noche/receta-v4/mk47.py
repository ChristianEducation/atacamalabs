import re
r = open('render46.mjs', encoding='utf-8').read()
a = r.index('const TM = {'); b = r.index('};', a) + 2
TM = '''const TM = {
  hookTitle: 0.5, hookNotif: 1.9, hookText: 3.1, hookAhora: 3.8, splitStart: 4.9, splitEnd: 5.6,
  land: 5.75, rings: [6.0, 7.3, 8.6, 9.9], ringDur: 0.9,
  cust: 5.7, typingA: 5.95, agent: 6.3, sheet: 6.65, tap1: 7.4, step2: 7.7, tap2: 8.2, step3: 8.5, tap3: 8.95, done: 9.4,
  capT: [6.1, 7.5, 8.9],
  spin0: 10.6, spin1: 11.8, morning: 11.0, sunUp: 11.25, pan0: 10.9, pan1: 12.5, clockSwap: 11.5,
  note: 12.4, cards: [12.8, 13.1, 13.4], win: 14.0,
  wipe: 15.3, hub0: 15.7, hubSpeed: 1.9, tag2: 18.9, cursorIn: 20.0, click: 20.9, end: DUR,
};'''
r = r[:a] + TM + r[b:]
r = r.replace('DUR = 26.0', 'DUR = 22.3').replace('timing46.json', 'timing47.json').replace('page46.html', 'page47.html')
open('render47.mjs', 'w', encoding='utf-8').write(r)

s = open('audio46.py', encoding='utf-8').read()
s = s.replace("timing46.json", "timing47.json").replace("DUR = 26.0", "DUR = 22.3")
# sin voz: anular lectura de voz y ducking
i = s.index("# ---------- voz en off ----------"); j = s.index("# ---------- master ----------")
s = s[:i] + "VO = np.zeros(N)\n\n" + s[j:]
open('audio47.py', 'w', encoding='utf-8').write(s)
print('ok')
