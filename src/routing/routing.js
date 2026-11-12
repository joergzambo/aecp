/* AECP · Statisches Routing und RIP: Topologie-Generator, schnellster Weg, Prüfung von ip route- und RIP-Befehlen, Zeichnen.
   Browser: window.RT · Node: globalThis.RT */
(function (G) {
'use strict';

var LVNAME = {B: 'Beispiel', L: 'Leicht', M: 'Mittel', S: 'Schwer'};
var LVCODE = {B: 1, L: 3, M: 4, S: 5};
var COST = {gig: 1, ser: 64};   /* wie OSPF: Serial (1,544 Mbit/s) ist viel langsamer als Gigabit */

function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function ri(r, a, b) { return a + Math.floor(r() * (b - a + 1)); }
function pick(r, a) { return a[Math.floor(r() * a.length)]; }
function shuffle(r, a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

/* ---------- IP-Rechnen ---------- */
function ip2n(ip) { return ip.split('.').reduce(function (a, b) { return a * 256 + (+b); }, 0); }
function n2ip(n) { return [n >>> 24 & 255, n >>> 16 & 255, n >>> 8 & 255, n & 255].join('.'); }
function pmask(p) { return p === 0 ? 0 : (0xFFFFFFFF << (32 - p)) >>> 0; }
function maskTxt(p) { return n2ip(pmask(p)); }
function isIp(s) { return /^\d{1,3}(\.\d{1,3}){3}$/.test(s) && s.split('.').every(function (x) { return +x <= 255; }); }
function mask2p(s) { if (!isIp(s)) return -1; var n = ip2n(s); for (var p = 0; p <= 32; p++) if (pmask(p) === n) return p; return -1; }
function netOf(ip, p) { return n2ip((ip2n(ip) & pmask(p)) >>> 0); }
function classful(ip) { var a = +ip.split('.')[0]; var p = a < 128 ? 8 : a < 192 ? 16 : 24; return {net: netOf(ip, p), p: p, cls: a < 128 ? 'A' : a < 192 ? 'B' : 'C'}; }
function overlap(a, b) { var p = Math.min(a.p, b.p); return netOf(a.net, p) === netOf(b.net, p); }

/* ---------- Topologie ---------- */
/* T.routers[i] = {name,x,y,lans:[{net,p}],lanIf,sw:{x,y}}; T.links[k] = {a,b,type,net,p:30,ipA,ipB,ifA,ifB} */
function nets(T) {
  var out = [];
  T.links.forEach(function (l, k) { out.push({net: l.net, p: l.p, kind: 'link', link: k, owners: [l.a, l.b]}); });
  T.routers.forEach(function (r, i) { r.lans.forEach(function (n) { out.push({net: n.net, p: n.p, kind: 'lan', owners: [i]}); }); });
  return out;
}
function direct(T, ri_) { return nets(T).filter(function (n) { return n.owners.indexOf(ri_) >= 0; }); }
function ipsOf(T, ri_) {
  var o = [];
  T.links.forEach(function (l, k) { if (l.a === ri_) o.push({ip: l.ipA, ifn: l.ifA, link: k}); if (l.b === ri_) o.push({ip: l.ipB, ifn: l.ifB, link: k}); });
  return o;
}
function ipOwner(T, ip) {
  for (var k = 0; k < T.links.length; k++) { var l = T.links[k]; if (l.ipA === ip) return {r: l.a, link: k}; if (l.ipB === ip) return {r: l.b, link: k}; }
  return null;
}

/* Kürzeste Wege (Dijkstra) */
function dist(T, src) {
  var n = T.routers.length, d = [], done = [];
  for (var i = 0; i < n; i++) { d.push(Infinity); done.push(false); }
  d[src] = 0;
  for (var it = 0; it < n; it++) {
    var u = -1; for (i = 0; i < n; i++) if (!done[i] && (u < 0 || d[i] < d[u])) u = i;
    if (u < 0 || d[u] === Infinity) break; done[u] = true;
    T.links.forEach(function (l) { var v = l.a === u ? l.b : l.b === u ? l.a : -1; if (v >= 0 && d[u] + COST[l.type] < d[v]) d[v] = d[u] + COST[l.type]; });
  }
  return d;
}
/* Für Router src: alle Routen zu nicht direkt verbundenen Netzen mit allen gleich guten Next Hops */
function routes(T, src) {
  var D = T.routers.map(function (_, i) { return dist(T, i); });
  var out = [];
  nets(T).forEach(function (n) {
    if (n.owners.indexOf(src) >= 0) return;
    var dn = function (r) { return Math.min.apply(null, n.owners.map(function (o) { return D[r][o]; })); };
    var best = dn(src), hops = [];
    T.links.forEach(function (l, k) {
      var nb = l.a === src ? l.b : l.b === src ? l.a : -1; if (nb < 0) return;
      if (COST[l.type] + dn(nb) === best) hops.push({ip: l.a === src ? l.ipB : l.ipA, ifn: l.a === src ? l.ifA : l.ifB, r: nb, link: k});
    });
    out.push({net: n.net, p: n.p, kind: n.kind, hops: hops, cost: best, path: path(T, D, src, n)});
  });
  return out.sort(function (a, b) { return ip2n(a.net) - ip2n(b.net); });
}
/* ein schnellster Weg als Router-Liste (für die Erklärung) */
function path(T, D, src, n) {
  var cur = src, p = [src], guard = 0;
  while (n.owners.indexOf(cur) < 0 && guard++ < 20) {
    var dn = function (r) { return Math.min.apply(null, n.owners.map(function (o) { return D[r][o]; })); };
    var best = dn(cur), nx = -1;
    T.links.forEach(function (l) { var nb = l.a === cur ? l.b : l.b === cur ? l.a : -1; if (nb >= 0 && nx < 0 && COST[l.type] + dn(nb) === best) nx = nb; });
    cur = nx; p.push(cur);
  }
  return p;
}
function ripNets(T, ri_) {
  var seen = {}, out = [];
  direct(T, ri_).forEach(function (n) { var c = classful(n.net); if (!seen[c.net]) { seen[c.net] = {net: c.net, cls: c.cls, from: []}; out.push(seen[c.net]); } seen[c.net].from.push(n.net + '/' + n.p); });
  return out;
}

/* ---------- Beispiel ---------- */
function example() {
  var T = {routers: [
    {name: 'R1', x: 120, y: 200, lans: [{net: '192.168.1.0', p: 24}], lanIf: 'Gi0/2'},
    {name: 'R2', x: 420, y: 200, lans: [{net: '192.168.2.0', p: 24}], lanIf: 'Gi0/2'},
    {name: 'R3', x: 720, y: 200, lans: [{net: '192.168.3.0', p: 24}], lanIf: 'Gi0/2'}],
    links: [
      {a: 0, b: 1, type: 'gig', net: '10.0.0.0', p: 30, ipA: '10.0.0.1', ipB: '10.0.0.2', ifA: 'Gi0/0', ifB: 'Gi0/0'},
      {a: 1, b: 2, type: 'gig', net: '10.0.0.4', p: 30, ipA: '10.0.0.5', ipB: '10.0.0.6', ifA: 'Gi0/1', ifB: 'Gi0/0'}]};
  T.routers.forEach(function (r) { r.sw = {x: r.x, y: r.y - 110}; });
  return T;
}

/* ---------- Generator ---------- */
var CFG = {
  L: {n: [3, 4], extra: [0, 0], ser: 0, lan2: 0, styles: ['sym', 'ten']},
  M: {n: [4, 4], extra: [1, 1], ser: 0.35, lan2: 0.25, styles: ['sym', 'ten', 'seq']},
  S: {n: [5, 6], extra: [1, 3], ser: 0.4, lan2: 0.45, styles: ['sym', 'seq', 'seq']}
};
function segX(p, q, r, s) {
  function o(a, b, c) { var v = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]); return v > 0 ? 1 : v < 0 ? -1 : 0; }
  return o(p, q, r) !== o(p, q, s) && o(r, s, p) !== o(r, s, q);
}
function segDist(px, py, ax, ay, bx, by) { var dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L)); return Math.hypot(ax + t * dx - px, ay + t * dy - py); }

function topo(r, lvl) {
  var c = CFG[lvl], n = ri(r, c.n[0], c.n[1]), cols = n > 4 ? 3 : (n === 4 ? pick(r, [2, 3]) : 3), rows = 2;
  var cells = []; for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) cells.push([x, y]);
  if (cols * rows < n) return null;
  shuffle(r, cells); cells = cells.slice(0, n);
  var R = cells.map(function (cl, i) { return {cx: cl[0], cy: cl[1], x: 130 + cl[0] * 330 + ri(r, -25, 25) + (cl[1] % 2 ? 40 : 0), y: 150 + cl[1] * 270 + ri(r, -20, 20)}; });
  var cand = [];
  for (var i = 0; i < n; i++) for (var j = i + 1; j < n; j++) if (Math.abs(R[i].cx - R[j].cx) <= 1 && Math.abs(R[i].cy - R[j].cy) <= 1) cand.push([i, j]);
  shuffle(r, cand);
  var par = []; for (i = 0; i < n; i++) par.push(i);
  function f(x) { return par[x] === x ? x : (par[x] = f(par[x])); }
  var E = [];
  function ok(e) {
    var A = [R[e[0]].x, R[e[0]].y], B = [R[e[1]].x, R[e[1]].y];
    for (var k = 0; k < E.length; k++) { var q = E[k]; if (q[0] === e[0] || q[0] === e[1] || q[1] === e[0] || q[1] === e[1]) continue; if (segX(A, B, [R[q[0]].x, R[q[0]].y], [R[q[1]].x, R[q[1]].y])) return false; }
    for (k = 0; k < n; k++) if (k !== e[0] && k !== e[1] && segDist(R[k].x, R[k].y, A[0], A[1], B[0], B[1]) < 70) return false;
    return true;
  }
  cand.forEach(function (e) { if (f(e[0]) !== f(e[1]) && ok(e)) { par[f(e[0])] = f(e[1]); E.push(e); } });
  if (E.length !== n - 1) return null;
  var extra = ri(r, c.extra[0], c.extra[1]);
  cand.forEach(function (e) { if (extra > 0 && !E.some(function (q) { return q[0] === e[0] && q[1] === e[1]; }) && ok(e)) { E.push(e); extra--; } });
  if (extra > 0) return null;
  return {R: R, E: E};
}

function makeTask(seed, lvl) {
  lvl = String(lvl).toUpperCase();
  if (lvl === 'B') { if (seed !== 1) return null; var B = example(); B.code = 'B-1'; B.level = 'B'; B.ask = {st: 0, rip: 1}; return frame(B); }
  if (!CFG[lvl] || !(seed >= 1)) return null;
  for (var att = 0; att < 300; att++) {
    var r = mulberry32((seed * 7919 + att * 104729 + LVCODE[lvl] * 1000003) >>> 0);
    var g = topo(r, lvl); if (!g) continue;
    var T = build(r, lvl, g); if (!T) continue;
    if (!good(T, lvl)) continue;
    T.code = lvl + '-' + seed; T.level = lvl;
    return frame(T);
  }
  return null;
}

function build(r, lvl, g) {
  var c = CFG[lvl], n = g.R.length;
  /* Namen in Lesereihenfolge */
  var order = g.R.map(function (_, i) { return i; }).sort(function (a, b) { return g.R[a].cy - g.R[b].cy || g.R[a].x - g.R[b].x; });
  var T = {routers: g.R.map(function (p) { return {name: '', x: p.x, y: p.y, cy: p.cy, lans: []}; }), links: []};
  order.forEach(function (i, k) { T.routers[i].name = 'R' + (k + 1); });
  var gi = T.routers.map(function () { return 0; }), si = T.routers.map(function () { return 0; });
  var style = pick(r, c.styles), used = {}, all = [], seqBase = pick(r, ['10.0.0.0', '172.16.0.0', '192.168.100.0']), seqI = 0;
  function nextIf(i, type) { return type === 'gig' ? 'Gi0/' + (gi[i]++) : 'Se0/' + (si[i]++ + 1) + '/0'; }
  function linkNet() {
    for (var t = 0; t < 50; t++) {
      var net;
      if (style === 'sym') { var d = ri(r, 1, 9); net = d + '.' + d + '.' + d + '.0'; }
      else if (style === 'ten') net = '10.0.' + ri(r, 1, 60) + '.0';
      else net = n2ip(ip2n(seqBase) + 4 * (seqI++));
      if (!used[net]) { used[net] = 1; return net; }
    }
    return null;
  }
  shuffle(r, g.E);
  for (var k = 0; k < g.E.length; k++) {
    var e = g.E[k], type = r() < c.ser ? 'ser' : 'gig', net = linkNet(); if (!net) return null;
    var a = e[0], b = e[1]; if (r() < 0.5) { a = e[1]; b = e[0]; }
    var base = ip2n(net);
    T.links.push({a: a, b: b, type: type, net: net, p: 30, ipA: n2ip(base + 1), ipB: n2ip(base + 2), ifA: nextIf(a, type), ifB: nextIf(b, type)});
    all.push({net: net, p: 30});
  }
  /* LANs */
  var lanStyles = lvl === 'S' ? ['c', 'c', 'b', 'a'] : ['c'];
  for (var i = 0; i < n; i++) {
    var cnt = r() < c.lan2 ? 2 : 1, st = pick(r, lanStyles);
    for (var j = 0; j < cnt; j++) {
      var L = null;
      for (var t = 0; t < 40 && !L; t++) {
        var cand = st === 'c' ? {net: '192.168.' + ri(r, 0, 60) + '.0', p: 24} : st === 'b' ? {net: '172.16.' + ri(r, 1, 40) + '.0', p: 24} : {net: '10.' + ri(r, 1, 30) + '.0.0', p: 16};
        if (!all.some(function (x) { return overlap(x, cand); })) L = cand;
      }
      if (!L) return null;
      all.push(L); T.routers[i].lans.push(L);
    }
    T.routers[i].lanIf = 'Gi0/' + (gi[i]++);
  }
  T.routers.forEach(function (rt, i) { rt.lans.sort(function (x, y) { return ip2n(x.net) - ip2n(y.net); }); placeSwitch(T, i); });
  if (T.routers.some(function (rt) { return !rt.sw; })) return null;
  /* gefragte Router: statische Routen dort, wo es viele fremde Netze gibt; RIP auf einem anderen */
  var idx = T.routers.map(function (_, i) { return i; });
  shuffle(r, idx);
  T.ask = {st: idx[0], rip: idx[1]};
  return T;
}

function placeSwitch(T, i) {
  var rt = T.routers[i], angs = [];
  T.links.forEach(function (l) { var o = l.a === i ? l.b : l.b === i ? l.a : -1; if (o >= 0) angs.push(Math.atan2(T.routers[o].y - rt.y, T.routers[o].x - rt.x)); });
  var best = null, bs = -1;
  for (var a = 0; a < 16; a++) {
    var ang = a / 16 * 2 * Math.PI - Math.PI, gap = Math.PI;
    angs.forEach(function (b) { var d = Math.abs(Math.atan2(Math.sin(ang - b), Math.cos(ang - b))); if (d < gap) gap = d; });
    /* bevorzugt nach außen (oben bei oberer Reihe, unten bei unterer) */
    var pref = (rt.cy === 0 ? -Math.sin(ang) : Math.sin(ang)) * 0.35;
    var sx = rt.x + Math.cos(ang) * 110, sy = rt.y + Math.sin(ang) * 110;
    var clear = T.routers.every(function (o, k) { return k === i || Math.hypot(o.x - sx, o.y - sy) > 150; }) &&
      T.links.every(function (l) { var A = T.routers[l.a], B = T.routers[l.b]; return l.a === i || l.b === i ? true : segDist(sx, sy, A.x, A.y, B.x, B.y) > 90; });
    if (!clear) continue;
    var sc = gap + pref;
    if (sc > bs) { bs = sc; best = {x: Math.round(sx), y: Math.round(sy), ang: ang}; }
  }
  if (best && bs > 0.9) rt.sw = best;
}

function good(T, lvl) {
  var st = routes(T, T.ask.st);
  if (st.length < (lvl === 'L' ? 3 : 5) || st.length > (lvl === 'S' ? 12 : 8)) return false;
  if (lvl !== 'L' && !st.some(function (x) { return x.path.length > 2; })) return false;
  if (lvl === 'S') {
    /* Schwer: mindestens ein Weg, bei dem „schnell“ etwas anderes heißt als „wenigste Hops“, oder zwei Netze in einem Klassennetz */
    var rp = ripNets(T, T.ask.rip), dup = rp.some(function (x) { return x.from.length > 1; });
    var hasSer = T.links.some(function (l) { return l.type === 'ser'; });
    if (!dup || !hasSer) return false;
  }
  if (lvl === 'M' && !T.links.some(function (l) { return l.type === 'ser'; })) return false;
  return true;
}

function frame(T) {
  var xs = [], ys = [];
  T.routers.forEach(function (r) { xs.push(r.x - 60, r.x + 60); ys.push(r.y - 50, r.y + 50); if (r.sw) { xs.push(r.sw.x - 80, r.sw.x + 80); ys.push(r.sw.y - 30 - 16 * r.lans.length, r.sw.y + 30 + 16 * r.lans.length); } });
  var x0 = Math.min.apply(null, xs), y0 = Math.min.apply(null, ys);
  T.routers.forEach(function (r) { r.x = Math.round(r.x - x0 + 10); r.y = Math.round(r.y - y0 + 10); if (r.sw) { r.sw.x = Math.round(r.sw.x - x0 + 10); r.sw.y = Math.round(r.sw.y - y0 + 10); } });
  T.W = Math.round(Math.max.apply(null, xs) - x0 + 20); T.H = Math.round(Math.max.apply(null, ys) - y0 + 20);
  return T;
}

/* ---------- Prüfen: ip route ---------- */
function normIf(s) {
  var m = /^(g|gi|gig|giga|gigabit|gigabitethernet|s|se|ser|serial|f|fa|fastethernet)\s*(\d+(\/\d+)*)$/i.exec(s.replace(/\s+/g, ''));
  if (!m) return null; var t = m[1][0].toLowerCase();
  return (t === 'g' ? 'Gi' : t === 's' ? 'Se' : 'Fa') + m[2];
}
function cleanLines(txt) {
  return txt.split(/\r?\n/).map(function (l, i) { return {no: i + 1, raw: l, t: l.replace(/^\s*[\w-]+(\([\w-]+\))?#\s*/, '').trim().replace(/\s+/g, ' ')}; })
    .filter(function (l) { return l.t && !/^(en|ena|enable|conf|config|configure|conf t|configure terminal|end|exit|wr|write|copy run start|copy running-config startup-config|do .*|!.*)$/i.test(l.t); });
}

function gradeStatic(T, txt) {
  var src = T.ask.st, rt = T.routers[src], R = routes(T, src), all = nets(T), dir = direct(T, src);
  var res = [], got = {}, okCount = 0;
  cleanLines(txt).forEach(function (L) {
    var w = L.t.split(' '), msg = null, ok = false, net = null;
    function out() { res.push({line: L.t, ok: ok, msg: msg}); }
    if (!/^ip route\b/i.test(L.t)) { msg = 'Das ist kein ip route-Befehl.'; return out(); }
    if (w.length < 5) { msg = 'Unvollständig: ip route <Zielnetz> <Maske> <Next Hop>.'; return out(); }
    var A = w[2], M = w[3], X = w[4];
    if (/\//.test(A) || /^\/?\d{1,2}$/.test(M)) { msg = 'Cisco will die Maske ausgeschrieben, z. B. 255.255.255.0 statt /24.'; return out(); }
    if (!isIp(A)) { msg = A + ' ist keine gültige Adresse.'; return out(); }
    var p = mask2p(M); if (p < 0) { msg = M + ' ist keine gültige Subnetzmaske.'; return out(); }
    if (A === '0.0.0.0' && p === 0) { msg = 'Eine Default-Route ist hier nicht gefragt – trage jedes Netz einzeln ein.'; return out(); }
    if (netOf(A, p) !== A) { msg = A + ' ist keine Netzadresse (Hostbits gesetzt). Bei Maske ' + M + ' heißt das Netz ' + netOf(A, p) + '.'; return out(); }
    var hit = all.filter(function (x) { return x.net === A && x.p === p; })[0];
    if (!hit) {
      var sameNet = all.filter(function (x) { return x.net === A; })[0];
      msg = sameNet ? 'Falsche Maske: ' + A + ' hat die Maske ' + maskTxt(sameNet.p) + ' (/' + sameNet.p + ').' : 'Das Netz ' + A + '/' + p + ' gibt es im Plan nicht.';
      return out();
    }
    net = A + '/' + p;
    if (dir.some(function (d) { return d.net === A; })) { msg = rt.name + ' ist direkt mit ' + net + ' verbunden – direkt verbundene Netze kennt der Router schon, dafür braucht es keine Route.'; return out(); }
    if (got[net]) { msg = 'Für ' + net + ' gibt es schon eine Route.'; return out(); }
    var route = R.filter(function (x) { return x.net === A; })[0];
    if (isIp(X)) {
      var own = ipsOf(T, src).filter(function (x) { return x.ip === X; })[0];
      var who = ipOwner(T, X);
      if (own) msg = X + ' ist eine eigene IP von ' + rt.name + ' (' + own.ifn + '). Der Next Hop ist die IP des Nachbarn auf der anderen Seite des Kabels.';
      else if (all.some(function (x) { return x.net === X; })) msg = X + ' ist eine Netzadresse, keine IP eines Routers.';
      else if (!who) msg = 'Die IP ' + X + ' gibt es im Plan nicht.';
      else if (!T.links.some(function (l) { return (l.a === src && l.b === who.r) || (l.b === src && l.a === who.r); }) || T.links[who.link].a !== src && T.links[who.link].b !== src)
        msg = X + ' gehört zu ' + T.routers[who.r].name + ', der hängt nicht am selben Kabel wie ' + rt.name + '. Der Next Hop muss ein direkter Nachbar sein – auf dem gemeinsamen Kabel.';
      else if (!route.hops.some(function (h) { return h.ip === X; })) msg = 'Über ' + T.routers[who.r].name + ' kommt man zwar hin, aber nicht am schnellsten.' + (T.links.some(function (l) { return l.type === 'ser'; }) ? ' Denk daran: Serial-Leitungen sind langsam.' : ' Es gibt einen kürzeren Weg.');
      else ok = true;
    } else {
      var ifn = normIf(X), mine = ifn && ipsOf(T, src).filter(function (x) { return x.ifn === ifn; })[0];
      if (!ifn) msg = X + ' ist weder eine IP-Adresse noch ein Interface.';
      else if (ifn === rt.lanIf) msg = ifn + ' führt ins eigene LAN, nicht zu einem Nachbarrouter.';
      else if (!mine) msg = rt.name + ' hat kein Interface ' + ifn + ' im Plan.';
      else if (!route.hops.some(function (h) { return h.ifn === ifn; })) msg = 'Über ' + ifn + ' kommt man zwar hin, aber nicht am schnellsten.';
      else { ok = true; msg = 'Richtig (Ausgangs-Interface). Üblich – und bei Ethernet besser – ist die Next-Hop-IP.'; }
    }
    if (ok) { got[net] = 1; okCount++; }
    out();
  });
  var missing = R.filter(function (x) { return !got[x.net + '/' + x.p]; });
  return {lines: res, missing: missing, need: R.length, ok: okCount, solved: missing.length === 0 && res.every(function (l) { return l.ok; })};
}

/* ---------- Prüfen: RIP ---------- */
function gradeRip(T, txt) {
  var src = T.ask.rip, rt = T.routers[src], need = ripNets(T, src), dirs = direct(T, src), res = [], inR = false, has = {rip: 0, v2: 0, nas: 0}, got = {}, gotNet = {}, lines = {};
  cleanLines(txt).forEach(function (L) {
    var t = L.t.toLowerCase(), ok = false, msg = null;
    if (t === 'router rip') { inR = true; ok = !has.rip; msg = ok ? null : 'Schon im RIP-Modus.'; has.rip = 1; }
    else if (/^router\s/.test(t)) { msg = 'Gefragt ist RIP: router rip.'; inR = false; }
    else if (!inR && /^(version|network|no auto-summary|passive-interface)/.test(t)) msg = 'Dieser Befehl gehört in den RIP-Modus – zuerst router rip.';
    else if (/^version\s+2$/.test(t)) { ok = true; has.v2 = 1; }
    else if (/^version\s+1$/.test(t)) msg = 'Gefragt ist RIPv2: version 2.';
    else if (/^no auto-?summary$/.test(t)) { ok = true; has.nas = 1; msg = t === 'no autosummary' ? 'Richtig – geschrieben wird es no auto-summary.' : null; }
    else if (/^auto-summary$/.test(t)) msg = 'Bei RIPv2 schaltet man die automatische Zusammenfassung aus: no auto-summary.';
    else if (/^passive-interface\s+/.test(t)) {
      var ifn = normIf(L.t.split(' ').slice(1).join(''));
      if (ifn === rt.lanIf) { ok = true; msg = 'Gut – optional: Ins LAN werden keine Updates geschickt.'; }
      else if (ifn && ipsOf(T, src).some(function (x) { return x.ifn === ifn; })) msg = 'Vorsicht: Über ' + ifn + ' hängt ein Nachbarrouter. Passiv bekommt er keine Updates mehr.';
      else msg = rt.name + ' hat kein solches Interface.';
    }
    else if (/^network\s+/.test(t)) {
      var w = L.t.split(' ');
      if (w.length > 2) msg = 'Bei RIP steht hinter network nur die Adresse – keine Maske und keine Wildcard.';
      else if (!isIp(w[1])) msg = w[1] + ' ist keine gültige Adresse.';
      else {
        var c = classful(w[1]), n = need.filter(function (x) { return x.net === c.net; })[0], exact = dirs.filter(function (d) { return d.net === w[1]; })[0];
        if (!n) msg = rt.name + ' hat kein direkt verbundenes Netz in ' + c.net + '. Bei RIP gibt jeder Router nur seine eigenen Netze an – die anderen lernt er von den Nachbarn.';
        else if (lines[w[1]]) msg = 'Doppelt: network ' + w[1] + ' steht schon da.';
        else {
          ok = true; lines[w[1]] = 1; got[c.net] = 1;
          if (w[1] === c.net) n.from.forEach(function (f) { gotNet[f.split('/')[0]] = 1; });
          if (exact) { gotNet[w[1]] = 1; if (w[1] !== c.net) msg = 'Richtig. In der Running-Config steht danach network ' + c.net + ' (Klassennetz, Klasse ' + c.cls + ').'; }
          else if (w[1] === c.net) { n.from.forEach(function (f) { gotNet[f.split('/')[0]] = 1; }); msg = n.from.length > 1 ? 'Richtig – das Klassennetz ' + c.net + ' deckt ' + n.from.join(' und ') + ' auf einmal ab.' : null; }
          else msg = w[1] + ' ist keine Netzadresse aus dem Plan. IOS macht daraus zwar network ' + c.net + ', schreib aber besser die Netzadresse.';
        }
      }
    }
    else msg = 'Unbekannter Befehl.';
    res.push({line: L.t, ok: ok, msg: msg});
  });
  var miss = need.filter(function (x) { return !got[x.net]; });
  var todo = [];
  if (!has.rip) todo.push('router rip fehlt');
  if (!has.v2) todo.push('version 2 fehlt');
  if (!has.nas) todo.push('no auto-summary fehlt');
  var missNets = dirs.filter(function (d) { return !gotNet[d.net]; });
  if (missNets.length) todo.push(missNets.length + ' direkt verbundene' + (missNets.length > 1 ? ' Netze fehlen' : 's Netz fehlt'));
  /* technisch reicht ein Befehl je Klassennetz – dann nur ein Hinweis, kein Fehler */
  var note = !miss.length && missNets.length ? 'Nicht einzeln angegeben: ' + missNets.map(function (d) { return d.net + '/' + d.p; }).join(', ') + '. Am Router funktioniert es trotzdem, weil IOS ohnehin nur das Klassennetz speichert.' : null;
  if (!miss.length) todo = todo.filter(function (x) { return !/direkt verbundene/.test(x); });
  return {lines: res, todo: todo, note: note, need: need, solved: !todo.length && res.every(function (l) { return l.ok; })};
}

/* ---------- Lösungstexte ---------- */
function solStatic(T) { return routes(T, T.ask.st).map(function (x) { return 'ip route ' + x.net + ' ' + maskTxt(x.p) + ' ' + x.hops[0].ip; }); }
function solRip(T) { return ['router rip', ' version 2', ' no auto-summary'].concat(direct(T, T.ask.rip).slice().sort(function (a, b) { return ip2n(a.net) - ip2n(b.net); }).map(function (x) { return ' network ' + x.net; })); }

/* ---------- Zeichnen ---------- */
function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); }
var ICON_R = '<ellipse cx="0" cy="8" rx="26" ry="9" fill="#1f5872"/><rect x="-26" y="-8" width="52" height="16" fill="#2f7392"/><ellipse cx="0" cy="-8" rx="26" ry="9" fill="#5a9dbb" stroke="#1f5872" stroke-width="1"/>' +
  '<path d="M-14 -8h9M5 -8h9M-1 -14v4M-1 -6v4" stroke="#fff" stroke-width="2" stroke-linecap="round"/>';
var ICON_S = '<path d="M-24 -2l8 -8h34l-8 8z" fill="#6aaecb" stroke="#1f5872" stroke-width="1"/><path d="M-24 -2h34v10h-34z" fill="#2f7392"/><path d="M10 -2l8 -8v10l-8 8z" fill="#1f5872"/>' +
  '<path d="M-12 -6h14M-6 -4h14" stroke="#fff" stroke-width="1.4"/>';
function txt(x, y, s, o) {
  o = o || {};
  return '<text x="' + Math.round(x) + '" y="' + Math.round(y) + '" text-anchor="' + (o.a || 'middle') + '" font-size="' + (o.fs || 12.5) + '" font-family="' + (o.mono ? 'ui-monospace,Menlo,Consolas,monospace' : 'Open Sans,Arial,sans-serif') + '"' +
    (o.w ? ' font-weight="' + o.w + '"' : '') + ' fill="' + (o.c || '#1c2b33') + '" stroke="#fff" stroke-width="3.5" paint-order="stroke"' + (o.cls ? ' class="' + o.cls + '"' : '') + '>' + esc(s) + '</text>';
}
/* Beschriftung neben einem Kabel: Punkt (x,y), Richtung (nx,ny) weg vom Kabel; Textanker so, dass nichts auf dem Kabel liegt */
var BOXES = null;
function lab(x, y, nx, ny, gap, s, o) {
  var lines = typeof s === 'string' ? [s] : s, a = nx > 0.45 ? 'start' : nx < -0.45 ? 'end' : 'middle';
  var lh = (o.fs || 12.5) + 1, hgt = lh * lines.length;
  var bx = x + nx * gap, by = y + ny * gap;
  /* senkrecht: Text darüber bzw. darunter, seitlich: vertikal zentriert */
  var top = a === 'middle' ? (ny < 0 ? by - hgt + 4 : by + lh - 2) : by - hgt / 2 + lh - 3;
  var out = '';
  if (o.ring) out += '<circle cx="' + Math.round(bx + (a === 'start' ? 12 : a === 'end' ? -12 : 0)) + '" cy="' + Math.round(top - 5) + '" r="16" fill="#fff8e1" stroke="#e65100" stroke-width="2.5"/>';
  if (BOXES) lines.forEach(function (t, i) { var w = t.length * (i ? 6 : 7.4), x0 = a === 'start' ? bx : a === 'end' ? bx - w : bx - w / 2; BOXES.push([x0, top + i * lh - lh + 3, x0 + w, top + i * lh + 3]); });
  lines.forEach(function (t, i) { out += txt(bx, top + i * lh, t, i === 0 ? {a: a, w: o.w, c: o.c, fs: o.fs} : {a: a, fs: 10.5, c: '#546e7a'}); });
  return out;
}
/* opts: {hl:{links:{k:1}, routers:{i:1}, ip:'x.x.x.x', net:'x.x.x.x'}, ask:true} */
function draw(T, opts) {
  opts = opts || {};
  var hl = opts.hl || {}, h = '<svg class="rt" viewBox="0 0 ' + T.W + ' ' + T.H + '" role="img" aria-label="Netzwerkplan">';
  /* Hervorhebung des Weges */
  T.links.forEach(function (l, k) { if (hl.links && hl.links[k]) { var A = T.routers[l.a], B = T.routers[l.b]; h += '<line x1="' + A.x + '" y1="' + A.y + '" x2="' + B.x + '" y2="' + B.y + '" stroke="#61a229" stroke-opacity=".45" stroke-width="18" stroke-linecap="round"/>'; } });
  /* Kabel */
  T.links.forEach(function (l) {
    var A = T.routers[l.a], B = T.routers[l.b];
    if (l.type === 'gig') h += '<line x1="' + A.x + '" y1="' + A.y + '" x2="' + B.x + '" y2="' + B.y + '" stroke="#1c2b33" stroke-width="3"/>';
    else {
      var mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2, dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
      var p1 = [mx - ux * 14, my - uy * 14], p2 = [mx + nx * 9 - ux * 2, my + ny * 9 - uy * 2], p3 = [mx - nx * 9 + ux * 2, my - ny * 9 + uy * 2], p4 = [mx + ux * 14, my + uy * 14];
      h += '<path d="M' + A.x + ' ' + A.y + 'L' + p1.join(' ') + 'L' + p2.join(' ') + 'L' + p3.join(' ') + 'L' + p4.join(' ') + 'L' + B.x + ' ' + B.y + '" fill="none" stroke="#d32f2f" stroke-width="3" stroke-linejoin="round"/>';
    }
  });
  /* LAN-Kabel + Switch */
  T.routers.forEach(function (r) { if (r.sw) h += '<line x1="' + r.x + '" y1="' + r.y + '" x2="' + r.sw.x + '" y2="' + r.sw.y + '" stroke="#1c2b33" stroke-width="3"/>'; });
  /* Beschriftung der Kabel: zuerst die Hostteile an den Enden, dann die Netze dort, wo Platz ist */
  BOXES = [];
  T.routers.forEach(function (r) { BOXES.push([r.x - 30, r.y - 20, r.x + 30, r.y + 20]); if (r.sw) BOXES.push([r.sw.x - 26, r.sw.y - 12, r.sw.x + 22, r.sw.y + 10]); });
  var geo = T.links.map(function (l) {
    var A = T.routers[l.a], B = T.routers[l.b], dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
    if (ny > 0 || (ny === 0 && nx < 0)) { nx = -nx; ny = -ny; }
    return {A: A, B: B, L: L, ux: ux, uy: uy, nx: nx, ny: ny};
  });
  T.links.forEach(function (l, k) {
    var g = geo[k];
    [[g.A, l.ipA, l.ifA, 1], [g.B, l.ipB, l.ifB, -1]].forEach(function (e) {
      var P = e[0], sg = e[3], host = '.' + e[1].split('.')[3], on = hl.ip === e[1], keep = BOXES, best = null, bs = 1e9;
      /* Kandidaten: Abstand vom Router und Seite des Kabels – der erste ohne Überlappung gewinnt */
      [[0.3, 80, -1], [0.3, 80, 1], [0.22, 58, -1], [0.22, 58, 1], [0.4, 105, -1], [0.4, 105, 1]].forEach(function (c, ci) {
        var d = Math.min(c[1], g.L * c[0]), px = P.x + g.ux * sg * d, py = P.y + g.uy * sg * d;
        BOXES = []; var out = lab(px, py, g.nx * c[2], g.ny * c[2], 10, [host, e[2]], {w: 700, c: on ? '#e65100' : '#1565c0', fs: on ? 14 : 13, ring: on});
        var bb = BOXES, sc = ci * 3;
        bb.forEach(function (b) {
          keep.forEach(function (q) { var ox = Math.min(b[2], q[2]) - Math.max(b[0], q[0]), oy = Math.min(b[3], q[3]) - Math.max(b[1], q[1]); if (ox > -2 && oy > -2) sc += (ox + 2) * (oy + 2) * 4; });
          geo.forEach(function (o, j) { if (j === k) return; for (var t = 0; t <= 1; t += 0.02) { var x = o.A.x + (o.B.x - o.A.x) * t, y = o.A.y + (o.B.y - o.A.y) * t; if (x > b[0] - 2 && x < b[2] + 2 && y > b[1] - 2 && y < b[3] + 2) sc += 30; } });
          if (b[0] < 2 || b[2] > T.W - 2 || b[1] < 2 || b[3] > T.H - 2) sc += 500;
        });
        if (sc < bs) { bs = sc; best = {out: out, boxes: bb}; }
      });
      BOXES = keep.concat(best.boxes); h += best.out;
    });
  });
  T.links.forEach(function (l, k) {
    var g = geo[k], sel = hl.net === l.net, best = null, bs = 1e9, keep = BOXES;
    [[0.5, 1], [0.4, 1], [0.6, 1], [0.5, -1], [0.33, 1], [0.67, 1], [0.4, -1], [0.6, -1]].forEach(function (c, ci) {
      var px = g.A.x + (g.B.x - g.A.x) * c[0], py = g.A.y + (g.B.y - g.A.y) * c[0];
      BOXES = []; var out = lab(px, py, g.nx * c[1], g.ny * c[1], 12, l.net + '/30', {w: 600, c: sel ? '#2e7d32' : '#1c2b33', fs: sel ? 14 : 12.5});
      var b = BOXES[0], sc = ci * 2;
      keep.forEach(function (q) { var ox = Math.min(b[2], q[2]) - Math.max(b[0], q[0]), oy = Math.min(b[3], q[3]) - Math.max(b[1], q[1]); if (ox > 0 && oy > 0) sc += ox * oy; });
      geo.forEach(function (o, j) { if (j === k) return; for (var t = 0; t <= 1; t += 0.02) { var x = o.A.x + (o.B.x - o.A.x) * t, y = o.A.y + (o.B.y - o.A.y) * t; if (x > b[0] - 3 && x < b[2] + 3 && y > b[1] - 3 && y < b[3] + 3) sc += 40; } });
      if (sc < bs) { bs = sc; best = {out: out, box: b}; }
    });
    BOXES = keep; BOXES.push(best.box); h += best.out;
  });
  BOXES = null;
  /* Geräte */
  T.routers.forEach(function (r, i) {
    var ask = opts.ask && (T.ask.st === i || T.ask.rip === i), on = hl.routers && hl.routers[i];
    if (r.sw) {
      h += '<g transform="translate(' + r.sw.x + ' ' + r.sw.y + ')">' + ICON_S + '</g>';
      var up = r.sw.y < r.y, base = up ? r.sw.y - 18 - 16 * (r.lans.length - 1) : r.sw.y + 30;
      r.lans.forEach(function (n, j) { var sel = hl.net === n.net; h += txt(r.sw.x, base + 16 * j, n.net + '/' + n.p, {w: 600, c: sel ? '#2e7d32' : '#1c2b33', fs: sel ? 14 : 12.5}); });
      var lx = r.x + (r.sw.x - r.x) * 0.45, ly = r.y + (r.sw.y - r.y) * 0.45;
      h += txt(lx + (Math.abs(r.sw.x - r.x) < 30 ? 22 : 0), ly + (Math.abs(r.sw.x - r.x) < 30 ? 4 : -8), r.lanIf, {fs: 10.5, c: '#546e7a', a: Math.abs(r.sw.x - r.x) < 30 ? 'start' : 'middle'});
    }
    if (on) h += '<circle cx="' + r.x + '" cy="' + r.y + '" r="36" fill="#eef6e6" stroke="#61a229" stroke-width="2.5"/>';
    h += '<g transform="translate(' + r.x + ' ' + r.y + ')">' + ICON_R + '</g>';
    var dirs = [];
    T.links.forEach(function (l) { var o = l.a === i ? l.b : l.b === i ? l.a : -1; if (o >= 0) dirs.push(Math.atan2(T.routers[o].y - r.y, T.routers[o].x - r.x)); });
    if (r.sw) dirs.push(Math.atan2(r.sw.y - r.y, r.sw.x - r.x));
    var cands = [Math.PI / 2, -Math.PI / 2, 0, Math.PI, Math.PI / 4, 3 * Math.PI / 4, -Math.PI / 4, -3 * Math.PI / 4], bestA = cands[0], bg = -1;
    cands.forEach(function (c, ci) { var g = 9; dirs.forEach(function (b) { var dd = Math.abs(Math.atan2(Math.sin(c - b), Math.cos(c - b))); if (dd < g) g = dd; }); g -= ci * 0.02; if (g > bg + 0.25) { bg = g; bestA = c; } });
    var cx = Math.cos(bestA), cy = Math.sin(bestA);
    h += txt(r.x + cx * 40, r.y + cy * 30 + 6, r.name, {w: 700, fs: 15, a: cx > 0.5 ? 'start' : cx < -0.5 ? 'end' : 'middle'});
  });
  return h + '</svg>';
}

G.RT = {LVNAME: LVNAME, COST: COST, makeTask: makeTask, nets: nets, direct: direct, routes: routes, ripNets: ripNets, gradeStatic: gradeStatic, gradeRip: gradeRip,
  solStatic: solStatic, solRip: solRip, draw: draw, maskTxt: maskTxt, classful: classful, ipsOf: ipsOf, ipOwner: ipOwner, ip2n: ip2n};
})(typeof window !== 'undefined' ? window : globalThis);
