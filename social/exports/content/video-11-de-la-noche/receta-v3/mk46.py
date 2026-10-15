h = open('page45.head.html', encoding='utf-8').read()
s = open('page45.script.html', encoding='utf-8').read()

# ---- head: URL con estado "presionado", cursor grande y anillo de click ----
old_url = '''<div id="url" style="position:absolute;left:0;width:1080px;top:905px;text-align:center;font:600 38px 'DM Sans';letter-spacing:.22em;color:#0f5ced;opacity:0">ATACAMALABS.CL</div>'''
assert old_url in h
new_url = '''<div id="url" style="position:absolute;left:0;width:1080px;top:885px;text-align:center;opacity:0"><span id="urlb" style="display:inline-block;padding:10px 38px 12px 56px;border-radius:44px;font:600 38px 'DM Sans';letter-spacing:.22em;color:#0f5ced;border:3px solid transparent">ATACAMALABS.CL</span></div>'''
h = h.replace(old_url, new_url)
cursor = '''<div id="clickRing" style="position:absolute;left:0;top:0;width:130px;height:130px;margin:-65px 0 0 -65px;border:7px solid #0f5ced;border-radius:50%;opacity:0"></div>
<svg id="cursor" style="position:absolute;left:0;top:0;width:96px;height:136px;opacity:0;filter:drop-shadow(0 12px 14px rgba(0,0,0,.35));transform-origin:8px 8px" viewBox="0 0 24 34"><path d="M2 2 L2 27 L8 21.5 L12 31 L16 29.4 L12.2 20.2 L20 20 Z" fill="#111" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg>
'''
assert '<div id="hook">' in h
h = h.replace('<div id="hook">', cursor + '<div id="hook">', 1)
open('page46.head.html', 'w', encoding='utf-8').write(h)

# ---- script ----
R = [
    ("typed($('c1'), 'Suena…', TM.rings[0] + 0.1, 14, T, capOp);", "typed($('c1'), 'Suena…', TM.capT[0], 14, T, capOp);"),
    ("typed($('c2'), 'Nadie contesta.', TM.rings[2] - 0.3, 18, T, capOp);", "typed($('c2'), 'Nadie contesta.', TM.capT[1], 18, T, capOp);"),
    ("typed($('c3'), 'El cliente busca a otro.', TM.rings[3], 20, T, capOp);", "typed($('c3'), 'El cliente busca a otro.', TM.capT[2], 20, T, capOp);"),
    ("$('capBand').style.opacity = capOp * seg(T, TM.rings[0], TM.rings[0] + 0.5);", "$('capBand').style.opacity = capOp * seg(T, TM.capT[0] - 0.1, TM.capT[0] + 0.4);"),
]
for a, b in R:
    assert a in s, a[:50]
    s = s.replace(a, b)
old = "  $('url').style.opacity = eout(clamp((t - 5.3) / 0.5));\n"
assert old in s
new = old + '''  // ---- click sobre la URL ----
  const tc = TM.click, ce = eio(seg(T, TM.cursorIn, tc - 0.12));
  const fx = 548, fy = 926;
  const sx = lerp(1180, fx, ce) + Math.sin(ce * Math.PI) * 36, sy = lerp(1500, fy, ce) - Math.sin(ce * Math.PI) * 70;
  const cur = $('cursor'); cur.style.opacity = T >= TM.cursorIn ? 1 : 0;
  cur.style.left = (sx - 8) + 'px'; cur.style.top = (sy - 8) + 'px';
  cur.style.transform = 'scale(' + (T >= tc && T < tc + 0.16 ? 0.84 : 1) + ')';
  const ru = seg(T, tc, tc + 0.55); const ring = $('clickRing');
  ring.style.left = fx + 'px'; ring.style.top = fy + 'px'; ring.style.opacity = T >= tc && ru < 1 ? (1 - ru) * 0.9 : 0; ring.style.transform = 'scale(' + (0.3 + 1.5 * eout(ru)) + ')';
  const ub = $('urlb'); const pressed = T >= tc;
  ub.style.background = pressed ? '#0f5ced' : 'transparent'; ub.style.color = pressed ? '#fff' : '#0f5ced';
  ub.style.transform = 'scale(' + (pressed ? 1 + 0.05 * Math.sin(clamp((T - tc) / 0.3) * Math.PI) - 0.02 * (T < tc + 0.16 ? 1 : 0) : 1) + ')';
'''
s = s.replace(old, new)
open('page46.script.html', 'w', encoding='utf-8').write(s)
print('ok')
