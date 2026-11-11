"""Unabhängige Gegenprobe: Floyd-Warshall für schnellste Wege + Klassennetze für RIP."""
import json, sys, ipaddress

COST = {'gig': 1, 'ser': 64}

def classful(ip):
    a = int(ip.split('.')[0])
    p = 8 if a < 128 else 16 if a < 192 else 24
    return str(ipaddress.ip_network(f'{ip}/{p}', strict=False).network_address)

bad = 0
tasks = json.load(open(sys.argv[1]))
for T in tasks:
    n = len(T['routers']); INF = 10**9
    d = [[0 if i == j else INF for j in range(n)] for i in range(n)]
    for l in T['links']:
        c = COST[l['type']]; d[l['a']][l['b']] = min(d[l['a']][l['b']], c); d[l['b']][l['a']] = min(d[l['b']][l['a']], c)
    for k in range(n):
        for i in range(n):
            for j in range(n):
                if d[i][k] + d[k][j] < d[i][j]: d[i][j] = d[i][k] + d[k][j]
    netz = []  # (net, p, owners)
    for l in T['links']: netz.append((l['net'], 30, {l['a'], l['b']}))
    for i, r in enumerate(T['routers']):
        for x in r['lans']: netz.append((x['net'], x['p'], {i}))
    errs = []
    # Netze dürfen sich nicht überschneiden
    objs = [ipaddress.ip_network(f'{a}/{p}') for a, p, _ in netz]
    for i in range(len(objs)):
        for j in range(i + 1, len(objs)):
            if objs[i].overlaps(objs[j]): errs.append(f'Überlappung {objs[i]} {objs[j]}')
    # Link-IPs: .1/.2 im /30, nicht Netz- oder Broadcastadresse
    for l in T['links']:
        net = ipaddress.ip_network(f"{l['net']}/30")
        for ip in (l['ipA'], l['ipB']):
            if ipaddress.ip_address(ip) not in list(net.hosts()): errs.append('IP ' + ip)
    src = T['ask']['st']; want = {}
    for net, p, own in netz:
        if src in own: continue
        dn = lambda r: min(d[r][o] for o in own)
        hops = []
        for l in T['links']:
            for me, nb, ipnb in ((l['a'], l['b'], l['ipB']), (l['b'], l['a'], l['ipA'])):
                if me == src and COST[l['type']] + dn(nb) == dn(src): hops.append(ipnb)
        want[(net, p)] = sorted(hops)
    got = {(x['net'], x['p']): x['hops'] for x in T['routes']}
    if got != want: errs.append('Routen')
    rip = sorted({classful(net) for net, p, own in netz if T['ask']['rip'] in own})
    if rip != T['rip']: errs.append('RIP')
    if not T['solSt'] or not T['solRip']: errs.append('Musterlösung nicht als richtig erkannt')
    if errs:
        bad += 1
        if bad < 10: print(T['code'], errs)
print(len(tasks), 'Aufgaben geprüft,', bad, 'Abweichungen')
