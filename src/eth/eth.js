/* AECP · Ethernet und Switching: MAC-Learning, Fluten, Weiterleiten, Filtern. Topologie-Generator, Simulation, Zeichnen.
   Browser: window.ETH · Node: globalThis.ETH */
(function (G) {
'use strict';

var LVNAME = {L: 'Leicht', M: 'Mittel', S: 'Schwer'};
var LVCODE = {L: 3, M: 4, S: 5};
var BC = 'ffff.ffff.ffff';
var LETTERS = 'ABCDEFGH';

function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function ri(r, a, b) { return a + Math.floor(r() * (b - a + 1)); }
function pick(r, a) { return a[Math.floor(r() * a.length)]; }
function shuffle(r, a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
function winMac(m) { return m.replace(/\./g, '').toUpperCase().match(/../g).join('-'); }
function macOf(letter) { var l = letter.toLowerCase(); return '00' + l + l + '.' + l + l + l + l + '.' + l + l + l + l; }

/* ---------- Topologie ----------
   T.dev[i] = {t:'sw'|'hub'|'pc', name, x, y, mac?}; T.links[k] = {a, b, pa, pb} (pa/pb = Portname am Switch, sonst '') */
function addDev(T, t, name, x, y) { var d = {id: T.dev.length, t: t, name: name, x: x, y: y}; if (t === 'pc') d.mac = macOf(name.slice(-1)); T.dev.push(d); return d; }
function link(T, a, b, pa, pb) { T.links.push({a: a.id, b: b.id, pa: pa || '', pb: pb || ''}); }

var SLOTS = [[-90, -125], [90, -125], [-90, 125], [90, 125], [-175, 0], [175, 0]];
function build(r, lvl) {
  var T = {dev: [], links: []}, nSw = lvl === 'L' ? 1 : lvl === 'M' ? 2 : 3, sws = [], pcI = 0;
  for (var i = 0; i < nSw; i++) sws.push(addDev(T, 'sw', 'SW' + (i + 1), 200 + i * 360, 220));
  var nextFa = sws.map(function () { return 1; }), nextGi = sws.map(function () { return 1; });
  for (i = 0; i + 1 < nSw; i++) link(T, sws[i], sws[i + 1], 'Gi0/' + (nextGi[i]++), 'Gi0/' + (nextGi[i + 1]++));
  var counts = lvl === 'L' ? [ri(r, 3, 5)] : lvl === 'M' ? [ri(r, 2, 3), ri(r, 2, 3)] : [1, 1, 1];
  if (lvl === 'S') counts[ri(r, 0, 2)]++;   /* höchstens 6 PCs: A–F sind gültige Hex-Ziffern für die MAC */
  var hubAt = lvl === 'S' ? ri(r, 0, nSw - 1) : lvl === 'M' && r() < 0.3 ? ri(r, 0, 1) : -1;
  if (lvl === 'M' && hubAt >= 0) counts = [2, 2];
  sws.forEach(function (sw, si) {
    /* freie Plätze: in Ketten nicht seitlich zum Nachbarswitch */
    var slots = SLOTS.filter(function (s, k) { return k < 4 || (nSw === 1) || (k === 4 && si === 0) || (k === 5 && si === nSw - 1); });
    slots = shuffle(r, slots.slice());
    var n = counts[si] + (si === hubAt ? 1 : 0);
    for (var j = 0; j < n && j < slots.length; j++) {
      var s = slots[j], port = 'Fa0/' + (nextFa[si]++);
      if (si === hubAt && j === 0) {
        var hub = addDev(T, 'hub', 'Hub', sw.x + s[0], sw.y + s[1]); link(T, sw, hub, port, '');
        var out = s[1] === 0 ? [[s[0] > 0 ? 95 : -95, -70], [s[0] > 0 ? 95 : -95, 70]] : [[-60, s[1] > 0 ? 115 : -115], [60, s[1] > 0 ? 115 : -115]];
        out.forEach(function (o) { var pc = addDev(T, 'pc', 'PC ' + LETTERS[pcI++], hub.x + o[0], hub.y + o[1]); link(T, hub, pc); });
      } else {
        var pc = addDev(T, 'pc', 'PC ' + LETTERS[pcI++], sw.x + s[0], sw.y + s[1]); link(T, sw, pc, port, '');
      }
    }
  });
  return T;
}

function pcs(T) { return T.dev.filter(function (d) { return d.t === 'pc'; }); }
function nbrs(T, id) { var o = []; T.links.forEach(function (l) { if (l.a === id) o.push({to: l.b, myPort: l.pa}); else if (l.b === id) o.push({to: l.a, myPort: l.pb}); }); return o; }

/* ---------- Simulation ---------- */
/* tables: {swId: {mac: port}}; liefert, was mit dem Frame passiert, und ändert die Tabellen */
function send(T, tables, srcId, dstMac) {
  var src = T.dev[srcId], reached = [], acts = [], hops = [], queue = [{at: srcId, from: -1, inPort: '', depth: 0}], seen = {};
  seen[srcId] = 1;
  while (queue.length) {
    var q = queue.shift(), d = T.dev[q.at], outs = [];
    if (d.t === 'pc') { if (q.at !== srcId) reached.push(q.at); if (q.at === srcId) outs = nbrs(T, q.at); }
    else if (d.t === 'hub') outs = nbrs(T, q.at).filter(function (n) { return n.to !== q.from; });
    else {
      var tb = tables[q.at] = tables[q.at] || {}, isNew = tb[src.mac] !== q.inPort;
      var learn = {mac: src.mac, port: q.inPort, isNew: isNew, moved: tb[src.mac] !== undefined && isNew};
      tb[src.mac] = q.inPort;
      var all = nbrs(T, q.at).filter(function (n) { return n.myPort !== q.inPort; }), act, known = dstMac !== BC && tb[dstMac] !== undefined;
      if (dstMac === BC) { act = 'bcast'; outs = all; }
      else if (!known) { act = 'flood'; outs = all; }
      else if (tb[dstMac] === q.inPort) { act = 'filter'; outs = []; }
      else { act = 'forward'; outs = all.filter(function (n) { return n.myPort === tb[dstMac]; }); }
      acts.push({sw: q.at, learn: learn, act: act, inPort: q.inPort, out: outs.map(function (n) { return n.myPort; })});
    }
    outs.forEach(function (n) {
      if (seen[n.to]) return; seen[n.to] = 1;
      var back = nbrs(T, n.to).filter(function (m) { return m.to === q.at; })[0];
      hops.push({from: q.at, to: n.to, depth: q.depth});
      queue.push({at: n.to, from: q.at, inPort: back ? back.myPort : '', depth: q.depth + 1});
    });
  }
  var dst = T.dev.filter(function (x) { return x.mac === dstMac; })[0];
  return {src: srcId, dst: dst ? dst.id : -1, dstMac: dstMac, reached: reached.sort(function (a, b) { return a - b; }), acts: acts, hops: hops};
}
function cloneTables(t) { var o = {}; Object.keys(t).forEach(function (k) { o[k] = {}; Object.keys(t[k]).forEach(function (m) { o[k][m] = t[k][m]; }); }); return o; }
function simulate(T) {
  var tables = {}, steps = [];
  T.frames.forEach(function (f) { var s = send(T, tables, f[0], f[1]); s.after = cloneTables(tables); steps.push(s); });
  return {steps: steps, tables: tables};
}

/* ---------- Aufgaben ---------- */
function frames(r, T, lvl) {
  var P = pcs(T), n = lvl === 'L' ? 4 : lvl === 'M' ? 5 : 6, out = [], sent = {}, bcastDone = false;
  for (var i = 0; i < n; i++) {
    var s = pick(r, P), d, x = r();
    if (lvl !== 'L' && !bcastDone && (x < 0.25 || i === n - 2)) { d = BC; bcastDone = true; }
    else {
      var known = P.filter(function (p) { return sent[p.id] && p.id !== s.id; });
      var cand = known.length && r() < 0.55 ? known : P.filter(function (p) { return p.id !== s.id; });
      d = pick(r, cand).mac;
    }
    out.push([s.id, d]); sent[s.id] = 1;
  }
  return out;
}
function good(T, lvl, sim) {
  var acts = []; sim.steps.forEach(function (s) { acts = acts.concat(s.acts.map(function (a) { return a.act; })); });
  if (acts.indexOf('forward') < 0 || acts.indexOf('flood') < 0) return false;
  if (lvl === 'S' && acts.indexOf('filter') < 0 && acts.indexOf('forward') < 0) return false;
  if (lvl !== 'L' && acts.indexOf('bcast') < 0) return false;
  if (lvl === 'S') {
    /* mind. ein Frame zwischen den beiden PCs am Hub → Switch filtert */
    if (acts.indexOf('filter') < 0) return false;
  }
  var t = sim.tables[T.ask];
  return t && Object.keys(t).length >= 2 && Object.keys(t).length < pcs(T).length + (lvl === 'L' ? 0 : 1);
}
function makeTask(seed, lvl) {
  lvl = String(lvl).toUpperCase();
  if (!LVCODE[lvl] || !(seed >= 1)) return null;
  for (var att = 0; att < 400; att++) {
    var r = mulberry32((seed * 7919 + att * 104729 + LVCODE[lvl] * 1000003) >>> 0);
    var T = build(r, lvl);
    var sws = T.dev.filter(function (d) { return d.t === 'sw'; });
    T.ask = lvl === 'S' ? pick(r, sws).id : pick(r, sws).id;
    T.frames = frames(r, T, lvl);
    /* Schwer: einen Frame zwischen den Hub-PCs erzwingen */
    if (lvl === 'S') {
      var hub = T.dev.filter(function (d) { return d.t === 'hub'; })[0], hp = nbrs(T, hub.id).filter(function (n) { return T.dev[n.to].t === 'pc'; }).map(function (n) { return n.to; });
      if (hp.length === 2) { var k = ri(r, 2, T.frames.length - 1); T.frames[k] = [hp[1], T.dev[hp[0]].mac]; if (!T.frames.slice(0, k).some(function (f) { return f[0] === hp[0]; })) T.frames[k - 1] = [hp[0], T.frames[k - 1][1] === T.dev[hp[0]].mac ? BC : T.frames[k - 1][1]]; }
    }
    var sim = simulate(T);
    if (!good(T, lvl, sim)) continue;
    T.code = lvl + '-' + seed; T.level = lvl; T.sim = sim;
    return frame(T);
  }
  return null;
}
function demo() {
  var T = {dev: [], links: []};
  var s1 = addDev(T, 'sw', 'SW1', 230, 210), s2 = addDev(T, 'sw', 'SW2', 590, 210);
  link(T, s1, s2, 'Gi0/1', 'Gi0/1');
  link(T, s1, addDev(T, 'pc', 'PC A', 140, 85), 'Fa0/1');
  link(T, s1, addDev(T, 'pc', 'PC B', 140, 335), 'Fa0/2');
  link(T, s1, addDev(T, 'pc', 'PC C', 320, 335), 'Fa0/3');
  link(T, s2, addDev(T, 'pc', 'PC D', 680, 85), 'Fa0/1');
  link(T, s2, addDev(T, 'pc', 'PC E', 680, 335), 'Fa0/2');
  T.frames = []; T.ask = 0; T.code = 'D'; return frame(T);
}
function frame(T) {
  var xs = T.dev.map(function (d) { return d.x; }), ys = T.dev.map(function (d) { return d.y; }), x0 = Math.min.apply(null, xs) - 75, y0 = Math.min.apply(null, ys) - 72;
  T.dev.forEach(function (d) { d.x = Math.round(d.x - x0); d.y = Math.round(d.y - y0); });
  T.W = Math.max.apply(null, T.dev.map(function (d) { return d.x; })) + 75; T.H = Math.max.apply(null, T.dev.map(function (d) { return d.y; })) + 60;
  return T;
}

/* ---------- Zeichnen ---------- */
function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); }
var ICON = {
  sw: '<path d="M-30 -3l10 -10h42l-10 10z" fill="#6aaecb" stroke="#1f5872" stroke-width="1"/><path d="M-30 -3h42v13h-42z" fill="#2f7392"/><path d="M12 -3l10 -10v13l-10 10z" fill="#1f5872"/><path d="M-16 -8h18M-8 -5h18" stroke="#fff" stroke-width="1.6"/>',
  hub: '<path d="M-13 -15l6 -6h21l-6 6z" fill="#6aaecb" stroke="#1f5872" stroke-width="1"/><rect x="-13" y="-15" width="21" height="32" fill="#2f7392"/><path d="M8 -15l6 -6v32l-6 6z" fill="#1f5872"/><path d="M-9 -11v24M-5 -11v24M-1 -11v24M3 -11v24" stroke="#9cc9dc" stroke-width="1.3"/>',
  pc: '<rect x="-17" y="-18" width="34" height="24" rx="2" fill="#2f7392"/><rect x="-14" y="-15" width="28" height="18" fill="#d8ecf5"/><path d="M-3 6h6v5h-6z" fill="#1f5872"/><rect x="-12" y="11" width="24" height="4" rx="1" fill="#2f7392"/>'
};
function draw(T, opts) {
  opts = opts || {};
  var h = '<svg class="eth" viewBox="0 0 ' + T.W + ' ' + T.H + '" style="max-width:' + Math.round(T.W * 1.15) + 'px;margin:0 auto" role="img" aria-label="Netzwerkplan">';
  T.links.forEach(function (l, k) {
    var A = T.dev[l.a], B = T.dev[l.b], hl = opts.hl && opts.hl[k];
    if (hl) h += '<line x1="' + A.x + '" y1="' + A.y + '" x2="' + B.x + '" y2="' + B.y + '" stroke="' + hl + '" stroke-opacity=".4" stroke-width="14" stroke-linecap="round"/>';
    h += '<line x1="' + A.x + '" y1="' + A.y + '" x2="' + B.x + '" y2="' + B.y + '" stroke="#1c2b33" stroke-width="' + (A.t === 'sw' && B.t === 'sw' ? 4 : 2.5) + '"/>';
  });
  /* Portnamen am Switch */
  T.links.forEach(function (l) {
    [[l.a, l.b, l.pa], [l.b, l.a, l.pb]].forEach(function (e) {
      if (!e[2]) return; var A = T.dev[e[0]], B = T.dev[e[1]], dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy), t = Math.min(52, L * 0.4) / L;
      var x = A.x + dx * t, y = A.y + dy * t, nx = -dy / L, ny = dx / L; if (nx < 0) { nx = -nx; ny = -ny; }
      h += '<text x="' + Math.round(x + nx * 12) + '" y="' + Math.round(y + ny * 12 + 4) + '" font-size="11.5" font-family="ui-monospace,Menlo,Consolas,monospace" fill="#455a64" stroke="#fff" stroke-width="3" paint-order="stroke" text-anchor="' + (Math.abs(nx) > 0.4 ? 'start' : 'middle') + '">' + e[2] + '</text>';
    });
  });
  h += '<g class="pk"></g>';
  T.dev.forEach(function (d) {
    var on = opts.mark && opts.mark[d.id];
    if (on) h += '<circle cx="' + d.x + '" cy="' + d.y + '" r="30" fill="' + on + '" fill-opacity=".18" stroke="' + on + '" stroke-width="2.5"/>';
    h += '<g transform="translate(' + d.x + ' ' + d.y + ')">' + ICON[d.t] + '</g>';
    var below = d.t === 'pc' ? 32 : d.t === 'hub' ? 34 : 30;
    if (d.t === 'pc') { var up = nbrs(T, d.id)[0]; if (up && T.dev[up.to].y > d.y + 20) below = -30; }
    if (d.t === 'pc' && opts.ips) h += '<text x="' + d.x + '" y="' + (d.y + below + (below < 0 ? -28 : 28)) + '" text-anchor="middle" font-size="11.5" font-family="ui-monospace,Menlo,Consolas,monospace" fill="#546e7a" stroke="#fff" stroke-width="3" paint-order="stroke">' + opts.ips[d.id] + '</text>';
    h += '<text x="' + d.x + '" y="' + (d.y + below) + '" text-anchor="middle" font-size="14" font-weight="700" font-family="Open Sans,Arial,sans-serif" fill="#1c2b33" stroke="#fff" stroke-width="3.5" paint-order="stroke">' + esc(d.name) + '</text>';
    if (d.t === 'pc') h += '<text x="' + d.x + '" y="' + (d.y + below + (below < 0 ? -14 : 14)) + '" text-anchor="middle" font-size="11.5" font-family="ui-monospace,Menlo,Consolas,monospace" fill="#1565c0" stroke="#fff" stroke-width="3" paint-order="stroke">' + (opts.win ? winMac(d.mac) : d.mac) + '</text>';
  });
  return h + '</svg>';
}
/* „show mac address-table“ wie am Switch */
function tableTxt(T, swId, tb, hlMac) {
  var rows = Object.keys(tb || {}).sort().map(function (m) { return {m: m, p: tb[m]}; });
  var s = T.dev[swId].name + '#show mac address-table\n          Mac Address Table\n-------------------------------------------\nVlan    Mac Address       Type        Ports\n----    -----------       --------    -----\n';
  return {head: s, rows: rows.map(function (x) { return {txt: '   1    ' + x.m + '    DYNAMIC     ' + x.p, mac: x.m, hl: x.m === hlMac}; }), empty: !rows.length};
}
function portsOf(T, swId) { return nbrs(T, swId).map(function (n) { return n.myPort; }).sort(); }
function nameOfMac(T, m) { if (m === BC) return 'Broadcast'; var d = T.dev.filter(function (x) { return x.mac === m; })[0]; return d ? d.name : m; }

G.ETH = {winMac: winMac, LVNAME: LVNAME, BC: BC, makeTask: makeTask, demo: demo, send: send, simulate: simulate, draw: draw, tableTxt: tableTxt, pcs: pcs, nbrs: nbrs, portsOf: portsOf, nameOfMac: nameOfMac, cloneTables: cloneTables};
})(typeof window !== 'undefined' ? window : globalThis);
