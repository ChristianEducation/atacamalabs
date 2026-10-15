import fs from 'node:fs';
let s = fs.readFileSync('.build.mjs', 'utf8');
let bad = 0;
const rep = (a, b, all) => { if (!s.includes(a)) { console.log('NO ESTÁ:', a.slice(0, 90)); bad++; return; } s = all ? s.split(a).join(b) : s.replace(a, () => b); };

// S2: la última viñeta llega antes y todo el tramo se mantiene un poco más (la cortina se retrasa 0,4 s)
rep('pop("#v4r1", R0 + 3 * RD + 0.15); pop("#v4r2", R0 + 3 * RD + 0.35); pop("#v4r3", R0 + 3 * RD + 0.55); pop("#v4p", R0 + 3 * RD + 0.85);', 'pop("#v4r1", R0 + 3 * RD + 0.1); pop("#v4r2", R0 + 3 * RD + 0.25); pop("#v4r3", R0 + 3 * RD + 0.4); pop("#v4p", R0 + 3 * RD + 0.6);');
rep('{ opacity: 0, duration: 0.25, ease: "power2.in" }, A(9.2));', '{ opacity: 0, duration: 0.25, ease: "power2.in" }, A(9.6));');
// S3–S5 se desplazan +0,4 s (los tiempos escritos siguen siendo los mismos: cambia el inicio de cada anfitrión)
rep("['s2', 4.7, 5.3, 2], ['s3', 9.5, 5.3, 3], ['s4', 14.4, 2.8, 4], ['s5', 16.7, 2.5, 5],", "['s2', 4.7, 5.5, 2], ['s3', 9.9, 5.3, 3], ['s4', 14.8, 2.8, 4], ['s5', 17.1, 2.5, 5],");
rep('data-duration="19.2" data-width="1080" data-height="1920" data-fps="30"', 'data-duration="19.6" data-width="1080" data-height="1920" data-fps="30"');
rep('data-start="0" data-duration="19.2" data-track-index="9"', 'data-start="0" data-duration="19.6" data-track-index="9"');
rep('duration: 19.2, ease: "none" }, 0);', 'duration: 19.6, ease: "none" }, 0);');
// raíz: cortina por ENCIMA de la tarjeta; tiempos +0,4
rep('      <div id="curtain" class="layer"></div>\n      <div id="gridDark" class="layer"></div>\n      <div id="glowDark" class="layer"></div>\n      <div id="cardWrap"><div id="cardBase"></div><div id="cardDot"></div></div>\n', '      <div id="cardWrap"><div id="cardBase"></div><div id="cardDot"></div></div>\n      <div id="curtain" class="layer"></div>\n      <div id="gridDark" class="layer"></div>\n      <div id="glowDark" class="layer"></div>\n');
rep('tl.to("#cardWrap", { opacity: 0, duration: 0.3, ease: "power2.in" }, 9.25);', 'tl.to("#cardWrap", { opacity: 0, duration: 0.2 }, 10.05);');
rep('{ clipPath: "circle(150% at 50% 56%)", duration: 0.75, ease: "expo.inOut" }, 9.1);', '{ clipPath: "circle(150% at 50% 56%)", duration: 0.75, ease: "expo.inOut" }, 9.5);');
rep('{ opacity: 0, duration: 0.5 }, 9.5);\n      tl.fromTo("#glowDark"', '{ opacity: 0, duration: 0.5 }, 9.5);\n      tl.fromTo("#glowDark"');
rep('tl.fromTo("#gridDark", { opacity: 0 }, { opacity: 0.6, duration: 0.5 }, 9.5);', 'tl.fromTo("#gridDark", { opacity: 0 }, { opacity: 0.6, duration: 0.5 }, 9.9);');
rep('tl.fromTo("#glowDark", { opacity: 0 }, { opacity: 1, duration: 0.8 }, 9.5);', 'tl.fromTo("#glowDark", { opacity: 0 }, { opacity: 1, duration: 0.8 }, 9.9);');
rep('ease: "expo.inOut", immediateRender: false }, 16.55);', 'ease: "expo.inOut", immediateRender: false }, 16.95);');
rep('tl.to(["#gridDark", "#glowDark"], { opacity: 0, duration: 0.5 }, 16.65);', 'tl.to(["#gridDark", "#glowDark"], { opacity: 0, duration: 0.5 }, 17.05);');
fs.writeFileSync('.build.mjs', s);

// audio: eventos posteriores a la cortina +0,4 s y duración 19,6 s
let a = fs.readFileSync('audio/build_audio.py', 'utf8');
a = a.replace('DUR = 19.2', 'DUR = 19.6\nD = 0.4  # desplazamiento de los tramos S3–S5');
a = a.replace('for t in [5.15, 5.45, 5.62, 5.85, 6.4, 6.58, 6.76, 7.05, 7.5, 7.7, 7.85, 8.0, 8.25, 8.75, 8.95, 9.15, 9.45]:', 'for t in [5.15, 5.45, 5.62, 5.85, 6.4, 6.58, 6.76, 7.05, 7.5, 7.7, 7.85, 8.0, 8.25, 8.7, 8.85, 9.0, 9.2]:');
a = a.replace('add(whoosh(0.9, bright=0.5), 8.95, 0.34); add(thock(0.5), 9.3, 0.5)', 'add(whoosh(0.9, bright=0.5), 9.35, 0.34); add(thock(0.5), 9.7, 0.5)');
a = a.replace('for t, f in [(10.2, A4), (10.8, CS5), (11.4, E5), (12.0, A5)]:\n    add(chime(f, 1.3), t, 0.36)\n    add(tap(900, 0.06), t + 0.18, 0.14)', 'for t, f in [(10.2 + D, A4), (10.8 + D, CS5), (11.4 + D, E5), (12.0 + D, A5)]:\n    add(chime(f, 1.3), t, 0.36)\n    add(tap(900, 0.06), t + 0.18, 0.14)');
a = a.replace('pad([A4 / 2, E5 / 2, CS5], 12.8, 1.9, 0.07)\nadd(whoosh(0.45), 12.8, 0.18)', 'pad([A4 / 2, E5 / 2, CS5], 12.8 + D, 1.9, 0.07)\nadd(whoosh(0.45), 12.8 + D, 0.18)');
a = a.replace('add(tap(520), 14.5, 0.5); add(tap(470), 14.7, 0.5)\nadd(zip_(), 15.25, 0.36)\nadd(thock(), 15.6, 0.5); add(chime(E5, 1.0), 15.6, 0.22)\nadd(thock(), 15.9, 0.5); add(chime(A5, 1.1), 15.9, 0.24)\nadd(whoosh(0.7, bright=0.5), 16.45, 0.34)', 'add(tap(520), 14.5 + D, 0.5); add(tap(470), 14.7 + D, 0.5)\nadd(zip_(), 15.25 + D, 0.36)\nadd(thock(), 15.6 + D, 0.5); add(chime(E5, 1.0), 15.6 + D, 0.22)\nadd(thock(), 15.9 + D, 0.5); add(chime(A5, 1.1), 15.9 + D, 0.24)\nadd(whoosh(0.7, bright=0.5), 16.45 + D, 0.34)');
a = a.replace('pad([A4 / 2, E5 / 2, CS5, A5 / 2], 16.9, 2.3, 0.1)\nadd(chime(A5, 1.6), 17.15, 0.34); add(chime(E5, 1.6), 17.25, 0.22)\nadd(tap(760), 17.55, 0.4)\nadd(chime(CS5 * 2, 1.2), 17.95, 0.2)', 'pad([A4 / 2, E5 / 2, CS5, A5 / 2], 16.9 + D, 2.3, 0.1)\nadd(chime(A5, 1.6), 17.15 + D, 0.34); add(chime(E5, 1.6), 17.25 + D, 0.22)\nadd(tap(760), 17.55 + D, 0.4); add(tap(700), 17.8 + D, 0.3)\nadd(chime(CS5 * 2, 1.2), 18.2 + D, 0.2)');
fs.writeFileSync('audio/build_audio.py', a);
console.log(bad ? 'CON ERRORES' : 'ok');
