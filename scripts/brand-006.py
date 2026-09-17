from pathlib import Path
import sys
import re
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'.tmp/python'))
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen

root=Path(__file__).resolve().parents[1]
if not (root/'public/fonts/newsreader.woff2').exists():
    font=TTFont(root/'public/fonts/newsreader.ttf')
    font.flavor='woff2'
    font.save(root/'public/fonts/newsreader.woff2')

# Deterministic wordmark outlines, no dependency on a visitor's installed fonts.
wordfont=TTFont('C:/Windows/Fonts/arial.ttf')
glyphs=wordfont.getGlyphSet(); cmap=wordfont.getBestCmap()
boldfont=TTFont('C:/Windows/Fonts/arialbd.ttf')
def word(text,x,y,size,spacing,color):
    face=boldfont if text=='ATACAMA' else wordfont
    selected=face.getGlyphSet(); mapping=face.getBestCmap()
    scale=size/face['head'].unitsPerEm
    parts=[]
    for letter in text:
        name=mapping[ord(letter)]; pen=SVGPathPen(selected); selected[name].draw(pen)
        parts.append(f'<path fill="{color}" transform="translate({x:.2f},{y}) scale({scale:.5f},-{scale:.5f})" d="{pen.getCommands()}"/>')
        x+=selected[name].width*scale+spacing
    return ''.join(parts)

# Two stepped summits, nine fine contours tapering toward the outer edges.
def mountain(color):
    contours=[]
    for i in range(9):
        left=5+i*4; bottom=102+i*.4; peak=14+i*9.2
        d=f'M {left} {bottom} C 48 {88+i*2} 83 {44+i*5.5} 104 {48+i*5.5} C 118 {48+i*5.5} 127 {49+i*5.2} 137 {54+i*5} L 180 {peak+3} Q 188 {peak-4} 196 {peak+4} L 228 {57+i*4.7} C 244 {78+i*3.2} 254 {68+i*4.2} 266 {79+i*3.2} L 282 {114+i*.7}'
        contours.append(f'<path d="{d}"/>')
    return f'<g fill="none" stroke="{color}" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round">'+''.join(contours)+'</g>'
for light in [False,True]:
    suffix='-light' if light else ''; ink='#FAF6F0' if light else '#4E2E1E'; copper='#EDE3D6' if light else '#B87656'
    symbol=mountain(copper)
    horizontal=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 150" role="img"><title>Atacama Labs</title><g transform="translate(4,0)">{symbol.replace("stroke-width=\"1.15\"", "stroke-width=\"2.2\"")}</g>{word("ATACAMA",310,80,68,9,ink)}{word("LABS",314,131,36,23,copper)}</svg>'
    (root/f'public/brand/logo-horizontal{suffix}.svg').write_text(horizontal)
    (root/f'public/brand/logo-mark{suffix}.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 288 125"><title>Atacama Labs</title>{symbol}</svg>')
    stacked=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 490 310"><title>Atacama Labs</title><g transform="translate(52,0) scale(1.35)">{symbol}</g>{word("ATACAMA",28,220,62,9,ink)}{word("LABS",125,283,44,18,copper)}</svg>'
    (root/f'public/brand/logo-stacked{suffix}.svg').write_text(stacked)
# Small icon uses the same summit geometry with fewer contours for legibility.
small=''.join(re.findall(r'<path d="[^"]+"/>',mountain('#FAF6F0'))[::3])
icon=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#4E2E1E"/><g transform="translate(2,9) scale(.097)" fill="none" stroke="#FAF6F0" stroke-width="6" stroke-linejoin="round">{small}</g></svg>'
(root/'public/brand/favicon.svg').write_text(icon)
(root/'src/app/icon.svg').write_text(icon)
