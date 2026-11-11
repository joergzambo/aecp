"""Unabhängige Gegenprobe: Domains per Flutfüllung über Kabel-Segmente + Layout-Prüfung."""
import json, sys, math

def domains(T, passes):
    """Zwei Kabel liegen in derselben Domain, wenn sie sich an einem Gerät treffen, das 'durchlässt'."""
    n = len(T['links']); seen = [None] * n; k = 0
    for s in range(n):
        if seen[s] is not None: continue
        stack = [s]; seen[s] = k
        while stack:
            i = stack.pop()
            for end in T['links'][i][:2]:
                if not passes(T['devs'][end]['t']): continue
                for j, l in enumerate(T['links']):
                    if seen[j] is None and end in l[:2]:
                        seen[j] = k; stack.append(j)
        k += 1
    return seen, k

def same_partition(a, b):
    m = {}
    for x, y in zip(a, b):
        if m.setdefault(x, y) != y: return False
    return len(set(m.values())) == len(m)

def seg_dist(px, py, ax, ay, bx, by):
    dx, dy = bx - ax, by - ay; L = dx * dx + dy * dy or 1
    t = max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / L))
    return math.hypot(ax + t * dx - px, ay + t * dy - py)

tasks = json.load(open(sys.argv[1]))
bad = 0
for T in tasks:
    cd, ncd = domains(T, lambda t: t == 'hub')
    bd, nbd = domains(T, lambda t: t != 'router')
    errs = []
    if ncd != T['sol']['ncd'] or not same_partition(cd, T['sol']['cd']): errs.append('CD')
    if nbd != T['sol']['nbd'] or not same_partition(bd, T['sol']['bd']): errs.append('BD')
    D = T['devs']
    # Geräte überlappen nicht, liegen im Bild, Kabel laufen nicht durch fremde Geräte
    for i, a in enumerate(D):
        if not (30 <= a['x'] <= T['W'] - 30 and 20 <= a['y'] <= T['H'] - 40): errs.append('rand ' + a['name'])
        for b in D[i + 1:]:
            if abs(a['x'] - b['x']) < 70 and abs(a['y'] - b['y']) < 70: errs.append('eng ' + a['name'] + '/' + b['name'])
    for l in T['links']:
        if l[2]: continue
        A, B = D[l[0]], D[l[1]]
        for d in D:
            if d['id'] in l[:2]: continue
            if seg_dist(d['x'], d['y'], A['x'], A['y'], B['x'], B['y']) < 26: errs.append('kreuzt ' + d['name'])
    names = [d['name'] for d in D]
    if len(set(names)) != len(names): errs.append('namen')
    if errs:
        bad += 1
        if bad <= 10: print(T['code'], errs)
print(len(tasks), 'Aufgaben geprüft,', bad, 'Abweichungen')
