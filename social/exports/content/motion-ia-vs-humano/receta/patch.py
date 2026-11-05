p = 'page.template.html'
s = open(p, encoding='utf-8').read()
R = [
    ("(33.33 * eio(seg(T, TM.s3 + 0.2, TM.s3 + 0.75)))", "(33.33 * eio(seg(T, TM.s3 + 0.15, TM.s3 + 0.55)))"),
    ("(100 * eio(seg(T, TM.s3 + 0.85, TM.s3 + 1.45)))", "(100 * eio(seg(T, TM.s3 + 0.6, TM.s3 + 1.05)))"),
    ("const aiDone = T >= TM.s3 + 1.45;", "const aiDone = T >= TM.s3 + 1.05;"),
    ("(T - TM.s3 - 1.45) / 0.3", "(T - TM.s3 - 1.05) / 0.3"),
    ("mid.style.opacity = T >= TM.s3 + 0.7 ? 1 : 0;", "mid.style.opacity = T >= TM.s3 + 0.5 ? 1 : 0;"),
    ("$('c1').style.opacity = seg(T, TM.s3 + 0.75, TM.s3 + 1.0); $('c2').style.opacity = seg(T, TM.s3 + 1.45, TM.s3 + 1.7);", "$('c1').style.opacity = seg(T, TM.s3 + 0.55, TM.s3 + 0.8); $('c2').style.opacity = seg(T, TM.s3 + 1.05, TM.s3 + 1.3);"),
    ("eio(seg(T, TM.s4 + 0.2, TM.s4 + 1.4))", "eio(seg(T, TM.s4 + 0.15, TM.s4 + 0.95))"),
    ("const aiAt = TM.s4 + 0.35;", "const aiAt = TM.s4 + 0.3;"),
    ("eio(seg(T, TM.s5 + 0.2, TM.s5 + 0.85)); const g2 = eio(seg(T, TM.s5 + 0.35, TM.s5 + 1.05))", "eio(seg(T, TM.s5 + 0.15, TM.s5 + 0.7)); const g2 = eio(seg(T, TM.s5 + 0.25, TM.s5 + 0.8))"),
    ("pop(T - (TM.s5 + 1.15)); x2.style.opacity = T >= TM.s5 + 1.15", "pop(T - (TM.s5 + 0.85)); x2.style.opacity = T >= TM.s5 + 0.85"),
    ("eout(seg(T, TM.s6 + 0.1, TM.s6 + 0.6)); $('logo')", "eout(seg(T, TM.s6 + 0.1, TM.s6 + 0.6)); $('logo')"),
    ("eout(seg(T, TM.s6 + 0.35, TM.s6 + 0.85))", "eout(seg(T, TM.s6 + 0.35, TM.s6 + 0.85))"),
    ("(96 * eout(seg(T, TM.s6 + 0.8, TM.s6 + 1.3)))", "(96 * eout(seg(T, TM.s6 + 0.8, TM.s6 + 1.3)))"),
]
for a, b in R:
    assert a in s, a[:60]
    s = s.replace(a, b)
open(p, 'w', encoding='utf-8').write(s)
print('ok')
