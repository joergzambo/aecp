/* AECP · VLAN-Engine: Broadcast-Weg, Ping, Aufgaben-Generator, Zeichnen.
   Läuft im Browser (window.VLAN) und in Node (globalThis.VLAN). */
(function (G) {
'use strict';

var VC = {1: '#78909c', 10: '#1565c0', 20: '#ef6c00', 30: '#7b1fa2', 40: '#2e7d32', 99: '#6d4c41'};
function vcol(v) { return VC[v] || '#455a64'; }
function allows(list, v) { return list === null || list.indexOf(v) >= 0; }
function listTxt(list) { return list === null ? '1-4094' : list.slice().sort(function (a, b) { return a - b; }).join(','); }

/* ---------- Kern: wohin läuft ein Broadcast? ---------- */
function trace(T, sender) {
  var p = T.pcs.filter(function (x) { return x.name === sender; })[0];
  var hops = [{kind: 'access', from: p.name, to: p.sw, t0: 0, vlan: p.vlan}];
  var recv = [], wire = [], seen = {}, q = [{sw: p.sw, v: p.vlan, t: 1, via: -1}];
  seen[p.sw + '|' + p.vlan] = 1;
  while (q.length) {
    var c = q.shift();
    T.pcs.forEach(function (x) {
      if (x.sw === c.sw && x.vlan === c.v && x.name !== sender && recv.indexOf(x.name) < 0) {
        recv.push(x.name);
        hops.push({kind: 'access', from: c.sw, to: x.name, t0: c.t, vlan: c.v});
      }
    });
    T.links.forEach(function (L, li) {
      if (li === c.via) return;
      var X, Y, ys, xp, yp;
      if (L.a === c.sw) { X = L.A; Y = L.B; ys = L.b; xp = L.pa; yp = L.pb; }
      else if (L.b === c.sw) { X = L.B; Y = L.A; ys = L.a; xp = L.pb; yp = L.pa; }
      else return;
      var ev = {link: li, from: c.sw, to: ys, fromPort: xp, toPort: yp, vlan: c.v, t0: c.t, native: X.native, farNative: Y.native};
      if (!allows(X.allowed, c.v)) {
        ev.status = 'egress';
      } else {
        ev.tagged = c.v !== X.native;
        var nv = ev.tagged ? c.v : Y.native;
        ev.arrive = nv;
        if (!allows(Y.allowed, nv)) ev.status = 'ingress';
        else {
          ev.status = nv !== c.v ? 'leak' : 'ok';
          var k = ys + '|' + nv;
          if (!seen[k]) { seen[k] = 1; q.push({sw: ys, v: nv, t: c.t + 1, via: li}); }
        }
      }
      wire.push(ev);
      hops.push({kind: 'trunk', from: c.sw, to: ys, t0: c.t, vlan: c.v, tagged: ev.tagged, arrive: ev.arrive, status: ev.status, link: li});
    });
  }
  return {recv: recv, wire: wire, hops: hops};
}

function ping(T, a, b) {
  var A = pcBy(T, a), B = pcBy(T, b);
  if (A.vlan !== B.vlan) return {ok: false, why: a + ' ist in VLAN ' + A.vlan + ', ' + b + ' in VLAN ' + B.vlan + '. Verschiedene VLANs sind verschiedene Netze – ohne Router (Inter-VLAN-Routing) geht kein Ping.'};
  var ab = trace(T, a).recv.indexOf(b) >= 0, ba = trace(T, b).recv.indexOf(a) >= 0;
  if (ab && ba) return {ok: true, why: 'Beide sind in VLAN ' + A.vlan + ' und VLAN ' + A.vlan + ' kommt über alle Trunks dazwischen durch (ARP-Broadcast und Antwort erreichen das Ziel).'};
  var tr = trace(T, ab ? b : a), bad = explain(T, {wire: tr.wire.filter(function (e) { return e.status !== 'ok'; })});
  return {ok: false, why: 'Beide sind zwar in VLAN ' + A.vlan + ', aber ' + (ab ? 'die Antwort von ' + b : 'der ARP-Broadcast von ' + a) + ' kommt nicht an. ' + bad.join(' ')};
}
function pcBy(T, n) { return T.pcs.filter(function (x) { return x.name === n; })[0]; }

function explain(T, tr) {
  var lines = [];
  tr.wire.forEach(function (e) {
    var a = e.from + ' ' + e.fromPort, b = e.to + ' ' + e.toPort;
    if (e.status === 'egress') lines.push('✕ ' + a + ' → ' + e.to + ': VLAN ' + e.vlan + ' ist auf ' + a + ' nicht erlaubt – der Frame wird gar nicht gesendet.');
    else if (e.status === 'ingress') lines.push('✕ ' + a + ' → ' + b + ': ' + (e.tagged ? 'Frame mit Tag ' + e.vlan + ', aber auf ' + b + ' ist VLAN ' + e.vlan + ' nicht erlaubt' : 'Frame ohne Tag (native VLAN ' + e.vlan + ' auf ' + e.from + '); ' + e.to + ' ordnet ihn seinem native VLAN ' + e.arrive + ' zu, das dort nicht erlaubt ist') + ' – verworfen.');
    else if (e.status === 'leak') lines.push('⚠ ' + a + ' → ' + b + ': VLAN ' + e.vlan + ' ist auf ' + e.from + ' das native VLAN und geht ohne Tag raus. ' + e.to + ' hat native VLAN ' + e.arrive + ' und steckt den Frame in VLAN ' + e.arrive + ' – Native-VLAN-Mismatch, der Broadcast springt in ein anderes VLAN!');
    else lines.push('✓ ' + a + ' → ' + b + ': VLAN ' + e.vlan + (e.tagged ? ' mit 802.1Q-Tag ' + e.vlan : ' ohne Tag (native VLAN auf beiden Seiten)') + ' – angenommen.');
  });
  return lines;
}

/* ---------- Zufall ---------- */
function rng(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function pick(r, a) { return a[Math.floor(r() * a.length)]; }
function shuffle(r, a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

var LVNAME = {L: 'Leicht', M: 'Mittel', S: 'Schwer'};
var LVCODE = {L: 1, M: 2, S: 3};

function build(r, n, vlans, perSw) {
  var sw = [], pcs = [], links = [], k = 1;
  for (var i = 0; i < n; i++) sw.push('SW' + (i + 1));
  sw.forEach(function (s, i) {
    var cnt = perSw[0] + Math.floor(r() * (perSw[1] - perSw[0] + 1));
    for (var j = 0; j < cnt; j++) pcs.push({name: 'PC' + (k++), sw: s, port: 'Fa0/' + (j + 1), vlan: pick(r, vlans)});
  });
  var gi = {};
  for (i = 0; i < n - 1; i++) {
    var a = sw[i], b = sw[i + 1];
    gi[a] = (gi[a] || 0) + 1; gi[b] = (gi[b] || 0) + 1;
    links.push({a: a, b: b, pa: 'Gi0/' + gi[a], pb: 'Gi0/' + gi[b], A: {allowed: null, native: 1}, B: {allowed: null, native: 1}});
  }
  return {sw: sw, pcs: pcs, links: links};
}

function issues(T, sender, pa, pb) {
  var st = {};
  [trace(T, sender), trace(T, pa), trace(T, pb)].forEach(function (tr) { tr.wire.forEach(function (e) { st[e.status] = 1; }); });
  return st;
}

function tryMake(r, lvl) {
  var T, n, vlans;
  if (lvl === 'L') {
    n = 2; vlans = r() < 0.5 ? [10, 20] : [10, 20, 30];
    T = build(r, n, vlans, [2, 3]);
  } else if (lvl === 'M') {
    n = r() < 0.5 ? 2 : 3; vlans = shuffle(r, [10, 20, 30, 40]).slice(0, 3).sort(function (a, b) { return a - b; });
    T = build(r, n, vlans, n === 2 ? [3, 4] : [2, 3]);
    T.links.forEach(function (L) {
      if (r() < 0.6) { var miss = pick(r, vlans), al = vlans.filter(function (v) { return v !== miss; }); L.A.allowed = al.slice(); L.B.allowed = al.slice(); }
    });
  } else {
    n = r() < 0.5 ? 3 : 4; vlans = shuffle(r, [10, 20, 30, 40]).slice(0, r() < 0.5 ? 3 : 4).sort(function (a, b) { return a - b; });
    T = build(r, n, vlans, n === 3 ? [2, 3] : [2, 2]);
    T.links.forEach(function (L) {
      var u = r();
      if (u < 0.35) { var miss = pick(r, vlans), al = vlans.filter(function (v) { return v !== miss; }); L.A.allowed = al.slice(); L.B.allowed = al.slice(); }
      else if (u < 0.75) { var m2 = pick(r, vlans), side = r() < 0.5 ? 'A' : 'B'; L[side].allowed = vlans.filter(function (v) { return v !== m2; }); L[side === 'A' ? 'B' : 'A'].allowed = vlans.slice(); }
    });
    if (r() < 0.55) {
      var L = pick(r, T.links), nat = shuffle(r, [99].concat(vlans)).slice(0, 2);
      L.A.native = nat[0]; L.B.native = nat[1];
      [L.A, L.B].forEach(function (S) { if (S.allowed !== null && S.allowed.indexOf(S.native) < 0 && S.native !== 99) S.allowed.push(S.native); if (S.native === 99 && S.allowed !== null) S.allowed.push(99); });
    }
  }
  var names = T.pcs.map(function (p) { return p.name; });
  var sender = pick(r, names);
  var same = [], diff = [];
  for (var i = 0; i < T.pcs.length; i++) for (var j = i + 1; j < T.pcs.length; j++) {
    var A = T.pcs[i], B = T.pcs[j];
    if (A.sw === B.sw) continue;
    (A.vlan === B.vlan ? same : diff).push([A.name, B.name]);
  }
  var pair = (same.length && (r() < 0.75 || !diff.length)) ? pick(r, same) : (diff.length ? pick(r, diff) : null);
  if (!pair) return null;
  var tr = trace(T, sender);
  if (!tr.recv.length) return null;
  var st = issues(T, sender, pair[0], pair[1]);
  if (lvl === 'M' && !st.egress) return null;
  if (lvl === 'S' && !(st.leak || st.ingress)) return null;
  if (lvl === 'S' && Object.keys(st).length < 3) return null;
  T.sender = sender; T.pair = pair;
  return T;
}

function makeTask(seed, lvl) {
  if (!LVCODE[lvl]) return null;
  for (var att = 0; att < 5000; att++) {
    var T = tryMake(rng((seed * 7919 + att * 104729 + LVCODE[lvl] * 1000003) >>> 0), lvl);
    if (T) { T.seed = seed; T.level = lvl; T.code = lvl + '-' + seed; return T; }
  }
  return null;
}

/* ---------- Zeichnen ---------- */
var W = 760, H = 400, SY = 160, PY = 318, BW = 120, BH = 52, PW = 66, PH = 40;
function bw(T) { return T.sw.length >= 4 ? 100 : 120; }
function layout(T) {
  var n = T.sw.length, pos = {}, M = n >= 4 ? 125 : 150, gap = n === 1 ? 0 : (W - 2 * M) / (n - 1);
  T.sw.forEach(function (s, i) { pos[s] = [n === 1 ? W / 2 : M + i * gap, SY]; });
  T.sw.forEach(function (s) {
    var mine = T.pcs.filter(function (p) { return p.sw === s; }), k = mine.length, sp = n >= 4 ? 68 : (k > 3 ? 74 : 80);
    mine.forEach(function (p, i) { pos[p.name] = [pos[s][0] + (i - (k - 1) / 2) * sp, PY]; });
  });
  return pos;
}
function txt(x, y, s, o) { o = o || {}; return '<text x="' + x + '" y="' + y + '" text-anchor="' + (o.a || 'middle') + '" font-size="' + (o.fs || 12) + '" font-weight="' + (o.fw || 400) + '" fill="' + (o.c || '#1c2b33') + '"' + (o.ff ? ' font-family="' + o.ff + '"' : '') + '>' + s + '</text>'; }

function draw(T, opt) {
  opt = opt || {};
  var pos = layout(T), y0 = opt.sol ? 0 : 92, o = ['<svg viewBox="0 ' + y0 + ' ' + W + ' ' + (H - y0) + '" role="img" aria-label="Topologie mit VLANs">'];
  var sol = opt.sol, recv = sol ? sol.recv : [], sender = opt.sender;
  // Trunks
  T.links.forEach(function (L, li) {
    var a = pos[L.a], b = pos[L.b], x1 = a[0] + bw(T) / 2, x2 = b[0] - bw(T) / 2;
    o.push('<line x1="' + x1 + '" y1="' + SY + '" x2="' + x2 + '" y2="' + SY + '" stroke="#1c2b33" stroke-width="4"/>');
    if (x2 - x1 > 90) o.push(txt((x1 + x2) / 2, SY + 20, 'Trunk', {fs: 11, c: '#546e7a', fw: 600}));
    o.push(txt(x1 + 4, SY - 8, L.pa, {fs: 10, a: 'start', c: '#546e7a'}), txt(x2 - 4, SY - 8, L.pb, {fs: 10, a: 'end', c: '#546e7a'}));
    if (sol) {
      var evs = sol.wire.filter(function (e) { return e.link === li; });
      evs.forEach(function (e, i) {
        var right = T.sw.indexOf(e.to) > T.sw.indexOf(e.from), lab, col;
        if (e.status === 'egress') { lab = (right ? '' : '← ') + 'VLAN ' + e.vlan + ' ✕' + (right ? ' →' : ''); col = '#c62828'; }
        else if (e.status === 'ingress') { lab = (right ? '' : '← ') + (e.tagged ? 'Tag ' + e.vlan : 'ohne Tag') + ' ✕' + (right ? ' →' : ''); col = '#c62828'; }
        else if (e.status === 'leak') { lab = (right ? '' : '← ') + 'ohne Tag → VLAN ' + e.arrive + ' ⚠' + (right ? ' →' : ''); col = '#e65100'; }
        else { lab = (right ? '' : '← ') + (e.tagged ? 'Tag ' + e.vlan : 'ohne Tag') + ' ✓' + (right ? ' →' : ''); col = '#2e7d32'; }
        var w = lab.length * 6.4 + 14, cx = (x1 + x2) / 2, cy = SY - 44 - i * 24;
        o.push('<rect x="' + (cx - w / 2) + '" y="' + (cy - 10) + '" width="' + w + '" height="20" rx="10" fill="#fff" stroke="' + col + '" stroke-width="1.5"/>' + txt(cx, cy + 4, lab, {fs: 11, fw: 700, c: col}));
      });
    }
  });
  // Access-Leitungen + PCs
  T.pcs.forEach(function (p) {
    var s = pos[p.sw], q = pos[p.name], c = vcol(p.vlan);
    var isR = recv.indexOf(p.name) >= 0, isS = sender === p.name, dim = sol && !isR && !isS;
    o.push('<line x1="' + s[0] + '" y1="' + (SY + BH / 2) + '" x2="' + q[0] + '" y2="' + (PY - PH / 2) + '" stroke="' + c + '" stroke-width="2.5" opacity="' + (dim ? 0.35 : 1) + '"/>');
    var mx = s[0] + (q[0] - s[0]) * 0.62, my = SY + BH / 2 + (PY - PH / 2 - SY - BH / 2) * 0.62;
    o.push('<rect x="' + (mx - 18) + '" y="' + (my - 8) + '" width="36" height="16" rx="4" fill="#fff"/>' + txt(mx, my + 4, p.port, {fs: 10, c: '#546e7a'}));
    var stroke = isS ? '#1c2b33' : isR ? '#2e7d32' : '#90a4ae', sw = isS || isR ? 3 : 1.5;
    o.push('<g class="pc" data-pc="' + p.name + '" opacity="' + (dim ? 0.45 : 1) + '"' + (opt.click ? ' style="cursor:pointer"' : '') + '>' +
      '<rect x="' + (q[0] - PW / 2) + '" y="' + (PY - PH / 2) + '" width="' + PW + '" height="' + PH + '" rx="6" fill="' + (isR ? '#e3f4e6' : '#fff') + '" stroke="' + stroke + '" stroke-width="' + sw + '"/>' +
      txt(q[0], PY - 2, p.name, {fs: 13, fw: 700}) +
      '<rect x="' + (q[0] - 26) + '" y="' + (PY + 4) + '" width="52" height="13" rx="6.5" fill="' + c + '"/>' + txt(q[0], PY + 14, 'VLAN ' + p.vlan, {fs: 9.5, fw: 700, c: '#fff'}) + '</g>');
    if (isS) o.push(txt(q[0], PY + PH / 2 + 16, 'Sender', {fs: 11, fw: 700}));
    if (isR) o.push(txt(q[0], PY + PH / 2 + 16, '✓ empfängt', {fs: 11, fw: 700, c: '#2e7d32'}));
  });
  // Switches
  T.sw.forEach(function (s) {
    var p = pos[s];
    o.push('<rect x="' + (p[0] - bw(T) / 2) + '" y="' + (SY - BH / 2) + '" width="' + bw(T) + '" height="' + BH + '" rx="8" fill="#f4f6f8" stroke="#1c2b33" stroke-width="1.5"/>' + txt(p[0], SY + 5, s, {fs: 17, fw: 700}));
  });
  if (opt.anim) o.push(opt.anim(pos));
  o.push('</svg>');
  return o.join('');
}

function showTrunk(T, s) {
  var rows = [];
  T.links.forEach(function (L) {
    if (L.a === s) rows.push([L.pa, L.A]);
    if (L.b === s) rows.push([L.pb, L.B]);
  });
  if (!rows.length) return '';
  var out = s + '#show interfaces trunk\n\nPort   Mode  Encapsulation  Status    Native vlan\n';
  rows.forEach(function (r) { out += pad(r[0], 7) + pad('on', 6) + pad('802.1q', 15) + pad('trunking', 10) + r[1].native + '\n'; });
  out += '\nPort   Vlans allowed on trunk\n';
  rows.forEach(function (r) { out += pad(r[0], 7) + listTxt(r[1].allowed) + '\n'; });
  return out;
}
function pad(s, n) { s = String(s); while (s.length < n) s += ' '; return s; }

G.VLAN = {trace: trace, ping: ping, explain: explain, makeTask: makeTask, draw: draw, layout: layout, showTrunk: showTrunk, vcol: vcol, listTxt: listTxt, LVNAME: LVNAME, rng: rng};
})(typeof window !== 'undefined' ? window : globalThis);
