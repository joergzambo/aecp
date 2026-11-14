/* NWT · OSPF 3: Multi-Area. Topologie-Generator mit Areas, network-Befehle mit Wildcard, Rollen, LSDB-Sicht, Routing-Tabelle.
   Browser: window.O3 · Node: globalThis.O3 */
(function (G) {
'use strict';
var LVNAME = {L: 'Leicht', M: 'Mittel', S: 'Schwer'};
var LVCODE = {L: 3, M: 4, S: 5};
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function ri(r, a, b) { return a + Math.floor(r() * (b - a + 1)); }
function pick(r, a) { return a[Math.floor(r() * a.length)]; }
function ipn(ip) { return ip.split('.').reduce(function (a, b) { return a * 256 + (+b); }, 0) >>> 0; }
function ips(n) { return [n >>> 24 & 255, n >>> 16 & 255, n >>> 8 & 255, n & 255].join('.'); }
function maskN(p) { return p === 0 ? 0 : (0xFFFFFFFF << (32 - p)) >>> 0; }
function wcOf(p) { return ips((~maskN(p)) >>> 0); }
function maskOf(p) { return ips(maskN(p)); }
/* network-Befehl trifft IP? (Wildcard: 1-Bits egal) */
function hit(ip, net, wc) { var w = ipn(wc); return ((ipn(ip) & ~w) >>> 0) === ((ipn(net) & ~w) >>> 0); }

/* ---------- Topologie-Modell ----------
   T.rs: [{name, x, y, ifs:[{n, ip, p, net, peer, link}], lan:{...}, stmts:[{net, wc, area}]}]
   T.links: [{a, b, net, p, area}], T.lans: [{r, net, p, area}]  – area = Soll-Area (aus der Planung)  */
function areaOfIf(R, ip) { for (var i = 0; i < R.stmts.length; i++) if (hit(ip, R.stmts[i].net, R.stmts[i].wc)) return R.stmts[i].area; return null; }
function areasOf(T, i) { var R = T.rs[i], s = {}; R.ifs.forEach(function (f) { var a = areaOfIf(R, f.ip); if (a !== null) s[a] = 1; }); return Object.keys(s).map(Number).sort(function (a, b) { return a - b; }); }
function role(T, i) { var a = areasOf(T, i); if (a.length > 1) return 'ABR'; return a[0] === 0 ? 'Backbone' : 'Intern'; }
function nets(T) { /* alle Netze mit Area */
  var o = [];
  T.links.forEach(function (l, k) { o.push({net: l.net, p: l.p, area: l.area, link: k, owners: [l.a, l.b]}); });
  T.lans.forEach(function (n, k) { o.push({net: n.net, p: n.p, area: n.area, lan: k, owners: [n.r]}); });
  return o;
}
/* Abstände über Router-Hops (alle Kosten 1) */
function bfs(T, s) {
  var n = T.rs.length, d = [], q = [s], adj = T.rs.map(function () { return []; });
  T.links.forEach(function (l) { adj[l.a].push(l.b); adj[l.b].push(l.a); });
  for (var i = 0; i < n; i++) d.push(Infinity); d[s] = 0;
  while (q.length) { var u = q.shift(); adj[u].forEach(function (v) { if (d[v] === Infinity) { d[v] = d[u] + 1; q.push(v); } }); }
  return {d: d, adj: adj};
}
/* Routing-Tabelle von Router x: Typ C / O / O IA, Kosten, Next-Hop-IPs */
function route(T, x, N) {
  var mine = T.rs[x].ifs.some(function (f) { return f.net === N.net; });
  if (mine) return {type: 'C', cost: 0, via: []};
  var B = bfs(T, x), areas = areasOf(T, x);
  var best = Math.min.apply(null, N.owners.map(function (o) { return B.d[o]; }));
  var cost = best + 1, via = {};
  /* Next Hops: Nachbarn von x, die auf einem kürzesten Weg liegen */
  B.adj[x].forEach(function (v) {
    var Bv = bfs(T, v), dv = Math.min.apply(null, N.owners.map(function (o) { return Bv.d[o]; }));
    if (dv === best - 1) { var l = T.links.filter(function (l) { return (l.a === x && l.b === v) || (l.b === x && l.a === v); })[0]; var f = T.rs[v].ifs.filter(function (f) { return f.net === l.net; })[0]; via[f.ip] = 1; }
  });
  return {type: areas.indexOf(N.area) >= 0 ? 'O' : 'O IA', cost: cost, via: Object.keys(via)};
}

/* ---------- Generator ---------- */
function build(r, lvl) {
  var two = lvl !== 'L', an = pick(r, [[0, 1, 2], [0, 1, 2], [0, 10, 20], [0, 1, 3]]);
  var A1 = an[1], A2 = an[2], base = {}, usedB = {};
  an.forEach(function (a) { var b; do { b = ri(r, 1, 250); } while (usedB[b]); usedB[b] = 1; base[a] = b; });
  var nCore = lvl === 'L' ? ri(r, 1, 2) : lvl === 'M' ? 2 : 3, n1 = lvl === 'L' ? ri(r, 1, 2) : ri(r, 1, 2), n2 = two ? (lvl === 'S' ? 2 : ri(r, 1, 2)) : 0;
  var rs = [], links = [], lans = [];
  function add(x, y, home) { rs.push({x: x, y: y, home: home, ifs: [], stmts: []}); return rs.length - 1; }
  /* Positionen: Area 1 links, Area 0 Mitte, Area 2 rechts */
  var cx = 520, dA = nCore === 3 ? 240 : 170, core = [];
  for (var i = 0; i < nCore; i++) core.push(add(cx, nCore === 1 ? 230 : 110 + i * (240 / (nCore - 1)), 0));
  if (nCore === 3) { rs[core[0]].x = cx - 25; rs[core[2]].x = cx - 25; rs[core[1]].x = cx + 40; }
  var abr1 = add(cx - dA, 230, A1), abr2 = two ? add(cx + dA, 230, A2) : -1;
  if (nCore === 3) { rs[abr1].y = 180; if (two) rs[abr2].y = 290; }
  var in1 = [], in2 = [];
  for (i = 0; i < n1; i++) in1.push(add(cx - dA - 160, n1 === 2 ? (i === 0 ? 150 : 310) : 230, A1));
  for (i = 0; i < n2; i++) in2.push(add(cx + dA + 160, n2 === 2 ? (i === 0 ? 150 : 310) : 230, A2));
  /* Links */
  var k0 = ri(r, 1, 40), kA = {};
  function L(a, b, area) {
    kA[area] = (kA[area] || ri(r, 1, 30) * 4) + 4;
    var net = ips(ipn('10.' + base[area] + '.0.0') + kA[area]);
    links.push({a: a, b: b, net: net, p: 30, area: area});
  }
  for (i = 0; i + 1 < nCore; i++) L(core[i], core[i + 1], 0);
  if (nCore === 3) L(core[0], core[2], 0);
  L(abr1, core[nCore === 3 ? 0 : 0], 0);
  if (two) L(abr2, core[nCore - 1], 0);
  if (n1 === 2) { L(abr1, in1[0], A1); L(abr1, in1[1], A1); if (lvl === 'S' && r() < 0.5) { /* keine Schleife */ } }
  else L(abr1, in1[0], A1);
  if (two) { if (n2 === 2 && lvl === 'S') { L(abr2, in2[0], A2); L(in2[0], in2[1], A2); } else if (n2 === 2) { L(abr2, in2[0], A2); L(abr2, in2[1], A2); } else L(abr2, in2[0], A2); }
  /* LANs: jeder Router ein LAN; beim ABR zufällig Area 0 oder seine andere Area */
  var lk = {};
  rs.forEach(function (R, i) {
    var area = i === abr1 ? pick(r, [0, A1]) : i === abr2 ? pick(r, [0, A2]) : R.home;
    lk[area] = (lk[area] || ri(r, 100, 180)) + ri(r, 1, 6);
    if (lk[area] > 254) return;
    lans.push({r: i, net: '10.' + base[area] + '.' + lk[area] + '.0', p: 24, area: area});
  });
  if (lans.length !== rs.length) return null;
  /* Namen nach Position */
  var order = rs.map(function (_, i) { return i; }).sort(function (a, b) { return rs[a].x - rs[b].x || rs[a].y - rs[b].y; }), ren = [];
  order.forEach(function (i, k) { ren[i] = k; });
  var R2 = order.map(function (i) { return rs[i]; });
  links.forEach(function (l) { l.a = ren[l.a]; l.b = ren[l.b]; });
  lans.forEach(function (n) { n.r = ren[n.r]; });
  R2.forEach(function (R, i) { R.name = 'R' + (i + 1); });
  var T = {base: base, rs: R2, links: links, lans: lans, areas: two ? [A1, 0, A2] : [A1, 0], W: two ? 1000 : 840, cx: cx};
  /* LAN-Richtung: dort, wo am meisten Platz zwischen den Links ist (bevorzugt unten) */
  T.rs.forEach(function (R, i) {
    var angs = T.links.filter(function (l) { return l.a === i || l.b === i; }).map(function (l) { var o = T.rs[l.a === i ? l.b : l.a]; return Math.atan2(o.y - R.y, o.x - R.x); });
    var C = [[0, 58], [66, 0], [-66, 0], [0, -58]], best = C[0], bs = -1;
    C.forEach(function (c, k) { var a = Math.atan2(c[1], c[0]), m = angs.reduce(function (mm, b) { var d = Math.abs(a - b); d = Math.min(d, 2 * Math.PI - d); return Math.min(mm, d); }, 9) - k * 0.05; if (m > bs) { bs = m; best = c; } });
    R.ld = best;
  });
  /* Bild an den Inhalt anpassen: links 70 Rand, rechts 70 Rand */
  var xs = [].concat.apply([], T.rs.map(function (R) { var lx = R.x + R.ld[0]; return [R.x - 62, R.x + 62, R.ld[0] < 0 ? lx - 100 : R.ld[0] > 0 ? lx + 100 : lx - 62, R.ld[0] > 0 ? lx + 100 : lx + 62]; }));
  var minX = Math.min.apply(null, xs) - 10, maxX = Math.max.apply(null, xs) + 10, pad = Math.max(0, (760 - (maxX - minX)) / 2);
  T.rs.forEach(function (R) { R.x = Math.round(R.x - minX + pad); });
  T.W = Math.round(maxX - minX + 2 * pad);
  T.H = Math.max.apply(null, T.rs.map(function (R) { return R.y + Math.max(0, R.ld[1]) + 52; }));
  /* Interfaces */
  T.rs.forEach(function (R) { R.ifs = []; });
  T.links.forEach(function (l, k) {
    [[l.a, 1, l.b], [l.b, 2, l.a]].forEach(function (e) { var R = T.rs[e[0]]; R.ifs.push({n: 'Gi0/' + R.ifs.length, ip: ips(ipn(l.net) + e[1]), p: 30, net: l.net, peer: e[2], link: k}); });
  });
  T.lans.forEach(function (n) { var R = T.rs[n.r]; R.ifs.push({n: 'Gi0/' + R.ifs.length, ip: ips(ipn(n.net) + 1), p: 24, net: n.net, lan: true}); });
  /* network-Befehle je nach Stufe */
  T.rs.forEach(function (R, i) {
    var byArea = {};
    R.ifs.forEach(function (f) { var a = f.lan ? T.lans.filter(function (n) { return n.net === f.net; })[0].area : T.links[f.link].area; (byArea[a] = byArea[a] || []).push(f); });
    var as = Object.keys(byArea).map(Number), styles = lvl === 'L' ? ['exact'] : lvl === 'M' ? ['exact', 'host', 'area'] : ['exact', 'host', 'area', 'area', 'all'];
    var st = pick(r, styles);
    if (st === 'all' && as.length > 1) st = 'area';
    R.style = st;
    if (st === 'all') R.stmts = [{net: '0.0.0.0', wc: '255.255.255.255', area: as[0]}];
    else if (st === 'area') R.stmts = as.map(function (a) { return {net: '10.' + T.base[a] + '.0.0', wc: '0.0.255.255', area: a}; });
    else R.stmts = [].concat.apply([], as.map(function (a) { return byArea[a].map(function (f) { return st === 'host' ? {net: f.ip, wc: '0.0.0.0', area: a} : {net: f.net, wc: wcOf(f.p), area: a}; }); }));
    R.passive = R.ifs.filter(function (f) { return f.lan; }).map(function (f) { return f.n; });
  });
  return T;
}
function makeTask(seed, lvl) {
  if (!LVCODE[lvl] || !(seed >= 1)) return null;
  for (var att = 0; att < 300; att++) {
    var r = mulberry32((seed * 7919 + att * 104729 + LVCODE[lvl] * 1000003 + 3301) >>> 0);
    var T = build(r, lvl); if (!T) continue;
    /* Konsistenz: jedes Interface landet in der geplanten Area */
    var ok = T.rs.every(function (R) { return R.ifs.every(function (f) { var want = f.lan ? T.lans.filter(function (n) { return n.net === f.net; })[0].area : T.links[f.link].area; return areaOfIf(R, f.ip) === want; }); });
    if (!ok) continue;
    /* gefragter Router: bevorzugt intern in einer Nicht-Backbone-Area */
    var cand = T.rs.map(function (_, i) { return i; }).filter(function (i) { return role(T, i) === 'Intern'; });
    T.x = cand.length && r() < 0.75 ? pick(r, cand) : ri(r, 0, T.rs.length - 1);
    var all = nets(T), mineL = all.filter(function (N) { return route(T, T.x, N).type === 'C' && N.lan !== undefined; });
    var other = all.filter(function (N) { return route(T, T.x, N).type !== 'C'; });
    /* gefragt: eigenes LAN + alle fremden LANs + (ab Mittel) zwei Transitnetze */
    var ask = mineL.slice(0, 1).concat(other.filter(function (N) { return N.lan !== undefined; }));
    if (lvl !== 'L') ask = ask.concat(other.filter(function (N) { return N.link !== undefined; }).sort(function () { return r() - 0.5; }).slice(0, 2));
    T.ask = ask.sort(function (a, b) { return ipn(a.net) - ipn(b.net); });
    T.level = lvl; T.code = lvl + '-' + seed;
    return T;
  }
  return null;
}

/* ---------- Texte ---------- */
function config(T, i) {
  var R = T.rs[i], o = 'hostname ' + R.name + '\n!\n';
  R.ifs.forEach(function (f) { o += 'interface GigabitEthernet' + f.n.slice(2) + '\n ip address ' + f.ip + ' ' + maskOf(f.p) + '\n!\n'; });
  o += 'router ospf 1\n router-id ' + (i + 1) + '.' + (i + 1) + '.' + (i + 1) + '.' + (i + 1) + '\n';
  R.passive.forEach(function (p) { o += ' passive-interface GigabitEthernet' + p.slice(2) + '\n'; });
  R.stmts.forEach(function (s) { o += ' network ' + s.net + ' ' + s.wc + ' area ' + s.area + '\n'; });
  return o.replace(/\n$/, '');
}
function routeLine(T, x, N) {
  var rt = route(T, x, N), pre = N.net + '/' + N.p;
  if (rt.type === 'C') { var f = T.rs[x].ifs.filter(function (f) { return f.net === N.net; })[0]; return 'C        ' + pre + ' is directly connected, GigabitEthernet' + f.n.slice(2); }
  return rt.via.map(function (v, k) { var f = T.rs[x].ifs.filter(function (f) { return T.rs[f.peer] && T.rs[f.peer].ifs.some(function (g) { return g.ip === v; }); })[0];
    return (k ? '                ' : (rt.type === 'O' ? 'O        ' : 'O IA     ') + pre) + ' [110/' + rt.cost + '] via ' + v + ', GigabitEthernet' + f.n.slice(2); }).join('\n');
}

/* ---------- Zeichnen ---------- */
var ACOL = {0: '#1565c0'}, APAL = ['#2e7d32', '#e65100', '#6a1b9a', '#00838f'];
function acol(T, a) { if (a === 0) return '#1565c0'; var o = T.areas.filter(function (x) { return x !== 0; }); return APAL[o.indexOf(a) % APAL.length]; }
function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); }
function tx(x, y, t, o) { o = o || {}; return '<text x="' + x + '" y="' + y + '" text-anchor="' + (o.a || 'middle') + '" font-size="' + (o.fs || 13) + '" font-weight="' + (o.fw || 400) + '" fill="' + (o.c || '#1c2b33') + '" font-family="' + (o.mono ? 'ui-monospace,Menlo,Consolas,monospace' : 'Open Sans,Arial,sans-serif') + '"' + (o.halo ? ' stroke="#fbfcfd" stroke-width="4" stroke-linejoin="round" paint-order="stroke"' : '') + '>' + esc(t) + '</text>'; }
var ICON_R = '<ellipse cx="0" cy="7" rx="22" ry="8" fill="#1f5872"/><rect x="-22" y="-7" width="44" height="14" fill="#2f7392"/><ellipse cx="0" cy="-7" rx="22" ry="8" fill="#5a9dbb" stroke="#1f5872"/><path d="M-11 -7h7M4 -7h7M-1 -12v4M-1 -5v4" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>';
/* opt: {areas:true (Areas einfärben), hideAreas, sel: Router, x: gefragter Router, roles:true, hot:{k:1}, down:{k:1}} */
function draw(T, opt) {
  opt = opt || {};
  var W = T.W, H = T.H, o = ['<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="OSPF-Netz mit Areas">'];
  if (!opt.hideAreas) {
    /* Area-Blasen: Rechteck um alle Router (und LANs), die in der Area ein Interface haben */
    T.areas.slice().sort(function (a, b) { return (a === 0) - (b === 0); }).forEach(function (a) {
      var pts = [];
      T.rs.forEach(function (R, i) { if (R.ifs.some(function (f) { var A = f.lan ? T.lans.filter(function (n) { return n.net === f.net; })[0].area : T.links[f.link].area; return A === a; })) pts.push([R.x, R.y]); });
      T.lans.forEach(function (n) { if (n.area === a) { var R = T.rs[n.r], lx = R.x + R.ld[0], ly = R.y + R.ld[1] + (R.ld[1] > 0 ? 8 : 0); pts.push([lx, ly]); if (R.ld[0]) pts.push([R.ld[0] < 0 ? lx - 38 : lx + 38, ly]); } });
      if (!pts.length) return;
      var x0 = Math.min.apply(null, pts.map(function (p) { return p[0]; })) - 62, x1 = Math.max.apply(null, pts.map(function (p) { return p[0]; })) + 62;
      var y0 = Math.min.apply(null, pts.map(function (p) { return p[1]; })) - 52, y1 = Math.max.apply(null, pts.map(function (p) { return p[1]; })) + 36, c = acol(T, a);
      o.push('<rect x="' + x0 + '" y="' + y0 + '" width="' + (x1 - x0) + '" height="' + (y1 - y0) + '" rx="22" fill="' + c + '" fill-opacity="' + (a === 0 ? 0.07 : 0.06) + '" stroke="' + c + '" stroke-width="2" stroke-dasharray="' + (a === 0 ? '0' : '8 5') + '"/>');
      o.push(tx(x0 + 14, y0 + 20, a === 0 ? 'Area 0 (Backbone)' : 'Area ' + a, {a: 'start', fs: 14, fw: 700, c: c}));
    });
  }
  var occ = [];
  T.rs.forEach(function (R) { occ.push([R.x - 34, R.y - 34, R.x + 34, R.y + 31]); var lx = R.x + R.ld[0], ly = R.y + R.ld[1]; occ.push(R.ld[0] < 0 ? [lx - 82, ly - 10, lx + 22, ly + 28] : R.ld[0] > 0 ? [lx - 22, ly - 10, lx + 82, ly + 28] : [lx - 50, ly - 10, lx + 50, ly + 28]); });
  var labels = [];
  T.links.forEach(function (l, k) {
    var A = T.rs[l.a], B = T.rs[l.b], s = l.net + '/30', w = s.length * 6.7, best = null, bs = 1e9;
    [[0.5, 1], [0.5, -1], [0.35, 1], [0.65, 1], [0.35, -1], [0.65, -1]].forEach(function (c, ci) {
      var dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L; if (ny > 0) { nx = -nx; ny = -ny; }
      var px = A.x + dx * c[0] + nx * 10 * c[1], py = A.y + dy * c[0] + ny * 10 * c[1] + (c[1] < 0 ? 10 : 0), b = [px - w / 2, py - 11, px + w / 2, py + 3], sc = ci;
      occ.concat(labels).forEach(function (q) { var ox = Math.min(b[2], q[2]) - Math.max(b[0], q[0]), oy = Math.min(b[3], q[3]) - Math.max(b[1], q[1]); if (ox > 0 && oy > 0) sc += 50 + ox * oy; });
      T.links.forEach(function (m, j) { if (j === k) return; var P = T.rs[m.a], Q = T.rs[m.b]; for (var t = 0.05; t < 0.95; t += 0.05) { var x = P.x + (Q.x - P.x) * t, y = P.y + (Q.y - P.y) * t; if (x > b[0] && x < b[2] && y > b[1] && y < b[3]) sc += 20; } });
      if (sc < bs) { bs = sc; best = [px, py, b]; }
    });
    labels.push(best[2]); l.lp = best;
  });
  T.links.forEach(function (l, k) {
    var A = T.rs[l.a], B = T.rs[l.b], dn = opt.down && opt.down[k], hot = opt.hot && opt.hot[k];
    if (hot) o.push('<line x1="' + A.x + '" y1="' + A.y + '" x2="' + B.x + '" y2="' + B.y + '" stroke="#f9a825" stroke-width="9" stroke-linecap="round"/>');
    o.push('<line x1="' + A.x + '" y1="' + A.y + '" x2="' + B.x + '" y2="' + B.y + '" stroke="' + (dn ? '#c62828' : '#1c2b33') + '" stroke-width="2.5"' + (dn ? ' stroke-dasharray="7 5"' : '') + '/>');
    var mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
    if (dn) o.push('<g transform="translate(' + mx + ' ' + my + ')"><circle r="12" fill="#c62828"/><path d="M-4.5 -4.5l9 9M4.5 -4.5l-9 9" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></g>');
    else if (!opt.noNets) o.push(tx(l.lp[0], l.lp[1], l.net + '/30', {fs: 11, c: '#455a64', halo: 1, mono: 1}));
  });
  T.lans.forEach(function (n, k) {
    var R = T.rs[n.r], x = R.x + R.ld[0], y = R.y + R.ld[1], dn = opt.lanDown === k;
    o.push('<line x1="' + R.x + '" y1="' + R.y + '" x2="' + x + '" y2="' + y + '" stroke="' + (dn ? '#c62828' : '#1c2b33') + '" stroke-width="2"' + (dn ? ' stroke-dasharray="5 4"' : '') + '/>');
    if (dn) o.push('<g transform="translate(' + (R.x + x) / 2 + ' ' + (R.y + y) / 2 + ')"><circle r="10" fill="#c62828"/><path d="M-4 -4l8 8M4 -4l-8 8" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/></g>');
    o.push('<g transform="translate(' + x + ' ' + y + ')"><path d="M-18 -3l6 -6h28l-6 6z" fill="#6aaecb" stroke="#1f5872"/><path d="M-18 -3h28v9h-28z" fill="#2f7392"/></g>');
    o.push(tx(R.ld[0] < 0 ? x + 20 : R.ld[0] > 0 ? x - 20 : x, y + 22, n.net + '/24', {a: R.ld[0] < 0 ? 'end' : R.ld[0] > 0 ? 'start' : 'middle', fs: 11, c: '#455a64', halo: 1, mono: 1}));
  });
  T.rs.forEach(function (R, i) {
    if (opt.sel === i || opt.x === i) o.push('<circle cx="' + R.x + '" cy="' + R.y + '" r="34" fill="#fff59d" stroke="#f9a825" stroke-width="2.5"/>');
    o.push('<g transform="translate(' + R.x + ' ' + R.y + ')"' + (opt.click ? ' data-r="' + i + '" style="cursor:pointer"' : '') + '><circle r="30" fill="transparent"/>' + ICON_R + '</g>');
    o.push(tx(R.x, R.y - 20, R.name, {fs: 15, fw: 700, halo: 1}));
    if (opt.roles) { var ro = role(T, i), c = ro === 'ABR' ? '#6a1b9a' : ro === 'Backbone' ? '#1565c0' : '#455a64'; o.push('<rect x="' + (R.x - 34) + '" y="' + (R.y + 13) + '" width="68" height="17" rx="8.5" fill="' + c + '"/>' + tx(R.x, R.y + 25.5, ro === 'Intern' ? 'intern' : ro, {fs: 11, fw: 700, c: '#fff'})); }
  });
  o.push('<g class="pk"></g></svg>');
  return o.join('');
}
/* Feste Beispiel-Topologie für den Erkunder */
var EX = null;
function example() { if (!EX) { for (var s = 1; s < 500; s++) { var T = makeTask(s, 'M'); if (T && T.rs.length === 7 && T.areas[0] === 1 && T.areas[2] === 2) { EX = T; break; } } } return EX; }

G.O3 = {LVNAME: LVNAME, makeTask: makeTask, areasOf: areasOf, areaOfIf: areaOfIf, role: role, nets: nets, route: route, routeLine: routeLine, config: config, draw: draw, acol: acol, example: example, hit: hit, wcOf: wcOf};
})(typeof window !== 'undefined' ? window : globalThis);
