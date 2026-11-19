"""Turn raw icons (extracted from IMI infographic SVG) into clean 64x64 currentColor icons."""
import sys, re, copy, os
from lxml import etree
from svgelements import Path
SVG='{http://www.w3.org/2000/svg}'; XL='{http://www.w3.org/1999/xlink}'
raw, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
OPACITY={'#8B8B8B':1,'#F6C421':0.9,'#1675BC':0.42,'#F9F9F9':1,'#428BC1':0.55,'#ED4C5C':0.3}
KNOCK={'#14141A','black','#000000'}
BGSTROKE={'#15131A','#0D0D14'}
def bbox(el, byid):
    bs=[]
    for e in el.iter():
        if not isinstance(e.tag,str): continue
        if e.tag==SVG+'path' and e.get('d') and not (e.get('stroke') in BGSTROKE and e.get('mask')):
            if e.getparent() is not None and e.getparent().tag in (SVG+'clipPath',SVG+'mask',SVG+'defs'): continue
            b=Path(e.get('d')).bbox(); bs.append(b)
        elif e.tag==SVG+'circle':
            cx,cy,r=[float(e.get(k)) for k in('cx','cy','r')]; bs.append((cx-r,cy-r,cx+r,cy+r))
        elif e.tag==SVG+'use' and e.getparent().tag!=SVG+'mask':
            t=byid[e.get('href')[1:]]; bs.append(Path(t.get('d')).bbox())
    return (min(b[0] for b in bs),min(b[1] for b in bs),max(b[2] for b in bs),max(b[3] for b in bs))
for fn in sorted(os.listdir(raw)):
    name=fn[:-4]
    root=etree.parse(os.path.join(raw,fn)).getroot()
    # normalise hrefs
    for e in root.iter():
        if isinstance(e.tag,str) and e.get(XL+'href'):
            e.set('href', e.get(XL+'href')); del e.attrib[XL+'href']
    # drop figma inner-stroke artefacts + their masks
    for e in list(root.iter(SVG+'path')):
        if e.get('stroke') in BGSTROKE and e.get('mask'):
            mid=re.search(r'#([^)]+)',e.get('mask')).group(1)
            e.getparent().remove(e)
            for m in root.iter(SVG+'mask'):
                if m.get('id')==mid: m.getparent().remove(m); break
    for e in root.iter(SVG+'path'):
        if e.get('stroke') in BGSTROKE:
            for a in ('stroke','stroke-width'): e.attrib.pop(a,None)
    byid={e.get('id'):e for e in root.iter() if isinstance(e.tag,str) and e.get('id')}
    # prefix ids
    pre=name+'-'
    for e in root.iter():
        if not isinstance(e.tag,str): continue
        if e.get('id'): e.set('id', pre+e.get('id'))
        for k,v in list(e.attrib.items()):
            if 'url(#' in v: e.set(k, v.replace('url(#','url(#'+pre))
            if k=='href' and v.startswith('#'): e.set(k,'#'+pre+v[1:])
    byid={e.get('id'):e for e in root.iter() if isinstance(e.tag,str) and e.get('id')}
    defs=root.find(SVG+'defs')
    if defs is None: defs=etree.Element(SVG+'defs'); root.insert(0,defs)
    body=[c for c in root if c is not defs]
    x0,y0,x1,y1=bbox(root,byid)
    # knockouts: elements filled with bg colour -> mask over everything drawn before them
    knock=[e for e in root.iter() if isinstance(e.tag,str) and e.get('fill') in KNOCK]
    # recolour
    for e in root.iter():
        if not isinstance(e.tag,str) or e in knock: continue
        f=e.get('fill')
        if f in OPACITY:
            e.set('fill','currentColor')
            if OPACITY[f]!=1: e.set('fill-opacity',str(OPACITY[f]))
        elif f and f not in ('none','white') and not f.startswith('url'):
            print('WARN', name, 'fill', f)
        s=e.get('stroke')
        if s in OPACITY: e.set('stroke','currentColor')
    g=etree.Element(SVG+'g')
    if knock:
        mid=pre+'knockout'
        m=etree.SubElement(defs,SVG+'mask',id=mid,maskUnits='userSpaceOnUse',x=str(x0-10),y=str(y0-10),width=str(x1-x0+20),height=str(y1-y0+20))
        etree.SubElement(m,SVG+'rect',x=str(x0-10),y=str(y0-10),width=str(x1-x0+20),height=str(y1-y0+20),fill='white')
        for k in knock:
            kk=copy.deepcopy(k); kk.set('fill','black'); m.append(kk)
            k.getparent().remove(k)
        inner=etree.SubElement(g,SVG+'g',mask=f'url(#{mid})')
        target=inner
    else: target=g
    for c in body: target.append(c)
    S,PAD=64,4
    w,h=x1-x0,y1-y0; sc=(S-2*PAD)/max(w,h)
    tx=(S-w*sc)/2 - x0*sc; ty=(S-h*sc)/2 - y0*sc
    g.set('transform',f'matrix({sc:.5f} 0 0 {sc:.5f} {tx:.3f} {ty:.3f})')
    svg=etree.Element(SVG+'svg',nsmap={None:'http://www.w3.org/2000/svg'})
    svg.set('viewBox','0 0 64 64'); svg.set('fill','none')
    if len(defs): svg.append(defs)
    svg.append(g)
    xml=etree.tostring(svg).decode()
    xml=re.sub(r'(\d+\.\d{3})\d+', r'\1', xml)  # trim precision
    open(os.path.join(out,fn),'w').write(xml)
    print(name, len(xml), 'knock' if knock else '')
