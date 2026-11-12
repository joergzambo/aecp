"""Unabhängige Gegenrechnung CDP: Netzplan nur aus dem Text der CDP-Ausgaben rekonstruieren.

node export.js > aufgaben.json && python3 check.py aufgaben.json
Geprüft wird: Aus den Ausgaben (brief und detail) lassen sich alle Verbindungen, alle Modelle und
die gemeldeten IPs eindeutig ablesen, und sie stimmen mit der Lösung des Generators überein.
Außerdem: Jeder benutzte Port ist als Pin vorhanden, kein Port ist doppelt belegt, brief und detail widersprechen sich nicht.
"""
import json
import re
import sys

ABBR = {'Fas': 'FastEthernet', 'Gig': 'GigabitEthernet'}


def full(a):
    m = re.fullmatch(r'(Fas|Gig) (\S+)', a.strip())
    return ABBR[m.group(1)] + m.group(2)


def host(device_id):
    return device_id.split('.')[0]


def parse_brief(text):
    lines = text.split('\n')
    me = lines[0].split('#')[0]
    i = next(k for k, l in enumerate(lines) if l.startswith('Device ID'))
    rows, pend = [], None
    for l in lines[i + 1:]:
        if not l.strip() or l.startswith('Total'):
            continue
        if not l.startswith(' ') and len(l.split()) == 1:  # umgebrochene Device ID
            pend = l.strip(); continue
        dev = pend if pend else l[:17].strip()
        rest = l[17:]
        pend = None
        local = rest[:18].strip()
        tail = rest[18:].split()
        hold = tail[0]
        # Port ID = letzte zwei Tokens, Plattform davor, dazwischen Capabilities
        port = ' '.join(tail[-2:])
        plat = tail[-3]
        caps = tail[1:-3]
        rows.append({'me': me, 'dev': host(dev), 'local': full(local), 'port': full(port), 'plat9': plat, 'caps': caps, 'hold': int(hold)})
    return rows


def parse_detail(text):
    me = text.split('\n')[0].split('#')[0]
    rows = []
    for blk in text.split('-------------------------')[1:]:
        dev = re.search(r'Device ID: (\S+)', blk).group(1)
        ips = re.findall(r'IP address: (\S+)', blk)
        assert len(set(ips)) == 1, ips
        plat = re.search(r'Platform: cisco (\S+),', blk).group(1)
        m = re.search(r'Interface: (\S+),  Port ID \(outgoing port\): (\S+)', blk)
        rows.append({'me': me, 'dev': host(dev), 'local': m.group(1), 'port': m.group(2), 'plat': plat, 'ip': ips[0]})
    return rows


def main(path):
    bad = 0
    for t in json.load(open(path)):
        hosts = [d['host'] for d in t['devs']]
        links, models, ips, plat9 = set(), {}, {h: set() for h in hosts}, {}
        for o in t['outs']:
            rows = parse_detail(o) if 'detail' in o.split('\n')[0] else parse_brief(o)
            for r in rows:
                links.add(frozenset([(r['me'], r['local']), (r['dev'], r['port'])]))
                if 'plat' in r:
                    if models.get(r['dev'], r['plat']) != r['plat']:
                        bad += 1; print('Modell widersprüchlich', t['code'])
                    models[r['dev']] = r['plat']
                    ips[r['dev']].add(r['ip'])
                else:
                    plat9.setdefault(r['dev'], set()).add(r['plat9'])
        sol_links = {frozenset(map(tuple, l)) for l in t['sol']['links']}
        err = []
        if links != sol_links: err.append('Links')
        for k, h in enumerate(hosts):
            if models.get(h) != t['sol']['models'][k]: err.append('Modell ' + h)
            if ips[h] != set(t['sol']['ips'][k]) or not ips[h]: err.append('IP ' + h)
            for p9 in plat9.get(h, ()):
                if p9 != t['sol']['models'][k][:9]: err.append('brief/detail ' + h)
        used = {}
        for l in sol_links:
            for h, p in l:
                if (h, p) in used: err.append('Port doppelt ' + h + p)
                used[(h, p)] = 1
                if p not in t['devs'][hosts.index(h)]['pins']: err.append('Pin fehlt ' + h + p)
        # Zusammenhang
        seen, todo = {hosts[0]}, [hosts[0]]
        while todo:
            x = todo.pop()
            for l in sol_links:
                hs = [h for h, _ in l]
                if x in hs:
                    y = hs[1] if hs[0] == x else hs[0]
                    if y not in seen: seen.add(y); todo.append(y)
        if seen != set(hosts): err.append('nicht zusammenhängend')
        if err:
            bad += 1; print(t['code'], err)
    print(len(json.load(open(path))), 'Aufgaben geprüft,', bad, 'Abweichungen')
    sys.exit(1 if bad else 0)


main(sys.argv[1])
