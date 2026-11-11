"""Setzt page.html + base.css + domains.js zu tools/collision-broadcast-domains.html zusammen."""
import os

here = os.path.dirname(os.path.abspath(__file__))
read = lambda n: open(os.path.join(here, n), encoding='utf-8').read()
js = read('domains.js')
assert '</script' not in js
css = open(os.path.join(here, '..', 'intervlan', 'base.css'), encoding='utf-8').read()
out = read('page.html').replace('/*BASECSS*/', css, 1).replace('/*DOMJS*/', js, 1)
dst = os.path.join(here, '..', '..', 'tools', 'collision-broadcast-domains.html')
open(dst, 'w', encoding='utf-8').write(out)
print('tools/collision-broadcast-domains.html', len(out) // 1024, 'KiB')
