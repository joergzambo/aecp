"""Setzt page.html + base.css + rloop.js zu tools/routing-schleifen.html zusammen."""
import os
here = os.path.dirname(os.path.abspath(__file__))
read = lambda *p: open(os.path.join(here, *p), encoding='utf-8').read()
js = read('rloop.js'); assert '</script' not in js
out = read('page.html').replace('/*BASECSS*/', read('..', 'intervlan', 'base.css'), 1).replace('/*RLJS*/', js, 1)
open(os.path.join(here, '..', '..', 'tools', 'routing-schleifen.html'), 'w', encoding='utf-8').write(out)
print('tools/routing-schleifen.html', len(out) // 1024, 'KiB')
