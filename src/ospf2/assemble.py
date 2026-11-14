"""Setzt page.html + base.css + ospf2.js zu tools/ospf-2.html zusammen."""
import json
import os
here = os.path.dirname(os.path.abspath(__file__))
read = lambda *p: open(os.path.join(here, *p), encoding='utf-8').read()
LIST = ['L-1', 'L-2', 'L-3', 'M-1', 'M-2', 'M-3', 'M-4', 'S-1', 'S-2', 'S-3']
js = read('ospf2.js'); assert '</script' not in js
out = read('page.html').replace('/*BASECSS*/', read('..', 'intervlan', 'base.css'), 1).replace('/*O2JS*/', js, 1).replace('/*LIST*/', json.dumps(LIST), 1)
open(os.path.join(here, '..', '..', 'tools', 'ospf-2.html'), 'w', encoding='utf-8').write(out)
print('tools/ospf-2.html', len(out) // 1024, 'KiB')
