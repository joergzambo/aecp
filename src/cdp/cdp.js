/* NWT · CDP: Netzplan aus CDP-Ausgaben rekonstruieren. Topologie-Generator, CDP-Ausgaben, Zeichnen.
   Browser: window.CDP · Node: globalThis.CDP */
(function (G) {
'use strict';
var LVNAME = {L: 'Leicht', M: 'Mittel', S: 'Schwer'};
var LVCODE = {L: 3, M: 4, S: 5};
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function ri(r, a, b) { return a + Math.floor(r() * (b - a + 1)); }
function pick(r, a) { return a[Math.floor(r() * a.length)]; }
function shuffle(r, a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

/* ---------- Geräte ---------- */
function range(pre, a, b) { var o = []; for (var i = a; i <= b; i++) o.push(pre + i); return o; }
var RCAP = ['R B S I', 'Router Source-Route-Bridge Switch IGMP'];
var MODELS = {
  c2960a: {plat: 'WS-C2960-24TT-L', type: 'sw', caps: 'S I', capl: 'Switch IGMP', ports: range('FastEthernet0/', 1, 24).concat(range('GigabitEthernet0/', 1, 2)), up: ['GigabitEthernet0/1', 'GigabitEthernet0/2'],
    ver: 'Cisco IOS Software, C2960 Software (C2960-LANBASEK9-M), Version 15.2(7)E8, RELEASE SOFTWARE (fc3)'},
  c2960b: {plat: 'WS-C2960-48TT-L', type: 'sw', caps: 'S I', capl: 'Switch IGMP', ports: range('FastEthernet0/', 1, 48).concat(range('GigabitEthernet0/', 1, 2)), up: ['GigabitEthernet0/1', 'GigabitEthernet0/2'],
    ver: 'Cisco IOS Software, C2960 Software (C2960-LANBASEK9-M), Version 15.2(7)E8, RELEASE SOFTWARE (fc3)'},
  c3650: {plat: 'WS-C3650-24PS', type: 'sw', caps: 'R S I', capl: 'Router Switch IGMP', ports: range('GigabitEthernet1/0/', 1, 24).concat(range('GigabitEthernet1/1/', 1, 4)), up: range('GigabitEthernet1/1/', 1, 4),
    ver: 'Cisco IOS Software [Gibraltar], Catalyst L3 Switch Software (CAT3K_CAA-UNIVERSALK9-M), Version 16.12.10, RELEASE SOFTWARE (fc2)'},
  c9200: {plat: 'C9200L-24P-4G', type: 'sw', caps: 'S I', capl: 'Switch IGMP', ports: range('GigabitEthernet1/0/', 1, 24).concat(range('GigabitEthernet1/1/', 1, 4)), up: range('GigabitEthernet1/1/', 1, 4),
    ver: 'Cisco IOS Software [Cupertino], Catalyst L3 Switch Software (CAT9K_LITE_IOSXE), Version 17.9.4a, RELEASE SOFTWARE (fc3)'},
  isr4331: {plat: 'ISR4331/K9', type: 'r', caps: RCAP[0], capl: RCAP[1], ports: range('GigabitEthernet0/0/', 0, 2), up: [],
    ver: 'Cisco IOS Software [Bengaluru], ISR Software (X86_64_LINUX_IOSD-UNIVERSALK9-M), Version 17.6.5, RELEASE SOFTWARE (fc2)'},
  c2911: {plat: 'CISCO2911/K9', type: 'r', caps: RCAP[0], capl: RCAP[1], ports: range('GigabitEthernet0/', 0, 2), up: [],
    ver: 'Cisco IOS Software, C2900 Software (C2900-UNIVERSALK9-M), Version 15.7(3)M8, RELEASE SOFTWARE (fc1)'},
  c1111: {plat: 'C1111-8P', type: 'r', caps: RCAP[0], capl: RCAP[1], ports: range('GigabitEthernet0/0/', 0, 1), up: [],
    ver: 'Cisco IOS Software [Cupertino], c1100 Software (ARMV8EB_LINUX_IOSD-UNIVERSALK9_IAS-M), Version 17.9.4a, RELEASE SOFTWARE (fc3)'}
};
var MODEL_KEYS = ['c2960a', 'c2960b', 'c3650', 'c9200', 'isr4331', 'c2911', 'c1111'];
var SWK = ['c2960a', 'c2960b', 'c3650', 'c9200'], RK = ['isr4331', 'c2911', 'c1111'];
var NAMES = ['ZEUS', 'HERA', 'APOLLO', 'ATHENE', 'KELLER-01', 'GANG-OST', 'EDV-RACK', 'LAB-A', 'LAB-B', 'AULA', 'TURM', 'NORD', 'SUED', 'FALKE', 'ADLER', 'BIBER', 'LUCHS', 'KOBRA', 'WERKSTATT', 'BIBLIOTHEK', 'STIEGE-2', 'MERKUR', 'SATURN', 'PLUTO'];
var DOMAINS = ['.htl.local', '.schule.intern', '.pinkafeld.lan'];

function short(p) { return p.replace('FastEthernet', 'Fa').replace('GigabitEthernet', 'Gi'); }
function abbr(p) { return p.replace('FastEthernet', 'Fas ').replace('GigabitEthernet', 'Gig '); }
function pidx(m, p) { return MODELS[m].ports.indexOf(p); }

/* ---------- Aufgabe ---------- */
function build(r, lvl) {
  var nr = lvl === 'L' ? 1 : lvl === 'M' ? ri(r, 1, 2) : 2, ns = lvl === 'L' ? 2 : lvl === 'M' ? (nr === 1 ? ri(r, 3, 4) : 3) : 4;
  var names = shuffle(r, NAMES), devs = [];
  for (var i = 0; i < nr + ns; i++) {
    var isR = i < nr;
    devs.push({i: i, host: names[i], model: isR ? pick(r, RK) : pick(r, SWK), used: {}});
  }
  /* Baum: Router zuerst, dann jeder Switch an ein bestehendes Gerät */
  var links = [], deg = devs.map(function () { return 0; });
  function cap(d) { return d.model in {isr4331: 1, c2911: 1, c1111: 1} ? MODELS[d.model].ports.length : 6; }
  function can(a, b) { return deg[a.i] < cap(a) && deg[b.i] < cap(b) && !linked(a.i, b.i); }
  function linked(a, b) { return links.some(function (l) { return (l.a.d === a && l.b.d === b) || (l.a.d === b && l.b.d === a); }); }
  function add(a, b) { links.push({a: {d: a.i}, b: {d: b.i}}); deg[a.i]++; deg[b.i]++; }
  if (nr === 2) add(devs[0], devs[1]);
  for (i = nr; i < devs.length; i++) {
    var cand = devs.slice(0, i).filter(function (d) { return can(d, devs[i]); });
    if (!cand.length) return null;
    /* Switches hängen bevorzugt an Switches (Hierarchie), der erste an einem Router */
    var sw = cand.filter(function (d) { return MODELS[d.model].type === 'sw'; });
    add(i === nr || !sw.length || r() < 0.3 ? pick(r, cand.filter(function (d) { return MODELS[d.model].type === 'r'; }).concat(i === nr ? [] : sw)) || pick(r, cand) : pick(r, sw), devs[i]);
  }
  if (lvl === 'S') { /* redundanter Link zwischen zwei Switches */
    var sws = devs.filter(function (d) { return MODELS[d.model].type === 'sw'; }), pairs = [];
    sws.forEach(function (a) { sws.forEach(function (b) { if (a.i < b.i && can(a, b)) pairs.push([a, b]); }); });
    if (!pairs.length) return null;
    var pr = pick(r, pairs); add(pr[0], pr[1]);
  }
  /* Ports vergeben */
  function port(d, peer) {
    var m = MODELS[d.model], free = m.ports.filter(function (p) { return !d.used[p]; });
    var ups = m.up.filter(function (p) { return !d.used[p]; });
    var p = ups.length && (MODELS[peer.model].type === 'r' || r() < 0.55) ? pick(r, ups) : pick(r, free.filter(function (q) { return m.up.indexOf(q) < 0; }).slice(0, 24).concat(ups));
    d.used[p] = 1; return p;
  }
  links.forEach(function (l) { var A = devs[l.a.d], B = devs[l.b.d]; l.a.p = port(A, B); l.b.p = port(B, A); });
  /* Adressen */
  var mg = pick(r, [['10.' + ri(r, 1, 30) + '.99.', 1], ['192.168.' + ri(r, 100, 199) + '.', 1], ['172.16.' + ri(r, 1, 9) + '.', 1]])[0];
  var hosts = shuffle(r, range('', 2, 60).map(Number));
  devs.forEach(function (d, k) { if (MODELS[d.model].type === 'sw') d.ip = mg + hosts[k]; });
  var tn = 0, mgUsed = false;
  links.forEach(function (l) {
    var A = devs[l.a.d], B = devs[l.b.d], ra = MODELS[A.model].type === 'r', rb = MODELS[B.model].type === 'r';
    if (ra && rb) { var base = '10.255.' + ri(r, 0, 9) * 4 + tn + '.'; tn++; l.a.ip = base + '1'; l.b.ip = base + '2'; }
    else if (ra || rb) {
      var ip; if (!mgUsed) { ip = mg + '1'; mgUsed = true; } else { ip = '10.' + ri(r, 40, 90) + '.' + (10 + tn) + '.1'; tn++; }
      if (ra) l.a.ip = ip; else l.b.ip = ip;
    }
  });
  /* Domains (Schwer) */
  var dom = lvl === 'S' ? pick(r, DOMAINS) : null;
  devs.forEach(function (d) { d.id = dom && r() < 0.7 ? d.host + dom : d.host; });
  /* Pins: benutzte Ports + Attrappen */
  devs.forEach(function (d) {
    var m = MODELS[d.model], pins = Object.keys(d.used), nd = lvl === 'L' ? ri(r, 1, 2) : ri(r, 2, 3);
    var pool = shuffle(r, m.ports.filter(function (p) { return !d.used[p]; }).slice(0, 26));
    var near = pool.filter(function (p) { return m.up.indexOf(p) >= 0; }).concat(pool.filter(function (p) { return m.up.indexOf(p) < 0; }));
    pins = pins.concat(near.slice(0, Math.min(nd, Math.max(0, 6 - pins.length))));
    d.pins = pins.sort(function (a, b) { return pidx(d.model, a) - pidx(d.model, b); });
  });
  return {devs: devs, links: links};
}
function nbrs(T, d) {
  var o = [];
  T.links.forEach(function (l, k) { if (l.a.d === d) o.push({k: k, me: l.a, it: l.b}); else if (l.b.d === d) o.push({k: k, me: l.b, it: l.a}); });
  return o;
}
/* IP, die Gerät x per CDP über den Link meldet: Switch → Management-IP, Router → Interface-IP */
function advIP(T, end) { var d = T.devs[end.d]; return MODELS[d.model].type === 'sw' ? d.ip : end.ip; }
function chooseOutputs(T, r, lvl) {
  var n = T.devs.length, D = {}, B = {};
  function covered(u) { return nbrs(T, u).some(function (x) { return D[x.it.d]; }); }
  var order = shuffle(r, range('', 0, n - 1).map(Number));
  order.forEach(function (u) { if (!covered(u)) D[pick(r, nbrs(T, u)).it.d] = 1; });
  var pB = lvl === 'L' ? 1 : lvl === 'M' ? 0.5 : 0.2;
  for (var i = 0; i < n; i++) if (!D[i] && r() < pB) B[i] = 1;
  T.links.forEach(function (l) { if (!D[l.a.d] && !D[l.b.d] && !B[l.a.d] && !B[l.b.d]) B[pick(r, [l.a.d, l.b.d])] = 1; });
  var outs = [];
  for (i = 0; i < n; i++) { if (D[i]) outs.push({d: i, kind: 'detail'}); if (B[i]) outs.push({d: i, kind: 'brief'}); }
  outs = shuffle(r, outs);
  outs.forEach(function (o) { o.hold = nbrs(T, o.d).map(function () { return ri(r, 120, 179); }); o.text = o.kind === 'detail' ? detailOut(T, o) : briefOut(T, o); });
  return outs;
}
function pad(t, w) { t = String(t); while (t.length < w) t += ' '; return t; }
function padL(t, w) { t = String(t); while (t.length < w) t = ' ' + t; return t; }
var CAPCODES = 'Capability Codes: R - Router, T - Trans Bridge, B - Source Route Bridge\n                  S - Switch, H - Host, I - IGMP, r - Repeater, P - Phone,\n                  D - Remote, C - CVTA, M - Two-port Mac Relay\n\n';
function briefOut(T, o) {
  var d = T.devs[o.d], s = d.host + '# show cdp neighbors\n' + CAPCODES + 'Device ID        Local Intrfce     Holdtme    Capability  Platform  Port ID\n';
  var ns = nbrs(T, o.d).sort(function (a, b) { return T.devs[a.it.d].id < T.devs[b.it.d].id ? -1 : 1; });
  ns.forEach(function (x, k) {
    var N = T.devs[x.it.d], m = MODELS[N.model], id = N.id;
    s += (id.length > 16 ? id + '\n' + pad('', 17) : pad(id, 17)) + pad(abbr(x.me.p), 18) + padL(o.hold[k], 7) + padL(m.caps, 15) + ' ' + pad(m.plat.slice(0, 9), 10) + abbr(x.it.p) + '\n';
  });
  return s + '\nTotal cdp entries displayed : ' + ns.length;
}
function detailOut(T, o) {
  var d = T.devs[o.d], s = d.host + '# show cdp neighbors detail\n';
  nbrs(T, o.d).forEach(function (x, k) {
    var N = T.devs[x.it.d], m = MODELS[N.model], ip = advIP(T, x.it), sw = MODELS[d.model].type === 'sw' && m.type === 'sw';
    s += '-------------------------\nDevice ID: ' + N.id + '\nEntry address(es): \n  IP address: ' + ip + '\nPlatform: cisco ' + m.plat + ',  Capabilities: ' + m.capl + ' \n' +
      'Interface: ' + x.me.p + ',  Port ID (outgoing port): ' + x.it.p + '\nHoldtime : ' + o.hold[k] + ' sec\n\nVersion :\n' + m.ver + '\nTechnical Support: http://www.cisco.com/techsupport\n\n' +
      'advertisement version: 2\n' + (sw ? 'Native VLAN: 1\n' : '') + 'Duplex: full\nManagement address(es): \n  IP address: ' + ip + '\n\n';
  });
  return s + 'Total cdp entries displayed : ' + nbrs(T, o.d).length;
}
/* Antworten: Modell und akzeptierte IPs je Gerät */
function solve(T) {
  var shownD = {}; T.outs.forEach(function (o) { if (o.kind === 'detail') shownD[o.d] = 1; });
  return T.devs.map(function (d) {
    var ips = [];
    nbrs(T, d.i).forEach(function (x) { if (shownD[x.it.d]) { var ip = advIP(T, x.me); if (ips.indexOf(ip) < 0) ips.push(ip); } });
    return {model: d.model, ips: ips};
  });
}
function cableKey(a, b) { var x = a.d + '|' + a.p, y = b.d + '|' + b.p; return x < y ? x + '~' + y : y + '~' + x; }
function solutionKeys(T) { return T.links.map(function (l) { return cableKey(l.a, l.b); }).sort(); }
/* Plätze im Raster (2 Reihen) */
function place(T, r) {
  var n = T.devs.length, cols = Math.ceil(n / 2), cells = [];
  for (var row = 0; row < 2; row++) for (var c = 0; c < cols; c++) cells.push([c, row]);
  cells = shuffle(r, cells).slice(0, n);
  T.cols = cols; T.devs.forEach(function (d, k) { d.pos = cells[k]; });
}
function makeTask(seed, lvl) {
  if (!LVCODE[lvl] || !(seed >= 1)) return null;
  for (var att = 0; att < 200; att++) {
    var r = mulberry32((seed * 7919 + att * 104729 + LVCODE[lvl] * 1000003 + 4242) >>> 0);
    var T = build(r, lvl); if (!T) continue;
    T.outs = chooseOutputs(T, r, lvl);
    if (lvl !== 'L' && T.outs.length < 2) continue;
    place(T, r);
    T.ans = solve(T);
    if (T.ans.some(function (a) { return !a.ips.length; })) continue;
    T.level = lvl; T.code = lvl + '-' + seed;
    return T;
  }
  return null;
}

/* Beweis für einen Link: welche Ausgabe zeigt ihn? */
function evidence(T, l) {
  var o = T.outs.filter(function (o) { return o.d === l.a.d || o.d === l.b.d; })[0];
  var me = o.d === l.a.d ? l.a : l.b, it = o.d === l.a.d ? l.b : l.a;
  return T.devs[o.d].host + '# show cdp neighbors' + (o.kind === 'detail' ? ' detail' : '') + ': ' + (o.kind === 'detail' ? 'Interface ' + me.p + ', Port ID ' + it.p : 'Local Intrfce ' + abbr(me.p) + ', Port ID ' + abbr(it.p)) + ' bei Device ID ' + T.devs[it.d].id;
}
function ipEvidence(T, d) {
  var o = [];
  nbrs(T, d).forEach(function (x) { if (T.outs.some(function (q) { return q.d === x.it.d && q.kind === 'detail'; })) o.push(T.devs[x.it.d].host + ' (detail): IP address ' + advIP(T, x.me)); });
  return o;
}

/* ---------- Zeichnen ---------- */
function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); }
function tx(x, y, t, o) { o = o || {}; return '<text x="' + x + '" y="' + y + '" text-anchor="' + (o.a || 'middle') + '" font-size="' + (o.fs || 13) + '" font-weight="' + (o.fw || 400) + '" fill="' + (o.c || '#1c2b33') + '" font-family="' + (o.mono ? 'ui-monospace,Menlo,Consolas,monospace' : 'Open Sans,Arial,sans-serif') + '"' + (o.pe ? ' pointer-events="none"' : '') + '>' + esc(t) + '</text>'; }
var PW = 62, PH = 26;
function geom(T) {
  var mx = Math.max.apply(null, T.devs.map(function (d) { return Math.max(200, 24 + d.pins.length * (PW + 6)); }));
  var cw = Math.max(330, mx + 40), W = Math.max(760, T.cols * cw + 20), H = 600, g = {W: W, H: H, d: []};
  T.devs.forEach(function (d) {
    var bw = Math.max(200, 24 + d.pins.length * (PW + 6)), cx = 10 + (T.cols === 1 ? W / 2 - 10 : (d.pos[0] + 0.5) * ((W - 20) / T.cols)), top = d.pos[1] === 0 ? 30 : 440;
    var pins = {};
    d.pins.forEach(function (p, k) { var px = cx - bw / 2 + 12 + k * (PW + 6) + PW / 2; pins[p] = {x: px, y: d.pos[1] === 0 ? top + 104 : top, row: d.pos[1]}; });
    g.d.push({cx: cx, top: top, bw: bw, pins: pins});
  });
  return g;
}
function cablePath(A, B) {
  var bend = A.row === B.row ? (A.row === 0 ? 110 : -110) : 0;
  if (A.row === B.row) return 'M' + A.x + ' ' + A.y + 'C' + A.x + ' ' + (A.y + bend) + ' ' + B.x + ' ' + (B.y + bend) + ' ' + B.x + ' ' + B.y;
  var a = A.row === 0 ? A : B, b = A.row === 0 ? B : A, my = (a.y + b.y) / 2;
  return 'M' + a.x + ' ' + a.y + 'C' + a.x + ' ' + my + ' ' + b.x + ' ' + my + ' ' + b.x + ' ' + b.y;
}
function icon(type, x, y) {
  if (type === 'r') return '<g transform="translate(' + x + ' ' + y + ')"><ellipse cx="0" cy="7" rx="22" ry="8" fill="#1f5872"/><rect x="-22" y="-7" width="44" height="14" fill="#2f7392"/><ellipse cx="0" cy="-7" rx="22" ry="8" fill="#5a9dbb" stroke="#1f5872"/><path d="M-11 -7h7M4 -7h7M-1 -12v4M-1 -5v4" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/></g>';
  return '<g transform="translate(' + x + ' ' + y + ')"><path d="M-24 -4l8 -8h40l-8 8z" fill="#6aaecb" stroke="#1f5872"/><path d="M-24 -4h40v14h-40z" fill="#2f7392"/><path d="M16 -4l8 -8v14l-8 8z" fill="#1f5872"/><path d="M-16 1h8M-4 1h8M-12 5h8M0 5h8" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></g>';
}
/* opt: {cables:[[a,b]], sel:'d|p', marks:{key:'ok'|'bad'}, solution:true, hot:index, interactive} */
function draw(T, opt) {
  opt = opt || {};
  var g = geom(T), o = ['<svg viewBox="0 0 ' + g.W + ' ' + g.H + '" role="img" aria-label="Netzplan zum Verkabeln">'];
  T.devs.forEach(function (d, i) {
    var G0 = g.d[i], x0 = G0.cx - G0.bw / 2, top = G0.top, row0 = d.pos[1] === 0, ty = row0 ? top : top + 30;
    o.push('<rect x="' + x0 + '" y="' + top + '" width="' + G0.bw + '" height="104" rx="8" fill="#fff" stroke="#1c2b33" stroke-width="1.6"/>');
    o.push(icon(MODELS[d.model].type, x0 + 38, ty + (row0 ? 36 : 38)));
    o.push(tx(x0 + 72, ty + (row0 ? 34 : 36), d.host, {a: 'start', fs: 17, fw: 700}));
    o.push(tx(x0 + 72, ty + (row0 ? 52 : 54), opt.labels && opt.labels[i] ? opt.labels[i] : (MODELS[d.model].type === 'r' ? 'Router' : 'Switch'), {a: 'start', fs: 12, c: '#546e7a', mono: !!(opt.labels && opt.labels[i])}));
    d.pins.forEach(function (p) {
      var P = G0.pins[p], key = i + '|' + p, sel = opt.sel === key, py = row0 ? P.y - PH - 6 : P.y + 6;
      o.push('<g' + (opt.interactive ? ' data-pin="' + key + '" style="cursor:pointer"' : '') + '><rect x="' + (P.x - PW / 2) + '" y="' + py + '" width="' + PW + '" height="' + PH + '" rx="4" fill="' + (sel ? '#fff59d' : '#eef3f7') + '" stroke="' + (sel ? '#f9a825' : '#78909c') + '" stroke-width="' + (sel ? 2.5 : 1.3) + '"/>' +
        tx(P.x, py + 17.5, short(p), {fs: 11.5, mono: 1, fw: 600, pe: 1}) + '<circle cx="' + P.x + '" cy="' + P.y + '" r="4" fill="#1c2b33"/></g>');
    });
  });
  function pin(key) { var k = key.split('|'); return g.d[+k[0]].pins[k[1]]; }
  var cab = opt.solution ? T.links.map(function (l) { return [l.a.d + '|' + l.a.p, l.b.d + '|' + l.b.p]; }) : (opt.cables || []);
  cab.forEach(function (c, k) {
    var A = pin(c[0]), B = pin(c[1]), d = cablePath(A, B), key = c[0] < c[1] ? c[0] + '~' + c[1] : c[1] + '~' + c[0];
    var mk = opt.marks && opt.marks[key], col = opt.solution ? '#2e7d32' : mk === 'ok' ? '#2e7d32' : mk === 'bad' ? '#c62828' : opt.hot === k ? '#f9a825' : '#1c2b33';
    o.push('<g' + (opt.interactive ? ' data-cab="' + k + '" style="cursor:pointer"' : '') + '><path d="' + d + '" fill="none" stroke="transparent" stroke-width="14"/><path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="' + (opt.hot === k ? 5 : 3) + '"' + (mk === 'bad' ? ' stroke-dasharray="8 5"' : '') + ' stroke-linecap="round"/></g>');
  });
  o.push('</svg>');
  return o.join('');
}

/* Beispiel für die Erklärung */
function example() {
  var T = {cols: 3, devs: [
    {i: 0, host: 'GATE', id: 'GATE', model: 'isr4331', pos: [1, 0], pins: ['GigabitEthernet0/0/0', 'GigabitEthernet0/0/1']},
    {i: 1, host: 'KERN', id: 'KERN', model: 'c3650', ip: '10.1.99.2', pos: [1, 1], pins: ['GigabitEthernet1/0/23', 'GigabitEthernet1/0/24', 'GigabitEthernet1/1/1']},
    {i: 2, host: 'ETAGE1', id: 'ETAGE1', model: 'c2960a', ip: '10.1.99.11', pos: [0, 0], pins: ['FastEthernet0/24', 'GigabitEthernet0/1']},
    {i: 3, host: 'ETAGE2', id: 'ETAGE2.htl.local', model: 'c2960b', ip: '10.1.99.12', pos: [2, 0], pins: ['GigabitEthernet0/1', 'GigabitEthernet0/2']}],
    links: [{a: {d: 1, p: 'GigabitEthernet1/1/1'}, b: {d: 0, p: 'GigabitEthernet0/0/1', ip: '10.1.99.1'}},
      {a: {d: 1, p: 'GigabitEthernet1/0/23'}, b: {d: 2, p: 'GigabitEthernet0/1'}},
      {a: {d: 1, p: 'GigabitEthernet1/0/24'}, b: {d: 3, p: 'GigabitEthernet0/2'}}]};
  T.outs = [{d: 1, kind: 'brief', hold: [163, 141, 177]}, {d: 1, kind: 'detail', hold: [163, 141, 177]}];
  T.outs.forEach(function (o) { o.text = o.kind === 'detail' ? detailOut(T, o) : briefOut(T, o); });
  return T;
}

G.CDP = {LVNAME: LVNAME, MODELS: MODELS, MODEL_KEYS: MODEL_KEYS, makeTask: makeTask, draw: draw, nbrs: nbrs, cableKey: cableKey, solutionKeys: solutionKeys,
  evidence: evidence, ipEvidence: ipEvidence, short: short, abbr: abbr, example: example, briefOut: briefOut, detailOut: detailOut, advIP: advIP};
})(typeof window !== 'undefined' ? window : globalThis);
