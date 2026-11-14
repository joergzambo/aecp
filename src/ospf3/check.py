"""Unabhängige Gegenrechnung OSPF 3 (Multi-Area) – liest nur die Konfigurationen.

node export.js > aufgaben.json && python3 check.py aufgaben.json
Aus ip address und network/Wildcard/area wird die Area jedes Interfaces bestimmt (erster Treffer gilt),
daraus Rollen (intern/Backbone/ABR), Area jedes Netzes, Typ C/O/O IA, Kosten und Next Hops für den gefragten Router.
Außerdem: jede Area hängt zusammen und berührt Area 0; beide Enden eines Links liegen in derselben Area.
"""
import ipaddress as ia
import json
import re
import sys
from collections import deque


def parse(cfg):
    ifs, st, cur = [], [], None
    for line in cfg.split('\n'):
        m = re.match(r'interface (\S+)', line)
        if m: cur = m.group(1)
        m = re.match(r' ip address (\S+) (\S+)', line)
        if m: ifs.append((cur, ia.ip_interface(m.group(1) + '/' + m.group(2))))
        m = re.match(r' network (\S+) (\S+) area (\d+)', line)
        if m: st.append((int(ia.ip_address(m.group(1))), int(ia.ip_address(m.group(2))), int(m.group(3))))
    return ifs, st


def area(ip, st):
    for net, wc, a in st:
        if int(ip) & ~wc & 0xFFFFFFFF == net & ~wc & 0xFFFFFFFF:
            return a
    return None


def main(path):
    data = json.load(open(path)); bad = 0
    for t in data:
        P = [parse(c) for c in t['cfg']]
        n = len(P)
        ifa = [[(name, i, area(i.ip, st)) for name, i in ifs] for ifs, st in P]
        err = []
        if any(a is None for r in ifa for _, _, a in r): err.append('Interface ohne Area')
        netarea = {}
        for r in ifa:
            for _, i, a in r:
                k = str(i.network)
                if k in netarea and netarea[k] != a: err.append('Link mit zwei Areas ' + k)
                netarea[k] = a
        areas = [sorted({a for _, _, a in r}) for r in ifa]
        roles = ['ABR' if len(a) > 1 else 'Backbone' if a == [0] else 'Intern' for a in areas]
        if roles != t['roles'] or areas != t['areas']: err.append('Rollen/Areas')
        # Nachbarschaften: gemeinsame /30-Netze
        adj = [[] for _ in range(n)]
        owners = {}
        for ri, r in enumerate(ifa):
            for _, i, _a in r: owners.setdefault(str(i.network), []).append(ri)
        for k, o in owners.items():
            if len(o) == 2: adj[o[0]].append(o[1]); adj[o[1]].append(o[0])
        # jede Area zusammenhängend und an Area 0
        for A in set(netarea.values()):
            mem = [i for i in range(n) if A in areas[i]]
            seen, q = {mem[0]}, deque([mem[0]])
            while q:
                u = q.popleft()
                for v in adj[u]:
                    k = next(kk for kk, o in owners.items() if sorted(o) == sorted([u, v]))
                    if netarea[k] == A and v not in seen: seen.add(v); q.append(v)
            if seen != set(mem): err.append('Area %d zerfällt' % A)
            if A != 0 and not any(0 in areas[i] for i in mem): err.append('Area %d ohne ABR' % A)

        def dist(s):
            d = [None] * n; d[s] = 0; q = deque([s])
            while q:
                u = q.popleft()
                for v in adj[u]:
                    if d[v] is None: d[v] = d[u] + 1; q.append(v)
            return d
        x = t['x']; dx = dist(x)
        for a in t['ask']:
            k = a['net'] + '/' + str(a['p']); o = owners[k]
            if x in o: typ, cost, via = 'C', 0, []
            else:
                best = min(dx[w] for w in o); cost = best + 1
                typ = 'O' if netarea[k] in areas[x] else 'O IA'
                via = []
                for v in adj[x]:
                    dv = dist(v)
                    if min(dv[w] for w in o) == best - 1:
                        kk = next(kk for kk, oo in owners.items() if sorted(oo) == sorted([x, v]))
                        via.append(next(str(i.ip) for _, i, _a in ifa[v] if str(i.network) == kk))
            if (typ, cost, sorted(via)) != (a['type'], a['cost'], sorted(a['via'])) or netarea[k] != a['area']:
                err.append('Route ' + k)
        if err: bad += 1; print(t['code'], sorted(set(err))[:4])
    print(len(data), 'Aufgaben geprüft,', bad, 'Abweichungen')
    sys.exit(1 if bad else 0)


main(sys.argv[1])
