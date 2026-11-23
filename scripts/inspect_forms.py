import json, glob, os
from pypdf import PdfReader
from pypdf.generic import IndirectObject

def resolve(obj):
    return obj.get_object() if isinstance(obj, IndirectObject) else obj

def full_name(field):
    parts = []
    node = field
    while node:
        t = node.get('/T')
        if t is not None:
            parts.append(str(t))
        node = resolve(node.get('/Parent')) if node.get('/Parent') else None
    return '.'.join(reversed(parts))

out = {}
for path in sorted(glob.glob('apps/web/public/templates/US/*/*.pdf')):
    code = path.split('/')[-2]
    reader = PdfReader(path)
    fields = []
    for pno, page in enumerate(reader.pages):
        annots = resolve(page.get('/Annots')) if page.get('/Annots') else []
        for a in annots:
            a = resolve(a)
            if a.get('/Subtype') != '/Widget':
                continue
            name = full_name(a)
            ft = a.get('/FT')
            if ft is None and a.get('/Parent'):
                ft = resolve(a['/Parent']).get('/FT')
            rect = [round(float(x), 2) for x in (a.get('/Rect') or [])]
            exports = []
            ap = resolve(a.get('/AP')) if a.get('/AP') else None
            if ap and ap.get('/N'):
                n = resolve(ap['/N'])
                if isinstance(n, dict):
                    exports = [str(k) for k in n.keys()]
            fields.append({
                'name': name,
                'type': str(ft),
                'page': pno,
                'rect': rect,
                'exports': exports,
                'maxLen': a.get('/MaxLen'),
            })
    out[code] = {'file': path, 'pages': len(reader.pages),
                 'pageSize': [round(float(reader.pages[0].mediabox.width), 2), round(float(reader.pages[0].mediabox.height), 2)],
                 'fields': fields}
    with open(f'docs/template-fields/{code}.json', 'w') as f:
        json.dump(fields, f, indent=1)
    print(code, 'pages', len(reader.pages), 'pageSize', out[code]['pageSize'], 'widgets', len(fields))
