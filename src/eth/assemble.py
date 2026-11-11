"""Setzt page.html + base.css + eth.js zu tools/ethernet-switching.html zusammen."""
import os
here = os.path.dirname(os.path.abspath(__file__))
read = lambda n: open(os.path.join(here, n), encoding='utf-8').read()
js = read('eth.js'); assert '</script' not in js
css = open(os.path.join(here, '..', 'intervlan', 'base.css'), encoding='utf-8').read()
out = read('page.html').replace('/*BASECSS*/', css, 1).replace('/*ETHJS*/', js, 1)
open(os.path.join(here, '..', '..', 'tools', 'ethernet-switching.html'), 'w', encoding='utf-8').write(out)
print('tools/ethernet-switching.html', len(out) // 1024, 'KiB')
