"""Setzt page.html + base.css + cdp.js zu tools/cdp.html zusammen."""
import json
import os
here = os.path.dirname(os.path.abspath(__file__))
read = lambda *p: open(os.path.join(here, *p), encoding='utf-8').read()
LIST = ['L-1', 'L-2', 'L-3', 'M-1', 'M-2', 'M-3', 'M-4', 'S-1', 'S-2', 'S-3']
js = read('cdp.js'); assert '</script' not in js
out = read('page.html').replace('/*BASECSS*/', read('..', 'intervlan', 'base.css'), 1).replace('/*CDPJS*/', js, 1).replace('/*LIST*/', json.dumps(LIST), 1)
open(os.path.join(here, '..', '..', 'tools', 'cdp.html'), 'w', encoding='utf-8').write(out)
print('tools/cdp.html', len(out) // 1024, 'KiB')
