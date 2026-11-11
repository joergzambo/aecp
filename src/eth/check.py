"""Unabhängige Gegenprobe: Switch-Verhalten rekursiv nachgebaut, plus Layout-Prüfung."""
import json, sys, math
BC = 'ffff.ffff.ffff'
bad = 0
tasks = json.load(open(sys.argv[1]))
for T in tasks:
    dev, links = T['dev'], T['links']
    def ports(i):
        out = []
        for l in links:
            if l['a'] == i: out.append((l['b'], l['pa']))
            if l['b'] == i: out.append((l['a'], l['pb']))
        return out
    tables = {}; e = []
    for k, (src, dst) in enumerate(T['frames']):
        reached = set(); acts = {}
        def deliver(node, came_from, in_port):
            d = dev[node]
            if d['t'] == 'pc':
                if node != src: reached.add(node)
                return
            if d['t'] == 'hub':
                for nb, _ in ports(node):
                    if nb != came_from: deliver(nb, node, port_on(nb, node))
                return
            tb = tables.setdefault(str(node), {})
            tb[dev[src]['mac']] = in_port
            others = [(nb, p) for nb, p in ports(node) if p != in_port]
            if dst == BC: act, out = 'bcast', others
            elif dst not in tb: act, out = 'flood', others
            elif tb[dst] == in_port: act, out = 'filter', []
            else: act, out = 'forward', [(nb, p) for nb, p in others if p == tb[dst]]
            acts[node] = [node, act, sorted(p for _, p in out)]
            for nb, _ in out: deliver(nb, node, port_on(nb, node))
        def port_on(node, other):
            for nb, p in ports(node):
                if nb == other: return p
            return ''
        nb0 = ports(src)[0][0]
        deliver(nb0, src, port_on(nb0, src))
        got = T['steps'][k]
        if sorted(reached) != got['reached']: e.append(f'reached {k}')
        if sorted(map(tuple, [(a[0], a[1], tuple(a[2])) for a in acts.values()])) != sorted((a[0], a[1], tuple(a[2])) for a in got['acts']): e.append(f'acts {k}')
    if tables != T['tables']: e.append('tabellen')
    # MAC-Adressen gültig (hex) und eindeutig
    macs = [d['mac'] for d in dev if d['t'] == 'pc']
    if len(set(macs)) != len(macs) or any(not all(c in '0123456789abcdef.' for c in m) for m in macs): e.append('mac')
    # Geräte nicht zu eng
    for i in range(len(dev)):
        for j in range(i + 1, len(dev)):
            if math.hypot(dev[i]['x'] - dev[j]['x'], dev[i]['y'] - dev[j]['y']) < 80: e.append('eng')
    if e:
        bad += 1
        if bad < 10: print(T['code'], e)
print(len(tasks), 'Aufgaben geprüft,', bad, 'Abweichungen')
