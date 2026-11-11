"""Setzt page.html + vlan.js zu tools/vlan.html zusammen (eine eigenständige Datei)."""
import os

here = os.path.dirname(os.path.abspath(__file__))
page = open(os.path.join(here, 'page.html'), encoding='utf-8').read()
js = open(os.path.join(here, 'vlan.js'), encoding='utf-8').read()
assert '</script' not in js
out = page.replace('/*VLANJS*/', js, 1)
dst = os.path.join(here, '..', '..', 'tools', 'vlan.html')
open(dst, 'w', encoding='utf-8').write(out)
print('tools/vlan.html', len(out) // 1024, 'KiB')
