"""Unabhängige Gegenrechnung OSPF 1 / Dijkstra (heapq + Brute-Force-Pfadsuche).

node export.js > aufgaben.json && python3 check.py aufgaben.json
Geprüft wird: Kosten, Vorgänger, Next Hop und Reihenfolge stimmen; die Lösung ist eindeutig
(kein zweiter Weg mit gleichen Kosten, keine gleich teuren Router beim Fixieren); das Netz ist zusammenhängend,
Links kreuzen sich nicht; ab Mittel gibt es einen Nachbarn, der über einen Umweg billiger ist als direkt.
"""
import heapq
import json
import sys


def dijkstra(n, edges, s):
    adj = [[] for _ in range(n)]
    for a, b, w, *_ in edges:
        adj[a].append((b, w)); adj[b].append((a, w))
    dist = [None] * n
    pq = [(0, s)]
    order = []
    while pq:
        d, u = heapq.heappop(pq)
        if dist[u] is not None:
            continue
        dist[u] = d; order.append(u)
        for v, w in adj[u]:
            if dist[v] is None:
                heapq.heappush(pq, (d + w, v))
    return dist, order, adj


def all_paths_count(n, adj, s, dist):
    """Anzahl der billigsten Wege je Ziel (für Eindeutigkeit)."""
    cnt = [0] * n; cnt[s] = 1
    for u in sorted(range(n), key=lambda x: dist[x]):
        for v, w in adj[u]:
            if dist[u] + w == dist[v]:
                cnt[v] += cnt[u]
    return cnt


def crosses(p1, p2, p3, p4):
    def o(a, b, c):
        return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
    if len({p1, p2, p3, p4}) < 4:
        return False
    return o(p1, p2, p3) * o(p1, p2, p4) < 0 and o(p3, p4, p1) * o(p3, p4, p2) < 0


def main(path):
    data = json.load(open(path)); bad = 0
    for t in data:
        n, s = t['n'], t['src']
        E = [e[:3] for e in t['edges']]
        if 'B-' in t['code']:
            if any(e[3] is None or e[2] != max(1, 1000 // e[3]) for e in t['edges']): print(t['code'], 'Bandbreite/Kosten falsch'); bad += 1
        elif any(e[3] is not None for e in t['edges']): print(t['code'], 'Bandbreite bei Zahlen-Aufgabe'); bad += 1
        dist, order, adj = dijkstra(n, E, s)
        err = []
        if None in dist: err.append('nicht zusammenhängend')
        if dist != t['d']: err.append('Kosten')
        cnt = all_paths_count(n, adj, s, dist)
        if any(c != 1 for c in cnt): err.append('mehrdeutiger Weg')
        if len(set(dist)) != n: err.append('gleiche Kosten -> Reihenfolge mehrdeutig')
        if order != t['order']: err.append('Reihenfolge')
        for v in range(n):
            if v == s:
                if t['p'][v] != -1 or t['nh'][v] != -1: err.append('Start')
                continue
            preds = [u for u, w in adj[v] if dist[u] + w == dist[v]]
            if preds != [t['p'][v]]: err.append('Vorgänger ' + str(v))
            x = v
            while t['p'][x] != s: x = t['p'][x]
            if x != t['nh'][v] or not any(u == x for u, _ in adj[s]): err.append('Next Hop ' + str(v))
        xy = [tuple(p) for p in t['xy']]
        for i in range(len(E)):
            for j in range(i + 1, len(E)):
                if crosses(xy[E[i][0]], xy[E[i][1]], xy[E[j][0]], xy[E[j][1]]): err.append('Links kreuzen')
        if t['code'][0] != 'L' and not any((a == s and dist[b] < w) or (b == s and dist[a] < w) for a, b, w in E):
            err.append('keine Umweg-Falle')
        if err:
            bad += 1; print(t['code'], sorted(set(err)))
    print(len(data), 'Aufgaben geprüft,', bad, 'Abweichungen')
    sys.exit(1 if bad else 0)


main(sys.argv[1])
