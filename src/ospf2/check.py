"""Unabhängige Gegenrechnung OSPF 2 – liest nur den Konfigurationstext der Router.

node export.js > aufgaben.json && python3 check.py aufgaben.json
Aus show running-config werden Router-ID, Priorität, Interface-Typ, ip ospf cost und Referenzbandbreite
herausgelesen; daraus DR/BDR (mit spät startendem Router), Nachbarzustände und Kosten berechnet.
"""
import ipaddress as ia
import json
import re
import sys

BW = {'FastEthernet': 100, 'GigabitEthernet': 1000, 'TenGigabitEthernet': 10000}


def parse(cfg):
    r = {'loops': [], 'ifs': [], 'prio': 1, 'cmd': None, 'cost': None, 'ref': 100, 'type': None}
    cur = None
    for line in cfg.split('\n'):
        m = re.match(r'interface (\S+)', line)
        if m: cur = m.group(1); continue
        m = re.match(r' ip address (\S+) ', line)
        if m and cur:
            (r['loops'] if cur.startswith('Loopback') else r['ifs']).append(m.group(1))
            if 'zum Switch' in cfg.split('interface ' + cur)[1].split('!')[0]:
                r['type'] = re.match(r'[A-Za-z]+', cur).group(0)
        m = re.match(r' ip ospf priority (\d+)', line)
        if m: r['prio'] = int(m.group(1))
        m = re.match(r' ip ospf cost (\d+)', line)
        if m: r['cost'] = int(m.group(1))
        m = re.match(r' router-id (\S+)', line)
        if m: r['cmd'] = m.group(1)
        m = re.match(r' auto-cost reference-bandwidth (\d+)', line)
        if m: r['ref'] = int(m.group(1))
    return r


def rid(p):
    if p['cmd']: return p['cmd']
    pool = p['loops'] or p['ifs']
    return str(max(pool, key=lambda x: int(ia.ip_address(x))))


def main(path):
    data = json.load(open(path)); bad = 0
    for t in data:
        P = [parse(c) for c in t['cfg']]
        late = [R['late'] for R in t['rs']]  # Hinweis im Aufgabentext
        rids = [rid(p) for p in P]
        key = lambda i: (P[i]['prio'], int(ia.ip_address(rids[i])))
        early = sorted([i for i in range(len(P)) if not late[i] and P[i]['prio'] > 0], key=key, reverse=True)
        lateel = sorted([i for i in range(len(P)) if late[i] and P[i]['prio'] > 0], key=key, reverse=True)
        cand = early + lateel  # späte Router füllen nur freie Plätze
        dr, bdr = cand[0], cand[1]
        role = ['DR' if i == dr else 'BDR' if i == bdr else 'DROTHER' for i in range(len(P))]
        x = t['x']
        nb = [None if y == x else ('FULL/' if role[x] != 'DROTHER' or role[y] != 'DROTHER' else '2WAY/') + role[y] for y in range(len(P))]
        c = P[x]['cost'] or max(1, P[x]['ref'] // BW[P[x]['type']])
        err = []
        if rids != t['ans']['rid']: err.append('RID')
        if (dr, bdr) != (t['ans']['dr'], t['ans']['bdr']): err.append('DR/BDR')
        if nb != t['ans']['nb']: err.append('Nachbarn')
        if c != t['ans']['cost']: err.append('Kosten')
        if len(set(rids)) != len(rids): err.append('RID doppelt')
        if len({p['ref'] for p in P}) != 1: err.append('Referenzbandbreite uneinheitlich')
        # eindeutig: kein Gleichstand bei Priorität UND Router-ID möglich (RIDs eindeutig) – ok
        if err: bad += 1; print(t['code'], err)
    print(len(data), 'Aufgaben geprüft,', bad, 'Abweichungen')
    sys.exit(1 if bad else 0)


main(sys.argv[1])
