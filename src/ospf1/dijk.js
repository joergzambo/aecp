/* NWT · OSPF 1: Dijkstra (SPF). Algorithmus mit Einzelschritten, Aufgaben-Generator, Zeichnen.
   Browser: window.DJ · Node: globalThis.DJ */
(function (G) {
'use strict';
var LVNAME = {L: 'Leicht', M: 'Mittel', S: 'Schwer'};
var LVCODE = {L: 3, M: 4, S: 5};
var INF = Infinity;
/* Bandbreiten in Mbit/s; Kosten = Referenz 1000 Mbit/s ÷ Bandbreite (abgerundet, mindestens 1) */
var REF = 1000, BWS = [1000, 500, 250, 200, 100, 50, 20, 10];
var BWLV = {L: [1000, 100, 50, 10], M: [1000, 500, 200, 100, 50, 20, 10], S: BWS};
function bwCost(bw) { return Math.max(1, Math.floor(REF / bw)); }
function bwLabel(bw) { return bw >= 1000 ? (bw / 1000) + 'G' : bw + 'M'; }
function bwLong(bw) { return bw >= 1000 ? (bw / 1000) + ' Gbit/s' : bw + ' Mbit/s'; }
function nearestBw(w) { var b = BWS[0]; BWS.forEach(function (x) { if (Math.abs(bwCost(x) - w) < Math.abs(bwCost(b) - w)) b = x; }); return b; }
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function ri(r, a, b) { return a + Math.floor(r() * (b - a + 1)); }
function shuffle(r, a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

/* Graph: {nodes:[{name,x,y}], edges:[{a,b,w}]} – a,b sind Indizes */
function adj(Gr) {
  var A = Gr.nodes.map(function () { return []; });
  Gr.edges.forEach(function (e, k) { A[e.a].push({v: e.b, w: e.w, k: k}); A[e.b].push({v: e.a, w: e.w, k: k}); });
  A.forEach(function (l) { l.sort(function (x, y) { return x.v - y.v; }); });
  return A;
}
/* Dijkstra mit allen Einzelschritten.
   steps: {kind:'init'} | {kind:'pick', u} | {kind:'relax', u, v, k, old, cand, ok} | {kind:'skip', u, v, k} | {kind:'done'}
   rounds: Tabelle – je Runde Zustand nach Wahl und Relaxierung */
function run(Gr, src) {
  var n = Gr.nodes.length, A = adj(Gr), d = [], p = [], fix = [], steps = [{kind: 'init', d: [], p: []}], rounds = [], order = [], ties = 0;
  for (var i = 0; i < n; i++) { d.push(INF); p.push(-1); fix.push(false); }
  d[src] = 0;
  steps[0].d = d.slice(); steps[0].p = p.slice();
  for (var it = 0; it < n; it++) {
    var u = -1;
    for (i = 0; i < n; i++) if (!fix[i] && d[i] < INF && (u < 0 || d[i] < d[u])) u = i;
    if (u < 0) break;
    for (i = 0; i < n; i++) if (i !== u && !fix[i] && d[i] === d[u]) ties++;
    fix[u] = true; order.push(u);
    steps.push({kind: 'pick', u: u, d: d.slice(), p: p.slice(), fix: fix.slice()});
    A[u].forEach(function (x) {
      if (fix[x.v]) { steps.push({kind: 'skip', u: u, v: x.v, k: x.k, d: d.slice(), p: p.slice(), fix: fix.slice()}); return; }
      var cand = d[u] + x.w, old = d[x.v], ok = cand < old;
      if (cand === old) ties++;
      if (ok) { d[x.v] = cand; p[x.v] = u; }
      steps.push({kind: 'relax', u: u, v: x.v, k: x.k, old: old, oldp: ok ? -1 : p[x.v], cand: cand, ok: ok, d: d.slice(), p: p.slice(), fix: fix.slice()});
    });
    rounds.push({u: u, d: d.slice(), p: p.slice(), fix: fix.slice()});
  }
  steps.push({kind: 'done', d: d.slice(), p: p.slice(), fix: fix.slice()});
  var nh = d.map(function (_, v) { if (v === src || d[v] === INF) return -1; var x = v; while (p[x] !== src) x = p[x]; return x; });
  var tree = {}; p.forEach(function (q, v) { if (q >= 0) Gr.edges.forEach(function (e, k) { if ((e.a === q && e.b === v) || (e.b === q && e.a === v)) tree[k] = 1; }); });
  return {src: src, d: d, p: p, nh: nh, order: order, steps: steps, rounds: rounds, ties: ties, tree: tree};
}
function path(R, v) { var o = []; if (R.d[v] === INF) return o; for (var x = v; x >= 0; x = R.p[x]) o.unshift(x); return o; }

/* ---------- Generator ---------- */
function cross(p1, p2, p3, p4) {
  function o(a, b, c) { return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x); }
  if (p1 === p3 || p1 === p4 || p2 === p3 || p2 === p4) return false;
  return o(p1, p2, p3) * o(p1, p2, p4) < 0 && o(p3, p4, p1) * o(p3, p4, p2) < 0;
}
function nearLine(a, b, c) { /* Knoten c zu nah an der Strecke a–b? */
  var dx = b.x - a.x, dy = b.y - a.y, t = ((c.x - a.x) * dx + (c.y - a.y) * dy) / (dx * dx + dy * dy);
  if (t <= 0.05 || t >= 0.95) return false;
  return Math.hypot(a.x + t * dx - c.x, a.y + t * dy - c.y) < 46;
}
function build(r, lvl, bw) {
  var n = lvl === 'L' ? 5 : lvl === 'M' ? ri(r, 6, 7) : ri(r, 8, 9);
  var cols = n <= 5 ? 3 : n <= 7 ? 4 : 4, rows = Math.ceil(n / cols) + (n > 6 ? 0 : 1), cells = [];
  for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) cells.push([x, y]);
  cells = shuffle(r, cells).slice(0, n);
  var W = 860, H = 460, nodes = cells.map(function (c, i) {
    return {name: '', x: Math.round(90 + c[0] * (W - 180) / (cols - 1) + ri(r, -40, 40)), y: Math.round(70 + c[1] * (H - 140) / Math.max(1, rows - 1) + ri(r, -30, 30))};
  });
  /* Namen nach Position (links oben → rechts unten), damit der Plan lesbar ist */
  nodes.sort(function (a, b) { return a.y - b.y || a.x - b.x; });
  nodes.forEach(function (nd, i) { nd.name = 'R' + (i + 1); });
  var cand = [];
  for (var i = 0; i < n; i++) for (var j = i + 1; j < n; j++) cand.push([i, j, Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y)]);
  cand.sort(function (a, b) { return a[2] - b[2]; });
  var edges = [], comp = nodes.map(function (_, i) { return i; });
  function find(x) { while (comp[x] !== x) x = comp[x] = comp[comp[x]]; return x; }
  function ok(a, b) {
    if (edges.some(function (e) { return cross(nodes[a], nodes[b], nodes[e.a], nodes[e.b]); })) return false;
    for (var c = 0; c < n; c++) if (c !== a && c !== b && nearLine(nodes[a], nodes[b], nodes[c])) return false;
    return true;
  }
  var maxW = lvl === 'L' ? 10 : lvl === 'M' ? 20 : 50;
  function wt() { if (!bw) return {w: ri(r, 1, maxW)}; var b = BWLV[lvl][ri(r, 0, BWLV[lvl].length - 1)]; return {w: bwCost(b), bw: b}; }
  function mk(a, b) { var x = wt(); x.a = a; x.b = b; return x; }
  /* Spannbaum aus kurzen Kanten (Kruskal mit etwas Zufall) */
  shuffle(r, cand.slice(0, Math.min(cand.length, n * 3))).concat(cand).forEach(function (c) {
    if (find(c[0]) !== find(c[1]) && ok(c[0], c[1])) { edges.push(mk(c[0], c[1])); comp[find(c[0])] = find(c[1]); }
  });
  if (edges.length < n - 1) return null;
  var extra = lvl === 'L' ? ri(r, 2, 3) : lvl === 'M' ? ri(r, 3, 4) : ri(r, 5, 6);
  cand.forEach(function (c) {
    if (extra <= 0 || c[2] > 420) return;
    if (edges.some(function (e) { return (e.a === c[0] && e.b === c[1]) || (e.a === c[1] && e.b === c[0]); })) return;
    if (r() < 0.55 && ok(c[0], c[1])) { edges.push(mk(c[0], c[1])); extra--; }
  });
  return {nodes: nodes, edges: edges, W: W, H: H, bw: !!bw};
}
function makeTask(seed, lvl, bw) {
  if (!LVCODE[lvl] || !(seed >= 1)) return null;
  for (var att = 0; att < 400; att++) {
    var r = mulberry32((seed * 7919 + att * 104729 + LVCODE[lvl] * 1000003 + (bw ? 777 : 0) + 1959) >>> 0);
    var Gr = build(r, lvl, bw); if (!Gr) continue;
    /* Linkbeschriftungen dürfen sich nicht überlappen (auch nicht in der Lösung mit „100M = 10“) */
    var pills = Gr.edges.map(function (e) { var A = Gr.nodes[e.a], B = Gr.nodes[e.b], mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2, L = (bw ? bwLabel(e.bw) + ' = ' + e.w : String(e.w)).length * 8 + 22; return [mx - L / 2, my - 15, mx + L / 2, my + 15]; });
    var clash = pills.some(function (p, i) { return pills.some(function (q, j) { return j > i && Math.min(p[2], q[2]) > Math.max(p[0], q[0]) && Math.min(p[3], q[3]) > Math.max(p[1], q[1]); }); }) ||
      pills.some(function (p) { return Gr.nodes.some(function (nd) { return nd.x + 27 > p[0] && nd.x - 27 < p[2] && nd.y + 27 > p[1] && nd.y - 27 < p[3]; }); });
    if (clash) continue;
    var src = ri(r, 0, Gr.nodes.length - 1), R = run(Gr, src);
    if (R.ties) continue;                      /* eindeutig: keine Gleichstände */
    if (R.order.length !== Gr.nodes.length) continue;
    /* mindestens ein Nachbar ist über einen Umweg billiger als direkt (die typische Falle) */
    var trap = Gr.edges.some(function (e) { var o = e.a === src ? e.b : e.b === src ? e.a : -1; return o >= 0 && R.d[o] < e.w; });
    if (lvl !== 'L' && !trap) continue;
    Gr.src = src; Gr.res = R; Gr.level = lvl; Gr.code = lvl + (bw ? 'B' : '') + '-' + seed;
    return Gr;
  }
  return null;
}
function example() {
  var nodes = [{name: 'R1', x: 120, y: 230}, {name: 'R2', x: 330, y: 90}, {name: 'R3', x: 330, y: 370}, {name: 'R4', x: 560, y: 110}, {name: 'R5', x: 560, y: 350}, {name: 'R6', x: 770, y: 230}];
  var e = [[0, 1, 4], [0, 2, 2], [1, 2, 1], [1, 3, 5], [2, 4, 9], [2, 3, 10], [3, 4, 2], [3, 5, 6], [4, 5, 3]];
  return {nodes: nodes, edges: e.map(function (x) { return {a: x[0], b: x[1], w: x[2]}; }), W: 860, H: 460};
}

/* ---------- Zeichnen ---------- */
function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); }
function tx(x, y, t, o) { o = o || {}; return '<text x="' + x + '" y="' + y + '" text-anchor="' + (o.a || 'middle') + '" font-size="' + (o.fs || 13) + '" font-weight="' + (o.fw || 400) + '" fill="' + (o.c || '#1c2b33') + '" font-family="' + (o.mono ? 'ui-monospace,Menlo,Consolas,monospace' : 'Open Sans,Arial,sans-serif') + '" pointer-events="none">' + esc(t) + '</text>'; }
function dtxt(v) { return v === INF ? '∞' : String(v); }
/* opt: {st: Schritt-Objekt, src, tree:{k:1}, sel: Knoten, edit:true, hotEdge:k, hide:true (keine Distanzen)} */
function draw(Gr, opt) {
  opt = opt || {};
  var W = Gr.W || 860, H = Gr.H || 460, st = opt.st, o = ['<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Netz mit Linkkosten"' + (opt.edit ? ' class="ed"' : '') + '>'];
  o.push('<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="transparent" data-bg="1"/>');
  Gr.edges.forEach(function (e, k) {
    var A = Gr.nodes[e.a], B = Gr.nodes[e.b], hot = opt.hotEdge === k, tr = opt.tree && opt.tree[k];
    var col = hot ? (opt.hotOk === false ? '#c62828' : '#f9a825') : tr ? '#2e7d32' : '#90a4ae', w = hot || tr ? 5 : 2.5;
    o.push('<g data-edge="' + k + '"><line x1="' + A.x + '" y1="' + A.y + '" x2="' + B.x + '" y2="' + B.y + '" stroke="transparent" stroke-width="16"/><line x1="' + A.x + '" y1="' + A.y + '" x2="' + B.x + '" y2="' + B.y + '" stroke="' + col + '" stroke-width="' + w + '" stroke-linecap="round"/></g>');
  });
  var occ = [];  /* belegte Flächen: Linkbeschriftungen, Router, Kosten-Kästchen */
  Gr.edges.forEach(function (e, k) {
    var A = Gr.nodes[e.a], B = Gr.nodes[e.b], mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
    var s = Gr.bw && e.bw ? bwLabel(e.bw) + (opt.costs ? ' = ' + e.w : '') : String(e.w), bw = 14 + s.length * 8;
    occ.push([mx - bw / 2, my - 12, mx + bw / 2, my + 12]);
    o.push('<g data-w="' + k + '"' + (opt.edit ? ' style="cursor:text"' : '') + '><rect x="' + (mx - bw / 2) + '" y="' + (my - 12) + '" width="' + bw + '" height="24" rx="12" fill="#fff" stroke="' + (opt.hotEdge === k ? '#f9a825' : '#546e7a') + '" stroke-width="1.5"/>' + tx(mx, my + 5, s, {fs: 14, fw: 700, mono: 1}) + '</g>');
  });
  Gr.nodes.forEach(function (nd) { occ.push([nd.x - 25, nd.y - 25, nd.x + 25, nd.y + 25]); });
  var badges = [];
  Gr.nodes.forEach(function (nd, i) {
    var fix = st && st.fix && st.fix[i], cur = st && st.u === i && (st.kind === 'pick' || st.kind === 'relax' || st.kind === 'skip'), tgt = st && st.v === i;
    var fill = opt.sel === i ? '#fff59d' : cur ? '#ffe0b2' : fix ? '#c8e6c9' : '#fff', stroke = i === opt.src ? '#1565c0' : cur ? '#e65100' : fix ? '#2e7d32' : tgt ? '#f9a825' : '#1c2b33';
    o.push('<g data-node="' + i + '" style="cursor:' + (opt.edit ? 'pointer' : 'default') + '"><circle cx="' + nd.x + '" cy="' + nd.y + '" r="24" fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + (i === opt.src || cur ? 3.5 : 2) + '"/>' + tx(nd.x, nd.y + 5, nd.name, {fs: 15, fw: 700}) + '</g>');
    if (st && !opt.hide) {
      var dv = st.d[i], txt = dtxt(dv) + (st.p[i] >= 0 ? ' · ' + Gr.nodes[st.p[i]].name : ''), bw = 12 + txt.length * 7.4;
      /* Platz suchen: über, unter, rechts, links, schräg – erster ohne Überlappung gewinnt */
      var C = [[0, -44], [0, 46], [30 + bw / 2, 0], [-30 - bw / 2, 0], [22 + bw / 2, -34], [-22 - bw / 2, -34], [22 + bw / 2, 36], [-22 - bw / 2, 36], [0, -68], [0, 70], [40 + bw / 2, -50], [-40 - bw / 2, -50], [40 + bw / 2, 52], [-40 - bw / 2, 52]], best = null, bs = 1e9;
      C.forEach(function (c, ci) {
        var x = nd.x + c[0], y = nd.y + c[1], b = [x - bw / 2 - 2, y - 13, x + bw / 2 + 2, y + 10], sc = ci;
        occ.concat(badges).forEach(function (q) { var ox = Math.min(b[2], q[2]) - Math.max(b[0], q[0]), oy = Math.min(b[3], q[3]) - Math.max(b[1], q[1]); if (ox > 0 && oy > 0) sc += 100 + ox * oy; });
        Gr.edges.forEach(function (e) { var A = Gr.nodes[e.a], B = Gr.nodes[e.b]; for (var t = 0.1; t <= 0.9; t += 0.04) { var px = A.x + (B.x - A.x) * t, py = A.y + (B.y - A.y) * t; if (px > b[0] && px < b[2] && py > b[1] && py < b[3]) { sc += 6; } } });
        if (b[0] < 2 || b[2] > W - 2 || b[1] < 2 || b[3] > H - 2) sc += 5000;
        if (sc < bs) { bs = sc; best = [x, y, b]; }
      });
      badges.push(best[2]);
      var bx = best[0], by = best[1];
      o.push('<rect x="' + (bx - bw / 2) + '" y="' + (by - 12) + '" width="' + bw + '" height="21" rx="4" fill="' + (fix ? '#2e7d32' : dv === INF ? '#eceff1' : '#1565c0') + '"/>' + tx(bx, by + 3.5, txt, {fs: 12.5, fw: 700, c: dv === INF && !fix ? '#546e7a' : '#fff', mono: 1}));
    }
  });
  o.push('</svg>');
  return o.join('');
}

G.DJ = {REF: REF, BWS: BWS, BWLV: BWLV, bwCost: bwCost, bwLabel: bwLabel, bwLong: bwLong, nearestBw: nearestBw, LVNAME: LVNAME, INF: INF, run: run, path: path, makeTask: makeTask, example: example, draw: draw, dtxt: dtxt, adj: adj};
})(typeof window !== 'undefined' ? window : globalThis);
