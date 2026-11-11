"""Unabhängige Gegenprobe: wo gehört der Helper hin, welches Ziel, welcher Pool."""
import json, sys, ipaddress as ia
bad = 0; T_ = json.load(open(sys.argv[1]))
for D in T_:
    e = []
    want = sorted(f"{i}:{r['lanIf']}" for i, r in enumerate(D['routers']) if i != D['srv'])
    if D['need'] != want: e.append('need')
    # nie auf Router-Router-Interfaces
    link_ifs = {f"{l['a']}:{l['ifA']}" for l in D['links']} | {f"{l['b']}:{l['ifB']}" for l in D['links']}
    if set(D['need']) & link_ifs: e.append('helper auf link')
    if D['mode'] == 'host':
        lan = D['routers'][D['srv']]['lans'][0]; net = ia.ip_network(f"{lan['net']}/{lan['p']}")
        ip = ia.ip_address(D['srvIp'])
        if ip not in net or ip in (net.network_address, net.broadcast_address, net.network_address + 1): e.append('server-ip')
        if D['targets'] != [D['srvIp']]: e.append('targets')
    else:
        ips = sorted([l['ipA'] for l in D['links'] if l['a'] == D['srv']] + [l['ipB'] for l in D['links'] if l['b'] == D['srv']] + [str(ia.ip_network(f"{D['routers'][D['srv']]['lans'][0]['net']}/{D['routers'][D['srv']]['lans'][0]['p']}").network_address + 1)])
        if sorted(D['targets']) != ips: e.append('router-targets')
    pl = D['routers'][D['poolR']]['lans'][0]; n = ia.ip_network(f"{pl['net']}/{pl['p']}")
    if D['pool']['net'] != str(n.network_address) or D['pool']['mask'] != str(n.netmask) or D['pool']['gw'] != str(n.network_address + 1): e.append('pool')
    if D['mode'] == 'host' and D['poolR'] == D['srv']: e.append('pool im server-lan')
    if not D['solvedIf'] or not D['tgtOk']: e.append('musterloesung')
    if e:
        bad += 1
        if bad < 10: print(D['code'], e)
print(len(T_), 'Aufgaben geprüft,', bad, 'Abweichungen')
