import sys, re
from lxml import etree
from svgelements import Path, Matrix
SVG='{http://www.w3.org/2000/svg}'
src=sys.argv[1]
root=etree.parse(src).getroot()
main=root[0]
cells=[]
for c in main:
    if c.tag==SVG+'rect' and c.get('stroke')=='#333344':
        x,y,w,h=[float(c.get(k)) for k in ('x','y','width','height')]
        cells.append((x,y,w,h))
    if c.tag==SVG+'path' and c.get('stroke')=='#333344':
        p=Path(c.get('d')); print('cellpath', p.bbox())
cells.sort(key=lambda r:(round(r[1]),r[0]))
for i,c in enumerate(cells): print('cell',i,[round(v) for v in c])
def bbox(e):
    boxes=[]
    for el in e.iter():
        if el.tag==SVG+'path' and el.get('d'):
            try:
                b=Path(el.get('d')).bbox()
                if b: boxes.append(b)
            except Exception as ex: pass
        if el.tag==SVG+'circle':
            cx,cy,r=float(el.get('cx')),float(el.get('cy')),float(el.get('r')); boxes.append((cx-r,cy-r,cx+r,cy+r))
    if not boxes: return None
    return (min(b[0] for b in boxes),min(b[1] for b in boxes),max(b[2] for b in boxes),max(b[3] for b in boxes))
for i,c in enumerate(main):
    tag=c.tag.replace(SVG,'') if isinstance(c.tag,str) else '?'
    if tag in('path','g','use','circle','mask'):
        fill=c.get('fill') or (c[0].get('fill') if len(c) else None)
        b=bbox(c)
        if b and b[1]>1350: print(i,tag,fill,c.get('clip-path') or c.get('filter') or '', [round(v) for v in b])
