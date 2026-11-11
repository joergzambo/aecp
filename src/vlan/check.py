"""Unabhängige Gegenrechnung der VLAN-Aufgaben (eigene Implementierung nach Regelwerk, nicht aus dem JS übersetzt).

node export.js > aufgaben.json && python3 check.py aufgaben.json
"""
import json
import sys


def allowed(side, v):
    return side['allowed'] is None or v in side['allowed']


def receivers(t, sender):
    """Breitensuche über (Switch, VLAN)-Zustände."""
    pcs = {p['name']: p for p in t['pcs']}
    start = pcs[sender]
    got, todo, done = set(), [(start['sw'], start['vlan'], None)], set()
    while todo:
        sw, v, came_from = todo.pop()  # Switch flutet nie auf den Port zurück, über den der Frame kam
        if (sw, v) in done:
            continue
        done.add((sw, v))
        got |= {p['name'] for p in t['pcs'] if p['sw'] == sw and p['vlan'] == v and p['name'] != sender}
        for i, link in enumerate(t['links']):
            if i == came_from:
                continue
            for me, other, mine, theirs in ((link['a'], link['b'], link['A'], link['B']), (link['b'], link['a'], link['B'], link['A'])):
                if me != sw or not allowed(mine, v):
                    continue
                vlan_far = v if v != mine['native'] else theirs['native']  # ohne Tag → native VLAN der Gegenseite
                if allowed(theirs, vlan_far):
                    todo.append((other, vlan_far, i))
    return got


def can_ping(t, a, b):
    va = next(p['vlan'] for p in t['pcs'] if p['name'] == a)
    vb = next(p['vlan'] for p in t['pcs'] if p['name'] == b)
    return va == vb and b in receivers(t, a) and a in receivers(t, b)


def main():
    data = json.load(open(sys.argv[1], encoding='utf-8'))
    bad = 0
    for d in data:
        t = d['task']
        if set(d['recv']) != receivers(t, t['sender']):
            bad += 1
            print('Broadcast weicht ab:', t['code'], d['recv'], receivers(t, t['sender']))
        if d['ping'] != can_ping(t, *t['pair']):
            bad += 1
            print('Ping weicht ab:', t['code'])
    print(f'{len(data)} Aufgaben geprüft, {bad} Abweichungen')
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
