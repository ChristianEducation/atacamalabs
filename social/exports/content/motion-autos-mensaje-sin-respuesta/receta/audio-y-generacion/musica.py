import subprocess, shutil, re, urllib.request, sys
prompt = ('Instrumental underscore for a 25-second modern tech brand reel, no vocals. First 5 seconds: dark and tense, a low sustained synth drone with a slow heartbeat-like sub pulse and sparse metallic ticks, a sense of silence and unease. '
          'At about 5 seconds a short riser and impact opens the track into a confident, warm, optimistic electronic groove: clean plucked synth and soft piano, a light steady kick and finger-snap percussion, medium tempo around 100 bpm, professional, clean and polished, leaves space for a voiceover, ends with a clear final chord.')
r = subprocess.run([shutil.which('higgsfield'), 'generate', 'create', 'sonilo_music', '--prompt', prompt, '--duration', '26', '--wait', '--json'], capture_output=True, text=True, encoding='utf-8')
out = (r.stdout or '') + (r.stderr or '')
open('img/musica.json', 'w', encoding='utf-8').write(out)
urls = [u for u in re.findall(r'https?://[^"\s\\]+', out) if '/user_' in u and re.search(r'\.(mp3|wav|m4a)$', u)]
print(urls[:2])
if urls: urllib.request.urlretrieve(urls[0], 'img/musica.' + urls[0].rsplit('.', 1)[1]); print('ok')
else: print(out[-600:])
