"""Genera videos/atacama-puestos-v3/index.html: «Un agente, un puesto» en el lenguaje de la serie
(paneles partidos arriba/abajo, colores de marca + cuadrícula, transiciones intercaladas, letras con máscara, puertas al logo).
Las mini-interfaces de los 4 puestos vienen del proyecto anterior (vig-block.html)."""
import os, re

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'atacama-puestos-v3')
os.makedirs(OUT + '/assets/fonts', exist_ok=True)
os.makedirs(OUT + '/audio', exist_ok=True)
os.makedirs(OUT + '/renders', exist_ok=True)

blk = open(os.path.join(HERE, 'vig-block.html'), encoding='utf8').read()
parts = re.split(r'<!-- V\d [^>]*-->', blk)
vigs = [p.strip() for p in parts if p.strip().startswith('<div id="v')]
# la última parte arrastra el cierre del contenedor de la tarjeta antiguo: se recorta al último </div> de la viñeta
vigs = [v[:v.rindex('</div>')].rstrip() if i == 3 else v for i, v in enumerate(vigs)]
assert len(vigs) == 4, len(vigs)
# la agenda respira: las franjas suben 30 px para que el botón no toque la última
vigs[2] = vigs[2].replace('top: 300px', 'top: 270px').replace('top: 440px', 'top: 410px').replace('top: 580px', 'top: 550px')
# cada viñeta termina en su propio </div>; en las tres primeras ya está bien

SCENES = [
    # id, top class, bottom class, top letter class, bottom letter class, logo, top text, bottom text / viñeta
    dict(k=0, top='real', bot='mist', tc='c-mist', bc='c-real', logo='dk', ta='Un agente', tb='un puesto', big=True),
    dict(k=1, top='mist', bot='brand', tc='c-brand', logo='lt', ta='Recepción', v=0, n='01'),
    dict(k=2, top='real', bot='sky', tc='c-mist', logo='dk', ta='Cotizaciones', v=1, n='02'),
    dict(k=3, top='mist', bot='real', tc='c-real', logo='lt', ta='Agenda', v=2, n='03'),
    dict(k=4, top='real', bot='brand', tc='c-mist', logo='dk', ta='Seguimiento', v=3, n='04'),
]


def scene_html(s):
    k = s['k']
    top = f'''      <div id="b{k}t" class="pan top {s['top']}" data-layout-allow-overflow><div class="gd"></div><div class="plogo {s['logo']}"></div>'''
    if k:
        top += f'<div class="cnt {s["tc"]}">{s["n"]} / 04</div>'
    top += f'''<div class="txt{' big' if s.get('big') else ''} {s['tc']}" id="t{k}a"><span class="ln"><i>{s['ta']}</i></span></div></div>'''
    if k == 0:
        bot = f'''      <div id="b0b" class="pan bot {s['bot']}" data-layout-allow-overflow><div class="gd"></div><div class="txt big {s['bc']}" id="t0b"><span class="ln"><i>{s['tb']}</i></span></div></div>'''
    else:
        bot = f'''      <div id="b{k}b" class="pan bot {s['bot']}" data-layout-allow-overflow><div class="gd"></div><div class="card" id="k{k}">{vigs[s['v']]}</div></div>'''
    return top + '\n' + bot


scenes_markup = '\n\n'.join(scene_html(s) for s in SCENES)

html = '''<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <title>Atacama Labs — Un agente, un puesto</title>
    <script src="assets/gsap.min.js"></script>
    <style>
      @font-face { font-family: "DM Sans"; src: url("assets/fonts/DMSans-latin-wght.woff2") format("woff2"); font-weight: 100 1000; font-style: normal; }
      :root { --real: #1a3c8e; --blue: #0f5ced; --sky: #58a6ff; --mist: #f3f6fd; --ink: #0b1e3f; --deep: #0b1e3f; --white: #ffffff; --line: rgba(15, 92, 237, 0.10); --blue-on-dark: #2e74f5; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { margin: 0; width: 1080px; height: 1920px; overflow: hidden; background: #ffffff; }
      #main { position: relative; width: 100%; height: 100%; overflow: hidden; background: var(--white); font-family: "DM Sans", sans-serif; -webkit-font-smoothing: antialiased; }
      .layer { position: absolute; inset: 0; }
      svg { display: block; }

      /* escenario de cierre */
      #grid { background-image: linear-gradient(var(--line) 2px, transparent 2px), linear-gradient(90deg, var(--line) 2px, transparent 2px); background-size: 120px 120px; top: -120px; bottom: 0; }
      #glow { background: radial-gradient(ellipse 70% 26% at 50% 50%, rgba(15, 92, 237, 0.16), rgba(15, 92, 237, 0) 70%); }
      #logoWrap { position: absolute; left: 150px; top: 836px; width: 780px; height: 80px; overflow: hidden; opacity: 0; }
      #close-logo { position: absolute; left: 0; top: 0; width: 780px; }
      #sweep { position: absolute; top: -20px; bottom: -20px; left: -200px; width: 140px; background: linear-gradient(100deg, rgba(255,255,255,0), rgba(255,255,255,0.95), rgba(255,255,255,0)); transform: skewX(-18deg); }
      #tag { opacity: 0; position: absolute; left: 0; width: 1080px; top: 950px; text-align: center; font-size: 78px; font-weight: 400; letter-spacing: -0.02em; color: var(--ink); white-space: nowrap; }
      #tag .ln { display: inline-block; }
      #tag b { position: relative; font-weight: 600; color: var(--blue); }
      #tag .ul { position: absolute; left: 0; right: 0; bottom: -4px; height: 5px; background: var(--blue); transform-origin: left center; border-radius: 3px; }
      #url { position: absolute; left: 0; width: 1080px; top: 1096px; text-align: center; font-size: 40px; font-weight: 500; letter-spacing: 0.14em; color: var(--blue); opacity: 0; }

      /* paneles */
      .pan { position: absolute; left: 0; width: 1080px; height: 960px; overflow: hidden; clip-path: inset(100% 0% 0% 0%); }
      .top { top: 0; }
      .bot { top: 960px; }
      .real { background: var(--real); --gl: rgba(255, 255, 255, 0.13); }
      .brand { background: var(--blue); --gl: rgba(255, 255, 255, 0.16); }
      .sky { background: var(--sky); --gl: rgba(255, 255, 255, 0.34); }
      .mist { background: var(--mist); --gl: rgba(15, 92, 237, 0.12); }
      .c-real { color: var(--real); } .c-brand { color: var(--blue); } .c-sky { color: var(--sky); } .c-mist { color: var(--mist); }
      .gd { position: absolute; left: 0; top: -120px; width: 1080px; height: 1080px; background-image: linear-gradient(var(--gl) 2px, transparent 2px), linear-gradient(90deg, var(--gl) 2px, transparent 2px); background-size: 120px 120px; }
      .txt { position: absolute; left: 84px; right: 64px; font-size: 132px; font-weight: 500; line-height: 1.02; letter-spacing: -0.032em; }
      .txt.big { font-size: 156px; }
      .top .txt { bottom: 76px; }
      .bot .txt { top: 76px; }
      .ln { display: block; overflow: hidden; padding: 0.04em 0 0.16em; margin-bottom: -0.16em; }
      .ln i { display: block; font-style: normal; }
      .plogo { position: absolute; left: 84px; top: 80px; width: 300px; height: 29px; background-repeat: no-repeat; background-size: contain; background-position: left center; }
      .plogo.dk { background-image: url("assets/logo-dark.svg"); }
      .plogo.lt { background-image: url("assets/logo-light.svg"); }
      .cnt { position: absolute; right: 84px; top: 84px; font-size: 32px; font-weight: 600; letter-spacing: 0.14em; }
      #b0t, #b0b { z-index: 1; } #b1t, #b1b { z-index: 2; } #b2t, #b2b { z-index: 3; } #b3t, #b3b { z-index: 4; } #b4t, #b4b { z-index: 5; }

      /* tarjeta con la mini-interfaz del puesto (viene del primer video) */
      .card { position: absolute; left: 96px; top: 50px; width: 888px; height: 860px; border-radius: 44px; background: #ffffff; box-shadow: 0 24px 54px rgba(5, 18, 60, 0.24); overflow: hidden; }
      .kicker { position: absolute; font-size: 32px; font-weight: 500; letter-spacing: 0.14em; text-transform: uppercase; color: var(--blue); white-space: nowrap; }
      .vig { position: absolute; inset: 0; padding: 64px 64px; }
      .row { position: absolute; left: 64px; right: 64px; display: flex; align-items: center; gap: 28px; font-size: 42px; font-weight: 400; color: var(--ink); }
      .tick { flex: none; width: 56px; height: 56px; border-radius: 28px; background: var(--blue); display: flex; align-items: center; justify-content: center; }
      .tick svg { width: 30px; height: 30px; }
      .lab { color: rgba(4, 18, 40, 0.56); font-weight: 300; }
      .val { margin-left: auto; font-weight: 500; }
      .bubble { position: absolute; left: 64px; top: 70px; max-width: 700px; padding: 34px 40px; border-radius: 40px 40px 40px 10px; background: #eef3fd; font-size: 44px; font-weight: 400; line-height: 1.3; color: var(--ink); }
      .pill { position: absolute; left: 64px; bottom: 64px; padding: 26px 44px; border-radius: 60px; background: var(--blue); color: var(--white); font-size: 42px; font-weight: 500; }
      .chip { position: absolute; left: 64px; display: flex; align-items: center; gap: 24px; padding: 22px 34px; border-radius: 22px; border: 3px solid #dfe8f8; background: var(--white); font-size: 42px; font-weight: 400; color: var(--ink); }
      .chip em { font-style: normal; color: var(--blue); font-weight: 500; }
      .days { position: absolute; left: 64px; right: 64px; top: 80px; display: flex; gap: 20px; }
      .day { flex: 1; height: 150px; border-radius: 28px; border: 3px solid #dfe8f8; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 36px; font-weight: 400; color: rgba(4,18,40,.6); }
      .day b { font-size: 56px; font-weight: 400; color: var(--ink); }
      .day.on { background: var(--blue); border-color: var(--blue); color: rgba(255,255,255,.85); }
      .day.on b { color: var(--white); font-weight: 500; }
      .slot { position: absolute; left: 64px; right: 64px; height: 110px; border-radius: 28px; border: 3px solid #dfe8f8; display: flex; align-items: center; padding: 0 40px; font-size: 46px; font-weight: 400; color: var(--ink); }
      .slot.on { border-color: var(--blue); background: #eef3fd; font-weight: 500; }
    </style>
  </head>
  <body>
    <div id="main" data-composition-id="main" data-start="0" data-duration="9.4" data-width="1080" data-height="1920" data-fps="30">
      <div id="grid" class="layer"></div>
      <div id="glow" class="layer"></div>
      <div id="logoWrap" data-layout-allow-overflow><img id="close-logo" src="assets/logo-light.svg" alt="Atacama Labs" /><div id="sweep" data-layout-allow-overflow></div></div>
      <div id="tag" data-layout-allow-overflow data-layout-allow-occlusion><span class="ln" data-layout-allow-overflow><i>Agentes que <b>trabajan.<span class="ul"></span></b></i></span></div>
      <div id="url">ATACAMALABS.CL</div>

''' + scenes_markup + '''

      <audio id="sfx" src="assets/audio.wav" data-start="0" data-duration="9.4" data-track-index="9"></audio>
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
      const SHOW = "inset(0% 0% 0% 0%)";
      const up = (sel, t, dur = 0.72, ease = "expo.inOut") =>
        tl.fromTo(sel, { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: SHOW, duration: dur, ease }, t);
      const sideIn = (sel, t, from, dur = 0.72, ease = "expo.inOut") =>
        tl.fromTo(sel, { clipPath: from === "left" ? "inset(0% 100% 0% 0%)" : "inset(0% 0% 0% 100%)" }, { clipPath: SHOW, duration: dur, ease }, t);
      const slide = (id, t, xp, st = 0.1) =>
        tl.fromTo(id + " .ln i", { xPercent: xp }, { xPercent: 0, duration: 0.85, ease: "expo.out", stagger: st }, t);
      const lines = (id, t, st = 0.1) =>
        tl.fromTo(id + " .ln i", { yPercent: 118 }, { yPercent: 0, duration: 0.85, ease: "expo.out", stagger: st }, t);
      const pop = (sel, t) =>
        tl.fromTo(sel, { opacity: 0, y: 36, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.38, ease: "back.out(1.4)" }, t);

      tl.fromTo("#grid", { y: 0 }, { y: 120, duration: 9.4, ease: "none" }, 0);
      tl.fromTo(".gd", { y: 0 }, { y: 120, duration: 9.4, ease: "none" }, 0);

      // 0 · título, entra de lado: arriba desde la izquierda, abajo desde la derecha
      sideIn("#b0t", 0, "left", 0.75, "expo.out");
      sideIn("#b0b", 0.06, "right", 0.75, "expo.out");
      slide("#t0a", 0.12, -108); slide("#t0b", 0.3, 108);

      // 1 · Recepción — ARRIBA
      up("#b1b", 1.3); up("#b1t", 1.38);
      lines("#t1a", 1.62);
      tl.fromTo("#k1", { y: 70, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "expo.out" }, 1.55);
      pop("#v1b", 1.7); pop("#v1c1", 2.0); pop("#v1c2", 2.16); pop("#v1p", 2.42);
      tl.set(["#b0t", "#b0b"], { autoAlpha: 0 }, 2.1);

      // 2 · Cotizaciones — LATERAL (abajo desde la izquierda, arriba desde la derecha)
      sideIn("#b2b", 2.7, "left"); sideIn("#b2t", 2.78, "right");
      slide("#t2a", 3.05, 108);
      tl.fromTo("#k2", { x: -140, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, ease: "expo.out" }, 2.95);
      pop("#v2r1", 3.1); pop("#v2r2", 3.28); pop("#v2r3", 3.46); pop("#v2p", 3.74);
      tl.set(["#b1t", "#b1b"], { autoAlpha: 0 }, 3.5);

      // 3 · Agenda — ARRIBA
      up("#b3b", 4.1); up("#b3t", 4.18);
      lines("#t3a", 4.42);
      tl.fromTo("#k3", { y: 70, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "expo.out" }, 4.35);
      pop("#v3d", 4.5); pop("#v3s1", 4.72); pop("#v3s2", 4.86); pop("#v3s3", 5.0); pop("#v3p", 5.28);
      tl.set(["#b2t", "#b2b"], { autoAlpha: 0 }, 4.9);

      // 4 · Seguimiento — LATERAL al revés (abajo desde la derecha, arriba desde la izquierda)
      sideIn("#b4b", 5.5, "right"); sideIn("#b4t", 5.58, "left");
      slide("#t4a", 5.85, -108);
      tl.fromTo("#k4", { x: 140, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, ease: "expo.out" }, 5.75);
      pop("#v4r1", 5.9); pop("#v4r2", 6.08); pop("#v4r3", 6.26); pop("#v4p", 6.54);
      tl.set(["#b3t", "#b3b"], { autoAlpha: 0 }, 6.3);

      // 5 · las dos mitades se abren como puertas con el golpe grave y descubren el logo
      tl.to("#b4t", { y: -960, duration: 0.9, ease: "expo.inOut" }, 7.0);
      tl.to("#b4b", { y: 960, duration: 0.9, ease: "expo.inOut" }, 7.0);
      tl.fromTo("#logoWrap", { opacity: 0, scale: 0.94, filter: "blur(14px)" }, { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.8, ease: "expo.out", transformOrigin: "50% 50%" }, 7.5);
      tl.fromTo("#sweep", { x: 0 }, { x: 1150, duration: 1.0, ease: "power2.inOut" }, 8.0);
      tl.fromTo("#tag", { opacity: 0 }, { opacity: 1, duration: 0.01 }, 7.89);
      tl.fromTo("#tag .ln i", { yPercent: 118 }, { yPercent: 0, duration: 0.8, ease: "expo.out" }, 7.9);
      tl.fromTo("#tag .ul", { scaleX: 0 }, { scaleX: 1, duration: 0.7, ease: "expo.inOut" }, 8.4);
      tl.fromTo("#url", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" }, 8.65);

      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
'''
open(OUT + '/index.html', 'w', encoding='utf8').write(html)
print('ok', len(html))
