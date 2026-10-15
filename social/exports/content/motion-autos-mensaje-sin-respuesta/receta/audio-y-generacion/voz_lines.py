import json, subprocess, sys, shutil, re, urllib.request
from concurrent.futures import ThreadPoolExecutor
VOICES = {'marisol': '75e72cd5-011b-4130-a474-e8b1ab341f04', 'andre': 'f1e8226e-2248-4d5f-b43c-0a79e9949dbf'}
LINES = [
    'Pagaste el anuncio. El cliente escribió.',
    '... pero nadie contestó.',
    'Tu competencia no vende mejores autos. ¡Contesta!',
    'Con un agente de Atacama Labs, tu WhatsApp responde a cualquier hora, manda las fotos y agenda la visita.',
    'Tus asesores hablan solo con quien quiere comprar.',
    'Y todo queda en tu CRM.',
    'Atacama Labs. Agentes que trabajan.',
]
who = sys.argv[1]
def one(i):
    dlg = [{'text': LINES[i], 'voice_id': VOICES[who], 'voice_type': 'preset'}]
    args = [shutil.which('higgsfield'), 'generate', 'create', 'elevenlabs_v4', '--dialogue', json.dumps(dlg, ensure_ascii=False), '--stability', '0.35', '--similarity_boost', '0.8', '--wait', '--json']
    r = subprocess.run(args, capture_output=True, text=True, encoding='utf-8')
    out = (r.stdout or '') + (r.stderr or '')
    open('img/L%d-%s.json' % (i + 1, who), 'w', encoding='utf-8').write(out)
    urls = [u for u in re.findall(r'https?://[^"\s\\]+', out) if '/user_' in u and u.endswith('.mp3')]
    if urls:
        urllib.request.urlretrieve(urls[0], 'img/L%d-%s.mp3' % (i + 1, who)); return 'ok L%d' % (i + 1)
    return 'FALLO L%d %s' % (i + 1, out[-200:])
with ThreadPoolExecutor(4) as ex:
    for res in ex.map(one, range(len(LINES))): print(res)
