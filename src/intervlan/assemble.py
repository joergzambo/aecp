"""Setzt page.html + base.css + ivr.js zu tools/inter-vlan-routing.html zusammen."""
import os

here = os.path.dirname(os.path.abspath(__file__))
read = lambda n: open(os.path.join(here, n), encoding='utf-8').read()
js = read('ivr.js')
assert '</script' not in js
out = read('page.html').replace('/*BASECSS*/', read('base.css'), 1).replace('/*IVRJS*/', js, 1)
dst = os.path.join(here, '..', '..', 'tools', 'inter-vlan-routing.html')
open(dst, 'w', encoding='utf-8').write(out)
print('tools/inter-vlan-routing.html', len(out) // 1024, 'KiB')
