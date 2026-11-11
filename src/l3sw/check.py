"""Unabhängige Gegenrechnung Layer-3-Switching (eigene Umsetzung der Regeln).

node export.js > aufgaben.json && python3 check.py aufgaben.json
Geprüft wird: SVI-Status, Routing-Tabelle und alle Pings (jedes PC-Paar, jeder PC → Internet) stimmen mit JS
überein; jeder eingebaute Fehler ändert mindestens eine Antwort; ohne Fehler funktioniert alles.
"""
import copy
import ipaddress as ia
import json
import sys


def net(a, p):
    return ia.ip_network(f'{a}/{p}', strict=False)


def vl(t, i):
    return next(v for v in t['vlans'] if v['id'] == i)


def port_ok(t, p):
    return not p['shut'] and vl(t, p['vlan'])['db']


def trunk(t):
    return t['up']['mode'] == 'trunk'


def carries(t, vid):
    return trunk(t) and (t['up']['allowed'] is None or vid in t['up']['allowed'])


def transit(t):
    if not trunk(t):
        return None
    u = t['up']
    if u['tvshut']:
        return 'admin'
    if not u['tvdb'] or not carries(t, u['tv']):
        return 'down'
    return 'up'


def up_ok(t):
    return transit(t) == 'up' if trunk(t) else t['up']['routed']


def svi(t, v):
    if v['shut']:
        return 'admin'
    if not v['db']:
        return 'down'
    if carries(t, v['id']):
        return 'up'
    return 'up' if any(p['vlan'] == v['id'] and port_ok(t, p) for p in t['pcs']) else 'down'


def table(t):
    if not t['routing']:
        return None
    c = []  # (Schlüssel, Netz)
    if up_ok(t):
        c.append(('up', net(t['up']['ip'], 30)))
    for v in t['vlans']:
        if svi(t, v) == 'up':
            c.append(('v%d' % v['id'], net(v['svi'], 24)))
    keys = [k for k, _ in c]
    if t['def'] and any(ia.ip_address(t['def']) in n for _, n in c):
        keys.append('def')
    return sorted(keys)


def lookup(t, ip):
    """Längster Präfix in der Routing-Tabelle des Switches → Schlüssel oder None."""
    keys = table(t) or []
    best = None
    for k in keys:
        if k == 'def':
            cand = (0, 'def')
        elif k == 'up':
            cand = (30, 'up') if ia.ip_address(ip) in net(t['up']['ip'], 30) else None
        else:
            v = vl(t, int(k[1:]))
            cand = (24, k) if ia.ip_address(ip) in net(v['net'], 24) else None
        if cand and (best is None or cand[0] > best[0]):
            best = cand
    return best and best[1]


def pc(t, n):
    return next(p for p in t['pcs'] if p['name'] == n)


def gw_ok(t, p):
    """Erreicht p sein Gateway, und ist dort eine funktionierende SVI?"""
    v = vl(t, p['vlan'])
    return p['gw'] == v['svi'] and svi(t, v) == 'up'


def ping(t, a, b):
    A = pc(t, a)
    if not port_ok(t, A):
        return False
    if b != 'INET':
        B = pc(t, b)
        if ia.ip_address(B['ip']) in net(A['ip'], 24):
            return B['vlan'] == A['vlan'] and port_ok(t, B)
    if not gw_ok(t, A) or not t['routing']:
        return False
    if b == 'INET':
        if lookup(t, '8.8.8.8') != 'def':
            return False
        if trunk(t) and t['r1']['dot1q'] != t['up']['tv']:
            return False
        # R1 muss die Antwort zurück zum Switch schicken
        return any(ia.ip_address(A['ip']) in net(r['net'], r['p']) for r in t['r1']['routes'])
    B = pc(t, b)
    k = lookup(t, B['ip'])
    if k is None or k in ('def', 'up') or int(k[1:]) != B['vlan']:
        return False
    if not port_ok(t, B):
        return False
    # Rückweg: B über sein Gateway, Switch kennt A's Netz (SVI von A ist up, sonst wären wir oben ausgestiegen)
    return gw_ok(t, B) and lookup(t, A['ip']) == 'v%d' % A['vlan']


def answers(t):
    rt = table(t)
    return {'svi': [svi(t, v) for v in t['vlans']], 'tr': transit(t), 'rt': ['none'] if rt is None else rt,
            'ping': [ping(t, a, b) for a, b in t['pings']]}


def undo(t, f):
    """Einen Fehler rückgängig machen (aus der Aufgabe rekonstruiert)."""
    u = copy.deepcopy(t)
    k, p = f['type'], f['p']
    if k == 'norouting': u['routing'] = True
    elif k == 'svishut': vl(u, p['v'])['shut'] = False
    elif k == 'nodefault' or k == 'wrongnh': u['def'] = u['up']['rip']
    elif k == 'novlan': vl(u, p['v'])['db'] = True
    elif k == 'portshut': pc(u, p['pc'])['shut'] = False
    elif k == 'pcgw': q = pc(u, p['pc']); q['gw'] = vl(u, q['vlan'])['svi']
    elif k == 'sviip':
        v = vl(u, p['v']); v['svi'] = str(net(v['net'], 24).network_address + u['svih'])
    elif k == 'noswitch': u['up']['routed'] = True
    elif k == 'tvallowed': u['up']['allowed'] = None
    elif k == 'tvnovlan': u['up']['tvdb'] = True
    elif k == 'dot1q': u['r1']['dot1q'] = u['up']['tv']
    elif k == 'noreturn': u['r1']['routes'].append({'net': vl(u, p['v'])['net'], 'p': 24})
    else: raise ValueError(k)
    return u


def main(path):
    data = json.load(open(path))
    bad = 0
    for d in data:
        t = d['task']
        if answers(t) != d['ans']:
            bad += 1; print('Abweichung Antworten', t['code'], answers(t), d['ans'])
            continue
        for key, ok in d['pairs'].items():
            a, b = key.split('>')
            if ping(t, a, b) != ok:
                bad += 1; print('Abweichung Ping', t['code'], key, ok); break
        for i, f in enumerate(t['faults']):
            if answers(undo(t, f)) == answers(t):
                bad += 1; print('Fehler ohne Wirkung', t['code'], f['type'])
        clean = t
        for f in t['faults']:
            clean = undo(clean, f)
        a = answers(clean)
        if not all(a['ping']) or any(s != 'up' for s in a['svi']) or 'def' not in a['rt'] or a['tr'] not in (None, 'up'):
            bad += 1; print('Ohne Fehler klappt nicht alles', t['code'])
    print(len(data), 'Aufgaben geprüft,', bad, 'Abweichungen')
    sys.exit(1 if bad else 0)


main(sys.argv[1])
