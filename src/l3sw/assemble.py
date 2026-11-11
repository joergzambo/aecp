"""Setzt page.html + base.css + l3.js zu tools/layer-3-switching.html zusammen."""
import json
import os
here = os.path.dirname(os.path.abspath(__file__))
read = lambda *p: open(os.path.join(here, *p), encoding='utf-8').read()
LIST = ['L-1', 'L-2', 'L-3', 'L-10', 'M-7', 'M-14', 'M-37', 'M-22', 'S-3', 'S-49', 'S-12', 'S-20']
js = read('l3.js'); assert '</script' not in js
out = read('page.html').replace('/*BASECSS*/', read('..', 'intervlan', 'base.css'), 1).replace('/*L3JS*/', js, 1).replace('/*LIST*/', json.dumps(LIST), 1)
open(os.path.join(here, '..', '..', 'tools', 'layer-3-switching.html'), 'w', encoding='utf-8').write(out)
print('tools/layer-3-switching.html', len(out) // 1024, 'KiB')
