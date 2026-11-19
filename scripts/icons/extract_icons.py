import sys, re, copy, json
from lxml import etree
from svgelements import Path
SVG='{http://www.w3.org/2000/svg}'; XL='{http://www.w3.org/1999/xlink}'
src, outdir = sys.argv[1], sys.argv[2]
tree=etree.parse(src); root=tree.getroot(); main=root[0]
defs=root.find(SVG+'defs')
byid={}
for el in root.iter():
    if isinstance(el.tag,str) and el.get('id'): byid[el.get('id')]=el
# icon id -> list of child indices of main
ICONS={
 'killings':[96],
 'missing':[85,86],
 'kidnapping':[84],
 'injuries':[81,82,83],
 'assassination-attempts':[95],
 'tv-tower-strikes':[80],
 'strikes-on-journalists':[79],
 'newsroom-damage':[97],
 'broadcast-takeover':[68,63,64,69,70,71,72,73,74,75,76,77],
 'threats':[57],
 'cybercrimes':[58,59,60,61],
 'media-closures':[78],
 'internet-blocking':[62],
 'legal-pressure':[65,66,67],
}
kids=list(main)
def refs(el):
    out=set()
    for e in el.iter():
        if not isinstance(e.tag,str): continue
        for k,v in e.attrib.items():
            for m in re.findall(r'url\(#([^)]+)\)',v): out.add(m)
            if k in (XL+'href','href') and v.startswith('#'): out.add(v[1:])
    return out
def bbox_of(els):
    bs=[]
    for el in els:
        for e in el.iter():
            if not isinstance(e.tag,str): continue
            if e.tag==SVG+'path' and e.get('d'):
                b=Path(e.get('d')).bbox(); 
                if b: bs.append(b)
            elif e.tag==SVG+'circle':
                cx,cy,r=[float(e.get(k)) for k in('cx','cy','r')]; bs.append((cx-r,cy-r,cx+r,cy+r))
            elif e.tag==SVG+'use':
                t=byid[e.get(XL+'href')[1:]]
                b=Path(t.get('d')).bbox(); bs.append(b)
    return (min(b[0] for b in bs),min(b[1] for b in bs),max(b[2] for b in bs),max(b[3] for b in bs))
meta={}
for name, idx in ICONS.items():
    els=[kids[i] for i in idx]
    # skip clip-path of whole g (clip rects are just bounds) -> keep, include defs
    need=set()
    for el in els: need|=refs(el)
    # transitive
    stack=list(need)
    while stack:
        i=stack.pop()
        for r in refs(byid[i]):
            if r not in need: need.add(r); stack.append(r)
    x0,y0,x1,y1=bbox_of(els)
    w,h=x1-x0,y1-y0; s=max(w,h); pad=s*0.04; s+=2*pad
    cx,cy=(x0+x1)/2,(y0+y1)/2
    vb=(cx-s/2, cy-s/2, s, s)
    out=etree.Element(SVG+'svg', nsmap={None:'http://www.w3.org/2000/svg','xlink':'http://www.w3.org/1999/xlink'})
    out.set('viewBox',' '.join(f'{v:.2f}' for v in vb)); out.set('width','96'); out.set('height','96'); out.set('fill','none')
    if need:
        d=etree.SubElement(out,SVG+'defs')
        for i in sorted(need):
            if i in byid and byid[i].getparent() is defs or (i in byid and byid[i].getparent().tag==SVG+'defs'):
                d.append(copy.deepcopy(byid[i]))
    for el in els: out.append(copy.deepcopy(el))
    open(f'{outdir}/{name}.svg','wb').write(etree.tostring(out,pretty_print=True))
    meta[name]={'bbox':[x0,y0,w,h],'need':sorted(need)}
print(json.dumps(meta,indent=1,default=float))
