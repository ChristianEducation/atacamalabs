import json, subprocess, sys
VOICES = {'marisol': '75e72cd5-011b-4130-a474-e8b1ab341f04', 'andre': 'f1e8226e-2248-4d5f-b43c-0a79e9949dbf', 'ines': '023ebf5e-1970-40d8-825c-a5ef6a1dd4ff'}
LINES = [
    'Son las once de la noche. Un cliente quiere agendar. Ahora.',
    'Sin agente, el teléfono suena y nadie contesta. Con agente, tres toques y listo.',
    'Amanece. Uno perdió al cliente. El otro ya lo tiene agendado.',
    'Si agendas por WhatsApp, esto es para ti.',
]
mode = sys.argv[1]  # cost | create
who = sys.argv[2]
dlg = [{'text': t, 'voice_id': VOICES[who], 'voice_type': 'preset'} for t in LINES]
import shutil
args = [shutil.which('higgsfield'), 'generate', 'cost' if mode == 'cost' else 'create', 'elevenlabs_v4', '--dialogue', json.dumps(dlg, ensure_ascii=False)]
if mode == 'create': args += ['--wait', '--json']
r = subprocess.run(args, capture_output=True, text=True, encoding='utf-8')
print(r.stdout[-1500:], r.stderr[-600:])
if mode == 'create': open('voz-%s.json' % who, 'w', encoding='utf-8').write(r.stdout)
