"""Unabhängige Gegenprobe mit Pythons ipaddress-Modul."""
import json, sys, math, ipaddress as ia

def hb(c):
    h = 2
    while 2 ** h - 2 < c: h += 1
    return h

bad = 0
T_ = json.load(open(sys.argv[1]))
for T in T_:
    e = []; a = T['ans']; t = T['type']
    if t == 'calc':
        n = ia.ip_interface(f"{T['ip']}/{T['p']}").network
        hosts = list(n.hosts()) if n.num_addresses <= 4096 else None
        if str(n.network_address) != a['net'] or str(n.broadcast_address) != a['bc'] or str(n.netmask) != a['mask'] or n.num_addresses - 2 != a['hosts']: e.append('calc')
        if str(n.network_address + 1) != a['first'] or str(n.broadcast_address - 1) != a['last']: e.append('hosts')
        if T['ip'] in (a['net'], a['bc']): e.append('ip ist kein host')
    elif t == 'equal':
        base = ia.ip_network(f"{T['base']}/{T['bp']}")
        k = math.ceil(math.log2(T['want']))
        subs = list(base.subnets(prefixlen_diff=k))
        s = subs[T['idx'] - 1]
        if a['p'] != T['bp'] + k or a['count'] != len(subs) or a['hosts'] != s.num_addresses - 2 or str(s.network_address) != a['net'] or str(s.broadcast_address) != a['bc'] or str(s.netmask) != a['mask']: e.append('equal')
        if len(subs) < T['want'] or len(subs) // 2 >= T['want']: e.append('anzahl')
    elif t == 'vlsm':
        base = ia.ip_network(f"{T['base']}/{T['bp']}")
        nets = []
        for i, g in enumerate(T['groups']):
            x = a[str(i)]; n = ia.ip_network(f"{x['net']}/{x['p']}")
            if x['p'] != 32 - hb(g['hosts']): e.append('maske ' + g['name'])
            if n.num_addresses - 2 < g['hosts'] or (n.num_addresses // 2) - 2 >= g['hosts']: e.append('nicht minimal')
            if not n.subnet_of(base): e.append('außerhalb')
            if str(n.broadcast_address) != x['bc'] or str(n.netmask) != x['mask']: e.append('bc')
            nets.append(n)
        for i in range(len(nets)):
            for j in range(i + 1, len(nets)):
                if nets[i].overlaps(nets[j]): e.append('überlappt')
        # lückenlos in der Reihenfolge, größte zuerst
        cur = base.network_address; last = None
        for i in T['order']:
            n = ia.ip_network(f"{a[str(i)]['net']}/{a[str(i)]['p']}")
            if n.network_address != cur: e.append('lücke')
            if last is not None and n.num_addresses > last: e.append('reihenfolge')
            last = n.num_addresses; cur = n.broadcast_address + 1
    else:
        nets = [ia.ip_network(f"{x['net']}/{x['p']}") for x in T['nets']]
        lo = min(n.network_address for n in nets); hi = max(n.broadcast_address for n in nets)
        p = 32
        while p > 0 and ia.ip_network(f'{lo}/{p}', strict=False) != ia.ip_network(f'{hi}/{p}', strict=False): p -= 1
        s = ia.ip_network(f'{lo}/{p}', strict=False)
        if str(s.network_address) != a['net'] or s.prefixlen != a['p'] or str(s.netmask) != a['mask']: e.append('sup')
        if not all(n.subnet_of(s) for n in nets): e.append('deckt nicht')
        if p < 32 and all(n.subnet_of(ia.ip_network(f'{lo}/{p+1}', strict=False)) for n in nets): e.append('nicht minimal')
        extra = s.num_addresses - sum(n.num_addresses for n in nets)
        if extra != T['extra']: e.append('extra')
        for i in range(len(nets)):
            for j in range(i + 1, len(nets)):
                if nets[i].overlaps(nets[j]): e.append('überlappt')
    if e:
        bad += 1
        if bad < 10: print(t, T['code'], e)
print(len(T_), 'Aufgaben geprüft,', bad, 'Abweichungen')
