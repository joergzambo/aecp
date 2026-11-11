"""Setzt page.html + base.css + routing.js + dhcp.js zu tools/dhcp.html zusammen."""
import os
here = os.path.dirname(os.path.abspath(__file__))
read = lambda *p: open(os.path.join(here, *p), encoding='utf-8').read()
rt, dh = read('..', 'routing', 'routing.js'), read('dhcp.js')
assert '</script' not in rt + dh
out = read('page.html').replace('/*BASECSS*/', read('..', 'intervlan', 'base.css'), 1).replace('/*RTJS*/', rt, 1).replace('/*DHJS*/', dh, 1)
open(os.path.join(here, '..', '..', 'tools', 'dhcp.html'), 'w', encoding='utf-8').write(out)
print('tools/dhcp.html', len(out) // 1024, 'KiB')
