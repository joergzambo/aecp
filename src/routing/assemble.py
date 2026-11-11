"""Baut aus page.html + base.css + routing.js zwei Einheiten:
tools/statisches-routing.html (MODE st) und tools/rip.html (MODE rip)."""
import os, re

here = os.path.dirname(os.path.abspath(__file__))
read = lambda n: open(os.path.join(here, n), encoding='utf-8').read()
js = read('routing.js')
assert '</script' not in js
css = open(os.path.join(here, '..', 'intervlan', 'base.css'), encoding='utf-8').read()
page = read('page.html')
for mode, tag, other, name in (('st', 'ST', 'RIP', 'statisches-routing'), ('rip', 'RIP', 'ST', 'rip')):
    out = re.sub(r'<!--%s-->.*?<!--/%s-->' % (other, other), '', page, flags=re.S)
    out = out.replace('<!--%s-->' % tag, '').replace('<!--/%s-->' % tag, '')
    out = out.replace('/*BASECSS*/', css, 1).replace('/*RTJS*/', js, 1).replace("'/*MODE*/'", "'%s'" % mode, 1)
    assert '<!--ST' not in out and '<!--RIP' not in out
    dst = os.path.join(here, '..', '..', 'tools', name + '.html')
    open(dst, 'w', encoding='utf-8').write(out)
    print('tools/%s.html' % name, len(out) // 1024, 'KiB')
