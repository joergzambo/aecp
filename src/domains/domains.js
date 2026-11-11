/* AECP · Collision- und Broadcast-Domains: Aufgaben (Arbeitsblatt + Generator), Lösung, Zeichnen.
   Browser: window.DOM · Node: globalThis.DOM */
(function (G) {
'use strict';

/* Textmarker-Farben zum Einzeichnen */
var PAL = ['#fbc02d', '#43a047', '#1e88e5', '#fb8c00', '#d81b60', '#8e24aa', '#00acc1', '#7cb342', '#6d4c41', '#e53935'];
var PALNAME = ['Gelb', 'Grün', 'Blau', 'Orange', 'Pink', 'Lila', 'Türkis', 'Hellgrün', 'Braun', 'Rot'];
var LVNAME = {B: 'Beispiel', L: 'Leicht', M: 'Mittel', S: 'Schwer'};
var LVCODE = {B: 2, L: 3, M: 4, S: 5};
var TYPENAME = {router: 'Router', 'switch': 'Switch', hub: 'Hub', pc: 'PC', laptop: 'Laptop'};

function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function ri(r, a, b) { return a + Math.floor(r() * (b - a + 1)); }
function pick(r, a) { return a[Math.floor(r() * a.length)]; }
function shuffle(r, a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

/* ---------- Lösen: Union-Find über die Kabel ---------- */
/* Collision Domain: nur ein Hub verbindet seine Kabel zu einem Segment.
   Broadcast Domain: alles außer dem Router verbindet (Switch, Hub, Endgerät). */
function solve(T) {
  var n = T.links.length, inc = T.devs.map(function () { return []; });
  T.links.forEach(function (l, i) { inc[l[0]].push(i); inc[l[1]].push(i); });
  function part(joins) {
    var p = []; for (var i = 0; i < n; i++) p.push(i);
    function f(x) { while (p[x] !== x) { p[x] = p[p[x]]; x = p[x]; } return x; }
    T.devs.forEach(function (d, k) { if (joins(d)) for (var j = 1; j < inc[k].length; j++) p[f(inc[k][j])] = f(inc[k][0]); });
    var map = {}, cls = [], c = 0;
    for (i = 0; i < n; i++) { var r = f(i); if (!(r in map)) map[r] = c++; cls.push(map[r]); }
    return {cls: cls, n: c};
  }
  var cd = part(function (d) { return d.t === 'hub'; }), bd = part(function (d) { return d.t !== 'router'; });
  return {cd: cd.cls, ncd: cd.n, bd: bd.cls, nbd: bd.n};
}

/* ---------- Feste Aufgaben (Arbeitsblatt + Beispiel) ---------- */
function fixed(devs, links, pcName) {
  var T = {devs: devs.map(function (d, i) { return {id: i, t: d[0], name: d[1], x: d[2], y: d[3]}; }), links: []};
  var by = {}; T.devs.forEach(function (d) { by[d.name] = d.id; });
  T.links = links.map(function (l) { return [by[l[0]], by[l[1]], l[2] || 0]; });
  return T;
}
var EXAMPLE = function () { return fixed([['pc', 'PC0', 60, 60], ['pc', 'PC1', 60, 200], ['hub', 'Hub0', 220, 130], ['switch', 'Switch0', 390, 130], ['pc', 'PC2', 390, 270], ['router', 'Router0', 560, 130], ['pc', 'PC3', 720, 130]],
  [['PC0', 'Hub0'], ['PC1', 'Hub0'], ['Hub0', 'Switch0'], ['Switch0', 'PC2'], ['Switch0', 'Router0'], ['Router0', 'PC3']]); };

/* ---------- Generator ---------- */
var CFG = {
  L: {routers: [0, 1], infra: [2, 3], pcs: [2, 4], hubs: 1, maxDepth: 3, loop: 0},
  M: {routers: [1, 1], infra: [3, 5], pcs: [3, 6], hubs: 1, maxDepth: 3, loop: 0.25},
  S: {routers: [2, 2], infra: [5, 7], pcs: [4, 7], hubs: 2, maxDepth: 4, loop: 0.6}
};
var CAP = {router: 3, 'switch': 4, hub: 4};

function build(r, lvl) {
  var c = CFG[lvl], nR = ri(r, c.routers[0], c.routers[1]), nI = ri(r, c.infra[0], c.infra[1]), nP = ri(r, c.pcs[0], c.pcs[1]);
  var N = [], E = [];
  function add(t, par) { var d = {id: N.length, t: t, par: par, kids: [], depth: par < 0 ? 0 : N[par].depth + 1}; N.push(d); if (par >= 0) { N[par].kids.push(d.id); E.push([par, d.id, 0]); } return d; }
  function deg(d) { return d.kids.length + (d.par >= 0 ? 1 : 0); }
  var queue = [];
  for (var i = 0; i < nI; i++) queue.push(i < c.hubs ? 'hub' : (r() < 0.45 ? 'hub' : 'switch'));
  for (i = 1; i < nR; i++) queue.push('router');
  var rootT = nR > 0 ? 'router' : 'switch';
  if (rootT === 'switch' && queue.indexOf('switch') >= 0) queue.splice(queue.indexOf('switch'), 1);
  add(rootT, -1);
  shuffle(r, queue);
  for (i = 0; i < queue.length; i++) {
    var t = queue[i];
    var cand = N.filter(function (d) { return d.t !== 'pc' && deg(d) < CAP[d.t] && d.depth < c.maxDepth - 1; });
    if (!cand.length) return null;
    /* flache Knoten bevorzugen, damit das Bild nicht zu tief wird */
    var w = cand.map(function (d) { return 1 / (1 + d.depth); }), s = w.reduce(function (a, b) { return a + b; }, 0), x = r() * s, k = 0;
    while (x > w[k] && k < w.length - 1) { x -= w[k]; k++; }
    add(t, cand[k].id);
  }
  /* jeder Hub braucht mindestens zwei Kabel */
  N.filter(function (d) { return d.t === 'hub' && deg(d) < 2; }).forEach(function (h) { if (nP > 0) { add('pc', h.id); nP--; } });
  for (i = 0; i < nP; i++) {
    var cand2 = N.filter(function (d) { return (d.t === 'switch' || d.t === 'hub' || (d.t === 'router' && r() < 0.25)) && deg(d) < CAP[d.t]; });
    if (!cand2.length) break;
    add('pc', pick(r, cand2).id);
  }
  if (N.some(function (d) { return d.t === 'hub' && deg(d) < 2; })) return null;
  return {N: N, E: E};
}

function layout(r, G0) {
  var N = G0.N, orient = pick(r, ['lr', 'two', 'tb']), DX = 165, DY = 100, TX = 128, TY = 125;
  N.forEach(function (d) { shuffle(r, d.kids); });
  var root = N[0], slot;
  function place(d, depth, side) {
    d.dep = depth; d.side = side;
    if (!d.kids.length) { d.s = slot++; return; }
    d.kids.forEach(function (k) { place(N[k], depth + 1, side); });
    d.s = (N[d.kids[0]].s + N[d.kids[d.kids.length - 1]].s) / 2;
  }
  var leaves = 0;
  if (orient === 'two' && root.kids.length >= 2) {
    var half = Math.ceil(root.kids.length / 2), L = root.kids.slice(0, half), R = root.kids.slice(half);
    slot = 0; L.forEach(function (k) { place(N[k], 1, -1); }); var nl = slot;
    var midL = (N[L[0]].s + N[L[L.length - 1]].s) / 2;
    slot = 0; R.forEach(function (k) { place(N[k], 1, 1); }); var nr = slot;
    var midR = (N[R[0]].s + N[R[R.length - 1]].s) / 2;
    N.forEach(function (d) { if (d.side === -1) d.s -= midL; else if (d.side === 1) d.s -= midR; });
    root.dep = 0; root.side = 0; root.s = 0; leaves = Math.max(nl, nr);
  } else {
    if (orient === 'two') orient = 'lr';
    slot = 0; place(root, 0, 1); leaves = slot;
  }
  var maxDep = Math.max.apply(null, N.map(function (d) { return d.dep; }));
  if (orient === 'tb' && leaves > 7) return null;
  if (orient !== 'tb' && leaves > 5) return null;
  if (orient === 'lr' && maxDep > 5) return null;
  N.forEach(function (d) {
    if (orient === 'tb') { d.x = d.s * TX; d.y = d.dep * TY; }
    else { d.x = d.side * d.dep * DX; d.y = d.s * DY; }
  });
  return orient;
}

function addLoop(r, G0, orient) {
  var N = G0.N, opts = [];
  N.forEach(function (p) {
    for (var i = 0; i + 1 < p.kids.length; i++) {
      var a = N[p.kids[i]], b = N[p.kids[i + 1]];
      if (a.t === 'switch' && b.t === 'switch' && a.side === b.side) opts.push([a, b, p]);
    }
  });
  if (!opts.length) return false;
  var o = pick(r, opts), a = o[0], b = o[1];
  /* Bogen nach außen (weg vom Elternknoten), damit das Kabel keine Beschriftung kreuzt */
  var bend = orient === 'tb' ? 0 : 38 * (a.side || 1);
  G0.E.push([a.id, b.id, bend]);
  return true;
}

function finish(T) {
  /* Namen in Lesereihenfolge vergeben: links→rechts, oben→unten */
  var cnt = {}, order = T.devs.slice().sort(function (a, b) { return a.x - b.x || a.y - b.y; });
  order.forEach(function (d) { var base = TYPENAME[d.t]; cnt[base] = (cnt[base] || 0); d.name = base + cnt[base]; cnt[base]++; });
  return T;
}

function frame(T) {
  var xs = T.devs.map(function (d) { return d.x; }), ys = T.devs.map(function (d) { return d.y; });
  var x0 = Math.min.apply(null, xs), y0 = Math.min.apply(null, ys);
  T.devs.forEach(function (d) { d.x = Math.round(d.x - x0 + 60); d.y = Math.round(d.y - y0 + 42); });
  T.W = Math.max.apply(null, T.devs.map(function (d) { return d.x; })) + 60;
  T.H = Math.max.apply(null, T.devs.map(function (d) { return d.y; })) + 58;
  /* Bögen dürfen nicht aus dem Bild ragen */
  T.links.forEach(function (l) { if (l[2]) { var a = T.devs[l[0]]; if (a.x + l[2] + 30 > T.W) T.W = a.x + l[2] + 30; } });
  return T;
}

function interesting(T, lvl, S) {
  var MIN = {L: 3, M: 5, S: 6};
  if (S.ncd > PAL.length || S.ncd < MIN[lvl]) return false;
  if (lvl !== 'L' && S.nbd < 2) return false;
  var hubs = T.devs.filter(function (d) { return d.t === 'hub'; });
  var deg = T.devs.map(function () { return 0; }); T.links.forEach(function (l) { deg[l[0]]++; deg[l[1]]++; });
  /* keine unlogischen Netze: Router und Switches hängen nie nur an einem einzigen Kabel */
  if (T.devs.some(function (d) { return (d.t === 'router' || d.t === 'switch') && deg[d.id] < 2; })) return false;
  if (lvl !== 'L' && !hubs.some(function (h) { return deg[h.id] >= 3; })) return false;
  if (lvl === 'S' && S.nbd < 3) return false;
  return true;
}

function makeTask(seed, lvl) {
  lvl = String(lvl).toUpperCase();
  var T;
  if (lvl === 'B') {
    if (seed !== 1) return null;
    T = EXAMPLE();
    T = frame(T); T.code = lvl + '-' + seed; T.level = lvl; T.sol = solve(T); return T;
  }
  if (!CFG[lvl] || !(seed >= 1)) return null;
  for (var att = 0; att < 400; att++) {
    var r = mulberry32((seed * 7919 + att * 104729 + LVCODE[lvl] * 1000003) >>> 0);
    var G0 = build(r, lvl); if (!G0) continue;
    var orient = layout(r, G0); if (!orient) continue;
    if (r() < CFG[lvl].loop) addLoop(r, G0, orient);
    var pcT = r() < 0.5 ? 'pc' : 'laptop';
    T = {devs: G0.N.map(function (d) { return {id: d.id, t: d.t === 'pc' ? pcT : d.t, name: '', x: d.x, y: d.y}; }), links: G0.E.map(function (e) { return e.slice(); })};
    frame(T); finish(T);
    if (T.W / T.H > 2.4 || T.H / T.W > 1.3) continue;
    var S = solve(T);
    if (!interesting(T, lvl, S)) continue;
    T.code = lvl + '-' + seed; T.level = lvl; T.sol = S; T.orient = orient;
    return T;
  }
  return null;
}

/* ---------- Zeichnen ---------- */
function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); }
function linkPath(T, l) {
  var a = T.devs[l[0]], b = T.devs[l[1]];
  if (!l[2]) return 'M' + a.x + ' ' + a.y + 'L' + b.x + ' ' + b.y;
  var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, dx = b.x - a.x, dy = b.y - a.y, len = Math.sqrt(dx * dx + dy * dy) || 1;
  /* Bogen seitlich: Normalenrichtung so wählen, dass +bend nach rechts (x) zeigt */
  var nx = -dy / len, ny = dx / len; if (nx * l[2] < 0) { nx = -nx; ny = -ny; }
  var k = Math.abs(l[2]) * 2;
  return 'M' + a.x + ' ' + a.y + 'Q' + Math.round(mx + nx * k) + ' ' + Math.round(my + ny * k) + ' ' + b.x + ' ' + b.y;
}
function linkLabel(T, i) { var l = T.links[i]; return T.devs[l[0]].name + '–' + T.devs[l[1]].name; }

var ICON = {
  router: '<ellipse cx="0" cy="7" rx="22" ry="8" fill="#1f5872"/><rect x="-22" y="-7" width="44" height="14" fill="#2f7392"/><ellipse cx="0" cy="-7" rx="22" ry="8" fill="#5a9dbb" stroke="#1f5872" stroke-width="1"/>' +
    '<path d="M-12 -7h8M4 -7h8M-2 -12v3M-2 -5v3" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/><path d="M-6 -9.5l2 2.5-2 2.5M6 -9.5l-2 2.5 2 2.5" fill="none" stroke="#fff" stroke-width="1.4"/>',
  'switch': '<path d="M-24 -2l8 -8h34l-8 8z" fill="#6aaecb" stroke="#1f5872" stroke-width="1"/><path d="M-24 -2h34v10h-34z" fill="#2f7392"/><path d="M10 -2l8 -8v10l-8 8z" fill="#1f5872"/>' +
    '<path d="M-12 -6h14M-6 -4h14" stroke="#fff" stroke-width="1.4"/><path d="M0 -8l2.5 2-2.5 2M-4 -6l-2.5 2 2.5 2" fill="none" stroke="#fff" stroke-width="1.2"/>',
  hub: '<path d="M-12 -13l5 -5h19l-5 5z" fill="#6aaecb" stroke="#1f5872" stroke-width="1"/><rect x="-12" y="-13" width="19" height="29" fill="#2f7392"/><path d="M7 -13l5 -5v29l-5 5z" fill="#1f5872"/>' +
    '<path d="M-8 -9v21M-4 -9v21M0 -9v21M4 -9v21" stroke="#9cc9dc" stroke-width="1.3"/>',
  pc: '<rect x="-15" y="-16" width="30" height="21" rx="2" fill="#2f7392"/><rect x="-12" y="-13" width="24" height="15" fill="#d8ecf5"/><path d="M-3 5h6v5h-6z" fill="#1f5872"/><rect x="-11" y="10" width="22" height="4" rx="1" fill="#2f7392"/>',
  laptop: '<rect x="-14" y="-15" width="28" height="19" rx="2" fill="#2f7392"/><rect x="-11" y="-12" width="22" height="13" fill="#d8ecf5"/><path d="M-18 6h36l-4 6h-28z" fill="#1f5872"/>'
};

/* Mitte eines Kabels – sie entscheidet, in welchem Kreis das Kabel liegt */
function mid(T, i) {
  var l = T.links[i], a = T.devs[l[0]], b = T.devs[l[1]], mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  if (!l[2]) return [mx, my];
  var dx = b.x - a.x, dy = b.y - a.y, len = Math.sqrt(dx * dx + dy * dy) || 1, nx = -dy / len, ny = dx / len;
  if (nx * l[2] < 0) { nx = -nx; ny = -ny; }
  var k = Math.abs(l[2]) * 2, cx = Math.round(mx + nx * k), cy = Math.round(my + ny * k);
  return [(a.x + 2 * cx + b.x) / 4, (a.y + 2 * cy + b.y) / 4];
}

/* Lösung als „Kreise“: je Domain eine Hülle um ihre Kabel (Umriss + blasse Füllung) */
function hulls(T, cls, n) {
  var h = '';
  for (var c = 0; c < n; c++) {
    var ps = []; T.links.forEach(function (l, i) { if (cls[i] === c) ps.push(linkPath(T, l)); });
    var col = PAL[c % PAL.length];
    h += '<g opacity=".8">' + ps.map(function (d) { return '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="50" stroke-linecap="round" stroke-linejoin="round"/>'; }).join('') +
      ps.map(function (d) { return '<path d="' + d + '" fill="none" stroke="#fff" stroke-width="44" stroke-linecap="round" stroke-linejoin="round"/>'; }).join('') +
      ps.map(function (d) { return '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-opacity=".22" stroke-width="44" stroke-linecap="round" stroke-linejoin="round"/>'; }).join('') + '</g>';
  }
  return h;
}

/* opts: {solution:'cd'|'bd', interactive:true, wrong:{i:1}} */
function draw(T, opts) {
  opts = opts || {};
  var h = '<svg class="net' + (opts.interactive ? ' draw' : '') + '" viewBox="0 0 ' + T.W + ' ' + T.H + '" role="img" aria-label="Netzwerkplan">';
  if (opts.solution) h += '<g class="hl">' + hulls(T, T.sol[opts.solution], opts.solution === 'cd' ? T.sol.ncd : T.sol.nbd) + '</g>';
  if (opts.interactive) h += '<g class="loops"></g>';
  h += '<g class="cab">' + T.links.map(function (l, i) {
    var w = opts.wrong && opts.wrong[i];
    return '<path d="' + linkPath(T, l) + '" data-l="' + i + '" fill="none" stroke="' + (w ? '#c62828' : '#1c2b33') + '" stroke-width="' + (w ? 3.5 : 2.5) + '"' + (w ? ' stroke-dasharray="7 5"' : '') + '/>';
  }).join('') + '</g>';
  if (opts.interactive) h += '<g class="mids">' + T.links.map(function (l, i) { var m = mid(T, i); return '<circle cx="' + m[0] + '" cy="' + m[1] + '" r="3.2" fill="#fff" stroke="#1c2b33" stroke-width="1.4"/>'; }).join('') + '</g>';
  h += '<g class="dev">' + T.devs.map(function (d) {
    return '<g transform="translate(' + d.x + ' ' + d.y + ')">' + ICON[d.t] + '<text y="34" text-anchor="middle" font-size="13" font-family="Open Sans,Arial,sans-serif" fill="#1c2b33" stroke="#fff" stroke-width="3" paint-order="stroke">' + esc(d.name) + '</text></g>';
  }).join('') + '</g>';
  if (opts.interactive) h += '<g class="ink"></g><rect class="pad" x="0" y="0" width="' + T.W + '" height="' + T.H + '" fill="transparent"/>';
  return h + '</svg>';
}

/* Punkt im Polygon (Strahl-Methode) */
function inPoly(p, poly) {
  var inside = false;
  for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    var a = poly[i], b = poly[j];
    if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}
/* Kreise → Zuordnung je Kabel: Kreis-Index, -1 = in keinem, -2 = in mehreren */
function loopsToPaint(T, loops) {
  return T.links.map(function (l, i) {
    var m = mid(T, i), hit = [];
    loops.forEach(function (lp, k) { if (inPoly(m, lp.pts)) hit.push(k); });
    return hit.length === 1 ? hit[0] : hit.length ? -2 : -1;
  });
}

/* ---------- Bewerten ---------- */
/* paint: Farbe je Kabel (-1 = nicht markiert). Eine Domain zählt, wenn genau ihre Kabel eine gemeinsame Farbe haben. */
function grade(T, mode, paint) {
  var sol = T.sol[mode], n = T.links.length, ok = {}, good = 0, nd = mode === 'cd' ? T.sol.ncd : T.sol.nbd;
  for (var c = 0; c < nd; c++) {
    var mem = []; for (var i = 0; i < n; i++) if (sol[i] === c) mem.push(i);
    var col = paint[mem[0]], fine = col >= 0 && mem.every(function (j) { return paint[j] === col; });
    if (fine) for (i = 0; i < n; i++) if (paint[i] === col && sol[i] !== c) fine = false;
    if (fine) { good++; mem.forEach(function (j) { ok[j] = 1; }); }
  }
  var wrong = {}; for (i = 0; i < n; i++) if (!ok[i]) wrong[i] = 1;
  return {good: good, total: nd, wrong: wrong, unpainted: paint.filter(function (p) { return p === -1; }).length, multi: paint.filter(function (p) { return p === -2; }).length};
}

/* Erklärung der Lösung */
function explain(T) {
  var n = T.links.length, out = {cd: [], bd: []};
  for (var c = 0; c < T.sol.ncd; c++) {
    var mem = []; for (var i = 0; i < n; i++) if (T.sol.cd[i] === c) mem.push(i);
    var hubs = {}; mem.forEach(function (j) { T.links[j].slice(0, 2).forEach(function (k) { if (T.devs[k].t === 'hub') hubs[T.devs[k].name] = 1; }); });
    var hn = Object.keys(hubs);
    out.cd.push({c: c, links: mem.map(function (j) { return linkLabel(T, j); }), why: hn.length ? 'über ' + hn.join(' und ') + ' verbunden – ein Hub gibt jedes Signal an alle Ports weiter' : 'eigenes Segment – der Port eines Switches bzw. Routers trennt'});
  }
  for (c = 0; c < T.sol.nbd; c++) {
    var mm = []; for (i = 0; i < n; i++) if (T.sol.bd[i] === c) mm.push(i);
    var devs = {}, rts = {};
    mm.forEach(function (j) { T.links[j].slice(0, 2).forEach(function (k) { var d = T.devs[k]; if (d.t === 'router') rts[d.name] = 1; else devs[d.name] = 1; }); });
    var dn = Object.keys(devs), rn = Object.keys(rts);
    out.bd.push({c: c, links: mm.map(function (j) { return linkLabel(T, j); }), devs: dn, routers: rn,
      why: dn.length ? dn.join(', ') + (rn.length ? ' – begrenzt durch ' + rn.join(', ') : '') : 'Verbindung ' + rn.join('–') + ' – zwei Router-Interfaces, ein eigenes Netz'});
  }
  return out;
}

G.DOM = {PAL: PAL, PALNAME: PALNAME, LVNAME: LVNAME, makeTask: makeTask, solve: solve, draw: draw, grade: grade, mid: mid, inPoly: inPoly, loopsToPaint: loopsToPaint, explain: explain, linkPath: linkPath, linkLabel: linkLabel};
})(typeof window !== 'undefined' ? window : globalThis);
