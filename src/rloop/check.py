"""Unabhängige Gegenprobe der Distanzvektor-Regeln (RIP) mit Split Horizon, Poisoning, Poison Reverse, Hold-Down."""
import json, sys
INF = 16
bad = 0; T_ = json.load(open(sys.argv[1]))
for T in T_:
    n = T['n']
    metric = list(range(n)); nexthop = [None] + list(range(n - 1)); hold = [False] * n
    for ev in T['events']:
        if ev['k'] == 'fail':
            metric[0] = INF; hold[0] = T['hd']; continue
        s, t = ev['s'], ev['t']
        # was sagt s zu t?
        if T['sh'] and nexthop[s] == t:
            if not T['pr']: continue
            adv = INF
        else:
            adv = metric[s]
        new = min(INF, adv + 1)
        if t == 0 and nexthop[0] is None and metric[0] == 0: continue
        if hold[t] and metric[t] >= INF: continue
        if nexthop[t] == s:
            metric[t] = new
            hold[t] = new >= INF and T['hd']
        elif new < metric[t]:
            metric[t] = new; nexthop[t] = s; hold[t] = False
    got = [[m, -1 if v is None else v] for m, v in zip(metric, nexthop)]
    # Vergleich: bei 16 ist der Next Hop egal
    ok = all((a[0] == b[0]) and (a[0] >= INF or a[1] == b[1]) for a, b in zip(got, T['tb']))
    # Schleife unabhängig bestimmen
    loop = False
    for i in range(n):
        seen = set(); c = i
        while metric[c] < INF and nexthop[c] is not None:
            if c in seen: loop = True; break
            seen.add(c); c = nexthop[c]
    if not ok or loop != T['loop']:
        bad += 1
        if bad < 10: print(T['code'], got, T['tb'], loop, T['loop'])
print(len(T_), 'Aufgaben geprüft,', bad, 'Abweichungen')
