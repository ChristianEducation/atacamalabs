import sys, subprocess, shutil, json, re, urllib.request, os
# uso: python hf_gen.py <salida.png> <aspect_ratio> <archivo_prompt>
out, aspect, pf = sys.argv[1], sys.argv[2], sys.argv[3]
prompt = open(pf, encoding='utf-8').read().strip()
hf = shutil.which('higgsfield')
cmd = [hf, 'generate', 'create', 'gpt_image_2_5', '--prompt', prompt, '--aspect_ratio', aspect, '--resolution', '2k', '--quality', 'high', '--wait', '--json']
r = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8')
txt = (r.stdout or '') + (r.stderr or '')
open(out + '.json', 'w', encoding='utf-8').write(txt)
urls = re.findall(r'https?://[^"\s\\]+\.(?:png|jpg|jpeg|webp)[^"\s\\]*', txt)
if not urls:
    urls = re.findall(r'https?://[^"\s\\]+', txt)
print('rc', r.returncode, 'urls', len(urls))
if urls:
    u = [x for x in urls if '_min' not in x][0] if any('_min' not in x for x in urls) else urls[0]
    urllib.request.urlretrieve(u, out)
    print('ok', out, os.path.getsize(out))
else:
    print(txt[:800])
