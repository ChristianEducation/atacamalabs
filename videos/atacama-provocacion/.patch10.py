import re
p = 'index.html'
s = open(p, encoding='utf8').read()


def rep(a, b):
    global s
    if a not in s:
        print('NO ESTÁ:', a[:90])
        return
    s = s.replace(a, b, 1)


# frase del medio sin «siempre»
rep('<span class="ln"><i>que siempre</i></span><span class="ln"><i>queda para</i></span><span class="ln"><i>mañana?</i></span>',
    '<span class="ln"><i>que queda</i></span><span class="ln"><i>para mañana?</i></span>')
# duración total: 8,3 s (el audio y el video arrancan juntos en 0 y terminan juntos)
s = s.replace('data-duration="9.0"', 'data-duration="8.3"')

NEW_JS = '''      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
      const SHOW = "inset(0% 0% 0% 0%)";
      const up = (sel, t, dur = 0.72, ease = "expo.inOut") =>
        tl.fromTo(sel, { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: SHOW, duration: dur, ease }, t);
      // entrada lateral de un panel (crece desde el borde izquierdo o derecho) y deslizamiento lateral de sus líneas
      const sideIn = (sel, t, from, dur = 0.72, ease = "expo.inOut") =>
        tl.fromTo(sel, { clipPath: from === "left" ? "inset(0% 100% 0% 0%)" : "inset(0% 0% 0% 100%)" }, { clipPath: SHOW, duration: dur, ease }, t);
      const slide = (id, t, xp, st = 0.1) =>
        tl.fromTo(id + " .ln i", { xPercent: xp }, { xPercent: 0, duration: 0.85, ease: "expo.out", stagger: st }, t);
      // cada línea sube desde una máscara; las líneas de una misma mitad se escalonan
      const lines = (id, t, st = 0.1) =>
        tl.fromTo(id + " .ln i", { yPercent: 118 }, { yPercent: 0, duration: 0.85, ease: "expo.out", stagger: st }, t);

      // Todo el video sigue el pulso del audio (empieza en 0): pulsos en 0,1 · 1,74 · 3,98 y golpe grave en 5,75.
      // la cuadrícula avanza un cuadro completo (120 px) durante el video, igual en todos los paneles y en el cierre
      tl.fromTo(".gd", { y: 0 }, { y: 120, duration: 8.3, ease: "none" }, 0);
      tl.fromTo("#grid", { y: 0 }, { y: 120, duration: 8.3, ease: "none" }, 0);

      // 1 · LATERAL: el panel de arriba entra desde la izquierda y el de abajo desde la derecha
      sideIn("#b1t", 0, "left", 0.75, "expo.out");
      sideIn("#b1b", 0.06, "right", 0.75, "expo.out");
      tl.fromTo("#seam", { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0.3);
      tl.fromTo("#seamShadow", { opacity: 0 }, { opacity: 1, duration: 0.6 }, 0.3);
      slide("#t1a", 0.12, -108); slide("#t1b", 0.3, 108);

      // 2 · ARRIBA: barrido hacia arriba, primero la mitad de abajo y un instante después la de arriba; un filo de luz marca el borde
      up("#b2b", 1.74); up("#b2t", 1.82);
      tl.set("#e2b", { opacity: 1 }, 1.74); tl.fromTo("#e2b", { y: 0 }, { y: -960, duration: 0.72, ease: "expo.inOut" }, 1.74); tl.set("#e2b", { opacity: 0 }, 2.46);
      tl.set("#e2t", { opacity: 1 }, 1.82); tl.fromTo("#e2t", { y: 0 }, { y: -960, duration: 0.72, ease: "expo.inOut" }, 1.82); tl.set("#e2t", { opacity: 0 }, 2.54);
      lines("#t2a", 2.14); lines("#t2b", 2.28);
      tl.set(["#b1t", "#b1b"], { autoAlpha: 0 }, 2.6);

      // 3 · LATERAL, al revés que la apertura: «alguien | tiene que hacerlo», cada mitad lleva el color de la otra
      sideIn("#b3b", 3.98, "left"); sideIn("#b3t", 4.06, "right");
      slide("#t3a", 4.44, 108, 0.12); slide("#t3b", 4.62, -108, 0.14);
      tl.set(["#b2t", "#b2b"], { autoAlpha: 0 }, 4.8);

      // 4 · las dos mitades se abren como puertas justo con el golpe grave (5,75 s) y descubren el logo
      tl.to(["#seam", "#seamShadow"], { opacity: 0, duration: 0.25 }, 5.68);
      tl.to("#b3t", { y: -960, duration: 0.9, ease: "expo.inOut" }, 5.75);
      tl.to("#b3b", { y: 960, duration: 0.9, ease: "expo.inOut" }, 5.75);
      tl.fromTo("#logoWrap", { opacity: 0, scale: 0.94, filter: "blur(14px)" }, { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.8, ease: "expo.out", transformOrigin: "50% 50%" }, 6.25);
      tl.fromTo("#sweep", { x: 0 }, { x: 1150, duration: 1.0, ease: "power2.inOut" }, 6.75);
      tl.fromTo("#tag", { opacity: 0 }, { opacity: 1, duration: 0.01 }, 6.64);
      tl.fromTo("#tag .ln i", { yPercent: 118 }, { yPercent: 0, duration: 0.8, ease: "expo.out" }, 6.65);
      tl.fromTo("#tag .ul", { scaleX: 0 }, { scaleX: 1, duration: 0.7, ease: "expo.inOut" }, 7.15);
      tl.fromTo("#url", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" }, 7.4);

      window.__timelines["main"] = tl;
    '''
m = re.search(r'(<script>\n)(      window\.__timelines = window\.__timelines \|\| \{\};.*?)(</script>)', s, re.S)
if not m:
    print('NO ENCONTRÉ EL SCRIPT')
else:
    s = s[:m.start(2)] + NEW_JS + s[m.end(2):]
open(p, 'w', encoding='utf8').write(s)
print('ok')
