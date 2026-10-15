import fs from 'node:fs';
let s = fs.readFileSync('.build.mjs', 'utf8');
let bad = 0;
const rep = (a, b) => { if (!s.includes(a)) { console.log('NO ESTÁ:', a.slice(0, 90)); bad++; return; } s = s.replace(a, () => b); };

// 1) puestos: 1,8 s cada uno (3 pulsos de 0,6 s) en vez de 1,2 s; las viñetas se construyen más despacio (K = 1,5)
rep('const R0 = 5.0, RD = 1.2;', 'const R0 = 5.0, RD = 1.8, K = RD / 1.2;');
const lines = s.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (/^\s+pop\("#v|^\s+tl\.fromTo\("#v3d"/.test(lines[i])) {
    lines[i] = lines[i].replace(/(R0(?: \+ (?:\d \* )?RD)?) \+ (\d\.\d+)/g, '$1 + $2 * K');
  }
}
s = lines.join('\n');
// salida del tramo de puestos (antes 9.4) -> +2.4 s
rep('opacity: 0, duration: 0.25, ease: "power2.in" }, A(9.4));', 'opacity: 0, duration: 0.25, ease: "power2.in" }, A(11.8));');

// 2) anfitriones y raíz: todo lo posterior a los puestos se corre 2,4 s
rep("['s2', 4.7, 5.5, 2], ['s3', 9.9, 5.3, 3], ['s4', 14.8, 2.8, 4], ['s5', 17.1, 2.5, 5],", "['s2', 4.7, 7.9, 2], ['s3', 12.3, 5.3, 3], ['s4', 17.2, 2.8, 4], ['s5', 19.5, 2.5, 5],");
s = s.split('data-duration="19.6"').join('data-duration="22"');
rep('duration: 19.6, ease: "none" }, 0);', 'duration: 22, ease: "none" }, 0);');
rep('tl.to("#cardWrap", { opacity: 0, duration: 0.2 }, 10.05);', 'tl.to("#cardWrap", { opacity: 0, duration: 0.2 }, 12.45);');
rep('duration: 0.75, ease: "expo.inOut" }, 9.5);', 'duration: 0.75, ease: "expo.inOut" }, 11.9);');
rep('{ opacity: 0.6, duration: 0.5 }, 9.9);', '{ opacity: 0.6, duration: 0.5 }, 12.3);');
rep('{ opacity: 1, duration: 0.8 }, 9.9);', '{ opacity: 1, duration: 0.8 }, 12.3);');
rep('immediateRender: false }, 16.95);', 'immediateRender: false }, 19.35);');
rep('{ opacity: 0, duration: 0.5 }, 17.05);', '{ opacity: 0, duration: 0.5 }, 19.45);');
fs.writeFileSync('.build.mjs', s);
console.log(bad ? 'CON ERRORES' : 'ok');
