p = 'index.html'
s = open(p, encoding='utf8').read()


def rep(a, b):
    global s
    if a not in s:
        print('NO ESTÁ:', a[:90])
        return
    s = s.replace(a, b, 1)


# logo y rótulo de la intro quedan DENTRO del visor, sin tocar las esquinas
rep('.plogo { position: absolute; left: 84px; top: 80px;', '.plogo { position: absolute; left: 136px; top: 130px;')
rep('#ihud { position: absolute; right: 84px; top: 84px;', '#ihud { position: absolute; right: 136px; top: 130px;')
rep('#iq { position: absolute; left: 84px;', '#iq { position: absolute; left: 112px;')
# el cierre: las esquinas enmarcan logo + lema + dirección (y 770 a 1180) con aire alrededor
rep('<i class="br tl eb" style="top: 780px; left: 110px"></i><i class="br tr eb" style="top: 780px; right: 110px"></i>',
    '<i class="br tl eb" style="top: 770px; left: 96px"></i><i class="br tr eb" style="top: 770px; right: 96px"></i>')
rep('<i class="br bl eb" style="top: auto; bottom: 1020px; left: 110px"></i><i class="br bb eb" style="top: auto; bottom: 1020px; right: 110px"></i>',
    '<i class="br bl eb" style="top: 1110px; bottom: auto; left: 96px"></i><i class="br bb eb" style="top: 1110px; bottom: auto; right: 96px"></i>')
open(p, 'w', encoding='utf8').write(s)
print('ok')
