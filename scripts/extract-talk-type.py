"""Extract the user's Illustrator sheet without redrawing any outlines.
Run with Python + fontTools. The original SVG remains untouched.
"""
from pathlib import Path
import math
import re
import unicodedata
import xml.etree.ElementTree as ET
from fontTools.svgLib.path import parse_path
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen
from fontTools.misc.transform import Transform

root = Path(__file__).resolve().parents[1]
source = next(p for p in root.glob('*.svg') if unicodedata.normalize('NFC', p.name) == '탭투톡체.svg')
sheet = ET.parse(source).getroot()
out = root / 'public/assets/glyphs/talk-type'
out.mkdir(parents=True, exist_ok=True)
ET.register_namespace('', 'http://www.w3.org/2000/svg')
cols = [-669.6, -527.9, -386.2, -244.6, -102.9, 39]
ys = [-1248, -1056, -850, -637, -436, -240]
labels = [['ㄱ','ㄴ','ㄷ','ㄹ','ㅁ','ㅂ'], ['ㅅ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ'], ['ㅍ','ㅎ','ㅱ','△'],
          ['ㆁ','ㆆ','ㆀ','ㅍ-stem-one','ㅍ-stem-three'], ['ㅣ','ㅡ','ㆍ','★',',','♥'], ['╱','╲','!','?']]
groups = {v: [] for row in labels for v in row}
boxes = {v: [] for v in groups}
for node in sheet.iter():
    tag = node.tag.split('}')[-1]
    if tag not in ('path','rect','circle','polygon') or '#080000' not in node.get('style',''):
        continue
    if tag == 'path': d = node.get('d')
    elif tag == 'rect':
        x,y,w,h = [float(node.get(k,'0')) for k in ('x','y','width','height')]
        d = f'M{x} {y}h{w}v{h}h{-w}Z'
    elif tag == 'circle':
        x,y,r = [float(node.get(k,'0')) for k in ('cx','cy','r')]
        d = f'M{x-r} {y}a{r} {r} 0 1 0 {2*r} 0a{r} {r} 0 1 0 {-2*r} 0'
    else:
        points = re.findall(r'-?\d+(?:\.\d+)?',node.get('points'))
        d = 'M'+' '.join(points)+'Z'
    matrix = Transform()
    for op,args in re.findall(r'(\w+)\(([^)]+)\)',node.get('transform','')):
        a=[float(n) for n in re.findall(r'-?\d+(?:\.\d+)?',args)]
        if op=='translate': matrix=matrix.translate(a[0],a[1] if len(a)>1 else 0)
        elif op=='rotate': matrix=matrix.rotate(math.radians(a[0]))
        else: raise ValueError(op)
    pen=BoundsPen(None);parse_path(d,TransformPen(pen,matrix))
    b=pen.bounds;cx=(b[0]+b[2])/2;cy=(b[1]+b[3])/2
    row=min(range(len(ys)),key=lambda i:abs(ys[i]-cy))
    col=min(range(len(cols)),key=lambda i:abs(cols[i]-cx))
    assert abs(cols[col]-cx)<60 and abs(ys[row]-cy)<70, (tag,b)
    label=labels[row][col];groups[label].append(node);boxes[label].append(b)

entries=[]
for label,nodes in groups.items():
    assert nodes,label
    b=boxes[label];cx=(min(v[0] for v in b)+max(v[2] for v in b))/2;cy=(min(v[1] for v in b)+max(v[3] for v in b))/2
    name='u'+format(ord(label[0]),'04x')+label[1:]+'.svg'
    # Shared 100-unit square: original relative sizes, geometric center at 50,50.
    svg=ET.Element('{http://www.w3.org/2000/svg}svg',{'viewBox':'0 0 100 100'})
    g=ET.SubElement(svg,'g',{'transform':f'translate({50-cx:.8f} {50-cy:.8f})'})
    for node in nodes:g.append(node)
    (out/name).write_text(ET.tostring(svg,encoding='unicode')+'\n')
    ET.parse(out/name)  # Fail immediately on malformed SVG namespaces.
    entries.append((label,name))
entries.append(('○','u3147.svg'))
text='/** Extracted from the user’s 탭투톡체.svg; square viewBoxes rotate around the artwork center. */\n'
text+='export const GLYPH_ASSETS: Readonly<Record<string, { url: string }>> = {\n'
for label,name in entries:text+=f'  "{label}": {{ url: "/assets/glyphs/talk-type/{name}" }},\n'
text+='};\n'
(root/'src/config/glyphAssets.ts').write_text(text)
print(f'Extracted {len(groups)} original shapes; ○ aliases ㅇ.')
