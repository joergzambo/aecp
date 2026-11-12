"""Setzt page.html + base.css + dijk.js zu tools/ospf-1.html zusammen."""
import json
import os
here = os.path.dirname(os.path.abspath(__file__))
read = lambda *p: open(os.path.join(here, *p), encoding='utf-8').read()
LIST = ['L-1', 'L-2', 'LB-3', 'M-1', 'MB-2', 'M-3', 'MB-4', 'S-1', 'SB-2', 'SB-3']
js = read('dijk.js'); assert '</script' not in js
out = read('page.html').replace('/*BASECSS*/', read('..', 'intervlan', 'base.css'), 1).replace('/*DJJS*/', js, 1).replace('/*LIST*/', json.dumps(LIST), 1)
open(os.path.join(here, '..', '..', 'tools', 'ospf-1.html'), 'w', encoding='utf-8').write(out)
print('tools/ospf-1.html', len(out) // 1024, 'KiB')
