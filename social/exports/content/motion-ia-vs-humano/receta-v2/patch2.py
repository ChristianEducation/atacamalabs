import re
s = open('page.template.html', encoding='utf-8').read()

# --- HTML: cierre fijo de marca (sin cursor) ---
a = s.index('<div id="s6" class="sc">'); b = s.index('<div id="fn">')
s6 = '''<div id="s6" class="sc">
 <img id="logo" src="__LOGO__" class="abs" style="left:150px;top:660px;width:780px">
 <div id="slogan" class="abs" style="left:0;width:1080px;top:850px;text-align:center;font:500 100px 'DM Sans';letter-spacing:-.03em;color:#16233f">Agentes que <span style="position:relative;font-weight:700;color:#0f5ced">trabajan.<i id="ul" style="position:absolute;left:2%;bottom:-4px;height:7px;width:0;background:#0f5ced;border-radius:4px"></i></span></div>
 <div id="url" class="abs" style="left:0;width:1080px;top:1030px;text-align:center;font:600 40px 'DM Sans';letter-spacing:.22em;color:#0f5ced;opacity:0">ATACAMALABS.CL</div>
</div>
'''
s = s[:a] + s6 + s[b:]
a = s.index('<div id="clickRing"'); b = s.index('<div id="black">')
s = s[:a] + s[b:]

# --- JS: warp de tiempos (cada escena dura más) ---
warp = '''const OLDK = [0, 0.1, 2.2, 3.55, 5.15, 6.75, 8.25], NEWK = [0, 0.1, 3.0, 4.7, 7.3, 9.9, 12.5];
function warp(t) {
  for (let k = 0; k < NEWK.length - 1; k++) if (t < NEWK[k + 1]) return OLDK[k] + (t - NEWK[k]) * (OLDK[k + 1] - OLDK[k]) / (NEWK[k + 1] - NEWK[k]);
  return OLDK[OLDK.length - 1] + (t - NEWK[NEWK.length - 1]);
}
'''
s = s.replace('function draw(T) {', warp + 'function draw(T) {\n  const T0 = T; T = warp(T0);', 1)
s = s.replace("$('fn').style.opacity = seg(T, 0.5, 0.9) * 0.9;", "$('fn').style.opacity = seg(T0, 0.5, 0.9) * 0.9 * (1 - seg(T0, TM.e0 - 0.3, TM.e0 + 0.1));")
a = s.index('  // ---- cierre ----'); b = s.index('window.draw = draw;')
end = '''  // ---- cierre fijo de la marca ----
  const e0 = TM.e0;
  const s6 = $('s6'); s6.style.opacity = seg(T0, e0 - 0.1, e0 + 0.1);
  const lu = eout(seg(T0, e0 + 0.1, e0 + 0.65)); $('logo').style.opacity = lu; $('logo').style.transform = 'translateY(' + ((1 - lu) * 26) + 'px)';
  const cu = eout(seg(T0, e0 + 0.4, e0 + 0.95)); $('slogan').style.opacity = cu; $('slogan').style.transform = 'translateY(' + ((1 - cu) * 26) + 'px)';
  $('ul').style.width = (96 * eout(seg(T0, e0 + 1.0, e0 + 1.5))) + '%';
  $('url').style.opacity = eout(seg(T0, e0 + 1.2, e0 + 1.7));
}
'''
s = s[:a] + end + s[b:]
open('page.template.html', 'w', encoding='utf-8').write(s)

r = open('render.mjs', encoding='utf-8').read()
r = r.replace('DUR = 11.0', 'DUR = 15.6').replace("cursorIn: 9.4, click: 10.2, end: DUR }", "e0: 12.5, end: DUR }")
open('render.mjs', 'w', encoding='utf-8').write(r)
print('ok')
