"""Baut aus page.html + base.css + sub.js zwei Einheiten:
tools/subnetting.html (PAGE sub) und tools/supernetting.html (PAGE sup)."""
import os, re

here = os.path.dirname(os.path.abspath(__file__))
read = lambda n: open(os.path.join(here, n), encoding='utf-8').read()
js = read('sub.js')
assert '</script' not in js
css = open(os.path.join(here, '..', 'intervlan', 'base.css'), encoding='utf-8').read()
page = read('page.html')
for mode, tag, other, name in (('sub', 'SUB', 'SUP', 'subnetting'), ('sup', 'SUP', 'SUB', 'supernetting')):
    out = re.sub(r'<!--%s-->.*?<!--/%s-->' % (other, other), '', page, flags=re.S)
    out = out.replace('<!--%s-->' % tag, '').replace('<!--/%s-->' % tag, '')
    out = out.replace('/*BASECSS*/', css, 1).replace('/*SNJS*/', js, 1).replace("'/*PAGE*/'", "'%s'" % mode, 1)
    assert '<!--SU' not in out
    open(os.path.join(here, '..', '..', 'tools', name + '.html'), 'w', encoding='utf-8').write(out)
    print('tools/%s.html' % name, len(out) // 1024, 'KiB')
