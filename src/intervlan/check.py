"""Unabhängige Gegenrechnung Inter-VLAN-Routing (eigene Umsetzung des Regelwerks).

node export.js > aufgaben.json && python3 check.py aufgaben.json
Geprüft wird: Ping-Ergebnis stimmt mit JS überein; ohne den eingebauten Fehler klappt der Ping;
mit Fehler klappt er nicht (der Fehler ist also wirklich die Ursache).
"""
import ipaddress
import json
import sys


def net(ip, p):
    return ipaddress.ip_network(f'{ip}/{p}', strict=False)


def gateway_iface(t, vlan):
    """IP/Präfix des L3-Interfaces, das Frames aus `vlan` erreichen – oder None."""
    if t['mode'] == 'l3':
        for s in t['l3']['svis']:
            if s['vlan'] == vlan and not s['shutdown']:
                return s['ip'], s['prefix']
        return None
    up = t['sw']['up']
    if up['mode'] != 'trunk':
        return None
    if up['allowed'] is not None and vlan not in up['allowed']:
        return None
    if t['router']['shutdown']:
        return None
    for s in t['router']['subs']:
        if s['dot1q'] == vlan:
            return s['ip'], s['prefix']
    return None


def interfaces(t):
    if t['mode'] == 'l3':
        return [(s['vlan'], s['ip'], s['prefix']) for s in t['l3']['svis']]
    return [(s['dot1q'], s['ip'], s['prefix']) for s in t['router']['subs']]


def reaches(t, a, b):
    pcs = {p['name']: p for p in t['pcs']}
    s, d = pcs[a], pcs[b]
    own = net(s['ip'], s['prefix'])
    if ipaddress.ip_address(d['ip']) in own:
        return s['vlan'] == d['vlan']
    if ipaddress.ip_address(s['gw']) not in own:
        return False
    g = gateway_iface(t, s['vlan'])
    if g is None or g[0] != s['gw'] or ipaddress.ip_address(s['ip']) not in net(*g):
        return False
    if t['mode'] == 'l3' and not t['l3']['routing']:
        return False
    for vlan, ip, p in interfaces(t):
        if ipaddress.ip_address(d['ip']) in net(ip, p):
            return gateway_iface(t, vlan) is not None and d['vlan'] == vlan
    return False


def ping(t, a, b):
    return reaches(t, a, b) and reaches(t, b, a)


def main():
    data = json.load(open(sys.argv[1], encoding='utf-8'))
    bad = 0
    for d in data:
        t = d['task']
        a, b = t['pair']
        p = ping(t, a, b)
        if p != d['ping']:
            bad += 1; print('Ping weicht ab', t['code'])
        if not ping(t['clean'], a, b):
            bad += 1; print('Ohne Fehler klappt der Ping nicht', t['code'])
        if t['fault'] and p:
            bad += 1; print('Fehler verhindert den Ping nicht', t['code'])
        if not t['fault'] and not p:
            bad += 1; print('Kein Fehler, aber Ping scheitert', t['code'])
    print(f'{len(data)} Aufgaben geprüft, {bad} Abweichungen')
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
