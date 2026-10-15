// Genera las sub-composiciones (compositions/s1..s5.html) y el index.html raíz a partir de .parts.json. Herramienta de autoría; no forma parte del render.
import fs from 'node:fs';
const { css, secs } = JSON.parse(fs.readFileSync('.parts.json', 'utf8'));
const B = 0.6;
secs.s5 = secs.s5.replace('<div id="url">', '<div id="ask">¿Qué puesto necesitas cubrir?</div>\n        <div id="url">');
secs.s4 = secs.s4.replace('id="c2"', 'id="c2" data-layout-allow-occlusion');
secs.s2 = secs.s2.replace(/id="(v[1-4])" class="vig"/g, 'id="$1" class="vig" data-layout-allow-overflow');

// CSS compartido: sin reglas de html/body/#root/fondos permanentes (esas viven en el index raíz)
const shared = css
  .replace(/@font-face[\s\S]*?\}\s*/, '')
  .replace(/html, body \{[^}]*\}\s*/, '')
  .replace(/#root \{[^}]*\}\s*/, '')
  .replace(/\.layer \{[^}]*\}\s*/, '')
  .replace(/\.clip \{[^}]*\}\s*/, '')
  .replace(/\/\* fondo permanente[\s\S]*?#glowDark \{[^}]*\}\s*/, '')
  .replace(/#card \{[^}]*\}/, '#card { position: absolute; left: 96px; top: 640px; width: 888px; height: 860px; border-radius: 48px; overflow: hidden; }')
  .replace(/#strike \{[^}]*\}/, '#strike { position: absolute; left: 96px; top: 868px; width: 560px; height: 10px; background: var(--blue-on-dark); transform-origin: left center; border-radius: 5px; }')
  .replace(/#close-logo \{[^}]*\}/, '#close-logo { position: absolute; left: 150px; top: 640px; width: 780px; }')
  .replace(/#tag \{/, '#ask { position: absolute; left: 0; width: 1080px; top: 1090px; text-align: center; font-size: 54px; font-weight: 400; color: rgba(4,18,40,.78); white-space: nowrap; }\n        #tag {')
  .replace(/top: 1010px; text-align: center; font-size: 104px/, 'top: 880px; text-align: center; font-size: 104px')
  .replace(/top: 1190px; text-align: center; font-size: 46px/, 'top: 1230px; text-align: center; font-size: 46px');
const FONT = '@font-face { font-family: "DM Sans"; src: url("assets/fonts/DMSans-latin-wght.woff2") format("woff2"); font-weight: 100 1000; font-style: normal; }';

const timelines = {
  s1: { t0: 0, js: `
    tl.fromTo("#logo1", { opacity: 0, y: -16 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }, A(0.1));
    tl.fromTo("#s1-kick", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }, A(0.2));
    tl.fromTo("#w1", { opacity: 0, x: -320, filter: "blur(22px)" }, { opacity: 1, x: 0, filter: "blur(0px)", duration: 0.6, ease: "expo.out" }, A(0.2));
    tl.fromTo("#w2", { opacity: 0, y: 150, filter: "blur(18px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.55, ease: "expo.out" }, A(0.2 + B));
    tl.fromTo("#w3", { opacity: 0, scale: 1.45, filter: "blur(20px)" }, { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.5, ease: "power4.out", transformOrigin: "0% 50%" }, A(0.2 + 2 * B));
    tl.to(["#w1", "#w2", "#w3"], { opacity: 0, y: -90, filter: "blur(14px)", duration: 0.35, ease: "power3.in", stagger: 0.05 }, A(2.3));
    tl.fromTo("#w4", { opacity: 0, x: 320, filter: "blur(22px)" }, { opacity: 1, x: 0, filter: "blur(0px)", duration: 0.6, ease: "expo.out" }, A(2.6));
    tl.fromTo("#w5", { opacity: 0, y: 150, filter: "blur(18px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.55, ease: "expo.out" }, A(2.6 + B));
    tl.fromTo("#w6", { opacity: 0, scale: 0.6, filter: "blur(26px)" }, { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.7, ease: "back.out(1.5)", transformOrigin: "0% 50%" }, A(2.6 + 2 * B));
    tl.to(["#w4", "#w5", "#w6", "#s1-kick"], { opacity: 0, y: -130, filter: "blur(16px)", duration: 0.4, ease: "power3.in", stagger: 0.04 }, A(4.55));
    tl.to("#logo1", { opacity: 0, duration: 0.3 }, A(4.65));` },
  s2: { t0: 4.7, js: `
    const R0 = 5.0, RD = 1.8, K = RD / 1.2;
    tl.fromTo("#logo2", { opacity: 0 }, { opacity: 1, duration: 0.4 }, A(R0));
    tl.fromTo("#s2-kick", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }, A(R0));
    tl.fromTo("#pager", { opacity: 0 }, { opacity: 1, duration: 0.4 }, A(R0 + 0.2));
    tl.fromTo("#pagerLab", { opacity: 0 }, { opacity: 1, duration: 0.4 }, A(R0 + 0.3));
    const roles = ["#r1", "#r2", "#r3", "#r4"], vigs = ["#v1", "#v2", "#v3", "#v4"], pgs = ["#pg1", "#pg2", "#pg3", "#pg4"];
    roles.forEach((r, i) => {
      const t0 = R0 + i * RD;
      tl.fromTo(r, { opacity: 0, y: 130, filter: "blur(20px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.5, ease: "expo.out" }, A(t0));
      if (i < 3) tl.to(r, { opacity: 0, y: -110, filter: "blur(16px)", duration: 0.3, ease: "power3.in" }, A(t0 + RD - 0.32));
      tl.fromTo(vigs[i], { opacity: 0, x: 90 }, { opacity: 1, x: 0, duration: 0.5, ease: "expo.out" }, A(t0 + 0.05));
      if (i < 3) tl.to(vigs[i], { opacity: 0, x: -90, duration: 0.3, ease: "power3.in" }, A(t0 + RD - 0.32));
      tl.fromTo(pgs[i], { scaleX: 0 }, { scaleX: 1, duration: RD - 0.05, ease: "none" }, A(t0));
    });
    const pop = (sel, t) => tl.fromTo(sel, { opacity: 0, y: 36, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: "back.out(1.4)" }, A(t));
    pop("#v1b", R0 + 0.15 * K); pop("#v1c1", R0 + 0.45 * K); pop("#v1c2", R0 + 0.62 * K); pop("#v1p", R0 + 0.85 * K);
    pop("#v2r1", R0 + RD + 0.2 * K); pop("#v2r2", R0 + RD + 0.38 * K); pop("#v2r3", R0 + RD + 0.56 * K); pop("#v2p", R0 + RD + 0.85 * K);
    tl.fromTo("#v3d", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.4, ease: "expo.out" }, A(R0 + 2 * RD + 0.1 * K));
    pop("#v3s1", R0 + 2 * RD + 0.3 * K); pop("#v3s2", R0 + 2 * RD + 0.45 * K); pop("#v3s3", R0 + 2 * RD + 0.6 * K); pop("#v3p", R0 + 2 * RD + 0.85 * K);
    pop("#v4r1", R0 + 3 * RD + 0.1 * K); pop("#v4r2", R0 + 3 * RD + 0.25 * K); pop("#v4r3", R0 + 3 * RD + 0.4 * K); pop("#v4p", R0 + 3 * RD + 0.6 * K);
    tl.to(["#card", "#pager", "#pagerLab", "#s2-kick", "#logo2", "#r4"], { opacity: 0, duration: 0.25, ease: "power2.in" }, A(11.8));` },
  s3: { t0: 9.5, js: `
    tl.fromTo("#logo3", { opacity: 0, y: -16 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }, A(9.9));
    tl.fromTo("#rail", { opacity: 0 }, { opacity: 1, duration: 0.4 }, A(9.9));
    tl.fromTo("#railFill", { scaleY: 0 }, { scaleY: 1, duration: 2.2, ease: "none" }, A(10.2));
    [["#n1", "#h1", "#d1"], ["#n2", "#h2", "#d2"], ["#n3", "#h3", "#d3"], ["#n4", "#h4", "#d4"]].forEach(([n, h, d], i) => {
      const t0 = 10.2 + i * B;
      tl.fromTo(n, { opacity: 0, scale: 0.2 }, { opacity: 1, scale: 1, duration: 0.45, ease: "back.out(2)" }, A(t0));
      tl.fromTo(h, { opacity: 0, x: 180, filter: "blur(20px)" }, { opacity: 1, x: 0, filter: "blur(0px)", duration: 0.55, ease: "expo.out" }, A(t0));
      tl.fromTo(d, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.45, ease: "power3.out" }, A(t0 + 0.18));
    });
    tl.fromTo("#summary", { opacity: 0, y: 70, filter: "blur(16px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.7, ease: "expo.out" }, A(12.9));
    tl.to(["#h1", "#h2", "#h3", "#h4", "#d1", "#d2", "#d3", "#d4", "#n1", "#n2", "#n3", "#n4", "#rail", "#summary", "#logo3"], { opacity: 0, y: -80, duration: 0.4, ease: "power3.in", stagger: 0.015 }, A(13.95));` },
  s4: { t0: 14.4, js: `
    tl.fromTo("#c1", { opacity: 0, y: 130, filter: "blur(18px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.55, ease: "expo.out" }, A(14.5));
    tl.fromTo("#c2", { opacity: 0, y: 130, filter: "blur(18px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.55, ease: "expo.out" }, A(14.7));
    tl.fromTo("#strike", { scaleX: 0 }, { scaleX: 1, duration: 0.3, ease: "power4.out" }, A(15.3));
    tl.to(["#c1", "#c2"], { opacity: 0.38, duration: 0.3 }, A(15.3));
    tl.fromTo("#c3", { opacity: 0, scale: 1.3, filter: "blur(22px)" }, { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.55, ease: "power4.out", transformOrigin: "0% 50%" }, A(15.6));
    tl.fromTo("#c4", { opacity: 0, scale: 1.3, filter: "blur(22px)" }, { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.55, ease: "power4.out", transformOrigin: "0% 50%" }, A(15.9));
    tl.to(["#c1", "#c2", "#strike", "#c3", "#c4"], { opacity: 0, y: -90, filter: "blur(14px)", duration: 0.35, ease: "power3.in", stagger: 0.03 }, A(16.6));` },
  s5: { t0: 16.7, js: `
    tl.fromTo("#close-logo", { opacity: 0, scale: 0.86, filter: "blur(18px)" }, { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.7, ease: "back.out(1.3)", transformOrigin: "50% 50%" }, A(17.1));
    tl.fromTo("#tag", { opacity: 0, y: 70, filter: "blur(14px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.6, ease: "expo.out" }, A(17.55));
    tl.fromTo("#ask", { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.55, ease: "expo.out" }, A(17.8));
    tl.fromTo("#url", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }, A(18.2));` },
};

fs.mkdirSync('compositions', { recursive: true });
for (const id of Object.keys(timelines)) {
  const { t0, js } = timelines[id];
  const html = `<!doctype html>
<html lang="es">
  <head><meta charset="UTF-8" /></head>
  <body>
    <template>
      <style>
        ${FONT}
        ${shared.replace(/\n/g, '\n        ')}
        #root { position: absolute; inset: 0; overflow: hidden; font-family: "DM Sans", sans-serif; color: var(--deep); }
      </style>
      <div id="root" data-composition-id="${id}" data-width="1080" data-height="1920">
${secs[id]}
      </div>
      <script>
        const B = ${B};
        const A = (t) => t - ${t0}; // las posiciones se escriben en tiempo del video y se pasan a tiempo local
        const tl = gsap.timeline({ paused: true });
${js}
        window.__timelines["${id}"] = tl;
      </script>
    </template>
  </body>
</html>
`;
  fs.writeFileSync('compositions/' + id + '.html', html);
}

const hosts = [
  ['s1', 0, 5.1, 1], ['s2', 4.7, 7.9, 2], ['s3', 12.3, 5.3, 3], ['s4', 17.2, 2.8, 4], ['s5', 19.5, 2.5, 5],
].map(([id, s, d, k]) => `      <div id="${id}-host" data-composition-id="${id}" data-composition-src="compositions/${id}.html" data-start="${s}" data-duration="${d}" data-track-index="${k}" data-width="1080" data-height="1920"></div>`).join('\n');

const index = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <title>Atacama Labs — Un agente, muchos puestos</title>
    <script src="assets/gsap.min.js"></script>
    <style>
      ${FONT}
      :root { --blue: #0f5ced; --blue-on-dark: #2e74f5; --deep: #041228; --mist: #f3f6fd; --white: #ffffff; --line: rgba(15, 92, 237, 0.14); }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { margin: 0; width: 1080px; height: 1920px; overflow: hidden; background: #f3f6fd; }
      #main { position: relative; width: 100%; height: 100%; overflow: hidden; background: var(--mist); font-family: "DM Sans", sans-serif; -webkit-font-smoothing: antialiased; }
      .layer { position: absolute; inset: 0; }
      #cardWrap { position: absolute; left: 96px; top: 640px; width: 888px; height: 860px; filter: drop-shadow(0 26px 34px rgba(4, 18, 40, 0.08)); opacity: 0; }
      #cardBase { position: absolute; inset: 0; background: #ffffff; border-radius: 48px; clip-path: inset(720px 0px 0px 0px round 48px); }
      #cardDot { position: absolute; left: 64px; top: 754px; width: 44px; height: 44px; border-radius: 22px; background: var(--blue); }
      #grid { background-image: linear-gradient(var(--line) 2px, transparent 2px), linear-gradient(90deg, var(--line) 2px, transparent 2px); background-size: 120px 120px; opacity: 0.55; }
      #glow { background: radial-gradient(ellipse 70% 38% at 50% 48%, rgba(15, 92, 237, 0.16), rgba(15, 92, 237, 0) 70%); }
      #curtain { background: var(--deep); clip-path: circle(0% at 50% 56%); }
      #gridDark { background-image: linear-gradient(rgba(255,255,255,0.1) 2px, transparent 2px), linear-gradient(90deg, rgba(255,255,255,0.1) 2px, transparent 2px); background-size: 120px 120px; opacity: 0; }
      #glowDark { background: radial-gradient(ellipse 70% 40% at 30% 40%, rgba(46, 116, 245, 0.28), rgba(46, 116, 245, 0) 70%); opacity: 0; }
      [data-composition-src] { position: absolute; inset: 0; }
    </style>
  </head>
  <body>
    <div id="main" data-composition-id="main" data-start="0" data-duration="22" data-width="1080" data-height="1920" data-fps="30">
      <div id="grid" class="layer"></div>
      <div id="glow" class="layer"></div>
      <div id="cardWrap"><div id="cardBase"></div><div id="cardDot"></div></div>
      <div id="curtain" class="layer"></div>
      <div id="gridDark" class="layer"></div>
      <div id="glowDark" class="layer"></div>
${hosts}
      <audio id="sfx" src="assets/audio.wav" data-start="0" data-duration="22" data-track-index="9"></audio>
    </div>
    <script>
      const tl = gsap.timeline({ paused: true });
      tl.fromTo("#grid", { y: 0 }, { y: 120, duration: 22, ease: "none" }, 0);
      tl.fromTo("#glow", { opacity: 0.55 }, { opacity: 1, duration: 4.8, ease: "sine.inOut", yoyo: true, repeat: 1 }, 0);
      // la cortina oscura nace del centro de la tarjeta y toma el fondo; al final se cierra y vuelve la luz
      // tarjeta compartida: aparece como una barra bajo «trabajo.», se expande en el tramo de puestos y se funde bajo la cortina
      tl.fromTo("#cardWrap", { opacity: 0, y: 90 }, { opacity: 1, y: 0, duration: 0.6, ease: "expo.out" }, 3.55);
      tl.fromTo("#cardDot", { scale: 1 }, { scale: 1.35, duration: 0.3, ease: "sine.inOut", yoyo: true, repeat: 3 }, 3.95);
      tl.fromTo("#cardBase", { clipPath: "inset(720px 0px 0px 0px round 48px)" }, { clipPath: "inset(0px 0px 0px 0px round 48px)", duration: 0.75, ease: "expo.inOut" }, 4.55);
      tl.to("#cardDot", { opacity: 0, duration: 0.2 }, 4.62);
      tl.to("#cardWrap", { opacity: 0, duration: 0.2 }, 12.45);
      tl.fromTo("#curtain", { clipPath: "circle(0% at 50% 56%)" }, { clipPath: "circle(150% at 50% 56%)", duration: 0.75, ease: "expo.inOut" }, 11.9);
      tl.fromTo("#gridDark", { opacity: 0 }, { opacity: 0.6, duration: 0.5 }, 12.3);
      tl.fromTo("#glowDark", { opacity: 0 }, { opacity: 1, duration: 0.8 }, 12.3);
      tl.fromTo("#curtain", { clipPath: "circle(150% at 50% 52%)" }, { clipPath: "circle(0% at 50% 52%)", duration: 0.7, ease: "expo.inOut", immediateRender: false }, 19.35);
      tl.to(["#gridDark", "#glowDark"], { opacity: 0, duration: 0.5 }, 19.45);
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
`;
fs.writeFileSync('index.html', index);
console.log('ok');
