import fs from 'node:fs';
let s = fs.readFileSync('.build.mjs', 'utf8');
let bad = 0;
const rep = (a, b) => { if (!s.includes(a)) { console.log('NO ESTÁ:', a.slice(0, 80)); bad++; return; } s = s.replace(a, () => b); };

// 1) la tarjeta pasa a la raíz (se crea al final de S1 y se expande al comenzar S2); en S2 solo queda como contenedor de las viñetas
rep("  .replace(/\\/\\* fondo permanente[\\s\\S]*?#glowDark \\{[^}]*\\}\\s*/, '');", `  .replace(/\\/\\* fondo permanente[\\s\\S]*?#glowDark \\{[^}]*\\}\\s*/, '')
  .replace(/#card \\{[^}]*\\}/, '#card { position: absolute; left: 96px; top: 640px; width: 888px; height: 860px; border-radius: 48px; overflow: hidden; }')
  .replace(/#strike \\{[^}]*\\}/, '#strike { position: absolute; left: 96px; top: 868px; width: 560px; height: 10px; background: var(--blue-on-dark); transform-origin: left center; border-radius: 5px; }')
  .replace(/#close-logo \\{[^}]*\\}/, '#close-logo { position: absolute; left: 150px; top: 640px; width: 780px; }')
  .replace(/#tag \\{/, '#ask { position: absolute; left: 0; width: 1080px; top: 1090px; text-align: center; font-size: 54px; font-weight: 400; color: rgba(4,18,40,.78); white-space: nowrap; }\\n        #tag {')
  .replace(/top: 1010px; text-align: center; font-size: 104px/, 'top: 880px; text-align: center; font-size: 104px')
  .replace(/top: 1190px; text-align: center; font-size: 46px/, 'top: 1230px; text-align: center; font-size: 46px');`);
// S5: pregunta de venta
rep("const B = 0.6;\n", "const B = 0.6;\nsecs.s5 = secs.s5.replace('<div id=\"url\">', '<div id=\"ask\">¿Qué puesto necesitas cubrir?</div>\\n        <div id=\"url\">');\n");
rep("tl.fromTo(\"#url\", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.5, ease: \"power3.out\" }, A(17.95));", "tl.fromTo(\"#ask\", { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.55, ease: \"expo.out\" }, A(17.8));\n    tl.fromTo(\"#url\", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.5, ease: \"power3.out\" }, A(18.2));");
// S2: la tarjeta ya no se anima aquí
rep("    tl.fromTo(\"#card\", { opacity: 0, y: 160, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: \"expo.out\" }, A(R0 - 0.1));\n", "");
rep("tl.to([\"#card\", \"#pager\", \"#pagerLab\"", "tl.to([\"#pager\", \"#pagerLab\"");
// raíz: tarjeta compartida + centro de la cortina en el centro de la tarjeta
rep("      .layer { position: absolute; inset: 0; }\n", "      .layer { position: absolute; inset: 0; }\n      #cardWrap { position: absolute; left: 96px; top: 640px; width: 888px; height: 860px; filter: drop-shadow(0 26px 34px rgba(4, 18, 40, 0.08)); opacity: 0; }\n      #cardBase { position: absolute; inset: 0; background: #ffffff; border-radius: 48px; clip-path: inset(720px 0px 0px 0px round 48px); }\n      #cardDot { position: absolute; left: 64px; top: 754px; width: 44px; height: 44px; border-radius: 22px; background: var(--blue); }\n");
rep("      <div id=\"glowDark\" class=\"layer\"></div>\n", "      <div id=\"glowDark\" class=\"layer\"></div>\n      <div id=\"cardWrap\"><div id=\"cardBase\"></div><div id=\"cardDot\"></div></div>\n");
s = s.split('circle(0% at 50% 66%)').join('circle(0% at 50% 56%)').split('circle(150% at 50% 66%)').join('circle(150% at 50% 56%)');
rep("      tl.fromTo(\"#curtain\", { clipPath: \"circle(0% at 50% 56%)\" }", "      // tarjeta compartida: aparece como una barra bajo «trabajo.», se expande en el tramo de puestos y se funde bajo la cortina\n      tl.fromTo(\"#cardWrap\", { opacity: 0, y: 90 }, { opacity: 1, y: 0, duration: 0.6, ease: \"expo.out\" }, 3.55);\n      tl.fromTo(\"#cardDot\", { scale: 1 }, { scale: 1.35, duration: 0.3, ease: \"sine.inOut\", yoyo: true, repeat: 3 }, 3.95);\n      tl.fromTo(\"#cardBase\", { clipPath: \"inset(720px 0px 0px 0px round 48px)\" }, { clipPath: \"inset(0px 0px 0px 0px round 48px)\", duration: 0.75, ease: \"expo.inOut\" }, 4.55);\n      tl.to(\"#cardDot\", { opacity: 0, duration: 0.2 }, 4.62);\n      tl.to(\"#cardWrap\", { opacity: 0, duration: 0.3, ease: \"power2.in\" }, 9.25);\n      tl.fromTo(\"#curtain\", { clipPath: \"circle(0% at 50% 56%)\" }");
fs.writeFileSync('.build.mjs', s);
console.log(bad ? 'CON ERRORES' : 'ok');
